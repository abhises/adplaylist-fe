import {
  AD_FORMAT_OPTIONS,
  CATEGORY_OPTIONS,
  DOMINANT_COLORS,
  LANGUAGE_OPTIONS,
  MARKET_OPTIONS,
  PLATFORM_OPTIONS,
  SIZE_OPTIONS,
  type Ad,
} from "@/lib/ads";
import type { AdContent, Author } from "@/lib/api";

// An ad that has been filled from the Add ad page but not yet published.
// It lives in sessionStorage so /add-ad and /add-ad/preview can hand it back
// and forth without the backend knowing about drafts.
export type AdDraft = {
  adName: string;
  mediaType: "image" | "video";
  primaryText: string;
  brandName: string;
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
  creativeDescription: string;
  tags: string[];
  canvaUrl: string;
  photoUrl?: string;
  photoDims?: { width: number; height: number };
  csvFileName?: string;

  // SEO page fields. Empty ones fall back to generated values on the page.
  slug: string;
  subcategory: string;
  adFormat: string;
  onImageText: string;
  seoTitle: string;
  metaDescription: string;
  pageHeadline: string;
  introParagraph: string;
  imageFileName: string;
  imageAlt: string;
  imageCaption: string;
  content: DraftContent;
  // Credited authors, by slug. The CSV names them; authorName/reviewerName
  // keep that name until it's matched to an author (see matchAuthor).
  authorSlug: string;
  reviewerSlug: string;
  authorName?: string;
  reviewerName?: string;
  // "YYYY-MM-DD"; empty means today when the ad is saved.
  dateAdded: string;
  dateUpdated: string;
};

// AdContent with every list at its full length, so the editor can show a
// fixed set of inputs (4 "why it works" points, 5 steps, 5 headline ideas).
export type DraftContent = {
  takeaways: { format: string; bestFor: string; hook: string; reuse: string };
  whyItWorks: { title: string; text: string }[];
  targets: string;
  copywriting: string;
  visualDesign: string;
  adaptSteps: string[];
  platformTips: string;
  headlineIdeas: string[];
  collections: string[];
  relatedGuides: string[];
  popularSearches: string[];
  relatedAds: string[];
};

export const WHY_IT_WORKS_COUNT = 4;
export const ADAPT_STEP_COUNT = 5;
export const HEADLINE_IDEA_COUNT = 5;

function padded(list: string[] | undefined, length: number): string[] {
  return Array.from({ length: Math.max(length, list?.length ?? 0) }, (_, i) => list?.[i] ?? "");
}

export function toDraftContent(content?: AdContent): DraftContent {
  const why = content?.whyItWorks ?? [];
  return {
    takeaways: {
      format: content?.takeaways?.format ?? "",
      bestFor: content?.takeaways?.bestFor ?? "",
      hook: content?.takeaways?.hook ?? "",
      reuse: content?.takeaways?.reuse ?? "",
    },
    whyItWorks: Array.from(
      { length: Math.max(WHY_IT_WORKS_COUNT, why.length) },
      (_, i) => ({ title: why[i]?.title ?? "", text: why[i]?.text ?? "" })
    ),
    targets: content?.targets ?? "",
    copywriting: content?.copywriting ?? "",
    visualDesign: content?.visualDesign ?? "",
    adaptSteps: padded(content?.adaptSteps, ADAPT_STEP_COUNT),
    platformTips: content?.platformTips ?? "",
    headlineIdeas: padded(content?.headlineIdeas, HEADLINE_IDEA_COUNT),
    collections: content?.collections ?? [],
    relatedGuides: content?.relatedGuides ?? [],
    popularSearches: content?.popularSearches ?? [],
    relatedAds: content?.relatedAds ?? [],
  };
}

// The draft's content as the API stores it: blanks dropped.
function fromDraftContent(c: DraftContent): AdContent {
  const list = (l: string[]) => l.map((v) => v.trim()).filter(Boolean);
  return {
    takeaways: c.takeaways,
    whyItWorks: c.whyItWorks.filter((p) => p.title.trim() || p.text.trim()),
    targets: c.targets,
    copywriting: c.copywriting,
    visualDesign: c.visualDesign,
    adaptSteps: list(c.adaptSteps),
    platformTips: c.platformTips,
    headlineIdeas: list(c.headlineIdeas),
    collections: list(c.collections),
    relatedGuides: list(c.relatedGuides),
    popularSearches: list(c.popularSearches),
    relatedAds: list(c.relatedAds),
  };
}

