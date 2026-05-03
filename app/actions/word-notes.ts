"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { WordNote } from "@/lib/types";
import { revalidatePath } from "next/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WORD_NOTES_TOOL_INPUT = {
  type: "object" as const,
  properties: {
    word_notes: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          word: { type: "string" as const },
          note: { type: "string" as const },
        },
        required: ["word", "note"],
      },
    },
  },
  required: ["word_notes"],
};

const SYSTEM_PROMPT = `You are a Vietnamese (CEFR A1) tutor for Takaki, 32, Japanese, living in Ho Chi Minh City.
Your only job here is to (re)generate "word_notes" — a Japanese gloss list — for ONE existing learning item.

word_notes rules (重要):
- Include words from BOTH sources, deduplicated:
  (a) the main pattern / expression itself, AND
  (b) the example dialogue lines (examples / conversation).
- Do NOT include words that only appear in usage_scene, detail, nuance, or category.
- Multi-word fixed units (e.g. "cảm ơn", "phải không", "không phải là") stay as one entry.
- Each word appears at most ONCE. If a word shows up in both pattern and dialogue, list it only once (under its first occurrence).
- "note" is a SHORT Japanese gloss (1 phrase, ~20 chars).
- Order: pattern words first (left to right), then NEW words from the dialogue in line order (A → B → A).
- Typical count: 4-10 entries total. Lean toward INCLUDE for an A1 beginner — if Takaki might not know the word, add it.
- Skip pure placeholders ("S", "V", "O", "名詞", "動詞", "形容詞"), numbers, obvious cognates, and personal names.

Respond ONLY by calling the save_word_notes tool.`;

export type RegenerateBatchResult = {
  processed: number;
  failed: number;
  remaining: number;
};

const BATCH_SIZE = 10;
const MIN_NOTES = 4;

type Row = {
  id: string;
  pattern: string;
  dialogue: string;
  word_notes: WordNote[] | null;
};

async function generateOne(
  patternLabel: "grammar pattern" | "expression",
  pattern: string,
  dialogue: string,
): Promise<WordNote[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "save_word_notes",
        description: "Save the word_notes array for this item.",
        input_schema: WORD_NOTES_TOOL_INPUT,
      },
    ],
    tool_choice: { type: "tool", name: "save_word_notes" },
    messages: [
      {
        role: "user",
        content: `${patternLabel}: ${pattern}\n\ndialogue:\n${dialogue}\n\nGenerate word_notes per the rules.`,
      },
    ],
  });
  const toolUse = message.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("AI did not return tool_use");
  }
  const input = toolUse.input as { word_notes?: WordNote[] };
  if (!Array.isArray(input.word_notes)) {
    throw new Error("AI returned invalid word_notes");
  }
  return input.word_notes;
}

export async function regenerateWordNotesBatch(
  kind: "grammar" | "expression",
): Promise<RegenerateBatchResult | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const table = kind === "grammar" ? "grammar" : "expressions";
  const patternCol = kind === "grammar" ? "name" : "expression";
  const dialogueCol = kind === "grammar" ? "examples" : "conversation";
  const patternLabel = kind === "grammar" ? "grammar pattern" : "expression";

  const { data, error } = await supabase
    .from(table)
    .select(`id, ${patternCol}, ${dialogueCol}, word_notes`)
    .eq("language", "vi")
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return { error: error.message };

  type Raw = {
    id: string;
    word_notes: WordNote[] | null;
    [k: string]: unknown;
  };
  const all = ((data ?? []) as Raw[]).map((r): Row => ({
    id: r.id,
    pattern: (r[patternCol] as string) ?? "",
    dialogue: (r[dialogueCol] as string) ?? "",
    word_notes: r.word_notes,
  }));
  const backlog = all.filter(
    (r) => !r.word_notes || r.word_notes.length < MIN_NOTES,
  );
  const target = backlog.slice(0, BATCH_SIZE);

  if (target.length === 0) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  const results = await Promise.allSettled(
    target.map(async (row) => {
      const notes = await generateOne(patternLabel, row.pattern, row.dialogue);
      const { error: updateErr } = await supabase
        .from(table)
        .update({ word_notes: notes })
        .eq("id", row.id);
      if (updateErr) throw new Error(updateErr.message);
    }),
  );

  const processed = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - processed;
  const remaining = backlog.length - processed;

  if (processed > 0) {
    revalidatePath(kind === "grammar" ? "/grammar" : "/expressions");
    revalidatePath("/list");
  }

  return { processed, failed, remaining };
}

export async function getWordNotesBacklog(
  kind: "grammar" | "expression",
): Promise<number> {
  const supabase = await createClient();
  const table = kind === "grammar" ? "grammar" : "expressions";
  const { data, error } = await supabase
    .from(table)
    .select("word_notes")
    .eq("language", "vi")
    .limit(500);
  if (error || !data) return 0;
  return (data as { word_notes: WordNote[] | null }[]).filter(
    (r) => !r.word_notes || r.word_notes.length < MIN_NOTES,
  ).length;
}
