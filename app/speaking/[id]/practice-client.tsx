"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@takaki/go-design-system";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { PastLog } from "./page";

const DURATION = 30;
const TOTAL_REQUIRED = 3;

type State = "idle" | "recording" | "transcribing" | "evaluating" | "error";

function CountdownRing({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - remaining / total);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted/30"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ${remaining <= 10 ? "text-destructive" : "text-[color:var(--color-grammar)]"}`}
        />
      </svg>
      <span
        className={`absolute text-3xl font-semibold tabular-nums ${remaining <= 10 ? "text-destructive" : "text-foreground"}`}
      >
        {remaining}
      </span>
    </div>
  );
}

function parseGoodPoint(raw: string) {
  const m = raw.match(/\[GOOD\]([\s\S]*?)(?=\[|$)/);
  return m ? m[1].trim() : null;
}

function PastFeedbackCard({ log, index }: { log: PastLog; index: number }) {
  const good = parseGoodPoint(log.comment);
  const label =
    index === 0 ? "前回のフィードバック" : `${index + 1}回前のフィードバック`;
  const avg =
    Array.isArray(log.scores) && log.scores.length > 0
      ? Math.round(
          log.scores.reduce((a: number, b: number) => a + b, 0) /
            log.scores.length,
        )
      : log.total_score;

  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {avg}
          <span className="font-normal">/100</span>
        </span>
      </div>
      {good ? (
        <p className="flex items-start gap-1.5 text-xs leading-relaxed">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[color:var(--color-success)]" />
          <span className="text-foreground">{good}</span>
        </p>
      ) : (
        <p className="text-xs text-foreground leading-relaxed line-clamp-3">
          {log.comment}
        </p>
      )}
    </div>
  );
}

export function PracticeClient({
  grammarId,
  grammarName,
  grammarSummary,
  imageUrl,
  completedCount,
  pastLogs,
}: {
  grammarId: string;
  grammarName: string;
  grammarSummary: string;
  imageUrl: string;
  completedCount: number;
  pastLogs: PastLog[];
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [remaining, setRemaining] = useState(DURATION);
  const [errorDetail, setErrorDetail] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const transcribeAndEvaluate = useCallback(
    async (blob: Blob) => {
      setState("transcribing");

      let speechText = "";
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          speechText = data.text ?? "";
        }
      } catch {
        // 転写失敗時は空文字で評価へ進む
      }

      setState("evaluating");
      try {
        const res = await fetch("/api/speaking-eval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grammarId, grammarName, speechText }),
        });
        const data = await res.json();
        if (data.logId) {
          router.push(`/speaking/${grammarId}/result?log=${data.logId}`);
        } else {
          setErrorDetail(data.error ?? `HTTP ${res.status}`);
          setState("error");
        }
      } catch (err) {
        setErrorDetail(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    },
    [grammarId, grammarName, router],
  );

  function stopRecording() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    timerRef.current && clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }

  async function startRecording() {
    setErrorDetail("");
    setRemaining(DURATION);
    stoppedRef.current = false;
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorDetail(
        "マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。",
      );
      setState("error");
      return;
    }

    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      transcribeAndEvaluate(blob);
    };

    recorder.start();
    setState("recording");

    let count = DURATION;
    timerRef.current = setInterval(() => {
      count--;
      setRemaining(count);
      if (count <= 0) {
        clearInterval(timerRef.current!);
        stopRecording();
      }
    }, 1000);
  }

  function retry() {
    stoppedRef.current = false;
    setState("idle");
    setRemaining(DURATION);
    setErrorDetail("");
    chunksRef.current = [];
  }

  return (
    <div className="space-y-2">
      {/* Instruction */}
      <div className="-mt-2 flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-foreground">
          1〜4のイラストを見て、英語でストーリーを話してください
        </h1>
        <span className="text-xs font-medium text-muted-foreground tabular-nums shrink-0">
          {completedCount} / {TOTAL_REQUIRED} 回
        </span>
      </div>

      {/* Image */}
      <div className="-mx-6 bg-muted/30 flex items-center justify-center overflow-hidden max-h-[60vh]">
        <img
          src={imageUrl}
          alt={grammarName}
          className="w-full max-h-[60vh] object-contain"
        />
      </div>

      <div className="max-w-lg mx-auto space-y-3">
        {/* Recommended grammar */}
        <div className="rounded-lg bg-muted/40 px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            推奨文法
          </p>
          <p className="text-sm font-medium text-foreground">{grammarName}</p>
          {grammarSummary && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {grammarSummary}
            </p>
          )}
        </div>

        {/* Past feedback */}
        {pastLogs.length > 0 && state === "idle" && (
          <div className="space-y-2">
            {pastLogs.map((log, i) => (
              <PastFeedbackCard key={i} log={log} index={i} />
            ))}
          </div>
        )}

        {/* idle */}
        {state === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <Button size="lg" onClick={startRecording} className="gap-2 px-8">
              🎤 録音スタート
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/speaking")}
            >
              途中終了
            </Button>
          </div>
        )}

        {/* recording */}
        {state === "recording" && (
          <div className="flex flex-col items-center gap-3">
            <CountdownRing remaining={remaining} total={DURATION} />
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">
                録音中
              </span>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={stopRecording}
              className="gap-2 px-8"
            >
              停止して評価
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stoppedRef.current = true;
                timerRef.current && clearInterval(timerRef.current);
                mediaRecorderRef.current?.stop();
                streamRef.current?.getTracks().forEach((t) => t.stop());
                router.push("/speaking");
              }}
            >
              途中終了
            </Button>
          </div>
        )}

        {/* transcribing */}
        {state === "transcribing" && (
          <div className="flex flex-col items-center gap-3 pt-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">音声を解析中...</p>
          </div>
        )}

        {/* evaluating */}
        {state === "evaluating" && (
          <div className="flex flex-col items-center gap-3 pt-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AIが評価中...</p>
          </div>
        )}

        {/* error */}
        {state === "error" && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <p className="text-sm text-destructive text-center">
              エラーが発生しました。
            </p>
            {errorDetail && (
              <p className="text-xs text-muted-foreground text-center break-all max-w-xs">
                {errorDetail}
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={retry}>
                もう一度試す
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/speaking")}
              >
                一覧に戻る
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
