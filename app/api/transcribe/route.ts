import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;

  if (!audio) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1",
    language: "en",
  });

  return NextResponse.json({ text: transcription.text });
}
