# SEO backlog

Status: `ready` (do it), `blocked` (reason in notes), `done` (see ledger.md), `needs-david` (a decision only David makes).
Order within a status = priority (top first). New ids continue the prefix's numbering.
Prefixes: M measurement · T titles/descriptions · S structured data · C content · L internal links · X technical.

## ready

- **S-01** Add JSON-LD to the 12 sitemap pages that have none — `/review/`, `/compare/`, `/category/`, `/new/`, `/how-we-review/`, `/finder/`, `/free-tools/`, `/alternatives/`, `/directory/`, `/guides/`, `/pricing/`, `/contact/`.
  Use `CollectionPage` + `BreadcrumbList` for hubs, `WebPage`/`AboutPage`/`ContactPage` for the rest. Generated pages (`/pricing/`, `/category/`) change in their build script.
  Success: no "missing structured data" pages in the next technical scan. Source: 2026-11-02 scan.

## blocked

- **M-01** Connect Search Console + GA4 to seo-data (steps in `seo/README.md`). Blocks every data-driven item below. *Needs David: add the service account in GSC and GA4, set the two Actions variables.*
- **T-01** Titles over 65 characters: 534 of 550 sitemap pages (most end in " | Success Gravity"). Google rewrites or truncates them.
  Wait for data: shorten first on pages with impressions ≥ 100 and CTR below the site median (`lowCtr` in latest.md), 15 pages per week. Never rewrite all titles at once.
- **T-02** Meta descriptions over 165 characters: 416 pages. Same rule as T-01: start where `lowCtr` shows the loss.
- **C-01** Striking-distance queries (rank 8–20 in `latest.md`): for each owning page add the missing answer, such as a short FAQ, a price-sentence block or a comparison table row. Two pages per week.
- **X-01** Index coverage: after the first `index-latest.md`, list `/pricing/` pages that are "Crawled – currently not indexed". Decide per page whether to strengthen it (unique price history, alternatives) or set `noindex` in `build-pricing.js`.

## needs-david

- **D-01** Bing Webmaster Tools: verify successgravity.com (import from Search Console takes 1 minute). IndexNow already pings Bing; Webmaster Tools shows whether pages are indexed, and Bing's index feeds ChatGPT search.

## done

(none yet)
