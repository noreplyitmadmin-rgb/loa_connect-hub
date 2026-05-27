import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { hasRole } from "@/lib/utils/roles"

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    const role = (token?.role as string) || ""

    if (pathname.startsWith("/student") && !hasRole(role, "STUDENT")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (pathname.startsWith("/faculty") && !hasRole(role, "FACULTY") && !hasRole(role, "DEAN")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (pathname.startsWith("/dean") && !hasRole(role, "DEAN")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (pathname.startsWith("/admin") && !hasRole(role, "ADMIN")) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const { pathname } = req.nextUrl
        if (pathname.startsWith("/login") || pathname.startsWith("/activate") || pathname.startsWith("/forgot-password") || pathname.startsWith("/change-password") || pathname.startsWith("/setup-password") || pathname.startsWith("/api/auth")) {
          return true
        }
        // Allow public static files
        if (pathname === "/logo-blk.png" || pathname === "/favicon.ico") {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
