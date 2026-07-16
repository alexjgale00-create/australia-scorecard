# Manual-lane data entry — all gauges

This folder holds the download template and instructions for every gauge
that isn't fetched automatically by `npm run pipeline`. As of 2026-07-16,
that's 3 gauges: **Productivity** and **Human capital depth** (OECD series
where the automated SDMX API route didn't pan out — full reasoning in
`CLAUDE.md`); and **Inequality** (OECD Gini — blocked from this
environment every attempt, see below). **Education** (PISA) has real data
entered but stays in this folder's process going forward (OECD publishes
no fetchable endpoint for it, by design, not oversight — see below).
Three other gauges originally planned for this lane turned out to be
automatable after all, verified live before being wired in: **Military
capability** (SIPRI) and **Economic complexity** (Harvard Atlas), both
2026-07-14, and **Internal cohesion** (V-Dem's `v2cacamps`, via Our World
in Data's re-publication — V-Dem's own dataset stays registration-gated,
but OWID's maintained mirror isn't), 2026-07-16. All three now fetch by
`npm run pipeline` like any other gauge; see `CLAUDE.md` for the full
per-gauge reasoning on which stayed manual and why.

The process is the same for every gauge here — only the source website's
filters, the template's columns, and the target file differ:

1. **Download** the series from its source website, filtered to the 9
   peer countries (see the per-gauge section below for the exact filters).
2. **Fill in the template CSV** for that gauge (`<gauge-id>-template.csv`
   in this folder). Delete the `EXAMPLE_DELETE_THIS_ROW` placeholder row
   first. Only add a row for a country/year you have a real published
   number for — **never guess a value for a gap.** A missing year is
   disclosed honestly on the site; a fabricated one isn't allowed.
3. **Hand the filled CSV to Claude Code** (paste its contents, or point to
   the file). It converts it into `data/processed/<gauge-id>.json` in the
   same shape every other gauge uses, with `provenance.status: "LIVE"` and
   a note that the data was entered by hand, on that date — never
   presented as pipeline-fetched.
4. **Revisit on the gauge's own cadence** — these sources aren't fetched
   by the monthly Actions run, but it does check each manual gauge's age
   against its own cadence and flags it as "due for a refresh" (not a
   failure) once it's overdue. See each gauge's `staleAfterMonths` in
   `gauges.config.json` — PISA is checked every ~4 years, the OECD-sourced
   gauges roughly annually, not on one blanket schedule.

## Country codes (all gauges use the same 9 peers)

| OECD country name | code |
|---|---|
| Australia | AUS |
| Canada | CAN |
| United Kingdom | GBR |
| New Zealand | NZL |
| Korea | KOR |
| Netherlands | NLD |
| United States | USA |
| Germany | DEU |
| Japan | JPN |

---

## Education

**Measures:** average of PISA's three domain scores (reading,
mathematics, science) for 15-year-olds.

**Template columns are different from the other gauges here:**
`country_code,country_name,year,reading,mathematics,science` — three raw
score columns, not one `value` column. PISA never publishes a pre-blended
"mean of all three" figure; this gauge computes that average from the
three real domain scores you enter, so the source numbers stay traceable
rather than handing over an already-averaged figure with no way to check
it. When you hand the CSV to Claude Code, it computes the average per
country/year — you don't need to.

**Cadence:** every 3-4 years, not annual — don't be alarmed if this gauge
doesn't get a "due for a refresh" flag for years at a stretch, that's
correct. **PISA 2025 results are due 8 September 2026** — if that's close
when you're reading this, it may be worth waiting for the new cycle
rather than entering 2022 data now.

**Download steps:**

1. Go to **https://pisadataexplorer.oecd.org/** (OECD's official PISA
   data tool — avoid third-party mirrors/aggregators for this).
2. Build a table of mean reading, mathematics, and science scores by
   country, for as many PISA cycles as you want (2003, 2006, 2009, 2012,
   2015, 2018, 2022, and 2025 once published) — the 9 peer countries
   below.
3. Fill in `education-template.csv` with the three raw domain scores per
   country/year — not an average.

---

## Productivity

**Measures:** GDP per hour worked (USD, constant prices, 2015 PPPs).

**Why manual:** the raw OECD SDMX API for this series
(`OECD.SDD.TPS,DSD_PDB@DF_PDB_LV,1.0`) carries OECD's own
`NonProductionDataflow=true` annotation and redirects automated requests
to an archive endpoint that throws a generic server error, not a "your
query is wrong" error — OECD's own infrastructure signalling this
dataflow isn't meant to be queried this way by a script. **The website
itself works fine** — data-explorer.oecd.org is a live, current product;
it's only automated API calls that hit the broken path.

