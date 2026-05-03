import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { pickAnglesEN } from "@/lib/life-angles";

export const maxDuration = 120;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// JSONSchema for Anthropic tool_use. Keeps Vietnamese-only fields optional
// so EN extraction can also use the same tool without forcing them.
const WORD_NOTES_SCHEMA = {
  type: "array" as const,
  description:
    "Per-word Japanese gloss covering BOTH the main pattern/expression AND words used in the example dialogue (deduplicated).",
  items: {
    type: "object" as const,
    properties: {
      word: { type: "string" as const },
      note: { type: "string" as const },
    },
    required: ["word", "note"],
  },
};

const EXTRACT_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    grammar: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          category: {
            type: "string" as const,
            description:
              "Japanese category label (例: 文型, 代名詞, 否定, 疑問, 助詞). VI only; omit for EN.",
          },
          name: { type: "string" as const },
          summary: { type: "string" as const },
          detail: { type: ["string", "null"] as const },
          examples: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "A/B/A 3-turn dialogue lines, max 4.",
          },
          usage_scene: { type: "string" as const },
          frequency: {
            type: "integer" as const,
            minimum: 1,
            maximum: 5,
          },
          word_notes: WORD_NOTES_SCHEMA,
        },
        required: ["name", "summary", "examples", "usage_scene", "frequency"],
      },
    },
    expressions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          category: { type: "string" as const },
          expression: { type: "string" as const },
          meaning: { type: "string" as const },
          conversation: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "A/B/A 3-turn dialogue lines, max 4.",
          },
          usage_scene: { type: "string" as const },
          frequency: {
            type: "integer" as const,
            minimum: 1,
            maximum: 5,
          },
          word_notes: WORD_NOTES_SCHEMA,
          nuance: {
            type: ["string", "null"] as const,
            description:
              "1-2 Japanese sentences on how the phrase comes across (politeness/register). VI only.",
          },
        },
        required: [
          "category",
          "expression",
          "meaning",
          "conversation",
          "usage_scene",
          "frequency",
        ],
      },
    },
  },
  required: ["grammar", "expressions"],
};

