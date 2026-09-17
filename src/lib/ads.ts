export type { Ad } from "@/lib/api";

export const PLATFORM_OPTIONS = ["META", "Google", "TikTok", "LinkedIn"];

export const SIZE_OPTIONS = [
  { name: "Feed image", dims: "1080 x 1350" },
  { name: "Feed square", dims: "1080 x 1080" },
  { name: "Stories / Reels", dims: "1080 x 1920" },
  { name: "Marketplace / Messenger", dims: "1200 x 1200" },
  { name: "Horizontal", dims: "1920 x 1080" },
  { name: "Landscape", dims: "1200 x 628" },
  { name: "Portrait (PMax)", dims: "960 x 1200" },
  { name: "Vertical (RDA)", dims: "900 x 1600" },
  { name: "Logo landscape", dims: "1200 x 300" },
  { name: "300 x 250", dims: "300 x 250" },
  { name: "336 x 280", dims: "336 x 280" },
  { name: "Single image", dims: "1200 x 627" },
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
  { name: "Black", hex: "#171717" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Grey", hex: "#8a8a8a" },
  { name: "Red", hex: "#ec3013" },
  { name: "Orange", hex: "#e17a1f" },
  { name: "Yellow", hex: "#e0b620" },
  { name: "Green", hex: "#2f7a4d" },
  { name: "Blue", hex: "#2d5ea8" },
  { name: "Purple", hex: "#6a3fa0" },
  { name: "Pink", hex: "#d5629b" },
];
