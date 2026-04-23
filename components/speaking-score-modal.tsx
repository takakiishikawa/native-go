"use client";

import { useState } from "react";
import {
  Button,
  Input,
  FormActions,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DatePicker,
} from "@takaki/go-design-system";
import { saveSpeakingScore } from "@/app/actions/practice";
import type { SpeakingScore } from "@/lib/types";

function toDateObj(str: string): Date {
  return new Date(str + "T00:00:00");
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function SpeakingScoreModal({
  open,
  onClose,
  initialScores,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialScores: SpeakingScore[];
  onSaved?: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [score, setScore] = useState(70);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const newScore = await saveSpeakingScore(date, score);
      if (newScore) {
        onSaved?.();
      }
    } catch {}
    setSaving(false);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>NC AI Speaking Test スコア記録</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">日付</label>
              <DatePicker
                value={toDateObj(date)}
                onChange={(d) => {
                  if (d) setDate(toDateStr(d));
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">スコア（0〜100）</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) =>
                  setScore(
                    Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                  )
                }
              />
            </div>
          </div>

          <FormActions>
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </FormActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
