"use client";

import { useState } from "react";
import type { Ad } from "@/lib/api";
import { isImageUrl, type BrandProfile, type BrandProfileAd } from "@/lib/brandProfile";
import { SUPPORTED_IMAGE_ACCEPT, uploadImage, validateImageFile } from "@/lib/upload";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

// A labelled input. The input is wrapped in its <label>, and named after the
// brand CSV's section and field ("ad1.headline"), so it can be found by
// either (screen readers, and tools filling the form in).
function Text({
  label,
  name,
  value,
  onChange,
  placeholder,
  long,
}: {
  label: string;
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  long?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-[5px] block text-xs text-ink/70">{label}</span>
      {long ? (
        <textarea
          name={name}
          rows={3}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      ) : (
        <input
          type="text"
          name={name}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </label>
  );
}

// A list typed as one line with a separator ("Towns: A; B; C"). The text is
// kept as typed, so a trailing separator isn't lost before the next item.
function ListText({
  label,
  name,
  value,
  onChange,
  separator,
  placeholder,
}: {
  label: string;
  name: string;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  separator: string;
  placeholder?: string;
}) {
  const split = (s: string) =>
    s
      .split(separator.trim())
      .map((item) => item.trim())
      .filter(Boolean);
  const joined = (value ?? []).join(separator);
  const [text, setText] = useState(joined);
  // Follows the value when it changes from outside (a CSV import).
  const shown = split(text).join(separator) === joined ? text : joined;
  return (
    <Text
      label={label}
      name={name}
      value={shown}
      placeholder={placeholder}
      onChange={(next) => {
        setText(next);
        onChange(split(next));
      }}
    />
  );
}

// An image: its address, or a file uploaded here which fills the address in.
function ImageField({
  label,
  name,
  value,
  onChange,
  onUploadingChange,
}: {
  label: string;
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setUploading(true);
    onUploadingChange(true);
    setError(null);
    try {
      onChange((await uploadImage(file)).url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that file.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <div>
      <div className="flex items-end gap-2">
        {isImageUrl(value) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-[34px] w-[34px] shrink-0 border border-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <Text
            label={label}
            name={name}
            value={value}
            onChange={onChange}
            placeholder="https://… or upload a file"
          />
        </div>
        <label className="cursor-pointer border border-border px-3 py-1.5 text-sm font-bold text-ink hover:border-ink">
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept={SUPPORTED_IMAGE_ACCEPT}
            aria-label={`Upload ${label}`}
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error && <p className="mt-1 text-xs text-brand">{error}</p>}
    </div>
  );
}

// The ad a link points at: the slug of an ad page (…/ads/<slug>, on any of
// our hosts).
function adSlugFromUrl(url: URL) {
  return url.pathname.match(/^\/ads\/([a-z0-9-]+)\/?$/)?.[1] ?? null;
}

// A brand page ad from a library ad: its creative, or its copy when it has none.
function brandAdFromLibrary(ad: Ad): BrandProfileAd {
  const photo = isImageUrl(ad.photo) ? ad.photo : undefined;
  return {
    live: !!ad.live,
    label: ad.title,
    ...(ad.cta && { cta: ad.cta }),
    ...(photo
      ? { image: photo, alt: ad.title }
      : {
          headline: ad.headline,
          ...(ad.eyebrow && { eyebrow: ad.eyebrow }),
          ...(ad.sub && { subline: ad.sub }),
        }),
  };
}

// Adds ads from pasted links, one per line: an ad page from the library
// (its creative and copy are copied in), or the address of a creative image.
function AddAdsFromUrls({
  library,
  onAdd,
}: {
  library: Ad[];
  onAdd: (ads: BrandProfileAd[]) => void;
}) {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function add() {
    const added: BrandProfileAd[] = [];
    const problems: string[] = [];
    for (const line of text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)) {
      let url: URL;
      try {
        url = new URL(line);
      } catch {
        problems.push(`${line}: not a link`);
        continue;
      }
      const slug = adSlugFromUrl(url);
      if (slug) {
        const ad = library.find((a) => a.id === slug);
        if (ad) added.push(brandAdFromLibrary(ad));
        else problems.push(`${line}: no ad found at this link`);
      } else if (/^https?:$/.test(url.protocol)) {
        added.push({ live: false, image: line });
      } else {
        problems.push(`${line}: not a web address`);
      }
    }
    if (added.length) onAdd(added);
    setErrors(problems);
    // Keeps the lines that couldn't be added, to fix and try again.
    setText(problems.map((p) => p.slice(0, p.lastIndexOf(": "))).join("\n"));
  }

  return (
    <div className="border border-dashed border-border p-3 sm:col-span-2">
      <label className="block">
        <span className="mb-[5px] block text-xs text-ink/70">
          Add creatives by URL (one per line)
        </span>
        <textarea
          name="ads.addurls"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"https://adplaylist.com/ads/…\nhttps://…/creative.png"}
          className={inputClass}
        />
      </label>
      <p className="mt-1 text-xs text-ink-muted">
        An ad page link copies that library ad&apos;s creative and copy; an image link adds it as a
        finished creative. Set Status to Live for real, running ads.
      </p>
      {errors.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-brand">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        disabled={!text.trim()}
        className="mt-2 bg-ink px-3 py-1.5 text-sm font-bold text-surface disabled:opacity-50"
      >
        Add creatives
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section role="group" aria-label={title} className="border-t border-border pt-5">
      <h3 className="mb-3 text-sm font-bold text-ink">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// One entry of a repeated part (an ad, an FAQ), with its remove button.
function Item({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={title} className="border border-border p-3 sm:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold text-ink">{title}</p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          className="text-xs text-ink-muted underline hover:text-brand"
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="sm:col-span-2">
      <button
        type="button"
        onClick={onClick}
        className="border border-dashed border-border px-3 py-1.5 text-sm text-ink hover:border-ink"
      >
        + {label}
      </button>
    </div>
  );
}

const AD_TEXT_FIELDS: [keyof BrandProfileAd, string, string][] = [
  ["label", "Card label", "cardlabel"],
  ["cta", "CTA button", "ctabutton"],
  ["alt", "Image alt text", "imagealttext"],
  ["eyebrow", "Eyebrow", "eyebrow"],
  ["headline", "Headline", "headline"],
  ["subline", "Subline", "subline"],
  ["bigNumber", "Big number", "bignumber"],
  ["photoCredit", "Photo credit", "photocredit"],
  ["footer", "Footer", "footer"],
  ["servicesLine", "Services line", "servicesline"],
  ["townsLine", "Towns line", "townsline"],
  ["button", "On-image button", "onimagebutton"],
  ["phone", "On-image phone", "onimagephone"],
];

// Every field of the brand CSV beyond the page's name, link, heading and
// sign-up button (which the editor shows above), filled in by hand. The
// labels are the CSV's own, so a filled-in CSV can be copied across field by
// field.
export default function BrandProfileForm({
  profile,
  onChange,
  onUploadingChange,
  library,
}: {
  profile: BrandProfile;
  // Takes an update of the latest profile, so quick changes in a row (or
  // several clicks of an add button) all apply.
  onChange: (update: (profile: BrandProfile) => BrandProfile) => void;
  onUploadingChange: (uploading: boolean) => void;
  // The ad library, for adding its ads by their page links.
  library: Ad[];
}) {
  // Applies a change to a copy of the profile.
  const edit = (change: (draft: BrandProfile) => void) => {
    onChange((latest) => {
      const draft = structuredClone(latest);
      change(draft);
      return draft;
    });
  };
  const image = { onUploadingChange };

  const ads = profile.ads ?? [];
  const companies = profile.similar?.companies ?? [];
  const paragraphs = profile.about?.paragraphs ?? [];
  const points = profile.why?.points ?? [];
  const faq = profile.faq ?? [];

  return (
    <div className="grid gap-5">
      <Section title="Basics">
        <Text
          label="Category"
          name="basics.category"
          value={profile.category}
          onChange={(v) => edit((d) => (d.category = v))}
          placeholder="Roofing"
        />
        <Text
          label="City"
          name="basics.city"
          value={profile.city}
          onChange={(v) => edit((d) => (d.city = v))}
        />
        <Text
          label="State"
          name="basics.state"
          value={profile.state}
          onChange={(v) => edit((d) => (d.state = v))}
        />
        <Text
          label="Country"
          name="basics.country"
          value={profile.country}
          onChange={(v) => edit((d) => (d.country = v))}
        />
        <Text
          label="Recommend %"
          name="basics.recommend"
          value={profile.recommendPct}
          onChange={(v) => edit((d) => (d.recommendPct = v.replace(/%/g, "")))}
          placeholder="98"
        />
        <Text
          label="Review count"
          name="basics.reviewcount"
          value={profile.reviewCount}
          onChange={(v) => edit((d) => (d.reviewCount = v))}
          placeholder="120"
        />
        <div className="sm:col-span-2">
          <ImageField
            label="Logo file"
            name="basics.logofile"
            value={profile.logo}
            onChange={(v) => edit((d) => (d.logo = v))}
            {...image}
          />
        </div>
        <div className="sm:col-span-2">
          <Text
            label="Intro text"
            name="basics.introtext"
            value={profile.intro}
            long
            onChange={(v) => edit((d) => (d.intro = v))}
          />
        </div>
      </Section>

      <Section title="Contact">
        <Text
          label="Website"
          name="contact.website"
          value={profile.contact?.website}
          onChange={(v) => edit((d) => (d.contact = { ...d.contact, website: v }))}
        />
        <Text
          label="Mobile"
          name="contact.mobile"
          value={profile.contact?.mobile}
          onChange={(v) => edit((d) => (d.contact = { ...d.contact, mobile: v }))}
        />
        <Text
          label="Email"
          name="contact.email"
          value={profile.contact?.email}
          onChange={(v) => edit((d) => (d.contact = { ...d.contact, email: v }))}
        />
        <Text
          label="Messenger"
          name="contact.messenger"
          value={profile.contact?.messenger}
          onChange={(v) => edit((d) => (d.contact = { ...d.contact, messenger: v }))}
        />
      </Section>

      <Section title="Brand">
        <Text
          label="Primary color"
          name="brand.primarycolor"
          value={profile.colors?.primary}
          onChange={(v) => edit((d) => (d.colors = { ...d.colors, primary: v }))}
          placeholder="#1a4d8f"
        />
        <Text
          label="Secondary color"
          name="brand.secondarycolor"
          value={profile.colors?.secondary}
          onChange={(v) => edit((d) => (d.colors = { ...d.colors, secondary: v }))}
          placeholder="#f2b705"
        />
      </Section>

      <Section title="Ads">
        {ads.map((ad, i) => {
          const n = i + 1;
          const setAd = (change: (ad: BrandProfileAd) => void) => edit((d) => change(d.ads![i]));
          return (
            <Item key={i} title={`Ad ${n}`} onRemove={() => edit((d) => d.ads!.splice(i, 1))}>
              <label className="block">
                <span className="mb-[5px] block text-xs text-ink/70">Status</span>
                <select
                  name={`ad${n}.status`}
                  value={ad.live ? "live" : "concept"}
                  onChange={(e) => setAd((a) => (a.live = e.target.value === "live"))}
                  className={inputClass}
                >
                  <option value="concept">Concept</option>
                  <option value="live">Live</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-[5px] block text-xs text-ink/70">Layout</span>
                <select
                  name={`ad${n}.layout`}
                  value={ad.layout ?? ""}
                  onChange={(e) =>
                    setAd((a) => {
                      const layout = e.target.value;
                      if (layout === "hook" || layout === "proof" || layout === "local")
                        a.layout = layout;
                      else delete a.layout;
                    })
                  }
                  className={inputClass}
                >
                  <option value="">Automatic</option>
                  <option value="hook">Hook</option>
                  <option value="proof">Proof</option>
                  <option value="local">Local</option>
                </select>
              </label>
              <div className="sm:col-span-2">
                <ImageField
                  label="Image file"
                  name={`ad${n}.imagefile`}
                  value={ad.image}
                  onChange={(v) => setAd((a) => (a.image = v))}
                  {...image}
                />
              </div>
              <div className="sm:col-span-2">
                <ImageField
                  label="Photo"
                  name={`ad${n}.photo`}
                  value={ad.photo}
                  onChange={(v) => setAd((a) => (a.photo = v))}
                  {...image}
                />
              </div>
              {AD_TEXT_FIELDS.map(([prop, label, field]) => (
                <Text
                  key={prop}
                  label={label}
                  name={`ad${n}.${field}`}
                  value={ad[prop] as string | undefined}
                  onChange={(v) => setAd((a) => ((a as Record<string, unknown>)[prop] = v))}
                />
              ))}
            </Item>
          );
        })}
        <AddButton
          label="Add ad"
          onClick={() => edit((d) => (d.ads = [...(d.ads ?? []), { live: false }]))}
        />
        <AddAdsFromUrls
          library={library}
          onAdd={(added) => edit((d) => (d.ads = [...(d.ads ?? []), ...added]))}
        />
      </Section>

      <Section title="Service area">
        <Text
          label="Section title"
          name="servicearea.sectiontitle"
          value={profile.serviceArea?.title}
          onChange={(v) => edit((d) => (d.serviceArea = { ...d.serviceArea, title: v }))}
        />
        <ListText
          label="Towns (separate with ;)"
          name="servicearea.towns"
          separator="; "
          value={profile.serviceArea?.towns}
          placeholder="Springfield; Shelbyville"
          onChange={(v) => edit((d) => (d.serviceArea = { ...d.serviceArea, towns: v }))}
        />
      </Section>

      <Section title="Creative brief">
        <Text
          label="Services to feature"
          name="creativebrief.servicestofeature"
          value={profile.brief?.services}
          onChange={(v) => edit((d) => (d.brief = { ...d.brief, services: v }))}
        />
        <Text
          label="Audience"
          name="creativebrief.audience"
          value={profile.brief?.audience}
          onChange={(v) => edit((d) => (d.brief = { ...d.brief, audience: v }))}
        />
        <Text
          label="Proof"
          name="creativebrief.proof"
          value={profile.brief?.proof}
          onChange={(v) => edit((d) => (d.brief = { ...d.brief, proof: v }))}
        />
        <Text
          label="Primary CTA"
          name="creativebrief.primarycta"
          value={profile.brief?.cta}
          onChange={(v) => edit((d) => (d.brief = { ...d.brief, cta: v }))}
        />
      </Section>

      <Section title="Services">
        <div className="sm:col-span-2">
          <ListText
            label="All services (separate with ;)"
            name="services.allservices"
            separator="; "
            value={profile.services}
            placeholder="Roof repair; Gutters; Skylights"
            onChange={(v) => edit((d) => (d.services = v))}
          />
        </div>
      </Section>

      <Section title="Similar companies">
        <div className="sm:col-span-2">
          <Text
            label="Section subtitle"
            name="similarcompanies.sectionsubtitle"
            value={profile.similar?.subtitle}
            onChange={(v) => edit((d) => (d.similar = { ...d.similar, subtitle: v }))}
          />
        </div>
        {companies.map((company, i) => {
          const n = i + 1;
          const setCompany = (change: (c: (typeof companies)[number]) => void) =>
            edit((d) => change(d.similar!.companies![i]));
          return (
            <Item
              key={i}
              title={`Company ${n}`}
              onRemove={() => edit((d) => d.similar!.companies!.splice(i, 1))}
            >
              <Text
                label="Name"
                name={`similarcompanies.company${n}name`}
                value={company.name}
                onChange={(v) => setCompany((c) => (c.name = v))}
              />
              <Text
                label="City"
                name={`similarcompanies.company${n}city`}
                value={company.city}
                onChange={(v) => setCompany((c) => (c.city = v))}
              />
              <div className="sm:col-span-2">
                <ImageField
                  label="Logo"
                  name={`similarcompanies.company${n}logo`}
                  value={company.logo}
                  onChange={(v) => setCompany((c) => (c.logo = v))}
                  {...image}
                />
              </div>
              {[0, 1, 2].map((j) => (
                <div key={j} className="sm:col-span-2">
                  <ImageField
                    label={`Ad image ${j + 1}`}
                    name={`similarcompanies.company${n}adimage${j + 1}`}
                    value={company.ads?.[j]}
                    {...image}
                    onChange={(v) =>
                      setCompany((c) => {
                        const list = [...(c.ads ?? [])];
                        list[j] = v;
                        c.ads = Array.from(list, (src) => src ?? "");
                      })
                    }
                  />
                </div>
              ))}
            </Item>
          );
        })}
        <AddButton
          label="Add company"
          onClick={() =>
            edit(
              (d) =>
                (d.similar = {
                  ...d.similar,
                  companies: [...(d.similar?.companies ?? []), { name: "" }],
                }),
            )
          }
        />
      </Section>

      <Section title="About">
        <div className="sm:col-span-2">
          <Text
            label="Section title"
            name="about.sectiontitle"
            value={profile.about?.title}
            onChange={(v) => edit((d) => (d.about = { ...d.about, title: v }))}
          />
        </div>
        {paragraphs.map((paragraph, i) => (
          <Item
            key={i}
            title={`Paragraph ${i + 1}`}
            onRemove={() => edit((d) => d.about!.paragraphs!.splice(i, 1))}
          >
            <div className="sm:col-span-2">
              <Text
                label="Text"
                name={`about.paragraph${i + 1}`}
                value={paragraph}
                long
                onChange={(v) => edit((d) => (d.about!.paragraphs![i] = v))}
              />
            </div>
          </Item>
        ))}
        <AddButton
          label="Add paragraph"
          onClick={() =>
            edit(
              (d) => (d.about = { ...d.about, paragraphs: [...(d.about?.paragraphs ?? []), ""] }),
            )
          }
        />
      </Section>

      <Section title="Why it works">
        <div className="sm:col-span-2">
          <Text
            label="Section title"
            name="whyitworks.sectiontitle"
            value={profile.why?.title}
            onChange={(v) => edit((d) => (d.why = { ...d.why, title: v }))}
          />
        </div>
        {points.map((point, i) => (
          <Item
            key={i}
            title={`Point ${i + 1}`}
            onRemove={() => edit((d) => d.why!.points!.splice(i, 1))}
          >
            <Text
              label="Title"
              name={`whyitworks.point${i + 1}title`}
              value={point.title}
              onChange={(v) => edit((d) => (d.why!.points![i].title = v))}
            />
            <Text
              label="Text"
              name={`whyitworks.point${i + 1}text`}
              value={point.text}
              onChange={(v) => edit((d) => (d.why!.points![i].text = v))}
            />
          </Item>
        ))}
        <AddButton
          label="Add point"
          onClick={() =>
            edit(
              (d) =>
                (d.why = { ...d.why, points: [...(d.why?.points ?? []), { title: "", text: "" }] }),
            )
          }
        />
      </Section>

      <Section title="FAQ">
        {faq.map((item, i) => (
          <Item key={i} title={`FAQ ${i + 1}`} onRemove={() => edit((d) => d.faq!.splice(i, 1))}>
            <div className="sm:col-span-2">
              <Text
                label={`Q${i + 1}`}
                name={`faq.q${i + 1}`}
                value={item.q}
                onChange={(v) => edit((d) => (d.faq![i].q = v))}
              />
            </div>
            <div className="sm:col-span-2">
              <Text
                label={`A${i + 1}`}
                name={`faq.a${i + 1}`}
                value={item.a}
                long
                onChange={(v) => edit((d) => (d.faq![i].a = v))}
              />
            </div>
          </Item>
        ))}
        <AddButton
          label="Add question"
          onClick={() => edit((d) => (d.faq = [...(d.faq ?? []), { q: "", a: "" }]))}
        />
      </Section>

      <Section title="Footer CTA">
        <div className="sm:col-span-2">
          <Text
            label="Text"
            name="footercta.text"
            value={profile.footerCta?.text}
            onChange={(v) => edit((d) => (d.footerCta = { text: v }))}
          />
        </div>
      </Section>

      <Section title="Linking">
        <div className="sm:col-span-2">
          <ListText
            label="Breadcrumb (separate with /, without the company)"
            name="linking.breadcrumb"
            separator=" / "
            value={profile.breadcrumb}
            placeholder="Home / Brands / Roofing"
            onChange={(v) => edit((d) => (d.breadcrumb = v))}
          />
        </div>
      </Section>

      <Section title="SEO">
        <Text
          label="SEO title"
          name="seo.seotitle"
          value={profile.seo?.title}
          onChange={(v) => edit((d) => (d.seo = { ...d.seo, title: v }))}
        />
        <Text
          label="Keywords"
          name="seo.keywords"
          value={profile.seo?.keywords}
          onChange={(v) => edit((d) => (d.seo = { ...d.seo, keywords: v }))}
        />
        <div className="sm:col-span-2">
          <Text
            label="Meta description"
            name="seo.metadescription"
            value={profile.seo?.description}
            long
            onChange={(v) => edit((d) => (d.seo = { ...d.seo, description: v }))}
          />
        </div>
        <Text
          label="OG title"
          name="seo.ogtitle"
          value={profile.seo?.ogTitle}
          onChange={(v) => edit((d) => (d.seo = { ...d.seo, ogTitle: v }))}
        />
        <Text
          label="Schema type"
          name="seo.schematype"
          value={profile.seo?.schemaType}
          onChange={(v) => edit((d) => (d.seo = { ...d.seo, schemaType: v }))}
          placeholder="LocalBusiness"
        />
        <div className="sm:col-span-2">
          <Text
            label="OG description"
            name="seo.ogdescription"
            value={profile.seo?.ogDescription}
            long
            onChange={(v) => edit((d) => (d.seo = { ...d.seo, ogDescription: v }))}
          />
        </div>
        <div className="sm:col-span-2">
          <ImageField
            label="OG image"
            name="seo.ogimage"
            value={profile.seo?.ogImage}
            onChange={(v) => edit((d) => (d.seo = { ...d.seo, ogImage: v }))}
            {...image}
          />
        </div>
      </Section>
    </div>
  );
}
