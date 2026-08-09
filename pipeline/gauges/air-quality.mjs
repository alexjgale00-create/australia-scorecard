// EN.ATM.PM25.MC.M3 (IHME Global Burden of Disease, hosted by the World
// Bank) verified live 2026-08-06 (full 9-peer coverage) before this gauge
// was ever proposed as automatable — same generic World Bank route as
// living-standards, innovation, etc. Note: this indicator does not update
// strictly annually (GBD vintages are released periodically) — a calendar
// gap here is a real publication-cadence quirk, not a fetch failure; see
// gauges.config.json's dataPolicy.
import { runSimpleWorldBankGauge } from "../lib/simpleWorldBankGauge.mjs";

export const gaugeId = "air-quality";

export async function run(config, report) {
  return runSimpleWorldBankGauge(gaugeId, config, report);
}
