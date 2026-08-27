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

**As of Phase E (2026-08), the site produces two composites, never one.**
Power (the original national-trajectory composite, 16 gauges) and Quality of
Life (does Australia remain a good place to live, 8 gauges) are each scored
independently and shown with equal prominence on the homepage — never
combined into a single number. See "Quality of Life dimension" below for the
full ruling record.

A dimension's composite is a weighted average of its own gauges' level
scores, using each gauge's weight *within that dimension* —
`gauges.config.json`'s `weights` object on each gauge (e.g.
`{ "power": 0.0625 }`, or `{ "power": 0.0625, "quality-of-life": 0.125 }` for
a gauge reused in both). A gauge's presence as a key in `weights` is the
single source of truth for which dimension(s) it belongs to; there is no
separate membership list that could drift out of sync. Gauges with a `null`
level score for the relevant year are excluded from that dimension's average
and the remaining weights are renormalised to sum to 1 — missing data is
never substituted or interpolated.

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

### Phase D, Item 1 — band threshold ruling (Power ruled, Quality of Life deferred, 2026-08-24)

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

**3. Power ruled; Quality of Life remains deferred (2026-08-24).** Once all
23 gauges were LIVE, the deferred recalibration above was re-run on
complete data — full options memo (three candidate schemes per dimension,
run-length/churn decomposition, hard-constraint and proximity checks) in
the session record; durable outcome recorded here.

**Power: `0-35 / 36-44 / 45-53 / 54-62 / 63-100`** (Falling Behind /
Slipping / Holding / Strengthening / Leading), set against Power's own
true achievable range across 1990-2025 (any of the 9 peers, any year:
27.1-72.2), divided into 5 equal ~9-point bands. This is now live in
`gauges.config.json`'s Power `scoreBands` — a constitutional, one-time
decision, not provisional. Chosen over two centered-Holding variants that
were also tested (one hand-widened around the pooled median, one
IQR-based) because both, despite better-looking distribution today, turned
out on decomposition to be dominated by single-year runs — ping-pong
across a boundary, not sustained regime change — and one of the two failed
a hard constraint (the trajectory chart's endpoint and the live composite
landing in different bands on the same page). Scheme 1 shares neither
defect: its 10 band-changes across 36 years have the same run structure as
the old placeholder (not single-year churn), and both the historical
endpoint and the live composite land in Slipping.

**On the 45 boundary sitting close to today's live composite (42.9, one
median annual move away — 1.000×, computed 2026-08-24): this proximity is
disclosed, not adjusted, and the distinction matters enough to state
plainly.** The boundary falls out of dividing the true achievable range
into five equal parts — arithmetic that has no knowledge of, and gives no
weight to, where Australia's own score happens to land. A boundary that is
close to today's value but was derived without reference to it is honest;
one moved because we didn't like the proximity would not be. If this site
is ever accused of drawing lines to flatter or punish Australia, this is
the sentence to point at: the 45 was fixed by the shape of 36 years of
real peer data, before anyone checked where 2026's number would fall
against it.

**Verdict impact of adopting Scheme 1**: Australia's own headline reading
is **unchanged** — 42.9 was Slipping under the old placeholder and stays
Slipping under Scheme 1. The visible change is to peers only: Germany
moves Holding → Strengthening (57.9), New Zealand moves Slipping → Falling
Behind (35.1); every other peer (Canada, Netherlands, Japan, South Korea,
United Kingdom, United States) stays in the same band it was already in.
A constitutional change that alters nothing about Australia's own verdict
today is still worth ruling on — the bands now discriminate correctly at
the extremes even though Australia isn't sitting at either one.

**4. The common derivation rule, stated once — it applies to both
dimensions, and the numbers differ because the dimensions do, not because
the method does.** Each dimension's score bands divide *that dimension's
own achievable range* — the true minimum and maximum any of the 9 peers
has actually reached, any year from 1990 to present, on that dimension's
composite — into five equal parts. One rule, run twice:

| | Achievable range | Extremes (country, year) | Thresholds (FB / Slip / Hold / Streng / Lead) |
|---|---|---|---|
| **Power** | 27.1 – 72.2 | min: Korea, 1991 · max: United States, 1992 | 0-35 / 36-44 / 45-53 / 54-62 / 63-100 |
| **Quality of Life** | 9.8 – 83.8 | min: United States, 2005 · max: Germany, 2020 | 0-24 / 25-38 / 39-53 / 54-68 / 69-100 |

Power's real range is under half the width of Quality of Life's (45.1
points against 74.0) — the same five-way division of two genuinely
different-shaped distributions necessarily produces two different
threshold sets. A reader who notices the numbers differ between the two
dimension pages should read that as the ranges differing, not the rule.

**On the 45 boundary sitting close to today's live Power composite (42.9,
one median annual move away — 1.000×): disclosed, not adjusted, and the
reasoning generalises to any boundary this rule ever produces.** The
boundary falls out of dividing the true achievable range into five equal
parts — arithmetic with no knowledge of, and no reference to, where any
country's current score happens to land. A boundary that is close to
today's value but was derived without reference to it is honest; one
moved because the proximity was uncomfortable would not be. If this site
is ever accused of drawing lines to flatter or punish a country, this is
the sentence to point at.

**5. Quality of Life ruled: `0-24 / 25-38 / 39-53 / 54-68 / 69-100`
(2026-08-24), after the trajectory-series fix landed (see below) and the
full options memo was re-run against the corrected series.** Every
candidate scheme now passes the hard constraint (2023 endpoint 67.6 vs.
live 67.9 — a 0.3-point gap, down from 16.5 before the fix), so the choice
came down to which derivation method to use, not which one produced a
passable number.

**Scheme 3 (`42/54/68/82`, hand-centered on the pooled median, two stable
13- and 14-year eras, lowest churn of every QoL candidate tested) was the
standing provisional preference through most of this review and was
rejected at ruling time — on a consistency ground, not a metrics one.**
Power had already adopted the achievable-range method. Had QoL adopted
Scheme 3 instead, the site would need to defend two different derivation
methods for two dimensions in the same ruling — "achievable range for one,
a hand-centred median with admittedly arbitrary outer widths for the
other" — and Scheme 3's own memo entry had already conceded there was no
principled answer to "why 42 and not 40." A scheme whose own writeup
concedes an unanswerable question isn't a stronger candidate than one
with a slightly worse noise ratio and an identical churn profile: Scheme
1's changes/churn/sustained split (5/2/3) on the corrected series is
*identical* to Scheme 3's, and its noise margin (5.19× a typical annual
move) is better. The ruling was that bands diverge by dimension; the
derivation method does not.

**Verdict impact**: Australia's own Quality of Life reading is
**unchanged** — 67.9 was Strengthening under the old shared placeholder
and stays Strengthening under the new thresholds. As with Power, this is
a constitutional change that alters nothing about Australia's own verdict
today — though on Quality of Life specifically, that verdict now sits
close to its nearest boundary (67.9 against 69, 0.41× a typical annual
move) purely because the peer pack is genuinely dense in that range, not
because of anything about the threshold choice — see "Proximity
disclosure" (pending, drafted not yet built) for the planned treatment.

### Trajectory series fix — Approach B adopted (2026-08-24)

