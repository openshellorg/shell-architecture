import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { DOMParser, XMLSerializer } from "@xmldom/xmldom"
import { prepareThemedMermaidSvgDualOutput } from "@dev-centr/mermaid-svg-css-vars"
import { diagramNodeIcons, icons } from "../diagrams/node-icons.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceDir = path.join(root, "docs", "modules", "ROOT", "partials", "diagrams")
const outputDir = path.join(root, "docs", "modules", "ROOT", "images")
const cacheDir = mkdtempSync(path.join(tmpdir(), "shell-architecture-diagrams-"))
const config = path.join(root, "diagrams", "mermaid-config.json")
const check = process.argv.includes("--check")
const ICON_SLOT_TOKEN = "ICONSLOT"
const SVG_NS = "http://www.w3.org/2000/svg"
const ICON_SIZE = 18
const ICON_SCALE = ICON_SIZE / 24

const diagrams = {
  "declaration-without-dispatch": ["Declaration without dispatch", "A launcher declares a version but starts the unverified command already on PATH."],
  "honest-entrypoint-dispatch": ["Honest entrypoint dispatch", "The entrypoint resolves, installs, verifies, and re-executes the requested tool version."],
  "sibling-ownership": ["Sibling project ownership", "DevCentr owns lifecycle policy while OpenShellOrg owns honest entrypoint dispatch."],
  "toolchain-architecture": ["Toolchain architecture", "The official entrypoint owns pin resolution, installation, re-execution, and lifecycle handoff."],
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function reserveIconSlots(source, nodeMap) {
  if (!nodeMap) return source
  let updated = source
  for (const nodeId of Object.keys(nodeMap)) {
    const id = escapeRegExp(nodeId)
    const shapePattern = new RegExp(`(^|\\r?\\n)([ \\t]*${id}[ \\t]*@\\{[^}]*?label:[ \\t]*")`, "g")
    const roundPattern = new RegExp(`(^|\\r?\\n)([ \\t]*${id}[ \\t]*\\(")`, "g")
    if (shapePattern.test(updated)) {
      updated = updated.replace(shapePattern, `$1$2${ICON_SLOT_TOKEN}\\n`)
    } else if (roundPattern.test(updated)) {
      updated = updated.replace(roundPattern, `$1$2${ICON_SLOT_TOKEN}\\n`)
    } else {
      throw new Error(`Could not reserve icon slot for node "${nodeId}"`)
    }
  }
  return updated
}

function parseTranslateY(transform) {
  const match = String(transform ?? "").match(/translate\(\s*[^,)\s]+(?:[\s,]+([^)]+))?\)/)
  return match && match[1] ? Number.parseFloat(match[1]) : 0
}

function injectNodeIcons(rawSvg, name, nodeMap) {
  if (!nodeMap) return rawSvg
  const doc = new DOMParser().parseFromString(rawSvg, "image/svg+xml")
  const styles = doc.getElementsByTagName("style")
  if (styles.length > 0) {
    const styleEl = styles[0]
    const iconCss =
      "#my-svg .node .node-icon path,#my-svg .node .node-icon circle{" +
      "fill:none!important;stroke:#1a1a1a!important;stroke-width:1.9!important;" +
      "stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none!important;" +
      "rx:0!important;ry:0!important;opacity:0.88;}"
    styleEl.textContent = `${styleEl.textContent ?? ""}${iconCss}`
  }

  const injected = new Set()
  const groups = doc.getElementsByTagName("g")
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    const cls = (g.getAttribute("class") ?? "").split(/\s+/)
    if (!cls.includes("node")) continue
    const id = g.getAttribute("id") ?? ""
    const match = id.match(/^my-svg-flowchart-([A-Za-z0-9_]+)-\d+$/)
    if (!match) continue
    const nodeId = match[1]
    const iconName = nodeMap[nodeId]
    if (!iconName) continue
    const iconDef = icons[iconName]
    if (!iconDef) throw new Error(`${name}: unknown icon "${iconName}" for node "${nodeId}"`)

    let labelGroup = null
    for (let c = g.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 1 && c.tagName === "g" && (c.getAttribute("class") ?? "").split(/\s+/).includes("label")) {
        labelGroup = c
        break
      }
    }
    if (!labelGroup) throw new Error(`${name}: missing .label group in node "${nodeId}"`)

    const tspans = labelGroup.getElementsByTagName("tspan")
    for (let t = tspans.length - 1; t >= 0; t--) {
      const span = tspans[t]
      if ((span.getAttribute("class") ?? "").includes("text-outer-tspan") && (span.textContent ?? "").trim() === ICON_SLOT_TOKEN) {
        span.parentNode?.removeChild(span)
      }
    }

    const labelY = parseTranslateY(labelGroup.getAttribute("transform"))
    labelGroup.setAttribute("transform", `translate(0, ${Number((labelY + 2).toFixed(2))})`)
    const iconX = -(ICON_SIZE / 2)
    const iconY = Number((labelY - 4).toFixed(2))
    const iconGroup = doc.createElementNS(SVG_NS, "g")
    iconGroup.setAttribute("class", `node-icon node-icon-${iconName}`)
    iconGroup.setAttribute("aria-hidden", "true")
    iconGroup.setAttribute("transform", `translate(${iconX}, ${iconY}) scale(${ICON_SCALE.toFixed(4)})`)

    for (const d of iconDef.paths ?? []) {
      const pathEl = doc.createElementNS(SVG_NS, "path")
      pathEl.setAttribute("d", d)
      iconGroup.appendChild(pathEl)
    }
    for (const circle of iconDef.circles ?? []) {
      const circleEl = doc.createElementNS(SVG_NS, "circle")
      circleEl.setAttribute("cx", String(circle.cx))
      circleEl.setAttribute("cy", String(circle.cy))
      circleEl.setAttribute("r", String(circle.r))
      iconGroup.appendChild(circleEl)
    }

    g.appendChild(iconGroup)
    injected.add(nodeId)
  }

  for (const nodeId of Object.keys(nodeMap)) {
    if (!injected.has(nodeId)) {
      throw new Error(`${name}: failed to inject icon for node "${nodeId}"`)
    }
  }

  return new XMLSerializer().serializeToString(doc)
}

