import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/vnd.sdmx.data+json",
};

/**
 * Fetches one OECD SDMX dataflow. sdmx.oecd.org sits behind Cloudflare
 * bot-protection that returns its JS-challenge page (HTTP 403) to any
 * non-browser client — verified live 2026-07-14 via two independent
 * network paths over ~25 minutes, not a transient rate limit. This
 * function detects that specific failure mode and reports it distinctly
 * from an ordinary HTTP or data error, because the fix is different (this
 * isn't a wrong series ID problem — see CLAUDE.md).
 */
export async function fetchOecdSdmxData(dataflowPath, key, { startPeriod } = {}) {
  const url =
    `https://sdmx.oecd.org/public/rest/data/${dataflowPath}/${key}` +
    `?format=jsondata${startPeriod ? `&startPeriod=${startPeriod}` : ""}`;

  let res;
  let text;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: BROWSER_HEADERS });
    text = await res.text();
  } catch (err) {
    throw new Error(`Could not reach the OECD SDMX API (${err.message}).`);
  }

  if (res.status === 403 || text.includes("Just a moment") || text.trim().startsWith("<!DOCTYPE")) {
    throw new Error(
      `OECD's SDMX API returned a Cloudflare bot-protection challenge page instead of data (HTTP ${res.status}). ` +
        `This is a known, previously-verified access blocker, not a wrong series ID or a transient rate limit — ` +
        `see CLAUDE.md and METHODOLOGY.md for what to try next (a different network's IP reputation, or moving ` +
        `this gauge to the manual-source lane).`
    );
  }

  if (!res.ok) {
    throw new Error(`OECD SDMX API returned HTTP ${res.status}.`);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("OECD SDMX API response wasn't valid JSON.");
  }

  return parseSdmxJson(json);
}

// Standard SDMX-JSON 2.0 structure. Written from the SDMX-JSON spec, not
// validated against a real OECD response (every test call was blocked
// before returning data — see fetchOecdSdmxData above). If OECD's actual
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
