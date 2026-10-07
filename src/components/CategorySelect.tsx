import { CATEGORY_GROUPS, CATEGORY_OPTIONS } from "@/lib/categories";

// The category picker for the ad forms, grouped like the library's
// "Browse all categories". A value outside the list (an ad saved before the
// current taxonomy) stays selectable so editing doesn't silently change it.
export default function CategorySelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const unknown = value && !CATEGORY_OPTIONS.includes(value);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {unknown && <option value={value}>{value} (old category)</option>}
      {CATEGORY_GROUPS.map((g) => (
        <optgroup key={g.name} label={g.name}>
          {g.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
