import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 120;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT_EN = `You are an English learning assistant. Extract grammar points and expressions from Native Camp lesson materials.

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

const SYSTEM_PROMPT_VI = `You are a Vietnamese language tutor for an absolute beginner (CEFR A1).

User context: Takaki, 32, Japanese male, lives in Ho Chi Minh City. He is starting Vietnamese from scratch and only wants:
- greetings + small talk with Vietnamese coworkers and friends ("how are you", "how was work", "let's grab lunch")
- ability to read shop signs / SNS captions / basic news headlines a little
- ~15 min/day, easy and simple

He already knows the dashboard (Tieng Viet) is filtered out for him. Take CEFR A1 only.

INPUT FORMAT: the user pastes a casual bullet list of grammar patterns and/or fixed phrases they want to learn (one item per line, often prefixed with "-" / "・" / numbers). Items may be Vietnamese, Japanese, or mixed. Each line is ONE thing the user wants — do not invent extra items, but split a line if it clearly contains multiple distinct items.

Your job: for every input item, classify it as either:
- "grammar" — a structural rule, particle, or sentence pattern (e.g. "Subject + là + Noun", "có ... không?")
- "expressions" — a fixed phrase / set expression / greeting / common reply (e.g. "Cảm ơn", "Bạn khỏe không?")

EXISTING_ITEMS hints (already in DB) may be provided. If a candidate is essentially the same as one of those, DROP it.

Return a JSON object with exactly this structure:
{
  "grammar": [
    {
      "name": "grammar pattern (Vietnamese)",
      "summary": "1-line Japanese explanation",
      "detail": "Japanese explanation with 1-2 examples (or null)",
      "examples": ["A: ...", "B: ...", "A: ..."],
      "usage_scene": "when to use it (Japanese)",
      "frequency": 3,
      "word_notes": [
        { "word": "là", "note": "～です（コピュラ）" },
        { "word": "không", "note": "否定／文末で疑問" }
      ]
    }
  ],
  "expressions": [
    {
      "category": "category in Japanese (例: 挨拶, 自己紹介, 食事, 買い物, 仕事, 雑談 etc.)",
      "expression": "the expression in Vietnamese",
      "meaning": "Japanese meaning",
      "conversation": ["A: ...", "B: ...", "A: ..."],
      "usage_scene": "when to use (Japanese)",
      "frequency": 3,
      "word_notes": [
        { "word": "cảm ơn", "note": "ありがとう（基本形）" },
        { "word": "bạn", "note": "あなた／友達（同年代）" }
      ],
      "nuance": "丁寧で柔らかい印象。年上には 'cảm ơn anh/chị' を使うとより自然。"
    }
  ]
}

word_notes rules (重要):
- Required for both grammar and expressions. Cover EVERY non-trivial word that appears in "name" / "expression" / "examples" / "conversation". Skip only obvious cognates / numbers.
- "word" is the Vietnamese word as it appears (lowercased, with diacritics). For multi-word units that act as one (e.g. "cảm ơn"), keep them together.
- "note" is a SHORT Japanese gloss (1 phrase, ~20 chars). If the word changes nuance by tone/context, briefly mention it.
- Order: follow the order the words appear in the main pattern / phrase.

nuance rules (expressions only):
- 1-2 sentences in Japanese describing how this phrase comes across to the listener (politeness level, age/relationship register, warmth, formality, common alternatives).
- Always include for expressions. Omit (null) only if there is genuinely no register concern.

General rules:
- A1 ONLY: greetings, basic verbs (be / have / want / go / eat), pronouns (tôi / bạn / anh / chị / em), numbers, food, time. If an input item is above A1, still classify it but mark frequency=1; do not silently drop user-requested items unless they duplicate EXISTING_ITEMS.
- Both "examples" (grammar) and "conversation" (expressions) MUST be A/B/A 3-turn format, maximum 4 lines, all lines start with "A: " or "B: ".
- Personalize lightly to Takaki's life (coworkers, bạn (friend), cafe, motorbike, District 1-3) but stay simple.
- frequency = 5 for must-know greetings, 3 for common, 1 for rare.
- detail can be null if summary is sufficient.
- Return ONLY valid JSON, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, language } = (await request.json()) as {
    text?: string;
    language?: "en" | "vi";
  };
  if (!text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const lang: "en" | "vi" = language === "vi" ? "vi" : "en";

  let userMessage: string;
  if (lang === "vi") {
    // VI: pull a hint of existing items so the model can dedupe near-duplicates.
    const [{ data: gExisting }, { data: eExisting }] = await Promise.all([
      supabase
        .from("grammar")
        .select("name")
        .eq("language", "vi")
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("expressions")
        .select("expression")
        .eq("language", "vi")
        .order("created_at", { ascending: false })
        .limit(120),
    ]);
    const existingHint = JSON.stringify({
      grammar: (gExisting ?? []).map((r) => r.name),
      expressions: (eExisting ?? []).map((r) => r.expression),
    });
    userMessage = `EXISTING_ITEMS (drop near-duplicates):\n${existingHint}\n\nThe user pasted the following bullet list of grammar / phrases they want to learn. Classify each item into grammar or expressions and produce word_notes (and nuance for expressions) per the system rules:\n\n${text}`;
  } else {
    userMessage = `Extract grammar points and expressions from this Native Camp lesson material:\n\n${text}`;
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    // VI は word_notes 配列＋nuance で出力が膨らむため EN の2倍に確保
    max_tokens: lang === "vi" ? 8192 : 4096,
    system: lang === "vi" ? SYSTEM_PROMPT_VI : SYSTEM_PROMPT_EN,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  if (message.stop_reason === "max_tokens") {
    console.error("[extract] hit max_tokens, output truncated", {
      lang,
      usage: message.usage,
    });
    return NextResponse.json(
      { error: "Output truncated; try fewer items at once" },
      { status: 500 },
    );
  }

  const rawText = content.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let result;
  try {
    result = JSON.parse(rawText);
  } catch (err) {
    console.error("[extract] JSON parse failed", {
      lang,
      err: err instanceof Error ? err.message : String(err),
      preview: rawText.slice(0, 400),
      stopReason: message.stop_reason,
      usage: message.usage,
    });
    return NextResponse.json(
      { error: "Failed to parse response" },
      { status: 500 },
    );
  }
  return NextResponse.json(result);
}
