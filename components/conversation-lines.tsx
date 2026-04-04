export function ConversationLines({
  lines,
  currentLine,
}: {
  lines: string[]
  currentLine: number
}) {
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const isA = line.startsWith("A:")
        const isB = line.startsWith("B:")
        const isActive = i === currentLine
        return (
          <div
            key={i}
            className={[
              "rounded-md px-4 py-2.5 text-lg font-medium leading-relaxed transition-colors border-l-[3px]",
              isActive
                ? isA
                  ? "bg-blue-50 text-blue-700 border-l-blue-600 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-400"
                  : "bg-amber-50 text-amber-700 border-l-amber-500 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-400"
                : isA
                ? "bg-neutral-50 text-blue-700 border-l-transparent dark:bg-neutral-800 dark:text-blue-300"
                : isB
                ? "bg-neutral-50 text-neutral-600 border-l-transparent dark:bg-neutral-800 dark:text-neutral-400"
                : "bg-neutral-50 text-neutral-600 border-l-transparent dark:bg-neutral-800",
            ].join(" ")}
          >
            {line}
          </div>
        )
      })}
    </div>
  )
}
