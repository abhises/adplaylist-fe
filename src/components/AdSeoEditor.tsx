"use client";

import { useEffect, useState } from "react";
import Link from "@/components/Link";
import { AD_FORMAT_OPTIONS } from "@/lib/ads";
import { matchAuthor, type AdDraft, type DraftContent } from "@/lib/adDraft";
import { api, type Author } from "@/lib/api";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

// "57 / 60" under a field, red once it's over the limit (or outside a word
// range), using the limits from the ad CSV template.
function Count({
  value,
  max,
  wordRange,
}: {
  value: string;
  max?: number;
  wordRange?: [number, number];
}) {
  if (max) {
    const over = value.length > max;
    return (
      <span className={`text-xs tabular-nums ${over ? "text-brand" : "text-ink-muted"}`}>
        {value.length} / {max} characters
      </span>
    );
  }
  if (wordRange) {
    const n = words(value);
    const off = n > 0 && (n < wordRange[0] || n > wordRange[1]);
    return (
      <span className={`text-xs tabular-nums ${off ? "text-brand" : "text-ink-muted"}`}>
        {n} words (aim for {wordRange[0]}–{wordRange[1]})
      </span>
    );
  }
  return null;
}

function Field({
  label,
  hint,
  children,
  count,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  count?: React.ReactNode;
}) {
  return (
    <label className="block py-2.5">
      <span className="mb-[5px] flex items-baseline justify-between gap-3">
        <span className="text-xs text-ink/70">{label}</span>
        {count}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

function Group({
  title,
  description,
  children,
  defaultOpen,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-ink/15">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4">
        <span>
          <span className="block text-base font-extrabold text-ink">{title}</span>
          <span className="block text-xs text-ink-muted">{description}</span>
        </span>
        <span className="text-ink-muted transition-transform group-open:rotate-180">
          &#9662;
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

const listToText = (list: string[]) => list.join(", ");
const textToList = (text: string) =>
  text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

// A comma-separated list input that keeps what's typed (including a trailing
// comma) and only splits it into the list as it changes.
function ListInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (list: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(listToText(value));
  return (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(textToList(e.target.value));
      }}
      className={inputClass}
    />
  );
}

// The SEO and editorial fields of an ad page, grouped like the ad CSV
// template (Basics, SEO, Content, Author, Linking). Shown below the ad on the
// preview and edit pages; everything here is optional.
export default function AdSeoEditor({
  draft,
  update,
  embedded = false,
}: {
  draft: AdDraft;
  update: (patch: Partial<AdDraft>) => void;
  // Inside the Add ad page's preview panel: no page-width padding, and every
  // group open so all the fields loaded from the CSV are in view.
  embedded?: boolean;
}) {
  const [authors, setAuthors] = useState<Author[] | null>(null);

  useEffect(() => {
    api
      .getAuthors()
      .then(({ authors }) => setAuthors(authors))
      .catch(() => setAuthors([]));
  }, []);

  // A CSV names its authors; once the list is in, pick the matching
  // profiles. Unmatched names stay visible as a warning below the select.
  useEffect(() => {
    if (!authors) return;
    const patch: Partial<AdDraft> = {};
    if (!draft.authorSlug && draft.authorName) {
      const a = matchAuthor(authors, draft.authorName);
      if (a) Object.assign(patch, { authorSlug: a.slug, authorName: undefined });
    }
    if (!draft.reviewerSlug && draft.reviewerName) {
      const r = matchAuthor(authors, draft.reviewerName);
      if (r) Object.assign(patch, { reviewerSlug: r.slug, reviewerName: undefined });
    }
    if (Object.keys(patch).length) update(patch);
    // Only when the author list arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authors]);

  const c = draft.content;
  function updateContent(patch: Partial<DraftContent>) {
    update({ content: { ...c, ...patch } });
  }
  function setAt<T>(list: T[], i: number, value: T) {
    return list.map((v, j) => (j === i ? value : v));
  }

  function authorSelect(
    key: "authorSlug" | "reviewerSlug",
    pendingName: string | undefined,
    nameKey: "authorName" | "reviewerName"
  ) {
    return (
      <>
        <select
          value={draft[key]}
          onChange={(e) => update({ [key]: e.target.value, [nameKey]: undefined })}
          className={inputClass}
        >
          <option value="">— None —</option>
          {(authors ?? []).map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
              {a.jobTitle ? ` · ${a.jobTitle}` : ""}
            </option>
          ))}
        </select>
        {pendingName && !draft[key] && authors && (
          <span className="mt-1 block text-xs text-brand">
            The CSV names &ldquo;{pendingName}&rdquo;, who has no author profile
            yet.{" "}
            <Link href="/admin/authors" className="underline">
              Add them under Admin &rarr; Authors
            </Link>{" "}
            and pick them here.
          </span>
        )}
      </>
    );
  }

  return (
    <section className={embedded ? "mt-8" : "border-t border-ink/15 px-10 py-8"}>
      <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
        Ad page
      </p>
      <h2 className={`mt-1 font-extrabold text-ink ${embedded ? "text-xl" : "text-2xl"}`}>
        SEO &amp; page content
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Filled in from the CSV. These fields build the ad&apos;s public page;
        anything left empty is left out or generated from the ad&apos;s
        details.
      </p>

      <div className={`mt-4 border-t border-ink/15 ${embedded ? "" : "max-w-3xl"}`}>
        <Group
          title="Basics"
          description="Creative format, breadcrumb subcategory and the text on the image."
          defaultOpen
        >
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <Field label="Format">
              <select
                value={draft.adFormat}
                onChange={(e) => update({ adFormat: e.target.value })}
                className={inputClass}
              >
                <option value="">— None —</option>
                {AD_FORMAT_OPTIONS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Subcategory" hint="Shown in the breadcrumb, e.g. Supplements.">
              <input
                type="text"
                value={draft.subcategory}
                onChange={(e) => update({ subcategory: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="On-image text" hint="All text visible on the creative.">
            <textarea
              rows={2}
              value={draft.onImageText}
              onChange={(e) => update({ onImageText: e.target.value })}
              className={inputClass}
            />
          </Field>
        </Group>

        <Group
          title="SEO"
          description="URL, title, meta description, H1 and image details."
          defaultOpen
        >
          <Field
            label="URL slug"
            hint="lowercase-with-hyphens. Changing it on a live ad keeps the old URL working as a redirect."
          >
            <div className="flex items-center gap-1 text-sm text-ink-muted">
              <span>/ads/</span>
              <input
                type="text"
                value={draft.slug}
                onChange={(e) =>
                  update({
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
                  })
                }
                placeholder="generated from the ad name"
                className={inputClass}
              />
            </div>
          </Field>
          <Field
            label="SEO title"
            hint="Main keyword first."
            count={<Count value={draft.seoTitle} max={60} />}
          >
            <input
              type="text"
              value={draft.seoTitle}
              onChange={(e) => update({ seoTitle: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field
            label="Meta description"
            count={<Count value={draft.metaDescription} max={155} />}
          >
            <textarea
              rows={2}
              value={draft.metaDescription}
              onChange={(e) => update({ metaDescription: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Page headline (H1)" hint="One per page; can match the SEO title.">
            <input
              type="text"
              value={draft.pageHeadline}
              onChange={(e) => update({ pageHeadline: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field
            label="Intro paragraph"
            hint="Product, format and use."
            count={<Count value={draft.introParagraph} wordRange={[40, 60]} />}
          >
            <textarea
              rows={3}
              value={draft.introParagraph}
              onChange={(e) => update({ introParagraph: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field
            label="Image file name"
            hint="Keyword slug + size, e.g. creatine-ad-template-1200x1200.png. The image is saved under this name when the ad is saved."
          >
            <input
              type="text"
              value={draft.imageFileName}
              onChange={(e) => update({ imageFileName: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field
            label="Image alt text"
            hint="Describe what is shown."
            count={<Count value={draft.imageAlt} max={125} />}
          >
            <input
              type="text"
              value={draft.imageAlt}
              onChange={(e) => update({ imageAlt: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Image caption" hint="One sentence.">
            <input
              type="text"
              value={draft.imageCaption}
              onChange={(e) => update({ imageCaption: e.target.value })}
              className={inputClass}
            />
          </Field>
        </Group>

        <Group
          title="Content"
          description="Key takeaways, why it works, the full breakdown and headline ideas."
          defaultOpen={embedded}
        >
          <p className="pt-2 text-xs font-bold tracking-[1px] text-ink-muted uppercase">
            Key takeaways
          </p>
          {(
            [
              ["format", "Format"],
              ["bestFor", "Best for"],
              ["hook", "Hook"],
              ["reuse", "Reuse it"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="text"
                value={c.takeaways[key]}
                onChange={(e) =>
                  updateContent({ takeaways: { ...c.takeaways, [key]: e.target.value } })
                }
                className={inputClass}
              />
            </Field>
          ))}

          <p className="pt-4 text-xs font-bold tracking-[1px] text-ink-muted uppercase">
            Why it works
          </p>
          {c.whyItWorks.map((point, i) => (
            <div key={i} className="grid grid-cols-1 gap-x-4 sm:grid-cols-[1fr_2fr]">
              <Field label={`${i + 1} – Title`}>
                <input
                  type="text"
                  value={point.title}
                  onChange={(e) =>
                    updateContent({
                      whyItWorks: setAt(c.whyItWorks, i, { ...point, title: e.target.value }),
                    })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label={`${i + 1} – Text`}>
                <textarea
                  rows={2}
                  value={point.text}
                  onChange={(e) =>
                    updateContent({
                      whyItWorks: setAt(c.whyItWorks, i, { ...point, text: e.target.value }),
                    })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          ))}

          <p className="pt-4 text-xs font-bold tracking-[1px] text-ink-muted uppercase">
            Full creative breakdown
          </p>
          {(
            [
              ["targets", "Who this ad targets", [60, 100]],
              ["copywriting", "Copywriting analysis", [80, 120]],
              ["visualDesign", "Visual design", [60, 100]],
              ["platformTips", "Platform tips", [60, 100]],
            ] as const
          ).map(([key, label, range]) => (
            <Field
              key={key}
              label={label}
              count={<Count value={c[key]} wordRange={[range[0], range[1]]} />}
            >
              <textarea
                rows={4}
                value={c[key]}
                onChange={(e) => updateContent({ [key]: e.target.value })}
                className={inputClass}
              />
            </Field>
          ))}
          {c.adaptSteps.map((step, i) => (
            <Field key={i} label={`How to adapt – Step ${i + 1}`}>
              <input
                type="text"
                value={step}
                onChange={(e) =>
                  updateContent({ adaptSteps: setAt(c.adaptSteps, i, e.target.value) })
                }
                className={inputClass}
              />
            </Field>
          ))}

          <p className="pt-4 text-xs font-bold tracking-[1px] text-ink-muted uppercase">
            Headline ideas
          </p>
          {c.headlineIdeas.map((idea, i) => (
            <Field key={i} label={`Headline idea ${i + 1}`}>
              <input
                type="text"
                value={idea}
                onChange={(e) =>
                  updateContent({ headlineIdeas: setAt(c.headlineIdeas, i, e.target.value) })
                }
                className={inputClass}
              />
            </Field>
          ))}
        </Group>

        <Group
          title="Author"
          description="Who added and reviewed the ad, and when."
          defaultOpen
        >
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <Field label="Added by (curator)">
              {authorSelect("authorSlug", draft.authorName, "authorName")}
            </Field>
            <Field label="Reviewed by" hint="Optional.">
              {authorSelect("reviewerSlug", draft.reviewerName, "reviewerName")}
            </Field>
            <Field label="Date added" hint="Empty means the day it's published.">
              <input
                type="date"
                value={draft.dateAdded}
                onChange={(e) => update({ dateAdded: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Date updated" hint="Set to today whenever the ad is saved, unless you pick another date.">
              <input
                type="date"
                value={draft.dateUpdated}
                onChange={(e) => update({ dateUpdated: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </Group>

        <Group
          title="Linking"
          description="Collections, related guides, popular searches and related ads."
          defaultOpen={embedded}
        >
          <Field label="Collections" hint="Comma separated.">
            <ListInput
              value={c.collections}
              onChange={(collections) => updateContent({ collections })}
            />
          </Field>
          <Field
            label="Related guides"
            hint="Comma separated blog post titles or URLs. Ones matching a published post are linked."
          >
            <ListInput
              value={c.relatedGuides}
              onChange={(relatedGuides) => updateContent({ relatedGuides })}
            />
          </Field>
          <Field label="Popular searches" hint="Comma separated search terms.">
            <ListInput
              value={c.popularSearches}
              onChange={(popularSearches) => updateContent({ popularSearches })}
            />
          </Field>
          <Field
            label="Related ads"
            hint="Comma separated ad URL slugs; leave empty to pick similar ads automatically."
          >
            <ListInput
              value={c.relatedAds}
              onChange={(relatedAds) => updateContent({ relatedAds })}
            />
          </Field>
        </Group>
      </div>
    </section>
  );
}
