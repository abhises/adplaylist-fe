import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { api } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Built per request so newly published posts are listed straight away.
  await connection();
  const posts = await api
    .getPublicBlogPosts()
    .then((res) => res.posts)
    .catch(() => []);

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "daily", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
