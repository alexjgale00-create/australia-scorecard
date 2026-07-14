import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// The /data endpoint and the /dataflow (structure) endpoint negotiate
// content type independently and don't accept the same values — confirmed
// live: sending the data endpoint's Accept header to /dataflow got HTTP 406,
// with the response body listing exactly what it does accept. This parser
// reads XML (`<structure:Dimension id="...">`), so it asks for the XML
// structure format specifically, not whatever the server would default to.
const DATA_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/vnd.sdmx.data+json",
};
const STRUCTURE_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/vnd.sdmx.structure+xml;version=2.1",
};

const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);
const RETRY_DELAYS_MS = [1000, 2000, 4000];

function snippet(text, max = 400) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a dataflow's data structure definition and returns its dimension
 * IDs in order (e.g. ["REF_AREA", "SEX", "AGE", ...]) — this is what lets
 * us build a correctly-shaped key instead of guessing a dimension count.
 * `dataflowPath` is the comma-separated "AGENCY,ID,VERSION" form used
 * throughout this file; the structure endpoint wants it slash-separated.
 */
export async function fetchOecdDataflowDimensions(dataflowPath) {
  const [agency, id, version] = dataflowPath.split(",");
  const url = `https://sdmx.oecd.org/public/rest/dataflow/${agency}/${id}/${version}?references=children`;

  const res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: STRUCTURE_HEADERS });
  const text = await res.text();

  if (res.status === 403 && (text.includes("Just a moment") || text.trim().startsWith("<!DOCTYPE"))) {
    throw new Error(
      `OECD's SDMX API returned a Cloudflare bot-protection challenge page instead of the data structure ` +
        `(HTTP 403) for "${dataflowPath}". This is an IP/network-reputation block — see CLAUDE.md.`
    );
  }
  if (!res.ok) {
    throw new Error(
      `OECD SDMX API returned HTTP ${res.status} fetching the data structure for "${dataflowPath}": ${snippet(text)}`
    );
  }

  const dimensionRe = /<structure:Dimension\s+[^>]*\bid="([^"]+)"/g;
  const dims = [];
  let m;
  while ((m = dimensionRe.exec(text)) !== null) {
    dims.push(m[1]);
  }
  if (dims.length === 0) {
    throw new Error(
      `OECD SDMX API returned a data structure for "${dataflowPath}" with no dimensions found — the ` +
        `response shape may differ from what this was written against: ${snippet(text)}`
    );
  }
  return dims;
}

/**
 * Fetches one OECD SDMX dataflow, retrying server errors (500/502/503/504)
 * and network failures with backoff — those are plausibly transient. 4xx
 * responses (403, 404, etc.) are never retried: a wrong dataflow/key or a
 * persistent block doesn't get better on attempt 2.
 *
 * sdmx.oecd.org sits behind Cloudflare bot-protection for at least some
 * source IPs (confirmed from this repo's own sandbox: HTTP 403 with a JS
 * challenge page). But it is NOT a blanket block — verified 2026-07,
 * requests from a GitHub Actions runner got real API responses (404/500),
 * not challenge pages. So a 403-with-challenge-page is reported distinctly
 * from an ordinary HTTP error, since the two have different fixes.
 */
export async function fetchOecdSdmxData(dataflowPath, key, { startPeriod, endPeriod } = {}) {
  const url =
    `https://sdmx.oecd.org/public/rest/data/${dataflowPath}/${key}?format=jsondata` +
    `${startPeriod ? `&startPeriod=${startPeriod}` : ""}` +
    `${endPeriod ? `&endPeriod=${endPeriod}` : ""}`;

  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let res;
    let text;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: DATA_HEADERS });
      text = await res.text();
    } catch (err) {
      lastErr = new Error(`Could not reach the OECD SDMX API (${err.message}).`);
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw lastErr;
    }

    if (res.status === 403 && (text.includes("Just a moment") || text.trim().startsWith("<!DOCTYPE"))) {
      throw new Error(
        `OECD's SDMX API returned a Cloudflare bot-protection challenge page instead of data (HTTP 403). ` +
          `This is an IP/network-reputation block, not a wrong dataflow ID and not retryable — a request from a ` +
          `different network may succeed where this one didn't. See CLAUDE.md and METHODOLOGY.md.`
      );
    }

    if (RETRYABLE_STATUSES.has(res.status) && attempt < RETRY_DELAYS_MS.length) {
      lastErr = new Error(`OECD SDMX API returned HTTP ${res.status}: ${snippet(text)}`);
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    if (!res.ok) {
      throw new Error(
        `OECD SDMX API returned HTTP ${res.status} for dataflow "${dataflowPath}"` +
          (attempt > 0 ? ` (after ${attempt} retr${attempt === 1 ? "y" : "ies"})` : "") +
          `: ${snippet(text)}`
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`OECD SDMX API response wasn't valid JSON: ${snippet(text)}`);
    }

    return parseSdmxJson(json);
  }

  // Only reached if every retry hit a network error or a retryable status.
  throw lastErr;
}

