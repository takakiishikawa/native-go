import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PracticeClient } from "./practice-client";

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

  const [{ data: grammar }, { data: logs }] = await Promise.all([
    supabase
      .from("grammar")
      .select("id, name, summary, image_url")
      .eq("id", id)
      .single(),
    supabase
      .from("speaking_logs")
      .select("scores, total_score, comment, created_at")
      .eq("grammar_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  if (!grammar || !grammar.image_url) redirect("/speaking");

  const pastLogs: PastLog[] = logs ?? [];

  return (
    <PracticeClient
      grammarId={grammar.id}
      grammarName={grammar.name}
      grammarSummary={grammar.summary}
      imageUrl={grammar.image_url}
      completedCount={pastLogs.length}
      pastLogs={pastLogs}
    />
  );
}
