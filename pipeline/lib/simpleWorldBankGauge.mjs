// Shared logic for any gauge that's just one World Bank indicator, fetched
// and written as-is (no derived calculation, no combining multiple series).
import { buildMissingCountries, fetchWorldBankSeries } from "./worldbank.mjs";
import { writeGaugeData } from "./writeGaugeData.mjs";

export async function runSimpleWorldBankGauge(gaugeId, config, report) {
  const seriesId = config.source.seriesId;
  const { byCountry, missingCountries } = await fetchWorldBankSeries(seriesId, {
    startYear: config.historyStartYear,
  });

  writeGaugeData({
    gaugeId,
    provenance: {
      status: "LIVE",
      institution: config.source.institution,
      seriesId,
      seriesName: config.source.seriesName,
      url: config.source.url,
      retrievedAt: new Date().toISOString(),
      note:
        missingCountries.length > 0
          ? `Live data from ${config.source.institution}. No data available for: ${missingCountries.join(", ")}.`
          : `Live data from ${config.source.institution}, all 9 peer countries.`,
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
      `${config.source.institution}, ${seriesId} — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
