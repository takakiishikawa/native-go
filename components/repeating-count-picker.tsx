"use client";

import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@takaki/go-design-system";
import { Zap, Flame, Mountain } from "lucide-react";

const PRESETS = [30, 50, 100] as const;

type Option = {
  count: number;
  label: string;
  desc: string;
  icon: React.ReactNode;
  primary?: boolean;
};

export function RepeatingCountPicker({
  total,
  kind,
  onSelect,
}: {
  total: number;
  kind: "grammar" | "expression";
  onSelect: (count: number) => void;
}) {
  const router = useRouter();
  const label = kind === "grammar" ? "文法" : "フレーズ";

  const descs = ["サクッと", "集中して", "がっつり"] as const;
  const icons = [
    <Zap key="z" className="h-4 w-4" />,
    <Flame key="f" className="h-4 w-4" />,
    <Mountain key="m" className="h-4 w-4" />,
  ];

  const options: Option[] = PRESETS.map((n, i) => ({
    count: Math.min(n, total),
    label: `${Math.min(n, total)}件`,
    desc: descs[i],
    icon: icons[i],
    primary: i === 1,
  }));

  // Dedupe (e.g. when total < 10, all three options would say the same number)
  const seen = new Set<number>();
  const uniqueOptions = options.filter((o) => {
    if (seen.has(o.count)) return false;
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>今日は何件やりますか？</DialogTitle>
          <DialogDescription>
            {label}リピーティング・練習中 {total} 件
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          {uniqueOptions.map((o) => (
            <Button
              key={o.count}
              size="lg"
              variant={o.primary ? "default" : "outline"}
              className="w-full justify-between h-14"
              onClick={() => onSelect(o.count)}
            >
              <span className="flex items-center gap-3">
                {o.icon}
                <span className="text-base font-medium">{o.label}</span>
              </span>
              <span className="text-xs text-muted-foreground">{o.desc}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
