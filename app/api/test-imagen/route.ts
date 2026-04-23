import { NextResponse } from "next/server";

const PROMPT = "A simple red apple on a white table";

async function tryModel(
  apiKey: string,
  model: string,
  method: string,
  body: unknown,
) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (parsed as any)?.candidates?.[0]?.content?.parts ?? [];
  const hasImage =
    parts.some((p: { inlineData?: unknown }) => p.inlineData) ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!(parsed as any)?.generatedImages?.[0]?.image?.imageBytes ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!(parsed as any)?.predictions?.[0]?.bytesBase64Encoded;
  return {
    status: res.status,
    hasImage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (parsed as any)?.error?.message ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topLevelKeys: parsed ? Object.keys(parsed as any) : [],
  };
}

export async function GET() {
  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "GOOGLE_IMAGEN_API_KEY not configured" },
      { status: 500 },
    );

  const results: Record<string, unknown> = {};

  // Test Imagen models with different methods
  for (const model of [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
  ]) {
    results[`${model}:generateImages`] = await tryModel(
      apiKey,
      model,
      "generateImages",
      {
        prompt: PROMPT,
        number_of_images: 1,
      },
    );
    results[`${model}:predict`] = await tryModel(apiKey, model, "predict", {
      instances: [{ prompt: PROMPT }],
      parameters: { sampleCount: 1 },
    });
  }

  // Test Gemini image models
  for (const model of [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
  ]) {
    results[`${model}:generateContent`] = await tryModel(
      apiKey,
      model,
      "generateContent",
      {
        contents: [{ parts: [{ text: PROMPT }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      },
    );
  }

  return NextResponse.json(results);
}
