"use client";

import { useState, type ReactNode } from "react";
import Link from "@/components/Link";
import BrandProfileAds from "@/components/BrandProfileAds";
import { brandSignupHref } from "@/components/BrandPageView";
import BrandRequestModal from "@/components/BrandRequestModal";
import { isImageUrl, type BrandProfile } from "@/lib/brandProfile";

const h2 = "text-[32px] leading-tight font-extrabold tracking-[-0.01em]";
const tag =
  "border border-ink px-2 py-1 text-xs font-semibold tracking-[0.08em] uppercase";
const kicker = "text-xs tracking-[0.08em] text-ink-muted uppercase";

function ContactCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border border-ink/15 bg-card p-5">
      <span className={kicker}>{label}</span>
      <span className="text-base font-semibold break-words">{children}</span>
    </div>
  );
}

// A brand page made from a brand CSV (/brands/:slug), and its live preview
// in the admin editor. Written for the outreach email: besides showing the
// brand its ads, it sells Adplaylist to the brand's team, who can select
// ads and request new versions of them (sent as a contact enquiry). The ads
// are locked for visitors unless the link carries the page's key; see
// BrandProfileAds.
export default function BrandProfileView({
  brandName,
  heading,
  ctaLabel,
  slug,
  profile,
  adsLocked = false,
}: {
  brandName: string;
  heading: string;
  ctaLabel: string;
  slug: string;
  profile: BrandProfile;
  adsLocked?: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [requesting, setRequesting] = useState(false);
  const signupHref = brandSignupHref(slug);
  const { contact = {}, brief = {}, serviceArea, similar, about, why, faq } = profile;
  const ads = profile.ads ?? [];
  const liveCount = ads.filter((ad) => ad.live).length;
  const place = [profile.city, profile.state].filter(Boolean).join(", ");
  const website = contact.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const briefItems = [
    ["Services to feature", brief.services],
    ["Audience", brief.audience],
    ["Proof", brief.proof],
    ["Primary CTA", brief.cta],
  ].filter((item): item is [string, string] => !!item[1]);
  const companies = similar?.companies ?? [];
  const hasAbout = !!about?.paragraphs?.length;
  const nav = [
    ads.length > 0 && ["#ads", "Ads"],
    hasAbout && ["#about", "About"],
    !!faq?.length && ["#faq", "FAQ"],
  ].filter((item): item is [string, string] => !!item);
  // The footer CTA is either an offer to the brand's customers ("Get a free
  // estimate", linking to the brand's site) or, on older pages, a pitch for
  // Adplaylist ("Sign up to Adplaylist for free"), which links to sign-up.
  const pitchesUs = /sign ?up|adplaylist/i.test(ctaLabel);
  const customerHref = website && !pitchesUs ? `https://${website}` : null;
  const toggle = (index: number) =>
    setSelected((s) => (s.includes(index) ? s.filter((i) => i !== index) : [...s, index]));
  const openRequest = () => setRequesting(true);
  const selectedLabel = `${selected.length} ad${selected.length === 1 ? "" : "s"} selected`;

  const requestButton = (label: string, className = "") => (
    <button
      type="button"
      onClick={openRequest}
      className={`bg-brand px-[18px] py-3 text-[15px] font-bold text-brand-foreground ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-full flex-col bg-surface text-ink">
      <div className="bg-ink text-sm text-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-center sm:px-6">
          <span>Work at {brandName}? Claim this page to update your info and request new ads.</span>
          <button
            type="button"
            onClick={openRequest}
            className="font-bold underline underline-offset-[3px]"
          >
            Claim page →
          </button>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-ink/10 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center gap-6 px-4 py-3.5 sm:px-6">
          <Link href="/" className="text-sm font-extrabold tracking-[0.18em] uppercase">
            Adplaylist
          </Link>
          <nav className="hidden flex-1 gap-5 text-sm text-ink-muted sm:flex">
            {nav.map(([href, label]) => (
              <a key={href} href={href} className="hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-muted hover:text-ink">
              Log in
            </Link>
            <Link
              href={signupHref}
              className="bg-brand px-4 py-2.5 text-sm font-bold text-brand-foreground"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-14 px-4 pt-10 pb-20 sm:px-6">
        {!!profile.breadcrumb?.length && (
          <nav aria-label="Breadcrumb" className="-mb-8 flex flex-wrap gap-2 text-sm text-ink-muted">
            {profile.breadcrumb.map((crumb, i) => (
              <span key={i} className="flex gap-2">
                {crumb}
                <span>/</span>
              </span>
            ))}
            <span className="text-ink">{brandName}</span>
          </nav>
        )}

        <section className="flex flex-wrap items-start gap-10">
          <div className="flex min-w-0 flex-[1_1_520px] flex-wrap gap-7">
            {isImageUrl(profile.logo) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo}
                alt={`${brandName} logo`}
                className="h-28 w-28 shrink-0 rounded-full bg-card object-cover ring-1 ring-ink/10"
              />
            )}
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
              {(profile.category || place) && (
                <div className="flex flex-wrap gap-2">
                  {profile.category && <span className={tag}>{profile.category}</span>}
                  {place && <span className={tag}>{place}</span>}
                </div>
              )}
              <h1 className="text-[clamp(36px,6vw,56px)] leading-none font-extrabold tracking-[-0.025em]">
                {heading}
              </h1>
              {profile.intro && (
                <p className="max-w-[560px] text-[17px] leading-[1.6] text-pretty text-ink/80">
                  {profile.intro}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {[
                  profile.recommendPct && (
                    <span key="reviews">
                      <strong>{profile.recommendPct}% recommend</strong>
                      {profile.reviewCount && (
                        <span className="text-ink-muted">
                          {" "}
                          ({profile.reviewCount} review{profile.reviewCount === "1" ? "" : "s"})
                        </span>
                      )}
                    </span>
                  ),
                  liveCount > 0 && (
                    <span key="live" className="text-ink-muted">
                      {liveCount} live ad{liveCount === 1 ? "" : "s"}
                    </span>
                  ),
                  profile.highlight && (
                    <span key="highlight" className="text-ink-muted">
                      {profile.highlight}
                    </span>
                  ),
                ]
                  .filter(Boolean)
                  .flatMap((item, i) => [
                    i > 0 && (
                      <span key={`dot${i}`} className="text-ink/25">
                        ·
                      </span>
                    ),
                    item,
                  ])}
              </div>
            </div>
          </div>

          <aside className="flex flex-[0_1_340px] flex-col border border-ink bg-card p-6">
            <span className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-brand uppercase">
              For the {brandName} team
            </span>
            <span className="mb-2.5 text-xl leading-snug font-bold">Want more ads like these?</span>
            <p className="mb-[18px] text-sm leading-normal text-ink-muted">
              Select the ads you like below, or tell us what you need. We&rsquo;ll reach out and
              build new versions for your business.
            </p>
            {requestButton("Request ads", "mb-2.5 w-full")}
            {ads.length > 0 && (
              <a href="#ads" className="p-1.5 text-center text-sm font-semibold">
                Browse &amp; select ads ↓
              </a>
            )}
          </aside>
        </section>

        {(website || contact.mobile || contact.email || contact.messenger) && (
          <section className="-mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
            {website && (
              <ContactCard label="Website">
                <a
                  suppressHydrationWarning
                  href={`https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline"
                >
                  {website}
                </a>
              </ContactCard>
            )}
            {contact.mobile && (
              <ContactCard label="Mobile">
                <a suppressHydrationWarning href={`tel:${contact.mobile.replace(/[^+\d]/g, "")}`}>
                  {contact.mobile}
                </a>
              </ContactCard>
            )}
            {contact.email && (
              <ContactCard label="Email">
                <a suppressHydrationWarning href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </ContactCard>
            )}
            {contact.messenger && (
              <ContactCard label="Messenger">{contact.messenger}</ContactCard>
            )}
          </section>
        )}

        <BrandProfileAds
          slug={slug}
          brandName={brandName}
          profile={profile}
          locked={adsLocked}
          signupHref={signupHref}
          selected={selected}
          onToggle={toggle}
          onRequest={openRequest}
        />

        {!!serviceArea?.towns?.length && (
          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">
              {serviceArea.title || `Areas ${brandName} serves`}
            </h2>
            <div className="flex flex-wrap gap-2">
              {serviceArea.towns.map((town) => (
                <span key={town} className="border border-ink/15 bg-card px-3 py-2 text-sm">
                  {town}
                </span>
              ))}
            </div>
          </section>
        )}

        {briefItems.length > 0 && (
          <section className="flex flex-col gap-5">
            <h2 className="text-2xl font-bold">Creative brief</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-6">
              {briefItems.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-2.5 border-t-2 border-ink pt-3.5">
                  <span className={kicker}>{label}</span>
                  <span className="leading-normal font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-wrap items-center gap-6 bg-ink p-9 text-surface">
          <div className="flex flex-[1_1_420px] flex-col gap-2">
            <span className="text-2xl leading-tight font-bold">
              Build your own swipe file of ads that work.
            </span>
            <span className="text-[15px] leading-normal text-surface/70">
              Save ads like {brandName}&rsquo;s to your playlist and browse thousands more by
              industry, format and platform.
            </span>
          </div>
          <Link
            href={signupHref}
            className="bg-brand px-[22px] py-3.5 text-[15px] font-bold text-brand-foreground"
          >
            Sign up free
          </Link>
        </section>

        {companies.length > 0 && (
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h2 className={h2}>Similar companies</h2>
              {similar?.subtitle && (
                <span className="text-[15px] text-ink-muted">{similar.subtitle}</span>
              )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
              {companies.map((company) => (
                <article
                  key={company.name}
                  className="flex flex-col gap-3.5 border border-ink/15 bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    {isImageUrl(company.logo) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={company.logo}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-full bg-surface-2" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-base font-bold">{company.name}</span>
                      <span className="text-[13px] text-ink-muted">
                        {[company.city, profile.category].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  </div>
                  {!!company.ads?.length && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {company.ads.map((src) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={src}
                          src={src}
                          alt=""
                          loading="lazy"
                          className="ad-creative aspect-square w-full bg-surface-2 object-cover"
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {hasAbout && (
          <section id="about" className="flex max-w-[760px] scroll-mt-24 flex-col gap-4">
            <h2 className={`${h2} mb-1`}>{about!.title || `About ${brandName}`}</h2>
            {about!.paragraphs!.map((paragraph, i) => (
              <p key={i} className="text-base leading-[1.7] text-pretty text-ink/80">
                {paragraph}
              </p>
            ))}
          </section>
        )}

        {!!why?.points?.length && (
          <section className="flex flex-col gap-6">
            <h2 className={h2}>{why.title || `Why ${brandName}'s ads work`}</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-6">
              {why.points.map((point, i) => (
                <div key={i} className="flex flex-col gap-2.5 border-t-2 border-ink pt-3.5">
                  <h3 className="text-lg font-bold">{point.title}</h3>
                  <p className="text-[15px] leading-[1.6] text-ink/75">{point.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!!faq?.length && (
          <section id="faq" className="flex scroll-mt-24 flex-col gap-5">
            <h2 className={h2}>Frequently asked questions</h2>
            {/* <details>, so the answers stay in the page for search engines. */}
            <div className="border-t border-ink/15">
              {faq.map((item, i) => (
                <details key={item.q} open={i === 0} className="group border-b border-ink/15">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                    <span>{item.q}</span>
                    <span className="shrink-0 text-[22px] font-normal">
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">−</span>
                    </span>
                  </summary>
                  <p className="mb-5 max-w-[720px] text-[15px] leading-[1.65] text-ink/75">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
          {(profile.footerCta?.text || website) && (
            <div className="flex flex-col items-start gap-4 border border-ink/15 p-7">
              <span className={kicker}>{customerHref ? "Customers" : "Adplaylist"}</span>
              <span className="text-xl leading-snug font-bold">
                {profile.footerCta?.text || `Looking for ${brandName}?`}
              </span>
              <a
                suppressHydrationWarning
                href={customerHref ?? signupHref}
                target={customerHref ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="mt-auto bg-ink px-[18px] py-3 text-[15px] font-bold text-surface"
              >
                {ctaLabel}
              </a>
            </div>
          )}
          <div className="flex flex-col items-start gap-4 border border-ink p-7">
            <span className="text-[11px] font-bold tracking-[0.12em] text-brand uppercase">
              {brandName} team
            </span>
            <span className="text-xl leading-snug font-bold">
              Like what you see? Request new ads and we&rsquo;ll reach out within one business
              day.
            </span>
            {requestButton("Request ads", "mt-auto")}
          </div>
        </section>
      </main>

      {selected.length > 0 && !requesting && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-ink text-surface shadow-[0_-6px_24px_rgba(0,0,0,0.18)]">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-4 px-4 py-3.5 sm:px-6">
            <span className="flex-1 text-[15px]">
              <strong>{selectedLabel}</strong>
              <span className="text-surface/60"> · We&rsquo;ll create versions for {brandName}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-sm text-surface/70 underline"
            >
              Clear
            </button>
            {requestButton("Request these ads")}
          </div>
        </div>
      )}

      {requesting && (
        <BrandRequestModal
          brandName={brandName}
          slug={slug}
          selectedAds={selected.map((i) => ads[i]).filter(Boolean)}
          onClose={() => setRequesting(false)}
          onSent={() => setSelected([])}
        />
      )}
    </div>
  );
}
