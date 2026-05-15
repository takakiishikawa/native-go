"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@takaki/go-design-system";

export function RepeatingLeaveConfirm({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) {
  const [working, setWorking] = useState(false);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !working) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>リピーティングの途中です</AlertDialogTitle>
          <AlertDialogDescription>
            途中終了しますか？ここまでに完走したぶんの記録は保存してから移動します。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working} onClick={onCancel}>
            いいえ（続ける）
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={working}
            onClick={async (e) => {
              e.preventDefault();
              setWorking(true);
              try {
                await onConfirm();
              } finally {
                setWorking(false);
              }
            }}
          >
            {working ? "保存中..." : "はい（途中終了）"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
