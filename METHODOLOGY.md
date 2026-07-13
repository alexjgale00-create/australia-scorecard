# Methodology

This is the narrative companion to `gauges.config.json`, which holds the
machine-readable facts (sources, series IDs, polarity, weights). This file
holds the reasoning and formulas that don't fit in JSON. The `/methodology`
page on the site is meant to read both.

## Level score (0–100)

For each gauge, Australia's position is scored against the fixed 9-country
peer set (`peerCountries` in `gauges.config.json`) using min-max
normalisation on the latest year where a country has data:

```
raw = (value - min) / (max - min)          # across all countries with data that year
level_score = raw * 100                    # if polarity is "higher_is_better"
level_score = (1 - raw) * 100              # if polarity is "lower_is_better"
```

If every country in the set has the same value, the score is defined as 50
(no meaningful spread to rank on). If fewer than two countries have data for
that year, the level score is `null` — displayed on the site as missing, not
estimated.

## Direction (improving / flat / deteriorating)

Compares Australia's own value at the latest available year against its
value roughly 10 years earlier (or the earliest point on record, if the
series doesn't go back that far):

```
years = latest_year - start_year
annualised_pct_change = ((latest_value - start_value) / |start_value|) / years * 100
```

Classified using `directionThresholdPctPerYear` in `gauges.config.json`
(currently **0.3% per year**):

- `> +threshold` → **improving**
- `< -threshold` → **deteriorating**
- otherwise → **flat**

**Why 0.3%/year:** chosen as a threshold well above typical year-to-year
measurement noise in the underlying series (World Bank / OECD national
accounts data routinely revises by more than this between vintages), so the
label reflects a real trend rather than noise. This is a starting value for
Phase A/B and is expected to be reviewed once real historical data is
flowing (Phase B checkpoint).

## Composite verdict

A weighted average of every gauge's level score, using `weight` from
`gauges.config.json`. Gauges with a `null` level score for the relevant year
are excluded and the remaining weights are renormalised to sum to 1 — missing
data is never substituted or interpolated.

```
composite = Σ(level_score_i * weight_i) / Σ(weight_i)     # over gauges with a score
```

The homepage sparkline recomputes this composite for every historical year
where at least one gauge has data, using the same renormalisation rule.

## Manual-source staleness

Any gauge with `accessType: "manual"` is flagged by the pipeline report as
stale if its data is more than 15 months old, per the project brief. This
check is not yet implemented — the pipeline itself doesn't exist until Phase
B/C.

## Phase A status

Only 3 of 16 planned gauges are live (`living-standards`, `productivity`,
`education`), all using **hand-written illustrative sample data** — see the
`SAMPLE_DATA` status and `note` field in each `data/processed/*.json` file.
None of it is a real published statistic. Weights are currently equal
(1/3 each) as a placeholder; the site owner will tune real weights once all
16 gauges are live with real data (Phase D).
