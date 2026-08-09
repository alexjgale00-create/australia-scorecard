import type { Direction } from "@/lib/types";

const CONFIG: Record<Direction, { arrow: string; label: string; color: string }> = {
  improving: { arrow: "↑", label: "Improving", color: "var(--status-good)" },
  flat: { arrow: "→", label: "Flat", color: "var(--text-muted)" },
  deteriorating: { arrow: "↓", label: "Deteriorating", color: "var(--status-critical)" },
  // Deliberately not "→ Flat" (a real, computed trend that happens to be
  // small) and not the italic "No trend data" (no comparable data exists at
  // all) — real data exists here, there's just too little of it, too
  // irregularly spaced, to trust a computed trend. "?" keeps it visually
  // distinct from both neighbours at a glance, not just in the tooltip.
  "insufficient-history": { arrow: "?", label: "Insufficient history", color: "var(--status-warning)" },
};

export default function DirectionArrow({ direction }: { direction: Direction | null }) {
  if (!direction) {
    return <span className="text-sm italic text-[var(--text-muted)]">No trend data</span>;
  }
  const { arrow, label, color } = CONFIG[direction];
  const title =
    direction === "insufficient-history"
      ? "Real data exists, but too few waves spaced too irregularly to trust a computed trend — see Data status."
      : undefined;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color }} title={title}>
      <span aria-hidden="true">{arrow}</span>
      <span>{label}</span>
    </span>
  );
}
