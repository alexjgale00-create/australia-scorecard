# Manual-lane maintenance checklist

Replaces `docs/intern-data-collection-brief.md`, retired 2026-08-26 — see
HANDOVER.md for why. This is **not** a role description or an onboarding
document. It's the thing to glance at periodically to answer one question:
*is anything in the manual lane due, and if so what do I actually do?*
Should read in about two minutes.

Full download filters, template columns, and the CSV → JSON conversion
process for every manual gauge live in `data/manual/README.md` — that file
is the source of truth for *how*. This file is only the schedule and the
top-level *what/when*.

## The process, in five steps

1. Check the table below (or `/status`, or the monthly pipeline report) for
   anything flagged "due for a refresh."
2. Open `data/manual/README.md`, find that gauge's section, follow its
   download steps from **data-explorer.oecd.org** (or the gauge's own
   listed source).
3. Fill in the template CSV, then log the pull in
   `data/manual/collection-log.csv` — one row, with the **real** collector
   (never a placeholder name) and the real pull date.
4. Hand the CSV to Claude Code to convert into `data/processed/<id>.json`.
   **If the gauge is Productivity, Education, or Work-life balance**, also
   update its matching entry in `content/register-draft-line-facts.json` —
   the build's REGISTER_DRAFT_LINES guard fails loudly (not silently) if
   the stored numbers drift from the refreshed data. See
   `data/manual/README.md`'s note on this for which gauges are affected and
   why.
5. Run `npm run build`. The guards (peer-coverage floor, undeclared gaps,
   draft-line drift) fail loudly on anything wrong — don't push past a red
   build; the error message names exactly what to fix.

## What's due, when, from where

| Gauge | Cadence | Source | Note |
|---|---|---|---|
| Productivity | ~15 months | data-explorer.oecd.org, "Productivity levels" — GDP per hour worked, USD, constant prices, **2020 PPPs** | OECD retired the 2015-PPP filter 2026-06-04 — don't look for it, it's gone, not just relabelled. Site's own unit is already 2020 PPPs. |
| Human capital depth | ~15 months | data-explorer.oecd.org, "Educational attainment" | 25-34 age band, tertiary, % of population |
| Work-life balance | ~15 months | data-explorer.oecd.org, "Average annual hours actually worked" | The 1995-2019 data already on file doesn't need re-entering — only new years |
| Inequality | ~24 months | data-explorer.oecd.org, Income Distribution Database, Gini (disposable income) | Australia's own series may genuinely have nothing newer to report — that's a valid, loggable outcome, not a failed pull (confirmed 2026-08-26; see `data/manual/collection-log.csv`) |
| Education (PISA) | every 3-4 years | pisadataexplorer.oecd.org | PISA 2025 results due 8 September 2026 — worth waiting for the new cycle if you're reading this close to that date |
| Cohesion — majority acceptance | dated triggers, not a fixed cadence | Gallup Migrant Acceptance Index (news releases, not a bulk download) | Unscored gauge, no `staleAfterMonths`. Four named upgrade triggers are tracked in METHODOLOGY.md's "Majority-attitude source search" — nearest is a standing annual check starting 2027-08-25 |

The exact per-gauge `staleAfterMonths` values (the real numbers behind
"~15 months" etc. above) live in `gauges.config.json`; `/status` and the
monthly pipeline report both compute "due for a refresh" from those
automatically. This table is for a human scanning at a glance — check
`gauges.config.json` or `/status` if you need the precise figure.
