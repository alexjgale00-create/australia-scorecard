import Link from "next/link";
import { gaugesConfig, getGaugeData } from "@/lib/gauges-data";
import {
  GOVERNMENT_TERMS,
  HEADLINE_GAUGE_IDS,
  COMPOSITE_FLOOR_YEAR,
  computeAllTermStats,
  computeRollup,
  computeCoverageTable,
  computeCommonCoverageGaugeIds,
  computeOpenTermPrecondition,
  buildOpenTermPreconditionDisclosure,
  assertOpenTermPreconditionDisclosure,
  computeSalienceCoverageFinding,
  termYearBounds,
  termLengthYears,
  isOngoing,
  type TermRollup,
} from "@/lib/government-performance";
import GovTermCell from "@/components/GovTermCell";
import type { DimensionId, GaugeConfig, GaugeData } from "@/lib/types";

export const metadata = { title: "Government performance — The Australia Scorecard" };

const LINK = "underline decoration-chrome hover:decoration-ink";
const HR = "mt-10 pt-8 border-t border-ink";

function primaryPlate(config: GaugeConfig): string {
  const dimensionId = (Object.keys(config.plates) as DimensionId[])[0];
  return config.plates[dimensionId] ?? "";
}

function termName(termId: string): string {
  return GOVERNMENT_TERMS.find((t) => t.id === termId)?.name ?? termId;
}

/** Renders one of the rollup table's three number columns, "—" only when a term truly has no computable value under that statistic (never conflated with a zero). */
function rollupCell(rollup: TermRollup, kind: "net" | "avgAnnual" | "avgEnd") {
  if (kind === "net") return `${rollup.net > 0 ? "+" : ""}${rollup.net}`;
  const value = kind === "avgAnnual" ? rollup.avgAnnual : rollup.avgEnd;
  if (value === null) return "n.a.";
  return kind === "avgAnnual" ? `${value > 0 ? "+" : ""}${value.toFixed(2)}` : value.toFixed(1);
}

interface WinnerComparison {
  stat: "net" | "avgAnnual" | "avgEnd";
  label: string;
  fullWinnerTermId: string;
  headlineWinnerTermId: string;
  same: boolean;
}

/**
 * One computation, two consumers (the summary sentence above the table and
 * the table rows themselves) — never a count stated in prose and a
 * separate winner computed for the table, which is exactly the shape of
 * bug HANDOVER.md's entry 15 names (a fact computed twice, nothing
 * asserting the two agree). If the number of "different" rows below ever
 * needs stating in prose again, read it from this array's own filter,
 * never retype it.
 */
function computeWinnerComparisons(fullRollup: TermRollup[], headlineRollup: TermRollup[]): WinnerComparison[] {
  const STATS = [
    { stat: "net" as const, label: "Net improving−declining" },
    { stat: "avgAnnual" as const, label: "Avg annualised change" },
    { stat: "avgEnd" as const, label: "Avg end-of-term level" },
  ];
  return STATS.map(({ stat, label }) => {
    const fullWinner = [...fullRollup].sort((a, b) => (b[stat] ?? -Infinity) - (a[stat] ?? -Infinity))[0];
    const headlineWinner = [...headlineRollup].sort((a, b) => (b[stat] ?? -Infinity) - (a[stat] ?? -Infinity))[0];
    return {
      stat,
      label,
      fullWinnerTermId: fullWinner.termId,
      headlineWinnerTermId: headlineWinner.termId,
      same: fullWinner.termId === headlineWinner.termId,
    };
  });
}