/**
 * Discovers a dataflow's real dimension list, then queries it with REF_AREA
 * pinned to our 9 peers and every other dimension left blank (SDMX's
 * "all values" wildcard for that position) — instead of the bare "all" key,
 * which triggered a server-side crash (HTTP 500, .NET-style null-reference
 * and resource-lookup errors) on two OECD dataflows in production. A
 * correctly-dimensioned key with explicit blanks is the properly-formed
 * request; "all" alone apparently isn't well-supported by this deployment.
 */
export async function fetchOecdCountryData(dataflowPath, { startPeriod, endPeriod } = {}) {
  const dims = await fetchOecdDataflowDimensions(dataflowPath);
  const refAreaIndex = dims.indexOf("REF_AREA");
  if (refAreaIndex === -1) {
    throw new Error(
      `OECD dataflow "${dataflowPath}" has no REF_AREA dimension in its structure — cannot build a country-scoped key.`
    );
  }

  const key = dims.map((_, i) => (i === refAreaIndex ? PEER_COUNTRY_KEY : "")).join(".");
  return fetchOecdSdmxData(dataflowPath, key, { startPeriod, endPeriod });
}

// Standard SDMX-JSON 2.0 structure. Written from the SDMX-JSON spec, not
// validated against a real successful OECD response yet. If OECD's actual
// shape differs, this throws rather than silently misreading it.
function parseSdmxJson(json) {
  const dataSet = json?.data?.dataSets?.[0];
  const structure = json?.data?.structures?.[0] ?? json?.structures?.[0];
  if (!dataSet || !structure) {
    throw new Error(
      "OECD SDMX API response is missing dataSets or structures — the response shape may differ from the SDMX-JSON 2.0 spec this was written against."
    );
  }

  const seriesDims = structure.dimensions?.series ?? [];
  const obsDims = structure.dimensions?.observation ?? [];
  const refAreaDimIndex = seriesDims.findIndex((d) => d.id === "REF_AREA");
  const timeDimIndex = obsDims.findIndex((d) => d.id === "TIME_PERIOD");
  if (refAreaDimIndex === -1 || timeDimIndex === -1) {
    throw new Error("OECD SDMX API response is missing a REF_AREA or TIME_PERIOD dimension.");
  }

  const refAreaValues = seriesDims[refAreaDimIndex].values ?? [];
  const timeValues = obsDims[timeDimIndex].values ?? [];

  const byCountry = {};
  // Tracks year -> value already recorded per country, so that if a loosely
  // (wildcard-)filtered query returns more than one series per country (e.g.
  // two different underlying collections), a genuine conflict is caught
  // loudly instead of one silently overwriting the other.
  const seenByCountry = {};
  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code] = { name: COUNTRY_NAMES[code], series: [] };
    seenByCountry[code] = new Map();
  }

  const series = dataSet.series ?? {};
  for (const [seriesKey, seriesData] of Object.entries(series)) {
    const dimIndices = seriesKey.split(":").map(Number);
    const refAreaCode = refAreaValues[dimIndices[refAreaDimIndex]]?.id;
    if (!refAreaCode || !byCountry[refAreaCode]) continue;

    const observations = seriesData.observations ?? {};
    for (const [obsKey, obsValue] of Object.entries(observations)) {
      const obsIndex = Number(obsKey.split(":")[0]);
      const timeLabel = timeValues[obsIndex]?.id;
      const year = Number(String(timeLabel).slice(0, 4));
      const value = Array.isArray(obsValue) ? obsValue[0] : obsValue;
      if (value === null || value === undefined || Number.isNaN(year)) continue;

      const seen = seenByCountry[refAreaCode];
      if (seen.has(year) && seen.get(year) !== value) {
        throw new Error(
          `OECD SDMX API returned conflicting values for ${refAreaCode} in ${year} (${seen.get(year)} vs ` +
            `${value}) — the query key is under-constrained (likely a wildcarded dimension picking up more ` +
            `than one underlying series) and this data is too ambiguous to trust. Narrowing the key is required, ` +
            `not silently picking one value.`
        );
      }
      if (!seen.has(year)) {
        seen.set(year, value);
        byCountry[refAreaCode].series.push({ year, value });
      }
    }
  }

  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code].series.sort((a, b) => a.year - b.year);
  }

  const missingCountries = PEER_COUNTRY_CODES.filter((c) => byCountry[c].series.length === 0);
  return { byCountry, missingCountries };
}

export const PEER_COUNTRY_KEY = PEER_COUNTRY_CODES.join("+");
