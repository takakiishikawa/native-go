/**
 * speaking_scenes.image_url から参照されていない storage.objects (孤児) を削除する。
 *
 * 使い方:
 *   - GET  /api/cleanup-orphan-images           → 孤児リストを返す (dry-run)
 *   - POST /api/cleanup-orphan-images           → 実際に削除する
 *
 * 認証必須。誤操作防止のため POST 時に body で {"confirm": true} を要求。
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const BUCKET = "speaking-images";

async function authCheck() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function listOrphans(): Promise<{ name: string; sizeKB: number }[]> {
  const admin = createAdminClient();

  // 全画像 path をフラット列挙(バケット直下のフォルダを順番に列挙)
  // user.id/grammar.id.png 形式なのでまず top-level (user) フォルダを取得
  const { data: topLevel, error: topErr } = await admin.storage
    .from(BUCKET)
    .list("", { limit: 1000 });
  if (topErr) throw new Error(`top list 失敗: ${topErr.message}`);

  type FileMeta = {
    name: string;
    metadata?: { size?: number } | null;
  };

  const allFiles: { name: string; sizeKB: number }[] = [];
  for (const entry of topLevel ?? []) {
    if (!entry.id) {
      // フォルダ
      const { data: files, error: subErr } = await admin.storage
        .from(BUCKET)
        .list(entry.name, { limit: 1000 });
      if (subErr) continue;
      for (const f of (files ?? []) as FileMeta[]) {
        if (!f.metadata) continue;
        allFiles.push({
          name: `${entry.name}/${f.name}`,
          sizeKB: Math.round((f.metadata?.size ?? 0) / 1024),
        });
      }
    } else {
      // バケット直下にファイルが置かれているケース(レアだが)
      const meta = (entry as FileMeta).metadata;
      if (meta) {
        allFiles.push({
          name: entry.name,
          sizeKB: Math.round((meta.size ?? 0) / 1024),
        });
      }
    }
  }

  // speaking_scenes.image_url の参照元 set を構築
  const { data: scenes, error: sErr } = await admin
    .from("speaking_scenes")
    .select("image_url")
    .not("image_url", "is", null);
  if (sErr) throw new Error(`speaking_scenes 取得失敗: ${sErr.message}`);

  const referencedPaths = new Set<string>();
  for (const s of scenes ?? []) {
    const url: string | null = s.image_url;
    if (!url) continue;
    // URL の `/object/public/speaking-images/` 以降が path
    const m = url.match(/\/object\/public\/speaking-images\/(.+)$/);
    if (m) referencedPaths.add(decodeURIComponent(m[1]));
  }

  return allFiles.filter((f) => !referencedPaths.has(f.name));
}

export async function GET() {
  const user = await authCheck();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const orphans = await listOrphans();
    const totalKB = orphans.reduce((s, o) => s + o.sizeKB, 0);
    return NextResponse.json({
      mode: "dry-run",
      summary: `孤児 ${orphans.length} 件 (合計 ${(totalKB / 1024).toFixed(1)} MB)`,
      orphans,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await authCheck();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { confirm?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }

  if (!body.confirm) {
    return NextResponse.json(
      {
        error:
          '安全のため body に {"confirm": true} を含めてください。GET で dry-run 確認後に実行を推奨',
      },
      { status: 400 },
    );
  }

  try {
    const orphans = await listOrphans();
    if (orphans.length === 0) {
      return NextResponse.json({ summary: "孤児なし、削除対象なし" });
    }
    const admin = createAdminClient();
    const paths = orphans.map((o) => o.name);
    const { data, error } = await admin.storage.from(BUCKET).remove(paths);
    if (error) {
      return NextResponse.json(
        { error: `削除失敗: ${error.message}` },
        { status: 500 },
      );
    }
    const removedCount = (data ?? []).length;
    const totalKB = orphans.reduce((s, o) => s + o.sizeKB, 0);
    return NextResponse.json({
      summary: `${removedCount} 件削除 (${(totalKB / 1024).toFixed(1)} MB 解放)`,
      removed: paths,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
