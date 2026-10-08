"use client";

import { ALL_MARKETS, MARKET_OPTIONS, MAX_MARKETS } from "@/lib/ads";

// The market picker for the ad forms: every market as a toggle, up to
// MAX_MARKETS, the first picked being the primary. "All markets" stands
// alone; picking a country clears it. A value outside the list (an older
// ad) stays as a chip so editing doesn't silently drop it.
export default function MarketSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const full = value.length >= MAX_MARKETS;
  const unknown = value.filter((m) => !MARKET_OPTIONS.includes(m));

  function toggle(market: string) {
    if (value.includes(market)) return onChange(value.filter((m) => m !== market));
    if (market === ALL_MARKETS) return onChange([ALL_MARKETS]);
    const countries = value.filter((m) => m !== ALL_MARKETS);
    if (countries.length >= MAX_MARKETS) return;
    onChange([...countries, market]);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {[...unknown, ...MARKET_OPTIONS].map((m) => {
          const active = value.includes(m);
          const primary = active && value[0] === m && value.length > 1;
          const blocked = !active && full && m !== ALL_MARKETS;
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggle(m)}
              disabled={blocked}
              aria-pressed={active}
              title={primary ? "Primary market" : blocked ? `Up to ${MAX_MARKETS} markets` : undefined}
              className={`border px-2.5 py-1 text-xs ${
                active
                  ? primary
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-brand/30 bg-brand/10 text-brand"
                  : "border-border text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              }`}
            >
              {m}
              {!MARKET_OPTIONS.includes(m) && " (old)"}
            </button>
          );
        })}
      </div>
      {value.length === 0 ? (
        <p className="mt-1.5 text-xs text-brand">Pick at least one market.</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-ink-muted">
          Up to {MAX_MARKETS}. The first one picked is the primary.
        </p>
      )}
    </div>
  );
}
