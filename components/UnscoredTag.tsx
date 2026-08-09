/**
 * Marks a gauge that appears on the site with real data but deliberately
 * isn't scored or counted in any composite — see `unscoredDimensions` in
 * lib/types.ts. Distinct from every other tag on this site on purpose:
 * not amber (that means "data caveat" via the Sample Data badge and
 * MaturityTag — this isn't a caveat, it's a structural, permanent
 * decision, not something a future refresh could fix) and not the same
 * quiet gray as EvidenceTag (that's a passive evidence-type label; this is
 * an active "there is no number here" signal that needs to read as
 * distinct from both "awaiting data" — nothing is pending — and a normal
 * scored gauge that just happens to show "—").
 */
export default function UnscoredTag() {
  return (
    <span
      className="rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium leading-none"
      style={{ borderColor: "var(--text-muted)", color: "var(--text-muted)" }}
      title="This gauge shows real data but is deliberately not scored — see this gauge's own page for why."
    >
      Not scored
    </span>
  );
}
