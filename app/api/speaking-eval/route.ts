import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { grammarId, grammarName, speechText } = await request.json();

  const prompt = `あなたは英会話コーチです。初級〜中級者向けの英語スピーチを4観点で採点し、日本語のフィードバックを作成してください。

## 採点基準（各100点満点）
100点 = 日常会話が非常に自然で、相手に全くストレスなく伝わる（ネイティブレベルは不要）
85点  = 自然で流暢な日常会話ができている
75点  = 概ね自然に話せている、細かい誤りはある
60点  = 意思は伝わるが不自然な箇所が多い
60点未満 = 改善が必要

## 採点観点
1. 語彙：文脈に合った語彙が使えているか（日常会話レベルで十分）
2. 文法：「${grammarName}」を含む文法の正確さ
3. 流暢さ：詰まらず自然なペースで話せているか
4. 発音：テキストから推測できる発音・リズムの自然さ

## コメントのフォーマット（厳守）
[GOOD]（1〜2文。具体的に良かった点）
[IMPROVE]（1〜2文。最も改善できる1点。日本語で簡潔に）
[GRAMMAR_BEFORE]（実際に使った文法パターン。英語のみ。改善不要なら"-"）
[GRAMMAR_AFTER]（より自然・正確な文法表現。英語のみ。改善不要なら"-"）
[PHRASE_BEFORE]（実際に使ったフレーズや言い回し。英語のみ。改善不要なら"-"）
[PHRASE_AFTER]（より自然なフレーズや言い回し。英語のみ。改善不要なら"-"）
[EXAMPLE1]（「${grammarName}」を自然に使った英語例文。シンプルな日常会話。25語以内）
[EXAMPLE2]（別のシチュエーションでの英語例文。シンプルな日常会話。25語以内）

## トーンのルール
- 冷静・建設的・前向きなトーンで統一する
- 「ぜひ挑戦してください」「素晴らしい」などの過剰な表現は使わない
- 例文は難しい表現を避け、日常会話で自然に使えるシンプルな表現にする
- スピーチが空または極端に短い場合は[GOOD]に「声に出す練習を続けていきましょう」と書き、IMPROVE/GRAMMAR_BEFORE/PHRASE_BEFOREには"-"を入れる

## 返答形式（他のテキストは不要）
JSON文字列内の改行は必ず \\n（バックスラッシュ+n）で表記し、実際の改行文字は使わないこと。
{"scores":[語彙,文法,流暢さ,発音],"comment":"[GOOD]...\\n[IMPROVE]...\\n[GRAMMAR_BEFORE]...\\n[GRAMMAR_AFTER]...\\n[PHRASE_BEFORE]...\\n[PHRASE_AFTER]...\\n[EXAMPLE1]...\\n[EXAMPLE2]..."}

文法名：${grammarName}
スピーチ：${speechText || "(no speech detected)"}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  const raw = content.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  const DEFAULT_COMMENT =
    "[GOOD]声に出す練習を続けていきましょう\n[GRAMMAR_BEFORE]-\n[GRAMMAR_AFTER]-\n[PHRASE_BEFORE]-\n[PHRASE_AFTER]-\n[EXAMPLE1]Practice using this grammar point in short, simple sentences.\n[EXAMPLE2]Try applying it in everyday conversation to build confidence.";

  let evaluation: { scores: number[]; comment: string };

  // 1st attempt: direct parse
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 2nd attempt: sanitize literal newlines inside JSON string values
    try {
      const sanitized = raw.replace(/("(?:[^"\\]|\\.)*")/g, (m) =>
        m.replace(/\r?\n/g, "\\n"),
      );
      parsed = JSON.parse(sanitized);
    } catch {
      // 3rd attempt: regex extraction
      const scoresMatch = raw.match(/"scores"\s*:\s*\[([^\]]+)\]/);
      const commentMatch = raw.match(/"comment"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/);
      if (scoresMatch) {
        parsed = {
          scores: scoresMatch[1]
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => !isNaN(n)),
          comment: commentMatch
            ? commentMatch[1].replace(/\\n/g, "\n")
            : DEFAULT_COMMENT,
        };
      }
    }
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { scores?: unknown }).scores)
  ) {
    parsed = { scores: [50, 50, 50, 50], comment: DEFAULT_COMMENT };
  }

  evaluation = parsed as { scores: number[]; comment: string };

  const safeScores = evaluation.scores.map((s) =>
    Math.min(100, Math.max(0, Math.round(Number(s) || 0))),
  );
  const safeTotal =
    safeScores.length > 0
      ? Math.round(safeScores.reduce((a, b) => a + b, 0) / safeScores.length)
      : 0;

  const { data: log, error: logError } = await supabase
    .from("speaking_logs")
    .insert({
      user_id: user.id,
      grammar_id: grammarId,
      speech_text: speechText ?? "",
      scores: safeScores,
      total_score: safeTotal,
      comment: evaluation.comment,
    })
    .select("id")
    .single();

  if (logError)
    return NextResponse.json({ error: logError.message }, { status: 500 });

  // 3回以上練習したら習得済みにする
  const { count } = await supabase
    .from("speaking_logs")
    .select("id", { count: "exact", head: true })
    .eq("grammar_id", grammarId)
    .eq("user_id", user.id);

  if ((count ?? 0) >= 3) {
    await supabase
      .from("grammar")
      .update({ play_count: 10 })
      .eq("id", grammarId);
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: existingLog } = await supabase
    .from("practice_logs")
    .select("grammar_done_count, expression_done_count, speaking_count")
    .eq("practiced_at", today)
    .maybeSingle();

  await supabase.from("practice_logs").upsert(
    {
      practiced_at: today,
      grammar_done_count: existingLog?.grammar_done_count ?? 0,
      expression_done_count: existingLog?.expression_done_count ?? 0,
      speaking_count: (existingLog?.speaking_count ?? 0) + 1,
    },
    { onConflict: "practiced_at" },
  );

  return NextResponse.json({
    logId: log.id,
    scores: safeScores,
    total: safeTotal,
    comment: evaluation.comment,
  });
}
