"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import {
  DOMINANT_COLORS,
  LANGUAGE_OPTIONS,
  MARKET_OPTIONS,
  PLATFORM_OPTIONS,
  VIDEO_LENGTH_OPTIONS,
} from "@/lib/ads";
import { api, type Ad } from "@/lib/api";
import { useRequireAuth } from "@/lib/AuthProvider";

const ADDED_OPTIONS = [
  { label: "Any time", days: null },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 6 months", days: 182 },
] as const;

export default function LibraryPage() {
  const { user, ready } = useRequireAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const [keyword, setKeyword] = useState("");
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [addedDays, setAddedDays] = useState<number | null>(null);
  const [addedCutoff, setAddedCutoff] = useState<number | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [editableOnly, setEditableOnly] = useState(false);
  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [moreOpen, setMoreOpen] = useState(false);

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
    api
      .getSaved()
      .then(({ ads }) => setSavedIds(new Set(ads.map((ad) => ad.id))))
      .catch(() => {});
  }, [user]);

  async function toggleSave(id: string) {
    const wasSaved = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (wasSaved) await api.unsaveAd(id);
      else await api.saveAd(id);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  }

  const imageCount = ads.filter((ad) => ad.mediaType === "image").length;
  const videoCount = ads.filter((ad) => ad.mediaType === "video").length;

  const categoryOptions = useMemo(() => {
    const names = [...new Set(ads.map((ad) => ad.category))].sort();
    return names.map((name) => ({
      name,
      count: ads.filter((ad) => ad.category === name).length,
    }));
  }, [ads]);

  const formatOptions = useMemo(() => {
    const names = [...new Set(ads.map((ad) => ad.format))].sort();
    return names.map((name) => ({
      name,
      count: ads.filter((ad) => ad.format === name).length,
    }));
  }, [ads]);

  function toggle(list: string[], value: string, setList: (v: string[]) => void) {
    setList(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  }

  function resetAllFilters() {
    setKeyword("");
    setMediaTypes([]);
    setPlatforms([]);
    setSelectedCategories([]);
    setCatOpen(false);
    setCountry("");
    setLanguage("");
    setAddedDays(null);
    setAddedCutoff(null);
    setSelectedFormats([]);
    setEditableOnly(false);
    setSelectedLengths([]);
    setSelectedColors([]);
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
      if (
        selectedCategories.length &&
        !selectedCategories.includes(ad.category)
      ) {
        return false;
      }
      if (country && ad.market !== country) return false;
      if (language && ad.language !== language) return false;
      if (addedCutoff !== null && new Date(ad.createdAt).getTime() < addedCutoff) {
        return false;
      }
      if (selectedFormats.length && !selectedFormats.includes(ad.format)) {
        return false;
      }
      if (editableOnly && !ad.editable) return false;
      if (
        selectedLengths.length &&
        !(ad.videoLength && selectedLengths.includes(ad.videoLength))
      ) {
        return false;
      }
      if (
        selectedColors.length &&
        !(ad.dominantColor && selectedColors.includes(ad.dominantColor))
      ) {
        return false;
      }
      return true;
    });
  }, [
    ads,
    keyword,
    mediaTypes,
    platforms,
    selectedCategories,
    country,
    language,
    addedCutoff,
    selectedFormats,
    editableOnly,
    selectedLengths,
    selectedColors,
  ]);

  const activeCount =
    mediaTypes.length +
    platforms.length +
    (keyword ? 1 : 0) +
    selectedCategories.length +
    (country ? 1 : 0) +
    (language ? 1 : 0) +
    (addedDays !== null ? 1 : 0) +
    selectedFormats.length +
    (editableOnly ? 1 : 0) +
    selectedLengths.length +
    selectedColors.length;

  const catSummary =
    selectedCategories.length === 0
      ? "All categories"
      : selectedCategories.length === 1
        ? selectedCategories[0]
        : `${selectedCategories.length} selected`;

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <aside className="w-[220px] shrink-0 border-r-2 border-ink/15 px-5 py-6">
          <div>
            <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
              Keyword
            </p>
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-muted"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                placeholder="Campaign, headline, SKU"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full border border-border bg-surface-2 py-1.5 pr-2.5 pl-8 text-sm text-ink outline-none focus:border-ink/70"
              />
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={mediaTypes.includes("image")}
                  onChange={() => toggle(mediaTypes, "image", setMediaTypes)}
                  className="h-[15px] w-[15px] accent-brand"
                />
                Images
                <span className="ml-auto text-xs text-ink-muted">{imageCount}</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={mediaTypes.includes("video")}
                  onChange={() => toggle(mediaTypes, "video", setMediaTypes)}
                  className="h-[15px] w-[15px] accent-brand"
                />
                Video
                <span className="ml-auto text-xs text-ink-muted">{videoCount}</span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
              Platform
            </p>
            <div className="flex flex-col gap-2.5">
              {PLATFORM_OPTIONS.map((platform) => (
                <label
                  key={platform}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={platforms.includes(platform)}
                    onChange={() => toggle(platforms, platform, setPlatforms)}
                    className="h-[15px] w-[15px] accent-brand"
                  />
                  {platform}
                  <span className="ml-auto text-xs text-ink-muted">
                    {ads.filter((ad) => ad.platforms.includes(platform)).length}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-baseline gap-2">
              <p className="text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
                Category
              </p>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="ml-auto text-xs text-brand hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {selectedCategories.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {selectedCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggle(selectedCategories, cat, setSelectedCategories)}
                    className="flex items-center gap-1.5 border border-brand/30 bg-brand/10 px-2 py-1 text-xs text-brand"
                  >
                    {cat}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setCatOpen((v) => !v)}
                className="flex w-full items-center gap-2 border border-border bg-surface-2 px-2.5 py-1.5 text-left text-sm text-ink outline-none"
              >
                <span className="min-w-0 flex-1 truncate">{catSummary}</span>
                <span className="text-[11px] text-ink-muted">{catOpen ? "▲" : "▼"}</span>
              </button>
              {catOpen && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto border border-border bg-surface p-2 shadow-lg">
                  <div className="flex flex-col gap-2">
                    {categoryOptions.map((c) => (
                      <label
                        key={c.name}
                        className="flex items-center gap-2 text-sm text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(c.name)}
                          onChange={() =>
                            toggle(selectedCategories, c.name, setSelectedCategories)
                          }
                          className="h-[15px] w-[15px] shrink-0 accent-brand"
                        />
                        <span className="min-w-0 flex-1 truncate">{c.name}</span>
                        <span className="text-xs text-ink-muted">{c.count}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
              Country
            </p>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
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
            <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
              Language
            </p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
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
            <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
              Added
            </p>
            <select
              value={addedDays === null ? "" : addedDays}
              onChange={(e) => handleAddedChange(e.target.value)}
              className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
            >
              {ADDED_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.days ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="mt-6 flex w-full items-center gap-2 border border-border px-2.5 py-2 text-left text-sm font-bold text-ink hover:bg-surface-2"
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`shrink-0 transition-transform ${moreOpen ? "rotate-45" : ""}`}
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {moreOpen ? "Show fewer filters" : "Show more filters"}
          </button>

          {moreOpen && (
            <>
              <div className="mt-6">
                <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
                  Canva
                </p>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={editableOnly}
                    onChange={() => setEditableOnly((v) => !v)}
                    className="h-[15px] w-[15px] accent-brand"
                  />
                  Editable only
                </label>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
                  Video length
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_LENGTH_OPTIONS.map((len) => {
                    const active = selectedLengths.includes(len);
                    return (
                      <button
                        key={len}
                        type="button"
                        onClick={() => toggle(selectedLengths, len, setSelectedLengths)}
                        className={`border px-2.5 py-1 text-xs ${
                          active
                            ? "border-brand/30 bg-brand/10 text-brand"
                            : "border-border text-ink hover:bg-surface-2"
                        }`}
                      >
                        {len}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
                  Dominant colour
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DOMINANT_COLORS.map((c) => {
                    const active = selectedColors.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={active}
                        onClick={() => toggle(selectedColors, c.name, setSelectedColors)}
                        style={{ backgroundColor: c.hex }}
                        className={`h-[26px] w-[26px] border ${
                          active
                            ? "outline outline-2 outline-offset-2 outline-brand"
                            : "border-ink/15"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
                  Format
                </p>
                <div className="flex flex-col border border-border">
                  {formatOptions.map((f) => {
                    const active = selectedFormats.includes(f.name);
                    return (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => toggle(selectedFormats, f.name, setSelectedFormats)}
                        className={`flex items-center gap-2 border-b border-border px-2.5 py-1.5 text-left text-sm last:border-b-0 ${
                          active ? "bg-brand/10 text-brand" : "text-ink hover:bg-surface-2"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="text-xs text-ink-muted">{f.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={resetAllFilters}
            className="mt-6 text-sm font-bold text-brand hover:text-brand/80"
          >
            Reset all filters
          </button>
        </aside>

        <main className="flex-1 px-10 py-8">
          <h1 className="text-3xl font-extrabold text-ink">Explore Ads</h1>

          <div className="mt-4 flex items-center gap-3 border-b border-ink/15 pb-4 text-sm">
            <span className="text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
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
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    saved={savedIds.has(ad.id)}
                    onToggleSave={toggleSave}
                  />
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
