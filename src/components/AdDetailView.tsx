"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import AppHeader from "@/components/AppHeader";
import LandingHeader from "@/components/LandingHeader";
import SignUpPrompt, { type SignUpReason } from "@/components/SignUpPrompt";
import AdCard from "@/components/AdCard";
import { SIZE_OPTIONS } from "@/lib/ads";
import { slugify } from "@/lib/slug";
import UpgradePrompt, { type UpgradeReason } from "@/components/UpgradePrompt";
import { can } from "@/lib/plans";

const SQUARE_SIZE = { name: "Square", dims: "1200 × 1200" };
const SQUARE_INDEX = Math.max(
  SIZE_OPTIONS.findIndex((s) => s.dims === SQUARE_SIZE.dims),
  0
);

// Width over height of a size like "1200 × 1200"; 4:5 if it can't be read.
function sharedTagCount(a: Ad, b: Ad) {
  const tagsA = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
  return (b.tags ?? []).filter((t) => tagsA.has(t.toLowerCase())).length;
}

// How alike two ads are for "More like this": each shared tag counts 2, the
// same category and the same market 1 each.
function similarity(a: Ad, b: Ad) {
  return (
    sharedTagCount(a, b) * 2 +
    (a.category === b.category ? 1 : 0) +
    (a.market === b.market ? 1 : 0)
  );
}

function parseAspectRatio(dims: string) {
  const [w, h] = dims.split(/[x×]/).map((n) => parseInt(n.trim(), 10));
  return w && h ? w / h : 4 / 5;
}
import { api, ApiError, type Ad } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";

