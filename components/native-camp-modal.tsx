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
import { upsertNativeCampLog } from "@/app/actions/practice";

function toDateObj(str: string): Date {
  return new Date(str + "T00:00:00");
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function NativeCampModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [count, setCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const minutes = count * 25;

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await upsertNativeCampLog(date, count);
    setSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
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
          <DialogTitle>Native Camp 記録</DialogTitle>
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
              <label className="text-sm font-medium">回数</label>
              <Input
                type="number"
                min={0}
                value={count}
                onChange={(e) =>
                  setCount(Math.max(0, parseInt(e.target.value) || 0))
                }
              />
              <p className="text-sm text-muted-foreground">
                {count === 0 ? "お休み" : `${minutes}分`}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

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
