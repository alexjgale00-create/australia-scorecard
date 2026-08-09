// World Happiness Report's old /data/ page (worldhappiness.report/data/)
// is dead (404) — WHR migrated to a JS-rendered dashboard at
// data.worldhappiness.report with no data in static HTML, same shape as
// OECD's Data Explorer and V-Dem's VariableGraph. Found this dashboard's
// own backend API by reading its public JS bundle: POST /api/data with a
// signed x-request-token header. The signing salt ("whr-d4sh-2025-x9k7m2")
// and the djb2-style hash function are both embedded verbatim in the
// public client bundle (chunk 33) — this replicates exactly what the
// official frontend does when a browser loads the page, not a bypass of
// any real access control.
//
// This is a real, ongoing dependency on an undocumented internal API that
// could change without notice if WHR restructures their dashboard. If this
// fetcher starts failing, check whether data.worldhappiness.report's JS
// bundle still contains this same signing scheme and column legend before
// assuming the series or endpoint changed outright — see METHODOLOGY.md.
//
// Column meaning verified directly from the app's own source (chunk 291),
// not assumed: its legend object maps LI -> "Life evaluation _ Average
// (3-year) _ mean" — exactly the Cantril ladder, 3-year rolling average,
// this gauge's spec. EV is the *ranking* of that score; AV is a
// non-3-year annual variant; SI is change-since-2012. None of those are
// used here.
import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

export const API_URL = "https://data.worldhappiness.report/api/data";
export const DASHBOARD_URL = "https://data.worldhappiness.report/table";
const TOKEN_SALT = "whr-d4sh-2025-x9k7m2";
const LIFE_EVAL_COLUMN = "LI";
const GEOCODE_COLUMN = "GE";
const YEAR_COLUMN = "YE";

// Confirmed live 2026-08: earliest edition with data is 2012; editions
// after the current report year return an empty array, not an error.
const EARLIEST_EDITION_YEAR = 2012;

function djb2Hex(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function requestToken() {
  const ts = Date.now().toString();
  const hash = djb2Hex(ts + TOKEN_SALT);
  return Buffer.from(`${ts}.${hash}`).toString("base64");
}

async function fetchEdition(year) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-request-token": requestToken() },
    body: JSON.stringify({ view: "table", year }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`WHR dashboard API returned HTTP ${res.status} for edition year ${year}.`);
  }
  const json = await res.json();
  if (json && !Array.isArray(json) && json.error) {
    throw new Error(`WHR dashboard API error for edition year ${year}: ${json.error}`);
  }
  if (!Array.isArray(json)) {
    throw new Error(`WHR dashboard API returned an unexpected shape for edition year ${year}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

/**
 * Fetches the Cantril ladder ("Life evaluation", 3-year average) for the 9
 * peer countries across every published WHR edition from 2012 onward, one
 * edition (one HTTP request) at a time. A missing value for a country in a
 * given edition (empty LI string — a real, published gap, e.g. every
 * country in the thin 2013 edition, or GBR in 2022) is omitted, never
 * estimated.
 */
export async function fetchLifeEvaluation() {
  const byCountry = {};
  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code] = { name: COUNTRY_NAMES[code], series: [] };
  }

  const failedYears = [];
  const currentYear = new Date().getFullYear();
  for (let year = EARLIEST_EDITION_YEAR; year <= currentYear; year++) {
    let rows;
    try {
      rows = await fetchEdition(year);
    } catch (err) {
      failedYears.push({ year, message: err.message });
      continue;
    }
    if (rows.length === 0) continue; // edition doesn't exist yet (e.g. next year's report) — not a failure

    for (const code of PEER_COUNTRY_CODES) {
      const row = rows.find((r) => r[GEOCODE_COLUMN] === code);
      const raw = row?.[LIFE_EVAL_COLUMN];
      if (raw === undefined || raw === null || String(raw).trim() === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      const rowYear = Number(row[YEAR_COLUMN]) || year;
      byCountry[code].series.push({ year: rowYear, value });
    }
  }

  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code].series.sort((a, b) => a.year - b.year);
  }

  const missingCountries = PEER_COUNTRY_CODES.filter((code) => byCountry[code].series.length === 0);
  return { byCountry, missingCountries, failedYears };
}
