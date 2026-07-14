# Human capital depth — manual data entry instructions

**What this gauge measures:** the share of 25-34 year-olds who have
completed tertiary education, for each of the 9 peer countries.

**Why this is manual, not automatic:** the OECD API for this series was
attempted three separate times with different query keys (see `CLAUDE.md`
for the full history) and never returned data — two of the three attempts
got HTTP 404 "no matching data" with no actionable detail on which part of
the query was wrong. Rather than keep guessing against an API that isn't
cooperating, this gauge is sourced by hand instead.

## Step 1 — Download the data from OECD

1. Go to **https://data-explorer.oecd.org/**.
2. In the search box, search for **"Educational attainment"** (the full
   dataset is OECD's Education at a Glance, series id
   `OECD.EDU.IMEP,DSD_EAG_LSO_EA@DF_LSO_NEAC_DISTR_EA`).
3. Open the result and use the filter panel to narrow it down to:
   - **Sex:** Total
   - **Age:** 25-34 years
   - **Educational attainment level:** Tertiary education
   - **Measure:** Percentage of population (not a headcount)
   - **Frequency:** Annual
   - **Reference area:** the 9 countries below (add each one — OECD's
     filter UI usually lets you multi-select countries)

   Australia, Canada, United Kingdom, New Zealand, South Korea,
   Netherlands, United States, Germany, Japan

   If any of these exact filter labels don't appear (OECD sometimes
   renames things), look for the closest match to the wording above —
   the goal is "tertiary attainment, 25-34 year-olds, % of that age
   group, all years available."
4. Once the table shows just those countries and that one measure, use
   the **Download** button and choose **CSV**.

## Step 2 — Fill in the template

Open `data/manual/human-capital-depth-template.csv` (in this same folder)
in a spreadsheet program or text editor. It has 4 columns:

```
country_code,country_name,year,value
```

For every country/year combination the OECD download has a real number
for, add one row using the 3-letter codes below (matching the OECD
download to these codes if needed — OECD sometimes uses its own country
labels):

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

**Delete the `EXAMPLE_DELETE_THIS_ROW` row** — it's a placeholder showing
the format, not real data.

**If a country has no published number for a given year, don't add a row
for it and don't guess a value.** A gap is fine and gets disclosed
honestly on the site — a fabricated number is not.

## Step 3 — Hand it to Claude Code

Once the CSV is filled in, tell Claude Code it's ready (paste the file
contents or point to the file). It will convert it into
`data/processed/human-capital-depth.json` in the same shape every other
gauge uses, with `provenance.status: "LIVE"` and a note explaining the
data was entered by hand from this OECD download, on this date — never
presented as pipeline-fetched.

## Keeping it current

This series doesn't update automatically. OECD's Education at a Glance
data is typically only revised once a year at most — revisit this process
roughly annually, or whenever you're doing a broader data refresh.
