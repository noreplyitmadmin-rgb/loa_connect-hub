import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the factory module BEFORE any imports that use it
vi.mock("@/lib/repositories/factory", () => ({
  subjectRepository: { upsertMany: vi.fn() },
  sectionRepository: { upsertMany: vi.fn() },
  userRepository: { findManyByEmail: vi.fn(), createMany: vi.fn() },
  facultySubjectRepository: { replaceBySection: vi.fn() },
  studentEnrollmentRepository: { replaceBySection: vi.fn() },
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [
          { id: "course-bsit", code: "BSIT" },
          { id: "course-bscs", code: "BSCS" },
        ],
        error: null,
      }),
    })),
  },
}))

import { parseFacultySubjectCsv, parseStudentEnrollmentCsv, importFacultySubjects, importStudentEnrollments } from "@/lib/services/etlEvaluation"
import * as factory from "@/lib/repositories/factory"

// ── Helpers ───────────────────────────────────────────────

function mockSubjectUpsert(map: Map<string, { id: string }>, created = 0) {
  ;(factory.subjectRepository.upsertMany as ReturnType<typeof vi.fn>).mockResolvedValue({ data: map, created })
}

function mockSectionUpsert(map: Map<string, { id: string }>, created = 0) {
  ;(factory.sectionRepository.upsertMany as ReturnType<typeof vi.fn>).mockResolvedValue({ data: map, created })
}

