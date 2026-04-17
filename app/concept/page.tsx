import { LightBulbIcon } from "@heroicons/react/24/outline"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[16px] font-medium text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function ConceptTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-[8px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-[0.05em]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-3 text-[15px] text-[var(--text-secondary)] ${j === 0 ? "font-medium text-foreground" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FlowStep({ children, isLast = false }: { children: React.ReactNode; isLast?: boolean }) {
  return (
    <div className="flex flex-col items-start">
      <div className="rounded-[8px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card px-4 py-3 text-[15px] text-[var(--text-secondary)] w-full">
        {children}
      </div>
      {!isLast && <div className="pl-4 py-1 text-[var(--text-tertiary)] text-base leading-none">↓</div>}
    </div>
  )
}

export default function ConceptPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="rounded-[6px] bg-accent p-1.5">
            <LightBulbIcon className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-[25px] font-medium">NativeGo Concept</h1>
        </div>
      </div>

      <Section title="プロダクトコアバリュー">
        <div className="rounded-[8px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card px-5 py-4">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Native Camp のレッスンで学んだ英語を、使える状態として定着させる。
          </p>
        </div>
      </Section>

      <Section title="プロダクトスコープ">
        <ConceptTable
          headers={["", "内容"]}
          rows={[
            ["解くこと", "Native Camp と連動した復習・定着・組み立て練習"],
            ["解かないこと", "語彙インプット・リスニング強化・英会話実践・テスト対策・汎用教材対応"],
          ]}
        />
      </Section>

      <Section title="習得ロジック">
        <p className="text-[15px] text-muted-foreground">英語習得に必要な3要素を NativeGo で鍛える。</p>
        <ConceptTable
          headers={["要素", "内容", "NativeGoでの手段"]}
          rows={[
            ["聞ける", "音と意味の一致", "リピーティング"],
            ["組み立てる", "自分の考えを英語で生成する", "スピーキング"],
            ["出せる", "表現が反射的に口から出る", "リピーティング"],
          ]}
        />
      </Section>

      <Section title="ユーザーストーリー">
        <div className="space-y-0">
          <FlowStep>Native Camp でレッスンを受ける</FlowStep>
          <FlowStep>レッスン教材を NativeGo に貼り付ける</FlowStep>
          <FlowStep>AI が文法・フレーズ・画像を自動生成</FlowStep>
          <FlowStep>
            <span className="font-medium text-foreground">聞ける・出せる：</span>リピーティング（文法・フレーズ）
            <br />
            <span className="font-medium text-foreground">組み立てる：</span>スピーキング練習
          </FlowStep>
          <FlowStep>次の Native Camp で実際に使える</FlowStep>
          <FlowStep isLast>
            AI Speaking Test でスコアを計測・記録
            <span className="ml-2 text-xs text-muted-foreground">（定期的に）</span>
          </FlowStep>
        </div>
      </Section>

      <Section title="行動指標">
        <ConceptTable
          headers={["指標", "頻度"]}
          rows={[
            ["NativeCamp 英会話回数", "週単位"],
            ["リピーティング回数", "週単位"],
            ["スピーキング回数", "週単位"],
          ]}
        />
      </Section>

      <Section title="結果指標">
        <div className="rounded-[8px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card px-5 py-4">
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Native Camp の AI Speaking Test の点数
          </p>
        </div>
      </Section>
    </div>
  )
}
