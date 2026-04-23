"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Badge,
  DataTable,
  PageHeader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from "@takaki/go-design-system";
import type { ColumnDef } from "@tanstack/react-table";
import type { Grammar } from "@/lib/types";
import { Star } from "lucide-react";

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= value ? "fill-[var(--color-warning)] text-[color:var(--color-warning)]" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  );
}

export default function GrammarPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Grammar[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Grammar | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("grammar")
        .select("*")
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const columns = useMemo(
    (): ColumnDef<Grammar>[] => [
      {
        accessorKey: "name",
        header: "文法名",
        cell: ({ row }) => (
          <Button
            onClick={() => setSelected(row.original)}
            variant="ghost"
            className="font-medium text-left hover:underline text-foreground p-0 h-auto"
          >
            {row.original.name}
          </Button>
        ),
      },
      {
        accessorKey: "summary",
        header: "概要",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm line-clamp-1 max-w-xs block">
            {row.original.summary.split("\n")[0]}
          </span>
        ),
      },
      {
        accessorKey: "frequency",
        header: "頻度",
        cell: ({ row }) => <StarRating value={row.original.frequency} />,
      },
      {
        accessorKey: "play_count",
        header: "回数",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.play_count} / 10
          </span>
        ),
      },
      {
        id: "status",
        header: "ステータス",
        cell: ({ row }) =>
          row.original.play_count >= 10 ? (
            <Badge className="border-transparent bg-[color:var(--color-success-subtle)] text-[color:var(--color-success)]">
              習得済み
            </Badge>
          ) : (
            <Badge className="border-transparent bg-[color:var(--color-warning-subtle)] text-[color:var(--color-warning)]">
              練習中
            </Badge>
          ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="文法一覧"
        actions={
          <span className="text-2xl font-bold">
            {items.length}
            <span className="text-base font-normal text-muted-foreground ml-1">
              件
            </span>
          </span>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchable={{ columnId: "name", placeholder: "文法名で検索..." }}
        pageSize={20}
        emptyMessage="文法が登録されていません"
      />

      {selected && (
        <Dialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  概要
                </p>
                <p className="text-base whitespace-pre-line">
                  {selected.summary}
                </p>
              </div>
              {selected.detail && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    詳細解説
                  </p>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {selected.detail}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  例文
                </p>
                <ul className="space-y-2">
                  {selected.examples
                    .split("\n")
                    .filter(Boolean)
                    .map((ex, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-muted px-3 py-2 text-base"
                      >
                        {ex}
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  使用場面
                </p>
                <p className="text-base text-muted-foreground whitespace-pre-line">
                  {selected.usage_scene}
                </p>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">頻度</span>
                  <StarRating value={selected.frequency} />
                </div>
                <span className="text-sm text-muted-foreground">
                  練習回数: {selected.play_count} / 10
                </span>
                <Badge
                  className={
                    selected.play_count >= 10
                      ? "border-transparent bg-[color:var(--color-success-subtle)] text-[color:var(--color-success)]"
                      : "border-transparent bg-[color:var(--color-warning-subtle)] text-[color:var(--color-warning)]"
                  }
                >
                  {selected.play_count >= 10 ? "習得済み" : "練習中"}
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}