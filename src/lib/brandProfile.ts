import { parseCsvRows } from "@/lib/adDraft";
import { slugify } from "@/lib/slug";

// The content of a brand page made from a brand CSV. Mirrors the backend's
// types (adplaylist-be/src/lib/brandProfile.ts), which cleans it on save.
// Every part is optional; the page leaves out a section with nothing in it.
export type BrandProfileAd = {
  // Copied from a real, running ad; otherwise a new concept made for the page.
  live: boolean;
  label?: string;
  cta?: string;
  // Shown next to "Sponsored", e.g. Story or Carousel.
  format?: string;
  // A finished creative. Without one the ad is drawn from the fields below.
  image?: string;
  alt?: string;
  layout?: BrandAdLayout;
  eyebrow?: string;
  headline?: string;
  subline?: string;
  bigNumber?: string;
  photo?: string;
  photoCredit?: string;
  footer?: string;
  servicesLine?: string;
  townsLine?: string;
  button?: string;
  phone?: string;
  // Sent to visitors without access, in place of the creative.
  locked?: boolean;
};

export type BrandAdLayout = "hook" | "proof" | "local";

export type BrandProfile = {
  category?: string;
  city?: string;
  state?: string;
  country?: string;
  logo?: string;
  intro?: string;
  recommendPct?: string;
  reviewCount?: string;
  // A short credential shown with the reviews, e.g. "Licensed WA & OR".
  highlight?: string;
  contact?: { website?: string; mobile?: string; email?: string; messenger?: string };
  colors?: { primary?: string; secondary?: string };
  ads?: BrandProfileAd[];
  serviceArea?: { title?: string; towns?: string[] };
  brief?: { services?: string; audience?: string; proof?: string; cta?: string };
  services?: string[];
  similar?: {
    subtitle?: string;
    companies?: { name: string; city?: string; logo?: string; ads?: string[] }[];
  };
  about?: { title?: string; paragraphs?: string[] };
  why?: { title?: string; points?: { title: string; text: string }[] };
  faq?: { q: string; a: string }[];
  footerCta?: { text?: string };
  breadcrumb?: string[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    schemaType?: string;
  };
};

// A new concept's layout, from its "Layout" row or else from which fields
// were filled in: a big number is social proof, an eyebrow is a hook.
export function brandAdLayout(ad: BrandProfileAd): BrandAdLayout {
  if (ad.layout) return ad.layout;
  if (ad.bigNumber) return "proof";
  if (ad.eyebrow || ad.subline) return "hook";
  return "local";
}

export function isImageUrl(value: string | undefined): value is string {
  return !!value && /^https?:\/\//.test(value);
}

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const split = (value: string, separator: string | RegExp) =>
  value
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean);

const AD_FIELDS: Record<string, keyof BrandProfileAd> = {
  imagefile: "image",
  imagealttext: "alt",
  cardlabel: "label",
  ctabutton: "cta",
  format: "format",
  eyebrow: "eyebrow",
  headline: "headline",
  subline: "subline",
  bignumber: "bigNumber",
  photo: "photo",
  photocredit: "photoCredit",
  footer: "footer",
  servicesline: "servicesLine",
  townsline: "townsLine",
  onimagebutton: "button",
  onimagephone: "phone",
};

export type BrandCsvImport = {
  brandName: string;
  slug: string;
  heading: string;
  ctaLabel: string;
  profile: BrandProfile;
};

