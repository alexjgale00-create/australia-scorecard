# Handover — REGISTER implementation, `design/register-pass`

Written at the end of the build session that took this branch from a design
handoff package to a working, verified implementation (tokens through the
380px responsive pass). The context behind every ruling in this document
lives in the session transcript, which won't survive into the next session —
this file is what has to.

Read this before touching the branch further. Read CLAUDE.md and
METHODOLOGY.md for the surrounding project history; this file is scoped to
what this specific build session learned and left open.

---

## 1. The four content defects found this session

Each is a distinct failure mode. Together they're the reason the
verification record and the `writtenAgainst` guard exist — read this section
if you're ever tempted to think either of those is bureaucratic overhead.

1. **innovation.md cited "the 2024 Strategic Examination of R&D."** The
   review was *commissioned* December 2024; its actual final report
   ("Ambitious Australia") wasn't published until March 2026 — the file
   dated a finding to the wrong milestone. Found by: verifying the citation
   live (WebSearch) before drafting a CAUSE claim from it, rather than
   transcribing the existing why-this-matters text as already-checked.
   Prevents recurrence: nothing structural — dates aren't guarded — but the
   claim is now recorded `verified` with a source and date in
   `content/why-this-matters-verification.ts`, so it won't silently drift
   back to being treated as settled without someone noticing the record.

2. **internal-cohesion.md described `v2x_cspart` (civil society
   participation) for a month after the gauge was switched to `v2cacamps`
   (political polarization) on 2026-07-16.** A deliberate, documented
   methodology fix broke the file that was supposed to explain it, and
   nothing caught it. Found by: the full why-this-matters audit (23 files
   read against real config), triggered by the site owner asking "audit the
   rest of the same batch" after the innovation defect. **Prevents
   recurrence for real**: `lib/content.ts`'s `assertWrittenAgainst`, called
   from every `getWhyThisMatters` invocation, fails the build outright if a
   tracked gauge's seriesId, institution, polarity, unit, scoringBasis, or
   evidenceStrength drifts from what its prose was last reviewed against.
   Verified live by deliberately drifting a field and confirming the build
   failed with a named field, both values, and a two-step fix instruction.

3. **Unfalsifiable superlatives presented as if they were checkable
   content** — "the most widely used cross-country measure," "a byword
   internationally for housing unaffordability," "the single most
   integrative health statistic there is," and others like them, across
   roughly a third of the site's why-this-matters files. Found by: the
   bucket triage exercise, prompted by the site owner's observation that
   most "unchecked" claims weren't awaiting confirmation — they were never
   checkable in the first place. Prevents recurrence: the triage ruling
   (bucket C — cut, no exceptions) applied across all flagged instances, and
   every cut is recorded with its bucket and reason so a removed superlative
   doesn't get quietly re-added by someone who doesn't know it was already
   rejected. **No code enforces this going forward** — new content added
   later isn't automatically checked against this standard. Editorial
   discipline only.

4. **economic-complexity and trade both cited "roughly two-thirds of net
   exports"** for the same underlying fact, after the bucket D cuts
   replaced two separate cut superlatives with the same real number. Same
   failure class already ruled on for the CAUSE apparatus (two gauges
   citing one fact reads as boilerplate). Found by: the site owner's own
   read of the finished rewrites. Fixed by giving each gauge its own real
   fact (trade keeps the export-composition figure; economic-complexity now
   cites its actual ECI ranking). **No structural guard prevents this
   recurring** — there's no duplicate-claim detector across
   `why-this-matters-verification.ts`. If a future editor cites the same
   fact in two files, nothing will catch it automatically.

---

## 2. Outstanding — tracked, not launch blockers

Real, disclosed, open items — none of them a reason this site couldn't be
live. `NOT ESTABLISHED`/`CONTESTED`/`unresolved` are first-class states
precisely so a page can ship honestly without overclaiming; everything
below is that kind of honest-and-incomplete, not half-finished. Consolidated
here on 2026-08-21 (previously spread across this file) specifically so
none of it reads as a launch blocker — see "Merge readiness" below for what
*was* blocking and is now cleared.

