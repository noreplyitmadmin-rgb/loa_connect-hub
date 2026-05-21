export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
      <div className="lg:col-span-5 flex flex-col justify-center items-center px-6 py-12 sm:px-12 bg-white border-r border-slate-100 shadow-sm relative z-10">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

      <div className="hidden lg:flex lg:col-span-7 relative bg-slate-950 overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative z-10 text-center max-w-md px-8 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-950/40 backdrop-blur-md">
            <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-white tracking-tight font-display">Academic Consulting Simplified.</h2>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Connect directly with faculty advisors, coordinate consultation windows, and join Microsoft Teams meetings seamlessly from a unified, modern interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
