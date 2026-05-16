"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@takaki/go-design-system";
import {
  BookOpen,
  MessageSquare,
  Sparkles,
  Zap,
  Flame,
  Mountain,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useCurrentLanguage } from "@/lib/language-context";

type Category = "grammar" | "expression" | "word";
type Step = "category" | "count";
type Counts = Record<Category, number>;

const COUNT_PRESETS = [10, 30, 50] as const;
const COUNT_DESCS = ["サクッと", "集中して", "がっつり"] as const;
const COUNT_ICONS = [Zap, Flame, Mountain];

const TABLE_BY_CATEGORY: Record<Category, string> = {
  grammar: "grammar",
  expression: "expressions",
  word: "words",
};

const ALL_CATEGORIES: Category[] = ["grammar", "expression", "word"];

const CATEGORIES_VI: {
  value: Category;
  label: string;
  icon: typeof BookOpen;
  desc: string;
}[] = [
  { value: "grammar", label: "文法", icon: BookOpen, desc: "文型パターン" },
  {
    value: "expression",
    label: "フレーズ",
    icon: MessageSquare,
    desc: "固定表現・あいさつ",
  },
  { value: "word", label: "単語", icon: Sparkles, desc: "語彙" },
];

const CATEGORIES_EN: {
  value: Category;
  label: string;
  icon: typeof BookOpen;
  desc: string;
}[] = [
  { value: "grammar", label: "文法", icon: BookOpen, desc: "文型パターン" },
  {
    value: "expression",
    label: "フレーズ",
    icon: MessageSquare,
    desc: "固定表現・あいさつ",
  },
];

export function RepeatingPickerDialog({
  onClose,
}: {
  onClose?: () => void;
}) {
  const router = useRouter();
  const language = useCurrentLanguage();
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<Category | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);

  const categories = language === "vi" ? CATEGORIES_VI : CATEGORIES_EN;

  // 別ページの Dialog/Sheet がナビゲーション中にアンマウントすると
  // body に pointer-events:none が残り、本ダイアログが操作不能になることがある
  useEffect(() => {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, []);

  // カテゴリごとの「練習中（play_count < 10）」件数を取得し、件数選択を実データに合わせる
  useEffect(() => {
    const supabase = createClient();
    Promise.all(
      ALL_CATEGORIES.map((c) =>
        supabase
          .from(TABLE_BY_CATEGORY[c])
          .select("id", { count: "exact", head: true })
          .eq("language", language)
          .lt("play_count", 10),
      ),
    ).then((results) => {
      const next: Counts = { grammar: 0, expression: 0, word: 0 };
      ALL_CATEGORIES.forEach((c, i) => {
        next[c] = results[i].count ?? 0;
      });
      setCounts(next);
    });
  }, [language]);

  function handleClose() {
    if (onClose) onClose();
    else router.push("/");
  }

  function handlePickCategory(c: Category) {
    setCategory(c);
    setStep("count");
  }

  function handlePickCount(n: number) {
    if (!category) return;
    router.push(`/repeating/${category}?count=${n}`);
  }

  // 実データ件数に合わせた件数オプション
  // 例) total=15 → [10, 15] / total>=50 → [10, 30, 50]
  const total = category && counts ? counts[category] : 0;
  const seen = new Set<number>();
  const countOptions = COUNT_PRESETS.map((n, i) => ({
    count: Math.min(n, total),
    desc: COUNT_DESCS[i],
    Icon: COUNT_ICONS[i],
  })).filter((o) => {
    if (o.count <= 0 || seen.has(o.count)) return false;
    seen.add(o.count);
    return true;
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {step === "category"
              ? "リピーティングする種類を選ぼう"
              : "件数を選ぼう"}
          </DialogTitle>
        </DialogHeader>

        {step === "category" ? (
          <div className="space-y-2 pt-2">
            {categories.map((c) => {
              const Icon = c.icon;
              const available = counts?.[c.value] ?? null;
              const disabled = available === 0;
              return (
                <Button
                  key={c.value}
                  size="lg"
                  variant="outline"
                  className="w-full justify-between h-14"
                  disabled={disabled}
                  onClick={() => handlePickCategory(c.value)}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span className="text-base font-medium">{c.label}</span>
                  </span>
                  <span className="flex items-center gap-2 opacity-70">
                    <span className="text-xs">
                      {available === null
                        ? c.desc
                        : available === 0
                          ? "練習中なし"
                          : `${available}件`}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="space-y-2 pt-2">
              {countOptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  練習できる項目がありません
                </p>
              ) : (
                countOptions.map((o) => {
                  const Icon = o.Icon;
                  return (
                    <Button
                      key={o.count}
                      size="lg"
                      variant="outline"
                      className="w-full justify-between h-14"
                      onClick={() => handlePickCount(o.count)}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span className="text-base font-medium">
                          {o.count}件
                        </span>
                      </span>
                      <span className="flex items-center gap-2 opacity-70">
                        <span className="text-xs">{o.desc}</span>
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </Button>
                  );
                })
              )}
            </div>
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategory(null);
                  setStep("category");
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                種類選択に戻る
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
