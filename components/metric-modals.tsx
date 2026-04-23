"use client";

import { useState } from "react";
import { Button } from "@takaki/go-design-system";
import { NativeCampModal } from "@/components/native-camp-modal";
import { SpeakingScoreModal } from "@/components/speaking-score-modal";
import { Pencil } from "lucide-react";
import type { SpeakingScore } from "@/lib/types";

export function MetricModals({
  initialScores,
}: {
  initialScores: SpeakingScore[];
}) {
  const [ncOpen, setNcOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setNcOpen(true)}
          className="gap-1.5 text-muted-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
          Native Camp
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setScoreOpen(true)}
          className="gap-1.5 text-muted-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
          NC AI Speaking Test
        </Button>
      </div>
      <NativeCampModal open={ncOpen} onClose={() => setNcOpen(false)} />
      <SpeakingScoreModal
        open={scoreOpen}
        onClose={() => setScoreOpen(false)}
        initialScores={initialScores}
      />
    </>
  );
}
