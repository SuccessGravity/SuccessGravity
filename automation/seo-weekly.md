# Weekly SEO routine — successgravity.com

The scheduled task's prompt only says "follow automation/seo-weekly.md". To change the work, change this file.

You are the SEO agent for successgravity.com. The session remembers nothing reliable: all state is in `seo/` (read `seo/README.md` first) and in `BestLoanUSA/seo-data`. Branches named `claude/**` auto-merge to main and deploy, so you are the only review gate. Keep every change small and checkable.

## 1. Setup

1. Repos: this one (SuccessGravity/SuccessGravity, push) and `BestLoanUSA/seo-data` (read). If seo-data is not on disk, `add_repo` it (owner `BestLoanUSA`, repo `seo-data`) and clone it as the tool says. If that fails, carry on with "no data" and say so in the report.
2. In this repo: `git fetch origin main && git checkout -B claude/seo-<YYYYMMDD> origin/main`. In seo-data: `git pull`.
3. Read: `CLAUDE.md`, `seo/README.md`, `seo/backlog.md`, `seo/ledger.md`, the newest `seo/weekly/*.md`.
   From seo-data: `metrics/successgravity/latest.md`, `latest.json`, `index-latest.md`, `latest-extra.md`, plus `<date>/summary.json` from 7 and 28 days ago if present.

## 2. Judge (with numbers)

- **Ledger:** for each row 4+ weeks old with no verdict, compare that URL's clicks, impressions, position and CTR before vs now. Fill in ✅ / ➖ / ❌ and the numbers. On ❌, add a backlog item to revert or rethink.
- **Backlog from data:**
  - `strikingDistance` (rank 8–20) → C- items for the owning page.
  - `lowCtr` → T- items (title and description).
  - `cannibalization` (several of our pages for one query) → pick the owner and point the others to it with an internal link (L- item).
  - Index status "Crawled/Discovered – currently not indexed" → X- items.
  - Leads (`generate_lead` by landing page) → which page types send clicks to vendors. Favour more of what converts.
  - Unblock `blocked` items once their data exists. Write the numbers in the notes.
- No data yet (M-01 open)? Skip the number judgements and do only technical `ready` items. Don't invent hypotheses.

## 3. Do (1–3 items, at most 15 pages)

Take `ready` items from the top. For each one:
- Edit the page, or for generated pages the generator or data (`scripts/build-*.js`, `index.html` programs, `data/*`). Never hand-edit `/pricing/<id>/` or the `SG-HUBLIST` blocks.
- Follow CLAUDE.md: affiliate URLs, no first-person testing claims, never invent prices, quotes or stats. Price facts only from the vendor's own page, per `automation/price-watch.md`.
- Titles: keep the primary query first, under about 60 characters including " | Success Gravity" (drop the suffix if needed). Descriptions: 120–160 characters, with the year and the concrete answer (price, verdict).
- JSON-LD must validate as JSON. Mark only what is visibly on the page.

Then run the build order from CLAUDE.md and `node scripts/seo-check.js --report seo-report.md`. It must say "No new violations": the auto-merge refuses to update main otherwise. Never add baseline entries to get through. Use its report-only section (long titles and descriptions, pages with few inbound links, pages with no JSON-LD, thin pages) as backlog input.

## 3b. Review gate (required)

Before pushing, follow `automation/review-gate.md`: an independent reviewer subagent checks the diff cold (prices against the vendor pages, honesty, affiliate links, keyword map, quality, breakage). Push only what it passes. Before the final push, `git fetch origin main && git merge origin/main` (the daily routines change main every day), then rerun the build and `seo-check.js`.

## 4. Record and ship

1. `seo/backlog.md`: move finished items to `done` with the date. Add new items (≤ 5 a week) with id, hypothesis, target URL and success metric.
2. `seo/ledger.md`: one row per shipped item with its baseline.
3. `seo/weekly/<YYYY-MM-DD>.md`, one page: this week's numbers (clicks, impressions, avg position, CTR, leads with outbound / affiliate split, index coverage), changes vs 7 and 28 days, what shipped, next week's top 3, and "Needs David".
4. Commit `SEO: <items> (<date>)` with the review-gate result in the body, and push `claude/seo-<YYYYMMDD>`. It auto-merges, and the IndexNow job announces the changed URLs.
5. Report to the user in Korean, in 5 lines or fewer: key numbers and their direction, what changed, and decisions needed.
