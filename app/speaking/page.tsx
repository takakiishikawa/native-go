import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function SpeakingPage() {
  const supabase = await createClient()

  const { data: grammars } = await supabase
    .from("grammar")
    .select("id, name, summary, image_url, play_count, lessons!lesson_id(lesson_no)")
    .not("image_url", "is", null)
    .gt("play_count", 0)
    .lt("play_count", 10)
    .order("created_at", { ascending: false })

  const items = grammars ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">スピーキング</h1>
        <p className="text-muted-foreground mt-1">画像を見ながら英語で説明する練習</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <p className="text-lg">練習できる文法がありません</p>
          <p className="text-sm">テキストを追加すると画像が自動生成されます</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((g) => {
            const lesson = Array.isArray(g.lessons) ? g.lessons[0] : g.lessons
            return (
              <Link key={g.id} href={`/speaking/${g.id}`}>
                <Card className="cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all overflow-hidden group">
                  <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                    <img
                      src={g.image_url!}
                      alt={g.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-3 space-y-1">
                    {lesson && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        No.{(lesson as { lesson_no: string }).lesson_no}
                      </Badge>
                    )}
                    <p className="font-semibold text-sm text-foreground leading-snug line-clamp-2">
                      {g.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{g.summary}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
