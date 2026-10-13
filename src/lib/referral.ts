import { parseHost } from "@/lib/i18n";

// The code from a referral link (/?ref=<code>), kept in a cookie for 30 days
// so it's still there when the visitor signs up, on any language's
// subdomain. The sign-up request sends it along (lib/api.ts).
const COOKIE = "adplaylist_ref";
const MAX_AGE = 30 * 24 * 60 * 60;

export const isReferralCode = (code: string) => /^[A-Z0-9]{6,12}$/.test(code);

// "; domain=.adplaylist.com" so nl.adplaylist.com shares it; nothing for
// localhost or an IP address, where a domain attribute isn't accepted.
function domainAttr() {
  const host = parseHost(window.location.host).base.replace(/:\d+$/, "");
  return host.includes(".") && !/^[\d.]+$/.test(host) ? `; domain=.${host}` : "";
}

export function rememberReferralCode(code: string) {
  document.cookie = `${COOKIE}=${code}; path=/; max-age=${MAX_AGE}; samesite=lax${domainAttr()}`;
}

export function getReferralCode(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const code = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return code && isReferralCode(code) ? code : undefined;
}

// Once signed up, the code has done its job.
export function clearReferralCode() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax${domainAttr()}`;
}
