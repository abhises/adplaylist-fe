import Link from "next/link";

export function brandSignupHref(slug: string) {
  return slug ? `/signup?ref=${encodeURIComponent(slug)}` : "/signup";
}

// The public outreach page (/brands/:slug). Also rendered inside the admin
// editor as a live preview, so what the admin sees is what gets emailed.
// `bodyHtml` must already be sanitized: the API cleans it on save and the
// editor cleans its preview with DOMPurify.
export default function BrandPageView({
  heading,
  bodyHtml,
  ctaLabel,
  slug,
}: {
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  slug: string;
}) {
  const signupHref = brandSignupHref(slug);
  return (
    <div className="flex min-h-full flex-col bg-surface">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-10">
          <Link
            href="/"
            className="text-sm font-extrabold tracking-[2px] text-ink uppercase"
          >
            Adplaylist
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-muted hover:text-ink">
              Log in
            </Link>
            <Link
              href={signupHref}
              className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-10">
        <h1 className="text-4xl font-extrabold text-ink sm:text-5xl">
          {heading}
        </h1>
        <div
          className="brand-content mt-8"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
        <div className="mt-12 border-t border-ink/15 pt-8">
          <Link
            href={signupHref}
            className="inline-block bg-brand px-6 py-3 text-base font-bold text-brand-foreground"
          >
            {ctaLabel}
          </Link>
        </div>
      </main>
    </div>
  );
}
