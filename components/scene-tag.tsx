"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
  toast,
} from "@takaki/go-design-system";
import { Plus, Check } from "lucide-react";
import { CategoryTag } from "@/components/category-tag";
import { setItemCategory } from "@/app/actions/practice";

type Kind = "grammar" | "expression" | "word";

/**
 * 場面タグ（category）の表示＋編集。
 * ライブラリの一覧で使い、ここで設定した場面が /phrases の場面チップになる。
 */
export function SceneTag({
  kind,
  id,
  value,
  suggestions,
  onChanged,
}: {
  kind: Kind;
  id: string;
  value: string | null;
  suggestions: string[];
  onChanged: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  async function commit(next: string) {
    const trimmed = next.trim();
    const normalized = trimmed || null;
    if (normalized === (value ?? null)) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await setItemCategory(kind, id, trimmed);
      onChanged(normalized);
      setOpen(false);
    } catch {
      toast.error("場面の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(value ?? "");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={value ? `場面: ${value}（編集）` : "場面を設定"}
          className="inline-flex items-center rounded-md transition-opacity hover:opacity-70"
        >
          {value ? (
            <CategoryTag category={value} />
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded-md border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              <Plus className="h-3 w-3" />
              場面
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 space-y-2.5 p-3">
        <div className="text-xs font-semibold text-foreground">場面タグ</div>
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            }
          }}
          placeholder="カフェ / 市場 / 職場 …"
          className="h-8 text-sm"
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => commit(s)}
                className={cn(
                  "rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  s === value &&
                    "border-[color:var(--color-primary)] text-[color:var(--color-primary)]",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-0.5">
          {value ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => commit("")}
              disabled={saving}
            >
              クリア
            </Button>
          ) : (
            <span />
          )}
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => commit(draft)}
            disabled={saving}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            保存
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
