"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { isImageUrl, type BrandProfileAd } from "@/lib/brandProfile";

const inputClass =
  "w-full border border-ink/25 bg-surface px-3 py-3 text-[15px] text-ink outline-none focus:border-ink";

// "Request ads" on a brand page: the brand's team (or anyone) asks for new
// ads, optionally versions of the ads they selected. It's sent as a contact
// enquiry, so it lands in Admin → Contact and the team's inbox like the
// landing page's form, with the page and the chosen ads written into it.
export default function BrandRequestModal({
  brandName,
  slug,
  selectedAds,
  onClose,
  onSent,
}: {
  brandName: string;
  slug: string;
  selectedAds: BrandProfileAd[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roles = [
    `I own or work at ${brandName}`,
    `I'm an agency for ${brandName}`,
    "Another business",
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim();
    const message = [
      `Ad request from the ${brandName} brand page (${window.location.origin}/brands/${slug})`,
      field("role"),
      field("phone") && `Phone: ${field("phone")}`,
      selectedAds.length > 0 &&
        `Selected ads:\n${selectedAds
          .map((ad, i) => `- ${ad.label || ad.alt || `Ad ${i + 1}`}${ad.image ? ` (${ad.image})` : ""}`)
          .join("\n")}`,
      field("message") && `What the ads should promote:\n${field("message")}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    setSending(true);
    setError(null);
    try {
      await api.sendContact({
        name: field("name"),
        email: field("email"),
        company: brandName,
        message,
        website: field("website"),
      });
      setSent(true);
      onSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send that. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-5"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="brand-request-title"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-[460px] overflow-auto bg-surface p-7 text-ink"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 h-10 w-10 text-2xl"
        >
          ×
        </button>

        {sent ? (
          <div className="pt-4">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-xl text-surface">
              ✓
            </div>
            <h2 id="brand-request-title" className="mb-2 text-[22px] font-extrabold">
              Request sent
            </h2>
            <p className="mb-5 text-[15px] leading-normal text-ink-muted">
              Thanks. Our team will reach out within one business day to talk through your ads.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-ink px-[18px] py-3 text-[15px] font-bold text-surface"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-brand uppercase">
              Request ads
            </div>
            <h2
              id="brand-request-title"
              className="mb-2.5 pr-8 text-2xl leading-tight font-extrabold"
            >
              Get new ads made for {brandName}
            </h2>
            <p className="mb-4 text-sm leading-normal text-ink-muted">
              Tell us who you are and we&rsquo;ll reach out within one business day to scope it.
            </p>
            {selectedAds.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {selectedAds.map((ad, i) =>
                  isImageUrl(ad.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={ad.image}
                      alt={ad.alt ?? ad.label ?? ""}
                      className="h-16 w-16 border border-ink/15 object-cover"
                    />
                  ) : null
                )}
                <span className="text-[13px] text-ink-muted">
                  {selectedAds.length} ad{selectedAds.length === 1 ? "" : "s"} selected
                </span>
              </div>
            )}
            <form onSubmit={submit} className="flex flex-col gap-3">
              <input name="name" required placeholder="Your name" aria-label="Your name" className={inputClass} />
              <input
                name="email"
                type="email"
                required
                placeholder="Email"
                aria-label="Email"
                className={inputClass}
              />
              <input name="phone" placeholder="Phone (optional)" aria-label="Phone" className={inputClass} />
              <select name="role" aria-label="Who you are" className={inputClass}>
                {roles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
              <textarea
                name="message"
                rows={3}
                placeholder="What should the ads promote? (optional)"
                aria-label="What should the ads promote?"
                className={`${inputClass} resize-y`}
              />
              {/* A honeypot: hidden from people, filled in by bots. */}
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="hidden"
              />
              {error && <p className="text-sm text-brand">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="bg-brand p-3.5 text-[15px] font-bold text-brand-foreground disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send request"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
