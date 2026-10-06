"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/Link";
import LandingFooter from "@/components/LandingFooter";
import LandingHeader from "@/components/LandingHeader";
import ContactSection from "@/components/ContactSection";
import PricingSection from "@/components/PricingSection";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useAuth } from "@/lib/AuthProvider";
import { useToast } from "@/lib/ToastProvider";
import { ApiError, api, type Ad as LibraryAd } from "@/lib/api";
import { HERO_PER_PLATFORM, HERO_PLATFORMS, shuffle } from "@/lib/ads";

// Tiles in the hero panel's All tab (a 3×3 grid); each platform tab shows
// that platform's picks, up to HERO_PER_PLATFORM.
const HERO_ALL_TILES = 9;

// The landing page keeps its own fixed light palette (it doesn't follow the
// app's dark theme), so colors here are literal rather than theme tokens.
const RED = "#EC3016";
const INK = "#161514";

type Ad = {
  name: string;
  tag: string;
  headline: string;
  cta: string;
  bg: string;
  fg: string;
  platform: string;
  cat: string;
  meta: string;
};

const ADS: Ad[] = [
  { name: "Spring drop — hero", tag: "SPRING DROP", headline: "Built for the long walk home.", cta: "SHOP NOW", bg: "linear-gradient(180deg,#444 0%,#000 75%)", fg: "#fff", platform: "Meta", cat: "Retail", meta: "Meta · 4:5 · EN-US" },
  { name: "Members sale", tag: "MEMBERS", headline: "30% off. Ends Sunday.", cta: "JOIN NOW", bg: RED, fg: "#fff", platform: "Google", cat: "Retail", meta: "Google · 1:1 · EN-GB" },
  { name: "New formula launch", tag: "NEW FORMULA", headline: "Ten drops. One week.", cta: "TRY IT", bg: "linear-gradient(160deg,#ffa6cf,#ff6b8a)", fg: "#fff", platform: "TikTok", cat: "Beauty", meta: "TikTok · 9:16 · EN-US" },
  { name: "Season nine", tag: "SEASON NINE", headline: "The rift opens tonight.", cta: "PLAY FREE", bg: "radial-gradient(120% 90% at 100% 100%,#000 20%,#5b1a9a 60%,#6a1aa6)", fg: "#fff", platform: "YouTube", cat: "Gaming", meta: "YouTube · 16:9 · DE-DE" },
  { name: "Weekend brunch", tag: "THIS WEEKEND", headline: "Pancakes on us.", cta: "ORDER", bg: "#F5D547", fg: INK, platform: "Meta", cat: "Food", meta: "Meta · 1:1 · FR-FR" },
  { name: "Cloud tier", tag: "FOR TEAMS", headline: "Ship faster, together.", cta: "START FREE", bg: "linear-gradient(200deg,#1f4dff,#0a1a66)", fg: "#fff", platform: "Google", cat: "Software", meta: "Google · 1.91:1 · EN-US" },
  { name: "Glow serum", tag: "BEST SELLER", headline: "Your skin, but louder.", cta: "SHOP", bg: "#F2E6DA", fg: INK, platform: "Meta", cat: "Beauty", meta: "Meta · 4:5 · ES-ES" },
  { name: "Ranked season", tag: "RANKED", headline: "Climb or be climbed.", cta: "PLAY NOW", bg: "linear-gradient(180deg,#0e3b2e,#000)", fg: "#fff", platform: "TikTok", cat: "Gaming", meta: "TikTok · 9:16 · EN-US" },
];

const REQUEST_TYPES = ["New size", "New market", "Brand-new ad"];

const REQUEST_NOTES: Record<string, string> = {
  "New size": "Need a 9:16 version for Stories, same copy.",
  "New market": "Localise for DE-DE. Keep the offer, swap the price to €.",
  "Brand-new ad": "Launch ad for the autumn range. Same tone as this one.",
};

const STEPS = [
  { n: "01", title: "Browse the library", desc: "Every ad the team has ever shipped, filterable by platform, category, market, and language." },
  { n: "02", title: "Open an editable copy", desc: "Swap the headline, offer, or market. The original stays untouched, so anyone on the team can still use it." },
  { n: "03", title: "Save and ship", desc: "Bookmark creatives for this quarter's campaigns. Saving never locks an ad." },
];

