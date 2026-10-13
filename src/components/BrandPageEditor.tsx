"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/Link";
import DOMPurify from "dompurify";
import AppHeader from "@/components/AppHeader";
import BrandPageView, { brandSignupHref } from "@/components/BrandPageView";
import BrandProfileView from "@/components/BrandProfileView";
import HtmlContentEditor, { escapeHtml } from "@/components/HtmlContentEditor";
import { renderAdEmbeds } from "@/lib/adEmbed";
import { api, ApiError, type Ad, type BrandPageInput } from "@/lib/api";
import {
  missingBrandImages,
  parseBrandCsv,
  withBrandImages,
  type BrandProfile,
} from "@/lib/brandProfile";
import { slugify } from "@/lib/slug";
import { SUPPORTED_IMAGE_ACCEPT, uploadImage, validateImageFile } from "@/lib/upload";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

export default function BrandPageEditor({
  initial,
  onSave,
  onDelete,
}: {
  initial?: BrandPageInput & { slug?: string; accessKey?: string };
  // Saves the page; a thrown error is shown next to the save button.
  onSave: (data: BrandPageInput) => Promise<void>;
  onDelete?: () => void;
}) {
  const [brandName, setBrandName] = useState(initial?.brandName ?? "");
  const [heading, setHeading] = useState(initial?.heading ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  // Set once a brand CSV is imported: the page is then laid out from it and
  // the HTML content isn't used.
  const [profile, setProfile] = useState<BrandProfile | null>(initial?.profile ?? null);
  const [importNote, setImportNote] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [ads, setAds] = useState<Ad[]>([]);

  // The library, for checking pasted ad links and for rendering embedded ads in the
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

  const signupButtonHtml = `\n<p><a suppressHydrationWarning class="brand-cta" href="${escapeHtml(
    brandSignupHref(effectiveSlug)
  )}">${escapeHtml(effectiveCta)}</a></p>\n`;

  const missingImages = useMemo(() => (profile ? missingBrandImages(profile) : []), [profile]);

  async function handleCsv(file: File) {
    const imported = parseBrandCsv(await file.text());
    if (!imported) {
      setImportNote(
        "That isn't a brand CSV: it needs Section, Field and Answer columns and a company name."
      );
      return;
    }
    setBrandName(imported.brandName);
    setSlug(imported.slug);
    setHeading(imported.heading);
    setCtaLabel(imported.ctaLabel);
    setProfile(imported.profile);
    setImportNote(null);
    setError(null);
  }

  // Uploads the image files the CSV names; each is matched by its file name.
  async function handleImages(files: File[]) {
    if (!profile) return;
    const wanted = new Set(missingImages.map((path) => path.split(/[\\/]/).pop()!.toLowerCase()));
    const matching = files.filter((f) => wanted.has(f.name.toLowerCase()));
    const invalid = matching.map(validateImageFile).find(Boolean);
    if (matching.length === 0 || invalid) {
      setImportNote(invalid ?? "None of those files are named in the CSV.");
      return;
    }
    setUploading(true);
    setImportNote(null);
    try {
      const uploaded: Record<string, string> = {};
      for (const file of matching) {
        uploaded[file.name.toLowerCase()] = (await uploadImage(file)).url;
      }
      setProfile(withBrandImages(profile, uploaded));
    } catch (err) {
      setImportNote(err instanceof Error ? err.message : "Couldn't upload those files.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!brandName.trim()) {
      setError("Enter the brand name.");
      return;
    }
    if (missingImages.length > 0) {
      setError("Upload the images the CSV names first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ brandName, slug, heading, ctaLabel, bodyHtml, profile, published });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

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

          <div className="mt-6 border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">Brand CSV</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {profile
                    ? `Page built from a CSV: ${profile.ads?.length ?? 0} ads, ${
                        profile.faq?.length ?? 0
                      } FAQs. Import again to replace it.`
                    : "Import a filled-in brand CSV to build the whole page from it."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {profile && (
                  <button
                    type="button"
                    onClick={() => setProfile(null)}
                    className="text-xs text-ink-muted underline hover:text-ink"
                  >
                    Remove
                  </button>
                )}
                <label className="cursor-pointer border border-border px-3 py-1.5 text-sm font-bold text-ink hover:border-ink">
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCsv(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {missingImages.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-ink">
                  The CSV names {missingImages.length} image
                  {missingImages.length === 1 ? "" : "s"} still to upload:
                </p>
                <ul className="mt-2 list-disc pl-5 text-xs text-ink-muted">
                  {missingImages.map((path) => (
                    <li key={path}>{path}</li>
                  ))}
                </ul>
                <label className="mt-3 inline-block cursor-pointer bg-ink px-3 py-1.5 text-sm font-bold text-surface">
                  {uploading ? "Uploading…" : "Upload images"}
                  <input
                    type="file"
                    multiple
                    accept={SUPPORTED_IMAGE_ACCEPT}
                    disabled={uploading}
                    className="hidden"
                    onChange={(e) => {
                      handleImages([...(e.target.files ?? [])]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
            {importNote && <p className="mt-3 text-xs text-brand">{importNote}</p>}
            {profile && initial?.accessKey && effectiveSlug && (
              <p className="mt-4 border-t border-border pt-4 text-xs text-ink-muted">
                Link for the brand, with its ads visible without signing in:
                <br />
                <span className="break-all text-ink select-all">
                  /brands/{effectiveSlug}?key={initial.accessKey}
                </span>
              </p>
            )}
          </div>

          <div className={profile ? "hidden" : "mt-6"}>
            <HtmlContentEditor
              value={bodyHtml}
              onChange={setBodyHtml}
              ads={ads}
              label="Page content (HTML)"
              onUploadingChange={setUploading}
              placeholder={`<p>Your competitors are shipping new creatives every week…</p>\n\n<h2>What you get</h2>\n<ul>\n  <li>…</li>\n</ul>`}
              snippets={[{ label: "+ Sign-up button", html: signupButtonHtml }]}
              help={
                <>
                  Any HTML works: headings, paragraphs, lists, images, links
                  and inline styles. Scripts and event handlers are removed
                  when you save. A sign-up button is always shown at the bottom
                  of the page; use &ldquo;+ Sign-up button&rdquo; to add more
                  inside the content. &ldquo;Add ad URL&rdquo; adds
                  library ads with their copy; they update when the ad is
                  edited.
                </>
              }
            />
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
            {profile ? (
              <BrandProfileView
                brandName={brandName}
                heading={effectiveHeading || "Brand ads"}
                ctaLabel={effectiveCta}
                slug={effectiveSlug}
                profile={profile}
              />
            ) : (
              <BrandPageView
                heading={effectiveHeading || "Brand ads"}
                bodyHtml={previewHtml}
                ctaLabel={effectiveCta}
                slug={effectiveSlug}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
