"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Expression } from "@/lib/types"
import { Star } from "lucide-react"

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  )
}

export default function ExpressionsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Expression[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Expression | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("expressions")
        .select("*")
        .order("created_at", { ascending: false })
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">読み込み中...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">表現一覧</h1>
        <span className="text-2xl font-bold">
          {items.length}
          <span className="text-base font-normal text-muted-foreground ml-1">件</span>
        </span>
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="sticky top-0 z-10 bg-background border-b">
              <TableHead>種別</TableHead>
              <TableHead>表現</TableHead>
              <TableHead>意味</TableHead>
              <TableHead>頻度</TableHead>
              <TableHead>回数</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelected(item)}
              >
                <TableCell>
                  <Badge variant="outline">{item.category}</Badge>
                </TableCell>
                <TableCell className="font-medium">{item.expression}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.meaning}</TableCell>
                <TableCell>
                  <StarRating value={item.frequency} />
                </TableCell>
                <TableCell className="text-sm">{item.play_count} / 10</TableCell>
                <TableCell>
                  {item.play_count >= 10 ? (
                    <Badge className="border-transparent bg-[#ECFDF5] text-[#10B981]">習得済み</Badge>
                  ) : (
                    <Badge className="border-transparent bg-[#FFFBEB] text-[#F59E0B]">練習中</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selected && (
        <Dialog open={!!selected} onClose={() => setSelected(null)} title={selected.expression}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selected.category}</Badge>
              <span className="text-sm text-muted-foreground whitespace-pre-line">{selected.meaning}</span>
            </div>
            {selected.usage_scene && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">使用場面</p>
                <p className="text-sm text-muted-foreground">{selected.usage_scene}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">会話例</p>
              <div className="space-y-2">
                {selected.conversation.split("\n").filter(Boolean).map((line, i) => {
                  const isA = line.startsWith("A:")
                  return (
                    <div
                      key={i}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        isA ? "bg-blue-50 text-blue-900" : "bg-amber-50 text-amber-900"
                      }`}
                    >
                      {line}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">頻度</span>
                <StarRating value={selected.frequency} />
              </div>
              <span className="text-xs text-muted-foreground">練習回数: {selected.play_count} / 10</span>
              <Badge className={selected.play_count >= 10 ? "border-transparent bg-[#ECFDF5] text-[#10B981]" : "border-transparent bg-[#FFFBEB] text-[#F59E0B]"}>
                {selected.play_count >= 10 ? "習得済み" : "練習中"}
              </Badge>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
