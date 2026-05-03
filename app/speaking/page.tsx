import { createClient } from "@/lib/supabase/server";
import { getCurrentLanguage } from "@/lib/language";
import { redirect } from "next/navigation";
import { PageHeader } from "@takaki/go-design-system";
import { GenerateScenesButton } from "./GenerateScenesButton";
import { SpeakingGrid } from "@/components/speaking-grid";

export const dynamic = "force-dynamic";

export default async function SpeakingPage() {
  const supabase = await createClient();
  const language = await getCurrentLanguage();
  if (language !== "en") redirect("/");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: scenes }, { data: speakingLogs }] = await Promise.all([
    supabase
      .from("speaking_scenes")
      .select("id, image_url")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false }),
    user
      ? supabase.from("speaking_logs").select("scene_id").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const sessionCounts = new Map<string, number>();
  for (const log of speakingLogs ?? []) {
    if (!log.scene_id) continue;
    sessionCounts.set(
      log.scene_id,
      (sessionCounts.get(log.scene_id) ?? 0) + 1,
    );
  }

  const items = scenes ?? [];
  const sessionCountsObj: Record<string, number> =
    Object.fromEntries(sessionCounts);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <PageHeader
          title="スピーキング"
          description="画像を見て英語で描写する練習"
        />
        <GenerateScenesButton />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <p className="text-lg">練習できるシーンがありません</p>
          <p className="text-sm">右上のボタンからシーンを生成してください</p>
        </div>
      ) : (
        <SpeakingGrid items={items} sessionCounts={sessionCountsObj} />
      )}
    </div>
  );
}
