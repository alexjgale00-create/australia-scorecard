// Thin wrapper around the World Bank Indicators API (api.worldbank.org).
// Fetches one indicator for the fixed 9-country peer set in a single
// request. Throws on hard failures (bad HTTP status, unknown indicator,
// zero data at all); a country with zero data points but the indicator
// otherwise working is reported back as a gap, not an error — the caller
// decides whether that's a warning or acceptable.

export const PEER_COUNTRY_CODES = ["AUS", "CAN", "GBR", "NZL", "KOR", "NLD", "USA", "DEU", "JPN"];

export const COUNTRY_NAMES = {
  AUS: "Australia",
  CAN: "Canada",
  GBR: "United Kingdom",
  NZL: "New Zealand",
  KOR: "South Korea",
  NLD: "Netherlands",
  USA: "United States",
  DEU: "Germany",
  JPN: "Japan",
};

/**
 * Builds the structured missingCountries provenance list every gauge module
 * should attach whenever it can't cover all 9 peers — never just a code
 * list, since the site must name each one and say why, not just show 8
 * dots with no explanation.
 */
export function buildMissingCountries(codes, reason) {
  return codes.map((code) => ({ code, name: COUNTRY_NAMES[code], reason }));
}

async function fetchWorldBankRaw(indicatorId, countryCodes, { startYear = 1980, endYear } = {}) {
  const finalEndYear = endYear ?? new Date().getFullYear();
  const url =
    `https://api.worldbank.org/v2/country/${countryCodes}/indicator/${encodeURIComponent(indicatorId)}` +
    `?format=json&per_page=20000&date=${startYear}:${finalEndYear}`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  } catch (err) {
    throw new Error(`Could not reach the World Bank API (${err.message}) for indicator "${indicatorId}".`);
  }

  if (!res.ok) {
    throw new Error(`World Bank API returned HTTP ${res.status} for indicator "${indicatorId}".`);
  }

  const json = await res.json();

  if (!Array.isArray(json) || json.length < 2) {
    const message = json?.[0]?.message?.[0]?.value;
    throw new Error(
      message
        ? `World Bank API error for indicator "${indicatorId}": ${message}`
        : `World Bank API returned an unexpected response shape for indicator "${indicatorId}".`
    );
  }

  const [, records] = json;
  if (!records || records.length === 0) {
    throw new Error(
      `World Bank API returned zero records for indicator "${indicatorId}" (countries: ${countryCodes}) — the indicator ID is likely wrong, deprecated, or archived.`
    );
  }

  return records;
}

export async function fetchWorldBankSeries(indicatorId, { startYear = 1980, endYear } = {}) {
  const records = await fetchWorldBankRaw(indicatorId, PEER_COUNTRY_CODES.join(";"), {
    startYear,
    endYear,
  });

  const byCountry = {};
  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code] = { name: COUNTRY_NAMES[code], series: [] };
  }

  for (const r of records) {
    const code = r.countryiso3code;
    if (!byCountry[code]) continue; // ignore aggregates/regions
    if (r.value === null || r.value === undefined) continue; // missing year — omit, never estimate
    byCountry[code].series.push({ year: Number(r.date), value: r.value });
  }

  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code].series.sort((a, b) => a.year - b.year);
  }

  const missingCountries = PEER_COUNTRY_CODES.filter((c) => byCountry[c].series.length === 0);

  return { byCountry, missingCountries };
}

/**
 * World Bank publishes a "WLD" aggregate for many indicators — the sum
 * across all reporting countries — which lets us compute "Australia's
 * share of the world total" without summing ~200 countries ourselves.
 * Returns a year -> value map; throws if the WLD aggregate isn't published
 * for this indicator (never silently falls back to summing peers only,
 * which would understate the true world total).
 */
export async function fetchWorldBankWorldTotal(indicatorId, { startYear = 1980, endYear } = {}) {
  const records = await fetchWorldBankRaw(indicatorId, "WLD", { startYear, endYear });
  const byYear = new Map();
  for (const r of records) {
    if (r.value === null || r.value === undefined) continue;
    byYear.set(Number(r.date), r.value);
  }
  if (byYear.size === 0) {
    throw new Error(
      `World Bank has no "WLD" (world total) aggregate values for indicator "${indicatorId}" — cannot compute a share of world total.`
    );
  }
  return byYear;
}
