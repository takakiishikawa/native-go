import { UserRound } from "lucide-react"

export function ConversationLines({
  lines,
  currentLine,
}: {
  lines: string[]
  currentLine: number
}) {
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const isA = line.startsWith("A:")
        const isActive = i === currentLine
        const text = line.replace(/^[AB]:\s*/, "")

        return (
          <div key={i} className="flex items-end gap-3">
            {/* Avatar */}
            <div
              className={`
                shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm
                ${isA
                  ? "bg-blue-500"
                  : "bg-emerald-500"}
              `}
            >
              <UserRound className="h-5 w-5 text-white" />
            </div>

            {/* Bubble */}
            <div
              className={[
                "max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-xl leading-relaxed transition-all duration-200",
                isActive
                  ? isA
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-emerald-500 text-white shadow-md"
                  : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
              ].join(" ")}
            >
              {text}
            </div>
          </div>
        )
      })}
    </div>
  )
}
