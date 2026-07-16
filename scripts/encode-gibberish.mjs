import { readFileSync, writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = resolve(__dirname, "..", "data", "sentiment", "gibberish.json")
const dst = resolve(__dirname, "..", "data", "sentiment", "gibberish.encoded.json")

const data = JSON.parse(readFileSync(src, "utf-8"))
const encoded = data.map((d) => ({ ...d, text: Buffer.from(d.text, "utf-8").toString("base64") }))
writeFileSync(dst, JSON.stringify(encoded, null, 2))
console.log("Encoded gibberish seed written to", dst)
