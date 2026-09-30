// The public origin search engines and social previews should point at.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adplaylist.com";

export const SITE_NAME = "Adplaylist";

export const SITE_DESCRIPTION =
  "A library of ready-made ad creatives for Meta, TikTok and more. Open any ad as an editable copy, launch in minutes, or request custom ads from our creative team.";

// Serializes structured data for a <script type="application/ld+json">,
// escaping "<" so a value can never close the script tag.
export function jsonLd(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