mkdirSync(cacheDir, { recursive: true })
mkdirSync(outputDir, { recursive: true })
const mermaidCli = fileURLToPath(new URL("cli.js", import.meta.resolve("@mermaid-js/mermaid-cli")))
let stale = false

for (const [name, [title, description]] of Object.entries(diagrams)) {
  const sourcePath = path.join(sourceDir, `${name}.mmd`)
  const nodeMap = diagramNodeIcons[name]
  let inputPath = sourcePath
  if (nodeMap) {
    const tempSourcePath = path.join(cacheDir, `${name}.mmd`)
    writeFileSync(tempSourcePath, reserveIconSlots(readFileSync(sourcePath, "utf8"), nodeMap), "utf8")
    inputPath = tempSourcePath
  }

  const rawPath = path.join(cacheDir, `${name}.raw.svg`)
  execFileSync(process.execPath, [mermaidCli, "-i", inputPath, "-o", rawPath, "-c", config, "-b", "transparent", "-q"], {
    cwd: root,
    stdio: "inherit",
  })
  let raw = readFileSync(rawPath, "utf8")
  raw = injectNodeIcons(raw, name, nodeMap)
  raw = raw.replace(/\srole="[^"]*"/, "").replace(/\saria-roledescription="[^"]*"/, "")
  raw = raw.replace(
    /<svg\b([^>]*)>/,
    `<svg$1 role="img" preserveAspectRatio="xMidYMid meet" aria-labelledby="${name}-title ${name}-desc"><title id="${name}-title">${title}</title><desc id="${name}-desc">${description}</desc>`,
  )
  const diagramManifestPath = path.join(sourceDir, `${name}.theme.json`)
  if (!existsSync(diagramManifestPath)) throw new Error(`Missing explicit manifest ${diagramManifestPath}`)
  const manifest = JSON.parse(readFileSync(diagramManifestPath, "utf8"))
  const result = prepareThemedMermaidSvgDualOutput(raw, manifest)
  const errors = result.diagnostics.filter((item) => item.severity === "error")
  if (errors.length || !result.standaloneSvg || !result.hostSvg) {
    throw new Error(`${name}: ${JSON.stringify(result.diagnostics, null, 2)}`)
  }
  for (const [suffix, generated] of [[".svg", result.standaloneSvg], [".host.svg", result.hostSvg]]) {
    const value = generated.replace(/\sheight="auto"/g, "")
    const target = path.join(outputDir, `${name}${suffix}`)
    if (check) {
      if (!existsSync(target) || readFileSync(target, "utf8") !== value) {
        console.error(`stale ${path.relative(root, target)}`)
        stale = true
      }
    } else {
      writeFileSync(target, value, "utf8")
      console.log(`wrote ${path.relative(root, target)}`)
    }
  }
  const combined = result.standaloneSvg + result.hostSvg
  if (/foreignObject|<script\b|\son[a-z]+\s*=|<(?:animate|set)\b|(?:href|src)=["']https?:|url\(\s*["']?https?:/i.test(combined)) {
    throw new Error(`${name}: unsafe or non-portable SVG content`)
  }
  for (const required of ['xmlns="http://www.w3.org/2000/svg"', "viewBox=", 'preserveAspectRatio="xMidYMid meet"', 'role="img"', "<title", "<desc"]) {
    if (!result.standaloneSvg.includes(required) || !result.hostSvg.includes(required)) {
      throw new Error(`${name}: generated SVG is missing ${required}`)
    }
  }
}
rmSync(cacheDir, { recursive: true, force: true })
if (stale) process.exitCode = 3
