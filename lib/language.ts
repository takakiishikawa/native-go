import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/types";

/**
 * Server-only helper. Reads `user_settings.current_language` for the current user.
 * Falls back to 'en' when no row exists or the column is null.
 */
export async function getCurrentLanguage(): Promise<Language> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("current_language")
    .maybeSingle();
  return (data?.current_language as Language | null) ?? DEFAULT_LANGUAGE;
}
