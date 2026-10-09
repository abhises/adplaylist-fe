"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";

// How long before a slow load says so, rather than just spinning.
const SLOW_AFTER_MS = 3000;

// Shown while a page or the library's ads load: a spinner straight away,
// and a reassuring line if it's still going after a few seconds.
export default function LoadingScreen({
  label = "Loading…",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-4 text-center ${
        fullScreen ? "min-h-screen" : "py-16"
      }`}
    >
      {fullScreen && (
        <p className="text-[15px] font-extrabold tracking-[2.1px] text-ink uppercase">Adplaylist</p>
      )}
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <Spinner />
        {label}
      </div>
      <p
        aria-live="polite"
        className={`max-w-xs text-xs text-ink-muted transition-opacity duration-300 ${
          slow ? "opacity-100" : "opacity-0"
        }`}
      >
        {slow && "Still loading — the ad library is large, so this can take a few seconds."}
      </p>
    </div>
  );
}