**Download steps:**

1. Go to **https://data-explorer.oecd.org/** and search **"Productivity
   levels"** (dataflow `DSD_PDB@DF_PDB_LV`, agency `OECD.SDD.TPS`).
2. Filter to: **Measure** = GDP per hour worked ("GDPHRS"); **Unit** = USD,
   constant prices, 2015 PPPs; **Frequency** = Annual; **Reference area**
   = the 9 countries above.
3. **Download → CSV**, then fill in `productivity-template.csv`.

## Human capital depth

**Measures:** share of 25-34 year-olds with completed tertiary education
(% of that age group).

**Why manual:** the OECD API for this series
(`OECD.EDU.IMEP,DSD_EAG_LSO_EA@DF_LSO_NEAC_DISTR_EA`) was attempted three
times with different query keys and never returned data — two attempts
got HTTP 404 with no actionable diagnostic on which part of the query was
wrong.

**Download steps:**

1. Go to **https://data-explorer.oecd.org/** and search **"Educational
   attainment"** (OECD's Education at a Glance).
2. Filter to: **Sex** = Total; **Age** = 25-34 years; **Educational
   attainment level** = Tertiary education; **Measure** = Percentage of
   population; **Frequency** = Annual; **Reference area** = the 9
   countries above.
3. **Download → CSV**, then fill in `human-capital-depth-template.csv`.

If any exact filter label above doesn't match what you see on the site
(OECD renames things sometimes), pick the closest match — the goal is
always "this measure, this age group, this level, % of the age group, all
years available, all 9 countries."

---

## Inequality

**Measures:** the Gini coefficient for disposable income (0-1 scale,
higher = more unequal). **Only Gini feeds this gauge's score** — see
below.

**Two sources, one score:** OECD Gini scores this gauge; the World
Inequality Database's top-wealth-share figure is shown on the gauge
detail page as context — a separate, dashed-border box below "Why this
matters", clearly labelled "not part of this gauge's score" — since
income and wealth inequality are different things and forcing them into
one blended number would obscure that (site owner decision, 2026-07-14,
see `CLAUDE.md`). **The display is now built** (`data.contextSeries` in
`lib/types.ts`, rendered in `app/gauges/[slug]/page.tsx`) — it just has no
data behind it yet for this gauge, so nothing shows until you fill in
`inequality-wid-context-template.csv` below and hand it over.

**Attempted an automated fetch first (2026-07-14):** OECD's SDMX endpoint
for the Income Distribution Database returned a Cloudflare
bot-protection page on 3/3 attempts from this environment — the same
intermittent block documented elsewhere in this project. Rather than
build a fetcher against a dataflow whose actual structure was never
verified, this stays manual. If a future session can reach
`sdmx.oecd.org` reliably, this is worth re-attempting — see `CLAUDE.md`.

**Download steps (Gini — required, scores the gauge):**

1. Go to **https://data-explorer.oecd.org/** and search for the **Income
   Distribution Database** (dataflow `DSD_WISE_IDD@DF_IDD`, agency
   `OECD.WISE.INE`).
2. Filter to: disposable income, Gini coefficient, the 9 peer countries.
3. Download → CSV (top-right download button → "Select data only (.csv)"),
   then fill in `inequality-template.csv`.
4. **Expect gaps.** OECD's Gini data updates on a rolling basis with
   uneven lag — some countries' latest available year may be 2-3 years
   behind others'. Leave those years blank; don't estimate a gap.

**Download steps (WID wealth share — optional, context only):**

1. Go to **https://wid.world/**, find each of the 9 countries' page, and
   note the top 1% wealth share by year.
2. Fill in `inequality-wid-context-template.csv` (same 4-column format as
   every other template here) and hand it over whenever convenient — this
   one never blocks the gauge's actual score, so there's no rush.

---

**Internal cohesion moved out of this folder 2026-07-16** — now fetched
automatically via `pipeline/lib/vdem.mjs` (V-Dem's `v2cacamps`, via Our
World in Data's re-publication; V-Dem's own dataset stays
registration-gated). See `gauges.config.json`'s `dataPolicy` for that
gauge and `CLAUDE.md`'s "Internal cohesion: automated via OWID" entry for
the coverage verification and the two OWID export quirks the fetcher
works around.
