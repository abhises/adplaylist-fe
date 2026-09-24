import type { Ad } from "@/lib/api";

// Brand pages embed library ads with a placeholder, <div data-ad="slug"></div>,
// in their HTML. It's swapped for the full creative (image, copy overlay and
// an Adplaylist watermark) when the page is rendered, so edits to the ad in
// the library show up on every page that embeds it. Styles are the .ad-embed
// rules in globals.css.

const EMBED_RE = /<div data-ad="([a-z0-9-]+)"[^>]*>\s*<\/div>/g;

export function adEmbedSnippet(slugs: string[]) {
  const items = slugs.map((s) => `  <div data-ad="${s}"></div>`).join("\n");
  return slugs.length > 1
    ? `\n<div class="ad-row">\n${items}\n</div>\n`
    : `\n${items.trim()}\n`;
}

export function adEmbedSlugs(html: string): string[] {
  return [...new Set([...html.matchAll(EMBED_RE)].map((m) => m[1]))];
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const WATERMARK = `<div class="ad-embed-watermark" aria-hidden="true">${"<span>ADPLAYLIST</span>".repeat(
  24
)}</div>`;

export function adEmbedHtml(ad: Ad): string {
  const photo = ad.photo && /^https?:\/\//.test(ad.photo) ? ad.photo : null;
  const light = ad.light && !photo;
  return [
    `<figure class="ad-embed${light ? " ad-embed-light" : ""}">`,
    `<div class="ad-embed-frame${photo ? "" : ` ${esc(ad.swatch)}`}">`,
    photo
      ? `<img src="${esc(photo)}" alt="${esc(ad.title)}" loading="lazy" draggable="false" />`
      : "",
    photo ? `<div class="ad-embed-shade"></div>` : "",
    ad.eyebrow ? `<span class="ad-embed-kicker">${esc(ad.eyebrow)}</span>` : "",
    `<div class="ad-embed-copy">`,
    `<p class="ad-embed-headline">${esc(ad.headline)}</p>`,
    ad.sub ? `<p class="ad-embed-sub">${esc(ad.sub)}</p>` : "",
    ad.cta ? `<span class="ad-embed-cta">${esc(ad.cta)}</span>` : "",
    `</div>`,
    WATERMARK,
    `</div>`,
    `</figure>`,
  ].join("");
}

// `html` must already be sanitized; only the placeholders are replaced, with
// markup built from escaped ad fields. Ads that no longer exist are dropped.
export function renderAdEmbeds(html: string, ads: Record<string, Ad>) {
  return html.replace(EMBED_RE, (_, slug: string) =>
    ads[slug] ? adEmbedHtml(ads[slug]) : ""
  );
}
