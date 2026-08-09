// SP.DYN.LE00.IN verified live 2026-08-06 (full 9-peer coverage) before this
// gauge was ever proposed as automatable — same generic World Bank route as
// living-standards, innovation, etc. See gauges.config.json's dataPolicy and
// METHODOLOGY.md's "Quality of Life dimension" for the verification record.
import { runSimpleWorldBankGauge } from "../lib/simpleWorldBankGauge.mjs";

export const gaugeId = "life-expectancy";

export async function run(config, report) {
  return runSimpleWorldBankGauge(gaugeId, config, report);
}
