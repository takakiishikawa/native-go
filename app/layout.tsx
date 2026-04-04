import type { Metadata } from "next"
import { Noto_Sans_JP } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/layout/nav"
import { createClient } from "@/lib/supabase/server"
import { Toaster } from "@/components/ui/sonner"
import { DarkModeInit } from "@/components/dark-mode-init"
import { LoginToast } from "@/components/login-toast"
import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/next"

const notoSans = Noto_Sans_JP({
  variable: "--font-noto-sans",
  weight: ["400", "500", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "NativeGo",
  description: "Native Camp英語学習管理アプリ",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html
      lang="ja"
      className={`${notoSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <DarkModeInit />
      </head>
      <body className="min-h-full">
        {user ? (
          <div className="flex h-screen">
            <Nav />
            <main className="flex-1 overflow-y-auto p-6 bg-background">
              <Suspense>
                <LoginToast />
              </Suspense>
              {children}
            </main>
          </div>
        ) : (
          <main>{children}</main>
        )}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
