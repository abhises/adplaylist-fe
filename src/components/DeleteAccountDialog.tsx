"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import Spinner from "@/components/Spinner";
import { api, ApiError, type CancelOffer, type User } from "@/lib/api";

// Each reason with the question its comment box asks. The box opens under
// the picked reason; it's optional except for "Other".
const REASONS: { label: string; placeholder: string }[] = [
  { label: "Too expensive", placeholder: "What price would feel right to you?" },
  { label: "I'm not using it enough", placeholder: "What would make you use it more often?" },
  { label: "Missing features I need", placeholder: "Which features are you missing?" },
  { label: "Found a better alternative", placeholder: "Which tool are you switching to, and why?" },
  { label: "Technical issues or bugs", placeholder: "What went wrong?" },
  { label: "Other", placeholder: "Tell us more…" },
];

const eyebrow = "text-xs font-medium tracking-[0.12em] text-brand uppercase";

// "Delete account": first a discount to stay (for paying owners who haven't
// used up their offers), then why they're leaving. Going ahead cancels the
// subscription (for the owner) and deactivates the account; the answers are
// saved for Admin → Cancellations either way.
export default function DeleteAccountDialog({
  open,
  user,
  onClose,
  onOfferAccepted,
  onDeleted,
}: {
  open: boolean;
  user: User;
  onClose: () => void;
  onOfferAccepted: (offer: CancelOffer) => void;
  onDeleted: () => void;
}) {
  const [step, setStep] = useState<"loading" | "offer" | "survey">("loading");
  const [offer, setOffer] = useState<CancelOffer | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each time it opens: start over and see whether there's an offer.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setStep("loading");
      setReason(null);
      setDetails("");
      setError(null);
    });
    api
      .getCancelOffer()
      .then(({ offer }) => {
        if (cancelled) return;
        setOffer(offer);
        setStep(offer ? "offer" : "survey");
      })
      .catch(() => {
        if (cancelled) return;
        setOffer(null);
        setStep("survey");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function acceptOffer() {
    setWorking(true);
    setError(null);
    try {
      const { offer: applied } = await api.acceptCancelOffer();
      onOfferAccepted(applied);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't apply the discount.");
    } finally {
      setWorking(false);
    }
  }

  async function confirmDelete() {
    if (!reason) return;
    setWorking(true);
    setError(null);
    try {
      await api.deleteAccount({ reason, details: details.trim() });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete the account.");
      setWorking(false);
    }
  }

  const account = user.account;
  const ownsSubscription =
    account?.role === "owner" && account.hasSubscription && account.status !== "expired";
  const cantSubmit = !reason || (reason === "Other" && !details.trim()) || working;

  return (
    <Modal open={open} onClose={working ? () => {} : onClose} maxWidth="max-w-[520px]">
      <div className="relative -m-6 max-h-[calc(100vh-48px)] overflow-auto px-8 pt-9 pb-8">
        <button
          type="button"
          onClick={onClose}
          disabled={working}
          aria-label="Close"
          className="absolute top-3 right-4 p-1.5 text-2xl leading-none text-ink-muted hover:text-ink"
        >
          ×
        </button>

        {step === "loading" && (
          <div className="flex items-center gap-2 py-10 text-sm text-ink-muted">
            <Spinner />
            One moment…
          </div>
        )}

        {step === "offer" && offer && (
          <div className="flex flex-col gap-5">
            <p className={eyebrow}>Before you go</p>
            <div className="flex flex-col gap-2.5">
              <h2 className="text-2xl leading-tight font-extrabold text-pretty text-ink">
                Stay and get {offer.percent}% off your next {offer.months} months
              </h2>
              <p className="text-sm leading-relaxed text-pretty text-ink-muted">
                We&apos;d hate to see you leave. Keep your brand details, competitors and ad
                library connected at a lower price.
              </p>
            </div>
            <div className="flex items-baseline justify-between gap-3 border border-dashed border-ink bg-card px-5 py-4">
              <span className="text-4xl leading-none font-extrabold text-brand">
                {offer.percent}% off
              </span>
              <span className="text-sm text-ink-muted">Applied automatically</span>
            </div>
            {error && (
              <p role="alert" className="text-sm text-brand">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={acceptOffer}
                disabled={working}
                className="bg-brand px-5 py-3.5 text-base font-bold text-brand-foreground hover:bg-brand/90 disabled:opacity-60"
              >
                {working ? "Applying…" : `Claim ${offer.percent}% off and stay`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep("survey");
                }}
                disabled={working}
                className="border border-ink/40 px-5 py-3 text-base font-bold text-ink hover:border-ink"
              >
                No thanks, continue cancelling
              </button>
            </div>
          </div>
        )}

        {step === "survey" && (
          <div className="flex flex-col gap-5">
            {offer && <p className={eyebrow}>Step 2 of 2</p>}
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl leading-tight font-extrabold text-ink">
                Why are you cancelling?
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                Your answer helps us improve.
              </p>
            </div>
            <div role="radiogroup" aria-label="Reason" className="flex flex-col gap-2">
              {REASONS.map((r) => {
                const selected = reason === r.label;
                return (
                  <div key={r.label} className="flex flex-col gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        if (!selected) setDetails("");
                        setReason(r.label);
                      }}
                      className={`flex items-center gap-3 border px-4 py-3 text-left text-base text-ink ${
                        selected ? "border-ink bg-card" : "border-ink/20 hover:border-ink/50"
                      }`}
                    >
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                          selected ? "border-ink" : "border-ink/30"
                        }`}
                      >
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                      </span>
                      {r.label}
                    </button>
                    {selected && (
                      <textarea
                        autoFocus
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder={r.placeholder}
                        aria-label={r.placeholder}
                        rows={3}
                        maxLength={2000}
                        className="w-full resize-y border border-ink/20 bg-surface-2 px-3.5 py-3 text-base text-ink outline-none focus:border-ink"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs leading-relaxed text-ink-muted">
              {ownsSubscription
                ? `This cancels your ${account!.planName} subscription straight away and signs you out. `
                : account?.role === "member"
                  ? `This closes your login. ${account.name}'s plan isn't affected. `
                  : "This closes your account and signs you out. "}
              Your data is kept, so contact us if you change your mind.
            </p>
            {error && (
              <p role="alert" className="text-sm text-brand">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={cantSubmit}
                className="flex-1 bg-brand px-5 py-3.5 text-base font-bold whitespace-nowrap text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
              >
                {working ? "Deleting…" : "Delete my account"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={working}
                className="border border-ink/40 px-5 py-3 text-base font-bold whitespace-nowrap text-ink hover:border-ink"
              >
                Keep account
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
