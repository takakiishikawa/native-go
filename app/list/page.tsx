"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  cn,
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
import type { Grammar, Expression, Word } from "@/lib/types";
import { useCurrentLanguage } from "@/lib/language-context";
import { Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { ViAddModal } from "@/components/vi-add-modal";
import { CategoryTag } from "@/components/category-tag";
import {
  deleteGrammar,
  deleteExpression,
  deleteWord,
  toggleGrammarPriority,
  toggleExpressionPriority,
  toggleWordPriority,
  regenerateWordNotes,
} from "@/app/actions/practice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Spinner,
} from "@takaki/go-design-system";

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

function RegenerateButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      disabled={disabled}
      title="単語注釈を AI で再生成"
      aria-label="単語注釈を再生成"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", disabled && "animate-spin")} />
    </Button>
  );
}

function PriorityToggle({
  active,
  onClick,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={active ? "強化を外す" : "強化に追加"}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50",
        active
          ? "text-[color:var(--color-warning)] hover:bg-[color:var(--color-warning)]/10"
          : "text-muted-foreground/40 hover:text-[color:var(--color-warning)] hover:bg-muted",
      )}
    >
      <Star
        className={cn("h-4 w-4", active && "fill-[var(--color-warning)]")}
      />
    </button>
  );
}

function sortItems<
  T extends {
    is_priority: boolean;
    play_count: number;
    lessons?: { lesson_no: string } | null;
    created_at: string;
  },
