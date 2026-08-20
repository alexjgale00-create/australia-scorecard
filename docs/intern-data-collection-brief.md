# Data Collection Brief — The Australia Scorecard

**Task:** Download four datasets from the OECD Data Explorer and enter them into
four CSV templates.
**Time:** Roughly 60–90 minutes.
**Skills needed:** Careful attention to detail. No coding required.

---

## Background (read once)

The Australia Scorecard compares Australia against eight peer countries across a
range of official statistics. Most data is collected automatically. Four
datasets can't be — OECD's website requires a person to select filters and
download by hand. That's this task.

**The single most important rule: never guess, never estimate, never
substitute.** If a number isn't available, leave the cell blank. If a filter
doesn't match these instructions, stop and ask — do not pick something that
looks close. A wrong number that looks plausible is far worse than a missing
one, because nobody will catch it later.

**A missing country is not the same as a missing number.** If a whole country
has no published figure for one of these datasets, that's not just "leave the
row out" — say so explicitly in your handoff note (see "When you're done"
below). The site has to actively declare a missing country or it won't
publish; if you don't tell us it's missing, that declaration can't happen.

---

## The nine countries (all four datasets)

| Country name to type | Code |
|---|---|
| Australia | AUS |
| Canada | CAN |
| United Kingdom | GBR |
| New Zealand | NZL |
| **South Korea** | KOR |
| Netherlands | NLD |
| United States | USA |
| Germany | DEU |
| Japan | JPN |

⚠️ Type **South Korea**, even if OECD's export says "Korea" or "Korea, Rep."
This is the exact name every other country entry on the site already uses —
typing "Korea" instead will make this dataset's entry for South Korea
inconsistent with every other dataset's.

---

## The four datasets

All from **https://data-explorer.oecd.org**

### 1. Productivity
- **Search for:** "Productivity levels"
- **Filters:** Measure = *GDP per hour worked* · Unit = *USD, constant prices,
  2015 PPPs* · Frequency = *Annual*
- **Years:** 1990 to latest available
- **Save to:** `data/manual/productivity-template.csv`
- **Note:** The unit matters enormously — it must be 2015 PPPs, not another
  base year.

### 2. Human capital depth
- **Search for:** "Educational attainment"
- **Filters:** Sex = *Total* · Age = *25–34 years* · Attainment level =
  *Tertiary education* · Measure = *Percentage of population* · Frequency =
  *Annual*
- **Years:** 2000 to latest available
- **Save to:** `data/manual/human-capital-depth-template.csv`
- **Note:** Age band must be 25–34, not 25–64.

### 3. Inequality
- **Search for:** "Income Distribution Database"
- **Filters:** Measure = *Gini coefficient, disposable income* · Age = *Total*
  (not 65+) · Methodology = *Income definition since 2012* · Definition =
  *Current definition*
- **Years:** 1990 to latest available
- **Save to:** `data/manual/inequality-template.csv`
- **Note:** Countries update on different schedules, so expect missing years.
  **Leave those rows out entirely — do not interpolate or carry values
  forward.** But if a whole *country* has nothing published at all (not just
  a gap in some years), that's different from an ordinary gap — flag it per
  "A missing country is not the same as a missing number" above.

### 4. Work-life balance — *the most fragile of the four, read this in full*

This is **not** a routine top-up. The site already has 1995–2019 data for
this gauge, but its 2020-onward coverage is very thin and uneven — right now,
2022, 2023, 2024, and 2025 each have exactly **one** country's worth of data
on file, no two the same year. If Australia's new number lands on a year
where the other eight countries aren't also filled in, this gauge can drop
below the minimum number of comparable peers the site requires to publish a
score at all — a real failure, not a cosmetic gap.

- **Search for:** "Average annual hours actually worked per worker"
- **Filters:** Worker status = *Total* · Frequency = *Annual* · the nine
  countries below
- **Years:** **every year from 2020 through 2025** — for **all nine**
  countries, not just Australia. Don't stop once you have Australia's
  numbers; go back and fill in every other country for the same years, even
  though 1995–2019 is already in the system for them.