**From the homepage rebuild (`design/register-homepage`, merged
2026-08-21) — three tracked follow-ups, none of them blockers:**

- **`app/methodology/page.tsx` is the last reader of `ScoreBand.color`.**
  Found during the homepage pass: `DimensionVerdict` no longer reads it
  (replaced by `<DimensionRuler>`), but Methodology still renders a
  coloured dot per band in its threshold legend — a real R1 violation,
  on a pre-REGISTER page the homepage pass never touched. Per the
  standing rule on that field (`lib/types.ts`), it can't be removed
  until every reader is gone. **Needs its own REGISTER pass** — once
  Methodology is rebuilt (or at minimum de-coloured), grep the repo
  again and remove the field for good, plus its now-obsolete
  `@deprecated` comment.
- **Header and Footer remain on the old, dark-capable token set,
  sitewide.** Deliberate — the same precedent `/table/[plate]` and
  `/section/[n]` already set, and the homepage rebuild followed it
  rather than expanding scope (`.register` scopes to each page's own
  content `<div>`, never to the shared layout chrome in
  `app/layout.tsx`). The real consequence: on every REGISTER page,
  including the homepage now, the header and footer can go dark under
  `prefers-color-scheme: dark` while the content between them stays
  fixed paper/ink — a visible seam a reader in dark mode would actually
  see. Worth resolving eventually; a separate, deliberate pass (give
  `Header`/`Footer` the same paper/ink/zero-radius treatment, or make
  `.register`'s no-dark-mode rule genuinely sitewide), not a drive-by
  fix.
- **"Fact of the release" is hidden, not written.** `content/site.json`'s
  `factOfRelease.headline` is still the literal `[PLACEHOLDER]` string
  from scaffolding — the homepage now hides that section entirely rather
  than ship placeholder copy, per the site owner's explicit instruction
  not to invent it. **Waiting on the site owner** to write the real
  headline + body (a single striking, sourced fact about Australia's
  trajectory); the section reappears automatically the moment that
  field is real.

**The intern's four manual datasets.** `productivity`, `human-capital-depth`,
and `inequality` have no real data yet (the first two: no data file at all;
`inequality` likewise Awaiting Data); `work-life-balance` has real 1995-2019
data but is missing 2019 for 5 of 8 peers (see below). Full instructions,
per-dataset download steps, and templates are in
`docs/intern-data-collection-brief.md` — not re-summarized here so it can't
drift out of sync with that file.

- **work-life-balance's 5-country 2019 gap — declared, not yet closed.**
  `provenance.missingCountries` for CAN, GBR, KOR, NLD, DEU was populated
  2026-08-21 (closing the build-blocking silent-gap guard — see "Merge
  readiness"), each reason stating plainly that OECD does publish 2019 for
  that country but this project's own round-2 automated fetch never
  captured it — a collection gap, not a non-publication. That's a
  disclosure, not a fix: the intern brief still asks for these five real
  2019 figures via the normal manual-lane channel
  (data-explorer.oecd.org). The **2019 investigation** that established
  these are collection gaps (queried `sdmx.oecd.org` directly, cross-checked
  against 4 already-on-file values with zero discrepancies: CAN 1693, GBR
  1537.043, KOR 1966, NLD 1456.549, DEU 1372) is preserved below for
  whoever does that entry, as a cross-check — not a substitute for the
  human-driven download.

  > Queried `sdmx.oecd.org` directly for
  > `OECD.ELS.SAE,DSD_HW@DF_AVG_ANN_HRS_WKD,1.0` at the exact key this
  > project's own retired fetcher already trusted as unambiguous for the
  > 1995-2019 range (`WORKER_STATUS=_T` — the pin that produced round 2's
  > "clean 1995-2019" data; the WORKER_STATUS ambiguity that sent this gauge
  > to the manual lane was specific to 2020+, never to 2019 itself),
  > `startPeriod=2015&endPeriod=2021`. Real, live 2019 observations came
  > back for all five (HTTP 200 from this sandbox — the historical
  > Cloudflare block on this host is intermittent, not reproducing today).
  > Cross-checked against 4 values already on file at other years, at the
  > same key, with zero discrepancies — high confidence this is the same
  > series the site already trusts, not a different or mismatched dataflow.
  > So: none of the five is genuine non-publication; all five are this
  > project's own round-2 fetch simply not capturing them, for a reason not
  > further investigated (a response-size/pagination limit on that
  > historical query is one plausible candidate, not confirmed).

- **cohesion-majority-acceptance's `scoringBasis` is documented but not
  configured.** CLAUDE.md and METHODOLOGY.md both describe this gauge as
  using `scoringBasis: "latest-wave-per-country"` — but
  `grep scoringBasis gauges.config.json` returns zero matches, for any
  gauge, anywhere in the file. No live consequence today: the gauge is
  unscored (`weights: {}`), so `computeGaugeScore`'s `scoringBasis` branch
  is never exercised for it. But the moment it's flipped toward scored (its
  two named upgrade candidates — Ipsos Global Views on Immigration, WVS
  Wave 8 — are exactly the kind of trigger for that), it would silently
  fall through to the default same-year basis instead of the documented
  one. Whether to add the field now (while inert) or leave it until
  promotion is a deliberate methodology call, not a mechanical sync — not
  made here.

- **The not-established framing decision.** 14 of the 20 scored gauges
  currently render `NOT ESTABLISHED` for CAUSE (13 at the plain default,
  plus economic-complexity, whose real draft exists but is permanently held
  — see below). That's 70% of the site's gauges declining to name a cause.
  Nothing on the site currently explains *why* that's the honest majority
  outcome rather than a half-finished feature — whether that needs its own
  framing (a line near the apparatus, a Methods page section, something
  else) is an open question, not a build task.

- **economic-complexity's CAUSE draft stays held — this is now a ruling,
  not a pending question.** §3.2 (approved 2026-08-21) resolves what this
  file previously listed as its open "item 8": *"Provider self-commentary
  does not clear the bar... This is the specific, sole reason
  economic-complexity's CAUSE draft is held rather than shipped."* The
  draft remains written, verified, and commented out in
  `content/register-draft-lines.ts` — correctly held, per the now-approved
  standard, not awaiting a further decision.

- **Two claims recorded `unresolved`**, not `unverified` — real, thorough
  attempts were made and came up short of a primary source, not simply
  unchecked:
  - `work-life-balance`: "OECD's own commentary on this indicator uses the
    same reading [fewer hours is better]." Third-party commentary consistent
    with it; no direct OECD statement found.
  - `debt-burden`: "household debt relative to income and GDP is among the
    highest of any developed economy." Five real attempts across BIS, FRED,
    OECD, and a targeted RBA/Treasury search all fell short of a directly-read
    primary source — see the note on that claim in
    `content/why-this-matters-verification.ts` for exactly where each
    attempt failed, so a future attempt doesn't repeat the same dead ends.

- **Phase D items — evidence gathered, nothing acted on.** All of this is
  already in METHODOLOGY.md at the cited sections; listed here as a pointer
  so the analysis isn't re-run from scratch.
  - **Min-max normalisation is outlier-sensitive — quantified, not just
    suspected.** Read-only test (exclude USA from the min-max bounds only,
    nothing else changes): 6 of 20 scored gauges move a band. Power
    composite: 40.1 → 44.1 (+4.0). Quality of Life composite: 75.9 → 70.6.
    Australia's blended rank is unchanged (4th/9) either way. §3.3 in
    METHODOLOGY.md has the full method and numbers.
  - **Two gauges specifically overstate**, not just move: `life-expectancy`
    and `personal-safety` both show `Leading` only because USA sits at the
    worst end of their scale; both drop to `Strengthening` with USA excluded
    from the bounds. This is why they carry `bandRobustness: "overstates"` —
    a disclosure, not a fix. The other four gauges that move understate and
    were judged survivable, left undisclosed.
  - **The Power composite sits within a point or two of the Holding
    boundary (45)** — 39.6 as of 2026-08-21, having moved further from the
    boundary rather than closer when `productivity` was excluded from the
    composite (see "Merge readiness"). A routine data refresh unrelated to
    Australia's own performance could still flip the headline band. Logged,
    not mitigated.
  - **Band threshold recalibration** — the original Phase D, Item 1 finding
    (11-gauge pass, thresholds never fit the composite's real achievable
    range) is still deferred pending all 16 Power gauges going LIVE.
  - **PISA's 2015 mode change** (paper → computer, rescaled) is a real
    comparability caveat for the AUS-across-cycles trend chart specifically
    — distinct from the cross-country claim education.md actually makes
    (which is verified and unaffected). Logged as Phase D, Item 2.
  - **work-life-balance sits exactly on the 3-peer floor** (NZL, USA, JPN —
    no more, no fewer). Passes the R3 build-level check today; one more
    peer lost and it fails outright. `scripts/verify-gauge-invariants.mjs`
    warns on this every build so it's visible before it becomes a failure.
  - **The peer-set composition question.** DESIGN.md's original mockup
    peer set (IRL/SWE/DNK, no USA) was fictional — the real pipeline peer
    set (USA/DEU/JPN, no IRL/SWE/DNK) governs everything built. Marked
    superseded in DESIGN.md rather than silently corrected, so the
    discrepancy stays on the record. Changing the real peer set is a
    methodology decision with data-pull consequences, explicitly out of
    scope here.
  - **The personal-safety peer-mark density limit.** Two-baseline
    staggering (now score-sorted, see the git log around the Gauge.tsx
    stagger fix) resolves collisions between adjacent peers but not in an
    unusually dense cluster — confirmed via real rendering, one collision
    remains on this specific gauge at 380px. Logged in DESIGN.md as a
    known, accepted limit, not chased further since fixing it would mean
    adding a third baseline and breaking the spec everywhere else to solve
    one edge case.

---

## 3. Unexercised in the code — real branches, no real gauge triggers them yet

Distinguish these from untested-full-stop. Each below was verified against
real data during the build (via a temporary, deleted preview harness) for
its *structural* behaviour — the branch renders correctly — but none is
currently exercised by a real gauge's *content* in production.

- **S1 (fully established — both CAUSE and PRECEDENT) has never been
  triggered.** Five gauges (innovation, economic-output, debt-burden,
  housing-pressure, demographic-momentum) have an established *CAUSE*, but
  **no gauge has an established PRECEDENT** — that drafting was explicitly
  deferred (see below). So even those five render a hybrid state, not
  textbook S1.
- **PRECEDENT is unexercised across every state, entirely.** The site owner
  held this back on purpose: the Korea-rise story recurs across five
  gauges' real trajectory data, and drafting it once before seeing how it
  reads — rather than writing it five times blind — was the explicit
  instruction. `computePeerTrajectory` and the zero-crossing/near-zero guard
  (`resolveTrendFraming`, `lib/gauge-view.ts`) are built and ready for
  whenever that drafting happens, but nothing calls them yet.
- **S2's CHALLENGER label and relabeling logic are real and verified**
  (`demographic-momentum`, `air-quality` both correctly show `leads: true`
  and the CHALLENGER label) — but the CHALLENGER-specific *content* (naming
  the nearest peer, its trajectory, its closing rate) has never been
  written, since that's PRECEDENT content under a different label.
- **S5 (stale) is real, tested code with no live trigger.** No gauge is
  currently overdue on its own cadence — every manual-lane gauge was
  recently entered. The `stale`/`staleReason` branch will render correctly
  whenever one next goes overdue, but hasn't been proven against a real
  stale gauge.

---

## 4. Standing rules — and which ones are actually code-enforced

Marked explicitly, because "documented" and "enforced" are different
guarantees and conflating them is exactly the kind of gap this session
spent a long time closing elsewhere.

**Code-enforced (breaking these fails the build):**
- **R3** (Australia never shown alone) — `Peer[]` is a non-empty tuple type,
  and `assertMinimumPeerCoverage` fails the build if a scored gauge has
  fewer than 3 peers with a usable score. Double-enforced: once inside
  `buildGaugeView`, once fleet-wide in `scripts/verify-gauge-invariants.mjs`
  on every `prebuild`.
- **The `writtenAgainst` baseline** — `assertWrittenAgainst` fails the build
  if a *tracked* gauge's config drifts from its recorded baseline. All 23
  gauges are tracked as of this session (`scripts/verify-gauge-invariants.mjs`
  reports the live count on every build). A brand-new 24th gauge would start
  untracked — unguarded — until someone explicitly audits it.
- **The `resolveAxisOutlier` guard** — fails the build if a configured
  outlier country isn't actually extreme in live data (a stale-config
  detector, verified live by deliberate misconfiguration).

