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
