import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostView from "@/components/BlogPostView";
import { adEmbedSlugs, renderAdEmbeds } from "@/lib/adEmbed";
import { api, ApiError, type Ad } from "@/lib/api";

// Public, no login. Unlike brand pages, posts are meant to be found through
// search, so they're indexable.
async function getPost(slug: string) {
  try {
    const { post } = await api.getPublicBlogPost(slug);
    return post;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Looks up every library ad embedded in the post; ads that were deleted
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
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Blog · Adplaylist" };
  return {
    title: `${post.title} · Adplaylist`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const html = post.bodyHtml ?? "";
  const ads = await getEmbeddedAds(html);

  return (
    <BlogPostView
      title={post.title}
      excerpt={post.excerpt}
      coverImageUrl={post.coverImageUrl}
      bodyHtml={renderAdEmbeds(html, ads)}
      publishedAt={post.publishedAt}
    />
  );
}
