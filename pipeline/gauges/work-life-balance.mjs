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
// Total/aggregate marker, not a guess. This gauge is specified as the
// general "average annual hours actually worked per worker," not an
// employees-only subclass, so WORKER_STATUS=_T is the correct pin — same
// evidence-based discipline as housing-pressure's FREQ=A resolution, not a
// second guess. Per the site owner's explicit stopping rule: this is the
// one permitted extra round: if the next Actions run throws a *different*
// conflict, this moves to the manual lane, no third round.
import { fetchOecdDataflowDimensions, fetchOecdSdmxData, PEER_COUNTRY_KEY } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "work-life-balance";
const DATAFLOW = "OECD.ELS.SAE,DSD_HW@DF_AVG_ANN_HRS_WKD,1.0";

const KNOWN_DIMENSION_VALUES = {
  WORKER_STATUS: "_T",
};

export async function run(config, report) {
  const dims = await fetchOecdDataflowDimensions(DATAFLOW);
  const refAreaIndex = dims.indexOf("REF_AREA");
  if (refAreaIndex === -1) {
    throw new Error(`OECD dataflow "${DATAFLOW}" has no REF_AREA dimension in its structure.`);
  }

  const key = dims
    .map((dim, i) => (i === refAreaIndex ? PEER_COUNTRY_KEY : (KNOWN_DIMENSION_VALUES[dim] ?? "")))
    .join(".");

  const { byCountry, missingCountries } = await fetchOecdSdmxData(DATAFLOW, key, {
    startPeriod: config.historyStartYear,
    endPeriod: new Date().getFullYear(),
  });

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
        (missingCountries.length > 0 ? ` No data available for: ${missingCountries.join(", ")}.` : ""),
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
      `Saved, but with a gap: no data for ${missingCountries.join(", ")}. Australia covered ${yearsCovered}.`
    );
  } else {
    report.success(
      gaugeId,
      `${config.source.institution}, Average annual hours actually worked per worker — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
