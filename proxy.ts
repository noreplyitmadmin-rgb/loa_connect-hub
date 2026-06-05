import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const ROLE_PRIORITY = ["ADMIN", "DEAN", "FACULTY", "STUDENT", "GUEST"]

function getPrimaryRole(roles: string): string {
  if (!roles) return "GUEST"
  const userRoles = roles.split("|")
  for (const p of ROLE_PRIORITY) {
    if (userRoles.includes(p)) return p
  }
  return "GUEST"
}

const PAGE_ACCESS: Record<string, string[]> = {
  ADMIN: [
    "/", "/admin", "/admin/data-management", "/admin/users", "/admin/users/deleted",
    "/admin/access-config", "/admin/departments", "/admin/reports",
    "/admin/reports/health", "/admin/reports/demand", "/admin/reports/responsiveness",
    "/admin/reports/backlog", "/admin/etl-hub", "/admin/evaluations",
    "/admin/evaluations/periods", "/admin/evaluations/periods/new",
    "/admin/evaluations/results", "/faq",
  ],
  DEAN: [
    "/", "/dean", "/dean/upload", "/dean/departments", "/dean/evaluations/results",
    "/faculty/meetings", "/faculty/availability", "/faculty/reports", "/faq",
  ],
  FACULTY: [
    "/", "/faculty", "/faculty/meetings", "/faculty/availability", "/faculty/upload",
    "/faculty/evaluations/results", "/faq",
  ],
  STUDENT: [
    "/", "/student", "/student/book", "/student/meetings", "/student/history",
    "/student/evaluations", "/faq",
  ],
  GUEST: [],
}

const PUBLIC_PATHS = new Set([
  "/login", "/activate", "/forgot-password", "/change-password",
  "/setup-password", "/403",
])

const PUBLIC_PREFIXES = ["/_next", "/api"]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next()
  }

  if (pathname.includes(".")) return NextResponse.next()

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  const token = await getToken({ req: request, secret })

  if (!token) {
    if (pathname === "/") return NextResponse.next()
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  const rawRole = (token as Record<string, unknown>).role as string | undefined
  const group = getPrimaryRole(rawRole ?? "GUEST")
  const allowed = PAGE_ACCESS[group]
  const hasAccess = allowed?.some((p) => pathname === p || pathname.startsWith(p + "/"))

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/403", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
