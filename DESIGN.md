# Handoff: Australia Scorecard — Direction C ("REGISTER")

## Overview
A public, independent website benchmarking Australia against eight peer countries across
~24 quantitative gauges, in two dimensions (national power & trajectory; quality of life).
Data refreshes monthly from an automated pipeline. Target stack: Next.js + Tailwind.

This handoff covers the approved design language ("REGISTER", Direction C, with three
amendments) and two built surfaces:
1. Single gauge page with two-tier disclosure — route `/table/[plate]`
2. Dimension overview — all gauges at a glance, with reader-set weighting — route `/section/[n]`

Plus three "awkward case" gauge variants that define required states (AUS leads;
cause not established; missing peer data) and a 380px mobile rendering.

## About the Design Files
`Register.dc.html` in this bundle is a **design reference created in HTML** — a prototype
showing intended look and behaviour, not production code to copy. The task is to
**recreate these designs in the Next.js + Tailwind codebase** using its established
patterns, fonts pipeline (`next/font`), and component conventions. Do not port the inline
styles; translate them into Tailwind tokens per "Design Tokens" below.

The prototype is a canvas of four labelled panels (1a gauge page, 1b overview,
1c awkward cases A–C, 1d mobile). The canvas framing, panel borders and the small
`1a`/`1b` badges are presentation scaffolding for review — **not part of the product**.

## Fidelity
**High-fidelity.** Colours, type, spacing, and the two-tier disclosure interaction are
final. Recreate pixel-accurately. Two things are explicitly NOT final:
- **Band thresholds** (count and boundaries) are under methodology review. Implement the
  band set as data-driven config, not hard-coded four-way logic.
- **Dimension composite scoring** in the overview is illustrative; the real composite comes
  from the pipeline.

---

## THE DESIGN RULES — non-negotiable, they are the whole point

**R1 — No colour encodes performance.** Band, direction and severity are carried by
position, glyph, weight and rule only. A reviewer will check this. Never introduce a
red/amber/green scale, never colour a value by how good it is.

**R2 — Severity channel order.** Primary: **position** (which band column AUS sits in).
Secondary: the **tick glyph** (`∙` / `∙∙` / `∙∙∙` / `∙∙∙∙`, ahead → far behind).
Tertiary and tertiary only: font weight and top-rule thickness. Weight must never be
load-bearing — it disappears at 13px and in compressed screenshots.

**R3 — Australia is never shown alone.** No component, surface, or summary figure may
render an Australian value without peer context in the same visual frame. If a component
you build can render a solo AUS number, it is wrong. This includes OG images, embeds,
and any future API-driven widget.

> **STRENGTHENED (implementation ruling, 2026).** R3 is a type-level and
> build-level invariant, not a rendering convention. `lib/gauge-view.ts`'s
> `Peer[]` is a non-empty tuple (`[Peer, ...Peer[]]`) — a scored gauge with
> zero peers cannot typecheck. Separately, `assertMinimumPeerCoverage`
> (called from `buildGaugeView`, and independently from
> `scripts/verify-gauge-invariants.mjs` on every build) fails the build
> outright if a scored gauge has fewer than 3 peers with a usable score
> after `missingPeers` exclusion — below 3, rank/median/"position among
> peers" are incoherent, not just thin. A gauge that can't clear that bar
> gets an S4 (missing peer data) or S7 (unscored) treatment instead, never
> a normal scored render with an empty or near-empty peer set.

**R4 — Recency is visible.** Every gauge carries an as-of date, set in mono, treated as
information not fine print. Stale and unavailable data are declared, never hidden.

**R5 — Stamp colour carve-out.** Exactly one non-ink colour (`--stamp`) exists, used
*only* for: as-of dates past the staleness threshold, `n.a.` notation, revision marks,
and the `NOT ESTABLISHED` notation. Data age and declared absence are structural
metadata, not performance. `--stamp` must never touch a value, a band, or a rank.

