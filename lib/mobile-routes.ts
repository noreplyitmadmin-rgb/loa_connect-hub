export const MOBILE_ROUTES: { desktop: string; mobile: string }[] = [
  { desktop: "/student/book", mobile: "/student/m/book" },
  { desktop: "/student/meetings", mobile: "/student/m/meetings" },
  { desktop: "/faculty/meetings", mobile: "/faculty/m/meetings" },
  { desktop: "/dean", mobile: "/dean/m" },
  { desktop: "/dean/departments", mobile: "/dean/m/departments" },
  { desktop: "/dean/upload", mobile: "/dean/m/upload" },
]

export function toDesktopPath(pathname: string): string {
  for (const { desktop, mobile } of MOBILE_ROUTES) {
    if (pathname === mobile || pathname.startsWith(mobile + "/")) {
      const rest = pathname.slice(mobile.length)
      return desktop + rest
    }
  }
  return pathname
}
