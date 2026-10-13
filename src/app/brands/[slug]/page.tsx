import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrandPageView from "@/components/BrandPageView";
import BrandProfileView from "@/components/BrandProfileView";
import { adEmbedSlugs, renderAdEmbeds } from "@/lib/adEmbed";
import { api, ApiError, type Ad, type BrandPage as BrandPageData } from "@/lib/api";
import { jsonLd, SITE_URL } from "@/lib/site";

// Public, no login: these pages are linked from outreach emails. The ones
// written as HTML are kept out of search results, so a search for the brand
// never lands on our pitch page; the ones made from a brand CSV are written
// to be found, and only show their ads to signed-in visitors and to the
// link with the page's ?key=, which is the one emailed to the brand.
async function getPage(slug: string, key?: string) {
  try {
    const { page } = await api.getPublicBrandPage(slug, key);
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

type Props = PageProps<"/brands/[slug]"> & {
  searchParams: Promise<{ key?: string | string[] }>;
};

async function getPageFor({ params, searchParams }: Props) {
  const [{ slug }, { key }] = await Promise.all([params, searchParams]);
  return getPage(slug, typeof key === "string" ? key : undefined);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const page = await getPageFor(props);
  const seo = page?.profile?.seo;
  if (!page?.profile) {
    return {
      title: page?.heading,
      robots: { index: false, follow: false },
    };
  }
  const description = seo?.description ?? page.profile.intro;
  return {
    // The CSV's title is the whole title, site name included.
    title: seo?.title ? { absolute: seo.title } : page.heading,
    description,
    keywords: seo?.keywords,
    alternates: { canonical: `/brands/${page.slug}` },
    openGraph: {
      title: seo?.ogTitle ?? seo?.title ?? page.heading,
      description: seo?.ogDescription ?? description,
      url: `/brands/${page.slug}`,
      images: seo?.ogImage ? [seo.ogImage] : undefined,
    },
  };
}

// The business and its FAQ, for search engines.
function structuredData(page: BrandPageData) {
  const profile = page.profile!;
  const { contact } = profile;
  const website = contact?.website?.replace(/^https?:\/\//, "");
  const data: object[] = [
    {
      "@context": "https://schema.org",
      "@type": profile.seo?.schemaType ?? "LocalBusiness",
      name: page.brandName,
      url: website ? `https://${website}` : `${SITE_URL}/brands/${page.slug}`,
      telephone: contact?.mobile,
      email: contact?.email,
      logo: profile.logo,
      description: profile.intro,
      address: (profile.city || profile.state) && {
        "@type": "PostalAddress",
        addressLocality: profile.city,
        addressRegion: profile.state,
        addressCountry: profile.country,
      },
      areaServed: profile.serviceArea?.towns,
      makesOffer: profile.services?.map((name) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name },
      })),
    },
  ];
  if (profile.faq?.length) {
    data.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: profile.faq.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    });
  }
  return data;
}

export default async function BrandPage(props: Props) {
  const page = await getPageFor(props);
  if (!page) notFound();

  if (page.profile) {
    return (
      <>
        {structuredData(page).map((data, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
        ))}
        <BrandProfileView
          brandName={page.brandName}
          heading={page.heading}
          ctaLabel={page.ctaLabel}
          slug={page.slug}
          profile={page.profile}
          adsLocked={page.adsLocked}
        />
      </>
    );
  }

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
