import { loadWorkbook } from "./xlsx.mjs";
import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// SIPRI's own country names don't always match this project's World Bank
// -derived COUNTRY_NAMES (confirmed live: "Korea, South" and "United
// States of America", not "South Korea" / "United States") — mapped
// explicitly per code rather than fuzzy-matched, so a silent near-miss
// can't slip a country through with a wrong row.
const SIPRI_NAME_BY_CODE = {
  AUS: "Australia",
  CAN: "Canada",
  GBR: "United Kingdom",
  NZL: "New Zealand",
  KOR: "Korea, South",
  NLD: "Netherlands",
  USA: "United States of America",
  DEU: "Germany",
  JPN: "Japan",
};

/**
 * SIPRI revises this file's name (year range, version suffix) with every
 * update — confirmed live: "SIPRI-Milex-data-1949-2025_v1.2.xlsx" as of
 * 2026-07. Hardcoding that filename would silently start 404ing after the
 * next revision, so this discovers the current download link from the
 * database page itself each run, the same "discover, don't hardcode"
 * pattern already used for OECD's dimension lists.
 */
async function discoverDownloadUrl() {
  const pageUrl = "https://www.sipri.org/databases/milex";
  const res = await fetch(pageUrl, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`SIPRI's database page returned HTTP ${res.status} — could not discover the current download link.`);
  const html = await res.text();
  const match = html.match(/href="([^"]*SIPRI-Milex-data[^"]*\.xlsx)"/i);
  if (!match) {
    throw new Error(
      `SIPRI's database page at ${pageUrl} didn't contain a recognisable .xlsx download link — the page structure may have changed.`
    );
  }
  return match[1].startsWith("//") ? `https:${match[1]}` : match[1];
}

/**
 * Fetches SIPRI's Military Expenditure Database and extracts the "Share
 * of GDP" sheet for our 9 peer countries. Values in that sheet are stored
 * as fractions (0.025 = 2.5%) — converted to percentage points here to
 * match this gauge's configured unit.
 */
export async function fetchSipriShareOfGdp({ startYear }) {
  const downloadUrl = await discoverDownloadUrl();

  const fileRes = await fetch(downloadUrl, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": USER_AGENT } });
  if (!fileRes.ok) throw new Error(`SIPRI's data file returned HTTP ${fileRes.status} fetching ${downloadUrl}.`);
  const buf = Buffer.from(await fileRes.arrayBuffer());

  const workbook = loadWorkbook(buf);
  const sheet = workbook.getSheet("Share of GDP");

  // Header row is wherever column A literally says "Country" — found by
  // scanning rather than a hardcoded row number, since SIPRI adds
  // explanatory notes rows above it that have shifted before between
  // editions.
  const rowNums = Object.keys(sheet.rows).map(Number).sort((a, b) => a - b);
  const headerRowNum = rowNums.find((rn) => sheet.rows[rn].A === "Country");
  if (!headerRowNum) throw new Error(`Could not find the header row (column A = "Country") in SIPRI's "Share of GDP" sheet — the sheet layout may have changed.`);
  const headerRow = sheet.rows[headerRowNum];

  const yearCols = {};
  for (const [col, val] of Object.entries(headerRow)) {
    if (/^\d{4}$/.test(val) && Number(val) >= startYear) yearCols[val] = col;
  }
  if (Object.keys(yearCols).length === 0) {
    throw new Error(`Found SIPRI's header row but no year columns from ${startYear} onward — the sheet layout may have changed.`);
  }

  const byCountry = {};
  const missingCountries = [];
  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code] = { name: COUNTRY_NAMES[code], series: [] };
    const sipriName = SIPRI_NAME_BY_CODE[code];
    const rowNum = rowNums.find((rn) => sheet.rows[rn].A === sipriName);
    if (!rowNum) {
      missingCountries.push(code);
      continue;
    }
    const row = sheet.rows[rowNum];
    for (const [year, col] of Object.entries(yearCols)) {
      const raw = row[col];
      // "..." = not available, "xxx" = country didn't exist that year —
      // both are legitimate gaps, never estimated.
      if (raw === undefined || raw === null || raw === "..." || raw === "xxx" || raw === "") continue;
      const num = Number(raw);
      if (Number.isNaN(num)) continue;
      byCountry[code].series.push({ year: Number(year), value: num * 100 });
    }
    byCountry[code].series.sort((a, b) => a.year - b.year);
    if (byCountry[code].series.length === 0) missingCountries.push(code);
  }

  return { byCountry, missingCountries, sourceUrl: downloadUrl };
}
