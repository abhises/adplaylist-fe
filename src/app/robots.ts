import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Signed-in app pages are useless to a crawler (they render nothing without
// a session), so they're kept out to save crawl budget. The public library
// (/library itself) and every ad's page (/ads/…) are meant to be found, so
// they're open — but not a client's own /library/<name> or an ad's admin
// edit page. Login, signup and brand pages stay
// crawlable so Google can see their noindex tag.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/library/",
        "/saved",
        "/billing",
        "/profile",
        "/requests",
        "/add-ad",
        "/ads/*/edit",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
