# The Australia Scorecard

A free, public site that turns official statistics into one weighted,
internationally benchmarked verdict on Australia's national trajectory —
readable in 60 seconds, with full drill-down for sceptics.

**Phase C in progress.** All 16 gauges are configured. 11 are **live**,
fetched automatically every month from World Bank, IMF, BIS, OECD, SIPRI,
and Harvard Growth Lab. 4 (Productivity, Human capital depth, Inequality,
Internal cohesion) are in a manual download lane after their real sources
turned out not to be safely automatable — see `data/manual/README.md` for
the templates and instructions. 1 (Education) is still sample data,
pending its first manual entry. Every page shows exactly which gauges are
live vs. sample vs. awaiting data — never silently.

You don't need to know how to code to run any of this. The three commands
below are all you need.

## The three commands

Run these from a terminal, inside this folder (`australia-scorecard`).

### `npm run dev` — preview the site on your own computer

Starts a local preview at **http://localhost:3000** that updates live as
files change. Press `Ctrl+C` in the terminal to stop it. This does not put
anything online — it's just for you to look at.

### `npm run pipeline` — refresh the data

Fetches fresh numbers from official sources (World Bank, IMF, BIS, and —
once unblocked — OECD) and regenerates the files in `data/processed/`.
Prints a plain-English report for every gauge it attempts, ending in one
line: `VERDICT: CLEAN` (every source worked) or `VERDICT: NOT CLEAN — N
failed` (read the report above that line for exactly what happened and
what to do about it, per failed gauge). Safe to re-run any time — it just
re-fetches and overwrites.

### `npm run build` — build the production version

Produces the final, optimised static site in the `out/` folder — this is
what actually gets deployed. You normally don't need to run this yourself;
it happens automatically when the site is deployed (see below).

## What things cost

**$0 per month**, aside from an optional domain name later. Everything here
runs on free tiers: free hosting, free data sources, no database, no paid
services. If a future phase would introduce a cost, it will be flagged and
explained before it happens.

## How the site is put together

- **The site itself** (`app/`, `components/`) is a static Next.js site — no
  server, no database. Every page is just HTML/CSS/JS generated ahead of
  time.
- **The data** lives in `data/processed/*.json` — plain files, one per
  gauge, each carrying a `provenance` block that says exactly where the
  number came from, when it was fetched, and — honestly — which peer
  countries (if any) are missing and why.
- **The pipeline** (`pipeline/`) is what fetches that data. `pipeline/index.mjs`
  is the orchestrator; `pipeline/gauges/*.mjs` is one file per gauge;
  `pipeline/lib/*.mjs` holds the shared source-specific fetch logic (World
  Bank, IMF, BIS, OECD).
- **The rules for scoring** (which countries we compare against, whether
  "higher is better" or "lower is better" for each gauge, how much each
  gauge counts toward the final verdict) live in one file:
  `gauges.config.json`. The reasoning behind those rules is written out in
  `METHODOLOGY.md`, and both feed the `/methodology` page on the site
  automatically.
- **The editable words** (the homepage's "fact of the release", the About
  page copy, each gauge's "why this matters" explainer) live in `content/` —
  plain text/JSON files, separate from code, so they can be rewritten
  without touching anything technical.

## Refreshing data automatically (GitHub Actions)

`.github/workflows/pipeline.yml` runs `npm run pipeline` automatically on
the 1st of every month, commits whatever gauges succeeded, and — this part
matters — **fails loudly** (a red X on the workflow run, which GitHub emails
to you by default) if any source failed, so a bad run can never go
unnoticed. You can also trigger it manually any time:

1. Go to the repository on github.com.
2. Click the **Actions** tab.
3. In the left sidebar, click **Refresh data pipeline**.
4. Click the **Run workflow** button (top right of the run list), leave the
   branch as `main`, and click the green **Run workflow** button that
   appears.
5. Wait about a minute, then refresh the page — a new run will appear.
   Click it to watch progress.
6. Click the **Run the data pipeline** step to expand it and read the full
   report — the same CLEAN/NOT CLEAN report you'd see running it locally.
7. If every gauge succeeded, the run shows a green check and any changed
   data files are already committed and pushed — Vercel will redeploy the
   live site automatically within a minute or two. If anything failed, the
   whole run shows a red X even though the gauges that *did* succeed were
   still committed.

**This isn't wired up to a live GitHub repo yet** — see "Getting the site
online" below. Until this repo is pushed to GitHub, the workflow file exists
but nothing can trigger it.

## The OECD blocker — resolved (split outcome)

`sdmx.oecd.org` is not blocked from a GitHub Actions runner the way it is
from this project's own sandbox (confirmed: Actions gets real API
responses, not a bot-protection page). A fresh-eyes review on 2026-07-14
found the three OECD gauges didn't actually share one root cause — they
split into two different outcomes, both now settled:

- **Housing pressure — live.** Its debugging history was genuinely
  convergent: four real, distinct bugs found and fixed in a row, none
  repeating, ending in `FREQ=A` (Annual), verified against OECD's own docs
  as an independently-published series rather than a guess. Fetched
  automatically by the pipeline like any other API gauge.
- **Productivity, Human capital depth — manual lane.** Productivity's
  dataflow carries OECD's own `NonProductionDataflow=true` annotation and
  redirects to an archive endpoint that throws a generic unhandled server
  exception — that's OECD's own infrastructure signalling this isn't
  meant for automated queries, not a wrong key. Human capital depth failed
  three distinct query keys with no actionable diagnostic. See
  `data/manual/README.md` for the download templates and step-by-step
  instructions for both — the website itself works fine; it's only the
  automated API path that's affected.

Full history of what was tried and why — including the reasoning behind
the split — is in `CLAUDE.md`. (A fourth, unrelated OECD dataflow —
Inequality's Gini series — was also attempted live in Phase C and also
blocked; see "Fetch-before-guessing pass" in `CLAUDE.md`.)

## Getting the site online

This repo is meant to live on GitHub, with Vercel deploying it automatically
every time you push to the `main` branch. To finish connecting it:

1. Create an empty **public** GitHub repository (suggested name:
   `australia-scorecard`).
2. Tell Claude Code the repository's URL — it will add it as the git remote
   and push what's here.
3. Go to [vercel.com](https://vercel.com), sign in with your GitHub account,
   choose **"Import Git Repository"**, and select this repo. Vercel
   auto-detects Next.js — the default settings are correct, no changes
   needed. Click Deploy.
4. From then on, every `git push` to `main` (including automated pushes
   from the GitHub Actions pipeline above) redeploys the live site
   automatically.

## Project status

See `METHODOLOGY.md` for exactly what's implemented vs. placeholder right
now, and `CLAUDE.md` for durable decisions (scoring rules, data policies)
that should survive across sessions. Short version: **Phase A and Phase B
are done, Phase C is in progress** — all 16 gauges configured, 11 fetch
automatically (including Military capability and Economic complexity,
originally planned as manual-lane gauges but found to be safely
automatable), 5 remain manual. See `METHODOLOGY.md`'s "Current build
status" for the full 16-gauge state table. Remaining Phase C work: the
site owner's manual downloads for Education, Productivity, Human capital
depth, Inequality, and Internal cohesion.
