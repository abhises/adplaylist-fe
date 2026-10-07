"use client";

import Link from "@/components/Link";
import { useAuth } from "@/lib/AuthProvider";
import { useI18n, useLanguageLinks } from "@/lib/I18nProvider";
import { LOCALE_NAMES } from "@/lib/i18n";

// Footer for the landing page and the public pages linked from it.
export default function LandingFooter() {
  const { user, ready } = useAuth();
  const signedIn = ready && !!user;
  const { t } = useI18n();
  const languages = useLanguageLinks();

  return (
    <footer className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-4 px-[clamp(20px,4vw,32px)] py-8 text-[14px] text-[#6b6864]">
      <span className="font-extrabold tracking-[0.18em] text-[#161514]">ADPLAYLIST</span>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/blog" className="hover:text-[#EC3016]">{t.footer.blog}</Link>
        <Link href="/library" className="hover:text-[#EC3016]">{t.common.goToLibrary}</Link>
        <Link href="/terms" className="hover:text-[#EC3016]">{t.footer.terms}</Link>
        <Link href="/privacy" className="hover:text-[#EC3016]">{t.footer.privacy}</Link>
        {!signedIn && <Link href="/login" className="hover:text-[#EC3016]">{t.common.signIn}</Link>}
        {languages.map((l) => (
          <a key={l.locale} href={l.href} hrefLang={l.locale} className="hover:text-[#EC3016]">
            {LOCALE_NAMES[l.locale]}
          </a>
        ))}
      </div>
    </footer>
  );
}
