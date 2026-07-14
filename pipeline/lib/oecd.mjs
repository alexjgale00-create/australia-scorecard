import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/vnd.sdmx.data+json",
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
      res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: BROWSER_HEADERS });
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
  for (const code of PEER_COUNTRY_CODES) byCountry[code] = { name: COUNTRY_NAMES[code], series: [] };

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
      byCountry[refAreaCode].series.push({ year, value });
    }
  }

  for (const code of PEER_COUNTRY_CODES) {
    byCountry[code].series.sort((a, b) => a.year - b.year);
  }

  const missingCountries = PEER_COUNTRY_CODES.filter((c) => byCountry[c].series.length === 0);
  return { byCountry, missingCountries };
}

export const PEER_COUNTRY_KEY = PEER_COUNTRY_CODES.join("+");
