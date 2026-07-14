@AGENTS.md

# The Australia Scorecard

See `README.md` (how to run this) and `METHODOLOGY.md` (full scoring
write-up) for detail. This file records durable project decisions that
should survive across sessions.

## Scoring

- **Direction is peer-relative, everywhere on the site** (gauge cards, dot
  strips, What's Moving, the composite's improving/flat/deteriorating
  counts). It classifies the trend in Australia's *level score* (position
  within the 9-country peer set: `directionThresholdScorePointsPerYear` in
  `gauges.config.json`, currently 0.5 pts/year) — **not** the trend in the
  raw published number.
- Australia's raw-value trend (is the number itself going up or down:
  `directionThresholdPctPerYear`, currently 0.3%/year) is still computed,
  but is only ever shown in the "Two ways to read this" block on each gauge
  detail page — never used for the primary direction arrows. The two can
  genuinely disagree (a raw number can rise while the country still loses
  ground to faster-improving peers), and showing only one risked implying
  they always move together.
- Decided 2026, design-overhaul phase, after the raw-value-only direction
  arrow on a gauge card read as contradictory next to a declining
  peer-relative sparkline on the same card.
- Score bands (Falling Behind/Slipping/Holding/Strengthening/Leading,
  thresholds 24/44/59/79 in `gauges.config.json`) are explicitly placeholder
  — flagged with `_scoreBandsTodo` in the config — and must be recalibrated
  against real data at the Phase D checkpoint, before any public release.
- **A gauge excluded from the composite for missing data must never be
  silent.** `computeComposite` (lib/scoring.ts) reports which gauge IDs fed
  the weighted average (`includedGaugeIds`) and which were dropped for a
  null level score (`excludedGaugeIds`). Any page that renders the composite
  must build a disclosure string via `buildCompositeDisclosure` and pass it
  to `assertCompositeDisclosure` immediately after — that function **throws**
  if any excluded gauge isn't actually named in the text that will render,
  which fails `next build` (it runs inside a Server Component). A composite
  that silently drops a gauge is a worse failure than a page that won't
  build. Verified live: temporarily wiping a gauge's data and forcing a
  mismatched disclosure string both correctly failed the build before this
  was trusted.
  - Decided 2026-07-14, after `latestSharedYear` picked a year where
    Australia had no data (a peer reported a more recent year than
    Australia did), producing a null level score for that gauge that was
    silently excluded from the composite average with zero on-page
    indication — the headline verdict number was quietly wrong. Fixed the
    proximate cause (`latestSharedYear` now anchors to Australia's own
    latest year) *and* the bug class (this disclosure/assertion mechanism),
    since the proximate fix alone doesn't prevent a different future cause
    of the same silent-exclusion failure mode.
  - The pipeline's own per-source report already discloses data gaps at
    the *fetch* layer (a ⚠ warning line naming which countries are missing
    for a gauge) — the assertion above is the matching disclosure at the
    *composite-calculation* layer, since the pipeline itself has no
    visibility into cross-gauge composite math.

## Pipeline environment quirks (source access is NOT the same from every network)

Two sources in this pipeline behave in *opposite* ways depending on where
`npm run pipeline` runs from — this is real and confirmed, not a guess:

- **OECD (`sdmx.oecd.org`)**: blocked from this project's own sandbox with
  a Cloudflare bot-protection challenge page (HTTP 403). NOT blocked from a
  GitHub Actions runner — Actions got real API responses (404s and 500s),
  meaning OECD's block is IP/network-reputation-based, not a blanket ban.
  The 404/500s themselves are separate, ordinary bugs to fix (wrong
  dataflow key, or a genuinely transient server error) — see the gauge
  files in `pipeline/gauges/{productivity,housing-pressure,human-capital-depth}.mjs`.
