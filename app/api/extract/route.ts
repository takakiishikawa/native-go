import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an English learning assistant. Extract grammar points and expressions from Native Camp lesson materials.

User context: Takaki, 32-year-old Japanese male, lives alone in Ho Chi Minh City District 1-3 (Vietnam, 2-3 years), Product Manager at Sun Asterisk managing B2B recruitment platform and B2C education LMS, team of ~20 (engineers/QA/designers/BrSE). Daily life: strength training (bulking phase, 70kg→80kg goal, bench/pull-ups/squat/RDL), meditation, watching Korean dramas on Netflix, interested in cats (wants British Shorthair), visits cat cafes (CATFE/KIN NEKO), cafe hopping in District 1-3, rides motorbike, interested in philosophy/CBT/AI/product thinking. INTJ personality.

Return a JSON object with exactly this structure:
{
  "grammar": [
    {
      "name": "grammar name",
      "summary": "brief Japanese explanation",
      "detail": "detailed explanation if needed (or null)",
      "examples": ["A: ...", "B: ...", "A: ..."],
      "usage_scene": "when to use this grammar",
      "frequency": 3
    }
  ],
  "expressions": [
    {
      "category": "category (e.g., 相槌・反応, 提案, 謝罪, etc.)",
      "expression": "the expression",
      "meaning": "Japanese meaning",
      "conversation": ["A: ...", "B: ...", "A: ..."],
      "usage_scene": "when to use this expression",
      "frequency": 3
    }
  ]
}

Rules:
- grammar: extract only the grammar themes actually covered in the lesson material — typically 1 to 3 items. Do NOT pad to a fixed count.
- frequency is 1-5 stars based on how commonly useful this is for Takaki
- Both "examples" (grammar) and "conversation" (expressions) MUST be A/B/A 3-turn format, maximum 4 lines
- All lines MUST start with exactly "A: " or "B: " prefixes
- Personalize to Takaki's life: cafe/cats/gym/Ho Chi Minh life/Korean drama/meditation/food/friends (70%) and PM work (30%)
- Use Ho Chi Minh locations naturally (District 3, Nguyen Trai, Thao Dien, etc.)
- Natural conversational tone (not too formal, not too casual)
- detail can be null if summary is sufficient
- Return ONLY valid JSON, no markdown, no explanation`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text } = await request.json();
  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extract grammar points and expressions from this Native Camp lesson material:\n\n${text}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  // Strip markdown code blocks if present
  const rawText = content.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse response" },
      { status: 500 },
    );
  }
  return NextResponse.json(result);
}
