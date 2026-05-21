import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CalendarView } from "@/components/CalendarView"
import { userRepository } from "@/lib/repositories/factory"
import { getAllAppointments } from "@/lib/controllers/appointments"
import { fetchUsersFromGraph } from "@/lib/services/graph"

async function getUsers() {
  const users = await userRepository.listByRole("STUDENT")
  const faculty = await userRepository.listByRole("FACULTY")
  const admins = await userRepository.listByRole("ADMIN")
  return [...admins, ...faculty, ...users].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

async function getAppointments() {
  return getAllAppointments()
}

export default async function AdminDashboard() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "ADMIN") redirect("/login")

  const [users, appointments, graphUsers] = await Promise.all([
    getUsers(),
    getAppointments(),
    fetchUsersFromGraph().catch(() => [] as any[]),
  ])
  const pendingCount = appointments.filter((a: any) => a.status === "PENDING").length
  const approvedCount = appointments.filter((a: any) => a.status === "APPROVED").length
  const completedCount = appointments.filter((a: any) => a.status === "COMPLETED").length

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Pending Requests</p>
        </div>

        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{approvedCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Approved Slots</p>
        </div>

        <div className="card p-5 bg-white">
          <p className="text-3xl font-bold text-slate-900">{completedCount}</p>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Completed Consults</p>
        </div>
      </div>

      {/* Global Calendar */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Schedule Overview ({appointments.length})</h2>
        <CalendarView
          events={appointments.map((a: any) => ({
            id: a.id,
            title: `${a.student?.name || "Student"} \u2192 ${a.faculty?.name || "Faculty"}`,
            subtitle: `${a.student?.email || ""} \u2022 ${a.faculty?.email || ""}`,
            date: a.schedule?.date || "",
            startTime: a.schedule?.startTime || "",
            endTime: a.schedule?.endTime || "",
            status: a.status,
            type: "appointment" as const,
            teamsLink: a.teamsLink,
          }))}
          emptyMessage="No appointments booked in system"
          emptySubtext="Appointments will pop up here once students request availability windows."
        />
      </section>

      {/* Entra ID Graph Directory */}
      {graphUsers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Microsoft Entra ID Users ({graphUsers.length})</h2>
            <a href="/admin/graph-users" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View all →</a>
          </div>
          <div className="card overflow-x-auto bg-white">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Display Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">User Principal Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {graphUsers.map((gu: any) => (
                  <tr key={gu.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{gu.displayName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{gu.mail || "\u2014"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono tracking-tighter">{gu.userPrincipalName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Internal User Accounts */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">All Platform Users ({users.length})</h2>
        <div className="card overflow-hidden bg-white">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Role</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      user.role === "ADMIN" ? "bg-purple-50 text-purple-700 border-purple-200/50" :
                      user.role === "FACULTY" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                      "bg-blue-50 text-blue-700 border-blue-200/50"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-medium">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Internal System Audit Log */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">All System Appointments ({appointments.length})</h2>
        <div className="card overflow-hidden bg-white">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty Consultant</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Date/Time</th>
                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.map((apt: any) => (
                <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{apt.student?.name || "\u2014"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{apt.faculty?.name || "\u2014"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium tabular-nums">
                    {apt.schedule?.date && apt.schedule?.startTime ? `${apt.schedule.date} @ ${apt.schedule.startTime}-${apt.schedule.endTime}` : "\u2014"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      apt.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200/50" :
                      apt.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" :
                      apt.status === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200/50" :
                      "bg-indigo-50 text-indigo-700 border-indigo-200/50"
                    }`}>
                      {apt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
