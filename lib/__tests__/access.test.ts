import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from "@/lib/supabase"
import { hasPageAccess, userGroup, clearAccessConfigCache } from "@/lib/access"

function mockSupabaseResponse(rows: { groupName: string; pages: string[] }[]) {
  const mockSelect = vi.fn().mockResolvedValue({ data: rows, error: null })
  ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect })
}

beforeEach(() => {
  vi.resetAllMocks()
  clearAccessConfigCache()
})

describe("userGroup", () => {
  it("maps a pipe-delimited role to its primary group", () => {
    expect(userGroup("ADMIN")).toBe("ADMIN")
    expect(userGroup("STUDENT|FACULTY")).toBe("FACULTY")
    expect(userGroup("FACULTY|DEAN")).toBe("DEAN")
  })

  it("maps empty string to GUEST", () => {
    expect(userGroup("")).toBe("GUEST")
  })
})

describe("hasPageAccess", () => {
  it("allows access to exact matching pages", async () => {
    mockSupabaseResponse([
      { groupName: "ADMIN", pages: ["/admin", "/admin/users"] },
    ])
    await expect(hasPageAccess("ADMIN", "/admin")).resolves.toBe(true)
    await expect(hasPageAccess("ADMIN", "/admin/users")).resolves.toBe(true)
  })

  it("allows access to sub-paths of allowed pages", async () => {
    mockSupabaseResponse([
      { groupName: "ADMIN", pages: ["/admin/users"] },
    ])
    await expect(hasPageAccess("ADMIN", "/admin/users/create")).resolves.toBe(true)
    await expect(hasPageAccess("ADMIN", "/admin/users/123/edit")).resolves.toBe(true)
  })

  it("denies access to non-matching pages", async () => {
    mockSupabaseResponse([
      { groupName: "FACULTY", pages: ["/faculty"] },
    ])
    await expect(hasPageAccess("FACULTY", "/admin")).resolves.toBe(false)
    await expect(hasPageAccess("FACULTY", "/student")).resolves.toBe(false)
  })

  it("denies access when the role group has no config", async () => {
    mockSupabaseResponse([])
    await expect(hasPageAccess("NONEXISTENT", "/")).resolves.toBe(false)
  })

  it("uses cached config on subsequent calls", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ groupName: "STUDENT", pages: ["/student"] }],
      error: null,
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select })

    await hasPageAccess("STUDENT", "/student")
    await hasPageAccess("STUDENT", "/student")

    expect(select).toHaveBeenCalledTimes(1)
  })

  it("falls back to cache when DB fails (after first successful load)", async () => {
    const select = vi.fn()
    select.mockResolvedValueOnce({
      data: [{ groupName: "STUDENT", pages: ["/student/book"] }],
      error: null,
    })
    select.mockRejectedValueOnce(new Error("Network error"))
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select })

    await hasPageAccess("STUDENT", "/student/book")
    clearAccessConfigCache()
    await hasPageAccess("STUDENT", "/student/book")

    expect(select).toHaveBeenCalledTimes(2)
  })
})
