import type { CountryCode, GaugeConfig, GaugeData } from "@/lib/types";
import { latestSharedYear } from "@/lib/scoring";

/**
 * Multi-country trajectory data for a scored gauge's dense layer — see
 * DESIGN.md "Trajectory chart" for the full spec and the reasoning behind
 * every threshold here. Deliberately its own file, not added to
 * lib/scoring.ts or lib/gauge-view.ts: this is presentation-layer
 * derivation (which peers qualify to be *drawn*, not anything about how a
 * gauge is *scored*), reading `GaugeData.countries[*].series` directly —
 * the same raw source `AUS SERIES` and the old (deleted) TimeSeriesChart
 * already read. No fetching, no pipeline, no scoring math.
 */

export const MIN_YEARS_FOR_TRAJECTORY = 3;
export const MIN_QUALIFYING_PEERS_FOR_CHART = 2;
export const ENVELOPE_MODE_MIN_PEERS = 5;

export interface TrajectoryPoint {
  year: number;
  value: number;
}

export interface CountryTrajectory {
  code: CountryCode;
  name: string;
  points: TrajectoryPoint[];
}

export interface BandPoint {
  year: number;
  min: number;
  max: number;
}

export type TrajectoryView =
  | {
      kind: "too-thin";
      /** Always states which of the two conditions failed — never a generic "not enough data." */
      reason: string;
    }
  | {
      kind: "name-all";
      aus: CountryTrajectory;
      peers: CountryTrajectory[];
      omittedPeers: { code: CountryCode; name: string }[];
      years: number[];
    }
  | {
      kind: "envelope";
      aus: CountryTrajectory;
      /** The best-placed qualifying peer *at each year* — not one fixed country (see DESIGN.md). */
      frontier: TrajectoryPoint[];
      comparator: CountryTrajectory;
      comparatorSource: "precedent" | "mechanical";
      band: BandPoint[];
      /** Total qualifying peers feeding frontier/band, including the comparator. */
      qualifyingPeerCount: number;
      omittedPeers: { code: CountryCode; name: string }[];
      years: number[];
    };

function distinctYears(points: { year: number }[]): number {
  return new Set(points.map((p) => p.year)).size;
}

/** Union of every year appearing in any of the given trajectories, sorted ascending. */
function unionYears(trajectories: { points: TrajectoryPoint[] }[]): number[] {
  const years = new Set<number>();
  for (const t of trajectories) for (const p of t.points) years.add(p.year);
  return [...years].sort((a, b) => a - b);
}

