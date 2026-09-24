import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrandPageView from "@/components/BrandPageView";
import { adEmbedSlugs, renderAdEmbeds } from "@/lib/adEmbed";
import { api, ApiError, type Ad } from "@/lib/api";

// Public, no login: these pages are linked from outreach emails. Kept out of
// search results so a search for the brand never lands on our pitch page.
async function getPage(slug: string) {
  try {
    const { page } = await api.getPublicBrandPage(slug);
    return page;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Looks up every library ad embedded in the page; ads that were deleted
// since are simply left out.
async function getEmbeddedAds(html: string) {
  const results = await Promise.allSettled(
    adEmbedSlugs(html).map((slug) => api.getAd(slug))
  );
  const ads: Record<string, Ad> = {};
  for (const r of results) {
    if (r.status === "fulfilled") ads[r.value.ad.id] = r.value.ad;
  }
  return ads;
}

export async function generateMetadata({
  params,
}: PageProps<"/brands/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  return {
    title: page ? `${page.heading} · Adplaylist` : "Adplaylist",
    robots: { index: false, follow: false },
  };
}

export default async function BrandPage({ params }: PageProps<"/brands/[slug]">) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();
  const ads = await getEmbeddedAds(page.bodyHtml);

  return (
    <BrandPageView
      heading={page.heading}
      bodyHtml={renderAdEmbeds(page.bodyHtml, ads)}
      ctaLabel={page.ctaLabel}
      slug={page.slug}
    />
  );
}
