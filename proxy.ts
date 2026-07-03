import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt";
import { getUserAccess } from "@/lib/access"

const PUBLIC_PATHS = new Set([
  "/login", "/activate", "/forgot-password", "/change-password",
  "/setup-password", "/faq",
])

const PUBLIC_PREFIXES = ["/_next", "/api/auth", "/api/test-auth", "/api/audit"]

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
  const userId = (token as Record<string, unknown>).id as string
  const isAdmin = rawRole?.includes('ADMIN')

  const access = await getUserAccess(userId, rawRole ?? "GUEST")

  // Most specific path match first (longest url wins)
  const matched = [...access]
    .sort((a, b) => b.url.length - a.url.length)
    .find(a => pathname === a.url || pathname.startsWith(a.url + "/"))

  if (matched) {
    if (matched.access === "granted") return NextResponse.next()
    // Explicitly revoked
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({
        error: 'Forbidden',
        message: 'This route is locked in the access configuration.',
        path: pathname,
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    return NextResponse.next();
  }

  // ADMIN fallback: allow any path not explicitly tracked
  if (isAdmin) return NextResponse.next()

  // Closed-by-default: deny API; let UI pages through (LockedTab on client side)
  if (pathname.startsWith('/api/')) {
    return new NextResponse(JSON.stringify({
      error: 'Forbidden',
      message: 'Access is not configured for this route.',
      path: pathname,
    }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
