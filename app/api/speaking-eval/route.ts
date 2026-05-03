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

  const { sceneId, speechText } = await request.json();

  const { data: scene } = await supabase
    .from("speaking_scenes")
    .select("image_url")
    .eq("id", sceneId)
    .single();
  const imageUrl = scene?.image_url;
  if (!imageUrl)
    return NextResponse.json({ error: "Image not found" }, { status: 404 });

  const prompt = `あなたは英会話コーチです。学習者は4コマのイラストを見て、30秒で英語のストーリーを話しました。

最重要：イラストの登場人物・場所・出来事・流れを基準に、ユーザーのスピーチがその「画像のストーリー」とどれだけ一致しているかを必ず確認してください。画像と無関係な内容を話している場合は、フィードバックでその点を明確に指摘してください。

## 採点（各100点満点）
1. 内容: イラストのストーリーを正確に・順序立てて伝えられているか（最重要）
2. 文法: 文法の正確さ
3. 流暢さ: 詰まらず自然なペースで話せているか
4. 表現: 自然で日常会話らしい語彙・言い回し

100=非常に自然、85=自然で流暢、75=概ね自然、60=伝わるが不自然、60未満=要練習

## コメント（厳守フォーマット）
[GOOD]（1〜2文。具体的に良かった点。画像のどの場面を上手く伝えられたか触れる）
[IMPROVE]（1〜2文。最も改善できる1点。日本語で簡潔に。画像の内容と合っているかを最優先で評価）
[PHRASE_BEFORE]（実際に使った不自然なフレーズ。英語のみ。改善不要なら"-"）
[PHRASE_AFTER]（より自然なフレーズ。英語のみ。改善不要なら"-"）
[MODEL1]（このイラストの完璧なモデルストーリー。30秒で話せる長さ＝80〜100語程度の英語。シンプルな日常会話の語彙で、4コマの流れを順序立てて描写）
[MODEL2]（同じイラストの別パターンのモデルストーリー。30秒で話せる長さ＝80〜100語程度。MODEL1と表現や語彙を変える）

## ルール
- 冷静・建設的・前向きなトーン
- 「ぜひ挑戦」「素晴らしい」など過剰表現は使わない
- MODEL1/MODEL2は必ずイラストの登場人物と出来事を反映する。汎用的な作文にしない
- MODELは1文ではなく複数文で30秒分の自然なナレーションにする
- スピーチが空または極端に短い場合：[GOOD]に「声に出す練習を続けていきましょう」、[IMPROVE]/[PHRASE_BEFORE]/[PHRASE_AFTER]は"-"。MODEL1/MODEL2はイラストに合わせて生成する

## 返答形式（JSONのみ。他のテキストは出力しない）
JSON文字列内の改行は \\n（バックスラッシュ+n）で表記し、実際の改行文字は使わないこと。
{"scores":[内容,文法,流暢さ,表現],"comment":"[GOOD]...\\n[IMPROVE]...\\n[PHRASE_BEFORE]...\\n[PHRASE_AFTER]...\\n[MODEL1]...\\n[MODEL2]..."}

スピーチ：${speechText || "(no speech detected)"}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: prompt },
        ],
      },
    ],
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
    "[GOOD]声に出す練習を続けていきましょう\n[IMPROVE]-\n[PHRASE_BEFORE]-\n[PHRASE_AFTER]-\n[MODEL1]-\n[MODEL2]-";

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
      scene_id: sceneId,
      speech_text: speechText ?? "",
      scores: safeScores,
      total_score: safeTotal,
      comment: evaluation.comment,
    })
    .select("id")
    .single();

  if (logError)
    return NextResponse.json({ error: logError.message }, { status: 500 });

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
