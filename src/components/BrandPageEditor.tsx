"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/Link";
import DOMPurify from "dompurify";
import AppHeader from "@/components/AppHeader";
import BrandPageView, { brandSignupHref } from "@/components/BrandPageView";
import Modal from "@/components/Modal";
import { adEmbedSnippet, renderAdEmbeds } from "@/lib/adEmbed";
import { api, ApiError, type Ad, type BrandPageInput } from "@/lib/api";
import { slugify } from "@/lib/slug";
import {
  SUPPORTED_IMAGE_ACCEPT,
  uploadImage,
  validateImageFile,
} from "@/lib/upload";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function BrandPageEditor({
  initial,
  onSave,
  onDelete,
}: {
  initial?: BrandPageInput & { slug?: string };
  // Saves the page; a thrown error is shown next to the save button.
  onSave: (data: BrandPageInput) => Promise<void>;
  onDelete?: () => void;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [brandName, setBrandName] = useState(initial?.brandName ?? "");
  const [heading, setHeading] = useState(initial?.heading ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [ads, setAds] = useState<Ad[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  // The library, for the ad picker and for rendering embedded ads in the
  // preview exactly as the public page will.
  useEffect(() => {
    api
      .getAds()
      .then((res) => setAds(res.ads))
      .catch(() => {});
  }, []);
  const adsBySlug = useMemo(
    () => Object.fromEntries(ads.map((ad) => [ad.id, ad])),
    [ads]
  );

  // Blank fields fall back the same way the API does, so the preview and the
  // saved page agree.
  const effectiveSlug = slug || slugify(brandName);
  const effectiveHeading = heading || (brandName ? `${brandName} ads` : "");
  const effectiveCta = ctaLabel || "Sign up";

  const previewHtml = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : renderAdEmbeds(
            DOMPurify.sanitize(bodyHtml, { ADD_ATTR: ["target"] }),
            adsBySlug
          ),
    [bodyHtml, adsBySlug]
  );

  // Inserts a snippet at the cursor (or replaces the selection) in the HTML box.
  function insertHtml(snippet: string) {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? bodyHtml.length;
    const end = el?.selectionEnd ?? bodyHtml.length;
    const next = bodyHtml.slice(0, start) + snippet + bodyHtml.slice(end);
    setBodyHtml(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      insertHtml(`\n<img src="${escapeHtml(url)}" alt="" />\n`);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function insertSignupButton() {
    insertHtml(
      `\n<p><a class="brand-cta" href="${escapeHtml(
        brandSignupHref(effectiveSlug)
      )}">${escapeHtml(effectiveCta)}</a></p>\n`
    );
  }

  function closePicker() {
    setPickerOpen(false);
    setPicked([]);
    setPickerQuery("");
  }

  function insertPickedAds() {
    if (picked.length) insertHtml(adEmbedSnippet(picked));
    closePicker();
  }

  async function handleSave() {
    if (!brandName.trim()) {
      setError("Enter the brand name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ brandName, slug, heading, ctaLabel, bodyHtml, published });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const q = pickerQuery.trim().toLowerCase();
  const pickerAds = q
    ? ads.filter(
        (ad) =>
          ad.title.toLowerCase().includes(q) ||
          ad.headline.toLowerCase().includes(q) ||
          ad.category.toLowerCase().includes(q)
      )
    : ads;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 px-10 py-4">
        <Link href="/admin/brand-pages" className="text-sm font-medium text-brand">
          &larr; Brand pages
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {error && <span className="text-xs text-brand">{error}</span>}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="border border-border px-4 py-2 text-sm font-bold text-ink hover:border-brand hover:text-brand"
            >
              Delete
            </button>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Published
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="bg-brand px-5 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <main className="grid flex-1 grid-cols-1 xl:grid-cols-2">
        <div className="border-r border-ink/15 px-10 py-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Brand name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Samsung"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Page heading (h1)
              </label>
              <input
                type="text"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder={brandName ? `${brandName} ads` : "Samsung ads"}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">Link</label>
              <div className="flex items-center border border-border bg-surface-2 text-sm">
                <span className="pl-2.5 text-ink-muted">/brands/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder={slugify(brandName) || "samsung"}
                  className="min-w-0 flex-1 bg-transparent py-1.5 pr-2.5 text-ink outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-[5px] block text-xs text-ink/70">
                Sign-up button text
              </label>
              <input
                type="text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Sign up"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-[5px] flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs text-ink/70">Page content (HTML)</label>
              <div className="flex gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={SUPPORTED_IMAGE_ACCEPT}
                  className="hidden"
                  onChange={(e) => handleImage(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  className="border border-border px-3 py-1 text-xs font-bold text-ink disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "📷 Insert image"}
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="border border-border px-3 py-1 text-xs font-bold text-ink"
                >
                  🖼 Insert ad creative
                </button>
                <button
                  type="button"
                  onClick={insertSignupButton}
                  className="border border-border px-3 py-1 text-xs font-bold text-ink"
                >
                  + Sign-up button
                </button>
              </div>
            </div>
            <textarea
              ref={bodyRef}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={24}
              spellCheck={false}
              placeholder={`<p>Your competitors are shipping new creatives every week…</p>\n\n<h2>What you get</h2>\n<ul>\n  <li>…</li>\n</ul>`}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
            {uploadError && (
              <p className="mt-1 text-xs text-brand">{uploadError}</p>
            )}
            <p className="mt-1 text-xs text-ink-muted">
              Any HTML works: headings, paragraphs, lists, images, links and
              inline styles. Scripts and event handlers are removed when you
              save. A sign-up button is always shown at the bottom of the page;
              use &ldquo;+ Sign-up button&rdquo; to add more inside the content.
              &ldquo;Insert ad creative&rdquo; adds library ads with their copy
              and an Adplaylist watermark; they update when the ad is edited.
            </p>
          </div>
        </div>

        <div className="bg-surface-2 px-6 py-8">
          <div className="mb-3 flex items-center justify-between text-xs text-ink-muted">
            <span className="font-medium tracking-[1px] uppercase">Preview</span>
            <span>
              /brands/{effectiveSlug || "…"}{" "}
              {published ? "· published" : "· draft, not public"}
            </span>
          </div>
          {/* Not clickable, so following a preview link can't lose unsaved work. */}
          <div className="pointer-events-none border border-ink/15 shadow-sm select-none">
            <BrandPageView
              heading={effectiveHeading || "Brand ads"}
              bodyHtml={previewHtml}
              ctaLabel={effectiveCta}
              slug={effectiveSlug}
            />
          </div>
        </div>
      </main>
      <Modal open={pickerOpen} onClose={closePicker} maxWidth="max-w-3xl">
        <h2 className="text-lg font-extrabold text-ink">Insert ad creatives</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Pick one or more ads. Several are shown side by side.
        </p>
        <input
          type="search"
          value={pickerQuery}
          onChange={(e) => setPickerQuery(e.target.value)}
          placeholder="Search by name, headline or category"
          className={`mt-4 ${inputClass}`}
        />
        <div className="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {pickerAds.map((ad) => {
            const index = picked.indexOf(ad.id);
            return (
              <button
                key={ad.id}
                type="button"
                onClick={() =>
                  setPicked((list) =>
                    index >= 0
                      ? list.filter((id) => id !== ad.id)
                      : [...list, ad.id]
                  )
                }
                className={`relative border-2 text-left ${
                  index >= 0 ? "border-brand" : "border-transparent"
                }`}
              >
                <div
                  className={`relative aspect-[4/5] overflow-hidden ${
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
                  {index >= 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center bg-brand text-xs font-bold text-brand-foreground">
                      {index + 1}
                    </span>
                  )}
                </div>
                <p className="truncate px-1 py-1 text-xs font-bold text-ink">
                  {ad.title}
                </p>
              </button>
            );
          })}
          {pickerAds.length === 0 && (
            <p className="col-span-full text-sm text-ink-muted">
              No ads match.
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={closePicker}
            className="border border-border px-4 py-2 text-sm font-bold text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={insertPickedAds}
            disabled={picked.length === 0}
            className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
          >
            Insert {picked.length || ""} {picked.length === 1 ? "ad" : "ads"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
