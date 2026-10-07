import { headers } from "next/headers";
import { parseHost } from "@/lib/i18n";

// The language of the current request, from the subdomain it came in on
// (nl.adplaylist.com → nl). Behind a reverse proxy the original host is in
// X-Forwarded-Host. Server-only: reads the request headers.
export async function getRequestLocale() {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0].trim() || h.get("host") || "";
  return parseHost(host);
}
