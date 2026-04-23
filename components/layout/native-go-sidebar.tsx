"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  LogOut,
  Sun,
  Moon,
  RefreshCcw,
  ChevronsUpDown,
  Check,
} from "lucide-react";

const GO_APPS = [
  {
    name: "NativeGo",
    url: "https://english-learning-app-black.vercel.app/",
    color: "#0052CC",
  },
  {
    name: "CareGo",
    url: "https://care-go-mu.vercel.app/dashboard",
    color: "#30A46C",
  },
  {
    name: "KenyakuGo",
    url: "https://kenyaku-go.vercel.app/",
    color: "#F5A623",
  },
  { name: "TaskGo", url: "https://taskgo-dun.vercel.app/", color: "#5E6AD2" },
  {
    name: "CookGo",
    url: "https://cook-go-lovat.vercel.app/dashboard",
    color: "#1AD1A5",
  },
  {
    name: "PhysicalGo",
    url: "https://physical-go.vercel.app/dashboard",
    color: "#FF6B6B",
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

const footerItems = [
  { href: "/concept", label: "コンセプト", icon: Lightbulb },
  { href: "/settings", label: "設定", icon: Settings },
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
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setDisplayName(
        user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
      );
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

  function openProfile() {
    setEditName(displayName);
    setPreviewUrl(avatarUrl);
    setPendingFile(null);
    setUploadError("");
    setProfileOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadError("");
  }

  async function handleSave() {
    setSaving(true);
    setUploadError("");
    try {
      let finalUrl = avatarUrl;
      if (pendingFile) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");
        const ext = pendingFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, pendingFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        finalUrl = urlData.publicUrl;
      }
      const { error } = await supabase.auth.updateUser({
        data: { display_name: editName.trim(), avatar_url: finalUrl },
      });
      if (error) throw error;
      setDisplayName(editName.trim() || displayName);
      setAvatarUrl(finalUrl);
      setProfileOpen(false);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "保存に失敗しました");
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const initials = (displayName || "U").charAt(0).toUpperCase();

  return (
    <>
      <Sidebar>
        {/* ヘッダー：ロゴ + アプリ切り替え */}
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
                      <span className="text-[15px] font-medium tracking-tight truncate">
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

        {/* メインナビ */}
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

        {/* フッター */}
        <SidebarFooter>
          <SidebarMenu>
            {/* ユーザー */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={openProfile}
                className="cursor-pointer"
              >
                <Avatar className="h-5 w-5 shrink-0">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={displayName} />
                  )}
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate flex-1 min-w-0">
                  {displayName || "—"}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* サブページ（コンセプト・設定） */}
            {footerItems.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={pathname === href}>
                  <Link href={href}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {/* テーマ切り替え */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleTheme}
                className="cursor-pointer"
              >
                {isDark ? (
                  <Moon className="h-4 w-4 shrink-0" />
                ) : (
                  <Sun className="h-4 w-4 shrink-0" />
                )}
                {isDark ? "ダーク" : "ライト"}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* ログアウト */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleSignOut}
                className="cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                ログアウト
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* プロフィール編集ダイアログ */}
      <Dialog
        open={profileOpen}
        onOpenChange={(open) => {
          if (!open) setProfileOpen(false);
        }}
      >
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>プロフィール編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full overflow-hidden shrink-0 bg-primary flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-white text-lg font-medium">
                    {initials}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{editName || "—"}</p>
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
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