**Documented, but relying on human discipline and code review, not a
build failure:**
- **R1** (no colour encodes performance), **R2** (severity channel order —
  position, then glyph, then weight/rule), **R4** (recency always visible),
  **R5** (`--stamp` reserved for recency/absence only), **R6** (tabular-nums
  everywhere), **R7** (ISO alpha-3 in mono, never flags) — all real, all
  followed throughout this build, none of them has a lint rule or type-level
  check behind it. A future PR could violate any of these and the build
  would stay green.
- **"No new component reads `ScoreBand.color`"** — the field is marked
  `@deprecated` with a JSDoc explanation, nothing more. No eslint rule
  forbids importing it.
- **One gauge, one plate, permanent once assigned.** `GaugeConfig.plates`
  is *typed* as `Partial<Record<DimensionId, string>>`, which still permits
  more than one entry — nothing stops a future edit from reintroducing the
  housing-pressure bug this session fixed by hand. No runtime assertion
  checks `Object.keys(plates).length === 1`. Worth adding if this branch
  continues.
- **Plates are permanent once public** — a process rule (don't reuse a
  retired gauge's number), not something code can enforce at all, since
  Next.js/git have no notion of "this identifier was once live."
- **The economic-complexity/trade duplicate-fact class of collision** (§1,
  defect 4) — no detector exists across the verification record's claims.

---

## Merge readiness

**All four launch blockers — CLEARED. Merged to `main` 2026-08-21.**

1. **Content review — CLEARED, 2026-08-20.** *Every drafted piece of
   content on this branch was explicitly UNREVIEWED* — the plain-language
   lines (20 gauges), the six CAUSE drafts, the two CONTESTED drafts, and
   every rewrite from the bucket B/C/D pass. Assembled into
   `docs/review-queue.md` (23 gauge sections, verified byte-identical
   against every source file before the site owner read it) so it could be
   read in one sitting instead of 25 separate files. **The site owner read
   and approved all of it, no changes requested.** Recorded in three
   places: the `UNREVIEWED` markers in `content/register-draft-lines.ts`
   replaced with "Reviewed and approved by the site owner, 2026-08-20";
   the `[DRAFT — edit freely]` marker removed from all 23
   `content/why-this-matters/*.md` files; `content/why-this-matters-
   verification.ts` gained a new `copyApprovedAt: "2026-08-20"` field on
   all 23 records (additive only — zero `ClaimStatus` values touched,
   since approving the wording is a different question from whether
   individual claims are source-verified, and this pass answered only the
   first one). `docs/review-queue.md` itself was scaffolding for the one
   reading session and has been deleted.

2. **Methods §3.2 — CLEARED, 2026-08-21.** Didn't exist; was cited live on
   every gauge page regardless. Drafted, then read and approved by the
   site owner with no changes requested. The `DRAFT — UNREVIEWED` marker
   is replaced with "Reviewed and approved by the site owner, 2026-08-21"
   directly in METHODOLOGY.md. The ruling itself (exposure over neutrality;
   six constraints; three states; CAUSE/PRECEDENT held to different bars;
   provider self-commentary never clears constraint 1) is real and now
   live — see §3.2 for the full text, and §2 above for its concrete
   consequence on economic-complexity's held-out draft. (§3.3 is a
   separate, still-unreviewed draft — not touched by this approval.)

