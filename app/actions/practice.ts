"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentLanguage } from "@/lib/language";
import type { Language, WordNote } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function incrementGrammarPlayCount(id: string) {
  const supabase = await createClient();

  const { data: grammar } = await supabase
    .from("grammar")
    .select("play_count, lesson_id, language")
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

  await upsertPracticeLog((grammar.language as Language) ?? "en", "grammar");
  await syncLessonStatus(grammar.lesson_id);
  revalidatePath("/");
  revalidatePath("/texts");
  revalidatePath("/lessons");
}

export async function incrementExpressionPlayCount(id: string) {
  const supabase = await createClient();

  const { data: expression } = await supabase
    .from("expressions")
    .select("play_count, lesson_id, language")
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

  await upsertPracticeLog(
    (expression.language as Language) ?? "en",
    "expression",
  );
  await syncLessonStatus(expression.lesson_id);
  revalidatePath("/");
  revalidatePath("/texts");
  revalidatePath("/lessons");
}

export async function incrementWordPlayCount(id: string) {
  const supabase = await createClient();

  const { data: word } = await supabase
    .from("words")
    .select("play_count, lesson_id, language")
    .eq("id", id)
    .single();

  if (!word) return;

  await supabase
    .from("words")
    .update({
      play_count: word.play_count + 1,
      last_played_at: new Date().toISOString().split("T")[0],
    })
    .eq("id", id);

  await upsertPracticeLog((word.language as Language) ?? "en", "word");
  await syncLessonStatus(word.lesson_id);
  revalidatePath("/");
  revalidatePath("/texts");
  revalidatePath("/lessons");
}

async function syncLessonStatus(lessonId: string | null) {
  if (!lessonId) return;
  const supabase = await createClient();

  const [{ data: grammars }, { data: expressions }, { data: words }] =
    await Promise.all([
      supabase.from("grammar").select("play_count").eq("lesson_id", lessonId),
      supabase
        .from("expressions")
        .select("play_count")
        .eq("lesson_id", lessonId),
      supabase.from("words").select("play_count").eq("lesson_id", lessonId),
    ]);

  const total =
    (grammars?.length ?? 0) + (expressions?.length ?? 0) + (words?.length ?? 0);
  if (total === 0) return;

  const allDone =
    (grammars ?? []).every((g) => g.play_count >= 10) &&
    (expressions ?? []).every((e) => e.play_count >= 10) &&
    (words ?? []).every((w) => w.play_count >= 10);

  await supabase
    .from("lessons")
    .update({ status: allDone ? "習得済み" : "練習中" })
    .eq("id", lessonId);
}

async function upsertPracticeLog(
  language: Language,
  kind: "grammar" | "expression" | "word",
) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("practice_logs")
    .select("grammar_done_count, expression_done_count, word_done_count")
    .eq("practiced_at", today)
    .eq("language", language)
    .maybeSingle();

  await supabase.from("practice_logs").upsert(
    {
      practiced_at: today,
      language,
      grammar_done_count:
        (existing?.grammar_done_count ?? 0) + (kind === "grammar" ? 1 : 0),
      expression_done_count:
        (existing?.expression_done_count ?? 0) +
        (kind === "expression" ? 1 : 0),
      word_done_count:
        (existing?.word_done_count ?? 0) + (kind === "word" ? 1 : 0),
    },
    { onConflict: "practiced_at,language" },
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
    word_notes?: WordNote[] | null;
    category?: string | null;
    is_priority?: boolean;
    source_title?: string | null;
  }[],
  lessonId?: string,
): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const language = await getCurrentLanguage();

  const rows = grammar.map((g) => ({
    name: g.name,
    summary: g.summary,
    detail: g.detail ?? null,
    examples: g.examples.join("\n"),
    usage_scene: g.usage_scene,
    frequency: g.frequency,
    play_count: 0,
    lesson_id: lessonId ?? null,
    language,
    word_notes: g.word_notes ?? null,
    category: g.category ?? null,
    is_priority: g.is_priority ?? false,
    source_title: g.source_title ?? null,
  }));

  const { data, error } = await supabase
    .from("grammar")
    .insert(rows)
    .select("id, name");
  if (error) throw error;
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
    word_notes?: WordNote[] | null;
    nuance?: string | null;
    is_priority?: boolean;
    source_title?: string | null;
  }[],
  lessonId?: string,
) {
  const supabase = await createClient();
  const language = await getCurrentLanguage();

  const rows = expressions.map((e) => ({
    category: e.category,
    expression: e.expression,
    meaning: e.meaning,
    conversation: e.conversation.join("\n"),
    usage_scene: e.usage_scene,
    frequency: e.frequency,
    play_count: 0,
    lesson_id: lessonId ?? null,
    language,
    word_notes: e.word_notes ?? null,
    nuance: e.nuance ?? null,
    is_priority: e.is_priority ?? false,
    source_title: e.source_title ?? null,
  }));

  const { error } = await supabase.from("expressions").insert(rows);
  if (error) throw error;
  revalidatePath("/list");
  revalidatePath("/texts");
}