> **EXTENDED (implementation ruling, 2026-08-26): a fifth carve-out —
> editorial caveats that qualify what a gauge's data can support, covering
> both `dataPolicy` and `staleDisclosure`.** Migrating
> `app/methodology/page.tsx` onto REGISTER surfaced two caveats R5's
> original four didn't name: a gauge's own recorded `dataPolicy` note (a
> real, disclosed limitation in its source — e.g.
> `cohesion-majority-acceptance`'s thin-source caveat) and a
> `staleDisclosure` explaining why no numeric staleness threshold could be
> set at all (`innovation`, `personal-safety`). Both need to read as
> visually distinct from the fact they caveat, for the same reason recency
> and absence do — a caveat typeset identically to ordinary body text is one
> a reader skims past. Ruled once for both together, not piecemeal: a
> declared-absence caveat is the same shape whether the absence is a data
> limitation or a staleness limitation, and stamping one but not the other
> would be arbitrary. **A `dataPolicy` or `staleDisclosure` label is this
> fifth `--stamp` use.** "Label," not the whole disclosure, on purpose —
> this matches every existing carve-out's own implementation, not a new
> pattern: `NOT ESTABLISHED`/`CONTESTED`'s label word is `--stamp` while the
> attribution body that follows it reads `--ink-2`
> (`components/Gauge.tsx`'s `ApparatusLine`), and S7's `NOT SCORED` label is
> `--stamp` while its `unscoredReason` body is likewise `--ink-2`
> (`UnscoredDeclaration`). Both new disclosures follow the identical shape:
> the `⚠ DATA POLICY` / `STALENESS` marker in `--stamp`, the disclosure's
> own explanatory prose in `--ink-2`. `--stamp` still never touches a value,
> a band, or a rank (R5's own restriction is unchanged) — these notes sit
> beside a gauge's facts, they never replace one. Named explicitly here, not
> left implicit in the code: a future reader of this rule who sees four
> categories listed and two more in the wild (`app/methodology/page.tsx`)
> would reasonably read the unlisted two as violations rather than a
> deliberate extension.

**R6 — Tabular figures everywhere a number appears.** `font-variant-numeric: tabular-nums`
on every numeric cell. Numerals must align across country columns; misalignment is the
fastest way this reads as amateur.

**R7 — Country identity is ISO alpha-3 in mono** (AUS, NZL, CAN). Never flags.

**R8 — Plate numbers are real navigation.** `Table 4.2` is the citable identifier and
`/table/4.2` resolves to it. Plate numbers appear in the gauge header and in the
copyable citation block.

> **ADDED (implementation ruling, 2026).** One gauge, one plate — always, no
> exceptions. A gauge reused across dimensions (housing-pressure is the only
> current case, scored in both Power and Quality of Life) still gets exactly
> one citable number, its primary dimension's. The other dimension's
> overview page shows it as a **cross-reference row** — name, a note that
> it's scored in the primary dimension, a link to the one real plate — never
> a second `Table X.Y`. Two URLs resolving to identical content breaks R8's
> own "resolves to it" promise and is a duplicate-content problem the moment
> this is public. Caught and fixed before anything external could have
> cited the duplicate — plate numbers are permanent once assigned, so this
> had to happen now.

---

## Peer set
`AUS` plus eight: `CAN NZL GBR IRL NLD SWE DNK KOR`.
USA is deliberately excluded (distorts per-capita axes). Peer set is config, not hard-coded.

> **SUPERSEDED (implementation ruling, 2026).** This design tool had read-only
> repo access and could not run the pipeline — the peer set above is a mockup
> invention with no data behind it (IRL/SWE/DNK have no series in this
> project at all). The live peer set, which governs implementation, is
> `AUS` + `CAN GBR NZL KOR NLD USA DEU JPN` — nine countries, **including**
> USA. Every figure in `Register.dc.html` is likewise fabricated; treat the
> reference HTML as layout indication only, never as content or as evidence
> for which countries belong in the set. This file's peer set is left
> unedited above so the discrepancy stays visible rather than silently
> smoothed over — do not "fix" line 74 to match reality, the mismatch is the
> record.

---

## Design Tokens

### Colours — two inks, paper, structure, and one stamp
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F8F8F7` | Page/surface background. Neutral white, zero temperature. |
| `--desk` | `#ECEDEB` | Canvas/desk behind surfaces; also the AUS row tint in the rank strip. |
| `--ink` | `#202224` | The one black. All text that means something, all heavy rules. |
| `--ink-2` | `#55585B` | Secondary ink: footnotes, source notes, unit labels. |
| `--ink-3` | `#7C7F82` | Tertiary ink: band column labels, metadata captions. |
| `--chrome` | `#B9BCBF` | Structural only: nav, gauge frames, link underlines, axis ends. |
| `--grid` | `#DCDDDB` | Measurement grid: band dividers, table row rules, selection. |
| `--stamp` | `#8A5A44` | Recency/absence apparatus ONLY (see R5). Desaturated, never alarming. |

No other colour may be added. Links are `--ink` with a `--chrome` underline that darkens
to `--ink` on hover — no blue anywhere, and never inside a gauge's data area.

### Typography
- **Display + body:** Public Sans (`next/font/google`, weights 300–800, italic axis available)
- **Data + all apparatus labels:** Martian Mono (weights 100–800). Every numeral, ISO code,
  date, plate number, unit declaration, and label.
- No third family.

| Role | Family | Size / line | Weight | Tracking |
|---|---|---|---|---|
| Masthead | Martian Mono | 12px | 700 | .22em |
| Nav items | Martian Mono | 10.5px | 500 | .10em |
| Plate number | Martian Mono | 13px | 700 | .10em |
| Gauge title (page) | Public Sans | 36px / 1.1 | 700 | -.01em |
| Gauge title (card) | Public Sans | 26px / 1.2 | 700 | 0 |
| Unit declaration | Martian Mono | 11px | 500 | .06em |
| As-of date | Martian Mono | 11px | 700 | 0 |
| Plain-language line | Public Sans | 17.5px / 1.5 | 400 | 0 |
| AUS value (hero) | Martian Mono | 22px | 800 | 0 |
| Peer ISO + value | Martian Mono | 10.5px | 500 | 0 (opacity .6) |
| Band column label | Martian Mono | 10px | 600 | .14em |
| Summary metrics row | Martian Mono | 11px | 500 | .06em |
| Apparatus label | Martian Mono | 10.5px | 700 | .16em |
| Apparatus body | Public Sans | 14.5px / 1.55 | 400 | 0 |
| Table header | Martian Mono | 10px | 700 | .12em |
| Table cell | Martian Mono | 12.5px | 400 | 0 |
| Table gauge name | Public Sans | 14px | 400 | 0 |
| Footnote / source | Martian Mono | 10.5–11px / 1.8 | 400 | 0 |

### Spacing & geometry
- Border radius: **0 everywhere.** No rounded corners.
- Gauge page surface padding: 48px 56px 56px. Card variant: 40px 48px. Mobile: 24px 20px 32px.
- Rules: `3px` solid `--ink` = primary separator under the gauge header;
  `1px` `--ink` = section separator; `1px` `--grid` = table row rule;
  `2px` `--ink` left border = the apparatus block's spine.
- Content grid on gauge page: `1fr 340px`, gap 48px (measurement left, apparatus right).
- Rule thickness participates in severity only as a tertiary channel (R2).

---

## Component: `<Gauge>` — the core of the site

One component, two densities. Used at page scale (`/table/4.2`) and as a card in
awkward-case contexts.

### Props
```ts
type Band = { key: string; label: string; ticks: string; widthPct: number };
type Peer  = { iso: string; value: number | null; note?: string };

type Gauge = {
  plate: string;              // "4.2" — also the route segment
  title: string;              // "Gross expenditure on R&D"
  unitLine: string;           // "UNIT: % OF GDP · FRASCATI DEFINITION · CURRENT PPPs · SOURCE: OECD MSTI 2026-1"
  asOf: string;               // "2026-07"
  stale: boolean;             // as-of past threshold → --stamp
  refreshNote: string;        // "refreshes monthly · next 2026-09-01"
  observation: string;        // "AUS observation: FY 2023–24 (ABS 8104.0)"
  plainLine: ReactNode;       // one plain-language sentence, peer median named
  aus: number;
  peers: Peer[];              // nulls render as n.a. in the exclusion note
  bands: Band[];              // data-driven; count NOT fixed
  ausBand: string;            // band key
  rank: string;               // "7/9" or "4 OF 6 REPORTING"
  delta: string;              // "−0.15 pp ⟶ widening"
  peerMedian: number;
  invertedAxis?: boolean;     // low = ahead (debt, HHI, β)
  leads?: boolean;            // AUS rank 1 → CHALLENGER variant
  cause:     Attribution;     // { kind: 'established', body } | { kind: 'not-established', body }
  precedent: Attribution;
  scale:     ReactNode;       // always established — it is arithmetic, not causation
  dense: DenseLayer;
};
```

### Tier 1 — scannable layer (always visible)
1. **Header row:** plate number (mono) left; as-of block right (as-of date bold; refresh
   cadence and observation year in `--ink-3`). If `stale`, the as-of line is `--stamp`
   and reads `AS OF 2023 · STALE`.
2. **Title** (Public Sans 36/700) then **unit declaration** (mono, uppercase). Units and
   definitions are declared in the header, always.
3. `3px` `--ink` rule.
4. **Plain-language line** — one sentence, max 62ch, peer median named in it. Every gauge
   has one; it is what serves the general-public reader without a simplified site.
5. **Band strip** — the primary encoding:
   - Band column labels above (`FAR BEHIND ∙∙∙∙ | BEHIND ∙∙∙ | PAR ∙∙ | AHEAD ∙`),
     widths from `bands[].widthPct` (thresholds are per-gauge, so widths vary — see
     Table 6.2 where they are 15/17/26/42).
   - Frame: `1px --ink` top, `1px --chrome` bottom, `1px --grid` verticals at boundaries.
   - Peers plotted as ISO + value, `opacity .6`, staggered on two baselines (top 54/64px,
     bottom 78/88px) to avoid collision.
   - **AUS**: `◆ AUS` + the value at Martian Mono 800/22px, top of the strip.
   - Height 118px at page scale, 104px card, 96px mobile.
6. **Summary metrics row** (mono, flex, gap 34px): rank · band + ticks · Δ5yr with
   direction arrow · peer median.
7. **Threshold disclaimer** (mono 10.5px, `--ink-3`): "Band boundaries indicative —
   thresholds under methodology review (Methods §3.1)."
8. **Apparatus block** — right column, `2px --ink` left spine. Three labelled lines,
   identical structure on all ~24 gauges: **CAUSE / PRECEDENT / SCALE**.

   > **REORDERED (implementation ruling, 2026): PRECEDENT / CAUSE / SCALE.**
   > The inventory behind this ruling (see CLAUDE.md) found PRECEDENT
   > systematically easier to establish than CAUSE — peer trajectories are
   > directly observable in data already held, while attributing one
   > composite's movement to one mechanism is genuinely hard (~6 of 20
   > gauges can currently carry a cited CAUSE; most can carry a PRECEDENT).
   > The original CAUSE-first order assumed the cause leads; with CAUSE
   > absent on most gauges, that opened every page on a decline. PRECEDENT
   > is also the more diagnostic content — an observed peer trajectory
   > tells a reader more about whether a gap is fixable than a contested
   > attribution does, which was the point of choosing a diagnostic
   > register in the first place. Fixed three-line structure throughout;
   > only the order changed. Every "CAUSE / PRECEDENT / SCALE" below should
   > now be read as **PRECEDENT / CAUSE / SCALE**.
9. **CITE AS block** — `1px --chrome` box: full citation string + `COPY` button
   (label → `COPIED ✓` for 1600ms). Button: mono 10px/700, `1px --ink` border,
   inverts to `--ink` background on hover.

### Tier 2 — dense layer (disclosed in place, same component)
Full-width toggle bar above it: `1px --ink` top rule, mono 11px/700 `.16em`,
label `DENSE LAYER — FULL PEER TABLE · SERIES · DEFINITION · REVISIONS`,
glyph `⊞` closed / `⊟` open, `opacity .7` on hover. Contents, in the same
`1fr 340px` grid:
- **Full peer table:** COUNTRY · primary measure · secondary measure · Δ10yr · OBS. YEAR.
  Sorted best→worst. **AUS row: weight 800 with a `1px --ink` rule above and below** —
  emphasis by weight and rule, never colour. Superscript letter footnotes for series
  breaks and definitional variants (e.g. IRL GDP vs GNI\* basis).
- **AUS AND PEERS OVER TIME** — the multi-country trajectory chart, added 2026-08.
  Sits here, above the two items below it. See "Trajectory chart" for the full spec.
- **AUS time series** as a two-row mono table (years / values), tabular-nums; missing
  years render `n.a.` in `--stamp`.
- **Right column:** DEFINITION (full statistical definition, cite the manual),
  REVISIONS (what changed, when, plus a `REV 2026-05` mono tag in `--stamp`),
  SOURCES (every source named; explain the monthly-pull vs annual-source-cadence
  distinction so the as-of date is not mistaken for the observation year).

The dense layer is the same page and same component — never a separate "advanced" view.

---

## Trajectory chart

Added 2026-08 (`design/register-trajectory`). Closes a real information gap, not a
styling one: the band strip shows where the field sits *now*; nothing on a gauge page
showed how it got there — how a peer pulled ahead, or when Australia flattened. The
site's own framing is "gaps that could be closed, and who closed them" — PRECEDENT
names a peer's trajectory in prose, and until this pass nothing on the page ever showed
it. Deliberately not an addition to the band strip itself: the strip is a snapshot with
no time dimension, and adding one to it would be incoherent.

### The design problem: nine countries, no colour

R1 forbids colour encoding performance, and colour is the conventional way to
distinguish series on a line chart. Two options were argued before anything was built:

**Option A — all nine, always, terminal-labelled.** Every peer plotted, AUS heaviest,
peers thinner with a small set of stroke textures, each line's true endpoint labelled
with its ISO code (never a colour-keyed legend). Real diagnostic value — shows the
field's actual shape — but every scored gauge on this site carries up to 8 peers, so
this is the *maximum* density case every time, on every gauge page, and DESIGN.md's own
"known density limit" (see "Responsive — 380px," above) already documents a label
collision on `personal-safety` at *lower* density than this.

**Option B — chosen. AUS + peer frontier + a named comparator, the rest as a band.**
Three lines: AUS; a **peer frontier** (the best-placed peer *at each year* — not one
fixed country, so it's labelled `FRONTIER`, never an ISO code, since attributing it to
one country would be false the moment a different peer takes the lead); and a
**comparator**, resolved mechanically as the qualifying peer with the smallest
value-gap to AUS at the gauge's own `latestSharedYear` — the same reference point the
band strip's own rank already uses. The remaining qualifying peers collapse into a
light ink-tint min–max band.

**Chosen for the tie to PRECEDENT, not just legibility.** A chart that can point at one
specific line and say "here — this peer, this trajectory" is a content win: it's the
first surface on the site that can show what PRECEDENT's prose asserts, not just state
it. The density argument (Option A's crowding is a documented, lower-density-already-
found problem; Option B comfortably fits every real gauge's peer count) was the
secondary, confirming reason, not the primary one this time — see the Homepage section
above for a case where the density argument *was* the deciding one.

**Amendment, from the site owner's own critique of the chosen option:** a band
summarising two or fewer remaining peers is "one more line with extra steps," not a
real summarisation. The envelope is conditional, not unconditional:

- **5 or more qualifying peers** → frontier + comparator + min–max band (the shape
  above).
- **4 or fewer qualifying peers** → name every one individually, terminal-labelled,
  same as Option A — but Option A's crowding problem doesn't exist at this count: at
  most 5 labels (AUS + 4 peers) ever need placing, well inside what the collision-
  avoidance pass (below) was verified against.

Same component, one branch on qualifying-peer count. **The switch is stated on the
surface**, never left for the reader to infer: a caption above the chart reads
`SHOWING: AUS AND ALL 4 PEERS` in the name-all branch, or `SHOWING: AUS · PEER FRONTIER
· NEAREST PEER (KOR) · REMAINING 6 PEERS AS A RANGE` in the envelope branch — updated
to `NAMED PEER (PRECEDENT)` in place of `NEAREST PEER` whenever the comparator comes
from a PRECEDENT override rather than the mechanical pick (see "The comparator," below).

A "qualifying" peer needs **3+ distinct years of data** — a peer with one or two points
can support a snapshot rank but not a line. This is a materially different bar from R3's
snapshot peer-coverage floor (3 peers minimum for a rank to be coherent at all): a gauge
can clear R3 comfortably while having peers too thin for *this* chart specifically.

### "Too thin" — declared, never a thin chart pretending to be a trend

Same discipline as `n.a.` and `NOT ESTABLISHED`: a gauge needs **AUS itself at 3+ years,
and at least 2 peers each at 3+ years**, or the chart's slot renders a declared statement
instead — `NOT ENOUGH HISTORY FOR A TRAJECTORY`, `--stamp`, naming which of the two
conditions failed. Never an empty region, never a two-point line dressed up as a
trajectory.

### The comparator: mechanical by default, PRECEDENT-aware where it exists

Kept mechanical on purpose — "an editorial pick would be a judgment the site would then
have to defend." But where a gauge's PRECEDENT prose already names a specific peer (an
editorial judgment already made and defended, in a different part of the same page), the
chart must not name a *different* one — `REGISTER_PRECEDENT_COMPARATOR` in
`content/register-draft-lines.ts` (currently empty; no gauge has drafted PRECEDENT
content yet — see "Unexercised in the code," HANDOVER.md) is the override point, checked
before the mechanical nearest-peer pick, resolved by the caller
(`app/table/[plate]/page.tsx`) and passed into `buildGaugeView` — `lib/gauge-view.ts`
and `lib/trajectory.ts` never import content files directly, same separation the
existing `cause`/`precedent` args already keep. If the named peer doesn't itself qualify
(3+ years), `buildTrajectoryView` falls back to the mechanical pick and records that in
`comparatorSource` rather than failing silently. **Standing rule, same shape as the one
already in CLAUDE.md for methodology changes**: whoever drafts a gauge's first PRECEDENT
naming one specific peer adds that peer's code to `REGISTER_PRECEDENT_COMPARATOR` in the
same commit.

### Recharts feasibility call: hand-rolled SVG, not Recharts

Same conclusion this project already reached once, for a related, simpler problem, in
the same file: `RankHistoryChart` (`components/Gauge.tsx`) is a plain inline SVG
`<path>`/`<circle>` line, not Recharts — proof this codebase already chose hand-rolled
SVG for an ink-only trajectory, not a new precedent invented for this pass. Reused, not
just cited: `TrajectoryChart` follows the identical shape (compute a scale, draw a
`<path>`/`<polyline>`, no charting library).

Three reasons this held for the harder, multi-line version too:
1. **Terminal-label collision avoidance needs exact endpoint pixel coordinates** and the
   freedom to nudge one label against its neighbours — Recharts computes its own scales
   internally and doesn't cleanly expose them for this. Getting a label positioned
   precisely at a `<Line>`'s last point, then repositioned based on a *different* line's
   label, is exactly the custom-annotation friction Recharts has fought before.
2. **Terminal labels are plain HTML, not SVG `<text>`** — SVG text scales (and can go
   illegible) with a responsive `viewBox`; HTML text at a real CSS font-size doesn't.
   Same reasoning `DimensionRuler` and `/section/[n]`'s `PositionStrip` already use for
   their own marks. Lines use `vector-effect="non-scaling-stroke"` so stroke width stays
   constant in screen pixels regardless of the responsive `viewBox` scale.
3. **Print/screenshot losslessness is closer to free** with a plain `<svg>` — no
   `ResponsiveContainer` sizing pass, no library version to keep printing consistently.

### Component geometry

- **Lines**: AUS full weight, solid, `--register-ink`. In envelope mode: frontier
  dashed, `opacity .75`; comparator dotted, `opacity .6`. In name-all mode: up to 4
  peers cycle through solid/dashed/dotted/dash-dot at `opacity .55` — texture is a
  secondary aid for tracing a line back to its label, never the primary disambiguator
  (the terminal label is).
- **Band** (envelope mode only): a filled polygon tracing the *non-comparator*
  qualifying peers' min/max per year, `--register-ink` at `8%` fill opacity, no stroke.
  Deliberately excludes the comparator's own value — it already has its own line;
  folding it into "the rest" too would both double-count it and make the `REMAINING N
  PEERS` caption wrong. Frontier, by contrast, *is* computed across every qualifying
  peer including the comparator — excluding it would arbitrarily understate the real
  frontier on a year the comparator happens to hold it.
- **Terminal labels**: ISO code + value, two lines, mono, positioned at each line's true
  endpoint — not every country necessarily reports through the same latest year, so this
  is computed per line, not assumed to be the chart's right edge. **Edge-flip, not a
  reserved margin**: a label anchored at `left: 100%` starts at the container's outer
  edge and only extends *further* right from there — CSS resolves percentage `left` for
  an absolutely-positioned element against the containing block's padding box, so
  reserving right-padding on the container does nothing to give a right-edge label room
  (found by real rendering — a label clipping 12px past a 380px viewport — not assumed
  from the box model). Fixed the same way `YearAxis`'s own edge ticks already are: past
  90% x-position, the label's anchor flips to sit left of its point instead of right.
- **Collision avoidance**: greedy top-down pass enforcing a minimum vertical gap between
  labels sorted by their natural y-position, then a compensating pass if the bottom
  label would overflow past 100%. Bounded by the branch split itself — at most 5 labels
  ever reach this (name-all's 4-peer cap + AUS; envelope mode is always exactly 3) — a
  materially smaller problem than Option A's rejected always-nine case.
- **X-axis**: year, labelled, in mono, 3–4 evenly-spaced ticks (not just start/end) —
  this is the thing the brief named as "currently missing everywhere." No formal y-axis:
  every terminal label already carries its own value, the same "let the endpoints carry
  the number, skip the tick marks" choice `AnchoredSparkline` already makes.

### Placement: tier 2, above the AUS series table, before AUS RANK OVER TIME

The site owner's own instinct, confirmed rather than overridden: the band strip's whole
design point (R2) is scannable-at-a-glance; a multi-line trajectory chart demands active
reading — tracing lines, reading labels — which is investigative, not scanning. It's
thematically a peer of the two dense-layer elements already doing the same "how did we
get here" job (the AUS series table, `RankHistoryChart`), not a peer of the strip. Even
`RankHistoryChart` — one line, already solved — lives in tier 2; a harder new chart
replicating similar complexity has no principled claim to a shallower tier. The
composite's *own* trailing-decade trend already got a real tier-1 promotion, on the
homepage (`AnchoredSparkline`) — what this chart adds is the per-gauge, multi-country
*comparative* trajectory, a more detailed question that belongs at the same depth as the
exact-value table sitting right below it.

### Data: reused, not refetched

Reads `GaugeData.countries[*].series` directly — the same raw source the AUS series
table and the deleted `TimeSeriesChart` (below) already read. No new fetching, no
`pipeline/` changes, no `lib/scoring.ts` changes: `lib/trajectory.ts` is its own file
specifically so this stays presentation-layer derivation (which peers qualify to be
*drawn*) rather than anything about how a gauge is *scored*.

### A pre-existing bug, found and fixed while verifying this

`min-w-0` was missing on the dense layer's left grid column (`components/Gauge.tsx`).
CSS grid items default to `min-width: auto`, so the column refused to shrink below its
widest descendant's intrinsic content width — the AUS series table, one column per year,
36+ for some gauges — dragging the *whole* grid item (including the full peer table
above it) wider than the page and defeating that table's own `overflow-x-auto`.
Confirmed pre-existing, not caused by this pass: reproduced identically with the
trajectory chart's own code fully reverted, on this same branch. Real desktop impact
before the fix: **1280px viewport, 2533px `scrollWidth`** — not a rounding error. Fixed
with one class; verified clean (`scrollWidth === clientWidth`) at both 380px and desktop
afterward.

### A trap in the verification method itself, not just the component

Early runs of the verification script reported a clean 380px `scrollWidth` even before
the `min-w-0` fix landed — a false negative, not a passing test. Cause: Playwright's
Chromium reuses its on-disk HTTP cache across separate `chromium.launch()` calls when
the verification server is reused on the same fixed port between runs, silently serving
a *previous* build's JS/CSS bundle while the file server itself served fresh files from
disk. Caught by re-running the identical check on a never-before-used port and getting a
different (correct) answer, not by trusting a single green result. Fixed by sending
`Cache-Control: no-store` from the verification server and re-confirming on a fresh port
before trusting any number this pass reports. Recorded here because it's a real,
reusable lesson for whoever next builds a local Playwright harness against a static
export on a fixed port — a clean result from a reused port is not evidence.

### Verified, not assumed

Real Chromium (Playwright), no-cache headers, a real gauge (`living-standards`, plate
1.1, envelope mode — 8 qualifying peers) plus a temporary synthetic fixture harness for
the two branches no real gauge exercises yet (below). At both 380px and 1280px: zero
`document.documentElement` overflow; zero terminal-label collisions; zero clipped
labels (after the edge-flip fix); zero `computed-style` hits against any of the five
band hexes or `--accent-australia`'s blue anywhere inside the page's own content region.

**Which gauges hit which branch, checked against real data, not assumed:**
- **Envelope mode: all 20 of 20 scored gauges with a data file** — every real gauge
  currently carries 7 or 8 qualifying peers (`debt-burden`, `housing-pressure`, and
  `work-life-balance` at 7; every other scored gauge at 8). `human-capital-depth` and
  `inequality` have no data file at all yet (Awaiting Data — the trajectory chart simply
  doesn't render, same gate every other dense-layer element already uses).
- **Name-all (4-or-fewer) branch: unexercised by any real gauge today.** Verified
  structurally via a temporary preview harness (three synthetic peers, one deliberately
  omitted for insufficient history) — same "real branches, no real gauge triggers them
  yet" category as PRECEDENT and S1 (see HANDOVER.md, "Unexercised in the code"), not
  untested-full-stop.
- **Too-thin floor: unexercised by any real gauge today**, for the same reason — every
  scored gauge with data clears both conditions comfortably. Verified via the same
  synthetic harness (one single-year peer).

### Deleted: `components/TimeSeriesChart.tsx`

The pre-REGISTER attempt at this exact problem — Recharts, 8 peer lines all drawn
identically in flat grey, one AUS line in `--accent-australia` blue. It solved "AUS vs.
everyone" but never "peer vs. peer": no peer was individually identifiable, no terminal
labels, only a hover tooltip. Confirmed orphaned (repo-wide grep, zero imports) before
deletion — dead code left in place invites someone to revive exactly the pattern this
pass exists to replace. `components/RankChart.tsx` is equally orphaned (same grep) but
was not part of this pass's brief and was left in place, flagged rather than deleted —
see HANDOVER.md.

---

## Required states — build all of them

> **CORRECTED (implementation ruling, 2026).** Two changes to what's below:
> 1. There is a seventh state, **S7 — Unscored**, added after S6. It was
>    missing from this handoff entirely — the tool had no visibility into
>    `unscoredDimensions` (see lib/types.ts), a real, shipped mechanism for
>    a gauge that shows real data but is deliberately excluded from every
>    composite.
> 2. "Geometry is otherwise identical" below (S2) describes S1–S6 only.
>    **S7 does not share the band strip, rank, or delta row** — an unscored
>    gauge has no level score, so drawing a band strip for it would
>    fabricate a position. S7 shares the header/plate/as-of/apparatus/CITE
>    AS chrome with every other state; where the band strip would sit, it
>    renders a declared statement of why there is no score instead. See S7
>    below.
>
> Also: every `Table X.Y` reference below (4.2, 7.6, 6.2, 4.9) is a mockup
> plate number with no corresponding real gauge — see the peer-set note
> above. The real plate assigned to each state's actual gauge is recorded
> in `gauges.config.json`, not here.

### S1 — Standard (gap to diagnose)
CAUSE / PRECEDENT / SCALE all established. Reference: Table 4.2, R&D expenditure.

### S2 — AUS leads the peer set
Rank 1 makes "PRECEDENT" incoherent — there is no one ahead to learn from. Solution
(do not hide it):
- A mono badge beside the plate number: `▲ AUS LEADS`, `1px --ink` border, 10px/.14em.
  Border and ink only — the badge carries no colour.
- **PRECEDENT re-titles to CHALLENGER**, with an inline rubric in the label row:
  `CHALLENGER — replaces PRECEDENT when AUS leads (§3.4)`. Body names the nearest peer,
  its trajectory, and the rate at which it is closing.

  > **CORRECTED (implementation ruling, 2026).** `§3.4` never existed — another
  > dangling mockup citation, same class of problem as the original `§3.1`/`§3.2`
  > (see "Required states" above). Rather than author a fourth methodology
  > section for a purely mechanical rule, the shipped rubric explains the
  > mechanic in plain English in place: *"replaces PRECEDENT when Australia
  > leads: there is no peer ahead to draw precedent from."* No `§3.4` reference.
  > **Do not re-add one** — if a future pass wants a numbered citation here,
  > that's a fresh decision, not a restoration of this line.
- CAUSE becomes cause-of-the-lead. SCALE becomes margin-held, in human units.
- Summary row gains `margin over 2nd: +59`.
- Geometry is otherwise identical, so a leading gauge is visibly the same instrument.
Reference: Table 7.6, median net wealth per adult.

### S3 — Cause not established (first-class editorial state)
The apparatus demands a named cause on all ~24 gauges; a defensible one will not always
exist, and a structure that demands one pushes the site into asserting causation it cannot
support. So:
- Render `NOT ESTABLISHED` in Martian Mono 12px/500, `--stamp` — the same typographic
  status as `n.a.`
- Follow it, in `--ink-2`, with the reason and the pointer:
  "— no attribution currently meets the evidence standard (Methods §3.2). Candidate
  explanations are logged in the source view; none is asserted here."
- The slot keeps its full height and label. It must never look like an empty cell, a
  skeleton, or a TODO. **No "coming soon", no dimming, no placeholder ellipsis.**
- CAUSE and PRECEDENT can each be not-established independently. SCALE is always present
  (it is arithmetic on the gap, not a causal claim).
Reference: Table 6.2 (both not established), Table 4.9 (CAUSE not established, PRECEDENT
present but explicitly non-attributed).

> **EXTENDED (implementation ruling, 2026): a third variant, CONTESTED, not just
> NOT ESTABLISHED.** The inventory behind the reorder above also surfaced that
> "no attribution meets the bar" conflates two different claims: *nobody has
> written this yet* (could change — `NOT ESTABLISHED`) versus *the evidence
> genuinely won't converge on one cause here, and that's the permanent answer*
> (`CONTESTED`). The second is a stronger, more interesting statement than the
> first, and collapsing them loses that. Both render identically — same
> `--stamp`, same typographic weight, same "never an empty cell" rule above —
> only the label word (`CONTESTED` vs `NOT ESTABLISHED`) and the body text
> differ; this is content, not a new visual state. Applied so far to two real
> gauges whose own existing content already argues the case: `life-expectancy`
> (inherently multi-causal — healthcare, chronic disease, injury prevention,
> social conditions all plausibly contribute, with no decomposition that
> isolates one) and `external-position` (its own polarity is a live,
> unresolved economist's disagreement, not just its cause). See
> content/register-draft-lines.ts for both drafts, marked UNREVIEWED.

### S4 — Missing peer data
- Absent peers are **omitted from the strip, declared in a note**: a `1px --chrome` box
  in `--stamp` mono 11px: "n.a. — IRL · KOR · NZL: no comparable estimate published
  (GDIM 2023). Rank and median are computed over the six reporting peers only."
- Rank changes form to `RANK 4 OF 6 REPORTING`; in the overview table, `4/6 rep.`
- Unavailable Δ renders `n.a.` in `--stamp`, never `—`, never blank, never `0`.
- Never silently narrow the peer set. The exclusion is always stated on the surface.
Reference: Table 4.9.

### S5 — Stale
As-of line goes `--stamp` with ` · STALE` appended; threshold = source pull older than
6 months (config). Add the reason where known: "no scheduled refresh — flagged, not hidden".
Overview table as-of cell also goes `--stamp`. Staleness never alters band, rank or value.

### S6 — Inverted axis
Where low = ahead (public debt, export HHI, mobility β), append a mono qualifier to the
gauge name in the overview — `(AXIS INVERTED: LOW = AHEAD)` / `(LOW = AHEAD)` — and put
`LOW = AHEAD` in the unit declaration on the gauge page. Never flip the strip silently.

### S7 — Unscored (added; not in the original handoff)
A gauge with real data that is deliberately excluded from every composite — see
`unscoredDimensions`/`unscoredReason` in lib/types.ts. No level score exists, so nothing
about it may be plotted as a position:
- Header, plate, as-of, apparatus (CAUSE/PRECEDENT/SCALE — still real content, this isn't
  a data-absence state), and CITE AS all render normally, same chrome as every other state.
- Where the band strip would sit: no strip. Instead, a declared statement in Martian Mono,
  `--stamp`, the same typographic status as `n.a.` and `NOT ESTABLISHED`, naming why this
  gauge isn't scored (from `unscoredReason`) — never an empty region, never a skeleton,
  never a dimmed placeholder.
- Rank, band, and delta are absent, not blanked — no "—" standing in for a number that was
  never computed.
- The dense layer still shows the real time series (every country's published values), just
  never framed as a peer-relative comparison.
Reference: cohesion-majority-acceptance (real gauge, see gauges.config.json) — no mockup
reference exists for this state.

---

## Surface: dimension overview — `/section/[n]`

### Header
Masthead + section line (`SECTION 4 · NATIONAL POWER & TRAJECTORY · 10 GAUGES`), then
the dimension title left and the **weighting equation** right, on one line
(`white-space: nowrap; flex: none` — it must never wrap mid-formula):

`YOUR INDEX = [−] 0.60 [+] × POWER + 0.40 × LIFE`

- Steppers: 24×24px, `1px --ink`, mono 13px/700, invert on hover. Step 0.05, clamp 0–1.
- LIFE coefficient is derived (`1 − power`) and displayed at weight 800.
- Coefficients are tabular-nums, two decimals, always.

### Rank strip
9-column grid, `3px --ink` top / `1px --ink` bottom, `1px --grid` verticals.
Each cell: rank (mono 800/17px) · ISO (mono 12px, **800 for AUS**) · composite score
(mono 10.5px, `--ink-2`). AUS cell background `--desk`. Sorted by the reader's index.

### Dagger convention
Any country whose rank differs from the default weighting (0.60/0.40) carries `†` after
its rank. The footnote below the strip then states, in mono 10.5px `--ink-2`:

> † rank differs from the default weighting. Yours: 0.75 POWER / 0.25 LIFE ·
> default: 0.60 / 0.40. Scores are dimension composites, 0–100 (Methods §2).

At default weights the same line instead explains the mechanic. This footnote is the
screenshot-safety device: a screenshot of a reweighted board always carries its own
provenance. **Do not make it dismissible.**

### Gauge table
Columns: TABLE · GAUGE · UNIT · AUS · POSITION AMONG PEERS ⟶ · BAND · RANK · Δ 5 YR · AS OF.
- TABLE cell is the plate number, mono 700, linking to `/table/{plate}` with a
  `--chrome` underline.
- POSITION strip: min 220px, `1px --chrome` left/right ends, peers as `2px × 8px --ink`
  ticks at `opacity .35`, AUS as `◆` at 9px. Min–max normalised per row.
- BAND cell is the band word + ticks; weight rises for BEHIND (700) and FAR BEHIND (800)
  — tertiary channel only, the word and ticks do the work.
- Rows separated by `1px --grid`; last row `1px --ink`.
- Footer, two columns of mono 10.5px `--ink-2`: the legend and full source list
  (World Bank WDI, OECD MSTI & EAG, SIPRI, V-Dem v16, Harvard Atlas, World Bank GDIM,
  UNCTADstat), then the notation key — `STALE` = source pull > 6 months old;
  `n.a.` = not published, declared not hidden; band thresholds under review (§3.1).

**Known open item:** the mini position strips do not draw band boundaries, because
boundaries are per-gauge while the strips are min–max normalised. Once §3.1 settles the
thresholds, decide whether to draw boundary marks per row.

---

## Responsive — 380px (the strict two-column broadsheet must not collapse)
The mobile view must read as *the same site*, not a reduced one:
- Surface padding 24px 20px 32px. Masthead stays, nav reduces to `SECTION 4`.
- Content grid collapses `1fr 340px` → single column; the apparatus block keeps its
  `2px --ink` spine (padding-left 14px) and moves below the strip.
- Band strip: height 96px, column labels at 8px (`FAR BEH. ∙∙∙∙`), **peer values drop —
  ISO codes only**, staggered at 52px / 72px. AUS value 17px/800 stays. The strip is the
  tightest element at this width; it holds because peers stagger on two baselines.
- Summary metrics wrap (`flex-wrap`, gap 8px 20px), peer-median chip drops.
- Plain-language line 15px; apparatus body 13.5px; apparatus labels 9.5px.
- CITE AS block persists (shortened string). Dense layer collapses to a closed bar.
- Nothing is removed that carries the argument: plate number, as-of, peer context,
  all three apparatus lines and the citation all survive.

> **KNOWN DENSITY LIMIT (implementation finding, 2026).** Two-baseline staggering
> assumes peers are placed by score-sorted order (implemented — see
> `components/Gauge.tsx`), which resolves collisions between *adjacent* peers.
> It does not fully resolve every collision when a gauge's peer field is
> unusually dense — e.g. `personal-safety` at 380px, where 5 of its 6 peers sit
> within a tight raw-value cluster: one label collision remains after staggering.
> Confirmed via real rendering (Playwright, real bounding-box overlap
> detection), not assumed. **Not fixed by adding a third baseline** — that would
> depart from this section's explicit two-baseline spec for every gauge to fix
> one dense edge case. Accepted as a known limit: triggers specifically when 3+
> peers on a gauge fall within a score range narrow enough that two alternating
> baselines can't separate all of them. Revisit only if this becomes common
> across more gauges, not for one case.

---

## Responsive — 380px for `/section/[n]` (the dimension overview)

The gauge-page mobile spec above does not cover this surface — building one
without a real decision was the gap that stopped implementation (2026). Ruling:

**The overview's job on mobile is not the desktop table shrunk.** It is: where
does Australia sit, and which gauges are furthest behind. Everything else can
wait for the gauge page, one tap away via the plate link.

Below 640px:

1. **Rank strip** — kept, restructured. Nine columns of rank/ISO/score cannot
   work at 380px. Renders as a single horizontal band with **rank number and
   ISO code only** — composite score dropped. AUS keeps its `--desk` cell
   background and bold weight. If nine still crowds at real rendered width,
   show **AUS plus the three ranked above it and the three ranked below it**,
   with a declared note stating the omission and the full country count —
   never silently truncate, the same rule S4 already applies to missing peer
   data.
2. **Weighting equation** — kept, stacked: the formula may wrap to two lines
   on mobile only. Steppers stay full size and become **44px minimum tappable
   target** (up from the desktop 24px) — a mobile touch-target minimum, not a
   visual scale change.
3. **Dagger footnote** — kept, unchanged, never dismissible. It's the
   screenshot-safety device, and mobile is exactly where screenshots happen.
4. **Gauge table** — this is what actually changes. Nine columns become a
   stacked list, one gauge per row:
   - Line 1: plate number (mono, links to `/table/[plate]`) + gauge name.
   - Line 2: BAND word + ticks, and rank.
   - Line 3: the mini position strip, full row width.
   - Line 4: as-of, in `--stamp` if stale.
   Dropped from mobile: UNIT, AUS raw value, Δ5YR — all three are one tap away
   on the gauge page. Kept: the `‡` marker where `bandRobustness` is
   `"overstates"`, and the cross-reference row (e.g. housing-pressure) exactly
   as it reads on desktop, just restacked into the same row shape.
5. **Footer** (legend + source list) — kept, collapsed behind a closed
   disclosure bar matching the dense-layer toggle's own pattern (`⊞`/`⊟`,
   instant, no animation).

**Rules that do not bend:**
- No horizontal scroll at any width — document-level overflow must measure
  zero, verified by real rendering, not assumed from the classes.
- Sort order and dagger flags recompute identically to desktop — the
  reweighting must work on mobile, since a shareable `?w=` link is the entire
  point of putting the weight in the URL.
- R3 holds without exception: every gauge row still shows peer context via its
  position strip, even in the stacked mobile layout.
- Nothing that carries the argument is dropped: plate, band, rank, peer
  position, as-of, and both dagger conventions (`†` and `‡`) all survive.

---

## Homepage — `/`

Built 2026-08 (`design/register-homepage`), the last of the three surfaces this
handoff's design language now covers. Out of scope for the original REGISTER
pass — the homepage kept its pre-REGISTER dashboard styling through both
`/table/[plate]` and `/section/[n]` shipping, until it started actively
contradicting the methodology the rest of the site states: coloured dots
beside band words, green/red arrows in WHAT'S MOVING, a dark-plus-accent
palette, KPI cards, and a peer strip that carried AUS/peer identity by hue —
R1, and the excluded-defaults list, violated in five different ways on the
one page most visitors land on first. Audited against every component
`app/page.tsx` actually renders (not assumed) before anything was rebuilt;
the audit found more than the five violations above — every `DirectionArrow`
on the gauge grid (not just WHAT'S MOVING), `MaturityTag`'s amber instead of
`--stamp`, `AnchoredSparkline` reused at "mini" size inside `GaugeCard` (the
excluded sparkline-in-a-card pattern), and every gauge card linking to the
retired `/gauges/[slug]` redirect with no plate number shown at all — R8,
silently unmet.

### The design problem: two verdicts, no colour

Both dimension composites (Power, Quality of Life) are computed on the exact
same 0–100 scale with the exact same five band thresholds as every
individual gauge (`gaugesConfig.scoreBands` — one global set, not
per-dimension). Structurally, a dimension verdict *is* a gauge: one AUS
score, eight peer composites, one band. That's the real argument for reusing
`<Gauge>`'s band-strip treatment outright — but it also opens a second,
genuinely different option, so both were argued before anything was built.

**Option 1 — reuse the full band strip as-is.** Labelled band columns, AUS
`◆` plus all eight peers individually plotted by ISO code, same channel
order as every gauge page (R2). Maximum consistency, and shows the real
*shape* of the field (clustered vs. isolated), which is genuine diagnostic
value.

**Option 2 — compact position marker, chosen.** Same channel order, but AUS
is the only mark plotted; the other eight peers are summarised in a text
line beneath (rank, peer median, movement tally) rather than individually
placed.

**Why Option 1 was rejected — evidence, not preference.** A dimension
composite always carries the full 8-peer set (composites don't drop peers
the way an individual gauge occasionally does with a real data gap) — the
*densest* possible case for the band strip. DESIGN.md's own "known density
limit" finding (see "Responsive — 380px," above) already documents one label
collision on `personal-safety` at 380px with only 5 of 6 peers clustered
tight — a *lower* density than every dimension verdict carries unconditionally,
every time, on both rulers, stacked, on the first page a visitor sees. That's
a documented breaking point being walked into deliberately, not a stylistic
call. Confirmed, not just reasoned: Option 2 was built and verified by real
Playwright rendering at 380px and desktop — zero document-level overflow,
zero clipped marks, zero truncated labels — the failure mode Option 1 would
have risked never had a chance to occur.

**The stronger positive, not just the safer choice.** Because both
composites share identical band thresholds, drawing both rulers at identical
width makes them directly, visually comparable — a reader can see at a
glance that Power's mark sits in a different band-fraction than Quality of
Life's, on one shared scale. That reads the two verdicts against each other,
which is closer to what "two verdicts, the tension is the point" is actually
asking the page to do than two independent, denser strips would be.

### Component: `<DimensionRuler>`

One component, no density prop — it's homepage-only, built once for exactly
two call sites (Power, Quality of Life), never reused at gauge-page density.

**Geometry, top to bottom:**
1. Dimension name (Public Sans, bold) left; band word + tick glyph
   (`SLIPPING ∙∙∙∙`) right, same tick-glyph set as every gauge
   (`gaugesConfig.scoreBands[].ticks`).
2. Tagline, one line, `--ink-2`.
3. The ruler: five band segments, widths from `(max − min + 1) / 101`
   (the same proportion `lib/gauge-view.ts`'s private `buildBands` computes
   for the full strip — recomputed locally here, not imported, since this
   component intentionally never touches `lib/scoring.ts` or
   `lib/gauge-view.ts`), `1px --ink` top / `1px --chrome` bottom / `1px
   --grid` verticals between segments — identical frame convention to
   `<Gauge>`'s `ScoredStrip`. AUS is a single `◆`, positioned at
   `left: score%`, `aria-label="Australia: {score} of 100, band {band}"`
   (the accessible name carries the value; the glyph is `aria-hidden`, same
   rule as every other band rendering on this site).
4. Band column labels beneath the ruler, `--ink-3`, uppercase. **Two label
   sets, not one**: the full word at `sm:` and above; a fixed abbreviation
   below `sm:` (`FALL.BEH.` / `SLIPPING` / `HOLD.` / `STRNGTH.` / `LEADING`)
   — found necessary by real rendering, not designed in from a guess: the
   narrowest column (Holding, ~15% width) can't hold its full word at a
   legible size at 380px, and even the full-word desktop row needed its
   tracking tightened by real measurement (a 3px scrollWidth/clientWidth
   overflow on "Strengthening," caught by a direct truncation check, not
   just eyeballing a screenshot). This is this site's first real 5-band
   abbreviation set — the gauge page's own 380px spec only ever documented
   the mockup's fictional 4-band set, so there was no existing shorthand to
   inherit.
5. The AUS score, positioned at the same `left: score%` as the mark
   (`38.6`-style, Martian Mono, extrabold), directly beneath the labels row.
6. **The R3 line** — rank, peer median, movement tally, `flex-wrap`, in the
   same component, immediately below the score, never behind a toggle or a
   fold. This is what makes Option 2 satisfy R3 without individually
   plotting peers: `RANK 7th OF 9 · PEER MEDIAN 48.2 · 2 IMPROVING · 6 FLAT
   · 6 DETERIORATING (TRAILING DECADE)`. Peer median is computed locally in
   `DimensionVerdict` (a small private `median()`, mirroring but not
   importing `lib/scoring.ts`'s own private helper of the same shape) —
   the one piece of derived arithmetic this pass added, kept in the
   component layer specifically so `lib/scoring.ts` itself stays untouched.

**What sits below the ruler, unchanged in kind:** the trailing-decade
composite trajectory (`<AnchoredSparkline>`, kept — see below) and WHAT'S
MOVING (kept, recoloured).

### Trend chart and WHAT'S MOVING — kept, recoloured, not rebuilt

The trailing-decade composite trajectory is a genuinely different concern
from peer position (it's Australia's own number over time, not a
peer-relative comparison), so Option 2's argument doesn't apply to it — nothing
here needed to lose real information to satisfy R3. `<AnchoredSparkline>`
stays, at hero size only: stroke and fill are now `--register-ink`
(a bare line, `opacity .12` fill, no gradient-as-decoration), reference
lines `--register-grid`, tooltip restyled to paper/ink/chrome/mono. Its
"mini" size — the actual excluded sparkline-in-a-card pattern, previously
dropped into `GaugeCard` — is gone from both the call site and the
component's own type, not left as an unused option inviting the pattern
back. Its `bands` prop was narrowed to `bandBoundaries: number[]`
(plain numbers, computed server-side) specifically so the deprecated
`ScoreBand.color` field never has to be serialised into this "use client"
component's hydration payload at all — confirmed by grepping the built
static output for every band hex and finding zero, not assumed from the
props not being read.

WHAT'S MOVING keeps its glyphs (`▲`/`▼`/`→`) and structure; the riser/faller
distinction is now font-weight only (R2's tertiary channel) — bold for the
one that actually rose/fell, regular for "held up best"/"least improved" —
never `--status-good`/`--status-critical`.

### The gauge grid

Every `GaugeCard`, `AwaitingDataCard`, and `UnscoredGaugeCard` on this page
is homepage-exclusive (confirmed by repo-wide grep before rewriting any of
them — nothing else imports these three), so all three were rebuilt fully
onto REGISTER tokens/typography/zero-radius, not just recoloured on the old
palette:
- **R8 met for real**: every card shows its plate number and links straight
  to `/table/[plate]`, not the retired `/gauges/[slug]` redirect.
- **Peer position** on each card reuses `/section/[n]`'s own `PositionStrip`
  convention exactly (ink ticks at `opacity .35` for peers, `◆` for AUS,
  `border-chrome` ends) — not the old `DotStrip`'s blue/grey identity-by-hue,
  and not a new pattern invented for this pass.
- **Band word + tick glyph** replaces the old accent-blue score number as
  the headline value on each card.
- Every card is built directly off `buildGaugeView`'s `ScoredGauge` (the
  same view model `/table/[plate]` and `/section/[n]` already trust) rather
  than recomputing band/rank/delta independently — so the grid can never
  quietly disagree with a gauge's own page on what its band or rank is.
- **The R8 reuse amendment, implemented for the first time here**: a gauge
  scored in two dimensions (`housing-pressure` is the only current case)
  gets a `<CrossReferenceCard>` on its non-primary dimension's grid instead
  of a second full card — same wording, same rule as `/section/[n]`'s own
  cross-reference row (`"{name} — scored in {primary dimension}, not a
  separate table here. See Table {plate}."`). The homepage grid rendered
  this gauge as two independent full cards before this pass; not a
  duplicate-*route* problem (both already funnelled through
  `/gauges/[slug]`'s redirect to the one real plate), but a
  duplicate-*prominence* one — R8's "never a second `Table X.Y`" is about
  the reader's impression as much as the URL.

`DirectionArrow.tsx` and `DotStrip.tsx` are deleted, not deprecated —
confirmed orphaned by repo-wide grep after the rewrite (nothing imports
either), same "don't leave it as dead code" discipline as every retired
pipeline fetcher in CLAUDE.md.

### `ScoreBand.color` — one reader down, one left

`DimensionVerdict` no longer reads `ScoreBand.color` — the colour dot next
to the band word is gone, replaced by `<DimensionRuler>`. Per the standing
rule on that field (`lib/types.ts`), removing it outright requires
confirming *nothing* still reads it. Grepped the full repo after this pass:
one reader remains, `app/methodology/page.tsx` (a band-threshold legend with
a colour swatch per band — itself a real R1 violation, on a page this pass
never touched). **The field stays** — the condition for removing it isn't
met yet. Flagged here rather than fixed silently: Methodology is a
pre-REGISTER page, out of scope for a homepage pass, and deserves its own
deliberate pass rather than a drive-by fix bundled into this one.

### Header and Footer — deliberately unchanged

`Header`/`Footer` (`app/layout.tsx`) still render on the old token set
(`--surface-1`, `--text-primary`, etc.), which still flips under
`prefers-color-scheme: dark` — meaning even this REGISTER-styled homepage
has a header and footer that can go dark while its own content stays fixed
paper/ink. **This is not new to this pass.** `/table/[plate]` and
`/section/[n]` already made exactly this choice: `.register` scoping is
applied to each page's own content `<div>`, never to Header/Footer, which
render outside it in the shared root layout. This pass follows that same
precedent rather than expanding scope to fix something no REGISTER surface
has touched yet. Recorded here as a decision, not an oversight: Header/Footer
getting the same paper/ink/zero-radius treatment as every REGISTER surface
is real, future, in-scope work — a separate pass, deliberately not this one.

### Verified, not assumed

Real Chromium (Playwright), not reasoned from the classes: 380px and
1280px viewports, both dimension rulers, the full gauge grid. Checked
directly, each with its own signal (not inferred from the others): zero
`document.documentElement.scrollWidth` overflow at 380px; zero clipped
`◆` marks at either width; zero `.truncate` elements whose visible child's
`scrollWidth` exceeds its container (caught the "Strengthening" 3px overflow
this way, not by eye); zero computed-style `color`/`background`/
`border-*`/`fill`/`stroke` matching any of the five band hexes or
`--accent-australia`'s blue anywhere inside the page's own `.register`
content region. The one coincidental hit before scoping to `.register`
— `#898781`, shared by `--text-muted` and the unused "Holding" band colour
— was traced to `Footer`'s unrelated, untouched styling before being ruled
out, not assumed benign.

### A real bug, found later: inherited colour falling through to `<body>`

Added 2026-08 (`design/register-card-trend`). WHAT'S MOVING's gauge name,
delta value, and "over N yrs" text had no explicit colour and inherited
from `<body>` — the *old*, still dark-mode-switching `--text-primary`
token, not `--register-ink`. In light mode that's a near-black close
enough to pass casual inspection; in forced dark mode it's white, against
the `.register` region's deliberately-fixed light paper — illegible,
reported as "fades out mid-sentence." Not a mask, clamp, or overflow —
confirmed by walking the ancestor chain (`overflow`, `textOverflow`,
`maskImage`, `webkitLineClamp` all came back inert at every level) and
only found by checking `getComputedStyle(...).color` directly in forced
dark mode, where it read `rgb(255, 255, 255)`. Every other homepage
component root (`GaugeCard`, `AwaitingDataCard`, `UnscoredGaugeCard`,
`CrossReferenceCard`, `DimensionRuler`, `AnchoredSparkline`, the maturity
banner) sets an explicit fixed-ink colour at its own root and was checked
clean — this was isolated to one block, not systemic on the homepage.
**Fixed** with one class (`text-ink` on the wrapping grid div, so the
whole block inherits the fixed token instead of `<body>`'s) — verified
clean (`rgb(32, 34, 36)` in all four combinations) at 380px and desktop,
light and forced-dark, real Chromium, `Cache-Control: no-store`.

**Same class of gap, checked on `/table/[plate]` and `/section/[n]`
— clean.** Both are `.register`-scoped surfaces built before this bug
class was known, and every earlier verification pass on them ran in
light mode only — real cause for suspicion, not assumed fine. Audited
directly: real Chromium, forced dark, both widths, across a spread of
render branches chosen for coverage (scored/envelope-trajectory,
`SAMPLE_DATA`, unscored/S7, a reused gauge's `reuseNote`, awaiting-data,
both dimension overviews) — every leaf text element inside `.register`
checked by computed luminance, not sampled by eye. Zero flags, all 28
combinations (7 pages × 2 widths × 2 schemes). The detector itself was
sanity-checked against the *pre-fix* homepage build in the same pass and
correctly flagged all 8 known-bad elements at `luminance: 1` — a clean
result from an unvalidated checker isn't evidence; this one earned it.
Root cause, confirmed structurally too: both `Gauge.tsx` and
`SectionOverview.tsx` set `text-ink` on their single top-level wrapper
that everything else nests inside (no separate un-nested siblings the
way the homepage's `DimensionVerdict` — itself lacking a root ink colour
— had room for one), and neither file references any old dark-switching
token anywhere (repo-wide grep). **Not a guarantee against a future
instance of this bug class on these pages** — a future edit could still
introduce an un-colored element outside that root's reach — but nothing
in the pages as they exist today.

### Homepage gauge card — ghost mark (Option A)

Added 2026-08. The 24 gauge cards showed current peer positions (the tick
strip) and a text delta, but no shape of movement — the dimension verdict
cards above them do (the trailing-decade sparkline), the cards themselves
didn't. Two options were argued: **A** — no new chart, make the existing
tick strip do more work by adding a second, past-position mark for
Australia on the same strip, so movement reads as displacement. **B** — a
minimal multi-point trend line, tiny and ink-only. **A shipped.** B's own
honest answer to "what does a shape tell a reader that the words don't"
was a real one — *whether the move was steady or sudden* — but B could
not be honestly distinguished from the sparkline-in-a-card pattern this
site already excluded from `GaugeCard`: the exclusion was never about
size or point-count, it was about the pattern (a rendered curve over
multiple time points, in a card, repeated 24 times), and a smaller
version of that is still that. Building it would have been rationalising
around a rule this project has otherwise held to. A's honest answer to
the same question is narrower — *peer-relative anchoring for a number
currently stated only in Australia's own terms* — and that's the claim
actually shipped, not oversold as "shape."

**What it shows**: a hollow `◇` at Australia's peer-relative score at the
delta window's *start* year, a filled `◆` at its current score (unchanged
from before), same tick strip, same 0–100 coordinate space peer marks
already use. A thin `--chrome` connector between them — **tested with and
without in a real render, not assumed**: without it, the two diamond
marks read as two more entries in the peer-tick field, indistinguishable
from the actual peer ticks at a glance; with it, the pair reads
immediately as one displacement, at both 380px and desktop. Shipped with
the connector.

**A real, honest thing it revealed on the first gauge checked**
(`living-standards`, Table 1.1): the delta text reads "+7.7% ⟶ widening"
— Australia's own GDP per capita *rose*. The ghost mark shows the
opposite direction on the peer-relative scale: the hollow 2015 mark sits
*ahead* of the filled 2025 mark. Both are true and consistent — peers
grew faster, so Australia's absolute growth still cost it relative
ground, matching the gauge's own `SLIPPING` band. This is exactly the
kind of thing peer-relative anchoring exists to surface, and exactly what
the raw-value delta text alone can't say.

**Data**: `deltaStartYear`/`deltaStartScore`/`deltaEndYear` added to
`ScoredGauge` (`lib/gauge-view.ts`), computed once in `buildGaugeView` —
`deltaStartYear`/`deltaEndYear` come straight from the `rawTrend` window
already computed there (`computeRawValueTrend`); `deltaStartScore` is one
more call to the already-exported `computeLevelScore`, at that exact
year — no new scoring math, nothing touched in `lib/scoring.ts` itself.
**Never interpolated**: `computeLevelScore` returns `null` on its own if
fewer than two countries reported that exact year (a real, if less
common, gap than the raw value having a point there — `computeRawValueTrend`
only requires Australia's own data). `deltaStartScore: null` renders the
current mark alone, no ghost, no connector — never a mark at a guessed
position. Unexercised today: all 20 of 20 currently-scored gauge cards
have a value at their delta's start year, so the "no ghost" branch is
real, type-checked code with no live trigger yet — same "unexercised, not
untested" category as several other branches already logged in
HANDOVER.md.

**Accessible name states both positions and the year**, since the
displacement is the information a sighted reader gets from the marks: the
ghost + connector + current mark are grouped under one `role="img"` with
a combined `aria-label` (e.g. *"Australia: 57 of 100 in 2015, 42 of 100
in 2025"*) — verified present in a real render, not assumed from the
JSX. Peer ticks keep their own individual `title` attributes, untouched,
outside this group.

**Verified**: real Chromium, `Cache-Control: no-store`, 380px and desktop,
light and forced-dark. Zero document overflow, zero colour anywhere in
the page's `.register` region (computed-style sweep, same banned-hex list
as every other pass), accessible labels confirmed present and correctly
worded on real cards.

---

## State Management
- `dense: boolean` — per-gauge disclosure. Consider persisting the reader's preference.
- `weightPower: number` (0–1, step .05, default .6) — dimension weight. Should live in the
  URL (`?w=0.75`) so a reweighted board is shareable and citable; the dagger footnote then
  travels with the link.
- `copied: boolean` — citation feedback, 1600ms timeout.
- Derived: composite scores, ranks, dagger flags, band assignment, peer median,
  reporting-peer count. All derived server-side from the pipeline where possible.
- Data fetching: gauges are static per monthly build → ISR/static generation with a
  monthly revalidate is the right shape. Staleness is computed from source pull date
  vs threshold at build time, and must be re-evaluated per build, not stored.

## Interactions
- Dense layer toggle: instant, no animation. This is a document, not an app.
- Stepper: instant recompute of strip, ranks, daggers, footnote.
- Copy citation: clipboard write + label swap.
- Hover: links darken underline `--chrome` → `--ink`; buttons invert; toggle bar `opacity .7`.
- No page transitions, no scroll animation, no reveal-on-scroll.

## Content & liability
Every CAUSE in the built examples is a **data statement with a citation** (ABS 8104.0
business R&D series; RBA Bulletin March 2024 decomposition; OECD MSTI on KOR's GERD
trajectory), not a policy assertion. Keep causal claims narrow and attributable; where you
cannot, use the NOT ESTABLISHED state (S3). Policy claims are the highest-liability content
on the page — the design gives you a dignified way to decline, so use it.

## Accessibility
Colourblind-safe by construction (R1) and lossless on a monochrome laser printer — verify
both after any change. The tick glyphs must be in the accessible name of the band, not
decorative: render band as e.g. `aria-label="Band: behind"` with the glyph
`aria-hidden`. Peer marks in the position strips need text alternatives (a visually
hidden table is the honest answer, and it is also the print fallback).

## Assets
None. No images, no icons, no flags (R7). `◆ ▲ ∙ ⟶ ⟵ ⊞ ⊟ † ·` are text glyphs — confirm
they render in Martian Mono at your weights; substitute from the body font if any is missing.

## Files
- `Register.dc.html` — the design reference. Panels: `#1a` gauge page (live dense-layer
  toggle and citation copy), `#1b` overview (live weighting steppers, daggers, footnote),
  `#1c-a/b/c` awkward cases A–C, `#1d` 380px gauge page.
- `support.js` — prototype runtime only. **Not part of the handoff**; do not port.
