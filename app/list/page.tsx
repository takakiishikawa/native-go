"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DataTable,
  PageHeader,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@takaki/go-design-system";
import type { ColumnDef } from "@tanstack/react-table";
import type { Grammar, Expression } from "@/lib/types";
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

function StatsBar({
  total,
  done,
  inProgress,
}: {
  total: number;
  done: number;
  inProgress: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-medium">{total}件</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {done > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--color-success)" }}
            />
            完了 {done}
          </span>
        )}
        {inProgress > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--color-warning)" }}
            />
            練習中 {inProgress}
          </span>
        )}
        {total - done - inProgress > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            未練習 {total - done - inProgress}
          </span>
        )}
      </div>
    </div>
  );
}

function PlayProgress({ count, max = 10 }: { count: number; max?: number }) {
  const pct = Math.min((count / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-foreground tabular-nums">
        {count}/{max}
      </span>
    </div>
  );
}

// ── Grammar Modal ─────────────────────────────────────────────────────────────

function GrammarModal({
  item,
  onClose,
}: {
  item: GrammarWithLesson;
  onClose: () => void;
}) {
  const exampleLines = item.examples?.split("\n").filter(Boolean) ?? [];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          {/* Summary */}
          <div className="rounded-lg bg-muted/60 px-4 py-3 leading-relaxed whitespace-pre-line text-foreground">
            {item.summary?.replace(/\\n/g, "\n")}
          </div>

          {/* Detail */}
          {item.detail && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                詳細
              </p>
              <p className="leading-7 whitespace-pre-wrap text-foreground">
                {item.detail}
              </p>
            </div>
          )}

          {/* Examples */}
          {exampleLines.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                例文
              </p>
              <div className="space-y-2">
                {exampleLines.map((line, i) => {
                  const isA = line.startsWith("A:");
                  const isB = line.startsWith("B:");
                  if (isA || isB) {
                    const speaker = isA ? "A" : "B";
                    const text = line.slice(2).trim();
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 ${isB ? "pl-6" : ""}`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                            isA
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted-foreground/20 text-foreground"
                          }`}
                        >
                          {speaker}
                        </span>
                        <div
                          className={`rounded-lg px-3 py-2 leading-relaxed ${
                            isA
                              ? "bg-primary/10 text-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {text}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <p key={i} className="text-foreground pl-1">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
            <StarRating value={item.frequency} />
            <span>練習 {item.play_count} / 10回</span>
            {item.lessons?.lesson_no && (
              <span>テキスト {item.lessons.lesson_no}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Phrase Modal ──────────────────────────────────────────────────────────────

function PhraseModal({
  item,
  onClose,
}: {
  item: ExpressionWithLesson;
  onClose: () => void;
}) {
  const convLines = item.conversation?.split("\n").filter(Boolean) ?? [];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.expression}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          {/* Meaning */}
          <div className="rounded-lg bg-muted/60 px-4 py-3 leading-relaxed whitespace-pre-line text-foreground">
            {item.meaning}
          </div>

          {/* Conversation */}
          {convLines.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                会話例
              </p>
              <div className="space-y-2">
                {convLines.map((line, i) => {
                  const isA = line.startsWith("A:");
                  const isB = line.startsWith("B:");
                  if (isA || isB) {
                    const speaker = isA ? "A" : "B";
                    const text = line.slice(2).trim();
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2.5 ${isB ? "pl-6" : ""}`}
                      >
                        <span
                          className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                            isA
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted-foreground/20 text-foreground"
                          }`}
                        >
                          {speaker}
                        </span>
                        <div
                          className={`rounded-lg px-3 py-2 leading-relaxed ${
                            isA
                              ? "bg-primary/10 text-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {text}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <p key={i} className="text-foreground pl-1">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
            <StarRating value={item.frequency} />
            <span>練習 {item.play_count} / 10回</span>
            {item.category && <span>{item.category}</span>}
            {item.lessons?.lesson_no && (
              <span>テキスト {item.lessons.lesson_no}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── GrammarTab ────────────────────────────────────────────────────────────────

function GrammarTab({
  onCountChange,
}: {
  onCountChange?: (n: number) => void;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<GrammarWithLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GrammarWithLesson | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("grammar")
        .select("*, lessons(lesson_no)");
      const sorted = sortByLessonNo((data ?? []) as GrammarWithLesson[]);
      setItems(sorted);
      onCountChange?.(sorted.length);
      setLoading(false);
    }
    load();
  }, []);

  const doneCount = items.filter((i) => i.play_count >= 10).length;
  const inProgressCount = items.filter(
    (i) => i.play_count > 0 && i.play_count < 10,
  ).length;

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
        cell: ({ row }) => <PlayProgress count={row.original.play_count} />,
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
      <StatsBar
        total={items.length}
        done={doneCount}
        inProgress={inProgressCount}
      />
      <DataTable
        columns={columns}
        data={items}
        pageSize={20}
        emptyMessage="文法が登録されていません"
        onRowClick={setSelected}
      />
      {selected && (
        <GrammarModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ── PhraseTab ─────────────────────────────────────────────────────────────────

function PhraseTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const supabase = createClient();
  const [items, setItems] = useState<ExpressionWithLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExpressionWithLesson | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("expressions")
        .select("*, lessons(lesson_no)");
      const sorted = sortByLessonNo((data ?? []) as ExpressionWithLesson[]);
      setItems(sorted);
      onCountChange?.(sorted.length);
      setLoading(false);
    }
    load();
  }, []);

  const doneCount = items.filter((i) => i.play_count >= 10).length;
  const inProgressCount = items.filter(
    (i) => i.play_count > 0 && i.play_count < 10,
  ).length;

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
        cell: ({ row }) => <PlayProgress count={row.original.play_count} />,
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
      <StatsBar
        total={items.length}
        done={doneCount}
        inProgress={inProgressCount}
      />
      <DataTable
        columns={columns}
        data={items}
        pageSize={20}
        emptyMessage="フレーズが登録されていません"
        onRowClick={setSelected}
      />
      {selected && (
        <PhraseModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ListPage() {
  const [grammarCount, setGrammarCount] = useState<number | null>(null);
  const [phraseCount, setPhraseCount] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="文法・フレーズ"
        description="登録済みの文法・フレーズを確認できます"
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
          <GrammarTab onCountChange={setGrammarCount} />
        </TabsContent>
        <TabsContent value="phrase" className="mt-4">
          <PhraseTab onCountChange={setPhraseCount} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
