import { describe, it, expect } from "vitest"
import { cleanCell, parseCsvLines } from "@/lib/csv-utils"

// ── cleanCell ─────────────────────────────────────────────

describe("cleanCell", () => {
  it("trims whitespace", () => {
    expect(cleanCell("  hello  ")).toBe("hello")
  })

  it("strips leading single quotes (Excel prefix)", () => {
    expect(cleanCell("'CS101")).toBe("CS101")
  })

  it("strips trailing double quotes", () => {
    expect(cleanCell("CS101\"")).toBe("CS101")
  })

  it("strips both leading and trailing quotes", () => {
    expect(cleanCell("'CS101'")).toBe("CS101")
  })

  it("strips leading double quotes", () => {
    expect(cleanCell("\"CS101")).toBe("CS101")
  })

  it("returns empty string for blank input", () => {
    expect(cleanCell("   ")).toBe("")
  })

  it("returns plain text unchanged", () => {
    expect(cleanCell("Introduction to CS")).toBe("Introduction to CS")
  })

  it("handles mixed whitespace and quotes", () => {
    expect(cleanCell("  ' CS101 '  ")).toBe(" CS101 ")
  })
})

// ── parseCsvLines ─────────────────────────────────────────

describe("parseCsvLines", () => {
  it("parses valid CSV", () => {
    const text = "code, name\nCS101, Intro to CS\nMATH201, Calculus II"
    const { headers, rows } = parseCsvLines(text)
    expect(headers).toEqual(["code", "name"])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual(["CS101", "Intro to CS"])
    expect(rows[1]).toEqual(["MATH201", "Calculus II"])
  })

  it("lowercases headers", () => {
    const { headers } = parseCsvLines("Code, Name\nCS101, Intro")
    expect(headers).toEqual(["code", "name"])
  })

  it("trims whitespace and strips quotes from cells", () => {
    const { headers, rows } = parseCsvLines("  Code  ,  Name  \n  'CS101'  ,  'Intro'  ")
    expect(headers).toEqual(["code", "name"])
    expect(rows[0]).toEqual(["CS101", "Intro"])
  })

  it("skips empty lines", () => {
    const text = "code, name\nCS101, Intro\n\nMATH201, Calc II\n"
    const { rows } = parseCsvLines(text)
    expect(rows).toHaveLength(2)
  })

  it("returns empty for header-only CSV", () => {
    const { headers, rows } = parseCsvLines("code, name")
    expect(headers).toHaveLength(0)
    expect(rows).toHaveLength(0)
  })

  it("returns empty for empty string", () => {
    const { headers, rows } = parseCsvLines("")
    expect(headers).toHaveLength(0)
    expect(rows).toHaveLength(0)
  })

  it("handles Windows-style line endings", () => {
    const text = "code, name\r\nCS101, Intro\r\nMATH201, Calc II"
    const { rows } = parseCsvLines(text)
    expect(rows).toHaveLength(2)
  })
})
