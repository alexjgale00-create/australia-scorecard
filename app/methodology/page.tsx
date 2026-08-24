import Link from "next/link";
import { gaugesConfig, getGaugeData, getGaugesForDimension } from "@/lib/gauges-data";

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
          reads as &ldquo;Australia is Slipping.&rdquo; Bands apply to any 0&ndash;100 score on
          this site: the composite verdict, an individual gauge, or a peer country.
        </p>
        <div
          className="mt-4 rounded-md border p-3 text-sm"
          style={{ borderColor: "var(--status-warning)", color: "var(--text-secondary)" }}
        >
          ⚠ <strong>Placeholder thresholds.</strong>{" "}The boundaries below (24/44/59/79) were
          picked for a clean 5-way split of 0&ndash;100 and have <strong>not</strong>{" "}been
          calibrated against real data. They must be reviewed at Phase D, once all 16 gauges
          are live with real numbers, before any public release.
          <br className="hidden sm:block" />
          Band boundaries are provisional pending full-data recalibration. — dated 2026-07-14.
        </div>
        <div className="mt-4 space-y-2">
          {gaugesConfig.scoreBands.map((b) => (
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
        <p className="mt-3 text-[var(--text-secondary)]">
          <strong>Named upgrade candidates for a later phase</strong>, each with the condition it
          would need to meet: Ipsos Global Views on Immigration, if a fuller release confirms
          Netherlands coverage; WVS Wave 8, once its December 2026 fieldwork concludes and results
          are released. Until then, the gauge page states plainly:
        </p>
        <p
          className="mt-3 rounded-md border p-3 text-sm italic"
          style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
        >
          &ldquo;No public, peer-complete majority-attitude series is currently available for these
          nine countries. Gallup continues to field the underlying question, but country-level
          results since 2019 are published only behind a paid subscription. This gauge therefore
          uses the last freely published waves (2016/17 and 2019). The absence of a current public
          series is itself a finding.&rdquo;
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
