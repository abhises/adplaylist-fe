import {
  CATEGORY_OPTIONS,
  DOMINANT_COLORS,
  LANGUAGE_OPTIONS,
  MARKET_OPTIONS,
  PLATFORM_OPTIONS,
  SIZE_OPTIONS,
  type Ad,
} from "@/lib/ads";

// An ad that has been filled from the Add ad page but not yet published.
// It lives in sessionStorage so /add-ad and /add-ad/preview can hand it back
// and forth without the backend knowing about drafts.
export type AdDraft = {
  adName: string;
  mediaType: "image" | "video";
  kicker: string;
  headline: string;
  sub: string;
  cta: string;
  description: string;
  category: string;
  market: string;
  language: string;
  platforms: string[];
  dominantColor: string;
  sizes: string[];
  canvaUrl: string;
  photoUrl?: string;
  photoDims?: { width: number; height: number };
  csvFileName?: string;
};

export const COLOR_SWATCH: Record<string, { bg: string; light: boolean }> = {
  Black: { bg: "bg-neutral-900", light: false },
  White: { bg: "bg-neutral-100", light: true },
  Grey: { bg: "bg-neutral-400", light: false },
  Red: { bg: "bg-brand", light: false },
  Orange: { bg: "bg-orange-500", light: false },
  Yellow: { bg: "bg-yellow-400", light: true },
  Green: { bg: "bg-emerald-600", light: false },
  Blue: { bg: "bg-blue-700", light: false },
  Purple: { bg: "bg-purple-700", light: false },
  Pink: { bg: "bg-pink-500", light: false },
};

export function emptyDraft(): AdDraft {
  return {
    adName: "",
    mediaType: "image",
    kicker: "",
    headline: "",
    sub: "",
    cta: "",
    description: "",
    category: CATEGORY_OPTIONS[0],
    market: MARKET_OPTIONS[1],
    language: LANGUAGE_OPTIONS[0],
    platforms: ["META"],
    dominantColor: DOMINANT_COLORS[0].name,
    sizes: [],
    canvaUrl: "",
  };
}

const DRAFT_KEY = "adplaylist_ad_draft";

export function saveDraft(draft: AdDraft) {
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraft(): AdDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  window.sessionStorage.removeItem(DRAFT_KEY);
}

// The shape both the preview card and the create-ad request use, so what the
// designer previews is exactly what gets published.
export function draftToAd(draft: AdDraft): Omit<Ad, "id" | "createdAt"> {
  const swatch = COLOR_SWATCH[draft.dominantColor] ?? COLOR_SWATCH.Black;
  return {
    title: draft.adName,
    format: draft.sizes[0] ?? "Feed 1:1",
    variant: "overlay",
    eyebrow: draft.kicker || undefined,
    headline: draft.headline || "Your headline goes here.",
    sub: draft.sub || undefined,
    cta: draft.cta || undefined,
    description: draft.description || undefined,
    mediaType: draft.mediaType,
    swatch: swatch.bg,
    light: swatch.light,
    category: draft.category,
    market: draft.market,
    language: draft.language,
    platforms: draft.platforms,
    photo: draft.photoUrl,
    editable: false,
    canvaUrl: draft.canvaUrl || undefined,
    dominantColor: draft.dominantColor,
  };
}

