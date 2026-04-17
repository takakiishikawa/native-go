import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  console.log("[generate-images] リクエスト受信")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error("[generate-images] 認証エラー: ユーザーなし")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  console.log("[generate-images] ユーザー:", user.id)

  const { items, force } = await request.json() as { items: { id: string; name: string }[]; force?: boolean }
  if (!items?.length) return NextResponse.json({ results: [] })
  console.log("[generate-images] 対象:", items.map(i => i.name).join(", "))

  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY
  if (!apiKey) {
    console.error("[generate-images] GOOGLE_IMAGEN_API_KEY が未設定")
    return NextResponse.json({ error: "GOOGLE_IMAGEN_API_KEY not configured" }, { status: 500 })
  }
  console.log("[generate-images] APIキー確認: OK")

  const results = []

  for (const item of items) {
    console.log(`[generate-images] 処理開始: ${item.name} (${item.id})`)

    const { data: existing } = await supabase
      .from("grammar")
      .select("image_url")
      .eq("id", item.id)
      .single()

    if (existing?.image_url && !force) {
      console.log(`[generate-images] スキップ (既存画像あり): ${item.name}`)
      results.push({ id: item.id, status: "skipped" })
      continue
    }

    try {
      const imagePrompt = `A 2x2 comic-style illustration with 4 panels showing a short story in Ho Chi Minh City that naturally demonstrates the grammar point: ${item.name}.

Panel layout (2 columns, 2 rows):
- Top-left: Scene setting, introducing characters and situation
- Top-right: Something happens that requires ${item.name}
- Bottom-left: Characters interact using ${item.name} naturally
- Bottom-right: Resolution or reaction

Style: warm, simple illustration with clear panel borders between each frame. Characters should be consistent across all 4 panels. No text or speech bubbles inside the image.`

      console.log(`[generate-images] Imagen API呼び出し中: ${item.name}`)

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: { sampleCount: 1 },
          }),
        }
      )

      console.log(`[generate-images] APIレスポンス status: ${response.status} (${item.name})`)

      if (!response.ok) {
        const errText = await response.text()
        console.error(`[generate-images] APIエラー ${response.status} (${item.name}):`, errText)
        results.push({ id: item.id, status: "error", reason: `API ${response.status}: ${errText.slice(0, 300)}` })
        continue
      }

      const data = await response.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prediction = data.predictions?.[0] as any
      const imageBytes = prediction?.bytesBase64Encoded
      const mimeType = prediction?.mimeType ?? "image/png"

      if (!imageBytes) {
        console.error(`[generate-images] imageBytes なし。レスポンス:`, JSON.stringify(data).slice(0, 500))
        results.push({ id: item.id, status: "error", reason: `no image data. keys: ${Object.keys(data).join(",")}` })
        continue
      }
      console.log(`[generate-images] imageBytes 取得成功 (${item.name}), mimeType: ${mimeType}`)

      const ext = mimeType === "image/png" ? "png" : "jpg"
      const buffer = Buffer.from(imageBytes, "base64")
      const fileName = `${user.id}/${item.id}.${ext}`

      console.log(`[generate-images] Supabaseアップロード開始: ${fileName}`)
      const { error: uploadError } = await supabase.storage
        .from("speaking-images")
        .upload(fileName, buffer, { contentType: mimeType, upsert: true })

      if (uploadError) {
        console.error(`[generate-images] アップロードエラー (${item.name}):`, uploadError.message)
        results.push({ id: item.id, status: "error", reason: uploadError.message })
        continue
      }
      console.log(`[generate-images] アップロード成功: ${fileName}`)

      const { data: urlData } = supabase.storage.from("speaking-images").getPublicUrl(fileName)
      await supabase.from("grammar").update({ image_url: urlData.publicUrl }).eq("id", item.id)
      console.log(`[generate-images] grammar.image_url 更新完了: ${item.name}`)

      results.push({ id: item.id, status: "ok" })
    } catch (e) {
      console.error(`[generate-images] 例外発生 (${item.name}):`, e)
      results.push({ id: item.id, status: "error", reason: String(e) })
    }
  }

  console.log("[generate-images] 完了:", JSON.stringify(results))
  return NextResponse.json({ results })
}