export default function GovernmentPerformancePage() {
  const gaugesWithData: { config: GaugeConfig; data: GaugeData }[] = gaugesConfig.gauges
    .map((config) => {
      const data = getGaugeData(config.id);
      return data ? { config, data } : null;
    })
    .filter((g): g is { config: GaugeConfig; data: GaugeData } => g !== null);

  const allGaugeIds = gaugesWithData.map((g) => g.config.id);
  const allStats = computeAllTermStats(gaugesWithData);

  const threshold = gaugesConfig.directionThresholdScorePointsPerYear;
  const fullRollup = computeRollup(allGaugeIds, allStats, threshold);
  const headlineRollup = computeRollup(HEADLINE_GAUGE_IDS, allStats, threshold);

  const commonGaugeIds = computeCommonCoverageGaugeIds(allGaugeIds, allStats);
  const commonRollup = computeRollup(commonGaugeIds, allStats, threshold);

  const coverage = computeCoverageTable(allGaugeIds, allStats);
  const headlineCoverage = computeCoverageTable(HEADLINE_GAUGE_IDS, allStats);

  const precondition = computeOpenTermPrecondition(allGaugeIds, allStats, gaugesWithData);
  const preconditionText = buildOpenTermPreconditionDisclosure(precondition, gaugesConfig.gauges);
  // Throws (failing next build) if any zero-observation gauge isn't actually
  // named in the sentence just built — same discipline
  // assertCompositeDisclosure already applies to the composite-exclusion
  // text in lib/scoring.ts. See lib/government-performance.ts's doc comment
  // on why this page has no REGISTER_DRAFT_LINES-shaped guard instead: there
  // is no hand-typed number here for that guard's pattern to check against.
  assertOpenTermPreconditionDisclosure(precondition, gaugesConfig.gauges, preconditionText);

  const salience = computeSalienceCoverageFinding(allGaugeIds, HEADLINE_GAUGE_IDS, allStats);
  const winnerComparisons = computeWinnerComparisons(fullRollup, headlineRollup);
  const differentWinnerCount = winnerComparisons.filter((w) => !w.same).length;

  const nameOf = (id: string) => gaugesConfig.gauges.find((g) => g.id === id)?.name ?? id;

  return (
    <div className="register bg-paper font-public-sans text-ink min-h-screen p-6 sm:p-[48px_56px_56px]">
      <div className="mx-auto max-w-4xl">
        <div className="font-martian-mono text-[10.5px] font-medium tracking-[.10em] text-ink-2">
          NOT A DIMENSION · NOT IN EITHER COMPOSITE · LINKS BACK TO EVERY GAUGE
        </div>
        <h1 className="font-bold text-[28px] sm:text-[36px] tracking-[-.01em] mt-2">
          Government performance across the gauges
        </h1>
        <p className="mt-3 max-w-2xl text-ink-2">
          The site&rsquo;s 23 gauges, compared across each government&rsquo;s term — an explicit performance
          comparison, not a neutral timeline of who held office when. It never produces a single government
          score: see &ldquo;Why no composite&rdquo; below. Read this page after, not instead of, the gauge pages
          it draws from — every gauge name here links to its own table.
        </p>

        <div className="h-[3px] bg-ink my-6 sm:my-8" />

        {/* --------------------------------------------------------------
            Precondition — before any table, per the memo's ruling. Not a
            caveat: read this before anything below means anything.
        -------------------------------------------------------------- */}
        <section className="border border-stamp bg-desk p-4 sm:p-5">
          <p className="font-martian-mono text-[10px] font-bold tracking-[.14em] text-stamp">
            READ THIS BEFORE THE {precondition.term.name.toUpperCase()} COLUMN
          </p>
          <p className="mt-2 text-[14px] leading-[1.6] text-ink">{preconditionText}</p>
        </section>

        {/* --------------------------------------------------------------
            Attribution disclosure — full prose, near the top, per the
            memo's ruling that this is a precondition for the page's whole
            premise, not a footnote.
        -------------------------------------------------------------- */}
        <section className="mt-5 border border-chrome bg-paper p-4 sm:p-5">
          <p className="font-martian-mono text-[10px] font-bold tracking-[.14em] text-ink-3">
            WHAT THIS PAGE DOES NOT CLAIM
          </p>
          <p className="mt-2 text-[13.5px] leading-[1.65] text-ink-2">
            This page compares Australia&rsquo;s gauge readings across each government&rsquo;s term. It does not
            claim any government caused what its term shows. Three things break that link before any gauge is
            scored: <strong className="text-ink">policy</strong> takes years to reach a measured outcome, so an
            early-term figure usually describes the previous government&rsquo;s policy more than this one&rsquo;s;{" "}
            <strong className="text-ink">several sources publish 1&ndash;3 years behind</strong> the year they
            describe, so a figure landing inside a term may describe conditions from before it began; and this
            data&rsquo;s two largest inflections &mdash; <strong className="text-ink">the 2008 financial crisis and
            the 2020 pandemic</strong> &mdash; were not caused by, and were not primarily shaped by, the
            government of the day. The GFC lands inside Rudd&ndash;Gillard&ndash;Rudd&rsquo;s term; the
            pandemic&rsquo;s economic aftermath spans the end of Abbott&ndash;Turnbull&ndash;Morrison and the
            start of Albanese&rsquo;s. No gauge on this site attributes an outcome to a government by name. This
            page is a record of what the numbers show under each government, not an argument about why.
          </p>
        </section>

        {/* --------------------------------------------------------------
            Term definitions
        -------------------------------------------------------------- */}
        <section className={HR}>
          <h2 className="text-lg font-semibold">Terms</h2>
          <p className="mt-2 text-ink-2">
            Grouped by party continuity, not by individual Prime Minister — matching how this question is usually
            asked (&ldquo;how did the Coalition do, 2013&ndash;2022&rdquo;), and avoiding terms too short for any
            annual gauge to show a change (Kevin Rudd&rsquo;s second term ran 83 days). Individual PMs are named
            below each term, not discarded.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="font-martian-mono text-[9.5px] font-bold tracking-[.10em] text-ink-3 uppercase">
                  <td className="border-b border-ink py-2">Term</td>
                  <td className="border-b border-ink py-2">Party</td>
                  <td className="border-b border-ink py-2">Prime Minister(s)</td>
                  <td className="border-b border-ink py-2 text-right">Start</td>
                  <td className="border-b border-ink py-2 text-right">End</td>
                  <td className="border-b border-ink py-2 text-right">Length</td>
                </tr>
              </thead>
              <tbody>
                {GOVERNMENT_TERMS.map((term, i) => (
                  <tr key={term.id} className={i === GOVERNMENT_TERMS.length - 1 ? "border-b border-ink" : "border-b border-grid"}>
                    <td className="py-2 pr-3 font-semibold">{term.name}</td>
                    <td className="py-2 pr-3 text-ink-2">{term.party}</td>
                    <td className="py-2 pr-3 text-ink-2">{term.pmSequence.map((p) => p.name).join(" → ")}</td>
                    <td className="py-2 pr-3 text-right font-martian-mono tabular-nums text-ink-2">{term.start}</td>
                    <td className="py-2 pr-3 text-right font-martian-mono tabular-nums text-ink-2">
                      {term.end ?? (isOngoing(term) ? "ongoing" : "—")}
                    </td>
                    <td className="py-2 text-right font-martian-mono tabular-nums text-ink-2">
                      {termLengthYears(term).toFixed(1)}y
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-2">
            A calendar-year data point can&rsquo;t be split at a mid-year transition — the transition year itself
            (1996, 2007, 2013, 2022) is counted in both the outgoing and incoming government&rsquo;s figures
            below, disclosed here rather than arbitrarily assigned to one side.{" "}
            <strong className="text-ink">Hawke&ndash;Keating&rsquo;s real term begins 1983</strong>, seven years
            before this site&rsquo;s own documented composite floor of {COMPOSITE_FLOOR_YEAR} (too few gauges have
            data before then to be representative — see Methodology). Every figure below for
            Hawke&ndash;Keating covers only {termYearBounds(GOVERNMENT_TERMS[0]).startYear < COMPOSITE_FLOOR_YEAR ? COMPOSITE_FLOOR_YEAR : termYearBounds(GOVERNMENT_TERMS[0]).startYear}
            &ndash;{termYearBounds(GOVERNMENT_TERMS[0]).endYear} — the last 6.8 of its 13 years — a truncation of
            that government&rsquo;s own history, not a comment on it.
          </p>
        </section>

        {/* --------------------------------------------------------------
            Why no composite
        -------------------------------------------------------------- */}
        <section className={HR}>
          <h2 className="text-lg font-semibold">Why no composite</h2>
          <p className="mt-2 text-ink-2">
            This page never scores a government with one number. A government composite would be a weighted
            average of level scores this site already computes, attributed to the site — the same construction
            Power and Quality of Life already use, and it clears the compute/republish rule (METHODOLOGY.md) the
            same way they do. That rule is not why one isn&rsquo;t built here. The real reasons: it would
            compound the dimension weights with a second, harder set of weights across terms of wildly unequal
            length and completeness, into one number precise enough to misread as authoritative; unlike Power or
            Quality of Life, it would name a political actor directly, in a domain where a single ranking number
            is the exact artefact that gets screenshotted and stripped of the page it came from; and it would
            need the same options-memo, run-length-decomposition rigour the band thresholds took, for a question
            this page was never asked to answer. Per-gauge comparison only.
          </p>
        </section>

        {/* --------------------------------------------------------------
            The three statistics, together
        -------------------------------------------------------------- */}
        <section className={HR}>
          <h2 className="text-lg font-semibold">Three statistics, published together</h2>
          <p className="mt-2 text-ink-2">
            Measuring a government&rsquo;s performance is itself contested, not a solved arithmetic problem. This
            page shows three different, defensible statistics &mdash; how many gauges improved, how fast they
            moved on average, and where they ended up &mdash; because they measure genuinely different things,{" "}
            <strong>not because we couldn&rsquo;t pick one</strong>. They frequently disagree about which
            government comes out ahead. That disagreement is shown, not resolved.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="font-martian-mono text-[9.5px] font-bold tracking-[.10em] text-ink-3 uppercase">
                  <td className="border-b border-ink py-2">Government</td>
                  <td className="border-b border-ink py-2 text-right">
                    Net improving&minus;declining
                    <div className="font-normal normal-case tracking-normal text-ink-3">count, of {allGaugeIds.length} gauges</div>
                  </td>
                  <td className="border-b border-ink py-2 text-right">
                    Avg annualised change
                    <div className="font-normal normal-case tracking-normal text-ink-3">points/year</div>
                  </td>
                  <td className="border-b border-ink py-2 text-right">
                    Avg end-of-term level
                    <div className="font-normal normal-case tracking-normal text-ink-3">0&ndash;100</div>
                  </td>
                </tr>
              </thead>
              <tbody className="font-martian-mono tabular-nums">
                {fullRollup.map((r, i) => (
                  <tr key={r.termId} className={i === fullRollup.length - 1 ? "border-b border-ink" : "border-b border-grid"}>
                    <td className="py-2.5 pr-3 font-public-sans font-semibold text-[13.5px]">{termName(r.termId)}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {rollupCell(r, "net")}{" "}
                      <span className="text-ink-3 text-[10.5px]">
                        ({r.improving}▲/{r.declining}▼/{r.flat}• of {r.nDelta})
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right">{rollupCell(r, "avgAnnual")}</td>
                    <td className="py-2.5 text-right">
                      {rollupCell(r, "avgEnd")}{" "}
                      <span className="text-ink-3 text-[10.5px]">(n={r.nEnd})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-2">
            Denominators differ across columns for the same government by construction: net/rate need &ge;2
            observations inside the term, level needs only one — see &ldquo;Coverage&rdquo; below for exactly
            which gauges are and aren&rsquo;t counted, per term.
          </p>
        </section>

        {/* --------------------------------------------------------------
            Coverage
        -------------------------------------------------------------- */}
        <section className={HR}>
          <h2 className="text-lg font-semibold">Coverage</h2>
          <p className="mt-2 text-ink-2">
            Computed directly from each gauge&rsquo;s own real data — the earliest and latest year Australia
            actually has a value on file — never from{" "}
            <code className="font-martian-mono text-[0.92em]">historyStartYear</code>, which diverges from real
            coverage on several gauges (work-life-balance declares 1990, real data begins 1995; inequality
            declares 1990, real data begins 2012 — the widest gap found). A gauge appears for a government&rsquo;s
            term only if it has real coverage; a gauge missing entirely is named, not blank.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
              <thead>
                <tr className="font-martian-mono text-[9.5px] font-bold tracking-[.10em] text-ink-3 uppercase">
                  <td className="border-b border-ink py-2">Government</td>
                  <td className="border-b border-ink py-2 text-right">Any data</td>
                  <td className="border-b border-ink py-2 text-right">Delta-computable</td>
                  <td className="border-b border-ink py-2">Entirely absent</td>
                </tr>
              </thead>
              <tbody>
                {coverage.map((c, i) => (
                  <tr key={c.termId} className={i === coverage.length - 1 ? "border-b border-ink" : "border-b border-grid"}>
                    <td className="py-2.5 pr-3 font-semibold">{termName(c.termId)}</td>
                    <td className="py-2.5 pr-3 text-right font-martian-mono tabular-nums">{c.anyDataCount} / {allGaugeIds.length}</td>
                    <td className="py-2.5 pr-3 text-right font-martian-mono tabular-nums">{c.deltaComputableCount} / {allGaugeIds.length}</td>
                    <td className="py-2.5 text-ink-2">
                      {c.entirelyAbsentIds.length === 0 ? "— none" : c.entirelyAbsentIds.map(nameOf).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-ink-2">
            The asymmetry is the finding, not a flaw in any one government&rsquo;s record:{" "}
            <strong className="text-ink">
              {coverage[0].deltaComputableCount} delta-computable gauges for {termName("hawke-keating")} against{" "}
              {coverage[3].deltaComputableCount} for {termName("abbott-turnbull-morrison")}
            </strong>{" "}
            &mdash; a structurally larger evidentiary base for the more recent term, purely because more of this
            site&rsquo;s {allGaugeIds.length} gauges exist and have deeper histories by the time later
            governments take office.
          </p>
        </section>

        {/* --------------------------------------------------------------
            Headline set
        -------------------------------------------------------------- */}
        <section className={HR}>
          <h2 className="text-lg font-semibold">Headline gauges</h2>
          <p className="mt-2 text-ink-2">
            Eight gauges with real Australian political charge, chosen to start a conversation, not to be
            exhaustive &mdash; housing affordability, inequality, government debt, school outcomes, crime,
            self-reported wellbeing, and political/social division, alongside GDP per capita as the baseline
            economic question. <strong>Never shown without the full 23 beside it</strong> (below) &mdash;
            curating this set changes which government comes out ahead on {differentWinnerCount} of the{" "}
            {winnerComparisons.length} statistics above (see &ldquo;Curating changes the winner&rdquo;).
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
              <thead>
                <tr className="font-martian-mono text-[9.5px] font-bold tracking-[.10em] text-ink-3 uppercase">
                  <td className="border-b border-ink py-2">Gauge</td>
                  {GOVERNMENT_TERMS.map((t) => (
                    <td key={t.id} className="border-b border-ink py-2 text-center">
                      {t.name}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HEADLINE_GAUGE_IDS.map((id, i) => {
                  const config = gaugesConfig.gauges.find((g) => g.id === id)!;
                  return (
                    <tr key={id} className={i === HEADLINE_GAUGE_IDS.length - 1 ? "border-b border-ink" : "border-b border-grid"}>
                      <td className="py-2 pr-3">
                        <Link href={`/table/${primaryPlate(config)}`} className={LINK}>
                          {config.name}
                        </Link>
                      </td>
                      {GOVERNMENT_TERMS.map((t) => (
                        <GovTermCell key={t.id} stat={allStats[t.id][id]} thresholdScorePointsPerYear={threshold} />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-2">
            <span className="font-martian-mono font-bold text-stamp">n.a.</span> (hatched) = no observation in
            that term at all. <span className="font-martian-mono">N.N†</span> = one observation only, no change
            statable. Otherwise: annualised change (points/year, direction glyph first) over the end-of-term
            level.
          </p>

          <h3 className="mt-6 text-base font-semibold">Curating changes the winner</h3>
          <p className="mt-2 text-ink-2">
            Stated as a number, not left for a reader to notice row by row:{" "}
            <strong className="text-ink">
              curating to the {HEADLINE_GAUGE_IDS.length} most politically salient gauges changes which
              government comes out ahead on {differentWinnerCount} of the {winnerComparisons.length} statistics
              above
            </strong>
            {differentWinnerCount === winnerComparisons.length ? " — every one of them." : "."}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
              <thead>
                <tr className="font-martian-mono text-[9.5px] font-bold tracking-[.10em] text-ink-3 uppercase">
                  <td className="border-b border-ink py-2">Statistic</td>
                  <td className="border-b border-ink py-2">Winner, all {allGaugeIds.length}</td>
                  <td className="border-b border-ink py-2">Winner, headline {HEADLINE_GAUGE_IDS.length}</td>
                  <td className="border-b border-ink py-2">Same?</td>
                </tr>
              </thead>
              <tbody>
                {winnerComparisons.map((w, i, arr) => (
                  <tr key={w.stat} className={i === arr.length - 1 ? "border-b border-ink" : "border-b border-grid"}>
                    <td className="py-2 pr-3 text-ink-2">{w.label}</td>
                    <td className="py-2 pr-3 font-semibold">{termName(w.fullWinnerTermId)}</td>
                    <td className="py-2 pr-3 font-semibold">{termName(w.headlineWinnerTermId)}</td>
                    <td className={`py-2 font-martian-mono ${w.same ? "text-ink-2" : "text-stamp font-bold"}`}>
                      {w.same ? "same" : "different"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-base font-semibold">Salience and coverage are anti-correlated</h3>
          <p className="mt-2 text-ink-2">
            A finding about measuring Australia, not a caveat about this page. Of the eight headline gauges,{" "}
            <strong className="text-ink">
              {[...headlineCoverage[0].entirelyAbsentIds, ...headlineCoverage[0].singleObservationIds]
                .map(nameOf)
                .join(", ")}
            </strong>{" "}
            are exactly the newest, shortest-history series on the site. For {termName("hawke-keating")} and{" "}
            {termName("howard")}, all {headlineCoverage[0].entirelyAbsentIds.length} of them are blank. That
            leaves only{" "}
            <strong className="text-ink">
              {headlineCoverage[0].deltaComputableCount} of {HEADLINE_GAUGE_IDS.length}
            </strong>{" "}
            headline gauges computable for the earliest government &mdash; of those {headlineRollup[0].nDelta}
            , {headlineRollup[0].improving} improve, {headlineRollup[0].flat} read flat, and{" "}
            {headlineRollup[0].declining} decline. The gauges people would most want on a &ldquo;north
            star&rdquo; list &mdash; inequality, wellbeing, school outcomes &mdash; are structurally the ones
            with the shallowest history: the measures people most want are the ones history can least support.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[12px]">
              <thead>
                <tr className="font-martian-mono text-[9.5px] font-bold tracking-[.10em] text-ink-3 uppercase">
                  <td className="border-b border-ink py-2">Government</td>
                  <td className="border-b border-ink py-2 text-right">Headline set delta-computable</td>
                  <td className="border-b border-ink py-2 text-right">Full set delta-computable</td>
                </tr>
              </thead>
              <tbody className="font-martian-mono tabular-nums">
                {salience.rows.map((row, i) => (
                  <tr key={row.termId} className={i === salience.rows.length - 1 ? "border-b border-ink" : "border-b border-grid"}>
                    <td className="py-2 pr-3 font-public-sans">{termName(row.termId)}</td>
                    <td className="py-2 pr-3 text-right">
                      {row.headlineDeltaComputable}/{salience.headlineCount} ({(row.headlineFraction * 100).toFixed(0)}%)
                    </td>
                    <td className="py-2 text-right">
                      {row.fullDeltaComputable}/{salience.fullCount} ({(row.fullFraction * 100).toFixed(0)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --------------------------------------------------------------
            Full 23
        -------------------------------------------------------------- */}
        <section className={HR}>
          <h2 className="text-lg font-semibold">Every gauge, every government</h2>
          <p className="mt-2 text-ink-2">
            The complete set the headline table above is drawn from — the same coverage rule, the same cell
            treatment. Every gauge name links to its own table.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[12px]">
              <thead>
                <tr className="font-martian-mono text-[9px] font-bold tracking-[.10em] text-ink-3 uppercase">
                  <td className="border-b border-ink py-2">Gauge</td>
                  {GOVERNMENT_TERMS.map((t) => (
                    <td key={t.id} className="border-b border-ink py-2 text-center">
                      {t.name}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allGaugeIds.map((id, i) => {
                  const config = gaugesConfig.gauges.find((g) => g.id === id)!;
                  return (
                    <tr key={id} className={i === allGaugeIds.length - 1 ? "border-b border-ink" : "border-b border-grid"}>
                      <td className="py-1.5 pr-3">
                        <Link href={`/table/${primaryPlate(config)}`} className={LINK}>
                          {config.name}
                        </Link>
                      </td>
                      {GOVERNMENT_TERMS.map((t) => (
                        <GovTermCell key={t.id} stat={allStats[t.id][id]} thresholdScorePointsPerYear={threshold} />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* --------------------------------------------------------------
            Common-coverage robustness table
        -------------------------------------------------------------- */}
        <section className={HR}>
          <h2 className="text-lg font-semibold">Robustness check: common-coverage gauges only</h2>
          <p className="mt-2 text-ink-2">
            The {commonGaugeIds.length} of {allGaugeIds.length} gauges with a delta-computable reading in{" "}
            <strong>every</strong> government&rsquo;s term — coverage held fixed, so any remaining disagreement
            between the three statistics can&rsquo;t be blamed on comparing different baskets of gauges per
            government. This does not become the headline comparison — it exists only to show whether the
            disagreement above survives when coverage is equalised.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="font-martian-mono text-[9.5px] font-bold tracking-[.10em] text-ink-3 uppercase">
                  <td className="border-b border-ink py-2">Government</td>
                  <td className="border-b border-ink py-2 text-right">Net improving&minus;declining</td>
                  <td className="border-b border-ink py-2 text-right">Avg annualised change</td>
                  <td className="border-b border-ink py-2 text-right">Avg end-of-term level</td>
                </tr>
              </thead>
              <tbody className="font-martian-mono tabular-nums">
                {commonRollup.map((r, i) => (
                  <tr key={r.termId} className={i === commonRollup.length - 1 ? "border-b border-ink" : "border-b border-grid"}>
                    <td className="py-2.5 pr-3 font-public-sans font-semibold text-[13.5px]">{termName(r.termId)}</td>
                    <td className="py-2.5 pr-3 text-right">{rollupCell(r, "net")}</td>
                    <td className="py-2.5 pr-3 text-right">{rollupCell(r, "avgAnnual")}</td>
                    <td className="py-2.5 text-right">{rollupCell(r, "avgEnd")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-ink-2">
            The three rankings still disagree here, restricted to identical coverage — proof the disagreement
            in &ldquo;Three statistics, published together&rdquo; above is a property of the statistics
            themselves, not an artefact of comparing different gauge sets per government.
          </p>
        </section>

        <section className={HR}>
          <p className="text-[12px] text-ink-2">
            See{" "}
            <Link href="/methodology" className={LINK}>
              Methodology
            </Link>{" "}
            for the full ruling behind this page, and{" "}
            <Link href="/" className={LINK}>
              the homepage
            </Link>{" "}
            for Power and Quality of Life, the site&rsquo;s two scored dimensions — this page is neither.
          </p>
        </section>
      </div>
    </div>
  );
}
