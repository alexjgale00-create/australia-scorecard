import { runSimpleWorldBankGauge } from "../lib/simpleWorldBankGauge.mjs";

export const gaugeId = "living-standards";

export async function run(config, report) {
  return runSimpleWorldBankGauge(gaugeId, config, report);
}
