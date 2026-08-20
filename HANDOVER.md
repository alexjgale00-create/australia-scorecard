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

## 2. Unresolved and waiting on the site owner

- **Methods §3.2 (the evidence standard for a causal attribution) is not
  written.** It's cited live, right now, by every `NOT ESTABLISHED` and
  `CONTESTED` render on the site. The list of what it needs to cover
  (assembled across two rounds, not drafted):
  1. The actual bar separating an established CAUSE/PRECEDENT from a
     not-established one.
  2. Whether CAUSE and PRECEDENT are held to the same bar.
  3. Whether hedged/contributing-factor language ("contributed to") counts
     as established, or only unhedged causal language qualifies.
  4. How S2's CHALLENGER "cause-of-the-lead" is evaluated — same bar as
     ordinary CAUSE, or different.
  5. Why SCALE never needs this bar (it's arithmetic, not causal) — worth
     its own explicit sentence.
  6. Whether the bar differs for survey/attitude-evidence gauges vs.
     hard-statistic gauges.
  7. Whether an established attribution can later be downgraded, and if so
     whether that's disclosed the same way a data revision (`REV` tag) is.
  8. **(Added by the site owner)** Whether an established CAUSE must be
     falsifiable from a public source a reader can independently check, or
     whether reasoning *from* a source counts. This is the one that decides
     whether economic-complexity's held-out draft (below) can ever ship.

- **The not-established framing decision.** 14 of the 20 scored gauges
  currently render `NOT ESTABLISHED` for CAUSE (13 at the plain default,
  plus economic-complexity, whose real draft exists but is held out). That
  is 70% of the site's gauges declining to name a cause. Nothing on the site
  currently explains *why* that's the honest majority outcome rather than a
  half-finished feature — whether that needs its own framing (a line near
  the apparatus, a Methods page section, something else) is an open
  question, not a build task.

- **economic-complexity's CAUSE draft** is written, verified (Harvard Growth
  Lab's own commentary on why Australia's ECI ranks where it does), and
  commented out in `content/register-draft-lines.ts` — held because it's
  the data provider's own gloss on its own index, not independent
  corroboration. Restoring it is a direct function of how §3.2 item 8
  above gets ruled.

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

---

## 3. Phase D items — evidence gathered, nothing acted on

All of this is already in METHODOLOGY.md at the cited sections; this is a
pointer so the analysis isn't re-run from scratch.

- **Min-max normalisation is outlier-sensitive — quantified, not just
  suspected.** Read-only test (exclude USA from the min-max bounds only,
  nothing else changes): 6 of 20 scored gauges move a band. Power composite:
  40.1 → 44.1 (+4.0). Quality of Life composite: 75.9 → 70.6. Australia's
  blended rank is unchanged (4th/9) either way. §3.3 in METHODOLOGY.md has
  the full method and numbers.
- **Two gauges specifically overstate**, not just move: `life-expectancy`
  and `personal-safety` both show `Leading` only because USA sits at the
  worst end of their scale; both drop to `Strengthening` with USA excluded
  from the bounds. This is why they carry `bandRobustness: "overstates"` —
  a disclosure, not a fix. The other four gauges that move understate and
  were judged survivable, left undisclosed.
- **The Power composite sits 0.9 points from the Holding boundary (45).**
  A routine data refresh unrelated to Australia's own performance could
  flip the headline band. Logged, not mitigated.
- **Band threshold recalibration** — the original Phase D, Item 1 finding
  (11-gauge pass, thresholds never fit the composite's real achievable
  range) is still deferred pending all 16 Power gauges going LIVE.
- **PISA's 2015 mode change** (paper → computer, rescaled) is a real
  comparability caveat for the AUS-across-cycles trend chart specifically —
  distinct from the cross-country claim education.md actually makes (which
  is verified and unaffected). Logged as Phase D, Item 2.
- **work-life-balance sits exactly on the 3-peer floor** (NZL, USA, JPN —
  no more, no fewer). Passes the R3 build-level check today; one more peer
  lost and it fails outright. `scripts/verify-gauge-invariants.mjs` warns on
  this every build so it's visible before it becomes a failure.
- **The peer-set composition question.** DESIGN.md's original mockup peer
  set (IRL/SWE/DNK, no USA) was fictional — the real pipeline peer set
  (USA/DEU/JPN, no IRL/SWE/DNK) governs everything built. Marked superseded
  in DESIGN.md rather than silently corrected, so the discrepancy stays on
  the record. Changing the real peer set is a methodology decision with
  data-pull consequences, explicitly out of this pass's scope.
- **The personal-safety peer-mark density limit.** Two-baseline staggering
  (now score-sorted, see §4 in the git log around the Gauge.tsx stagger fix)
  resolves collisions between adjacent peers but not in an unusually dense
  cluster — confirmed via real rendering, one collision remains on this
  specific gauge at 380px. Logged in DESIGN.md as a known, accepted limit,
  not chased further since fixing it would mean adding a third baseline and
  breaking the spec everywhere else to solve one edge case.

