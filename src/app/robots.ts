import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Signed-in app pages are useless to a crawler (they render nothing without
// a session), so they're kept out to save crawl budget. Login, signup and
// brand pages stay crawlable so Google can see their noindex tag.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/library",
        "/saved",
        "/billing",
        "/profile",
        "/requests",
        "/add-ad",
        "/ads/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
