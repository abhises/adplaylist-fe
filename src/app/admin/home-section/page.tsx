"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import AdCard from "@/components/AdCard";
import AppHeader from "@/components/AppHeader";
import Spinner from "@/components/Spinner";
import { api, ApiError, type Ad } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

// The two landing page areas an admin can fill, and the ad field that marks
// an ad as picked for each.
const AREAS = {
  hero: {
    label: "Hero panel",
    field: "showInHero",
    // The hero's product panel only has room for six tiles.
    max: 6,
    help: "the product panel at the top of the landing page. It has room for six ads.",
  },
  library: {
    label: "Library section",
    field: "featured",
    max: undefined,
    help: "the “What’s in the library” section of the landing page. Four fill one row on desktop.",
  },
} as const;

type Area = keyof typeof AREAS;
type View = "all" | "selected";

// Admins pick which ads the landing page shows. Clicking an ad's home icon
// adds it to, or removes it from, the chosen area straight away.
export default function AdminHomeSectionPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [area, setArea] = useState<Area>("hero");
  const [view, setView] = useState<View>("all");
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

  const { label, field, max, help } = AREAS[area];

  async function toggle(ad: Ad) {
    const next = !ad[field];
    const set = (value: boolean) =>
      setAds((list) => list && list.map((a) => (a.id === ad.id ? { ...a, [field]: value } : a)));
    setError(null);
    setPending((p) => new Set(p).add(ad.id));
    // Flip it right away; put it back if the save fails.
    set(next);
    try {
      await api.setAdHomeSection(ad.id, { [field]: next });
    } catch (err) {
      set(!next);
      setError(err instanceof ApiError ? err.message : "Couldn't update that ad.");
    } finally {
      setPending((p) => {
        const copy = new Set(p);
        copy.delete(ad.id);
        return copy;
      });
    }
  }

  if (!ready || !user) return null;

  const selectedCount = ads?.filter((a) => a[field]).length ?? 0;
  const full = max !== undefined && selectedCount >= max;
  const shown = view === "selected" ? (ads ?? []).filter((a) => a[field]) : (ads ?? []);

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
            const count = ads?.filter((ad) => ad[AREAS[a].field]).length ?? 0;
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
                  ({count}
                  {cap !== undefined && `/${cap}`})
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 max-w-2xl text-sm text-ink-muted">
          Click the <HomeIcon filled={false} className="inline h-4 w-4 align-[-3px]" /> icon on an ad to show it in {help}
        </p>

        <div className="mt-4 flex items-center gap-3 border-b border-ink/15 pb-4 text-sm">
          {(["all", "selected"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`border px-3 py-1.5 font-bold ${
                view === v ? "border-ink bg-ink text-surface" : "border-border text-ink"
              }`}
            >
              {v === "all" ? `All ads${ads ? ` (${ads.length})` : ""}` : `In ${label.toLowerCase()} (${selectedCount})`}
            </button>
          ))}
          {full && (
            <span className="text-ink-muted">
              {label} is full. Remove an ad to add another.
            </span>
          )}
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
            {view === "selected" ? "No ads picked yet. Pick some from All ads." : "No ads yet."}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((ad) => {
              const on = !!ad[field];
              const blocked = !on && full;
              const busy = pending.has(ad.id);
              return (
                <div key={ad.id} className={`relative ${on ? "outline-2 outline-offset-4 outline-brand" : ""}`}>
                  <AdCard ad={ad} disableLink />
                  <button
                    type="button"
                    onClick={() => toggle(ad)}
                    disabled={busy || blocked}
                    aria-pressed={on}
                    aria-label={on ? `Remove ${ad.title} from the ${label.toLowerCase()}` : `Show ${ad.title} in the ${label.toLowerCase()}`}
                    title={
                      blocked
                        ? `${label} is full (${max} ads)`
                        : on
                          ? `Remove from ${label.toLowerCase()}`
                          : `Show in ${label.toLowerCase()}`
                    }
                    className={`absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center border transition-colors disabled:opacity-50 ${
                      on
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border bg-surface text-ink enabled:hover:border-brand enabled:hover:text-brand"
                    }`}
                  >
                    <HomeIcon filled={on} className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
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
