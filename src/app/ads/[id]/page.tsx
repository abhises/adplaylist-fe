import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import AdDetailView from "@/components/AdDetailView";
import { api, ApiError, type Ad, type Author } from "@/lib/api";
import {
  adDates,
  adImageAlt,
  adPageDescription,
  adPageHeadline,
  adPageTitle,
  resolveGuides,
} from "@/lib/adPage";
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

export async function generateMetadata({ params }: PageProps<"/ads/[id]">): Promise<Metadata> {
  const { id } = await params;
  const ad = await getAd(id);
  if (!ad) return { title: "Ad not found" };
  // Always the current slug, so an old URL that redirects here isn't indexed
  // as a second copy.
  const url = `/ads/${ad.id}`;
  const title = adPageTitle(ad);
  const description = adPageDescription(ad);
  const { added, updated } = adDates(ad);
  const image = ad.photo
    ? [{ url: ad.photo, alt: adImageAlt(ad), width: 1200, height: 1200 }]
    : undefined;
  return {
    title,
    description,
    keywords: ad.tags,
    alternates: { canonical: url },
    authors: ad.author ? [{ name: ad.author.name, url: `/authors/${ad.author.slug}` }] : undefined,
    robots: { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: added,
      modifiedTime: updated ?? added,
      authors: ad.author ? [`${SITE_URL}/authors/${ad.author.slug}`] : undefined,
      tags: ad.tags,
      images: image,
    },
    twitter: {
      card: ad.photo ? "summary_large_image" : "summary",
      title,
      description,
      images: ad.photo ? [{ url: ad.photo, alt: adImageAlt(ad) }] : undefined,
    },
  };
}

function person(author: Author) {
  return {
    "@type": "Person",
    name: author.name,
    url: `${SITE_URL}/authors/${author.slug}`,
    jobTitle: author.jobTitle,
    image: author.photoUrl,
    sameAs: [author.linkedinUrl, author.websiteUrl].filter(Boolean),
  };
}

export default async function AdPage({ params }: PageProps<"/ads/[id]">) {
  await connection();
  const { id } = await params;
  const [ad, ads, posts] = await Promise.all([
    getAd(id),
    // For "More like this" and previous/next: card fields are enough, and
    // the list is cached for a minute rather than fetched on every visit.
    api
      .getLibraryAds({ cached: true })
      .then((res) => res.ads)
      .catch(() => [] as Ad[]),
    api
      .getPublicBlogPosts()
      .then((res) => res.posts)
      .catch(() => []),
  ]);
  if (!ad) notFound();
  // Reached through a slug the ad used to have.
  if (ad.id !== id) permanentRedirect(`/ads/${ad.id}`);

  const url = `${SITE_URL}/ads/${ad.id}`;
  const { added, updated } = adDates(ad);
  const image = ad.photo
    ? {
        "@type": "ImageObject",
        contentUrl: ad.photo,
        url: ad.photo,
        name: adPageHeadline(ad),
        caption: ad.imageCaption || adImageAlt(ad),
        description: adImageAlt(ad),
        width: 1200,
        height: 1200,
        creditText: ad.brandName || SITE_NAME,
        copyrightNotice: ad.brandName
          ? `${ad.brandName}. Shown for reference; trademarks belong to their owners.`
          : undefined,
        acquireLicensePage: `${SITE_URL}/terms`,
        license: `${SITE_URL}/terms`,
      }
    : undefined;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name: adPageTitle(ad),
    headline: adPageHeadline(ad),
    description: adPageDescription(ad),
    inLanguage: ad.language,
    datePublished: added,
    dateModified: updated ?? added,
    author: ad.author ? person(ad.author) : undefined,
    reviewedBy: ad.reviewer ? person(ad.reviewer) : undefined,
    primaryImageOfPage: image,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "CreativeWork",
      name: ad.title,
      headline: ad.headline,
      description: ad.introParagraph || adPageDescription(ad),
      genre: [ad.category, ad.subcategory, ad.adFormat].filter(Boolean),
      keywords: ad.tags?.join(", "),
      inLanguage: ad.language,
      image,
      creator: ad.brandName ? { "@type": "Organization", name: ad.brandName } : undefined,
      dateCreated: added,
    },
  };

  const crumbs = [
    { name: "Ad library", item: `${SITE_URL}/library` },
    {
      name: ad.category,
      item: `${SITE_URL}/library?category=${encodeURIComponent(ad.category)}`,
    },
    ...(ad.subcategory
      ? [
          {
            name: ad.subcategory,
            item: `${SITE_URL}/library?q=${encodeURIComponent(ad.subcategory)}`,
          },
        ]
      : []),
    { name: adPageHeadline(ad), item: url },
  ];
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.item,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbs)} />
      {/* Keyed by ad so moving between ads starts fresh. */}
      <AdDetailView
        key={ad.id}
        initialAd={ad}
        initialAds={ads}
        guides={resolveGuides(ad.content?.relatedGuides, posts)}
      />
    </>
  );
}
