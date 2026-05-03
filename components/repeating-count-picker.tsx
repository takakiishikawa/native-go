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

const QUICK = 10;
const FOCUS = 30;

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

  const options: Option[] = [
    {
      count: Math.min(QUICK, total),
      label: `${Math.min(QUICK, total)}件`,
      desc: "サクッと",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      count: Math.min(FOCUS, total),
      label: `${Math.min(FOCUS, total)}件`,
      desc: "集中して",
      icon: <Flame className="h-4 w-4" />,
      primary: true,
    },
    {
      count: total,
      label: `全件 (${total})`,
      desc: "1周まわす",
      icon: <Mountain className="h-4 w-4" />,
    },
  ];

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
