"use client";

import Link from "@/components/Link";
import { useAuth } from "@/lib/AuthProvider";
import { daysUntil, fmtDate } from "@/lib/plans";

// The account-status strip under the app header: trial days left, a failed
// payment, a cancellation date, or an expired plan. Nothing when active.
export default function AccountBanner() {
  const { user } = useAuth();
  const account = user?.account;
  if (!account || account.status === "active") return null;

  const owner = account.role === "owner";
  let text: string;
  let action: string | null;
  switch (account.status) {
    case "trial": {
      const days = daysUntil(account.trialEndsAt);
      const left = `${days} ${days === 1 ? "day" : "days"} left in your ${account.planName} trial.`;
      if (account.needsCard) {
        // The trial hasn't started: owners are on the billing page's start
        // step already, so only members need telling.
        if (owner) return null;
        text = "Your free trial starts once the account owner adds a card.";
        action = null;
      } else if (account.credits === 0 && account.creditVolume > 0) {
        text = `${left} You've used your trial credits.`;
        action = "Start plan now";
      } else {
        text = `${left} You'll be charged only when it ends on ${fmtDate(account.trialEndsAt)}.`;
        action = null;
      }
      break;
    }
    case "past_due":
      text = `Your last payment failed. Update your payment details by ${fmtDate(account.graceEndsAt)} to keep access.`;
      action = "Update payment";
      break;
    case "cancelled":
      text = account.cancelledInTrial
        ? `Trial cancelled — you won't be charged. Access ends ${fmtDate(account.currentPeriodEnd)}.`
        : `Your plan ends on ${fmtDate(account.currentPeriodEnd)}. You won't be charged again.`;
      action = "Resubscribe";
      break;
    case "expired":
      text = "Your plan has expired. You can still browse the library.";
      action = "Subscribe";
      break;
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center text-sm ${
        account.status === "trial" ? "bg-ink/5 text-ink" : "bg-brand text-brand-foreground"
      }`}
    >
      <span>{text}</span>
      {action &&
        (owner ? (
          <Link href="/billing" className="font-bold underline underline-offset-2">
            {action}
          </Link>
        ) : (
          <span className="opacity-80">Ask your account owner to {action.toLowerCase()}.</span>
        ))}
    </div>
  );
}
