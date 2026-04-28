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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  RefreshCcw,
  ChevronsUpDown,
  Check,
  UserCog,
} from "lucide-react";

const ProfileDialog = dynamic(
  () =>
    import("./profile-dialog").then((m) => ({ default: m.ProfileDialog })),
  { ssr: false },
);

const GO_APPS = [
  {
    name: "NativeGo",
    url: "https://english-learning-app-black.vercel.app/",
    color: "var(--color-blue-500)",
  },
  {
    name: "CareGo",
    url: "https://care-go-mu.vercel.app/dashboard",
    color: "var(--color-green-500)",
  },
  {
    name: "KenyakuGo",
    url: "https://kenyaku-go.vercel.app/",
    color: "var(--color-orange-500)",
  },
  {
    name: "TaskGo",
    url: "https://taskgo-dun.vercel.app/",
    color: "var(--color-purple-500)",
  },
  {
    name: "CookGo",
    url: "https://cook-go-lovat.vercel.app/dashboard",
    color: "var(--color-teal-500)",
  },
  {
    name: "PhysicalGo",
    url: "https://physical-go.vercel.app/dashboard",
    color: "var(--color-red-500)",
  },
] as const;

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/practice", label: "リピーティング", icon: Repeat2 },
  { href: "/speaking", label: "スピーキング", icon: Mic },
  { href: "/shadowing", label: "シャドーイング", icon: Volume2 },
  { href: "/texts", label: "テキスト", icon: FileText },
  { href: "/list", label: "文法・フレーズ", icon: BookOpen },
  { href: "/report", label: "レポート", icon: BarChart3 },
];

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  if (href === "/practice")
    return pathname === "/practice" || pathname.startsWith("/repeating");
  if (href === "/speaking")
    return pathname === "/speaking" || pathname.startsWith("/speaking/");
  if (href === "/list")
    return (
      pathname === "/list" ||
      pathname === "/grammar" ||
      pathname === "/expressions"
    );
  if (href === "/texts")
    return (
      pathname === "/texts" || pathname === "/lessons" || pathname === "/add"
    );
  return pathname.startsWith(href);
}

export function NativeGoSidebar() {
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
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <RefreshCcw className="h-4 w-4 shrink-0 text-primary" />
                    <div className="flex flex-col gap-0.5 leading-none min-w-0">
                      <span className="text-xs text-muted-foreground">App</span>
                      <span className="text-sm font-medium tracking-tight truncate">
                        NativeGo
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-52"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Goシリーズ
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {GO_APPS.map((app) => (
                    <DropdownMenuItem
                      key={app.name}
                      onSelect={() => {
                        window.location.href = app.url;
                      }}
                      className="gap-2"
                    >
                      <span
                        className="shrink-0 rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          backgroundColor: app.color,
                        }}
                        aria-hidden
                      />
                      <span className="flex-1">{app.name}</span>
                      {app.name === "NativeGo" && (
                        <Check className="h-4 w-4 shrink-0 opacity-70" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map(({ href, label, icon: Icon }) => (
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