const mono = "font-mono text-[12px] tracking-[0.08em]";
const container = "mx-auto max-w-[1320px] px-[clamp(20px,4vw,32px)]";
const h2 = "text-[clamp(36px,4.5vw,56px)] leading-none font-extrabold tracking-[-0.03em]";
// On phones, chip rows scroll sideways instead of wrapping onto extra lines.
const chipRow =
  "flex gap-2 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden";

// One card in the "What's in the library" section. Live ads from the API and
// the design's sample ads (the fallback when the API is unreachable or the
// library is empty) are both mapped to this shape.
type LibraryCard = {
  key: string;
  name: string;
  meta: string;
  category: string;
  href: string;
  photo?: string;
  video: boolean;
  platforms: string[];
  featured: boolean;
  // Hero panel tabs an admin picked it for (META, Google, LinkedIn).
  heroPlatforms: string[];
  // Text drawn over the card; left empty for photo creatives, which already
  // carry their own copy.
  tag?: string;
  headline?: string;
  cta?: string;
  bgClass?: string;
  bgStyle?: CSSProperties;
  fg: string;
  ctaStyle: CSSProperties;
};

function fromLibraryAd(ad: LibraryAd, href: string): LibraryCard {
  const light = ad.light && !ad.photo;
  return {
    key: ad.id,
    name: ad.title,
    meta: [ad.platforms[0], ad.format, ad.market].filter(Boolean).join(" · "),
    category: ad.category,
    href,
    photo: ad.photo,
    video: ad.mediaType === "video",
    platforms: ad.platforms,
    featured: !!ad.featured,
    heroPlatforms: ad.heroPlatforms ?? [],
    tag: ad.eyebrow?.toUpperCase(),
    headline: ad.headline,
    cta: ad.cta?.toUpperCase(),
    bgClass: ad.swatch,
    fg: light ? INK : "#fff",
    ctaStyle: { background: RED, color: "#fff" },
  };
}

function fromSample(ad: Ad, href: string): LibraryCard {
  return {
    key: ad.name,
    name: ad.name,
    meta: ad.meta,
    category: ad.cat,
    href,
    video: false,
    platforms: [ad.platform],
    featured: false,
    heroPlatforms: [],
    tag: ad.tag,
    headline: ad.headline,
    cta: ad.cta,
    bgStyle: { background: ad.bg },
    fg: ad.fg,
    ctaStyle: ctaColors(ad),
  };
}

// "All" plus every platform the cards run on, in first-seen order.
function allPlatforms(cards: LibraryCard[]) {
  return ["All", ...new Set(cards.flatMap((c) => c.platforms))];
}

// The API stores Meta as "META"; show it the way the design does.
function platformLabel(platform: string) {
  return platform === "META" ? "Meta" : platform;
}

// "All" plus the library's three biggest categories.
function topCategories(cards: LibraryCard[]) {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
  return ["All", ...top];
}

function ctaColors(ad: Ad) {
  return ad.bg === RED ? { background: "#fff", color: RED } : { background: RED, color: "#fff" };
}

