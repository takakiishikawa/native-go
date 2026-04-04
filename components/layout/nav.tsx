"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  HomeIcon,
  ArrowPathRoundedSquareIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ArrowRightOnRectangleIcon,
  LightBulbIcon,
  PencilSquareIcon,
  SunIcon,
  MoonIcon,
  ChartBarIcon,
  MicrophoneIcon,
} from "@heroicons/react/24/outline"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"

const navItems = [
  { href: "/", label: "ダッシュボード", icon: HomeIcon },
  { href: "/practice", label: "リピーティング", icon: ArrowPathRoundedSquareIcon },
  { href: "/speaking", label: "スピーキング", icon: MicrophoneIcon },
  { href: "/texts", label: "テキスト", icon: DocumentTextIcon },
  { href: "/list", label: "文法・フレーズ", icon: BookOpenIcon },
  { href: "/report", label: "レポート", icon: ChartBarIcon },
]

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  if (href === "/practice") {
    return pathname === "/practice" || pathname.startsWith("/repeating")
  }
  if (href === "/speaking") {
    return pathname === "/speaking" || pathname.startsWith("/speaking/")
  }
  if (href === "/list") {
    return (
      pathname === "/list" ||
      pathname === "/grammar" ||
      pathname === "/expressions"
    )
  }
  if (href === "/texts") {
    return pathname === "/texts" || pathname === "/lessons" || pathname === "/add"
  }
  return pathname.startsWith(href)
}

function Avatar({ url, name, size = 8 }: { url?: string; name: string; size?: number }) {
  const initials = name.charAt(0).toUpperCase()
  if (url) {
    return (
      <div
        className={`h-${size} w-${size} rounded-full overflow-hidden shrink-0`}
        style={{ minWidth: `${size * 0.25}rem`, minHeight: `${size * 0.25}rem` }}
      >
        <img src={url} alt={name} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`h-${size} w-${size} rounded-full shrink-0 bg-primary flex items-center justify-center text-white text-xs font-semibold`}>
      {initials}
    </div>
  )
}

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [profileOpen, setProfileOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [previewUrl, setPreviewUrl] = useState("")
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "User"
      const avatar = user.user_metadata?.avatar_url || ""
      setDisplayName(name)
      setAvatarUrl(avatar)
    })

    // Track actual dark state via class on <html>
    const update = () => setIsDark(document.documentElement.classList.contains("dark"))
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  function toggleTheme() {
    const next = isDark ? "light" : "dark"
    localStorage.setItem("theme", next)
    if (next === "dark") document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
  }

  function openProfile() {
    setEditName(displayName)
    setPreviewUrl(avatarUrl)
    setPendingFile(null)
    setUploadError("")
    setProfileOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadError("")
  }

  async function handleSave() {
    setSaving(true)
    setUploadError("")
    try {
      let finalUrl = avatarUrl

      if (pendingFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not logged in")
        const ext = pendingFile.name.split(".").pop() || "jpg"
        const path = `${user.id}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, pendingFile, { upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        finalUrl = urlData.publicUrl
      }

      const { error } = await supabase.auth.updateUser({
        data: { display_name: editName.trim(), avatar_url: finalUrl },
      })
      if (error) throw error

      setDisplayName(editName.trim() || displayName)
      setAvatarUrl(finalUrl)
      setProfileOpen(false)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "保存に失敗しました")
    }
    setSaving(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <>
      <nav className="flex h-screen w-[220px] flex-col border-r bg-neutral-100 dark:bg-[#1E293B] px-3 py-5 shrink-0">
        <div className="mb-7 px-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5">
              <ArrowPathRoundedSquareIcon className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">NativeGo</h1>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md pr-3 py-2 text-sm font-medium transition-colors border-l-[3px]",
                isActive(href, pathname)
                  ? "bg-blue-50 text-blue-700 border-l-blue-600 pl-[9px] dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400"
                  : "text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-800 border-l-transparent pl-3 dark:text-neutral-400 dark:hover:bg-neutral-700/50 dark:hover:text-neutral-200"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        {/* ── Bottom section ── */}
        <div className="mt-auto flex flex-col gap-0.5 pt-3 border-t border-neutral-200 dark:border-neutral-700">
          {/* User profile */}
          <button
            onClick={openProfile}
            className="flex items-center gap-3 rounded-md border-l-[3px] border-l-transparent pl-3 pr-3 py-2 w-full text-left hover:bg-neutral-200/60 dark:hover:bg-neutral-700/50 transition-colors group"
          >
            <Avatar url={avatarUrl} name={displayName || "U"} size={5} />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate flex-1 min-w-0">
              {displayName || "—"}
            </span>
            <PencilSquareIcon className="h-3.5 w-3.5 text-neutral-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Concept link */}
          <Link
            href="/concept"
            className={cn(
              "flex items-center gap-3 rounded-md pr-3 py-2 text-sm font-medium transition-colors border-l-[3px]",
              pathname === "/concept"
                ? "bg-blue-50 text-blue-700 border-l-blue-600 pl-[9px] dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400"
                : "text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-700 border-l-transparent pl-3 dark:text-neutral-400 dark:hover:bg-neutral-700/50 dark:hover:text-neutral-200"
            )}
          >
            <LightBulbIcon className="h-5 w-5 shrink-0" />
            コンセプト
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-md border-l-[3px] border-l-transparent pl-3 pr-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700/50 dark:hover:text-neutral-200 transition-colors"
          >
            {isDark ? (
              <MoonIcon className="h-5 w-5 shrink-0" />
            ) : (
              <SunIcon className="h-5 w-5 shrink-0" />
            )}
            {isDark ? "ダークモード" : "ライトモード"}
          </button>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 rounded-md border-l-[3px] border-l-transparent pl-3 pr-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700/50 dark:hover:text-neutral-200 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0" />
            ログアウト
          </button>
        </div>
      </nav>

      {/* Profile edit dialog */}
      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} title="プロフィール編集">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {/* Perfect circle avatar preview */}
            <div className="h-16 w-16 rounded-full overflow-hidden shrink-0 bg-primary flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-white text-xl font-semibold">
                  {(editName || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">{editName || "—"}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary hover:underline"
              >
                画像を変更
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">表示名</label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="表示名を入力"
            />
          </div>
          {uploadError && (
            <p className="text-xs text-destructive">{uploadError}</p>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
