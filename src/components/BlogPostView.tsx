import Link from "@/components/Link";
import BlogLayout, { formatPostDate } from "@/components/BlogLayout";

// A published blog post (/blog/:slug). Also rendered inside the admin editor
// as a live preview. `bodyHtml` must already be sanitized: the API cleans it
// on save and the editor cleans its preview with DOMPurify.
export default function BlogPostView({
  title,
  excerpt,
  coverImageUrl,
  bodyHtml,
  publishedAt,
}: {
  title: string;
  excerpt?: string;
  coverImageUrl?: string;
  bodyHtml: string;
  publishedAt?: string;
}) {
  return (
    <BlogLayout>
      <article className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm font-medium text-brand">
          &larr; All posts
        </Link>
        {publishedAt && (
          <p className="mt-6 text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            {formatPostDate(publishedAt)}
          </p>
        )}
        <h1 className="mt-2 text-4xl font-extrabold text-ink sm:text-5xl">
          {title}
        </h1>
        {excerpt && (
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">{excerpt}</p>
        )}
        {coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt=""
            className="mt-8 w-full border border-ink/10 object-cover"
          />
        )}
        <div
          className="brand-content mt-8"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
        <div className="mt-12 border-t border-ink/15 pt-8">
          <p className="text-lg font-extrabold text-ink">
            See what&rsquo;s working in ads right now
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Browse the Adplaylist library of ready-to-edit ad creatives.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-block bg-brand px-6 py-3 text-base font-bold text-brand-foreground"
          >
            Sign up
          </Link>
        </div>
      </article>
    </BlogLayout>
  );
}
