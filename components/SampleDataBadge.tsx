export default function SampleDataBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        borderColor: "var(--status-warning)",
        color: "var(--status-warning)",
      }}
      title="Illustrative placeholder data, not a real published statistic. See provenance note on the gauge detail page."
    >
      ⚠ Sample data — not real
    </span>
  );
}
