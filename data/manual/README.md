# Manual-lane data entry — all gauges

This folder holds the download template and instructions for every gauge
that isn't fetched automatically by `npm run pipeline`. As of Phase C:
**Productivity** and **Human capital depth** (OECD series where the
automated SDMX API route didn't pan out — full reasoning in `CLAUDE.md`),
and **Education** (PISA, only ever published every 3-4 years, never
fetched automatically by design).

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
