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
import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

const CHART_SLUG = "political-polarization-score";
export const OWID_CHART_URL = `https://ourworldindata.org/grapher/${CHART_SLUG}`;
const CSV_COLUMN = "v2cacamps__estimate_best";
const METADATA_URL = `${OWID_CHART_URL}.metadata.json?v=1&csvType=filtered&useColumnShortNames=true`;

function csvUrlForYear(year) {
  return `${OWID_CHART_URL}.csv?v=1&csvType=filtered&useColumnShortNames=true&time=${year}`;
}

/**
 * OWID's own citation chain for this indicator, fetched fresh each run
 * rather than hardcoded — a hardcoded "V-Dem v16" string would itself
 * silently go stale the moment OWID ingests a newer V-Dem release, which
 * defeats the point of disclosing the chain honestly. `nextUpdate` is
 * OWID's own self-reported refresh schedule for this indicator; if this
 * run's date has passed it, that's a genuine signal OWID's republication
 * may be lagging V-Dem's latest release, not just this project being
 * generically cautious.
 */
export async function fetchVdemMetadata() {
  const res = await fetch(METADATA_URL, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    throw new Error(`Our World in Data metadata endpoint returned HTTP ${res.status} (${METADATA_URL})`);
  }
  const json = await res.json();
  const column = json.columns?.[CSV_COLUMN];
  if (!column) {
    throw new Error(`Our World in Data metadata response had no "${CSV_COLUMN}" column — response shape may have changed.`);
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
  const valueIdx = header.indexOf(CSV_COLUMN);
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
 * Fetches V-Dem's v2cacamps (Political polarization) for the 9 peer
 * countries, one calendar year at a time (see file header for why), via
 * Our World in Data's maintained re-publication of V-Dem.
 */
export async function fetchVdemPolarization({ startYear, endYear }) {
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
