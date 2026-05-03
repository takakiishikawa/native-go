import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RegenExamplesClient } from "@/components/regen-examples-client";

const TARGET_LEVELS = [4, 5, 6];

function startOfTodayHCMC(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = fmt.format(new Date()); // YYYY-MM-DD
  return new Date(`${dateStr}T00:00:00+07:00`).toISOString();
}

export default async function RegenExamplesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const since = startOfTodayHCMC();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, level, lesson_no, topic, language")
    .in("level", TARGET_LEVELS)
    .eq("language", "en");

  const lessonMap = new Map(
    (lessons ?? []).map((l) => [
      l.id as string,
      { level: l.level as number, lesson_no: l.lesson_no as string, topic: l.topic as string },
    ]),
  );
  const lessonIds = [...lessonMap.keys()];

  if (lessonIds.length === 0) {
    return (
      <RegenExamplesClient since={since} grammar={[]} expressions={[]} />
    );
  }

  const [{ data: grammarRows }, { data: expressionRows }] = await Promise.all([
    supabase
      .from("grammar")
      .select("id, name, summary, usage_scene, examples, lesson_id, created_at")
      .eq("language", "en")
      .in("lesson_id", lessonIds)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("expressions")
      .select(
        "id, expression, meaning, usage_scene, conversation, lesson_id, created_at",
      )
      .eq("language", "en")
      .in("lesson_id", lessonIds)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  const grammar = (grammarRows ?? []).map((g) => ({
    id: g.id as string,
    name: g.name as string,
    summary: g.summary as string,
    usage_scene: g.usage_scene as string,
    examples: g.examples as string,
    lesson: lessonMap.get((g.lesson_id ?? "") as string) ?? null,
  }));
  const expressions = (expressionRows ?? []).map((e) => ({
    id: e.id as string,
    expression: e.expression as string,
    meaning: e.meaning as string,
    usage_scene: e.usage_scene as string,
    conversation: e.conversation as string,
    lesson: lessonMap.get((e.lesson_id ?? "") as string) ?? null,
  }));

  return (
    <RegenExamplesClient
      since={since}
      grammar={grammar}
      expressions={expressions}
    />
  );
}
