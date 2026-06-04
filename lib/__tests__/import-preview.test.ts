import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.hoisted(() => vi.fn())
const mockParseCsv = vi.hoisted(() => vi.fn())
const mockFindByEmail = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/services/csvParser", () => ({ parseCsv: mockParseCsv }))
vi.mock("@/lib/repositories/factory", () => ({
  userRepository: { findByEmail: mockFindByEmail },
}))

import { POST } from "@/app/api/import/preview/route"

function mockRequest(formData: Record<string, unknown>): Request {
  return {
    formData: () =>
      Promise.resolve({
        get: (key: string) => formData[key] ?? null,
        append: vi.fn(),
        has: (key: string) => key in formData,
      } as unknown as FormData),
  } as unknown as Request
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/import/preview", () => {
  it("returns 403 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(mockRequest({}))
    expect(res.status).toBe(403)
  })

  it("returns 403 when role is GUEST", async () => {
    mockAuth.mockResolvedValue({ user: { role: "GUEST" } })
    const res = await POST(mockRequest({}))
    expect(res.status).toBe(403)
  })

  it("returns 400 when no file is provided", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } })
    const res = await POST(mockRequest({ type: "full" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("CSV file is required")
  })

  it("returns 400 on header mismatch", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } })
    mockParseCsv.mockReturnValue({ rows: [], errors: [], headerError: "Bad headers" })

    const file = new File(["irrelevant"], "test.csv", { type: "text/csv" })
    const res = await POST(mockRequest({ file, type: "full" }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Header mismatch")
  })

  it("returns preview rows with email existence check", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } })
    mockParseCsv.mockReturnValue({
      rows: [
        { name: "Jane", email: "jane@lyceumalabang.edu.ph", section: "A", code: "CS101", title: "Intro", course: null },
        { name: "Bob", email: "bob@lyceumalabang.edu.ph", section: "B", code: "CS102", title: "Data", course: null },
      ],
      errors: [],
    })

    mockFindByEmail
      .mockResolvedValueOnce({ name: "Jane Existing" })
      .mockResolvedValueOnce(null)

    const file = new File(["mock"], "test.csv", { type: "text/csv" })
    const res = await POST(mockRequest({ file, type: "full" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalRows).toBe(2)
    expect(body.rows[0].emailExists).toBe(true)
    expect(body.rows[0].existingName).toBe("Jane Existing")
    expect(body.rows[1].emailExists).toBe(false)
    expect(body.rows[1].existingName).toBeNull()
  })

  it("works for student type as well", async () => {
    mockAuth.mockResolvedValue({ user: { role: "DEAN" } })
    mockParseCsv.mockReturnValue({
      rows: [
        { name: "Alice", email: "alice@lyceumalabang.edu.ph", section: null, code: null, title: null, course: "BSIT" },
      ],
      errors: [],
    })
    mockFindByEmail.mockResolvedValue(null)

    const file = new File(["mock"], "test.csv", { type: "text/csv" })
    const res = await POST(mockRequest({ file, type: "students" }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalRows).toBe(1)
    expect(body.rows[0].course).toBe("BSIT")
  })
})
