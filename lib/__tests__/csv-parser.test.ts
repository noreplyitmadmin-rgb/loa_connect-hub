import { describe, it, expect } from "vitest"
import { parseCsv, getCsvTemplate } from "@/lib/services/csvParser"

describe("parseCsv — full (faculty)", () => {
  const validHeaders = "name, microsoft email, section, code, title"

  it("parses valid rows with section, code, title", () => {
    const csv = `${validHeaders}
Jane Faculty, jane.faculty@lyceumalabang.edu.ph, BSIT-32A1, ELEC-323, Elective 3
Mike Dean, mike.dean@lyceumalabang.edu.ph, BSCS-41B2, CCS-412, Capstone 2`
    const result = parseCsv(csv, "full")
    expect(result.headerError).toBeUndefined()
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0].name).toBe("Jane Faculty")
    expect(result.rows[0].email).toBe("jane.faculty@lyceumalabang.edu.ph")
    expect(result.rows[0].section).toBe("BSIT-32A1")
    expect(result.rows[0].code).toBe("ELEC-323")
    expect(result.rows[0].title).toBe("Elective 3")
    expect(result.rows[0].department).toBeNull()
  })

  it("rejects old concatenated subject format", () => {
    const csv = `name, microsoft email, subject
Jane Faculty, jane.faculty@lyceumalabang.edu.ph, A_CCS101_Intro_3`
    const result = parseCsv(csv, "full")
    expect(result.headerError).toContain("Expected 5 column(s)")
    expect(result.rows).toHaveLength(0)
  })

  it("rejects wrong header", () => {
    const csv = `name, email, section, code, title
Jane Faculty, jane.faculty@lyceumalabang.edu.ph, A, CCS101, Intro`
    const result = parseCsv(csv, "full")
    expect(result.headerError).toBeTruthy()
  })

  it("rejects mismatched column count", () => {
    const csv = `${validHeaders}
Jane Faculty, jane.faculty@lyceumalabang.edu.ph, A`
    const result = parseCsv(csv, "full")
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("Expected 5 columns")
  })

  it("rejects invalid email domain", () => {
    const csv = `${validHeaders}
Jane Faculty, jane@gmail.com, A, CCS101, Intro`
    const result = parseCsv(csv, "full")
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("Email")
  })

  it("rejects empty name", () => {
    const csv = `${validHeaders}
, jane.faculty@lyceumalabang.edu.ph, A, CCS101, Intro`
    const result = parseCsv(csv, "full")
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("Name is required")
  })

  it("handles title with commas", () => {
    const csv = `${validHeaders}
Jane Faculty, jane.faculty@lyceumalabang.edu.ph, BSIT-32A1, ELEC-323, Elective 3, Part 2`
    const result = parseCsv(csv, "full")
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].title).toBe("Elective 3, Part 2")
  })

  it("allows both @itmlyceumalabang.onmicrosoft.com and @lyceumalabang.edu.ph domains", () => {
    const csv = `${validHeaders}
Jane Faculty, jane.faculty@itmlyceumalabang.onmicrosoft.com, A, CCS101, Intro
Mike Dean, mike.dean@lyceumalabang.edu.ph, B, CCS102, Data`
    const result = parseCsv(csv, "full")
    expect(result.errors).toHaveLength(0)
  })

  it("sets subject = code for backward compat", () => {
    const csv = `${validHeaders}
Jane Faculty, jane.faculty@lyceumalabang.edu.ph, A, CCS101, Intro`
    const result = parseCsv(csv, "full")
    expect(result.rows[0].subject).toBe("CCS101")
  })
})

describe("parseCsv — students", () => {
  const validHeaders = "name, microsoft email, section, code"

  it("parses valid student rows", () => {
    const csv = `${validHeaders}
Alice Student, alice.student@lyceumalabang.edu.ph, BSIT-32A1, ELEC-323
Bob Martinez, bob.martinez@lyceumalabang.edu.ph, BSCS-41B2, CCS-412`
    const result = parseCsv(csv, "students")
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].section).toBe("BSIT-32A1")
    expect(result.rows[0].code).toBe("ELEC-323")
    expect(result.rows[1].section).toBe("BSCS-41B2")
    expect(result.rows[1].code).toBe("CCS-412")
  })
})

describe("getCsvTemplate", () => {
  it("generates faculty template with new columns", () => {
    const tpl = getCsvTemplate("full")
    expect(tpl).toContain("name,microsoft email,section,code,title")
    expect(tpl).toContain("BSIT-32A1")
    expect(tpl).toContain("ELEC-323")
    expect(tpl).toContain("Elective 3 - Fullstack Development")
    expect(tpl).not.toContain("_") // no concatenated subject
  })

  it("generates student template unchanged", () => {
    const tpl = getCsvTemplate("students")
    expect(tpl).toContain("name,microsoft email,section,code")
    expect(tpl).toContain("BSIT-32A1")
    expect(tpl).toContain("ELEC-323")
  })
})
