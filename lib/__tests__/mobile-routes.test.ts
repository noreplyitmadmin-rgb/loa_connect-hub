import { describe, it, expect } from "vitest"
import fg from "fast-glob"
import { MOBILE_ROUTES } from "@/lib/mobile-routes"

function findMobilePageFiles(): string[] {
  const files = fg.sync("app/**/m/**/page.tsx", { cwd: process.cwd() })
  return files.map((f) => "/" + f.replace(/\\/g, "/").replace(/^app\//, "").replace(/\/page\.tsx$/, ""))
}

function desktopFromMobile(mobile: string): string {
  return mobile.replace(/\/m(?:\/|$)/, "/").replace(/\/$/, "") || "/"
}

describe("MOBILE_ROUTES", () => {
  const mobilePages = findMobilePageFiles()

  it.each(mobilePages)("every mobile page file %s has a matching MOBILE_ROUTES entry", (mobilePath) => {
    const matched = MOBILE_ROUTES.some(
      (r) => mobilePath === r.mobile || mobilePath.startsWith(r.mobile + "/")
    )
    expect(matched, `No MOBILE_ROUTES entry covers ${mobilePath}. ` +
      `Add { desktop: "${desktopFromMobile(mobilePath)}", mobile: "${mobilePath}" }`).toBe(true)
  })

  it.each(MOBILE_ROUTES)("MOBILE_ROUTES entry %s has a corresponding page file", (route) => {
    const hasFile = mobilePages.some(
      (p) => p === route.mobile || p.startsWith(route.mobile + "/")
    )
    expect(hasFile, `No page file found for mobile route "${route.mobile}". ` +
      `Either create app/${route.mobile.slice(1)}/page.tsx or remove the entry`).toBe(true)
  })

  it("toDesktopPath round-trips every entry", async () => {
    const { toDesktopPath } = await import("@/lib/mobile-routes")
    for (const r of MOBILE_ROUTES) {
      expect(toDesktopPath(r.mobile)).toBe(r.desktop)
    }
  })
})
