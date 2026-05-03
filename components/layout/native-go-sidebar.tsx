"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  AppSwitcher,
  GO_APPS,
  UserMenu,
} from "@takaki/go-design-system";
import {
  Home,
  Repeat2,
  Mic,
  Volume2,
  FileText,
  BookOpen,
  BarChart3,
  Settings,
  Lightbulb,
  Sun,
  Moon,
  UserCog,
} from "lucide-react";
import type { Language } from "@/lib/types";
import { LanguageSwitch } from "./language-switch";

const ProfileDialog = dynamic(
  () => import("./profile-dialog").then((m) => ({ default: m.ProfileDialog })),
  { ssr: false },
);

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  /** 表示対象の言語。未指定なら全言語で表示 */
  languages?: Language[];
};

const navItems: NavItem[] = [
  { href: "/", label: "ダッシュボード", icon: Home },
  { href: "/repeating/grammar", label: "リピーティング", icon: Repeat2 },
  { href: "/speaking", label: "スピーキング", icon: Mic, languages: ["en"] },
  { href: "/shadowing", label: "シャドーイング", icon: Volume2 },
  { href: "/texts", label: "テキスト", icon: FileText, languages: ["en"] },
  {
    href: "/list",
    label: "文法・フレーズ",
    icon: BookOpen,
    languages: ["vi"],
  },
  { href: "/report", label: "レポート", icon: BarChart3 },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/repeating/grammar") return pathname.startsWith("/repeating");
  if (href === "/speaking")
    return pathname === "/speaking" || pathname.startsWith("/speaking/");
  if (href === "/texts")
    return (
      pathname === "/texts" ||
      pathname === "/lessons" ||
      pathname === "/add" ||
      pathname === "/list"
    );
  if (href === "/list") return pathname === "/list";
  return pathname.startsWith(href);
}

export function NativeGoSidebar({
  currentLanguage,
}: {
  currentLanguage: Language;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setDisplayName(
        user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
      );
      setEmail(user.email || "");
      setAvatarUrl(user.user_metadata?.avatar_url || "");
    });
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <AppSwitcher
            currentApp="NativeGo"
            apps={GO_APPS}
            placement="bottom"
          />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems
                  .filter(
                    ({ languages }) =>
                      !languages || languages.includes(currentLanguage),
                  )
                  .map(({ href, label, icon: Icon }) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(href, pathname)}
                      >
                        <Link href={href}>
                          <Icon className="h-4 w-4 shrink-0" />
                          {label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <LanguageSwitch current={currentLanguage} />
            </SidebarMenuItem>
          </SidebarMenu>
          <UserMenu
            displayName={displayName || "—"}
            email={email}
            avatarUrl={avatarUrl}
            items={[
              {
                title: "プロフィール編集",
                icon: UserCog,
                onSelect: () => setProfileOpen(true),
              },
              {
                title: "コンセプト",
                icon: Lightbulb,
                onSelect: () => router.push("/concept"),
                isActive: pathname.startsWith("/concept"),
              },
              {
                title: "設定",
                icon: Settings,
                onSelect: () => router.push("/settings"),
                isActive: pathname.startsWith("/settings"),
              },
              {
                title: isDark ? "ダーク" : "ライト",
                icon: isDark ? Moon : Sun,
                onSelect: toggleTheme,
              },
            ]}
            signOut={{ onSelect: handleSignOut }}
          />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <ProfileDialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        displayName={displayName}
        avatarUrl={avatarUrl}
        onSaved={(newName, newAvatarUrl) => {
          setDisplayName(newName);
          setAvatarUrl(newAvatarUrl);
        }}
      />
    </>
  );
}