- **IMF (DataMapper API)**: the reverse. Works fine from a local machine.
  Returns HTTP 403 specifically when run from GitHub Actions — likely a WAF
  rule against known cloud/datacenter IP ranges. Retrying doesn't help
  (confirmed not transient); this is a standing environment limitation.

**Practical consequence:** `economic-output` (the IMF gauge) can currently
only be refreshed by running `npm run pipeline` **locally** — the automated
monthly GitHub Actions job will always fail that one gauge specifically, no
matter how healthy the rest of the pipeline is. It will keep showing
(honestly, with its real retrieval date) whatever data was last fetched
locally, which will age between manual local runs. This is disclosed in the
pipeline report (environment + retained-data-age context on every failure,
not just "failed") rather than presented as a bug each time Actions runs.
If this needs a permanent fix rather than a standing limitation, the options
are: a proxy/self-hosted runner with a non-flagged IP, or moving
`economic-output` to a manual-download lane like the OECD gauges may need.

## OECD SDMX trio — debugging history and 2026-07-14 checkpoint decision

Three gauges (`productivity`, `housing-pressure`, `human-capital-depth`)
went through several rounds of live debugging against `sdmx.oecd.org`
from a GitHub Actions runner (this project's own sandbox is Cloudflare-
blocked from reaching that host at all, confirmed via two independent
network paths — so every round depended on the user triggering Actions
and pasting back the log). Each round fixed a real, confirmed bug:

- HTTP 406 on the structure endpoint → wrong `Accept` header for that
  endpoint (data vs. structure endpoints negotiate content type
  independently).
- HTTP 500 on a bare "all" key → OECD's server doesn't handle it for these
  dataflows; switched to discovering real dimensions and building a
  correctly-shaped key with `REF_AREA` pinned, everything else explicit
  SDMX wildcard.
- `productivity` zero-dimensions error → `DF_PDB_LV` is archived
  (`isExternalReference="true"` + `structureURL` pointing at
  `/archive/rest/...`); fixed by following that redirect.
- `productivity` "no dimensions found" *again* after the redirect fix
  landed → the redirect follow forwarded the bare URL without
  `references=all`, so the archive endpoint returned a stub with no
  embedded DSD; fixed by appending the param to the redirected URL too.
- `housing-pressure` false "conflicting values" for DEU 1990 → the
  parser's own duplicate-value safety net was truncating quarterly
  observations to year-only, colliding Q1 vs Q4 of the *same* series;
  fixed to only take annual or year-end (Q4/December) observations.
- `housing-pressure` **genuine** conflicting values for DEU 2015 (a second,
  different bug) → `MEASURE` was left as an SDMX wildcard, so both
  `HPI` (nominal index) and `HPI_YDH` (price-to-income ratio) matched;
  `gauges.config.json` is explicit this gauge wants price-to-income, so
  `MEASURE=HPI_YDH` is now pinned. **Unresolved as of 2026-07-14**: the
  same run then surfaced a *third* ambiguity underneath that one — FREQ=Q
  vs FREQ=A both matching for the same country/year — not yet fixed.
- `human-capital-depth` 404s across three different dimension-value
  guesses (fully pinned → collection-process dims blanked → `MEASURE`
  also blanked), the last two with an `availableconstraint` diagnostic
  that came back empty (`TIME_PERIOD=[]`, no per-dimension detail) —
  never pointed at an actionable next guess.

