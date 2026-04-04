import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { items } = await request.json() as { items: { id: string; name: string }[] }
  if (!items?.length) return NextResponse.json({ results: [] })

  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_IMAGEN_API_KEY not configured" }, { status: 500 })

  const results = []

  for (const item of items) {
    // Skip if image already exists
    const { data: existing } = await supabase
      .from("grammar")
      .select("image_url")
      .eq("id", item.id)
      .single()

    if (existing?.image_url) {
      results.push({ id: item.id, status: "skipped" })
      continue
    }

    try {
      const imagePrompt = `A realistic everyday scene in Ho Chi Minh City that naturally demonstrates the grammar point: ${item.name}. Scene ideas: café, gym, street market, apartment, park. Style: natural photo-realistic, warm lighting, no text in the image. The scene should make someone want to describe it using ${item.name}.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:generateImages?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: imagePrompt, number_of_images: 1 }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        console.error(`Imagen API error ${response.status} for ${item.name}:`, errText)
        results.push({ id: item.id, status: "error", reason: `API ${response.status}: ${errText.slice(0, 300)}` })
        continue
      }

      const data = await response.json()
      const imageBytes = data.generatedImages?.[0]?.image?.imageBytes
      if (!imageBytes) {
        results.push({ id: item.id, status: "error", reason: "no image data" })
        continue
      }

      const buffer = Buffer.from(imageBytes, "base64")
      const fileName = `${user.id}/${item.id}.png`

      const { error: uploadError } = await supabase.storage
        .from("speaking-images")
        .upload(fileName, buffer, { contentType: "image/png", upsert: true })

      if (uploadError) {
        results.push({ id: item.id, status: "error", reason: uploadError.message })
        continue
      }

      const { data: urlData } = supabase.storage.from("speaking-images").getPublicUrl(fileName)
      await supabase.from("grammar").update({ image_url: urlData.publicUrl }).eq("id", item.id)

      results.push({ id: item.id, status: "ok" })
    } catch (e) {
      console.error(`Image generation failed for grammar ${item.id}:`, e)
      results.push({ id: item.id, status: "error" })
    }
  }

  return NextResponse.json({ results })
}
