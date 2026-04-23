"use client";

import Link from "next/link";
import {
  Card,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@takaki/go-design-system";

const SESSIONS_REQUIRED = 3;

type GrammarItem = {
  id: string;
  name: string;
  image_url: string | null;
  lessons: { lesson_no: string } | { lesson_no: string }[] | null;
};

function SessionDots({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: SESSIONS_REQUIRED }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full transition-colors ${
            i < count
              ? "bg-[color:var(--color-grammar)]"
              : "bg-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

function GrammarCard({ g, sessions }: { g: GrammarItem; sessions: number }) {
  const lesson = Array.isArray(g.lessons) ? g.lessons[0] : g.lessons;
  return (
    <Link href={`/speaking/${g.id}`}>
      <Card className="cursor-pointer hover:border border-border transition-all overflow-hidden group p-0 border-[var(--color-border-default)] border border-border">
        <div className="aspect-[4/3] overflow-hidden relative">
          <img
            src={g.image_url!}
            alt={g.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            {lesson ? (
              <Badge variant="outline">
                No.{(lesson as { lesson_no: string }).lesson_no}
              </Badge>
            ) : (
              <span />
            )}
            <SessionDots count={sessions} />
          </div>
          <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2">
            {g.name}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export function SpeakingGrid({
  items,
  sessionCounts,
}: {
  items: GrammarItem[];
  sessionCounts: Record<string, number>;
}) {
  const todoItems = items.filter(
    (g) => (sessionCounts[g.id] ?? 0) < SESSIONS_REQUIRED,
  );
  const practicedItems = items.filter(
    (g) => (sessionCounts[g.id] ?? 0) >= SESSIONS_REQUIRED,
  );

  return (
    <Tabs defaultValue="todo">
      <TabsList>
        <TabsTrigger value="todo">
          これから
          <Badge variant="secondary" className="ml-2 rounded-full">
            {todoItems.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="practiced">
          練習した
          <Badge variant="secondary" className="ml-2 rounded-full">
            {practicedItems.length}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="todo" className="mt-4">
        {todoItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            全部練習しました！
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {todoItems.map((g) => (
              <GrammarCard
                key={g.id}
                g={g}
                sessions={sessionCounts[g.id] ?? 0}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="practiced" className="mt-4">
        {practicedItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            まだ3回完了した文法がありません
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {practicedItems.map((g) => (
              <GrammarCard
                key={g.id}
                g={g}
                sessions={sessionCounts[g.id] ?? 0}
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
