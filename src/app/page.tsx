import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import { DICTIONARIES } from "@/lib/dictionaries";
import { LOCALES, LOCALE_TAGS, siteUrlFor } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/serverLocale";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getRequestLocale();
  const { homeTitle, description } = DICTIONARIES[locale].meta;
  const url = `${siteUrlFor(locale)}/`;
  return {
    title: { absolute: homeTitle },
    // Each language's home page is canonical on its own subdomain, and
    // hreflang points search engines at the other languages.
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l].lang, `${siteUrlFor(l)}/`])),
        "x-default": `${SITE_URL}/`,
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: homeTitle,
      description,
      url,
      locale: LOCALE_TAGS[locale].og,
    },
  };
}

export default async function Home() {
  const { locale } = await getRequestLocale();
  const siteUrl = siteUrlFor(locale);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: SITE_NAME,
        url: siteUrl,
        description: DICTIONARIES[locale].meta.description,
        inLanguage: LOCALE_TAGS[locale].lang,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <LandingPage />
    </>
  );
}
