"use client";

import { useEffect, useRef, useState } from "react";
import { cn, toast } from "@takaki/go-design-system";
import { Volume2, Loader2 } from "lucide-react";

// 画面内で同時に鳴るのは常に一つだけにする
let stopCurrent: (() => void) | null = null;

export function PhraseAudioButton({
  text,
  rate = 1.0,
  className,
}: {
  text: string;
  rate?: number;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current = null;
    };
  }, []);

  function reset() {
    audioRef.current = null;
    if (stopCurrent === localStop) stopCurrent = null;
    setState("idle");
  }

  function localStop() {
    audioRef.current?.pause();
    reset();
  }

  async function play() {
    // 他で再生中なら止める
    stopCurrent?.();
    setState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, rate, language: "vi" }),
      });
      if (!res.ok) throw new Error();
      const { audioContent } = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      audioRef.current = audio;
      stopCurrent = localStop;
      audio.onended = reset;
      audio.onerror = reset;
      setState("playing");
      await audio.play();
    } catch {
      toast.error("音声の再生に失敗しました");
      reset();
    }
  }

  return (
    <button
      type="button"
      onClick={state === "playing" ? localStop : play}
      disabled={state === "loading"}
      aria-label={state === "playing" ? "停止" : "再生"}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95 disabled:opacity-60",
        state === "playing"
          ? "bg-[color:var(--color-primary)] text-white"
          : "text-[color:var(--color-primary)] hover:bg-[var(--color-primary)]/10",
        className,
      )}
    >
      {state === "loading" ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </button>
  );
}