---

## 4. Unexercised in the code — real branches, no real gauge triggers them yet

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

## 5. Standing rules — and which ones are actually code-enforced

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

**Safe to merge as infrastructure:** the token/font system, `<Gauge>` and
all seven state branches (structurally verified even where content is
unexercised — see §4), `/table/[plate]`, `/section/[n]`, the 380px
responsive treatment for both, the R3 guard, the `writtenAgainst` guard, the
peer-coverage floor, `provenance.sourcePulledAt` (additive field,
`lib/types.ts`/`lib/maturity.ts`, lets manual-gauge staleness count from the
real source-pull date instead of ingestion time, falls back to `retrievedAt`
for every existing gauge), and — added 2026-08-20 during the intern-data-
collection pre-flight — the manual-lane silent-gap guard (`scripts/verify-
gauge-invariants.mjs`: any `accessType: "manual"`, scored, same-year gauge
with a peer absent at `latestSharedYear` and no matching
`provenance.missingCountries` entry fails the build, naming the gauge and
country). Verified live: tested by deliberately stripping a real
country/year from `productivity.json`, confirming it named the exact gauge
and country and failed the build, then restored via `git checkout`. All of
it is real, build-verified, and in several cases proven via actual browser
rendering rather than assumed from the classes. I'd stand behind this code
today.

**One immediate consequence of the new silent-gap guard**: run for real
against the data already on disk, it currently fails — `work-life-balance`
has 5 of 8 peers (CAN, GBR, KOR, NLD, DEU) with no data at its
`latestSharedYear` (2019) and no `missingCountries` entry declaring it. That
gap was real and silent before this guard existed; the guard just makes it
loud. `npm run build` will not pass until either `work-life-balance`'s
`missingCountries` is populated with the real reason each country lacks 2019
data, or real data closes the gaps (which is exactly what the work-life-
balance section of the intern brief now asks for). **Do not populate those
five reasons yet, and do not assume all five have the same explanation** —
some may be genuine "OECD doesn't publish this country-year" disclosures
and some may be plain collection gaps where the figure exists and this
project's own fetch attempts simply never captured it; those need opposite
responses (a disclosure vs. going and getting the real number). See the
per-country 2019 investigation for what's actually known as of this
session.

**What I would not ship to main today, directly:**

1. **Every drafted piece of content on this branch is explicitly
   UNREVIEWED** — the plain-language lines (20 gauges), the six CAUSE
   drafts, the two CONTESTED drafts, and every rewrite from the bucket
   B/C/D pass. The standing rule from the start of this work was that
   nothing merges to main unreviewed. None of it has been read and cleared
   by the site owner yet.
2. **Methods §3.2 doesn't exist, and it's cited live on every gauge page
   right now.** A public reader clicking through from `NOT ESTABLISHED` or
   `CONTESTED` today would land on a section that isn't written. §3.1 and
   §3.3 are real; §3.2 is the one dangling citation left on the site, and
   it's the one doing the most editorial work.
3. **Old and new UI currently coexist with no cutover decision made.**
   `/gauges/[slug]` (pre-REGISTER) and `/table/[plate]` (REGISTER) both
   generate and both work; nothing has decided which one the site's actual
   navigation should point to, or when the old components get retired. That
   was deliberate (staged rollout, cheap revert) during the build — but
   "merge to main" implies production, and production needs one answer to
   "which page does a reader actually land on," not two live in parallel.
4. **`productivity` is still `SAMPLE_DATA` (Phase A placeholder, not real)
   and is silently baked into the live Power composite as though it were
   real.** Found during the intern-data-collection pre-flight (2026-08-20):
   `computeCompositeForAllCountries` and every caller of it include any
   gauge with a data file regardless of `provenance.status` — there is no
   status check anywhere in that path. So today's headline Power number
   (40.1, Slipping) is partly synthetic right now, independent of anything
   the intern's four manual datasets will change. This is a launch blocker
   in its own right, arguably more urgent than the intern work, since it
   means the site's actual published headline number is already not fully
   real. Not fixed here — flagged for Phase D. The fix is presumably either
   excluding `SAMPLE_DATA`-status gauges from the composite the same way a
   missing file already is (an `AwaitingDataCard`, not a scored contribution),
   or landing real productivity data before this composite is ever shown
   publicly — a decision for the site owner, not made unilaterally here.

Everything else — the Phase D items, the two `unresolved` claims, the
not-established framing question — is real, disclosed, and in most cases
already the honest state a launched site could stand behind (the whole
point of `NOT ESTABLISHED`/`CONTESTED`/`unresolved` as first-class states is
that they're shippable precisely because they don't overclaim). It's #1–4
above that are the actual blockers.
