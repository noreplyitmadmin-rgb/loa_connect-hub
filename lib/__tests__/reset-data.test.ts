import { describe, it, expect, vi, beforeEach } from "vitest"

const mockAuth = vi.hoisted(() => vi.fn())

function buildMockSupabase() {
  const deleteFn = vi.fn()
  const neqFn = vi.fn()
  const notFn = vi.fn()

  deleteFn.mockReturnValue({ neq: neqFn, not: notFn })
  neqFn.mockReturnValue({})
  notFn.mockReturnValue({})

  const fromFn = vi.fn().mockReturnValue({ delete: deleteFn })

  return { supabase: { from: fromFn }, deleteFn, neqFn, notFn }
}

const mockSupabase = vi.hoisted(() => buildMockSupabase())

vi.mock("@/lib/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/supabase", () => ({ supabase: mockSupabase.supabase }))

import { POST } from "@/app/api/admin/reset-data/route"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/admin/reset-data", () => {
  it("returns 403 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(403)
  })

  it("returns 403 when not ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { role: "FACULTY" } })
    const res = await POST()
    expect(res.status).toBe(403)
  })

  it("returns 200 on success", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } })
    mockSupabase.neqFn.mockResolvedValue({ error: null })
    mockSupabase.notFn.mockResolvedValue({ error: null })
    mockSupabase.deleteFn.mockReturnValue({
      neq: mockSupabase.neqFn,
      not: mockSupabase.notFn,
    })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 500 when a table clear fails", async () => {
    mockAuth.mockResolvedValue({ user: { role: "ADMIN" } })
    mockSupabase.neqFn.mockResolvedValue({ error: { message: "DB error" } })
    mockSupabase.notFn.mockResolvedValue({ error: null })
    mockSupabase.deleteFn.mockReturnValue({
      neq: mockSupabase.neqFn,
      not: mockSupabase.notFn,
    })

    const res = await POST()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain("DB error")
  })
})
