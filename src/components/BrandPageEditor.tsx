"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/Link";
import DOMPurify from "dompurify";
import AppHeader from "@/components/AppHeader";
import BrandPageView, { brandSignupHref } from "@/components/BrandPageView";
import BrandProfileForm from "@/components/BrandProfileForm";
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
import { slugify, slugifyTyping } from "@/lib/slug";
import { SUPPORTED_IMAGE_ACCEPT, uploadImage, validateImageFile } from "@/lib/upload";

// The ways to fill a brand page in: every field by hand, from a filled-in
// brand CSV (which then fills the same fields), or as free HTML.
type Mode = "manual" | "csv" | "html";
const MODES: { mode: Mode; label: string }[] = [
  { mode: "manual", label: "Manual" },
  { mode: "csv", label: "CSV" },
  { mode: "html", label: "HTML" },
];

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
  const [mode, setMode] = useState<Mode>(
    initial?.bodyHtml && !initial.profile ? "html" : "manual"
  );
  // The HTML tab lays the page out from the HTML content; the others from
  // the brand fields, starting from none.
  const shownProfile = useMemo(
    () => (mode === "html" ? null : (profile ?? {})),
    [mode, profile]
  );

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

  const missingImages = useMemo(
    () => (shownProfile ? missingBrandImages(shownProfile) : []),
    [shownProfile]
  );

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
    if (!shownProfile) return;
    const wanted = new Set(missingImages.map((path) => path.split(/[\\/]/).pop()!.toLowerCase()));
    const matching = files.filter((f) => wanted.has(f.name.toLowerCase()));
    const invalid = matching.map(validateImageFile).find(Boolean);
    if (matching.length === 0 || invalid) {
      setImportNote(invalid ?? "None of those files are the ones named.");
      return;
    }
    setUploading(true);
    setImportNote(null);
    try {
      const uploaded: Record<string, string> = {};
      for (const file of matching) {
        uploaded[file.name.toLowerCase()] = (await uploadImage(file)).url;
      }
      // Onto the latest fields, which may have changed during the upload.
      setProfile((latest) => withBrandImages(latest ?? {}, uploaded));
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
      setError("Upload the images named under Images first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        brandName,
        slug: slugify(slug),
        heading,
        ctaLabel,
        bodyHtml,
        profile: shownProfile,
        published,
      });
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
                name="basics.companyname"
                aria-label="Brand name"
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
                name="seo.pageheadlineh1"
                aria-label="Page heading (h1)"
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
                  name="seo.urlslug"
                  aria-label="Link"
                value={slug}
                  onChange={(e) => setSlug(slugifyTyping(e.target.value))}
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
                name="footercta.button"
                aria-label="Sign-up button text"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Sign up"
                className={inputClass}
              />
            </div>
          </div>

          <nav
            aria-label="How to fill the page in"
            className="mt-8 flex gap-6 border-b border-ink/15"
          >
            {MODES.map((tab) => (
              <button
                key={tab.mode}
                type="button"
                onClick={() => setMode(tab.mode)}
                aria-current={tab.mode === mode ? "page" : undefined}
                className={`-mb-px border-b-2 pb-2.5 text-sm ${
                  tab.mode === mode
                    ? "border-brand font-bold text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {mode === "csv" && (
            <div className="mt-6 border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">Brand CSV</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Import a filled-in brand CSV (Section, Field, Answer, Notes)
                    to fill every field below; check and edit them before
                    saving. Importing again replaces them.
                  </p>
                </div>
                <label className="cursor-pointer border border-border px-3 py-1.5 text-sm font-bold text-ink hover:border-ink">
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    aria-label="Import CSV"
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
          )}

          {shownProfile && missingImages.length > 0 && (
            <div className="mt-6 border border-border p-4">
              <p className="text-xs text-ink">
                {missingImages.length} image
                {missingImages.length === 1 ? " is" : "s are"} named by file
                name and still to upload:
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
                  aria-label="Upload images"
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

          {shownProfile && (
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs text-ink-muted">
                  {shownProfile.ads?.length ?? 0} ads,{" "}
                  {shownProfile.faq?.length ?? 0} FAQs. The CSV&apos;s company
                  name, URL slug, H1 and footer button are the fields at the top.
                </p>
                {profile && (
                  <button
                    type="button"
                    onClick={() => setProfile(null)}
                    className="shrink-0 text-xs text-ink-muted underline hover:text-ink"
                  >
                    Clear fields
                  </button>
                )}
              </div>
              <BrandProfileForm
                profile={shownProfile}
                onChange={(update) => setProfile((latest) => update(latest ?? {}))}
                onUploadingChange={setUploading}
              />
              {initial?.accessKey && effectiveSlug && (
                <p className="mt-6 border-t border-border pt-4 text-xs text-ink-muted">
                  Link for the brand, with its ads visible without signing in:
                  <br />
                  <span className="break-all text-ink select-all">
                    /brands/{effectiveSlug}?key={initial.accessKey}
                  </span>
                </p>
              )}
            </div>
          )}

          <div className={shownProfile ? "hidden" : "mt-6"}>
            {profile && (
              <p className="mb-4 text-xs text-brand">
                This page has brand fields filled in. Saving from the HTML tab
                lays it out from the HTML below instead, and drops those fields.
              </p>
            )}
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
            {shownProfile ? (
              <BrandProfileView
                brandName={brandName}
                heading={effectiveHeading || "Brand ads"}
                ctaLabel={effectiveCta}
                slug={effectiveSlug}
                profile={shownProfile}
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
