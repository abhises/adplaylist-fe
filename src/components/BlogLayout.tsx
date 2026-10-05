import type { ReactNode } from "react";
import LandingHeader from "@/components/LandingHeader";

export function formatPostDate(date?: string) {
  return date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
}

// The landing page's header around the public blog (/blog, /blog/:slug).
// No login needed.
export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-surface">
      <LandingHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-10">
        {children}
      </main>
    </div>
  );
}
