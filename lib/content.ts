import { readFileSync } from "fs";
import { join } from "path";
import siteContent from "@/content/site.json";

export function getSiteContent() {
  return siteContent;
}

export function getWhyThisMatters(gaugeId: string): string {
  const path = join(process.cwd(), "content", "why-this-matters", `${gaugeId}.md`);
  try {
    return readFileSync(path, "utf-8").trim();
  } catch {
    return "[No 'why this matters' copy has been written yet for this gauge.]";
  }
}
