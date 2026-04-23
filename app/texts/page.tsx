"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Badge,
  Input,
  Textarea,
  Tag,
  PageHeader,
  FormActions,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  DataTable,
  Separator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@takaki/go-design-system";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  saveGrammar,
  saveExpressions,
  updateLessonStatus,
} from "@/app/actions/practice";
import type {
  Lesson,
  ExtractResult,
  ExtractedGrammar,
  ExtractedExpression,
} from "@/lib/types";
import { Loader2, Star, BookOpen, MessageSquare, Plus } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type LessonStats = { total: number; done: number; started: number };

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseLessonNo(no: string): number[] {
  return no.split("-").map(Number);
}

function sortLessons(lessons: Lesson[]): Lesson[] {
  return [...lessons].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    const ap = parseLessonNo(a.lesson_no);
    const bp = parseLessonNo(b.lesson_no);
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const diff = (ap[i] ?? 0) - (bp[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

// ─── Components ─────────────────────────────────────────────────────────────

function StatusTag({ status }: { status: Lesson["status"] }) {
  const colorMap: Record<Lesson["status"], "default" | "warning" | "success"> =
    {
      未登録: "default",
      練習中: "warning",
      習得済み: "success",
    };
  return <Tag color={colorMap[status]}>{status}</Tag>;
}

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

function GrammarPreview({ item }: { item: ExtractedGrammar }) {
  return (
    <Card className="border-[color:var(--color-grammar)]/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-[color:var(--color-grammar)]">
            {item.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">文法</Badge>
            <StarRating value={item.frequency} />
          </div>
        </div>
        <CardDescription className="text-sm">{item.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        {item.detail && <p className="text-muted-foreground">{item.detail}</p>}
        <ul className="space-y-1">
          {item.examples.map((ex, i) => (
            <li
              key={i}
              className="text-muted-foreground pl-2 border-l-2 border-[color:var(--color-grammar)]/30"
            >
              {ex}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ExpressionPreview({ item }: { item: ExtractedExpression }) {
  return (
    <Card className="border-[color:var(--color-phrase)]/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-[color:var(--color-phrase)]">
            {item.expression}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{item.category}</Badge>
            <StarRating value={item.frequency} />
          </div>
        </div>
        <CardDescription className="text-sm">{item.meaning}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {item.conversation.map((line, i) => (
          <p
            key={i}
            className={`text-sm pl-2 py-0.5 ${
              line.startsWith("A:")
                ? "text-[color:var(--color-grammar)] border-l-2 border-[color:var(--color-grammar)]/40"
                : "text-[color:var(--color-phrase)] border-l-2 border-[color:var(--color-phrase)]/40"
            }`}
          >
            {line}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── AddModal ────────────────────────────────────────────────────────────────

function LessonCombobox({
  lessons,
  value,
  onChange,
}: {
  lessons: Lesson[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = lessons.find((l) => l.id === value);
  const filtered = lessons.filter((l) =>
    `${l.lesson_no} ${l.topic}`.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        type="text"
        placeholder="レッスン番号またはトピックで検索..."
        value={
          open
            ? query
            : selected
              ? `${selected.lesson_no} — ${selected.topic}`
              : ""
        }
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover border border-border max-h-52 overflow-y-auto">
          {filtered.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              onMouseDown={() => {
                onChange(lesson.id);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="font-mono text-muted-foreground mr-2">
                {lesson.lesson_no}
              </span>
              {lesson.topic}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LOADING_STEPS = [
  "テキストを解析中...",
  "文法テーマを特定中...",
  "フレーズを識別中...",
  "例文・会話例を生成中...",
  "内容を整形中...",
];

function AddModal({
  unregisteredLessons,
  onClose,
  onSaved,
}: {
  unregisteredLessons: Lesson[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);

  const selectedLesson = unregisteredLessons.find(
    (l) => l.id === selectedLessonId,
  );

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleExtract() {
    if (!selectedLessonId || !text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
    } catch {
      toast.error("抽出に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result || !selectedLessonId) return;
    setSaving(true);
    try {
      let savedGrammars: { id: string; name: string }[] = [];
      if (result.grammar.length > 0)
        savedGrammars = await saveGrammar(result.grammar, selectedLessonId);
      if (result.expressions.length > 0)
        await saveExpressions(result.expressions, selectedLessonId);
      await updateLessonStatus(selectedLessonId, "練習中");
      toast.success(
        `文法 ${result.grammar.length}件・フレーズ ${result.expressions.length}件を保存しました`,
      );
      // Fire image generation in background with visible feedback
      if (savedGrammars.length > 0) {
        const genPromise = fetch("/api/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: savedGrammars }),
        }).then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
          const failed = (data.results ?? []).filter(
            (r: { status: string }) => r.status === "error",
          );
          if (failed.length > 0)
            throw new Error(
              `${failed.length}件の生成に失敗: ${failed[0]?.reason ?? ""}`,
            );
          return data;
        });
        toast.promise(genPromise, {
          loading: `スピーキング用画像を生成中... (${savedGrammars.length}件)`,
          success: "スピーキング用画像の生成完了！",
          error: (err: Error) => `画像生成に失敗: ${err.message}`,
        });
      }
      onSaved();
      onClose();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>テキスト追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* ── 抽出完了後: レッスン情報 + 結果のみ ── */}
          {result ? (
            <>
              {/* 対象レッスン（read-only） */}
              <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground w-14 shrink-0">
                  {selectedLesson?.lesson_no}
                </span>
                <span className="text-sm font-medium">
                  {selectedLesson?.topic}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  文法 {result.grammar.length}件・フレーズ{" "}
                  {result.expressions.length}件 抽出
                </p>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    "すべて保存"
                  )}
                </Button>
              </div>

              {result.grammar.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">文法</p>
                  {result.grammar.map((g, i) => (
                    <GrammarPreview key={i} item={g} />
                  ))}
                </div>
              )}

              {result.grammar.length > 0 && result.expressions.length > 0 && (
                <Separator />
              )}

              {result.expressions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">フレーズ</p>
                  {result.expressions.map((e, i) => (
                    <ExpressionPreview key={i} item={e} />
                  ))}
                </div>
              )}
            </>
          ) : loading ? (
            /* ── 抽出中: プログレス表示 ── */
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">
                  {LOADING_STEPS[loadingStep]}
                </p>
                <p className="text-xs text-muted-foreground">
                  通常15〜30秒かかります
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-[3000ms] ease-out"
                    style={{
                      width: `${((loadingStep + 1) / LOADING_STEPS.length) * 85}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                  {LOADING_STEPS.map((step, i) => (
                    <span
                      key={i}
                      className={`transition-colors ${i <= loadingStep ? "text-primary font-medium" : ""}`}
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── 入力フォーム ── */
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">レッスン選択</label>
                {unregisteredLessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    未登録のレッスンがありません
                  </p>
                ) : (
                  <LessonCombobox
                    lessons={unregisteredLessons}
                    value={selectedLessonId}
                    onChange={setSelectedLessonId}
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">教材テキスト</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Native Campの教材テキストをここに貼り付け..."
                  className="min-h-36 font-mono text-xs"
                />
                <Button
                  onClick={handleExtract}
                  disabled={!selectedLessonId || !text.trim()}
                  className="w-full"
                >
                  AIで教材を解析する
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── LessonList (DataTable) ───────────────────────────────────────────────────

type LessonRow = Lesson & {
  grammarStats: LessonStats;
  expressionStats: LessonStats;
};

const lessonColumns: ColumnDef<LessonRow>[] = [
  {
    id: "lesson_no",
    accessorKey: "lesson_no",
    header: "No.",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.lesson_no}
      </span>
    ),
  },
  {
    accessorKey: "topic",
    header: "トピック",
    cell: ({ row }) => <span className="text-sm">{row.original.topic}</span>,
  },
  {
    id: "grammar",
    header: "文法",
    cell: ({ row }) => {
      const g = row.original.grammarStats;
      if (g.total === 0)
        return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          {g.done}/{g.total}
        </span>
      );
    },
  },
  {
    id: "expression",
    header: "フレーズ",
    cell: ({ row }) => {
      const e = row.original.expressionStats;
      if (e.total === 0)
        return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="h-3 w-3" />
          {e.done}/{e.total}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "ステータス",
    cell: ({ row }) => <StatusTag status={row.original.status} />,
  },
];

function LessonList({
  lessons,
  grammarMap,
  expressionMap,
}: {
  lessons: Lesson[];
  grammarMap: Map<string, LessonStats>;
  expressionMap: Map<string, LessonStats>;
}) {
  const rows: LessonRow[] = lessons.map((lesson) => ({
    ...lesson,
    grammarStats: grammarMap.get(lesson.id) ?? {
      total: 0,
      done: 0,
      started: 0,
    },
    expressionStats: expressionMap.get(lesson.id) ?? {
      total: 0,
      done: 0,
      started: 0,
    },
  }));

  return (
    <DataTable
      columns={lessonColumns}
      data={rows}
      pageSize={20}
      emptyMessage="レッスンデータがありません"
    />
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TextsPage() {
  const supabase = createClient();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [grammarMap, setGrammarMap] = useState<Map<string, LessonStats>>(
    new Map(),
  );
  const [expressionMap, setExpressionMap] = useState<Map<string, LessonStats>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadData = useCallback(async () => {
    const [lessonsRes, grammarRes, expressionRes] = await Promise.all([
      supabase.from("lessons").select("*"),
      supabase.from("grammar").select("lesson_id, play_count"),
      supabase.from("expressions").select("lesson_id, play_count"),
    ]);

    setLessons(sortLessons((lessonsRes.data as Lesson[]) ?? []));

    const gMap = new Map<string, LessonStats>();
    for (const g of grammarRes.data ?? []) {
      if (!g.lesson_id) continue;
      const s = gMap.get(g.lesson_id) ?? { total: 0, done: 0, started: 0 };
      s.total++;
      if (g.play_count >= 10) s.done++;
      else if (g.play_count > 0) s.started++;
      gMap.set(g.lesson_id, s);
    }
    setGrammarMap(gMap);

    const eMap = new Map<string, LessonStats>();
    for (const e of expressionRes.data ?? []) {
      if (!e.lesson_id) continue;
      const s = eMap.get(e.lesson_id) ?? { total: 0, done: 0, started: 0 };
      s.total++;
      if (e.play_count >= 10) s.done++;
      else if (e.play_count > 0) s.started++;
      eMap.set(e.lesson_id, s);
    }
    setExpressionMap(eMap);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const byLevel = (level: number) => lessons.filter((l) => l.level === level);

  const levelStatusSummary = (level: number) => {
    const lvl = byLevel(level);
    const done = lvl.filter((l) => l.status === "習得済み").length;
    const inProgress = lvl.filter((l) => l.status === "練習中").length;
    const unregistered = lvl.filter((l) => l.status === "未登録").length;
    return { total: lvl.length, done, inProgress, unregistered };
  };

  const unregisteredLessons = lessons.filter((l) => l.status === "未登録");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="テキスト"
        description="レッスンごとの文法・フレーズ登録状況"
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            テキスト追加
          </Button>
        }
      />

      <Tabs defaultValue="1">
        <TabsList>
          <TabsTrigger value="1">
            Level 1{" "}
            <Badge variant="secondary" className="ml-2 rounded-full">
              {byLevel(1).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="2">
            Level 2{" "}
            <Badge variant="secondary" className="ml-2 rounded-full">
              {byLevel(2).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="3">
            Level 3{" "}
            <Badge variant="secondary" className="ml-2 rounded-full">
              {byLevel(3).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {[1, 2, 3].map((lvl) => {
          const s = levelStatusSummary(lvl);
          return (
            <TabsContent
              key={lvl}
              value={String(lvl)}
              className="space-y-3 mt-4"
            >
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${s.total > 0 ? Math.round((s.done / s.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {s.total}件
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {s.done > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: "var(--color-success)" }}
                      />
                      習得済み {s.done}
                    </span>
                  )}
                  {s.inProgress > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: "var(--color-warning)" }}
                      />
                      練習中 {s.inProgress}
                    </span>
                  )}
                  {s.unregistered > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      未登録 {s.unregistered}
                    </span>
                  )}
                </div>
              </div>
              <LessonList
                lessons={byLevel(lvl)}
                grammarMap={grammarMap}
                expressionMap={expressionMap}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      {showAddModal && (
        <AddModal
          unregisteredLessons={unregisteredLessons}
          onClose={() => setShowAddModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
