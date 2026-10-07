import type { Locale } from "@/lib/i18n";
import en, { type Dictionary } from "./en";
import nl from "./nl";

export type { Dictionary };

export const DICTIONARIES: Record<Locale, Dictionary> = { en, nl };
