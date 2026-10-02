"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import AppHeader from "@/components/AppHeader";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import SignUpPrompt, { type SignUpReason } from "@/components/SignUpPrompt";
import AdCard from "@/components/AdCard";
import UpgradePrompt, { type UpgradeReason } from "@/components/UpgradePrompt";
import { SIZE_OPTIONS } from "@/lib/ads";
import {
  adDates,
  adImageAlt,
  adPageHeadline,
  FORMAT_DEFINITIONS,
  formatDay,
  META_IMAGE_SPECS,
  platformLabel,
  type RelatedGuide,
} from "@/lib/adPage";
import { api, ApiError, type Ad, type Author } from "@/lib/api";
import { useAuth } from "@/lib/AuthProvider";
import { can } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";
import { slugify } from "@/lib/slug";

const SQUARE_SIZE = { name: "Square", dims: "1200 × 1200" };
const SQUARE_INDEX = Math.max(
  SIZE_OPTIONS.findIndex((s) => s.dims === SQUARE_SIZE.dims),
  0
);

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

// The ads under "More … ads like this": the ones picked in the ad's CSV, else
// the most similar. Ads with nothing in common beyond the market aren't
// "like this", so an automatic pick needs a shared tag or the same category.
function relatedAds(ad: Ad, allAds: Ad[]) {
  const picked = (ad.content?.relatedAds ?? [])
    .map((slug) => allAds.find((a) => a.id === slug))
    .filter((a): a is Ad => !!a && a.id !== ad.id);
  if (picked.length) return picked.slice(0, 4);
  return allAds
    .filter((a) => a.id !== ad.id)
    .map((a) => ({ a, score: similarity(ad, a), shared: sharedTagCount(ad, a) }))
    .filter(({ a, shared }) => shared > 0 || a.category === ad.category)
    // On a tie, the ad sharing more tags wins: a tag is more specific than a
    // category or market.
    .sort((x, y) => y.score - x.score || y.shared - x.shared)
    .slice(0, 4)
    .map(({ a }) => a);
}

const libraryQuery = (key: "q" | "category" | "tag", value: string) =>
  `/library?${key}=${encodeURIComponent(value)}`;

// A Supabase public URL serves the file as a download with ?download=<name>.
function downloadHref(ad: Ad) {
  if (!ad.photo) return undefined;
  const name = ad.imageFileName || ad.photo.split("/").pop() || "ad.png";
  return ad.photo.includes("/storage/v1/object/public/")
    ? `${ad.photo}?download=${encodeURIComponent(name)}`
    : ad.photo;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ author, size }: { author: Author; size: "sm" | "lg" }) {
  const box = size === "sm" ? "h-9 w-9 text-xs" : "h-16 w-16 text-base";
  return author.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={author.photoUrl}
      alt={author.name}
      width={size === "sm" ? 36 : 64}
      height={size === "sm" ? 36 : 64}
      loading="lazy"
      className={`${box} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center rounded-full bg-ink font-bold text-surface`}
    >
      {initials(author.name)}
    </span>
  );
}

const eyebrow = "text-xs font-medium tracking-[1px] text-ink-muted uppercase";

function DetailRow({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
      <span className="shrink-0 text-ink-muted">{label}</span>
      {href ? (
        <Link href={href} className="text-right text-ink hover:text-brand">
          {value}
        </Link>
      ) : (
        <span className="text-right text-ink">{value}</span>
      )}
    </div>
  );
}

