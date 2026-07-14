// Verified live 2026-07-14: Harvard Growth Lab's Atlas of Economic
// Complexity exposes a public, unauthenticated GraphQL API
// (atlas.hks.harvard.edu/api/graphql, documented at
// github.com/harvard-growth-lab/api-docs) — confirmed via schema
// introspection, not assumed from the docs page alone. Fetched here
// rather than entered by hand.
import { fetchHarvardAtlasEci, ENDPOINT } from "../lib/harvardAtlas.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "economic-complexity";

export async function run(config, report) {
  const { byCountry, missingCountries } = await fetchHarvardAtlasEci({
    startYear: config.historyStartYear,
  });

  writeGaugeData({
    gaugeId,
    provenance: {
      status: "LIVE",
      institution: config.source.institution,
      seriesId: config.source.seriesId,
      seriesName: config.source.seriesName,
      url: ENDPOINT,
      retrievedAt: new Date().toISOString(),
      note:
        `Live data: automated fetch of the Economic Complexity Index via the Atlas's public GraphQL API.` +
        (missingCountries.length > 0 ? ` No data available for: ${missingCountries.join(", ")}.` : ""),
      missingCountries: buildMissingCountries(
        missingCountries,
        `${config.source.institution} has not published ECI for this country/period.`
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
    report.success(gaugeId, `${config.source.institution}, Atlas of Economic Complexity — 9 countries, Australia ${yearsCovered}. Saved.`);
  }
}
