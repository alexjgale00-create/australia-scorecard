import { PEER_COUNTRY_CODES } from "./worldbank.mjs";

// BIS's Total Credit statistics use ISO 2-letter country codes, not the
// ISO3 codes every other source in this pipeline uses — verified live
// (querying with "AUS" etc. returns nothing; "AU" works).
const ISO3_TO_BIS_ISO2 = {
  AUS: "AU",
  CAN: "CA",
  GBR: "GB",
  NZL: "NZ",
  KOR: "KR",
  NLD: "NL",
  USA: "US",
  DEU: "DE",
  JPN: "JP",
};
const BIS_ISO2_TO_ISO3 = Object.fromEntries(
  Object.entries(ISO3_TO_BIS_ISO2).map(([iso3, iso2]) => [iso2, iso3])
);

function parseCsvLine(line) {
  // BIS's TITLE_TS field never contains a literal comma (it uses " - " as a
  // separator), so a naive split would be safe here, but this guards
  // against quoted fields regardless.
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      fields.push(cur);
      cur = "";
      continue;
    }
    cur += char;
  }
  fields.push(cur);
  return fields;
}

/**
 * Fetches BIS Total Credit (WS_TC), % of GDP, market value, adjusted for
 * breaks, quarterly — for one borrower sector across the peer set, and
 * returns only year-end (Q4) snapshots as { ISO3: { year: value } }.
 */
export async function fetchBisTotalCreditQ4(borrowerCode) {
  const bisCountries = PEER_COUNTRY_CODES.map((c) => ISO3_TO_BIS_ISO2[c]).join("+");
  const url = `https://stats.bis.org/api/v1/data/WS_TC/Q.${bisCountries}.${borrowerCode}.A.M.770.A/all?format=csv`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch (err) {
    throw new Error(
      `Could not reach the BIS statistics API (${err.message}) for borrower sector "${borrowerCode}".`
    );
  }
  if (!res.ok) {
    throw new Error(`BIS API returned HTTP ${res.status} for borrower sector "${borrowerCode}".`);
  }

  const text = await res.text();
  if (text.trim().startsWith("<?xml")) {
    throw new Error(
      `BIS API returned an error response for borrower sector "${borrowerCode}" — likely no data for this query key.`
    );
  }

  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    throw new Error(`BIS API returned no rows for borrower sector "${borrowerCode}".`);
  }
  const header = parseCsvLine(lines[0]);
  const countryIdx = header.indexOf("BORROWERS_CTY");
  const timeIdx = header.indexOf("TIME_PERIOD");
  const valueIdx = header.indexOf("OBS_VALUE");
  if (countryIdx === -1 || timeIdx === -1 || valueIdx === -1) {
    throw new Error(
      `BIS API response for borrower sector "${borrowerCode}" is missing an expected column — the CSV shape may have changed.`
    );
  }

  const byCountry = {};
  for (const code of PEER_COUNTRY_CODES) byCountry[code] = {};

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    const iso3 = BIS_ISO2_TO_ISO3[fields[countryIdx]];
    const period = fields[timeIdx];
    if (!iso3 || !period || !period.endsWith("-Q4")) continue; // year-end snapshots only
    const value = Number(fields[valueIdx]);
    if (Number.isNaN(value)) continue;
    byCountry[iso3][Number(period.slice(0, 4))] = value;
  }

  return byCountry;
}
