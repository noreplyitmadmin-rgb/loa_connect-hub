export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50">
      <div className="lg:col-span-5 flex flex-col justify-center items-center px-6 py-12 sm:px-12 bg-white border-r border-slate-100 shadow-sm relative z-10">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>

      <div className="hidden lg:flex lg:col-span-7 relative bg-[#5C1624] overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#5C1624] via-[#7B1D2A] to-[#3D0E18]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="relative z-10 text-center max-w-lg px-8 space-y-8">
          <div className="flex justify-center">
            <div className="w-28 h-28 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm">
              <img
                src="https://lyceumalabang.edu.ph/wp-content/uploads/2025/08/logo-blk.png"
                alt="Lyceum of Alabang"
                className="w-20 h-20 object-contain brightness-0 invert"
              />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white tracking-tight font-display">Lyceum of Alabang</h2>
            <p className="text-sm text-rose-200/80 leading-relaxed font-medium max-w-sm mx-auto">
              Academic e-Consultation Portal — connecting students with faculty advisors for streamlined academic consultations.
            </p>
          </div>
          <div className="pt-4 border-t border-white/10 max-w-xs mx-auto">
            <p className="text-[10px] text-rose-300/50 uppercase tracking-[0.2em] font-semibold">
              Empowering Minds, Shaping Futures
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
