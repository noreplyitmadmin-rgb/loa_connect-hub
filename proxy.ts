import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { hasPageAccess } from "@/lib/access"

const PUBLIC_PAGES = new Set([
  "/login", "/activate", "/forgot-password",
  "/change-password", "/setup-password", "/403",
])

const PUBLIC_API_PREFIXES = [
  "/api/auth/signin", "/api/auth/callback",
  "/api/auth/session", "/api/auth/csrf",
  "/api/auth/providers", "/api/auth/signout",
  "/api/auth/activate", "/api/auth/forgot-password",
  "/api/auth/change-password",
  "/api/auth/access",
  "/api/import/users",
  "/api/import/students",
]

export default withAuth(
  async function proxy(req) {
    try {
      const { pathname } = req.nextUrl

      // Allow static assets and public pages through
      if (pathname === "/logo-blk.png" || pathname === "/favicon.ico") return NextResponse.next()
      if (PUBLIC_PAGES.has(pathname)) return NextResponse.next()
      if (PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next()

      const token = req.nextauth.token
      const role = (token?.role as string) || ""

      if (!role) {
        return NextResponse.redirect(new URL("/login", req.url))
      }

      // Server-side API routes are protected by the JWT check above;
      // only UI pages need per-role access gating.
      if (!pathname.startsWith("/api/")) {
        if (!(await hasPageAccess(role, pathname))) {
          return NextResponse.redirect(new URL("/403", req.url))
        }
      }

      return NextResponse.next()
    } catch (err) {
      console.error("[proxy] Error:", err)
      return NextResponse.next()
    }
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const { pathname } = req.nextUrl
        if (pathname === "/favicon.ico" || pathname === "/logo-blk.png") return true
        if (pathname.startsWith("/_next/")) return true
        if (PUBLIC_PAGES.has(pathname)) return true
        if (PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
