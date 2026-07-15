import { MATURITY_TIER_LABELS, type MaturityTier } from "@/lib/maturity";

/**
 * Quiet by design: Established is the default, unmarked state everywhere
 * on the site — this renders nothing for it. Every other tier gets the
 * same muted amber treatment as the existing Sample Data badge, since both
 * mean "a data caveat applies here" — not a 4-color traffic light.
 */
export default function MaturityTag({ tier, reason }: { tier: MaturityTier; reason: string | null }) {
  if (tier === "established") return null;

  return (
    <span
      className="rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium leading-none"
      style={{ borderColor: "var(--status-warning)", color: "var(--status-warning)" }}
      title={reason ?? `See the Data status page for what would promote this gauge to Established.`}
    >
      {MATURITY_TIER_LABELS[tier]}
    </span>
  );
}
