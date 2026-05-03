import { createClient } from "@/lib/supabase/server";
import { getCurrentLanguage } from "@/lib/language";
import { GrammarClient } from "./grammar-client";

export default async function GrammarPage() {
  const supabase = await createClient();
  const language = await getCurrentLanguage();
  const { data } = await supabase
    .from("grammar")
    .select("*")
    .eq("language", language)
    .order("created_at", { ascending: false });

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <GrammarClient items={items} language={language} />
    </div>
  );
}
