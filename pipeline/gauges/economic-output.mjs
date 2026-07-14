// Unlike Trade, this is NOT derived by us — IMF publishes "share of world
// GDP (PPP)" directly as PPPSH, so we use it as-is.
import { fetchImfDataMapperIndicator } from "../lib/imf.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";

export const gaugeId = "economic-output";

export async function run(config, report) {
  const seriesId = config.source.seriesId;
  const { byCountry, missingCountries } = await fetchImfDataMapperIndicator(seriesId);

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
        `Live data from ${config.source.institution} World Economic Outlook, published directly as ` +
        `a share of world GDP (PPP) — not derived by us. Years from the current calendar year ` +
        `onward are excluded: IMF's WEO dataset mixes its own forward projections in with actuals ` +
        `with no machine-readable flag to tell them apart in this API, so any year that could be a ` +
        `forecast is left out rather than risk presenting a projection as an achieved fact.` +
        (missingCountries.length > 0 ? ` No data available for: ${missingCountries.join(", ")}.` : ""),
      missingCountries: buildMissingCountries(
        missingCountries,
        `${config.source.institution} World Economic Outlook has not published this indicator for this country, or only as a projection we've excluded.`
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
      `${config.source.institution} WEO, ${seriesId} — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
