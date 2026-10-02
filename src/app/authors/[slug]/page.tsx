import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import AuthorView from "@/components/AuthorView";
import { api, ApiError } from "@/lib/api";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";

// Public and indexable: a curator's profile and every ad they added. Ad pages
// link here from the byline (rel="author"), which ties the ads to a named
// expert for search engines.
async function getAuthor(slug: string) {
  try {
    return await api.getAuthor(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

function describe(name: string, jobTitle: string | undefined, count: number) {
  return `${name}${jobTitle ? `, ${jobTitle}` : ""} has curated ${count} ad${
    count === 1 ? "" : "s"
  } on ${SITE_NAME}, with a breakdown of why each one works and how to adapt it.`;
}

export async function generateMetadata({
  params,
}: PageProps<"/authors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getAuthor(slug);
  if (!data) return { title: "Author not found" };
  const { author, ads } = data;
  const url = `/authors/${author.slug}`;
  const title = `${author.name}${author.jobTitle ? ` – ${author.jobTitle}` : ""}`;
  const description = author.bio || describe(author.name, author.jobTitle, ads.length);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "profile",
      images: author.photoUrl ? [author.photoUrl] : undefined,
    },
  };
}

export default async function AuthorPage({ params }: PageProps<"/authors/[slug]">) {
  await connection();
  const { slug } = await params;
  const data = await getAuthor(slug);
  if (!data) notFound();
  const { author, ads } = data;
  const url = `${SITE_URL}/authors/${author.slug}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    mainEntity: {
      "@type": "Person",
      "@id": `${url}#person`,
      name: author.name,
      url,
      jobTitle: author.jobTitle,
      description: author.bio,
      image: author.photoUrl,
      sameAs: [author.linkedinUrl, author.websiteUrl].filter(Boolean),
      worksFor: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    hasPart: ads.map((ad) => ({
      "@type": "WebPage",
      url: `${SITE_URL}/ads/${ad.id}`,
      name: ad.title,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      <AuthorView author={author} ads={ads} />
    </>
  );
}
