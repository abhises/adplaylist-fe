// The "Live ads" label on an ad copied from a real, running ad: on library
// cards over the creative, and in the ad page's banner.
export default function LiveBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={`pointer-events-none inline-flex items-center bg-white font-extrabold tracking-[0.18em] text-black uppercase shadow-sm ${
        size === "md" ? "gap-2 px-3 py-1.5 text-xs" : "gap-1.5 px-2 py-1 text-[10px]"
      }`}
    >
      <span aria-hidden="true" className={`bg-brand ${size === "md" ? "h-2.5 w-2.5" : "h-2 w-2"}`} />
      Live ads
    </span>
  );
}
