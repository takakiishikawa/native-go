"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@takaki/go-design-system";
import { Loader2, ImagePlus } from "lucide-react";
import { toast } from "@takaki/go-design-system";

const BATCH_SIZE = 5;

export function GenerateScenesButton({
  count = BATCH_SIZE,
}: {
  count?: number;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleGenerate() {
    setRunning(true);
    try {
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
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

      const results = data.results ?? [];
      const success = results.filter((r) => r.status === "ok").length;
      const failed = results.filter((r) => r.status === "error");

      if (failed.length > 0) {
        const firstReason = failed[0]?.reason ?? "APIエラー";
        toast.error(`${success}件成功・${failed.length}件失敗: ${firstReason}`);
      } else {
        toast.success(`${success}件のシーンを生成しました`);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={running}
      className="gap-2 shrink-0"
    >
      {running ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ImagePlus className="h-4 w-4" />
      )}
      {running ? `${count}件 生成中...` : `${count}件追加生成`}
    </Button>
  );
}