3. **UI cutover — CLEARED, 2026-08-21.** `/gauges/[slug]` and
   `/table/[plate]` previously coexisted with no decision on which one the
   site's real navigation should point to. Per R8 ("one gauge, one plate,
   one citable address"), `/table/[plate]` is now the only route that
   generates real content; `/gauges/[slug]` redirects to it
   (`next/navigation`'s `redirect()` — this Next.js version's own
   documented mechanism for a route redirect under `output: export`,
   confirmed working in the actual static build output). One live address
   per gauge, not two.

4. **`productivity`'s SAMPLE_DATA in the composite — CLEARED, 2026-08-21.**
   Was silently baked into the live Power composite as though real,
   independent of anything the intern's manual data would change.
   `computeCompositeForAllCountries` (`lib/scoring.ts`) now excludes any
   gauge whose `provenance.status` is `SAMPLE_DATA`, the same treatment a
   missing data file already got there. The gauge's own page is
   unaffected — still renders, still shows its sample-data badge — it only
   stopped contributing a synthetic number to the headline. **Australia's
   Power composite: 40.1 (Slipping) → 39.6 (Slipping)** — band unchanged,
   number now fully real. (The earlier proposal to instead fail the build
   on `SAMPLE_DATA` — see prior draft of this file — was superseded by
   this exclude-from-composite approach, the same day, once decided.)

