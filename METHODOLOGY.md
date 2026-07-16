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

### Disclosure when a gauge is excluded

If any gauge's level score comes back `null` (no comparable data for
Australia), it's dropped from the weighted average — but **never silently**.
The verdict's context line grows a clause naming exactly which gauge and
why, e.g.:

> 4th of 9 peer countries · 2 improving, 1 flat, 0 deteriorating over the
> trailing decade · Composite based on 6 of 7 gauges — Innovation excluded,
> no comparable peer data since 2021.

This is enforced, not just a convention: the homepage calls
`assertCompositeDisclosure` right after building that text, which throws —
failing the site's production build — if any excluded gauge isn't actually
named in it. See the "Scoring" section of `CLAUDE.md` for how this was
found (a real instance of exactly this silent-exclusion failure, caught
before it reached the site owner) and why both the specific cause and the
general case were fixed.

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

**⚠ These thresholds are placeholders, and remain so as of the Phase D
checkpoint (2026, ruling below).** They were chosen for a clean 5-way
split of 0–100, not calibrated against real data. `gauges.config.json`
carries a `_scoreBandsTodo` note to this effect.

Band colors follow the site's existing validated palette exclusively (no new
hexes introduced): the two "bad" bands reuse the status-critical and
status-serious tokens, the middle band is deliberately neutral gray (no hue —
"no strong signal"), and the two "good" bands reuse the status-good token and
the categorical green slot. The status-warning (amber) token was deliberately
excluded from the bands, since it already means "data caveat" elsewhere on
the site (the Sample Data badge) — reusing it here would make amber mean two
different things on the same page.

### Phase D, Item 1 — band threshold ruling (recorded, not yet final)

A first calibration pass was run on the 11 gauges live at the time (missing
Education, Productivity, Human capital depth, Inequality, Internal
cohesion). Two things came out of it, ruled separately:

**1. A real bug, fixed independent of calibration.** `bandForScore` (in
`lib/scoring.ts`) used `score >= min && score <= max` against integer
boundaries (`0–24 / 25–44 / 45–59 / 60–79 / 80–100`), but scores are
computed to 1 decimal place — so any score strictly between two integer
boundaries (e.g. 44.2, 44.6, 44.8) matched **no band at all**. Not
theoretical: Australia's own historical composite hit this gap in 2005
(44.6), 2006 (44.2), and 2022 (44.8) — three years where the homepage
sparkline would render with no band. **Ruling: fix now**, independent of
where the thresholds end up — `score >= min && score < nextBand.min`, top
band inclusive of its max. Implementation handed to a separate session,
not bundled with the calibration decision below.

**2. Threshold recalibration itself: deferred.** The 11-gauge pass found
real signal worth recording even though it's not being acted on yet:

- Excluding 1980-1989 (only 2-4 gauges have data that far back — noisy,
  not representative), Australia's composite has stayed within **35.8 to
  48.1** for 35 years (1990-2025) — it has never been close to "Falling
  Behind" (0-24) or "Strengthening" (60-79) on this basis.
- Today, across all 9 peers, **8 of 9 sit in just 2 of the 5 bands**
  (Slipping and Holding) — Falling Behind and Leading are both empty.
  Current thresholds don't discriminate well.
- A "typical" decade move in the composite (median absolute change,
  1990-2025) is **~4.2 points**; the largest observed is **9.7**.
- The composite structurally lives in roughly the 30-65 range, never near
  0 or 100 — a weighted average across many gauges regresses toward the
  middle even though any single gauge can hit either extreme. Bands built
  for a literal 0-100 spread don't fit that.

**Ruling: the site owner deferred acting on this.** The calibration above
is built on 11 of 16 gauges — the missing five (Education, Productivity,
Inequality, Internal cohesion, Human capital depth) are plausibly
composite-moving for Australia specifically, and band thresholds are
being treated as a one-time, permanent decision ("constitutional," not
provisional-then-quietly-adjusted) — set once, on the complete 16-gauge
composite, not twice. **Placeholder thresholds stay in place, explicitly
marked provisional, and the site does not launch until this is resolved.**

