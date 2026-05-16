"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EfSetScoreInput = {
  tested_at: string;
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
  cefr_level: string;
};

export async function saveEfSetScore(
  input: EfSetScoreInput,
): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { error } = await supabase.from("ef_set_scores").insert({
    user_id: user.id,
    tested_at: input.tested_at,
    reading: input.reading,
    listening: input.listening,
    writing: input.writing,
    speaking: input.speaking,
    cefr_level: input.cefr_level,
  });

  if (error) return { error: error.message };
  revalidatePath("/report");
  return null;
}

export async function deleteEfSetScore(id: string) {
  const supabase = await createClient();
  await supabase.from("ef_set_scores").delete().eq("id", id);
  revalidatePath("/report");
}
