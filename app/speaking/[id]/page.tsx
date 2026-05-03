import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PracticeClient } from "./practice-client";

export const dynamic = "force-dynamic";

export type PastLog = {
  scores: number[];
  total_score: number;
  comment: string;
  created_at: string;
};

export default async function SpeakingPracticePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/speaking");

  const [{ data: scene }, { data: logs }, { count }] = await Promise.all([
    supabase
      .from("speaking_scenes")
      .select("id, image_url")
      .eq("id", id)
      .single(),
    supabase
      .from("speaking_logs")
      .select("scores, total_score, comment, created_at")
      .eq("scene_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("speaking_logs")
      .select("id", { count: "exact", head: true })
      .eq("scene_id", id)
      .eq("user_id", user.id),
  ]);

  if (!scene || !scene.image_url) redirect("/speaking");

  const pastLogs: PastLog[] = logs ?? [];

  return (
    <PracticeClient
      sceneId={scene.id}
      imageUrl={scene.image_url}
      completedCount={count ?? pastLogs.length}
      pastLogs={pastLogs}
    />
  );
}
