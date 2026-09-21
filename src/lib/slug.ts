// Mirrors the backend's ad-slug generation (adplaylist-be/src/routes/ads.ts)
// so slugs read consistently across the app.
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
