"use client";

import Link from "@/components/Link";
import { useAuth } from "@/lib/AuthProvider";

const FEATURES = [
  {
    title: "Browse the library",
    desc: "Every ad the team has ever shipped, filterable by platform, category, market, and language.",
  },
  {
    title: "Save what you like",
    desc: "Bookmark creatives for this quarter's campaigns. Saving never locks an ad — anyone on the team can still use it.",
  },
  {
    title: "Request new creatives",
    desc: "Ask the creative team for a new size, a market, or a brand-new ad. Average turnaround 3 working days.",
  },
];

const PREVIEW_CARDS = [
  {
    id: "preview-1",
    eyebrow: "Spring drop",
    headline: "Built for the long walk home.",
    cta: "Shop now",
    swatch: "bg-gradient-to-b from-neutral-700 via-neutral-800 to-black",
  },
  {
    id: "preview-2",
    headline: "30% off",
    sub: "Ends Sunday. Members only.",
    swatch: "bg-brand",
  },
  {
    id: "preview-3",
    eyebrow: "New formula",
    headline: "Ten drops. One week.",
    cta: "Try it",
    swatch: "bg-gradient-to-br from-pink-300 to-rose-400",
  },
  {
    id: "preview-4",
    eyebrow: "Season nine",
    headline: "The rift opens tonight.",
    cta: "Play free",
    swatch: "bg-gradient-to-br from-purple-800 via-purple-900 to-black",
  },
];

export default function LandingPage() {
  const { user, ready } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="bg-brand">
        <div className="flex items-center justify-between px-10 py-6">
          <span className="text-sm font-extrabold tracking-[2px] text-brand-foreground uppercase">
            Adplaylist
          </span>
          <nav className="flex items-center gap-4">
            {ready && user ? (
              <Link
                href="/library"
                className="bg-brand-foreground px-4 py-2 text-sm font-bold text-brand"
              >
                Go to Library
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-brand-foreground"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="border border-brand-foreground px-4 py-2 text-sm font-bold text-brand-foreground"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="px-10 pt-8 pb-20">
          <h1 className="max-w-2xl text-[56px] leading-[0.98] font-extrabold text-brand-foreground">
            Your next ad is here.
          </h1>
          <div className="mt-6 h-px w-full max-w-2xl bg-brand-foreground/30" />
          <p className="mt-6 max-w-xl text-base text-brand-foreground">
            Browse the creatives in adplaylist, then open any one as an
            editable copy. One library for every ad your team has ever
            shipped.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href="/signup"
              className="bg-brand-foreground px-5 py-2.5 text-sm font-bold text-brand"
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              className="border border-brand-foreground px-5 py-2.5 text-sm font-bold text-brand-foreground"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-10 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="border border-ink/15 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-ink/40 hover:shadow-lg"
            >
              <h2 className="text-lg font-extrabold text-ink">{f.title}</h2>
              <p className="mt-2 text-sm text-ink-muted">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            A peek inside
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-ink">
            What&rsquo;s in the library
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {PREVIEW_CARDS.map((card) => (
              <div key={card.id} className="group">
                <div className="relative aspect-[4/5] overflow-hidden shadow-none transition-shadow duration-200 group-hover:shadow-xl">
                  <div
                    className={`absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-110 ${card.swatch}`}
                  />
                  {card.eyebrow && (
                    <span className="absolute top-3 left-3 text-[11px] font-medium tracking-[1px] text-white/90 uppercase">
                      {card.eyebrow}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-xl leading-tight font-extrabold text-white">
                      {card.headline}
                    </p>
                    {card.sub && (
                      <p className="mt-1 text-xs text-white/80">{card.sub}</p>
                    )}
                    {card.cta && (
                      <span className="mt-3 inline-block bg-brand px-3 py-1.5 text-[11px] font-bold text-brand-foreground uppercase transition-transform duration-200 group-hover:scale-105">
                        {card.cta}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border border-ink/15 p-10 text-center">
          <h2 className="text-2xl font-extrabold text-ink">
            Ready to get started?
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Create an account and start browsing in under a minute.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block bg-brand px-6 py-3 text-sm font-bold text-brand-foreground"
          >
            Sign up free
          </Link>
        </div>
      </main>
    </div>
  );
}