function mockFindUsers(map: Map<string, { id: string; email: string; name: string; role: string }>) {
  ;(factory.userRepository.findManyByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(map)
}

function mockCreateUsers(map: Map<string, { id: string; email: string; name: string; role: string }>) {
  ;(factory.userRepository.createMany as ReturnType<typeof vi.fn>).mockResolvedValue(map)
}

const userCreateRepo = () => factory.userRepository.createMany as ReturnType<typeof vi.fn>
const fsRepo = () => factory.facultySubjectRepository.replaceBySection as ReturnType<typeof vi.fn>
const seRepo = () => factory.studentEnrollmentRepository.replaceBySection as ReturnType<typeof vi.fn>

// ── parseFacultySubjectCsv ─────────────────────────────────

describe("parseFacultySubjectCsv", () => {
  const validHeaders = "faculty email, name, subject code, section"

  it("parses valid rows with name column", () => {
    const csv = `${validHeaders}
juan.delacruz@example.com, Juan Dela Cruz, CS101, BSIT-32A3
maria.santos@example.com, Maria Santos, MATH201, BSCS-21B`
    const result = parseFacultySubjectCsv(csv)
    expect(result.headerError).toBeUndefined()
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0]).toEqual({
      email: "juan.delacruz@example.com",
      name: "Juan Dela Cruz",
      subjectCode: "CS101",
      sectionName: "32A3",
      sectionProgram: "BSIT",
    })
    expect(result.rows[1]).toEqual({
      email: "maria.santos@example.com",
      name: "Maria Santos",
      subjectCode: "MATH201",
      sectionName: "21B",
      sectionProgram: "BSCS",
    })
  })

  it("parses valid rows without name column (backward compat)", () => {
    const csv = `faculty email, subject code, section
juan.delacruz@example.com, CS101, BSIT-32A3
maria.santos@example.com, MATH201, BSCS-21B`
    const result = parseFacultySubjectCsv(csv)
    expect(result.headerError).toBeUndefined()
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].name).toBe("")
    expect(result.rows[0].email).toBe("juan.delacruz@example.com")
    expect(result.rows[0].subjectCode).toBe("CS101")
    expect(result.rows[0].sectionName).toBe("32A3")
  })

  it("parses section without program prefix", () => {
    const csv = `${validHeaders}
juan.delacruz@example.com, Juan, CS101, 32A3`
    const result = parseFacultySubjectCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].sectionName).toBe("32A3")
    expect(result.rows[0].sectionProgram).toBe("")
  })

  it("rejects empty file", () => {
    const result = parseFacultySubjectCsv("")
    expect(result.headerError).toBe("CSV file is empty")
    expect(result.rows).toHaveLength(0)
  })

  it("rejects wrong first header", () => {
    const csv = `email, name, subject code, section
juan@example.com, Juan, CS101, BSIT-32A3`
    const result = parseFacultySubjectCsv(csv)
    expect(result.headerError).toContain("faculty email")
  })

  it("rejects wrong header without name", () => {
    const csv = `faculty email, subject_name, section
juan@example.com, CS101, BSIT-32A3`
    const result = parseFacultySubjectCsv(csv)
    expect(result.headerError).toContain("subject code")
  })

  it("rejects wrong header with name", () => {
    const csv = `faculty email, name, subject_name, section
juan@example.com, Juan, CS101, BSIT-32A3`
    const result = parseFacultySubjectCsv(csv)
    expect(result.headerError).toContain("name, subject code, section")
  })

  it("rejects too few columns without name", () => {
    const csv = `faculty email, subject code
CS101`
    const result = parseFacultySubjectCsv(csv)
    expect(result.headerError).toContain("at least 3")
  })

  it("rejects too few columns with name", () => {
    const csv = `faculty email, name, subject code
juan@example.com, Juan, CS101`
    const result = parseFacultySubjectCsv(csv)
    expect(result.headerError).toContain("at least 4")
  })

  it("collects row-level errors for short rows", () => {
    const csv = `${validHeaders}
juan@example.com, Juan, CS101, BSIT-32A3
incomplete`
    const result = parseFacultySubjectCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].row).toBe(3)
    expect(result.errors[0].message).toContain("4 columns")
  })

  it("rejects missing email", () => {
    const csv = `${validHeaders}
, Juan, CS101, BSIT-32A3`
    const result = parseFacultySubjectCsv(csv)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("email is required")
  })

  it("rejects missing subject code", () => {
    const csv = `${validHeaders}
juan@example.com, Juan, , BSIT-32A3`
    const result = parseFacultySubjectCsv(csv)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("Subject code")
  })

  it("rejects missing section", () => {
    const csv = `${validHeaders}
juan@example.com, Juan, CS101,`
    const result = parseFacultySubjectCsv(csv)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("Section is required")
  })

  it("handles section with extra commas", () => {
    const csv = `${validHeaders}
juan@example.com, Juan, CS101, BSIT-32A3, extra, stuff`
    const result = parseFacultySubjectCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].sectionName).toBe("32A3, extra, stuff")
  })

  it("trims whitespace from values", () => {
    const csv = `${validHeaders}
  juan@example.com  ,  Juan  ,  CS101  ,  BSIT-32A3  `
    const result = parseFacultySubjectCsv(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].email).toBe("juan@example.com")
    expect(result.rows[0].name).toBe("Juan")
    expect(result.rows[0].subjectCode).toBe("CS101")
    expect(result.rows[0].sectionProgram).toBe("BSIT")
    expect(result.rows[0].sectionName).toBe("32A3")
  })

  it("handles duplicate rows by keeping both", () => {
    const csv = `${validHeaders}
juan@example.com, Juan, CS101, BSIT-32A3
juan@example.com, Juan, CS101, BSIT-32A3`
    const result = parseFacultySubjectCsv(csv)
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
  })
})

// ── parseStudentEnrollmentCsv ──────────────────────────────

