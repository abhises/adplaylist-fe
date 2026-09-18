"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
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

// Kept in sync with the backend's multer fileFilter in adplaylist-be/src/routes/uploads.ts
const SUPPORTED_IMAGE_TYPES = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/;
const SUPPORTED_IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.svg";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image"));
    };
    img.src = url;
  });
}

export default function AddAdPage() {
  const { user, ready } = useRequireAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [canvaUrl, setCanvaUrl] = useState("");
  const [editableInCanva, setEditableInCanva] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ message: string; adId?: string } | null>(
    null
  );

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoDims, setPhotoDims] = useState<{ width: number; height: number } | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!SUPPORTED_IMAGE_TYPES.test(file.type)) {
      setUploadError(
        "Unsupported format. Use PNG, JPG, WEBP, GIF or SVG."
      );
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("That file is over the 8 MB limit.");
      return;
    }
    setUploadError(null);
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const dims = await readImageDimensions(file);
      setPhotoDims(dims);
      const uploaded = await api.uploadFile(file, dims);
      setPhotoUrl(uploaded.url);
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Couldn't upload that file."
      );
      setPhotoPreview(null);
      setPhotoDims(null);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function clearPhoto() {
    setPhotoPreview(null);
    setPhotoUrl(null);
    setPhotoDims(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        photo: photoUrl ?? undefined,
        editable: editableInCanva,
        canvaUrl: canvaUrl || undefined,
        dominantColor,
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
          className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
        >
          <div className="flex flex-col gap-6">
            <div className="border-2 border-ink/15 p-6">
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
                  <label className="text-xs text-ink/70">Master file</label>
                  <span className="text-xs text-ink-muted">
                    {photoDims
                      ? `${photoDims.width} × ${photoDims.height}px`
                      : "PNG, JPG or WEBP · up to 8 MB"}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORTED_IMAGE_ACCEPT}
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {photoPreview ? (
                  <div className="relative mt-1 h-40 border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-surface/80 text-sm text-ink">
                        Uploading…
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="absolute top-2 right-2 bg-surface px-2 py-1 text-xs font-bold text-ink"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`mt-1 flex h-40 flex-col items-center justify-center gap-1 border border-dashed text-ink-muted ${
                      dragOver ? "border-brand bg-brand/5" : "border-border"
                    } cursor-pointer`}
                  >
                    <span className="text-2xl">&#128247;</span>
                    <span className="text-sm">Drop file, or click to browse</span>
                    <span className="text-xs">No file yet</span>
                  </div>
                )}
                {uploadError && (
                  <p className="mt-1 text-xs text-brand">{uploadError}</p>
                )}
                <p className="mt-1 text-xs text-ink-muted">
                  Uploaded files are published with the ad and shown in the
                  library.
                </p>
              </div>

              <div className="mt-4">
                <label className="mb-[5px] block text-xs text-ink/70">
                  Canva template link
                </label>
                <input
                  type="url"
                  value={canvaUrl}
                  onChange={(e) => setCanvaUrl(e.target.value)}
                  placeholder="https://www.canva.com/design/…"
                  className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={editableInCanva}
                  onChange={() => setEditableInCanva((v) => !v)}
                  className="h-[15px] w-[15px] accent-brand"
                />
                Editable in Canva
              </label>
            </div>

            <div className="border-2 border-ink/15 p-6">
              <h2 className="text-xl font-extrabold text-ink">Ad copy</h2>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-[5px] block text-xs text-ink/70">
                    Kicker
                  </label>
                  <input
                    type="text"
                    value={kicker}
                    onChange={(e) => setKicker(e.target.value)}
                    placeholder="Spring drop"
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
                    placeholder="Built for the long walk home."
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
                    placeholder="Free returns for 60 days"
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
                    placeholder="Shop now"
                    className="w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="border-2 border-ink/15 p-6">
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
                <div className="flex flex-col gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 text-sm text-ink"
                    >
                      <input
                        type="checkbox"
                        checked={platforms.includes(p)}
                        onChange={() => togglePlatform(p)}
                        className="h-[15px] w-[15px] accent-brand"
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
                <div className="flex flex-wrap gap-1.5">
                  {DOMINANT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      title={c.name}
                      aria-label={c.name}
                      onClick={() => setDominantColor(c.name)}
                      style={{ backgroundColor: c.hex }}
                      className={`h-7 w-7 border ${
                        dominantColor === c.name
                          ? "outline outline-2 outline-offset-2 outline-brand"
                          : "border-ink/15"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="border-2 border-ink/15 p-6">
              <h2 className="text-xl font-extrabold text-ink">
                Placement sizes
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Tick every size this creative ships in. Sizes appear as tabs
                on the ad page.
              </p>
              <div className="mt-3 flex max-h-[300px] flex-col overflow-y-auto border border-border">
                {SIZE_OPTIONS.map((size) => (
                  <label
                    key={size.name}
                    className="flex items-center gap-2 border-b border-border px-2.5 py-1.5 text-sm text-ink last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={sizes.includes(size.name)}
                      onChange={() => toggleSize(size.name)}
                      className="h-[15px] w-[15px] shrink-0 accent-brand"
                    />
                    <span className="min-w-0 flex-1 truncate">{size.name}</span>
                    <span className="text-xs text-ink-muted tabular-nums">
                      {size.dims}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-2 border-ink/15 p-6">
              <h2 className="text-xl font-extrabold text-ink">Preview</h2>
              <div
                className={`relative mt-4 aspect-square w-full overflow-hidden ${
                  photoUrl ? "" : (COLOR_SWATCH[dominantColor]?.bg ?? "bg-neutral-800")
                }`}
              >
                {photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                {photoUrl && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                )}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  {kicker && (
                    <span
                      className={`text-[11px] font-medium tracking-[1px] uppercase ${
                        photoUrl || !COLOR_SWATCH[dominantColor]?.light
                          ? "text-white/90"
                          : "text-ink/90"
                      }`}
                    >
                      {kicker}
                    </span>
                  )}
                  <p
                    className={`mt-1 text-xl leading-tight font-extrabold ${
                      photoUrl || !COLOR_SWATCH[dominantColor]?.light
                        ? "text-white"
                        : "text-ink"
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
                {editableInCanva && <> &middot; Editable in Canva</>}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={publishing || uploading}
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
          </div>
        </form>
      </main>
    </div>
  );
}
