import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// The /data endpoint and the /dataflow (structure) endpoint negotiate
// content type independently and don't accept the same values — confirmed
// live: sending the data endpoint's Accept header to /dataflow got HTTP 406,
// with the response body listing exactly what it does accept. This parser
// reads XML (`<structure:Dimension id="...">`), so it asks for the XML
// structure format specifically, not whatever the server would default to.
// Accept-Language: DF_HOUSE_PRICES returned a garbled .NET resource-lookup
// error ("languageTag1" — the literal name of a resource key, not a real
// message) with no Accept-Language header sent. That's consistent with
// server-side locale-resolution code failing when it has nothing to
// resolve. Explicit "en" is a reasonable, low-risk fix to try — not fully
// confirmed yet.
const DATA_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/vnd.sdmx.data+json",
  "Accept-Language": "en",
};
const STRUCTURE_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "application/vnd.sdmx.structure+xml;version=2.1",
  "Accept-Language": "en",
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
export async function fetchOecdDataflowDimensions(dataflowPath, _redirected = false) {
  const [agency, id, version] = dataflowPath.split(",");
  // references=all, not "children": confirmed live (pre-block, manual testing)
  // that "all" reliably includes the embedded DSD/dimension list; "children"
  // returned a real structure response for this same dataflow shape with
  // zero dimensions found — apparently not equivalent for every dataflow.
  const url = _redirected
    ? dataflowPath // already a full URL, see the isExternalReference branch below
    : `https://sdmx.oecd.org/public/rest/dataflow/${agency}/${id}/${version}?references=all`;

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

  // Some dataflows are stubs pointing elsewhere: isExternalReference="true"
  // plus a structureURL attribute meaning "the real definition (with its
  // dimension list) lives at this other URL, usually an /archive/ path for
  // a deprecated-but-still-listed dataflow." Confirmed live for
  // DF_PDB_LV. Follow it once rather than hardcode an "archive" path
  // rewrite, since this generalises to any dataflow with the same stub
  // pattern, archived or not.
  if (!_redirected && /isExternalReference="true"/.test(text)) {
    const structureUrlMatch = text.match(/structureURL="([^"]+)"/);
    if (structureUrlMatch) {
      // The bare structureURL returns just the Dataflow stub itself (with
      // annotations, no DimensionList) — confirmed live: DF_PDB_LV's archive
      // redirect landed here and "found zero dimensions" even though the
      // redirect itself worked, because references=all was never forwarded
      // to the second request. Same param this file already relies on for
      // the primary (non-redirected) request, for the same reason.
      const redirectUrl =
        structureUrlMatch[1] + (structureUrlMatch[1].includes("?") ? "&" : "?") + "references=all";
      return fetchOecdDataflowDimensions(redirectUrl, true);
    }
  }

  // Prefix-agnostic: DF_PDB_LV's structure response found zero matches
  // against a hardcoded "structure:" prefix while a different OECD domain's
  // dataflow matched fine with that exact prefix — different domains
  // evidently don't all use the same namespace prefix for the same tag.
  // Matches <structure:Dimension>, <str:Dimension>, <Dimension> (no
  // prefix), or anything else, as long as the local tag name is "Dimension".
  const dimensionRe = /<(?:[a-zA-Z0-9]+:)?Dimension\s+[^>]*\bid="([^"]+)"/g;
  const dims = [];
  let m;
  while ((m = dimensionRe.exec(text)) !== null) {
    dims.push(m[1]);
  }
  if (dims.length === 0) {
    throw new Error(
      `OECD SDMX API returned a data structure for "${dataflowPath}" with no dimensions found — the ` +
        `response shape may differ from what this was written against: ${snippet(text, 1500)}`
    );
  }
  return dims;
}

/**
 * Best-effort diagnostic only, never thrown as a hard failure itself:
 * SDMX 2.1's "availableconstraint" resource is built to answer "which
 * dimension values actually have data for this partial key" — exactly what
 * a bare 404 doesn't tell you. If this deployment doesn't support it or the
 * call fails for any reason, that's reported inline rather than raised.
 */
