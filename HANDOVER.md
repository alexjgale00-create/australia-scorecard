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

## 0. Process note (2026-08-26): a verified fix sat unpushed while production stayed wrong

Not a defect — recorded per the site owner's explicit instruction to treat
it as a process observation, not a correctness fault, and to name the risk
plainly rather than let it pass unremarked.

Entry 9 below's fix (`work-life-balance`/`productivity`/`economic-complexity`)
was written, verified against live-recomputed data, and confirmed passing
the build guard on 2026-08-26 — but on `fix/register-draft-lines-drift`, a
branch, not `main`. Vercel deploys from `main` only. For the span between
that verification and the branch actually being merged and pushed, the fix
was **complete and correct on disk and genuinely unreachable by any
reader** — the live site kept serving `work-life-balance`'s flattering-not-
damning wrong numbers (1651/1783/2nd of 4) the entire time, exactly as
wrong as before any of this session's work happened. A reader loading the
live page during that window would have seen no trace that the defect had
already been found and fixed.

**Every prior session on this project committed directly to `main`** — no
prior HANDOVER.md or CLAUDE.md entry mentions a feature branch, and the
Merge Readiness section below is written in exactly that register (four
blockers, cleared, "merged to main"). Nobody made a decision to start
using branches instead; it happened mid-session, and what actually
surfaced it was this session being interrupted and resumed cold — the
resuming session had to ask "what's real" and discovered the fix sitting
on an unpushed branch, rather than any check in the normal workflow
noticing on its own. Merged and pushed the same session, once found (see
git log: `e100f70` fast-forwarded onto `main` and pushed 2026-08-26).

**The risk worth naming, independent of this one instance resolving
cleanly**: correct, verified work can sit invisible to production
indefinitely if it lands somewhere other than the branch that deploys,
and nothing in this project's existing machinery — the build guard, the
verification record, any of it — checks *where* a fix landed, only
*whether* it's correct once someone looks. A verified fix and a deployed
fix are different claims, and this session conflated them until an
unrelated interruption forced the distinction to the surface. Whether
that's worth a standing rule (always confirm the working branch is `main`
before treating a fix as "done"; a CI check that flags when
`origin/main`'s HEAD has diverged from a long-lived local branch;
something else) is a real question for whoever reads this next — not
resolved here, per the same discipline HANDOVER.md's entry 7 applied to
naming a gap without pre-deciding its fix.

## 1. Production accuracy defects — the original four, plus later additions

Each is a distinct failure mode. The first four are why the verification
record and the `writtenAgainst` guard exist — read this section if you're
ever tempted to think either of those is bureaucratic overhead. Entries 5
through 10 are later additions from subsequent sessions, kept in this same
record rather than scattered across dated log sections, because they're
the same class of finding: something false or misleading reached a
reader, undetected, until someone happened to look. Entry 7 names a
pattern across 5 and 6 rather than reporting a third incident; entry 8 is
a fourth incident in that same family, with one distinction worth
tracking on its own; entry 9 is a fifth and sixth (two numbers wrong inside
one entry); entry 10 is a narrower case still — not a missed instance of
the pattern, but a fix for one instance that stopped one sentence short of
an adjacent instance in the same paragraph. Entry 11 is the same defect
class in a different kind of file: not prose describing data, but a
provenance record — `collection-log.csv`'s `collected_by` field — stating
who did the work, when that statement wasn't true. Entries 12 and 13 are
a different shape from 5-11 and worth reading as a pair: not false prose,
but wrong *numbers* produced by correct-looking code, from one
cross-cutting concept added without auditing its call sites.

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

5. **`/methodology`'s "Current build status" paragraph stated "16 gauges
   configured, 13 with real LIVE data" and "most Quality of Life gauges
   currently show as Awaiting data"** — both false by the time anyone
   read them, on a page whose own first sentence promises "if a number
   disagrees with this page, the number is wrong." Found by: routine work
   in an unrelated session, not a check built for this purpose — spotted
   while editing the same paragraph for something else. Fixed 2026-08-24
   (`7f92122`) by deriving both counts from `gaugesConfig` + `getGaugeData`
   at build time instead of hardcoding them, so this specific pair of
   numbers can't recur. **Not a general guard** — any other hardcoded
   count elsewhere on the site (README.md's opening paragraph had the
   identical fault, found the same day, fixed by hand since it's static
   markdown, not a rendered page) would need the same fix individually;
   nothing scans the site for hardcoded counts that could drift.

6. **The composite trajectory sparkline rendered its full, unfloored
   series while labelled "TRAILING DECADE" — the label was never backed
   by code.** Two distinct faults in one place, worth recording
   separately:
   - The label itself was always wrong. `AnchoredSparkline.tsx` has never
     had any slicing or truncation logic since it was created (checked
     its complete git history, one creation commit and one edit, neither
     adds a limit) — it has always rendered whatever array it was given,
     start to end, with no "trailing decade" enforced anywhere.
   - What it was given was, separately, wrong: `computeHistoricalComposite`
     never excluded 1980-1989, despite that being this project's own
     documented convention since Phase D's first pass. Power's real 1980
     point is New Zealand at 3.1, built from 2 gauges — below any
     coverage standard this site applies anywhere else, and structurally
     invisible to the coverage-cliff guard added the same week (that
     guard is relative to already-*launched* gauges; see METHODOLOGY.md's
     "Phase D, Item 1" for why a relative check can't see this failure
     mode by construction).

   **This reached production and stayed there for 3 days, 8 hours** —
   live from the Phase E homepage rebuild (`373dbe9`, 2026-08-21 13:15)
   to the fix (`7b2cc18`, 2026-08-24 21:21). Found incidentally, not by
   any guard or check: while verifying the boundary-proximity
   disclosure's output against this session's own hand-checked numbers,
   the figures didn't match, which led back to the chart rather than the
   chart being audited directly. **Nothing in the codebase would have
   caught this** — no test suite exists on this site at all (confirmed
   earlier this session), no guard checks a chart's rendered range
   against its own label, and the coverage-cliff guard's blind spot
   (above) meant even that check would have passed the bad data cleanly.
   **The label itself fixed 2026-08-25** — checked git history back to
   the project's first commit before touching anything: the chart has
   shown full history since Phase A, "TRAILING DECADE" was introduced
   fresh during the REGISTER rebuild (`373dbe9`) by reusing, for this
   chart, a phrase that correctly describes a genuinely different,
   real 10-year window elsewhere on the same page (see entry 7).
   Relabelled to "COMPOSITE TRAJECTORY," no date range in the heading —
   `AnchoredSparkline`'s own footer already prints the real start/end
   year, so a heading duplicating that would go stale every time the
   series grows.

