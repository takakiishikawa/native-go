"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { DayPicker } from "react-day-picker"
import { CalendarIcon } from "lucide-react"

function toDate(str: string): Date {
  return new Date(str + "T00:00:00")
}

function toStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function fmtDisplay(str: string): string {
  const [y, m, d] = str.split("-")
  return `${y}/${m}/${d}`
}

export function DateButton({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const popupHeight = 320
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= popupHeight
        ? rect.bottom + 4
        : rect.top - popupHeight - 4
      setPos({ top, left: rect.left })
    }
    setOpen(true)
  }

  const selected = value ? toDate(value) : undefined

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted/50 transition-colors text-left"
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        {fmtDisplay(value)}
      </button>

      {mounted && open && createPortal(
        <div
          ref={popupRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-background border border-input rounded-lg shadow-2xl"
        >
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected ?? new Date()}
            onSelect={(date) => {
              if (date) {
                onChange(toStr(date))
                setOpen(false)
              }
            }}
          />
        </div>,
        document.body
      )}
    </>
  )
}
