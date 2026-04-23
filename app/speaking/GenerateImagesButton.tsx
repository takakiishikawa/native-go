"use client";

import { useState, useRef } from "react";
import { Button } from "@takaki/go-design-system";
import { Loader2, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

const BATCH_SIZE = 5;
const BATCH_WAIT_SECS = 60;
const RETRY_WAIT_SECS = [30, 60, 120];
const MAX_RETRIES = 3;

type Phase = "idle" | "generating" | "waiting";

export function GenerateImagesButton({
  items,
  force = false,
  label: customLabel,
  variant = "outline",
}: {
  items: { id: string; name: string }[];
  force?: boolean;
  label?: string;
  variant?:
    | "outline"
    | "destructive"
    | "default"
    | "secondary"
    | "ghost"
    | "link";
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [batchNum, setBatchNum] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalBatches = Math.ceil(items.length / BATCH_SIZE);
  const estimatedMins = Math.ceil((totalBatches * BATCH_WAIT_SECS) / 60);

  function waitWithCountdown(secs: number): Promise<void> {
    return new Promise((resolve) => {
      setCountdown(secs);
      let remaining = secs;
      timerRef.current = setInterval(() => {
        if (cancelledRef.current) {
          clearInterval(timerRef.current!);
          resolve();
          return;
        }
        remaining--;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          resolve();
        }
      }, 1000);
    });
  }

  async function callApi(batch: { id: string; name: string }[]) {
    const res = await fetch("/api/generate-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: batch, force: true }),
    });
    const text = await res.text();
    let data: { results?: { id: string; status: string; reason?: string }[] } =
      {};
    try {
      data = JSON.parse(text);
    } catch {
      /* ignore */
    }
    const results = data.results ?? [];
    const success = results.filter((r) => r.status === "ok").length;
    const fail = results.filter((r) => r.status === "error").length;
    const rateLimited =
      results.length > 0 && results.every((r) => r.reason?.includes("429"));
    return { success, fail, rateLimited };
  }

  async function processBatch(
    batch: { id: string; name: string }[],
    retry = 0,
  ): Promise<{ success: number; fail: number }> {
    const { success, fail, rateLimited } = await callApi(batch);
    if (rateLimited && retry < MAX_RETRIES) {
      const waitSecs = RETRY_WAIT_SECS[retry] ?? 120;
      setPhase("waiting");
      await waitWithCountdown(waitSecs);
      if (cancelledRef.current) return { success: 0, fail: batch.length };
      setPhase("generating");
      return processBatch(batch, retry + 1);
    }
    return { success, fail };
  }

  async function handleBatchGenerate() {
    if (
      !window.confirm(
        `全${items.length}件の画像を再生成します。約${estimatedMins}分かかります。よろしいですか？`,
      )
    )
      return;

    cancelledRef.current = false;
    setPhase("generating");
    let totalSuccess = 0;
    let totalFail = 0;

    for (let i = 0; i < totalBatches; i++) {
      if (cancelledRef.current) break;
      setBatchNum(i + 1);

      const batch = items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const { success, fail } = await processBatch(batch);
      totalSuccess += success;
      totalFail += fail;

      if (cancelledRef.current) break;
      if (i < totalBatches - 1) {
        setPhase("waiting");
        await waitWithCountdown(BATCH_WAIT_SECS);
        if (!cancelledRef.current) setPhase("generating");
      }
    }

    setPhase("idle");
    setBatchNum(0);

    if (cancelledRef.current) {
      toast.info(
        `キャンセルしました（${totalSuccess}件成功・${totalFail}件失敗）`,
      );
    } else if (totalFail > 0) {
      toast.error(
        `${items.length}件中 ${totalSuccess}件成功・${totalFail}件失敗`,
      );
    } else {
      toast.success(
        `${totalSuccess}件すべて生成完了！ページを更新してください`,
      );
    }
  }

  async function handleSimpleGenerate() {
    setPhase("generating");
    let totalFailed = 0;
    let firstError: string | undefined;

    try {
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        try {
          const res = await fetch("/api/generate-images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: batch, force }),
          });
          const text = await res.text();
          let data: {
            error?: string;
            results?: { status: string; reason?: string }[];
          } = {};
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(`サーバーエラー (HTTP ${res.status})`);
          }
          if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
          const failed = (data.results ?? []).filter(
            (r) => r.status === "error",
          );
          totalFailed += failed.length;
          if (failed.length > 0 && !firstError)
            firstError = failed[0]?.reason ?? "APIエラー";
        } catch (e) {
          totalFailed += batch.length;
          if (!firstError)
            firstError = e instanceof Error ? e.message : "APIエラー";
        }
      }
      if (totalFailed > 0) {
        toast.error(`${totalFailed}件の生成に失敗: ${firstError}`);
      } else {
        toast.success("画像生成完了！ページを更新してください");
      }
    } finally {
      setPhase("idle");
    }
  }

  function handleCancel() {
    cancelledRef.current = true;
    timerRef.current && clearInterval(timerRef.current);
  }

  const isRunning = phase !== "idle";
  const startItem = (batchNum - 1) * BATCH_SIZE + 1;
  const endItem = Math.min(batchNum * BATCH_SIZE, items.length);

  const buttonLabel = !isRunning
    ? (customLabel ?? `画像を生成 (${items.length}件)`)
    : phase === "waiting"
      ? `次のバッチまで ${countdown}秒...`
      : `バッチ ${batchNum}/${totalBatches} 実行中... (${startItem}-${endItem}枚目)`;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size="sm"
        onClick={force ? handleBatchGenerate : handleSimpleGenerate}
        disabled={isRunning}
        className="gap-2"
      >
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
        {buttonLabel}
      </Button>
      {isRunning && force && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          キャンセル
        </Button>
      )}
    </div>
  );
}
