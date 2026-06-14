import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetToken = vi.hoisted(() => vi.fn())
const mockSupabaseFrom = vi.hoisted(() => vi.fn())
const mockLoadAccessConfig = vi.hoisted(() => vi.fn())

vi.mock("next-auth/jwt", () => ({
  getToken: mockGetToken,
}))

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}))

vi.mock("@/lib/access", () => ({
  loadAccessConfig: mockLoadAccessConfig,
}))

import { proxy } from "@/proxy"

function mockRequest(pathname: string, extra: Record<string, unknown> = {}): Request {
  const url = new URL(`https://app.test${pathname}`)
  return {
    url: url.href,
    nextUrl: url,
    headers: new Headers(),
    ...extra,
  } as unknown as Request
}

function isRedirect(res: Response): boolean {
  return res.status >= 300 && res.status < 400
}

function isForbidden(res: Response): boolean {
  return res.status === 403
}

describe("proxy middleware", () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })
    mockLoadAccessConfig.mockResolvedValue({})
  })

  it("allows public paths without token", async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await proxy(mockRequest("/login"))
    expect(isRedirect(res)).toBe(false)
    expect(isForbidden(res)).toBe(false)
  })

  it("allows public prefixes without token", async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await proxy(mockRequest("/api/auth/session"))
    expect(isRedirect(res)).toBe(false)
    expect(isForbidden(res)).toBe(false)
  })

  it("redirects unauthenticated requests to login", async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await proxy(mockRequest("/faculty/meetings"))
    expect(res.status).toBe(307)
  })

  it("allows root path without token", async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await proxy(mockRequest("/"))
    expect(res.status).toBe(200)
  })

  it("allows API routes for authenticated users", async () => {
    mockGetToken.mockResolvedValue({ role: "FACULTY", id: "user-1" })
    const res = await proxy(mockRequest("/api/appointments"))
    expect(res.status).toBe(200)
  })

  it("blocks admin API routes for non-admin users", async () => {
    mockGetToken.mockResolvedValue({ role: "FACULTY", id: "user-1" })
    const res = await proxy(mockRequest("/api/admin/users"))
    expect(res.status).toBe(403)
  })

  it("allows admin API routes for admin users", async () => {
    mockGetToken.mockResolvedValue({ role: "ADMIN|FACULTY", id: "admin-1" })
    const res = await proxy(mockRequest("/api/admin/users"))
    expect(res.status).toBe(200)
  })

  it("redirects to 403 when page access is denied", async () => {
    mockGetToken.mockResolvedValue({ role: "STUDENT", id: "user-1" })
    mockLoadAccessConfig.mockResolvedValue({
      STUDENT: { pages: ["/student"] },
    })
    const res = await proxy(mockRequest("/admin"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/403")
  })

  it("allows page access when DB config grants it", async () => {
    mockGetToken.mockResolvedValue({ role: "STUDENT", id: "user-1" })
    mockLoadAccessConfig.mockResolvedValue({
      STUDENT: { pages: ["/student", "/student/meetings"] },
    })
    const res = await proxy(mockRequest("/student/meetings"))
    expect(res.status).toBe(200)
  })

  it("denies access via user-level permission deny", async () => {
    mockGetToken.mockResolvedValue({ role: "STUDENT", id: "user-1" })
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ resource_path: "/student", grants: [], denies: ["access"] }],
          error: null,
        }),
      }),
    })
    const res = await proxy(mockRequest("/student"))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/403")
  })
})
