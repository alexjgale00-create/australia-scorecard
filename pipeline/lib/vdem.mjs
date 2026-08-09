// V-Dem's own dataset download is registration-gated (no direct URL), and
// the only freely-fetchable file, via V-Dem Institute's own GitHub org, is
// a 33MB R binary (.RData) with no safe dependency-free parsing path — see
// CLAUDE.md. This project instead fetches via Our World in Data's
// maintained, public re-publication of the same V-Dem series. This is a
// secondary source, and every gauge using it must say so: provenance
// records OWID's own citation chain verbatim (V-Dem version -> OWID
// dataset -> this site), never presented as a direct-from-V-Dem fetch.
//
// Two export quirks confirmed live 2026-07-16, both worked around below:
// - A `time=start..end` range (or `earliest..latest`) collapses to just the
//   two endpoint years — not a data gap, a quirk of this chart's CSV export
//   config. Requesting one explicit year at a time (`time=YYYY`) returns
//   the real annual value.
// - Once an explicit `time=YYYY` is present, the `country=` filter is
//   ignored and the full ~180-country file comes back instead of just the
//   9 peers — so this fetches the full per-year file and filters
//   client-side rather than trusting server-side filtering.
//
// Generalised 2026-08-09 (Phase E) into a factory so a second V-Dem-via-OWID
// indicator (v2clsocgrp, for cohesion-minority-experience) could reuse this
// exact proven route without duplicating it — the v2cacamps exports below
// are unchanged in behavior, just routed through the same factory a second
// indicator now also uses.
import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

/**
 * Builds a fetcher for one V-Dem indicator republished by Our World in
 * Data, given the chart's grapher slug and the CSV's short column name
 * (both must be confirmed live — see each gauge's dataPolicy for how).
 */
export function createVdemOwidFetcher(chartSlug, csvColumn) {
  const OWID_CHART_URL = `https://ourworldindata.org/grapher/${chartSlug}`;
  const METADATA_URL = `${OWID_CHART_URL}.metadata.json?v=1&csvType=filtered&useColumnShortNames=true`;

  function csvUrlForYear(year) {
    return `${OWID_CHART_URL}.csv?v=1&csvType=filtered&useColumnShortNames=true&time=${year}`;
  }

  /**
   * OWID's own citation chain for this indicator, fetched fresh each run
   * rather than hardcoded — a hardcoded version string would itself
   * silently go stale the moment OWID ingests a newer V-Dem release, which
   * defeats the point of disclosing the chain honestly. `nextUpdate` is
   * OWID's own self-reported refresh schedule; if this run's date has
   * passed it, that's a genuine signal OWID's republication may be lagging
   * V-Dem's latest release, not just this project being generically
   * cautious.
   */
  async function fetchMetadata() {
    const res = await fetch(METADATA_URL, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      throw new Error(`Our World in Data metadata endpoint returned HTTP ${res.status} (${METADATA_URL})`);
    }
    const json = await res.json();
    const column = json.columns?.[csvColumn];
    if (!column) {
      throw new Error(`Our World in Data metadata response had no "${csvColumn}" column — response shape may have changed.`);
    }
    return {
      citation: column.citationLong,
      lastUpdated: column.lastUpdated ?? null,
      nextUpdate: column.nextUpdate ?? null,
      timespan: column.timespan ?? null,
    };
  }

  async function fetchYear(year) {
    const url = csvUrlForYear(year);
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      throw new Error(`Our World in Data returned HTTP ${res.status} for year ${year} (${url})`);
    }
    const text = await res.text();
    const lines = text.trim().split("\n");
    const header = lines[0].split(",");
    const codeIdx = header.indexOf("code");
    const yearIdx = header.indexOf("year");
    const valueIdx = header.indexOf(csvColumn);
    if (codeIdx === -1 || yearIdx === -1 || valueIdx === -1) {
      throw new Error(`Unexpected CSV header from Our World in Data for year ${year}: "${lines[0]}"`);
    }

    const byCode = {};
    for (const line of lines.slice(1)) {
      const cols = line.split(",");
      const code = cols[codeIdx];
      if (!PEER_COUNTRY_CODES.includes(code)) continue;
      // Guard against a mismatched/clamped year being silently mislabeled.
      if (Number(cols[yearIdx]) !== year) continue;
      const value = Number(cols[valueIdx]);
      if (Number.isFinite(value)) byCode[code] = value;
    }
    return byCode;
  }

  /**
   * Fetches this indicator for the 9 peer countries, one calendar year at a
   * time (see file header for why), via Our World in Data's maintained
   * re-publication of V-Dem.
   */
  async function fetchSeries({ startYear, endYear }) {
    const byCountry = {};
    for (const code of PEER_COUNTRY_CODES) {
      byCountry[code] = { name: COUNTRY_NAMES[code], series: [] };
    }

    const failedYears = [];
    for (let year = startYear; year <= endYear; year++) {
      let byCode;
      try {
        byCode = await fetchYear(year);
      } catch {
        failedYears.push(year);
        continue;
      }
      for (const code of PEER_COUNTRY_CODES) {
        if (code in byCode) {
          byCountry[code].series.push({ year, value: byCode[code] });
        }
      }
    }

    for (const code of PEER_COUNTRY_CODES) {
      byCountry[code].series.sort((a, b) => a.year - b.year);
    }

    const missingCountries = PEER_COUNTRY_CODES.filter((code) => byCountry[code].series.length === 0);

    return { byCountry, missingCountries, failedYears };
  }

  return { OWID_CHART_URL, fetchMetadata, fetchSeries };
}

// --- internal-cohesion (v2cacamps, Political polarization) ---
// Unchanged behavior from before the 2026-08-09 generalisation — same slug,
// same column, same exported names, so internal-cohesion.mjs needed zero
// changes.
const politicalPolarization = createVdemOwidFetcher(
  "political-polarization-score",
  "v2cacamps__estimate_best"
);
export const OWID_CHART_URL = politicalPolarization.OWID_CHART_URL;
export const fetchVdemMetadata = politicalPolarization.fetchMetadata;
export const fetchVdemPolarization = politicalPolarization.fetchSeries;

// --- cohesion-minority-experience (v2clsocgrp, Social group equality in
// civil liberties) --- Chart slug and CSV column both confirmed live
// 2026-08-06 (see METHODOLOGY.md's "Quality of Life dimension"): the
// metadata endpoint's description matches the v2clsocgrp codebook
// definition word for word, and a real 2023 cross-section returned all 9
// peers.
export const socialGroupEquality = createVdemOwidFetcher(
  "equality-of-civil-liberties-across-social-groups-score",
  "socgr_civ_libs_vdem__estimate_best"
);
