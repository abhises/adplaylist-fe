// The public origin search engines and social previews should point at.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adplaylist.com";

export const SITE_NAME = "Adplaylist";

// Serializes structured data for a <script type="application/ld+json">,
// escaping "<" so a value can never close the script tag.
export function jsonLd(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
