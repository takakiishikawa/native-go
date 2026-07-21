import { createClient } from "@/lib/supabase/server";
import { importRyanChannel } from "@/lib/youtube-import";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Ryan(EN)の全再生リスト＋未所属動画をまとめて取り込む。
// 既にチャンネル行があればそのハンドルを使って再同期し、無ければ
// body.channelUrl から初回セットアップする。
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { channelUrl, language } = body as {
    channelUrl?: string;
    language?: "en" | "vi";
  };

  const { error, result } = await importRyanChannel(supabase, user.id, {
    language,
    channelUrl,
  });

  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(result);
}
