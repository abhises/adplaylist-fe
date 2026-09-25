"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/Link";
import DOMPurify from "dompurify";
import AppHeader from "@/components/AppHeader";
import BrandPageView, { brandSignupHref } from "@/components/BrandPageView";
import HtmlContentEditor, { escapeHtml } from "@/components/HtmlContentEditor";
import { renderAdEmbeds } from "@/lib/adEmbed";
import { api, ApiError, type Ad, type BrandPageInput } from "@/lib/api";
import { slugify } from "@/lib/slug";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

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
  const [brandName, setBrandName] = useState(initial?.brandName ?? "");
  const [heading, setHeading] = useState(initial?.heading ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [ads, setAds] = useState<Ad[]>([]);

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

  const signupButtonHtml = `\n<p><a class="brand-cta" href="${escapeHtml(
    brandSignupHref(effectiveSlug)
  )}">${escapeHtml(effectiveCta)}</a></p>\n`;

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
                  inside the content. &ldquo;Insert ad creative&rdquo; adds
                  library ads with their copy and an Adplaylist watermark; they
                  update when the ad is edited.
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
            <BrandPageView
              heading={effectiveHeading || "Brand ads"}
              bodyHtml={previewHtml}
              ctaLabel={effectiveCta}
              slug={effectiveSlug}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
