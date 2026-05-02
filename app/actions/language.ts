"use server";

import { createClient } from "@/lib/supabase/server";
import type { Language } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function setCurrentLanguage(language: Language) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { data: existing } = await supabase
    .from("user_settings")
    .select("id")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("user_settings")
      .update({ current_language: language })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("user_settings")
      .insert({ user_id: user.id, current_language: language });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