// Reads a filled-in brand CSV (Section, Field, Answer, Notes; one row per
// field). Rows are found by their section and field names, so their order
// doesn't matter and empty answers are skipped. Null if the file isn't one.
export function parseBrandCsv(text: string): BrandCsvImport | null {
  const rows = parseCsvRows(text);
  const header = (rows[0] ?? []).map(key);
  const sectionCol = header.indexOf("section");
  const fieldCol = header.indexOf("field");
  const answerCol = header.indexOf("answer");
  if (sectionCol === -1 || fieldCol === -1 || answerCol === -1) return null;

  const values = new Map<string, string>();
  for (const row of rows.slice(1)) {
    const answer = (row[answerCol] ?? "").trim();
    if (answer) values.set(`${key(row[sectionCol] ?? "")}.${key(row[fieldCol] ?? "")}`, answer);
  }
  const get = (section: string, field: string) => values.get(`${section}.${field}`) ?? "";
  // Numbered fields ("Paragraph 1", "Q3") and sections ("Ad 2"), in order.
  const numbered = (prefix: string) =>
    [
      ...new Set(
        [...values.keys()]
          .map((k) => k.match(new RegExp(`^${prefix}(\\d+)`))?.[1])
          .filter((n): n is string => !!n)
      ),
    ].sort((a, b) => Number(a) - Number(b));

  const brandName = get("basics", "companyname");
  if (!brandName) return null;

  const ads = numbered("ad").map((n) => {
    const ad: BrandProfileAd = { live: key(get(`ad${n}`, "status")) === "live" };
    for (const [field, prop] of Object.entries(AD_FIELDS)) {
      const value = get(`ad${n}`, field);
      if (value) (ad as Record<string, unknown>)[prop] = value;
    }
    const layout = key(get(`ad${n}`, "layout"));
    if (layout === "hook" || layout === "proof" || layout === "local") ad.layout = layout;
    return ad;
  });

  const profile: BrandProfile = {
    category: get("basics", "category"),
    city: get("basics", "city"),
    state: get("basics", "state"),
    country: get("basics", "country"),
    logo: get("basics", "logofile"),
    intro: get("basics", "introtext"),
    recommendPct: get("basics", "recommend").replace(/%/g, ""),
    reviewCount: get("basics", "reviewcount"),
    highlight: get("basics", "highlight"),
    contact: {
      website: get("contact", "website"),
      mobile: get("contact", "mobile"),
      email: get("contact", "email"),
      messenger: get("contact", "messenger"),
    },
    colors: {
      primary: get("brand", "primarycolor"),
      secondary: get("brand", "secondarycolor"),
    },
    ads,
    serviceArea: {
      title: get("servicearea", "sectiontitle"),
      towns: split(get("servicearea", "towns"), ";"),
    },
    brief: {
      services: get("creativebrief", "servicestofeature"),
      audience: get("creativebrief", "audience"),
      proof: get("creativebrief", "proof"),
      cta: get("creativebrief", "primarycta"),
    },
    services: split(get("services", "allservices"), ";"),
    similar: {
      subtitle: get("similarcompanies", "sectionsubtitle"),
      companies: numbered("similarcompanies\\.company")
        .map((n) => ({
          name: get("similarcompanies", `company${n}name`),
          city: get("similarcompanies", `company${n}city`),
          logo: get("similarcompanies", `company${n}logo`),
          ads: split(get("similarcompanies", `company${n}adimages`), ","),
        }))
        .filter((c) => c.name),
    },
    about: {
      title: get("about", "sectiontitle"),
      paragraphs: numbered("about\\.paragraph").map((n) => get("about", `paragraph${n}`)),
    },
    why: {
      title: get("whyitworks", "sectiontitle"),
      points: numbered("whyitworks\\.point").map((n) => ({
        title: get("whyitworks", `point${n}title`),
        text: get("whyitworks", `point${n}text`),
      })),
    },
    faq: numbered("faq\\.q")
      .map((n) => ({ q: get("faq", `q${n}`), a: get("faq", `a${n}`) }))
      .filter((f) => f.q && f.a),
    footerCta: { text: get("footercta", "text") },
    // The last crumb is the company itself; the page adds that.
    breadcrumb: split(get("linking", "breadcrumb"), "/").slice(0, -1),
    seo: {
      title: get("seo", "seotitle"),
      description: get("seo", "metadescription"),
      keywords: get("seo", "keywords"),
      ogTitle: get("seo", "ogtitle"),
      ogDescription: get("seo", "ogdescription"),
      ogImage: get("seo", "ogimage"),
      schemaType: get("seo", "schematype"),
    },
  };

  return {
    brandName,
    slug: slugify(get("seo", "urlslug")),
    heading: get("seo", "pageheadlineh1"),
    ctaLabel: get("footercta", "button"),
    profile,
  };
}

// The image slots of a profile, as [value, setter] pairs.
function imageSlots(profile: BrandProfile): [string | undefined, (v: string) => void][] {
  const slots: [string | undefined, (v: string) => void][] = [
    [profile.logo, (v) => (profile.logo = v)],
    [profile.seo?.ogImage, (v) => (profile.seo = { ...profile.seo, ogImage: v })],
  ];
  for (const ad of profile.ads ?? []) {
    slots.push([ad.image, (v) => (ad.image = v)]);
    slots.push([ad.photo, (v) => (ad.photo = v)]);
  }
  for (const company of profile.similar?.companies ?? []) {
    slots.push([company.logo, (v) => (company.logo = v)]);
    (company.ads ?? []).forEach((src, i) => slots.push([src, (v) => (company.ads![i] = v)]));
  }
  return slots;
}

// The CSV names image files ("assets/logo.png") that still have to be
// uploaded: every one that isn't a web address yet.
export function missingBrandImages(profile: BrandProfile): string[] {
  return [
    ...new Set(
      imageSlots(profile)
        .map(([value]) => value)
        .filter((v): v is string => !!v && !isImageUrl(v))
    ),
  ];
}

// A copy of the profile with every use of each named file swapped for its
// uploaded address. Files match by name, whatever folder the CSV put them in.
export function withBrandImages(
  profile: BrandProfile,
  uploaded: Record<string, string>
): BrandProfile {
  const copy: BrandProfile = structuredClone(profile);
  const fileName = (path: string) => path.split(/[\\/]/).pop()!.toLowerCase();
  for (const [value, set] of imageSlots(copy)) {
    const url = value && !isImageUrl(value) ? uploaded[fileName(value)] : undefined;
    if (url) set(url);
  }
  return copy;
}