The tail-coverage defect above (QoL's 2024/2025 points computed from a
shrinking, non-representative subset of gauges) needed a fix independent
of any band decision. Two approaches were weighed: carrying each gauge's
most recent value forward to fill thin years (closes the numeric gap, but
touches the composite computation for all 23 gauges across the full
36-year history, risks silently changing already-published historical
values, and reopens the AS-OF fix's "don't imply currency you don't have"
question unless capped by each gauge's own `staleAfterMonths`); or
visibly excluding/flagging thin-coverage years so the chart stops
implying comparability it doesn't have, without touching the underlying
numbers. **Approach B (exclude, don't carry forward) was adopted** —
lower blast radius, consistent with how every other honesty gap on this
site is handled (disclosure, not silent correction — same principle as
band-robustness §3.3 and every staleness disclosure), and it doesn't put
36 years of already-shown numbers at risk of changing under a future
rebuild. See CLAUDE.md for the implementation record.

**The cliff threshold (`COVERAGE_CLIFF_THRESHOLD = 0.2`, `lib/scoring.ts`)
was checked for sensitivity before being trusted, not assumed correct
because it looked reasonable.** Chosen from a real, empirically-found gap
in the missing-data distribution: every ordinary year (an OECD series'
uneven per-country lag, GBD's non-annual release cadence, a gauge simply
not having launched yet in that era) tops out at 18.75% of that year's
already-launched gauges missing on Power, 16.7% on Quality of Life; every
year that turned out to be a genuine coverage-cliff artifact starts at
25%. Re-run at 0.15 and 0.25 to check the choice wasn't arbitrary within
that gap:

- **0.15 over-excludes**: sweeps in 1997 and 1999 on Power, 2010 and 2011
  on Quality of Life — years that are ordinary early-history coverage (a
  slower-launching gauge genuinely hadn't started yet), not the cliff
  pattern, incorrectly caught by too strict a cutoff.
- **0.25 under-excludes**: leaves Power's 2023 and 2024 in, despite both
  sitting at exactly the 25% missing mark this review's own evidence
  identified as where the cliff pattern starts (strict `>` excludes
  nothing sitting exactly at the boundary).
- **The achievable range — and therefore every band threshold in this
  ruling — is identical at 0.15, 0.20, and 0.25, on both dimensions.**
  Checked directly, not inferred: 27.1–72.2 (Power) and 9.8–83.8 (Quality
  of Life) don't move at any of the three settings, because the true
  extremes on both dimensions occurred in years nowhere near the ones the
  threshold choice affects (Power's in 1991/1992, Quality of Life's in
  2005/2020). The parameter changes only how many years render on the
  trajectory chart — never a published band, a verdict, or a threshold.

That invariance is the strongest evidence in this whole ruling that the
bands don't quietly depend on an arbitrary internal constant: three
materially different cutoffs, same achievable ranges, same thresholds,
same verdicts.

**The coverage-cliff guard has a blind spot by construction, and a fixed
1990 floor sits next to it for exactly that reason — not as a
duplicate check.** The guard measures missing gauges as a fraction of
that year's already-*launched* gauges (`gaugeStartYear` in
`lib/scoring.ts`). That definition is structurally unable to see a
different failure: a year where almost nothing has launched *yet*.
Power's 1980 point is built from 2 gauges out of 2 that had started by
then — 0% of eligible gauges missing, a clean pass — while still being
exactly the thin, unrepresentative extreme this whole apparatus exists to
keep out of a constitutional decision. A relative guard cannot fix this
on its own; it needs an absolute floor alongside it. 1990 is that floor
here because it's this project's own long-standing convention for where
"too few gauges exist yet" stops being true, not derived from the same
20%/enough-eligible-gauges logic the cliff guard uses. Anyone reusing
`computeHistoricalComposite`'s pattern for a new composite series should
carry both checks, not assume the relative one alone is sufficient — see
CLAUDE.md's 2026-08-24 entry for how this was found and confirmed not to
move any already-shipped threshold.

### Proximity disclosure (2026-08-24)

Every dimension page now states, for any country whose composite sits
within one typical year's movement of a band boundary, that the composite
does not cleanly separate it from whatever is on the other side. This
exists to state the instrument's resolution honestly, not to warn that a
verdict might change — the first drafted copy ("a small change could
shift the verdict") was rejected for implying the wrong claim: the risk
isn't volatility, it's that the gap between two countries here is smaller
than this dimension's own year-to-year noise, so the composite genuinely
cannot tell them apart at that margin. The threshold is one median
annual move in that dimension's own composite — computed fresh from the
data every time (`medianAbsoluteAnnualMove` in `lib/scoring.ts`), never a
fixed number, since a dimension whose gauges move a lot and one whose
gauges barely move have no reason to share one resolution figure. It was
not adjusted when it turned out to fire on five of nine Quality of Life
countries. Four of those five cluster on the same Strengthening/Leading
boundary — a real, checked property of how tightly this peer set is
packed in that range, not an artifact of where the threshold happened to
be drawn. Loosening it to make that finding disappear would have been the
same error this ruling had already refused once: moving a line because
the result under it was uncomfortable, not because the line itself was
wrong. Countries sharing one boundary are reported as a single finding
about the pack (see `computeBoundaryProximity`), not as repeated
near-identical sentences per country — both more accurate and more
legible than the alternative.

### Phase D — rejected band-scheme approaches (2026-08-24)

Recorded so none of this is re-litigated cold in a future session. Full
numbers and reasoning are in the session record; this is the durable
summary.

- **The original Phase D proposal (0-29/30-34/35-50/51-62/63-100) —
  retired for good.** Its apparent stability (flicker=0 on Power, flicker=1
  on Quality of Life across the full 36-year series) is vacuous, not a
  virtue: the bands are wide enough that Australia's real composite
  movement over 36 years never registers a change at all. A verdict that
  never moves because the band is too wide to detect real movement is a
  broken instrument, not a stable one — confirmed quantitatively, not just
  argued: its narrowest inter-boundary gap is only 1.8-2.4× the composite's
  own typical annual move, unremarkable next to schemes that discriminate
  far better at similar or better noise-margins.
- **Percentile-derived bands — both the dynamic (recomputed every year from
  that year's live peer cross-section) and frozen (computed once from the
  pooled 36-year distribution, then fixed) variants — rejected on
  stability grounds, plus a structural circularity worth stating
  explicitly.** A percentile threshold is partly computed from the very
  observation it is then used to classify. This isn't hypothetical:
  Power's frozen-percentile scheme placed a boundary at 44.5 — exactly
  equal to the 2025 historical-series value that helped compute it in the
  first place, landing Australia's own reading directly on its own
  boundary. The dynamic variant has the same defect in a different form
  (a boundary that moves whenever any peer moves, so Australia's verdict
  can flip with nothing Australia did) and was the least stable scheme
  tested on both dimensions (16 changes on Power, 7 on Quality of Life,
  worst of every scheme tried).
- **Flicker count alone, as the sole stability criterion — superseded by
  run-length decomposition.** A raw change count can't distinguish a
  scheme tracking real regime change from one ping-ponging across a single
  boundary — confirmed directly: two schemes with similar total flicker
  counts turned out to have opposite character once decomposed (run
  lengths, churn-within-3-years vs. sustained transitions). A scheme where
  most "changes" are single-year reversals is a materially worse candidate
  than one with the same count made of a few long, sustained transitions,
  and the bare count cannot tell them apart. Any future re-run of this
  analysis should decompose flicker into run-length/churn/sustained from
  the start, not add it as an afterthought.

### Phase D, Item 2 — PISA 2015 mode-change comparability caveat (logged, 2026-08-20)

Surfaced during the REGISTER why-this-matters audit (see CLAUDE.md), not
acted on — a comparability question, not a content error. `education`'s
why-this-matters copy claims PISA uses "the same instrument in every
participating country," which is true and verified (OECD/NCES both
confirm this — every country in a given cycle sits the same instrument).
What that claim does *not* address, and what a reader looking at this
site's AUS-across-cycles trend chart might reasonably assume it covers:
PISA 2015 changed test delivery mode from paper-based to computer-based,
and changed its scaling methodology at the same time. This affects
*cross-cycle* trend comparability specifically — a different question
from the *cross-country* comparability the why-this-matters claim
actually makes, so the existing copy isn't wrong, just silent on a
caveat adjacent to what it says. Logged here rather than fixed in the
gauge's copy, since the right treatment (a trend-chart footnote? a
dense-layer note? excluding pre-2015 from the headline trend?) is a
presentation/methodology decision, not a copy fix — bring it into the
Phase D checkpoint alongside band thresholds and the min-max
normalisation question (§3.3).

## 3. Presentation apparatus disclosures (REGISTER)

Added during the REGISTER design implementation (2026). The REGISTER gauge
apparatus cites specific "Methods §3.x" anchors inline — in the band-strip
disclaimer, in the `NOT ESTABLISHED` state, and in the new band-robustness
qualifier below. The design handoff (`DESIGN.md`) that specified this
apparatus used those same citation numbers in its reference HTML, but they
were fictional — the handoff tool had no access to this file and could not
have known whether `§3.1`/`§3.2` existed. They didn't. This section is
where they now live for real, numbered to match what the shipped apparatus
actually cites.

### §3.1 — Band thresholds: ruled

Pointer, not new content: this is the "Phase D, Item 1" section above.
**Both dimensions' thresholds are ruled and final** as of 2026-08-24 —
Power (0-35 / 36-44 / 45-53 / 54-62 / 63-100) and Quality of Life (0-24 /
25-38 / 39-53 / 54-68 / 69-100), each set against that dimension's own
achievable range by the same rule. Neither is a placeholder any more —
see above for the full options memo, the common derivation rule, and the
cliff-threshold sensitivity check.

### §3.2 — Evidence standard for a causal attribution

> Reviewed and approved by the site owner, 2026-08-21 — no changes
> requested. Gives `NOT ESTABLISHED`, `CONTESTED`, and the established
> `CAUSE`/`PRECEDENT`/`CHALLENGER` apparatus the standard they've cited
> since REGISTER shipped without one.

**The ruling.** An established `CAUSE` may join separately sourced facts
into a causal claim. It does not require one source stating the cause
outright — most real causal questions aren't settled by a single sentence
in a single document. What makes the join defensible isn't neutrality; a
join is always a judgment. It's **exposure**: the judgment must be
visible enough that a reader can see exactly where the sourced facts end
and the attribution begins, and reject it if they don't buy it.

**Six constraints.** Every established `CAUSE`, `PRECEDENT`, or
`CHALLENGER` must meet all six:

1. **Every component fact separately cited** — a citation per fact, not
   one citation covering the conclusion.
2. **The join stated, not smuggled.** The attributing sentence must be
   visibly separate from the sourced facts, never folded into the same
   clause as a citation as if the source said it.
3. **One causal step only.** A causes B. Never A causes B causes C — a
   chain is only as strong as its weakest, usually unstated, link.
4. **Name the leading alternative explanation, where one exists.** If the
   alternative is equally supported, the attribution isn't established —
   it's `CONTESTED`.
5. **No counterfactuals, no prescription.** A cause explains what is. It
   never says what should be done, or what would have happened instead.
6. **Attribution language must match confidence.** "Attributable to" for
   a well-supported single mechanism; "consistent with" where the
   evidence is suggestive, not conclusive. Never upgrade the language to
   sound more settled than the sourcing supports.

**Three states.**

- **Established** — meets all six constraints above.
- **Not-established** — no attribution currently meets the bar. The
  default, not a failure: most causal questions this site could ask don't
  yet have a source clearing constraints 1 through 6.
- **Contested** — attribution is actively disputed by real sources on
  both sides, or the leading alternatives are equally supported. A
  permanent answer, not a placeholder for "not established yet" — see
  `life-expectancy` and `external-position`.

`SCALE` never uses this standard. It's arithmetic on the gap between
Australia and its peers, not a causal claim, and stays present even when
`CAUSE` and `PRECEDENT` are each independently not-established. A reader
who sees `NOT ESTABLISHED` above a confident `SCALE` figure should read
that as this section explaining why, not as an inconsistency.

**`CAUSE` and `PRECEDENT` are not held to the same bar.** `PRECEDENT`
cites a peer's own observable trajectory — a fact about what happened
elsewhere, not a claim about why it happened to Australia. That's a
weaker claim than `CAUSE`, which explains Australia's own gap, and it can
clear a lower bar: naming a peer that closed a similar gap, and how, is
defensible even where explaining why Australia itself sits where it does
isn't.

**`CHALLENGER` (S2, Australia leads)** is evaluated against the same six
constraints, applied to explaining a lead instead of a gap — "why is
Australia ahead" is the same kind of causal claim as "why is Australia
behind," and gets no lighter treatment for being flattering.

**Survey-based gauges.** A causal claim resting on self-reported data
(`evidenceStrength: "survey"`) is weaker evidence than one resting on an
official statistical series — the same pattern can mean "this happened"
or "people believe this happened," and those aren't the same finding. Any
`CAUSE`, `PRECEDENT`, or `CHALLENGER` drawing on a survey-based gauge must
keep that tag visible alongside the attribution, not only on the gauge's
own header.

**Downgrading.** An established attribution can later be withdrawn — a
cited source is corrected, a better alternative surfaces, a mechanism
turns out more contested than it looked. This is disclosed the same way a
data revision is: a `REV` mark in the dense layer, dated, so the record
shows the attribution changed rather than silently reverting to
`NOT ESTABLISHED`.

**Provider self-commentary does not clear the bar.** A data provider's
own gloss on its own index is the measurer explaining its own
measurement, not independent evidence — it fails constraint 1, since
there is no second, independent fact to cite, even when it reads like a
clean causal claim. This is the specific, sole reason
`economic-complexity`'s CAUSE draft is held rather than shipped — see the
worked example below.

**Portfolio check — required after every CAUSE-authoring round:**

1. Read every established `CAUSE`, `PRECEDENT`, and `CHALLENGER` as one
   set and ask what a hostile reader would conclude the site believes.
   Each attribution can individually meet all six constraints while the
   set still carries a position no single-page review would catch. If a
   real pattern exists, state it openly. If it's selection bias — which
   gauges got a CAUSE drafted, not what the sources say — re-examine
   those specific gauges, not the standard.

*Last run: 2026-08-20, on the five live drafts.* Two attribute a domestic
structural problem without qualification (`housing-pressure`,
`innovation`); one attributes a shortfall to comparative rather than
absolute decline (`economic-output`); one attributes a lead to a policy
choice (`demographic-momentum`); one is held out entirely
(`economic-complexity`). No consistent exculpatory or self-critical lean
across five — too small a set for a pattern to mean anything yet. Re-run
as the set grows.

**Worked example — passes: `innovation`.** Two component facts, cited
separately: Australia's own R&D-to-GDP figure and rank (this gauge's own
source series, not a second citation but the site's own underlying data)
and the Strategic Examination of R&D's finding that persistently low
investment is a structural weakness (Dept. of Industry, Science and
Resources, "Ambitious Australia," March 2026). The join is stated, not
smuggled: the sentence names the report as identifying the weakness,
rather than asserting "Australia's R&D underinvestment is a structural
weakness" as if it were simply true. One causal step — low investment
causes the weakness; the draft doesn't chain onward to what the weakness
itself then causes. No competing explanation for this specific gap
surfaced during drafting, so constraint 4 is satisfied by there being
nothing live to name, unlike `external-position`, where a real
alternative exists and the gauge is `CONTESTED` for that reason.
"Identifies... as a structural weakness" matches the confidence of a
government review's own finding; it doesn't upgrade to "attributable to,"
which this one review alone wouldn't support.

**Worked example — fails: `economic-complexity`.** The held draft cites
the Harvard Growth Lab's own Atlas of Economic Complexity explaining why
its own index ranks Australia low. This fails constraint 1 specifically:
there is no second, independent fact — the institution that computed the
index is also the source for why the index says what it says. Every
other index-based gauge on this site could manufacture a `CAUSE` the same
way if this were admitted — a provider narrating its own number is
evidence about the number, not about the world. Holding this gauge is the
correct outcome of the standard above, not a gap it leaves open.

### §3.3 — Band robustness: the bounds-exclusion sensitivity test

> **DRAFT — UNREVIEWED.** Written during the REGISTER implementation pass
> to give the new `bandRobustness` qualifier (see `GaugeConfig` in
> `lib/types.ts`) a real citation target before launch. Arithmetic and
> methodology description only, no causal or evaluative claims — same
> drafting rule as the plain-language lines. Stays on the implementation
> branch until edited.

Every gauge's level score comes from min-max normalisation across the
9-country peer set (`computeLevelScore`, `lib/scoring.ts`): Australia's
position is `(value − min) / (max − min)` of whatever the 9 countries
report that year, flipped for `lower_is_better` polarity. This means a
single country sitting far outside the other 8 can compress everyone
else's score into a narrow sub-range — the country at the extreme isn't
just "also compared," it's setting the ruler the other 8 are measured
against.

**The test.** For a given gauge and year, recompute Australia's score and
band with one named peer excluded from the min/max calculation only —
every other country, including the excluded peer itself, is still scored
and shown; nothing about the shipped page changes. This is a read-only
diagnostic, run by hand, not a live recalculation: it does not touch
`lib/scoring.ts`, does not change any score, band, or composite anyone
sees, and does not run automatically on a future data refresh. A gauge is
marked `bandRobustness: { status: "outlier-dependent" }` only when a human
has run this test, seen the band move, and judged the *currently displayed*
band to overstate Australia's position as a result — a band that
understates when the same peer is excluded is treated as a survivable,
ordinary property of the placeholder thresholds above (§3.1), not flagged
here.

**What "outlier-dependent" does and doesn't mean.** It means: the band
shown for this gauge is not robust to how the scale's bounds are drawn —
specifically, it depends on one named peer sitting at the extreme end of
the field. It does not mean the score is wrong, fabricated, or under
dispute — the score and band are exactly what the site's stated method
(`computeLevelScore`/`bandForScore`) produces, computed the same way as
every other gauge. This is disclosure of a property of the method, not a
correction of the result.

**Currently flagged, and why.** Two gauges, both discovered via this test
during the REGISTER build (2026): `life-expectancy` and `personal-safety`
each currently show Australia as **Leading**, and each drops to
**Strengthening** the moment the USA — the lowest life expectancy and by
far the highest homicide rate of the 9 peers on their respective gauges —
is excluded from the bounds. Every other gauge that showed any band
movement under this test moved in the *other* direction (Australia's band
understated, not overstated) and is left at the default `"robust"` status
per the rule above. `trade` is marked `"robust"` explicitly rather than
left at the unset default, since the USA has no data for that gauge's
latest shared year — its robustness is structural, not merely
tested-and-found-stable like the rest.

**`life-expectancy` also carries a second, distinct concern that is
*not* flagged here — ruled 2026-08-25, recorded so the distinction
isn't lost.** This gauge's `dataPolicy` discloses a construction-mix
finding: World Bank draws this series from national life tables, and at
least Australia (ABS) and New Zealand (Stats NZ) publish an overlapping
3-year rolling window rather than independent annual data, while South
Korea (KOSTAT) is confirmed genuinely annual — a real reason to distrust
this gauge's cross-country ranking, structurally, independent of the
USA-outlier finding above. **Ruling: disclosed, not adjusted — this is
not a `bandRobustness` entry, and the reason is worth stating plainly so
it isn't read as an oversight.** `bandRobustness`'s own activation rule
requires a human to have *seen the band move* and judged the *currently
displayed* band overstated by a named, quantified mechanism (see "The
test" above). The construction-mix concern doesn't clear that bar: a
live cross-check was attempted (Australia's gap against UN World
Population Prospects' independent estimate looked at first like
confirmation of a smoothing-driven understatement, until South
Korea — confirmed *not* smoothed — turned out to show a comparably
large gap, and New Zealand — confirmed smoothed, same as Australia —
showed a much smaller one) and it did not discriminate a direction or a
magnitude. Marking this `bandRobustness` anyway would claim a precision
the evidence doesn't support — the same reasoning that left `innovation`
and `personal-safety`'s staleness cadence unset rather than guessed at
(CLAUDE.md's 2026-08-24 review) is being applied here a third time. **A
disclosed construction concern is not the same thing as a quantified band
fragility.** This gauge carries the first; it does not yet carry the
second. See HANDOVER.md for the open item on what a test that could
actually discriminate would require.

**Scope.** This section describes a presentation-layer disclosure only.
The underlying question — whether min-max normalisation should be replaced
with something robust to outliers (median/IQR-based, or rank-based) — is a
scoring-methodology change with knock-on effects on every historical score
and every band on the site, logged for the Phase D checkpoint alongside
band-threshold recalibration (§3.1), not decided or implemented here.

### §3.4 — Annual prose review: a review discipline, not a build gate (ruled 2026-08-26)

Distinct from the cohesion-majority-acceptance upgrade trigger dated
**2027-08-25** two sections up ("Gallup publishing a third Migrant
Acceptance Index administration... standing annual check, starting
2027-08-25") — that date is coincidental, not this ruling reused. That
trigger is about one gauge's source availability; this is a site-wide
review of prose, for all 23 gauges, ruled separately and recorded here so
the two dated 2027-08-25 items in this file are never conflated as one.

**The ruling**: a fixed annual review of all 23 gauges' claim-bearing
prose — why-this-matters files, drafted plain-language lines, CAUSE and
CONTESTED text, every staleness and data-policy disclosure — reads
against the gauge's *current* config and data, the same discipline
`assertWrittenAgainst` already applies mechanically to the narrow set of
fields it tracks (seriesId, institution, polarity, unit, scoringBasis,
evidenceStrength), extended here to a human reading the *prose itself*
against current reality, not just those six fields. **First pass:
2027-08-25.** Annual thereafter.

**Why this is a review discipline and explicitly not a build gate.**
HANDOVER.md's entries 5 through 9 are five real instances of the same
failure shape: true prose, sitting next to correct code, going false as
data moved underneath it — caught every time by someone reading the page
for an unrelated reason, never by anything mechanical. CLAUDE.md's
status-line rule (2026-08-26) names the reason a code-level fix can't
close this gap generally: the REGISTER_DRAFT_LINES guard mechanically
verifies roughly 60 of this site's ~150 claim-bearing strings, and only
the subset of those that are *derivable* from a gauge's own
value/median/rank arithmetic — a citation, a methodological judgment, an
"OECD's own commentary reads this the same way" claim has no computed
ground truth for a guard to check against. There is no way to build a
gate that verifies whether a sentence still accurately describes the
world; someone has to read it and decide.

**Considered and rejected: a marker-presence gate** (e.g. a build check
that every gauge's why-this-matters file was touched, or its
`copyApprovedAt` field bumped, within the last 12 months). Rejected
because it would look like verification while providing none — a file
edited for an unrelated reason, or a date field bumped without the prose
actually being re-read against current reality, would pass such a gate
exactly as readily as a genuine review would, and a green check next to
"reviewed" reads as authoritative whether or not a human actually
verified anything. That's the same failure this project has now named
twice — HANDOVER.md's entry 7 ("none of this site's existing machinery
checks whether a sentence or a heading still matches what the code next
to it actually does, because none of it was built to") and the
status-line rule above
("a green build-guard line reads as authoritative; it must say only what
it actually verified") — a mechanism that can't tell a real review from
a cosmetic touch is worse than no mechanism, because it stops looking
like an open question. **This stays a dated human commitment, recorded
here, not code.**

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

**Phase C, as of 2026-08-24.** All 16 planned gauges are now
configured, and **all 16 have real LIVE data** (12 fetched automatically
every month — including Internal cohesion, automated 2026-07-16 — plus
Education, Human capital depth, Inequality, and Productivity entered by
hand). Productivity was the last to land: see "Productivity — 2020 base
year ruling" below for the full BASE_PER decision. Every gauge's real status is in its own
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
| Internal cohesion | 🟢 Live | V-Dem (`v2cacamps`), via Our World in Data | Automated 2026-07-16 (`pipeline/lib/vdem.mjs`) — V-Dem's own dataset stays registration-gated, but OWID's maintained, version-pinned re-publication isn't; every fetch's provenance discloses the full chain, never implying a direct V-Dem fetch. Switched from `v2x_cspart` to `v2cacamps` the same day — see "Internal cohesion" below and CLAUDE.md's reversal + automation writeups. Untested from GitHub Actions specifically as of this build |
| Productivity | 🟢 Live (manual entry) | OECD | Dataflow flagged `NonProductionDataflow=true` by OECD itself; automated route abandoned by design, not oversight. Real data entered 2026-08-24 from a raw SDMX CSV export (`OECD.SDD.TPS:DSD_PDB@DF_PDB_LV(1.0)`). **`BASE_PER=2020`, not the 2015 PPPs the spec originally named** — see "Productivity — 2020 base year ruling" below. Korea's series starts 2011, not 1995 (OECD's own coverage gap for this country) |
| Human capital depth | 🟢 Live (manual entry) | OECD | Automated API never returned data across 3 attempts (see `data/manual/README.md`); real data entered 2026-08-24 from a raw SDMX CSV export (`OECD.EDU.IMEP:DSD_EAG_LSO_EA@DF_LSO_NEAC_DISTR_EA(1.0)`). AUS: 24 points, 2000-2021 and 2024-2025 — **2022 and 2023 are genuine publication gaps** (OECD's own export has blank `OBS_VALUE` for Australia those two years, not a download error), visible on the gauge's dense-layer series table |
| Inequality | 🟢 Live (manual entry) | OECD (Gini) | SDMX endpoint Cloudflare-blocked on every attempt from this environment (see `data/manual/README.md`); real data entered 2026-08-24 from a raw SDMX CSV export (`OECD.WISE.INE:DSD_WISE_IDD@DF_IDD(1.0)`). **Australia's own series is short and dated: only 5 points (2012, 2014, 2016, 2018, 2020) — this is OECD's actual publication ceiling for Australia on this series, not a partial collection.** Japan has no 2020 observation (only 2018 and 2021 — its own real cadence, declared in `missingCountries`, rank/median computed over the other 7 reporting peers). WID wealth-share context display is built (`contextSeries`) and ready, awaiting its own data entry |
| Education | 🟢 Live (manual entry) | OECD PISA | No fetchable SDMX dataflow or API endpoint (ASP.NET form wizard) — real numbers entered by hand 2026-07-16, PISA 2018 and 2022 cycles (Table I.1 of each cycle's Results Volume I), superseding the Phase A sample placeholder. Only 2 of a possible several cycles so far; direction now computes from real 2018→2022 movement |

See `data/manual/README.md` for each manual gauge's download template and
instructions, and CLAUDE.md ("OECD SDMX trio" and "Fetch-before-guessing
pass on the 5 remaining manual gauges") for the full reasoning behind
every automated-vs-manual split on this site.

### Productivity — 2020 base year ruling (2026-08-24)

Productivity's raw OECD export carries `BASE_PER=2020` — not the 2015 PPPs
this gauge's unit spec originally named. Checked before ruling, not
assumed: OECD rebased its entire Productivity Database on 2026-06-04 as
part of a broader methodology revamp, confirmed via OECD's own release
notes and cross-checked against DBnomics' independent mirror of the same
dataflow, which likewise carries no 2015-base variant any more. **The 2015
base is retired, not merely hidden behind a filter — there is nothing to
re-download.**

**Ruling: amend the spec to 2020 base and ingest as-is.** Levels are not
comparable to any pre-2026-06-04 2015-base figure a reader might recall or
find cited elsewhere — the unit label now reads "2020 PPPs"
(`gauges.config.json`). Peer-relative standing (rank, band, gap-to-median)
is expected to be largely preserved, since a base-year rescale is normally
close to a level shift that cancels out in a same-year cross-country
comparison — but this is a reasoned expectation, disclosed as such, not a
certified guarantee: OECD's June 2026 change was a broader methodology
revamp alongside the rebase, not base-year arithmetic alone, so some drift
in peer-relative position can't be ruled out.

**Distinct from, and not in tension with, the Inequality gauge's WID
decision.** That decision (see "Inequality" above) rejected the World
Inequality Database / Penn World Table PPP variant on **source and
methodology** grounds — PWT's multiple-benchmark PPP construction versus
OECD's national-accounts basis — a judgment about which institution and
methodology to trust, with no bearing on any base year. This productivity
ingestion is the reverse situation: same institution, same methodology,
same underlying series (OECD's own Productivity Database — GDPHRS,
USD_PPP_H, constant prices, all unchanged) — only the PPP conversion's
reference year moved, because OECD itself moved it. A future reader
noticing OECD's base year changed here while a PPP-methodology variant was
rejected elsewhere should not read that as an inconsistent standard —
they're answers to two different questions.

**Quality of Life dimension, as of Phase E's data-model-and-homepage
checkpoint (2026-08):** 8 gauges configured, all in the manual lane pending
the long-tail fetcher phase — including `housing-pressure`, which is
reused from Power and therefore already has real LIVE data feeding this
dimension's composite from day one, even though every other Quality of Life
gauge currently shows as Awaiting data. This is the correct, honest state
for this checkpoint, not a bug: Step 2 was scoped to land the data model and
the homepage layout first, stop, and hand over a manual download list
separately — see "Quality of Life dimension" below for the full ruling
record and CLAUDE.md's Phase E entry for the session-to-session summary.

| Gauge | Status | Source | Notes |
|---|---|---|---|
| Housing affordability | 🟢 Live (reused) | OECD (SDMX) | Same data file and fetch as Power's `housing-pressure` — see `reuseNote` on this gauge's config entry. **Truncation guard active as of 2026-08-09** — see "Long tail: the truncation guard" below |
| Life expectancy | 🟢 Live | World Bank | `SP.DYN.LE00.IN` — automated 2026-08-09, same generic World Bank route as 6 Power gauges |
| Life satisfaction | 🟢 Live | Gallup World Poll, via World Happiness Report (dashboard API) | Survey-based. Automated 2026-08-11 — WHR's old data panel is dead, fetched instead via the dashboard's own backend API; column meaning (`LI`, not `EV`/`AV`) verified against the app's own source legend. See `pipeline/lib/whr.mjs` |
| Personal safety | 🟢 Live, ⚠ intermittent | UNODC, via World Bank | `VC.IHR.PSRC.P5` — automated 2026-08-09. Two World Bank API timeouts on later Actions runs (2026-08-09) after a clean first landing — investigated 2026-08-09: not measurably slower/larger than other successful World Bank gauges from this project's own sandbox (near-identical response time and payload size to life-expectancy), so no gauge-specific fix applied; most likely cumulative network load from this pipeline's now-much-longer sequential run (2 OWID gauges × ~36 calls each, an xlsx download, multiple OECD calls, ~9 World Bank calls) rather than anything about this indicator itself |
| Work-life balance | 🟢 Live (manual entry) | OECD | 3 automation rounds, decided 2026-08-09 — the third surfaced a second, structurally different conflict (not just another dimension to pin), per the site owner's "no fourth round" rule. Real 1995-2019 data from the retired automated fetch was the baseline; **2020-2025 appended by hand 2026-08-24** from a raw SDMX CSV export, `WORKER_STATUS=_T` confirmed unambiguous in this export (same pin as the original fetch, no conflict). Merge checked for overlap before writing: CAN/NZL/KOR/USA already had a handful of post-2019 points from the earlier automated fetch, all 8 overlapping year/country values matched the new export exactly (deduplicated, not double-counted). `latestSharedYear` now 2025, all 9 peers reporting — see "Work-life balance: OECD dimension pin" below and `data/manual/README.md` |
| Air quality | 🟢 Live | World Bank (IHME GBD) | `EN.ATM.PM25.MC.M3` — automated 2026-08-09, same generic World Bank route |
| Cohesion — minority experience | 🟢 Live | V-Dem (`v2clsocgrp`), via Our World in Data | Automated 2026-08-09 via the same proven OWID route as `internal-cohesion` (`pipeline/lib/vdem.mjs` generalised into a factory serving both) |
| Cohesion — majority acceptance | 🟢 Live, **not scored** | Gallup Migrant Acceptance Index (news releases) | Survey-based. Entered by hand 2026-08-11 from the two Gallup articles' own tables — real data (8/9 peers 2016/17, 4/9 peers 2019). **Converted to an unscored gauge same day**: the 2019 wave's 4 peers are precisely the highest scorers, so any computed score would be structurally biased upward. See "Unscored gauges" below |

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

**Automated the same day**, via Our World in Data's maintained
re-publication of V-Dem rather than V-Dem directly (V-Dem's own dataset
download is registration-gated). Every fetch's provenance discloses the
full chain verbatim — OWID's own citation, which names the exact V-Dem
version it's built on — rather than implying a direct-from-V-Dem fetch.
See CLAUDE.md's "Internal cohesion: automated via OWID" entry for the
coverage verification, the cross-check attempt against V-Dem's own
tooling (partially blocked by a JS-only interface), and the export
quirks `pipeline/lib/vdem.mjs` works around.

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

## Quality of Life dimension (Phase E, started 2026-08)

A second, independently-scored composite alongside Power (the original
national-trajectory composite): does Australia remain a good place to live?
Same 9 peers, same min-max peer-relative scoring, same peer-relative
direction basis, same maturity tiers, same provenance and loud-failure
rules as Power. **Never folded into Power's composite** — two separate
headline verdicts, shown with equal prominence side by side on the
homepage. The interesting output is the tension between them (e.g.
"Slipping on trajectory, Holding as a place to live"). Both dimensions'
band thresholds remain provisional pending Phase D, which now covers both
together (per the existing Phase D deferral ruling — see "Phase D" in
CLAUDE.md).

### Step 1 ruling: the gauge set

Proposed and signed off in two rounds. **Launched (8, equal 12.5% weight
each, placeholder pending Phase D):**

1. **Life expectancy** — World Bank `SP.DYN.LE00.IN`. Outcome, hard
   statistic, full 9-peer coverage verified live.
2. **Housing affordability** — reused from Power's `housing-pressure`
   (same data file, independent weight in each dimension's composite) — see
   "Gauge reuse" below.
3. **Life satisfaction** — World Happiness Report's Cantril ladder (Gallup
   World Poll, 3-year rolling average). Outcome, survey evidence (carries
   the "Survey-based" tag). Also the gauge most relevant to the OECD Better
   Life Index overlap question — see below.
4. **Personal safety** — UNODC homicide rate, via World Bank
   `VC.IHR.PSRC.P5`. Outcome, hard statistic, full 9-peer coverage verified
   live.
5. **Work-life balance** — OECD average annual hours worked. Outcome
   (reads as culture, not policy directly), hard statistic. Polarity
   ("fewer hours is better") is flagged as a genuine values choice, same
   treatment as military-capability's polarity.
6. **Air quality** — PM2.5 mean annual exposure, World Bank/IHME
   `EN.ATM.PM25.MC.M3`. Outcome, hard statistic, full 9-peer coverage
   verified live.
7. **Cohesion — minority experience** — V-Dem's `v2clsocgrp` ("Social
   group equality in respect for civil liberties"), via the same proven
   Our World in Data republication route already built for
   `internal-cohesion`'s `v2cacamps`. Outcome (expert-assessed).
8. **Cohesion — majority acceptance** — Gallup's Migrant Acceptance Index.
   Outcome, survey evidence. **Not scored, as of 2026-08-11** — see
   "Unscored gauges" and the dedicated source-search subsection below for
   why fetching the real source changed this from the original plan.

**Deferred to a second batch**, pending further source-feasibility work,
not rejected: health system performance (avoidable mortality vs. health
spend as an input — undecided which is the right outcome measure);
incarceration rate (World Prison Brief has no confirmed bulk
download/API — same shape of problem this project already hit with PISA
and Inequality); road deaths (deliberately not launched alongside obesity
and drug-induced deaths, to avoid three gauges from one "health risk
behaviours" theme crowding the launch set); social support/trust (OECD's
own Trust Survey has only 2 rounds since 2021 — too young for this site's
10-year trailing direction calculation).

**Excluded outright, not deferred:** paid parental leave and statutory
paid holiday (genuine policy *settings*, one step removed from any
measured wellbeing outcome — a real departure from this site's
outcome-first pattern that every other scored gauge, including the
policy-adjacent ones like military capability and work-life-balance,
avoids); NEET rate (reads closer to Power's existing economic/labour-market
territory than to Quality of Life); commute time (OECD's Time Use Survey
runs on infrequent, non-synchronized national waves — unusable for this
site's annual scoring); broadband/digital access (doesn't clearly answer
"is this a good place to live" the way the launched 8 do).

### Gauge reuse

A gauge may score in both dimensions when the reuse is genuinely
warranted and explicitly disclosed — the site owner's standing condition.
Currently one case: `housing-pressure` (renamed "Housing affordability" on
the Quality of Life side of the site, same underlying gauge id and data
file) — housing cost pressure is both a national economic-pressure signal
(Power) and a direct determinant of whether Australia is a good place to
live (Quality of Life). One fetch, one data file, two independent
composite contributions at each dimension's own weight
(`gauges.config.json`'s `weights: { "power": 0.0625, "quality-of-life":
0.142857 }` — the Quality of Life side renormalised from 1/8 to 1/7 on
2026-08-11 when cohesion-majority-acceptance became unscored, see
"Unscored gauges" below). Disclosed on the gauge's own page, on `/status`
(a dedicated "Reused gauges" section), and here. Implementation note: a
gauge's `weights` object (not a separate `dimensions` list) is the single
source of truth for *scored* dimension membership — `Object.keys(weights)`
answers "which dimension(s) is this gauge scored in," so there's no
second list that could silently drift out of sync with the actual
weights. `unscoredDimensions` is the separate, parallel answer to "which
dimension(s) does this gauge appear on without being scored."

### The social cohesion cluster

Cohesion across political, racial, religious, and country-of-origin lines,
measured from both sides. Three questions were ruled on at Step 1:

**(a) One gauge with two sub-scores, or paired gauges?** Ruled: **paired
gauges**, not one gauge with two sub-scores — the site owner's own lean,
confirmed. Both were originally planned to score independently through the
existing one-gauge-one-raw-series engine, no new multi-component scoring
machinery needed (same reasoning that kept Inequality to OECD Gini alone,
WID wealth-share as context only). **Amended 2026-08-11, once the real
source was actually fetched**: Cohesion — minority experience scores as
planned; Cohesion — majority acceptance turned out **unscored** — see
"Unscored gauges" below for why. The originally-planned "divergence
callout" between the two never got built, since a real callout comparing
a score against something deliberately not scored would misrepresent the
comparison as more solid than it is — the asymmetry between the two
gauges' pages (one has a number, one plainly says why it doesn't) already
carries the same "read both sides" spirit "Two ways to read this" was
meant to give, without implying a false equivalence.

**(b) How many gauges does the cluster warrant?** Ruled: **2 of the
dimension's 8 launch slots (25%)** — enough to cover both directions of
the theme without crowding out life expectancy, safety, housing,
work-life balance, air quality, and life satisfaction, each of which
covers a genuinely distinct facet of "good place to live."

**(c) Scoring attitude surveys with irregular wave timing against annual
scoring.** Ruled: a new, disclosed **alternate scoring basis**,
"latest-wave-per-country" — see the dedicated section below. This is a
methodology fork, not a minor implementation detail, and the site owner
was explicit it must be recorded prominently (here, not just as a code
comment) and flagged on-page wherever it applies, not left for a reader to
discover by inspecting `lib/scoring.ts`.

### Alternate scoring basis: "latest-wave-per-country"

**In live use since 2026-08-27**, by `cohesion-majority-acceptance` — the
gauge this basis was originally built for, which then spent sixteen months
unscored and is now scored on it after switching to WVS Wave 7. This is the
mechanism's first real exercise, and the switch immediately surfaced two
defects in code that had never had to honour it — see "Two defects the
first live latest-wave gauge exposed" below. Recorded plainly because the
lesson generalises: a mechanism built ahead of its first user is not
tested, only written.

Every gauge on this site compares all 9 countries' values from the
**same shared year** (`latestSharedYear` in `lib/scoring.ts`) — except a
gauge with `scoringBasis: "latest-wave-per-country"` set in
`gauges.config.json`. On this basis, each country contributes its
**own most recent available value**, even though that value comes from a
different calendar year per country
(`computeLevelScoreLatestWavePerCountry`,
`computeLevelScoreForAllCountriesLatestWave`,
`computeRankLatestWavePerCountry` in `lib/scoring.ts`). This is a
deliberate, disclosed departure, not an inconsistency — for attitude-
survey gauges whose source fields irregular, non-synchronized waves per
country (Gallup's Migrant Acceptance Index, this basis's original and
only real case, was fielded in most countries in 2016, the US in 2017,
then a broader set again in 2019 — requiring a shared year would have
excluded most of the peer set).

Made visible everywhere the fork matters, per the site owner's explicit
condition:
- **On the gauge's own page, in the default layer**: an amber "Alternate
  scoring basis" note, generated by `describeScoringBasis(config)` in
  `lib/scoring.ts` — shown both once real data exists and in the
  Awaiting-data state, since it's a property of the gauge's configuration,
  not of whether data has landed yet.

  **Corrected 2026-08-27.** This bullet previously said only "on the
  gauge's own page", which was true only after a reader opened the
  dense-layer toggle — the note rendered inside `DenseLayerContent`, which
  is behind a `useState` expander and therefore absent from the static
  HTML a reader first sees. Found the same accidental way as HANDOVER
  entry 7's family: while checking something else on the deployed page.
  **Fixed by surfacing the note rather than by rewording the claim** —
  `scoringBasisNoteTop` in `lib/gauge-view.ts` now renders it in the
  default layer beside `staleReason`. Rewording would have been cheaper
  and would have documented a weaker guarantee than the ruling that
  created this mechanism actually requires: the fork must be visible on
  every page that touches it, without anyone having to know a toggle
  exists. Every sibling disclosure of this class — the staleness
  disclosure, the maturity tag, the dataPolicy note — already renders
  unconditionally; this one was the outlier.
- **On `/status`**: a "Latest-wave basis" tag in the gauge table, plus a
  dedicated "How to read this" card explaining the "Insufficient history"
  direction state (below).
- **Here**, prominently, not only as a code comment.
- **On the peer dot strip** (`DotStrip.tsx`): each dot's tooltip shows its
  own `asOfYear` when set, and the caption gains a line noting the years
  differ by country — so the departure is visible on hover, not only in
  prose.

**Direction on this basis**: reports a new state, **"insufficient-history"**
(distinct from both "flat," a real computed trend that happens to be
small, and the italic "no trend data," where no comparable data exists at
all) whenever a gauge has fewer than 3 waves or less than 6 years between
its earliest and latest point (`MIN_WAVES_FOR_TREND` /
`MIN_SPAN_YEARS_FOR_TREND` in `lib/scoring.ts`). Two data points ~3 years
apart can't distinguish a real trend from noise between two snapshots —
this gate exists specifically so the site never manufactures a
confident-looking arrow out of that. No gauge currently has 3+ waves
spanning 6+ years on this basis, so a real trend computation for that case
isn't built yet — deliberately, rather than guessed at; build it for real
once a gauge actually qualifies. Rendered as a distinct "?" glyph in
`DirectionArrow.tsx`, never conflated with "Flat" or "No trend data."

### Unscored gauges

**No gauge currently uses this mechanism.** `cohesion-majority-acceptance`,
the case it was built for, became scored on 2026-08-27 when it switched to
WVS Wave 7 (see "Rename to a WVS-scoped construct" below). The mechanism is
kept and documented — the failure mode it exists for is real and will recur.
The account below is the original 2026-08-11 record, left as written.

A gauge can appear on a dimension's page — its own card in that
dimension's gauge grid, its own detail page, real data shown — **without**
being scored or counted in that dimension's composite. New mechanism,
built 2026-08-11 for a real, specific need: fetching
`cohesion-majority-acceptance`'s actual source revealed its 2019 wave
publishes only a global top-10 list — 4 of the 9 peers, and precisely the
4 highest scorers (Canada, New Zealand, Australia, United States). Any
score computed from that subset would be **structurally biased upward**,
not just thin — a materially worse failure mode than "insufficient
history" (too little data to trust a trend) or a disclosed missing-country
gap (a real hole in an otherwise-valid comparison). Site owner's explicit
ruling: a gauge that looks scored but isn't comparable is worse than no
gauge — show the real data, state plainly why it isn't scored, never
publish the biased number.

**Implementation** (`GaugeConfig.unscoredDimensions` /
`unscoredReason` in `lib/types.ts`): deliberately separate from `weights`,
which is both dimension membership *and* the composite weight in one
field. `unscoredDimensions` is membership only — a gauge listed there for
a dimension has no entry in `weights` for that same dimension, so it's
structurally excluded from every composite calculation
(`computeComposite`, `computeCompositeForAllCountries`,
`computeHistoricalComposite` already skip any gauge with no weight for
the dimension in question — no extra "if unscored, skip" branch needed
anywhere in the scoring engine; exclusion follows from absence, the same
principle `weights` was already built on). `unscoredReason` is mandatory
alongside it — the site never renders "not scored" without saying why,
shown prominently (`components/UnscoredTag.tsx`, a new
`components/UnscoredGaugeCard.tsx`, and a dedicated `UnscoredGaugeDetail`
render branch on the gauge page, all distinct from the ordinary scored
gauge treatment: no level score, no `DirectionArrow`, no dot strip, no
rank chart — none of those are meaningful for data that was never fed
into a composite).

**Explicitly not the same as "Awaiting data"** — the site owner's own
requirement, verified by construction rather than just asserted: an
unscored gauge with real data renders via `UnscoredGaugeCard`/
`UnscoredGaugeDetail` regardless of whether a data file exists, checked
*before* the awaiting-data branch in both `app/page.tsx` and the gauge
detail page. The "N further gauges awaiting data" disclosure math (the
homepage's `DimensionVerdict` and `/status`'s per-dimension composite
line) is scoped to *scored* gauges only (`isScoredInDimension` in
`lib/gauges-data.ts`) — an unscored gauge with real data must never get
miscounted as "awaiting" something it was never going to have, and
conversely must never silently inflate a "gauges awaiting data" count
once real data lands. Quality of Life's own gauge-set weights were
renormalised the same day, 1/8 → 1/7 across the 7 gauges still actually
scored, so a displayed weight always matches what the composite math
actually does with it.

### Majority-attitude source search (Step 1, 2026-08) — the full record

Before accepting Gallup's Migrant Acceptance Index (2 waves only, 2016/17
and 2019) as `cohesion-majority-acceptance`'s source, five live, repeating
candidates were checked for a better-cadence, peer-complete alternative,
per the site owner's explicit instruction. None cleared the bar. Recorded
in full here so a future session never repeats this hunt from scratch:

1. **Gallup's own broader World Poll item** ("is your community a good
   place to live for immigrants/minorities/gay or lesbian people") —
   genuinely still fielded most years as part of the ongoing World Poll
   (confirmed press releases in [2013](https://news.gallup.com/poll/158438/worldwide-communities-good-immigrants.aspx),
   [2018/19](https://news.gallup.com/poll/267248/worldwide-communities-good-migrants.aspx),
   and [2025](https://news.gallup.com/poll/712601/people-say-communities-good-minorities.aspx)).
   But the full country-year table is published only via Gallup Analytics,
   a paid subscription — free coverage is limited to whichever handful of
   countries each year's press release happens to name (the 2025 release
   names Oman, UAE, Canada, and the USA — not the other 7 of our peers).
   Not a better source than the existing MAI waves for this site's
   purposes, just a different irregular snapshot of the same underlying
   instrument, behind the same paywall for the data that would actually
   matter.
2. **World Values Survey Wave 8** — genuinely live and repeating in
   principle (fieldwork January 2024 through December 2026), but
   mid-fieldwork with no released results as of this entry. Nothing to
   score today. **Named upgrade candidate**: revisit once its results are
   released after fieldwork concludes.
3. **Pew Research Global Attitudes** — no systematic recurring "same
   battery, same countries, every wave" product on immigration/diversity
   across all 9 peers; country selection changes survey to survey (a
   2024/25 wave named Argentina, Australia, Brazil, Canada, France,
   Germany, Greece, Hungary, Israel, Italy, Mexico — UK, NZ, Korea,
   Netherlands, and Japan not confirmed in that particular list). Ad hoc,
   not a peer-complete index.
4. **Ipsos Global Views on Immigration** — the closest real alternative
   found: a genuinely recurring tracker (~3-yearly, most recently feeding
   a 2026 Ipsos/UNHCR report), confirmed live covering 8 of our 9 peers
   (Australia, Canada, Germany, UK, Japan, South Korea, New Zealand, USA)
   — **missing the Netherlands**. **Named upgrade condition, recorded
   2026-08-11 as the trigger for a future session — not investigated or
   built further now**: *"Ipsos Global Views on Immigration covers eight
   of the nine peers (~3-yearly, missing the Netherlands). If a fuller
   release covering the Netherlands is found, this gauge becomes
   scoreable."* Also stated on the gauge's own page via
   `gauges.config.json`'s `dataPolicy`.
5. **Edelman Trust Barometer** — genuinely annual (published every
   January — the best cadence found among all five), 28 countries, but
   two problems: its relevant item is a generalized "hesitant to trust
   someone different — different culture, background, lifestyle" question,
   a proxy for majority acceptance of migrants specifically, not a direct
   match; and full confirmation of Netherlands, New Zealand, and South
   Korea's inclusion in the current 28-country list wasn't found live
   (only a subset of countries could be confirmed from available sources).

**Verdict, reported honestly rather than papered over**: nothing clears
the bar of "live, annually-repeating, all-9-peer-complete majority-attitude
measure." The gauge's own `dataPolicy` in `gauges.config.json` states this
precisely, per the site owner's edit:

> No public, peer-complete majority-attitude series is currently available
> for these nine countries. Gallup continues to field the underlying
> question, but country-level results since 2019 are published only
> behind a paid subscription. This gauge therefore uses the last freely
> published waves (2016/17 and 2019). The absence of a current public
> series is itself a finding.

The gauge's staleness disclosure is equally direct — its `staleDisclosure`
field (rendered wherever the generic "due for a refresh" copy would
otherwise appear, on both the gauge page and `/status`) states the data is
genuinely 7 years old, not merely on a slow-but-normal cadence like
Education/PISA's 3-4-yearly cycle.

### Majority-attitude source re-verification and ruling (2026-08-25)

A ruling session re-checked the state of this gauge against live sources —
not desk research — after new candidates had emerged since the Step 1
search above. Four real candidates were checked in detail; the full
verified coverage matrix (per-source × per-peer × latest year, with a URL
per cell and a confidence mark for anything not confirmed by direct
primary read) is in that session's record. Durable findings and rulings:

**ISSP 2023 National Identity & Citizenship (`ZA10010_v1.0.0`)**,
released 13 March 2026 (GESIS's own study metadata date; ISSP.org's news
announcement of the same release posted 16 March 2026 — a three-day
publish-then-announce gap, not two different release events; 13 March is
the correct release date to cite). Covers 7 of the 9 peers cleanly
(Australia, Canada, Germany, Korea, Netherlands, New Zealand, United
States). Great Britain was fielded but published separately as `ZA9132`
for methodological reasons — GB and Scotland were surveyed as two
distinct studies, and GB was held out of the integrated file on that
basis, not dropped. Japan does not appear in this release at all.
Confirmed live via direct read of ISSP's own news release, not inferred.
GESIS has real, confirmed precedent for folding in late-arriving
countries at a later integrated-file version (a prior ISSP module added
Australia, Netherlands, and Portugal at `v3.0.0` after they'd missed
`v2.0.0`) — this is the basis for the ISSP trigger below, not a hopeful
guess.

**WVS Wave 7 (2017-2022)** is the only source confirmed covering all 9
peers (fieldwork years per country, confirmed live: USA 2017, Germany and
Korea 2018, Japan 2019, Canada and New Zealand 2020, Netherlands and
Great Britain 2022). Its Q21 neighbours item and Q121-Q130 "Perceptions
of Migration" battery both confirmed present in the Wave 7 questionnaire.
**Whether this source clears this project's eligibility bar is not yet
resolved** — WVS's own Online Data Analysis tool appears, from its own
interface documentation, to let a user pull a weighted per-country
percentage table for a chosen question without downloading microdata,
which would place it in the same category as every other manual-lane
source this site uses (a provider-computed statistic, hand-entered) —
but this was not confirmed by actually driving the tool and reading a
real output table; every attempt to reach `worldvaluessurvey.org` pages
beyond navigation shells came back too thin to confirm. **Using WVS's raw
microdata instead — the fallback if the tool doesn't clear the bar — would
make this Scorecard compute a country statistic for the first time, which
this project has explicitly reserved as its own constitutional decision,
not a by-product of a copy fix.** See the named follow-up below. Note
also, disclosed rather than treated as disqualifying: WVS's country entity
is "Great Britain," not "United Kingdom" — the same GB/UK terminology gap
ISSP has, so treating WVS's version of this as fatal while treating
ISSP's as a mere caveat would be an inconsistent standard.

**Ipsos/UNHCR World Refugee Day now covers the Netherlands** — confirmed
live in both the 2025 and 2026 editions, meeting the trigger this project
had recorded. **A real correction to the desk research that fed the
original 2026-08-11 search, found and fixed during this ruling**: New
Zealand is not "absent from every wave." Ipsos rotates its country set
between a large periodic edition (52 countries — confirmed, with
moderate confidence, search-corroborated but not primary-verified since
the source PDF and press pages returned only binary/blocked content to
this session's tools — to include all 9 peers in 2024) and a smaller
~29-country annual edition (confirmed live, primary source) that drops
New Zealand in 2025 and 2026. **The accurate disclosure is that no single
peer is permanently excluded — the source fails on repeatability, not on
a fixed structural gap** — a materially different reason than the one
originally recorded, and the one now carried in `dataPolicy` and the
Methodology page. Separately, and independently of the above, the
instrument measures attitudes to refugees specifically, not migrants
generally — that half of the original finding holds.

**Four named, dated upgrade triggers replace the single Ipsos-Netherlands
trigger** (which is now resolved, per above). **Trigger 4 has since been
retired and three remain — see the note after the list:**

1. **ISSP `ZA10010` reaching a version with Japan and a usable GB file.**
   Review by **2027-03-01** (12 months after `v1.0.0`'s release — a
   plausible late-country cadence based on the one precedent found, a
   floor rather than a confirmed date).
2. **WVS Wave 8's public release** (fieldwork January 2024 - December
   2026; no stated release timetable was found in this project's search).
   Review by **2027-06-01** (6 months after fieldwork close — Wave 7 took
   roughly that long from its own December 2021 close to first integrated
   release; a floor, not a confirmed date).
3. **Gallup publishing a third Migrant Acceptance Index administration**
   with full country tables. No cadence to anchor a fixed date to —
   standing annual check, starting **2027-08-25**.
4. **The WVS Online Analysis tool eligibility check** — **fully resolved,
   trigger retired.** The tool cleared the bar on 2026-08-26, and the
   remaining questions it opened (weighting; Gallup-shaped construct versus
   a WVS-scoped rename) were ruled on 2026-08-27. **The gauge is now scored
   from WVS Wave 7 Q21** — see "Rename to a WVS-scoped construct" below.

**Three triggers still stand** (1-3 above). They are no longer about making
this gauge scoreable — it is scored — but about improving it: a source with
more than one wave per country would let this gauge report a real trend
instead of "insufficient history," and Wave 8 is the nearest such prospect.

**Retirement, raised and answered, recorded so it is not re-litigated
cold.** A prior review reportedly flagged this gauge as the only real
retirement candidate on the site, on the grounds that it could never
improve by waiting. **That framing could not be found anywhere in this
file or in `CLAUDE.md`** — it was not located during this ruling and
appears to have come from a session log outside the repo rather than a
recorded ruling. Recording that plainly: this is the site owner's own
gap to note, not a prior session's — an unwritten ruling is exactly the
kind of thing this project's durable-record discipline exists to prevent,
and this entry closes that gap by writing down both the correction and
the answer. On the substance: the "can never improve by waiting" premise
is wrong as of this ruling. Two real, dated paths to a complete peer set
exist (triggers 1 and 2 above) — neither is speculative in the way "hope
a new source appears" would be. **Ruling: do not retire.** Keep the gauge
unscored with the sharper disclosure above, carry the four dated
triggers, and revisit at whichever fires first.

**Named follow-up — was "logged but not started"; the tool-eligibility
half is now resolved, see immediately below.** The gated second question
(Gallup-shaped construct vs. a WVS-scoped rename) was never in scope for
that check and is not resolved by it: if WVS does clear the bar,
"majority acceptance of migrants" as currently specified is a
Gallup-shaped construct (a three-item average — neighbours, living in the
country, marrying into the family) that neither of WVS's candidate items
matches exactly (Q21 is a single rejection-framed neighbours item;
Q121-130 asks about perceived *impact* of immigrants, not personal
acceptance). Whether to keep insisting on the original construct (leaving
the gauge unscored indefinitely if WVS is the only 9-of-9 source) or to
name a deliberately WVS-scoped version of this gauge is a concept
decision, not an implementation detail — argued both ways in the ruling
session's record, not resolved there, and not to be resolved as a side
effect of answering the tool-eligibility question.

### WVS Online Analysis tool eligibility check: resolved (2026-08-26)

**The tool clears the bar.** A verification-only session actually drove
it live — not read its interface documentation and inferred what it
would emit, which is what stalled the prior attempt — and confirmed: the
WVS Online Analysis tool publishes a real, exportable per-country
percentage table for Q21 without downloading microdata, with no login or
paywall anywhere in the request chain, and the question wording it
returns is an exact match to this gauge's spec. This places WVS in the
same category as every other manual-lane source this site uses (a
provider-computed statistic, hand-entered) — the microdata-computation
fallback this project explicitly reserved as a separate constitutional
decision (see "Named follow-up" above, original wording) is **not**
triggered by this finding; it doesn't need to be.

**What was actually returned, live, for Germany 2018 (Wave 7):**

| | Number of cases | % of Total |
|---|---|---|
| Mentioned | 60 | 3.9% |
| Not mentioned | 1,463 | 95.7% |
| Don't know | 4 | 0.3% |
| No answer | 1 | 0.1% |
| **(N)** | **(1,528)** | **100%** |

Question wording returned by the tool, verbatim: *"On this list are
various groups of people. Could you please mention any that you would
not like to have as neighbors? … Immigrants/foreign workers."* Exact
match to Q21 as specified for this gauge.

**Export confirmed real, not merely offered.** The tool's "Export to
Excel" control was exercised directly: it returns a genuine Composite
Document File `.xls` binary (`Content-Disposition: attachment`),
confirmed to actually contain the table's own text ("Mentioned",
"Immigrant", "Neighbor", "1528") rather than a stub. No authentication,
registration, or paywall was encountered at any point in the entire
request chain, on a fresh anonymous session.

**Method, recorded in reproducible detail because nothing about it is
documented publicly and it was expensive to find.** `worldvaluessurvey.org`'s
top-level pages are a client-side JS app (`SetContent()`/form-POST
navigation) — this is genuinely why the prior attempt, and every
plain GET/WebFetch attempt in this session, only ever returned the same
navigation shell regardless of query params: nothing executes the JS
that drives it. The route through was reading the site's own
client-side JS (`js/jds.js`, inline `<script>` blocks) to find what it
actually does, then replicating that exact request sequence as raw HTTP
POSTs — no JS execution or browser needed, just reproducing the calls a
browser would make:

1. The "Online Analysis" page embeds a real app in an iframe:
   `AJOnline.jsp` — not linked or documented anywhere findable by
   searching, only visible by reading the page's raw HTML source.
2. Its wave buttons call `ShowWave(1562)` for 2017-2022 (Wave 7), which
   POSTs to `AJOnlineCountries.jsp` and returns the real country/study
   checklist. Germany 2018's checkbox value is `276:3310`.
3. **The field-mapping is not the raw checkbox value.** The parent
   form's `SAIDS`/`AMIDS` fields are the *split* halves of that value —
   `SAIDS=3310`, `AMIDS=276` — found by reading `SetSamplesSel()` in the
   page's own JS (`JDSTokenRemove`/`JDSToken` split each `"country:study"`
   pair on the colon). Posting the raw unsplit value produces a
   silently truncated, tableless response that looks like another thin
   wall but isn't one — this was the actual blocker, not a login or rate
   limit.
4. POST `SAIDS`/`AMIDS`/`WAVE=1562` to `AJOnlineIndex.jsp` → returns the
   full Wave 7 question index. Confirmed `MAIDX=B_Q021` = "Neighbors:
   Immigrants/foreign workers."
5. POST the same fields plus `MAIDX=B_Q021` to `AJOnlineQtn.jsp` → the
   real, live-rendered table above.
6. POST the same fields to `AJExportXLS.jsp` → the real `.xls` export.

**A dead end worth recording so it isn't retried.** `jdsurvey.net`
(ASEP/JDS, the WVS Data Archive's original host, referenced in old WVS
contact information) has its own, separate "Values Surveys" analysis
portal, driven by the same technique above. **It does not carry Wave 7
at all** — only Wave 5 (2005-2008) and the pooled 1981-2004 file. The
real Wave 7 tool lives on `worldvaluessurvey.org` itself via the
`AJOnline*.jsp` chain above, not on jdsurvey.net.

**Left open, deliberately not guessed at: whether the displayed
percentages are weighted.** Checked, not assumed either way: no weight
toggle or weight variable appears anywhere in the tool's own UI (its
"Cross by" variable list has none); WVS's own FAQ documents six standard
weight variables (S017, S017a, S018, S018a, S019, S019a) but states
nothing about whether Online Analysis applies one by default; no other
WVS documentation found states it either way. **N=1,528 was deliberately
not treated as evidence of either answer** — a plausible-looking
unweighted sample size is not confirmation, and treating it as such
would be exactly the kind of inference-from-shape this project has
refused every other time a real number was needed instead. This
question, and the still-open Gallup-vs-WVS-construct question above, are
now handed to a dedicated session — see HANDOVER.md's constitutional
follow-up entry.

### Republished, derived, constructed: what this site may publish (ruled 2026-08-27, constitutional)

A permanent rule, ruled once, governing every gauge on this site and every
gauge added to it. It exists because a gauge that presents this project's
own arithmetic as a provider's published figure is making a claim about
someone else's work that they never made.

**Republished** — the provider's own system performs every statistical
operation behind the figure and emits it finished. Choosing which of a
provider's figures to read is not an operation.

**Derived** — this project performs a determinate transformation on
published figures: a sum, a ratio, a growth rate, or an average. It
qualifies as derived only if all three hold: the operation has one correct
answer given its inputs; the inputs *and* the operation are both named in
the gauge's unit, so that **the unit declaration is the complete method**;
and a reader can reproduce the figure from the provider's own published
numbers.

**Constructed** — producing the figure requires methodology that cannot fit
in the unit declaration: selecting which of many items enter an index,
assigning non-uniform weights, resolving how to fold reverse-coded or
non-comparable items, or otherwise making choices with no single correct
answer.

**Republished and derived figures may be published. Constructed figures may
not.**

**Note on subset selection.** A derived gauge may combine a site-chosen
subset of a provider's indicators — debt-burden takes 2 of BIS's 5 borrower
sectors, rule-of-law-corruption 2 of WGI's 6 dimensions. What a gauge
*measures* is always a site choice, declared in its unit. This rule governs
whether the *figure* follows determinately from that declaration, not
whether the declaration itself was inevitable.

#### Scope: input figures only

The rule governs the figures that enter a gauge. It does **not** govern
this site's own scoring layer — min-max level scores, both composites, the
band thresholds, the direction classification. Those are statistical
operations no provider performed, and they are exempt for a specific
reason, not by carve-out: **they are attributed to the site.** They are
declared as this project's editorial apparatus on /methodology, and no
reader could mistake them for something an institution published.

That is the same standard the rule itself rests on. The rule exists to stop
this project attributing its own arithmetic to a provider; the apparatus is
exempt because it never does. Both reduce to one requirement: **say who did
the arithmetic.**

#### The retroactive audit — all 23 live gauges

Run before the rule was recorded, at the site owner's instruction, so that
no gauge is grandfathered in by never having been tested. Every gauge was
classified by reading its fetcher or its collection record, not its unit
string.

**Constructed: none.** No live gauge fails.

**Derived: five.** Named explicitly so a future reader sees they were
tested rather than overlooked:

| Gauge | Operation | Unit declaration carries the method |
|---|---|---|
| trade | Each country's exports divided by the World Bank's WLD world-total aggregate | "Share of world exports of goods & services (%)" |
| demographic-momentum | Year-over-year growth computed from a working-age population *level* series | "Working-age population (15-64) growth, % per year" |
| debt-burden | Sum of two BIS Total Credit borrower sectors, both already % of GDP | "Household + government debt, % of GDP" |
| education | Mean of PISA's three domain scores; OECD publishes no pre-blended figure | "PISA mean score (maths, reading, science average)" |
| rule-of-law-corruption | Mean of two World Bank WGI governance estimates, both on the same scale | "WGI Rule of Law + Control of Corruption, averaged" |

**Republished: the other eighteen.** Includes two worth noting because
they look derived and are not: life-satisfaction's three-year rolling
average is computed and published by the World Happiness Report, and
work-life-balance's average annual hours is computed and published by OECD.
military-capability applies a decimal-to-percent unit conversion to SIPRI's
published share of GDP — a unit conversion is not a statistical operation
and does not make a figure derived.

**cohesion-majority-acceptance is republished**, not derived: the WVS
Online Analysis tool emits the valid-base percentage itself, so no
arithmetic is performed here at all.

#### This rule was redrafted once, before adoption — and why that is recorded

The first draft, written in the constitutional memo and adopted as written,
**condemned five live gauges that were honest, disclosed, and correct**.
That is recorded here rather than quietly fixed, so a future reader knows
the wording was tested against real gauges rather than reasoned from first
principles and assumed sound.

The failure was traced to a wording accident, not a disagreement about
principle. The first draft permitted "an average over a *provider-defined
set*" while leaving sums unqualified. Two gauges make structurally
identical choices and landed on opposite sides of that clause:

- **debt-burden** selects 2 of BIS's 5 published borrower sectors and sums
  them. BIS does publish an aggregate (sector C, non-financial sector), but
  it equals households + corporations + government, and this gauge
  deliberately excludes corporations. Under the first draft this **passed**,
  because the operation is a sum.
- **rule-of-law-corruption** selects 2 of the World Bank's 6 published WGI
  dimensions and averages them. Under the first draft this **failed**,
  because the operation is an average, and the pair {Rule of Law, Control
  of Corruption} is not a set the World Bank defines.

Both sector lists were verified live against the providers' own APIs during
the audit, not recalled. Same kind of choice, same disclosure, opposite
verdicts, decided entirely by whether the arithmetic was spelled "sum" or
"average". The replacement clause tests reproducibility instead — whether
the unit declaration is the complete method — which is what the objection
to a self-assembled index was always actually about.

**The Q121-Q130 rejection is unaffected by the redraft.** Ten items,
contested weights, reverse-coded folding and a policy item cannot be stated
in a unit declaration, so that battery remains constructed under both
drafts — and its primary ground was construct mismatch in any case.

### Are the Online Analysis percentages weighted? Derived evidence, not documentation (2026-08-27)

**Finding: yes, weighted. This is an inference from the tool's own
arithmetic, not a documented statement** — recorded that way deliberately,
so the strength of the conclusion is never read as greater than the
evidence behind it.

**WVS documents nothing.** Re-confirmed live: no weight toggle anywhere in
the tool's UI, no weight variable in its 27-item "Cross by" list or in the
full Wave 7 question index, nothing in its own client-side JavaScript
(js/jds.js and the inline blocks contain no weight logic at all), and
nothing in WVS's FAQ stating whether Online Analysis applies one by
default. The six standard WVS weight variables (S017, S017a, S018, S018a,
S019, S019a) are documented as existing; their use by this tool is not.

**The reasoning.** A table of raw integer frequencies has one property it
cannot violate: a group of cells can never sum to *more* than its own
marginal. Missing data pushes a sum below the marginal; nothing pushes it
above. The tool's cross-tabulations break that rule repeatedly:

| Table | Cell group | Cells sum to | Stated marginal |
|---|---|---|---|
| AUS | Q21 x income, "Fifth step" column | 374 | 373 |
| AUS | Q21 x income, "Nineth step" column | 28 | 27 |
| AUS | Q21 x income, "Mentioned" row | 162 | 161 |
| CAN | Q21 x age, "16-24" column | 437 | 436 |
| CAN | Q21 x age, "25-34" column | 660 | 659 |
| CAN | Q21 x age, "45-54" column | 721 | 720 |
| CAN | Q21 x age, "Mentioned" row | 353 | 352 |
| USA | Q21 univariate, all four categories | 2,597 | 2,596 |
| USA | Q21 x income, "Don't know" row | 95 | 94 |

Every figure was read off the tool's own "Show Counts" view and re-added
by hand, independently of the parser written for the bulk sweep. The only
way a categorical frequency table acquires non-integer underlying
quantities is weighting: the displayed "Number of cases" is a **rounded
weighted count**, and the percentage beside it is computed on the same
basis.

**The control that rules out a systematic bug.** A parsing artefact or a
server fault would appear everywhere. It doesn't. **Germany, Japan and
South Korea return perfectly consistent tables on every crossing tried** —
12-category income, sex, three-band education, six-band age — with zero
mismatches across every row, column and marginal. Australia, Canada and
the United States break on some crossings and not others, which is what
rounding predicts and what a systematic bug would not do. That split is
itself the confirming signal: WVS supplies no weight (or a weight
identically 1) for some Wave 7 samples and a real one for others, and a
sample with nothing to round cannot produce a rounding artefact.

**The residual, stated plainly.** *Which* weight is not determinable from
outside. What can be pinned is that the weighted N matches each country's
true sample size to the unit — Germany 1,528, Australia 1,813, Canada
4,018, USA 2,596 — which places it in the **S017 family** of nationally
equilibrated weights and rules out S018, which rescales every country to a
common N and would visibly change these totals.

**Why this is the strongest evidence obtainable.** Every download on
worldvaluessurvey.org — microdata, codebooks, per-country technical
reports, even the published "WVS Results By Country 2017-2022" PDF — sits
behind a registration form requiring a real name, institution and e-mail
plus a conditions-of-use agreement. The Online Analysis tool is the only
ungated route on the entire site. **The site owner has not authorised
accepting that licence** (ruled 2026-08-27), so the microdata cross-check
that would settle this directly is deliberately unavailable, and the
inference above stands in its place.

### Rename to a WVS-scoped construct (ruled 2026-08-27)

**"Cohesion — majority acceptance" is now "Cohesion — acceptance of
migrant neighbours."** The gauge id, plate (2.7) and URL are unchanged, so
the record and every existing link survive.

The old name was Gallup-shaped. Gallup's Migrant Acceptance Index averages
three items at increasing personal proximity — migrants living in the
country, becoming neighbours, marrying into the family — into a 0-9 scale.
WVS Q21 is one rejection-framed item at a single proximity.

**The evidence that this is substantive rather than cosmetic**, and the
reason it was not treated as a matter of taste: the two instruments do not
merely differ in breadth, they **reverse a country's standing**. Verified
live 2026-08-27, both items on the valid base:

| Country | Q21: would not want as neighbours | Q121: impact on the country is bad |
|---|---|---|
| Germany | **3.9%** — most accepting of the nine | **31.2%** — most negative of the nine |
| Netherlands | 20.9% | 28.6% |
| New Zealand | 4.7% | 7.8% |

A measure that inverts Germany's position against a neighbouring item in
WVS's own questionnaire is not a narrower reading of the Gallup construct.
Keeping the Gallup name would have asserted an equivalence this project
has direct evidence against — a claim about Australia's peers the
underlying item does not support.

Per CLAUDE.md's standing rule, this landed in one commit across all three
paired files: gauges.config.json,
content/why-this-matters/cohesion-majority-acceptance.md, and the recorded
baseline in content/why-this-matters-verification.ts.

### Q121-Q130 migration battery: checked and rejected (2026-08-27)

Recorded as a **rejected option with its reason**, so a future session
finding the battery does not read this gauge's silence as an oversight.

**Not a coverage failure.** Q121 was pulled live for all nine peers and
returns a full five-point table everywhere — the battery is as
peer-complete as Q21.

**Rejected on construct.** Its items are: fills useful jobs, strengthens
cultural diversity, increases the crime rate, gives asylum to political
refugees, increases the risks of terrorism, helps poor people establish
new lives, increases unemployment, leads to social conflict, plus a
policy-preference item at Q130. That is perceived *consequences* of
immigration and a policy stance — a third construct, not a richer version
of personal acceptance.

**And rejected on self-assembly.** Averaging ten items into an index WVS
does not publish would mean choosing weights, choosing how to fold the
reverse-coded items, and choosing what to do with the policy item: three
methodology decisions made inside a gauge, to produce a number no provider
stands behind. One clean provider-published item is more defensible than a
composite this site assembles.

### Two defects the first live latest-wave gauge exposed (2026-08-27)

scoringBasis: "latest-wave-per-country" was built on 2026-08-11 and had no
live user until this gauge. Both defects below were latent that entire
time and invisible by construction — nothing exercised the branch.

**1. computeCompositeForAllCountries ignored scoringBasis entirely.** It
called latestSharedYear + computeLevelScore unconditionally, while
computeGaugeScore branched correctly. The moment a real gauge used the
basis, the two disagreed about the same gauge on the same page: the gauge
detail page showed Australia at 80.9 on the latest-wave basis while the
composite was fed **72.4** — Australia scored against only the three peers
that happen to share its own 2018 fieldwork year. This function drives the
displayed composite, Australia's rank, the peer median and the proximity
groups, so all four were wrong. Caught by building the change and reading
the rendered HTML: the homepage came out at 68.4 against a hand-computed
69.5, and that 1.1-point gap was the defect, not a rounding difference.
Fixed by branching exactly as computeGaugeScore does.

**2. computeHistoricalComposite had no notion that such a gauge has no
history.** It builds a same-year time series; a latest-wave gauge has, by
definition, no shared year. Including one puts a score in the series that
is not the gauge's real score, and makes the gauge count as "eligible"
from its first year onward — inflating the coverage-cliff fraction for
every later year against a gauge that can never fill it. Latest-wave
gauges are now excluded structurally.

**The visible consequence of fix 2, disclosed rather than hidden**: the
trajectory chart, and the median-annual-move the proximity disclosure is
derived from, cover the same-year gauges only. They can therefore differ
from the headline composite, which includes every scored gauge. That
divergence is real and is the honest reading — a gauge with one wave per
country genuinely has no history to plot.

**Standing lesson, recorded because it will recur**: a mechanism built
ahead of its first user is written, not tested. This project already
tracks "unexercised branches" as a distinct category in HANDOVER.md §3;
these two defects are the argument for reading that list as *suspected
defects* rather than merely untriggered code.

### Movement tally: a fourth term (2026-08-27)

With eight scored Quality of Life gauges and one of them on
insufficient-history, the homepage tally read "3 IMPROVING · 2 FLAT · 2
DETERIORATING" — seven gauges, with nothing on the page to say where the
eighth went. No code broke and no guard caught it: the three counts are
independent filters that were never asserted to be exhaustive.
CompositeResult.noTrend is the fourth term, and the four now always sum to
includedGaugeIds.length. Consistent with this site's existing treatment of
insufficient-history as a first-class state rather than an absence.

### Non-peer-complete context: Scanlon and Eurobarometer

Two excellent sources don't cover all 9 peers and therefore can't score,
but are planned as labelled, non-scored `contextSeries` blocks on the
`cohesion-majority-acceptance` gauge page — same pattern as the WID
wealth-share box already built for Inequality:

- **Scanlon Foundation's Mapping Social Cohesion report** — Australia
  only, annual since 2007, most recent edition 2025 (confirmed live:
  belonging, acceptance, attitudes to immigration and specific groups).
- **Eurobarometer** — EU-only; among our 9 peers, only the Netherlands and
  Germany are current members (the UK dropped out post-Brexit).

`GaugeData.contextSeries` was changed from a single optional block to an
array (`ContextSeries[]`) specifically to carry both at once —
`app/gauges/[slug]/page.tsx` now maps over it. Verified this doesn't touch
any live data: `contextSeries` had never actually been populated in any
committed data file (WID's own context block for Inequality is still
pending its own data entry too), so the type change is safe. **Blocked on
sequencing, not decided against**: the gauge's own base Gallup MAI data
has to be entered by hand first before a context block has anything
meaningful to attach to — both are deferred to the manual-entry phase
together.

### OECD Better Life Index overlap

Answered honestly rather than glossed over, per the site owner's explicit
instruction: several Quality of Life gauges — life satisfaction
especially — substantially rebuild ground the OECD's own Better Life
Index already covers, so the underlying data isn't new. What's additive:
the **verdict layer** (a plain-English band, not a raw indicator grid),
the **peer-relative trajectory scoring** (BLI has no direction/trend
concept at all), and the **pairing against Power** — whether Australia is
rising and whether it's still good to live here are two different
questions, and the tension between their answers is the actual product,
not a novel dataset. The site's framing (this document, the Methodology
page, and the gauge page itself) says this explicitly rather than implying
original data collection.

### Evidence-strength display

Hard statistics and survey/attitude data don't look identical on this
site, per the site owner's explicit requirement that the distinction be
visible, not just documented. Design: a quiet, **typographic** "Survey-
based" text tag (`components/EvidenceTag.tsx`) next to a gauge's name
wherever it's shown (gauge cards, the gauge detail page header, `/status`)
— deliberately **not** another amber badge, since amber already means
"data caveat" via the Sample Data badge and `MaturityTag`, and survey
evidence isn't a caveat, just a different kind of evidence. Hard
statistics are the unmarked default, the same "quiet by default" pattern
already used for the Established maturity tier. Driven by
`GaugeConfig.evidenceStrength` in `gauges.config.json` (`"survey"` or
omitted for the hard-statistic default) — currently applies to Life
satisfaction and Cohesion — majority acceptance.

### Step 2 checkpoint: what actually landed (2026-08)

Per the site owner's explicit scoping ("build the two-dimension data model
and the side-by-side homepage first, then stop at the checkpoint before
the long tail of fetchers"), this build landed:

- The full two-dimension data model above (`DimensionId`, `weights`,
  `scoringBasis`, `evidenceStrength`, `reuseNote`, `staleDisclosure` in
  `lib/types.ts`; dimension-aware `computeComposite` /
  `computeCompositeForAllCountries` / `computeHistoricalComposite` in
  `lib/scoring.ts`; the "insufficient-history" direction state; the
  latest-wave-per-country scoring path).
- The homepage: two `DimensionVerdict` blocks (new component,
  `components/DimensionVerdict.tsx`) with equal prominence, side by side,
  stacking on mobile, each with its own band, score, context line,
  sparkline, dot strip, and What's Moving — verified this degrades
  gracefully with Quality of Life's near-total Awaiting-data state (only
  `housing-pressure` has data at this checkpoint).
- `/status` extended to both dimensions, including a dedicated "Reused
  gauges" section and a per-gauge "Dimension" column.
- The gauge detail page: dimension badges, the reuse-note box, the
  scoring-basis box (shown in both the with-data and Awaiting-data
  states), the evidence tag, `contextSeries` rendering as an array, and a
  genuine correctness fix caught while touching this page — the
  Awaiting-data branch previously told every gauge to "run `npm run
  pipeline`" regardless of `accessType`, which would have been actively
  misleading for a manual-lane gauge; now branches on `accessType` and
  points manual gauges at `data/manual/README.md` instead.
- This Methodology page section and the corresponding live `/methodology`
  page section.
- `gauges.config.json` entries for all 8 launch gauges — 3 (life
  expectancy, personal safety, air quality) verified live against the
  World Bank API today; 1 (cohesion-minority-experience) verified live
  against its OWID republication today; 1 (work-life-balance) deliberately
  left with `seriesId: "TBD"` rather than a guessed SDMX dataflow key,
  per this project's standing rule never to enter an unverified series ID.

**Deliberately not built yet** (the "long tail" phase, per the checkpoint):
any of the 7 new fetchers, `data/manual/` templates and instructions for
the manual-lane gauges, and the Scanlon/Eurobarometer context data entry.
The manual download list is the next deliverable, handed over separately
once that phase starts.

### Long tail: the truncation guard (2026-08-09)

Four of the seven remaining fetchers (life expectancy, personal safety,
air quality, cohesion-minority-experience) automated cleanly — three via
the proven generic World Bank route, one via the OWID V-Dem route
generalised from `internal-cohesion`'s. `work-life-balance` needed real
live debugging (below). During that work, a real incident forced a new
pipeline-wide safety mechanism: a local, transient OECD fetch for
`housing-pressure` returned a single garbage data point where 35 years of
real history existed, caught only by inspecting the diff before
committing — not good enough given this gauge now feeds both dimensions.

**Fix**: `assertNotTruncated` in `pipeline/lib/writeGaugeData.mjs`, the
single chokepoint every gauge's fetcher writes through. Compares total
observations (summed across every country) in a new fetch against what's
already on disk; refuses the write and throws if the new total is below
50% of the prior total, whenever the existing file is `LIVE`. Protects
every gauge uniformly, not just `housing-pressure`.

**Confirmed live twice since**, both on real GitHub Actions runs (not
just this project's own sandbox): `housing-pressure` returned exactly 9
total observations against a file with 288 on two consecutive Actions
runs (2026-08-09), identical symptom both times — the guard correctly
refused the write both times, and the site kept serving 2026-08-01's real
data undegraded. Site owner's explicit ruling on the second occurrence:
this has crossed from "transient" to "not transient" — under
investigation as of this entry (see CLAUDE.md's Phase E long-tail entry
for the live status), not yet resolved. **Never re-run this gauge's
fetcher blind hoping the next run clears it** — a recurring 9-vs-288
result is signal, not noise, and this project's rule is to investigate a
recurring signal, not retry past it.

### Work-life balance: OECD dimension pin (2026-08-09)

Automated via `OECD.ELS.SAE,DSD_HW@DF_AVG_ANN_HRS_WKD,1.0`, found via
corroborated web search (multiple independent results, including OECD's
own Data Explorer page title matching this gauge's unit exactly) — not
independently confirmed live from this project's own sandbox, which hit
the same documented Cloudflare block as the original OECD SDMX trio on
this exact dataflow.

**Round 1** (first real Actions run): the generic discovery route
(`REF_AREA` pinned to the 9 peers, every other dimension left as an SDMX
wildcard) surfaced a real, live conflicting-values error — DEU 1991,
1554.071 vs 1478.9. The two matching series' full dimension breakdowns
were identical except one: `WORKER_STATUS=_T` ("Total") vs
`WORKER_STATUS=ICSE93_1` (a specific ICSE-93 employment-status subclass —
"Employees"). `JOB_COVERAGE=_T` appearing unopposed elsewhere in the same
key confirmed `_T` is this dataflow's real Total/aggregate marker, not a
guess — and this gauge is specified as the general "average annual hours
actually worked per worker," not an employees-only subclass, so
`WORKER_STATUS=_T` is the correct pin. Same evidence-based discipline as
`housing-pressure`'s `FREQ=A` resolution: a real conflict, both candidate
values' full dimension breakdowns compared, the pin chosen because it
matches this gauge's own configured definition, not because it was the
first or only option tried.

**Round 2** (per the site owner's explicit "one permitted extra round"
stopping rule): `WORKER_STATUS=_T` pinned in
`pipeline/gauges/work-life-balance.mjs`'s `KNOWN_DIMENSION_VALUES`. Result:
clean save, no further conflict — "OECD, Average annual hours actually
worked per worker — 9 countries, Australia 1995–2019. Saved."

**Open issue, not yet resolved, caught during methodology review rather
than the live debugging itself**: the saved series ends at 2019. A
corroborating secondary source (TheGlobalEconomy.com, citing OECD
directly) shows real values for Australia through 2023 (1,713.11 hours in
2023, versus 1,713.94 in 2022) — meaning OECD almost certainly publishes
more recent data than this fetcher is currently retrieving. The
`WORKER_STATUS=_T` pin itself is well-evidenced and not in question; the
likely culprit is one of the *other* wildcarded dimensions (`MEASURE`,
`UNIT_MEASURE`, `AGGREGATION_OPERATION`, or another) matching a different,
older series definition for 1995–2019 than whatever OECD uses for its
current 2020+ figures — plausibly related to the ILO's real-world
ICSE-93 → ICSE-18 employment-status classification revision, adopted by
many statistical agencies around 2020–2023, which could have introduced a
genuinely different current series without changing the stable `_T`
Total marker itself. Not yet investigated further as of this entry —
this project's own sandbox and this session's use of the WebFetch tool
are both blocked from `sdmx.oecd.org` (the same documented Cloudflare
block), so confirming the actual cause requires another live Actions run
with additional diagnostic logging, not a guess. Flagged here rather than
silently left as a clean-looking "Saved" with an unexplained 2019 ceiling.

**Round 3** (site owner's explicit ruling: granted as a genuine final
round, not a stretch of round 2's allowance — a gauge silently missing
2020–2024 would misrepresent exactly the COVID-era hours-worked shift
this gauge exists to capture, which is reason enough on its own). Design,
since there was no live conflict to pin against yet for the 2020+ era (no
error was being thrown — the query was just silently incomplete, a
different problem shape than rounds 1–2's actual conflicts):
`pipeline/gauges/work-life-balance.mjs` now runs **two queries**, not one:

1. The proven historical query (`WORKER_STATUS=_T` pinned), unchanged —
   still correct for the range it's evidenced against.
2. A second, separate probe for 2020-onward, with `WORKER_STATUS` left
   wildcarded again (everything else unchanged), specifically to let a
   real conflict for the modern era surface on its own terms — this
   project's SDMX parser already unions every matching series it finds
   rather than taking the first one, so if a distinct "modern total"
   series existed under some other dimension value, it would show up here
   without needing to guess which value.

Three explicitly-handled outcomes, decided in code rather than assumed:
real conflict-free 2020+ data → merged into the saved series (filtered to
`>= 2020` before merging, so no risk of colliding with the historical
query's own results); a genuine conflict on the probe → reported as a
warning with the conflict's own diagnostic, historical data still saved,
**no pin attempted from it** (per the site owner's explicit "no fourth
round" ruling — this round reports, it doesn't chase a new pin); zero
data on the probe → reported as real evidence (not just an unlucky query)
that this dataflow has nothing past the historical range under any
dimension combination, since the parser's union behavior means "found
nothing" here is a meaningful negative result, not an inconclusive one.

**Actual result, confirmed live 2026-08-09**: the third outcome — a
*different* conflict, not a merge. The probe hit DEU 2023,
`WORKER_STATUS=_T` vs `ICSE93_1` disagreeing (1299.8 vs 1338.8) even in
the recent window. This is more than "one more dimension to pin": if
`_T` genuinely carries 2023 data, the historical query (already pinned to
`_T` across the *entire* requested range, 1990-2026) should have returned
it directly — it didn't. That means some *other* dimension, still
wildcarded in both queries, distinguishes an "old `_T`" series
(1995-2019) from a "new `_T`" series (2020+), invisible without yet
another live round to isolate it. Per the site owner's explicit "no
fourth round" stopping rule, this is treated as a genuine structural
ambiguity — the same shape of dead end this project hit with Inequality's
OECD attempt (see "Inequality: automation attempted and reverted" in
CLAUDE.md), not a solvable one-more-guess situation.

**Moved to the manual lane 2026-08-09.** `pipeline/gauges/
work-life-balance.mjs` deleted (same treatment as `productivity.mjs`,
`human-capital-depth.mjs`, and `inequality.mjs` before it — see
CLAUDE.md). The real 1995-2019 data already fetched via the now-retired
automated route is the current baseline, entered as this gauge's live
data rather than discarded — only 2020 onward needs manual entry going
forward. See `data/manual/README.md`'s "Work-life balance" section for
the download instructions.

**Peer coverage flagged as a Phase D question, 2026 (REGISTER build).**
This gauge currently has usable data for only 3 of the 8 peers (NZL, USA,
JPN) at its latest shared year (2019) — the site's new R3 peer-coverage
floor (`MIN_PEERS_FOR_SCORING` in `lib/gauge-view.ts`,
`scripts/verify-gauge-invariants.mjs`) requires at least 3, so this gauge
currently passes, but sits exactly on the floor rather than comfortably
above it. `verify-gauge-invariants.mjs` now warns (not fails) on any
gauge at exactly the floor specifically so this doesn't need rediscovering
the next time the build log is read. This is a coverage question, not a
rendering one — the manual lane's real constraint is how many peers have
published comparable OECD hours data for this dataflow at all, not
anything about how the gauge displays. Logged here for the Phase D
checkpoint alongside band-threshold recalibration (§3.1) and the min-max
normalisation finding (§3.3), not acted on now.
