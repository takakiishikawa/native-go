"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  DataTable,
  PageHeader,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  toast,
} from "@takaki/go-design-system";
import type { ColumnDef } from "@tanstack/react-table";
import type { Grammar, Expression } from "@/lib/types";
import { useCurrentLanguage } from "@/lib/language-context";
import { Plus, Star, Trash2 } from "lucide-react";
import { ViAddModal } from "@/components/vi-add-modal";
import { WordNotesInline } from "@/components/word-notes";
import { CategoryTag } from "@/components/category-tag";
import {
  deleteGrammar,
  deleteExpression,
} from "@/app/actions/practice";

type GrammarWithLesson = Grammar & { lessons: { lesson_no: string } | null };
type ExpressionWithLesson = Expression & {
  lessons: { lesson_no: string } | null;
};

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= value ? "fill-[var(--color-warning)] text-[color:var(--color-warning)]" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function sortByLessonNo<T extends { lessons: { lesson_no: string } | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const aN = a.lessons?.lesson_no ?? "";
    const bN = b.lessons?.lesson_no ?? "";
    const ap = aN.split("-").map(Number);
    const bp = bN.split("-").map(Number);
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const diff = (ap[i] ?? 0) - (bp[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

function PlayCountStatusSummary({
  items,
}: {
  items: { play_count: number }[];
}) {
  let done = 0;
  let inProgress = 0;
  for (const it of items) {
    if (it.play_count >= 10) done++;
    else inProgress++;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag color="success">習得済み {done}</Tag>
      <Tag color="warning">練習中 {inProgress}</Tag>
    </div>
  );
}

function PlayCount({ count, max = 10 }: { count: number; max?: number }) {
  if (count >= max) {
    return (
      <Badge className="border-transparent bg-[color:var(--color-success-subtle)] text-[color:var(--color-success)]">
        完了
      </Badge>
    );
  }
  return (
    <span className="text-xs text-foreground tabular-nums">
      {count}/{max}
    </span>
  );
}

// ── GrammarTab ────────────────────────────────────────────────────────────────

function GrammarTab({
  reloadKey,
  bumpReload,
  onCountChange,
}: {
  reloadKey: number;
  bumpReload: () => void;
  onCountChange?: (n: number) => void;
}) {
  const supabase = createClient();
  const language = useCurrentLanguage();
  const isVi = language === "vi";
  const [items, setItems] = useState<GrammarWithLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("grammar")
        .select("*, lessons(lesson_no)")
        .eq("language", language);
      const sorted = sortByLessonNo((data ?? []) as GrammarWithLesson[]);
      setItems(sorted);
      onCountChange?.(sorted.length);
      setLoading(false);
    }
    load();
  }, [language, reloadKey]);

  async function handleDelete(row: GrammarWithLesson) {
    if (!confirm(`「${row.name}」を削除しますか？`)) return;
    setDeletingId(row.id);
    try {
      await deleteGrammar(row.id);
      toast.success("削除しました");
      bumpReload();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  }

  const columns = useMemo(
    (): ColumnDef<GrammarWithLesson>[] => {
      const cols: ColumnDef<GrammarWithLesson>[] = [
        {
          id: "row_id",
          header: "ID",
          cell: ({ row }) => (
            <span className="font-mono text-xs text-foreground tabular-nums">
              {row.index + 1}
            </span>
          ),
        },
      ];
      if (!isVi) {
        cols.push({
          id: "lesson_no",
          header: "テキスト",
          cell: ({ row }) => (
            <span className="font-mono text-xs text-foreground">
              {row.original.lessons?.lesson_no ?? "—"}
            </span>
          ),
        });
      }
      if (isVi) {
        cols.push({
          id: "category",
          header: "種別",
          cell: ({ row }) => <CategoryTag category={row.original.category} />,
        });
      }
      cols.push(
        {
          accessorKey: "name",
          header: "文法名",
          cell: ({ row }) => (
            <span className="font-medium text-foreground">
              {row.original.name}
            </span>
          ),
        },
        {
          accessorKey: "summary",
          header: "概要",
          cell: ({ row }) => (
            <span className="text-sm text-foreground line-clamp-1 max-w-xs block">
              {row.original.summary?.replace(/\\n/g, " ").split("\n")[0]}
            </span>
          ),
        },
      );
      if (isVi) {
        cols.push({
          id: "word_notes",
          header: "単語",
          cell: ({ row }) => (
            <div className="max-w-md">
              <WordNotesInline notes={row.original.word_notes} />
            </div>
          ),
        });
      }
      cols.push(
        {
          accessorKey: "frequency",
          header: "頻度",
          cell: ({ row }) => <StarRating value={row.original.frequency} />,
        },
        {
          accessorKey: "play_count",
          header: "練習",
          cell: ({ row }) => <PlayCount count={row.original.play_count} />,
        },
        {
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(row.original)}
              disabled={deletingId === row.original.id}
              aria-label="削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ),
        },
      );
      return cols;
    },
    [isVi, deletingId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PlayCountStatusSummary items={items} />
      <DataTable
        columns={columns}
        data={items}
        pageSize={20}
        emptyMessage="文法が登録されていません"
      />
    </div>
  );
}

// ── PhraseTab ─────────────────────────────────────────────────────────────────

function PhraseTab({
  reloadKey,
  bumpReload,
  onCountChange,
}: {
  reloadKey: number;
  bumpReload: () => void;
  onCountChange?: (n: number) => void;
}) {
  const supabase = createClient();
  const language = useCurrentLanguage();
  const isVi = language === "vi";
  const [items, setItems] = useState<ExpressionWithLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("expressions")
        .select("*, lessons(lesson_no)")
        .eq("language", language);
      const sorted = sortByLessonNo((data ?? []) as ExpressionWithLesson[]);
      setItems(sorted);
      onCountChange?.(sorted.length);
      setLoading(false);
    }
    load();
  }, [language, reloadKey]);

  async function handleDelete(row: ExpressionWithLesson) {
    if (!confirm(`「${row.expression}」を削除しますか？`)) return;
    setDeletingId(row.id);
    try {
      await deleteExpression(row.id);
      toast.success("削除しました");
      bumpReload();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  }

  const columns = useMemo(
    (): ColumnDef<ExpressionWithLesson>[] => {
      const cols: ColumnDef<ExpressionWithLesson>[] = [
        {
          id: "row_id",
          header: "ID",
          cell: ({ row }) => (
            <span className="font-mono text-xs text-foreground tabular-nums">
              {row.index + 1}
            </span>
          ),
        },
      ];
      if (!isVi) {
        cols.push({
          id: "lesson_no",
          header: "テキスト",
          cell: ({ row }) => (
            <span className="font-mono text-xs text-foreground">
              {row.original.lessons?.lesson_no ?? "—"}
            </span>
          ),
        });
      }
      cols.push(
        {
          accessorKey: "category",
          header: "種別",
          cell: ({ row }) => <CategoryTag category={row.original.category} />,
        },
        {
          accessorKey: "expression",
          header: "フレーズ",
          cell: ({ row }) => (
            <span className="font-medium text-foreground">
              {row.original.expression}
            </span>
          ),
        },
        {
          accessorKey: "meaning",
          header: "意味",
          cell: ({ row }) => (
            <span className="text-sm text-foreground line-clamp-1 max-w-xs block">
              {row.original.meaning}
            </span>
          ),
        },
      );
      if (isVi) {
        cols.push(
          {
            id: "nuance",
            header: "ニュアンス",
            cell: ({ row }) => (
              <span className="text-xs text-foreground line-clamp-2 max-w-xs block">
                {row.original.nuance ?? "—"}
              </span>
            ),
          },
          {
            id: "word_notes",
            header: "単語",
            cell: ({ row }) => (
              <div className="max-w-md">
                <WordNotesInline notes={row.original.word_notes} />
              </div>
            ),
          },
        );
      }
      cols.push(
        {
          accessorKey: "frequency",
          header: "頻度",
          cell: ({ row }) => <StarRating value={row.original.frequency} />,
        },
        {
          accessorKey: "play_count",
          header: "練習",
          cell: ({ row }) => <PlayCount count={row.original.play_count} />,
        },
        {
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(row.original)}
              disabled={deletingId === row.original.id}
              aria-label="削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ),
        },
      );
      return cols;
    },
    [isVi, deletingId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PlayCountStatusSummary items={items} />
      <DataTable
        columns={columns}
        data={items}
        pageSize={20}
        emptyMessage="フレーズが登録されていません"
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListPage() {
  const language = useCurrentLanguage();
  const isVi = language === "vi";
  const [grammarCount, setGrammarCount] = useState<number | null>(null);
  const [phraseCount, setPhraseCount] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const bumpReload = useCallback(() => setReloadKey((k) => k + 1), []);

  const reloadCounts = useCallback(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("grammar")
        .select("id", { count: "exact", head: true })
        .eq("language", language),
      supabase
        .from("expressions")
        .select("id", { count: "exact", head: true })
        .eq("language", language),
    ]).then(([g, e]) => {
      setGrammarCount(g.count ?? 0);
      setPhraseCount(e.count ?? 0);
    });
  }, [language]);

  useEffect(() => {
    reloadCounts();
  }, [reloadCounts, reloadKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="文法・フレーズ"
        actions={
          isVi ? (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              追加
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="grammar">
        <TabsList>
          <TabsTrigger value="grammar">
            文法
            {grammarCount !== null && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {grammarCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="phrase">
            フレーズ
            {phraseCount !== null && (
              <Badge variant="secondary" className="ml-2 rounded-full">
                {phraseCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="grammar" className="mt-4">
          <GrammarTab
            reloadKey={reloadKey}
            bumpReload={bumpReload}
            onCountChange={setGrammarCount}
          />
        </TabsContent>
        <TabsContent value="phrase" className="mt-4">
          <PhraseTab
            reloadKey={reloadKey}
            bumpReload={bumpReload}
            onCountChange={setPhraseCount}
          />
        </TabsContent>
      </Tabs>

      {showAddModal && (
        <ViAddModal
          onClose={() => setShowAddModal(false)}
          onSaved={bumpReload}
        />
      )}
    </div>
  );
}
