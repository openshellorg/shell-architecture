import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { prepareThemedMermaidSvgDualOutput } from "@dev-centr/mermaid-svg-css-vars"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceDir = path.join(root, "docs", "modules", "ROOT", "partials", "diagrams")
const outputDir = path.join(root, "docs", "modules", "ROOT", "images")
const cacheDir = mkdtempSync(path.join(tmpdir(), "shell-architecture-diagrams-"))
const config = path.join(root, "diagrams", "mermaid-config.json")
const check = process.argv.includes("--check")

const diagrams = {
  "declaration-without-dispatch": ["Declaration without dispatch", "A launcher declares a version but starts the unverified command already on PATH."],
  "honest-entrypoint-dispatch": ["Honest entrypoint dispatch", "The entrypoint resolves, installs, verifies, and re-executes the requested tool version."],
  "sibling-ownership": ["Sibling project ownership", "DevCentr owns lifecycle policy while OpenShellOrg owns honest entrypoint dispatch."],
  "toolchain-architecture": ["Toolchain architecture", "The official entrypoint owns pin resolution, installation, re-execution, and lifecycle handoff."],
}

mkdirSync(cacheDir, { recursive: true })
mkdirSync(outputDir, { recursive: true })
const mermaidCli = fileURLToPath(new URL("cli.js", import.meta.resolve("@mermaid-js/mermaid-cli")))
let stale = false

for (const [name, [title, description]] of Object.entries(diagrams)) {
  const rawPath = path.join(cacheDir, `${name}.raw.svg`)
  execFileSync(process.execPath, [mermaidCli, "-i", path.join(sourceDir, `${name}.mmd`), "-o", rawPath, "-c", config, "-b", "transparent", "-q"], {
    cwd: root,
    stdio: "inherit",
  })
  let raw = readFileSync(rawPath, "utf8")
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
