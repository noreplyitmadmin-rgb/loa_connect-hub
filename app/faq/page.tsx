import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

const faqs = [
  {
    q: "How do I book a consultation?",
    a: "Log in as a student and navigate to the 'Book Consultation' page from the sidebar. Select a faculty member and available time slot, then submit your request.",
  },
  {
    q: "Can I cancel a consultation request?",
    a: "Yes, while the request is still 'Pending' you can cancel it from the consultation details page. Once accepted, cancellation requires faculty approval.",
  },
  {
    q: "How do I accept a consultation request?",
    a: "Faculty members can accept pending requests from their dashboard or the 'Meetings' page. Click 'Accept' on the request card to confirm.",
  },
  {
    q: "What is the difference between a Consultation and a Meeting?",
    a: "Consultations are student-initiated academic advising sessions. Meetings are faculty/Dean-initiated internal appointments that can include multiple attendees.",
  },
  {
    q: "How do I set my availability?",
    a: "Faculty and Deans can manage their availability from the 'Availability Rules' page in the sidebar. Set your working hours and block unavailable times.",
  },
  {
    q: "How do I join a Teams meeting?",
    a: "Once a meeting is accepted and a Teams link is added, you can click 'Join Teams Meeting' from the appointment details page.",
  },
  {
    q: "Can Deans view faculty reports?",
    a: "Yes, Deans can access the 'Department Reports' page from the sidebar to view consultation statistics for faculty in their department.",
  },
  {
    q: "How do I reset my password?",
    a: "Click 'Forgot Password' on the login page and enter your email. You'll receive a password reset link if your account exists.",
  },
  {
    q: "What roles are available?",
    a: "The platform supports Student, Faculty, Dean, Admin, and Guest roles. Some users may have multiple roles — use the role selector at the root dashboard to switch between views.",
  },
  {
    q: "How do I import users in bulk?",
    a: "Deans and Admins can upload CSV files from the 'Import Users' or 'Import Students' pages. Download the template for the correct format.",
  },
]

export default async function FaqPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h1>
        <p className="text-sm text-slate-500 mt-1">Everything you need to know about the e-Consult platform.</p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <details key={i} className="card bg-white overflow-hidden group">
            <summary className="px-6 py-4 cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-semibold text-slate-800 hover:text-gold-700 transition-colors">
              {faq.q}
              <svg className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-6 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
