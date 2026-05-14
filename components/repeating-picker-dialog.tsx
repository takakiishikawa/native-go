"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const COUNTS = [10, 30, 50] as const;
const COUNT_DESCS = ["サクッと", "集中して", "がっつり"] as const;
const COUNT_ICONS = [Zap, Flame, Mountain];

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

  const categories = language === "vi" ? CATEGORIES_VI : CATEGORIES_EN;

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
              return (
                <Button
                  key={c.value}
                  size="lg"
                  variant="outline"
                  className="w-full justify-between h-14"
                  onClick={() => handlePickCategory(c.value)}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span className="text-base font-medium">{c.label}</span>
                  </span>
                  <span className="flex items-center gap-2 opacity-70">
                    <span className="text-xs">{c.desc}</span>
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="space-y-2 pt-2">
              {COUNTS.map((n, i) => {
                const Icon = COUNT_ICONS[i];
                return (
                  <Button
                    key={n}
                    size="lg"
                    variant="outline"
                    className="w-full justify-between h-14"
                    onClick={() => handlePickCount(n)}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span className="text-base font-medium">{n}件</span>
                    </span>
                    <span className="flex items-center gap-2 opacity-70">
                      <span className="text-xs">{COUNT_DESCS[i]}</span>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Button>
                );
              })}
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
