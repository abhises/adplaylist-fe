// The "Premium" pill on an ad whose Canva copy took extra work, shown over
// the top-left of the creative.
export default function PremiumBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-black/85 font-extrabold tracking-[0.12em] text-white uppercase shadow-sm ${
        size === "md" ? "px-3.5 py-1.5 text-xs" : "px-2.5 py-1 text-[10px]"
      }`}
    >
      <svg viewBox="0 0 10 10" aria-hidden="true" className={size === "md" ? "h-2.5 w-2.5" : "h-2 w-2"}>
        <path d="M5 0 10 5 5 10 0 5Z" fill="#f5a623" />
      </svg>
      Premium
    </span>
  );
}
