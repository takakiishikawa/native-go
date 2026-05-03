"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Progress,
  toast,
} from "@takaki/go-design-system";
import { Loader2, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";

const BATCH_SIZE = 10;

type Lesson = { level: number; lesson_no: string; topic: string };

type GrammarRow = {
  id: string;
  name: string;
  summary: string;
  usage_scene: string;
  examples: string;
  lesson: Lesson | null;
};

type ExpressionRow = {
  id: string;
  expression: string;
  meaning: string;
  usage_scene: string;
  conversation: string;
  lesson: Lesson | null;
};

type Item = {
  id: string;
  kind: "grammar" | "expression";
  label: string;
  sub: string;
  current: string;
  lesson: Lesson | null;
};

type ItemStatus = "pending" | "processing" | "done" | "error";

type RegenResult = { lines: string[]; angle: string };

export function RegenExamplesClient({
  since,
  grammar,
  expressions,
}: {
  since: string;
  grammar: GrammarRow[];
  expressions: ExpressionRow[];
}) {
  const items = useMemo<Item[]>(
    () => [
      ...grammar.map<Item>((g) => ({
        id: g.id,
        kind: "grammar",
        label: g.name,
        sub: g.summary,
        current: g.examples,
        lesson: g.lesson,
      })),
      ...expressions.map<Item>((e) => ({
        id: e.id,
        kind: "expression",
        label: e.expression,
        sub: e.meaning,
        current: e.conversation,
        lesson: e.lesson,
      })),
    ],
    [grammar, expressions],
  );

  const storageKey = `regen-examples-done-${since.slice(0, 10)}`;
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, ItemStatus>>({});
  const [resultMap, setResultMap] = useState<Record<string, RegenResult>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const ids = JSON.parse(stored) as string[];
      setDoneIds(new Set(ids));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const remaining = items.filter((it) => !doneIds.has(it.id));
  const total = items.length;
  const doneCount = total - remaining.length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);
  const allDone = total > 0 && doneCount === total;

  function persistDone(next: Set<string>) {
    window.localStorage.setItem(storageKey, JSON.stringify([...next]));
  }

  async function processBatch() {
    if (running || remaining.length === 0) return;
    setRunning(true);
    const batch = remaining.slice(0, BATCH_SIZE);
    const next = new Set(doneIds);
    let okCount = 0;

    for (const it of batch) {
      setStatusMap((s) => ({ ...s, [it.id]: "processing" }));
      try {
        const res = await fetch("/api/regenerate-example", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: it.id, kind: it.kind }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as RegenResult;
        setResultMap((r) => ({ ...r, [it.id]: data }));
        setStatusMap((s) => ({ ...s, [it.id]: "done" }));
        next.add(it.id);
        persistDone(next);
        setDoneIds(new Set(next));
        okCount += 1;
      } catch (e) {
        setStatusMap((s) => ({ ...s, [it.id]: "error" }));
        toast.error(
          `${it.label}: ${e instanceof Error ? e.message : "失敗"}`,
        );
      }
    }

    setRunning(false);
    if (next.size === total) {
      toast.success("全件再生成しました 🎉");
    } else if (okCount > 0) {
      toast.success(`${okCount}件処理しました`);
    }
  }

  function reset() {
    if (!window.confirm("進捗をリセットして最初からやり直しますか?")) return;
    window.localStorage.removeItem(storageKey);
    setDoneIds(new Set());
    setStatusMap({});
    setResultMap({});
  }

  const hctDate = since.slice(0, 10);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="会話例の再生成 (level 4-6 / 今日)"
        description={`新しいプロンプトで会話例を生成し直すための一時ツール。${BATCH_SIZE}件ずつ処理します（HCMC ${hctDate} 以降）。`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            進捗 {doneCount} / {total} ({percent}%)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={percent} />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={processBatch}
              disabled={running || remaining.length === 0}
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  再生成中...
                </>
              ) : remaining.length === 0 ? (
                "全件完了"
              ) : (
                `次の${Math.min(BATCH_SIZE, remaining.length)}件を再生成`
              )}
            </Button>
            <Button
              variant="outline"
              onClick={reset}
              disabled={running || doneCount === 0}
            >
              <RotateCcw className="h-4 w-4" />
              進捗リセット
            </Button>
          </div>
          {allDone && (
            <p className="text-sm text-muted-foreground">
              全件完了したので、不要になったら{" "}
              <code className="font-mono">app/regen-examples/</code> と{" "}
              <code className="font-mono">app/api/regenerate-example/</code>{" "}
              を削除してください。
            </p>
          )}
        </CardContent>
      </Card>

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            今日 (HCMC {hctDate}) 追加された level 4-6 のアイテムはありません。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const status: ItemStatus =
              statusMap[it.id] ?? (doneIds.has(it.id) ? "done" : "pending");
            const result = resultMap[it.id];
            return (
              <Card key={`${it.kind}-${it.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <Badge variant="outline">
                      L{it.lesson?.level ?? "?"}
                    </Badge>
                    <Badge variant="outline">
                      {it.lesson?.lesson_no ?? "—"}
                    </Badge>
                    <Badge variant="secondary">
                      {it.kind === "grammar" ? "文法" : "表現"}
                    </Badge>
                    <span className="text-muted-foreground truncate">
                      {it.lesson?.topic ?? ""}
                    </span>
                    <span className="ml-auto">
                      <StatusBadge status={status} />
                    </span>
                  </div>
                  <CardTitle className="text-base mt-2">{it.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{it.sub}</p>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <DialoguePane
                    label="現在"
                    text={it.current}
                    muted
                  />
                  {result && (
                    <DialoguePane
                      label={`新規 (angle: ${result.angle})`}
                      text={result.lines.join("\n")}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        処理中
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        完了
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <AlertCircle className="h-3 w-3" />
        エラー
      </span>
    );
  }
  return <span className="text-muted-foreground">待機</span>;
}

function DialoguePane({
  label,
  text,
  muted,
}: {
  label: string;
  text: string;
  muted?: boolean;
}) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={`rounded-md border px-3 py-2 font-mono whitespace-pre-wrap ${
          muted ? "bg-muted/40 text-muted-foreground" : "bg-background"
        }`}
      >
        {lines.length === 0 ? "(なし)" : lines.join("\n")}
      </div>
    </div>
  );
}
