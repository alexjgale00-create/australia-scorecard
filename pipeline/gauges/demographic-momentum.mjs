// This gauge is a DERIVED series: the World Bank publishes working-age
// population as a level (SP.POP.1564.TO), not a growth rate. We fetch one
// extra year before the display range so the first displayed year still
// gets a real year-over-year growth number, and only compute growth
// between genuinely consecutive years (never bridge a gap).
import { fetchWorldBankSeries } from "../lib/worldbank.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";

export const gaugeId = "demographic-momentum";

export async function run(config, report) {
  const seriesId = config.source.seriesId;
  const { byCountry, missingCountries } = await fetchWorldBankSeries(seriesId, {
    startYear: config.historyStartYear - 1,
  });

  const growthByCountry = {};
  for (const [code, country] of Object.entries(byCountry)) {
    const series = [];
    for (let i = 1; i < country.series.length; i++) {
      const prev = country.series[i - 1];
      const curr = country.series[i];
      if (curr.year !== prev.year + 1) continue; // don't bridge a gap year
      const growthPct = ((curr.value - prev.value) / prev.value) * 100;
      series.push({ year: curr.year, value: Math.round(growthPct * 1000) / 1000 });
    }
    growthByCountry[code] = { name: country.name, series };
  }

  const stillMissing = Object.entries(growthByCountry)
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
        `Derived: year-over-year % growth computed from ${config.source.institution}'s working-age ` +
        `population LEVEL series (${seriesId}), not published directly as a growth rate.` +
        (allMissing.length > 0 ? ` No data available for: ${allMissing.join(", ")}.` : ""),
    },
    countries: growthByCountry,
  });

  const ausSeries = growthByCountry.AUS.series;
  const yearsCovered = ausSeries.length
    ? `${ausSeries[0].year}–${ausSeries[ausSeries.length - 1].year}`
    : "no AUS data";

  if (allMissing.length > 0) {
    report.warning(
      gaugeId,
      `Saved (derived growth rate), gap for: ${allMissing.join(", ")}. Australia covered ${yearsCovered}.`
    );
  } else {
    report.success(
      gaugeId,
      `${config.source.institution}, ${seriesId} (derived growth rate) — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
