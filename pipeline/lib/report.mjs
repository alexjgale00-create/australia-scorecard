// Accumulates per-gauge results and prints a plain-English report ending in
// a single-line verdict, so a partial success can never be misread as done.

export function createReport() {
  const results = [];

  return {
    success(gaugeId, message) {
      results.push({ gaugeId, status: "success", message });
    },
    warning(gaugeId, message) {
      results.push({ gaugeId, status: "warning", message });
    },
    failure(gaugeId, message) {
      results.push({ gaugeId, status: "failure", message });
    },
    /** Prints the report and returns true if clean (no failures). */
    print() {
      const now = new Date();
      const divider = "=".repeat(60);

      console.log(divider);
      console.log(" The Australia Scorecard — Pipeline Run");
      console.log(" " + now.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }));
      console.log(divider);
      console.log("");

      for (const r of results) {
        const icon = r.status === "success" ? "✅" : r.status === "warning" ? "⚠️ " : "❌";
        console.log(`${icon} ${r.gaugeId}`);
        for (const line of r.message.split("\n")) {
          console.log(`   ${line}`);
        }
        console.log("");
      }

      const failures = results.filter((r) => r.status === "failure").length;
      const warnings = results.filter((r) => r.status === "warning").length;
      const succeeded = results.length - failures;

      console.log(divider);
      console.log(
        ` Summary: ${succeeded} of ${results.length} gauges updated` +
          (warnings > 0 ? ` (${warnings} with a data gap)` : "") +
          `, ${failures} failed.`
      );
      console.log(
        failures === 0
          ? ` VERDICT: CLEAN — all ${results.length} sources`
          : ` VERDICT: NOT CLEAN — ${failures} of ${results.length} failed`
      );
      console.log(divider);

      return failures === 0;
    },
  };
}
