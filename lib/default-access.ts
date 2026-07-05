import { pageApiMap } from "./page-api-map"

export const DEFAULT_ROLE_PREFIXES: Record<string, string[]> = {
  STUDENT: ["/student", "/evaluate", "/", "/faq", "/403"],
  FACULTY: ["/faculty", "/", "/faq", "/403"],
}

export function getDefaultPages(role: string): string[] {
  const prefixes = DEFAULT_ROLE_PREFIXES[role]
  if (!prefixes) return []

  const paths = new Set<string>()
  for (const [pagePath, entry] of Object.entries(pageApiMap)) {
    if (prefixes.some((p) => pagePath === p || pagePath.startsWith(p + "/"))) {
      paths.add(pagePath)
      for (const api of entry.apis) {
        paths.add(api)
      }
    }
  }
  return Array.from(paths)
}

export function getDefaultUIPages(role: string): string[] {
  const prefixes = DEFAULT_ROLE_PREFIXES[role]
  if (!prefixes) return []

  const paths: string[] = []
  for (const pagePath of Object.keys(pageApiMap)) {
    if (pagePath.startsWith("/api/")) continue
    if (prefixes.some((p) => pagePath === p || pagePath.startsWith(p + "/"))) {
      paths.push(pagePath)
    }
  }
  return paths
}
