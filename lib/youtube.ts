// 各種YouTube URL から videoId を抽出する
export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  const short = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return short[1];
  const shorts = trimmed.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  if (shorts) return shorts[1];
  const embed = trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (embed) return embed[1];
  const watchMatch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}
