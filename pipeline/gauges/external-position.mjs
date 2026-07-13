import { runSimpleWorldBankGauge } from "../lib/simpleWorldBankGauge.mjs";

export const gaugeId = "external-position";

export async function run(config, report) {
  return runSimpleWorldBankGauge(gaugeId, config, report);
}
