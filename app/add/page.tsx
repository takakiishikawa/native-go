"use client";

import { useState } from "react";
import {
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Separator,
  PageHeader,
} from "@takaki/go-design-system";
import { toast } from "@takaki/go-design-system";
import { saveGrammar, saveExpressions } from "@/app/actions/practice";
import type {
  ExtractResult,
  ExtractedGrammar,
  ExtractedExpression,
} from "@/lib/types";
import { Loader2, Star } from "lucide-react";

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
        <CardDescription>{item.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {item.detail && <p className="text-muted-foreground">{item.detail}</p>}
        <div>
          <p className="font-medium mb-1">例文:</p>
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
        </div>
        <p className="text-muted-foreground text-xs">
          場面: {item.usage_scene}
        </p>
      </CardContent>
    </Card>
  );
}

function ExpressionPreview({ item }: { item: ExtractedExpression }) {
  const lines = item.conversation;
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
        <CardDescription>{item.meaning}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <p className="font-medium mb-1">会話例:</p>
          <div className="space-y-1">
            {lines.map((line, i) => (
              <p
                key={i}
                className={`pl-2 ${
                  line.startsWith("A:")
                    ? "text-[color:var(--color-grammar)] border-l-2 border-[color:var(--color-grammar)]/40"
                    : "text-[color:var(--color-phrase)] border-l-2 border-[color:var(--color-phrase)]/40"
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          場面: {item.usage_scene}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AddPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);

  async function handleExtract() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("抽出に失敗しました");
      const data: ExtractResult = await res.json();
      setResult(data);
    } catch {
      toast.error("文法・表現の抽出に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);

    try {
      if (result.grammar.length > 0) await saveGrammar(result.grammar);
      if (result.expressions.length > 0)
        await saveExpressions(result.expressions);
      toast.success(
        `文法 ${result.grammar.length}件・表現 ${result.expressions.length}件を保存しました`,
      );
      setResult(null);
      setText("");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="教材追加"
        description="英会話レッスンのテキストから文法・フレーズを自動抽出"
      />

      <div className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="英会話レッスンの教材テキストをここに貼り付け..."
          className="min-h-48 font-mono text-sm"
        />
        <Button
          onClick={handleExtract}
          disabled={!text.trim() || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Claude APIで抽出中...
            </>
          ) : (
            "文法・表現を自動抽出"
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              文法 {result.grammar.length}件・表現 {result.expressions.length}件
              抽出
            </p>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "すべて保存"
              )}
            </Button>
          </div>

          {result.grammar.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-lg">文法</h2>
              {result.grammar.map((g, i) => (
                <GrammarPreview key={i} item={g} />
              ))}
            </div>
          )}

          {result.grammar.length > 0 && result.expressions.length > 0 && (
            <Separator />
          )}

          {result.expressions.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-lg">表現</h2>
              {result.expressions.map((e, i) => (
                <ExpressionPreview key={i} item={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
