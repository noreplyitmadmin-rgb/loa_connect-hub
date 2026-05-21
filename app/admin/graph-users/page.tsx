import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { fetchUsersFromGraph } from "@/lib/services/graph"

export default async function GraphUsersPage() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/login")
  }

  const graphUsers = await fetchUsersFromGraph().catch(() => [] as any[])

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">Microsoft Entra ID Users</h1>
        <p className="text-sm text-slate-500 mt-1">
          Fetched directly from Microsoft Graph API using app-only authentication
        </p>
      </div>

      {graphUsers.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-slate-500">No users found or Graph API is not configured.</p>
          <p className="text-xs text-slate-400 mt-2">
            Make sure FEATURE_CREATE_TEAMS_MEETING=true and MICROSOFT_CLIENT_ID/SECRET are set.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">User Principal Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ID</th>
                </tr>
              </thead>
              <tbody>
                {graphUsers.slice(0, 20).map((user: any) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{user.displayName}</td>
                    <td className="px-4 py-3 text-slate-600">{user.mail || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{user.userPrincipalName}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{user.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 border-t border-slate-200">
            Showing {Math.min(graphUsers.length, 20)} of {graphUsers.length} users
          </div>
        </div>
      )}
    </div>
  )
}