7. **A pattern across entries 5 and 6, worth naming on its own: both were
   false public-facing claims with no code fault behind them, and neither
   could have been caught by anything this site already checks.** The
   `/methodology` build-status text and the "TRAILING DECADE" heading are
   the same failure shape twice — copy written alongside working code,
   then left behind once whatever it described moved on (gauges going
   live, in one case; a phrase migrating onto an unrelated chart during a
   rebuild, in the other). In both cases the *code* was correct throughout
   — `bandForScore` computed the right band, `computeHistoricalComposite`
   returned the right composite for whatever series it was given — it was
   the *prose describing* correct code that went wrong, silently. A build
   guard, a type check, `verify-gauge-invariants.mjs` — none of this
   site's existing machinery checks whether a sentence or a heading still
   matches what the code next to it actually does, because none of it was
   built to; they check data shape and computation, not English. Both
   were live for a meaningful stretch (the methodology text: unknown exact
   window, found "in an unrelated session"; the chart heading: at least
   3 days 8 hours, likely longer — the label predates this session
   entirely and nobody knows how long it read wrong before that). Both
   were found the same way: someone reading the page while doing
   something else, not a check designed to catch this.

   **Recorded as an open question, not a solved one, per the site
   owner's explicit instruction not to design a fix here.** This project
   has no mechanism for verifying that public-facing claims — headings,
   status paragraphs, any prose asserting something about what the code
   does or the data shows — still match reality once the surrounding
   context changes. That gap is now named and accepted deliberately,
   not sitting there unnoticed. Whether it's worth building something
   (a lint-style scan for hardcoded counts and stale-sounding phrases? a
   periodic "does this sentence still describe this code" review pass?
   something else?) is a real question for whoever picks this up next,
   not pre-answered here.

8. **`cohesion-majority-acceptance`'s `staleDisclosure` stated "genuinely
   7 years old (last freely published wave: 2019)" as a literal string.**
   Same family as entry 7 — copy that was true when written and would
   silently stop being true once the surrounding context (in this case,
   the calendar) moved on, with no guard checking whether the sentence
   still matched reality. The distinction worth tracking separately: entries
   5 and 6 went wrong at an unknowable moment (a gauge going live, a
   phrase migrating during an unrelated rebuild) and nobody could have
   named the date in advance. This one shipped with its wrong-by date
   already fixed — "7 years old" is arithmetic on 2019, correct only
   through 2026, wrong from 1 January 2027 whether or not anyone touched
   the file. **Existed in the first place because there was no shared
   mechanism for expressing a gauge's data age in copy** — every other
   instance of this fact on the site (the "DATA THROUGH" field, the
   `dataStaleness`/`ageDescription` computation) was already computed,
   this one string just wasn't wired to either. **Found only because an
   adjacent fix made the inconsistency visible**: the methodology page's
   own "N years old" card copy had just been changed from the same
   hardcoded literal to a render-time computation, in the same session,
   for the same fact about the same gauge — leaving this second, unfixed
   copy of the identical number sitting a few lines away was what made it
   visible, not a scan or a guard. Fixed 2026-08-25: `resolveStaleDisclosure()`
   (`lib/maturity.ts`) substitutes `{{DATA_AGE_YEARS}}`/`{{DATA_THROUGH_YEAR}}`
   tokens from `latestDataYear` at render time — see CLAUDE.md's "Age-in-copy
   token convention" for the rule and both live call sites it's wired
   into. A repo-wide scan for the same pattern (every string field in
   `gauges.config.json`, plus live `app/`/`components/`/`content/` copy)
   found nothing else — this was two instances of one bug (this one and
   the card copy), not a wider class, but the underlying mechanism gap
   was real and is what's actually fixed now.

9. **Three of `REGISTER_DRAFT_LINES`' 20 entries were wrong on the live
   site — `work-life-balance`, `productivity`, `economic-complexity`.**
   Found while characterising a different problem (a memo on whether
   copy-accuracy checking is worth mechanising, not a check built for this
   purpose) — the same accidental route as entries 7 and 8. **This is the
   third consecutive defect this project has found this way, not the
   first: entries 7, 8, and this one were all surfaced by someone looking
   at something adjacent, never by a check designed to catch this class of
   problem.** That pattern is itself worth naming, separately from any one
   defect: nothing in this project's build pipeline goes looking for this
   family of bug on its own.

   **`work-life-balance`'s error ran in Australia's favour, and that
   matters more than the other two.** The stored line read "Australia's
   work-life balance is 1651 ...; the peer median is 1783. Australia
   ranks 2nd of 4 (lower is better on this gauge)" — an outperformer among
   a thin 4-country field. Live, recomputed data (all 9 peers now
   reporting 2025, up from the 4 this line was written against) puts
   Australia at 1633 against a peer median of 1642, **ranking 5th of
   9 — below the median, not a top-2 performer.** Outperformer-among-four
   to below-median-of-nine is the specific direction of error this site
   exists to guard against: it is the flattering-not-damning misstatement,
   and it was live. Fixed by a real rewrite, not a number swap — the old
   sentence described a 4-country comparison that no longer exists, so
   every clause changes, not just the digits (see
   `content/register-draft-lines.ts`'s inline note on the fix).
   `productivity` (61.21/57.01/4th of 9 → 68.17/66.29/5th of 9) and
   `economic-complexity` (0.12 → 0.1, rank unchanged at 9th of 9) were
   plain magnitude drift — real, live-wrong numbers, but no structural
   claim inversion the way work-life-balance's rank was.

   **All three, plus entries 5 and 8, are the same mechanism wearing
   different clothes: a number hand-copied from a computed fact at one
   moment, then wired to nothing that would notice the fact changing
   underneath it.** That is now four entries carrying this exact shape —
   entry 5 (hardcoded gauge/status counts), entry 8 (a hardcoded data-age
   string), and the two distinct instances inside this one:
   work-life-balance's claim inversion, and the productivity/
   economic-complexity pair's plain magnitude drift. `REGISTER_DRAFT_LINES`
   was reviewed and approved 2026-08-20; all three wrong numbers drifted
   from pipeline refreshes that happened afterward (`productivity` and
   `living-standards` refreshed 2026-08-24, `economic-complexity` and
   `debt-burden` 2026-08-25) — the review was honest at the time, nothing
   caught what happened after it.

   **Correction verified against the site's own rendering, not just the
   underlying data**, per the site owner's explicit check before this
   landed: `economic-complexity`'s corrected value (`0.1`) was cross-checked
   against every surface that renders a gauge's raw value —
   `components/Gauge.tsx`'s `fmtValue` (the canonical `/table/[plate]`
   page, used for the visible AUS figure, the peer median, peer marks, and
   the dense-layer table), `components/SectionOverview.tsx`'s separately-
   defined `fmt`, and `components/TrajectoryChart.tsx`'s separately-defined
   `fmtValue` — all three are byte-identical implementations (a real,
   uninvestigated reuse smell — three copies of one function — but not
   this defect) and all three render the live 0.09973 as **"0.1"**, not
   "0.10" and not the raw float. The draft line was set to match that
   rendering rather than an independent rounding choice, per the standing
   principle that a number quoted in prose should never carry a precision
   the number's own live display doesn't.

   **Four gauges' sub-1% differences were assessed and deliberately not
   counted as defects**: `debt-burden` (165→164.7, 162→162.4),
   `housing-pressure` (median 121→120.7), `education` (497→497.3,
   495→494.5), `living-standards` (60194→60194.06). Each gauge's data
   `retrievedAt`/`sourcePulledAt` predates the 2026-08-20 content review,
   so these read as hand-rounding at authoring time, not drift — the
   person who wrote the line rounded a precise figure to a whole number or
   two decimals, which is not the same failure as a number that was
   accurate when written and became wrong later. Recorded here explicitly
   so that if the build-time guard being built next flags any of these
   four, the answer is "already assessed, not a regression" rather than a
   fresh investigation. Fixed 2026-08-26: `content/register-draft-lines.ts`
   (the three lines above) — see that file's own inline note for the
   correction record, and CLAUDE.md/this entry for why the file is being
   restructured next so these numbers are data rather than hand-typed
   prose.

