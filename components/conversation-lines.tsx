import { UserRound } from "lucide-react";

export function ConversationLines({
  lines,
  currentLine,
}: {
  lines: string[];
  currentLine: number;
}) {
  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const isA = line.startsWith("A:");
        const isActive = i === currentLine;
        const text = line.replace(/^[AB]:\s*/, "");

        return (
          <div key={i} className="flex items-end gap-3">
            {/* Avatar */}
            <div
              className={`
                shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                ${isA ? "bg-[color:var(--color-grammar)]" : "bg-[color:var(--color-phrase)]"}
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
                    ? "bg-[color:var(--color-grammar)] text-white"
                    : "bg-[color:var(--color-phrase)] text-white"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
