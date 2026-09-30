import type { Metadata } from "next";
import Link from "@/components/Link";
import LegalPage, { Email, List, Section, Term } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions · Adplaylist",
  description: "The terms that govern your use of Adplaylist.",
};

const SECTIONS = [
  ["general", "1. General information"],
  ["service", "2. The Service"],
  ["accounts", "3. Accounts and eligibility"],
  ["plans", "4. Plans, payment and refunds"],
  ["requests", "5. Creative requests"],
  ["ip", "6. Intellectual property and licences"],
  ["content", "7. Your content and acceptable use"],
  ["availability", "8. Availability"],
  ["performance", "9. Ad performance"],
  ["liability", "10. Limitation of liability"],
  ["indemnification", "11. Indemnification"],
  ["termination", "12. Suspension and termination"],
  ["changes", "13. Changes to these Terms"],
  ["contact", "14. Contact"],
] as const;

const title = (id: (typeof SECTIONS)[number][0]) =>
  SECTIONS.find(([s]) => s === id)![1];

export default function TermsPage() {
  return (
    <LegalPage
      title="Adplaylist Terms & Conditions"
      updated="30 September 2026"
      sections={SECTIONS}
    >
        <Section id="general" title={title("general")}>
          <p>
            These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and
            use of adplaylist.com, the Adplaylist ad library and all related features
            (together, the &ldquo;Service&rdquo;).
          </p>
          <p>
            The Service is owned and operated by Adplaylist (&ldquo;we&rdquo;,
            &ldquo;us&rdquo; or &ldquo;our&rdquo;).
          </p>
          <p>
            By creating an account, signing in, submitting a creative request or
            otherwise using the Service, you agree to these Terms and to our{" "}
            <Link href="/privacy" className="text-[#EC3016] underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Service.
          </p>
          <p>
            If you use the Service on behalf of a company, agency or other
            organisation, you confirm that you are authorised to accept these Terms on
            its behalf. In that case, &ldquo;you&rdquo; means both you and that
            organisation.
          </p>
        </Section>

        <Section id="service" title={title("service")}>
          <p>
            Adplaylist is an ad creative library for marketing teams. Through the
            Service you can:
          </p>
          <List
            items={[
              "browse and search ad creatives, filtered by platform, category, market and language;",
              "open an editable copy of a creative and change elements such as the headline, offer, price or market;",
              "save and bookmark creatives for your campaigns;",
              "request new creatives, sizes or localised versions from the creative team.",
            ]}
          />
          <p>
            Editing a copy never changes the original creative. Saving or bookmarking
            a creative does not reserve or lock it for you; other users may use the
            same creative.
          </p>
          <p>
            We may add, change or remove features at any time. Some features may only
            be available on certain plans.
          </p>
        </Section>

        <Section id="accounts" title={title("accounts")}>
          <p>
            You must be at least 18 years old and able to enter into a binding
            contract to use the Service.
          </p>
          <p>
            To create an account you need a valid email address, and the information
            you give us must be accurate and kept up to date.
          </p>
          <p>You are responsible for:</p>
          <List
            items={[
              "keeping your login details confidential;",
              "all activity that happens under your account;",
              "making sure that team members you invite follow these Terms.",
            ]}
          />
          <p>
            Tell us straight away at <Email /> if you suspect unauthorised use of your
            account.
          </p>
          <p>
            We may send you service emails about your account, requests and billing.
            If you agree to receive marketing emails, you can unsubscribe at any time
            using the link in each email.
          </p>
        </Section>

        <Section id="plans" title={title("plans")}>
          <p>
            Using the Service requires a paid plan. The current plans (Starter, Pro and
            Agency), their prices and what each includes are shown on our{" "}
            <Link href="/#pricing" className="text-[#EC3016] underline">
              pricing page
            </Link>
            .
          </p>
          <p>
            <Term>Free trial.</Term> Every plan starts with a 7-day free trial. Pro and
            Agency trials include 2 free custom ad requests. Unless you cancel before
            the trial ends, your paid plan starts automatically and your payment method
            is charged.
          </p>
          <p>
            <Term>Billing.</Term> Plans are billed in advance, monthly or yearly, and
            renew automatically until you cancel. You can cancel at any time in your
            account settings; cancellation takes effect at the end of the current
            billing period.
          </p>
          <p>
            <Term>Credits.</Term> On Pro and Agency, one credit equals one new custom
            creative from the design team. Your plan includes a set number of credits
            per month. Unused credits do not carry over to the next month and have no
            cash value.
          </p>
          <p>
            <Term>Prices and tax.</Term> Prices are in US dollars (USD) and exclude
            tax. We may change prices with at least 30 days&rsquo; notice; the new price
            applies from your next billing period.
          </p>
          <p>
            <Term>Refunds.</Term> Payments already made are non-refundable, except
            where required by law or agreed with us in writing. If you believe you were
            charged in error, contact <Email /> within 14 days of the charge.
          </p>
        </Section>

        <Section id="requests" title={title("requests")}>
          <p>
            You can ask the creative team for a new size, a new market or language
            version, or a brand-new ad.
          </p>
          <List
            items={[
              <>
                <Term>Turnaround.</Term> Target turnaround is 3 days on Pro and 48 hours
                on Agency. This is an estimate, not a guaranteed deadline, and may vary
                with the size of the request and our workload.
              </>,
              <>
                <Term>Your input.</Term> You are responsible for the briefs, copy,
                prices, offers, logos and other materials you provide, and for making
                sure they are accurate and that you have the right to use them.
              </>,
              <>
                <Term>Review before launch.</Term> You must check every delivered
                creative before using it. You are responsible for making sure your ads
                comply with advertising laws and the policies of each ad platform (such
                as Meta, Google, TikTok and YouTube).
              </>,
              <>
                <Term>Declining requests.</Term> We may decline or stop working on a
                request that is unlawful, misleading, infringes someone else&rsquo;s
                rights or goes against these Terms.
              </>,
              <>
                <Term>Revisions and limits.</Term> Custom requests are available on Pro
                and Agency only, and each new creative uses one credit. Localisation,
                brand kits, animated and video ads, and a dedicated creative lead depend
                on your plan.
              </>,
            ]}
          />
        </Section>

        <Section id="ip" title={title("ip")}>
          <p>
            <Term>Our platform.</Term> The Service, including its software, design,
            templates, library structure and branding, belongs to Adplaylist or its
            licensors. Except as set out in these Terms, you may not copy, resell,
            scrape, reverse-engineer or redistribute any part of it.
          </p>
          <p>
            <Term>Library creatives.</Term> Creatives in the library may belong to you,
            your organisation, Adplaylist or third parties such as brands and agencies.
            We give you a limited, non-exclusive, non-transferable right to view, copy
            and edit them for your own advertising campaigns while your account is
            active. This right does not cover reselling creatives, or offering them as
            templates or stock material to others.
          </p>
          <p>
            <Term>Third-party elements.</Term> Some creatives contain brand names,
            logos, fonts, photos, music or other elements owned by third parties. Your
            right to use those elements may be limited by the owner&rsquo;s licence or
            trademark rights. It is your responsibility to check you may use them in
            your ads.
          </p>
          <p>
            <Term>Delivered request work.</Term> Once any fees for a request are paid,
            you may use the creative we deliver for your advertising. Unless agreed
            otherwise in writing, we keep ownership of the underlying designs and
            templates and may reuse general layouts and techniques (but not your
            confidential materials) in other work.
          </p>
          <p>
            <Term>Portfolio.</Term> We may show delivered creatives in our portfolio or
            marketing only with your prior consent.
          </p>
        </Section>

        <Section id="content" title={title("content")}>
          <p>
            <Term>Your content.</Term> You keep ownership of the materials you upload
            or submit, such as briefs, logos, product images and copy (&ldquo;Your
            Content&rdquo;). You give us a worldwide, royalty-free, non-exclusive
            licence to store, copy, edit and process Your Content only as needed to run
            the Service and fulfil your requests. You confirm that you have all rights
            needed to grant this licence.
          </p>
          <p>
            <Term>Team visibility.</Term> Creatives and copies saved in a team
            workspace may be visible to other members of that workspace.
          </p>
          <p>You must not:</p>
          <List
            items={[
              "upload content that infringes copyright, trademark or other rights;",
              "create or request ads that are unlawful, deceptive, discriminatory, hateful or otherwise break ad platform policies;",
              "share your account or give access to people outside your team without permission;",
              "scrape, bulk-download or automatically extract the library;",
              "try to break, overload or bypass the security of the Service;",
              "use the Service to build a competing ad library or template product.",
            ]}
          />
          <p>
            We may remove content or restrict access if we reasonably believe these
            rules have been broken. Please back up anything important; we are not
            responsible for loss of Your Content.
          </p>
        </Section>

        <Section id="availability" title={title("availability")}>
          <p>
            We aim to keep the Service running smoothly but do not guarantee it will
            always be available or error-free. We may pause access for maintenance,
            updates or to fix faults, and will try to keep interruptions short. Report
            problems to <Email />.
          </p>
        </Section>

        <Section id="performance" title={title("performance")}>
          <p>
            We do not guarantee any results from creatives found in or made through the
            Service, including clicks, conversions, sales or approval by ad platforms.
            You decide which ads to run and are responsible for your campaigns and ad
            spend.
          </p>
        </Section>

        <Section id="liability" title={title("liability")}>
          <p>
            To the fullest extent permitted by law, Adplaylist is not liable for
            indirect or consequential losses, including loss of profits, revenue, data,
            ad spend or business opportunities, arising from your use of the Service.
          </p>
          <p>
            Our total liability to you for any claim related to the Service is limited
            to the amount you paid us in the 12 months before the claim, or EUR 100 if
            you have not paid anything.
          </p>
          <p>
            Nothing in these Terms limits liability that cannot be limited by law, such
            as liability for gross negligence, wilful misconduct, or your mandatory
            rights as a consumer.
          </p>
        </Section>

        <Section id="indemnification" title={title("indemnification")}>
          <p>
            You agree to cover Adplaylist for any claims, losses and reasonable costs,
            including legal fees, arising from Your Content, the ads you publish, or
            your breach of these Terms.
          </p>
        </Section>

        <Section id="termination" title={title("termination")}>
          <p>
            You can close your account at any time by contacting us or through your
            account settings.
          </p>
          <p>
            We may suspend or close your account if you breach these Terms, fail to
            pay, or if we stop offering the Service. Where reasonable, we will give you
            notice first. After closure, your right to use library creatives ends, and
            we may delete your account data in line with our{" "}
            <Link href="/privacy" className="text-[#EC3016] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section id="changes" title={title("changes")}>
          <p>
            We may update these Terms from time to time. We will post the new version
            on this page and, for material changes, notify you by email or in the
            Service at least 14 days before they take effect. If you keep using the
            Service after that, you accept the updated Terms.
          </p>
        </Section>

        <Section id="contact" title={title("contact")}>
          <p>
            Adplaylist · <Email />
          </p>
        </Section>

    </LegalPage>
  );
}
