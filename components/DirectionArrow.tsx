import type { Direction } from "@/lib/types";

const CONFIG: Record<Direction, { arrow: string; label: string; color: string }> = {
  improving: { arrow: "↑", label: "Improving", color: "var(--status-good)" },
  flat: { arrow: "→", label: "Flat", color: "var(--text-muted)" },
  deteriorating: { arrow: "↓", label: "Deteriorating", color: "var(--status-critical)" },
};

export default function DirectionArrow({ direction }: { direction: Direction | null }) {
  if (!direction) {
    return <span className="text-sm text-[var(--text-muted)]">No trend data</span>;
  }
  const { arrow, label, color } = CONFIG[direction];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
      <span aria-hidden="true">{arrow}</span>
      <span>{label}</span>
    </span>
  );
}
