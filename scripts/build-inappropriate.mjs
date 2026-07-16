import { writeFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const dst = resolve(__dirname, "..", "data", "sentiment", "inappropriate.encoded.json")

function enc(s) {
  return s.split("").map((c) => "%" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")).join("")
}

const entries = [
  // sexual
  ...["fuck", "fucking", "fucker", "fck"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["sex", "sexy", "sexual"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["horny"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["ass", "boobs", "tits", "dick", "cock", "pussy", "penis", "vagina"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["shit", "bitch", "bastard"].map((w) => ({ w: enc(w), t: ["offensive"] })),
  ...["porn", "pornography"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["kantot", "kumantot", "kantutan", "iyot", "magiyot", "tite", "puke", "pekpek", "bulbul"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["masturbate", "masturbation"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["nude", "naked", "strip"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["orgasm", "cum", "semen"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["prostitute", "whore", "hoe"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["blowjob", "oral"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["molest"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["kisser"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["wet"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["nipple"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["hot"].map((w) => ({ w: enc(w), t: ["sexual"] })),
  ...["fantasize"].map((w) => ({ w: enc(w), t: ["sexual"] })),

  // violent
  ...["kill", "killer", "killed", "murder", "torture", "bomb"].map((w) => ({ w: enc(w), t: ["violent"] })),
  ...["patay", "pinatay", "pumatay", "saktan", "gulpi", "baril", "saksak"].map((w) => ({ w: enc(w), t: ["violent"] })),

  // harassment / threat
  ...["harass", "harassment", "threat", "threaten"].map((w) => ({ w: enc(w), t: ["harassment"] })),
  ...["violence", "violent"].map((w) => ({ w: enc(w), t: ["violent"] })),

  // racism
  ...["nigger", "nigga", "chink", "spic", "gook", "kike", "coon"].map((w) => ({ w: enc(w), t: ["racism"] })),
  ...["negro", "negra"].map((w) => ({ w: enc(w), t: ["racism"] })),
  ...["intsik", "tsekwa", "indio"].map((w) => ({ w: enc(w), t: ["racism"] })),

  // hate speech
  ...["nazi", "genocide", "supremacist"].map((w) => ({ w: enc(w), t: ["hate_speech"] })),
  ...["putangina", "puta"].map((w) => ({ w: enc(w), t: ["offensive", "sexual"] })),
]

writeFileSync(dst, JSON.stringify(entries, null, 2))
console.log("Built", dst, `(${entries.length} entries)`)
