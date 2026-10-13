"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import Spinner from "@/components/Spinner";
import { Tag } from "@/components/DataTable";
import { api, type ReferralStatus, type ReferralSummary } from "@/lib/api";
import { useRequireAuth } from "@/lib/AuthProvider";
import { fmtCredits, fmtDate } from "@/lib/plans";
import { useToast } from "@/lib/ToastProvider";

// What the referrer sees for each referral. (One an admin cancelled before
// it paid out isn't sent at all.)
const STATUS: Record<ReferralStatus, { label: string; className: string }> = {
  pending: { label: "Signed up · not paid yet", className: "bg-amber-500/15 text-amber-700" },
  waiting: { label: "Subscribed · credits waiting", className: "bg-sky-500/15 text-sky-700" },
  rewarded: { label: "Rewarded", className: "bg-emerald-600/15 text-emerald-700" },
  ineligible: { label: "Not eligible", className: "bg-ink/10 text-ink-muted" },
  reversed: { label: "Reversed", className: "bg-ink/10 text-ink-muted" },
  cancelled: { label: "Cancelled", className: "bg-ink/10 text-ink-muted" },
};

// The account's referral link, what a referral earns and everyone who
// signed up through it.
export default function ReferralsPage() {
  const { user, ready } = useRequireAuth();
  const toast = useToast();
  // undefined while loading; null for staff, who have no account to refer from.
  const [referral, setReferral] = useState<ReferralSummary | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getReferrals()
      .then(({ referral }) => setReferral(referral))
      .catch(() => {
        setError("Couldn't load your referrals.");
        setReferral(null);
      });
  }, [user]);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy the link. Select it and copy it by hand.");
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-10 sm:px-10">
        <p className="text-[11px] font-medium tracking-[0.16em] text-ink-muted uppercase">
          Refer a friend
        </p>
        <h1 className="mt-2 text-[clamp(30px,4vw,44px)] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">
          {referral
            ? `Give ${fmtCredits(referral.rewards.friend)}, get ${fmtCredits(referral.rewards.referrer)}`
            : "Share Adplaylist, earn credits"}
        </h1>

        {referral === undefined ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading…
          </div>
        ) : referral === null ? (
          <p className="mt-6 text-sm text-ink-muted">
            {error ?? "Referral links are for customer accounts."}
          </p>
        ) : (
          <>
            <p className="mt-3 max-w-[640px] text-base text-ink-muted">
              Share your link. When a friend subscribes to Adplaylist through it, you get{" "}
              {fmtCredits(referral.rewards.referrer)} and they get{" "}
              {fmtCredits(referral.rewards.friend)} on top of their first month.
            </p>

            <section className="mt-8 border-2 border-ink/15 p-6">
              <h2 className="text-xl font-extrabold text-ink">Your link</h2>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  aria-label="Your referral link"
                  value={referral.link}
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-ink/70"
                />
                <button
                  type="button"
                  onClick={() => copyLink(referral.link)}
                  className="bg-brand px-5 py-2 text-sm font-bold whitespace-nowrap text-brand-foreground"
                >
                  Copy link
                </button>
              </div>
              {!referral.canEarn && (
                <p className="mt-3 text-sm text-ink-muted">
                  Bonus credits are only added to an active paid plan. Anything you earn before
                  then waits and is added with your next payment.
                </p>
              )}
            </section>

            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-ink">How it works</h2>
              <ol className="mt-4 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-3">
                {[
                  ["Share your link", "Send it to anyone who makes ads: a client, a colleague, another agency."],
                  ["They subscribe", "They sign up through your link, try Adplaylist and pay for their first month."],
                  ["You both get credits", "The bonus lands in both balances as soon as that first payment goes through."],
                ].map(([title, body], i) => (
                  <li key={title} className="bg-surface p-5">
                    <span className="flex h-7 w-7 items-center justify-center bg-brand text-sm font-extrabold text-brand-foreground">
                      {i + 1}
                    </span>
                    <p className="mt-3 text-sm font-bold text-ink">{title}</p>
                    <p className="mt-1 text-sm text-ink-muted">{body}</p>
                  </li>
                ))}
              </ol>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                <li>
                  You get {fmtCredits(referral.rewards.referrer)} when your friend pays for Pro or
                  Agency, and {fmtCredits(referral.rewards.referrerStarter)} when they pay for
                  Starter.
                </li>
                <li>Signing up or starting a free trial doesn&apos;t count: the first payment does.</li>
                <li>
                  Bonus credits are added to your balance straight away and, like all credits,
                  reset at your next refill.
                </li>
                <li>
                  Up to {referral.yearlyCap} rewarded referrals a year. Referring yourself
                  doesn&apos;t count, and a reward is taken back if that payment is refunded.
                </li>
              </ul>
            </section>

            <section className="mt-10 border-2 border-ink/15 p-6">
              <h2 className="text-xl font-extrabold text-ink">Your referrals</h2>
              <dl className="mt-5 grid grid-cols-3 gap-px border border-ink/15 bg-ink/15">
                {(
                  [
                    ["Signed up", referral.totals.signedUp],
                    ["Rewarded", referral.totals.rewarded],
                    ["Credits earned", referral.totals.credits],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="bg-surface p-4">
                    <dt className="text-xs text-ink-muted">{label}</dt>
                    <dd className="mt-1 text-2xl font-extrabold text-ink tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>

              {referral.referrals.length === 0 ? (
                <p className="mt-5 text-sm text-ink-muted">
                  Nobody has signed up with your link yet.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="text-xs text-ink-muted">
                      <tr className="border-b border-ink/15">
                        <th className="py-2 pr-4 font-medium">Friend</th>
                        <th className="py-2 pr-4 font-medium">Signed up</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 text-right font-medium">Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referral.referrals.map((r) => (
                        <tr key={r.id} className="border-b border-ink/10">
                          <td className="py-2.5 pr-4 font-bold text-ink">{r.name}</td>
                          <td className="py-2.5 pr-4 whitespace-nowrap text-ink-muted">
                            {fmtDate(r.createdAt)}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Tag className={STATUS[r.status].className}>{STATUS[r.status].label}</Tag>
                          </td>
                          <td className="py-2.5 text-right font-bold text-ink tabular-nums">
                            {r.credits ? `+${r.credits}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
