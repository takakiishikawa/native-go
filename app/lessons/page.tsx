"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Badge,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@takaki/go-design-system";
import { updateLessonStatus } from "@/app/actions/practice";
import type { Lesson } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  未登録: "secondary",
  練習中: "default",
  習得済み: "outline",
};

function LessonTable({
  lessons,
  onStatusChange,
}: {
  lessons: Lesson[];
  onStatusChange: (id: string, status: Lesson["status"]) => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>レッスン番号</TableHead>
          <TableHead>トピック</TableHead>
          <TableHead>ステータス</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lessons.map((lesson) => (
          <TableRow key={lesson.id}>
            <TableCell className="font-mono font-medium">
              {lesson.lesson_no}
            </TableCell>
            <TableCell>{lesson.topic}</TableCell>
            <TableCell>
              <Select
                value={lesson.status}
                onValueChange={(val) => {
                  const status = val as Lesson["status"];
                  onStatusChange(lesson.id, status);
                  startTransition(async () => {
                    await updateLessonStatus(lesson.id, status);
                  });
                }}
                disabled={isPending}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="未登録">未登録</SelectItem>
                  <SelectItem value="練習中">練習中</SelectItem>
                  <SelectItem value="習得済み">習得済み</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function LessonsPage() {
  const supabase = createClient();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .order("level");
      const sorted = ((data as Lesson[]) ?? []).sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        const parseParts = (no: string) => no.split("-").map(Number);
        const ap = parseParts(a.lesson_no);
        const bp = parseParts(b.lesson_no);
        for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
          const diff = (ap[i] ?? 0) - (bp[i] ?? 0);
          if (diff !== 0) return diff;
        }
        return 0;
      });
      setLessons(sorted);
      setLoading(false);
    }
    load();
  }, []);

  function handleStatusChange(id: string, status: Lesson["status"]) {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  const byLevel = (level: number) => lessons.filter((l) => l.level === level);

  const statusSummary = (lvl: number) => {
    const items = byLevel(lvl);
    const done = items.filter((l) => l.status === "習得済み").length;
    const trying = items.filter((l) => l.status === "練習中").length;
    return `${done} 習得済み / ${trying} 練習中 / ${items.length} 件`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="レッスン管理" description="受講状況の管理" />

      <Tabs defaultValue="1">
        <TabsList>
          <TabsTrigger value="1">
            Level 1{" "}
            <Badge variant="secondary" className="ml-2 rounded-full">
              {byLevel(1).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="2">
            Level 2{" "}
            <Badge variant="secondary" className="ml-2 rounded-full">
              {byLevel(2).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="3">
            Level 3{" "}
            <Badge variant="secondary" className="ml-2 rounded-full">
              {byLevel(3).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {[1, 2, 3].map((lvl) => (
          <TabsContent key={lvl} value={String(lvl)} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {statusSummary(lvl)}
            </p>
            {byLevel(lvl).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Level {lvl} のレッスンデータがありません
              </p>
            ) : (
              <LessonTable
                lessons={byLevel(lvl)}
                onStatusChange={handleStatusChange}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
