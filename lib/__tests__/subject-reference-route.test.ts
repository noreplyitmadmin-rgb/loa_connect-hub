import { describe, it, expect, vi, beforeEach } from "vitest"

const mockRequireAdmin = vi.hoisted(() => vi.fn())
const mockSubjectList = vi.hoisted(() => vi.fn())

vi.mock("@/lib/route-guard", () => ({ requireAdmin: mockRequireAdmin }))
vi.mock("@/lib/repositories/factory", () => ({
  subjectRepository: { list: mockSubjectList },
}))

import { GET } from "@/app/api/import/subjects/reference/route"

function mockRequest(): Request {
  return new Request("http://localhost/api/import/subjects/reference")
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("GET /api/import/subjects/reference", () => {
  it("returns 403 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(new Response("Forbidden", { status: 403 }))
    const res = await GET(mockRequest() as never)
    expect(res.status).toBe(403)
  })

  it("returns subjects list on success", async () => {
    mockRequireAdmin.mockResolvedValue(null)
    mockSubjectList.mockResolvedValue([
      { id: "s1", code: "CS101", name: "Intro to CS", isDisabled: false },
      { id: "s2", code: "MATH201", name: "Calculus II", isDisabled: true },
    ])

    const res = await GET(mockRequest() as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.subjects).toHaveLength(2)
    expect(body.subjects[0]).toEqual({ id: "s1", code: "CS101", name: "Intro to CS" })
    expect(body.subjects[1]).toEqual({ id: "s2", code: "MATH201", name: "Calculus II" })
  })

  it("returns 500 when repository throws", async () => {
    mockRequireAdmin.mockResolvedValue(null)
    mockSubjectList.mockRejectedValue(new Error("DB down"))

    const res = await GET(mockRequest() as never)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("Failed to fetch reference data")
  })
})
