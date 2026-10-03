"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Link from "@/components/Link";
import LandingHeader from "@/components/LandingHeader";
import SignUpPrompt from "@/components/SignUpPrompt";
import AdCard from "@/components/AdCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import FeedbackPanel from "@/components/FeedbackPanel";
import Pagination, { usePagination } from "@/components/Pagination";
import Spinner from "@/components/Spinner";
import UpgradePrompt from "@/components/UpgradePrompt";
import { can } from "@/lib/plans";
import {
  DOMINANT_COLORS,
  LANGUAGE_OPTIONS,
  MARKET_OPTIONS,
  PLATFORM_OPTIONS,
  VIDEO_LENGTH_OPTIONS,
} from "@/lib/ads";
import { api, ApiError, type Ad, type User } from "@/lib/api";

const ADDED_OPTIONS = [
  { label: "Any time", days: null },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 6 months", days: 182 },
] as const;

// Multiples of every column count the grid uses (2–5), so pages end on a
// full row.
const PAGE_SIZE_OPTIONS = [20, 40, 60, 100];

// Visitors preview this many ads per platform they pick (or this many in
// total with none picked); the rest of the library needs an account.
const PREVIEW_PER_PLATFORM = 10;

// Page numbers to show around the current page, with null marking a gap,
// e.g. 1 … 4 5 6 … 12.
export default function LibraryView({
  heading,
  user,
  initialTags,
  initialQuery,
  initialCategory,
  initialAds,
}: {
  heading: string;
  // Null for visitors on the public /library page: anyone can browse, but
  // saving asks them to sign up and there are no filters or admin controls.
  user: User | null;
  // Ads rendered on the server (public page), so the grid is in the HTML
  // search engines see rather than loaded afterwards.
  initialAds?: Ad[];
  // The page's ?tag= value(s), so a tag clicked on an ad page opens the
  // library already filtered to it.
  initialTags?: string | string[];
  // The page's ?q= search and ?category=, used by links on ad pages
  // (popular searches, the category in the details and breadcrumb).
  initialQuery?: string;
  initialCategory?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ads, setAds] = useState<Ad[]>(initialAds ?? []);
  const [loading, setLoading] = useState(!initialAds);
  const [signUpPrompt, setSignUpPrompt] = useState<"save" | "filters" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveLocked, setSaveLocked] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ad | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [keyword, setKeyword] = useState(initialQuery ?? "");
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [catOpen, setCatOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [addedDays, setAddedDays] = useState<number | null>(null);
  const [addedCutoff, setAddedCutoff] = useState<number | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [editableOnly, setEditableOnly] = useState(false);
  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  // Taken from the page's searchParams rather than window.location, which
  // still holds the previous page's URL while Next is navigating here.
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    initialTags === undefined
      ? []
      : Array.isArray(initialTags)
        ? initialTags
        : [initialTags]
  );
  const [moreOpen, setMoreOpen] = useState(false);

  // Keep ?tag=, ?q= and ?category= in step with the filters so a filtered
  // view can be bookmarked or shared.
  useEffect(() => {
    const params = new URLSearchParams();
    selectedTags.forEach((t) => params.append("tag", t));
    if (keyword) params.set("q", keyword);
    if (selectedCategories.length === 1) params.set("category", selectedCategories[0]);
    const qs = params.toString();
    window.history.replaceState(null, "", `${pathname}${qs ? `?${qs}` : ""}`);
  }, [selectedTags, keyword, selectedCategories, pathname]);

  function handleAddedChange(value: string) {
    const days = value === "" ? null : Number(value);
    setAddedDays(days);
    setAddedCutoff(days === null ? null : Date.now() - days * 24 * 60 * 60 * 1000);
  }

  const signedIn = !!user;
  useEffect(() => {
    if (!initialAds) {
      api
        .getAds()
        .then(({ ads }) => setAds(ads))
        .catch(() => setError("Couldn't load ads from the server."))
        .finally(() => setLoading(false));
    }
    if (signedIn) {
      api
        .getSaved()
        .then(({ ads }) => setSavedIds(new Set(ads.map((ad) => ad.id))))
        .catch(() => {});
    }
  }, [initialAds, signedIn]);

  async function toggleSave(id: string) {
    const wasSaved = savedIds.has(id);
    if (!user) return setSignUpPrompt("save");
    if (!wasSaved && !can(user, "save")) return setSaveLocked(true);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (wasSaved) await api.unsaveAd(id);
      else await api.saveAd(id);
    } catch (err) {
      if (err instanceof ApiError && err.upgrade) setSaveLocked(true);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  }

  function handleDeleteAd(id: string) {
    const ad = ads.find((a) => a.id === id);
    if (ad) setDeleteTarget(ad);
  }

  async function handleConfirmDeleteAd() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    const id = deleteTarget.id;
    try {
      await api.deleteAd(id);
      setAds((list) => list.filter((a) => a.id !== id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err instanceof ApiError ? err.message : "Couldn't delete that ad."
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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
    setSelectedTags([]);
  }

  const filtered = useMemo(() => {
    const kw = keyword.toLowerCase();
    const wantedTags = selectedTags.map((t) => t.toLowerCase());
    return ads.filter((ad) => {
      const adTags = (ad.tags ?? []).map((t) => t.toLowerCase());
      if (
        kw &&
        ![ad.headline, ad.title, ad.brandName, ad.adFormat, ad.subcategory, ad.category].some(
          (v) => v?.toLowerCase().includes(kw)
        ) &&
        !adTags.some((t) => t.includes(kw) || kw.includes(t))
      ) {
        return false;
      }
      if (wantedTags.length && !wantedTags.some((t) => adTags.includes(t))) {
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
    selectedTags,
  ]);

  // Any filter change goes back to the first page. Adjusted during render
  // (not in an effect) so the stale page never flashes.
  const filterKey = JSON.stringify([
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
    selectedTags,
  ]);
  const pagination = usePagination(filtered.length, "adplaylist_library_page_size", {
    options: PAGE_SIZE_OPTIONS,
    defaultSize: PAGE_SIZE_OPTIONS[0],
  });
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    pagination.setPage(1);
  }
  const pageAds = filtered.slice(pagination.start, pagination.end);

  // Signed out: up to PREVIEW_PER_PLATFORM ads for each picked platform
  // (an ad on two platforms counts once), then a blurred teaser of what's
  // locked behind sign-up.
  const preview = useMemo(() => {
    if (user) return null;
    const groups: (string | null)[] = platforms.length
      ? PLATFORM_OPTIONS.filter((p) => platforms.includes(p))
      : [null];
    const shownIds = new Set<string>();
    const shown: Ad[] = [];
    for (const platform of groups) {
      let n = 0;
      for (const ad of filtered) {
        if (n >= PREVIEW_PER_PLATFORM) break;
        if (shownIds.has(ad.id) || (platform && !ad.platforms.includes(platform))) continue;
        shownIds.add(ad.id);
        shown.push(ad);
        n++;
      }
    }
    const rest = [...filtered, ...ads].filter((ad) => !shownIds.has(ad.id));
    const locked = [...new Map(rest.map((ad) => [ad.id, ad])).values()].slice(0, 10);
    return { shown, locked };
  }, [user, platforms, filtered, ads]);

  // A new page starts at the top of the grid, not where the controls were.
  function goToPage(p: number) {
    pagination.setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    selectedColors.length +
    selectedTags.length;

  const catSummary =
    selectedCategories.length === 0
      ? "All categories"
      : selectedCategories.length === 1
        ? selectedCategories[0]
        : `${selectedCategories.length} selected`;

  return (
    <div className="flex min-h-screen flex-col">
      {user ? <AppHeader /> : <LandingHeader />}
      <div className="flex flex-1">
        {/* Visitors get the platform filter only; the rest come with an account. */}
        {!user && (
          <aside className="hidden w-[250px] shrink-0 border-r-2 border-ink/15 px-5 py-6 md:block">
            <p className="mb-3 text-[11px] font-medium tracking-[0.12em] text-ink-muted uppercase">
              Platform
            </p>
            <div className="flex flex-col gap-2.5">
              {PLATFORM_OPTIONS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm text-ink">
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
            <p className="mt-3 text-xs leading-relaxed text-ink-muted">
              Preview up to {PREVIEW_PER_PLATFORM} ads per platform.
            </p>

            <div className="mt-6 flex flex-col gap-3 border-t border-ink/15 pt-6">
              <button
                type="button"
                onClick={() => setSignUpPrompt("filters")}
                className="flex items-center gap-2 border border-border bg-card px-3 py-2.5 text-left text-sm font-bold text-ink hover:border-ink"
              >
                <span className="text-base font-normal">+</span>
                <span className="flex-1 whitespace-nowrap">Show more filters</span>
                <span className="text-[10px] tracking-[0.12em] text-brand">TRIAL</span>
              </button>
              <p className="text-xs leading-relaxed text-ink-muted">
                Keyword, category, country, language and date filters come with the free trial.
              </p>
              <Link
                href="/signup"
                className="bg-brand px-3 py-2.5 text-center text-sm font-bold text-brand-foreground hover:bg-brand/90"
              >
                Start free trial
              </Link>
            </div>
          </aside>
        )}

        {user && (
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
                placeholder="Campaign, headline, tag"
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
        )}

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-10">
          <h1 className="text-3xl font-extrabold text-ink">{heading}</h1>

          {!user ? (
            <>
              {/* Phones have no sidebar, so the platform filter sits here. */}
              <div className="mt-4 flex flex-wrap gap-2 md:hidden">
                {PLATFORM_OPTIONS.map((platform) => {
                  const on = platforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(platforms, platform, setPlatforms)}
                      className={`border px-3 py-1.5 text-sm font-bold ${
                        on ? "border-ink bg-ink text-surface" : "border-border bg-surface text-ink"
                      }`}
                    >
                      {platform}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ink/15 pb-4 text-sm text-ink-muted">
                <span className="text-[11px] font-medium tracking-[0.12em] uppercase">Active</span>
                <span>
                  {platforms.length
                    ? PLATFORM_OPTIONS.filter((p) => platforms.includes(p)).join(", ")
                    : "None — showing everything cleared for you"}
                </span>
                {/* Tag, search and category links from ad pages still narrow the list. */}
                {(selectedTags.length > 0 || keyword || selectedCategories.length > 0) && (
                  <>
                    <span>
                      {selectedCategories.length > 0 && <>· {selectedCategories.join(", ")} ads </>}
                      {selectedTags.length > 0 && (
                        <>
                          · tagged <span className="font-bold text-ink">{selectedTags.join(", ")}</span>{" "}
                        </>
                      )}
                      {keyword && (
                        <>
                          · matching <span className="font-bold text-ink">&ldquo;{keyword}&rdquo;</span>
                        </>
                      )}
                    </span>
                    <button type="button" onClick={resetAllFilters} className="font-bold text-brand">
                      Show all ads
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
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
          )}

          {loading && (
            <div className="mt-10 flex items-center gap-2 text-sm text-ink-muted">
              <Spinner />
              Loading ads…
            </div>
          )}
          {error && (
            <p className="mt-10 text-sm text-brand">{error}</p>
          )}
          {deleteError && (
            <p className="mt-4 text-sm text-brand" role="alert">
              {deleteError}
            </p>
          )}

          {!loading && !error && preview && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {preview.shown.map((ad) => (
                  <AdCard key={ad.id} ad={ad} saved={false} onToggleSave={toggleSave} />
                ))}
              </div>

              {preview.shown.length === 0 && (
                <p className="mt-10 text-sm text-ink-muted">No ads match those filters.</p>
              )}

              {preview.locked.length > 0 && (
                <div className="relative mt-10">
                  <div
                    aria-hidden="true"
                    inert
                    className="pointer-events-none grid grid-cols-2 gap-x-6 gap-y-10 opacity-85 blur-[14px] select-none sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                  >
                    {preview.locked.map((ad) => (
                      <AdCard key={ad.id} ad={ad} saved={false} onToggleSave={() => {}} />
                    ))}
                  </div>
                  <div className="absolute inset-x-[-20px] top-[-40px] bottom-0 flex justify-center bg-gradient-to-b from-surface/0 via-surface/80 to-surface px-4 pt-24 sm:pt-36">
                    <div className="flex h-fit w-full max-w-[520px] flex-col items-center gap-4 border border-border bg-card px-6 py-10 text-center shadow-[0_24px_60px_rgba(20,20,20,0.12)] sm:px-12">
                      <p className="text-[11px] font-medium tracking-[0.16em] text-ink-muted uppercase">
                        You&rsquo;ve seen {preview.shown.length} of {filtered.length} ads
                      </p>
                      <h2 className="text-[28px] leading-tight font-extrabold text-balance text-ink sm:text-[32px]">
                        Sign up to see the full library
                      </h2>
                      <p className="text-base leading-relaxed text-pretty text-ink-muted">
                        Start your 7-day free trial to browse all {ads.length} ads, save the ones you
                        like and request creatives.
                      </p>
                      {platforms.length < PLATFORM_OPTIONS.length && (
                        <p className="text-sm text-ink-muted">
                          Or pick another platform to preview {PREVIEW_PER_PLATFORM} more.
                        </p>
                      )}
                      <div className="mt-2 flex w-full flex-col gap-3">
                        <Link
                          href="/signup"
                          className="bg-brand px-4 py-4 text-base font-bold text-brand-foreground hover:bg-brand/90"
                        >
                          Start free trial
                        </Link>
                        <Link href="/login" className="text-sm text-ink-muted underline">
                          Already have an account? Log in
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && !error && !preview && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {pageAds.map((ad) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    saved={savedIds.has(ad.id)}
                    onToggleSave={toggleSave}
                    onDelete={user?.role === "admin" ? handleDeleteAd : undefined}
                    onEdit={
                      user?.role === "admin"
                        ? (id) => router.push(`/ads/${id}/edit`)
                        : undefined
                    }
                  />
                ))}
              </div>

              {filtered.length > 0 && (
                <div className="mt-12 border-t border-ink/15 pt-3">
                  <Pagination {...pagination.props} onPageChange={goToPage} />
                </div>
              )}

              {filtered.length === 0 && (
                <p className="mt-10 text-sm text-ink-muted">
                  No ads match those filters.
                </p>
              )}
            </>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete ad"
        message={
          deleteTarget && (
            <>
              Delete <strong className="text-ink">{deleteTarget.title}</strong>?
              This can&rsquo;t be undone.
            </>
          )
        }
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleConfirmDeleteAd}
        onCancel={() => setDeleteTarget(null)}
      />

      {user && <FeedbackPanel user={user} />}
      <UpgradePrompt reason={saveLocked ? "save" : null} onClose={() => setSaveLocked(false)} />
      <SignUpPrompt reason={signUpPrompt} onClose={() => setSignUpPrompt(null)} />
    </div>
  );
}
