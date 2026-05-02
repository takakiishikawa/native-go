import { createClient } from "@/lib/supabase/server";
import { getCurrentLanguage } from "@/lib/language";
import { PageHeader } from "@takaki/go-design-system";
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
      <PageHeader
        title="文法一覧"
        actions={
          <span className="text-2xl font-semibold">
            {items.length}
            <span className="text-base font-normal text-muted-foreground ml-1">
              件
            </span>
          </span>
        }
      />
      <GrammarClient items={items} />
    </div>
  );
}
