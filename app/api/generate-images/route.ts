import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET() {
  return NextResponse.json(
    { error: "POST only. Use the speaking page button to generate scenes." },
    { status: 405 },
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FALLBACK_THEME = "running an everyday errand in the neighborhood";
const MAX_BATCH = 10;

async function generateTheme(exclude: string[]): Promise<string> {
  const excludeBlock =
    exclude.length > 0
      ? `\n\n既に使用済みの題材（これらと重複しない別シーンにしてください）:\n${exclude.map((e) => `- ${e}`).join("\n")}`
      : "";

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 120,
    messages: [
      {
        role: "user",
        content: `スピーキング練習用の4コマイラストの題材を1つ英語で考えてください。

要件:
- 社会人の日常で起こりがちな身近な場面（通勤、買い物、外食、家事、友人との交流、軽いトラブル等）
- ニッチすぎず、奇抜すぎず、誰でも想像しやすいテーマ
- 場所と状況が具体的に分かる短い英語フレーズ1行（例: "getting lost on the way home from a client meeting", "ordering takeout coffee before a morning meeting"）${excludeBlock}

出力形式: 題材のフレーズのみを1行。引用符・番号・前置き・解説は一切含めない。`,
      },
    ],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") return FALLBACK_THEME;
  const cleaned = block.text
    .trim()
    .replace(/^["'`]+|["'`.\s]+$/g, "")
    .split("\n")[0]
    ?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : FALLBACK_THEME;
}

function buildImagePrompt(theme: string): string {
  return `Four sequential illustration panels arranged in a 2x2 grid, showing a wordless visual story about: ${theme}.

Panel 1 (top-left): Establish the scene and introduce the characters.
Panel 2 (top-right): A small everyday situation arises naturally.
Panel 3 (bottom-left): Characters interact or react to the situation.
Panel 4 (bottom-right): The story reaches a natural resolution.

The setting is everyday life. Characters are consistent across all 4 panels. Clear visible borders separate each panel.

ABSOLUTELY NO text, NO letters, NO numbers, NO words, NO speech bubbles, NO thought bubbles, NO signs with writing, NO captions, NO labels of any kind anywhere in the image. Pure visual storytelling only.

Warm, simple illustration style. Clean lines. Not photorealistic.`;
}

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

type SceneResult = {
  status: "ok" | "error";
  id?: string;
  theme?: string;
  reason?: string;
};

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
  const body = (await request.json().catch(() => ({}))) as { count?: number };
  const count = Math.min(
    Math.max(1, Math.floor(body.count ?? 5)),
    MAX_BATCH,
  );
  console.log("[generate-images] 生成予定数:", count);

  const results: SceneResult[] = [];
  const usedThemes: string[] = [];

  for (let i = 0; i < count; i++) {
    console.log(`[generate-images] 処理開始 (${i + 1}/${count})`);

    try {
      const theme = await generateTheme(usedThemes);
      usedThemes.push(theme);
      console.log(`[generate-images] 題材: ${theme}`);
      const imagePrompt = buildImagePrompt(theme);

      const { data: scene, error: insertError } = await admin
        .from("speaking_scenes")
        .insert({ theme })
        .select("id")
        .single();
      if (insertError || !scene) {
        console.error(
          "[generate-images] scene INSERT 失敗:",
          insertError?.message,
        );
        results.push({
          status: "error",
          theme,
          reason: insertError?.message ?? "scene insert failed",
        });
        continue;
      }

      console.log(`[generate-images] Imagen API呼び出し中: ${scene.id}`);
      const response = await callImagenAPI(imagePrompt, apiKey);
      console.log(
        `[generate-images] APIレスポンス status: ${response.status} (${scene.id})`,
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(
          `[generate-images] APIエラー ${response.status} (${scene.id}):`,
          errText.slice(0, 300),
        );
        await admin.from("speaking_scenes").delete().eq("id", scene.id);
        results.push({
          status: "error",
          theme,
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
          `[generate-images] imageBytes なし (${scene.id}):`,
          JSON.stringify(data).slice(0, 300),
        );
        await admin.from("speaking_scenes").delete().eq("id", scene.id);
        results.push({ status: "error", theme, reason: "no image data" });
        continue;
      }

      const ext = mimeType === "image/png" ? "png" : "jpg";
      const buffer = Buffer.from(imageBytes, "base64");
      const fileName = `${user.id}/${scene.id}.${ext}`;

      const { error: uploadError } = await admin.storage
        .from("speaking-images")
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) {
        console.error(
          `[generate-images] アップロードエラー (${scene.id}):`,
          uploadError.message,
        );
        await admin.from("speaking_scenes").delete().eq("id", scene.id);
        results.push({ status: "error", theme, reason: uploadError.message });
        continue;
      }

      const { data: urlData } = admin.storage
        .from("speaking-images")
        .getPublicUrl(fileName);
      await admin
        .from("speaking_scenes")
        .update({ image_url: urlData.publicUrl })
        .eq("id", scene.id);
      console.log(`[generate-images] 完了: ${scene.id}`);
      results.push({ status: "ok", id: scene.id, theme });

      if (i < count - 1) {
        console.log("[generate-images] 次のリクエストまで7s待機");
        await sleep(7000);
      }
    } catch (e) {
      console.error("[generate-images] 例外:", e);
      results.push({ status: "error", reason: String(e) });
    }
  }

  console.log("[generate-images] バッチ完了:", JSON.stringify(results));
  return NextResponse.json({ results });
}