- **Also add 2019 specifically for these five: Canada, United Kingdom,
  South Korea, Netherlands, Germany.** The site already has 2019 for
  Australia, New Zealand, Japan, and the United States, but not for these
  five — and we need to know why before we can say anything about it on the
  site. A same-source check outside the Data Explorer UI suggests real 2019
  figures exist for all five (roughly: Canada ~1693, UK ~1537, South Korea
  ~1966, Netherlands ~1457, Germany ~1372) — **but treat those as
  unconfirmed, not answers.** Look each one up yourself in the Data
  Explorer and tell us what you actually find:
  - If you find a 2019 figure — enter it in the template, and note in your
    handoff whether it's close to the numbers above or different.
  - If the Data Explorer genuinely shows nothing for that country in 2019
    (no row, not a zero) — that's a real, useful finding, not a failure to
    dig harder. Say so explicitly: "checked, not published" is exactly the
    kind of answer we need.
- **Save to:** `data/manual/work-life-balance-template.csv`
- **A year present for Australia but missing for most of the other eight is
  worse than useless** — it can make this gauge's comparison year jump to a
  year where almost nobody else has data, which is a worse outcome than
  leaving the comparison year where it is today. If you can only get partial
  coverage, getting the *same* years for as many countries as possible
  matters more than getting Australia's single latest year.
- **Report per-year coverage for this dataset specifically** when you hand it
  over — see "When you're done" below. This is the one dataset where that
  matters most.

---

## How to fill each template

1. Open the template file (Excel, Google Sheets, or Notepad all work).
2. **Delete the row containing `EXAMPLE_DELETE_THIS_ROW`** — it's a placeholder.
3. Enter one row per country per year, in this format:

```
country_code,country_name,year,value
AUS,Australia,2023,58.4
CAN,Canada,2023,61.2
```

4. Keep the column headers exactly as they are.
5. Save as CSV (not .xlsx).

---

## Logging where each number came from

For **each of the four datasets**, add one row to
`data/manual/collection-log.csv` (same folder as the templates):

```
gauge_id,pulled_date,collected_by,extract_note
productivity,2026-08-21,<your name>,"OECD Data Explorer, Productivity levels, filters per brief"
```

- `pulled_date` — the date you actually downloaded the data from OECD (today,
  most likely) — not the date it gets typed into the site, which may be
  later.
- `collected_by` — your name.
- `extract_note` — one short line: which dataset, which filters.

This is what lets the site say honestly how old each number really is —
without it, staleness gets measured from whenever someone happens to convert
your CSV, not from when you actually pulled the number.

---

## Quality checks before handing over

For each file, confirm:

- [ ] Every row has all four fields filled
- [ ] Country names and codes match the table above exactly
- [ ] "South Korea" is used, not "Korea"
- [ ] The `EXAMPLE_DELETE_THIS_ROW` line is gone
- [ ] Values look sensible — no stray decimal points, no thousands separators
      (write `58.4`, not `58,4` or `58,400`)
- [ ] Missing data is genuinely absent, not filled with 0, N/A, or a guess
- [ ] The file is saved as .csv
- [ ] `collection-log.csv` has one row for this dataset

---

## Things to flag rather than solve

Stop and ask if any of these happen:

- A filter name on the site doesn't match these instructions (OECD renames
  things periodically) — **screenshot what you see and ask**
- A country is entirely missing from a dataset
- The export gives you a different unit or measure than specified
- Values look implausible (e.g. life-sized numbers where percentages were
  expected)
- Anything is confusing or ambiguous

**Asking costs five minutes. A wrong number can sit undetected for years.**

---

## When you're done

Hand back the four completed CSV files, your updated `collection-log.csv`
rows, plus a short note covering:
- Which years each dataset actually covered (the latest available year varies)
- Any countries or years with missing data — and separately, call out any
  country that's missing *entirely* from a dataset, not just a gap in some
  years
- **For Work-life balance specifically: a year-by-year list of which
  countries you found data for, 2020 through 2025** — even a rough table is
  fine, this is the one dataset where exactly which years line up across
  countries matters as much as the numbers themselves
- **Also for Work-life balance: what you found for 2019 for Canada, UK,
  South Korea, Netherlands, and Germany** — a figure entered, or "checked,
  not published" for each one you couldn't find
- Anything you flagged or found unclear

Full technical detail for each dataset — including why each is collected
manually — is in `data/manual/README.md` if you want more context.
