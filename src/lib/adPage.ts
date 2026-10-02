import type { Ad, BlogPost } from "@/lib/api";

// Shared by the ad page's metadata (server) and its view (client), so the
// <title>, H1 and structured data always agree. Every SEO field is
// optional: older ads fall back to values built from their details.

const clip = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

export function adPageTitle(ad: Ad) {
  return ad.seoTitle || `${ad.title} – ${ad.category} ad creative`;
}

export function adPageHeadline(ad: Ad) {
  return ad.pageHeadline || ad.title;
}

// The meta description: the one written for the page, else the most
// descriptive copy the ad has, trimmed to a snippet's length.
export function adPageDescription(ad: Ad) {
  if (ad.metaDescription) return ad.metaDescription;
  return clip(
    ad.introParagraph ||
      ad.creativeDescription ||
      ad.description ||
      ad.primaryText ||
      ad.headline ||
      ad.title,
    160
  );
}

export function adImageAlt(ad: Ad) {
  return ad.imageAlt || `${ad.title} – ${ad.category} ad creative`;
}

// "Meta" rather than the stored "META", for headings and specs.
export function platformLabel(platform: string) {
  return platform.toUpperCase() === "META" ? "Meta" : platform;
}

export const formatSlug = (format: string) => format.toLowerCase();

// "What is a … ad?" — a short definition per creative format, shown on every
// ad page of that format (prototype element 18).
export const FORMAT_DEFINITIONS: Record<string, { question: string; answer: string }> = {
  "Feature callouts": {
    question: "What is a feature callout ad?",
    answer:
      "A feature callout ad is a static image that shows a single product with short text labels pointing to its key features or benefits, usually joined to the product by thin lines. It explains several selling points at a glance without a long caption, which is why it's common for supplements, skincare, electronics and kitchenware.",
  },
  "Product shot": {
    question: "What is a product shot ad?",
    answer:
      "A product shot ad puts the product itself at the centre of the frame, usually on a clean or styled background with little text. It works best when the packaging or product is distinctive enough to stop the scroll and the viewer already understands what it does.",
  },
  Lifestyle: {
    question: "What is a lifestyle ad?",
    answer:
      "A lifestyle ad shows the product being used in a real setting by the kind of person who buys it. Instead of listing features, it sells the feeling or outcome of owning the product, which makes it a strong fit for fashion, home, travel and wellness brands.",
  },
  UGC: {
    question: "What is a UGC ad?",
    answer:
      "A UGC (user-generated content) ad looks like something a real customer posted: phone-quality photos, casual wording and a personal point of view. Because it blends into the feed and reads as genuine experience, it often earns more trust than a polished brand ad.",
  },
  Testimonial: {
    question: "What is a testimonial ad?",
    answer:
      "A testimonial ad uses a real customer's words, such as a review, quote or comment, as the main message. It answers a buyer's doubts with social proof rather than brand claims, and works especially well when the testimonial is specific about who the customer is and what changed for them.",
  },
  "Before / After": {
    question: "What is a before and after ad?",
    answer:
      "A before and after ad shows the same subject in two states side by side, so the result of using the product is visible at a glance. It's common in skincare, cleaning, fitness and home improvement, but claims shown must be realistic and typical to stay within ad platform policies.",
  },
  Comparison: {
    question: "What is a comparison ad?",
    answer:
      "A comparison ad sets the product against an alternative, such as a competitor, the old way of doing things or a cheaper option, usually in a two-column layout or table. It helps buyers who are already weighing options see quickly why this one is the better choice.",
  },
  "Offer / Discount": {
    question: "What is an offer ad?",
    answer:
      "An offer ad leads with a deal, such as a percentage off, free shipping or a first-order discount, as the main hook. It's built to convert people who already know the brand or are close to buying, and works best with a clear deadline or condition.",
  },
  Listicle: {
    question: "What is a listicle ad?",
    answer:
      "A listicle ad presents the product's benefits or reasons to buy as a short numbered list, like an article headline (\"5 reasons…\"). The list format is easy to scan in a feed and lets one creative answer several objections at once.",
  },
  Meme: {
    question: "What is a meme ad?",
    answer:
      "A meme ad borrows a familiar meme format or internet joke and adapts it to the product or the buyer's problem. It feels native to social feeds and is highly shareable, but depends on the meme still being recognisable to the audience.",
  },
};

// Meta's image placements (prototype element 20), shown on Meta ads as a
// real <table> so it can appear as a table snippet.
export const META_IMAGE_SPECS = [
  { placement: "Feed", ratio: "1:1 or 4:5", size: "1080×1080 / 1080×1350" },
  { placement: "Marketplace", ratio: "1:1", size: "1200×1200" },
  { placement: "Messenger inbox", ratio: "1:1", size: "1200×1200" },
  { placement: "Stories & Reels", ratio: "9:16", size: "1080×1920" },
];

export type RelatedGuide = { title: string; href?: string; excerpt?: string };

// Turns the CSV's "Related guides" (blog titles or URLs) into links for the
// ones that match a published post, by slug or title. Unmatched entries are
// kept as plain text so the list still reads as written.
export function resolveGuides(entries: string[] | undefined, posts: BlogPost[]): RelatedGuide[] {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return (entries ?? []).map((entry) => {
    const slug = entry.match(/\/blog\/([^/?#]+)/)?.[1];
    const post = posts.find(
      (p) => (slug && p.slug === slug) || norm(p.title) === norm(entry) || p.slug === entry
    );
    return post
      ? { title: post.title, href: `/blog/${post.slug}`, excerpt: post.excerpt }
      : { title: entry };
  });
}

const isoDay = (d: string | undefined) => (d ? d.slice(0, 10) : undefined);

export function adDates(ad: Ad) {
  return {
    added: isoDay(ad.dateAdded) ?? isoDay(ad.createdAt),
    updated: isoDay(ad.dateUpdated),
  };
}

// "1 Oct 2026", fixed to UTC and en-GB so the server and browser render the
// same text.
export function formatDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
