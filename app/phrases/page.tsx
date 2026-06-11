"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn, PageHeader, EmptyState } from "@takaki/go-design-system";
import {
  Coffee,
  ShoppingBag,
  Briefcase,
  Users,
  Utensils,
  Plane,
  Home,
  Heart,
  MessageCircle,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import type { Expression } from "@/lib/types";
import { useCurrentLanguage } from "@/lib/language-context";
import { PhraseAudioButton } from "@/components/phrase-audio-button";

const UNCATEGORIZED = "未分類";

// 場面名 → アイコン（キーワードで緩く対応。未知の場面は会話アイコン）
const SCENE_ICON_RULES: { test: RegExp; icon: LucideIcon }[] = [
  { test: /カフェ|coffee|cafe|喫茶/i, icon: Coffee },
  { test: /市場|買い物|買物|ショッピング|店|shop|market/i, icon: ShoppingBag },
  { test: /職場|仕事|会社|オフィス|work|office|business/i, icon: Briefcase },
  { test: /友達|友人|友|friend/i, icon: Users },
  { test: /食事|レストラン|飲食|food|restaurant|meal|食べ/i, icon: Utensils },
  { test: /旅行|空港|移動|travel|trip|airport/i, icon: Plane },
  { test: /家|自宅|家族|home|family/i, icon: Home },
  { test: /恋愛|デート|love|date/i, icon: Heart },
];

function sceneIcon(scene: string): LucideIcon {
  for (const r of SCENE_ICON_RULES) if (r.test.test(scene)) return r.icon;
  return MessageCircle;
}

type Scene = { name: string; count: number; icon: LucideIcon };

function SceneChip({
  label,
  count,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  count: number;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "border-[color:var(--color-primary)] bg-[var(--color-primary)]/10 text-[color:var(--color-primary)]"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active
            ? "bg-[var(--color-primary)]/15"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

export default function PhrasesPage() {
  const supabase = useMemo(() => createClient(), []);
  const language = useCurrentLanguage();
  const isVi = language === "vi";
  const [items, setItems] = useState<Expression[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null); // null = すべて

  useEffect(() => {
    if (!isVi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("expressions")
      .select("*")
      .eq("language", "vi")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data ?? []) as Expression[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isVi, supabase]);

  const sceneOf = (e: Expression) => e.category?.trim() || UNCATEGORIZED;

  const scenes: Scene[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of items) {
      const s = sceneOf(e);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const named = [...counts.entries()]
      .filter(([name]) => name !== UNCATEGORIZED)
      .sort((a, b) => a[0].localeCompare(b[0], "ja"))
      .map(([name, count]) => ({ name, count, icon: sceneIcon(name) }));
    // 未分類は末尾に
    if (counts.has(UNCATEGORIZED)) {
      named.push({
        name: UNCATEGORIZED,
        count: counts.get(UNCATEGORIZED)!,
        icon: MessageCircle,
      });
    }
    return named;
  }, [items]);

  const filtered = useMemo(
    () => (selected === null ? items : items.filter((e) => sceneOf(e) === selected)),
    [items, selected],
  );

  if (!isVi) {
    return (
      <div className="space-y-6">
        <PageHeader title="フレーズ" />
        <EmptyState
          title="ベトナム語専用の機能です"
          description="言語をベトナム語に切り替えると、場面別のフレーズが表示されます。"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="フレーズ"
        description="場面を選んで、すぐに使えるフレーズを引き出せます。"
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          読み込み中...
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="フレーズがまだありません"
          description="ライブラリでフレーズを追加し、場面タグを設定するとここに並びます。"
        />
      ) : (
        <>
          {/* 場面チップ — 横スクロール（モバイル）/ 折り返し（デスクトップ） */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <SceneChip
              label="すべて"
              count={items.length}
              icon={LayoutGrid}
              active={selected === null}
              onClick={() => setSelected(null)}
            />
            {scenes.map((s) => (
              <SceneChip
                key={s.name}
                label={s.name}
                count={s.count}
                icon={s.icon}
                active={selected === s.name}
                onClick={() => setSelected(s.name)}
              />
            ))}
          </div>

          {/* フレーズリスト */}
          <ul className="space-y-2.5">
            {filtered.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-semibold leading-snug text-foreground">
                    {e.expression}
                  </p>
                  {e.meaning && (
                    <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                      {e.meaning.replace(/\\n/g, " ")}
                    </p>
                  )}
                </div>
                <PhraseAudioButton text={e.expression} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
