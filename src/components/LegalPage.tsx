import type { ReactNode } from "react";
import LandingFooter from "@/components/LandingFooter";
import LandingHeader from "@/components/LandingHeader";

// Building blocks for the legal pages (/terms, /privacy). Like the landing
// page they hang off, they use its fixed light palette rather than the app
// theme.

export const CONTACT_EMAIL = "info@adplaylist.com";

export function Email() {
  return (
    <a suppressHydrationWarning href={`mailto:${CONTACT_EMAIL}`} className="text-[#EC3016] underline">
      {CONTACT_EMAIL}
    </a>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-[96px]">
      <h2 className="text-2xl font-extrabold tracking-[-0.02em]">{title}</h2>
      <div className="mt-4 space-y-4 text-[17px] leading-[1.7]">{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-lg font-bold">{children}</h3>;
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

// Lead-in phrase for a paragraph, e.g. "Billing." before the details.
export function Term({ children }: { children: ReactNode }) {
  return <strong className="font-bold">{children}</strong>;
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto border border-[#dcd9d5] bg-white">
      <table className="w-full min-w-[560px] text-left text-[15px] leading-[1.5]">
        <thead>
          <tr className="border-b border-[#dcd9d5] bg-[#F7F6F4]">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-[#e7e5e2] align-top">
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 py-3 ${ci === 0 ? "font-medium" : "text-[#55524e]"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LegalPage({
  title,
  updated,
  sections,
  children,
}: {
  title: string;
  updated: string;
  // [anchor id, heading] for the contents list, in page order.
  sections: readonly (readonly [string, string])[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F3F2F0] leading-[normal] text-[#161514]">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-[clamp(20px,4vw,32px)] py-[clamp(48px,7vw,80px)]">
        <article>
          <h1 className="text-[clamp(36px,5vw,56px)] leading-none font-extrabold tracking-[-0.03em] text-balance">
            {title}
          </h1>
          <p className="mt-4 text-sm text-[#6b6864]">Last updated: {updated}</p>

          <nav aria-label="Contents" className="mt-10 border-y border-[#dcd9d5] py-6">
            <p className="font-mono text-[12px] tracking-[0.08em] text-[#EC3016]">CONTENTS</p>
            <ol className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a suppressHydrationWarning href={`#${id}`} className="hover:text-[#EC3016]">
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {children}

          <p className="mt-12 border-t border-[#dcd9d5] pt-6 text-sm text-[#6b6864]">
            Last updated: {updated}.
          </p>
        </article>
      </main>
      <div className="border-t border-[#dcd9d5]">
        <LandingFooter />
      </div>
    </div>
  );
}
