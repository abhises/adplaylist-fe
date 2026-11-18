import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");
// Live notifications use a WebSocket to the API.
const apiSocket = apiUrl.replace(/^http/, "ws");

// Uploaded files: S3 in production, Supabase for older files and local
// development. The browser shows them, previews PDFs in a frame, downloads
// them with fetch, and uploads to them with a signed URL.
const storage = "https://*.amazonaws.com https://*.supabase.co";
// Google Sign-In's button and one-tap prompt.
const google = "https://accounts.google.com/gsi/";

// Content Security Policy, without nonces (see the Next.js CSP guide): nonces
// would force every page to render dynamically. Inline scripts are allowed
// for Next's own bootstrapping, the theme script and JSON-LD, but scripts
// from any other site, plugins, framing and form posts elsewhere are not,
// and the page can only talk to our API, storage and Google Sign-In.
// Images and videos may come from any HTTPS host: admin-written blog and
// brand pages embed them.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${google}client${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline' ${google}style`,
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl} ${apiSocket} ${storage} ${google}`,
  `frame-src 'self' ${storage} ${google}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Older browsers' version of frame-ancestors: no clickjacking via iframes.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HTTPS only, for two years, on every subdomain (nl., api., www.).
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // The Docker image (see Dockerfile) sets NEXT_STANDALONE=1 to get a
  // self-contained server in .next/standalone. Vercel builds stay as before.
  ...(process.env.NEXT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
