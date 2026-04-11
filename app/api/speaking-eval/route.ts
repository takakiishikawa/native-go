import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { grammarId, grammarName, speechText } = await request.json()

  const prompt = `あなたは英会話コーチです。学習者の英語スピーチを5観点で採点し、日本語のフィードバックコメントを作成してください。

## 採点観点（各5点満点）
1. 画像の描写度（画像の内容をどれだけ説明できているか）
2. 推奨文法の使用（「${grammarName}」を自然に使えているか）
3. 表現の豊かさ（多彩な語彙・表現を使えているか）
4. 流暢さ・話した量（十分な量を詰まらずに話せたか）
5. 全体の自然さ（ネイティブに伝わる英語か）

## コメントのフォーマット（厳守）
comment フィールドを以下の3セクション形式で記述してください。
各セクションは1〜2文、簡潔に。改行で区切る。

[GOOD]（使えていた自然な表現や良い点を具体的に。例："I can see that..." が自然でよかった）
[UPGRADE]（より良くなる代替表現を具体例で。例："looks like" より "seems to be" の方が自然）
[GRAMMAR]（「${grammarName}」の使い方への簡潔なフィードバック）

## トーンのルール
- 冷静・建設的・前向きなトーンで統一する
- 「ぜひ挑戦してください」「素晴らしい」などの過剰に熱い表現は使わない
- スピーチが空または極端に短い場合は[GOOD]に「声に出す練習を続けていきましょう」と書く

## 返答形式（他のテキストは不要）
{"scores":[4,3,4,3,5],"total":4,"comment":"[GOOD]...\n[UPGRADE]...\n[GRAMMAR]..."}

文法名：${grammarName}
スピーチ：${speechText || "(no speech detected)"}`

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 })
  }

  const raw = content.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim()
  let evaluation: { scores: number[]; total: number; comment: string }
  try {
    evaluation = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Failed to parse evaluation" }, { status: 500 })
  }

  // Save speaking log
  const { data: log, error: logError } = await supabase
    .from("speaking_logs")
    .insert({
      user_id: user.id,
      grammar_id: grammarId,
      speech_text: speechText ?? "",
      scores: evaluation.scores,
      total_score: evaluation.total,
      comment: evaluation.comment,
    })
    .select("id")
    .single()

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

  // Check done: 3+ speaking logs for this grammar → mark 習得済み
  const { count } = await supabase
    .from("speaking_logs")
    .select("id", { count: "exact", head: true })
    .eq("grammar_id", grammarId)
    .eq("user_id", user.id)

  if ((count ?? 0) >= 3) {
    await supabase.from("grammar").update({ play_count: 10 }).eq("id", grammarId)
  }

  // Update practice_logs speaking_count
  const today = new Date().toISOString().split("T")[0]
  const { data: existingLog } = await supabase
    .from("practice_logs")
    .select("grammar_done_count, expression_done_count, speaking_count")
    .eq("practiced_at", today)
    .maybeSingle()

  await supabase.from("practice_logs").upsert(
    {
      practiced_at: today,
      grammar_done_count: existingLog?.grammar_done_count ?? 0,
      expression_done_count: existingLog?.expression_done_count ?? 0,
      speaking_count: (existingLog?.speaking_count ?? 0) + 1,
    },
    { onConflict: "practiced_at" }
  )

  return NextResponse.json({
    logId: log.id,
    scores: evaluation.scores,
    total: evaluation.total,
    comment: evaluation.comment,
  })
}
