import { PEER_COUNTRY_CODES, COUNTRY_NAMES } from "./worldbank.mjs";

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
 *
 * Confirmed 2026-07: this API works from a local/residential-ish network
 * but returns HTTP 403 from a GitHub Actions runner — the reverse of
 * OECD's situation. Likely a WAF rule against known cloud/datacenter IP
 * ranges rather than anything specific to this request. Reported distinctly
 * from an ordinary error so it isn't mistaken for a broken indicator ID.
 */
export async function fetchImfDataMapperIndicator(indicatorId) {
  const url = `https://www.imf.org/external/datamapper/api/v1/${encodeURIComponent(indicatorId)}`;

  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let res;
    let text;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      text = await res.text();
    } catch (err) {
      lastErr = new Error(
        `Could not reach the IMF DataMapper API (${err.message}) for indicator "${indicatorId}".`
      );
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw lastErr;
    }

    if (res.status === 403) {
      const err = new Error(
        `IMF DataMapper API returned HTTP 403 for indicator "${indicatorId}". This has been observed specifically ` +
          `when running from GitHub Actions while the same request succeeds from a local machine — likely a WAF ` +
          `rule against cloud/datacenter IP ranges, not a wrong indicator ID and not retryable from this network. ` +
          `See CLAUDE.md.`
      );
      // Only the documented shape counts as the known, accepted standing
      // limitation: HTTP 403, from GitHub Actions specifically. A 403 from a
      // local run would be new and unexpected — the whole documented quirk
      // is that Actions is the one blocked — so it's never silently
      // downgraded there; it stays a genuine (red) failure.
      if (process.env.GITHUB_ACTIONS === "true") err.knownLimitation = true;
      throw err;
    }

    if (RETRYABLE_STATUSES.has(res.status) && attempt < RETRY_DELAYS_MS.length) {
      lastErr = new Error(`IMF DataMapper API returned HTTP ${res.status}: ${snippet(text)}`);
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    if (!res.ok) {
      throw new Error(
        `IMF DataMapper API returned HTTP ${res.status} for indicator "${indicatorId}"` +
          (attempt > 0 ? ` (after ${attempt} retr${attempt === 1 ? "y" : "ies"})` : "") +
          `: ${snippet(text)}`
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`IMF DataMapper API response wasn't valid JSON: ${snippet(text)}`);
    }

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

  throw lastErr;
}
