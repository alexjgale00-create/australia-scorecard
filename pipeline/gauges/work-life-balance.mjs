// Coordinates found 2026-08-09 via corroborated web search (multiple
// independent results, including OECD's own Data Explorer URL whose page
// title — "Average annual hours actually worked per worker" — matches this
// gauge's unit/oneLiner exactly): OECD.ELS.SAE,DSD_HW@DF_AVG_ANN_HRS_WKD,1.0.
//
// Round 1 (first Actions run, 2026-08-09): the generic discovery route
// (REF_AREA pinned, everything else wildcard) surfaced a real, live
// conflicting-values error — DEU 1991, 1554.071 vs 1478.9. The two series'
// full dimension breakdowns differed on exactly one dimension:
// WORKER_STATUS=_T ("Total") vs WORKER_STATUS=ICSE93_1 (a specific ICSE-93
// employment-status subclass — "Employees"). JOB_COVERAGE=_T appearing
// unopposed elsewhere in the same key confirms "_T" is this dataflow's real
// Total/aggregate marker, not a guess. WORKER_STATUS=_T pinned.
//
// Round 2: clean save with WORKER_STATUS=_T — but only 1995-2019. A
// corroborating secondary source (citing OECD directly) showed real
// Australia values through 2023, so the pin was very likely truncating
// recent years rather than reflecting a genuine publication ceiling — see
// METHODOLOGY.md's "Work-life balance: OECD dimension pin".
//
// Round 3 (this one; explicitly granted as a final, one-more round — a
// gauge silently missing 2020-2024 would misrepresent exactly the
// COVID-era hours-worked shift this gauge exists to capture): the
// WORKER_STATUS=_T pin is kept for the historical range it's proven
// correct for (evidence: the DEU 1991 conflict). A SEPARATE probe query
// for 2020-onward, with WORKER_STATUS left wildcarded again, asks whether
// a distinct "modern" series exists under some other dimension value this
// project hasn't seen conflict evidence for yet. Three possible outcomes,
// each handled explicitly rather than guessed past:
//   (a) the probe conflicts -> that conflict's diagnostic is the real
//       finding this round was for; reported as a warning, historical
//       data still saved, no further pin attempted (no fourth round).
//   (b) the probe returns real 2020+ data cleanly -> merged in, full
//       range saved.
//   (c) the probe returns nothing at all -> real evidence this dataflow
//       itself has no data past 2019 under any dimension combination
//       (this project's parser unions every matching series already, so a
//       clean empty result here is meaningful, not just "didn't try hard
//       enough") -> historical data saved as-is, reported plainly so this
//       gauge can be moved to the manual lane with the 2019 endpoint
//       disclosed, per the site owner's own stated fallback.
import { fetchOecdDataflowDimensions, fetchOecdSdmxData, PEER_COUNTRY_KEY } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "work-life-balance";
const DATAFLOW = "OECD.ELS.SAE,DSD_HW@DF_AVG_ANN_HRS_WKD,1.0";
const RECENT_PROBE_START_YEAR = 2020;

const KNOWN_DIMENSION_VALUES = {
  WORKER_STATUS: "_T",
};

function mergeCountries(base, extra, minYear) {
  const merged = {};
  for (const code of Object.keys(base)) {
    const baseSeries = base[code]?.series ?? [];
    const extraSeries = (extra[code]?.series ?? []).filter((p) => p.year >= minYear);
    merged[code] = {
      name: base[code]?.name ?? extra[code]?.name,
      series: [...baseSeries, ...extraSeries].sort((a, b) => a.year - b.year),
    };
  }
  return merged;
}

