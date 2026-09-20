import Link from "next/link";
import type { ReactNode } from "react";
import type { Ad } from "@/lib/ads";

export default function AdCard({
  ad,
  footer,
  saved,
  onToggleSave,
  onDelete,
  disableLink,
}: {
  ad: Ad;
  footer?: ReactNode;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
  onDelete?: (id: string) => void;
  disableLink?: boolean;
}) {
  const useLight = ad.light && !ad.photo;
  const inkText = useLight ? "text-ink" : "text-white";
  const inkTextMuted = useLight ? "text-ink/70" : "text-white/80";

  const content = (
    <>
        <div
          className={`relative overflow-hidden shadow-none transition-shadow duration-200 group-hover:shadow-xl ${
            ad.variant === "overlay" ? "aspect-[4/5]" : "aspect-[4/3]"
          }`}
        >
          {ad.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.photo}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
            />
          ) : (
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-110 ${ad.swatch}`}
            />
          )}
          {ad.photo && ad.variant === "overlay" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
          )}

          {(onToggleSave || onDelete) && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(ad.id);
                  }}
                  aria-label="Delete ad"
                  title="Delete ad"
                  className="flex h-9 w-9 items-center justify-center border border-border bg-surface text-ink opacity-0 transition-opacity group-hover:opacity-100 hover:border-brand hover:text-brand"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" />
                  </svg>
                </button>
              )}
              {onToggleSave && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleSave(ad.id);
                  }}
                  aria-label={saved ? "Remove from saved" : "Save ad"}
                  title={saved ? "Remove from saved" : "Save ad"}
                  className={`flex h-9 w-9 items-center justify-center border border-border transition-opacity ${
                    saved
                      ? "bg-brand text-brand-foreground opacity-100"
                      : "bg-surface text-ink opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill={saved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 4h12v16l-6-4-6 4Z" />
                  </svg>
                </button>
              )}
            </div>
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
    </>
  );

  return (
    <div>
      {disableLink ? (
        <div className="group block">{content}</div>
      ) : (
        <Link href={`/ads/${ad.id}`} className="group block">
          {content}
        </Link>
      )}
      {footer}
    </div>
  );
}
