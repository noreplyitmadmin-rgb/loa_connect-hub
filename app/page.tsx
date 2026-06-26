import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getPrimaryRole, getRoleList } from "@/lib/utils/roles"
import { getUserAccess } from "@/lib/access"
import MultiRoleDashboard from "@/features/users/components/MultiRoleDashboard"

const DASHBOARD_ROLES = new Set(["ADMIN", "DEAN", "FACULTY", "STUDENT"])

export default async function Home() {
  const session = await auth()
  if (session?.user) {
    const su = session.user as Record<string, unknown>
    const role = su.role as string
    const userId = su.id as string
    const roles = getRoleList(role).filter(r => DASHBOARD_ROLES.has(r))

    if (roles.length > 1) {
      const access = await getUserAccess(userId, role)
      const granted = new Set(
        access.filter(a => a.access === "granted" && a.type === "ui").map(a => a.url)
      )
      const allowed = roles.filter(r => granted.has(`/${r.toLowerCase()}`))

      if (allowed.length === 0) {
        redirect("/403")
      }
      if (allowed.length === 1) {
        redirect(`/${allowed[0].toLowerCase()}`)
      }
      return <MultiRoleDashboard roles={allowed} />
    }

    const primary = getPrimaryRole(role)
    redirect(`/${primary.toLowerCase()}`)
  }
  redirect("/login")
}
