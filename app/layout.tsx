import type { Metadata } from "next"
import "./globals.css"
import SessionWrapper from "@/components/SessionWrapper"
import Sidebar from "@/components/Sidebar"
import Breadcrumbs from "@/components/Breadcrumbs"

export const metadata: Metadata = {
  title: "E-Consultation",
  description: "Academic e-Consultation booking system",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full bg-slate-50 font-sans antialiased">
        <SessionWrapper>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Breadcrumbs />
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        </SessionWrapper>
      </body>
    </html>
  )
}
