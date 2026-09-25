import { TAG_OPTIONS } from "@/lib/ads";

// Toggleable chips for the tag list. Tags an ad already has that aren't in
// the list (e.g. from an older CSV) are still shown so they can be removed.
export default function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const options = [...TAG_OPTIONS, ...value.filter((t) => !TAG_OPTIONS.includes(t))];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((tag) => {
        const selected = value.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              onChange(selected ? value.filter((t) => t !== tag) : [...value, tag])
            }
            className={`border px-2 py-0.5 text-xs ${
              selected
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-ink"
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