describe("parseStudentEnrollmentCsv", () => {
  const validHeaders = "student email, name, section"

  it("parses valid rows with name column", () => {
    const csv = `${validHeaders}
ana.reyes@example.com, Ana Reyes, BSIT-32A3
pedro.cruz@example.com, Pedro Cruz, BSCS-21B`
    const result = parseStudentEnrollmentCsv(csv)
    expect(result.headerError).toBeUndefined()
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0]).toEqual({
      email: "ana.reyes@example.com",
      name: "Ana Reyes",
      sectionName: "32A3",
      sectionProgram: "BSIT",
    })
    expect(result.rows[1]).toEqual({
      email: "pedro.cruz@example.com",
      name: "Pedro Cruz",
      sectionName: "21B",
      sectionProgram: "BSCS",
    })
  })

  it("parses valid rows without name column", () => {
    const csv = `student email, section
ana.reyes@example.com, BSIT-32A3`
    const result = parseStudentEnrollmentCsv(csv)
    expect(result.headerError).toBeUndefined()
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].name).toBe("")
    expect(result.rows[0].email).toBe("ana.reyes@example.com")
  })

  it("rejects wrong first header", () => {
    const csv = `email, name, section
ana@example.com, Ana, BSIT-32A3`
    const result = parseStudentEnrollmentCsv(csv)
    expect(result.headerError).toContain("student email")
  })

  it("rejects missing email", () => {
    const csv = `${validHeaders}
, Ana, BSIT-32A3`
    const result = parseStudentEnrollmentCsv(csv)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("email is required")
  })

  it("rejects missing section", () => {
    const csv = `${validHeaders}
ana@example.com, Ana,`
    const result = parseStudentEnrollmentCsv(csv)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("Section is required")
  })

  it("handles duplicate rows by keeping both", () => {
    const csv = `${validHeaders}
ana@example.com, Ana, BSIT-32A3
ana@example.com, Ana, BSIT-32A3`
    const result = parseStudentEnrollmentCsv(csv)
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
  })

  it("trims whitespace", () => {
    const csv = `${validHeaders}
  ana@example.com  ,  Ana  ,  BSIT-32A3  `
    const result = parseStudentEnrollmentCsv(csv)
    expect(result.rows[0].email).toBe("ana@example.com")
    expect(result.rows[0].name).toBe("Ana")
  })
})

// ── Import functions ───────────────────────────────────────

