"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import {
  CATEGORY_OPTIONS,
  DOMINANT_COLORS,
  LANGUAGE_OPTIONS,
  MARKET_OPTIONS,
  PLATFORM_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/ads";
import { api, ApiError } from "@/lib/api";
import { useRequireAuth } from "@/lib/AuthProvider";

const COLOR_SWATCH: Record<string, { bg: string; light: boolean }> = {
  Black: { bg: "bg-neutral-900", light: false },
  White: { bg: "bg-neutral-100", light: true },
  Grey: { bg: "bg-neutral-400", light: false },
  Red: { bg: "bg-brand", light: false },
  Orange: { bg: "bg-orange-500", light: false },
  Yellow: { bg: "bg-yellow-400", light: true },
  Green: { bg: "bg-emerald-600", light: false },
  Blue: { bg: "bg-blue-700", light: false },
  Purple: { bg: "bg-purple-700", light: false },
  Pink: { bg: "bg-pink-500", light: false },
};

export default function AddAdPage() {
  const { user, ready } = useRequireAuth();

  const [adName, setAdName] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [kicker, setKicker] = useState("");
  const [headline, setHeadline] = useState("");
  const [sub, setSub] = useState("");
  const [cta, setCta] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [market, setMarket] = useState(MARKET_OPTIONS[1]);
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0]);
  const [platforms, setPlatforms] = useState<string[]>(["META"]);
  const [dominantColor, setDominantColor] = useState(DOMINANT_COLORS[0].name);
  const [sizes, setSizes] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ message: string; adId?: string } | null>(
    null
  );

  function togglePlatform(p: string) {
    setPlatforms((list) =>
      list.includes(p) ? list.filter((v) => v !== p) : [...list, p]
    );
  }

  function toggleSize(name: string) {
    setSizes((list) =>
      list.includes(name) ? list.filter((v) => v !== name) : [...list, name]
    );
  }

  async function handlePublish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPublishing(true);
    setResult(null);
    const swatch = COLOR_SWATCH[dominantColor] ?? COLOR_SWATCH.Black;
    try {
      const { ad } = await api.createAd({
        title: adName,
        format: sizes[0] ?? "Feed 1:1",
        variant: "overlay",
        eyebrow: kicker || undefined,
        headline: headline || "Your headline goes here.",
        sub: sub || undefined,
        cta: cta || undefined,
        mediaType,
        swatch: swatch.bg,
        light: swatch.light,
        category,
        market,
        language,
        platforms,
      });
      setResult({ message: "Published to the library.", adId: ad.id });
    } catch (err) {
      setResult({
        message: err instanceof ApiError ? err.message : "Something went wrong.",
      });
    } finally {
      setPublishing(false);
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-ink">Add a new ad</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Upload the creative, classify it, and publish it to the library.
        </p>

        <form
          onSubmit={handlePublish}
          className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2"
        >
          <div className="border border-ink/15 p-6">
            <h2 className="text-xl font-extrabold text-ink">Creative</h2>

            <div className="mt-4">
              <label className="mb-[5px] block text-xs text-ink/70">
                Ad name
              </label>
              <input
                type="text"
                required
                value={adName}
                onChange={(e) => setAdName(e.target.value)}
                placeholder="Long Walk Home — Feed 1:1"
                className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
              />
            </div>

            <div className="mt-4">
              <p className="mb-[5px] block text-xs text-ink/70">
                Media type
              </p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="mediaType"
                    checked={mediaType === "image"}
                    onChange={() => setMediaType("image")}
                    className="h-4 w-4 accent-brand"
                  />
                  Image
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="mediaType"
                    checked={mediaType === "video"}
                    onChange={() => setMediaType("video")}
                    className="h-4 w-4 accent-brand"
                  />
                  Video
                </label>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-ink/70">Master files</label>
                <span className="text-xs text-ink-muted">
                  Drop the creative here (PNG)
                </span>
              </div>
              <div className="mt-1 flex h-40 flex-col items-center justify-center gap-1 border border-dashed border-border text-ink-muted">
                <span className="text-2xl">&#128247;</span>
                <span className="text-sm">Drop file</span>
                <span className="text-xs">No file yet</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Placements are detected from the file
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-[5px] block text-xs text-ink/70">
                Canva template link
              </label>
              <input
                type="url"
                placeholder="Editable in Canva"
                className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
              />
            </div>

            <div className="mt-6 border-t border-ink/10 pt-4">
              <h3 className="text-sm font-bold text-ink">Ad copy</h3>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-[5px] block text-xs text-ink/70">
                    Kicker
                  </label>
                  <input
                    type="text"
                    value={kicker}
                    onChange={(e) => setKicker(e.target.value)}
                    className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
                  />
                </div>
                <div>
                  <label className="mb-[5px] block text-xs text-ink/70">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
                  />
                </div>
                <div>
                  <label className="mb-[5px] block text-xs text-ink/70">
                    Supporting line
                  </label>
                  <input
                    type="text"
                    value={sub}
                    onChange={(e) => setSub(e.target.value)}
                    className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
                  />
                </div>
                <div>
                  <label className="mb-[5px] block text-xs text-ink/70">
                    Call to action
                  </label>
                  <input
                    type="text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border border-ink/15 p-6">
            <h2 className="text-xl font-extrabold text-ink">
              Classification
            </h2>

            <div className="mt-4">
              <label className="mb-[5px] block text-xs text-ink/70">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-[5px] block text-xs text-ink/70">
                  Market
                </label>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
                >
                  {MARKET_OPTIONS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-[5px] block text-xs text-ink/70">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none"
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-[5px] block text-xs text-ink/70">Platforms</p>
              <div className="flex flex-wrap gap-4">
                {PLATFORM_OPTIONS.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={platforms.includes(p)}
                      onChange={() => togglePlatform(p)}
                      className="h-4 w-4 accent-brand"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-[5px] block text-xs text-ink/70">
                Dominant colour
              </p>
              <div className="flex flex-wrap gap-2">
                {DOMINANT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    aria-label={c.name}
                    onClick={() => setDominantColor(c.name)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-8 w-8 border-2 ${
                      dominantColor === c.name
                        ? "border-brand"
                        : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-ink/10 pt-4">
              <h3 className="text-sm font-bold text-ink">Placement sizes</h3>
              <p className="mt-1 text-xs text-ink-muted">
                Tick every size this creative ships in. Sizes appear as tabs
                on the ad page.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {SIZE_OPTIONS.map((size) => (
                  <label
                    key={size.name}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={sizes.includes(size.name)}
                      onChange={() => toggleSize(size.name)}
                      className="h-4 w-4 accent-brand"
                    />
                    <span>
                      {size.name}
                      <span className="block text-xs text-ink-muted">
                        {size.dims}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-ink/15 p-6 lg:col-span-2">
            <h2 className="text-xl font-extrabold text-ink">Preview</h2>
            <div
              className={`relative mt-4 aspect-[4/5] w-full max-w-xs overflow-hidden ${
                COLOR_SWATCH[dominantColor]?.bg ?? "bg-neutral-800"
              }`}
            >
              <div className="absolute inset-x-0 bottom-0 p-4">
                {kicker && (
                  <span
                    className={`text-[11px] font-medium tracking-[1px] uppercase ${
                      COLOR_SWATCH[dominantColor]?.light
                        ? "text-ink/90"
                        : "text-white/90"
                    }`}
                  >
                    {kicker}
                  </span>
                )}
                <p
                  className={`mt-1 text-xl leading-tight font-extrabold ${
                    COLOR_SWATCH[dominantColor]?.light
                      ? "text-ink"
                      : "text-white"
                  }`}
                >
                  {headline || "Your headline goes here."}
                </p>
                {cta && (
                  <span className="mt-3 inline-block bg-brand px-3 py-1.5 text-[11px] font-bold text-brand-foreground uppercase">
                    {cta}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              {mediaType === "image" ? "Image" : "Video"} &middot; {category}{" "}
              &middot; {sizes.length} size(s) &middot; {platforms.length}{" "}
              platform(s)
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="submit"
                disabled={publishing}
                className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
              >
                {publishing ? "Publishing…" : "Publish to library"}
              </button>
              <button
                type="button"
                className="border border-border px-5 py-2.5 text-sm font-bold text-ink"
              >
                Save as draft
              </button>
              {result && (
                <span className="text-sm text-ink-muted">
                  {result.message}{" "}
                  {result.adId && (
                    <Link href={`/ads/${result.adId}`} className="text-brand">
                      View ad
                    </Link>
                  )}
                </span>
              )}
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
