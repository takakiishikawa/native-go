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
  SpeakerWaveIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"

const navItems = [
  { href: "/", label: "ホーム", icon: HomeIcon },
  { href: "/practice", label: "リピーティング", icon: ArrowPathRoundedSquareIcon },
  { href: "/speaking", label: "スピーキング", icon: MicrophoneIcon },
  { href: "/shadowing", label: "シャドーイング", icon: SpeakerWaveIcon },
  { href: "/texts", label: "テキスト", icon: DocumentTextIcon },
  { href: "/list", label: "文法・フレーズ", icon: BookOpenIcon },
  { href: "/report", label: "レポート", icon: ChartBarIcon },
]

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  if (href === "/practice") return pathname === "/practice" || pathname.startsWith("/repeating")
  if (href === "/speaking") return pathname === "/speaking" || pathname.startsWith("/speaking/")
  if (href === "/list") return pathname === "/list" || pathname === "/grammar" || pathname === "/expressions"
  if (href === "/texts") return pathname === "/texts" || pathname === "/lessons" || pathname === "/add"
  return pathname.startsWith(href)
}

function Avatar({ url, name, size = 6 }: { url?: string; name: string; size?: number }) {
  const initials = name.charAt(0).toUpperCase()
  if (url) {
    return (
      <div className={`h-${size} w-${size} rounded-full overflow-hidden shrink-0`}
        style={{ minWidth: `${size * 0.25}rem`, minHeight: `${size * 0.25}rem` }}>
        <img src={url} alt={name} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`h-${size} w-${size} rounded-full shrink-0 bg-primary flex items-center justify-center text-white text-xs font-medium`}>
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
      setDisplayName(user.user_metadata?.display_name || user.email?.split("@")[0] || "User")
      setAvatarUrl(user.user_metadata?.avatar_url || "")
    })
    const update = () => setIsDark(document.documentElement.classList.contains("dark"))
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  function toggleTheme() {
    const next = isDark ? "light" : "dark"
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
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
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, pendingFile, { upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        finalUrl = urlData.publicUrl
      }
      const { error } = await supabase.auth.updateUser({ data: { display_name: editName.trim(), avatar_url: finalUrl } })
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
      <nav className="flex h-screen w-[220px] flex-col bg-card border-r border-[var(--border)] px-2 py-4 shrink-0">
        {/* Logo */}
        <div className="mb-5 px-2">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="rounded-[6px] bg-primary p-1.5">
              <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[16px] font-medium tracking-tight">NativeGo</span>
          </Link>
        </div>

        {/* Nav items */}
        <div className="flex flex-1 flex-col gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[15px] font-medium transition-colors h-8",
                isActive(href, pathname)
                  ? "bg-muted text-foreground"
                  : "text-[var(--text-secondary)] hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-opacity",
                isActive(href, pathname) ? "opacity-100" : "opacity-60"
              )} />
              {label}
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-0.5 pt-3 border-t border-[var(--border)]">
          {/* User */}
          <button
            onClick={openProfile}
            className="flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 w-full text-left hover:bg-muted/60 transition-colors group h-8"
          >
            <Avatar url={avatarUrl} name={displayName || "U"} size={5} />
            <span className="text-[15px] font-medium text-foreground truncate flex-1 min-w-0">
              {displayName || "—"}
            </span>
            <PencilSquareIcon className="h-3.5 w-3.5 text-[var(--text-tertiary)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Concept */}
          <Link
            href="/concept"
            className={cn(
              "flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[15px] font-medium transition-colors h-8",
              pathname === "/concept"
                ? "bg-muted text-foreground"
                : "text-[var(--text-secondary)] hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <LightBulbIcon className={cn("h-4 w-4 shrink-0", pathname === "/concept" ? "opacity-100" : "opacity-60")} />
            コンセプト
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[15px] font-medium transition-colors h-8",
              pathname === "/settings"
                ? "bg-muted text-foreground"
                : "text-[var(--text-secondary)] hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Cog6ToothIcon className={cn("h-4 w-4 shrink-0", pathname === "/settings" ? "opacity-100" : "opacity-60")} />
            設定
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[15px] font-medium text-[var(--text-secondary)] hover:bg-muted/60 hover:text-foreground transition-colors h-8"
          >
            {isDark
              ? <MoonIcon className="h-4 w-4 shrink-0 opacity-60" />
              : <SunIcon className="h-4 w-4 shrink-0 opacity-60" />
            }
            {isDark ? "ダーク" : "ライト"}
          </button>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 text-[15px] font-medium text-[var(--text-secondary)] hover:bg-muted/60 hover:text-foreground transition-colors h-8"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 shrink-0 opacity-60" />
            ログアウト
          </button>
        </div>
      </nav>

      {/* Profile dialog */}
      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} title="プロフィール編集">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full overflow-hidden shrink-0 bg-primary flex items-center justify-center">
              {previewUrl
                ? <img src={previewUrl} alt="avatar" className="h-full w-full object-cover" />
                : <span className="text-white text-lg font-medium">{(editName || "U").charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{editName || "—"}</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline">
                画像を変更
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">表示名</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="表示名を入力" />
          </div>
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
