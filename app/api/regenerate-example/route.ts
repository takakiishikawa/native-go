import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { pickAnglesEN } from "@/lib/life-angles";

export const maxDuration = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const REGEN_SCHEMA = {
  type: "object" as const,
  properties: {
    lines: {
      type: "array" as const,
      description:
        "A/B/A 3-turn dialogue lines. Maximum 4 lines. Each line MUST start with 'A: ' or 'B: '.",
      items: { type: "string" as const },
      minItems: 3,
      maxItems: 4,
    },
  },
  required: ["lines"],
};

const SYSTEM_PROMPT = `You regenerate a single A/B/A 3-turn English dialogue (max 4 lines) for one grammar pattern or fixed expression.

User context: Takaki, 32-year-old Japanese male, Product Manager at Sun Asterisk, lives alone in Ho Chi Minh City District 1-3 (Vietnam, 2-3 years), INTJ.

His life has many sides. The user message will give you:
- the grammar pattern or expression to illustrate,
- a short Japanese summary / usage_scene,
- a PRIORITY_ANGLE: ONE personal angle to ground this dialogue in.

Rules:
- Output EXACTLY a 3- or 4-line A/B/A dialogue. Every line MUST start with "A: " or "B: ".
- The dialogue MUST clearly demonstrate the target grammar pattern or expression.
- The dialogue's setting / topic MUST come from the PRIORITY_ANGLE. Don't fall back to cafe / cats / gym unless the PRIORITY_ANGLE says so.
- Use Ho Chi Minh locations naturally (District 3, Nguyen Trai, Thao Dien, etc.) only when the angle is geographic. Don't force them.
- Natural conversational tone — not too formal, not too casual.
- Do NOT explain the grammar. Output only the dialogue lines via the tool call.`;

type Body = {
  id?: string;
  kind?: "grammar" | "expression";
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, kind } = (await request.json()) as Body;
  if (!id || (kind !== "grammar" && kind !== "expression")) {
    return NextResponse.json(
      { error: "id and kind are required" },
      { status: 400 },
    );
  }

  let target: string;
  if (kind === "grammar") {
    const { data: row } = await supabase
      .from("grammar")
      .select("id, name, summary, usage_scene, language")
      .eq("id", id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.language !== "en") {
      return NextResponse.json(
        { error: "Only EN items are supported" },
        { status: 400 },
      );
    }
    target = `Grammar pattern: ${row.name}\nSummary (JP): ${row.summary}\nUsage scene (JP): ${row.usage_scene}`;
  } else {
    const { data: row } = await supabase
      .from("expressions")
      .select("id, expression, meaning, usage_scene, language")
      .eq("id", id)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.language !== "en") {
      return NextResponse.json(
        { error: "Only EN items are supported" },
        { status: 400 },
      );
    }
    target = `Expression: ${row.expression}\nMeaning (JP): ${row.meaning}\nUsage scene (JP): ${row.usage_scene}`;
  }

  const angle = pickAnglesEN(1)[0];

  const userMessage = `PRIORITY_ANGLE: ${angle}\n\n${target}\n\nGenerate a fresh A/B/A 3-turn dialogue (max 4 lines) that demonstrates this and is grounded in the PRIORITY_ANGLE.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "save_dialogue",
        description: "Save the regenerated A/B/A dialogue lines.",
        input_schema: REGEN_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_dialogue" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolUse = message.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json(
      { error: "Unexpected model response" },
      { status: 500 },
    );
  }

  const { lines } = toolUse.input as { lines: string[] };
  if (!Array.isArray(lines) || lines.length < 2) {
    return NextResponse.json(
      { error: "Invalid dialogue output" },
      { status: 500 },
    );
  }

  const joined = lines.join("\n");
  const updateError =
    kind === "grammar"
      ? (await supabase.from("grammar").update({ examples: joined }).eq("id", id))
          .error
      : (await supabase
          .from("expressions")
          .update({ conversation: joined })
          .eq("id", id)).error;

  if (updateError) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ id, kind, lines, angle });
}