// Finds the author a CSV names in "Added by" / "Reviewed by": by name or
// slug, ignoring case and spacing.
export function matchAuthor(authors: Author[], name: string | undefined): Author | undefined {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const wanted = name ? norm(name) : "";
  if (!wanted) return undefined;
  return authors.find((a) => norm(a.name) === wanted || norm(a.slug) === wanted);
}

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
    primaryText: "",
    brandName: "",
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
    creativeDescription: "",
    tags: [],
    canvaUrl: "",
    slug: "",
    subcategory: "",
    adFormat: "",
    onImageText: "",
    seoTitle: "",
    metaDescription: "",
    pageHeadline: "",
    introParagraph: "",
    imageFileName: "",
    imageAlt: "",
    imageCaption: "",
    content: toDraftContent(),
    authorSlug: "",
    reviewerSlug: "",
    dateAdded: "",
    dateUpdated: "",
  };
}

const DRAFT_KEY = "adplaylist_ad_draft";

export function saveDraft(draft: AdDraft) {
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadDraft(): AdDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    // Drafts saved before the SEO fields existed have no content.
    return { ...emptyDraft(), ...stored, content: toDraftContent(stored.content) };
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
    primaryText: draft.primaryText || undefined,
    brandName: draft.brandName || undefined,
    creativeDescription: draft.creativeDescription || undefined,
    tags: draft.tags,
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
    slug: draft.slug || undefined,
    subcategory: draft.subcategory || undefined,
    adFormat: draft.adFormat || undefined,
    onImageText: draft.onImageText || undefined,
    seoTitle: draft.seoTitle || undefined,
    metaDescription: draft.metaDescription || undefined,
    pageHeadline: draft.pageHeadline || undefined,
    introParagraph: draft.introParagraph || undefined,
    imageFileName: draft.imageFileName || undefined,
    imageAlt: draft.imageAlt || undefined,
    imageCaption: draft.imageCaption || undefined,
    content: fromDraftContent(draft.content),
    authorSlug: draft.authorSlug || undefined,
    reviewerSlug: draft.reviewerSlug || undefined,
    dateAdded: draft.dateAdded || undefined,
    dateUpdated: draft.dateUpdated || undefined,
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
    primaryText: ad.primaryText ?? "",
    brandName: ad.brandName ?? "",
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
    creativeDescription: ad.creativeDescription ?? "",
    tags: ad.tags ?? [],
    canvaUrl: ad.canvaUrl ?? "",
    photoUrl: ad.photo,
    slug: ad.id,
    subcategory: ad.subcategory ?? "",
    adFormat: ad.adFormat ?? "",
    onImageText: ad.onImageText ?? "",
    seoTitle: ad.seoTitle ?? "",
    metaDescription: ad.metaDescription ?? "",
    pageHeadline: ad.pageHeadline ?? "",
    introParagraph: ad.introParagraph ?? "",
    imageFileName: ad.imageFileName ?? "",
    imageAlt: ad.imageAlt ?? "",
    imageCaption: ad.imageCaption ?? "",
    content: toDraftContent(ad.content),
    authorSlug: ad.author?.slug ?? "",
    reviewerSlug: ad.reviewer?.slug ?? "",
    dateAdded: ad.dateAdded ?? "",
    dateUpdated: ad.dateUpdated ?? "",
  };
}

// Splits CSV text into rows of cells. Quoted cells may contain commas,
// doubled quotes and line breaks (long answers in spreadsheet exports).
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
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
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += ch;
    }
  }
  row.push(cur);
  rows.push(row);
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

