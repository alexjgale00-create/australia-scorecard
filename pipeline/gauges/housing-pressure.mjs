// Coordinates verified live 2026-07-14 (dataflow exists under this exact
// agency/id/version — matches the brief's own "OECD Analytical House Price"
// description). Uses the "all" key for the same reason as productivity.mjs:
// dimension order was never confirmed against a real response before
// sdmx.oecd.org's Cloudflare bot-protection blocked further requests.
//
// A live run returned HTTP 500 with "all" + only startPeriod bounded (no
// endPeriod) — see the matching note in productivity.mjs. Bounding the
// query end date is a safe, corruption-free change worth ruling out first.
import { fetchOecdSdmxData } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "housing-pressure";
const DATAFLOW = "OECD.ECO.MPD,DSD_AN_HOUSE_PRICES@DF_HOUSE_PRICES,1.0";

export async function run(config, report) {
  const { byCountry, missingCountries } = await fetchOecdSdmxData(DATAFLOW, "all", {
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