// An ad's page. Public: rendered on the server with the ad and the library
// (so search engines see everything), viewable by anyone. Signed-in users
// get the app header and can save; acting on the ad otherwise asks visitors
// to sign up. Only admins get the edit button. The layout and numbered SEO
// elements follow the "Public ad page" prototype.
export default function AdDetailView({
  initialAd,
  initialAds,
  guides = [],
}: {
  initialAd: Ad;
  initialAds: Ad[];
  guides?: RelatedGuide[];
}) {
  const { user } = useAuth();
  const id = initialAd.id;

  const [ad, setAd] = useState<Ad>(initialAd);
  const allAds = initialAds;
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const pageUrl = `${SITE_URL}/ads/${ad.id}`;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context); nothing else to do.
    }
  }

  const index = allAds.findIndex((a) => a.id === ad.id);
  const prevAd = index > 0 ? allAds[index - 1] : null;
  const nextAd = index >= 0 && index < allAds.length - 1 ? allAds[index + 1] : null;
  const related = relatedAds(ad, allAds);
  // Clients browse the library at their own branded URL (see /library);
  // visitors use the public one.
  const libraryHref = !user
    ? "/library"
    : user.role === "client"
      ? `/library/${slugify(user.fullName)}`
      : "/library";

  const content = ad.content ?? {};
  const headline = adPageHeadline(ad);
  const { added, updated } = adDates(ad);
  const platforms = ad.platforms.map(platformLabel);
  const mainPlatform = platforms[0] ?? "Social";
  const isMeta = platforms.includes("Meta");
  const definition = ad.adFormat ? FORMAT_DEFINITIONS[ad.adFormat] : undefined;
  const subject = (ad.adFormat || ad.subcategory || ad.category).toLowerCase();
  const takeaways = content.takeaways ?? {};
  const hasTakeaways = Object.values(takeaways).some(Boolean);
  const breakdown = [
    { id: "targets", nav: "Who it targets", title: "Who this ad targets", text: content.targets },
    { id: "copywriting", nav: "Copywriting", title: "Copywriting analysis", text: content.copywriting },
    { id: "visual-design", nav: "Visual design", title: "Visual design", text: content.visualDesign },
  ].filter((s) => s.text);
  const steps = content.adaptSteps ?? [];
  const download = downloadHref(ad);
  const shareText = encodeURIComponent(headline);
  const shareUrl = encodeURIComponent(pageUrl);
  const shareLinks = [
    {
      label: "Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${shareUrl}&description=${shareText}${
        ad.photo ? `&media=${encodeURIComponent(ad.photo)}` : ""
      }`,
    },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}` },
    { label: "X", href: `https://x.com/intent/post?url=${shareUrl}&text=${shareText}` },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {user ? <AppHeader /> : <LandingHeader />}

      {/* 1 · Breadcrumbs (BreadcrumbList data is on the server page). */}
      <div className="flex items-center justify-between gap-4 border-b border-ink/15 px-10 py-4">
        <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href={libraryHref} className="font-medium text-brand">
                Ad library
              </Link>
            </li>
            <li aria-hidden className="text-ink-muted">/</li>
            <li>
              <Link href={libraryQuery("category", ad.category)} className="text-brand">
                {ad.category}
              </Link>
            </li>
            {ad.subcategory && (
              <>
                <li aria-hidden className="text-ink-muted">/</li>
                <li>
                  <Link href={libraryQuery("q", ad.subcategory)} className="text-brand">
                    {ad.subcategory}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden className="text-ink-muted">/</li>
            <li aria-current="page" className="truncate text-ink">
              {headline}
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 gap-2">
          <Link
            href={prevAd ? `/ads/${prevAd.id}` : "#"}
            aria-disabled={!prevAd}
            aria-label="Previous ad"
            className={`flex h-8 w-8 items-center justify-center border border-border text-sm ${
              prevAd ? "text-ink" : "pointer-events-none text-ink/30"
            }`}
          >
            &lsaquo;
          </Link>
          <Link
            href={nextAd ? `/ads/${nextAd.id}` : "#"}
            aria-disabled={!nextAd}
            aria-label="Next ad"
            className={`flex h-8 w-8 items-center justify-center border border-border text-sm ${
              nextAd ? "text-ink" : "pointer-events-none text-ink/30"
            }`}
          >
            &rsaquo;
          </Link>
        </div>
      </div>

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Left: the creative and the editorial content. */}
        <div className="min-w-0 border-r border-ink/15 px-10 py-8">
          {/* 2 · The creative with alt text, size and caption. */}
          <figure className="mx-auto" style={{ width: "min(75%, 60vh)" }}>
            <div
              style={{ aspectRatio: "1 / 1" }}
              className={`relative overflow-hidden ${ad.photo ? "" : ad.swatch}`}
            >
              {ad.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.photo}
                  alt={adImageAlt(ad)}
                  width={1200}
                  height={1200}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )}
            </div>
            {ad.imageCaption && (
              <figcaption className="mt-2 text-center text-xs text-ink-muted">
                {ad.imageCaption}
              </figcaption>
            )}
          </figure>

          {/* 17 · Key takeaways. */}
          {hasTakeaways && (
            <div className="mt-8 border border-ink/15 bg-surface-2 p-5">
              <p className={eyebrow}>Key takeaways</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink">
                {(
                  [
                    ["format", "Format"],
                    ["bestFor", "Best for"],
                    ["hook", "Hook"],
                    ["reuse", "Reuse it"],
                  ] as const
                ).map(
                  ([key, label]) =>
                    takeaways[key] && (
                      <li key={key}>
                        <span className="font-bold">{label}:</span> {takeaways[key]}
                      </li>
                    )
                )}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <p className={eyebrow}>Available sizes</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="border border-ink/15 border-b-2 border-b-brand px-3 py-3 text-left text-sm font-bold text-ink">
                <span className="block">
                  {mainPlatform} {SIZE_OPTIONS[SQUARE_INDEX]?.name}
                </span>
                <span className="block text-xs font-normal text-ink-muted">
                  {SIZE_OPTIONS[SQUARE_INDEX]?.dims} · PNG
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

          {/* 18 · Definition of the format. */}
          {definition && ad.adFormat && (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-ink">{definition.question}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink">{definition.answer}</p>
              <Link
                href={libraryQuery("q", ad.adFormat)}
                className="mt-2 inline-block text-sm text-brand"
              >
                See all {ad.adFormat.toLowerCase()} ads &rarr;
              </Link>
            </section>
          )}

          {/* 3 · Why it works: original editorial content. */}
          {content.whyItWorks && content.whyItWorks.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-ink">Why this {subject} ad works</h2>
              <ol className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
                {content.whyItWorks.map((point, i) => (
                  <li key={i} className="flex gap-4 py-3">
                    <span className="text-sm font-bold text-brand tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-ink">{point.title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{point.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* 14 · Long-form breakdown with jump links. */}
          {(breakdown.length > 0 || steps.length > 0 || content.platformTips) && (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-ink">Full creative breakdown</h2>
              <nav aria-label="Breakdown sections" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {breakdown.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="text-brand">
                    {s.nav}
                  </a>
                ))}
                {steps.length > 0 && (
                  <a href="#adapt" className="text-brand">
                    Adapt this template
                  </a>
                )}
                {content.platformTips && (
                  <a href="#platform-tips" className="text-brand">
                    {mainPlatform} tips
                  </a>
                )}
              </nav>
              {breakdown.map((s) => (
                <div key={s.id} id={s.id} className="mt-6 scroll-mt-6">
                  <h3 className="text-base font-bold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink">
                    {s.text}
                  </p>
                </div>
              ))}
              {steps.length > 0 && (
                <div id="adapt" className="mt-6 scroll-mt-6">
                  <h3 className="text-base font-bold text-ink">
                    How to adapt this template for your brand
                  </h3>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-ink">
                    {steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {content.platformTips && (
                <div id="platform-tips" className="mt-6 scroll-mt-6">
                  <h3 className="text-base font-bold text-ink">
                    Tips for {ad.category.toLowerCase()} ads on {mainPlatform}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-ink">
                    {content.platformTips}
                  </p>
                </div>
              )}
            </section>
          )}

          {ad.creativeDescription && (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-ink">About this creative</h2>
              <p className="mt-2 text-justify text-sm leading-relaxed whitespace-pre-line hyphens-auto text-ink">
                {ad.creativeDescription}
              </p>
            </section>
          )}

          {/* 15 · Curator bio box. */}
          {ad.author && (
            <aside className="mt-10 border border-ink/15 bg-surface-2 p-5">
              <p className={eyebrow}>About the curator</p>
              <div className="mt-3 flex gap-4">
                <Avatar author={ad.author} size="lg" />
                <div className="min-w-0">
                  <Link
                    href={`/authors/${ad.author.slug}`}
                    rel="author"
                    className="text-base font-extrabold text-ink hover:text-brand"
                  >
                    {ad.author.name}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    {[ad.author.jobTitle, ad.author.credentials].filter(Boolean).join(" · ")}
                  </p>
                  {ad.author.bio && (
                    <p className="mt-2 text-sm leading-relaxed text-ink">{ad.author.bio}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 text-sm">
                    <Link href={`/authors/${ad.author.slug}`} className="text-brand">
                      All ads by {ad.author.name.split(" ")[0]} &rarr;
                    </Link>
                    {ad.author.linkedinUrl && (
                      <a
                        href={ad.author.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer me"
                        className="text-brand"
                      >
                        LinkedIn &#8599;
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Right: what the ad is, who curated it and its details. */}
        <div className="min-w-0 px-10 py-8 break-words">
          <p className={eyebrow}>
            {[`${mainPlatform} ad`, SQUARE_SIZE.dims, ad.category].join(" · ")}
          </p>
          {/* 4 · One keyword-led H1 and an intro paragraph. */}
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="text-3xl font-extrabold text-ink">{headline}</h1>
            <div className="flex shrink-0 gap-2">
              {user?.role === "admin" && (
                <Link
                  href={`/ads/${ad.id}/edit`}
                  aria-label="Edit ad"
                  title="Edit ad"
                  className="flex h-9 w-9 items-center justify-center border border-border text-ink"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
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
            </div>
          </div>
          {ad.introParagraph && (
            <p className="mt-3 text-sm leading-relaxed text-ink">{ad.introParagraph}</p>
          )}

          {/* 12 · Visible dates for freshness. */}
          <p className="mt-3 flex flex-wrap gap-x-3 text-xs text-ink-muted">
            {added && (
              <span>
                Added <time dateTime={added}>{formatDay(added)}</time>
              </span>
            )}
            {updated && updated !== added && (
              <span>
                Updated <time dateTime={updated}>{formatDay(updated)}</time>
              </span>
            )}
          </p>

          {/* 13 · Author byline and reviewer. */}
          {ad.author && (
            <div className="mt-4 flex items-center gap-3">
              <Avatar author={ad.author} size="sm" />
              <div className="text-xs text-ink-muted">
                <p>
                  Added by{" "}
                  <Link
                    href={`/authors/${ad.author.slug}`}
                    rel="author"
                    className="font-bold text-ink hover:text-brand"
                  >
                    {ad.author.name}
                  </Link>
                  {ad.author.jobTitle && <>, {ad.author.jobTitle}</>}
                </p>
                {ad.reviewer && (
                  <p>
                    Copy and tags reviewed by{" "}
                    <Link
                      href={`/authors/${ad.reviewer.slug}`}
                      className="underline hover:text-brand"
                    >
                      {ad.reviewer.name}
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 5 · Public download and share links. */}
          <div className="mt-6 grid grid-cols-2 gap-2">
            {ad.canvaUrl ? (
              <a
                href={ad.canvaUrl}
                target="_blank"
                rel="noreferrer"
                className="block bg-brand py-2.5 text-center text-sm font-bold text-brand-foreground"
              >
                &#9998; Edit in Canva
              </a>
            ) : ad.hasEditableCopy ? (
              // Not on this plan: keep it visible, locked.
              <button
                type="button"
                onClick={() =>
                  user ? setUpgrade("editableCopies") : setSignUp("editableCopies")
                }
                className="bg-brand py-2.5 text-sm font-bold text-brand-foreground"
              >
                &#128274; Edit in Canva
              </button>
            ) : (
              <span className="block bg-brand py-2.5 text-center text-sm font-bold text-brand-foreground opacity-60">
                &#9998; Edit in Canva
              </span>
            )}
            {download ? (
              <a
                href={download}
                download={ad.imageFileName || true}
                className="flex items-center justify-between border border-border px-3 py-2.5 text-sm font-bold text-ink hover:border-ink/60"
              >
                <span>&#8595; Download</span>
                <span className="text-xs font-normal text-ink-muted">PNG 1200 × 1200</span>
              </a>
            ) : (
              <span className="flex items-center border border-border px-3 py-2.5 text-sm font-bold text-ink/40">
                &#8595; Download
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ink-muted">Share</span>
            <button
              type="button"
              onClick={copyLink}
              className="border border-border px-2 py-1 text-ink hover:border-ink/60"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            {shareLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border px-2 py-1 text-ink hover:border-ink/60"
              >
                {s.label}
              </a>
            ))}
          </div>

          {/* 6 · Details as internal links. */}
          <div className="mt-8">
            <p className={eyebrow}>Details</p>
            <div className="mt-2 grid grid-cols-1 gap-x-8 border-t border-ink/10 sm:grid-cols-2">
              <DetailRow label="Category" value={ad.category} href={libraryQuery("category", ad.category)} />
              <DetailRow label="Platform" value={platforms.join(", ")} />
              {ad.adFormat && (
                <DetailRow label="Format" value={ad.adFormat} href={libraryQuery("q", ad.adFormat)} />
              )}
              <DetailRow
                label="Media type"
                value={ad.mediaType === "video" ? "Video" : "Static image"}
              />
              <DetailRow label="Aspect ratio" value="1:1 square" />
              <DetailRow label="Language" value={ad.language} />
              <DetailRow label="Market" value={ad.market} />
              {ad.dominantColor && <DetailRow label="Dominant colour" value={ad.dominantColor} />}
              {ad.brandName && (
                <DetailRow label="Brand" value={ad.brandName} href={libraryQuery("q", ad.brandName)} />
              )}
              {(ad.canvaUrl || ad.hasEditableCopy) && (
                <div className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                  <span className="text-ink-muted">Canva template</span>
                  {ad.canvaUrl ? (
                    <a href={ad.canvaUrl} target="_blank" rel="noreferrer" className="text-brand">
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

          <div className="mt-8">
            <p className={eyebrow}>Ad copy</p>
            {ad.primaryText && (
              <>
                <p className="mt-3 text-xs font-bold text-ink">Primary text</p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink">
                  {ad.primaryText}
                </p>
              </>
            )}
            <div className="mt-3 grid grid-cols-1 gap-x-8 border-t border-ink/10 sm:grid-cols-2">
              <DetailRow label="Headline" value={ad.headline} />
              {ad.cta && <DetailRow label="Call to action" value={ad.cta} />}
            </div>
            {ad.description && (
              <>
                <p className="mt-3 text-xs font-bold text-ink">Description</p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{ad.description}</p>
              </>
            )}
            {ad.onImageText && (
              <>
                <p className="mt-3 text-xs font-bold text-ink">On-image text</p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink">
                  {ad.onImageText}
                </p>
              </>
            )}
          </div>

          {/* 19 · Headline ideas. */}
          {content.headlineIdeas && content.headlineIdeas.length > 0 && (
            <div className="mt-8">
              <p className={eyebrow}>Headline ideas for this template</p>
              <ol className="mt-2 divide-y divide-ink/10 border-y border-ink/10">
                {content.headlineIdeas.map((idea, i) => (
                  <li key={i} className="flex gap-3 py-2.5 text-sm text-ink">
                    <span className="font-bold text-brand tabular-nums">{i + 1}</span>
                    {idea}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 20 · Specs table. */}
          {isMeta && (
            <div className="mt-8">
              <p className={eyebrow}>Meta image ad specs</p>
              <table className="mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left text-xs text-ink-muted">
                    <th scope="col" className="py-2 font-medium">Placement</th>
                    <th scope="col" className="py-2 font-medium">Ratio</th>
                    <th scope="col" className="py-2 text-right font-medium">Size (px)</th>
                  </tr>
                </thead>
                <tbody>
                  {META_IMAGE_SPECS.map((row) => (
                    <tr key={row.placement} className="border-b border-ink/10 text-ink">
                      <td className="py-2">{row.placement}</td>
                      <td className="py-2">{row.ratio}</td>
                      <td className="py-2 text-right tabular-nums">{row.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-ink-muted">
                This template is 1:1. Request 4:5 or 9:16 to cover all placements.
              </p>
            </div>
          )}

          {/* 7 · Tags as crawlable links. */}
          {ad.tags && ad.tags.length > 0 && (
            <div className="mt-8">
              <p className={eyebrow}>Browse similar by tag</p>
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

      {/* 8 · Collections and related guides. */}
      {((content.collections?.length ?? 0) > 0 || guides.length > 0) && (
        <section className="grid grid-cols-1 gap-10 border-t border-ink/15 px-10 py-8 md:grid-cols-2">
          {content.collections && content.collections.length > 0 && (
            <div>
              <h2 className="text-lg font-extrabold text-ink">Featured in collections</h2>
              <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
                {/* Collections have no pages yet, so they aren't links. */}
                {content.collections.map((name) => (
                  <li key={name} className="py-2.5 text-sm font-bold text-ink">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guides.length > 0 && (
            <div>
              <h2 className="text-lg font-extrabold text-ink">Related guides</h2>
              <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
                {guides.map((g) => (
                  <li key={g.title} className="py-2.5 text-sm">
                    {g.href ? (
                      <Link href={g.href} className="font-bold text-ink hover:text-brand">
                        {g.title}
                      </Link>
                    ) : (
                      <span className="font-bold text-ink">{g.title}</span>
                    )}
                    {g.excerpt && (
                      <span className="mt-0.5 block text-xs text-ink-muted">{g.excerpt}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* 10 · Related ads with keyword anchor text. */}
      {related.length > 0 && (
        <section className="border-t border-ink/15 px-10 py-8">
          <p className={eyebrow}>Visual similarity</p>
          <h2 className="mt-1 text-2xl font-extrabold text-ink">
            More {ad.category} ads like this
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {related.map((r) => (
              <AdCard key={r.id} ad={r} />
            ))}
          </div>
        </section>
      )}

      {/* 11 · Popular searches. */}
      {content.popularSearches && content.popularSearches.length > 0 && (
        <section className="border-t border-ink/15 px-10 py-8">
          <h2 className="text-lg font-extrabold text-ink">Popular searches</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {content.popularSearches.map((term) => (
              <li key={term}>
                <Link href={libraryQuery("q", term)} className="text-brand">
                  {term}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!user && (
        <div className="border-t border-ink/15">
          <LandingFooter />
        </div>
      )}
      <UpgradePrompt reason={upgrade} onClose={() => setUpgrade(null)} />
      <SignUpPrompt reason={signUp} onClose={() => setSignUp(null)} />
    </div>
  );
}
