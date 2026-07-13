import type { GaugeData } from "@/lib/types";

export default function SourceFooter({ provenance }: { provenance: GaugeData["provenance"] }) {
  const retrieved = provenance.retrievedAt
    ? new Date(provenance.retrievedAt).toLocaleDateString("en-AU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "not yet retrieved (sample data)";

  return (
    <p className="text-xs text-[var(--text-muted)]">
      Source:{" "}
      <a href={provenance.url} className="underline hover:text-[var(--text-secondary)]" target="_blank" rel="noreferrer">
        {provenance.institution}
      </a>
      , {provenance.seriesName} ({provenance.seriesId}), retrieved {retrieved}.
    </p>
  );
}
