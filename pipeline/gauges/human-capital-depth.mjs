// Coordinates and key verified live 2026-07-14 via the dataflow's own data
// structure definition (17 dimensions, fetched and decoded before
// sdmx.oecd.org's Cloudflare bot-protection blocked further requests) —
// AGE=Y25T34 ("25 to 34 years"), ATTAINMENT_LEV=ISCED11A_5T8 ("Tertiary
// education"), UNIT_MEASURE=PT_POP_Y25T34 ("Percentage of population aged
// 25-34 years") gives the share directly, no derivation needed. The DSD was
// fully decoded but the key itself was never validated end-to-end against a
// real data response (blocked before that final test), so this is the one
// OECD gauge most likely to reveal a key-shape mistake if OECD ever
// responds — that would surface as a clear parse error, not silently wrong
// numbers.
import { fetchOecdSdmxData } from "../lib/oecd.mjs";
import { writeGaugeData } from "../lib/writeGaugeData.mjs";
import { buildMissingCountries, PEER_COUNTRY_CODES } from "../lib/worldbank.mjs";

export const gaugeId = "human-capital-depth";
const DATAFLOW = "OECD.EDU.IMEP,DSD_EAG_LSO_EA@DF_LSO_NEAC_DISTR_EA,1.0";

// Dimension order: REF_AREA, SEX, AGE, ATTAINMENT_LEV, EDUCATION_FIELD,
// MEASURE, INCOME, BIRTH_PLACE, MIGRATION_AGE, EDU_STATUS,
// LABOUR_FORCE_STATUS, DURATION_UNEMP, UNIT_MEASURE, STATISTICAL_OPERATION,
// WORK_TIME_ARNGMNT, QUESTIONNAIRE, FREQ
const KEY = [
  PEER_COUNTRY_CODES.join("+"),
  "_T", // SEX: total
  "Y25T34", // AGE: 25 to 34 years
  "ISCED11A_5T8", // ATTAINMENT_LEV: Tertiary education
  "", // EDUCATION_FIELD
  "POP", // MEASURE: Population
  "", // INCOME
  "", // BIRTH_PLACE
  "", // MIGRATION_AGE
  "", // EDU_STATUS
  "", // LABOUR_FORCE_STATUS
  "", // DURATION_UNEMP
  "PT_POP_Y25T34", // UNIT_MEASURE: Percentage of population aged 25-34 years
  "NEAC", // STATISTICAL_OPERATION: LSO-NEAC regular data collection
  "", // WORK_TIME_ARNGMNT
  "NEAC", // QUESTIONNAIRE
  "A", // FREQ: Annual
].join(".");

export async function run(config, report) {
  const { byCountry, missingCountries } = await fetchOecdSdmxData(DATAFLOW, KEY, {
    startPeriod: config.historyStartYear,
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
