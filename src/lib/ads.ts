export type { Ad } from "@/lib/api";

export const PLATFORM_OPTIONS = ["META", "Google", "TikTok", "LinkedIn"];

// The landing hero's product panel has a tab per platform here, each showing
// up to six ads an admin picked for it in Admin → Home section.
export const HERO_PLATFORMS = ["META", "Google", "LinkedIn"];
export const HERO_PER_PLATFORM = 6;

// The hero platforms an ad runs on, matched case-insensitively and returned
// in their HERO_PLATFORMS spelling.
export function heroPlatformsOf(platforms: string[]) {
  const lower = platforms.map((p) => p.toLowerCase());
  return HERO_PLATFORMS.filter((p) => lower.includes(p.toLowerCase()));
}

// Order and dimension formatting (× not x) match the design's own Format
// list exactly, verified against the rendered .dc.html mockup's DOM.
export const SIZE_OPTIONS = [
  { name: "Horizontal", dims: "1920 × 1080" },
  { name: "Marketplace / Messenger", dims: "1200 × 1200" },
  { name: "Landscape", dims: "1200 × 628" },
  { name: "Single image", dims: "1200 × 627" },
  { name: "Logo landscape", dims: "1200 × 300" },
  { name: "Feed image", dims: "1080 × 1350" },
  { name: "Feed square", dims: "1080 × 1080" },
  { name: "Stories / Reels", dims: "1080 × 1920" },
  { name: "Portrait (PMax)", dims: "960 × 1200" },
  { name: "Vertical (RDA)", dims: "900 × 1600" },
  { name: "336 × 280", dims: "336 × 280" },
  { name: "300 × 250", dims: "300 × 250" },
];

// The full list (and its groups) lives in ./categories.
export { CATEGORY_OPTIONS } from "./categories";

export const ALL_MARKETS = "All markets";
export const MARKET_OPTIONS = [ALL_MARKETS, "UK", "DE", "NL", "FR", "BE", "IT", "ES", "US"];
// The most markets one ad can be in.
export const MAX_MARKETS = 3;

// All of an ad's markets, primary first. Ads from before multiple markets
// (or an older API) only have `market`.
export function adMarkets(ad: { market: string; markets?: string[] }): string[] {
  return ad.markets?.length ? ad.markets : [ad.market];
}

export const LANGUAGE_OPTIONS = [
  "English (EN)",
  "German (GE)",
  "Dutch (NL)",
  "French (FR)",
  "Italian (IT)",
  "Spanish (ES)",
  "Portuguese (PT)",
  "Finnish (FI)",
  "Swedish (SV)",
  "Norwegian (NO)",
  "Danish (DK)",
  "Polish (PL)",
  "Estonian (EE)",
  "Hungarian (HU)",
  "Latvian (LV)",
  "Lithuanian (LT)",
  "Romanian (RO)",
  "Czech (CS)",
  "Slovak (SK)",
  "Slovenian (SL)",
  "Croatian (HR)",
  "Serbian (SR)",
  "Bosnian (BS)",
  "Macedonian (MK)",
  "Bulgarian (BG)",
  "Greek (EL)",
  "Albanian (SQ)",
  "Ukrainian (UK)",
  "Belarusian (BE)",
  "Russian (RU)",
  "Icelandic (IS)",
  "Irish (GA)",
  "Welsh (CY)",
  "Scottish Gaelic (GD)",
  "Breton (BR)",
  "Basque (EU)",
  "Catalan (CA)",
  "Galician (GL)",
  "Luxembourgish (LB)",
  "Maltese (MT)",
  "Faroese (FO)",
  "Northern Sami (SE)",
  "Frisian (FY)",
  "Romansh (RM)",
  "Corsican (CO)",
  "Turkish (TR)",
  "Arabic (AR)",
  "Hebrew (HE)",
  "Persian (FA)",
  "Kurdish (KU)",
  "Pashto (PS)",
  "Armenian (HY)",
  "Georgian (KA)",
  "Azerbaijani (AZ)",
  "Kazakh (KK)",
  "Uzbek (UZ)",
  "Kyrgyz (KY)",
  "Tajik (TG)",
  "Turkmen (TK)",
  "Tatar (TT)",
  "Hindi (HI)",
  "Urdu (UR)",
  "Bengali (BN)",
  "Punjabi (PA)",
  "Gujarati (GU)",
  "Marathi (MR)",
  "Tamil (TA)",
  "Telugu (TE)",
  "Kannada (KN)",
  "Malayalam (ML)",
  "Odia (OR)",
  "Assamese (AS)",
  "Nepali (NE)",
  "Sinhala (SI)",
  "Dhivehi (DV)",
  "Chinese (ZH)",
  "Japanese (JA)",
  "Korean (KO)",
  "Mongolian (MN)",
  "Tibetan (BO)",
  "Vietnamese (VI)",
  "Thai (TH)",
  "Lao (LO)",
  "Khmer (KM)",
  "Burmese (MY)",
  "Indonesian (ID)",
  "Malay (MS)",
  "Filipino/Tagalog (TL)",
  "Javanese (JV)",
  "Sundanese (SU)",
  "Swahili (SW)",
  "Amharic (AM)",
  "Tigrinya (TI)",
  "Somali (SO)",
  "Oromo (OM)",
  "Hausa (HA)",
  "Yoruba (YO)",
  "Igbo (IG)",
  "Zulu (ZU)",
  "Xhosa (XH)",
  "Afrikaans (AF)",
  "Southern Sotho (ST)",
  "Tswana (TN)",
  "Shona (SN)",
  "Kinyarwanda (RW)",
  "Malagasy (MG)",
  "Wolof (WO)",
  "Lingala (LN)",
  "Fula (FF)",
  "Quechua (QU)",
  "Guarani (GN)",
  "Aymara (AY)",
  "Haitian Creole (HT)",
  "Greenlandic (KL)",
  "Maori (MI)",
  "Samoan (SM)",
  "Tongan (TO)",
  "Fijian (FJ)",
  "Hawaiian (HAW)",
];

export const DOMINANT_COLORS = [
  { name: "Black", hex: "#201e1d" },
  { name: "White", hex: "#f3f2f2" },
  { name: "Grey", hex: "#8f8a8a" },
  { name: "Red", hex: "#ec3013" },
  { name: "Orange", hex: "#e07a1f" },
  { name: "Yellow", hex: "#e5c02c" },
  { name: "Green", hex: "#3f8f57" },
  { name: "Blue", hex: "#2f5fa8" },
  { name: "Purple", hex: "#6b4a9e" },
  { name: "Pink", hex: "#d4699a" },
];

export const VIDEO_LENGTH_OPTIONS = ["Under 6s", "6–15s", "15–30s", "30s+"];

// The creative style of an ad ("Format" in the ad CSV). Not the same as the
// ad's `format` field, which is its placement size.
export const AD_FORMAT_OPTIONS = [
  "Feature callouts",
  "Product shot",
  "Lifestyle",
  "UGC",
  "Testimonial",
  "Before / After",
  "Comparison",
  "Offer / Discount",
  "Listicle",
  "Meme",
];

// A copy of `items` in random order (Fisher–Yates), so the library shows ads
// in a different order on each visit.
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
