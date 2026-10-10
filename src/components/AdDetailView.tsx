"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import LiveBadge from "@/components/LiveBadge";
import PremiumBadge from "@/components/PremiumBadge";
import AppHeader from "@/components/AppHeader";
import LandingHeader from "@/components/LandingHeader";
import LandingFooter from "@/components/LandingFooter";
import SignUpPrompt, { type SignUpReason } from "@/components/SignUpPrompt";
import AdCard from "@/components/AdCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import UpgradePrompt, { type UpgradeReason } from "@/components/UpgradePrompt";
import { adMarkets, creativeSize } from "@/lib/ads";
import VideoCreative from "@/components/VideoCreative";
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
import { adCategories } from "@/lib/categories";
import { useToast } from "@/lib/ToastProvider";
import { useAuth } from "@/lib/AuthProvider";
import { can } from "@/lib/plans";
import { SITE_URL } from "@/lib/site";
import { slugify } from "@/lib/slug";

function sharedTagCount(a: Ad, b: Ad) {
  const tagsA = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
  return (b.tags ?? []).filter((t) => tagsA.has(t.toLowerCase())).length;
}

function sharesCategory(a: Ad, b: Ad) {
  const theirs = adCategories(b);
  return adCategories(a).some((c) => theirs.includes(c));
}