const SYSTEM_PROMPT_EN = `You are an English learning assistant. Extract grammar points and expressions from Native Camp lesson materials.

User context: Takaki, 32-year-old Japanese male, lives alone in Ho Chi Minh City District 1-3 (Vietnam, 2-3 years), Product Manager at Sun Asterisk managing B2B recruitment platform and B2C education LMS, team of ~20 (engineers/QA/designers/BrSE). INTJ personality.

His life has many sides — examples should rotate across these, not stay in one corner:
- Body & routine: strength training (bulking 70kg→80kg, bench/pull-ups/squat/RDL), meditation, occasional massages for self-care, walks/strolls (often thinks while walking).
- Home & making things: home cooking and meal-prep with friends, very into ものづくり (making things by hand), sews his own clothes, believes "being able to make things yourself makes life richer" — applies to cooking, clothes, software.
- Animals & cafes: cats (wants a British Shorthair, visits CATFE/KIN NEKO), recently came to like dogs too, cafe hopping around District 1-3.
- Reading & media: Korean dramas on Netflix, started reading novels and essays (Haruki Murakami).
- Social & dating: values relationships with people more than before, goes on dates with women, regularly attends product/tech meetups in Ho Chi Minh.
- Money & values: realized the importance of saving / frugality, but also became interested in spending money intentionally (experiences), thinks asset-building is quite important.
- Work & career: PdM role has shifted toward more upstream/strategic work, enjoys building AI side projects as an individual developer, feels AI is changing how products get built, considers working in another country in the future.
- Living abroad & culture: lives abroad in Vietnam — notices cultural differences (food, work styles, social norms) vs Japan, appreciates Vietnamese street food / coffee / eating with coworkers, navigates the Vietnamese language as a foreigner, occasional culture shock and unexpected kindness from locals, lower cost of living enables a different lifestyle, thinks about identity and what "home" means after years abroad, compares Tokyo vs Ho Chi Minh life (pace/density/weather/people).
- Place & vehicle: Ho Chi Minh District 1-3, rides motorbike.
- Mind: philosophy / CBT / AI / product thinking.

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
- Personalize to Takaki's life by ROTATING across the angles above. Do NOT default to cafe / cats / gym every time — actively pull from cooking, sewing, ものづくり, walks, dogs, dating, reading novels, AI side projects, upstream PdM work, asset-building, HCMC meetups, living-abroad / Japan-vs-Vietnam culture, etc. Different items in the same response MUST use different angles.
- If the user message contains a PRIORITY_ANGLES block, treat those listed angles as the dominant context for THIS run. Distribute them across items so that no two items reuse the same angle. Other angles may appear as supporting detail only.
- Use Ho Chi Minh locations naturally (District 3, Nguyen Trai, Thao Dien, etc.) when geographically relevant — but don't force a location into every line.
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
      "category": "category in Japanese (例: 文型, 代名詞, 否定, 疑問, 助詞, 時制, 助動詞, 数詞 etc.)",
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
- Include words from BOTH sources, deduplicated:
  (a) the grammar "name" / expression "expression" itself, AND
  (b) the example dialogue lines you generate ("examples" for grammar, "conversation" for expressions).
- Do NOT include words that only appear in usage_scene, detail, nuance, or category.
- Multi-word fixed units (e.g. "cảm ơn", "phải không", "không phải là") stay as one entry.
- Each word appears at most ONCE. If a word shows up in both the pattern and the dialogue, list it only once (under its first occurrence).
- "note" is a SHORT Japanese gloss (1 phrase, ~20 chars).
- Order: pattern words first (left to right), then NEW words from the dialogue in line order (A → B → A).
- Typical count: 4-10 entries total. Lean toward INCLUDE for an A1 beginner — if Takaki might not know the word, add it.
- Skip pure placeholders ("S", "V", "O", "名詞", "動詞", "形容詞"), numbers, obvious cognates, and personal names.

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

  const { text, language, kind } = (await request.json()) as {
    text?: string;
    language?: "en" | "vi";
    kind?: "grammar" | "phrase";
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

    let kindDirective = "Classify each item into grammar or expressions";
    if (kind === "grammar") {
      kindDirective =
        "The user has indicated that EVERY item below is a GRAMMAR pattern. Put them all under \"grammar\" and leave \"expressions\" as an empty array. Do not reclassify any item as an expression.";
    } else if (kind === "phrase") {
      kindDirective =
        "The user has indicated that EVERY item below is a fixed PHRASE / EXPRESSION. Put them all under \"expressions\" and leave \"grammar\" as an empty array. Do not reclassify any item as grammar.";
    }

    userMessage = `EXISTING_ITEMS (drop near-duplicates):\n${existingHint}\n\nThe user pasted the following bullet list of items they want to learn. ${kindDirective} Produce word_notes (and nuance for expressions) per the system rules:\n\n${text}`;
  } else {
    const angles = pickAnglesEN(3);
    const angleBlock = angles.map((a) => `- ${a}`).join("\n");
    userMessage = `PRIORITY_ANGLES (use these as the dominant context for the conversation examples in THIS run; assign a different angle to each item — do not reuse the same angle across items):\n${angleBlock}\n\nExtract grammar points and expressions from this Native Camp lesson material:\n\n${text}`;
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    // VI は word_notes 配列＋nuance で出力が膨らむため EN の2倍に確保
    max_tokens: lang === "vi" ? 8192 : 4096,
    system: lang === "vi" ? SYSTEM_PROMPT_VI : SYSTEM_PROMPT_EN,
    tools: [
      {
        name: "save_extracted",
        description:
          "Save the extracted grammar items and expression items to the user's library.",
        input_schema: EXTRACT_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "save_extracted" },
    messages: [{ role: "user", content: userMessage }],
  });

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

  const toolUse = message.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    console.error("[extract] no tool_use block in response", {
      lang,
      stopReason: message.stop_reason,
      contentTypes: message.content.map((c) => c.type),
    });
    return NextResponse.json(
      { error: "Unexpected response shape" },
      { status: 500 },
    );
  }

  return NextResponse.json(toolUse.input);
}
