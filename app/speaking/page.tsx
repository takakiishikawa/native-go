import { createClient } from "@/lib/supabase/server";
import { getCurrentLanguage } from "@/lib/language";
import { redirect } from "next/navigation";
import { PageHeader } from "@takaki/go-design-system";
import { GenerateImagesButton } from "./GenerateImagesButton";
import { SpeakingGrid } from "@/components/speaking-grid";

export const dynamic = "force-dynamic";

export default async function SpeakingPage() {
  const supabase = await createClient();
  const language = await getCurrentLanguage();
  if (language !== "en") redirect("/");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: grammars },
    { data: pendingGrammars },
    { data: speakingLogs },
  ] = await Promise.all([
    supabase
      .from("grammar")
      .select("id, image_url, lessons!lesson_id(lesson_no)")
      .eq("language", "en")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("grammar")
      .select("id, name")
      .eq("language", "en")
      .is("image_url", null)
      .order("created_at", { ascending: false }),
    user
      ? supabase
          .from("speaking_logs")
          .select("grammar_id")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  // grammar_id ごとのセッション数を集計
  const sessionCounts = new Map<string, number>();
  for (const log of speakingLogs ?? []) {
    sessionCounts.set(
      log.grammar_id,
      (sessionCounts.get(log.grammar_id) ?? 0) + 1,
    );
  }

  const items = grammars ?? [];
  const pending = pendingGrammars ?? [];
  const sessionCountsObj: Record<string, number> =
    Object.fromEntries(sessionCounts);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="スピーキング"
        description="画像を見て英語で描写する練習"
      />

      {pending.length > 0 && (
        <div className="rounded-lg border border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/10 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-[color:var(--color-warning)]">
            {pending.length}件の問題の画像がまだ生成されていません
          </p>
          <GenerateImagesButton items={pending} />
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <p className="text-lg">練習できる問題がありません</p>
          <p className="text-sm">テキストを追加すると画像が自動生成されます</p>
        </div>
      ) : (
        <SpeakingGrid items={items} sessionCounts={sessionCountsObj} />
      )}
    </div>
  );
}
