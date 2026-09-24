import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrandPageView from "@/components/BrandPageView";
import { api, ApiError } from "@/lib/api";

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

  return (
    <BrandPageView
      heading={page.heading}
      bodyHtml={page.bodyHtml}
      ctaLabel={page.ctaLabel}
      slug={page.slug}
    />
  );
}
