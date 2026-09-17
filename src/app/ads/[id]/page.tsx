"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import { SIZE_OPTIONS } from "@/lib/ads";

function parseAspectRatio(dims: string) {
  const [w, h] = dims.split("x").map((n) => parseInt(n.trim(), 10));
  return w && h ? `${w} / ${h}` : "4 / 5";
}
import { api, ApiError, type Ad } from "@/lib/api";
import { useRequireAuth } from "@/lib/AuthProvider";

export default function AdDetailPage({ params }: PageProps<"/ads/[id]">) {
  const { id } = use(params);
  const { user, ready } = useRequireAuth();

  const [ad, setAd] = useState<Ad | null>(null);
  const [allAds, setAllAds] = useState<Ad[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSize, setActiveSize] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => {
      setLoading(true);
      setNotFound(false);
      setActiveSize(0);

      return Promise.all([api.getAd(id), api.getAds(), api.getSaved()])
        .then(([adRes, adsRes, savedRes]) => {
          setAd(adRes.ad);
          setAllAds(adsRes.ads);
          setSaved(savedRes.ads.some((a) => a.id === id));
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) setNotFound(true);
        })
        .finally(() => setLoading(false));
    });
  }, [id, user]);

  async function toggleSaved() {
    if (!ad) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await api.saveAd(ad.id);
      else await api.unsaveAd(ad.id);
    } catch {
      setSaved(!next);
    }
  }

  if (!ready || !user) return null;
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <p className="px-10 py-8 text-sm text-ink-muted">Loading ad…</p>
      </div>
    );
  }
  if (notFound || !ad) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="px-10 py-8">
          <p className="text-sm text-ink-muted">Ad not found.</p>
          <Link href="/library" className="mt-2 inline-block text-sm text-brand">
            &larr; Back to Library
          </Link>
        </div>
      </div>
    );
  }

  const index = allAds.findIndex((a) => a.id === ad.id);
  const prevAd = index > 0 ? allAds[index - 1] : null;
  const nextAd = index >= 0 && index < allAds.length - 1 ? allAds[index + 1] : null;
  const related = allAds
    .filter((a) => a.category === ad.category && a.id !== ad.id)
    .slice(0, 4);

  const useLight = ad.light && !ad.photo;
  const inkText = useLight ? "text-ink" : "text-white";
  const inkTextMuted = useLight ? "text-ink/70" : "text-white/80";
  const previewAspectRatio = parseAspectRatio(
    SIZE_OPTIONS[activeSize]?.dims ?? "1080 x 1350"
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <div className="flex items-center justify-between border-b border-ink/15 px-10 py-4">
        <Link href="/library" className="text-sm font-medium text-brand">
          &larr; Library
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

      <main className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_420px]">
        <div className="border-r border-ink/15 px-10 py-8">
          <div
            style={{ aspectRatio: previewAspectRatio }}
            className={`relative mx-auto w-full max-w-md overflow-hidden ${
              ad.photo ? "" : ad.swatch
            }`}
          >
            {ad.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.photo}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {ad.photo && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
            )}
            {ad.eyebrow && (
              <span
                className={`absolute top-4 left-4 text-[11px] font-medium tracking-[1px] uppercase ${inkText}/90`}
              >
                {ad.eyebrow}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className={`text-3xl leading-tight font-extrabold ${inkText}`}>
                {ad.headline}
              </p>
              {ad.sub && (
                <p className={`mt-2 text-sm ${inkTextMuted}`}>{ad.sub}</p>
              )}
              {ad.cta && (
                <span className="mt-4 inline-block bg-brand px-4 py-2 text-xs font-bold text-brand-foreground uppercase">
                  {ad.cta}
                </span>
              )}
            </div>
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

          <div className="mt-6 grid grid-cols-2 border-t border-l border-ink/15 sm:grid-cols-4">
            {SIZE_OPTIONS.map((size, i) => (
              <button
                key={size.name}
                onClick={() => setActiveSize(i)}
                className={`border-r border-b border-ink/15 px-3 py-3 text-left text-sm ${
                  i === activeSize
                    ? "border-b-2 border-b-brand font-bold text-ink"
                    : "text-ink-muted"
                }`}
              >
                <span className="block">{size.name}</span>
                <span className="block text-xs text-ink-muted">
                  {size.dims}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-10 py-8">
          <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
            Creative &middot; {SIZE_OPTIONS[activeSize]?.dims}
          </p>
          <div className="mt-1 flex items-start justify-between">
            <h1 className="text-3xl font-extrabold text-ink">{ad.title}</h1>
            <div className="flex gap-2">
              <button
                onClick={toggleSaved}
                aria-label="Save ad"
                className={`flex h-9 w-9 items-center justify-center border border-border ${
                  saved ? "bg-brand text-brand-foreground" : "text-ink"
                }`}
              >
                &#128278;
              </button>
              <button
                aria-label="Copy link"
                className="flex h-9 w-9 items-center justify-center border border-border text-ink"
              >
                &#128279;
              </button>
            </div>
          </div>

          <button className="mt-6 w-full bg-brand py-2.5 text-sm font-bold text-brand-foreground">
            &#9998; Edit in Canva
          </button>
          <button className="mt-2 flex w-full items-center justify-between border border-border px-3 py-2.5 text-sm font-bold text-ink">
            <span>&#8595; Download</span>
            <span>&#9662;</span>
          </button>

          <div className="mt-8">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Details
            </p>
            <div className="mt-2 divide-y divide-ink/10 border-t border-ink/10">
              <div className="flex justify-between py-3 text-sm">
                <span className="text-ink-muted">Category</span>
                <span className="text-ink">{ad.category}</span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-ink-muted">Market</span>
                <span className="text-ink">{ad.market}</span>
              </div>
            </div>
          </div>
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
    </div>
  );
}
