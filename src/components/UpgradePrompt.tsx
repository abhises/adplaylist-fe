"use client";

import Link from "@/components/Link";
import Modal from "@/components/Modal";
import StartPlanNow, { canStartPlanNow } from "@/components/StartPlanNow";
import { useAuth } from "@/lib/AuthProvider";
import { fmtDate } from "@/lib/plans";

export type UpgradeReason = "save" | "editableCopies" | "requests" | "outOfCredits";

const WHAT: Record<Exclude<UpgradeReason, "outOfCredits">, string> = {
  save: "Saving creatives",
  editableCopies: "Editable copies",
  requests: "Requesting custom ads",
};

// Shown when someone clicks an action their plan doesn't include. Locked
// actions stay visible and open this instead of silently doing nothing.
export default function UpgradePrompt({
  reason,
  onClose,
}: {
  reason: UpgradeReason | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const account = user?.account;
  if (!reason || !account) return null;

  const owner = account.role === "owner";
  let title: string;
  let body: string;
  let cta: string | null = owner ? "See plans" : null;

  // Trial credits used up: the way forward is starting the paid plan now.
  if (reason === "outOfCredits" && account.status === "trial") {
    const startable = canStartPlanNow(account);
    return (
      <Modal open onClose={onClose}>
        <h2 className="text-lg font-extrabold text-ink">You&apos;ve used your trial credits</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {startable
            ? `Start your ${account.planName} plan now to get ${account.creditsPerMonth} credits straight away. Otherwise you won't be charged until your trial ends on ${fmtDate(account.trialEndsAt)}.`
            : account.role === "owner"
              ? "Add a card on the billing page to start your plan and get your monthly credits."
              : "Ask your account owner to start the paid plan to get more credits."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="border border-border px-4 py-2 text-sm font-bold text-ink">
            Not now
          </button>
          {startable ? (
            <StartPlanNow account={account} onDone={onClose} />
          ) : (
            account.role === "owner" && (
              <Link href="/billing" className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground">
                Go to billing
              </Link>
            )
          )}
        </div>
      </Modal>
    );
  }

  if (reason === "outOfCredits") {
    title = "You're out of credits";
    // Pro can upgrade for more; Agency's top tier waits for the refill.
    if (account.plan === "agency" && account.creditVolume === 150) {
      body = `Your credits refill on ${fmtDate(account.nextRefillAt)}.`;
      cta = null;
    } else {
      body = `Your credits refill on ${fmtDate(account.nextRefillAt)}, or upgrade for more credits now.`;
    }
  } else if (account.status === "expired") {
    title = "Your plan has expired";
    body = `${WHAT[reason]} needs an active plan. You can still browse the library.`;
    cta = owner ? "Subscribe" : null;
  } else {
    title = "Upgrade to unlock this";
    body = `${WHAT[reason]} is included on Pro and Agency. Starter is library-only.`;
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
      {!owner && (
        <p className="mt-2 text-sm text-ink-muted">Ask your account owner to change the plan.</p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onClose} className="border border-border px-4 py-2 text-sm font-bold text-ink">
          Not now
        </button>
        {cta && (
          <Link
            href="/billing"
            className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
          >
            {cta}
          </Link>
        )}
      </div>
    </Modal>
  );
}
