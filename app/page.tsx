import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getPrimaryRole, getRoleList } from "@/lib/utils/roles"
import MultiRoleDashboard from "@/components/MultiRoleDashboard"

export default async function Home() {
  const session = await auth()
  if (session?.user) {
    const role = (session.user as any).role
    const roles = getRoleList(role)
    if (roles.length > 1) {
      // Multi-role user — show role selector
      return <MultiRoleDashboard role={role} />
    }
    const primary = getPrimaryRole(role)
    redirect(`/${primary.toLowerCase()}`)
  }
  redirect("/login")
}
