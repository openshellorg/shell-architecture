import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { DOMParser } from "@xmldom/xmldom"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outputDir = path.join(root, "docs", "modules", "ROOT", "images")
const manifestPath = path.join(root, "diagrams", "playtime-artifacts.json")
const sourceCommit = "97534371f0da8d81e495cb4cc069704902dbdd69"
const names = [
  "playtime-argv",
  "playtime-attic-basement",
  "playtime-bind-flow",
  "playtime-bootstrap",
  "playtime-facets-not-lattice",
  "playtime-growth-ratchet",
  "playtime-layers",
  "playtime-overlays",
  "playtime-sibling-home",
  "playtime-two-doors",
  "playtime-venn",
  "playtime-wrong-translator",
]
const sync = process.argv.includes("--sync")

function digest(value) {
  return createHash("sha256").update(value).digest("hex")
}

function sourceRepository() {
  const candidates = [
    process.env.PLAYTIME_SOURCE,
    path.resolve(root, "..", "..", "dev-centr", "scriptbook"),
  ].filter(Boolean)
  const repository = candidates.find((candidate) => existsSync(path.join(candidate, ".git")))
  if (!repository) {
    throw new Error(`Scriptbook checkout not found. Set PLAYTIME_SOURCE.\nTried:\n${candidates.join("\n")}`)
  }
  execFileSync("git", ["cat-file", "-e", `${sourceCommit}^{commit}`], { cwd: repository })
  return repository
}

function canonical(repository, sourcePath) {
  return execFileSync("git", ["show", `${sourceCommit}:${sourcePath}`], {
    cwd: repository,
    maxBuffer: 16 * 1024 * 1024,
  })
}

function validateSvg(relativePath, value, mode) {
  let text
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(value)
  } catch {
    throw new Error(`${relativePath}: not valid UTF-8`)
  }
  if (/\u00e2[\u0080-\u00bf]|\u00f0[\u0080-\u00bf]|\u00ef\u00bf\u00bd|\uFFFD/.test(text)) {
    throw new Error(`${relativePath}: possible mojibake`)
  }
  const errors = []
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") errors.push(message)
    },
  }).parseFromString(text, "image/svg+xml")
  const svg = document.documentElement
  if (errors.length) throw new Error(`${relativePath}: invalid XML: ${errors.join("; ")}`)
  if (svg.localName !== "svg" || svg.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw new Error(`${relativePath}: missing SVG namespace`)
  }
  for (const attribute of ["viewBox", "role"]) {
    if (!svg.getAttribute(attribute)) throw new Error(`${relativePath}: missing ${attribute}`)
  }
  if (mode !== "fixed" && svg.getAttribute("preserveAspectRatio") !== "xMidYMid meet") {
    throw new Error(`${relativePath}: preserveAspectRatio must be xMidYMid meet`)
  }
  if (svg.getAttribute("role") !== "img") throw new Error(`${relativePath}: role must be img`)
  if (!svg.getElementsByTagName("title")[0]?.textContent?.trim()) throw new Error(`${relativePath}: missing title`)
  if (!svg.getElementsByTagName("desc")[0]?.textContent?.trim()) throw new Error(`${relativePath}: missing description`)
  if (/<(?:foreignObject|script|iframe|object|embed|image|audio|video)\b/i.test(text)) {
    throw new Error(`${relativePath}: active or external-capable content`)
  }
  if (/\son[a-z]+\s*=|(?:href|src)\s*=\s*["'](?!#|data:)|url\(\s*["']?(?:https?:|\/\/)/i.test(text)) {
    throw new Error(`${relativePath}: event handler or external resource`)
  }
  if (/var\([^,)]*\)/.test(text)) throw new Error(`${relativePath}: CSS variable lacks a fallback`)
  if (mode === "adaptive" && !text.includes("prefers-color-scheme:dark")) {
    throw new Error(`${relativePath}: adaptive SVG lacks a dark preset`)
  }
  if (mode === "host" && text.includes("prefers-color-scheme:dark")) {
    throw new Error(`${relativePath}: host SVG contains an adaptive media rule`)
  }
}

if (sync) {
  const repository = sourceRepository()
  const files = {}
  for (const name of names) {
    const mappings = [
      [`spec/images/${name}.svg`, `${name}.svg`, "adaptive"],
      [`spec/images/${name}.host.svg`, `${name}.host.svg`, "host"],
      [`spec/images/fixed/${name}.svg`, `${name}.fixed.svg`, "fixed"],
    ]
    for (const [sourcePath, targetName, mode] of mappings) {
      const value = canonical(repository, sourcePath)
      validateSvg(targetName, value, mode)
      writeFileSync(path.join(outputDir, targetName), value)
      files[`docs/modules/ROOT/images/${targetName}`] = digest(value)
    }
  }
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ source: "dev-centr/scriptbook", commit: sourceCommit, files }, null, 2)}\n`,
  )
  console.log(`Synchronized 12 PlayTime adaptive, host, and fixed artifacts from ${sourceCommit}.`)
} else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  if (manifest.source !== "dev-centr/scriptbook" || manifest.commit !== sourceCommit) {
    throw new Error("PlayTime provenance manifest does not name the pinned Scriptbook commit")
  }
  for (const [relativePath, expected] of Object.entries(manifest.files)) {
    const value = readFileSync(path.join(root, relativePath))
    if (digest(value) !== expected) throw new Error(`${relativePath}: checksum differs from canonical artifact`)
    const mode = relativePath.endsWith(".host.svg")
      ? "host"
      : relativePath.endsWith(".fixed.svg")
        ? "fixed"
        : "adaptive"
    validateSvg(relativePath, value, mode)
  }
  if (Object.keys(manifest.files).length !== names.length * 3) {
    throw new Error("PlayTime provenance manifest must contain 36 artifacts")
  }
  console.log(`Validated 36 PlayTime artifacts from Scriptbook ${sourceCommit}.`)
}
