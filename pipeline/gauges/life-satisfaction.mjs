// Automated 2026-08-09. WHR's old /data/ page is dead; this fetches the
// same Cantril ladder ("Life evaluation", 3-year average) figures via
// data.worldhappiness.report's own dashboard API — the exact route their
// own frontend uses. See pipeline/lib/whr.mjs for the full discovery
// record and the column-meaning verification.
import { fetchLifeEvaluation, API_URL } from "../lib/whr.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "life-satisfaction";

export async function run(config, report) {
  const { byCountry, missingCountries, failedYears } = await fetchLifeEvaluation();

  writeGaugeData({
    gaugeId,
    provenance: {
      status: "LIVE",
      institution: config.source.institution,
      seriesId: config.source.seriesId,
      seriesName: config.source.seriesName,
      url: API_URL,
      retrievedAt: new Date().toISOString(),
      note:
        `Live data from the World Happiness Report's own dashboard (data.worldhappiness.report), Life ` +
        `evaluation (Cantril ladder), 3-year rolling average — fetched via the dashboard's own backend API ` +
        `(not a documented public endpoint; see pipeline/lib/whr.mjs), the same route the official frontend ` +
        `uses.` +
        (missingCountries.length > 0 ? ` No data available for: ${missingCountries.join(", ")}.` : "") +
        (failedYears.length > 0
          ? ` ${failedYears.length} edition year(s) failed to fetch this run (${failedYears.map((f) => f.year).join(", ")}) — those years are simply absent from the series below, not estimated.`
          : ""),
      missingCountries: buildMissingCountries(
        missingCountries,
        "World Happiness Report has no published Life evaluation figure for this country."
      ),
    },
    countries: byCountry,
  });

  const ausSeries = byCountry.AUS.series;
  const yearsCovered = ausSeries.length
    ? `${ausSeries[0].year}–${ausSeries[ausSeries.length - 1].year} (${ausSeries.length} points)`
    : "no AUS data";

  if (missingCountries.length > 0 || failedYears.length > 0) {
    report.warning(
      gaugeId,
      `Saved via World Happiness Report's dashboard API, but incomplete: ` +
        (missingCountries.length > 0 ? `no data for ${missingCountries.join(", ")}. ` : "") +
        (failedYears.length > 0 ? `${failedYears.length} edition year(s) failed to fetch this run. ` : "") +
        `Australia covered ${yearsCovered}.`
    );
  } else {
    report.success(
      gaugeId,
      `World Happiness Report, Life evaluation (Cantril ladder, 3-year avg) — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
