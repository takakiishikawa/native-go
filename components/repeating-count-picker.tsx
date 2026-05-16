"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@takaki/go-design-system";
import { Zap, Flame, Mountain, ChevronRight } from "lucide-react";

const PRESETS = [10, 30, 50] as const;

type Option = {
  count: number;
  label: string;
  desc: string;
  icon: React.ReactNode;
};

export function RepeatingCountPicker({
  total,
  onSelect,
}: {
  total: number;
  onSelect: (count: number) => void;
}) {
  const router = useRouter();

  // 別ページの Dialog/Sheet がナビゲーション中にアンマウントすると
  // body に pointer-events:none が残り、本ダイアログが操作不能になることがある
  useEffect(() => {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
  }, []);

  const descs = ["サクッと", "集中して", "がっつり"] as const;
  const icons = [
    <Zap key="z" className="h-4 w-4" />,
    <Flame key="f" className="h-4 w-4" />,
    <Mountain key="m" className="h-4 w-4" />,
  ];

  // 実データ件数に合わせる: プリセットを total で頭打ちにして重複を除く
  // 例) total=15 → [10, 15] / total>=50 → [10, 30, 50]
  const seen = new Set<number>();
  const options: Option[] = PRESETS.map((n, i) => ({
    count: Math.min(n, total),
    label: `${Math.min(n, total)}件`,
    desc: descs[i],
    icon: icons[i],
  })).filter((o) => {
    if (o.count <= 0 || seen.has(o.count)) return false;
    seen.add(o.count);
    return true;
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.push("/");
      }}
    >
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>今日のペースを選ぼう</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {options.map((o) => (
            <Button
              key={o.count}
              size="lg"
              variant="outline"
              className="w-full justify-between h-14"
              onClick={() => onSelect(o.count)}
            >
              <span className="flex items-center gap-3">
                {o.icon}
                <span className="text-base font-medium">{o.label}</span>
              </span>
              <span className="flex items-center gap-2 opacity-70">
                <span className="text-xs">{o.desc}</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