// An ad's page. Public: rendered on the server with the ad and the library
// (so search engines see everything), viewable by anyone. Signed-in users
// get the app header and can save; acting on the ad otherwise asks visitors
// to sign up. Only admins get the edit button.
export default function AdDetailView({
  initialAd,
  initialAds,
}: {
  initialAd: Ad;
  initialAds: Ad[];
}) {
  const { user } = useAuth();
  const id = initialAd.id;

  const [ad, setAd] = useState<Ad>(initialAd);
  const allAds = initialAds;
  const [saved, setSaved] = useState(false);
  const [activeSize] = useState(SQUARE_INDEX);
  const [upgrade, setUpgrade] = useState<UpgradeReason | null>(null);
  const [signUp, setSignUp] = useState<SignUpReason | null>(null);

  // The server renders the ad as a visitor sees it. Once signed in, reload
  // it as this user (their plan may include the editable copy) and their
  // saved state.
  useEffect(() => {
    if (!user) return;
    api
      .getAd(id)
      .then(({ ad }) => setAd(ad))
      .catch(() => {});
    api
      .getSaved()
      .then(({ ads }) => setSaved(ads.some((a) => a.id === id)))
      .catch(() => {});
  }, [id, user]);

  async function toggleSaved() {
    if (!user) return setSignUp("save");
    const next = !saved;
    if (next && !can(user, "save")) return setUpgrade("save");
    setSaved(next);
    try {
      if (next) await api.saveAd(ad.id);
      else await api.unsaveAd(ad.id);
    } catch (err) {
      setSaved(!next);
      if (err instanceof ApiError && err.upgrade) setUpgrade("save");
    }
  }

  const index = allAds.findIndex((a) => a.id === ad.id);
  const prevAd = index > 0 ? allAds[index - 1] : null;
  const nextAd = index >= 0 && index < allAds.length - 1 ? allAds[index + 1] : null;
  // Ads with nothing in common beyond the market aren't "like this", so an
  // ad needs a shared tag or the same category to be shown.
  const related = allAds
    .filter((a) => a.id !== ad.id)
    .map((a) => ({ a, score: similarity(ad, a), shared: sharedTagCount(ad, a) }))
    .filter(({ a, shared }) => shared > 0 || a.category === ad.category)
    // On a tie, the ad sharing more tags wins: a tag is more specific than a
    // category or market.
    .sort((x, y) => y.score - x.score || y.shared - x.shared)
    .slice(0, 4)
    .map(({ a }) => a);
  // Clients browse the library at their own branded URL (see /library);
  // visitors use the public one.
  const libraryHref = !user
    ? "/library"
    : user.role === "client"
      ? `/library/${slugify(user.fullName)}`
      : "/library";

  const previewAspectRatio = parseAspectRatio(
    SIZE_OPTIONS[activeSize]?.dims ?? SQUARE_SIZE.dims
  );

  return (
    <div className="flex min-h-screen flex-col">
      {user ? <AppHeader /> : <LandingHeader />}

      <div className="flex items-center justify-between border-b border-ink/15 px-10 py-4">
        <Link href={libraryHref} className="text-sm font-medium text-brand">
          &larr; {user ? "Library" : "Ads"}
        </Link>
        <div className="flex gap-2">
          <Link
            href={prevAd ? `/ads/${prevAd.id}` : "#"}
            aria-disabled={!prevAd}
            className={`flex h-8 w-8 items-center justify-center border border-border text-sm ${
              prevAd ? "text-ink" : "pointer-events-none text-ink/30"
            }`}
          >
            &lsaquo;
          </Link>
          <Link
            href={nextAd ? `/ads/${nextAd.id}` : "#"}
            aria-disabled={!nextAd}
            className={`flex h-8 w-8 items-center justify-center border border-border text-sm ${
              nextAd ? "text-ink" : "pointer-events-none text-ink/30"
            }`}
          >
            &rsaquo;
          </Link>
        </div>
      </div>

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 border-r border-ink/15 px-10 py-8">
          <div
            // Kept to 75% of the column and 60% of the screen height so the
            // platform and size buttons below stay in view.
            style={{
              aspectRatio: previewAspectRatio,
              width: `min(75%, calc(60vh * ${previewAspectRatio}))`,
            }}
            className={`relative mx-auto overflow-hidden ${
              ad.photo ? "" : ad.swatch
            }`}
          >
            {ad.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.photo}
                alt={ad.title}
                className="absolute inset-0 h-full w-full object-contain"
              />
            )}
          </div>

          <div className="mt-8">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Platforms
            </p>
            <div className="mt-2 flex flex-wrap gap-4">
              {ad.platforms.map((platform) => (
                <label
                  key={platform}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-brand"
                  />
                  {platform}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="border border-ink/15 border-b-2 border-b-brand px-3 py-3 text-left text-sm font-bold text-ink">
              <span className="block">{SIZE_OPTIONS[SQUARE_INDEX]?.name}</span>
              <span className="block text-xs text-ink-muted">
                {SIZE_OPTIONS[SQUARE_INDEX]?.dims}
              </span>
            </div>
            {user ? (
              <Link
                href="/requests"
                className="bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground"
              >
                Request more sizes
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSignUp("requests")}
                className="bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground"
              >
                Request more sizes
              </button>
            )}
          </div>
        </div>

        <div className="px-10 py-8">
          <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            Creative &middot; {SIZE_OPTIONS[activeSize]?.dims ?? SQUARE_SIZE.dims}
          </p>
          <div className="mt-1 flex items-start justify-between">
            <h1 className="text-3xl font-extrabold text-ink">{ad.title}</h1>
            <div className="flex gap-2">
              {user?.role === "admin" && (
                <Link
                  href={`/ads/${ad.id}/edit`}
                  aria-label="Edit ad"
                  title="Edit ad"
                  className="flex h-9 w-9 items-center justify-center border border-border text-ink"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
                  </svg>
                </Link>
              )}
              <button
                onClick={toggleSaved}
                aria-label="Save ad"
                title={saved ? "Remove from saved" : "Save ad"}
                className={`flex h-9 w-9 cursor-pointer items-center justify-center border border-border ${
                  saved ? "bg-brand text-brand-foreground" : "text-ink"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="15"
                  height="15"
                  fill={saved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 4h12v16l-6-4-6 4Z" />
                </svg>
              </button>
              <button
                aria-label="Copy link"
                title="Copy link"
                className="flex h-9 w-9 cursor-pointer items-center justify-center border border-border text-ink"
              >
                &#128279;
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <button className="bg-brand py-2.5 text-sm font-bold text-brand-foreground">
              &#9998; Edit in Canva
            </button>
            <button className="flex items-center justify-between border border-border px-3 py-2.5 text-sm font-bold text-ink">
              <span>&#8595; Download</span>
              <span>&#9662;</span>
            </button>
          </div>

          <div className="mt-8">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Details
            </p>
            <div className="mt-2 grid grid-cols-1 gap-x-8 border-t border-ink/10 sm:grid-cols-2">
              <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                <span className="text-ink-muted">Category</span>
                <span className="text-right text-ink">{ad.category}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                <span className="text-ink-muted">Market</span>
                <span className="text-right text-ink">{ad.market}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                <span className="text-ink-muted">Language</span>
                <span className="text-right text-ink">{ad.language}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                <span className="text-ink-muted">Media type</span>
                <span className="text-right text-ink capitalize">{ad.mediaType}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                <span className="text-ink-muted">Platforms</span>
                <span className="text-right text-ink">{ad.platforms.join(", ")}</span>
              </div>
              {ad.dominantColor && (
                <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                  <span className="text-ink-muted">Dominant colour</span>
                  <span className="text-right text-ink">{ad.dominantColor}</span>
                </div>
              )}
              {(ad.canvaUrl || ad.hasEditableCopy) && (
                <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                  <span className="text-ink-muted">Canva template</span>
                  {ad.canvaUrl ? (
                    <a
                      href={ad.canvaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand"
                    >
                      Open link
                    </a>
                  ) : (
                    // Not on this plan: keep it visible, locked.
                    <button
                      type="button"
                      onClick={() =>
                        user ? setUpgrade("editableCopies") : setSignUp("editableCopies")
                      }
                      className="text-brand"
                    >
                      &#128274; Open link
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {ad.primaryText && (
            <div className="mt-8">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Primary text
              </p>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink">
                {ad.primaryText}
              </p>
            </div>
          )}

          {(ad.brandName || ad.headline || ad.cta) && (
            <div className="mt-8">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Ad copy
              </p>
              <div className="mt-2 grid grid-cols-1 gap-x-8 border-t border-ink/10 sm:grid-cols-2">
                {ad.brandName && (
                  <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                    <span className="shrink-0 text-ink-muted">Brand name</span>
                    <span className="text-right text-ink">{ad.brandName}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                  <span className="shrink-0 text-ink-muted">Headline</span>
                  <span className="text-right text-ink">{ad.headline}</span>
                </div>
                {ad.cta && (
                  <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                    <span className="shrink-0 text-ink-muted">
                      Call to action
                    </span>
                    <span className="text-right text-ink">{ad.cta}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {ad.description && (
            <div className="mt-8">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Description
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink">
                {ad.description}
              </p>
            </div>
          )}

          {ad.creativeDescription && (
            <div className="mt-8">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Description of the creative
              </p>
              <p className="mt-2 text-justify text-sm leading-relaxed whitespace-pre-line hyphens-auto text-ink">
                {ad.creativeDescription}
              </p>
            </div>
          )}

          {ad.tags && ad.tags.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
                Tags
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ad.tags.map((tag, i) => (
                  <Link
                    key={i}
                    href={`${libraryHref}?tag=${encodeURIComponent(tag)}`}
                    title={`See all ads tagged “${tag}”`}
                    className="border border-border px-2 py-0.5 text-xs text-ink hover:border-brand hover:text-brand"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {related.length > 0 && (
        <section className="border-t border-ink/15 px-10 py-8">
          <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            Visual similarity
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-ink">
            More like this
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Other {ad.category} creatives in the library &mdash; click one to
            open its own sizes.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {related.map((r) => (
              <AdCard key={r.id} ad={r} />
            ))}
          </div>
        </section>
      )}
      <UpgradePrompt reason={upgrade} onClose={() => setUpgrade(null)} />
      <SignUpPrompt reason={signUp} onClose={() => setSignUp(null)} />
    </div>
  );
}
