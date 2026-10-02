"use client";

import Link from "@/components/Link";
import AdCard from "@/components/AdCard";
import AppHeader from "@/components/AppHeader";
import LandingFooter from "@/components/LandingFooter";
import LandingHeader from "@/components/LandingHeader";
import type { Ad, Author } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";

// An author's public profile: who they are and the ads they added.
export default function AuthorView({ author, ads }: { author: Author; ads: Ad[] }) {
  const { user } = useAuth();
  const initials = author.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      {user ? <AppHeader /> : <LandingHeader />}
      <main className="flex-1 px-10 py-8">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href="/library" className="font-medium text-brand">
            Ad library
          </Link>
          <span className="mx-2 text-ink-muted">/</span>
          <span className="text-ink">Authors</span>
        </nav>

        <header className="mt-6 flex max-w-3xl gap-6">
          {author.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={author.photoUrl}
              alt={author.name}
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-ink text-2xl font-bold text-surface"
            >
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Curator
            </p>
            <h1 className="text-3xl font-extrabold text-ink">{author.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {[author.jobTitle, author.credentials, `${ads.length} ads curated`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {author.bio && (
              <p className="mt-3 text-sm leading-relaxed text-ink">{author.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              {author.linkedinUrl && (
                <a href={author.linkedinUrl} target="_blank" rel="noopener noreferrer me" className="text-brand">
                  LinkedIn &#8599;
                </a>
              )}
              {author.websiteUrl && (
                <a href={author.websiteUrl} target="_blank" rel="noopener noreferrer me" className="text-brand">
                  Website &#8599;
                </a>
              )}
            </div>
          </div>
        </header>

        <section className="mt-10 border-t border-ink/15 pt-8">
          <h2 className="text-2xl font-extrabold text-ink">Ads by {author.name}</h2>
          {ads.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No ads yet.</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
              {ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          )}
        </section>
      </main>
      {!user && (
        <div className="border-t border-ink/15">
          <LandingFooter />
        </div>
      )}
    </div>
  );
}
