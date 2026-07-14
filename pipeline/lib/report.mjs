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
    /**
     * For a source failure that is documented, expected, and explicitly
     * accepted as a standing environment limitation (currently: IMF's
     * DataMapper API blocking GitHub Actions specifically — see CLAUDE.md).
     * Distinct from `failure` so it never trips the CLEAN/NOT CLEAN verdict
     * or GitHub Actions' red X — a documented limitation isn't news every
     * month for years. Still printed in full, still named in the summary,
     * never silently absorbed into a "success" count either.
     */
    knownLimitation(gaugeId, message) {
      results.push({ gaugeId, status: "knownLimitation", message });
    },
    /** Prints the report and returns true if clean (no unexpected failures). */
    print() {
      const now = new Date();
      const divider = "=".repeat(60);

      console.log(divider);
      console.log(" The Australia Scorecard — Pipeline Run");
      console.log(" " + now.toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }));
      console.log(divider);
      console.log("");

      const icons = { success: "✅", warning: "⚠️ ", failure: "❌", knownLimitation: "🟡" };
      for (const r of results) {
        console.log(`${icons[r.status]} ${r.gaugeId}`);
        for (const line of r.message.split("\n")) {
          console.log(`   ${line}`);
        }
        console.log("");
      }

      const failures = results.filter((r) => r.status === "failure").length;
      const warnings = results.filter((r) => r.status === "warning").length;
      const knownLimitations = results.filter((r) => r.status === "knownLimitation").length;
      const succeeded = results.length - failures - knownLimitations;

      console.log(divider);
      console.log(
        ` Summary: ${succeeded} of ${results.length} gauges updated` +
          (warnings > 0 ? ` (${warnings} with a data gap)` : "") +
          `, ${failures} failed` +
          (knownLimitations > 0
            ? `, ${knownLimitations} known standing limitation${knownLimitations === 1 ? "" : "s"} (not counted against the verdict — see below).`
            : ".")
      );
      console.log(
        failures === 0
          ? ` VERDICT: CLEAN — all reachable sources succeeded` +
              (knownLimitations > 0
                ? ` (${knownLimitations} known standing limitation${knownLimitations === 1 ? "" : "s"}, disclosed above)`
                : ` (all ${results.length} sources)`)
          : ` VERDICT: NOT CLEAN — ${failures} of ${results.length} failed`
      );
      console.log(divider);

      return failures === 0;
    },
  };
}
