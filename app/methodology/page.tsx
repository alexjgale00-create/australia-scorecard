import { gaugesConfig } from "@/lib/gauges-data";

export const metadata = { title: "Methodology — The Australia Scorecard" };

export default function MethodologyPage() {
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
          Australia&rsquo;s own series is compared between its latest value and the value
          roughly 10 years earlier (or the earliest available point, if the series is
          shorter). The annualised percentage change is classified{" "}
          <strong>improving</strong>{" "}if it exceeds +
          {gaugesConfig.directionThresholdPctPerYear}% per year,{" "}
          <strong>deteriorating</strong>{" "}if it falls below &minus;
          {gaugesConfig.directionThresholdPctPerYear}% per year, and{" "}
          <strong>flat</strong> otherwise.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--gridline)] bg-[var(--surface-1)] p-5">
        <h2 className="text-lg font-semibold">How the composite verdict is calculated</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          The composite is a weighted average of every gauge&rsquo;s level score, using
          the weights below. Weights currently sum to 1 across the {gaugesConfig.gauges.length}{" "}
          gauges live in this phase; when a gauge has no data for a given year, its
          weight is excluded and the remaining weights are renormalised &mdash; missing
          data is never estimated or substituted.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Every gauge, in full</h2>
        <div className="space-y-4">
          {gaugesConfig.gauges.map((g) => (
            <div key={g.id} className="rounded-lg border border-[var(--gridline)] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold">{g.name}</h3>
                <span className="text-sm text-[var(--text-muted)]">
                  Weight: {(g.weight * 100).toFixed(1)}%
                </span>
              </div>
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
              </dl>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Polarity justification: </span>
                {g.polarityJustification}
              </p>
            </div>
          ))}
        </div>
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
          This is Phase A: {gaugesConfig.gauges.length} of 16 planned gauges are live,
          all using hand-written <strong>sample data</strong> (clearly marked{" "}
          <code>SAMPLE_DATA</code> in each gauge&rsquo;s provenance) so the site
          structure can be reviewed before the real data pipeline is built in Phase B.
          No number on this site currently reflects real published statistics.
        </p>
      </section>
    </div>
  );
}
