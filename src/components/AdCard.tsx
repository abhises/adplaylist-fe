import Link from "next/link";
import type { ReactNode } from "react";
import type { Ad } from "@/lib/ads";

export default function AdCard({
  ad,
  footer,
}: {
  ad: Ad;
  footer?: ReactNode;
}) {
  const useLight = ad.light && !ad.photo;
  const inkText = useLight ? "text-ink" : "text-white";
  const inkTextMuted = useLight ? "text-ink/70" : "text-white/80";

  return (
    <div>
      <Link href={`/ads/${ad.id}`} className="group block">
        <div
          className={`relative overflow-hidden ${ad.photo ? "" : ad.swatch} ${
            ad.variant === "overlay" ? "aspect-[4/5]" : "aspect-[4/3]"
          }`}
        >
          {ad.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.photo}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {ad.photo && ad.variant === "overlay" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
          )}

          {ad.eyebrow && (
            <span
              className={`absolute top-3 left-3 text-[11px] font-medium tracking-[1px] uppercase ${inkText}/90`}
            >
              {ad.eyebrow}
            </span>
          )}
          {ad.badge && (
            <span
              className={`absolute top-3 right-3 flex items-center gap-1 text-[11px] font-medium tracking-[0.5px] uppercase ${inkTextMuted}`}
            >
              {ad.mediaType === "video" && <span>&#9654;</span>}
              {ad.badge}
            </span>
          )}

          {ad.variant === "overlay" && (
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p
                className={`text-xl leading-tight font-extrabold ${inkText}`}
              >
                {ad.headline}
              </p>
              {ad.sub && (
                <p className={`mt-1 text-xs ${inkTextMuted}`}>{ad.sub}</p>
              )}
              {ad.cta && (
                <span className="mt-3 inline-block bg-brand px-3 py-1.5 text-[11px] font-bold text-brand-foreground uppercase">
                  {ad.cta}
                </span>
              )}
            </div>
          )}
        </div>

        {ad.variant === "lockup" && (
          <div className="bg-surface pt-3">
            <p className="text-sm leading-tight font-bold text-ink">
              {ad.headline}
            </p>
            {ad.sub && (
              <p className="mt-1 text-xs text-ink-muted">{ad.sub}</p>
            )}
          </div>
        )}

        <p className="mt-2 text-sm font-bold text-ink">
          {ad.title} &mdash; {ad.format}
        </p>
      </Link>
      {footer}
    </div>
  );
}
