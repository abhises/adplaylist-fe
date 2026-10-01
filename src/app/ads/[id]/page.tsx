import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import AdDetailView from "@/components/AdDetailView";
import { api, ApiError, type Ad } from "@/lib/api";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";

// Public and indexable: an ad's page is rendered on the server with all its
// details, so it can be found through search. Nothing here exposes the
// editable copy — the API leaves it out for visitors.
async function getAd(slug: string): Promise<Ad | null> {
  try {
    return (await api.getAd(slug)).ad;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// What search results and link previews show: the most descriptive copy the
// ad has, trimmed to a snippet's length.
function summary(ad: Ad) {
  const text =
    ad.creativeDescription || ad.description || ad.primaryText || ad.headline || ad.title;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 157).trimEnd()}…` : flat;
}

export async function generateMetadata({ params }: PageProps<"/ads/[id]">): Promise<Metadata> {
  const { id } = await params;
  const ad = await getAd(id);
  if (!ad) return { title: "Ad not found" };
  const url = `/ads/${ad.id}`;
  const title = `${ad.title} – ${ad.category} ad creative`;
  const description = summary(ad);
  return {
    title,
    description,
    keywords: ad.tags,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      images: ad.photo ? [{ url: ad.photo, alt: ad.title }] : undefined,
    },
    twitter: {
      card: ad.photo ? "summary_large_image" : "summary",
      title,
      description,
      images: ad.photo ? [ad.photo] : undefined,
    },
  };
}

export default async function AdPage({ params }: PageProps<"/ads/[id]">) {
  await connection();
  const { id } = await params;
  const [ad, ads] = await Promise.all([
    getAd(id),
    api
      .getAds()
      .then((res) => res.ads)
      .catch(() => [] as Ad[]),
  ]);
  if (!ad) notFound();

  const url = `${SITE_URL}/ads/${ad.id}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: ad.title,
    headline: ad.headline,
    description: summary(ad),
    url,
    image: ad.photo ? [ad.photo] : undefined,
    genre: ad.category,
    keywords: ad.tags?.join(", "),
    inLanguage: ad.language,
    dateCreated: ad.createdAt,
    isPartOf: { "@type": "CollectionPage", name: "Ads", url: `${SITE_URL}/library` },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ads", item: `${SITE_URL}/library` },
      { "@type": "ListItem", position: 2, name: ad.title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbs)} />
      {/* Keyed by ad so moving between ads starts fresh. */}
      <AdDetailView key={ad.id} initialAd={ad} initialAds={ads} />
    </>
  );
}
