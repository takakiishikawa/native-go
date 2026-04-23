import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type } = await request.json(); // "grammar" | "expression"

  const [grammarResult, expressionResult, logsResult] = await Promise.all([
    supabase.from("grammar").select("play_count"),
    supabase.from("expressions").select("play_count"),
    supabase
      .from("practice_logs")
      .select(
        "practiced_at, grammar_done_count, expression_done_count, speaking_count",
      )
      .order("practiced_at", { ascending: false })
      .limit(14),
  ]);

  const grammars = grammarResult.data ?? [];
  const expressions = expressionResult.data ?? [];
  const logs = logsResult.data ?? [];

  const grammarDone = grammars.filter((g) => g.play_count >= 10).length;
  const grammarInProgress = grammars.filter(
    (g) => g.play_count > 0 && g.play_count < 10,
  ).length;
  const expressionDone = expressions.filter((e) => e.play_count >= 10).length;
  const expressionInProgress = expressions.filter(
    (e) => e.play_count > 0 && e.play_count < 10,
  ).length;

  const recent7 = logs.slice(0, 7);
  const weeklyGrammar = recent7.reduce(
    (s, l) => s + (l.grammar_done_count ?? 0),
    0,
  );
  const weeklyExpression = recent7.reduce(
    (s, l) => s + (l.expression_done_count ?? 0),
    0,
  );
  const weeklyDays = new Set(recent7.map((l) => l.practiced_at)).size;

  const typeLabel = type === "grammar" ? "文法" : "フレーズ";

  const prompt = `あなたは英語学習コーチです。${typeLabel}リピーティングを1周完了したユーザーへのフィードバックを日本語で書いてください。

【ユーザーの学習データ】
- 文法: 習得済み${grammarDone}件 / 練習中${grammarInProgress}件
- フレーズ: 習得済み${expressionDone}件 / 練習中${expressionInProgress}件
- 直近7日: 文法${weeklyGrammar}回・フレーズ${weeklyExpression}回・${weeklyDays}日練習

【ユーザー情報】
- 32歳男性、ベトナム・ホーチミンに住むPM
- Native Campで英語会話を毎日練習
- 目標：グローバルキャリアで使える英語力

【コメント条件】
- ${typeLabel}リピーティング1周完了を讃える
- 学習データの数字を1〜2個使って具体的なフィードバック
- 次への自然な後押し
- 温かみがあり、過度に褒めすぎない
- 100〜150字以内
- 絵文字なし

コメントのみを返してください。`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  return NextResponse.json({ comment: content.text.trim() });
}
