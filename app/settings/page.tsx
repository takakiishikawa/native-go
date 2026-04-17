"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const DEFAULTS = {
  baseline_repeating: 500,
  baseline_speaking: 20,
  baseline_nativecamp: 250,
  baseline_shadowing: 75,
  speaking_test_day: 1,
}

type SettingsValues = typeof DEFAULTS

export default function SettingsPage() {
  const supabase = createClient()
  const [values, setValues] = useState<SettingsValues>(DEFAULTS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
      if (data) {
        setValues({
          baseline_repeating: data.baseline_repeating ?? DEFAULTS.baseline_repeating,
          baseline_speaking:  data.baseline_speaking  ?? DEFAULTS.baseline_speaking,
          baseline_nativecamp: data.baseline_nativecamp ?? DEFAULTS.baseline_nativecamp,
          baseline_shadowing: data.baseline_shadowing ?? DEFAULTS.baseline_shadowing,
          speaking_test_day:  data.speaking_test_day  ?? DEFAULTS.speaking_test_day,
        })
      }
    }
    load()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, ...values, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      )

    if (error) {
      toast.error("保存に失敗しました")
    } else {
      toast.success("保存しました")
    }
    setSaving(false)
  }

  const set = (key: keyof SettingsValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: parseInt(e.target.value) || 0 }))

  function FieldRow({ label, fieldKey, unit }: { label: string; fieldKey: keyof SettingsValues; unit: string }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle,rgba(0,0,0,0.08))] last:border-0">
        <span className="text-[14px] text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={values[fieldKey]}
            onChange={set(fieldKey)}
            className="w-24 text-right"
          />
          <span className="text-[13px] text-muted-foreground w-12 shrink-0">{unit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-[22px] font-medium">設定</h1>
      </div>

      <section className="space-y-3">
        <h2 className="section-label">ベースライン</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          週間ベースラインとは、毎週維持したい最低限の学習量です。
          目標ではなく、このペースを下回らないことを意識する基準です。
        </p>
        <div className="rounded-[8px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card px-4">
          <FieldRow label="リピーティング" fieldKey="baseline_repeating" unit="回/週" />
          <FieldRow label="スピーキング"    fieldKey="baseline_speaking"  unit="回/週" />
          <FieldRow label="Native Camp"     fieldKey="baseline_nativecamp" unit="分/週" />
          <FieldRow label="シャドーイング"   fieldKey="baseline_shadowing"  unit="分/週" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-label">NC AI Speaking Test</h2>
        <p className="text-[13px] text-muted-foreground">毎月何日に受けますか？</p>
        <div className="rounded-[8px] border border-[var(--border-subtle,rgba(0,0,0,0.08))] bg-card px-4">
          <FieldRow label="受検日" fieldKey="speaking_test_day" unit="日" />
        </div>
      </section>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "保存中..." : "保存する"}
      </Button>
    </div>
  )
}
