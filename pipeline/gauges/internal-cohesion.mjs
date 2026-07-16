// Automated 2026-07-16 after the site owner proposed it, on one condition:
// this is a secondary source (Our World in Data's re-publication of
// V-Dem, not V-Dem directly — V-Dem's own dataset download is
// registration-gated), so every part of the chain must be disclosed
// honestly rather than implied as a direct V-Dem fetch. See
// pipeline/lib/vdem.mjs and CLAUDE.md's "Internal cohesion: automated via
// OWID" entry for the coverage verification and export quirks this works
// around.
import { fetchVdemPolarization, fetchVdemMetadata, OWID_CHART_URL } from "../lib/vdem.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "internal-cohesion";

function describeStaleness(metadata) {
  if (!metadata.nextUpdate) return "";
  const overdue = new Date() > new Date(metadata.nextUpdate);
  return overdue
    ? ` OWID's own scheduled refresh for this indicator was due ${metadata.nextUpdate} and has not landed yet as of this run — their republication may be lagging V-Dem's latest release; worth checking v-dem.net directly if this note is more than a few months old.`
    : ` OWID's next scheduled refresh of this indicator is due ${metadata.nextUpdate}.`;
}

export async function run(config, report) {
  const metadata = await fetchVdemMetadata();
  const { byCountry, missingCountries, failedYears } = await fetchVdemPolarization({
    startYear: config.historyStartYear,
    endYear: new Date().getFullYear(),
  });

  const retrievedAt = new Date().toISOString();
  writeGaugeData({
    gaugeId,
    provenance: {
      status: "LIVE",
      institution: config.source.institution,
      seriesId: config.source.seriesId,
      seriesName: config.source.seriesName,
      url: OWID_CHART_URL,
      retrievedAt,
      note:
        `Full source chain: ${metadata.citation} — fetched via OWID's grapher CSV export ` +
        `(${OWID_CHART_URL}), not directly from V-Dem (V-Dem's own dataset download is ` +
        `registration-gated; see CLAUDE.md). OWID last updated this indicator ${metadata.lastUpdated ?? "unknown date"}.` +
        describeStaleness(metadata) +
        (missingCountries.length > 0 ? ` No data available for: ${missingCountries.join(", ")}.` : "") +
        (failedYears.length > 0
          ? ` Fetch failed for ${failedYears.length} year(s) this run (${failedYears.join(", ")}) — those years are simply absent from the series below, not estimated.`
          : ""),
      missingCountries: buildMissingCountries(
        missingCountries,
        "V-Dem has no v2cacamps value on file for this country via OWID's republication."
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
      `Saved via OWID's V-Dem re-publication, but incomplete: ` +
        (missingCountries.length > 0 ? `no data for ${missingCountries.join(", ")}. ` : "") +
        (failedYears.length > 0 ? `${failedYears.length} year(s) failed to fetch this run. ` : "") +
        `Australia covered ${yearsCovered}.`
    );
  } else {
    report.success(
      gaugeId,
      `${metadata.citation} — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
