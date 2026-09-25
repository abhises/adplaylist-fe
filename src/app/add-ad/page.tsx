"use client";

import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AdCard from "@/components/AdCard";
import TagPicker from "@/components/TagPicker";
import {
  CATEGORY_OPTIONS,
  DOMINANT_COLORS,
  LANGUAGE_OPTIONS,
  MARKET_OPTIONS,
  PLATFORM_OPTIONS,
  SIZE_OPTIONS,
} from "@/lib/ads";
import {
  applyCsvToDraft,
  draftToAd,
  emptyDraft,
  loadDraft,
  saveDraft,
  type AdDraft,
} from "@/lib/adDraft";
import {
  SUPPORTED_IMAGE_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/lib/upload";
import { useRequireRole } from "@/lib/AuthProvider";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <p className="mb-[5px] text-xs text-ink/70">{label}</p>
      {children}
    </div>
  );
}

function toggleIn(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function AddAdPage() {
  const { user, ready } = useRequireRole(["designer", "admin"]);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Fields parsed from the CSV; null until a CSV has been loaded.
  const [csvDraft, setCsvDraft] = useState<AdDraft | null>(null);
  const [canvaUrl, setCanvaUrl] = useState("");

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoDims, setPhotoDims] = useState<{ width: number; height: number } | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvDragOver, setCsvDragOver] = useState(false);

  // Coming back from the preview page ("Back to edit") restores what was
  // already filled in instead of making the designer start over.
  useEffect(() => {
    Promise.resolve().then(() => {
      const stored = loadDraft();
      if (!stored) return;
      if (stored.csvFileName) {
        setCsvDraft(stored);
        setCsvFileName(stored.csvFileName);
      }
      setCanvaUrl(stored.canvaUrl);
      if (stored.photoUrl) {
        setPhotoUrl(stored.photoUrl);
        setPhotoPreview(stored.photoUrl);
        setPhotoDims(stored.photoDims ?? null);
      }
    });
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadError(null);
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { url, dims } = await uploadImage(file);
      setPhotoDims(dims);
      setPhotoUrl(url);
    } catch (err) {
      setUploadError((err as Error).message);
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

  async function handleCsvFile(file: File | undefined) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setCsvError("Please upload a .csv file.");
      return;
    }
    setCsvError(null);
    try {
      const { draft, matched, empty } = applyCsvToDraft(
        await file.text(),
        emptyDraft()
      );
      if (empty) {
        setCsvError("That CSV has no data rows.");
        return;
      }
      if (matched === 0) {
        setCsvError(
          "None of the CSV columns were recognized. Expected headers like adName, headline, category…"
        );
        return;
      }
      setCsvDraft(draft);
      setCsvFileName(file.name);
      if (draft.canvaUrl) setCanvaUrl(draft.canvaUrl);
    } catch {
      setCsvError("Couldn't read that CSV.");
    }
  }

  function handleCsvDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setCsvDragOver(false);
    handleCsvFile(e.dataTransfer.files?.[0]);
  }

  function clearCsv() {
    setCsvDraft(null);
    setCsvFileName(null);
    setCsvError(null);
    if (csvInputRef.current) csvInputRef.current.value = "";
  }

  function updateFields(patch: Partial<AdDraft>) {
    setCsvDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function currentDraft(): AdDraft | null {
    if (!csvDraft) return null;
    return {
      ...csvDraft,
      canvaUrl,
      photoUrl: photoUrl ?? undefined,
      photoDims: photoDims ?? undefined,
      csvFileName: csvFileName ?? undefined,
    };
  }

  function handleShowPreview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const draft = currentDraft();
    if (!draft) {
      setCsvError("Upload a CSV to preview the ad.");
      return;
    }
    saveDraft(draft);
    router.push("/add-ad/preview");
  }

  if (!ready || !user) return null;

  const draft = currentDraft();
  const previewAd = draft
    ? {
        ...draftToAd(draft),
        title: draft.adName || "Untitled ad",
        id: "preview",
        createdAt: new Date().toISOString(),
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-10 py-8">
        <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
          Admin
        </p>
        <h1 className="text-3xl font-extrabold text-ink">Add a new ad</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Upload the text data and creative, then preview the ad before
          publishing it to the library.
        </p>

        <form
          onSubmit={handleShowPreview}
          className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2"
        >
          <div className="border-2 border-ink/15 p-6">
            <h2 className="text-xl font-extrabold text-ink">Creative</h2>

            <div className="mt-4">
              <label className="mb-[5px] block text-xs text-ink/70">
                Text data (CSV)
              </label>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleCsvFile(e.target.files?.[0])}
              />
              {csvFileName ? (
                <div className="relative mt-1 flex h-40 flex-col items-center justify-center gap-1 border border-border text-ink-muted">
                  <span className="text-2xl">&#128196;</span>
                  <span className="text-sm text-ink">{csvFileName}</span>
                  <span className="text-xs">Fields loaded from CSV</span>
                  <button
                    type="button"
                    onClick={clearCsv}
                    className="absolute top-2 right-2 bg-surface px-2 py-1 text-xs font-bold text-ink"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => csvInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCsvDragOver(true);
                  }}
                  onDragLeave={() => setCsvDragOver(false)}
                  onDrop={handleCsvDrop}
                  className={`mt-1 flex h-40 flex-col items-center justify-center gap-1 border border-dashed text-ink-muted ${
                    csvDragOver ? "border-brand bg-brand/5" : "border-border"
                  } cursor-pointer`}
                >
                  <span className="text-2xl">&#128196;</span>
                  <span className="text-sm">Drop file, or click to browse</span>
                  <span className="text-xs">No file yet</span>
                </div>
              )}
              {csvError && (
                <p className="mt-1 text-xs text-brand">{csvError}</p>
              )}
              <p className="mt-1 text-xs text-ink-muted">
                Accepts a header row of fields (adName, mediaType,
                primaryText, brandName, headline, description, cta, category, market,
                language, platforms, dominantColor, sizes,
                creativeDescription, tags, canvaUrl) or a
                two-column &quot;Field,Answer&quot; export with one row per
                field. Separate multiple platforms, sizes or tags with
                commas.
              </p>
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
                    className="h-full w-full object-contain"
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
          </div>

          <div className="border-2 border-ink/15 p-6">
            <h2 className="text-xl font-extrabold text-ink">Preview</h2>
            {draft && previewAd ? (
              <>
                <div className="mt-4 max-w-xs">
                  <AdCard ad={previewAd} disableLink />
                </div>
                <div className="mt-6 divide-y divide-ink/10 border-t border-ink/10">
                  <Field label="Ad name">
                    <input
                      type="text"
                      value={draft.adName}
                      onChange={(e) => updateFields({ adName: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Media type">
                    <select
                      value={draft.mediaType}
                      onChange={(e) =>
                        updateFields({
                          mediaType: e.target.value as AdDraft["mediaType"],
                        })
                      }
                      className={inputClass}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </Field>
                  <Field label="Primary text">
                    <textarea
                      value={draft.primaryText}
                      onChange={(e) => updateFields({ primaryText: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Brand name">
                    <input
                      type="text"
                      value={draft.brandName}
                      onChange={(e) => updateFields({ brandName: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Headline">
                    <input
                      type="text"
                      value={draft.headline}
                      onChange={(e) => updateFields({ headline: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      value={draft.description}
                      onChange={(e) => updateFields({ description: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Call to action">
                    <input
                      type="text"
                      value={draft.cta}
                      onChange={(e) => updateFields({ cta: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Category">
                    <select
                      value={draft.category}
                      onChange={(e) => updateFields({ category: e.target.value })}
                      className={inputClass}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Market">
                    <select
                      value={draft.market}
                      onChange={(e) => updateFields({ market: e.target.value })}
                      className={inputClass}
                    >
                      {MARKET_OPTIONS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Language">
                    <select
                      value={draft.language}
                      onChange={(e) => updateFields({ language: e.target.value })}
                      className={inputClass}
                    >
                      {LANGUAGE_OPTIONS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Platforms">
                    <div className="flex flex-wrap gap-4">
                      {PLATFORM_OPTIONS.map((platform) => (
                        <label
                          key={platform}
                          className="flex items-center gap-2 text-sm text-ink"
                        >
                          <input
                            type="checkbox"
                            checked={draft.platforms.includes(platform)}
                            onChange={() =>
                              updateFields({
                                platforms: toggleIn(draft.platforms, platform),
                              })
                            }
                            className="h-4 w-4 accent-brand"
                          />
                          {platform}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Dominant colour">
                    <div className="flex flex-wrap gap-1.5">
                      {DOMINANT_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          title={c.name}
                          aria-label={c.name}
                          onClick={() => updateFields({ dominantColor: c.name })}
                          style={{ backgroundColor: c.hex }}
                          className={`h-6 w-6 border ${
                            draft.dominantColor === c.name
                              ? "outline outline-2 outline-offset-2 outline-brand"
                              : "border-ink/15"
                          }`}
                        />
                      ))}
                    </div>
                  </Field>
                  <Field label="Placement sizes">
                    <div className="grid grid-cols-1 border border-border sm:grid-cols-2">
                      {SIZE_OPTIONS.map((size) => (
                        <label
                          key={size.name}
                          className="flex items-center gap-2 border-b border-border px-2.5 py-1.5 text-sm text-ink"
                        >
                          <input
                            type="checkbox"
                            checked={draft.sizes.includes(size.name)}
                            onChange={() =>
                              updateFields({ sizes: toggleIn(draft.sizes, size.name) })
                            }
                            className="h-[15px] w-[15px] shrink-0 accent-brand"
                          />
                          <span className="min-w-0 flex-1 truncate">{size.name}</span>
                          <span className="text-xs text-ink-muted tabular-nums">
                            {size.dims}
                          </span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Description of the creative">
                    <textarea
                      value={draft.creativeDescription}
                      onChange={(e) =>
                        updateFields({ creativeDescription: e.target.value })
                      }
                      rows={5}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Tags">
                    <TagPicker
                      value={draft.tags}
                      onChange={(tags) => updateFields({ tags })}
                    />
                  </Field>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">
                Upload the text data CSV to see the ad&apos;s fields here.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!draft || uploading}
                className="bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground disabled:opacity-60"
              >
                Show preview
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
