import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { api } from "@/lib/api";
import { LOCALES, LOCALE_TAGS, siteUrlFor } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Built per request so newly published posts are listed straight away.
  await connection();
  const [posts, ads, authors] = await Promise.all([
    api
      .getPublicBlogPosts()
      .then((res) => res.posts)
      .catch(() => []),
    api
      .getAds()
      .then((res) => res.ads)
      .catch(() => []),
    api
      .getAuthors()
      .then((res) => res.authors)
      .catch(() => []),
  ]);

  return [
    // The home page is the one page translated so far: one entry per
    // language subdomain, each listing the others.
    ...LOCALES.map((locale) => ({
      url: `${siteUrlFor(locale)}/`,
      changeFrequency: "weekly" as const,
      priority: 1,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l].lang, `${siteUrlFor(l)}/`])),
      },
    })),
    { url: `${SITE_URL}/library`, changeFrequency: "daily", priority: 0.9 },
    ...ads.map((ad) => ({
      url: `${SITE_URL}/ads/${ad.id}`,
      lastModified: ad.dateUpdated ?? ad.dateAdded ?? ad.createdAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: ad.photo ? [ad.photo] : undefined,
    })),
    // Only authors with ads: an empty profile isn't worth indexing.
    ...authors
      .filter((author) => (author.adCount ?? 0) > 0)
      .map((author) => ({
        url: `${SITE_URL}/authors/${author.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    { url: `${SITE_URL}/blog`, changeFrequency: "daily", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
