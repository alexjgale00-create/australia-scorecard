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

**Direction is peer-relative everywhere on the site** — gauge cards, dot
strips, the What's Moving callout, the composite's improving/flat/
deteriorating counts. It classifies the trend in Australia's **level
score** (its position within the 9-country peer set), not the trend in the
raw published number. This was a deliberate decision (2026, design-overhaul
phase): the two can genuinely disagree — a country's raw number can rise
while it still loses ground to faster-improving peers, or its raw number can
fall while it gains relative ground on peers falling even faster. Showing
only the raw-value trend risked implying "the number went up" means
"Australia is doing better than its peers," which isn't always true.

```
score_delta = level_score(latest_year) - level_score(start_year)   # start_year ≈ latest_year - 10
years = latest_year - start_year
annualised_score_change = score_delta / years
```

Classified using `directionThresholdScorePointsPerYear` in
`gauges.config.json` (currently **0.5 points per year**):

- `> +threshold` → **improving**
- `< -threshold` → **deteriorating**
- otherwise → **flat**

**Why 0.5 points/year:** a starting value picked to be well above noise from
year-to-year peer-set reshuffling, on the same 0–100 scale as the level
score itself. Like the score bands, this is a placeholder pending review
once real historical data is flowing across all 16 gauges (Phase D).

### The raw-value trend (shown separately)

Australia's own raw-value trend (is the published number itself going up or
down) is still calculated and shown — but only in the "Two ways to read
this" block on each gauge's detail page, specifically so it's never
presented as if it were the same thing as the peer-relative direction:

```
years = latest_year - start_year
annualised_pct_change = ((latest_value - start_value) / |start_value|) / years * 100
```

Classified using `directionThresholdPctPerYear` in `gauges.config.json`
(currently **0.3% per year**) into **up / down / flat** — deliberately *not*
"improving/deteriorating," since whether a rising raw number is good or bad
depends on the gauge's polarity, and this label doesn't carry that judgment.

**Why 0.3%/year:** chosen as a threshold well above typical year-to-year
measurement noise in the underlying series (World Bank / OECD national
accounts data routinely revises by more than this between vintages), so the
label reflects a real trend rather than noise.

### "Two ways to read this"

Each gauge detail page auto-generates one plain-English sentence comparing
the raw-value trend and the peer-relative trend — e.g. "Australia's own GDP
per capita figure rose over the 9 years, but slower than its peers — so its
relative position fell." When the two agree, the sentence says so simply
(e.g. "...both improved over the 9 years"). The full 3×3 sentence matrix
lives in `lib/scoring.ts` (`describeTwoWaysToRead`).

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

## Score bands (the verdict label)

Any 0–100 score on the site — the composite verdict, a single gauge, a peer
country — maps to a plain-English band via `scoreBands` in
`gauges.config.json`:

| Band | Range |
|---|---|
| Falling Behind | 0–24 |
| Slipping | 25–44 |
| Holding | 45–59 |
| Strengthening | 60–79 |
| Leading | 80–100 |

**⚠ These thresholds are placeholders.** They were chosen for a clean 5-way
split of 0–100, not calibrated against real data. `gauges.config.json`
carries a `_scoreBandsTodo` note to this effect. **They must be reviewed at
the Phase D checkpoint**, once all 16 gauges are live with real numbers,
before any public release — a threshold that looks reasonable on 3 sample
gauges may not hold once the full set is in.

Band colors follow the site's existing validated palette exclusively (no new
hexes introduced): the two "bad" bands reuse the status-critical and
status-serious tokens, the middle band is deliberately neutral gray (no hue —
"no strong signal"), and the two "good" bands reuse the status-good token and
the categorical green slot. The status-warning (amber) token was deliberately
excluded from the bands, since it already means "data caveat" elsewhere on
the site (the Sample Data badge) — reusing it here would make amber mean two
different things on the same page.

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
