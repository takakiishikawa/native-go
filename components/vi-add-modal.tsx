"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Spinner,
  Textarea,
  toast,
} from "@takaki/go-design-system";
import { Trash2 } from "lucide-react";
import { saveGrammar, saveExpressions } from "@/app/actions/practice";
import type {
  ExtractResult,
  ExtractedExpression,
  ExtractedGrammar,
} from "@/lib/types";
import { WordNotesInline } from "@/components/word-notes";

type Kind = "grammar" | "phrase";

const LOADING_STEPS = [
  "入力を解析中...",
  "文法・フレーズを仕分け中...",
  "単語ごとの解説を生成中...",
  "ニュアンスを書き出し中...",
  "整形中...",
];

const PLACEHOLDER = `学びたい文法・フレーズを箇条書きで投げてください。AIが文法とフレーズに仕分けて、単語ごとの解説とニュアンスを付けます。

例:
- Cảm ơn
- Bạn khỏe không?
- là 〜です構文
- có ... không の疑問文
- Tôi đi ăn cơm`;

export function ViAddModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [grammar, setGrammar] = useState<ExtractedGrammar[]>([]);
  const [expressions, setExpressions] = useState<ExtractedExpression[]>([]);
  const [hasResult, setHasResult] = useState(false);

  const hasInput = text.trim().length > 0;

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
          ...(kind ? { kind } : {}),
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ExtractResult;
      setGrammar(data.grammar ?? []);
      setExpressions(data.expressions ?? []);
      setHasResult(true);
    } catch {
      toast.error("仕分けに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (grammar.length === 0 && expressions.length === 0) {
      toast.error("追加する項目がありません");
      return;
    }
    setSaving(true);
    try {
      if (grammar.length > 0) await saveGrammar(grammar);
      if (expressions.length > 0) await saveExpressions(expressions);
      toast.success(
        `文法 ${grammar.length}件・フレーズ ${expressions.length}件を追加しました`,
      );
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
  }

  function KindToggle({
    value,
    label,
  }: {
    value: Kind;
    label: string;
  }) {
    const active = kind === value;
    return (
      <button
        type="button"
        onClick={() => setKind(active ? null : value)}
        className={cn(
          "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-muted/30 text-foreground hover:bg-muted",
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl flex flex-col max-h-[88vh] gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>文法・フレーズを追加</DialogTitle>
          <DialogDescription>
            箇条書きで投げてください。仕分け後の確認画面で不要な行を削除できます。
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
              <p className="text-sm text-muted-foreground">
                文法 {grammar.length}件・フレーズ {expressions.length}
                件を抽出しました。間違いがあれば各行の{" "}
                <Trash2 className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                で削除してください。
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
                          <th className="text-left px-3 py-2 font-medium w-[100px]">
                            種別
                          </th>
                          <th className="text-left px-3 py-2 font-medium w-[180px]">
                            文法名
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            概要
                          </th>
                          <th className="text-left px-3 py-2 font-medium w-[280px]">
                            単語解説
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
                            <td className="px-3 py-2">
                              {g.category ? (
                                <Badge variant="outline" className="text-[11px]">
                                  {g.category}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
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
                          <th className="text-left px-3 py-2 font-medium w-[260px]">
                            単語解説
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
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-[11px]">
                                {e.category}
                              </Badge>
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

              {grammar.length === 0 && expressions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  全件削除されました。入力に戻ってやり直してください。
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  種類 (任意)
                </Label>
                <p className="text-xs text-muted-foreground">
                  指定すると入力すべてをその種類として扱います。未選択ならAIが文法/フレーズを自動仕分け。
                </p>
                <div className="flex gap-2">
                  <KindToggle value="grammar" label="文法" />
                  <KindToggle value="phrase" label="フレーズ" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vi-add-text">
                  学びたい文法・フレーズ（箇条書き）
                </Label>
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
                  disabled={
                    saving ||
                    (grammar.length === 0 && expressions.length === 0)
                  }
                >
                  {saving && <Spinner size="sm" className="mr-2" />}
                  {saving
                    ? "追加中..."
                    : `${grammar.length + expressions.length}件を追加する`}
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
