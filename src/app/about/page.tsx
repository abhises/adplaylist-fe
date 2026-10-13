import type { Metadata } from "next";
import Link from "@/components/Link";
import LandingFooter from "@/components/LandingFooter";
import LandingHeader from "@/components/LandingHeader";

export const metadata: Metadata = {
  title: "About us",
  alternates: { canonical: "/about" },
  description:
    "Adplaylist.com is where you discover original and live ads, pick the ones you like to download or edit, and request new ones, delivered weekly.",
};

// A word of the headline on a red block; a phrase that wraps keeps its
// padding on every line.
function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="box-decoration-clone bg-[#EC3016] px-[0.18em] text-white">{children}</span>
  );
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F3F2F0] leading-[normal] text-[#161514]">
      <LandingHeader />
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-[clamp(32px,4vw,56px)] px-[clamp(20px,5vw,72px)] pt-[clamp(72px,10vw,140px)] pb-[clamp(72px,9vw,120px)]">
        <p className="font-mono text-[13px] tracking-[0.2em] text-[#EC3016]">ABOUT US</p>
        <h1 className="text-[clamp(36px,5.4vw,68px)] leading-[1.15] font-bold tracking-[-0.04em] text-pretty">
          Adplaylist.com is where you <Mark>discover</Mark> original and live ads,{" "}
          <Mark>pick</Mark> the ones you like to download or edit, and <Mark>request</Mark> new
          ones, delivered weekly.
        </h1>
        <p className="text-[clamp(18px,1.8vw,22px)] leading-[1.5] text-[#55524e]">
          Most platforms stop at the first verb.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-8 border-t border-[#dcd9d5] pt-10">
          <div className="flex items-center gap-5">
            <span
              aria-hidden
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#161514] text-xl font-bold text-white"
            >
              AG
            </span>
            <div className="flex flex-col gap-1">
              <strong className="text-lg">Alexander van Gog</strong>
              <span className="text-[15px] text-[#666]">Founder, Adplaylist.com</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/library"
              className="bg-[#EC3016] px-[26px] py-4 text-lg font-bold text-white"
            >
              Browse the library
            </Link>
            <Link href="/signup" className="text-lg font-bold text-[#161514] underline">
              Start free trial
            </Link>
          </div>
        </div>
      </main>
      <div className="border-t border-[#dcd9d5]">
        <LandingFooter />
      </div>
    </div>
  );
}