10. **`app/methodology/page.tsx`'s "sixteenth"/"quarter" fractions sat one
    sentence past a fix already applied to the same paragraph.** `fd62833`
    derived Power's gauge count where it appeared as a bare `16` and as
    `1/16` (the paragraph's first sentence); the very next sentence, same
    paragraph, still hardcoded the two fractions built from that identical
    count as literal words — "carries its own full 1/16," "roughly a
    quarter," "carries a sixteenth." Found by: the site owner's own
    design-token migration scope report on this page, not a scan — the same
    accidental-adjacency route as entries 7, 8, and 9. **Worth naming on its
    own, distinct from just another missed instance**: the scoping that
    makes a commit reviewable — fix the literal you were pointed at, nothing
    else — is the same scoping that leaves its neighbor standing. `fd62833`
    was correct and narrowly right for what it targeted; the bug survived
    because "fix this hardcoded count" and "fix every hardcoded value
    derived from this count in the same paragraph" are different
    instructions, and only the first was given. Fixed in the commit
    alongside this entry: both fractions now read
    `{correlatedClusterGaugeCount}/{powerGauges.length}` and
    `1/{powerGauges.length}`, alongside 13 separate "N-country"/"N peers"
    literals elsewhere on the same page, finally derived from
    `gaugesConfig.peerCountries.length` — the pattern already existed for
    the Peer benchmark set section (`374-377` at the time) and was simply
    never extended to the other ~13 places the same fact appears in prose.
    No structural guard added — a future prose edit on this page can
    reintroduce a bare peer count or fraction the same way; this is a fix,
    not a scan.

11. **`data/manual/collection-log.csv`'s `collected_by` field read
    "intern" for all four 2026-08-24 manual-lane entries
    (human-capital-depth, inequality, work-life-balance, productivity), but
    no intern ever touched this data — a Claude Code session fetched and
    converted all four directly, per CLAUDE.md's and METHODOLOGY.md's own
    "Current build status" entries dated the same day ("Real data entered
    2026-08-24 from a raw SDMX CSV export"). Same defect class as 5 through
    10 — an unverified statement reached a file and stayed there — but a
    different kind of file: `collection-log.csv`'s entire purpose is
    accurate provenance (who pulled what, from where, when), so a false
    `collected_by` isn't a copy inaccuracy, it's the provenance record
    itself being wrong about the one thing it exists to record. Found by:
    the 2026-08-26 session retiring `docs/intern-data-collection-brief.md`
    (see below) cross-checking the log against CLAUDE.md/METHODOLOGY.md's
    own dated entries for the same four gauges, prompted by the site owner
    naming this exact defect. Checked the schema for other placeholder
    values that were never real: `collection-log.csv` has exactly these
    four rows (plus two added 2026-08-26 for this session's own refresh
    checks — see below); `pulled_date` and `extract_note` are both
    concretely accurate for all four, "intern" was the only false field, no
    other placeholder value found. Fixed: all four rows' `collected_by`
    corrected to "Claude Code session." No structural guard added —
    nothing currently checks `collected_by` against who or what actually
    ran the conversion; the fix is procedural (see the new
    `docs/manual-lane-checklist.md`'s instruction to log the real
    collector), same as every other unenforced standing rule in §4 below.

12. **`computeCompositeForAllCountries` ignored `scoringBasis` entirely — it
    would have shipped a wrong headline number.** Found 2026-08-27. This
    function drives the displayed composite, Australia's rank, the peer
    median and the boundary-proximity groups; `computeGaugeScore` branched
    on `scoringBasis` correctly, and this one never did. It was invisible
    for sixteen months because no live gauge used the latest-wave basis.
    The moment one did, the two functions disagreed about the same gauge on
    the same page: the gauge detail page showed Australia at **80.9** on
    the latest-wave basis while the composite was fed **72.4**, scored
    against only the three peers that happen to share Australia's own 2018
    fieldwork year. **Quality of Life would have published 68.4 as
    Australia's composite instead of 69.5** — a wrong headline number, on
    the live site, with a wrong band and a wrong rank behind it.

    **The detection route is the point, and it belongs on the record beside
    the others.** No guard caught this. No test caught it. It was caught
    because the build was being checked against a hand computation done
    earlier in the same session, and the rendered HTML came out 1.1 points
    below the expected figure. Had the memo not carried an independently
    computed number to check against, 68.4 would have looked entirely
    plausible and would have shipped. Entries 5 through 11 are all
    "something false reached a reader, caught by someone happening to
    look"; this one is the same class, caught one step earlier only by
    luck of having a prior number in hand.

13. **`computeHistoricalComposite` had no notion that a latest-wave gauge
    has no history — the same root cause, second instance.** Found in the
    same pass. It builds a same-year time series, and a latest-wave gauge
    has by definition no shared year. Including one puts a score in the
    trajectory that is not the gauge's real score, and makes the gauge
    count as "eligible" from its first year onward, inflating the
    coverage-cliff fraction for every later year against a gauge that can
    never fill it. Latest-wave gauges are now excluded structurally, with
    the resulting divergence between the trajectory chart and the headline
    composite disclosed in the function's own comment rather than hidden.

    **Recorded as a separate entry rather than folded into 12** because the
    shared root cause is what matters: one mechanism was added in 2026-08
    and *two* separate functions were never taught about it. The defect was
    not "a function had a bug" but "a cross-cutting concept was added
    without auditing its call sites."

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
  **Resolved 2026-08-26** — see the dedicated entry below ("Methodology
  migrated onto REGISTER"): the swatch is now the same tick glyph every
  other band rendering on the site uses, `ScoreBand.color` and its
  `@deprecated` comment are deleted from `lib/types.ts`, and the now-dead
  `"color"` values are stripped from both dimensions' `scoreBands` in
  `gauges.config.json`. Left in place above rather than deleted, per this
  file's own convention of recording what changed rather than erasing the
  entry that predicted it.
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

- **`/about`'s Contact section is intentionally suppressed, not broken
  (logged 2026-08-26).** `content/site.json`'s `about.contact` is still
  the scaffold value `"[PLACEHOLDER] contact@example.com"`, and
  `app/about/page.tsx`'s `isPlaceholder` guard correctly hides the whole
  section rather than rendering scaffolding to a reader — the guard
  working as designed, same pattern as `factOfRelease` above. The site
  owner has explicitly deferred standing up a form endpoint; the section
  reappears on its own the moment a real endpoint exists. **Known-open
  cosmetic item, not a defect — do not "fix" the guard or invent an
  address.**

**Methodology migrated onto REGISTER (2026-08-26)** — the pass this file's
own `ScoreBand.color` entry above named as needed. Full ruling record and
the design-token scope report that preceded it live in the session
transcript, not repeated here; this is the durable record.

- **Ruled and shipped**: card-per-section boxes replaced with rule-separated
  sections (`border-t border-ink`, matching `/table/[plate]`'s own
  separator convention — DESIGN.md's geometry rules, not a new pattern);
  the band-threshold legend's colour swatch replaced with the same tick
  glyph every other band rendering on the site already uses
  (`aria-label="Band: {label}"`, glyph `aria-hidden`); R5 extended with a
  fifth carve-out for `dataPolicy` disclosure labels (DESIGN.md, dated
  amendment — labels only, matching how `NOT ESTABLISHED`/`CONTESTED`/`NOT
  SCORED` already keep their explanatory body text at `--ink-2`, not a new
  shape); the per-gauge fact list in "Every gauge, in full" restyled with
  the dense layer's own label typography (mono, bold, tracked, uppercase)
  reused in place, kept in a 2-column grid rather than the dense layer's
  fully-stacked single column — a modest density adaptation of the existing
  pattern, not a new one, and the fact list was never flagged as not
  fitting so no return trip was needed.
- **The root-level ink-inheritance fix was verified by real rendering, not
  reasoned about**: a Playwright check (light + forced-dark, 830 leaf text
  nodes inside `.register`, same detection method DESIGN.md's own
  dark-mode audits use) confirmed zero fall-through to the old
  dark-switching `--text-primary` token — the exact bug class that hit
  WHAT'S MOVING. The detector was validated against a deliberately
  reintroduced bad case (removing `text-ink` from the root) before the
  clean result was trusted, same discipline as every other checker this
  project has built. Not run against `/table/[plate]` or `/section/[n]`
  again — those were already confirmed clean in the trajectory-chart pass
  (see above) and this pass didn't touch either file.
- **Not ruled — logged as an open editorial question, deliberately not
  answered as a side effect of this pass**: the Quality of Life section's
  majority-attitude narrative (the original 5-candidate source search plus
  the full 2026-08-25 re-verification, quotes and four dated triggers
  included) reads as a research memo inline in an otherwise
  generated-from-config reference page — no other gauge on this page gets
  that depth. Named specifically because it's asymmetric, not because
  depth is wrong: `work-life-balance`'s three-round OECD dimension-pin saga
  and `life-expectancy`'s `CONTESTED`-cause reasoning are comparably
  dramatic and live only in CLAUDE.md/METHODOLOGY.md, never surfaced here.
  The real question for whoever picks this up is which standard this page
  is actually holding itself to — **depth for all gauges with a real
  story, or depth for none, with the story pointed at METHODOLOGY.md
  instead** — not whether this one section should be trimmed in isolation.

**From the card-trend pass (`design/register-card-trend`) — one cleared bug,
one confirmed-clean audit, one unexercised branch:**

- **A real rendering bug, found and fixed: WHAT'S MOVING went illegible in
  dark mode.** Full mechanism in DESIGN.md's "Homepage" section ("A real
  bug, found later: inherited colour falling through to `<body>`") — not
  a mask/clamp/overflow, an inherited colour from the *old* dark-switching
  `--text-primary` token reaching text inside the homepage's deliberately
  fixed-light `.register` region. Fixed with one class
  (`components/DimensionVerdict.tsx`). Verified clean at 380px/desktop,
  light/forced-dark, real Chromium, `Cache-Control: no-store`.
- **Same bug class checked on `/table/[plate]` and `/section/[n]` —
  confirmed clean, not assumed.** Both are `.register`-scoped surfaces
  built before this bug class was known, and every earlier verification
  pass on them ran light-mode only, so this was real cause for suspicion.
  Audited directly in forced dark mode across 7 pages spanning every
  render branch (scored, `SAMPLE_DATA`, unscored/S7, reused-gauge,
  awaiting-data, both section overviews), both widths — 28 combinations,
  zero flags. The detector was itself validated against the known-bad
  pre-fix homepage build in the same pass (correctly flagged all 8 bad
  elements) before this clean result was trusted. Full record in
  DESIGN.md. **Confirmed clean at `276319f` (2026-08-23), not a standing
  guarantee.** The failure mode is a missing explicit colour on a *new*
  element relying on inheritance — anything added to either page after
  this commit without an explicit `text-ink`/`text-ink-2`/`text-ink-3`/
  `text-stamp` can reintroduce it, the same way WHAT'S MOVING did on the
  homepage. Re-audit rather than assume this result still holds once
  either page has changed.
- **The gauge card's "no ghost mark" branch (`deltaStartScore: null`) is
  unexercised.** All 20 of 20 currently-scored homepage gauge cards have
  a value at their delta window's start year. Real, type-checked code
  (never renders an interpolated position, per the site owner's explicit
  instruction) with no live trigger today — same "unexercised, not
  untested" category as the trajectory chart's name-all/too-thin branches
  and PRECEDENT/S1. See DESIGN.md's "Homepage gauge card — ghost mark".
- **A positive raw delta with negative peer-relative movement is real,
  confirmed on live data — `living-standards` (Table 1.1).** The delta
  text reads "+7.7% ⟶ widening" (Australia's own GDP per capita rose,
  2015–2025) while the ghost mark shows the *opposite* direction on the
  peer-relative scale — the 2015 mark sits ahead of the 2025 one. Both
  are true, not a bug and not a contradiction: peers grew faster over the
  same window, so Australia's own growth still cost it relative ground,
  consistent with the gauge's `SLIPPING` band. Logged here specifically
  so that if a reader questions why a *growing* number sits in a
  worsening band, the answer is on record rather than re-derived under
  pressure: raw-value trend and peer-relative trend are different
  measurements by design (see CLAUDE.md's "Scoring" section — this is
  the same real-disagreement case that section already documents for the
  primary direction arrows, now visible on the homepage card too).

**From the trajectory-chart pass (`design/register-trajectory`) — two tracked
follow-ups:**

- **`components/RankChart.tsx` is orphaned** — confirmed by the same
  repo-wide grep that found `TimeSeriesChart.tsx` orphaned (which *was*
  deleted this pass, see DESIGN.md's "Trajectory chart" section). Not
  deleted here: it wasn't part of this pass's brief, and this pass's own
  discipline is "delete what's confirmed dead and asked for, flag what's
  merely found." A future pass touching `Gauge.tsx`'s dense layer again
  should delete it the same way `TimeSeriesChart.tsx` went.

- **The Playwright HTTP-cache trap — logged, not fixed retroactively.**
  Full mechanism and evidence in DESIGN.md's "Trajectory chart" section
  ("A trap in the verification method itself"): Chromium reuses its
  on-disk HTTP cache across separate `chromium.launch()` calls when a
  local verification server is reused on a fixed port between runs —
  found in this pass when an identical check gave a different, correct
  answer on a never-before-used port. Fixed here via `Cache-Control:
  no-store` on the verification server's own responses. **Which numbers
  this affects, so a future session knows what to trust at face value and
  what to redo:**
  - **This pass's (`design/register-trajectory`) own final reported
    numbers are trustworthy** — every claim was re-verified after the fix
    landed, on both the (now `no-store`) reused port and at least one
    fresh port, cross-checked to match. This pass's own *early*
    intermediate readings (before the trap was found — e.g. the first
    "desktop is clean" check right after the `min-w-0` fix) used the
    vulnerable method too, but every one was superseded by a corrected
    re-check before being reported — nothing in the final report rests on
    an unconfirmed early reading.
  - **`design/register-homepage`'s entire 380px/desktop verification
    predates the fix and is less certain than it reads.**
    `scripts/_verify-homepage-380.mjs` used a fixed port with no
    `Cache-Control` header throughout that pass. Every claim from that
    report — zero document overflow, zero clipped ruler marks, zero
    truncated band labels, zero computed-style colour hits — including
    the specific re-checks that confirmed the band-label-truncation fix
    and the "STRENGTHENING" desktop-tracking fix, was obtained this way.
    The site has already merged and deployed on these claims — not urgent
    to redo, but a future session touching the homepage's 380px behaviour
    should re-verify with the corrected method rather than trust the
    existing record at face value.
  - **Unknown, not confirmed either way**: any Playwright-based
    verification from before this multi-session engagement — the
    original REGISTER build's own "confirmed via real rendering" claims
    (e.g. DESIGN.md's `personal-safety` peer-mark density-limit finding,
    the `/section/[n]` 380px spec). No visibility into whether that
    session's harness had the same vulnerability. Not claimed fine, not
    claimed broken — genuinely unknown, flagged rather than guessed at.

**From the automated-gauge staleness review (2026-08-24) — two tracked
findings, not acted on:**

- **The pipeline's staleness report covers the wrong 6 gauges — fixed
  2026-08-25.** Was: `pipeline/index.mjs`'s manual-staleness loop
  (`report.manualStale`/`manualFresh`) only ever checked
  `accessType === "manual"` gauges, while `lib/maturity.ts`'s
  `dataStaleness` covered all `api` gauges too but only ever ran at site
  build time — backwards, since the pipeline is the thing that actually
  runs on a schedule. Fixed by extending the same loop to every gauge,
  branching on `accessType` (manual keeps its 15-month fallback default;
  `api` gets no fallback, checked only where `staleAfterMonths` is
  explicitly reviewed and set — see CLAUDE.md's "`pipeline/` mirrors
  `lib/` logic" entry for the arithmetic mirror this required). **A ruling
  landed alongside the fix, not just a mechanical extension**: an `api`
  gauge going stale now counts toward the pipeline's CLEAN/NOT CLEAN
  verdict (new `apiStale`/`apiFresh` statuses, distinct from
  `manualStale`/`manualFresh` rather than overloading them) — a manual
  gauge being overdue is expected and routine, but an `api` gauge that's
  stopped updating usually means a broken fetcher or a changed upstream,
  which this project already treats as a genuine failure everywhere else.
  Confirmed live before pushing: ran the full pipeline against all 23
  gauges. The new mechanism itself came back clean — 0 `apiStale` across
  all 15 gauges with a reviewed cadence, `innovation`/`personal-safety`
  correctly skipped. **The run's overall verdict was NOT CLEAN, but for
  two pre-existing reasons unrelated to this fix** — a genuine
  `economic-output` fetch failure (see the new finding below) and the
  already-documented intermittent `housing-pressure` OECD Cloudflare
  block — confirmed by diff that the fetch loop these two failed in is
  byte-identical to before this change, and that the new staleness loop
  runs entirely after it. Committed and pushed anyway, per the site
  owner's ruling: a NOT CLEAN run from unrelated causes is this project's
  normal, documented behaviour (the Actions workflow already commits
  successful gauges when others fail), not a reason to withhold this fix.

- **The fix above buys evaluation cadence, not alerting — logged as an
  open question, not a to-do.** A gauge that's gone stale now gets
  *checked* on a guaranteed monthly schedule instead of only whenever the
  site happens to rebuild, but it still only ever surfaces in that run's
  console log (visible in the GitHub Actions run history) — no email, no
  red X, nothing pushed to anyone. Noticing a stale source still requires
  someone opening Actions and reading the log, same as before, just now on
  a predictable monthly cadence rather than an unpredictable rebuild-
  triggered one. Whether that gap is worth closing with active alerting
  (an Actions annotation, a notification, something else) is a real
  question for the site owner to decide separately — not pre-answered or
  scoped here.
- **`economic-output` (IMF) returned HTTP 403 from a local run, 2026-08-25
  — logged as a new observation, not the documented known limitation.**
  CLAUDE.md's standing record (`pipeline/lib/imf.mjs`'s `knownLimitation`
  gate) is specifically "works locally, blocks GitHub Actions" — a WAF
  rule against cloud/datacenter IP ranges. This run executed on a local
  machine and was blocked anyway: backwards from the documented pattern,
  which is why the failure correctly surfaced as a genuine red `failure`
  rather than the suppressed `knownLimitation` — the gate only fires on
  the exact Actions-specific shape, on purpose, and this isn't that shape.
  **Not retried**, per this project's standing no-blind-retries rule (a
  retry succeeding wouldn't distinguish a transient blip from a real
  change in IMF's blocking behaviour, and would risk masking the latter).
  **Left unresolved, on one observation, deliberately**: either IMF's
  blocking has broadened to include this network too, or this was
  transient — a single data point can't tell those apart. **If this
  recurs on a future local run, the `knownLimitation` gate's
  Actions-specific shape is wrong and needs revisiting** — either
  widening what counts as known, or treating this as a second, genuinely
  new standing limitation rather than folding it into the existing one
  without checking whether the existing one still accurately describes
  what's actually happening.
- **`life-expectancy`'s repeated AUS 2023/2024 value reframed, 2026-08-25 —
  the finding is construction-mix, not a carried-forward placeholder.**
  Originally logged as "World Bank returns an identical life-expectancy
  value for Australia in 2023 and 2024" with a carried-forward-forecast
  hypothesis, same shape as `economic-output.mjs`'s forecast exclusion.
  That hypothesis didn't survive investigation. Confirmed instead, against
  ABS's own release: Australia's figure is an overlapping 3-year rolling
  reference period (2021–2023, 2022–2024) tagged to a single terminal
  year, not independent annual mortality data — ABS's own words are "no
  change" between the two periods, which is why 2023 and 2024 match
  exactly. **The real finding is bigger than the repeat**: this series is
  not built the same way for every country in the peer set. New Zealand's
  Stats NZ documents the identical rolling convention as its own standard
  product; South Korea's KOSTAT is confirmed genuinely annual; the UK and
  Canada publish both, and their data (a real, unsmoothed COVID-era dip)
  suggests World Bank draws their single-year figures. Because this gauge
  scores countries peer-relatively, a rolling window and an annual figure
  measuring different things under the same visual grammar is a
  between-country comparability question for the ranking itself, not just
  a within-Australia trend artifact. **Disclosure text written 2026-08-25**
  (`gauges.config.json`'s `life-expectancy.dataPolicy`) — does not touch
  score or trend math.

- **Ruled 2026-08-25: the construction mix is disclosed, not adjusted —
  not a `bandRobustness` entry.** Raised explicitly, at the same weight
  as the polarity decisions and the internal-cohesion variable switch, per
  the site owner's instruction not to let this get absorbed into a text
  field. `bandRobustness`'s activation rule requires a human to have seen
  the band actually move and judged the *currently displayed* band
  overstated by a named, quantified mechanism (§3.3 in METHODOLOGY.md).
  The construction-mix concern doesn't clear that bar — see the cross-
  check below, which was attempted and came back unable to discriminate a
  direction or magnitude. Marking `bandRobustness` anyway would claim a
  precision the evidence doesn't support, the same reasoning that already
  left `innovation` and `personal-safety`'s staleness cadence unset rather
  than guessed at (CLAUDE.md's 2026-08-24 review) — this is that same
  move made a third time. Full ruling recorded next to `life-expectancy`'s
  existing `bandRobustness` entry in METHODOLOGY.md §3.3, stated plainly
  so a reader doesn't take the empty `bandRobustness` field as an
  oversight: a disclosed construction concern is not the same thing as a
  quantified band fragility, and this gauge carries the first but not the
  second.

- **Named open item: the WDI/WPP cross-check doesn't discriminate, and
  four of nine peers remain unverified — one item, since both close the
  same way.** Attempted a live test before the ruling above: UN World
  Population Prospects' own independent 2023 estimate (via Our World in
  Data) against each peer's WDI value, reasoning that a rolling-window
  country should show a larger gap against an independent single-year-
  equivalent source than an annual one does. Reported inconclusive, not
  left unattempted — the distinction matters if someone picks this up.
  Australia's gap (WPP 83.923 vs. WDI 83.051, +0.87) looked at first like
  confirmation, but South Korea — confirmed genuinely annual — shows a
  comparably large gap (+0.90), while New Zealand — confirmed rolling,
  same as Australia — shows a much smaller one (+0.33). Something other
  than the rolling/annual split dominates the WDI-vs-WPP gap, most likely
  a data-vintage or revision difference between the two sources that
  affects every country, not a construction-specific artifact — WPP is
  the wrong comparator. **A test that could actually quantify smoothing
  bias would need to compare each country's WDI series against that same
  country's own single-year national life table, not against a third-
  party model** — which requires knowing whether each country's own
  statistical office even publishes one. That's the same open research
  gap as the four unverified peers (the Netherlands/CBS, Germany/Destatis,
  the USA/NCHS, Japan/MHLW — not yet checked against primary methodology,
  named rather than rounded up from the data's shape, which is not the
  standard this project holds elsewhere). **Closes when**: each of those
  four agencies' own published life-table methodology is read directly,
  the same way ABS, Stats NZ, ONS, StatCan, and KOSTAT already were — at
  which point, for any peer confirmed to publish its own single-year
  table, the real cross-check (WDI vs. that country's own annual figure,
  not WPP) becomes possible for the first time.

**From the proximity-disclosure build (2026-08-24) — one design gap
found, not acted on:**

- **No surface on the site displays a country's per-dimension composite
  un-blended.** Found while deciding where a peer proximity disclosure
  should render: `/section/[n]`'s rank table (`SectionOverview.tsx`)
  takes `countryScores[].power` and `.life` as real, computed numbers per
  country, but only ever shows them blended through the reader's own
  weighting slider (`w*power + (1-w)*life`, the "YOUR INDEX" equation) —
  never each dimension's own raw composite individually. The homepage's
  `DimensionRuler` shows a labelled score for Australia only; peers get
  ticks with no number attached. A reader who wants to know how, say, the
  Netherlands scores on Quality of Life specifically — not blended into
  some weighting, just that dimension's own number — currently can't find
  out anywhere on the site. Not built here: the proximity disclosure was
  scoped to reuse `DimensionVerdict` rather than open a new page surface,
  per the site owner's explicit instruction. Worth a real decision later
  — whether that's a new per-country composite table, or extending
  `/section/[n]`'s existing cells with a second, un-blended number.

**The intern's four manual datasets — superseded, kept for history only.**
This bullet is stale: as of this writing it still describes
`productivity`/`human-capital-depth`/`inequality` as having no real data at
all, but all four (plus `work-life-balance`'s 2020+ gap) landed real data
2026-08-24 — see CLAUDE.md's/METHODOLOGY.md's "Current build status" and §5
above. It also pointed at `docs/intern-data-collection-brief.md`, retired
2026-08-26 and replaced by `docs/manual-lane-checklist.md` (§5) — the
reference below is corrected to the new file so it isn't left dangling, but
the substance of this bullet is otherwise obsolete. Left as-is rather than
rewritten, so the original point-in-time record isn't lost: `productivity`,
`human-capital-depth`, and `inequality` have no real data yet (the first
two: no data file at all; `inequality` likewise Awaiting Data);
`work-life-balance` has real 1995-2019 data but is missing 2019 for 5 of 8
peers (see below). Full instructions, per-dataset download steps, and
templates are in `docs/manual-lane-checklist.md` and `data/manual/README.md`
— not re-summarized here so it can't drift out of sync with those files.

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

- **Constitutional follow-up: RULED AND IMPLEMENTED 2026-08-27, except for
  one part.** The three questions opened on 2026-08-26 were all ruled on
  and built: the gauge is scored from WVS Wave 7 Q21, renamed to
  "Cohesion — acceptance of migrant neighbours", single item, valid base,
  Q121-Q130 rejected. The weighting gate cleared on derived evidence. Full
  record in METHODOLOGY.md's four dated 2026-08-27 entries and CLAUDE.md.
  **The one part not built is the compute-vs-republish rule itself — see
  the next entry, which is the open item.**

- **The constitutional memo's argument 3 no longer holds in the form it was
  adopted (recorded 2026-08-27).** The memo argued that the Quality of Life
  band flip should carry no weight partly because *"the site already tells
  readers this"* — quoting a homepage proximity disclosure that read
  "Australia, New Zealand, Netherlands and Japan all sit within a typical
  year's movement of the Strengthening/Leading boundary — on this measure
  the composite does not meaningfully separate them."

  **That sentence no longer exists.** Adding an eighth gauge recomputed the
  proximity groups: Australia is now named **alone** ("Australia's reading
  sits within a typical year's movement of the Strengthening boundary —
  close enough that the composite does not cleanly separate it from
  countries on the other side"), with South Korea and the United States
  forming a separate group and Canada flagged solo.

  **The substance survives**: the page still tells readers that boundary
  does not separate Australia cleanly, which is what the argument needed.
  But the ruling was adopted from a specific sentence, and that sentence
  was changed by the very commit the ruling authorised. Recorded so the
  ruling record does not point at copy that cannot be found — the same
  discipline as entry 7's family, applied to a decision record rather than
  to page copy.
- **RESOLVED 2026-08-27: the compute-vs-republish rule is ruled and
  recorded.** The audit found five live gauges that failed the first
  draft's wording — trade, demographic-momentum, debt-burden, education and
  rule-of-law-corruption. **None was dishonest; the wording was
  mis-scoped**, and the site owner redrafted it rather than change the
  gauges. The failure was traced to a wording accident: the first draft
  qualified averages with "over a provider-defined set" but left sums
  unqualified, so debt-burden (2 of BIS's 5 borrower sectors, summed) and
  rule-of-law-corruption (2 of WGI's 6 dimensions, averaged) made
  structurally identical choices and landed on opposite sides. Both sector
  lists were verified live against the providers' own APIs.

  The adopted rule is three tiers — republished, derived, constructed —
  with derived turning on whether **the unit declaration is the complete
  method** and a reader can reproduce the figure. Under it: **zero live
  gauges are constructed**, five are derived, eighteen are republished. The
  Q121-Q130 rejection stands under both drafts. Scope is input figures
  only; the site's own scoring layer is exempt because it is **attributed
  to the site** rather than to a provider.

  Recorded in METHODOLOGY.md as "Republished, derived, constructed: what
  this site may publish", including the audit table naming all five derived
  gauges explicitly, and the redraft history — a durable policy that had to
  be corrected before adoption carries that correction, so a future reader
  knows the wording was tested against live gauges rather than assumed
  sound.

---

## 3. Unexercised in the code — read this as a list of suspected defects

**Standing lesson, adopted 2026-08-27: a branch never exercised by live
data is better read as a suspected defect than as untriggered code.**
`scoringBasis` sat unexercised from 2026-08-11 until something finally
used it, and when something did, **two separate functions turned out never
to have been taught about it** — one of which would have shipped a wrong
headline number (see entries 12 and 13). Nothing in this list should be
assumed correct because it type-checks.

Each item below was verified against real data during its build for
*structural* behaviour, but none is currently exercised by live content.
The inventory was re-run against live data on 2026-08-27 rather than
carried forward on trust.

### Load-bearing — a defect here reaches a reader as a wrong number or a false claim

- **The composite-exclusion disclosure has never fired on a real
  exclusion.** `buildCompositeDisclosure` / `assertCompositeDisclosure`
  exist because a gauge once dropped silently out of a composite and the
  headline verdict was quietly wrong (2026-07-14). Checked live: both
  dimensions currently have **zero** excluded gauges, so the disclosure
  string is always empty and the assertion always passes trivially. It was
  proven once via a temporary harness (wiping a gauge's data by hand), but
  never by a real event. **This is the closest structural analogue to the
  `scoringBasis` defect on the site**: a guard whose correctness is only
  tested when something finally trips it.

- **The latest-wave trend computation for 3+ waves does not exist.**
  `computeGaugeScoreLatestWave` returns `direction: null` once a gauge has
  3+ waves spanning 6+ years, with a comment saying the real computation
  "isn't built yet." Today the only latest-wave gauge has one wave per
  country, so it correctly reports `insufficient-history`. **The moment a
  second wave lands it silently degrades to "no trend data" rather than
  computing one** — no throw, no warning. **This is dated, not
  hypothetical: WVS Wave 8 fieldwork closes December 2026**, and the whole
  point of the remaining upgrade triggers is to add a second wave to this
  gauge. Build it before that lands, or make it throw.

- **The `awaiting-data` maturity tier and the `SAMPLE_DATA` badge have no
  live trigger.** All 23 gauges are LIVE with a data file. Both are display
  states whose failure would be visible immediately, so the risk is lower
  than the two above — but neither has been seen in production.

### Not load-bearing — dormant display paths

- **The unscored-gauge mechanism is now dormant again.**
  `UnscoredTag`, `UnscoredGaugeCard` and the `UnscoredGaugeDetail` branch
  were exercised by `cohesion-majority-acceptance` from 2026-08-11 until
  2026-08-27, when it became scored. **No gauge sets `unscoredDimensions`
  today.** Kept deliberately — the failure mode it exists for is real and
  will recur.
- **`contextSeries` renders for no gauge.** The WID wealth-share box on
  Inequality is still the only planned use and its data has never landed.
- **`revisions` renders for no gauge** — no data file carries one.
- **`bandRobustness.direction: "understates"` is set by no gauge**, and by
  design renders nothing even when set (the site declines to tell readers
  Australia might be doing better than shown). Unexercised and inert.
- **PRECEDENT is unexercised across every state**, and **S1 (both CAUSE and
  PRECEDENT established) has never been triggered** — five gauges have an
  established CAUSE but no gauge has an established PRECEDENT, so even
  those render a hybrid state. **S2's CHALLENGER content** is unwritten for
  the same reason. All three remain held back on purpose (the Korea-rise
  story recurs across five gauges and was to be drafted once, not five
  times blind).

### Newly exercised since this list was last written — three items closed

Recorded rather than deleted, because "it finally got a live trigger" is
the event this list exists to anticipate.

- **S5 (stale) is now live**, on three gauges: `productivity` (~32 months
  against a 15-month threshold), `inequality` (~68 against 24) and
  `cohesion-majority-acceptance` (~92 against 24). This list previously
  claimed "no gauge is currently overdue," which had itself gone stale.
- **`insufficient-history` is now live**, on
  `cohesion-majority-acceptance` — the first real use of the direction
  state built for it in 2026-08.
- **The gauge card's "no ghost mark" branch (`deltaStartScore: null`) is now
  live**, on the same gauge: with one observation per country there is no
  delta window, so the card correctly renders no ghost mark and no delta
  line. Verified in the deployed HTML, not assumed. This list previously
  said all 20 scored cards had a value at their window start.

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

## 5. Intern brief retired; two due manual-lane refreshes attempted (2026-08-26)

**`docs/intern-data-collection-brief.md` retired, replaced by
`docs/manual-lane-checklist.md`.** Assessed at the site owner's request and
found obsolete: the brief was written as a role description for a person
who would periodically be handed four datasets to collect. In practice,
the one time this task genuinely came due (the 2026-08-24 landing of
productivity, human-capital-depth, inequality, and work-life-balance — see
entry 11 above and CLAUDE.md's "Current build status"), it was completed
directly by a Claude Code session, not sent to anyone. The manual lane's
real shape turned out to be: two lightweight OECD refreshes a year
(roughly — see the cadence table in `docs/manual-lane-checklist.md`) plus
one dated trigger-check (`cohesion-majority-acceptance`'s Gallup-wave
watch, METHODOLOGY.md), all of which this project's own normal
session-by-session workflow already absorbs without a dedicated role. The
new checklist keeps the schedule and the *what/where/when* — what an
intern brief would have needed anyway — and drops the role framing that
never matched how the work actually got done. A dangling reference to the
retired file in §2's older "Outstanding" entry below is corrected in the
same commit.

**Two of the manual-lane gauges genuinely due for a refresh were
attempted this session, with different outcomes:**

- **Inequality — confirmed no-change, not a miss.** Direct access
  (`sdmx.oecd.org`, `data-explorer.oecd.org`, `oecd.org`) returned
  Cloudflare 403 to both a raw fetch and WebFetch, same block this project
  has hit before. Cross-checked instead via DBnomics' independent mirror
  of the exact same OECD dataflow (`DSD_WISE_IDD@DF_IDD`), crawled
  2026-06-10 — well after the current file's own 2026-08-24 entry. That
  crawl shows CAN/GBR/USA/JPN/KOR/NZL/DEU/NLD all with data past 2020, and
  Australia still capped at exactly 2020 (0.319, exact match). Australia
  having nothing newer in the same crawl that plainly has newer data for
  every other peer is strong evidence 2020 is genuinely still OECD's
  publication ceiling for this country, not a gap in this collection —
  recorded as a confirmed no-change, per the site owner's own explicit
  expectation going into this task. `data/processed/inequality.json`'s
  `retrievedAt`/`sourcePulledAt` and provenance note updated to record the
  check; `data/manual/collection-log.csv` carries a matching row.
- **Productivity — blocked, documented, not guessed.** Same Cloudflare
  block on all three OECD hosts. DBnomics' mirror of this dataflow caps at
  2023 for Australia too, but is inconclusive here (unlike Inequality): in
  the very same crawl, 4 of the 9 peers (CAN, GBR, NLD, DEU) already show
  2024 while AUS/NZL/KOR/USA/JPN cap at 2023 — a plausible genuine
  per-country publication lag, not proof Australia has nothing newer. A
  web search surfaced real evidence that 2024 Australian data does exist
  (OECD's own June-2026 Compendium of Productivity Indicators), but only
  reported in current-price PPP terms — a different unit from this gauge's
  constant-price/2020-PPP series — so entering it would mean guessing a
  variant is "close enough," exactly the discipline this project has
  refused every other time it's come up (housing-pressure, work-life-balance,
  the Inequality/WID split). Site owner's explicit call, asked mid-session:
  leave it blocked and documented rather than chase a browser-based
  workaround or guess. `data/manual/collection-log.csv` carries a row
  recording the attempt and the exact blocker; the gauge's own `Productivity`
  row in `docs/manual-lane-checklist.md` still shows it due. **Still open
  for whoever picks this up next** — either a session with a network path
  that isn't Cloudflare-blocked, or the site owner doing the
  data-explorer.oecd.org download by hand per `data/manual/README.md` and
  handing the CSV over.

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
