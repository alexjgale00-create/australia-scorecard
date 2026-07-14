// This gauge averages two separate World Bank WGI governance estimates
// (Rule of Law, Control of Corruption) into a single value per country per
// year — only for years where BOTH component series have a real value.
import { buildMissingCountries, fetchWorldBankSeries } from "../lib/worldbank.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";

export const gaugeId = "rule-of-law-corruption";

export async function run(config, report) {
  const componentIds = config.source.componentSeriesIds;
  if (!componentIds || componentIds.length !== 2) {
    throw new Error(
      `"rule-of-law-corruption" expects exactly 2 componentSeriesIds in gauges.config.json, found ${componentIds?.length ?? 0}.`
    );
  }
  const [ruleOfLawId, corruptionId] = componentIds.map((c) => c.id);

  const [ruleOfLaw, corruption] = await Promise.all([
    fetchWorldBankSeries(ruleOfLawId, { startYear: config.historyStartYear }),
    fetchWorldBankSeries(corruptionId, { startYear: config.historyStartYear }),
  ]);

  const combined = {};
  const missingCountries = [];
  for (const code of Object.keys(ruleOfLaw.byCountry)) {
    const rl = ruleOfLaw.byCountry[code];
    const cc = corruption.byCountry[code];
    const rlByYear = new Map(rl.series.map((p) => [p.year, p.value]));
    const ccByYear = new Map(cc.series.map((p) => [p.year, p.value]));
    const years = [...new Set([...rlByYear.keys(), ...ccByYear.keys()])].sort((a, b) => a - b);

    const series = [];
    for (const year of years) {
      const rlValue = rlByYear.get(year);
      const ccValue = ccByYear.get(year);
      if (rlValue === undefined || ccValue === undefined) continue; // only average where both exist
      series.push({ year, value: Math.round(((rlValue + ccValue) / 2) * 1000) / 1000 });
    }
    combined[code] = { name: rl.name, series };
    if (series.length === 0) missingCountries.push(code);
  }

  writeGaugeData({
    gaugeId,
    provenance: {
      status: "LIVE",
      institution: config.source.institution,
      seriesId: `${ruleOfLawId} + ${corruptionId} (averaged)`,
      seriesName: config.source.seriesName,
      url: config.source.url,
      retrievedAt: new Date().toISOString(),
      note:
        `Average of two World Bank WGI governance estimates: ${ruleOfLawId} (Rule of Law) and ` +
        `${corruptionId} (Control of Corruption), averaged only for years where both are available.` +
        (missingCountries.length > 0 ? ` No overlapping data for: ${missingCountries.join(", ")}.` : ""),
      missingCountries: buildMissingCountries(
        missingCountries,
        "World Bank has no year where both the Rule of Law and Control of Corruption WGI estimates are available for this country."
      ),
    },
    countries: combined,
  });

  const ausSeries = combined.AUS.series;
  const yearsCovered = ausSeries.length
    ? `${ausSeries[0].year}–${ausSeries[ausSeries.length - 1].year}`
    : "no AUS data";

  if (missingCountries.length > 0) {
    report.warning(
      gaugeId,
      `Saved (averaged 2 WGI series), gap for: ${missingCountries.join(", ")}. Australia covered ${yearsCovered}.`
    );
  } else {
    report.success(
      gaugeId,
      `World Bank WGI, ${ruleOfLawId}+${corruptionId} averaged — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
