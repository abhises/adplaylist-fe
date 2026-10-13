"use client";

import { useEffect, useState, type FormEvent } from "react";
import AppHeader from "@/components/AppHeader";
import Spinner from "@/components/Spinner";
import { dangerButton, editButton } from "@/components/DataTable";
import { api, ApiError, type PromoCode, type PromoCodeInput } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";
import { fmtDate, fmtUsd } from "@/lib/plans";
import { useToast } from "@/lib/ToastProvider";

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";
const th = "py-2 pr-4 text-left text-xs font-medium tracking-[0.08em] text-ink-muted uppercase";
const td = "py-3 pr-4 align-top text-sm";

type Duration = PromoCodeInput["duration"];

// "10% off the first 3 months".
function describe(p: Pick<PromoCode, "percentOff" | "amountOff" | "duration" | "months">) {
  const off =
    p.percentOff !== null ? `${p.percentOff}% off` : p.amountOff !== null ? `${fmtUsd(p.amountOff)} off` : "Discount";
  if (p.duration === "once") return `${off} the first payment`;
  if (p.duration === "repeating") {
    return `${off} the first ${p.months === 1 ? "month" : `${p.months} months`}`;
  }
  return p.duration === "forever" ? `${off} every payment` : off;
}

// Why a code can't be used right now, or null if it can.
function stopped(p: PromoCode) {
  if (!p.active) {
    if (p.maxRedemptions !== null && p.timesRedeemed >= p.maxRedemptions) return "Used up";
    if (p.expiresAt && new Date(p.expiresAt) <= new Date()) return "Expired";
    return "Off";
  }
  return null;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-[5px] block text-xs text-ink/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

// Discount codes customers type into "Add promotion code" on the Stripe
// payment page when they subscribe. They live in Stripe; this page makes
// them, lists them and switches them off.
export default function AdminPromoCodesPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const toast = useToast();
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("10");
  const [duration, setDuration] = useState<Duration>("repeating");
  const [months, setMonths] = useState("3");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getPromoCodes()
      .then(({ promoCodes }) => setCodes(promoCodes))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Couldn't load promo codes.");
        setCodes([]);
      });
  }, [user]);

  const percent = Number(percentOff);
  const monthCount = Number(months);
  const uses = maxRedemptions.trim() === "" ? null : Number(maxRedemptions);
  const preview = describe({
    percentOff: Number.isFinite(percent) ? percent : 0,
    amountOff: null,
    duration,
    months: monthCount,
  });

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(code.trim())) {
      setError("The code can only have letters, numbers, - and _ (3 to 40 characters).");
      return;
    }
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      setError("The discount must be a whole number from 1 to 100.");
      return;
    }
    if (duration === "repeating" && (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 36)) {
      setError("The number of months must be from 1 to 36.");
      return;
    }
    if (uses !== null && (!Number.isInteger(uses) || uses < 1)) {
      setError("The number of uses must be a whole number, or empty for no limit.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { promoCode } = await api.createPromoCode({
        code: code.trim().toUpperCase(),
        percentOff: percent,
        duration,
        ...(duration === "repeating" ? { months: monthCount } : {}),
        maxRedemptions: uses,
        expiresOn: expiresOn || null,
        firstTimeOnly,
      });
      setCodes((list) => [promoCode, ...(list ?? [])]);
      setCode("");
      toast.success(`${promoCode.code} is ready to use.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the code.");
    } finally {
      setSaving(false);
    }
  }

  async function setActive(p: PromoCode, active: boolean) {
    setBusyId(p.id);
    try {
      const { promoCode } = await api.setPromoCodeActive(p.id, active);
      setCodes((list) => (list ?? []).map((c) => (c.id === promoCode.id ? promoCode : c)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't change the code.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready || !user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold text-ink">Promo codes</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          Discount codes customers type into &ldquo;Add promotion code&rdquo; on the payment page
          when they subscribe. The discount starts with their first real payment, after the free
          trial. On a yearly plan, a discount for a number of months comes off the whole first
          yearly payment.
        </p>

        <form onSubmit={handleCreate} className="mt-6 max-w-4xl border-2 border-ink/15 p-6">
          <h2 className="text-xl font-extrabold text-ink">New code</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Code" hint="What customers type. Capitals don't matter.">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PLAYLIST10"
                required
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Discount (%)">
              <input
                inputMode="numeric"
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Applies to">
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as Duration)}
                className={inputClass}
              >
                <option value="repeating">The first months</option>
                <option value="once">The first payment only</option>
                <option value="forever">Every payment</option>
              </select>
            </Field>
            {duration === "repeating" && (
              <Field label="Months">
                <input
                  inputMode="numeric"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  required
                  className={inputClass}
                />
              </Field>
            )}
            <Field label="Total uses" hint="Empty for no limit.">
              <input
                inputMode="numeric"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="No limit"
                className={inputClass}
              />
            </Field>
            <Field label="Last day to use it" hint="Empty for no end date.">
              <input
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={firstTimeOnly}
              onChange={(e) => setFirstTimeOnly(e.target.checked)}
              className="h-[15px] w-[15px] accent-brand"
            />
            New customers only
            <span className="text-xs text-ink-muted">— not for anyone who has paid before</span>
          </label>

          {error && (
            <p className="mt-4 text-sm text-brand" role="alert">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand px-5 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create code"}
            </button>
            <span className="text-sm text-ink-muted">
              {code.trim() ? <span className="font-mono text-ink">{code.trim()}</span> : "The code"}{" "}
              gives {preview.charAt(0).toLowerCase() + preview.slice(1)}. The discount can&apos;t be
              changed afterwards, only switched off.
            </span>
          </div>
        </form>

        <h2 className="mt-10 text-xl font-extrabold text-ink">All codes</h2>
        {codes === null ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
            <Spinner />
            Loading…
          </div>
        ) : (
          <>
            {loadError && <p className="mt-4 text-sm text-brand">{loadError}</p>}
            {codes.length === 0 ? (
              !loadError && <p className="mt-4 text-sm text-ink-muted">No promo codes yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] border-t border-ink/15">
                  <thead>
                    <tr className="border-b border-ink/15">
                      <th className={th}>Code</th>
                      <th className={th}>Discount</th>
                      <th className={th}>Used</th>
                      <th className={th}>Ends</th>
                      <th className={th}>Status</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((p) => {
                      const why = stopped(p);
                      return (
                        <tr key={p.id} className="border-b border-ink/10">
                          <td className={td}>
                            <p className="font-mono font-bold text-ink">{p.code}</p>
                            <p className="text-xs text-ink-muted">Made {fmtDate(p.createdAt)}</p>
                          </td>
                          <td className={`${td} text-ink`}>
                            {describe(p)}
                            {p.firstTimeOnly && (
                              <p className="text-xs text-ink-muted">New customers only</p>
                            )}
                          </td>
                          <td className={`${td} whitespace-nowrap text-ink tabular-nums`}>
                            {p.timesRedeemed}
                            {p.maxRedemptions !== null && ` of ${p.maxRedemptions}`}
                          </td>
                          <td className={`${td} whitespace-nowrap text-ink`}>
                            {p.expiresAt ? fmtDate(p.expiresAt) : "—"}
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            {why ? (
                              <span className="bg-ink/10 px-2 py-0.5 text-xs font-bold text-ink-muted">
                                {why}
                              </span>
                            ) : (
                              <span className="bg-emerald-600/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                Active
                              </span>
                            )}
                          </td>
                          <td className={`${td} text-right`}>
                            {p.active ? (
                              <button
                                type="button"
                                disabled={busyId === p.id}
                                onClick={() => setActive(p, false)}
                                className={dangerButton}
                              >
                                Turn off
                              </button>
                            ) : (
                              why === "Off" && (
                                <button
                                  type="button"
                                  disabled={busyId === p.id}
                                  onClick={() => setActive(p, true)}
                                  className={editButton}
                                >
                                  Turn on
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
