"use client";

import { useEffect, useState } from "react";
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
  Textarea,
  toast,
} from "@takaki/go-design-system";
import { Star, Trash2 } from "lucide-react";
import {
  saveGrammar,
  saveExpressions,
  saveWords,
} from "@/app/actions/practice";
import type {
  ExtractResult,
  ExtractedExpression,
  ExtractedGrammar,
  ExtractedWord,
} from "@/lib/types";
import { WordNotesInline } from "@/components/word-notes";
import { CategoryTag } from "@/components/category-tag";

type WithPriority<T> = T & { is_priority: boolean };

const LOADING_STEPS = [
  "入力を解析中...",
  "文法・フレーズ・単語を仕分け中...",
  "単語ごとの解説を生成中...",
  "ニュアンスを書き出し中...",
  "整形中...",
];

const PLACEHOLDER = `Preplyレッスンの宿題やテキストをそのまま貼り付けてください。
タイトル（例: TRIAL LESSON - HOMEWORK）も含めて構いません。
AIが文法・フレーズ・単語に仕分けて、単語ごとの解説とニュアンスを付けます。`;

function PriorityStar({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={active ? "強化を外す" : "強化に追加"}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active
          ? "text-[color:var(--color-warning)] hover:bg-[color:var(--color-warning)]/10"
          : "text-muted-foreground/40 hover:text-[color:var(--color-warning)] hover:bg-muted",
      )}
    >
      <Star
        className={cn(
          "h-4 w-4",
          active && "fill-[var(--color-warning)]",
        )}
      />
    </button>
  );
}

