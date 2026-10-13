import Link from "@/components/Link";

export type AddAdMode = "manual" | "csv" | "bulk";

const TABS: { mode: AddAdMode; label: string; href: string }[] = [
  { mode: "manual", label: "Manual", href: "/add-ad" },
  { mode: "csv", label: "CSV", href: "/add-ad?mode=csv" },
  { mode: "bulk", label: "Bulk", href: "/add-ad/bulk" },
];

// The three ways to add ads: fill every field in by hand, upload one ad's
// CSV, or bulk add several CSVs at once.
export default function AddAdTabs({ active }: { active: AddAdMode }) {
  return (
    <nav aria-label="How to add ads" className="mt-6 flex gap-6 border-b border-ink/15">
      {TABS.map((tab) => (
        <Link
          key={tab.mode}
          href={tab.href}
          aria-current={tab.mode === active ? "page" : undefined}
          className={`-mb-px border-b-2 pb-2.5 text-sm ${
            tab.mode === active
              ? "border-brand font-bold text-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
