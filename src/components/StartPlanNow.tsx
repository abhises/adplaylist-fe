"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/AuthProvider";
import { api, ApiError, type Account } from "@/lib/api";
import { fmtDate, fmtUsd, periodPrice } from "@/lib/plans";

// Ends the free trial early: charges the card today and grants the plan's
// full credits. For a trial that's used its credits and wants to continue.
// Only the owner can, and only on a trial with a card on file.
export function canStartPlanNow(account: Account | null | undefined): boolean {
  return !!account && account.status === "trial" && account.hasSubscription && account.role === "owner";
}

export default function StartPlanNow({
  account,
  className = "bg-brand px-4 py-2 text-sm font-bold text-brand-foreground",
  onDone,
}: {
  account: Account;
  className?: string;
  onDone?: () => void;
}) {
  const { refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stripe's own figure for the charge, which also covers anyone still on
  // an older price; the price list is only a fallback.
  const [quoted, setQuoted] = useState<number | null>(null);
  const price = fmtUsd(quoted ?? periodPrice(account));

  function openDialog() {
    setOpen(true);
    api
      .getPayments()
      .then(({ upcoming }) => setQuoted(upcoming ? upcoming.amount : null))
      .catch(() => {});
  }
  const cycle = account.billingCycle === "yearly" ? "year" : "month";

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api.startPlanNow();
      await refresh();
      setOpen(false);
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={openDialog} className={className}>
        Start paid plan now
      </button>
      <ConfirmDialog
        open={open}
        title={`Start ${account.planName} now?`}
        message={
          <>
            <p>
              Your free trial ends today and your card is charged{" "}
              <span className="font-bold text-ink">{price}</span> (excl. tax) for your first{" "}
              {cycle}. You get{" "}
              <span className="font-bold text-ink">{account.creditVolume} credits</span> straight
              away, replacing your remaining trial credits.
            </p>
            <p className="mt-2">
              Otherwise you won&apos;t be charged until your trial ends on{" "}
              {fmtDate(account.trialEndsAt)}.
            </p>
            {error && <p className="mt-2 text-brand">{error}</p>}
          </>
        }
        confirmLabel={busy ? "Charging…" : `Pay ${price} now`}
        cancelLabel="Keep my trial"
        loading={busy}
        onConfirm={confirm}
        onCancel={() => {
          setOpen(false);
          setError(null);
        }}
      />
    </>
  );
}
