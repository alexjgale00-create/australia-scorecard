import { writeFileSync } from "fs";
import { join } from "path";

export function writeGaugeData({ gaugeId, provenance, countries }) {
  const filePath = join(process.cwd(), "data", "processed", `${gaugeId}.json`);
  const payload = { gaugeId, provenance, countries };
  writeFileSync(filePath, JSON.stringify(payload, null, 2) + "\n");
  return filePath;
}
