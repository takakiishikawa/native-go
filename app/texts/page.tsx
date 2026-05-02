"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Button,
  Badge,
  Textarea,
  Tag,
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Combobox,
  DataTable,
  Label,
  Separator,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from "@takaki/go-design-system";
import type { ColumnDef } from "@tanstack/react-table";
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
import Link from "next/link";
import { Star, BookOpen, MessageSquare, Plus } from "lucide-react";
import { useCurrentLanguage } from "@/lib/language-context";

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

const LOADING_STEPS = [
  "テキストを解析中...",
  "文法テーマを特定中...",
  "フレーズを識別中...",
  "例文・会話例を生成中...",
  "内容を整形中...",
];

function AddModal({
  unregisteredLessons,
  language,
  onClose,
  onSaved,
}: {
  unregisteredLessons: Lesson[];
  language: "en" | "vi";
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEn = language === "en";
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
    if (!text.trim()) return;
    if (isEn && !selectedLessonId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language }),
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
    if (!result) return;
    if (isEn && !selectedLessonId) return;
    setSaving(true);
    try {
      let savedGrammars: { id: string; name: string }[] = [];
      const lessonId = isEn ? selectedLessonId : undefined;
      if (result.grammar.length > 0)
        savedGrammars = await saveGrammar(result.grammar, lessonId);
      if (result.expressions.length > 0)
        await saveExpressions(result.expressions, lessonId);
      if (isEn) await updateLessonStatus(selectedLessonId, "練習中");
      toast.success(
        `文法 ${result.grammar.length}件・フレーズ ${result.expressions.length}件を保存しました`,
      );
      // 画像生成は EN（スピーキング機能）でだけ走らせる
      if (isEn && savedGrammars.length > 0) {
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

  const lessonOptions = unregisteredLessons.map((l) => ({
    value: l.id,
    label: `${l.lesson_no} — ${l.topic}`,
  }));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl flex flex-col max-h-[85vh] gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>テキスト追加</DialogTitle>
          <DialogDescription>
            {isEn
              ? "Native Campの教材テキストを貼り付けて、AIに文法・フレーズを抽出させます。"
              : "ベトナム語の文法・フレーズ・例文をコピペすると、AIがCEFR A1相当の項目に仕分けて登録します。"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {result ? (
            <div className="space-y-5">
              {isEn && selectedLesson && (
                <div className="rounded-md border bg-muted/40 px-4 py-3 flex items-center gap-3">
                  <span className="font-mono text-sm text-muted-foreground w-14 shrink-0">
                    {selectedLesson.lesson_no}
                  </span>
                  <span className="text-sm font-medium">
                    {selectedLesson.topic}
                  </span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                文法 {result.grammar.length}件・フレーズ{" "}
                {result.expressions.length}件を抽出しました。
              </p>

              {result.grammar.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    文法
                  </Label>
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
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    フレーズ
                  </Label>
                  {result.expressions.map((e, i) => (
                    <ExpressionPreview key={i} item={e} />
                  ))}
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-5 py-8">
              <Spinner size="lg" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  {LOADING_STEPS[loadingStep]}
                </p>
                <p className="text-xs text-muted-foreground">
                  通常15〜30秒かかります
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-[3000ms] ease-out"
                    style={{
                      width: `${((loadingStep + 1) / LOADING_STEPS.length) * 85}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums px-0.5">
                  {LOADING_STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={
                        i <= loadingStep ? "text-primary font-medium" : ""
                      }
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {isEn && (
                <div className="space-y-2">
                  <Label htmlFor="lesson-select">レッスン</Label>
                  {unregisteredLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      未登録のレッスンがありません
                    </p>
                  ) : (
                    <Combobox
                      options={lessonOptions}
                      value={selectedLessonId}
                      onValueChange={setSelectedLessonId}
                      placeholder="レッスンを選択..."
                      searchPlaceholder="レッスン番号またはトピックで検索..."
                      emptyText="該当するレッスンがありません"
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="material-text">
                  {isEn ? "教材テキスト" : "ベトナム語の素材"}
                </Label>
                <Textarea
                  id="material-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    isEn
                      ? "Native Campの教材テキストをここに貼り付け..."
                      : "ベトナム語の単語・フレーズ・例文をここに貼り付け..."
                  }
                  className="min-h-40 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {!loading && (
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            {result ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setResult(null)}
                  disabled={saving}
                >
                  入力に戻る
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Spinner size="sm" className="mr-2" />}
                  {saving ? "保存中..." : "すべて保存"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={onClose}>
                  キャンセル
                </Button>
                <Button
                  onClick={handleExtract}
                  disabled={(isEn && !selectedLessonId) || !text.trim()}
                >
                  {isEn ? "AIで教材を解析する" : "AIで仕分けする"}
                </Button>
              </>
            )}
          </DialogFooter>
        )}
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
    cell: ({ row }) => (
      <StatusTag status={deriveLessonStatus(row.original)} />
    ),
  },
];

function deriveLessonStatus(row: LessonRow): Lesson["status"] {
  if (row.status === "未登録") return "未登録";
  const { grammarStats: g, expressionStats: e } = row;
  if (g.total + e.total === 0) return row.status;
  const allDone = g.done >= g.total && e.done >= e.total;
  return allDone ? "習得済み" : "練習中";
}

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

// ─── FlatTextList (VI 用フラット表示) ───────────────────────────────────────────

function FlatTextList({
  grammars,
  expressions,
}: {
  grammars: { id: string; name: string; play_count: number }[];
  expressions: { id: string; expression: string; play_count: number }[];
}) {
  const grammarColumns: ColumnDef<{
    id: string;
    name: string;
    play_count: number;
  }>[] = [
    {
      accessorKey: "name",
      header: "文法",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "play_count",
      header: "練習",
      cell: ({ row }) =>
        row.original.play_count >= 10 ? (
          <Tag color="success">完了</Tag>
        ) : (
          <span className="text-xs tabular-nums text-muted-foreground">
            {row.original.play_count}/10
          </span>
        ),
    },
  ];
  const expressionColumns: ColumnDef<{
    id: string;
    expression: string;
    play_count: number;
  }>[] = [
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
      accessorKey: "play_count",
      header: "練習",
      cell: ({ row }) =>
        row.original.play_count >= 10 ? (
          <Tag color="success">完了</Tag>
        ) : (
          <span className="text-xs tabular-nums text-muted-foreground">
            {row.original.play_count}/10
          </span>
        ),
    },
  ];

  return (
    <Tabs defaultValue="grammar">
      <TabsList>
        <TabsTrigger value="grammar">
          文法
          <Badge variant="secondary" className="ml-2 rounded-full">
            {grammars.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="phrase">
          フレーズ
          <Badge variant="secondary" className="ml-2 rounded-full">
            {expressions.length}
          </Badge>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="grammar" className="mt-4">
        <DataTable
          columns={grammarColumns}
          data={grammars}
          pageSize={20}
          emptyMessage="文法が登録されていません。テキスト追加から登録してください。"
        />
      </TabsContent>
      <TabsContent value="phrase" className="mt-4">
        <DataTable
          columns={expressionColumns}
          data={expressions}
          pageSize={20}
          emptyMessage="フレーズが登録されていません。テキスト追加から登録してください。"
        />
      </TabsContent>
    </Tabs>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TextsPage() {
  const supabase = createClient();
  const language = useCurrentLanguage();
  const isEn = language === "en";
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [grammars, setGrammars] = useState<
    { id: string; name: string; play_count: number }[]
  >([]);
  const [expressions, setExpressions] = useState<
    { id: string; expression: string; play_count: number }[]
  >([]);
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
      supabase.from("lessons").select("*").eq("language", language),
      supabase
        .from("grammar")
        .select("id, name, lesson_id, play_count")
        .eq("language", language),
      supabase
        .from("expressions")
        .select("id, expression, lesson_id, play_count")
        .eq("language", language),
    ]);

    setLessons(sortLessons((lessonsRes.data as Lesson[]) ?? []));
    setGrammars(
      (grammarRes.data ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        play_count: g.play_count ?? 0,
      })),
    );
    setExpressions(
      (expressionRes.data ?? []).map((e) => ({
        id: e.id,
        expression: e.expression,
        play_count: e.play_count ?? 0,
      })),
    );

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
  }, [language]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const byLevel = (level: number) => lessons.filter((l) => l.level === level);

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
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/list">
                <BookOpen className="mr-1.5 h-4 w-4" />
                文法・フレーズ
              </Link>
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              テキスト追加
            </Button>
          </div>
        }
      />

      {isEn ? (
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

          {[1, 2, 3].map((lvl) => (
            <TabsContent
              key={lvl}
              value={String(lvl)}
              className="space-y-3 mt-4"
            >
              <LessonList
                lessons={byLevel(lvl)}
                grammarMap={grammarMap}
                expressionMap={expressionMap}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <FlatTextList grammars={grammars} expressions={expressions} />
      )}

      {showAddModal && (
        <AddModal
          unregisteredLessons={unregisteredLessons}
          language={language}
          onClose={() => setShowAddModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
