/**
 * /api/generate-images の処理を 1 件だけそのまま動かす診断用エンドポイント。
 *
 * 使い方: ブラウザで https://<host>/api/test-generate-one を開く
 *
 * /api/generate-images との違い:
 *  - 自動で image_url IS NULL の grammar を 1 件取得
 *  - 各ステップの所要時間と失敗箇所を JSON で返す
 *  - 失敗しても DB の image_url は触らないので副作用なし(成功時のみ更新)
 *  - Vercel logs を見ないでもブラウザで原因が確定する
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type StepResult = {
  step: string;
  ok: boolean;
  ms: number;
  detail?: unknown;
  error?: string;
};

export async function GET() {
  const steps: StepResult[] = [];
  const start = Date.now();

  const apiKey = process.env.GOOGLE_IMAGEN_API_KEY;
  if (!apiKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, summary: "★ env 不足", steps },
      { status: 500 },
    );
  }

  // ── 認証 ─────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, summary: "★ 未ログイン" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  // ── 1: grammar 取得 ─────────────────────────────────
  let grammar: { id: string; name: string };
  {
    const t = Date.now();
    const { data, error } = await admin
      .from("grammar")
      .select("id, name")
      .is("image_url", null)
      .limit(1)
      .maybeSingle();
    steps.push({
      step: "select-grammar",
      ok: !error && Boolean(data),
      ms: Date.now() - t,
      error: error?.message,
      detail: data,
    });
    if (error || !data)
      return NextResponse.json({
        ok: false,
        summary: "★ grammar 取得失敗",
        steps,
      });
    grammar = data;
  }

  // ── 2: Imagen 呼び出し ──────────────────────────────
  const STORY_THEMES = [
    "morning routine in a small apartment",
    "buying coffee at a busy cafe",
    "commuting on a crowded train",
    "shopping at a supermarket",
    "ordering food at a casual restaurant",
    "meeting a friend at a park",
    "working at an office desk",
    "cooking dinner in a kitchen",
    "walking a dog on a city street",
    "studying at a quiet library",
  ];
  let h = 0;
  for (let i = 0; i < grammar.id.length; i++)
    h = (h * 31 + grammar.id.charCodeAt(i)) | 0;
  const theme = STORY_THEMES[Math.abs(h) % STORY_THEMES.length];
  const prompt = `Four sequential illustration panels arranged in a 2x2 grid, showing a wordless visual story about: ${theme}.

Panel 1 (top-left): Establish the scene and introduce the characters.
Panel 2 (top-right): A small everyday situation arises naturally.
Panel 3 (bottom-left): Characters interact or react to the situation.
Panel 4 (bottom-right): The story reaches a natural resolution.

The setting is everyday life. Characters are consistent across all 4 panels. Clear visible borders separate each panel.

ABSOLUTELY NO text, NO letters, NO numbers, NO words, NO speech bubbles, NO thought bubbles, NO signs with writing, NO captions, NO labels of any kind anywhere in the image. Pure visual storytelling only.

Warm, simple illustration style. Clean lines. Not photorealistic.`;

  let imageBuffer: Buffer | null = null;
  let mimeType = "image/png";
  {
    const t = Date.now();
    let res: Response;
    try {
      res = await fetch(
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
    } catch (e) {
      steps.push({
        step: "imagen-fetch",
        ok: false,
        ms: Date.now() - t,
        error: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({
        ok: false,
        summary: "★ Imagen fetch がそもそも失敗",
        steps,
      });
    }
    const ms = Date.now() - t;
    if (!res.ok) {
      const errText = await res.text();
      steps.push({
        step: "imagen-fetch",
        ok: false,
        ms,
        detail: { status: res.status },
        error: errText.slice(0, 500),
      });
      return NextResponse.json({
        ok: false,
        summary: `★ Imagen API ${res.status}`,
        steps,
      });
    }
    const data = (await res.json()) as {
      predictions?: { bytesBase64Encoded?: string; mimeType?: string }[];
    };
    const pred = data.predictions?.[0];
    if (!pred?.bytesBase64Encoded) {
      steps.push({
        step: "imagen-fetch",
        ok: false,
        ms,
        detail: { rawResponseSample: JSON.stringify(data).slice(0, 500) },
      });
      return NextResponse.json({
        ok: false,
        summary: "★ Imagen 応答に bytesBase64Encoded なし",
        steps,
      });
    }
    imageBuffer = Buffer.from(pred.bytesBase64Encoded, "base64");
    mimeType = pred.mimeType ?? "image/png";
    steps.push({
      step: "imagen-fetch",
      ok: true,
      ms,
      detail: { sizeKB: Math.round(imageBuffer.length / 1024), mimeType },
    });
  }

  // ── 3: storage upload (実際の画像) ──────────────────
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const fileName = `${user.id}/${grammar.id}.${ext}`;
  let publicUrl: string | null = null;
  {
    const t = Date.now();
    const { error } = await admin.storage
      .from("speaking-images")
      .upload(fileName, imageBuffer, { contentType: mimeType, upsert: true });
    steps.push({
      step: "storage-upload",
      ok: !error,
      ms: Date.now() - t,
      error: error?.message,
      detail: { fileName, sizeKB: Math.round(imageBuffer.length / 1024) },
    });
    if (error)
      return NextResponse.json({
        ok: false,
        summary: `★ Storage upload 失敗: ${error.message}`,
        steps,
      });
    publicUrl = admin.storage.from("speaking-images").getPublicUrl(fileName)
      .data.publicUrl;
  }

  // ── 4: DB 更新 ──────────────────────────────────────
  {
    const t = Date.now();
    const { error } = await admin
      .from("grammar")
      .update({ image_url: publicUrl })
      .eq("id", grammar.id);
    steps.push({
      step: "db-update",
      ok: !error,
      ms: Date.now() - t,
      error: error?.message,
    });
    if (error)
      return NextResponse.json({
        ok: false,
        summary: `★ DB update 失敗: ${error.message}`,
        steps,
      });
  }

  return NextResponse.json({
    ok: true,
    summary: "✓ ALL OK — 1 件成功。フルバッチ動くはず",
    totalMs: Date.now() - start,
    grammar,
    publicUrl,
    steps,
  });
}
