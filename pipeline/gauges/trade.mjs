// This gauge is DERIVED: World Bank doesn't publish "share of world
// exports" directly. We fetch each peer's raw export value plus the WLD
// (world total) aggregate, and divide — only for years where both exist.
import { buildMissingCountries, fetchWorldBankSeries, fetchWorldBankWorldTotal } from "../lib/worldbank.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";

export const gaugeId = "trade";

export async function run(config, report) {
  const seriesId = config.source.seriesId;
  const [{ byCountry, missingCountries }, worldTotalByYear] = await Promise.all([
    fetchWorldBankSeries(seriesId, { startYear: config.historyStartYear }),
    fetchWorldBankWorldTotal(seriesId, { startYear: config.historyStartYear }),
  ]);

  const shareByCountry = {};
  for (const [code, country] of Object.entries(byCountry)) {
    const series = [];
    for (const point of country.series) {
      const worldValue = worldTotalByYear.get(point.year);
      if (!worldValue) continue; // no world total that year — never estimate
      const sharePct = (point.value / worldValue) * 100;
      series.push({ year: point.year, value: Math.round(sharePct * 1000) / 1000 });
    }
    shareByCountry[code] = { name: country.name, series };
  }

  const stillMissing = Object.entries(shareByCountry)
    .filter(([, c]) => c.series.length === 0)
    .map(([code]) => code);
  const allMissing = [...new Set([...missingCountries, ...stillMissing])];

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
        `Derived: each country's ${seriesId} divided by the World Bank's WLD (world total) ` +
        `aggregate for the same indicator, for years where both are published.` +
        (allMissing.length > 0 ? ` No data available for: ${allMissing.join(", ")}.` : ""),
      missingCountries: buildMissingCountries(
        allMissing,
        `${config.source.institution} has not published this export indicator for this country in a year that overlaps with the world-total aggregate.`
      ),
    },
    countries: shareByCountry,
  });

  const ausSeries = shareByCountry.AUS.series;
  const yearsCovered = ausSeries.length
    ? `${ausSeries[0].year}–${ausSeries[ausSeries.length - 1].year}`
    : "no AUS data";

  if (allMissing.length > 0) {
    report.warning(
      gaugeId,
      `Saved (derived share of world total), gap for: ${allMissing.join(", ")}. Australia covered ${yearsCovered}.`
    );
  } else {
    report.success(
      gaugeId,
      `${config.source.institution}, ${seriesId} (share of world total) — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
