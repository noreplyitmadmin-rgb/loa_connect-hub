import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    const role = token?.role as string | undefined

    if (pathname.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (pathname.startsWith("/faculty") && role !== "FACULTY" && role !== "DEAN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (pathname.startsWith("/dean") && role !== "DEAN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (pathname.startsWith("/admin/users") && role !== "ADMIN" && role !== "DEAN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        const { pathname } = req.nextUrl
        if (pathname.startsWith("/login") || pathname.startsWith("/activate") || pathname.startsWith("/change-password") || pathname.startsWith("/setup-password") || pathname.startsWith("/api/auth")) {
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
