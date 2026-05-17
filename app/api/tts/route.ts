import { NextRequest, NextResponse } from "next/server";

const VOICE_BY_LANGUAGE = {
  en: { languageCode: "en-US", name: "en-US-Neural2-F" },
  vi: { languageCode: "vi-VN", name: "vi-VN-Wavenet-C" },
} as const;

export async function POST(req: NextRequest) {
  const {
    text,
    rate = 1.0,
    language,
  } = (await req.json()) as {
    text: string;
    rate?: number;
    language?: "en" | "vi";
  };
  const apiKey = process.env.GOOGLE_TTS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_TTS_API_KEY not configured" },
      { status: 500 },
    );
  }

  const voice =
    language === "vi" ? VOICE_BY_LANGUAGE.vi : VOICE_BY_LANGUAGE.en;

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice,
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: Math.min(Math.max(Number(rate), 0.25), 4.0),
        },
      }),
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Google TTS error:", errorText);
    return NextResponse.json({ error: "TTS request failed" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ audioContent: data.audioContent });
}
