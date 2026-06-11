import Link from "next/link"

export default function ThankYouPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary tracking-tight mb-2">Thank You!</h1>
        <p className="text-sm text-tertiary leading-relaxed">
          Your evaluation has been submitted successfully. Your feedback is valuable and helps improve the quality of instruction.
        </p>
        <Link
          href="/student/evaluations"
          className="inline-flex items-center gap-2 mt-8 text-sm font-semibold text-brand-600 hover:text-brand-500 active:opacity-60 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Evaluations
        </Link>
      </div>
    </div>
  )
}
