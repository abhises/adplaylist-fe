"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Spinner from "@/components/Spinner";
import { api, ApiError, type BillingDetails } from "@/lib/api";
import { useToast } from "@/lib/ToastProvider";

// ISO 3166 country codes; names come from the browser (Intl.DisplayNames).
const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW".split(
    " "
  );

const inputClass =
  "w-full border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-ink/70";

const EMPTY: BillingDetails = {
  name: "",
  line1: "",
  line2: "",
  postalCode: "",
  city: "",
  country: "",
  vatId: "",
};

// Name, address, country and VAT ID for invoices, kept on the Stripe
// customer (so Stripe's own invoices and receipts show them too). Checkout
// asks for them as well; this is where they're added or changed later.
// New invoices use the details as they are when the invoice is issued.
export default function BillingDetailsCard() {
  const toast = useToast();
  const [saved, setSaved] = useState<BillingDetails | null | undefined>(undefined);
  const [form, setForm] = useState<BillingDetails>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countries = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      // Very old browsers: show the codes.
    }
    return COUNTRY_CODES.map((code) => ({ code, name: names?.of(code) ?? code })).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, []);
  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;

  useEffect(() => {
    api
      .getBillingDetails()
      .then(({ details }) => setSaved(details))
      .catch(() => setSaved(null));
  }, []);

  // No Stripe customer yet (no plan chosen): nothing to bill.
  if (saved === null) return null;

  function startEditing() {
    setForm(saved ?? EMPTY);
    setError(null);
    setEditing(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { details } = await api.saveBillingDetails(form);
      setSaved(details);
      setEditing(false);
      toast.success("Billing details saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your billing details.");
    } finally {
      setSaving(false);
    }
  }

  const set = (patch: Partial<BillingDetails>) => setForm((f) => ({ ...f, ...patch }));
  const complete = !!saved?.line1 && !!saved.country;

  return (
    <div className="mt-8 border-2 border-ink/15 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-ink">Billing details</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Shown on your invoices. Add your VAT ID if you&apos;re buying as a business.
          </p>
        </div>
        {saved !== undefined && !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="border border-border px-4 py-2 text-sm font-bold text-ink hover:bg-surface-2"
          >
            {complete ? "Edit" : "Add details"}
          </button>
        )}
      </div>

      {saved === undefined ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
          <Spinner />
          Loading…
        </div>
      ) : editing ? (
        <form onSubmit={handleSubmit} className="mt-5 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs text-ink/70">Name or company name</span>
            <input
              required
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              autoComplete="organization"
              className={inputClass}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs text-ink/70">Address</span>
            <input
              required
              value={form.line1}
              onChange={(e) => set({ line1: e.target.value })}
              autoComplete="address-line1"
              placeholder="Street and number"
              className={inputClass}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="sr-only">Address line 2</span>
            <input
              value={form.line2}
              onChange={(e) => set({ line2: e.target.value })}
              autoComplete="address-line2"
              placeholder="Apartment, suite, floor (optional)"
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-ink/70">Postal code</span>
            <input
              value={form.postalCode}
              onChange={(e) => set({ postalCode: e.target.value })}
              autoComplete="postal-code"
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-ink/70">City</span>
            <input
              required
              value={form.city}
              onChange={(e) => set({ city: e.target.value })}
              autoComplete="address-level2"
              className={inputClass}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-ink/70">Country</span>
            <select
              required
              value={form.country}
              onChange={(e) => set({ country: e.target.value })}
              autoComplete="country"
              className={inputClass}
            >
              <option value="">Choose…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs text-ink/70">VAT ID (optional)</span>
            <input
              value={form.vatId}
              onChange={(e) => set({ vatId: e.target.value })}
              placeholder="e.g. NL123456789B01"
              className={inputClass}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-brand sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand px-4 py-2 text-sm font-bold text-brand-foreground disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save details"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="border border-border px-4 py-2 text-sm font-bold text-ink hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : complete ? (
        <dl className="mt-4 grid max-w-2xl grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-ink-muted">Billed to</dt>
          <dd className="text-ink">{saved.name || "—"}</dd>
          <dt className="text-ink-muted">Address</dt>
          <dd className="text-ink">
            {[saved.line1, saved.line2, [saved.postalCode, saved.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ")}
          </dd>
          <dt className="text-ink-muted">Country</dt>
          <dd className="text-ink">{countryName(saved.country)}</dd>
          <dt className="text-ink-muted">VAT ID</dt>
          <dd className="text-ink">{saved.vatId || "—"}</dd>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-ink">
          No address yet. Add your address and country so your invoices are complete.
        </p>
      )}
    </div>
  );
}
