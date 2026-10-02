import type { Metadata } from "next";
import Link from "@/components/Link";
import LegalPage, { Email, List, Section, SubHeading, Table, Term } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  description: "How Adplaylist collects, uses and protects your personal data.",
};

const SECTIONS = [
  ["who", "1. Who we are"],
  ["data", "2. What data we collect"],
  ["use", "3. How we use your data"],
  ["sharing", "4. Who we share data with"],
  ["cookies", "5. Cookies, retention and security"],
  ["rights", "6. Your rights"],
  ["age", "7. Age limit"],
  ["changes", "8. Changes to this policy"],
  ["contact", "9. Contact"],
] as const;

const title = (id: (typeof SECTIONS)[number][0]) =>
  SECTIONS.find(([s]) => s === id)![1];

const termsLink = (
  <Link href="/terms" className="text-[#EC3016] underline">
    Terms &amp; Conditions
  </Link>
);

export default function PrivacyPage() {
  return (
    <LegalPage title="Adplaylist Privacy Policy" updated="30 September 2026" sections={SECTIONS}>
      <Section id="who" title={title("who")}>
        <p>
          This Privacy Policy explains how Adplaylist (&ldquo;we&rdquo;, &ldquo;us&rdquo;
          or &ldquo;our&rdquo;) collects, uses and protects personal data when you visit
          adplaylist.com or use the Adplaylist ad library, free trial, paid plans and
          creative requests (the &ldquo;Service&rdquo;).
        </p>
        <p>
          Adplaylist is the data controller for the personal data described here. For
          any privacy question or request, contact us at <Email />.
        </p>
        <p>
          This policy should be read together with our {termsLink}. If you do not agree
          with it, please do not use the Service.
        </p>
      </Section>

      <Section id="data" title={title("data")}>
        <SubHeading>Data you give us</SubHeading>
        <List
          items={[
            <>
              <Term>Account data:</Term> your name, email address, password (stored
              encrypted) and, if relevant, your company name.
            </>,
            <>
              <Term>Team data:</Term> the email addresses of team members you invite to
              your workspace.
            </>,
            <>
              <Term>Billing data:</Term> plan, billing period, billing address and VAT
              details. Card payments are handled by our payment provider; we never see
              or store your full card number.
            </>,
            <>
              <Term>Creative requests and content:</Term> briefs, notes to the creative
              team, and any logos, images, copy, prices or other materials you upload.
            </>,
            <>
              <Term>Communication:</Term> messages you send us by email or through the
              Service.
            </>,
          ]}
        />
        <SubHeading>Data collected automatically</SubHeading>
        <List
          items={[
            <>
              <Term>Usage data:</Term> the creatives you view, search, save, copy and
              edit, the filters you use, and the requests you make.
            </>,
            <>
              <Term>Device and technical data:</Term> IP address, browser and device
              type, operating system, language, referring page, approximate location
              (country or city) and time of visits.
            </>,
            <>
              <Term>Cookies and similar technologies:</Term> see{" "}
              <a suppressHydrationWarning href="#cookies" className="text-[#EC3016] underline">
                section 5
              </a>
              .
            </>,
          ]}
        />
      </Section>

      <Section id="use" title={title("use")}>
        <p>
          We use personal data only for the purposes below, each with a legal basis
          under the EU General Data Protection Regulation (GDPR).
        </p>
        <Table
          head={["Purpose", "Data used", "Legal basis"]}
          rows={[
            ["Create and run your account and team workspace", "Account, team, usage data", "Performance of contract"],
            ["Provide the library, editable copies and saved creatives", "Usage data, your content", "Performance of contract"],
            ["Handle creative requests and deliver creatives", "Requests, uploaded content, communication", "Performance of contract"],
            ["Run free trials, subscriptions, credits and billing", "Account, billing data", "Performance of contract; legal obligation (bookkeeping, tax)"],
            ["Send service emails (trial ending, receipts, request updates, changes to terms)", "Account data", "Performance of contract"],
            ["Answer support questions", "Account data, communication", "Performance of contract; legitimate interest"],
            ["Keep the Service secure and prevent fraud or misuse", "Technical, usage data", "Legitimate interest"],
            ["Analyse and improve the Service", "Usage, technical data (aggregated where possible)", "Legitimate interest; consent for analytics cookies"],
            ["Send product news and offers", "Email address", "Consent or legitimate interest (existing customers); you can opt out anytime"],
            ["Comply with law and handle legal claims", "Any relevant data", "Legal obligation; legitimate interest"],
          ]}
        />
        <p>
          We do not sell your personal data. We do not use it for automated decisions
          that have legal or similarly significant effects on you.
        </p>
        <p>
          Your uploaded content is used only to provide the Service to you. We do not
          show your confidential materials to other customers, and we use delivered
          creatives in our portfolio only with your consent.
        </p>
      </Section>

      <Section id="sharing" title={title("sharing")}>
        <p>
          We share personal data only with service providers that help us run
          Adplaylist, and only as far as they need it. They act on our instructions
          under data processing agreements.
        </p>
        <Table
          head={["Service", "Provider", "Purpose"]}
          rows={[
            ["Hosting and database", "[Provider]", "Running the website and storing data"],
            ["Payments and invoicing", "[Provider]", "Subscriptions, trials, invoices, tax"],
            ["Email delivery", "[Provider]", "Service and marketing emails"],
            ["Analytics", "[Provider]", "Understanding how the Service is used"],
            ["Error monitoring", "[Provider]", "Finding and fixing technical issues"],
          ]}
        />
        <p>We may also share data:</p>
        <List
          items={[
            "with members of your team workspace, who can see saved creatives, copies and requests in that workspace;",
            "with authorities, courts or advisers when the law requires it or to protect our rights;",
            "with a buyer or successor if Adplaylist is sold, merged or reorganised, under the same privacy commitments.",
          ]}
        />
        <p>
          <Term>International transfers.</Term> Some providers may process data
          outside the European Economic Area (EEA), for example in the United States.
          In that case we rely on an adequacy decision (such as the EU–US Data Privacy
          Framework) or the European Commission&rsquo;s Standard Contractual Clauses to
          protect your data.
        </p>
      </Section>

      <Section id="cookies" title={title("cookies")}>
        <p>
          <Term>Cookies.</Term> We use essential cookies to keep you signed in and the
          Service working. With your consent, we also use analytics cookies to
          understand how the Service is used. You can change your cookie choices at any
          time in the cookie banner or your browser settings. Blocking essential
          cookies may stop parts of the Service from working.
        </p>
        <p>
          <Term>How long we keep data.</Term>
        </p>
        <List
          items={[
            "Account, team and usage data: while your account is active, and deleted or anonymised within 6 months after it is closed.",
            "Uploaded content and delivered creatives: while your account is active, then deleted within 6 months after closure.",
            "Billing and invoice records: as long as bookkeeping and tax law requires.",
            "Marketing data: until you unsubscribe or withdraw consent.",
          ]}
        />
        <p>Data in backups is deleted as the backups are overwritten.</p>
        <p>
          <Term>Security.</Term> We use technical and organisational measures such as
          encrypted connections (HTTPS), encrypted passwords, access controls and
          limited staff access. No system is completely secure. If a personal data
          breach is likely to put you at risk, we will inform you and, where required,
          notify the data protection authority within 72 hours.
        </p>
      </Section>

      <Section id="rights" title={title("rights")}>
        <p>Under the GDPR you have the right to:</p>
        <List
          items={[
            "access the personal data we hold about you and get a copy;",
            "correct inaccurate or incomplete data;",
            "have your data deleted;",
            "restrict or object to certain processing, including processing based on legitimate interest;",
            "receive your data in a portable format;",
            "withdraw consent at any time, without affecting processing done before;",
            "opt out of marketing emails using the unsubscribe link in each email.",
          ]}
        />
        <p>
          You can update most account details in your account settings. For other
          requests, email <Email />. We reply within one month.
        </p>
        <p>
          If you think we handle your data unlawfully, you can complain to your local
          data protection authority.
        </p>
      </Section>

      <Section id="age" title={title("age")}>
        <p>
          The Service is for users aged 18 or over. We do not knowingly collect data
          from anyone under 18. If we learn that we have, we will delete it.
        </p>
      </Section>

      <Section id="changes" title={title("changes")}>
        <p>
          We may update this policy from time to time. The latest version is always on
          this page. For material changes, we will notify you by email or in the
          Service before they take effect.
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