export async function run(config, report) {
  const dims = await fetchOecdDataflowDimensions(DATAFLOW);
  const refAreaIndex = dims.indexOf("REF_AREA");
  if (refAreaIndex === -1) {
    throw new Error(`OECD dataflow "${DATAFLOW}" has no REF_AREA dimension in its structure.`);
  }

  const historicalKey = dims
    .map((dim, i) => (i === refAreaIndex ? PEER_COUNTRY_KEY : (KNOWN_DIMENSION_VALUES[dim] ?? "")))
    .join(".");
  const probeKey = dims.map((dim, i) => (i === refAreaIndex ? PEER_COUNTRY_KEY : "")).join(".");

  const { byCountry: historical } = await fetchOecdSdmxData(DATAFLOW, historicalKey, {
    startPeriod: config.historyStartYear,
    endPeriod: new Date().getFullYear(),
  });

  let byCountry = historical;
  let recentNote = "";
  let recentOutcome = "merged"; // "merged" | "empty" | "conflict"

  try {
    const { byCountry: recent } = await fetchOecdSdmxData(DATAFLOW, probeKey, {
      startPeriod: RECENT_PROBE_START_YEAR,
      endPeriod: new Date().getFullYear(),
    });
    const recentPointCount = Object.values(recent).reduce((sum, c) => sum + c.series.length, 0);

    if (recentPointCount > 0) {
      byCountry = mergeCountries(historical, recent, RECENT_PROBE_START_YEAR);
      recentNote = ` Recent-years probe (${RECENT_PROBE_START_YEAR}+, WORKER_STATUS unpinned) found ${recentPointCount} additional point(s) with no conflict — merged in.`;
    } else {
      recentOutcome = "empty";
      recentNote =
        ` Recent-years probe (${RECENT_PROBE_START_YEAR}+, WORKER_STATUS unpinned) returned zero data — real ` +
        `evidence this dataflow has nothing past the historical range under any dimension combination, not ` +
        `just an unlucky pin. See METHODOLOGY.md's "Work-life balance: OECD dimension pin" for what this means ` +
        `for this gauge's next step (the manual lane, per the site owner's stated fallback).`;
    }
  } catch (err) {
    recentOutcome = "conflict";
    recentNote =
      ` Recent-years probe (${RECENT_PROBE_START_YEAR}+, WORKER_STATUS unpinned) hit a real conflict, not ` +
      `applied (per the site owner's "no fourth round" ruling — this is reported, not fixed): ${err.message}`;
  }

  const missingCountries = Object.entries(byCountry)
    .filter(([, c]) => c.series.length === 0)
    .map(([code]) => code);

  writeGaugeData({
    gaugeId,
    provenance: {
      status: "LIVE",
      institution: config.source.institution,
      seriesId: config.source.seriesId,
      seriesName: config.source.seriesName,
      url: config.source.url,
      retrievedAt: new Date().toISOString(),
      note:
        `Live data from ${config.source.institution}, Average annual hours actually worked per worker.` +
        (missingCountries.length > 0 ? ` No data available for: ${missingCountries.join(", ")}.` : "") +
        recentNote,
      missingCountries: buildMissingCountries(
        missingCountries,
        `${config.source.institution} has not published this indicator for this country.`
      ),
    },
    countries: byCountry,
  });

  const ausSeries = byCountry.AUS.series;
  const yearsCovered = ausSeries.length
    ? `${ausSeries[0].year}–${ausSeries[ausSeries.length - 1].year}`
    : "no AUS data";

  if (missingCountries.length > 0) {
    report.warning(
      gaugeId,
      `Saved, but with a gap: no data for ${missingCountries.join(", ")}. Australia covered ${yearsCovered}.${recentNote}`
    );
  } else if (recentOutcome !== "merged") {
    // Full historical range saved successfully, but the recent-years
    // question this round exists to answer is still open (empty probe or
    // a conflict) — that's worth a look even though nothing is broken, so
    // this stays a warning rather than a plain success.
    report.warning(
      gaugeId,
      `${config.source.institution}, Average annual hours actually worked per worker — 9 countries, Australia ${yearsCovered}. Saved.${recentNote}`
    );
  } else {
    report.success(
      gaugeId,
      `${config.source.institution}, Average annual hours actually worked per worker — 9 countries, Australia ${yearsCovered}. Saved.${recentNote}`
    );
  }
}