export function ViAddModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [grammar, setGrammar] = useState<WithPriority<ExtractedGrammar>[]>([]);
  const [expressions, setExpressions] = useState<
    WithPriority<ExtractedExpression>[]
  >([]);
  const [words, setWords] = useState<WithPriority<ExtractedWord>[]>([]);
  const [sourceTitle, setSourceTitle] = useState("");
  const [hasResult, setHasResult] = useState(false);

  const hasInput = text.trim().length > 0;
  const totalCount = grammar.length + expressions.length + words.length;

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
    if (!hasInput) return;
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          language: "vi",
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ExtractResult;
      setGrammar(
        (data.grammar ?? []).map((g) => ({ ...g, is_priority: false })),
      );
      setExpressions(
        (data.expressions ?? []).map((e) => ({ ...e, is_priority: false })),
      );
      setWords(
        (data.words ?? []).map((w) => ({ ...w, is_priority: false })),
      );
      setSourceTitle(data.source_title ?? "");
      setHasResult(true);
    } catch {
      toast.error("仕分けに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (totalCount === 0) {
      toast.error("追加する項目がありません");
      return;
    }
    setSaving(true);
    const trimmedTitle = sourceTitle.trim();
    const titleArg = trimmedTitle ? trimmedTitle : null;
    try {
      if (grammar.length > 0) {
        await saveGrammar(
          grammar.map((g) => ({ ...g, source_title: titleArg })),
        );
      }
      if (expressions.length > 0) {
        await saveExpressions(
          expressions.map((e) => ({ ...e, source_title: titleArg })),
        );
      }
      let wordsResult = { inserted: words.length, skipped: 0 };
      if (words.length > 0) {
        wordsResult = await saveWords(
          words.map((w) => ({ ...w, source_title: titleArg })),
        );
      }
      const parts: string[] = [];
      if (grammar.length > 0) parts.push(`文法 ${grammar.length}件`);
      if (expressions.length > 0) parts.push(`フレーズ ${expressions.length}件`);
      if (words.length > 0) {
        if (wordsResult.skipped > 0) {
          parts.push(
            `単語 ${wordsResult.inserted}件（重複${wordsResult.skipped}件除外）`,
          );
        } else {
          parts.push(`単語 ${wordsResult.inserted}件`);
        }
      }
      toast.success(`${parts.join("・")}を追加しました`);
      onSaved();
      onClose();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function backToInput() {
    setHasResult(false);
    setGrammar([]);
    setExpressions([]);
    setWords([]);
    setSourceTitle("");
  }

  function togglePriority(
    setter: "grammar" | "expressions" | "words",
    idx: number,
  ) {
    if (setter === "grammar") {
      setGrammar((prev) =>
        prev.map((it, i) =>
          i === idx ? { ...it, is_priority: !it.is_priority } : it,
        ),
      );
    } else if (setter === "expressions") {
      setExpressions((prev) =>
        prev.map((it, i) =>
          i === idx ? { ...it, is_priority: !it.is_priority } : it,
        ),
      );
    } else {
      setWords((prev) =>
        prev.map((it, i) =>
          i === idx ? { ...it, is_priority: !it.is_priority } : it,
        ),
      );
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-5xl flex flex-col max-h-[88vh] gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>文法・フレーズ・単語を追加</DialogTitle>
          <DialogDescription>
            Preplyレッスンのテキストを貼り付け → AIが3カテゴリに仕分け → 確認画面で不要な行を削除して一括追加。星マークで強化フラグを付けると練習サイクルで優先的に出ます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
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
          ) : hasResult ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="vi-add-source-title">
                  ソースタイトル (任意)
                </Label>
                <Input
                  id="vi-add-source-title"
                  value={sourceTitle}
                  onChange={(ev) => setSourceTitle(ev.target.value)}
                  placeholder="例: TRIAL LESSON - HOMEWORK"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  どのレッスン由来か追跡できるようにします。空欄でも保存可。
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                文法 {grammar.length}件・フレーズ {expressions.length}件・単語{" "}
                {words.length}件を抽出しました。{" "}
                <Star className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                で強化フラグ、{" "}
                <Trash2 className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                で削除。
              </p>

              {grammar.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    文法 ({grammar.length})
                  </Label>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="w-10 px-2 py-2 text-left">強化</th>
                          <th className="text-left px-3 py-2 font-medium w-[100px]">
                            種別
                          </th>
                          <th className="text-left px-3 py-2 font-medium w-[180px]">
                            文法名
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            概要
                          </th>
                          <th className="text-left px-3 py-2 font-medium w-[260px]">
                            単語
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {grammar.map((g, i) => (
                          <tr
                            key={`g-${i}`}
                            className="border-t align-top hover:bg-muted/30"
                          >
                            <td className="px-2 py-2">
                              <PriorityStar
                                active={g.is_priority}
                                onToggle={() => togglePriority("grammar", i)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <CategoryTag category={g.category} />
                            </td>
                            <td className="px-3 py-2 font-medium text-[color:var(--color-grammar)]">
                              {g.name}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {g.summary}
                            </td>
                            <td className="px-3 py-2">
                              <WordNotesInline notes={g.word_notes} />
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setGrammar((prev) =>
                                    prev.filter((_, idx) => idx !== i),
                                  )
                                }
                                aria-label="削除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {expressions.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    フレーズ ({expressions.length})
                  </Label>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="w-10 px-2 py-2 text-left">強化</th>
                          <th className="text-left px-3 py-2 font-medium w-[100px]">
                            種別
                          </th>
                          <th className="text-left px-3 py-2 font-medium w-[180px]">
                            フレーズ
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            意味
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            ニュアンス
                          </th>
                          <th className="text-left px-3 py-2 font-medium w-[240px]">
                            単語
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {expressions.map((e, i) => (
                          <tr
                            key={`e-${i}`}
                            className="border-t align-top hover:bg-muted/30"
                          >
                            <td className="px-2 py-2">
                              <PriorityStar
                                active={e.is_priority}
                                onToggle={() =>
                                  togglePriority("expressions", i)
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <CategoryTag category={e.category} />
                            </td>
                            <td className="px-3 py-2 font-medium text-[color:var(--color-phrase)]">
                              {e.expression}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {e.meaning}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {e.nuance ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              <WordNotesInline notes={e.word_notes} />
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setExpressions((prev) =>
                                    prev.filter((_, idx) => idx !== i),
                                  )
                                }
                                aria-label="削除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {words.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    単語 ({words.length})
                  </Label>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="w-10 px-2 py-2 text-left">強化</th>
                          <th className="text-left px-3 py-2 font-medium w-[140px]">
                            単語
                          </th>
                          <th className="text-left px-3 py-2 font-medium w-[180px]">
                            意味
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            例文
                          </th>
                          <th className="text-left px-3 py-2 font-medium w-[200px]">
                            関連語
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {words.map((w, i) => (
                          <tr
                            key={`w-${i}`}
                            className="border-t align-top hover:bg-muted/30"
                          >
                            <td className="px-2 py-2">
                              <PriorityStar
                                active={w.is_priority}
                                onToggle={() => togglePriority("words", i)}
                              />
                            </td>
                            <td className="px-3 py-2 font-medium">{w.word}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {w.meaning}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {w.example ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              <WordNotesInline notes={w.word_notes} />
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setWords((prev) =>
                                    prev.filter((_, idx) => idx !== i),
                                  )
                                }
                                aria-label="削除"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {totalCount === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  全件削除されました。入力に戻ってやり直してください。
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="vi-add-text">レッスンテキスト</Label>
                <p className="text-xs text-muted-foreground">
                  AIが文法・フレーズ・単語の3カテゴリに自動仕分けします。
                </p>
                <Textarea
                  id="vi-add-text"
                  value={text}
                  onChange={(ev) => setText(ev.target.value)}
                  placeholder={PLACEHOLDER}
                  className="min-h-48 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {!loading && (
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            {hasResult ? (
              <>
                <Button
                  variant="outline"
                  onClick={backToInput}
                  disabled={saving}
                >
                  入力に戻る
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || totalCount === 0}
                >
                  {saving && <Spinner size="sm" className="mr-2" />}
                  {saving ? "追加中..." : `${totalCount}件を追加する`}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={onClose}>
                  キャンセル
                </Button>
                <Button onClick={handleExtract} disabled={!hasInput}>
                  仕分けする
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
