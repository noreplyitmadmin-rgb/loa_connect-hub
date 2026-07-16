import { readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = resolve(__dirname, "..", "data", "sentiment", "inappropriate.json")
const dst = resolve(__dirname, "..", "data", "sentiment", "inappropriate.encoded.json")

const words = JSON.parse(readFileSync(src, "utf-8"))
const encoded = words.map((w) =>
  w.split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()).join("")
)
writeFileSync(dst, JSON.stringify(encoded, null, 2))
console.log("Encoded inappropriate words written to", dst)
