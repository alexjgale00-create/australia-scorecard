# Productivity — manual data entry instructions

**What this gauge measures:** GDP per hour worked (USD, constant prices,
2015 PPPs) — how much economic value an hour of work produces — for each
of the 9 peer countries.

**Why this is manual, not automatic:** the raw OECD SDMX API for this
series (`OECD.SDD.TPS,DSD_PDB@DF_PDB_LV,1.0`) carries OECD's own
`NonProductionDataflow=true` annotation and redirects automated requests
to an archive endpoint that throws a generic server error, not a "your
query is wrong" error. That's OECD's own infrastructure signalling this
dataflow isn't meant to be queried this way by an automated script — see
`CLAUDE.md` for the full debugging history. **The website itself works
fine** — data-explorer.oecd.org is a live, current product; it's only our
automated API calls that hit the broken path.

## Step 1 — Download the data from OECD

1. Go to **https://data-explorer.oecd.org/**.
2. Search for **"Productivity levels"** (this is OECD's Productivity
   Database — GDP per hour worked, dataflow id `DSD_PDB@DF_PDB_LV` under
   agency `OECD.SDD.TPS`, if you want to confirm you're on the right
   dataset).
3. Use the filter panel to narrow it down to:
   - **Measure:** GDP per hour worked (sometimes labelled "GDPHRS")
   - **Unit:** USD, constant prices, 2015 PPPs (purchasing power parity)
   - **Frequency:** Annual
   - **Reference area:** the 9 countries below (add each one)

   Australia, Canada, United Kingdom, New Zealand, South Korea,
   Netherlands, United States, Germany, Japan

   If the exact filter labels differ from what's above, look for the
   closest match — the goal is "GDP per hour worked, USD, constant 2015
   PPPs, annual, all years available."
4. Once the table shows just those countries and that one measure, use
   the **Download** button and choose **CSV**.

## Step 2 — Fill in the template

Open `data/manual/productivity-template.csv` (in this same folder) in a
spreadsheet program or text editor. It has 4 columns:

```
country_code,country_name,year,value
```

For every country/year combination the OECD download has a real number
for, add one row using the 3-letter codes below:

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
`data/processed/productivity.json` in the same shape every other gauge
uses, with `provenance.status: "LIVE"` and a note explaining the data was
entered by hand from this OECD download, on this date — never presented
as pipeline-fetched.

## Keeping it current

OECD's Productivity Database updates on a rolling basis as source data
is revised, but not on any fixed monthly schedule. Revisit this process
roughly annually, or whenever you're doing a broader data refresh.
