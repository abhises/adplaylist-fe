"use client";

import Link from "@/components/Link";
import { useAuth } from "@/lib/AuthProvider";

// Footer for the landing page and the public pages linked from it.
export default function LandingFooter() {
  const { user, ready } = useAuth();
  const signedIn = ready && !!user;

  return (
    <footer className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-4 px-[clamp(20px,4vw,32px)] py-8 text-[14px] text-[#6b6864]">
      <span className="font-extrabold tracking-[0.18em] text-[#161514]">ADPLAYLIST</span>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/blog" className="hover:text-[#EC3016]">Blog</Link>
        <Link href="/library" className="hover:text-[#EC3016]">Go to Library</Link>
        <Link href="/terms" className="hover:text-[#EC3016]">Terms &amp; Conditions</Link>
        <Link href="/privacy" className="hover:text-[#EC3016]">Privacy Policy</Link>
        {!signedIn && <Link href="/login" className="hover:text-[#EC3016]">Sign in</Link>}
      </div>
    </footer>
  );
}
