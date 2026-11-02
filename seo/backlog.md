# SEO backlog

Status: `ready` (do it), `blocked` (reason in notes), `done` (see ledger.md), `needs-david` (a decision only David makes).
Order within a status = priority (top first). New ids continue the prefix's numbering.
Prefixes: M measurement · T titles/descriptions · S structured data · C content · L internal links · X technical.

## ready

- **L-01** Indexable pages with fewer than 3 internal links pointing at them (19, listed by `seo-check.js`, e.g. `/alternatives/clickup/`, `/alternatives/hubspot/`). Link them from the matching review, compare and category pages where a reader would want them.
  Success: count under 5 in the check report.

- **S-01** Add JSON-LD to the 13 indexable pages that have none (`node scripts/seo-check.js` lists them): `/review/`, `/compare/`, `/category/`, `/new/`, `/how-we-review/`, `/finder/`, `/free-tools/`, `/alternatives/`, `/best/`, `/directory/`, `/guides/`, `/pricing/`, `/contact/`.
  Use `CollectionPage` + `BreadcrumbList` for hubs, `WebPage`/`AboutPage`/`ContactPage` for the rest. Generated pages (`/pricing/`, `/category/`) change in their build script.
  Success: no "missing structured data" pages in the next technical scan. Source: 2026-11-02 scan.

## blocked

- **T-01** Titles over 65 characters: 534 of 550 sitemap pages (most end in " | Success Gravity"). Google rewrites or truncates them.
  Wait for data: shorten first on pages with impressions ≥ 100 and CTR below the site median (`lowCtr` in latest.md), 15 pages per week. Never rewrite all titles at once.
- **T-02** Meta descriptions over 165 characters: 416 pages. Same rule as T-01: start where `lowCtr` shows the loss.
- **C-01** Striking-distance queries (rank 8–20 in `latest.md`): for each owning page add the missing answer, such as a short FAQ, a price-sentence block or a comparison table row. Two pages per week.
- **X-01** Index coverage: after the first `index-latest.md`, list `/pricing/` pages that are "Crawled – currently not indexed". Decide per page whether to strengthen it (unique price history, alternatives) or set `noindex` in `build-pricing.js`.

## needs-david

- **D-01** Bing Webmaster Tools: verify successgravity.com (import from Search Console takes 1 minute). IndexNow already pings Bing; Webmaster Tools shows whether pages are indexed, and Bing's index feeds ChatGPT search.

## done

- **M-01** (2026-11-02) Search Console + GA4 connected to seo-data (Check Google access passed). First 7 days in GSC: 5,598 impressions, 1 click.
- **X-02** (2026-11-02) Gate `scripts/seo-check.js` added. It found and fixed: broken JSON-LD on `/alternatives/clickup/` (unclosed answer) and `/best/best-email-marketing-tools/` (duplicated publisher line), `/best/` missing from the sitemap, and `/submit-tool-preview/` indexable (now noindex).
