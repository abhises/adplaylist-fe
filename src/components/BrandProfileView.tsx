import type { ReactNode } from "react";
import Link from "@/components/Link";
import BrandProfileAds from "@/components/BrandProfileAds";
import { brandSignupHref } from "@/components/BrandPageView";
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
// in the admin editor. The ads are locked for visitors unless the link
// carries the page's key; see BrandProfileAds.
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
  const signupHref = brandSignupHref(slug);
  const { contact = {}, brief = {}, serviceArea, similar, about, why, faq } = profile;
  const place = [profile.city, profile.state].filter(Boolean).join(", ");
  const website = contact.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const briefItems = [
    ["Services to feature", brief.services],
    ["Audience", brief.audience],
    ["Proof", brief.proof],
    ["Primary CTA", brief.cta],
  ].filter((item): item is [string, string] => !!item[1]);
  const companies = similar?.companies ?? [];

  return (
    <div className="flex min-h-full flex-col bg-surface text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="text-sm font-extrabold tracking-[0.18em] uppercase">
            Adplaylist
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-ink-muted hover:text-ink">
              Log in
            </Link>
            <Link
              href={signupHref}
              className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-12 px-4 pt-10 pb-20 sm:px-6">
        {!!profile.breadcrumb?.length && (
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-ink-muted">
            {profile.breadcrumb.map((crumb, i) => (
              <span key={i} className="flex gap-2">
                {crumb}
                <span>/</span>
              </span>
            ))}
            <span className="text-ink">{brandName}</span>
          </nav>
        )}

        <section className="flex flex-wrap items-start gap-6 sm:gap-8">
          {isImageUrl(profile.logo) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo}
              alt={`${brandName} logo`}
              className="h-[120px] w-[120px] shrink-0 rounded-full bg-card object-cover"
            />
          )}
          <div className="flex min-w-[min(280px,100%)] flex-1 flex-col gap-4">
            {(profile.category || place) && (
              <div className="flex flex-wrap gap-2">
                {profile.category && <span className={tag}>{profile.category}</span>}
                {place && <span className={tag}>{place}</span>}
              </div>
            )}
            <h1 className="text-[clamp(36px,6vw,52px)] leading-[1.02] font-extrabold tracking-[-0.02em]">
              {heading}
            </h1>
            {profile.intro && (
              <p className="max-w-[720px] text-[17px] leading-[1.6] text-pretty">
                {profile.intro}
              </p>
            )}
            {profile.recommendPct && (
              <div className="text-[15px] font-semibold">
                {profile.recommendPct}% recommend
                {profile.reviewCount && (
                  <span className="font-normal text-ink-muted">
                    {" "}
                    ({profile.reviewCount} review{profile.reviewCount === "1" ? "" : "s"})
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {(website || contact.mobile || contact.email || contact.messenger) && (
          <section className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3">
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
        />

        {!!serviceArea?.towns?.length && (
          <section className="flex flex-col gap-4">
            <h2 className="text-2xl font-extrabold">
              {serviceArea.title || `${brandName} service area`}
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
            <h2 className="text-2xl font-extrabold">Creative brief</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-6">
              {briefItems.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-2 border-t-2 border-ink pt-3.5">
                  <span className={kicker}>{label}</span>
                  <span className="text-[17px] leading-[1.45] font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

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

        {!!about?.paragraphs?.length && (
          <section className="flex flex-col gap-5">
            <h2 className={h2}>{about.title || `About ${brandName}'s ads`}</h2>
            {about.paragraphs.map((paragraph, i) => (
              <p key={i} className="max-w-[760px] text-[17px] leading-[1.65] text-pretty">
                {paragraph}
              </p>
            ))}
          </section>
        )}

        {!!why?.points?.length && (
          <section className="flex flex-col gap-5">
            <h2 className={h2}>{why.title || "What makes these ads work"}</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-6">
              {why.points.map((point, i) => (
                <div key={i} className="flex flex-col gap-2 border-t-2 border-ink pt-3.5">
                  <h3 className="text-[19px] font-bold">{point.title}</h3>
                  <p className="text-base leading-[1.6]">{point.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!!faq?.length && (
          <section className="flex flex-col gap-5">
            <h2 className={h2}>Frequently asked questions</h2>
            <div className="flex flex-col gap-[18px]">
              {faq.map((item) => (
                <div
                  key={item.q}
                  className="flex flex-col gap-2 border-t border-ink/15 pt-[18px]"
                >
                  <h3 className="text-[19px] font-bold">{item.q}</h3>
                  <p className="max-w-[760px] text-[17px] leading-[1.65] text-pretty">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 pt-8">
          <span className="text-[17px] font-semibold">
            {profile.footerCta?.text || `Create new ads for ${brandName}`}
          </span>
          <Link
            href={signupHref}
            className="bg-brand px-[22px] py-3.5 text-base font-bold text-brand-foreground"
          >
            {ctaLabel}
          </Link>
        </section>
      </main>
    </div>
  );
}
