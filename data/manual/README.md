# Manual-lane data entry — all gauges

This folder holds the download template and instructions for every gauge
that isn't fetched automatically by `npm run pipeline`. Two gauges are
here as of Phase B's close: **Productivity** and **Human capital depth**,
both OECD series where the automated SDMX API route didn't pan out (full
reasoning in `CLAUDE.md`). Education will join this lane in Phase C.

The process is the same for every gauge here — only the OECD website
filters and the target file differ:

1. **Download** the series from its source website, filtered to the 9
   peer countries (see the per-gauge section below for the exact filters).
2. **Fill in the template CSV** for that gauge (`<gauge-id>-template.csv`
   in this folder) — 4 columns: `country_code,country_name,year,value`.
   Delete the `EXAMPLE_DELETE_THIS_ROW` placeholder row first. Only add a
   row for a country/year you have a real published number for — **never
   guess a value for a gap.** A missing year is disclosed honestly on the
   site; a fabricated one isn't allowed.
3. **Hand the filled CSV to Claude Code** (paste its contents, or point to
   the file). It converts it into `data/processed/<gauge-id>.json` in the
   same shape every other gauge uses, with `provenance.status: "LIVE"` and
   a note that the data was entered by hand, on that date — never
   presented as pipeline-fetched.
4. **Revisit periodically** — these sources aren't checked by the monthly
   Actions run. Both gauges below update roughly annually at most on the
   source's own schedule, so once or twice a year is plenty.

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
