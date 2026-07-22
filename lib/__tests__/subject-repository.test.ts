import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  supabase: mockSupabase,
}))

import { subjectRepository } from "@/features/admin-data/subject.repository"

function chainable(resolveValue: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    _resolve: resolveValue,
    then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(onFulfilled),
  }
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ── upsertMany ────────────────────────────────────────────

describe("subjectRepository.upsertMany", () => {
  it("inserts all items when none exist", async () => {
    const existingData: never[] = []
    const createdData = [
      { id: "s1", code: "CS101", name: "Intro to CS" },
      { id: "s2", code: "MATH201", name: "Calculus II" },
    ]

    mockSupabase.from
      .mockReturnValueOnce(chainable({ data: existingData, error: null })) // SELECT existing
      .mockReturnValueOnce(chainable({ data: createdData, error: null })) // INSERT missing

    const result = await subjectRepository.upsertMany([
      { code: "CS101", name: "Intro to CS" },
      { code: "MATH201", name: "Calculus II" },
    ])

    expect(result.created).toBe(2)
    expect(result.updated).toBe(0)
    expect(result.data.size).toBe(2)
    expect(result.data.get("CS101")).toEqual({ id: "s1", code: "CS101", name: "Intro to CS" })
    expect(result.data.get("MATH201")).toEqual({ id: "s2", code: "MATH201", name: "Calculus II" })
  })

  it("skips insert when all subjects already exist with same name", async () => {
    const existingData = [
      { id: "s1", code: "CS101", name: "Intro to CS" },
    ]

    mockSupabase.from
      .mockReturnValueOnce(chainable({ data: existingData, error: null })) // SELECT existing

    const result = await subjectRepository.upsertMany([
      { code: "CS101", name: "Intro to CS" },
    ])

    expect(result.created).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.data.size).toBe(1)
    expect(result.data.get("CS101")?.name).toBe("Intro to CS")
  })

  it("updates name when code exists but name differs", async () => {
    const existingData = [
      { id: "s1", code: "CS101", name: "Old Name" },
    ]
    const updatedData = { id: "s1", code: "CS101", name: "New Name" }

    mockSupabase.from
      .mockReturnValueOnce(chainable({ data: existingData, error: null })) // SELECT existing
      .mockReturnValueOnce(chainable({ data: updatedData, error: null })) // UPDATE name

    const result = await subjectRepository.upsertMany([
      { code: "CS101", name: "New Name" },
    ])

    expect(result.created).toBe(0)
    expect(result.updated).toBe(1)
    expect(result.data.get("CS101")?.name).toBe("New Name")
  })

  it("inserts new items and updates existing items with different names", async () => {
    const existingData = [
      { id: "s1", code: "CS101", name: "Old Name" },
    ]
    const createdData = [
      { id: "s2", code: "MATH201", name: "Calculus II" },
    ]
    const updatedData = { id: "s1", code: "CS101", name: "New Name" }

    mockSupabase.from
      .mockReturnValueOnce(chainable({ data: existingData, error: null })) // SELECT existing
      .mockReturnValueOnce(chainable({ data: createdData, error: null })) // INSERT missing
      .mockReturnValueOnce(chainable({ data: updatedData, error: null })) // UPDATE name

    const result = await subjectRepository.upsertMany([
      { code: "CS101", name: "New Name" },
      { code: "MATH201", name: "Calculus II" },
    ])

    expect(result.created).toBe(1)
    expect(result.updated).toBe(1)
    expect(result.data.size).toBe(2)
  })

  it("throws on fetch error", async () => {
    mockSupabase.from
      .mockReturnValueOnce(chainable({ data: null, error: { message: "DB error" } }))

    await expect(
      subjectRepository.upsertMany([{ code: "CS101", name: "Intro" }]),
    ).rejects.toThrow("DB error")
  })

  it("throws on insert error", async () => {
    mockSupabase.from
      .mockReturnValueOnce(chainable({ data: [], error: null })) // SELECT existing
      .mockReturnValueOnce(chainable({ data: null, error: { message: "Insert failed" } })) // INSERT

    await expect(
      subjectRepository.upsertMany([{ code: "CS101", name: "Intro" }]),
    ).rejects.toThrow("Insert failed")
  })

  it("throws on update error", async () => {
    const existingData = [
      { id: "s1", code: "CS101", name: "Old" },
    ]

    mockSupabase.from
      .mockReturnValueOnce(chainable({ data: existingData, error: null })) // SELECT existing
      .mockReturnValueOnce(chainable({ data: null, error: { message: "Update failed" } })) // UPDATE

    await expect(
      subjectRepository.upsertMany([{ code: "CS101", name: "New" }]),
    ).rejects.toThrow("Update failed")
  })

  it("returns empty data map for empty input", async () => {
    mockSupabase.from
      .mockReturnValueOnce(chainable({ data: [], error: null })) // SELECT with empty IN clause

    const result = await subjectRepository.upsertMany([])
    expect(result.created).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.data.size).toBe(0)
  })
})
