import type { Metadata } from "next";
import { connection } from "next/server";
import PublicLibraryView from "@/components/PublicLibraryView";
import { api, type Ad } from "@/lib/api";
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
  // Per request, so newly published ads are listed straight away.
  await connection();
  const { tag, q, category } = await searchParams;
  const ads: Ad[] = await api
    .getAds()
    .then((res) => res.ads)
    .catch(() => []);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ads",
    description: DESCRIPTION,
    url: `${SITE_URL}/library`,
    mainEntity: {
      "@type": "ItemList",
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
        ads={ads}
        initialTags={tag}
        initialQuery={typeof q === "string" ? q : undefined}
        initialCategory={typeof category === "string" ? category : undefined}
      />
    </>
  );
}
