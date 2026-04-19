import type { Metadata } from "next"
import { Inter, Noto_Sans_JP } from "next/font/google"
import "./globals.css"
import { DesignTokens, AppLayout, Toaster } from "@takaki/go-design-system"
import { NativeGoSidebar } from "@/components/layout/native-go-sidebar"
import { createClient } from "@/lib/supabase/server"
import { DarkModeInit } from "@/components/dark-mode-init"
import { LoginToast } from "@/components/login-toast"
import { Suspense } from "react"
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
})

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
      className={`${inter.variable} ${notoSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <DarkModeInit />
        <DesignTokens primaryColor="#E74C3C" primaryColorHover="#C0392B" />
      </head>
      <body className="min-h-full">
        {user ? (
          <AppLayout sidebar={<NativeGoSidebar />}>
            <Suspense>
              <LoginToast />
            </Suspense>
            {children}
          </AppLayout>
        ) : (
          <main>{children}</main>
        )}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
