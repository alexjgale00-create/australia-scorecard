// Coordinates verified live 2026-07-14 (the dataflow exists, under this
// exact agency/id/version — found via OECD's dataflow catalog before
// sdmx.oecd.org's Cloudflare bot-protection blocked further requests).
// The "all" key (no dimension filter) is used because PDB_LV's dimension
// order was never confirmed against a real response — safer to fetch
// broadly and filter by country client-side than guess a positional key
// and silently mis-slice it.
//
// A live run returned HTTP 500 with "all" + only startPeriod bounded (no
// endPeriod) — plausibly a query too large/expensive for OECD's server,
// since PDB_LV likely spans many countries x measures x industries. Adding
// an endPeriod bound shrinks the response; this doesn't fix a wrong key,
// but it's a safe change (can only reduce what comes back, never corrupt
// it) worth ruling out before assuming the cause is something else.
import { fetchOecdSdmxData } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "productivity";
const DATAFLOW = "OECD.SDD.TPS,DSD_PDB@DF_PDB_LV,1.0";

export async function run(config, report) {
  const { byCountry, missingCountries } = await fetchOecdSdmxData(DATAFLOW, "all", {
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
