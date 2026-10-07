"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DICTIONARIES, type Dictionary } from "@/lib/dictionaries";
import { hostFor, LOCALES, type Locale } from "@/lib/i18n";

type I18n = {
  locale: Locale;
  t: Dictionary;
  // The host this page was served from, minus its language subdomain.
  baseHost: string;
};

const I18nContext = createContext<I18n>({ locale: "en", t: DICTIONARIES.en, baseHost: "" });

// The root layout works out the language from the request's host and hands
// it here, so client components can read their copy with useI18n().
export function I18nProvider({
  locale,
  baseHost,
  children,
}: {
  locale: Locale;
  baseHost: string;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: DICTIONARIES[locale], baseHost }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// Links to this same page in every other language, on that language's
// subdomain. Protocol-relative, so they keep http locally and https live.
export function useLanguageLinks() {
  const { locale, baseHost } = useI18n();
  const pathname = usePathname() ?? "/";
  return LOCALES.filter((l) => l !== locale).map((l) => ({
    locale: l,
    href: `//${hostFor(l, baseHost)}${pathname}`,
  }));
}
