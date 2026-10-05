import type { Metadata } from "next";
import LandingHeader from "@/components/LandingHeader";

// Placeholder until the page's content is decided; only the header for now.
// Individual brand pitch pages live at /brands/[slug] and stay unlisted.
export const metadata: Metadata = {
  title: "Brands",
  alternates: { canonical: "/brands" },
  robots: { index: false, follow: true },
};

export default function BrandsPage() {
  return (
    <div className="min-h-screen bg-[#F3F2F0] leading-[normal] text-[#161514]">
      <LandingHeader />
      <main className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,32px)] py-[clamp(48px,7vw,80px)]">
        <h1 className="text-[clamp(36px,5vw,56px)] leading-none font-extrabold tracking-[-0.03em]">
          Brands
        </h1>
      </main>
    </div>
  );
}
