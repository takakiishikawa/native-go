"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  DatePicker,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyState,
  toast,
} from "@takaki/go-design-system";
import { ExternalLink, Trash2, Plus } from "lucide-react";
import { saveEfSetScore, deleteEfSetScore } from "@/app/actions/ef-set";

const EF_SET_URL = "https://www.efset.org/ja/4-skill/launch/";

export type EfSetScore = {
  id: string;
  tested_at: string;
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
  cefr_level: string;
};

function toDateObj(str: string): Date {
  return new Date(str + "T00:00:00");
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtDate(str: string): string {
  const [y, m, d] = str.split("-");
  return `${y}/${m}/${d}`;
}

function overall(s: EfSetScore): number {
  return Math.round((s.reading + s.listening + s.writing + s.speaking) / 4);
}

const SKILL_FIELDS = [
  { key: "reading", label: "リーディング" },
  { key: "listening", label: "リスニング" },
  { key: "writing", label: "ライティング" },
  { key: "speaking", label: "スピーキング" },
] as const;

type SkillKey = (typeof SKILL_FIELDS)[number]["key"];

export function EfSetSection({ scores }: { scores: EfSetScore[] }) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [skills, setSkills] = useState<Record<SkillKey, string>>({
    reading: "",
    listening: "",
    writing: "",
    speaking: "",
  });
  const [cefr, setCefr] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave =
    SKILL_FIELDS.every((f) => skills[f.key].trim() !== "") &&
    cefr.trim() !== "";

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const result = await saveEfSetScore({
      tested_at: date,
      reading: Number(skills.reading),
      listening: Number(skills.listening),
      writing: Number(skills.writing),
      speaking: Number(skills.speaking),
      cefr_level: cefr.trim(),
    });
    setSaving(false);
    if (result?.error) {
      toast.error("保存に失敗しました");
      return;
    }
    toast.success("EF SET スコアを記録しました");
    setSkills({ reading: "", listening: "", writing: "", speaking: "" });
    setCefr("");
    setDate(today);
    router.refresh();
  }

  async function handleDelete(id: string) {
    await deleteEfSetScore(id);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-label !mb-0">EF SET スコア</h2>
        <Button asChild variant="outline" size="sm">
          <a href={EF_SET_URL} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            EF SET 公式テスト
          </a>
        </Button>
      </div>

      {/* 記録フォーム */}
      <Card className="border border-[var(--color-border-default)]">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-medium">スコアを記録</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                受験日
              </label>
              <DatePicker
                value={toDateObj(date)}
                onChange={(d) => {
                  if (d) setDate(toDateStr(d));
                }}
              />
            </div>
            {SKILL_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {f.label}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  placeholder="0–100"
                  value={skills[f.key]}
                  onChange={(e) =>
                    setSkills((s) => ({ ...s, [f.key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                CEFR レベル
              </label>
              <Input
                placeholder="例: B1, B1+"
                value={cefr}
                onChange={(e) => setCefr(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={!canSave || saving}>
              <Plus className="h-4 w-4" />
              {saving ? "記録中…" : "記録する"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 記録一覧 */}
      <Card className="border border-[var(--color-border-default)]">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            受験記録
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 pt-2">
          {scores.length === 0 ? (
            <EmptyState
              title="まだ記録がありません"
              description="EF SET を受験したらスコアを記録しましょう"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>受験日</TableHead>
                  <TableHead className="text-right">総合</TableHead>
                  <TableHead className="text-right">R</TableHead>
                  <TableHead className="text-right">L</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">S</TableHead>
                  <TableHead>CEFR</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {fmtDate(s.tested_at)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {overall(s)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.reading}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.listening}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.writing}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.speaking}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-[var(--color-sidebar-accent)] px-2 py-0.5 text-xs font-medium text-[var(--color-sidebar-accent-foreground)]">
                        {s.cefr_level}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(s.id)}
                        aria-label="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
