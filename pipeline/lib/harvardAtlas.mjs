import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

export const ENDPOINT = "https://atlas.hks.harvard.edu/api/graphql";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function graphql(query) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Harvard Atlas GraphQL API returned HTTP ${res.status}: ${text.slice(0, 400)}`);
  const json = JSON.parse(text);
  if (json.errors) throw new Error(`Harvard Atlas GraphQL API returned errors: ${JSON.stringify(json.errors).slice(0, 400)}`);
  return json.data;
}

/**
 * The countryId values used by the countryYear query are UN M49 numeric
 * codes, not ISO3 (confirmed live: Australia = "country-36", matching
 * UN M49 036) — resolved dynamically via the locationCountry query rather
 * than hardcoded, since that's the one part of this integration that
 * could silently drift if Harvard ever renumbers.
 */
async function resolveCountryIds() {
  const data = await graphql(`{ locationCountry { countryId iso3Code } }`);
  const byIso3 = {};
  for (const c of data.locationCountry) byIso3[c.iso3Code] = c.countryId;
  return byIso3;
}

/**
 * Fetches ECI (Economic Complexity Index) for the 9 peer countries via
 * Harvard Growth Lab's public, unauthenticated GraphQL API — verified
 * live 2026-07-14, confirmed via schema introspection
 * (atlas.hks.harvard.edu/api/graphql) rather than assumed from docs.
 */
export async function fetchHarvardAtlasEci({ startYear }) {
  const idsByIso3 = await resolveCountryIds();

  const byCountry = {};
  const missingCountries = [];
  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code] = { name: COUNTRY_NAMES[code], series: [] };
    const countryId = idsByIso3[code];
    if (!countryId) {
      missingCountries.push(code);
      continue;
    }
    const numericId = countryId.replace("country-", "");
    const data = await graphql(
      `{ countryYear(countryId: ${numericId}, yearMin: ${startYear}, yearMax: ${new Date().getFullYear()}) { year eci } }`
    );
    for (const point of data.countryYear ?? []) {
      if (point.eci === null || point.eci === undefined) continue;
      byCountry[code].series.push({ year: point.year, value: point.eci });
    }
    byCountry[code].series.sort((a, b) => a.year - b.year);
    if (byCountry[code].series.length === 0) missingCountries.push(code);
  }

  return { byCountry, missingCountries };
}
