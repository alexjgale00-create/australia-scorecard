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

**R4 — Recency is visible.** Every gauge carries an as-of date, set in mono, treated as
information not fine print. Stale and unavailable data are declared, never hidden.

**R5 — Stamp colour carve-out.** Exactly one non-ink colour (`--stamp`) exists, used
*only* for: as-of dates past the staleness threshold, `n.a.` notation, revision marks,
and the `NOT ESTABLISHED` notation. Data age and declared absence are structural
metadata, not performance. `--stamp` must never touch a value, a band, or a rank.

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
- **AUS time series** as a two-row mono table (years / values), tabular-nums; missing
  years render `n.a.` in `--stamp`.
- **Right column:** DEFINITION (full statistical definition, cite the manual),
  REVISIONS (what changed, when, plus a `REV 2026-05` mono tag in `--stamp`),
  SOURCES (every source named; explain the monthly-pull vs annual-source-cadence
  distinction so the as-of date is not mistaken for the observation year).

The dense layer is the same page and same component — never a separate "advanced" view.

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