// A card's creative (or colour swatch) filling its square, zooming in on
// hover. Non-square photos are cropped to fit, like the library's AdCard.
function CardBackground({ ad }: { ad: LibraryCard }) {
  return (
    <div
      className={`absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-110 ${
        ad.photo ? "bg-[#eeece9]" : (ad.bgClass ?? "")
      }`}
      style={ad.photo ? undefined : ad.bgStyle}
    >
      {ad.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ad.photo} alt={ad.name} className="ad-creative h-full w-full object-cover" />
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
  dark = false,
  className = "",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dark?: boolean;
  className?: string;
}) {
  const style = active
    ? { background: dark ? "#fff" : INK, color: dark ? INK : "#fff", borderColor: dark ? "#fff" : INK }
    : { background: "transparent", color: dark ? "#fff" : INK, borderColor: dark ? "#4a4744" : "#d9d6d2" };
  return (
    <button type="button" onClick={onClick} style={style} className={`shrink-0 border font-semibold whitespace-nowrap ${className}`}>
      {label}
    </button>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { user, ready, loginWithGoogle } = useAuth();
  const toast = useToast();
  const signedIn = ready && !!user;

  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("All");
  const [category, setCategory] = useState("All");
  const [requestType, setRequestType] = useState("New market");
  // null while the first fetch is in flight; [] if it failed.
  const [liveAds, setLiveAds] = useState<LibraryAd[] | null>(null);
  // A random position per ad, drawn once per visit, so the hero's picks show
  // in a different order each visit without reshuffling on every render.
  const [heroRank, setHeroRank] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    api
      .getAds()
      .then(({ ads }) => {
        if (cancelled) return;
        setLiveAds(ads);
        setHeroRank(new Map(shuffle(ads).map((ad, i) => [ad.id, i])));
      })
      .catch(() => {
        if (!cancelled) setLiveAds([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ad pages are public, so every card opens its ad (internal links that
  // also help search engines find them).
  const libraryCards: LibraryCard[] =
    liveAds && liveAds.length > 0
      ? [...liveAds]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((ad) => fromLibraryAd(ad, `/ads/${ad.id}`))
      : ADS.map((ad) => fromSample(ad, "/library"));
  // The hero panel shows the ads an admin picked for it in Admin → Home
  // section: a tab each for Meta, Google and LinkedIn with the ads picked for
  // that tab (up to six), and an All tab with nine picks. Picks show in a
  // random order on every tab. Until they pick some, it shows the newest.
  const heroPicked = libraryCards.filter((c) => c.heroPlatforms.length > 0);
  const picking = heroPicked.length > 0;
  const runsOn = (c: LibraryCard, p: string) => c.platforms.some((cp) => cp.toLowerCase() === p.toLowerCase());
  const inTab = (c: LibraryCard, p: string) => (picking ? c.heroPlatforms.includes(p) : runsOn(c, p));
  const platforms = picking
    ? ["All", ...HERO_PLATFORMS.filter((p) => heroPicked.some((c) => c.heroPlatforms.includes(p)))]
    : allPlatforms(libraryCards);
  const heroCards = picking
    ? [...heroPicked].sort((a, b) => (heroRank.get(a.key) ?? 0) - (heroRank.get(b.key) ?? 0))
    : libraryCards;
  const heroAds = heroCards
    .filter((c) => platform === "All" || inTab(c, platform))
    .slice(0, platform === "All" ? HERO_ALL_TILES : HERO_PER_PLATFORM);
  // The library section shows every ad an admin picked in Admin → Home
  // section; until they pick some, it shows the four newest.
  const featuredCards = libraryCards.filter((c) => c.featured);
  const sectionCards = featuredCards.length > 0 ? featuredCards : libraryCards.slice(0, 4);
  const categories = topCategories(sectionCards);
  const libraryAds = sectionCards.filter((c) => category === "All" || c.category === category);

  function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    router.push(trimmed ? `/signup?email=${encodeURIComponent(trimmed)}` : "/signup");
  }

  async function handleGoogleCredential(credential: string) {
    try {
      await loginWithGoogle(credential);
      toast.success("Signed in with Google. Welcome!");
      router.push("/library");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Google sign-in failed.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F2F0] leading-[normal] text-[#161514]">
      <LandingHeader onLanding />

      {/* HERO */}
      <section id="top" className="scroll-mt-[72px] flex min-h-[calc(100svh-72px)] flex-col overflow-hidden bg-[#EC3016] text-white">
        <div
          className={`${container} grid w-full flex-1 content-center items-center gap-10 py-[clamp(40px,7vw,64px)]`}
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,460px),1fr))" }}
        >
          <div>
            <div className={`${mono} flex items-center gap-[10px] uppercase`}>
              <span className="h-2 w-2 rounded-full bg-white" />
              <span>The ad library for your whole team</span>
            </div>
            <h1 className="mt-6 text-[clamp(48px,7vw,96px)] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance">
              Steal the strategy, not the ad.
            </h1>
            <p className="mt-6 max-w-[520px] text-[clamp(17px,2.2vw,20px)] leading-[1.5] text-pretty">
              We study ads that are working worldwide and create fresh, original versions you can make your own in
              Canva.
            </p>

            {signedIn ? (
              <div id="signup" className="mt-9 flex flex-wrap gap-3">
                <Link href="/library" className="shrink-0 bg-white px-7 py-4 text-[17px] font-bold whitespace-nowrap text-[#EC3016]">
                  Go to Library
                </Link>
                <Link href="/requests" className="shrink-0 border-[1.5px] border-white px-7 py-4 text-[17px] font-bold whitespace-nowrap">
                  Request a creative
                </Link>
              </div>
            ) : (
              <form id="signup" onSubmit={handleSignup} className="mt-9 flex max-w-[520px] flex-wrap bg-white p-[6px]">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  aria-label="Work email"
                  className="min-w-0 flex-[1_1_220px] border-0 bg-transparent p-[14px] text-[17px] text-[#161514] outline-0 placeholder:text-[#8a8783]"
                />
                <button type="submit" className="grow border-0 sm:grow-0 bg-[#161514] px-6 py-[14px] text-[16px] font-bold text-white hover:bg-black">
                  Sign up free
                </button>
              </form>
            )}
            {!signedIn && (
              <div className="mt-3 max-w-[520px]">
                <GoogleSignInButton
                  onCredential={handleGoogleCredential}
                  onError={(message) => toast.error(message)}
                >
                  <div className="flex w-full items-center justify-center gap-3 bg-white px-6 py-[20px] text-[16px] font-bold text-[#161514]">
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                    </svg>
                    Continue with Google
                  </div>
                </GoogleSignInButton>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-5 text-[14px] opacity-95">
              <span>✓ Free to join</span>
              <span>✓ Set up in under a minute</span>
              <span>✓ No design skills needed</span>
            </div>
          </div>

          {/* Product mock */}
          <div className="bg-white text-[#161514] shadow-[0_30px_80px_rgba(60,10,0,0.35)]">
            <div className="flex items-center gap-3 border-b border-[#e7e5e2] px-[18px] py-[14px]">
              <div className="flex min-w-0 flex-1 items-center gap-[10px] bg-[#F3F2F0] px-[14px] py-[10px] text-[14px] text-[#6b6864]">
                <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[#6b6864]" />
                <span className="truncate">
                  {liveAds?.length ? `Search ${liveAds.length.toLocaleString()} creatives…` : "Search creatives…"}
                </span>
              </div>
              <span className="bg-[#EC3016] px-[14px] py-[9px] text-[13px] font-bold whitespace-nowrap text-white">+ Request</span>
            </div>
            <div className={`${chipRow} px-[18px] py-[14px]`}>
              {platforms.map((p) => (
                <Chip
                  key={p}
                  label={platformLabel(p)}
                  active={platform === p}
                  onClick={() => setPlatform(p)}
                  className="px-3 py-[7px] text-[13px]"
                />
              ))}
            </div>
            {/* Two columns (up to six tiles) on narrow phones, three columns (up to nine tiles) above. */}
            <div className="grid grid-cols-2 gap-[clamp(6px,1.5vw,10px)] px-[clamp(12px,3vw,18px)] pb-[clamp(12px,3vw,18px)] min-[480px]:grid-cols-3">
              {liveAds === null
                ? Array.from({ length: HERO_ALL_TILES }, (_, i) => (
                    <div
                      key={i}
                      aria-hidden
                      className={`aspect-square animate-pulse bg-[#eeece9] ${i >= 6 ? "max-[479px]:hidden" : ""}`}
                    />
                  ))
                : heroAds.map((ad, i) => (
                    <Link
                      key={ad.key}
                      href={ad.href}
                      className={`group relative flex aspect-square flex-col justify-between overflow-hidden p-[10px] ${
                        i >= 6 ? "max-[479px]:hidden" : ""
                      }`}
                      style={{ color: ad.fg }}
                    >
                      <CardBackground ad={ad} />
                      {!ad.photo && (
                        <>
                          <div className="relative truncate text-[9px] font-bold tracking-[0.1em]">{ad.tag}</div>
                          <div className="relative">
                            <div className="text-[clamp(11px,2.6vw,13px)] leading-[1.1] font-extrabold">{ad.headline}</div>
                            {ad.cta && (
                              <div className="mt-[6px] inline-block px-[6px] py-[3px] text-[8px] font-extrabold" style={ad.ctaStyle}>
                                {ad.cta}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {ad.platforms.length > 0 && (
                        <div className="absolute top-2 right-2 bg-white/92 px-[5px] py-[2px] font-mono text-[9px] text-[#161514]">
                          {ad.video && "▶ "}
                          {platformLabel(platform !== "All" ? platform : (ad.heroPlatforms[0] ?? ad.platforms[0]))}
                        </div>
                      )}
                    </Link>
                  ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how"
        className={`scroll-mt-[72px] ${container} pt-[clamp(100px,12vw,140px)] pb-[clamp(64px,9vw,100px)]`}
      >
        <div className={`${mono} text-[#EC3016]`}>HOW IT WORKS</div>
        <h2 className={`${h2} mt-[14px] max-w-[720px] text-balance`}>
          From brief to live ad without starting from scratch.
        </h2>
        <div
          className="mt-14 grid gap-[clamp(8px,3vw,40px)]"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))" }}
        >
          {STEPS.map((s) => (
            <div key={s.n} className="border-t-2 border-[#161514] py-7">
              <div className="text-[48px] leading-none sm:text-[64px] font-extrabold tracking-[-0.04em] text-[#EC3016]">{s.n}</div>
              <h3 className="mt-6 mb-[10px] text-[24px] font-bold">{s.title}</h3>
              <p className="text-[16px] leading-[1.55] text-pretty text-[#55524e]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LIBRARY */}
      <section id="library" className="scroll-mt-[72px] bg-[#161514] text-white">
        <div className={`${container} py-[clamp(64px,9vw,100px)]`}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className={`${mono} text-[#ff7a5c]`}>A PEEK INSIDE</div>
              <h2 className={`${h2} mt-[14px]`}>What&rsquo;s in the library</h2>
            </div>
            <div className={`${chipRow} max-sm:w-full`}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                  dark
                  className="px-4 py-[9px] text-[14px]"
                />
              ))}
            </div>
          </div>
          <div
            className="mt-8 grid grid-cols-1 gap-8 min-[700px]:mt-12 min-[700px]:[grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] min-[700px]:gap-5"
          >
            {liveAds === null
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex flex-col gap-[14px]" aria-hidden>
                    <div className="aspect-square animate-pulse bg-white/10" />
                    <div className="h-[38px] animate-pulse bg-white/5" />
                  </div>
                ))
              : libraryAds.map((ad) => (
                  <div key={ad.key} className="flex min-w-0 flex-col gap-[14px]">
                    <Link
                      href={ad.href}
                      className="group relative flex aspect-square flex-col justify-between overflow-hidden p-[18px]"
                      style={{ color: ad.fg }}
                    >
                      <CardBackground ad={ad} />
                      {!ad.photo && (
                        <>
                          <div className="relative text-[11px] font-bold tracking-[0.12em]">{ad.tag}</div>
                          <div className="relative">
                            <div className="text-[24px] leading-[1.1] font-extrabold tracking-[-0.01em]">{ad.headline}</div>
                            {ad.cta && (
                              <div className="mt-3 inline-block px-[11px] py-[7px] text-[11px] font-extrabold" style={ad.ctaStyle}>
                                {ad.cta}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {ad.video && (
                        <span className="absolute top-3 right-3 bg-white/92 px-[6px] py-[3px] font-mono text-[10px] text-[#161514]">
                          &#9654; VIDEO
                        </span>
                      )}
                    </Link>
                    <div className="flex items-center justify-between gap-3 text-[14px]">
                      <div className="flex min-w-0 flex-col gap-[3px]">
                        <span className="truncate font-semibold">{ad.name}</span>
                        <span className="truncate font-mono text-[12px] text-[#a19d98]">{ad.meta}</span>
                      </div>
                      <Link
                        href={ad.href}
                        className="border border-[#4a4744] px-3 py-2 text-center text-[13px] font-semibold whitespace-nowrap hover:border-[#EC3016] hover:bg-[#EC3016]"
                      >
                        Edit copy →
                      </Link>
                    </div>
                  </div>
                ))}
          </div>
          <div className="mt-14 flex justify-center">
            {signedIn ? (
              <Link href="/library" className="shrink-0 bg-[#EC3016] px-7 py-4 text-[17px] font-bold whitespace-nowrap">
                Open the full library
              </Link>
            ) : (
              <Link href="/library" className="shrink-0 bg-[#EC3016] px-7 py-4 text-[17px] font-bold whitespace-nowrap">
                Explore the full library
              </Link>
            )}
          </div>
        </div>
      </section>

      <PricingSection signedIn={signedIn} />

      <ContactSection />

      {/* REQUEST */}
      <section id="request" className={`scroll-mt-[72px] ${container} py-[clamp(64px,10vw,110px)]`}>
        <div
          className="grid items-center gap-16"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))" }}
        >
          <div>
            <div className={`${mono} text-[#EC3016]`}>CAN&rsquo;T FIND IT?</div>
            <h2 className={`${h2} mt-[14px] text-balance`}>Request a new creative. Get it in about 3 days.</h2>
            <p className="mt-6 max-w-[500px] text-[18px] leading-[1.55] text-pretty text-[#55524e]">
              Ask the creative team for a new size, a market, or a brand-new ad. Average turnaround is 3 working days.
            </p>
            <div className="mt-8">
              <div className="text-[48px] font-extrabold tracking-[-0.03em]">3</div>
              <div className="text-[14px] text-[#55524e]">working days, on average</div>
            </div>
          </div>
          <div className="flex flex-col gap-5 border border-[#e0ddd9] bg-white p-[clamp(20px,5vw,32px)]">
            <div className="text-[20px] font-bold">New request</div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-[#55524e]">What do you need?</span>
              <div className="flex flex-wrap gap-2">
                {REQUEST_TYPES.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    active={requestType === r}
                    onClick={() => setRequestType(r)}
                    className="px-[14px] py-[10px] text-[14px]"
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-[#55524e]">Based on</span>
              <div className="flex items-center gap-3 border border-[#e0ddd9] p-[10px]">
                <div className="h-[50px] w-10 bg-[linear-gradient(160deg,#ffa6cf,#ff6b8a)]" />
                <div className="flex flex-col gap-[2px]">
                  <span className="text-[15px] font-semibold">Ten drops. One week.</span>
                  <span className="font-mono text-[12px] text-[#8a8783]">Meta · 4:5 · EN-US</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-[#55524e]">Notes for the creative team</span>
              <div className="min-h-[72px] border border-[#e0ddd9] p-3 text-[15px] text-[#55524e]">
                {REQUEST_NOTES[requestType]}
              </div>
            </div>
            <a suppressHydrationWarning
              href={signedIn ? "/requests" : "#signup"}
              className="bg-[#161514] px-5 py-[15px] text-center text-[16px] font-bold text-white hover:bg-[#EC3016]"
            >
              Send request
            </a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#EC3016] text-white">
        <div className={`${container} flex flex-wrap items-center justify-between gap-10 py-[clamp(64px,9vw,100px)]`}>
          <div>
            <h2 className="max-w-[760px] text-[clamp(40px,6vw,80px)] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance">
              Stop rebuilding ads you already have.
            </h2>
            <p className="mt-5 text-[19px]">Create an account and start browsing in under a minute.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {signedIn ? (
              <Link href="/library" className="shrink-0 bg-white px-8 py-[18px] text-[18px] font-bold whitespace-nowrap text-[#EC3016]">
                Go to Library
              </Link>
            ) : (
              <>
                <a suppressHydrationWarning href="#top" className="shrink-0 bg-white px-8 py-[18px] text-[18px] font-bold whitespace-nowrap text-[#EC3016]">
                  Sign up free
                </a>
                <Link href="/login" className="shrink-0 border-[1.5px] border-white px-8 py-[18px] text-[18px] font-bold whitespace-nowrap">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