**A fifth, build-blocking item cleared the same day, alongside #4** (not
one of the four numbered blockers above, but merge to `main` couldn't
happen without it either): the manual-lane silent-gap guard added
2026-08-20 (`scripts/verify-gauge-invariants.mjs` — any `accessType:
"manual"`, scored, same-year gauge with a peer absent at
`latestSharedYear` and no matching `provenance.missingCountries` entry
fails the build) was, when run for real, immediately failing on
`work-life-balance`'s 5-country 2019 gap (CAN, GBR, KOR, NLD, DEU). That
gap was real and silent before the guard existed; the guard just made it
loud. **Closed 2026-08-21**: `missingCountries` populated for all five,
worded as a collection gap per the 2019 investigation (see §2 above) —
not "not published," since OECD does publish 2019 for all five and this
project's own fetch simply never captured it. Rank and median now compute
over the four reporting peers (NZL, USA, JPN + AUS), disclosed via the
existing S4 mechanism. The intern brief still asks for these five real
figures via the normal manual-lane channel — this closed the build
blocker, not the data gap itself (tracked in §2).

**Safe to merge as infrastructure** (independent of the above): the
token/font system, `<Gauge>` and all seven state branches (structurally
verified even where content is unexercised — see §3), `/table/[plate]`,
`/section/[n]`, the 380px responsive treatment for both, the R3 guard, the
`writtenAgainst` guard, the peer-coverage floor, `provenance.sourcePulledAt`
(additive field, `lib/types.ts`/`lib/maturity.ts`, lets manual-gauge
staleness count from the real source-pull date instead of ingestion time,
falls back to `retrievedAt` for every existing gauge), and the manual-lane
silent-gap guard itself (verified live: tested by deliberately stripping a
real country/year from `productivity.json`, confirming it named the exact
gauge and country and failed the build, then restored via `git checkout`).
All of it is real, build-verified, and in several cases proven via actual
browser rendering rather than assumed from the classes.

**Everything not listed above as a blocker** — the intern's four manual
datasets, the two `unresolved` claims, the not-established framing
question, the Phase D list, and the cohesion-majority-acceptance
`scoringBasis` gap — is real, disclosed, and the honest state a launched
site can stand behind (the whole point of `NOT ESTABLISHED`/`CONTESTED`/
`unresolved` as first-class states is that they're shippable precisely
because they don't overclaim). See §2, "Outstanding — tracked, not launch
blockers," for the complete list. None of it blocked this merge.
