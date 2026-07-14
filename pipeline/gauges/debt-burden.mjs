// Sums two separate BIS Total Credit series — household & NPISH debt, and
// general government debt, both % of GDP — into one "debt burden" figure,
// per the brief's "household debt % GDP + govt debt % GDP" definition.
import { fetchBisTotalCreditQ4 } from "../lib/bis.mjs";
import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "../lib/worldbank.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";

export const gaugeId = "debt-burden";

export async function run(config, report) {
  const [household, government] = await Promise.all([
    fetchBisTotalCreditQ4("H"),
    fetchBisTotalCreditQ4("G"),
  ]);

  const countries = {};
  const missingCountries = [];
  for (const code of PEER_COUNTRY_CODES) {
    const h = household[code] || {};
    const g = government[code] || {};
    const years = [...new Set([...Object.keys(h), ...Object.keys(g)])].map(Number).sort((a, b) => a - b);

    const series = [];
    for (const year of years) {
      if (h[year] === undefined || g[year] === undefined) continue; // only years with BOTH series
      series.push({ year, value: Math.round((h[year] + g[year]) * 10) / 10 });
    }
    countries[code] = { name: COUNTRY_NAMES[code], series };

    if (series.length === 0) {
      const hasHousehold = Object.keys(h).length > 0;
      const hasGovernment = Object.keys(g).length > 0;
      let reason;
      if (!hasHousehold && !hasGovernment) {
        reason = "BIS has not published either household or government debt (at market value) for this country.";
      } else if (!hasGovernment) {
        // Verified live 2026-07-14 for New Zealand specifically: BIS does publish NZ general
        // government debt, but only at nominal value, not market value — the basis used for the
        // other 8 countries. We don't mix valuation bases to fill the gap; we disclose it instead.
        reason =
          "BIS publishes this country's household debt at market value, but its general government " +
          "debt only at nominal value — not the market-value basis used for the other countries in " +
          "this comparison, so we don't mix bases to fill the gap.";
      } else {
        reason = "BIS has not published this country's household debt at market value.";
      }
      missingCountries.push({ code, name: COUNTRY_NAMES[code], reason });
    }
  }

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
        `Sum of two BIS Total Credit series — household & NPISH debt, and general government debt, ` +
        `both % of GDP, market value, adjusted for breaks — year-end (Q4) snapshots only.` +
        (missingCountries.length > 0
          ? ` No data available for: ${missingCountries.map((m) => m.name).join(", ")}.`
          : ""),
      missingCountries,
    },
    countries,
  });

  const ausSeries = countries.AUS.series;
  const yearsCovered = ausSeries.length
    ? `${ausSeries[0].year}–${ausSeries[ausSeries.length - 1].year}`
    : "no AUS data";

  if (missingCountries.length > 0) {
    report.warning(
      gaugeId,
      `Saved (household + government debt summed), gap for: ${missingCountries.map((m) => m.name).join(", ")}. Australia covered ${yearsCovered}.`
    );
  } else {
    report.success(
      gaugeId,
      `BIS, household + government debt (% GDP) — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
