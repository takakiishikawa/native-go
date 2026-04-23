"use client";

import { useEffect, useState } from "react";
import { Banner } from "@takaki/go-design-system";
import { SpeakingScoreModal } from "@/components/speaking-score-modal";
import type { SpeakingScore } from "@/lib/types";

export function SpeakingTestReminder({
  testDay,
  initialScores,
}: {
  testDay: number;
  initialScores: SpeakingScore[];
}) {
  const [show, setShow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const storageKey = () => {
    const now = new Date();
    return `nc_speaking_test_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  useEffect(() => {
    const today = new Date().getDate();
    if (today !== testDay) return;
    if (localStorage.getItem(storageKey())) return;
    setShow(true);
  }, [testDay]);

  function handleSaved() {
    localStorage.setItem(storageKey(), "1");
    setModalOpen(false);
    setShow(false);
  }

  if (!show) return null;

  return (
    <>
      <Banner
        variant="warning"
        description="今月の NC AI Speaking Test の受検日です。記録しましょう。"
        action={{ label: "記録する", onClick: () => setModalOpen(true) }}
      />
      <SpeakingScoreModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialScores={initialScores}
        onSaved={handleSaved}
      />
    </>
  );
}
