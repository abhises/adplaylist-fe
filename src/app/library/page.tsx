"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import { LANGUAGE_OPTIONS, MARKET_OPTIONS, PLATFORM_OPTIONS } from "@/lib/ads";
import { api, type Ad } from "@/lib/api";
import { useRequireAuth } from "@/lib/AuthProvider";

const ADDED_OPTIONS = [
  { label: "Any time", days: null },
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

export default function LibraryPage() {
  const { user, ready } = useRequireAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [addedDays, setAddedDays] = useState<number | null>(null);
  const [addedCutoff, setAddedCutoff] = useState<number | null>(null);

  function handleAddedChange(value: string) {
    const days = value === "" ? null : Number(value);
    setAddedDays(days);
    setAddedCutoff(days === null ? null : Date.now() - days * 24 * 60 * 60 * 1000);
  }

  useEffect(() => {
    if (!user) return;
    api
      .getAds()
      .then(({ ads }) => setAds(ads))
      .catch(() => setError("Couldn't load ads from the server."))
      .finally(() => setLoading(false));
  }, [user]);

  const imageCount = ads.filter((ad) => ad.mediaType === "image").length;
  const videoCount = ads.filter((ad) => ad.mediaType === "video").length;

  const categories = [...new Set(ads.map((ad) => ad.category))].sort();

  function toggle(list: string[], value: string, setList: (v: string[]) => void) {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  }

  const filtered = useMemo(() => {
    return ads.filter((ad) => {
      if (
        keyword &&
        !ad.headline.toLowerCase().includes(keyword.toLowerCase()) &&
        !ad.title.toLowerCase().includes(keyword.toLowerCase())
      ) {
        return false;
      }
      if (mediaTypes.length && !mediaTypes.includes(ad.mediaType)) {
        return false;
      }
      if (
        platforms.length &&
        !platforms.some((p) => ad.platforms.includes(p))
      ) {
        return false;
      }
      if (category && ad.category !== category) return false;
      if (country && ad.market !== country) return false;
      if (language && ad.language !== language) return false;
      if (addedCutoff !== null && new Date(ad.createdAt).getTime() < addedCutoff) {
        return false;
      }
      return true;
    });
  }, [
    ads,
    keyword,
    mediaTypes,
    platforms,
    category,
    country,
    language,
    addedCutoff,
  ]);

  const activeCount =
    mediaTypes.length +
    platforms.length +
    (keyword ? 1 : 0) +
    (category ? 1 : 0) +
    (country ? 1 : 0) +
    (language ? 1 : 0) +
    (addedDays !== null ? 1 : 0);

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <aside className="w-64 shrink-0 border-r border-ink/15 px-6 py-8">
          <div>
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Keyword
            </p>
            <input
              type="text"
              placeholder="Campaign, headline"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="mt-2 w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
            />
          </div>

          <div className="mt-6 space-y-2">
            <label className="flex items-center justify-between text-sm text-ink">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mediaTypes.includes("image")}
                  onChange={() => toggle(mediaTypes, "image", setMediaTypes)}
                  className="h-4 w-4 accent-brand"
                />
                Images
              </span>
              <span className="text-ink-muted">{imageCount}</span>
            </label>
            <label className="flex items-center justify-between text-sm text-ink">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mediaTypes.includes("video")}
                  onChange={() => toggle(mediaTypes, "video", setMediaTypes)}
                  className="h-4 w-4 accent-brand"
                />
                Video
              </span>
              <span className="text-ink-muted">{videoCount}</span>
            </label>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Platform
            </p>
            <div className="mt-2 space-y-2">
              {PLATFORM_OPTIONS.map((platform) => (
                <label
                  key={platform}
                  className="flex items-center justify-between text-sm text-ink"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={platforms.includes(platform)}
                      onChange={() => toggle(platforms, platform, setPlatforms)}
                      className="h-4 w-4 accent-brand"
                    />
                    {platform}
                  </span>
                  <span className="text-ink-muted">
                    {ads.filter((ad) => ad.platforms.includes(platform)).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Category
            </p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Country
            </p>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-2 w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
            >
              <option value="">All countries</option>
              {MARKET_OPTIONS.slice(1).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Language
            </p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-2 w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
            >
              <option value="">All languages</option>
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Added
            </p>
            <select
              value={addedDays === null ? "" : addedDays}
              onChange={(e) => handleAddedChange(e.target.value)}
              className="mt-2 w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
            >
              {ADDED_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.days ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <main className="flex-1 px-10 py-8">
          <h1 className="text-3xl font-extrabold text-ink">Explore Ads</h1>

          <div className="mt-4 flex items-center gap-3 border-b border-ink/15 pb-4 text-sm">
            <span className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Active
            </span>
            <span className="text-ink-muted">
              {activeCount === 0
                ? "None — showing everything cleared for you"
                : `${activeCount} filter${activeCount > 1 ? "s" : ""} applied`}
            </span>
          </div>

          {loading && (
            <p className="mt-10 text-sm text-ink-muted">Loading ads…</p>
          )}
          {error && (
            <p className="mt-10 text-sm text-brand">{error}</p>
          )}

          {!loading && !error && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>

              {filtered.length === 0 && (
                <p className="mt-10 text-sm text-ink-muted">
                  No ads match those filters.
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
