"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentLanguage } from "@/lib/language";
import { revalidatePath } from "next/cache";
import { extractYoutubeVideoId } from "@/lib/youtube";
import type { Song, SongLine } from "@/lib/types";

export async function listSongs(): Promise<Song[]> {
  const supabase = await createClient();
  const language = await getCurrentLanguage();
  const { data } = await supabase
    .from("songs")
    .select("*")
    .eq("language", language)
    .order("created_at", { ascending: false });
  return (data ?? []) as Song[];
}

export async function createSong(input: {
  title: string;
  artist: string;
  videoUrl: string;
  lyrics: string;
}): Promise<{ error?: string; song?: Song }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not logged in" };

  const videoId = extractYoutubeVideoId(input.videoUrl);
  if (!videoId) {
    return { error: "Enter a valid YouTube video URL" };
  }

  const lines: SongLine[] = input.lyrics
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((text) => ({ text, translation: "" }));
  if (lines.length === 0) {
    return { error: "Paste the song's lyrics, one line at a time" };
  }

  const language = await getCurrentLanguage();
  const { data, error } = await supabase
    .from("songs")
    .insert({
      user_id: user.id,
      language,
      title: input.title,
      artist: input.artist,
      youtube_video_id: videoId,
      lines,
    })
    .select()
    .single();

  if (error) {
    console.error("[createSong] failed:", error.message);
    return { error: error.message };
  }
  revalidatePath("/songs");
  return { song: data as Song };
}

export async function updateSongLines(
  id: string,
  lines: SongLine[],
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("songs")
    .update({ lines, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/songs");
  return {};
}

export async function deleteSong(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/songs");
  return {};
}
