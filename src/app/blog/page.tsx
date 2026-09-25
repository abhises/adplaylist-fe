import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "@/components/Link";
import BlogLayout, { formatPostDate } from "@/components/BlogLayout";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog · Adplaylist",
  description: "Ideas, trends and examples from the world of ad creatives.",
};

export default async function BlogIndex() {
  // Render per request so newly published posts show up straight away,
  // rather than the list being frozen when the site is built.
  await connection();
  const { posts } = await api.getPublicBlogPosts();

  return (
    <BlogLayout>
      <h1 className="text-4xl font-extrabold text-ink sm:text-5xl">Blog</h1>
      <p className="mt-3 text-lg text-ink-muted">
        Ideas, trends and examples from the world of ad creatives.
      </p>

      {posts.length === 0 ? (
        <p className="mt-12 text-sm text-ink-muted">No posts yet. Check back soon.</p>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
              <div className="aspect-[16/9] overflow-hidden border border-ink/10 bg-ink/5">
                {post.coverImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImageUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <p className="mt-4 text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                {formatPostDate(post.publishedAt)}
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-ink group-hover:text-brand">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                  {post.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </BlogLayout>
  );
}
