"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "@/components/Link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import {
  brandAdLayout,
  isImageUrl,
  type BrandProfile,
  type BrandProfileAd,
} from "@/lib/brandProfile";

const FILTERS = ["All", "Live", "New concepts"] as const;
type Filter = (typeof FILTERS)[number];

// Unsplash serves the original, multi-megabyte photo unless asked for a size.
function photoSrc(url: string) {
  return /^https:\/\/images\.unsplash\.com\//.test(url) && !url.includes("?")
    ? `${url}?fm=jpg&q=70&w=1200&auto=format&fit=crop`
    : url;
}

function countLabel(live: number, concepts: number) {
  return [
    live && `${live} live ad${live === 1 ? "" : "s"}`,
    concepts && `${concepts} new concept${concepts === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Photo({ ad, className }: { ad: BrandProfileAd; className?: string }) {
  return (
    <div className={`relative min-h-0 flex-1 ${className ?? ""}`}>
      {isImageUrl(ad.photo) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc(ad.photo)}
          alt=""
          title={ad.photoCredit}
          loading="lazy"
          className="ad-creative absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

// A new concept, drawn in the brand's colours. Sizes are in cqw (a
// percentage of the card's width) so the ad scales as one piece, like an
// image would, whatever the column width.
function ConceptCreative({
  ad,
  colors,
}: {
  ad: BrandProfileAd;
  colors: { primary: string; secondary: string };
}) {
  const { primary, secondary } = colors;
  const frame: CSSProperties = { containerType: "inline-size" };
  const layout = brandAdLayout(ad);

  if (layout === "hook") {
    const [footerLeft, footerRight] = (ad.footer ?? "").split("|").map((s) => s.trim());
    return (
      <div
        className="flex aspect-square w-full flex-col overflow-hidden text-white"
        style={{ ...frame, background: primary }}
      >
        <div className="flex flex-col gap-[2.5cqw] px-[7cqw] pt-[7cqw] pb-[5cqw]">
          {ad.eyebrow && (
            <span className="text-[3.6cqw] font-bold tracking-[0.14em] uppercase">
              {ad.eyebrow}
            </span>
          )}
          <span className="text-[11cqw] leading-[0.95] font-extrabold tracking-[-0.02em] uppercase">
            {ad.headline}
          </span>
          {ad.subline && <span className="text-[4.6cqw] font-semibold">{ad.subline}</span>}
        </div>
        <Photo ad={ad} className="bg-black/20" />
        {(footerLeft || footerRight) && (
          <div
            className="flex items-center justify-between gap-[3cqw] px-[7cqw] py-[3.6cqw]"
            style={{ background: secondary }}
          >
            <span className="text-[5cqw] font-extrabold">{footerLeft}</span>
            <span className="text-[3.4cqw] font-bold tracking-[0.04em]">{footerRight}</span>
          </div>
        )}
      </div>
    );
  }

  if (layout === "proof") {
    return (
      <div
        className="flex aspect-square w-full flex-col overflow-hidden bg-white"
        style={{ ...frame, color: secondary }}
      >
        <div className="flex items-center gap-[5cqw] p-[7cqw]">
          {ad.bigNumber && (
            <span
              className="text-[24cqw] leading-[0.85] font-extrabold tracking-[-0.04em]"
              style={{ color: primary }}
            >
              {ad.bigNumber}
            </span>
          )}
          <span className="text-[5cqw] leading-[1.2] font-bold">{ad.headline}</span>
        </div>
        <Photo ad={ad} className="mx-[7cqw] bg-neutral-200" />
        <div className="flex flex-col gap-[3cqw] px-[7cqw] pt-[4cqw] pb-[6cqw]">
          {ad.servicesLine && (
            <span className="text-[3.6cqw] font-bold tracking-[0.1em] uppercase">
              {ad.servicesLine}
            </span>
          )}
          {ad.button && (
            <span
              className="self-start px-[4cqw] py-[2.4cqw] text-[4.4cqw] font-extrabold text-white"
              style={{ background: primary }}
            >
              {ad.button}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex aspect-square w-full flex-col overflow-hidden text-white"
      style={{ ...frame, background: secondary }}
    >
      <Photo ad={ad} className="bg-black/20" />
      <div className="flex flex-col gap-[3cqw] px-[7cqw] py-[6cqw]">
        <span className="text-[8.4cqw] leading-none font-extrabold tracking-[-0.01em]">
          {ad.headline}
        </span>
        {ad.townsLine && (
          <span className="text-[3.4cqw] leading-normal font-semibold tracking-[0.04em] text-white/75 uppercase">
            {ad.townsLine}
          </span>
        )}
        {(ad.button || ad.phone) && (
          <div className="mt-[1cqw] flex items-center justify-between gap-[3cqw]">
            {ad.button && (
              <span
                className="px-[3.5cqw] py-[2.4cqw] text-[3.7cqw] font-extrabold whitespace-nowrap"
                style={{ background: primary }}
              >
                {ad.button}
              </span>
            )}
            <span className="text-[4cqw] font-extrabold whitespace-nowrap">{ad.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LockedCreative({ signupHref }: { signupHref: string }) {
  return (
    <Link
      href={signupHref}
      className="flex aspect-square w-full flex-col items-center justify-center gap-3 bg-surface-2 p-6 text-center"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-7 w-7 fill-none stroke-ink-muted stroke-[1.8]"
      >
        <rect x="5" y="11" width="14" height="9" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <span className="text-sm font-bold text-ink">Sign up to see this ad</span>
    </Link>
  );
}

// The page's ads, with the All / Live / New concepts switch. Visitors get
// the ads locked (the API leaves their creatives out); someone signed in has
// them fetched here, as the server rendering the page can't see the session.
export default function BrandProfileAds({
  slug,
  brandName,
  profile,
  locked,
  signupHref,
}: {
  slug: string;
  brandName: string;
  profile: BrandProfile;
  locked: boolean;
  signupHref: string;
}) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("All");
  const [unlocked, setUnlocked] = useState<BrandProfileAd[] | null>(null);

  useEffect(() => {
    if (!locked || !user) return;
    let cancelled = false;
    api
      .getPublicBrandPage(slug)
      .then(({ page }) => {
        if (!cancelled && !page.adsLocked) setUnlocked(page.profile?.ads ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locked, user, slug]);

  const ads = unlocked ?? profile.ads ?? [];
  const isLocked = locked && !unlocked;
  const live = ads.filter((ad) => ad.live);
  const concepts = ads.filter((ad) => !ad.live);
  const shown = filter === "Live" ? live : filter === "New concepts" ? concepts : ads;
  const colors = {
    primary: profile.colors?.primary ?? "#ec3013",
    secondary: profile.colors?.secondary ?? "#201e1d",
  };

  if (ads.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[32px] leading-tight font-extrabold tracking-[-0.01em]">Ads</h2>
          <span className="text-[15px] text-ink-muted">
            {filter === "Live"
              ? countLabel(live.length, 0) || "No live ads"
              : filter === "New concepts"
                ? countLabel(0, concepts.length) || "No new concepts"
                : countLabel(live.length, concepts.length)}
          </span>
        </div>
        {live.length > 0 && concepts.length > 0 && (
          <div className="flex border border-ink">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`px-3.5 py-2 text-sm font-semibold whitespace-nowrap ${
                  filter === f ? "bg-ink text-surface" : "text-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLocked && (
        <div className="flex flex-wrap items-center justify-between gap-4 border border-ink/15 bg-card px-5 py-4">
          <span className="text-[15px] font-semibold">
            Sign up for free to see {brandName}&rsquo;s ads and new concepts.
          </span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-muted hover:text-ink">
              Log in
            </Link>
            <Link
              href={signupHref}
              className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
        {shown.map((ad, i) => (
          <article key={i} className="flex flex-col border border-ink/15 bg-card">
            <div className="flex min-h-[68px] items-center gap-2.5 px-3.5 py-3">
              {isImageUrl(profile.logo) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logo} alt="" className="h-7 w-7 rounded-full object-cover" />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] leading-tight font-bold">{brandName}</span>
                <span className="text-xs text-ink-muted">Sponsored</span>
              </div>
              <span
                className={`text-[11px] font-bold tracking-[0.06em] whitespace-nowrap uppercase ${
                  ad.live ? "text-emerald-700" : "text-brand"
                }`}
              >
                {ad.live ? "Live" : "New concept"}
              </span>
            </div>
            {ad.locked ? (
              <LockedCreative signupHref={signupHref} />
            ) : isImageUrl(ad.image) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.image}
                alt={ad.alt ?? ""}
                loading="lazy"
                className="ad-creative block aspect-square w-full object-cover"
              />
            ) : (
              <ConceptCreative ad={ad} colors={colors} />
            )}
            <div className="flex flex-1 items-center justify-between gap-2 border-t border-ink/10 px-3.5 py-3">
              <span className="min-w-0 text-[13px] text-ink-muted">{ad.label}</span>
              {ad.cta && (
                <span className="shrink-0 bg-brand px-2.5 py-1.5 text-[13px] font-bold whitespace-nowrap text-brand-foreground">
                  {ad.cta}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
