import type { Metadata } from "next";
import Link from "@/components/Link";
import LandingFooter from "@/components/LandingFooter";
import LandingHeader from "@/components/LandingHeader";

export const metadata: Metadata = {
  title: "About us",
  alternates: { canonical: "/about" },
  description:
    "Adplaylist is a library of ready-made ad creatives for Meta, TikTok, Google and LinkedIn, with a design team that makes new sizes, markets and ads on request.",
};

const POINTS = [
  {
    title: "A library, not a blank page",
    text: "Every ad is filed by platform, category, market and language, so the right starting point is a filter away instead of a fresh brief.",
  },
  {
    title: "Copies you can change",
    text: "Open an editable copy and swap the headline, offer or market. The original stays in the library for everyone else.",
  },
  {
    title: "A team behind it",
    text: "Need a new size, a new market or a brand-new ad? Send a request and our designers deliver, on average within 3 working days.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F3F2F0] leading-[normal] text-[#161514]">
      <LandingHeader />
      <main className="mx-auto max-w-3xl px-[clamp(20px,4vw,32px)] py-[clamp(48px,7vw,80px)]">
        <p className="font-mono text-[12px] tracking-[0.08em] text-[#EC3016]">ABOUT US</p>
        <h1 className="mt-3 text-[clamp(36px,5vw,56px)] leading-none font-extrabold tracking-[-0.03em] text-balance">
          Stop rebuilding ads you already have.
        </h1>
        <div className="mt-8 space-y-5 text-[17px] leading-[1.7] text-[#3d3a37]">
          <p>
            Adplaylist started from a simple frustration: teams keep making the same ads again.
            A good creative ships once, then disappears into a folder, and the next campaign
            starts from a blank page.
          </p>
          <p>
            So we built a library of ready-made ad creatives for Meta, TikTok, Google and
            LinkedIn, and a team to keep it growing. Marketers, regional leads and agencies can
            find a proven ad, adapt it for their market and ship it, without waiting on design.
          </p>
        </div>

        <h2 className="mt-14 text-2xl font-extrabold tracking-[-0.02em]">What we do</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.title} className="border-t-2 border-[#EC3016] pt-4">
              <h3 className="text-lg font-bold">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-[#55524e]">{p.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-4 border-t border-[#dcd9d5] pt-8">
          <Link href="/library" className="bg-[#EC3016] px-5 py-3 font-bold text-white">
            Browse the library
          </Link>
          <Link href="/signup" className="font-bold text-[#161514] underline">
            Start free trial
          </Link>
        </div>
      </main>
      <div className="border-t border-[#dcd9d5]">
        <LandingFooter />
      </div>
    </div>
  );
}
