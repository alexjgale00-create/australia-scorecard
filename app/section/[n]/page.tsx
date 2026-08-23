import { notFound } from "next/navigation";
import SectionOverview, { type CountryScore, type SectionRow } from "@/components/SectionOverview";
import { buildGaugeView, NOT_ESTABLISHED } from "@/lib/gauge-view";
import { gaugesConfig, getAllGaugesWithData, getGaugesForDimension, isScoredInDimension } from "@/lib/gauges-data";
import { computeCompositeForAllCountries } from "@/lib/scoring";
import { REGISTER_DRAFT_CAUSES, REGISTER_CONTESTED_CAUSES } from "@/content/register-draft-lines";
import type { DimensionId } from "@/lib/types";

const SECTION_DIMENSION: Record<string, DimensionId> = { "1": "power", "2": "quality-of-life" };

export function generateStaticParams() {
  return Object.keys(SECTION_DIMENSION).map((n) => ({ n }));
}

export default async function SectionPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dimensionId = SECTION_DIMENSION[n];
  if (!dimensionId) notFound();

  const dimension = gaugesConfig.dimensions.find((d) => d.id === dimensionId)!;
  const allGauges = getAllGaugesWithData();
  const gaugesWithData = allGauges.filter(
    (g): g is { config: (typeof allGauges)[number]["config"]; data: NonNullable<(typeof allGauges)[number]["data"]> } =>
      g.data !== null
  );

  // The blended "YOUR INDEX" equation combines both dimensions regardless
  // of which section you're on (matches the mockup's own construction —
  // panel 1b's Section 4 page still shows a POWER + LIFE blend). Computed
  // for all 9 countries once, server-side; the client component derives
  // both the default (0.60/0.40) and reader-chosen rankings from this same
  // array, so there is only ever one source of truth for the scores
  // themselves.
  const powerScores = computeCompositeForAllCountries(gaugesWithData, "power");
  const lifeScores = computeCompositeForAllCountries(gaugesWithData, "quality-of-life");
  const countryScores: CountryScore[] = gaugesConfig.peerCountries
    .map(({ code, name }) => {
      const power = powerScores.find((p) => p.code === code)?.score ?? null;
      const life = lifeScores.find((p) => p.code === code)?.score ?? null;
      return { code, name, power, life };
    })
    .filter((c): c is CountryScore => c.power !== null && c.life !== null);

  const dimensionGauges = getGaugesForDimension(dimensionId);
  const rows: SectionRow[] = dimensionGauges.map(({ id }) => {
    const fullConfig = gaugesConfig.gauges.find((g) => g.id === id)!;
    const plate = fullConfig.plates[dimensionId];

    if (!plate) {
      // Reused elsewhere, not here (housing-pressure in Section 2): a
      // cross-reference row, never a second scored row. It still counts
      // toward this dimension's composite (isScoredInDimension confirms
      // that) — the row says so rather than implying it's absent.
      const primaryDimensionId = (Object.keys(fullConfig.plates) as DimensionId[])[0];
      const primaryPlate = fullConfig.plates[primaryDimensionId]!;
      const primaryDimensionName = gaugesConfig.dimensions.find((d) => d.id === primaryDimensionId)?.name ?? primaryDimensionId;
      return {
        kind: "cross-reference",
        gaugeId: id,
        name: fullConfig.name,
        primaryPlate,
        primaryDimensionName,
        countsTowardComposite: isScoredInDimension(fullConfig, dimensionId),
      };
    }

    if (!isScoredInDimension(fullConfig, dimensionId)) {
      // S7 — real plate, real data, not scored here.
      return { kind: "unscored", gaugeId: id, name: fullConfig.name, plate, reason: fullConfig.unscoredReason ?? "Not scored." };
    }

    const data = allGauges.find((g) => g.config.id === id)?.data ?? null;
    if (!data) {
      return { kind: "awaiting-data", gaugeId: id, name: fullConfig.name, plate };
    }

    const cause = REGISTER_DRAFT_CAUSES[id]
      ? { kind: "established" as const, body: REGISTER_DRAFT_CAUSES[id] }
      : REGISTER_CONTESTED_CAUSES[id]
        ? { kind: "contested" as const, body: REGISTER_CONTESTED_CAUSES[id] }
        : NOT_ESTABLISHED;

    const view = buildGaugeView({
      config: fullConfig,
      data,
      gaugesConfig,
      dimensionId,
      plate,
      section: dimensionId === "power" ? 1 : 2,
      plainLine: "",
      definition: "",
      sourcesNote: "",
      cause,
    });

    if (!view.scored) return { kind: "awaiting-data", gaugeId: id, name: fullConfig.name, plate };

    return {
      kind: "scored",
      gaugeId: id,
      plate,
      name: view.title,
      unit: view.unitLine,
      invertedAxis: view.invertedAxis ?? false,
      aus: view.aus,
      peers: view.peers,
      missingPeers: view.missingPeers,
      bandLabel: view.bands.find((b) => b.key === view.ausBand)?.label ?? view.ausBand,
      bandTicks: view.bands.find((b) => b.key === view.ausBand)?.ticks ?? "",
      bandOverstates: view.bandRobustness?.direction === "overstates",
      rank: view.rank,
      delta: view.delta,
      asOf: view.asOf,
      dataThroughYear: view.dataThroughYear,
      stale: view.stale,
    };
  });

  return (
    <SectionOverview
      sectionNumber={n === "1" ? 1 : 2}
      dimensionName={dimension.name}
      countryScores={countryScores}
      rows={rows}
    />
  );
}