// Labels are compared on letters and digits only, so "Why it works 1 –
// Title", "Page headline (H1)" and "adName" all have a stable key.
function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Maps normalized column/field labels to the canonical keys used by
// applyCsvToDraft below. Numbered fields ("Headline idea 3") are handled in
// canonicalKey.
const FIELD_ALIASES: Record<string, string> = {
  adname: "adname",
  mediatype: "mediatype",
  primarytext: "primarytext",
  brandname: "brandname",
  brand: "brandname",
  kicker: "kicker",
  headline: "headline",
  sub: "sub",
  subheadline: "sub",
  supportingline: "sub",
  cta: "cta",
  calltoaction: "cta",
  description: "description",
  category: "category",
  subcategory: "subcategory",
  market: "market",
  language: "language",
  platforms: "platforms",
  platform: "platforms",
  sizes: "sizes",
  size: "sizes",
  placementsizes: "sizes",
  dominantcolor: "dominantcolor",
  dominantcolour: "dominantcolor",
  format: "adformat",
  adformat: "adformat",
  creativeformat: "adformat",
  descriptionofthecreative: "creativedescription",
  creativedescription: "creativedescription",
  tags: "tags",
  tag: "tags",
  canvaurl: "canvaurl",
  canvalink: "canvaurl",
  canvatemplatelink: "canvaurl",
  onimagetext: "onimagetext",
  urlslug: "slug",
  slug: "slug",
  seotitle: "seotitle",
  metadescription: "metadescription",
  pageheadlineh1: "pageheadline",
  pageheadline: "pageheadline",
  h1: "pageheadline",
  introparagraph: "introparagraph",
  intro: "introparagraph",
  imagefilename: "imagefilename",
  imagealttext: "imagealt",
  imagealt: "imagealt",
  alttext: "imagealt",
  imagecaption: "imagecaption",
  keytakeawayformat: "takeaway.format",
  keytakeawaybestfor: "takeaway.bestFor",
  keytakeawayhook: "takeaway.hook",
  keytakeawayreuseit: "takeaway.reuse",
  keytakeawayreuse: "takeaway.reuse",
  whothisadtargets: "targets",
  copywritinganalysis: "copywriting",
  visualdesign: "visualdesign",
  platformtips: "platformtips",
  addedbycurator: "author",
  addedby: "author",
  curator: "author",
  author: "author",
  reviewedby: "reviewer",
  reviewer: "reviewer",
  dateadded: "dateadded",
  dateupdated: "dateupdated",
  collections: "collections",
  relatedguides: "relatedguides",
  popularsearches: "popularsearches",
  relatedads: "relatedads",
};

// Labels may carry a word-count hint ("... in 150 words"); it's dropped so
// any count matches the same field.
function canonicalKey(label: string): string | undefined {
  const key = normalizeKey(label).replace(/in\d+words$/, "");
  const why = key.match(/^whyitworks(\d+)(title|text)$/);
  if (why) return `why.${Number(why[1]) - 1}.${why[2]}`;
  const step = key.match(/^howtoadapt(?:step)?(\d+)$/);
  if (step) return `step.${Number(step[1]) - 1}`;
  const idea = key.match(/^headlineidea(\d+)$/);
  if (idea) return `idea.${Number(idea[1]) - 1}`;
  return FIELD_ALIASES[key];
}

// Accepts a "wide" CSV (one header row of field names, one data row of
// values) or a "long" CSV with one row per field. The long form is found by
// its "Field" and "Answer" header cells wherever they sit, so the current
// template (Section,Field,Answer,Notes) and the older Field,Answer both work.
function parseAdCsv(text: string): {
  fields: Record<string, string>;
  unrecognized: string[];
} {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { fields: {}, unrecognized: [] };

  const headerCells = rows[0].map(normalizeKey);
  const fieldCol = headerCells.indexOf("field");
  const answerCol = headerCells.indexOf("answer");
  const isLongFormat = fieldCol !== -1 && answerCol !== -1;

  const fields: Record<string, string> = {};
  // Labels that carry a value but don't map to any field — reported back so
  // a renamed column isn't dropped without anyone noticing.
  const unrecognized: string[] = [];

  function take(label: string, value: string | undefined) {
    const key = canonicalKey(label);
    const v = (value ?? "").trim();
    if (key) fields[key] = v;
    else if (v) unrecognized.push(label.trim());
  }

  if (isLongFormat) {
    for (const row of rows.slice(1)) {
      const label = row[fieldCol];
      if (label) take(label, row[answerCol]);
    }
  } else {
    const values = rows[1] ?? [];
    rows[0].forEach((label, i) => take(label, values[i]));
  }

  return { fields, unrecognized };
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

const splitList = (v: string) =>
  v
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);

