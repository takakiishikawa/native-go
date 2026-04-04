"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  HomeIcon,
  ArrowPathRoundedSquareIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "ホーム", icon: HomeIcon },
  { href: "/practice", label: "リピーティング", icon: ArrowPathRoundedSquareIcon },
  { href: "/texts", label: "テキスト", icon: DocumentTextIcon },
  { href: "/list", label: "文法・フレーズ", icon: BookOpenIcon },
]

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/"
  if (href === "/practice") {
    return pathname === "/practice" || pathname.startsWith("/repeating")
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

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
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
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="mt-auto flex items-center gap-2 justify-start text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5" />
        ログアウト
      </Button>
    </nav>
  )
}
