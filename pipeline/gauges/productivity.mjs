// Coordinates verified live 2026-07-14 (the dataflow exists, under this
// exact agency/id/version — found via OECD's dataflow catalog before
// sdmx.oecd.org's Cloudflare bot-protection blocked further requests).
//
// The bare "all" key crashed OECD's server (HTTP 500, .NET-style
// null-reference error) on a live run — apparently not well-supported by
// this deployment, regardless of bounding by date. Now discovers PDB_LV's
// real dimension list and builds a correctly-shaped key (REF_AREA pinned to
// our 9 peers, every other dimension explicitly blank) via
// fetchOecdCountryData. If PDB_LV bundles multiple measures/subjects into
// one series per country/year, the parser's duplicate-value check will
// throw a clear "ambiguous data" error rather than silently pick one.
import { fetchOecdCountryData } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "productivity";
const DATAFLOW = "OECD.SDD.TPS,DSD_PDB@DF_PDB_LV,1.0";

export async function run(config, report) {
  const { byCountry, missingCountries } = await fetchOecdCountryData(DATAFLOW, {
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
        `Live data from ${config.source.institution}, Productivity Database.` +
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
    report.success(gaugeId, `${config.source.institution}, Productivity Database — 9 countries, Australia ${yearsCovered}. Saved.`);
  }
}