// How alike two ads are for "More like this": each shared tag counts 2, the
// same category and the same market 1 each.
function similarity(a: Ad, b: Ad) {
  return (
    sharedTagCount(a, b) * 2 +
    (sharesCategory(a, b) ? 1 : 0) +
    (adMarkets(a).some((m) => adMarkets(b).includes(m)) ? 1 : 0)
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
    .filter(({ a, shared }) => shared > 0 || sharesCategory(a, ad))
    // On a tie, the ad sharing more tags wins: a tag is more specific than a
    // category or market.
    .sort((x, y) => y.score - x.score || y.shared - x.shared)
    .slice(0, 4)
    .map(({ a }) => a);
}

const libraryQuery = (key: "q" | "category" | "tag", value: string) =>
  `/library?${key}=${encodeURIComponent(value)}`;

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

const eyebrow = "text-[13px] font-semibold tracking-[0.13em] text-ink-muted uppercase lg:text-sm";

// The two actions under the ad's title. Labels never wrap: the buttons stack
// instead (see where they're rendered). h-full keeps the pair the same height
// when one has two lines ("Request Canva Edit" and its credit note).
const canvaButton =
  "flex h-full w-full items-center justify-center gap-1.5 whitespace-nowrap bg-brand px-3 py-3 text-base font-bold text-brand-foreground lg:py-4 lg:text-[17px]";
const downloadButton =
  "flex h-full w-full items-center justify-center gap-2 whitespace-nowrap border border-ink/25 bg-card px-4 py-3 text-base font-bold text-ink hover:border-ink/60 lg:justify-between lg:py-4 lg:text-[17px]";

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
    <div className="flex justify-between gap-4 border-b border-ink/10 py-3.5 text-base">
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
  const { user, refresh } = useAuth();
  const toast = useToast();
  const id = initialAd.id;

  const [ad, setAd] = useState<Ad>(initialAd);
  const allAds = initialAds;
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [upgrade, setUpgrade] = useState<UpgradeReason | null>(null);
  const [signUp, setSignUp] = useState<SignUpReason | null>(null);
  const [canvaConfirm, setCanvaConfirm] = useState(false);
  const [canvaRequesting, setCanvaRequesting] = useState(false);
  const [canvaRequested, setCanvaRequested] = useState(false);
  const [similarConfirm, setSimilarConfirm] = useState(false);
  const [similarRequesting, setSimilarRequesting] = useState(false);
  const [similarRequested, setSimilarRequested] = useState(false);

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

  // "Request Canva Edit" on an ad without a Canva copy: visitors sign up,
  // plans without requests (or out of credits) see the upgrade prompt, and
  // everyone else confirms spending the credit first.
  function startCanvaRequest() {
    if (!user) return setSignUp("requests");
    if (!can(user, "requests")) return setUpgrade("requests");
    if (user.account && user.account.credits < 1) return setUpgrade("outOfCredits");
    setCanvaConfirm(true);
  }

  async function requestCanvaEdit() {
    setCanvaRequesting(true);
    try {
      const { alreadyRequested } = await api.requestCanvaEdit(ad.id);
      setCanvaRequested(true);
      setCanvaConfirm(false);
      toast.success(
        alreadyRequested
          ? "You've already requested a Canva edit for this ad. No extra credit was used."
          : "Canva edit requested. We'll add the Canva link to this ad; 1 credit used."
      );
      refresh().catch(() => {});
    } catch (err) {
      setCanvaConfirm(false);
      if (err instanceof ApiError && err.outOfCredits) setUpgrade("outOfCredits");
      else if (err instanceof ApiError && err.upgrade) setUpgrade("requests");
      else toast.error(err instanceof Error ? err.message : "Couldn't send the request.");
    } finally {
      setCanvaRequesting(false);
    }
  }

  // "Request a similar design" on a live ad: the same steps as a Canva edit
  // (sign up, upgrade or confirm the credit), then the request goes straight
  // to the team.
  function startSimilarRequest() {
    if (!user) return setSignUp("requests");
    if (!can(user, "requests")) return setUpgrade("requests");
    if (user.account && user.account.credits < 1) return setUpgrade("outOfCredits");
    setSimilarConfirm(true);
  }

  async function requestSimilarDesign() {
    setSimilarRequesting(true);
    try {
      const { alreadyRequested } = await api.requestSimilarDesign(ad.id);
      setSimilarRequested(true);
      setSimilarConfirm(false);
      toast.success(
        alreadyRequested
          ? "You've already requested a design like this one. No extra credit was used."
          : "Request sent. Our team will design something similar for you; 1 credit used."
      );
      refresh().catch(() => {});
    } catch (err) {
      setSimilarConfirm(false);
      if (err instanceof ApiError && err.outOfCredits) setUpgrade("outOfCredits");
      else if (err instanceof ApiError && err.upgrade) setUpgrade("requests");
      else toast.error(err instanceof Error ? err.message : "Couldn't send the request.");
    } finally {
      setSimilarRequesting(false);
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
  const size = creativeSize(ad);
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
  const download = !!ad.photo || !!ad.video;

  // Paid plans and staff download the clean file; other signed-in users get
  // a watermarked copy. The link is served as an attachment, so navigating
  // to it saves the file and leaves this page as it is.
  const cleanDownload = !!user && can(user, "cleanDownload");
  async function downloadCreative() {
    setDownloadOpen(false);
    if (!user) return setSignUp("download");
    try {
      const { url, video, fileName } = await api.getAdDownload(ad.id);
      if (!video) return window.location.assign(url);
      // A link to an MP4 plays it in the browser instead of saving it, so
      // the file is fetched and saved from here. If storage won't let this
      // page fetch it, it opens in a new tab to be saved from there.
      try {
        const blob = await (await fetch(url)).blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName ?? `${ad.id}.mp4`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
      } catch {
        window.open(url, "_blank", "noopener");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }
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

  const canvaAction =
    ad.canvaUrl ? (
      <a suppressHydrationWarning
        href={ad.canvaUrl}
        target="_blank"
        rel="noreferrer"
        className={canvaButton}
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
        className={canvaButton}
      >
        &#128274; Edit in Canva
      </button>
    ) : canvaRequested ? (
      <span className={`${canvaButton} opacity-60`}>&#10003; Canva edit requested</span>
    ) : (
      <button
        type="button"
        onClick={startCanvaRequest}
        className={canvaButton}
      >
        &#9998; Request Canva Edit
      </button>
    );
  // Downloading needs an account: for visitors the button opens the sign-up
  // prompt.
  const downloadAction =
    !user || download ? (
      <button
        type="button"
        onClick={downloadCreative}
        title={`${size.fileType} · ${size.dims}`}
        className={downloadButton}
      >
        <span>&#8595; Download</span>
        <span aria-hidden className="hidden text-[11px] lg:inline">&#9660;</span>
      </button>
    ) : (
      <span className={`${downloadButton} text-ink/40`}>&#8595; Download</span>
    );

  return (
    <div className="flex min-h-screen flex-col">
      {user ? <AppHeader /> : <LandingHeader />}

      {ad.live && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-black px-4 py-3 text-sm text-white sm:px-10 lg:px-12">
          <LiveBadge size="md" />
          <p className="min-w-0 flex-1">
            This ad is live and shown for inspiration only. Want something similar for your
            business? We&apos;ll design it for you.
          </p>
          {similarRequested ? (
            <Link
              href="/requests"
              className="shrink-0 font-bold whitespace-nowrap text-white/80 hover:text-white"
            >
              &#10003; Similar design requested
            </Link>
          ) : (
            <button
              type="button"
              onClick={startSimilarRequest}
              className="shrink-0 border-b-2 border-brand pb-0.5 font-bold whitespace-nowrap text-white hover:text-white/80"
            >
              Request a similar design &rarr;
            </button>
          )}
        </div>
      )}

      {/* 1 · Breadcrumbs (BreadcrumbList data is on the server page). */}
      {/* One line on phones, ending in "…"; wraps from sm, where the
          prev/next arrows also appear. */}
      <div className="flex items-center justify-between gap-4 border-b border-ink/15 px-4 py-3 sm:px-10 lg:px-12 sm:py-4">
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 text-xs text-ink-muted sm:text-[15px]">
          <ol className="flex items-center gap-x-2 gap-y-1 whitespace-nowrap *:shrink-0 sm:flex-wrap sm:whitespace-normal">
            <li>
              <Link href={libraryHref} className="text-brand">
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
            <li aria-current="page" className="min-w-0 !shrink truncate text-ink">
              {headline}
            </li>
          </ol>
        </nav>
        <div className="hidden shrink-0 gap-2 sm:flex">
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

      {/* Two columns from lg. Below that the columns use display:contents,
          so their sections become one list and `order-*` puts them in the
          mobile prototype's order: title, creative, byline, share, details,
          copy, sizes, then the editorial sections. */}
      <main className="flex flex-1 flex-col px-4 py-6 break-words sm:px-10 lg:grid lg:grid-cols-[minmax(0,8fr)_minmax(0,7fr)] lg:p-0">
        {/* Left: the creative and the editorial content. */}
        <div className="contents lg:block lg:min-w-0 lg:border-r lg:border-ink/15 lg:px-12 lg:py-10">
          {/* 2 · The creative with alt text, size and caption. */}
          <figure
            className={`order-2 mx-auto mt-5 w-full lg:order-none lg:mt-0 lg:w-full ${
              // A tall creative is kept narrower, so it isn't taller than the screen.
              size.height > size.width ? "max-w-[420px]" : "lg:max-w-[592px]"
            }`}
          >
            <div
              style={{ aspectRatio: size.aspect }}
              className={`relative overflow-hidden ${ad.photo || ad.video ? "" : ad.swatch}`}
            >
              {ad.video ? (
                <VideoCreative
                  src={ad.video}
                  cover={ad.photo}
                  alt={adImageAlt(ad)}
                  width={size.width}
                  height={size.height}
                />
              ) : (
                ad.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ad.photo}
                    alt={adImageAlt(ad)}
                    width={size.width}
                    height={size.height}
                    fetchPriority="high"
                    className="ad-creative absolute inset-0 h-full w-full object-contain"
                  />
                )
              )}
              {ad.premium && (
                <span className="absolute top-3 left-3">
                  <PremiumBadge size="md" />
                </span>
              )}
            </div>
            {ad.imageCaption && (
              <figcaption className="mt-3 text-center text-sm text-pretty text-ink-muted">
                {ad.imageCaption}
              </figcaption>
            )}
          </figure>

          {/* 17 · Key takeaways. */}
          {hasTakeaways && (
            <div className="order-[8] mt-10 border border-ink/15 bg-card p-5 lg:order-none lg:p-6">
              <p className={eyebrow}>Key takeaways</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-ink">
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

          <div className="order-[7] mt-10 lg:order-none">
            <p className={eyebrow}>Available sizes</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="border border-ink/15 border-b-2 border-b-brand bg-card px-4 py-3 text-left text-base font-bold text-ink">
                <span className="block">
                  {mainPlatform} {size.name}
                </span>
                <span className="block text-sm font-semibold text-ink-muted">
                  {size.dims} · {size.fileType}
                </span>
              </div>
              {user ? (
                <Link
                  href={`/requests?ad=${encodeURIComponent(ad.id)}`}
                  className="bg-brand px-5 py-3.5 text-base font-bold text-brand-foreground"
                >
                  Request more sizes
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setSignUp("requests")}
                  className="bg-brand px-5 py-3.5 text-base font-bold text-brand-foreground"
                >
                  Request more sizes
                </button>
              )}
            </div>
          </div>

          {/* 18 · Definition of the format. */}
          {definition && ad.adFormat && (
            <section className="order-[9] mt-10 lg:order-none">
              <h2 className="text-[22px] font-extrabold text-ink">{definition.question}</h2>
              <p className="mt-2.5 text-base leading-[1.7] text-pretty text-ink">{definition.answer}</p>
              <Link
                href={libraryQuery("q", ad.adFormat)}
                className="mt-2.5 inline-block text-[15px] text-brand"
              >
                See all {ad.adFormat.toLowerCase()} ads &rarr;
              </Link>
            </section>
          )}

          {/* 3 · Why it works: original editorial content. */}
          {content.whyItWorks && content.whyItWorks.length > 0 && (
            <section className="order-[10] mt-10 lg:order-none">
              <h2 className="text-[22px] font-extrabold text-ink lg:text-[26px]">Why this {subject} ad works</h2>
              <ol className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
                {content.whyItWorks.map((point, i) => (
                  <li key={i} className="flex gap-4 py-3.5">
                    <span className="w-7 shrink-0 font-bold text-brand tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-ink">{point.title}</h3>
                      <p className="mt-1 text-[15px] leading-[1.55] text-ink-muted">{point.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* 14 · Long-form breakdown with jump links. */}
          {(breakdown.length > 0 || steps.length > 0 || content.platformTips) && (
            <section className="order-[11] mt-10 lg:order-none">
              <h2 className="text-[22px] font-extrabold text-ink lg:text-[26px]">Full creative breakdown</h2>
              <nav aria-label="Breakdown sections" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {breakdown.map((s) => (
                  <a suppressHydrationWarning key={s.id} href={`#${s.id}`} className="text-brand">
                    {s.nav}
                  </a>
                ))}
                {steps.length > 0 && (
                  <a suppressHydrationWarning href="#adapt" className="text-brand">
                    Adapt this template
                  </a>
                )}
                {content.platformTips && (
                  <a suppressHydrationWarning href="#platform-tips" className="text-brand">
                    {mainPlatform} tips
                  </a>
                )}
              </nav>
              {breakdown.map((s) => (
                <div key={s.id} id={s.id} className="mt-7 scroll-mt-6">
                  <h3 className="text-lg font-bold text-ink lg:text-[19px]">{s.title}</h3>
                  <p className="mt-2.5 text-base leading-[1.7] whitespace-pre-line text-pretty text-ink">
                    {s.text}
                  </p>
                </div>
              ))}
              {steps.length > 0 && (
                <div id="adapt" className="mt-7 scroll-mt-6">
                  <h3 className="text-lg font-bold text-ink lg:text-[19px]">
                    How to adapt this template for your brand
                  </h3>
                  <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-base leading-[1.7] text-ink">
                    {steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {content.platformTips && (
                <div id="platform-tips" className="mt-7 scroll-mt-6">
                  <h3 className="text-lg font-bold text-ink lg:text-[19px]">
                    Tips for {ad.category.toLowerCase()} ads on {mainPlatform}
                  </h3>
                  <p className="mt-2.5 text-base leading-[1.7] whitespace-pre-line text-pretty text-ink">
                    {content.platformTips}
                  </p>
                </div>
              )}
            </section>
          )}

          {ad.creativeDescription && (
            <section className="order-[12] mt-10 lg:order-none">
              <h2 className="text-[22px] font-extrabold text-ink">About this creative</h2>
              <p className="mt-2.5 text-base leading-[1.7] whitespace-pre-line text-pretty text-ink">
                {ad.creativeDescription}
              </p>
            </section>
          )}

          {/* 15 · Curator bio box. */}
          {ad.author && (
            <aside className="order-[15] mt-10 border border-ink/15 bg-card p-5 lg:order-none lg:p-6">
              <p className={eyebrow}>About the curator</p>
              <div className="mt-3 flex gap-4">
                <Avatar author={ad.author} size="lg" />
                <div className="min-w-0">
                  <Link
                    href={`/authors/${ad.author.slug}`}
                    rel="author"
                    className="text-lg font-extrabold text-ink hover:text-brand"
                  >
                    {ad.author.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {[ad.author.jobTitle, ad.author.credentials].filter(Boolean).join(" · ")}
                  </p>
                  {ad.author.bio && (
                    <p className="mt-2 text-[15px] leading-relaxed text-pretty text-ink">{ad.author.bio}</p>
                  )}
                  <div className="mt-2.5 flex flex-wrap gap-x-4 text-sm">
                    <Link href={`/authors/${ad.author.slug}`} className="text-brand">
                      All ads by {ad.author.name.split(" ")[0]} &rarr;
                    </Link>
                    {ad.author.linkedinUrl && (
                      <a suppressHydrationWarning
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
        <div className="contents lg:block lg:min-w-0 lg:px-12 lg:py-10">
          <div className="order-1 lg:order-none">
            <p className={eyebrow}>
              {[`${mainPlatform} ad`, size.dims, ad.category].join(" · ")}
            </p>
            {/* 4 · One keyword-led H1 and an intro paragraph. */}
            <div className="mt-1 flex items-start justify-between gap-3">
              <h1 className="text-2xl leading-tight font-extrabold text-pretty text-ink sm:text-3xl lg:text-[38px] lg:leading-[1.12]">{headline}</h1>
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
          </div>

          <div className="order-3 lg:order-none">
            {ad.introParagraph && (
              <p className="mt-5 text-base leading-relaxed text-pretty text-ink lg:mt-4 lg:text-[17px] lg:leading-[1.6]">
                {ad.introParagraph}
              </p>
            )}

            {/* 12 · Visible dates for freshness. */}
            <p className="mt-3 flex flex-wrap gap-x-4 text-sm text-ink-muted lg:mt-4">
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
                <div className="text-sm text-ink-muted">
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

          </div>

          {/* 5 · Download (signed-in only) and share links. */}
          {/* Side by side from 400px; stacked full-width below that, so
              neither label has to wrap on a small phone. */}
          {/* On desktop the actions sit under the title; on smaller screens
              they're in the bar pinned to the bottom (end of the page). */}
          <div className="mt-6 hidden grid-cols-2 gap-3 lg:grid">
            {canvaAction}
            {/* Signed in, Download opens a menu of the files on offer (just
                the image file the ad is stored as). */}
            {user && download ? (
              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDownloadOpen(false);
                }}
                onKeyDown={(e) => e.key === "Escape" && setDownloadOpen(false)}
              >
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={downloadOpen}
                  onClick={() => setDownloadOpen((o) => !o)}
                  className={downloadButton}
                >
                  <span>&#8595; Download</span>
                  <span className="text-[11px]">&#9660;</span>
                </button>
                {downloadOpen && (
                  <div
                    role="menu"
                    className="absolute inset-x-0 top-full z-10 border border-t-0 border-ink/25 bg-card shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={downloadCreative}
                      className="flex w-full justify-between px-4 py-3 text-[15px] text-ink hover:bg-surface-2"
                    >
                      <span>
                        {size.fileType}
                        {cleanDownload ? "" : " · watermarked"}
                      </span>
                      <span className="text-ink-muted">{size.dims}</span>
                    </button>
                    {!cleanDownload && (
                      <p className="border-t border-ink/10 px-4 py-2 text-xs text-ink-muted">
                        Paid plans download it without the watermark.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              downloadAction
            )}
          </div>
          <div className="order-4 mt-5 flex flex-wrap items-center gap-2.5 text-sm lg:order-none lg:mt-3">
            <span className="text-ink-muted">Share</span>
            <button
              type="button"
              onClick={copyLink}
              className="border border-border px-2 py-1 text-ink hover:border-ink/60"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            {shareLinks.map((s) => (
              <a suppressHydrationWarning
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
          <p className="order-4 mt-4 flex items-center gap-3 border border-border bg-card px-4 py-2.5 text-[13px] leading-snug text-ink-muted lg:order-none">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 11v6M12 7.5v.5" strokeLinecap="round" />
            </svg>
            All brand names and logos are property of their owners. Adplaylist is not affiliated with or endorsed by
            these brands.
          </p>

          {/* 6 · Details as internal links. */}
          <div className="order-[5] mt-8 lg:order-none">
            <p className={eyebrow}>Details</p>
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-10 border-t border-ink/10">
              {adCategories(ad).length > 1 ? (
                <DetailRow
                  label="Categories"
                  value={
                    <span className="flex flex-wrap justify-end gap-x-1">
                      {adCategories(ad).map((c, i, all) => (
                        <Link key={c} href={libraryQuery("category", c)} className="hover:text-brand">
                          {c}
                          {i < all.length - 1 && ","}
                        </Link>
                      ))}
                    </span>
                  }
                />
              ) : (
                <DetailRow label="Category" value={ad.category} href={libraryQuery("category", ad.category)} />
              )}
              <DetailRow label="Platform" value={platforms.join(", ")} />
              {ad.adFormat && (
                <DetailRow label="Format" value={ad.adFormat} href={libraryQuery("q", ad.adFormat)} />
              )}
              <DetailRow
                label="Media type"
                value={ad.mediaType === "video" ? "Video" : "Static image"}
              />
              <DetailRow label="Aspect ratio" value={size.ratioLabel} />
              <DetailRow label="Language" value={ad.language} />
              <DetailRow
                label={adMarkets(ad).length > 1 ? "Markets" : "Market"}
                value={adMarkets(ad).join(", ")}
              />
              {ad.dominantColor && <DetailRow label="Dominant colour" value={ad.dominantColor} />}
              {ad.brandName && (
                <DetailRow label="Brand" value={ad.brandName} href={libraryQuery("q", ad.brandName)} />
              )}
              {(ad.canvaUrl || ad.hasEditableCopy) && (
                <div className="flex justify-between gap-4 border-b border-ink/10 py-3.5 text-base">
                  <span className="text-ink-muted">Canva template</span>
                  {ad.canvaUrl ? (
                    <a suppressHydrationWarning href={ad.canvaUrl} target="_blank" rel="noreferrer" className="text-brand">
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

          <div className="order-[6] mt-8 lg:order-none">
            <p className={eyebrow}>Ad copy</p>
            {ad.primaryText && (
              <>
                <h3 className="mt-3 text-[15px] font-semibold text-ink">Primary text</h3>
                <p className="mt-1.5 text-base leading-[1.65] whitespace-pre-line text-ink">
                  {ad.primaryText}
                </p>
              </>
            )}
            <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-10 border-t border-ink/10">
              <DetailRow label="Headline" value={ad.headline} />
              {ad.cta && <DetailRow label="Call to action" value={ad.cta} />}
            </div>
            {ad.description && (
              <>
                <h3 className="mt-3 text-[15px] font-semibold text-ink">Description</h3>
                <p className="mt-1.5 text-base leading-[1.65] text-ink">{ad.description}</p>
              </>
            )}
            {ad.onImageText && (
              <>
                <h3 className="mt-3 text-[15px] font-semibold text-ink">On-image text</h3>
                <p className="mt-1.5 text-base leading-[1.65] whitespace-pre-line text-ink">
                  {ad.onImageText}
                </p>
              </>
            )}
          </div>

          {/* 19 · Headline ideas. */}
          {content.headlineIdeas && content.headlineIdeas.length > 0 && (
            <div className="order-[13] mt-8 lg:order-none">
              <p className={eyebrow}>Headline ideas for this template</p>
              <ol className="mt-2 divide-y divide-ink/10 border-y border-ink/10">
                {content.headlineIdeas.map((idea, i) => (
                  <li key={i} className="flex gap-3.5 py-3 text-base text-ink">
                    <span className="font-bold text-brand tabular-nums">{i + 1}</span>
                    {idea}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* 20 · Specs table. */}
          {isMeta && (
            <div className="order-[14] mt-8 lg:order-none">
              <p className={eyebrow}>Meta image ad specs</p>
              <table className="mt-2 w-full border-collapse text-[15px]">
                <thead>
                  <tr className="border-b border-ink/25 text-left text-ink-muted">
                    <th scope="col" className="py-2.5 font-medium">Placement</th>
                    <th scope="col" className="py-2.5 font-medium">Ratio</th>
                    <th scope="col" className="py-2.5 text-right font-medium">Size (px)</th>
                  </tr>
                </thead>
                <tbody>
                  {META_IMAGE_SPECS.map((row) => (
                    <tr key={row.placement} className="border-b border-ink/10 text-ink">
                      <td className="py-3">{row.placement}</td>
                      <td className="py-3">{row.ratio}</td>
                      <td className="py-3 text-right tabular-nums">{row.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2.5 text-sm text-ink-muted">
                This template is 1:1. Request 4:5 or 9:16 to cover all placements.
              </p>
            </div>
          )}

          {/* 7 · Tags as crawlable links. */}
          {ad.tags && ad.tags.length > 0 && (
            <div className="order-[16] mt-8 lg:order-none">
              <p className={eyebrow}>Browse similar by tag</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ad.tags.map((tag, i) => (
                  <Link
                    key={i}
                    href={`${libraryHref}?tag=${encodeURIComponent(tag)}`}
                    title={`See all ads tagged “${tag}”`}
                    className="block border border-ink/25 px-2.5 py-1 text-sm text-ink hover:border-brand hover:text-brand"
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
        <section className="grid grid-cols-1 gap-10 border-t border-ink/15 px-4 sm:px-10 lg:px-12 py-8 md:grid-cols-2">
          {content.collections && content.collections.length > 0 && (
            <div>
              <h2 className="text-[22px] font-extrabold text-ink">Featured in collections</h2>
              <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
                {/* Collections have no pages yet, so they aren't links. */}
                {content.collections.map((name) => (
                  <li key={name} className="py-3.5 text-base font-semibold text-ink">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guides.length > 0 && (
            <div>
              <h2 className="text-[22px] font-extrabold text-ink">Related guides</h2>
              <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
                {guides.map((g) => (
                  <li key={g.title} className="py-3.5 text-base">
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
        <section className="border-t border-ink/15 px-4 sm:px-10 lg:px-12 py-8">
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
        <section className="border-t border-ink/15 px-4 sm:px-10 lg:px-12 py-8">
          <h2 className="text-xl font-extrabold text-ink">Popular searches</h2>
          {/* A tappable bordered list on phones, a row of links from sm. */}
          <ul className="mt-3 grid grid-cols-1 border-t border-ink/10 text-[15px] sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-3 sm:border-0">
            {content.popularSearches.map((term) => (
              <li key={term} className="border-b border-ink/10 sm:border-0">
                <Link href={libraryQuery("q", term)} className="block py-3 text-brand sm:py-0">
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
      {/* The ad's two actions pinned to the bottom on phones and tablets,
          like an app's action bar (desktop shows them under the title). */}
      <div className="sticky bottom-0 z-10 grid grid-cols-2 gap-2 border-t border-ink/15 bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-10 lg:px-12 lg:hidden">
        {canvaAction}
        {downloadAction}
      </div>
      <UpgradePrompt reason={upgrade} onClose={() => setUpgrade(null)} />
      <ConfirmDialog
        open={canvaConfirm}
        title="Request a Canva edit?"
        message={
          <>
            <p>
              Our team will make an editable Canva copy of{" "}
              <span className="font-bold text-ink">{ad.title}</span> and add the link to this
              ad. You&apos;ll find it in Requests once it&apos;s done.
            </p>
            <p className="mt-2">
              This will cost <span className="font-bold text-ink">1 credit</span>
              {user?.account ? ` (you have ${user.account.credits})` : ""}. If we can&apos;t do
              it, the credit is refunded.
            </p>
          </>
        }
        confirmLabel={canvaRequesting ? "Requesting…" : "Request for 1 credit"}
        loading={canvaRequesting}
        onConfirm={requestCanvaEdit}
        onCancel={() => setCanvaConfirm(false)}
      />
      <ConfirmDialog
        open={similarConfirm}
        title="Request a similar design?"
        message={
          <>
            <p>
              Our team will design an ad like{" "}
              <span className="font-bold text-ink">{ad.title}</span> for your business.
              You&apos;ll find it in Requests once it&apos;s done.
            </p>
            <p className="mt-2">
              This will cost <span className="font-bold text-ink">1 credit</span>
              {user?.account ? ` (you have ${user.account.credits})` : ""}. If we can&apos;t do
              it, the credit is refunded.
            </p>
          </>
        }
        confirmLabel={similarRequesting ? "Requesting…" : "Request for 1 credit"}
        loading={similarRequesting}
        onConfirm={requestSimilarDesign}
        onCancel={() => setSimilarConfirm(false)}
      />
      <SignUpPrompt reason={signUp} onClose={() => setSignUp(null)} />
    </div>
  );
}
