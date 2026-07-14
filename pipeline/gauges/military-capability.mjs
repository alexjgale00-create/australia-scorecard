// Verified live 2026-07-14: SIPRI publishes their full Military
// Expenditure Database as a direct .xlsx download, no login or API key —
// fetched and parsed here (pipeline/lib/xlsx.mjs, pipeline/lib/sipri.mjs)
// rather than entered by hand. The "Share of GDP" sheet specifically,
// per the site owner's sign-off recorded in gauges.config.json's
// dataPolicy and CLAUDE.md.
import { fetchSipriShareOfGdp } from "../lib/sipri.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "military-capability";

export async function run(config, report) {
  const { byCountry, missingCountries, sourceUrl } = await fetchSipriShareOfGdp({
    startYear: config.historyStartYear,
  });

  writeGaugeData({
    gaugeId,
    provenance: {
      status: "LIVE",
      institution: config.source.institution,
      seriesId: config.source.seriesId,
      seriesName: config.source.seriesName,
      url: sourceUrl,
      retrievedAt: new Date().toISOString(),
      note:
        `Live data: automated fetch of SIPRI's published Military Expenditure Database (.xlsx), ` +
        `"Share of GDP" sheet, converted from fraction to percentage.` +
        (missingCountries.length > 0 ? ` No data available for: ${missingCountries.join(", ")}.` : ""),
      missingCountries: buildMissingCountries(
        missingCountries,
        `${config.source.institution} has not published this indicator for this country/period.`
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
    report.success(gaugeId, `${config.source.institution}, Military Expenditure Database — 9 countries, Australia ${yearsCovered}. Saved.`);
  }
}
