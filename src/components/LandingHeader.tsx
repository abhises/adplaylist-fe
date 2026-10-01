"use client";

import { useState } from "react";
import Link from "@/components/Link";
import { useAuth } from "@/lib/AuthProvider";

// Links to the landing page's sections. On the landing page itself they're
// in-page anchors; elsewhere (e.g. /terms) they lead back to it. "Library"
// is the landing page's preview of the library; "Ads" is the full public
// library page (/library).
const NAV_LINKS = [
  { hash: "#how", label: "How it works" },
  { hash: "#library", label: "Library" },
  { href: "/library", label: "Ads" },
  { hash: "#request", label: "Request" },
  { hash: "#pricing", label: "Pricing" },
  { hash: "#faq", label: "FAQ" },
];

const container = "mx-auto max-w-[1320px] px-[clamp(20px,4vw,32px)]";

// The red header from the landing page, shared with the public pages that
// hang off it (Terms, Privacy). Its height (72px) is what the landing hero
// subtracts to fill the rest of the screen.
export default function LandingHeader({ onLanding = false }: { onLanding?: boolean }) {
  const { user, ready } = useAuth();
  const signedIn = ready && !!user;
  const [menuOpen, setMenuOpen] = useState(false);

  const base = onLanding ? "" : "/";
  // The landing page's sign-up form is in its hero; elsewhere, go to /signup.
  const signupHref = onLanding ? "#signup" : "/signup";
  const linkHref = (l: (typeof NAV_LINKS)[number]) =>
    "href" in l ? l.href : `${base}${l.hash}`;

  return (
    <header className="sticky top-0 z-20 bg-[#EC3016] text-white">
      <div className={`${container} flex h-[72px] items-center justify-between gap-6`}>
        <a href={onLanding ? "#top" : "/"} className="text-[14px] font-extrabold tracking-[0.18em]">
          ADPLAYLIST
        </a>
        <nav className="hidden flex-wrap items-center gap-7 text-[15px] font-medium min-[820px]:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={linkHref(l)}>
              {l.label}
            </a>
          ))}
          {signedIn ? (
            <Link href="/library" className="bg-white px-[18px] py-[10px] font-bold text-[#EC3016]">
              Go to Library
            </Link>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <a href={signupHref} className="bg-white px-[18px] py-[10px] font-bold text-[#EC3016]">
                Sign up free
              </a>
            </>
          )}
        </nav>
        <div className="flex items-center gap-[10px] min-[820px]:hidden">
          {signedIn ? (
            <Link href="/library" className="bg-white px-[14px] py-[10px] text-[14px] font-bold whitespace-nowrap text-[#EC3016]">
              Go to Library
            </Link>
          ) : (
            <a href={signupHref} className="bg-white px-[14px] py-[10px] text-[14px] font-bold whitespace-nowrap text-[#EC3016]">
              Sign up free
            </a>
          )}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center border-[1.5px] border-white bg-transparent text-[20px] text-white"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="flex flex-col border-t border-white/35 px-[clamp(20px,4vw,32px)] pb-4 min-[820px]:hidden">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={linkHref(l)}
              onClick={() => setMenuOpen(false)}
              className="border-b border-white/25 py-4 text-[18px] font-semibold"
            >
              {l.label}
            </a>
          ))}
          {!signedIn && (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="py-4 text-[18px] font-semibold">
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