**Prepared for the re-run**, once all 16 gauges are live:
- Re-run the same analysis (method below) on the full 16-gauge composite.
- Alongside the original proposal (`0-29 / 30-34 / 35-50 / 51-62 /
  63-100`), also produce a **centered-Holding variant** (e.g. `Holding
  ≈ 42-55`) that keeps Australia reading as "Slipping" rather than moving
  it to "Holding" on day one of recalibration — both variants go to the
  site owner together, not pre-selected.
- Address, as a framed option rather than a foregone conclusion: **should
  bands be defined against the composite's actual achievable range (or
  peer percentiles), rather than the nominal 0-100 scale** — given the
  finding that the composite structurally never reaches the extremes?

**Method to reproduce** (so the re-run isn't re-derived from scratch):
compute `computeHistoricalComposite`-equivalent series for Australia
across every gauge with `provenance.status === "LIVE"` (exclude
`SAMPLE_DATA` and missing files entirely — never calibrate against
placeholder numbers); exclude any year where fewer than half the eventual
gauge count has data (the 1980s problem); compute the same composite for
all 9 peers at Australia's `latestSharedYear` per gauge (this is what
`computeCompositeForAllCountries` already does); report full range,
today's 9-country spread against both the current and proposed bands, and
median/max absolute decade-over-decade change.

## Data maturity tiers

Separate from the score bands above (which grade Australia's *performance*
on a gauge), every gauge also carries a maturity tier that grades the
*gauge itself* — is the number behind it real, current, and proven to keep
refreshing without a human intervening. Implemented in `lib/maturity.ts`;
the full ledger is public at `/status`, linked from every page's footer.

| Tier | Meaning |
|---|---|
| Established | Live automated data, full peer coverage, settled methodology, and has survived at least one real unattended scheduled refresh. |
| Live | Real, sourced data with settled methodology, but young (no scheduled refresh survived yet), carrying a disclosed gap, capped by a documented standing limitation, or manual-lane (which tops out here permanently). |
| Provisional | Real data, but a methodology question specific to this one gauge is still genuinely open. |
| Awaiting data | Configured, methodology settled, no real data yet — includes sample-data placeholders (Education, Productivity as of Phase C) and gauges with no data file at all. |

Established is deliberately the unmarked, default state on gauge cards and
the detail page; every other tier gets a small tag, in the same muted
amber used by the Sample Data badge — one "data caveat" visual language,
not a four-color traffic light.

