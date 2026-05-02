"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  SidebarMenuButton,
} from "@takaki/go-design-system";
import { Globe, Check } from "lucide-react";
import { setCurrentLanguage } from "@/app/actions/language";
import { LANGUAGE_LABELS, type Language } from "@/lib/types";

export function LanguageSwitch({ current }: { current: Language }) {
  const [pending, startTransition] = useTransition();

  function pick(lang: Language) {
    if (lang === current || pending) return;
    startTransition(async () => {
      await setCurrentLanguage(lang);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className="flex w-full items-center gap-2"
          aria-label="学習言語を切り替え"
        >
          <Globe className="h-4 w-4 shrink-0" />
          <span>学習言語: {LANGUAGE_LABELS[current]}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-40">
        {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
          <DropdownMenuItem
            key={lang}
            onSelect={() => pick(lang)}
            className="flex items-center justify-between"
          >
            <span>{LANGUAGE_LABELS[lang]}</span>
            {current === lang && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