async function fetchAvailableConstraintSnippet(dataflowPath, key) {
  try {
    // No query params: the first attempt guessed "references=none&mode=exact"
    // and got HTTP 500 "Could not find structure type with class 'none'" —
    // this deployment evidently doesn't accept that combination. Going
    // maximally conservative (bare endpoint + key, no params we're not sure
    // about) rather than guessing a second set of parameter values blind.
    const url = `https://sdmx.oecd.org/public/rest/availableconstraint/${dataflowPath}/${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: STRUCTURE_HEADERS });
    const text = await res.text();
    if (!res.ok) return `(also failed: HTTP ${res.status}: ${snippet(text, 200)})`;

    // Best-effort structured extraction: a Constraint response lists valid
    // codes per dimension as <KeyValue id="DIM"><Value>CODE</Value>...
    // (namespace-prefix-agnostic, same reasoning as the dimension regex
    // above). Falls back to a much larger raw snippet if that shape isn't
    // found — either way, more than enough to actually read this time.
    const keyValueRe = /<(?:[a-zA-Z0-9]+:)?KeyValue\s+[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9]+:)?KeyValue>/g;
    const valueRe = /<(?:[a-zA-Z0-9]+:)?Value>([^<]*)<\/(?:[a-zA-Z0-9]+:)?Value>/g;
    const parts = [];
    let km;
    while ((km = keyValueRe.exec(text)) !== null) {
      const values = [];
      let vm;
      valueRe.lastIndex = 0;
      while ((vm = valueRe.exec(km[2])) !== null) values.push(vm[1]);
      parts.push(`${km[1]}=[${values.join(",")}]`);
    }
    return parts.length > 0 ? `valid combinations: ${parts.join("; ")}` : snippet(text, 4000);
  } catch (err) {
    return `(also failed: ${err.message})`;
  }
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
      // A 404 here means "no data for this exact key" but never says which
      // dimension value is the problem. availableconstraint is the SDMX
      // REST feature built to answer that — best-effort only: if it fails
      // or doesn't exist for this deployment, that's noted, not fatal.
      const extra = res.status === 404 ? ` Available-combinations diagnostic: ${await fetchAvailableConstraintSnippet(dataflowPath, key)}` : "";
      throw new Error(
        `OECD SDMX API returned HTTP ${res.status} for dataflow "${dataflowPath}"` +
          (attempt > 0 ? ` (after ${attempt} retr${attempt === 1 ? "y" : "ies"})` : "") +
          `: ${snippet(text)}${extra}`
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

  // Decodes a series key like "0:2:1" into "REF_AREA=AUS, MEASURE=RPI, ..."
  // — used only to make an ambiguity error actually actionable (which
  // dimension differs between two conflicting series), not in the happy path.
  function describeSeriesKey(seriesKey) {
    const dimIndices = seriesKey.split(":").map(Number);
    return seriesDims
      .map((dim, i) => `${dim.id}=${dim.values?.[dimIndices[i]]?.id ?? "?"}`)
      .join(", ");
  }

  const byCountry = {};
  // Tracks year -> {value, seriesKey} already recorded per country, so that
  // if a loosely (wildcard-)filtered query returns more than one series per
  // country (e.g. two different underlying collections), a genuine conflict
  // is caught loudly — and reported with both series' full dimension
  // breakdown, so the fix is "pin this dimension" not another guess.
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
      const timeLabel = String(timeValues[obsIndex]?.id ?? "");
      // Sub-annual periods ("1990-Q1".."1990-Q4", "1990-01".."1990-12") all
      // truncate to the same year — naively taking every one of them isn't
      // ambiguous data, it's this code conflating real quarterly/monthly
      // observations into one bucket (confirmed: DEU 1990's "conflict" was
      // Q1 vs Q4 of the same FREQ=Q series, not two different series at
      // all). Only take annual observations, or the year-end snapshot
      // (Q4 / December) for sub-annual frequencies — same convention as
      // the BIS fetcher's Q4-only rule.
      if (timeLabel.includes("-") && !timeLabel.endsWith("-Q4") && !timeLabel.endsWith("-12")) continue;
      const year = Number(timeLabel.slice(0, 4));
      const value = Array.isArray(obsValue) ? obsValue[0] : obsValue;
      if (value === null || value === undefined || Number.isNaN(year)) continue;

      const seen = seenByCountry[refAreaCode];
      const prior = seen.get(year);
      if (prior && prior.value !== value) {
        throw new Error(
          `OECD SDMX API returned conflicting values for ${refAreaCode} in ${year} (${prior.value} vs ${value}) ` +
            `— the query key is under-constrained. Series A [${prior.seriesKey}]: ${describeSeriesKey(prior.seriesKey)}. ` +
            `Series B [${seriesKey}]: ${describeSeriesKey(seriesKey)}. Compare those two dimension breakdowns to see ` +
            `which one differs — that's the dimension to pin. This data is too ambiguous to trust as-is; narrowing ` +
            `the key is required, not silently picking one value.`
        );
      }
      if (!prior) {
        seen.set(year, { value, seriesKey });
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