export function buildTrajectoryView(
  data: GaugeData,
  config: GaugeConfig,
  /**
   * The peer PRECEDENT's own drafted prose names, if any — see
   * content/register-draft-lines.ts's REGISTER_PRECEDENT_COMPARATOR. When
   * set and the named peer qualifies, it becomes the comparator instead of
   * the mechanically-nearest peer, so the chart and the apparatus never
   * name different countries on the same page. Resolved by the caller
   * (app/table/[plate]/page.tsx), not looked up here — same separation
   * buildGaugeView already keeps between itself and content files.
   */
  precedentComparator?: CountryCode
): TrajectoryView {
  const ausCountry = data.countries.AUS;
  const aus: CountryTrajectory = {
    code: "AUS",
    name: ausCountry?.name ?? "Australia",
    points: (ausCountry?.series ?? []).map((p) => ({ year: p.year, value: p.value })),
  };

  const peerEntries = Object.entries(data.countries).filter(([code]) => code !== "AUS") as [
    CountryCode,
    GaugeData["countries"][CountryCode],
  ][];

  const allPeers: CountryTrajectory[] = peerEntries
    .filter((entry): entry is [CountryCode, NonNullable<(typeof entry)[1]>] => entry[1] !== undefined)
    .map(([code, country]) => ({
      code,
      name: country.name,
      points: country.series.map((p) => ({ year: p.year, value: p.value })),
    }));

  const qualifies = (t: CountryTrajectory) => distinctYears(t.points) >= MIN_YEARS_FOR_TRAJECTORY;
  const qualifyingPeers = allPeers.filter(qualifies);
  const omittedPeers = allPeers.filter((t) => !qualifies(t)).map((t) => ({ code: t.code, name: t.name }));

  if (!qualifies(aus)) {
    return {
      kind: "too-thin",
      reason: `Australia has only ${distinctYears(aus.points)} year(s) of data for this gauge — fewer than the ${MIN_YEARS_FOR_TRAJECTORY} needed to draw a trajectory.`,
    };
  }
  if (qualifyingPeers.length < MIN_QUALIFYING_PEERS_FOR_CHART) {
    return {
      kind: "too-thin",
      reason: `Only ${qualifyingPeers.length} peer(s) have ${MIN_YEARS_FOR_TRAJECTORY}+ years of data for this gauge — fewer than the ${MIN_QUALIFYING_PEERS_FOR_CHART} needed for a comparative trajectory.`,
    };
  }

  if (qualifyingPeers.length <= ENVELOPE_MODE_MIN_PEERS - 1) {
    return {
      kind: "name-all",
      aus,
      peers: qualifyingPeers,
      omittedPeers,
      years: unionYears([aus, ...qualifyingPeers]),
    };
  }

  // Envelope mode: frontier (running best value, direction from polarity),
  // a named comparator, and a min-max band across every qualifying peer
  // (including the comparator — its value is real peer data like any
  // other and belongs in the range; it's also drawn as its own line).
  const better = (a: number, b: number) =>
    config.polarity === "lower_is_better" ? Math.min(a, b) : Math.max(a, b);

  const years = unionYears([aus, ...qualifyingPeers]);
  // Comparator resolved first: the band's whole point is "the *rest*" —
  // it must exclude whichever peer already has its own named line, or the
  // "REMAINING N peers" disclosure on the chart would be describing a
  // wider set than what's actually shaded.
  const sharedYear = latestSharedYear(data);
  let comparator: CountryTrajectory | undefined;
  let comparatorSource: "precedent" | "mechanical" = "mechanical";

  if (precedentComparator) {
    const named = qualifyingPeers.find((p) => p.code === precedentComparator);
    if (named) {
      comparator = named;
      comparatorSource = "precedent";
    }
    // If the named peer doesn't qualify, fall through to the mechanical
    // pick below rather than failing — the chart still needs *a*
    // comparator, and this is reported via comparatorSource, not silently.
  }

  if (!comparator) {
    const ausAtShared = sharedYear ? aus.points.find((p) => p.year === sharedYear)?.value : undefined;
    if (ausAtShared !== undefined) {
      comparator = [...qualifyingPeers]
        .map((p) => ({ peer: p, value: p.points.find((pt) => pt.year === sharedYear)?.value }))
        .filter((x): x is { peer: CountryTrajectory; value: number } => x.value !== undefined)
        .sort((a, b) => {
          const diff = Math.abs(a.value - ausAtShared) - Math.abs(b.value - ausAtShared);
          return diff !== 0 ? diff : a.peer.code.localeCompare(b.peer.code); // deterministic tie-break
        })[0]?.peer;
    }
    // Every scored gauge has AUS data at latestSharedYear by construction
    // (assertMinimumPeerCoverage), so this only falls through on a gauge
    // whose shared year predates this chart's own 3-year floor in an
    // unusual way — guarded, not assumed impossible.
    comparator ??= qualifyingPeers[0];
  }

  // Frontier: the running best value across *every* qualifying peer,
  // comparator included — excluding it would arbitrarily understate how
  // far ahead the real frontier sits on a year the comparator happens to
  // hold it. Band: the range across the *other* qualifying peers only —
  // the comparator already has its own line, so folding its value into
  // the "remaining peers" shading too would both double-count it and make
  // the "REMAINING N peers" caption wrong.
  const bandPeers = qualifyingPeers.filter((p) => p.code !== comparator!.code);
  const frontier: TrajectoryPoint[] = [];
  const band: BandPoint[] = [];
  for (const year of years) {
    const allValuesThisYear = qualifyingPeers
      .map((p) => p.points.find((pt) => pt.year === year)?.value)
      .filter((v): v is number => v !== undefined);
    if (allValuesThisYear.length > 0) frontier.push({ year, value: allValuesThisYear.reduce(better) });

    const bandValuesThisYear = bandPeers
      .map((p) => p.points.find((pt) => pt.year === year)?.value)
      .filter((v): v is number => v !== undefined);
    if (bandValuesThisYear.length > 0) {
      band.push({ year, min: Math.min(...bandValuesThisYear), max: Math.max(...bandValuesThisYear) });
    }
  }

  return {
    kind: "envelope",
    aus,
    frontier,
    comparator,
    comparatorSource,
    band,
    qualifyingPeerCount: qualifyingPeers.length,
    omittedPeers,
    years,
  };
}
