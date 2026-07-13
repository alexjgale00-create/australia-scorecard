# The Australia Scorecard

A free, public site that turns official statistics into one weighted,
internationally benchmarked verdict on Australia's national trajectory —
readable in 60 seconds, with full drill-down for sceptics.

**Where things stand right now (Phase A):** the site's skeleton is built and
works, but it's running on **hand-written sample data for 3 of the eventual
16 gauges** — not real statistics yet. Every page that shows a number says so
clearly ("Sample data — not real"). The real data pipeline is Phase B.

You don't need to know how to code to run any of this. The three commands
below are all you need.

## The three commands

Run these from a terminal, inside this folder (`australia-scorecard`).

### `npm run dev` — preview the site on your own computer

Starts a local preview at **http://localhost:3000** that updates live as
files change. Press `Ctrl+C` in the terminal to stop it. This does not put
anything online — it's just for you to look at.

### `npm run pipeline` — refresh the data

This is meant to fetch fresh numbers from official sources (World Bank,
OECD, IMF, etc.) and regenerate the files in `data/processed/`. **It isn't
built yet** — that's Phase B of this project. Running it right now just
prints a message explaining that, and changes nothing.

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
  number came from (or, right now, that it's sample data and where the real
  number will come from later).
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

## Getting the site online (Phase A hand-off)

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
4. From then on, every `git push` to `main` redeploys the live site
   automatically.

## Project status

See `METHODOLOGY.md` for exactly what's implemented vs. placeholder right
now. Short version: **Phase A of E is done** — skeleton site, 3 sample
gauges, all four page types working. Next up is Phase B: building the real
data pipeline for the ~10 gauges that have a public API.