describe("importFacultySubjects", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("imports faculty subjects successfully", async () => {
    mockSubjectUpsert(new Map([["CS101", { id: "subj-1" }]]), 1)
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 1)
    mockFindUsers(new Map())
    mockCreateUsers(new Map([["juan@example.com", { id: "user-1", email: "juan@example.com", name: "Juan", role: "FACULTY" }]]))

    const result = await importFacultySubjects([
      { email: "juan@example.com", name: "Juan", subjectCode: "CS101", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(result.matched).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(result.createdSubjects).toBe(1)
    expect(result.createdSections).toBe(1)
    expect(userCreateRepo()).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ email: "juan@example.com", name: "Juan", role: "FACULTY" }),
      ]),
    )
    expect(fsRepo()).toHaveBeenCalledWith("sec-1", [{ faculty_id: "user-1", subject_id: "subj-1" }])
  })

  it("uses email fallback name when name is empty", async () => {
    mockSubjectUpsert(new Map([["CS101", { id: "subj-1" }]]), 0)
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 0)
    mockFindUsers(new Map())
    mockCreateUsers(new Map([["juan@example.com", { id: "user-1", email: "juan@example.com", name: "juan", role: "FACULTY" }]]))

    await importFacultySubjects([
      { email: "juan@example.com", name: "", subjectCode: "CS101", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(userCreateRepo()).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "juan" }),
      ]),
    )
  })

  it("reports error when subject not found", async () => {
    mockSubjectUpsert(new Map(), 0)
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 0)
    mockFindUsers(new Map([["juan@example.com", { id: "user-1", email: "juan@example.com", name: "Juan", role: "FACULTY" }]]))

    const result = await importFacultySubjects([
      { email: "juan@example.com", name: "Juan", subjectCode: "NONEXISTENT", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(result.matched).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("could not be created or found")
  })

  it("reports error when section not found", async () => {
    mockSubjectUpsert(new Map([["CS101", { id: "subj-1" }]]), 0)
    mockSectionUpsert(new Map(), 0)
    mockFindUsers(new Map([["juan@example.com", { id: "user-1", email: "juan@example.com", name: "Juan", role: "FACULTY" }]]))

    const result = await importFacultySubjects([
      { email: "juan@example.com", name: "Juan", subjectCode: "CS101", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(result.matched).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("could not be created or found")
  })

  it("handles duplicate emails without re-creating users", async () => {
    mockSubjectUpsert(new Map([["CS101", { id: "subj-1" }]]), 0)
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 0)
    mockFindUsers(new Map([["juan@example.com", { id: "user-1", email: "juan@example.com", name: "Juan", role: "FACULTY" }]]))
    mockCreateUsers(new Map())

    const result = await importFacultySubjects([
      { email: "juan@example.com", name: "Juan", subjectCode: "CS101", sectionName: "32A3", sectionProgram: "BSIT" },
      { email: "juan@example.com", name: "Juan", subjectCode: "CS101", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(result.matched).toBe(2)
    expect(result.errors).toHaveLength(0)
    expect(userCreateRepo()).not.toHaveBeenCalled()
  })

  it("returns empty result for no rows", async () => {
    const result = await importFacultySubjects([])
    expect(result.matched).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(result.createdSubjects).toBe(0)
    expect(result.createdSections).toBe(0)
  })

  it("reports error when user not found and create fails", async () => {
    mockSubjectUpsert(new Map([["CS101", { id: "subj-1" }]]), 0)
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 0)
    mockFindUsers(new Map())
    mockCreateUsers(new Map())

    const result = await importFacultySubjects([
      { email: "nobody@example.com", name: "Nobody", subjectCode: "CS101", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(result.matched).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("not found")
  })
})

describe("importStudentEnrollments", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("imports student enrollments successfully", async () => {
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 1)
    mockFindUsers(new Map())
    mockCreateUsers(new Map([["ana@example.com", { id: "user-1", email: "ana@example.com", name: "Ana", role: "STUDENT" }]]))

    const result = await importStudentEnrollments([
      { email: "ana@example.com", name: "Ana", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(result.matched).toBe(1)
    expect(result.errors).toHaveLength(0)
    expect(result.createdSections).toBe(1)
    expect(userCreateRepo()).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ email: "ana@example.com", name: "Ana", role: "STUDENT" }),
      ]),
    )
    expect(seRepo()).toHaveBeenCalledWith("sec-1", [{ student_id: "user-1" }])
  })

  it("uses email fallback name when name is empty", async () => {
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 0)
    mockFindUsers(new Map())
    mockCreateUsers(new Map([["ana@example.com", { id: "user-1", email: "ana@example.com", name: "ana", role: "STUDENT" }]]))

    await importStudentEnrollments([
      { email: "ana@example.com", name: "", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(userCreateRepo()).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "ana" }),
      ]),
    )
  })

  it("reports error when student not found and create fails", async () => {
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 0)
    mockFindUsers(new Map())
    mockCreateUsers(new Map())

    const result = await importStudentEnrollments([
      { email: "unknown@example.com", name: "", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("not found")
  })

  it("handles duplicate emails without re-creating users", async () => {
    mockSectionUpsert(new Map([["32A3|BSIT", { id: "sec-1" }]]), 0)
    mockFindUsers(new Map([["ana@example.com", { id: "user-1", email: "ana@example.com", name: "Ana", role: "STUDENT" }]]))
    mockCreateUsers(new Map())

    const result = await importStudentEnrollments([
      { email: "ana@example.com", name: "Ana", sectionName: "32A3", sectionProgram: "BSIT" },
      { email: "ana@example.com", name: "Ana", sectionName: "32A3", sectionProgram: "BSIT" },
    ])

    expect(result.matched).toBe(2)
    expect(result.errors).toHaveLength(0)
    expect(userCreateRepo()).not.toHaveBeenCalled()
    expect(seRepo()).toHaveBeenCalledTimes(1)
  })

  it("returns empty result for no rows", async () => {
    const result = await importStudentEnrollments([])
    expect(result.matched).toBe(0)
    expect(result.errors).toHaveLength(0)
    expect(result.createdSections).toBe(0)
  })

  it("reports error when section not found", async () => {
    mockSectionUpsert(new Map(), 0)
    mockFindUsers(new Map([["ana@example.com", { id: "user-1", email: "ana@example.com", name: "Ana", role: "STUDENT" }]]))

    const result = await importStudentEnrollments([
      { email: "ana@example.com", name: "Ana", sectionName: "NONEXISTENT", sectionProgram: "BSIT" },
    ])

    expect(result.matched).toBe(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("could not be created or found")
  })
})
