import type { CountryCode, CountryScorePoint, ScoreBand } from "@/lib/types";

type Size = "hero" | "card" | "detail";

const SIZE_CONFIG: Record<
  Size,
  {
    trackHeight: number;
    peerDot: number;
    highlightDot: number;
    showScaleTicks: boolean;
    showCaption: boolean;
    labelFontSize: string;
  }
> = {
  hero: { trackHeight: 56, peerDot: 8, highlightDot: 16, showScaleTicks: true, showCaption: true, labelFontSize: "0.75rem" },
  detail: { trackHeight: 44, peerDot: 8, highlightDot: 14, showScaleTicks: true, showCaption: true, labelFontSize: "0.7rem" },
  card: { trackHeight: 30, peerDot: 6, highlightDot: 10, showScaleTicks: false, showCaption: false, labelFontSize: "0.625rem" },
};

export default function DotStrip({
  points,
  bands,
  highlightCode = "AUS",
  size = "detail",
}: {
  points: CountryScorePoint[];
  bands: ScoreBand[];
  highlightCode?: CountryCode;
  size?: Size;
}) {
  const cfg = SIZE_CONFIG[size];
  const highlight = points.find((p) => p.code === highlightCode);
  const peers = points.filter((p) => p.code !== highlightCode);

  // Boundaries between bands, as a % position along the 0-100 track.
  const boundaries = bands.slice(0, -1).map((b) => b.max + 0.5);

  return (
    <div>
      <div className="relative" style={{ height: cfg.trackHeight }}>
        {/* Track baseline */}
        <div
          className="absolute left-0 right-0"
          style={{ top: "50%", height: 1, background: "var(--baseline)" }}
        />

        {/* Band boundary hairlines */}
        {boundaries.map((pos) => (
          <div
            key={pos}
            className="absolute"
            style={{
              left: `${pos}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: "var(--gridline)",
            }}
          />
        ))}

        {/* Peer dots */}
        {peers.map((p) => (
          <span
            key={p.code}
            tabIndex={0}
            title={`${p.name}: ${Math.round(p.score)}`}
            aria-label={`${p.name}: ${Math.round(p.score)} of 100`}
            className="absolute rounded-full cursor-default"
            style={{
              left: `${p.score}%`,
              top: "50%",
              width: cfg.peerDot,
              height: cfg.peerDot,
              transform: "translate(-50%, -50%)",
              background: "var(--peer-line)",
              boxShadow: `0 0 0 2px var(--surface-1)`,
              zIndex: 1,
            }}
          />
        ))}

        {/* Highlight (Australia) dot + permanent label */}
        {highlight && (
          <div
            className="absolute flex flex-col items-center"
            style={{ left: `${highlight.score}%`, top: "50%", transform: "translate(-50%, -50%)", zIndex: 2 }}
          >
            <span
              title={`${highlight.name}: ${Math.round(highlight.score)}`}
              aria-label={`${highlight.name}: ${Math.round(highlight.score)} of 100`}
              className="rounded-full"
              style={{
                width: cfg.highlightDot,
                height: cfg.highlightDot,
                background: "var(--accent-australia)",
                boxShadow: `0 0 0 2px var(--surface-1)`,
              }}
            />
            <span
              className="absolute whitespace-nowrap font-semibold"
              style={{
                top: cfg.highlightDot + 2,
                color: "var(--accent-australia)",
                fontSize: cfg.labelFontSize,
              }}
            >
              AUS
            </span>
          </div>
        )}
      </div>

      {cfg.showScaleTicks && (
        <div className="mt-4 flex justify-between text-xs text-[var(--text-muted)]">
          <span>0</span>
          <span>100</span>
        </div>
      )}

      {cfg.showCaption && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          <span className="font-semibold" style={{ color: "var(--accent-australia)" }}>
            ● Australia
          </span>{" "}
          vs {peers.length} peer countries in grey. Hover a dot for its score.
        </p>
      )}
    </div>
  );
}
