"use client";

import { useEffect } from "react";
import { toast } from "sonner";

function getMessage(streak: number): string {
  if (streak >= 30)
    return `${streak}日連続！もう生活の一部になってるね。この調子で。`;
  if (streak >= 14)
    return `${streak}日連続練習中！本当の習慣になってきた証拠だよ。`;
  if (streak >= 7)
    return `${streak}日連続！1週間以上続いてる。それだけで十分すごい。`;
  return `${streak}日連続で練習中！いいね、その積み重ねが確実に力になってる。`;
}

export function StreakPopup({ streak }: { streak: number }) {
  useEffect(() => {
    if (streak < 3) return;
    const today = new Date().toISOString().split("T")[0];
    const key = `streak_shown_${today}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      toast.success(`🔥 ${getMessage(streak)}`, { duration: 5000 });
    }
  }, [streak]);

  return null;
}
