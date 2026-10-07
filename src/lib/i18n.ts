import { SITE_URL } from "@/lib/site";

// The site's languages. English lives on the main domain; every other
// language on its own subdomain (nl.adplaylist.com is Dutch).
export const LOCALES = ["en", "nl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// Names shown in the language switcher, in their own language.
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", nl: "Nederlands" };

// For <html lang> and Open Graph.
export const LOCALE_TAGS: Record<Locale, { lang: string; og: string }> = {
  en: { lang: "en", og: "en_US" },
  nl: { lang: "nl-NL", og: "nl_NL" },
};

const isLocale = (s: string): s is Locale => (LOCALES as readonly string[]).includes(s);

// Splits a host into its language and the host it belongs under:
// "nl.adplaylist.com" → nl + "adplaylist.com", "www.adplaylist.com" →
// en + "adplaylist.com". Works locally too: nl.localhost:3000 is Dutch
// (browsers resolve *.localhost to this machine).
export function parseHost(host: string): { locale: Locale; base: string } {
  const h = host.toLowerCase();
  const [first, ...rest] = h.split(".");
  if (rest.length > 0 && isLocale(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, base: rest.join(".") };
  }
  return { locale: DEFAULT_LOCALE, base: h.replace(/^www\./, "") };
}

// The host serving `locale`, given the base host from parseHost.
export function hostFor(locale: Locale, base: string) {
  return locale === DEFAULT_LOCALE ? base : `${locale}.${base}`;
}

// The public origin for `locale`, for canonical URLs, hreflang and sitemaps.
// Derived from NEXT_PUBLIC_SITE_URL, so https://adplaylist.com gives
// https://nl.adplaylist.com for Dutch.
export function siteUrlFor(locale: Locale) {
  const url = new URL(SITE_URL);
  url.host = hostFor(locale, parseHost(url.host).base);
  return url.origin;
}