**Decision at the 2026-07-14 checkpoint**, per standing rule (stop after
any round where a "high confidence" fix doesn't result in a green gauge —
don't keep pushing attempts past that):

- `human-capital-depth` **moved to the manual lane** — three distinct,
  reasoned attempts against the same dataflow with no traction and no
  actionable diagnostic is past the point where guessing is worth another
  round-trip. See `data/manual/human-capital-depth-INSTRUCTIONS.md` and
  `gauges.config.json`'s `dataPolicy` for this gauge. Removed from
  `pipeline/index.mjs`'s `GAUGE_IDS`; `pipeline/gauges/human-capital-depth.mjs`
  (the retired API fetcher) was deleted rather than left as dead code.
- `productivity` and `housing-pressure` were **paused** (not abandoned)
  at this point for a fresh-eyes review, since bundling them as one "OECD
  trio" was itself starting to look like the wrong frame — each had a
  different debugging trajectory and deserved a separate verdict.

### Fresh-eyes review (same day) — the split verdict

Re-reading the full error progression for just these two gauges surfaced
a real difference the "OECD trio" framing had been hiding:

- **`housing-pressure`'s history is convergent, not stuck.** Four
  real, distinct bugs found and fixed in a row, none of them recurring:
  wrong Accept header → bare-key server crash → wrong Accept-Language →
  a false "conflicting values" error (my own bug, truncating quarterly
  data) → a **genuine** conflicting-values error (`MEASURE=HPI` vs.
  `HPI_YDH`, resolved by pinning to `HPI_YDH` per this gauge's configured
  "price-to-income ratio" definition) → the next genuine ambiguity,
  `FREQ=Q` vs `FREQ=A`. Checked live against OECD's own documentation:
  this dataflow publishes Annual and Quarterly as **separately,
  independently maintained series**, not one derived from the other — so
  `FREQ=A` is a verified value, not a guess. This is the fourth correctly
  diagnosed fix in a row on a live, non-archived, normally-behaving
  dataflow — worth exactly one more cycle. If it doesn't land, this gauge
  moves to the manual lane too, with no further debugging, per the same
  rule.
- **`productivity`'s history is not convergent — it's the same wall,
  three times.** Re-examined the raw structure XML captured in an earlier
  round: `DF_PDB_LV` carries the annotation
  `<AnnotationType>NonProductionDataflow</AnnotationType>` with value
  `true` — **OECD's own metadata, on OECD's own dataflow, stating it
  isn't meant for automated production queries.** Combined with the
  confirmed `isExternalReference`/archive redirect and the fact that even
  after correctly reaching the archive endpoint's data query, it throws a
  generic, unhandled ASP.NET null-reference exception (not a "your key is
  wrong" error) — this reads as unmaintained legacy infrastructure, not a
  solvable query-shape problem. Three attempts, three different specific
  errors, same underlying wall. **Moved to the manual lane** — same
  treatment as `human-capital-depth`: `accessType: "manual"`,
  `pipeline/gauges/productivity.mjs` deleted, removed from
  `pipeline/index.mjs`'s `GAUGE_IDS`, template + instructions in
  `data/manual/`. **Do not re-attempt the SDMX API route for this gauge
  without new evidence that OECD has un-flagged or replaced this
  dataflow** — the `NonProductionDataflow` finding is the reason, not a
  guess, and re-litigating it from scratch wastes a cycle.
- Also checked directly, since it was one of the candidate wrong
  assumptions: **environment (Actions vs. local) is not masking a
  different root cause for either gauge.** Ran the pipeline from this
  project's own sandbox the same day (previously Cloudflare-blocked, no
  longer reproducing that block) and got the identical `productivity` 500
  and the identical `housing-pressure` FREQ conflict as the Actions run.
  Same bugs, two independent networks — these are genuine, stable,
  source-side issues, not an environment artifact.
- **Option considered and explicitly rejected for now**: OECD's bulk CSV
  export shape (`format=csvfilewithlabels`, `key=all`,
  `dimensionAtObservation=AllDimensions` — confirmed as a real, documented
  OECD query pattern via live lookup) instead of the per-series SDMX-JSON
  shape this pipeline uses. Kept in reserve, not built: it wouldn't fix
  `productivity`'s actual problem (a broken *server*, not a wrong
  *format*), and for `housing-pressure` the well-evidenced `FREQ=A` fix is
  lower-cost and higher-confidence than switching formats. Revisit only if
  `housing-pressure`'s `FREQ=A` fix also fails.
