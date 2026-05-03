"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  PageHeader,
  toast,
} from "@takaki/go-design-system";
import type { ColumnDef } from "@tanstack/react-table";
import type { Grammar, Language } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Star, Sparkles, Loader2 } from "lucide-react";
import { WordNotesPanel } from "@/components/word-notes";
import {
  regenerateWordNotesBatch,
  getWordNotesBacklog,
} from "@/app/actions/word-notes";

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= value ? "fill-[var(--color-warning)] text-[color:var(--color-warning)]" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  );
}

export function GrammarClient({
  items: initialItems,
  language,
}: {
  items: Grammar[];
  language: Language;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<Grammar[]>(initialItems);
  const [selected, setSelected] = useState<Grammar | null>(null);
  const [backlog, setBacklog] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (language !== "vi") {
      setBacklog(null);
      return;
    }
    getWordNotesBacklog("grammar").then(setBacklog);
  }, [language]);

  const reload = async () => {
    const { data } = await supabase
      .from("grammar")
      .select("*")
      .eq("language", language)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const result = await regenerateWordNotesBatch("grammar");
      if ("error" in result) {
        toast.error(`再生成に失敗: ${result.error}`);
        return;
      }
      const { processed, failed, remaining } = result;
      if (processed === 0 && failed === 0) {
        toast.success("再生成が必要な文法はありません");
      } else {
        toast.success(
          `${processed} 件再生成${failed > 0 ? ` / ${failed} 件失敗` : ""} (残り ${remaining} 件)`,
        );
      }
      setBacklog(remaining);
      await reload();
      if (selected) {
        const { data } = await supabase
          .from("grammar")
          .select("*")
          .eq("id", selected.id)
          .maybeSingle();
        if (data) setSelected(data);
      }
    } finally {
      setRegenerating(false);
    }
  };

  const columns = useMemo(
    (): ColumnDef<Grammar>[] => [
      {
        accessorKey: "name",
        header: "文法名",
        cell: ({ row }) => (
          <Button
            onClick={() => setSelected(row.original)}
            variant="ghost"
            className="font-medium text-left hover:underline text-foreground p-0 h-auto"
          >
            {row.original.name}
          </Button>
        ),
      },
      {
        accessorKey: "summary",
        header: "概要",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm line-clamp-1 max-w-xs block">
            {row.original.summary.split("\n")[0]}
          </span>
        ),
      },
      {
        accessorKey: "frequency",
        header: "頻度",
        cell: ({ row }) => <StarRating value={row.original.frequency} />,
      },
      {
        accessorKey: "play_count",
        header: "回数",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.play_count} / 10
          </span>
        ),
      },
      {
        id: "status",
        header: "ステータス",
        cell: ({ row }) =>
          row.original.play_count >= 10 ? (
            <Badge className="border-transparent bg-[color:var(--color-success-subtle)] text-[color:var(--color-success)]">
              習得済み
            </Badge>
          ) : (
            <Badge className="border-transparent bg-[color:var(--color-warning-subtle)] text-[color:var(--color-warning)]">
              練習中
            </Badge>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="文法一覧"
        actions={
          <div className="flex items-center gap-3">
            {language === "vi" && backlog !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={regenerating || backlog === 0}
              >
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                単語解説を再生成
                <span className="ml-2 text-xs text-muted-foreground">
                  残り {backlog} 件
                </span>
              </Button>
            )}
            <span className="text-2xl font-semibold">
              {items.length}
              <span className="text-base font-normal text-muted-foreground ml-1">
                件
              </span>
            </span>
          </div>
        }
      />
      <DataTable
        columns={columns}
        data={items}
        searchable={{ columnId: "name", placeholder: "文法名で検索..." }}
        pageSize={20}
        emptyMessage="文法が登録されていません"
      />

      {selected && (
        <Dialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  概要
                </p>
                <p className="text-base whitespace-pre-line">
                  {selected.summary}
                </p>
              </div>
              {selected.detail && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    詳細解説
                  </p>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {selected.detail}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  例文
                </p>
                <ul className="space-y-2">
                  {selected.examples
                    .split("\n")
                    .filter(Boolean)
                    .map((ex, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-muted px-3 py-2 text-base"
                      >
                        {ex}
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  使用場面
                </p>
                <p className="text-base text-muted-foreground whitespace-pre-line">
                  {selected.usage_scene}
                </p>
              </div>
              {language === "vi" && (
                <WordNotesPanel notes={selected.word_notes} />
              )}
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">頻度</span>
                  <StarRating value={selected.frequency} />
                </div>
                <span className="text-sm text-muted-foreground">
                  練習回数: {selected.play_count} / 10
                </span>
                <Badge
                  className={
                    selected.play_count >= 10
                      ? "border-transparent bg-[color:var(--color-success-subtle)] text-[color:var(--color-success)]"
                      : "border-transparent bg-[color:var(--color-warning-subtle)] text-[color:var(--color-warning)]"
                  }
                >
                  {selected.play_count >= 10 ? "習得済み" : "練習中"}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
