import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_IMAGEN_API_KEY not configured" }, { status: 500 })

  const models = [
    "imagen-3.0-fast-generate-001",
    "imagen-3.0-generate-001",
    "imagen-4.0-fast-generate-001",
  ]

  const results: Record<string, unknown> = {}

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImages?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "A simple red circle", number_of_images: 1 }),
        }
      )
      const text = await res.text()
      results[model] = { status: res.status, body: text.slice(0, 500) }
    } catch (e) {
      results[model] = { error: String(e) }
    }
  }

  return NextResponse.json(results)
}
