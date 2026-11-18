import type { Metadata } from "next";
import { randomInt } from "node:crypto";
import { connection } from "next/server";
import PublicLibraryView from "@/components/PublicLibraryView";
import { api, libraryQuery, type LibraryPage } from "@/lib/api";
import { findCategory } from "@/lib/categories";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "Browse ready-made ad creatives for Meta, TikTok, Google and more — filter by platform, category, market and language, and see each ad's copy and creative details.";

export const metadata: Metadata = {
  title: "Ads – ready-made ad creatives",
  description: DESCRIPTION,
  alternates: { canonical: "/library" },
  openGraph: {
    title: `Ads – ready-made ad creatives · ${SITE_NAME}`,
    description: DESCRIPTION,
    url: "/library",
    siteName: SITE_NAME,
    type: "website",
  },
};

// Public: anyone can browse the library and open any ad, without signing in.
// Signed-in clients are sent on to their own /library/<name> (see
// PublicLibraryView).
export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  // Per request, for the shuffle below.
  await connection();
  const { tag, q, category } = await searchParams;
  // A new random order on every visit, so the same ads aren't always first.
  // The server shuffles with this seed, and the browser sends it back while
  // paging so the order holds. Only the first page (for a visitor: the
  // preview) is fetched; the browser asks for the rest.
  const seed = randomInt(2 ** 31 - 1);
  const tags = Array.isArray(tag) ? tag : tag ? [tag] : [];
  const keyword = typeof q === "string" ? q : "";
  const categories =
    typeof category === "string" ? [findCategory(category) ?? category] : [];
  const page: LibraryPage | undefined = await api
    .getLibraryPage(
      libraryQuery({ keyword, tags, categories }, { page: 1, pageSize: 20, seed })
    )
    .catch(() => undefined);
  const ads = page?.ads ?? [];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ads",
    description: DESCRIPTION,
    url: `${SITE_URL}/library`,
    mainEntity: {
      "@type": "ItemList",
      // The ads on this page; every ad is in the sitemap.
      numberOfItems: ads.length,
      itemListElement: ads.map((ad, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/ads/${ad.id}`,
        name: ad.title,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <PublicLibraryView
        page={page}
        seed={seed}
        initialTags={tag}
        initialQuery={typeof q === "string" ? q : undefined}
        initialCategory={typeof category === "string" ? category : undefined}
      />
    </>
  );
}
