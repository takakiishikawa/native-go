"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function incrementGrammarPlayCount(id: string) {
  const supabase = await createClient();

  const { data: grammar } = await supabase
    .from("grammar")
    .select("play_count")
    .eq("id", id)
    .single();

  if (!grammar) return;

  await supabase
    .from("grammar")
    .update({
      play_count: grammar.play_count + 1,
      last_played_at: new Date().toISOString().split("T")[0],
    })
    .eq("id", id);

  await upsertGrammarPracticeLog();
  revalidatePath("/");
}

export async function incrementExpressionPlayCount(id: string) {
  const supabase = await createClient();

  const { data: expression } = await supabase
    .from("expressions")
    .select("play_count")
    .eq("id", id)
    .single();

  if (!expression) return;

  await supabase
    .from("expressions")
    .update({
      play_count: expression.play_count + 1,
      last_played_at: new Date().toISOString().split("T")[0],
    })
    .eq("id", id);

  await upsertExpressionPracticeLog();
  revalidatePath("/");
}

async function upsertGrammarPracticeLog() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("practice_logs")
    .select("grammar_done_count, expression_done_count")
    .eq("practiced_at", today)
    .maybeSingle();

  await supabase.from("practice_logs").upsert(
    {
      practiced_at: today,
      grammar_done_count: (existing?.grammar_done_count ?? 0) + 1,
      expression_done_count: existing?.expression_done_count ?? 0,
    },
    { onConflict: "practiced_at" },
  );
}

async function upsertExpressionPracticeLog() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("practice_logs")
    .select("grammar_done_count, expression_done_count")
    .eq("practiced_at", today)
    .maybeSingle();

  await supabase.from("practice_logs").upsert(
    {
      practiced_at: today,
      grammar_done_count: existing?.grammar_done_count ?? 0,
      expression_done_count: (existing?.expression_done_count ?? 0) + 1,
    },
    { onConflict: "practiced_at" },
  );
}

export async function saveGrammar(
  grammar: {
    name: string;
    summary: string;
    detail?: string | null;
    examples: string[];
    usage_scene: string;
    frequency: number;
  }[],
  lessonId?: string,
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();

  const rows = grammar.map((g) => ({
    name: g.name,
    summary: g.summary,
    detail: g.detail ?? null,
    examples: g.examples.join("\n"),
    usage_scene: g.usage_scene,
    frequency: g.frequency,
    play_count: 0,
    lesson_id: lessonId ?? null,
  }));

  const { data, error } = await supabase
    .from("grammar")
    .insert(rows)
    .select("id, name");
  if (error) throw error;
  revalidatePath("/grammar");
  revalidatePath("/list");
  revalidatePath("/texts");
  return data ?? [];
}

export async function saveExpressions(
  expressions: {
    category: string;
    expression: string;
    meaning: string;
    conversation: string[];
    usage_scene: string;
    frequency: number;
  }[],
  lessonId?: string,
) {
  const supabase = await createClient();

  const rows = expressions.map((e) => ({
    category: e.category,
    expression: e.expression,
    meaning: e.meaning,
    conversation: e.conversation.join("\n"),
    usage_scene: e.usage_scene,
    frequency: e.frequency,
    play_count: 0,
    lesson_id: lessonId ?? null,
  }));

  const { error } = await supabase.from("expressions").insert(rows);
  if (error) throw error;
  revalidatePath("/expressions");
  revalidatePath("/list");
  revalidatePath("/texts");
}

export async function upsertNativeCampLog(
  date: string,
  count: number,
): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { data: existing } = await supabase
    .from("native_camp_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("logged_at", date)
    .maybeSingle();

  let error;
  if (existing) {
    const result = await supabase
      .from("native_camp_logs")
      .update({ count })
      .eq("id", existing.id);
    error = result.error;
  } else {
    const result = await supabase
      .from("native_camp_logs")
      .insert({ user_id: user.id, logged_at: date, count });
    error = result.error;
  }

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/report");
  return null;
}

export async function saveSpeakingScore(date: string, score: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("speaking_scores")
    .insert({ user_id: user.id, score, tested_at: date })
    .select()
    .single();

  if (error) return null;
  revalidatePath("/");
  return data;
}

export async function deleteSpeakingScore(id: string) {
  const supabase = await createClient();
  await supabase.from("speaking_scores").delete().eq("id", id);
  revalidatePath("/");
}

export async function updateLessonStatus(
  id: string,
  status: "未登録" | "練習中" | "習得済み",
) {
  const supabase = await createClient();
  await supabase.from("lessons").update({ status }).eq("id", id);
  revalidatePath("/lessons");
  revalidatePath("/texts");
}