>(items: T[]): T[] {
  // 強化フラグ ON で play_count < 10 のものを先頭に。それ以外は従来の lesson_no 順
  // （lesson_no が無いものは created_at 古い順）
  return [...items].sort((a, b) => {
    const aBoost = a.is_priority && a.play_count < 10 ? 1 : 0;
    const bBoost = b.is_priority && b.play_count < 10 ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;

    const aN = a.lessons?.lesson_no ?? "";
    const bN = b.lessons?.lesson_no ?? "";
    if (aN && bN) {
      const ap = aN.split("-").map(Number);
      const bp = bN.split("-").map(Number);
      for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
        const diff = (ap[i] ?? 0) - (bp[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    }
    return a.created_at.localeCompare(b.created_at);
  });
}

function PlayCountStatusSummary({
  items,
}: {
  items: { play_count: number; is_priority: boolean }[];
}) {
  let done = 0;
  let inProgress = 0;
  let boost = 0;
  for (const it of items) {
    if (it.play_count >= 10) done++;
    else inProgress++;
    if (it.is_priority && it.play_count < 10) boost++;
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag color="success">習得済み {done}</Tag>
      <Tag color="warning">練習中 {inProgress}</Tag>
      {boost > 0 && <Tag color="info">強化 {boost}</Tag>}
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
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("grammar")
        .select("*, lessons(lesson_no)")
        .eq("language", language);
      const sorted = sortItems((data ?? []) as GrammarWithLesson[]);
      setItems(sorted);
      onCountChange?.(sorted.length);
      setLoading(false);
    }
    load();
  }, [language, reloadKey]);

  async function handleDelete(row: GrammarWithLesson) {
    if (!confirm(`「${row.name}」を削除しますか？`)) return;
    setBusyId(row.id);
    try {
      await deleteGrammar(row.id);
      toast.success("削除しました");
      bumpReload();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePriority(row: GrammarWithLesson) {
    const next = !row.is_priority;
    setBusyId(row.id);
    setItems((prev) =>
      prev.map((it) => (it.id === row.id ? { ...it, is_priority: next } : it)),
    );
    try {
      await toggleGrammarPriority(row.id, next);
    } catch {
      toast.error("更新に失敗しました");
      // 失敗時は元に戻す
      setItems((prev) =>
        prev.map((it) =>
          it.id === row.id ? { ...it, is_priority: !next } : it,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRegenerate(row: GrammarWithLesson) {
    setBusyId(row.id);
    try {
      const newNotes = await regenerateWordNotes("grammar", row.id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === row.id ? { ...it, word_notes: newNotes } : it,
        ),
      );
      toast.success("単語注釈を再生成しました");
    } catch {
      toast.error("再生成に失敗しました");
    } finally {
      setBusyId(null);
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
      cols.push({
        id: "category",
        header: "カテゴリ",
        cell: ({ row }) => <CategoryTag category={row.original.category} />,
      });
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
          id: "source_title",
          header: "ソース",
          cell: ({ row }) => (
            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[160px] block">
              {row.original.source_title ?? "—"}
            </span>
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
          id: "is_priority",
          header: "強化",
          cell: ({ row }) => (
            <PriorityToggle
              active={row.original.is_priority}
              onClick={() => handleTogglePriority(row.original)}
              disabled={busyId === row.original.id}
            />
          ),
        },
        {
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <div className="flex items-center gap-0.5">
              <RegenerateButton
                onClick={() => handleRegenerate(row.original)}
                disabled={busyId === row.original.id}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(row.original)}
                disabled={busyId === row.original.id}
                aria-label="削除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ),
        },
      );
      return cols;
    },
    [isVi, busyId],
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
        pageSize={100}
        pageSizeOptions={[100]}
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
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("expressions")
        .select("*, lessons(lesson_no)")
        .eq("language", language);
      const sorted = sortItems((data ?? []) as ExpressionWithLesson[]);
      setItems(sorted);
      onCountChange?.(sorted.length);
      setLoading(false);
    }
    load();
  }, [language, reloadKey]);

  async function handleDelete(row: ExpressionWithLesson) {
    if (!confirm(`「${row.expression}」を削除しますか？`)) return;
    setBusyId(row.id);
    try {
      await deleteExpression(row.id);
      toast.success("削除しました");
      bumpReload();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePriority(row: ExpressionWithLesson) {
    const next = !row.is_priority;
    setBusyId(row.id);
    setItems((prev) =>
      prev.map((it) => (it.id === row.id ? { ...it, is_priority: next } : it)),
    );
    try {
      await toggleExpressionPriority(row.id, next);
    } catch {
      toast.error("更新に失敗しました");
      setItems((prev) =>
        prev.map((it) =>
          it.id === row.id ? { ...it, is_priority: !next } : it,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRegenerate(row: ExpressionWithLesson) {
    setBusyId(row.id);
    try {
      const newNotes = await regenerateWordNotes("expression", row.id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === row.id ? { ...it, word_notes: newNotes } : it,
        ),
      );
      toast.success("単語注釈を再生成しました");
    } catch {
      toast.error("再生成に失敗しました");
    } finally {
      setBusyId(null);
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
          header: "カテゴリ",
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
        cols.push({
          id: "source_title",
          header: "ソース",
          cell: ({ row }) => (
            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[160px] block">
              {row.original.source_title ?? "—"}
            </span>
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
          id: "is_priority",
          header: "強化",
          cell: ({ row }) => (
            <PriorityToggle
              active={row.original.is_priority}
              onClick={() => handleTogglePriority(row.original)}
              disabled={busyId === row.original.id}
            />
          ),
        },
        {
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <div className="flex items-center gap-0.5">
              <RegenerateButton
                onClick={() => handleRegenerate(row.original)}
                disabled={busyId === row.original.id}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(row.original)}
                disabled={busyId === row.original.id}
                aria-label="削除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ),
        },
      );
      return cols;
    },
    [isVi, busyId],
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
        pageSize={100}
        pageSizeOptions={[100]}
        emptyMessage="フレーズが登録されていません"
      />
    </div>
  );
}

// ── WordTab ───────────────────────────────────────────────────────────────────

function WordTab({
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
  const [items, setItems] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("words")
        .select("*")
        .eq("language", language);
      const sorted = sortItems(
        ((data ?? []) as Word[]).map((w) => ({ ...w, lessons: null })),
      ) as Word[];
      setItems(sorted);
      onCountChange?.(sorted.length);
      setLoading(false);
    }
    load();
  }, [language, reloadKey]);

  async function handleDelete(row: Word) {
    if (!confirm(`「${row.word}」を削除しますか？`)) return;
    setBusyId(row.id);
    try {
      await deleteWord(row.id);
      toast.success("削除しました");
      bumpReload();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePriority(row: Word) {
    const next = !row.is_priority;
    setBusyId(row.id);
    setItems((prev) =>
      prev.map((it) => (it.id === row.id ? { ...it, is_priority: next } : it)),
    );
    try {
      await toggleWordPriority(row.id, next);
    } catch {
      toast.error("更新に失敗しました");
      setItems((prev) =>
        prev.map((it) =>
          it.id === row.id ? { ...it, is_priority: !next } : it,
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRegenerate(row: Word) {
    setBusyId(row.id);
    try {
      const newNotes = await regenerateWordNotes("word", row.id);
      setItems((prev) =>
        prev.map((it) =>
          it.id === row.id ? { ...it, word_notes: newNotes } : it,
        ),
      );
      toast.success("単語注釈を再生成しました");
    } catch {
      toast.error("再生成に失敗しました");
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo(
    (): ColumnDef<Word>[] => [
      {
        id: "row_id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground tabular-nums">
            {row.index + 1}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "カテゴリ",
        cell: ({ row }) => <CategoryTag category={row.original.category} />,
      },
      {
        accessorKey: "word",
        header: "単語",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.word}
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
      {
        id: "source_title",
        header: "ソース",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[160px] block">
            {row.original.source_title ?? "—"}
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
        header: "練習",
        cell: ({ row }) => <PlayCount count={row.original.play_count} />,
      },
      {
        id: "is_priority",
        header: "強化",
        cell: ({ row }) => (
          <PriorityToggle
            active={row.original.is_priority}
            onClick={() => handleTogglePriority(row.original)}
            disabled={busyId === row.original.id}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <RegenerateButton
              onClick={() => handleRegenerate(row.original)}
              disabled={busyId === row.original.id}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(row.original)}
              disabled={busyId === row.original.id}
              aria-label="削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [busyId],
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
        pageSize={100}
        pageSizeOptions={[100]}
        emptyMessage="単語が登録されていません"
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
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const bumpReload = useCallback(() => setReloadKey((k) => k + 1), []);

  async function handleBulkRegenerate() {
    setShowBulkConfirm(false);
    setBulkBusy(true);
    const supabase = createClient();

    try {
      const [g, e, w] = await Promise.all([
        supabase.from("grammar").select("id").eq("language", language),
        supabase.from("expressions").select("id").eq("language", language),
        supabase.from("words").select("id").eq("language", language),
      ]);

      type Task = { type: "grammar" | "expression" | "word"; id: string };
      const tasks: Task[] = [
        ...((g.data ?? []) as { id: string }[]).map((r) => ({
          type: "grammar" as const,
          id: r.id,
        })),
        ...((e.data ?? []) as { id: string }[]).map((r) => ({
          type: "expression" as const,
          id: r.id,
        })),
        ...((w.data ?? []) as { id: string }[]).map((r) => ({
          type: "word" as const,
          id: r.id,
        })),
      ];

      setBulkProgress({ done: 0, total: tasks.length });
      if (tasks.length === 0) {
        toast.info("再生成する項目がありません");
        return;
      }

      // 3並列でぶん回す（Anthropic API のレート制限を避けつつ高速化）
      const BATCH_SIZE = 3;
      let success = 0;
      let failure = 0;
      for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((t) => regenerateWordNotes(t.type, t.id)),
        );
        success += results.filter((r) => r.status === "fulfilled").length;
        failure += results.filter((r) => r.status === "rejected").length;
        setBulkProgress({
          done: Math.min(i + batch.length, tasks.length),
          total: tasks.length,
        });
      }

      if (failure === 0) {
        toast.success(`${success}件を再生成しました`);
      } else {
        toast.error(`再生成完了: ${success}件成功 / ${failure}件失敗`);
      }
      bumpReload();
    } finally {
      setBulkBusy(false);
      setBulkProgress({ done: 0, total: 0 });
    }
  }

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
      supabase
        .from("words")
        .select("id", { count: "exact", head: true })
        .eq("language", language),
    ]).then(([g, e, w]) => {
      setGrammarCount(g.count ?? 0);
      setPhraseCount(e.count ?? 0);
      setWordCount(w.count ?? 0);
    });
  }, [language]);

  useEffect(() => {
    reloadCounts();
  }, [reloadCounts, reloadKey]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ライブラリ"
        actions={
          isVi ? (
            <div className="flex items-center gap-2">
              {bulkBusy ? (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size="sm" />
                  再生成中 {bulkProgress.done} / {bulkProgress.total}
                </span>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowBulkConfirm(true)}
                  disabled={
                    (grammarCount ?? 0) +
                      (phraseCount ?? 0) +
                      (wordCount ?? 0) ===
                    0
                  }
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  全件再生成
                </Button>
              )}
              <Button onClick={() => setShowAddModal(true)} disabled={bulkBusy}>
                <Plus className="mr-1.5 h-4 w-4" />
                追加
              </Button>
            </div>
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
          {isVi && (
            <TabsTrigger value="word">
              単語
              {wordCount !== null && (
                <Badge variant="secondary" className="ml-2 rounded-full">
                  {wordCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
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
        {isVi && (
          <TabsContent value="word" className="mt-4">
            <WordTab
              reloadKey={reloadKey}
              bumpReload={bumpReload}
              onCountChange={setWordCount}
            />
          </TabsContent>
        )}
      </Tabs>

      {showAddModal && (
        <ViAddModal
          onClose={() => setShowAddModal(false)}
          onSaved={bumpReload}
        />
      )}

      <AlertDialog
        open={showBulkConfirm}
        onOpenChange={(o) => {
          if (!o) setShowBulkConfirm(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>全件を AI で再生成します</AlertDialogTitle>
            <AlertDialogDescription>
              文法 {grammarCount ?? 0} 件、フレーズ {phraseCount ?? 0} 件、単語{" "}
              {wordCount ?? 0} 件の対話・単語注釈を AI で再生成します。
              数分かかります。実行しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>いいえ</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkRegenerate}>
              実行する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
