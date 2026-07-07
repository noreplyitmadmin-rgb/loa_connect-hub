import { readFileSync, writeFileSync } from "fs"
import { execSync } from "child_process"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"))

let commit = "unknown"
try {
  commit = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim()
} catch {}

const buildTime = new Date().toISOString()

const version = {
  version: pkg.version,
  commit,
  buildTime,
}

const outDir = join(root, "public")
try { writeFileSync(join(outDir, "version.json"), JSON.stringify(version, null, 2), "utf-8") } catch {}

console.log(`✓ version.json generated: v${version.version} (${version.commit}) @ ${version.buildTime}`)
