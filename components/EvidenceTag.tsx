import type { EvidenceStrength } from "@/lib/types";

/**
 * Distinguishes survey/attitude data from hard statistics — a Phase E
 * requirement (Step 1 ruling): the two evidence types must not look
 * identical on the page. Deliberately typographic, not colored — a plain
 * muted-text label, not another amber badge. Amber already means "data
 * caveat" on this site (Sample Data, MaturityTag); survey evidence isn't a
 * caveat, it's a different kind of evidence, so it gets its own quiet
 * visual language instead of borrowing that one. Hard statistics are the
 * unmarked default and render nothing here, same "quiet by default" pattern
 * as MaturityTag's Established tier.
 */
export default function EvidenceTag({ strength }: { strength: EvidenceStrength | undefined }) {
  if (strength !== "survey") return null;

  return (
    <span
      className="rounded border border-[var(--gridline)] px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--text-muted)]"
      title="Self-reported survey data, not a directly measured hard statistic — see this gauge's provenance for detail."
    >
      Survey-based
    </span>
  );
}
