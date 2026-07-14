// Coordinates verified live 2026-07-14 (dataflow exists under this exact
// agency/id/version — matches the brief's own "OECD Analytical House Price"
// description).
//
// The bare "all" key crashed OECD's server (HTTP 500, garbled resource-
// lookup error) on a live run. The next attempt (REF_AREA pinned, every
// other dimension blank via fetchOecdCountryData) surfaced a real ambiguity
// on a live run: OECD's own duplicate-value safety net caught two distinct
// measures answering the same query — MEASURE=HPI (nominal house price
// index) and MEASURE=HPI_YDH (price-to-income ratio) both matched, with
// values that genuinely disagree. gauges.config.json's seriesName for this
// gauge is explicit: "price-to-income ratio" — so HPI_YDH is the correct
// code, not a guess between equally-plausible options. UNIT_MEASURE=IX
// pinned too, since that's the unit both conflicting series shared in the
// live error (an index, matching this gauge's configured unit).
import { fetchOecdDataflowDimensions, fetchOecdSdmxData, PEER_COUNTRY_KEY } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "housing-pressure";
const DATAFLOW = "OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0";

const KNOWN_DIMENSION_VALUES = {
  MEASURE: "HPI_YDH",
  UNIT_MEASURE: "IX",
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
        `Live data from ${config.source.institution}, Analytical House Price Indicators (price-to-income ratio).` +
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
      `${config.source.institution}, Analytical House Prices (price-to-income) — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
