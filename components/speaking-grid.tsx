import Image from "next/image";
import Link from "next/link";
import { Card } from "@takaki/go-design-system";
import { SpeakingTabs } from "./speaking-tabs";

const SESSIONS_REQUIRED = 3;

type SceneItem = {
  id: string;
  image_url: string | null;
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

function SceneCard({
  s,
  sessions,
  priority = false,
}: {
  s: SceneItem;
  sessions: number;
  priority?: boolean;
}) {
  return (
    <Link href={`/speaking/${s.id}`}>
      <Card className="cursor-pointer hover:border border-border transition-all overflow-hidden group p-0 border-[var(--color-border-default)] border border-border">
        <div className="aspect-[4/3] overflow-hidden relative bg-muted">
          {s.image_url && (
            <Image
              src={s.image_url}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              {...(priority
                ? { priority: true }
                : { loading: "lazy" as const })}
            />
          )}
        </div>
        <div className="p-3 flex items-center justify-end">
          <SessionDots count={sessions} />
        </div>
      </Card>
    </Link>
  );
}

export function SpeakingGrid({
  items,
  sessionCounts,
}: {
  items: SceneItem[];
  sessionCounts: Record<string, number>;
}) {
  const todoItems = items.filter(
    (s) => (sessionCounts[s.id] ?? 0) < SESSIONS_REQUIRED,
  );
  const practicedItems = items.filter(
    (s) => (sessionCounts[s.id] ?? 0) >= SESSIONS_REQUIRED,
  );

  const todoTab =
    todoItems.length === 0 ? (
      <div className="text-center py-12 text-muted-foreground text-sm">
        全部練習しました！
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {todoItems.map((s, i) => (
          <SceneCard
            key={s.id}
            s={s}
            sessions={sessionCounts[s.id] ?? 0}
            priority={i === 0}
          />
        ))}
      </div>
    );

  const practicedTab =
    practicedItems.length === 0 ? (
      <div className="text-center py-12 text-muted-foreground text-sm">
        まだ3回完了したシーンがありません
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {practicedItems.map((s) => (
          <SceneCard key={s.id} s={s} sessions={sessionCounts[s.id] ?? 0} />
        ))}
      </div>
    );

  return (
    <SpeakingTabs
      todoTab={todoTab}
      practicedTab={practicedTab}
      todoCount={todoItems.length}
      practicedCount={practicedItems.length}
    />
  );
}
