import { createAdminClient } from "@/lib/supabase/admin";
import { importRyanChannel } from "@/lib/youtube-import";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Vercel Cron から週次で叩かれ、Ryan(EN)の再生リスト・動画を最新化する。
// ユーザーセッションが無いため service role クライアントを使い、
// user_id は既存の en チャンネル行から取得する（チャンネル行は初回セット
// アップ以降、削除されない前提）。
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: channel } = await supabase
    .from("youtube_channels")
    .select("user_id")
    .eq("language", "en")
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!channel) {
    return NextResponse.json(
      { error: "Ryanのチャンネルが未登録のためスキップしました" },
      { status: 200 },
    );
  }

  const { error, result } = await importRyanChannel(supabase, channel.user_id, {
    language: "en",
  });

  if (error) {
    console.error("[cron/sync-ryan] failed:", error);
    return NextResponse.json({ error }, { status: 500 });
  }

  console.log("[cron/sync-ryan] synced:", result);
  return NextResponse.json(result);
}
