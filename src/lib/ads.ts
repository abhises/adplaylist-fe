export type { Ad } from "@/lib/api";

export const PLATFORM_OPTIONS = ["META", "Google", "TikTok", "LinkedIn"];

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

export const CATEGORY_OPTIONS = [
  "E-commerce / DTC",
  "Fashion & Apparel",
  "Luxury Fashion",
  "Jewelry & Accessories",
  "Beauty & Skincare",
  "Grooming",
  "Health & Fitness",
  "Mental Wellness",
  "Food & Beverage",
  "Home & Living",
  "Parenting & Baby",
  "Pets",
  "Sustainability & Eco",
  "Travel",
  "Automotive",
  "SaaS & Tech",
  "Apps & Subscriptions",
  "Gaming & Creator",
  "Finance & Fintech",
  "Education & E-learning",
];

export const MARKET_OPTIONS = ["All markets", "UK", "DE", "NL", "FR", "BE", "IT", "ES", "US"];

export const LANGUAGE_OPTIONS = [
  "English (EN)",
  "German (GE)",
  "Dutch (NL)",
  "French (FR)",
  "Italian (IT)",
  "Spanish (ES)",
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

export const TAG_OPTIONS = [
  "auto insurance",
  "price comparison",
  "save money",
  "insurance quote",
  "performance marketing",
  "lead gen",
  "finance offer",
  "discount ad",
];
