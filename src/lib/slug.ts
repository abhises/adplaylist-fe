// Mirrors the backend's ad-slug generation (adplaylist-be/src/routes/ads.ts)
// so slugs read consistently across the app.
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// slugify for a slug field as it's typed: keeps a trailing hyphen, so the
// separator isn't lost before the next word.
export function slugifyTyping(value: string): string {
  const slug = slugify(value);
  return slug && /[^a-z0-9]$/i.test(value) ? `${slug}-` : slug;
}
