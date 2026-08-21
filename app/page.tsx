import { gaugesConfig, getGaugeData, getGaugesForDimension, isScoredInDimension } from "@/lib/gauges-data";
import { computeGaugeScore } from "@/lib/scoring";
import { buildGaugeView } from "@/lib/gauge-view";
import { getSiteContent } from "@/lib/content";
import GaugeCard from "@/components/GaugeCard";
import AwaitingDataCard from "@/components/AwaitingDataCard";
import UnscoredGaugeCard from "@/components/UnscoredGaugeCard";
import CrossReferenceCard from "@/components/CrossReferenceCard";
import DimensionVerdict from "@/components/DimensionVerdict";
import { computeMaturityCounts, summarizeMaturityCounts } from "@/lib/maturity";
import type { DimensionId, GaugeConfig, GaugeData } from "@/lib/types";

/**
 * REGISTER, homepage — see DESIGN.md "Homepage" for the full spec: the
 * ruler treatment (DimensionVerdict/DimensionRuler), why the full
 * per-peer band strip was rejected, and the Header/Footer decision. This
 * page's own content region is `.register` — paper, ink, Public Sans +
 * Martian Mono, zero border radius, no colour encodes performance
 * anywhere (R1). Header and Footer (app/layout.tsx) are deliberately
 * unchanged — same precedent /table/[plate] and /section/[n] already set.
 */
export default function Home() {
  const content = getSiteContent();

  const gaugesWithData: { config: GaugeConfig; data: GaugeData }[] = gaugesConfig.gauges
    .map((config) => {
      const data = getGaugeData(config.id);
      return data ? { config, data } : null;
    })
    .filter((g): g is { config: GaugeConfig; data: GaugeData } => g !== null);

  // Computed once across every gauge with data, regardless of dimension —
  // both DimensionVerdicts below filter this same array to their own gauges
  // rather than each recomputing scores from scratch.
  const scores = gaugesWithData.map(({ config, data }) =>
    computeGaugeScore(data, config, gaugesConfig.directionThresholdScorePointsPerYear)
  );

  const maturityCounts = computeMaturityCounts(gaugesConfig.gauges, getGaugeData);
  const maturitySummary = summarizeMaturityCounts(maturityCounts);
  const allEstablished = maturityCounts.established === gaugesConfig.gauges.length;

  // content/site.json's factOfRelease is a hand-edited-before-release slot
  // (see its own body text) — not written here. Hidden rather than shipped
  // as literal placeholder copy; restored automatically the moment the
  // site owner replaces the headline.
  const isPlaceholderFact = content.factOfRelease.headline.includes("[PLACEHOLDER]");

  return (
    <div className="register bg-desk min-h-full py-8 sm:py-10">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
        {!allEstablished && (
          <div className="mb-4 inline-block border border-stamp bg-paper px-3 py-2 font-martian-mono text-[10.5px] sm:text-[11px] text-stamp tracking-[.02em]">
            {maturitySummary.toUpperCase()} SEE{" "}
            <a href="/status" className="underline decoration-stamp hover:text-ink hover:decoration-ink">
              DATA STATUS
            </a>
            .
          </div>
        )}

        <p className="font-public-sans text-[13.5px] sm:text-[14px] text-ink-2 mb-7 max-w-[62ch]">
          Two independent verdicts, never combined into one number — the tension between them is
          the point. See{" "}
          <a href="/methodology" className="underline decoration-chrome hover:decoration-ink hover:text-ink">
            Methodology
          </a>{" "}
          for how each is built.
        </p>

        {/* Equal prominence, side by side; stacks below lg. Same shared 0-100 scale on both rulers (gaugesConfig.scoreBands) — see DESIGN.md "Homepage." */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {gaugesConfig.dimensions.map((dimension) => (
            <DimensionVerdict
              key={dimension.id}
              dimension={dimension}
              gaugesWithData={gaugesWithData}
              scores={scores}
              allConfigs={gaugesConfig.gauges}
              scoreBands={gaugesConfig.scoreBands}
              totalGaugeCount={
                getGaugesForDimension(dimension.id).filter((g) => isScoredInDimension(g, dimension.id))
                  .length
              }
            />
          ))}
        </div>

        {gaugesConfig.dimensions.map((dimension) => {
          const dimensionGauges = getGaugesForDimension(dimension.id);
          return (
            <section key={dimension.id} className="mt-10">
              <h2 className="font-public-sans font-bold text-[18px] sm:text-[20px] text-ink">
                {dimension.name} gauges
              </h2>
              <p className="font-public-sans text-[13px] text-ink-2 mt-1 mb-4">{dimension.tagline}</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dimensionGauges.map((config) => {
                  const plate = config.plates[dimension.id];

                  if (!plate) {
                    // Reused elsewhere (housing-pressure is the only current
                    // case) — cross-reference card, never a second scored
                    // card for one gauge. R8.
                    const primaryDimensionId = (Object.keys(config.plates) as DimensionId[])[0];
                    const primaryPlate = config.plates[primaryDimensionId]!;
                    const primaryDimensionName =
                      gaugesConfig.dimensions.find((d) => d.id === primaryDimensionId)?.name ??
                      primaryDimensionId;
                    return (
                      <CrossReferenceCard
                        key={config.id}
                        name={config.name}
                        primaryPlate={primaryPlate}
                        primaryDimensionName={primaryDimensionName}
                        countsTowardComposite={isScoredInDimension(config, dimension.id)}
                      />
                    );
                  }

                  if (config.unscoredDimensions?.includes(dimension.id)) {
                    return <UnscoredGaugeCard key={config.id} config={config} plate={plate} />;
                  }

                  const withData = gaugesWithData.find((g) => g.config.id === config.id);
                  if (!withData) return <AwaitingDataCard key={config.id} config={config} plate={plate} />;

                  const view = buildGaugeView({
                    config,
                    data: withData.data,
                    gaugesConfig,
                    dimensionId: dimension.id,
                    plate,
                    section: dimension.id === "power" ? 1 : 2,
                    plainLine: "",
                    definition: "",
                    sourcesNote: "",
                  });
                  if (!view.scored) return <AwaitingDataCard key={config.id} config={config} plate={plate} />;

                  return <GaugeCard key={config.id} view={view} plate={plate} />;
                })}
              </div>
            </section>
          );
        })}

        {!isPlaceholderFact && (
          <section className="mt-10 border border-chrome bg-paper p-6">
            <p className="font-martian-mono text-[9.5px] font-bold tracking-[.14em] text-ink-3">
              FACT OF THE RELEASE
            </p>
            <h2 className="font-public-sans font-bold text-[19px] text-ink mt-1.5">
              {content.factOfRelease.headline}
            </h2>
            <p className="font-public-sans text-[14px] text-ink-2 mt-2">{content.factOfRelease.body}</p>
          </section>
        )}
      </div>
    </div>
  );
}
