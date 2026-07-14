// Coordinates verified live 2026-07-14 (dataflow exists under this exact
// agency/id/version — matches the brief's own "OECD Analytical House Price"
// description).
//
// The bare "all" key crashed OECD's server (HTTP 500, garbled resource-
// lookup error) on a live run — see the matching note in productivity.mjs.
// Now discovers the real dimension list and builds a correctly-shaped key
// (REF_AREA pinned, everything else explicitly blank) via
// fetchOecdCountryData, with the parser's duplicate-value check as a
// safety net against an under-constrained query silently mixing series.
import { fetchOecdCountryData } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "housing-pressure";
const DATAFLOW = "OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0";

export async function run(config, report) {
  const { byCountry, missingCountries } = await fetchOecdCountryData(DATAFLOW, {
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
        `Live data from ${config.source.institution}, Analytical House Price Indicators.` +
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
      `${config.source.institution}, Analytical House Prices — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
