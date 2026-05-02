"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/types";

const LanguageContext = createContext<Language>(DEFAULT_LANGUAGE);

export function LanguageProvider({
  value,
  children,
}: {
  value: Language;
  children: React.ReactNode;
}) {
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useCurrentLanguage(): Language {
  return useContext(LanguageContext);
}
