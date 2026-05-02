"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DataTable,
  PageHeader,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@takaki/go-design-system";
import type { ColumnDef } from "@tanstack/react-table";
import type { Grammar, Expression } from "@/lib/types";
import { useCurrentLanguage } from "@/lib/language-context";
import { Star } from "lucide-react";

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
  onCountChange,
}: {
  onCountChange?: (n: number) => void;
}) {
  const supabase = createClient();
  const language = useCurrentLanguage();
  const [items, setItems] = useState<GrammarWithLesson[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [language]);

  const columns = useMemo(
    (): ColumnDef<GrammarWithLesson>[] => [
      {
        id: "lesson_no",
        header: "テキスト",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {row.original.lessons?.lesson_no ?? "—"}
          </span>
        ),
      },
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
    ],
    [],
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

function PhraseTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const supabase = createClient();
  const language = useCurrentLanguage();
  const [items, setItems] = useState<ExpressionWithLesson[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [language]);

  const columns = useMemo(
    (): ColumnDef<ExpressionWithLesson>[] => [
      {
        id: "lesson_no",
        header: "テキスト",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {row.original.lessons?.lesson_no ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "種別",
        cell: ({ row }) => (
          <span className="text-xs text-foreground">
            {row.original.category}
          </span>
        ),
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
    ],
    [],
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
  const [grammarCount, setGrammarCount] = useState<number | null>(null);
  const [phraseCount, setPhraseCount] = useState<number | null>(null);

  useEffect(() => {
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

  return (
    <div className="space-y-6">
      <PageHeader title="文法・フレーズ" />

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
          <GrammarTab onCountChange={setGrammarCount} />
        </TabsContent>
        <TabsContent value="phrase" className="mt-4">
          <PhraseTab onCountChange={setPhraseCount} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