// Turns a published ad back into a draft so an admin can edit it. The API
// only stores the first placement size (as `format`), so that's all that
// comes back.
export function adToDraft(ad: Ad): AdDraft {
  const dominantColor =
    ad.dominantColor ??
    Object.keys(COLOR_SWATCH).find((name) => COLOR_SWATCH[name].bg === ad.swatch) ??
    DOMINANT_COLORS[0].name;
  return {
    adName: ad.title,
    mediaType: ad.mediaType,
    kicker: ad.eyebrow ?? "",
    headline: ad.headline,
    sub: ad.sub ?? "",
    cta: ad.cta ?? "",
    description: ad.description ?? "",
    category: ad.category,
    market: ad.market,
    language: ad.language,
    platforms: ad.platforms,
    dominantColor,
    sizes: SIZE_OPTIONS.some((s) => s.name === ad.format) ? [ad.format] : [],
    canvaUrl: ad.canvaUrl ?? "",
    photoUrl: ad.photo,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function parseCsvRows(text: string): string[][] {
  return text
    .replace(/^﻿/, "")
    .split(/\r\n|\n|\r/)
    .filter((l) => l.trim().length > 0)
    .map(parseCsvLine);
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Maps normalized column/field labels (spaces and case stripped) to the
// canonical keys used by applyCsvToDraft below.
const FIELD_ALIASES: Record<string, string> = {
  adname: "adname",
  mediatype: "mediatype",
  kicker: "kicker",
  headline: "headline",
  sub: "sub",
  subheadline: "sub",
  supportingline: "sub",
  cta: "cta",
  calltoaction: "cta",
  description: "description",
  category: "category",
  market: "market",
  language: "language",
  platforms: "platforms",
  platform: "platforms",
  sizes: "sizes",
  size: "sizes",
  placementsizes: "sizes",
  dominantcolor: "dominantcolor",
  dominantcolour: "dominantcolor",
  canvaurl: "canvaurl",
  canvalink: "canvaurl",
  canvatemplatelink: "canvaurl",
};

function canonicalKey(label: string): string | undefined {
  return FIELD_ALIASES[normalizeKey(label)];
}

// Accepts either a "wide" CSV (one header row of field names, one data row
// of values) or a "long" CSV with two columns (e.g. "Field,Answer") and one
// row per field — the shape a lot of research/export tools produce.
function parseAdCsv(text: string): Record<string, string> {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return {};

  const headerCells = rows[0].map(normalizeKey);
  const isLongFormat =
    headerCells.length === 2 &&
    headerCells[0] === "field" &&
    headerCells[1] === "answer";

  const fields: Record<string, string> = {};

  if (isLongFormat) {
    for (const row of rows.slice(1)) {
      const [label, value] = row;
      if (!label) continue;
      const key = canonicalKey(label);
      if (key) fields[key] = (value ?? "").trim();
    }
  } else {
    const values = rows[1] ?? [];
    rows[0].forEach((label, i) => {
      const key = canonicalKey(label);
      if (key) fields[key] = (values[i] ?? "").trim();
    });
  }

  return fields;
}

function findOption(options: string[], value: string): string | undefined {
  const norm = value.trim().toLowerCase();
  return options.find((o) => o.toLowerCase() === norm);
}

function normalizeDims(s: string): string | null {
  const m = s.match(/(\d+)\s*[x×X]\s*(\d+)/);
  return m ? `${m[1]}x${m[2]}` : null;
}

// Matches a size token by exact name first ("Feed square"), then falls back
// to matching by dimensions so labels like "Square 1200×1200" still resolve
// to the "Marketplace / Messenger" (1200 × 1200) option.
function matchSizeOption(token: string): string | undefined {
  const t = token.trim();
  const byName = SIZE_OPTIONS.find((s) => s.name.toLowerCase() === t.toLowerCase());
  if (byName) return byName.name;
  const dims = normalizeDims(t);
  if (!dims) return undefined;
  return SIZE_OPTIONS.find((s) => normalizeDims(s.dims) === dims)?.name;
}

// Returns a copy of `base` with every recognized CSV field applied, plus how
// many fields matched so the caller can reject a CSV with no known columns.
export function applyCsvToDraft(
  text: string,
  base: AdDraft
): { draft: AdDraft; matched: number; empty: boolean } {
  const row = parseAdCsv(text);
  const draft = { ...base };
  if (Object.keys(row).length === 0) return { draft, matched: 0, empty: true };
  let matched = 0;

  if (row.adname) {
    draft.adName = row.adname;
    matched++;
  }
  const mediaTypeVal = row.mediatype?.trim().toLowerCase();
  if (mediaTypeVal === "image" || mediaTypeVal === "video") {
    draft.mediaType = mediaTypeVal;
    matched++;
  }
  for (const key of ["kicker", "headline", "sub", "cta", "description"] as const) {
    if (row[key]) {
      draft[key] = row[key];
      matched++;
    }
  }
  const categoryVal = row.category ? findOption(CATEGORY_OPTIONS, row.category) : undefined;
  if (categoryVal) {
    draft.category = categoryVal;
    matched++;
  }
  const marketVal = row.market ? findOption(MARKET_OPTIONS, row.market) : undefined;
  if (marketVal) {
    draft.market = marketVal;
    matched++;
  }
  const languageVal = row.language ? findOption(LANGUAGE_OPTIONS, row.language) : undefined;
  if (languageVal) {
    draft.language = languageVal;
    matched++;
  }
  if (row.platforms) {
    const list = row.platforms
      .split(/[;|]/)
      .map((v) => findOption(PLATFORM_OPTIONS, v))
      .filter((v): v is string => !!v);
    if (list.length) {
      draft.platforms = list;
      matched++;
    }
  }
  if (row.sizes) {
    const list = row.sizes
      .split(/[;|]/)
      .map((v) => matchSizeOption(v))
      .filter((v): v is string => !!v);
    if (list.length) {
      draft.sizes = list;
      matched++;
    }
  }
  const dominantColorVal = row.dominantcolor
    ? findOption(
        DOMINANT_COLORS.map((c) => c.name),
        row.dominantcolor
      )
    : undefined;
  if (dominantColorVal) {
    draft.dominantColor = dominantColorVal;
    matched++;
  }
  if (row.canvaurl) {
    draft.canvaUrl = row.canvaurl;
    matched++;
  }

  return { draft, matched, empty: false };
}
