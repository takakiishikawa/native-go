"use client"

import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function LoginContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-[360px] px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="rounded-[6px] bg-primary p-2">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-[18px] font-medium tracking-tight">NativeGo</span>
        </div>

        {/* Card */}
        <div className="rounded-[12px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card px-8 py-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-[25px] font-medium mb-1">ログイン</h1>
            <p className="text-[15px] text-muted-foreground">Native Camp 学習管理アプリ</p>
          </div>

          {error && (
            <p className="text-[15px] text-destructive text-center mb-4">
              認証エラーが発生しました。再度お試しください。
            </p>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 rounded-[8px] border border-[var(--border-default,rgba(0,0,0,0.12))] bg-card px-4 py-2.5 text-[16px] font-medium text-foreground hover:bg-muted transition-colors"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