export async function saveWords(
  words: {
    word: string;
    meaning: string;
    example?: string | null;
    usage_scene?: string | null;
    frequency: number;
    word_notes?: WordNote[] | null;
    is_priority?: boolean;
    source_title?: string | null;
  }[],
  lessonId?: string,
): Promise<{ inserted: number; skipped: number }> {
  const supabase = await createClient();
  const language = await getCurrentLanguage();

  // 既存単語を取得して重複（大文字小文字無視）を除外
  const { data: existing } = await supabase
    .from("words")
    .select("word")
    .eq("language", language);
  const existingSet = new Set(
    (existing ?? []).map((e) => (e.word as string).toLowerCase()),
  );

  const filtered = words.filter((w) => !existingSet.has(w.word.toLowerCase()));
  const skipped = words.length - filtered.length;
  if (filtered.length === 0) {
    return { inserted: 0, skipped };
  }

  const rows = filtered.map((w) => ({
    word: w.word,
    meaning: w.meaning,
    example: w.example ?? null,
    usage_scene: w.usage_scene ?? null,
    frequency: w.frequency,
    play_count: 0,
    lesson_id: lessonId ?? null,
    language,
    word_notes: w.word_notes ?? null,
    is_priority: w.is_priority ?? false,
    source_title: w.source_title ?? null,
  }));

  const { error } = await supabase.from("words").insert(rows);
  if (error) throw error;
  revalidatePath("/list");
  return { inserted: filtered.length, skipped };
}

export async function deleteWord(id: string) {
  const supabase = await createClient();
  const { data: word } = await supabase
    .from("words")
    .select("lesson_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("words").delete().eq("id", id);
  if (error) throw error;
  await syncLessonStatus(word?.lesson_id ?? null);
  revalidatePath("/list");
}

export async function toggleGrammarPriority(id: string, next: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("grammar")
    .update({ is_priority: next })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/list");
}

export async function toggleExpressionPriority(id: string, next: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expressions")
    .update({ is_priority: next })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/list");
}

export async function toggleWordPriority(id: string, next: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("words")
    .update({ is_priority: next })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/list");
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

export async function deleteGrammar(id: string) {
  const supabase = await createClient();
  const { data: grammar } = await supabase
    .from("grammar")
    .select("lesson_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("grammar").delete().eq("id", id);
  if (error) throw error;
  await syncLessonStatus(grammar?.lesson_id ?? null);
  revalidatePath("/list");
  revalidatePath("/texts");
}

export async function deleteExpression(id: string) {
  const supabase = await createClient();
  const { data: expression } = await supabase
    .from("expressions")
    .select("lesson_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("expressions").delete().eq("id", id);
  if (error) throw error;
  await syncLessonStatus(expression?.lesson_id ?? null);
  revalidatePath("/list");
  revalidatePath("/texts");
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

export async function saveLessons(
  level: number,
  items: { lesson_no: string; topic: string }[],
): Promise<{ inserted: number; skipped: number }> {
  const supabase = await createClient();
  const language = await getCurrentLanguage();

  const { data: existing } = await supabase
    .from("lessons")
    .select("lesson_no")
    .eq("level", level)
    .eq("language", language);

  const existingNos = new Set((existing ?? []).map((l) => l.lesson_no));
  const newRows = items
    .filter((i) => i.lesson_no && i.topic && !existingNos.has(i.lesson_no))
    .map((i) => ({
      level,
      lesson_no: i.lesson_no,
      topic: i.topic,
      status: "未登録" as const,
      language,
    }));

  if (newRows.length > 0) {
    const { error } = await supabase.from("lessons").insert(newRows);
    if (error) throw error;
  }

  revalidatePath("/texts");
  revalidatePath("/lessons");
  return { inserted: newRows.length, skipped: items.length - newRows.length };
}
