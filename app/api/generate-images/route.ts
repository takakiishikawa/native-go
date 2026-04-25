import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET() {
  return NextResponse.json(
    { error: "POST only. Use the speaking page button to generate images." },
    { status: 405 },
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callImagenAPI(
  prompt: string,
  apiKey: string,
): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const wait = attempt * 15000;
      console.log(`[generate-images] 429 リトライ待機 ${wait / 1000}s`);
      await sleep(wait);
    }
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      },
    );
    if (response.status !== 429) return response;
  }
  throw new Error("429: レート制限により3回リトライ後も失敗");
}

export async function POST(request: NextRequest) {
  console.log("[generate-images] リクエスト受信");

  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY;
  if (!apiKey) {
    console.error("[generate-images] GOOGLE_IMAGEN_API_KEY が未設定");
    return NextResponse.json(
      { error: "GOOGLE_IMAGEN_API_KEY not configured" },
      { status: 500 },
    );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[generate-images] SUPABASE_SERVICE_ROLE_KEY が未設定");
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("[generate-images] 認証エラー: ユーザーなし");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { items, force } = (await request.json()) as {
    items: { id: string; name: string }[];
    force?: boolean;
  };
  if (!items?.length) return NextResponse.json({ results: [] });
  console.log("[generate-images] 対象件数:", items.length);

  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(
      `[generate-images] 処理開始 (${i + 1}/${items.length}): ${item.name}`,
    );

    const { data: existing } = await supabase
      .from("grammar")
      .select("image_url")
      .eq("id", item.id)
      .single();

    if (existing?.image_url && !force) {
      console.log(`[generate-images] スキップ (既存画像あり): ${item.name}`);
      results.push({ id: item.id, status: "skipped" });
      continue;
    }

    try {
      const imagePrompt = `Four sequential illustration panels arranged in a 2x2 grid, showing a wordless visual story that demonstrates the concept: ${item.name}.

Panel 1 (top-left): Establish the scene and introduce the characters.
Panel 2 (top-right): A situation arises naturally.
Panel 3 (bottom-left): Characters interact or react to the situation.
Panel 4 (bottom-right): The story reaches a resolution.

The setting is everyday urban life. Characters are consistent across all 4 panels. Clear visible borders separate each panel.

ABSOLUTELY NO text, NO letters, NO numbers, NO words, NO speech bubbles, NO thought bubbles, NO signs with writing, NO captions, NO labels of any kind anywhere in the image. Pure visual storytelling only.

Warm, simple illustration style. Clean lines. Not photorealistic.`;

      console.log(`[generate-images] Imagen API呼び出し中: ${item.name}`);
      const response = await callImagenAPI(imagePrompt, apiKey);
      console.log(
        `[generate-images] APIレスポンス status: ${response.status} (${item.name})`,
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `[generate-images] APIエラー ${response.status} (${item.name}):`,
          errText.slice(0, 300),
        );
        results.push({
          id: item.id,
          status: "error",
          reason: `API ${response.status}: ${errText.slice(0, 300)}`,
        });
        continue;
      }

      const data = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prediction = data.predictions?.[0] as any;
      const imageBytes = prediction?.bytesBase64Encoded;
      const mimeType = prediction?.mimeType ?? "image/png";

      if (!imageBytes) {
        console.error(
          `[generate-images] imageBytes なし (${item.name}):`,
          JSON.stringify(data).slice(0, 300),
        );
        results.push({ id: item.id, status: "error", reason: `no image data` });
        continue;
      }

      const ext = mimeType === "image/png" ? "png" : "jpg";
      const buffer = Buffer.from(imageBytes, "base64");
      const fileName = `${user.id}/${item.id}.${ext}`;

      const { error: uploadError } = await admin.storage
        .from("speaking-images")
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) {
        console.error(
          `[generate-images] アップロードエラー (${item.name}):`,
          uploadError.message,
        );
        results.push({
          id: item.id,
          status: "error",
          reason: uploadError.message,
        });
        continue;
      }

      const { data: urlData } = admin.storage
        .from("speaking-images")
        .getPublicUrl(fileName);
      await admin
        .from("grammar")
        .update({ image_url: urlData.publicUrl })
        .eq("id", item.id);
      console.log(`[generate-images] 完了: ${item.name}`);
      results.push({ id: item.id, status: "ok" });

      // 次のアイテムとの間に待機（最後のアイテム以外）
      if (i < items.length - 1) {
        console.log("[generate-images] 次のリクエストまで7s待機");
        await sleep(7000);
      }
    } catch (e) {
      console.error(`[generate-images] 例外 (${item.name}):`, e);
      results.push({ id: item.id, status: "error", reason: String(e) });
    }
  }

  console.log("[generate-images] バッチ完了:", JSON.stringify(results));
  return NextResponse.json({ results });
}
