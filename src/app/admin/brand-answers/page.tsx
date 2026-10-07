"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import AppHeader from "@/components/AppHeader";
import { api, type AdminOnboardingAnswers } from "@/lib/api";
import { useRequireRole } from "@/lib/AuthProvider";

type Filter = "finished" | "unfinished" | "all";

const STEPS = 4;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Typed by the client, so only link out to what's clearly a web address.
function externalHref(value: string) {
  const v = value.trim();
  if (!v || /\s/.test(v)) return null;
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    return new URL(url).hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

// Which of the questionnaire's four steps have an answer.
function stepsAnswered(a: AdminOnboardingAnswers) {
  return [
    !!(a.niche && a.product),
    !!a.brand,
    !!a.libraryUrl,
    a.competitors.length > 0,
  ];
}

function matches(a: AdminOnboardingAnswers, q: string) {
  if (!q) return true;
  return [
    a.user.fullName,
    a.user.email,
    a.niche,
    a.product,
    a.brand,
    a.website,
    ...a.competitors,
  ].some((v) => v.toLowerCase().includes(q));
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M6 3H3v10h10v-3M9 3h4v4M13 3 7 9" />
    </svg>
  );
}

function LinkChip({ label, value }: { label: string; value: string }) {
  const href = externalHref(value);
  const body = (
    <>
      <span className="shrink-0 text-[11px] font-medium tracking-[1px] text-ink-muted uppercase">
        {label}
      </span>
      <span className="truncate">{value}</span>
      {href && <ExternalIcon />}
    </>
  );
  const cls =
    "flex min-w-0 items-center gap-2 border border-ink/15 bg-surface px-3 py-2 text-sm text-ink";
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer nofollow"
      title={value}
      className={`${cls} transition-colors hover:border-brand hover:text-brand`}
    >
      {body}
    </a>
  ) : (
    <span className={cls} title={value}>
      {body}
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="text-[11px] font-medium tracking-[1.5px] text-ink-muted uppercase">
        {label}
      </p>
      <p
        className={`mt-1 text-3xl font-extrabold tabular-nums ${accent ? "text-brand" : "text-ink"}`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

function StatusBadge({ a }: { a: AdminOnboardingAnswers }) {
  if (a.completedAt)
    return (
      <span className="bg-ink px-2 py-0.5 text-[11px] font-bold tracking-[1px] text-surface uppercase">
        Finished
      </span>
    );
  if (a.skippedAt)
    return (
      <span className="border border-brand px-2 py-0.5 text-[11px] font-bold tracking-[1px] text-brand uppercase">
        Skipped
      </span>
    );
  return (
    <span className="border border-ink/30 px-2 py-0.5 text-[11px] font-bold tracking-[1px] text-ink-muted uppercase">
      In progress
    </span>
  );
}

function AnswerCard({ a }: { a: AdminOnboardingAnswers }) {
  const steps = stepsAnswered(a);
  const answered = steps.filter(Boolean).length;
  const when = a.completedAt ?? a.skippedAt ?? a.updatedAt;
  const whenLabel = a.completedAt ? "Finished" : a.skippedAt ? "Skipped" : "Updated";

  return (
    <li className="flex flex-col border border-ink/15 bg-card transition-shadow hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-start gap-3 border-b border-ink/10 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-surface">
          {initials(a.user.fullName) || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-ink">{a.user.fullName}</p>
          <a
            href={`mailto:${a.user.email}`}
            className="block truncate text-xs text-ink-muted hover:text-brand"
          >
            {a.user.email}
          </a>
        </div>
        <StatusBadge a={a} />
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-5">
        <div>
          <p className="text-2xl font-extrabold tracking-[-0.5px] break-words text-ink">
            {a.brand || <span className="text-ink-muted">No brand yet</span>}
          </p>
          {a.niche && (
            <span className="mt-2 inline-block bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
              {a.niche}
            </span>
          )}
        </div>

        {a.product && (
          <div className="border-l-2 border-brand pl-3">
            <p className="text-[11px] font-medium tracking-[1px] text-ink-muted uppercase">
              Sells
            </p>
            <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap text-ink">
              {a.product}
            </p>
          </div>
        )}

        {(a.website || a.libraryUrl) && (
          <div className="grid gap-2">
            {a.website && <LinkChip label="Web" value={a.website} />}
            {a.libraryUrl && (
              <LinkChip
                label={a.libraryType === "google" ? "Google" : "Meta"}
                value={a.libraryUrl}
              />
            )}
          </div>
        )}

        <div>
          <p className="text-[11px] font-medium tracking-[1px] text-ink-muted uppercase">
            Competitors
          </p>
          {a.competitors.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {a.competitors.map((c) => (
                <span
                  key={c}
                  className="bg-surface-2 px-2.5 py-1 text-xs text-ink"
                >
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">None given</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-ink/10 px-5 py-3 text-xs text-ink-muted">
        <span
          className="flex gap-1"
          title={`${answered} of ${STEPS} questions answered`}
          aria-label={`${answered} of ${STEPS} questions answered`}
        >
          {steps.map((done, i) => (
            <span
              key={i}
              className={`h-1.5 w-5 ${done ? "bg-brand" : "bg-ink/15"}`}
            />
          ))}
        </span>
        <span>
          {answered}/{STEPS}
        </span>
        <span className="ml-auto" title={formatDate(when)}>
          {whenLabel} {timeAgo(when)}
        </span>
      </div>
    </li>
  );
}

export default function AdminBrandAnswersPage() {
  const { user, ready } = useRequireRole(["admin"]);
  const [answers, setAnswers] = useState<AdminOnboardingAnswers[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() =>
      api
        .getAllOnboarding()
        .then((res) => setAnswers(res.answers))
        .catch(() => setError("Couldn't load the answers."))
    );
  }, [user]);

  // The niches named most often, so trends show at a glance.
  const topNiches = useMemo(() => {
    const counts = new Map<string, { label: string; n: number }>();
    for (const a of answers ?? []) {
      const key = a.niche.trim().toLowerCase();
      if (!key) continue;
      const entry = counts.get(key) ?? { label: a.niche.trim(), n: 0 };
      entry.n++;
      counts.set(key, entry);
    }
    return [...counts.values()].sort((x, y) => y.n - x.n).slice(0, 6);
  }, [answers]);

  if (!ready || !user) return null;

  const all = answers ?? [];
  const finished = all.filter((a) => a.completedAt);
  const unfinished = all.filter((a) => !a.completedAt);
  const skipped = unfinished.filter((a) => a.skippedAt);
  const rate = all.length ? Math.round((finished.length / all.length) * 100) : 0;

  const q = query.trim().toLowerCase();
  const shown = (
    filter === "finished" ? finished : filter === "unfinished" ? unfinished : all
  ).filter((a) => matches(a, q));

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: all.length },
    { value: "finished", label: "Finished", count: finished.length },
    { value: "unfinished", label: "Not finished", count: unfinished.length },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[1px] text-ink-muted uppercase">
              Admin
            </p>
            <h1 className="text-3xl font-extrabold text-ink">Brand answers</h1>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">
              What clients told us in the &ldquo;Tell us about your brand&rdquo;
              questionnaire, from the library popup or their profile.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-px border border-ink/15 bg-ink/15 lg:grid-cols-4">
          <Stat label="Responses" value={answers ? all.length : "–"} />
          <Stat
            label="Finished"
            value={answers ? finished.length : "–"}
            accent
          />
          <Stat
            label="Not finished"
            value={answers ? unfinished.length : "–"}
            hint={answers ? `${skipped.length} skipped` : undefined}
          />
          <Stat
            label="Completion rate"
            value={answers ? `${rate}%` : "–"}
            hint="of everyone who started"
          />
        </div>

        {topNiches.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-medium tracking-[1px] text-ink-muted uppercase">
              Top niches
            </span>
            {topNiches.map((n) => (
              <button
                key={n.label}
                type="button"
                onClick={() => setQuery(n.label)}
                className="flex items-center gap-1.5 border border-ink/15 bg-card px-2.5 py-1 text-xs text-ink transition-colors hover:border-brand hover:text-brand"
              >
                {n.label}
                <span className="text-ink-muted">{n.n}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex self-start border border-ink" role="tablist">
            {tabs.map((tab) => {
              const on = filter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilter(tab.value)}
                  className={`px-4 py-2 text-sm transition-colors ${
                    on ? "bg-ink text-surface" : "bg-card text-ink hover:bg-surface-2"
                  }`}
                >
                  {tab.label}
                  <span className={`ml-1.5 text-xs ${on ? "text-surface/70" : "text-ink-muted"}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-80">
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, brand, niche, competitor…"
              aria-label="Search answers"
              className="w-full border border-border bg-card py-2 pr-3 pl-9 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink/70"
            />
          </div>
        </div>

        {error && (
          <p className="mt-6 text-sm text-brand" role="alert">
            {error}
          </p>
        )}

        {answers === null && !error ? (
          <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-80 animate-pulse border border-ink/10 bg-surface-2"
              />
            ))}
          </ul>
        ) : shown.length === 0 && !error ? (
          <div className="mt-6 flex flex-col items-center border border-dashed border-ink/20 px-6 py-16 text-center">
            <p className="text-lg font-bold text-ink">
              {q ? "No matches" : "No answers here yet"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              {q
                ? `Nothing matches “${query.trim()}”.`
                : "Clients see the questionnaire a few seconds after they open the library. Their answers will show up here."}
            </p>
            {q && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-4 text-sm font-medium text-brand hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {shown.map((a) => (
              <AnswerCard key={a.id} a={a} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
