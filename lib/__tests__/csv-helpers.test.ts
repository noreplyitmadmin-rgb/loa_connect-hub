import { describe, it, expect } from "vitest"
import { deriveCsvFlags, type CsvRow, type CsvFlagContext } from "@/features/admin-data/components/csv-helpers"

function makeCtx(overrides: Partial<CsvFlagContext> = {}): CsvFlagContext {
  return {
    existingMappings: [],
    validDeptCodes: ["CCS", "CAS"],
    subjectCodes: ["CS101", "MATH201"],
    sectionPairs: [
      { name: "32A3", program: "BSIT" },
      { name: "21B", program: "BSCS" },
    ],
    facultyEmails: ["existing@school.edu.ph"],
    ...overrides,
  }
}

function makeRow(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    email: "new@school.edu.ph",
    name: "New Faculty",
    subjectCode: "CS101",
    subjectName: "Intro to CS",
    section: "BSIT-32A3",
    departmentCode: "CCS",
    ...overrides,
  }
}

describe("deriveCsvFlags", () => {
  it("marks row as invalid dept when department code is not in validDeptCodes", () => {
    const rows = [makeRow({ departmentCode: "UNKNOWN" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isInvalidDept).toBe(true)
  })

  it("marks row as valid dept when department code exists", () => {
    const rows = [makeRow({ departmentCode: "CCS" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isInvalidDept).toBe(false)
  })

  it("handles multiple rows with mixed invalid dept codes", () => {
    const rows = [
      makeRow({ departmentCode: "CCS" }),
      makeRow({ departmentCode: "INVALID" }),
      makeRow({ departmentCode: "CAS" }),
      makeRow({ departmentCode: "NOPE" }),
    ]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isInvalidDept).toBe(false)
    expect(result[1].isInvalidDept).toBe(true)
    expect(result[2].isInvalidDept).toBe(false)
    expect(result[3].isInvalidDept).toBe(true)
  })

  it("filters only invalid dept rows from result set", () => {
    const rows = [
      makeRow({ email: "a@school.edu.ph", departmentCode: "CCS" }),
      makeRow({ email: "b@school.edu.ph", departmentCode: "INVALID" }),
      makeRow({ email: "c@school.edu.ph", departmentCode: "NOPE" }),
    ]
    const result = deriveCsvFlags(rows, makeCtx())
    const invalidOnly = result.filter((r) => r.isInvalidDept)
    expect(invalidOnly).toHaveLength(2)
    expect(invalidOnly.map((r) => r.departmentCode)).toEqual(["INVALID", "NOPE"])
  })

  it("marks new subject when subject code not in list", () => {
    const rows = [makeRow({ subjectCode: "NEW101" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewSubject).toBe(true)
  })

  it("marks existing subject when subject code is in list", () => {
    const rows = [makeRow({ subjectCode: "CS101" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewSubject).toBe(false)
  })

  it("marks new section when section not in list", () => {
    const rows = [makeRow({ section: "BSIT-99Z" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewSection).toBe(true)
  })

  it("marks existing section when section is in list", () => {
    const rows = [makeRow({ section: "BSIT-32A3" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewSection).toBe(false)
  })

  it("marks new teacher when email not in list", () => {
    const rows = [makeRow({ email: "brandnew@school.edu.ph" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewTeacher).toBe(true)
  })

  it("marks existing teacher when email is in list", () => {
    const rows = [makeRow({ email: "existing@school.edu.ph" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewTeacher).toBe(false)
  })

  it("marks existing mapping when combination already exists", () => {
    const ctx = makeCtx({
      existingMappings: [
        {
          id: "1",
          semesterId: null,
          faculty: { id: "u1", name: "Existing", email: "existing@school.edu.ph", departmentId: null },
          subject: { id: "s1", code: "CS101", name: "Intro" },
          section: { id: "sec1", name: "32A3", program: "BSIT" },
        },
      ],
    })
    const rows = [makeRow({ email: "existing@school.edu.ph", subjectCode: "CS101", section: "BSIT-32A3" })]
    const result = deriveCsvFlags(rows, ctx)
    expect(result[0].isExistingMapping).toBe(true)
  })

  it("marks not existing mapping when combination does not exist", () => {
    const rows = [makeRow({ email: "existing@school.edu.ph", subjectCode: "CS101", section: "BSIT-32A3" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isExistingMapping).toBe(false)
  })

  it("parses section program and name from hyphenated format", () => {
    const rows = [makeRow({ section: "BSCS-21B" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewSection).toBe(false)
  })

  it("handles section without hyphen (no program prefix)", () => {
    const rows = [makeRow({ section: "32A3" })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewSection).toBe(false)
  })

  it("returns empty array for empty input", () => {
    const result = deriveCsvFlags([], makeCtx())
    expect(result).toEqual([])
  })

  it("all flags can be true simultaneously", () => {
    const rows = [makeRow({
      email: "unknown@school.edu.ph",
      subjectCode: "NEW101",
      section: "BSIT-99Z",
      departmentCode: "NOPE",
    })]
    const result = deriveCsvFlags(rows, makeCtx())
    expect(result[0].isNewSubject).toBe(true)
    expect(result[0].isNewSection).toBe(true)
    expect(result[0].isNewTeacher).toBe(true)
    expect(result[0].isInvalidDept).toBe(true)
    expect(result[0].isExistingMapping).toBe(false)
  })

  it("validates the problem row filter logic matches deriveCsvFlags output", () => {
    const rows = [
      makeRow({ email: "a@x.com", subjectCode: "CS101", section: "BSIT-32A3", departmentCode: "CCS" }),
      makeRow({ email: "b@x.com", subjectCode: "NEW101", section: "BSIT-99Z", departmentCode: "INVALID" }),
      makeRow({ email: "c@x.com", subjectCode: "CS101", section: "BSCS-21B", departmentCode: "CAS" }),
    ]
    const result = deriveCsvFlags(rows, makeCtx())

    const problemRows = result.filter((r) => r.isNewSubject || r.isNewSection || r.isNewTeacher || r.isInvalidDept)
    const invalidDeptRows = result.filter((r) => r.isInvalidDept)
    const blockedRows = result.filter((r) => r.isExistingMapping)

    expect(problemRows).toHaveLength(2)
    expect(invalidDeptRows).toHaveLength(1)
    expect(invalidDeptRows[0].departmentCode).toBe("INVALID")
    expect(blockedRows).toHaveLength(0)
  })
})
