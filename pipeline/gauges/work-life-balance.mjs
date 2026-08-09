// Coordinates found 2026-08-09 via corroborated web search (multiple
// independent results, including OECD's own Data Explorer URL whose page
// title — "Average annual hours actually worked per worker" — matches this
// gauge's unit/oneLiner exactly): OECD.ELS.SAE,DSD_HW@DF_AVG_ANN_HRS_WKD,1.0.
// NOT independently confirmed live from this project's own sandbox — the
// same documented Cloudflare bot-protection block that hit the original
// OECD SDMX trio (see CLAUDE.md) reproduced today (2026-08-09) on this
// exact dataflow's structure endpoint, HTTP 403 "Just a moment...". Per
// housing-pressure's own precedent (blocked here, not blocked from GitHub
// Actions), this is written as a single good-faith attempt using the
// generic discovery helper (REF_AREA pinned to the 9 peers, every other
// dimension left as an SDMX wildcard) with NO dimension pins guessed in
// advance — there is no live conflict information to pin against yet. Per
// the site owner's explicit stopping rule: if this fails structurally
// (not just an access block) when actually run via Actions, it moves to
// the manual lane, not a second guess.
import { fetchOecdCountryData } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "work-life-balance";
const DATAFLOW = "OECD.ELS.SAE,DSD_HW@DF_AVG_ANN_HRS_WKD,1.0";

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
        `Live data from ${config.source.institution}, Average annual hours actually worked per worker.` +
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
    report.success(
      gaugeId,
      `${config.source.institution}, Average annual hours actually worked per worker — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