// Returns a copy of `base` with every recognized CSV field applied, plus how
// many fields matched so the caller can reject a CSV with no known columns.
export function applyCsvToDraft(
  text: string,
  base: AdDraft
): {
  draft: AdDraft;
  matched: number;
  empty: boolean;
  unrecognized: string[];
} {
  const { fields: row, unrecognized } = parseAdCsv(text);
  const draft: AdDraft = { ...base, content: toDraftContent(fromDraftContent(base.content)) };
  if (Object.keys(row).length === 0 && unrecognized.length === 0)
    return { draft, matched: 0, empty: true, unrecognized };
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
  if (row.primarytext) {
    draft.primaryText = row.primarytext;
    matched++;
  }
  if (row.brandname) {
    draft.brandName = row.brandname;
    matched++;
  }
  if (row.creativedescription) {
    draft.creativeDescription = row.creativedescription;
    matched++;
  }
  if (row.tags) {
    const list = splitList(row.tags);
    if (list.length) {
      draft.tags = list;
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
      .split(/[,;|]/)
      .map((v) => findOption(PLATFORM_OPTIONS, v))
      .filter((v): v is string => !!v);
    if (list.length) {
      draft.platforms = list;
      matched++;
    }
  }
  if (row.sizes) {
    const list = row.sizes
      .split(/[,;|]/)
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
  // The blank template lists every choice in the answer cell ("Testimonial,
  // UGC, …"), so only a single known format is taken.
  const adFormatVal = row.adformat ? findOption(AD_FORMAT_OPTIONS, row.adformat) : undefined;
  if (adFormatVal) {
    draft.adFormat = adFormatVal;
    matched++;
  }

  const textFields = {
    subcategory: "subcategory",
    onimagetext: "onImageText",
    seotitle: "seoTitle",
    metadescription: "metaDescription",
    pageheadline: "pageHeadline",
    introparagraph: "introParagraph",
    imagefilename: "imageFileName",
    imagealt: "imageAlt",
    imagecaption: "imageCaption",
  } as const;
  for (const [csvKey, draftKey] of Object.entries(textFields)) {
    if (row[csvKey]) {
      draft[draftKey] = row[csvKey];
      matched++;
    }
  }
  if (row.slug) {
    draft.slug = row.slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    matched++;
  }
  for (const key of ["dateadded", "dateupdated"] as const) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(row[key] ?? "")) {
      draft[key === "dateadded" ? "dateAdded" : "dateUpdated"] = row[key];
      matched++;
    }
  }
  // Authors are matched to a profile by the page, which has the author list.
  if (row.author) {
    draft.authorName = row.author;
    matched++;
  }
  if (row.reviewer) {
    draft.reviewerName = row.reviewer;
    matched++;
  }

  // Editorial content.
  const c = draft.content;
  for (const [key, value] of Object.entries(row)) {
    if (!value) continue;
    const [kind, a, b] = key.split(".");
    if (kind === "takeaway") {
      c.takeaways[a as keyof DraftContent["takeaways"]] = value;
    } else if (kind === "why") {
      const i = Number(a);
      while (c.whyItWorks.length <= i) c.whyItWorks.push({ title: "", text: "" });
      c.whyItWorks[i][b as "title" | "text"] = value;
    } else if (kind === "step" || kind === "idea") {
      const list = kind === "step" ? c.adaptSteps : c.headlineIdeas;
      const i = Number(a);
      while (list.length <= i) list.push("");
      list[i] = value;
    } else {
      continue;
    }
    matched++;
  }
  const contentText = {
    targets: "targets",
    copywriting: "copywriting",
    visualdesign: "visualDesign",
    platformtips: "platformTips",
  } as const;
  for (const [csvKey, contentKey] of Object.entries(contentText)) {
    if (row[csvKey]) {
      c[contentKey] = row[csvKey];
      matched++;
    }
  }
  const contentLists = {
    collections: "collections",
    relatedguides: "relatedGuides",
    popularsearches: "popularSearches",
    relatedads: "relatedAds",
  } as const;
  for (const [csvKey, contentKey] of Object.entries(contentLists)) {
    const list = row[csvKey] ? splitList(row[csvKey]) : [];
    if (list.length) {
      c[contentKey] = list;
      matched++;
    }
  }

  return { draft, matched, empty: false, unrecognized };
}
