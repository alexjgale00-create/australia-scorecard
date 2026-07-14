// Coordinates verified live 2026-07-14 via the dataflow's own data
// structure definition (17 dimensions, decoded before sdmx.oecd.org's
// Cloudflare bot-protection blocked further requests) — AGE=Y25T34 ("25 to
// 34 years"), ATTAINMENT_LEV=ISCED11A_5T8 ("Tertiary education"),
// UNIT_MEASURE=PT_POP_Y25T34 ("Percentage of population aged 25-34 years")
// gives the share directly, no derivation needed.
//
// The fully-pinned key (including guessed STATISTICAL_OPERATION=NEAC and
// QUESTIONNAIRE=NEAC) returned HTTP 404 "NoResultsFound" on a live run —
// those two collection-process dimensions were the values we were least
// sure about, so they're now left blank (SDMX wildcard) rather than
// guessed again. Dimension ORDER is discovered dynamically (not
// hand-counted) to remove that as a separate source of error. If leaving
// them blank surfaces more than one genuinely different value for the same
// country/year (e.g. two collection methods disagreeing), the parser's
// duplicate-value check throws a clear "ambiguous data" error instead of
// silently picking one.
import { fetchOecdDataflowDimensions, fetchOecdSdmxData, PEER_COUNTRY_KEY } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries } from "../lib/worldbank.mjs";

export const gaugeId = "human-capital-depth";
const DATAFLOW = "OECD.EDU.IMEP,DSD_EAG_LSO_EA@DF_LSO_NEAC_DISTR_EA,1.0";

// Values derived directly from the dataflow's own codelists, not guessed —
// every dimension not listed here (including STATISTICAL_OPERATION and
// QUESTIONNAIRE) is left blank.
const KNOWN_DIMENSION_VALUES = {
  SEX: "_T",
  AGE: "Y25T34",
  ATTAINMENT_LEV: "ISCED11A_5T8",
  MEASURE: "POP",
  UNIT_MEASURE: "PT_POP_Y25T34",
  FREQ: "A",
};

export async function run(config, report) {
  const dims = await fetchOecdDataflowDimensions(DATAFLOW);
  const refAreaIndex = dims.indexOf("REF_AREA");
  if (refAreaIndex === -1) {
    throw new Error(`OECD dataflow "${DATAFLOW}" has no REF_AREA dimension in its structure.`);
  }

  const key = dims
    .map((dim, i) => (i === refAreaIndex ? PEER_COUNTRY_KEY : (KNOWN_DIMENSION_VALUES[dim] ?? "")))
    .join(".");

  const { byCountry, missingCountries } = await fetchOecdSdmxData(DATAFLOW, key, {
    startPeriod: config.historyStartYear,
    endPeriod: new Date().getFullYear(),
  });

  writeGaugeData({
    gaugeId,
    provenance: {
      status: "LIVE",
      institution: config.source.institution,
      seriesId: config.source.seriesId,
      seriesName: config.source.seriesName,
      url: config.source.url,
      retrievedAt: new Date().toISOString(),
      note:
        `Live data from ${config.source.institution}: tertiary educational attainment among 25-34 ` +
        `year-olds, expressed directly as a percentage of that age group (not derived by us).` +
        (missingCountries.length > 0 ? ` No data available for: ${missingCountries.join(", ")}.` : ""),
      missingCountries: buildMissingCountries(
        missingCountries,
        `${config.source.institution} has not published this indicator for this country.`
      ),
    },
    countries: byCountry,
  });

  const ausSeries = byCountry.AUS.series;
  const yearsCovered = ausSeries.length
    ? `${ausSeries[0].year}–${ausSeries[ausSeries.length - 1].year}`
    : "no AUS data";

  if (missingCountries.length > 0) {
    report.warning(
      gaugeId,
      `Saved, but with a gap: no data for ${missingCountries.join(", ")}. Australia covered ${yearsCovered}.`
    );
  } else {
    report.success(
      gaugeId,
      `${config.source.institution}, tertiary attainment 25-34 — 9 countries, Australia ${yearsCovered}. Saved.`
    );
  }
}
