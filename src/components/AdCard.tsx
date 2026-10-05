import Link from "@/components/Link";
import type { ReactNode } from "react";
import type { Ad } from "@/lib/ads";

export default function AdCard({
  ad,
  footer,
  saved,
  onToggleSave,
  onDelete,
  onEdit,
  disableLink,
}: {
  ad: Ad;
  footer?: ReactNode;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  disableLink?: boolean;
}) {
  const useLight = ad.light && !ad.photo;
  const inkTextMuted = useLight ? "text-ink/70" : "text-white/80";

  const content = (
    <>
        <div
          className={`relative aspect-square overflow-hidden shadow-none transition-shadow duration-200 group-hover:shadow-xl ${
            ad.photo ? "bg-ink/5" : ""
          }`}
        >
          {ad.photo ? (
            // Fill the square card (cropping edges of non-square creatives)
            // and zoom in on hover, matching the swatch cards.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.photo}
              alt={ad.imageAlt ?? ""}
              loading="lazy"
              className="ad-creative absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
            />
          ) : (
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-110 ${ad.swatch}`}
            />
          )}
          {(onToggleSave || onDelete || onEdit) && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 sm:top-3 sm:right-3 sm:gap-1.5">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(ad.id);
                  }}
                  aria-label="Edit ad"
                  title="Edit ad"
                  className="flex h-8 w-8 items-center justify-center border border-border bg-surface text-ink opacity-0 transition-opacity group-hover:opacity-100 hover:border-brand hover:text-brand sm:h-9 sm:w-9 [@media(hover:none)]:opacity-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(ad.id);
                  }}
                  aria-label="Delete ad"
                  title="Delete ad"
                  className="flex h-8 w-8 items-center justify-center border border-border bg-surface text-ink opacity-0 transition-opacity group-hover:opacity-100 hover:border-brand hover:text-brand sm:h-9 sm:w-9 [@media(hover:none)]:opacity-100"
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
                  className={`flex h-8 w-8 items-center justify-center border border-border transition-opacity sm:h-9 sm:w-9 ${
                    saved
                      ? "bg-brand text-brand-foreground opacity-100"
                      : "bg-surface text-ink opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
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

          {ad.badge && (
            <span
              className={`absolute bottom-2 left-2 flex items-center gap-1 text-[11px] sm:bottom-3 sm:left-3 font-medium tracking-[0.5px] uppercase ${inkTextMuted}`}
            >
              {ad.mediaType === "video" && <span>&#9654;</span>}
              {ad.badge}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm font-bold text-ink">
          {ad.title}
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
