import type { WordNote } from "@/lib/types";

export function WordNotesInline({
  notes,
  emptyMark = "—",
}: {
  notes?: WordNote[] | null;
  emptyMark?: string;
}) {
  if (!notes || notes.length === 0)
    return <span className="text-xs text-muted-foreground">{emptyMark}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {notes.map((n, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[11px] leading-tight"
        >
          <span className="font-medium text-foreground">{n.word}</span>
          <span className="text-foreground">{n.note}</span>
        </span>
      ))}
    </div>
  );
}

export function WordNotesPanel({
  notes,
  title = "単語",
}: {
  notes?: WordNote[] | null;
  title?: string;
}) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {notes.map((n, i) => (
          <li
            key={i}
            className="flex items-baseline gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-sm"
          >
            <span className="font-medium text-foreground shrink-0">
              {n.word}
            </span>
            <span className="text-muted-foreground text-xs">{n.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
