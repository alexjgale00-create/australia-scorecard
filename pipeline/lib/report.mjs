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
    /**
     * Three states for an accessType:"manual" gauge, checked each run even
     * though these gauges are never fetched: fresh (within its configured
     * staleAfterMonths), stale (due for a refresh — a nudge, not a failure,
     * since the pipeline can't fix this itself), or awaiting its first
     * entry (accessType is manual but no data file exists yet). None of
     * these affect the CLEAN/NOT CLEAN verdict — a manual gauge being due
     * for its (e.g.) 3-yearly update isn't news every month for years, but
     * it's never silently invisible either.
     */
    manualFresh(gaugeId, message) {
      results.push({ gaugeId, status: "manualFresh", message });
    },
    manualStale(gaugeId, message) {
      results.push({ gaugeId, status: "manualStale", message });
    },
    manualAwaiting(gaugeId, message) {
      results.push({ gaugeId, status: "manualAwaiting", message });
    },
    /**
     * The accessType:"api" equivalent of manualFresh/manualStale — but
     * deliberately NOT the same statuses. Ruled 2026-08-25: a manual gauge
     * being overdue is expected and routine (nobody re-downloads PISA every
     * month); an api gauge going stale means a source that fetched
     * successfully is nonetheless no longer publishing new data, which
     * usually means a broken fetcher or a changed upstream — a genuinely
     * different signal, so apiStale DOES count toward the CLEAN/NOT CLEAN
     * verdict (see print() below) where manualStale never has. Only ever
     * checked for a gauge with a reviewed staleAfterMonths (see
     * pipeline/index.mjs's staleness loop) — a gauge left unset on purpose
     * (innovation, personal-safety) never reaches either of these.
     */
    apiFresh(gaugeId, message) {
      results.push({ gaugeId, status: "apiFresh", message });
    },
    apiStale(gaugeId, message) {
      results.push({ gaugeId, status: "apiStale", message });
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

      const icons = {
        success: "✅",
        warning: "⚠️ ",
        failure: "❌",
        knownLimitation: "🟡",
        manualFresh: "🔵",
        manualStale: "🟠",
        manualAwaiting: "⚪",
        apiFresh: "🟢",
        apiStale: "🛑",
      };
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
      const manualStale = results.filter((r) => r.status === "manualStale").length;
      const manualAwaiting = results.filter((r) => r.status === "manualAwaiting").length;
      const manualTotal = results.filter((r) => r.status.startsWith("manual")).length;
      // The staleness check (pipeline/index.mjs's unified loop, both
      // accessTypes) runs as a SECOND pass over every gauge, independent of
      // whether GAUGE_IDS attempted a fetch for it this run — so an api
      // gauge can appear twice in `results` (its fetch outcome, then its
      // staleness verdict). Both apiFresh/apiStale are carved out of the
      // "automated gauges updated" tally below for the same reason
      // manualTotal already is, so neither double-counts a gauge.
      const apiStale = results.filter((r) => r.status === "apiStale").length;
      const apiStalenessTotal = results.filter((r) => r.status.startsWith("api")).length;
      const succeeded = results.length - failures - knownLimitations - manualTotal - apiStalenessTotal;

      console.log(divider);
      console.log(
        ` Summary: ${succeeded} of ${results.length - manualTotal - apiStalenessTotal} automated gauges updated` +
          (warnings > 0 ? ` (${warnings} with a data gap)` : "") +
          `, ${failures} failed` +
          (knownLimitations > 0
            ? `, ${knownLimitations} known standing limitation${knownLimitations === 1 ? "" : "s"} (not counted against the verdict — see below).`
            : ".") +
          (apiStalenessTotal > 0
            ? ` ${apiStale} automated gauge${apiStale === 1 ? "" : "s"} gone stale — source hasn't published newer data ` +
              `past its own cadence (counts against the verdict — see below).`
            : "") +
          (manualTotal > 0
            ? ` ${manualTotal} gauge${manualTotal === 1 ? "" : "s"} in the manual lane` +
              (manualStale > 0 || manualAwaiting > 0
                ? ` (${[
                    manualStale > 0 ? `${manualStale} due for a refresh` : null,
                    manualAwaiting > 0 ? `${manualAwaiting} awaiting first entry` : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}).`
                : ` — all current.`)
            : "")
      );
      const automatedTotal = results.length - manualTotal - apiStalenessTotal;
      const clean = failures === 0 && apiStale === 0;
      console.log(
        clean
          ? ` VERDICT: CLEAN — all reachable sources succeeded, none gone stale` +
              (knownLimitations > 0
                ? ` (${knownLimitations} known standing limitation${knownLimitations === 1 ? "" : "s"}, disclosed above)`
                : ` (all ${automatedTotal} automated source${automatedTotal === 1 ? "" : "s"})`)
          : ` VERDICT: NOT CLEAN — ${failures} of ${automatedTotal} failed` +
              (apiStale > 0 ? `, ${apiStale} gone stale` : "")
      );
      console.log(divider);

      return clean;
    },
  };
}
