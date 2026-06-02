import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { hasPageAccess } from "@/lib/access"
import { MOBILE_ROUTES, toDesktopPath } from "@/lib/mobile-routes"

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

const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i

function mobileRedirect(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl
  // Skip if already on a mobile route or opted into desktop
  if (/\/m(?:\/|$)/.test(pathname) || request.nextUrl.searchParams.has("desktop")) return
  const ua = request.headers.get("user-agent") || ""
  if (!MOBILE_UA.test(ua)) return
  for (const { desktop, mobile } of MOBILE_ROUTES) {
    if (pathname === desktop || pathname.startsWith(desktop + "/")) {
      const rest = pathname.slice(desktop.length)
      return NextResponse.redirect(new URL(mobile + rest + request.nextUrl.search, request.url))
    }
  }
}

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

      // Mobile UA redirect — run BEFORE role-specific page access so
      // cross-role mobile redirects (e.g. dean → faculty/m/meetings) work.
      const mob = mobileRedirect(req)
      if (mob) return mob

      // Server-side API routes are protected by the JWT check above;
      // only UI pages need per-role access gating.
      if (!pathname.startsWith("/api/")) {
        // Map mobile paths to desktop equivalents for access checking,
        // since the access config only knows about desktop routes.
        const checkPath = toDesktopPath(pathname)
        if (!(await hasPageAccess(role, checkPath))) {
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
