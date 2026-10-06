// The look shared by the admin and request tables: a white card, a soft
// header row, roomy rows, summary tiles that filter, avatars and tags.

// The card around a table; it scrolls sideways on narrow screens.
export const tableCard = "overflow-x-auto border border-ink/15 bg-card";
export const headRow = "bg-surface-2/60";
export const th =
  "border-b border-ink/15 px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.08em] whitespace-nowrap text-ink-muted uppercase";
export const td = "border-b border-ink/10 px-4 py-3";
export const row = "transition-colors hover:bg-surface-2/50";
export const snCell = `${td} w-14 font-mono text-xs text-ink-muted tabular-nums`;
export const editButton =
  "border border-ink/20 px-3 py-1 text-xs font-semibold text-ink hover:border-ink/60";
export const dangerButton =
  "border border-brand/40 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-brand-foreground";
export const primaryButton =
  "border border-brand bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground hover:opacity-90";

// Request statuses as coloured tags.
export const REQUEST_STATUS_STYLE: Record<string, string> = {
  Open: "bg-amber-500/15 text-amber-700",
  "Awaiting brief": "bg-amber-500/15 text-amber-700",
  "In design": "bg-sky-500/15 text-sky-700",
  "In review": "bg-sky-500/15 text-sky-700",
  Delivered: "bg-emerald-600/15 text-emerald-700",
  Declined: "bg-brand/10 text-brand",
};

export function Tag({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

export function StatusTag({ status }: { status: string }) {
  return <Tag className={REQUEST_STATUS_STYLE[status] ?? "bg-ink/10 text-ink-muted"}>{status}</Tag>;
}

// Initials on a colour picked from the name, so each person keeps theirs.
export function Avatar({ name, size = "h-9 w-9" }: { name: string; size?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?";
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full text-xs font-bold ${size}`}
      style={{ background: `hsl(${hash} 55% 88%)`, color: `hsl(${hash} 45% 28%)` }}
    >
      {initials}
    </span>
  );
}

// Filters shown as summary tiles with their counts; the selected one is
// underlined in the brand colour.
export function FilterTiles<K extends string>({
  items,
  active,
  onSelect,
  className = "grid-cols-2 md:grid-cols-4",
}: {
  items: { key: K; label: string; count: number }[];
  active: K;
  onSelect: (key: K) => void;
  className?: string;
}) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-pressed={selected}
            className={`border bg-card px-4 py-3 text-left transition-colors ${
              selected
                ? "border-brand shadow-[inset_0_-3px_0_var(--color-brand)]"
                : "border-ink/15 hover:border-ink/40"
            }`}
          >
            <span className="block text-[11px] font-medium tracking-[0.08em] text-ink-muted uppercase">
              {item.label}
            </span>
            <span className={`mt-1 block text-2xl font-extrabold ${selected ? "text-brand" : "text-ink"}`}>
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-ink/20 p-8 text-center text-sm text-ink-muted">{children}</p>
  );
}
