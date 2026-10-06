"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import AdCard from "@/components/AdCard";
import AppHeader from "@/components/AppHeader";
import Spinner from "@/components/Spinner";
import { api, ApiError, type Ad } from "@/lib/api";
import { HERO_PER_PLATFORM, HERO_PLATFORMS, heroPlatformsOf } from "@/lib/ads";
import { useRequireRole } from "@/lib/AuthProvider";

// The two landing page areas an admin can fill.
const AREAS = {
  hero: {
    label: "Hero panel",
    // A tab per platform, up to six ads each.
    max: HERO_PLATFORMS.length * HERO_PER_PLATFORM,
  },
  library: {
    label: "Library section",
    max: undefined,
  },
} as const;

type Area = keyof typeof AREAS;
type View = "all" | "selected";

const heroOf = (ad: Ad) => ad.heroPlatforms ?? [];

// Whether an ad is picked for an area (for the hero, any of its tabs).
function isPicked(ad: Ad, area: Area) {
  return area === "hero" ? heroOf(ad).length > 0 : !!ad.featured;
}

// Admins pick which ads the landing page shows. Clicking an ad's home icon
// (library) or platform buttons (hero) adds it to, or removes it from, that
// spot straight away.
export default function AdminHomeSectionPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [area, setArea] = useState<Area>("hero");
  const [view, setView] = useState<View>("all");
  // "All" or one of HERO_PLATFORMS.
  const [platform, setPlatform] = useState("All");
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getAds()
      .then((res) =>
        setAds([...res.ads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      )
      .catch(() => setError("Couldn't load ads."));
  }, [user]);

  const { label } = AREAS[area];

  async function save(ad: Ad, change: { featured?: boolean; heroPlatforms?: string[] }) {
    const before = { featured: ad.featured, heroPlatforms: ad.heroPlatforms };
    const set = (values: Partial<Ad>) =>
      setAds((list) => list && list.map((a) => (a.id === ad.id ? { ...a, ...values } : a)));
    setError(null);
    setPending((p) => new Set(p).add(ad.id));
    // Change it right away; put it back if the save fails.
    set(change);
    try {
      await api.setAdHomeSection(ad.id, change);
    } catch (err) {
      set(before);
      setError(err instanceof ApiError ? err.message : "Couldn't update that ad.");
    } finally {
      setPending((p) => {
        const copy = new Set(p);
        copy.delete(ad.id);
        return copy;
      });
    }
  }

  function toggleHero(ad: Ad, p: string) {
    const current = heroOf(ad);
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    save(ad, { heroPlatforms: HERO_PLATFORMS.filter((x) => next.includes(x)) });
  }

  if (!ready || !user) return null;

  // Ads picked for each hero tab.
  const heroCounts = new Map(
    HERO_PLATFORMS.map((p) => [p, ads?.filter((a) => heroOf(a).includes(p)).length ?? 0])
  );
  const heroTotal = [...heroCounts.values()].reduce((a, b) => a + b, 0);
  const areaCount = (a: Area) =>
    a === "hero" ? heroTotal : (ads?.filter((ad) => isPicked(ad, a)).length ?? 0);

  // The platform filter matches the ad's own platforms, except in the hero's
  // picked view, where it shows the ads picked for that tab.
  const onPlatform = (ad: Ad, p: string) =>
    p === "All" ||
    (area === "hero" && view === "selected" ? heroOf(ad) : heroPlatformsOf(ad.platforms)).includes(p);
  const inView = view === "selected" ? (ads ?? []).filter((a) => isPicked(a, area)) : (ads ?? []);
  const shown = inView.filter((a) => onPlatform(a, platform));

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">Admin</p>
        <h1 className="text-3xl font-extrabold text-ink">Home section</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Choose which ads appear on the{" "}
          <Link href="/" className="font-bold text-brand">
            landing page
          </Link>
          . If nothing is picked for an area, it shows the newest ads instead.
        </p>

        <div className="mt-6 flex gap-2" role="tablist">
          {(Object.keys(AREAS) as Area[]).map((a) => {
            const cap = AREAS[a].max;
            return (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={area === a}
                onClick={() => setArea(a)}
                className={`border-b-2 px-1 pb-2 text-base font-extrabold ${
                  area === a ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {AREAS[a].label}{" "}
                <span className="font-medium text-ink-muted">
                  ({areaCount(a)}
                  {cap !== undefined && `/${cap}`})
                </span>
              </button>
            );
          })}
        </div>

        {area === "hero" ? (
          <>
            <p className="mt-4 max-w-2xl text-sm text-ink-muted">
              The product panel at the top of the landing page has a tab each for Meta, Google and LinkedIn. Click
              a platform button on any ad to show it in that tab, up to {HERO_PER_PLATFORM} ads per tab. The same
              ad can go in several tabs. The panel&rsquo;s All tab shows a random mix of every pick.
            </p>
            {ads && (
              <p className="mt-2 flex gap-4 text-sm font-bold text-ink">
                {HERO_PLATFORMS.map((p) => (
                  <span key={p}>
                    {platformName(p)}{" "}
                    <span className="font-medium text-ink-muted">
                      {heroCounts.get(p)}/{HERO_PER_PLATFORM}
                    </span>
                  </span>
                ))}
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 max-w-2xl text-sm text-ink-muted">
            Click the <HomeIcon filled={false} className="inline h-4 w-4 align-[-3px]" /> icon on an ad to show it in
            the &ldquo;What&rsquo;s in the library&rdquo; section of the landing page. Four fill one row on desktop.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-ink/15 pb-4 text-sm">
          {(["all", "selected"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`border px-3 py-1.5 font-bold ${
                view === v ? "border-ink bg-ink text-surface" : "border-border text-ink"
              }`}
            >
              {v === "all"
                ? `All ads${ads ? ` (${ads.length})` : ""}`
                : `In ${label.toLowerCase()} (${ads?.filter((a) => isPicked(a, area)).length ?? 0})`}
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-ink/15" aria-hidden />
          <span className="text-ink-muted">Platform</span>
          {["All", ...HERO_PLATFORMS].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              aria-pressed={platform === p}
              className={`border px-3 py-1.5 font-bold ${
                platform === p ? "border-ink bg-ink text-surface" : "border-border text-ink"
              }`}
            >
              {p === "All" ? "All" : platformName(p)}
              {ads && ` (${inView.filter((a) => onPlatform(a, p)).length})`}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-brand" role="alert">
            {error}
          </p>
        )}

        {ads === null ? (
          !error && (
            <div className="mt-10 flex items-center gap-2 text-sm text-ink-muted">
              <Spinner />
              Loading ads…
            </div>
          )
        ) : shown.length === 0 ? (
          <p className="mt-10 text-sm text-ink-muted">
            {platform !== "All"
              ? `No ${platformName(platform)} ads ${view === "selected" ? `in the ${label.toLowerCase()} yet` : "yet"}.`
              : view === "selected"
                ? "No ads picked yet. Pick some from All ads."
                : "No ads yet."}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((ad) => {
              const on = isPicked(ad, area);
              const busy = pending.has(ad.id);
              return (
                <div key={ad.id} className={`relative ${on ? "outline-2 outline-offset-4 outline-brand" : ""}`}>
                  <AdCard ad={ad} disableLink />
                  {area === "hero" ? (
                    <div className="absolute top-3 left-3 z-10 flex gap-1">
                      {HERO_PLATFORMS.map((p) => {
                        const inTab = heroOf(ad).includes(p);
                        const tabFull = !inTab && (heroCounts.get(p) ?? 0) >= HERO_PER_PLATFORM;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => toggleHero(ad, p)}
                            disabled={busy || tabFull}
                            aria-pressed={inTab}
                            aria-label={`${inTab ? "Remove" : "Show"} ${ad.title} ${inTab ? "from" : "in"} the hero's ${platformName(p)} tab`}
                            title={
                              tabFull
                                ? `The ${platformName(p)} tab is full (${HERO_PER_PLATFORM} ads)`
                                : inTab
                                  ? `Remove from the hero's ${platformName(p)} tab`
                                  : `Show in the hero's ${platformName(p)} tab`
                            }
                            className={`border px-2 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
                              inTab
                                ? "border-brand bg-brand text-brand-foreground"
                                : "border-border bg-surface text-ink enabled:hover:border-brand enabled:hover:text-brand"
                            }`}
                          >
                            {platformName(p)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => save(ad, { featured: !on })}
                      disabled={busy}
                      aria-pressed={on}
                      aria-label={on ? `Remove ${ad.title} from the ${label.toLowerCase()}` : `Show ${ad.title} in the ${label.toLowerCase()}`}
                      title={on ? `Remove from ${label.toLowerCase()}` : `Show in ${label.toLowerCase()}`}
                      className={`absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center border transition-colors disabled:opacity-50 ${
                        on
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-surface text-ink enabled:hover:border-brand enabled:hover:text-brand"
                      }`}
                    >
                      <HomeIcon filled={on} className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function platformName(platform: string) {
  return platform === "META" ? "Meta" : platform;
}

function HomeIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 11 12 4l9 7v9h-6v-6H9v6H3Z" />
    </svg>
  );
}
