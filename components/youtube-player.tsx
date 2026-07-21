"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
}

interface YTPlayerOptions {
  videoId: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: (event: { target: YTPlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
  };
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: YTPlayerOptions,
  ) => YTPlayerInstance;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<void> | null = null;
function loadYoutubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

export interface YoutubePlayerHandle {
  play: () => void;
  pause: () => void;
  seekBy: (deltaSeconds: number) => void;
}

export const YoutubePlayer = forwardRef<
  YoutubePlayerHandle,
  { videoId: string; onPlayingChange?: (playing: boolean) => void }
>(function YoutubePlayer({ videoId, onPlayingChange }, ref) {
  const targetRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seekBy: (delta) => {
        const p = playerRef.current;
        if (!p) return;
        p.seekTo(Math.max(0, p.getCurrentTime() + delta), true);
      },
    }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let player: YTPlayerInstance | null = null;

    loadYoutubeIframeApi().then(() => {
      if (cancelled || !window.YT || !targetRef.current) return;
      player = new window.YT.Player(targetRef.current, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0 },
        events: {
          onReady: () => {
            playerRef.current = player;
          },
          onStateChange: (e) => {
            onPlayingChange?.(e.data === window.YT!.PlayerState.PLAYING);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      player?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div
      className="mx-auto w-full max-w-[760px] overflow-hidden rounded-[20px]"
      style={{ aspectRatio: "16/9", background: "#000" }}
    >
      <div ref={targetRef} className="h-full w-full" />
    </div>
  );
});
