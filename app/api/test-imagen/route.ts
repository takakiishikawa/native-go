import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_IMAGEN_API_KEY not configured" }, { status: 500 })

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Generate a small image of a red circle" }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
      }
    )
    const text = await res.text()
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { parsed = text.slice(0, 1000) }

    // Check if image data exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts = (parsed as any)?.candidates?.[0]?.content?.parts ?? []
    const hasImage = parts.some((p: { inlineData?: unknown }) => p.inlineData)

    return NextResponse.json({
      status: res.status,
      hasImage,
      partsCount: parts.length,
      partTypes: parts.map((p: Record<string, unknown>) => Object.keys(p).join(",")),
      error: (parsed as Record<string, unknown>)?.error ?? null,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