**"Survived a refresh" is strict**: only a real, unattended monthly cron
run counts (`GITHUB_EVENT_NAME === "schedule"` at fetch time), tracked as
`provenance.scheduledRefreshCount` / `lastScheduledRefreshAt` on each
gauge's data file. A manually-triggered Actions run or a local
`npm run pipeline` still updates the data (and still counts toward the
pipeline's own success report) but never advances these fields — proving
the fetcher code works isn't the same claim as proving it keeps working
unattended over real time. As of this feature's build (2026-07-15) the
monthly cron had not yet fired even once, so every gauge starts at Live at
best; the first scheduled run (2026-08-01) is expected to promote several
gauges to Established in public, in one visible batch.

An `api`-accessType gauge auto-demotes from Established back to Live if
more than 3 months pass without a successful scheduled refresh — a broken
source must lose the claim automatically, not wait for a human to notice.
Manual-lane gauges use their own `staleAfterMonths` cadence for a
"due for a refresh" disclosure instead, since they can never reach
Established in the first place and aging-but-real data isn't dishonest the
way a silently-broken automated feed would be.

Tiers are auto-derived from real conditions wherever possible; a hand-set
`maturityOverride` in `gauges.config.json` exists only to hold a tier back
(never to promote one), and always carries a `reason` string shown on
`/status` — `economic-output` is the one gauge using it today, capped at
Live because IMF blocks GitHub Actions' IP range specifically (see
CLAUDE.md's "Pipeline environment quirks"), so the unattended pipeline can
never refresh it even though it stays current via local runs.

See CLAUDE.md's "Data maturity — honesty rules" for the three explicit
rulings behind this design (the strict scheduled-only reading, why the
deferred band recalibration doesn't demote every gauge to Provisional, and
the manual-vs-API demotion split) and the reasoning behind each.

## Manual-source staleness

Implemented in Phase C. Every `accessType: "manual"` gauge is checked on
each pipeline run (even though it's never fetched) against its own
`staleAfterMonths` in `gauges.config.json` — not one blanket rule for
every manual gauge, since a 3-4-yearly source (PISA) and an annual one
(SIPRI, OECD series) have genuinely different "overdue" thresholds. Falls
back to 15 months (the project brief's original default) if a gauge
doesn't set its own. A gauge past its threshold is flagged as "due for a
refresh" in the report — disclosed, but never counted as a pipeline
failure, since re-running the pipeline can't fix a manual gauge (see
`pipeline/index.mjs` and `pipeline/lib/report.mjs`).

## Current build status

**Phase C in progress, as of 2026-07-16.** All 16 planned gauges are now
configured; **12 have real LIVE data** (11 fetched automatically every
month, plus Education entered by hand 2026-07-16), 4 remain manual-lane
and still awaiting their first real entry (Productivity, Human capital
depth, Inequality, Internal cohesion). Every gauge's real status is in its own
`data/processed/*.json` file's `provenance.status` field (`SAMPLE_DATA` or
`LIVE`, or no file at all for "awaiting data") — the site badges each one
individually, plus a page-level note whenever the set is mixed. Weights
are equal (1/16 each) as a placeholder; the site owner will tune real
weights once all 16 gauges are live with real data (Phase D).

| Gauge | Status | Source | Notes |
|---|---|---|---|
| Living standards | 🟢 Live | World Bank | |
| Innovation | 🟢 Live | World Bank | |
| External position | 🟢 Live | World Bank | |
| Rule of law & corruption | 🟢 Live | World Bank (WGI) | Two series averaged |
| Demographic momentum | 🟢 Live | World Bank | Derived growth rate |
| Trade | 🟢 Live | World Bank | Share of world total |
| Economic output | 🟢 Live | IMF (WEO) | Standing limitation: IMF blocks GitHub Actions' IP range specifically (works locally, always). Disclosed as a known limitation in the pipeline report, not a red failure — see `pipeline/lib/report.mjs` |
| Debt burden | 🟢 Live, ⚠ gap | BIS | No data for New Zealand (nominal-vs-market-value gap, disclosed on-page) |
| Housing pressure | 🟢 Live | OECD (SDMX) | Landed 2026-07-14 after a 5-round debugging arc — see "OECD SDMX trio" in `CLAUDE.md` |
| Military capability | 🟢 Live | SIPRI | Direct `.xlsx` download, fetched and parsed automatically (`pipeline/lib/xlsx.mjs`, `pipeline/lib/sipri.mjs`) — verified live 2026-07-14, not originally planned as automatable |
| Economic complexity | 🟢 Live | Harvard Growth Lab | Public GraphQL API, no auth required (`pipeline/lib/harvardAtlas.mjs`) — verified live 2026-07-14, not originally planned as automatable |
| Productivity | 🟡 Manual lane | OECD | Dataflow flagged `NonProductionDataflow=true` by OECD itself; automated route abandoned by design, not oversight. See `data/manual/README.md` |
| Human capital depth | 🟡 Manual lane | OECD | Automated API never returned data across 3 attempts. See `data/manual/README.md` |
| Inequality | 🟡 Manual lane | OECD (Gini) | SDMX endpoint Cloudflare-blocked on every attempt from this environment; dataflow structure never verified enough to trust an automated fetcher. WID wealth-share context display is built (`contextSeries`) and ready, awaiting its own data entry |
| Internal cohesion | 🟡 Manual lane | V-Dem (`v2cacamps`) | Real dataset gated behind a registration form; the only freely-fetchable file is a 33MB R binary with no safe dependency-free parsing path. Switched from `v2x_cspart` to `v2cacamps` 2026-07-16 — see "Internal cohesion" below and CLAUDE.md's reversal writeup |
| Education | 🟢 Live (manual entry) | OECD PISA | No fetchable SDMX dataflow or API endpoint (ASP.NET form wizard) — real numbers entered by hand 2026-07-16, PISA 2018 and 2022 cycles (Table I.1 of each cycle's Results Volume I), superseding the Phase A sample placeholder. Only 2 of a possible several cycles so far; direction now computes from real 2018→2022 movement |

See `data/manual/README.md` for each manual gauge's download template and
instructions, and CLAUDE.md ("OECD SDMX trio" and "Fetch-before-guessing
pass on the 5 remaining manual gauges") for the full reasoning behind
every automated-vs-manual split on this site.

### Internal cohesion — variable switch and scale note (2026-07-16)

This gauge switched from V-Dem's `v2x_cspart` (Civil Society Participation
Index) to `v2cacamps` (Political polarization) after the site owner
caught that `v2x_cspart` measures civil-society consultation and
participation — a different concept from the polarization/internal-order
concept this gauge was actually specified for. `v2x_cspart` was reviewed
and replaced, not merely relabeled: it scored real data honestly, just
for the wrong question. Full reversal history, including why the
original 2026-07-14 decision never had a polarization variable in its
candidate set, is in CLAUDE.md.

**Scale is the one exception on this site.** Every other gauge's raw
value is a bounded share, index, or rate (0-1, %, ratio) that reads
intuitively on its own. `v2cacamps` doesn't: it's a raw, single-question
V-Dem expert-survey component (not one of V-Dem's smoothed 0-1 `v2x_`
aggregate indices), published as an interval-converted score,
**mean-centered at 0 across all country-years** — roughly -4 to +4 in
practice, negative meaning less polarized than the global average,
positive meaning more. A country's raw number here (e.g. "-1.16") isn't a
percentage or a share of anything; it only means something relative to
that 0 average and to its own history. This doesn't affect the site's
scoring math — `computeLevelScore`'s min-max normalization only compares
countries against each other within a year, so it works identically on
an unbounded, mean-centered scale — but it does mean this gauge's detail
page shows a raw number with a different character from every other
gauge's, which is why `polarityJustification` and the gauge's `unit`
field both call this out explicitly rather than leaving a reader to
assume it's a 0-1 share like everywhere else.

### Corrections made while building Group 1 (2026-07-14)

- **World Bank WGI series IDs were dead.** The brief's assumed codes
  (`RL.EST`, `CC.EST`) return "indicator not found" on the current World
  Bank API — verified live before building, not discovered after a failed
  run. The correct current codes, under World Bank source 3 (Worldwide
  Governance Indicators, actively maintained), are `GOV_WGI_RL.EST` and
  `GOV_WGI_CC.EST`. Logged in `gauges.config.json` under
  `rule-of-law-corruption._seriesIdCorrection`.
- **`latestSharedYear` had a real bug, caught before handoff.** It picked
  the most recent year *any* of the 9 countries reported, rather than the
  most recent year Australia itself has data. When one peer's series ran
  ahead of Australia's (e.g. Canada reporting R&D spend through 2024 while
  Australia's data stopped at 2021), Australia's score, rank, and dot-strip
  position all silently went blank for that gauge — and because a blank
  level score is excluded from the composite average (by design, per
  "Composite verdict" above), the *composite itself* was silently missing
  that gauge's contribution too. Fixed by anchoring "latest year" to
  Australia's own most recent year that at least one peer also reports.
  This was caught by inspecting a live gauge card before handoff, not by a
  user report — worth remembering as a class of bug to watch for as more
  gauges with uneven reporting cadences are added.
