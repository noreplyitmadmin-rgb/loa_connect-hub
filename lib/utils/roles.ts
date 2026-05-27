const ROLE_PRIORITY = ["ADMIN", "DEAN", "FACULTY", "STUDENT", "GUEST"]

export function hasRole(roles: string, target: string): boolean {
  if (!roles) return false
  return roles.split("|").includes(target)
}

export function getPrimaryRole(roles: string): string {
  if (!roles) return "GUEST"
  const userRoles = roles.split("|")
  for (const p of ROLE_PRIORITY) {
    if (userRoles.includes(p)) return p
  }
  return "GUEST"
}

export function getRoleList(roles: string): string[] {
  if (!roles) return []
  return roles.split("|")
}
