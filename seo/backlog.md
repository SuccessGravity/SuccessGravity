# SEO backlog

Status: `ready` (do it), `blocked` (reason in notes), `done` (see ledger.md), `needs-david` (a decision only David makes).
Order within a status = priority (top first). New ids continue the prefix's numbering.
Prefixes: M measurement · T titles/descriptions · S structured data · C content · L internal links · X technical.

## ready

- **C-01** Striking-distance queries (rank 8–20). **2026-11-04: experiment `pricing-title-v2` running** on 7 pricing pages (Cloudways, Miro, Bitwarden, Granola, Printful, 15Five, Photoroom): title states the real entry price and free-plan status, the description leads with the cheapest plan, and the FAQ adds "What is the cheapest … plan?". Verdict on 2026-12-02 vs the other pricing pages (ledger). Not included because the vendor page couldn't be read: Omnisend (price missing from the HTML), Envato Elements (403), Pleo (yearly or monthly unclear). Cloudways kept its Oct 4 check (403 today).
  If the verdict is positive → **needs David**: roll the title template out to all indexable pricing pages.

- **L-02** `/price-watch/` and `/stack/` are "Discovered – currently not indexed". 2026-11-04: `/price-watch/` is already linked from 918 pages (footer), so links aren't the gap. Google is slow to crawl the whole site: 148 of 300 inspected URLs are "Discovered – not indexed". `/stack/` is linked from only 29 pages. Adding it to the site-wide footer is a template change → needs David.
  Success: both indexed in a later `index-latest.md`.

- **L-01** Indexable pages with fewer than 3 internal links pointing at them (19, listed by `seo-check.js`, e.g. `/alternatives/clickup/`, `/alternatives/hubspot/`), and 12 keyword-map support pages that don't link to their owner (mostly review ↔ alternatives). Add the links where a reader would want them.
  Success: count under 5 in the check report.

- **S-01** Add JSON-LD to the 13 indexable pages that have none (`node scripts/seo-check.js` lists them): `/review/`, `/compare/`, `/category/`, `/new/`, `/how-we-review/`, `/finder/`, `/free-tools/`, `/alternatives/`, `/best/`, `/directory/`, `/guides/`, `/pricing/`, `/contact/`.
  Use `CollectionPage` + `BreadcrumbList` for hubs, `WebPage`/`AboutPage`/`ContactPage` for the rest. Generated pages (`/pricing/`, `/category/`) change in their build script.
  Success: no "missing structured data" pages in the next technical scan. Source: 2026-11-02 scan.

- **C-02** 18 category hubs are titled "Best … in 2026 — Compared & Reviewed", the same intent the `/best/` guides own (CRM, email, SEO, AI writing, video, social, websites, loans). The keyword map gives "best <topic>" to the `/best/` guide and gives hubs "<topic> tools: prices & free plans", like the 5 newer hubs. First check `latest.json` for which page currently gets impressions for each "best …" query. Where the hub is the one ranking, record it as owner in `keyword-map.json` → `manual` instead of retitling. Otherwise retitle the hub in `data/category-hubs.json` / its page, 4 hubs per week, and link it to the guide.
  Success: no query in `cannibalization` shared by a hub and a guide; hub CTR not lower 4 weeks later.
  First data confirms it: social-media management queries show both `/category/social-media/` and `/best/best-social-media-management-tools/` (4 queries). Also `/pricing/zoho-books/` vs `/pricing/zoho-expense/` for "zoho pricing".


## blocked

- **T-01** Titles over 65 characters: 534 of 550 sitemap pages (most end in " | Success Gravity"). Google rewrites or truncates them.
  Wait for data: shorten first on pages with impressions ≥ 100 and CTR below the site median (`lowCtr` in latest.md), 15 pages per week. Never rewrite all titles at once.
- **T-02** Meta descriptions over 165 characters: 416 pages. Same rule as T-01: start where `lowCtr` shows the loss.
- **X-01** Index coverage of `/pricing/` pages. The tooling is ready (`scripts/index-report.js` → `seo/index-decisions.json`, applied by `build-pricing.js`). The first decisions need 28 days of URL Inspection history, so earliest about 2026-12-01. Until then, act only on "needs internal links" rows.

## needs-david

- **D-02** Search Console → Sitemaps: resubmit `https://successgravity.com/sitemap.xml`. 23 sitemap URLs are "URL is unknown to Google" and 148 are discovered but not crawled (index check 2026-11-03). IndexNow covers Bing only.
- **D-01** Bing Webmaster Tools: verify successgravity.com (import from Search Console takes 1 minute). IndexNow already pings Bing; Webmaster Tools shows whether pages are indexed, and Bing's index feeds ChatGPT search.

## done

- **X-04** (2026-11-04) "3-day free trial" made Cloudways count as having a free plan, so its page said "Yes, free plan". `build-tools-json.js` now ignores "free trial" (only Cloudways was affected). Six prices re-verified on the vendor pages (Miro, Bitwarden, Granola, Printful, 15Five, Photoroom).
- **M-02** (2026-11-02) First measurement (dry run): 28 days 10,329 impressions, 3 clicks, average position 43.4; 283 pages and 1,717 queries with impressions; pricing pages hold 66% of impressions. GA4: 152 sessions, mostly direct with 0% engagement on `/pricing/` pages (likely bots from China, Russia and Singapore); 8 organic sessions. No AI-assistant visits yet. `generate_lead` went live today.
- **X-03** (2026-11-02) Index-decision tooling for pricing pages (#4) and AI-visit tracking in seo-data (#5, seo-data PR #9). Review gate `automation/review-gate.md` (#3).
- **K-01** (2026-11-02) Keyword map `seo/keyword-map.json` (533 clusters) and its check. Static review → pricing links on 33 reviews (`SG-PRICELINK`, kept by `build-pricing.js`).
- **M-01** (2026-11-02) Search Console + GA4 connected to seo-data (Check Google access passed). First 7 days in GSC: 5,598 impressions, 1 click.
- **X-02** (2026-11-02) Gate `scripts/seo-check.js` added. It found and fixed: broken JSON-LD on `/alternatives/clickup/` (unclosed answer) and `/best/best-email-marketing-tools/` (duplicated publisher line), `/best/` missing from the sitemap, and `/submit-tool-preview/` indexable (now noindex).
