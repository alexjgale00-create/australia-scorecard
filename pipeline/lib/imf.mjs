import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

/**
 * IMF's DataMapper API (the same one powering imf.org/external/datamapper)
 * — not the old SDMX service at dataservices.imf.org, which is unreachable
 * (verified live: the request times out entirely, not just a bad status).
 * DataMapper returns ALL ~228 countries in one response regardless of any
 * country code in the URL, so we fetch once and pull out our peer set.
 *
 * IMF's WEO dataset mixes its own forward projections in with actuals, with
 * no machine-readable flag in this API to tell them apart. To avoid ever
 * presenting a forecast as an achieved fact, any year from the current
 * calendar year onward is excluded — a deliberately conservative,
 * documented policy (see METHODOLOGY.md), not a claim that IMF's own
 * current-year estimate is wrong.
 */
export async function fetchImfDataMapperIndicator(indicatorId) {
  const url = `https://www.imf.org/external/datamapper/api/v1/${encodeURIComponent(indicatorId)}`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  } catch (err) {
    throw new Error(`Could not reach the IMF DataMapper API (${err.message}) for indicator "${indicatorId}".`);
  }

  if (!res.ok) {
    throw new Error(`IMF DataMapper API returned HTTP ${res.status} for indicator "${indicatorId}".`);
  }

  const json = await res.json();
  const allValues = json?.values?.[indicatorId];
  if (!allValues || typeof allValues !== "object") {
    throw new Error(
      `IMF DataMapper API returned an unexpected response shape for indicator "${indicatorId}" — the indicator ID is likely wrong or renamed.`
    );
  }

  const currentYear = new Date().getFullYear();
  const byCountry = {};
  for (const code of PEER_COUNTRY_CODES) {
    const countryValues = allValues[code];
    byCountry[code] = { name: COUNTRY_NAMES[code], series: [] };
    if (!countryValues) continue;
    for (const [yearStr, value] of Object.entries(countryValues)) {
      const year = Number(yearStr);
      if (year >= currentYear) continue; // exclude IMF's own forward projections
      if (value === null || value === undefined) continue;
      byCountry[code].series.push({ year, value });
    }
    byCountry[code].series.sort((a, b) => a.year - b.year);
  }

  const missingCountries = PEER_COUNTRY_CODES.filter((c) => byCountry[c].series.length === 0);

  return { byCountry, missingCountries };
}
