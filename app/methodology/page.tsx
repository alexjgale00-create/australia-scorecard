import Link from "next/link";
import { gaugesConfig, getGaugeData, getGaugesForDimension } from "@/lib/gauges-data";
import { latestDataYear } from "@/lib/maturity";

export const metadata = { title: "Methodology — The Australia Scorecard" };

export default function MethodologyPage() {
  // Derived live from config + data files, not hardcoded — a prior version
  // of this paragraph stated "13 of 16 live" and "most Quality of Life
  // gauges awaiting data" long after both had become false, on a page whose
  // own first sentence promises "if a number disagrees with this page, the
  // number is wrong." Fixed 2026-08-24 to compute from source so this class
  // of error can't recur silently — see CLAUDE.md.
  const powerGauges = getGaugesForDimension("power");
  const qolGauges = getGaugesForDimension("quality-of-life");
  const powerLiveCount = powerGauges.filter((g) => getGaugeData(g.id)?.provenance.status === "LIVE").length;
  const qolLiveCount = qolGauges.filter((g) => getGaugeData(g.id)?.provenance.status === "LIVE").length;

  // Same rule as above: the gauge's age is derived from its own data at
  // render time, never hardcoded — a static "seven years old" would itself
  // go stale the moment this page is rebuilt in a later calendar year.
  const majorityAcceptanceYear = latestDataYear(getGaugeData("cohesion-majority-acceptance"));
  const majorityAcceptanceAgeYears =
    majorityAcceptanceYear !== null ? new Date().getFullYear() - majorityAcceptanceYear : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Methodology</h1>
      <p className="mt-3 max-w-2xl text-[var(--text-secondary)]">
        This page is generated directly from{" "}
        <code className="rounded bg-[var(--surface-1)] px-1.5 py-0.5 text-sm">
          gauges.config.json
        </code>
        , the single file that defines every source, weight, and polarity decision on
        this site. If a number disagrees with this page, the number is wrong — file an
        issue.
      </p>

      <section className="mt-8 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">How the level score is calculated</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          For each gauge, every peer country&rsquo;s latest available value is compared
          using min-max normalisation across the 9-country peer set: the best-performing
          country in the set scores 100, the worst scores 0, and Australia is placed
          linearly between them. Whether &ldquo;best&rdquo; means highest or lowest is
          the gauge&rsquo;s <strong>polarity</strong>, set explicitly below — never
          inferred.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">How direction is calculated</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          The direction shown everywhere on this site (gauge cards, dot strips, the
          What&rsquo;s Moving callout) is <strong>peer-relative</strong>: it classifies the
          trend in Australia&rsquo;s <em>level score</em>{" "}— its position within the 9-country
          peer set — not the trend in the raw published number. Australia&rsquo;s level
          score is compared between its latest year and roughly 10 years earlier (or the
          earliest available point, if the series is shorter). The annualised score-point
          change is classified{" "}
          <strong>improving</strong>{" "}if it exceeds +
          {gaugesConfig.directionThresholdScorePointsPerYear} points per year,{" "}
          <strong>deteriorating</strong>{" "}if it falls below &minus;
          {gaugesConfig.directionThresholdScorePointsPerYear} points per year, and{" "}
          <strong>flat</strong> otherwise.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          This can disagree with Australia&rsquo;s own raw-value trend — a raw number can
          rise while the country still loses ground to faster-improving peers, or vice
          versa. That raw-value trend is calculated separately (annualised % change vs a{" "}
          {gaugesConfig.directionThresholdPctPerYear}%-per-year threshold) and shown only
          in the &ldquo;Two ways to read this&rdquo; block on each gauge&rsquo;s detail
          page, specifically so the two are never presented as if they were the same
          number.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">How the composite verdict is calculated</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          <strong>The site produces two composites, never one.</strong> Power and Quality of
          Life are each a weighted average of their own gauges&rsquo; level scores, using each
          gauge&rsquo;s own weight within that dimension &mdash; the two are never blended into a
          single number. Weights sum to 1 within each dimension: currently{" "}
          {gaugesConfig.gauges.filter((g) => g.weights.power !== undefined).length} gauges in
          Power, {gaugesConfig.gauges.filter((g) => g.weights["quality-of-life"] !== undefined).length}{" "}
          in Quality of Life. When a gauge has no data for a given year, its weight is excluded
          from that dimension&rsquo;s average and the remaining weights are renormalised &mdash;
          missing data is never estimated or substituted.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          A gauge can feed both dimensions at once, at independent weights &mdash; currently only{" "}
          <Link href="/gauges/housing-pressure" className="underline">
            Housing pressure
          </Link>
          . This is always disclosed on the gauge&rsquo;s own page, on{" "}
          <a href="/status" className="underline">
            Data status
          </a>
          , and below.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">Alternate scoring basis: latest-wave-per-country</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          Every gauge on this site compares all 9 countries&rsquo; values from the{" "}
          <strong>same shared year</strong> &mdash; except gauges explicitly marked below, which use{" "}
          <strong>latest-wave-per-country</strong> instead: each country contributes its own most
          recent available value, even though that value comes from a different calendar year per
          country. This is a deliberate, disclosed departure, not an inconsistency &mdash; used
          only for attitude-survey gauges whose source fields irregular, non-synchronized waves
          per country, where requiring a shared year would exclude most of the peer set.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          Gauges on this basis: currently{" "}
          {gaugesConfig.gauges
            .filter((g) => g.scoringBasis === "latest-wave-per-country")
            .map((g) => g.name)
            .join(", ") || "none"}
          . Direction on this basis reports <strong>&ldquo;Insufficient history&rdquo;</strong>{" "}
          rather than a computed improving/flat/deteriorating arrow whenever a gauge has fewer than
          3 waves or less than 6 years between its earliest and latest &mdash; not the same as
          &ldquo;Flat&rdquo; (a real trend was computed) or &ldquo;No trend data&rdquo; (no
          comparable data exists at all). See{" "}
          <a href="/status" className="underline">
            Data status
          </a>{" "}
          for the full explanation, always shown there regardless of which gauge page you land on.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">Score bands (the verdict label)</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          The composite score is also shown as a plain-English band, so &ldquo;37.1 / 100&rdquo;
          reads as &ldquo;Australia is Slipping.&rdquo; Bands apply to any 0&ndash;100 score
          within a dimension: that dimension&rsquo;s composite verdict, one of its individual
          gauges, or a peer country.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          <strong>Both dimensions are ruled, final, and on the same derivation rule</strong> as
          of 2026-08-24: each dimension&rsquo;s bands divide{" "}
          <em>that dimension&rsquo;s own achievable range</em> &mdash; the true minimum and
          maximum any of the 9 peers has actually reached, any year from 1990 to present &mdash;
          into five equal parts. One rule, run twice. The two tables below show different
          numbers because the two dimensions&rsquo; real ranges are different shapes (Power:
          27.1&ndash;72.2; Quality of Life: 9.8&ndash;83.8, well over half again as wide) &mdash;
          not because a different method was used. A reader who notices the thresholds differ
          between the two dimension pages should read that as the ranges differing, not the rule.
        </p>

        <h3 className="mt-5 text-base font-semibold">Power</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Achievable range 27.1&ndash;72.2 (minimum: South Korea, 1991 &middot; maximum: United
          States, 1992). Full options memo (three schemes tested, run-length/churn decomposition,
          hard-constraint and proximity checks) is in METHODOLOGY.md&rsquo;s &ldquo;Phase D, Item
          1.&rdquo;
        </p>
        <div className="mt-3 space-y-2">
          {gaugesConfig.dimensions
            .find((d) => d.id === "power")!
            .scoreBands.map((b) => (
              <div key={b.id} className="flex items-center gap-3 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ background: b.color }}
                  aria-hidden="true"
                />
                <span className="w-32 shrink-0 font-medium">{b.label}</span>
                <span className="tabular-nums text-[var(--text-muted)]">
                  {b.min}&ndash;{b.max}
                </span>
              </div>
            ))}
        </div>

        <h3 className="mt-6 text-base font-semibold">Quality of Life</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Achievable range 9.8&ndash;83.8 (minimum: United States, 2005 &middot; maximum:
          Germany, 2020) &mdash; computed after fixing a real defect in the trajectory series
          that fed this calculation (see &ldquo;Trajectory series fix&rdquo; in METHODOLOGY.md):
          3 of 7 gauges hadn&rsquo;t reached 2024/2025 yet, so those years were excluded from the
          range calculation, not just the chart. A hand-centred alternative (Holding on the
          pooled median, wider outer bands) was the standing preference for most of this review
          but was rejected at ruling time &mdash; its own outer boundaries had no principled
          answer to &ldquo;why there and not two points either side,&rdquo; and adopting a
          different derivation method per dimension was judged worse than the difference between
          the two schemes.
        </p>
        <div className="mt-3 space-y-2">
          {gaugesConfig.dimensions
            .find((d) => d.id === "quality-of-life")!
            .scoreBands.map((b) => (
              <div key={b.id} className="flex items-center gap-3 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ background: b.color }}
                  aria-hidden="true"
                />
                <span className="w-32 shrink-0 font-medium">{b.label}</span>
                <span className="tabular-nums text-[var(--text-muted)]">
                  {b.min}&ndash;{b.max}
                </span>
              </div>
            ))}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">A disclosed limitation of equal weighting</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          Power&rsquo;s 16 gauges are weighted equally (1/16 each) by design &mdash; see
          &ldquo;How the composite verdict is calculated&rdquo; above. A correlation check across
          each gauge&rsquo;s 36-year Australia level-score series found that four of them (
          <strong>Living standards</strong>, <strong>Productivity</strong>,{" "}
          <strong>Economic output</strong>, and <strong>Trade</strong>) move together strongly
          (r&nbsp;=&nbsp;0.65&ndash;0.85): different measurements of the same underlying thing,
          how large and productive the economy is. Because each still carries its own full 1/16,
          this cluster&rsquo;s shared concept currently accounts for roughly a quarter of the
          Power composite, while a conceptually distinct, single-indicator concern like rule of
          law and corruption carries a sixteenth. We checked for this rather than assuming it
          away, and chose not to build correction machinery for it (a sub-index grouping, or a
          statistical re-weighting) &mdash; doing so would trade one transparent, easily-stated
          judgment (every gauge counts the same) for a less transparent one (which correlations
          reflect genuine overlap versus one country&rsquo;s coincidental 36-year history, and how
          much to discount them), and this project has never built or attempted that kind of
          machinery elsewhere. Flagging the concentration plainly is the position; fixing it is
          not, at least not yet.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">Staleness thresholds</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          A gauge is flagged <strong>STALE</strong> when more time has passed since its latest data
          point than that source normally takes to publish a new one &mdash; set per-gauge from
          each source&rsquo;s own real publication cadence (see each gauge&rsquo;s entry below),
          never a single blanket rule. This is separate from a gauge&rsquo;s maturity tier: a gauge
          can be stale and still Established, since staleness is about whether the number itself is
          current, not whether the fetch mechanism is proven to keep working.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          Two gauges &mdash; <strong>Innovation</strong> and <strong>Personal safety</strong> &mdash;
          carry no numeric threshold at all. Their sources have no discoverable, authoritative
          release calendar precise enough to set one against, and guessing a number would risk
          flagging healthy, current data as stale &mdash; exactly the false precision this
          threshold system exists to avoid. Both instead carry their own explanatory note, shown on
          their own card below and on their gauge page, in place of a computed STALE flag.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Every gauge, in full</h2>
        {gaugesConfig.dimensions.map((dimension) => (
          <div key={dimension.id} className="mb-8">
            <h3 className="mb-3 text-lg font-semibold">{dimension.name}</h3>
            <div className="space-y-4">
              {gaugesConfig.gauges
                .filter(
                  (g) => g.weights[dimension.id] !== undefined || g.unscoredDimensions?.includes(dimension.id)
                )
                .map((g) => (
                  <div key={g.id} className="rounded-lg border border-[var(--gridline)] p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="text-lg font-semibold">{g.name}</h4>
                      <span className="text-sm text-[var(--text-muted)]">
                        {g.weights[dimension.id] !== undefined
                          ? `Weight in ${dimension.shortName}: ${((g.weights[dimension.id] ?? 0) * 100).toFixed(1)}%`
                          : "Not scored"}
                      </span>
                    </div>
                    {g.unscoredReason && (
                      <p
                        className="mt-2 rounded-md border p-2.5 text-sm"
                        style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
                      >
                        {g.unscoredReason}
                      </p>
                    )}
                    {Object.keys(g.weights).length > 1 && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Also scored in{" "}
                        {gaugesConfig.dimensions
                          .filter((d) => d.id !== dimension.id && g.weights[d.id] !== undefined)
                          .map((d) => d.name)
                          .join(", ")}{" "}
                        — see &ldquo;Scored in both dimensions&rdquo; on this gauge&rsquo;s own page.
                      </p>
                    )}
                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-[var(--text-muted)]">Unit</dt>
                        <dd>{g.unit}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">Source institution</dt>
                        <dd>
                          <a href={g.source.url} className="underline" target="_blank" rel="noreferrer">
                            {g.source.institution}
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">Series ID</dt>
                        <dd>
                          <code>{g.source.seriesId}</code> &mdash; {g.source.seriesName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">Access type</dt>
                        <dd className="capitalize">{g.accessType}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">Polarity</dt>
                        <dd className="capitalize">{g.polarity.replace(/_/g, " ")}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">History target</dt>
                        <dd>{g.historyStartYear} &ndash; present</dd>
                      </div>
                      {g.evidenceStrength === "survey" && (
                        <div>
                          <dt className="text-[var(--text-muted)]">Evidence strength</dt>
                          <dd>Survey-based (self-report), not a directly measured hard statistic</dd>
                        </div>
                      )}
                      {g.scoringBasis === "latest-wave-per-country" && (
                        <div>
                          <dt className="text-[var(--text-muted)]">Scoring basis</dt>
                          <dd>Latest-wave-per-country &mdash; see above</dd>
                        </div>
                      )}
                    </dl>
                    <p className="mt-3 text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">Polarity justification: </span>
                      {g.polarityJustification}
                    </p>
                    {g.dataPolicy && (
                      <p
                        className="mt-3 rounded-md border p-2.5 text-sm"
                        style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
                      >
                        <span style={{ color: "var(--status-warning)" }}>⚠ Data policy: </span>
                        {g.dataPolicy}
                      </p>
                    )}
                    {g.accessType === "api" && g.staleDisclosure && (
                      <p
                        className="mt-3 rounded-md border p-2.5 text-sm"
                        style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
                      >
                        <span className="text-[var(--text-muted)]">Staleness: </span>
                        {g.staleDisclosure}
                      </p>
                    )}
                    {g.accessType === "api" && !g.staleDisclosure && g.staleAfterMonths !== undefined && (
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        <span className="text-[var(--text-muted)]">Flagged stale after: </span>
                        {g.staleAfterMonths} months without a newer observation — set from this
                        source&rsquo;s own real publication cadence, see &ldquo;Staleness
                        thresholds&rdquo; above.
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">Peer benchmark set</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          {gaugesConfig.peerCountries.map((c) => c.name).join(", ")}. Fixed for v1; not
          adjustable by users.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">Current build status</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          Phase E: the site now scores two dimensions. Power is complete ({powerGauges.length} gauges
          configured, {powerLiveCount} with real LIVE data). Quality of Life launched with{" "}
          {qolGauges.length} gauges (2026-08) and is likewise complete ({qolLiveCount} with real LIVE
          data). Each gauge&rsquo;s own provenance block states whether it&rsquo;s{" "}
          <strong>live</strong> (fetched by <code>/pipeline</code> or entered by hand from its named
          source) or still <strong>sample data</strong> pending entry. Every gauge card carries its
          own maturity and evidence tags when applicable, and a page-level note appears whenever a
          dimension&rsquo;s gauge set is mixed.
        </p>
      </section>

      <section className="mt-10 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-xl font-semibold">Quality of Life dimension (Phase E, 2026-08)</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          A second, independently-scored composite: does Australia remain a good place to live?
          Same 9 peers, same min-max peer-relative scoring, same peer-relative direction basis,
          same maturity tiers, same provenance and loud-failure rules as Power &mdash;{" "}
          <strong>never folded into Power&rsquo;s composite</strong>. The interesting output is the
          tension between the two verdicts, shown with equal prominence side by side on the
          homepage. Both dimensions&rsquo; band thresholds remain provisional pending Phase D,
          which now covers both together.
        </p>

        <h3 className="mt-5 text-base font-semibold">Gauge set: 8 launched, 4 deferred, several excluded</h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          Launched: Life expectancy, Housing affordability (reused from Power&rsquo;s Housing
          pressure), Life satisfaction, Personal safety, Work-life balance, Air quality, and the
          two-gauge social cohesion cluster (below). Deferred to a second batch, pending further
          source-feasibility work: health system performance (avoidable mortality vs. health-spend
          input, undecided), incarceration rate (World Prison Brief has no confirmed bulk
          download/API), road deaths (deliberately not launched alongside obesity and drug-induced
          deaths, to avoid three gauges from one &ldquo;health risk behaviours&rdquo; theme), and
          social support/trust (OECD&rsquo;s own Trust Survey has only 2 rounds since 2021 &mdash;
          too young for this site&rsquo;s 10-year direction calculation). Excluded outright: paid
          parental leave and statutory paid holiday (policy settings, not outcomes &mdash; a real
          departure from this site&rsquo;s outcome-first pattern that every other scored gauge,
          including the policy-adjacent ones like military capability and hours worked, avoids);
          NEET rate (reads closer to Power&rsquo;s economic/labour-market territory); commute time
          (OECD Time Use Survey runs on infrequent, non-synchronized national waves, unusable for
          annual scoring); broadband/digital access (doesn&rsquo;t clearly answer &ldquo;is this a
          good place to live&rdquo; the way the launched 8 do).
        </p>

        <h3 className="mt-5 text-base font-semibold">The social cohesion cluster</h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          Cohesion across political, racial, religious, and country-of-origin lines, measured from
          both sides &mdash; ruled as <strong>paired gauges</strong>, not one gauge with two
          sub-scores:{" "}
          <Link href="/gauges/cohesion-minority-experience" className="underline">
            Cohesion &mdash; minority experience
          </Link>{" "}
          (V-Dem&rsquo;s <code>v2clsocgrp</code>, the same proven Our World in Data republication
          route already built for Internal cohesion&rsquo;s <code>v2cacamps</code>) and{" "}
          <Link href="/gauges/cohesion-majority-acceptance" className="underline">
            Cohesion &mdash; majority acceptance
          </Link>{" "}
          (Gallup&rsquo;s Migrant Acceptance Index). Originally planned as two independently-scored
          gauges — as of 2026-08-11, only minority experience is actually scored (1/7 weight within
          Quality of Life&rsquo;s 7 scored gauges). Majority acceptance turned out to be{" "}
          <strong>unscored</strong>: fetching its real source revealed the 2019 wave publishes only a
          global top-10 list, 4 of the 9 peers, and precisely the 4 highest scorers — any score
          computed from that subset would be structurally biased upward, not just incomplete. Ruling:
          show the real data (both waves, honestly labelled) without pretending it supports a
          peer-relative score. See &ldquo;Unscored gauges&rdquo; below and this gauge&rsquo;s own
          page for the full reasoning.
        </p>

        <h3 className="mt-5 text-base font-semibold">Unscored gauges</h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          A gauge can appear on a dimension&rsquo;s page &mdash; its own card, its own detail page,
          real data shown &mdash; without being scored or counted in that dimension&rsquo;s
          composite. Deliberately distinct from &ldquo;Awaiting data&rdquo;: an unscored gauge
          isn&rsquo;t missing anything, a scoring decision was made against it on purpose. The
          composite math enforces this structurally, not by convention &mdash; an unscored gauge
          simply has no weight entry for that dimension, so the composite functions already skip it
          via the same &ldquo;not part of this dimension&rsquo;s math&rdquo; path used for a gauge
          that belongs to a different dimension entirely, no special-case branch to forget.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          Currently one case:{" "}
          {gaugesConfig.gauges
            .filter((g) => (g.unscoredDimensions?.length ?? 0) > 0)
            .map((g, i, arr) => (
              <span key={g.id}>
                <Link href={`/gauges/${g.id}`} className="underline">
                  {g.name}
                </Link>
                {i < arr.length - 1 ? ", " : ""}
              </span>
            ))}
          . <em>{gaugesConfig.gauges.find((g) => g.unscoredDimensions?.length)?.unscoredReason}</em>
        </p>

        <h3 className="mt-5 text-base font-semibold">
          Majority-attitude source search (Step 1, 2026-08) &mdash; the full record
        </h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          Before accepting Gallup&rsquo;s Migrant Acceptance Index (2 waves only, 2016/17 and
          2019) as the gauge&rsquo;s source, five live, repeating candidates were checked for a
          better-cadence, peer-complete alternative. None cleared the bar. Recorded in full here so
          a future session never repeats this hunt from scratch:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
          <li>
            <strong>Gallup&rsquo;s own broader World Poll item</strong> (&ldquo;is your community a
            good place to live for immigrants/minorities&rdquo;) &mdash; genuinely still fielded
            most years (confirmed press releases in 2013, 2018/19, and 2025), but the full
            country-year table is published only via Gallup Analytics, a paid subscription. Free
            coverage is limited to whichever handful of countries each year&rsquo;s press release
            happens to name &mdash; not better than the existing MAI waves for this site&rsquo;s
            purposes, just a different irregular snapshot of the same underlying instrument.
          </li>
          <li>
            <strong>World Values Survey Wave 8</strong> &mdash; genuinely live and repeating in
            principle (fieldwork January 2024 through December 2026), but mid-fieldwork with no
            released results as of this entry. Nothing to score today.
          </li>
          <li>
            <strong>Pew Research Global Attitudes</strong> &mdash; no systematic recurring
            &ldquo;same battery, same countries, every wave&rdquo; product on immigration/diversity
            across all 9 peers; country selection changes survey to survey.
          </li>
          <li>
            <strong>Ipsos Global Views on Immigration</strong> &mdash; the closest real
            alternative: a genuinely recurring tracker (~3-yearly, most recently feeding a 2026
            Ipsos/UNHCR report), confirmed live covering 8 of our 9 peers (Australia, Canada,
            Germany, UK, Japan, South Korea, New Zealand, USA) &mdash;{" "}
            <strong>missing the Netherlands</strong>.
          </li>
          <li>
            <strong>Edelman Trust Barometer</strong> &mdash; genuinely annual (published every
            January, the best cadence found), 28 countries, but its relevant item is a generalized
            &ldquo;hesitant to trust someone different&rdquo; question, not a direct
            immigration-acceptance item &mdash; a proxy, not a match &mdash; and full confirmation
            of Netherlands/New Zealand/South Korea inclusion in the current country list wasn&rsquo;t
            found live.
          </li>
        </ul>
        <h3 className="mt-5 text-base font-semibold">
          Majority-attitude source re-verification (2026-08-25)
        </h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          A ruling session re-checked four real candidates live against their own sources rather
          than relying on desk research, and found two corrections worth recording. ISSP&rsquo;s
          2023 National Identity &amp; Citizenship module (GESIS, <code>ZA10010_v1.0.0</code>,
          released 13 March 2026) covers 7 of the 9 peers cleanly — Great Britain was fielded but
          published separately as <code>ZA9132</code> for methodological reasons (GB and Scotland
          were surveyed as two distinct studies), and Japan does not appear in this release at all.
          The World Values Survey&rsquo;s Wave 7 (2017&ndash;2022) is the only source confirmed
          covering all 9 peers — but whether its own Online Data Analysis tool publishes
          country-level statistics directly, rather than requiring this Scorecard to compute a
          country statistic from microdata itself for the first time, is not yet confirmed (see the
          follow-up below). Ipsos/UNHCR&rsquo;s World Refugee Day survey now covers the Netherlands,
          confirmed in both the 2025 and 2026 editions — but the earlier finding that
          &ldquo;New Zealand is absent from every wave&rdquo; does not hold: New Zealand appears in
          Ipsos&rsquo;s larger periodic edition (52 countries, including all 9 peers, in 2024) and
          is only absent from the smaller ~29-country annual edition used in 2025 and 2026. The
          accurate statement is that Ipsos <strong>rotates</strong> its country set rather than
          structurally excluding any one peer — the source fails on repeatability, not on a fixed
          gap — and separately, it measures attitudes to refugees specifically, not migrants
          generally.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          <strong>Four named, dated upgrade triggers</strong> replace the single prior Ipsos
          trigger:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
          <li>
            <strong>ISSP <code>ZA10010</code> reaching a version with Japan and a usable GB
            file</strong> — GESIS has real precedent for folding in late-arriving countries at a
            later integrated-file version. Review by <strong>2027-03-01</strong>.
          </li>
          <li>
            <strong>WVS Wave 8&rsquo;s public release</strong> — fieldwork runs January 2024 through
            December 2026; no stated release timetable was found. Review by
            <strong> 2027-06-01</strong>.
          </li>
          <li>
            <strong>Gallup publishing a third Migrant Acceptance Index administration</strong> with
            full country tables. No cadence to anchor a date to — standing annual check, starting
            <strong> 2027-08-25</strong>.
          </li>
          <li>
            <strong>The WVS Online Analysis tool eligibility check</strong> — not tied to an
            external publication date, and the fastest-resolving of the four. See the named
            follow-up below.
          </li>
        </ul>
        <p className="mt-3 text-[var(--text-secondary)]">
          <strong>Retirement was raised and answered, not left open</strong>: this gauge has two
          real, dated paths to a complete peer set (above), so &ldquo;it can never improve by
          waiting&rdquo; no longer holds — ruling is do not retire. Full reasoning in
          METHODOLOGY.md.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          <strong>Named follow-up (not started)</strong>: confirm whether the WVS Online Analysis
          tool publishes exportable per-country statistics for the Q21 neighbours item or the
          Q121&ndash;Q130 migration battery. This gates two separate questions at once — whether
          WVS Wave 7 is usable at all without this Scorecard computing its own country statistic
          from microdata for the first time (a constitutional decision reserved for its own
          session), and, only if so, whether &ldquo;majority acceptance&rdquo; should be rescoped to
          what WVS actually measures rather than Gallup&rsquo;s original construct — a concept
          change, not a source change, that deserves its own explicit ruling rather than happening
          by drift.
        </p>
        <p className="mt-3 text-[var(--text-secondary)]">
          Until any of the above resolves, the gauge page states plainly:
        </p>
        <p
          className="mt-3 rounded-md border p-3 text-sm italic"
          style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
        >
          &ldquo;Four public sources were checked for a current, all-peer measure of majority
          attitudes toward migrants. None qualifies today — one is missing Japan, one would require
          this site to compute its own statistic from microdata for the first time, one measures
          refugee attitudes rather than migrants generally and doesn&rsquo;t repeat with full
          coverage. This gauge uses the last comparable data actually published, and states plainly
          that it&rsquo;s{" "}
          {majorityAcceptanceAgeYears !== null ? `${majorityAcceptanceAgeYears} years` : "several years"}{" "}
          old.&rdquo;
        </p>

        <h3 className="mt-5 text-base font-semibold">Non-peer-complete context: Scanlon and Eurobarometer</h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          Two excellent sources don&rsquo;t cover all 9 peers and can&rsquo;t score, but are
          planned as labelled, non-scored time-series context blocks on the Cohesion &mdash;
          majority acceptance gauge page, same pattern as the WID wealth-share box on Inequality:
          the <strong>Scanlon Foundation</strong>&rsquo;s Mapping Social Cohesion report
          (Australia-only, annual since 2007) and <strong>Eurobarometer</strong> (EU-only; among
          our 9 peers, only the Netherlands and Germany are current members &mdash; the UK dropped
          out post-Brexit). Blocked on sequencing, not decided against: the gauge&rsquo;s own base
          Gallup MAI data has to be entered by hand first before a context block has anything to
          attach to &mdash; deferred to the manual-entry phase along with the gauge&rsquo;s first
          real numbers.
        </p>

        <h3 className="mt-5 text-base font-semibold">OECD Better Life Index overlap</h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          Answered honestly rather than glossed over: several Quality of Life gauges (life
          satisfaction especially) substantially rebuild ground BLI already covers, so the
          underlying data isn&rsquo;t new. What&rsquo;s additive is the{" "}
          <strong>verdict layer</strong> (a plain-English band, not a raw indicator grid), the{" "}
          <strong>peer-relative trajectory scoring</strong> (BLI has no direction/trend concept),
          and the <strong>pairing against Power</strong> &mdash; whether Australia is rising and
          whether it&rsquo;s still good to live here are two different questions, and the tension
          between their answers is the actual product. The site&rsquo;s framing says this
          explicitly rather than implying original data collection.
        </p>

        <h3 className="mt-5 text-base font-semibold">Evidence-strength display</h3>
        <p className="mt-2 text-[var(--text-secondary)]">
          Hard statistics and survey/attitude data don&rsquo;t look identical on this site: a
          quiet, typographic &ldquo;Survey-based&rdquo; text tag (not another amber badge &mdash;
          amber already means &ldquo;data caveat&rdquo; via the Sample Data badge and
          MaturityTag, and survey evidence isn&rsquo;t a caveat, just a different evidence type)
          appears next to a gauge&rsquo;s name wherever it&rsquo;s shown. Hard statistics are the
          unmarked default, same &ldquo;quiet by default&rdquo; pattern as the Established maturity
          tier. Currently applies to Life satisfaction and Cohesion &mdash; majority acceptance.
        </p>
      </section>
    </div>
  );
}
