import { useCallback, useSyncExternalStore } from "react";
import { checkout } from "./translations/checkout";
import { editorial } from "./translations/editorial";
import { orders } from "./translations/orders";
import { shell } from "./translations/shell";
import { shop } from "./translations/shop";
import type { TranslationTable } from "./types";

/**
 * Storefront translations.
 *
 * Components wrap the text they render in `t("...")`, using the English text as
 * the lookup key. The tables in `./translations` map that text to Indonesian
 * and Chinese; a missing entry falls back to English, so a new string still
 * renders before it has been translated. `{name}` placeholders are filled
 * from the second argument.
 */
export type Language = "en" | "id" | "zh";
export type TranslationVars = Record<string, string | number>;
export type Translate = (text: string, vars?: TranslationVars) => string;

export const LANGUAGES: Array<{ code: Language; label: string; htmlLang: string }> = [
  { code: "en", label: "EN", htmlLang: "en" },
  { code: "id", label: "ID", htmlLang: "id" },
  { code: "zh", label: "中文", htmlLang: "zh-Hans" },
];

/** Every translation table, by storefront area. Exported so the test suite can check coverage. */
export const TRANSLATION_TABLES: Record<string, TranslationTable> = { shell, shop, checkout, orders, editorial };

const COLUMN: Record<Exclude<Language, "en">, 0 | 1> = { id: 0, zh: 1 };
const ENTRIES: TranslationTable = Object.assign({}, ...Object.values(TRANSLATION_TABLES));
const STORAGE_KEY = "cfj_language";
const DEFAULT_LANGUAGE: Language = "en";

const isLanguage = (value: unknown): value is Language => LANGUAGES.some(language => language.code === value);

/** A saved choice wins; otherwise follow the browser's preferred languages. */
function detectLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // Storage unavailable: fall through to browser detection.
  }
  for (const preferred of navigator.languages ?? [navigator.language]) {
    const base = preferred?.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

let currentLanguage = detectLanguage();
const listeners = new Set<() => void>();

function syncDocumentLanguage() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = LANGUAGES.find(language => language.code === currentLanguage)?.htmlLang ?? "en";
}
syncDocumentLanguage();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getLanguage = () => currentLanguage;

export function setLanguage(language: Language) {
  if (language === currentLanguage) return;
  currentLanguage = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage unavailable: the choice still applies for this visit.
  }
  syncDocumentLanguage();
  listeners.forEach(listener => listener());
}

export function translate(language: Language, text: string, vars?: TranslationVars): string {
  const template = language === "en" ? text : (ENTRIES[text]?.[COLUMN[language]] ?? text);
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in vars ? String(vars[name]) : placeholder
  );
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return { language, setLanguage };
}

/** Returns `t`, which translates source text into the visitor's language. */
export function useT(): Translate {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return useCallback((text, vars) => translate(language, text, vars), [language]);
}
