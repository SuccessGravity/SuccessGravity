# Review gate — an independent reviewer before every SEO push

Branches named `claude/**` auto-merge to main with no human review. `scripts/seo-check.js` catches the mechanical problems. This gate catches the judgment ones, so you never pass your own work. Copied from cpacedesk's `automation/seo-execute.md`.

## How

After the build and `seo-check.js` pass, and before `git push`, start a **subagent with the Agent tool**. Give it only:
- `CLAUDE.md` and `seo/README.md`, by path
- `seo/keyword-map.json` → `rules` and the clusters whose owner or support appears in the diff
- the output of `git diff origin/main -- . ':!data/tools.json' ':!sitemap.xml'` (too long? then the file list, plus the diffs of the pages whose visible text changed)

Don't give it your notes or your reasons. It judges the diff cold.

The subagent's instruction:

> Review this diff adversarially. It goes live on successgravity.com with no other human review. Answer **PASS** or a numbered **FIX** list (file, line, problem, the fix). Check:
> 1. **Prices and facts.** Every new or changed price, plan name, limit or date is on the vendor's own pricing page, help center or announcement. Fetch the source URL and confirm it. A price you can't confirm is a FIX. Also check pages that must stay in sync with a price change (CLAUDE.md).
> 2. **Honesty.** No first-person testing or experience claims, no invented statistics, quotes, user reviews or rankings presented as data. Attribute facts to their source.
> 3. **Affiliate links.** Higgsfield and Hostinger use the affiliate URLs from CLAUDE.md, and paid links keep `rel="sponsored"`.
> 4. **Search intent.** No new page targets a query that `seo/keyword-map.json` gives to another URL. Titles and descriptions match what the page actually answers, with no clickbait or promises the page doesn't keep.
> 5. **Quality.** No thin or templated filler added for SEO, no keyword stuffing, no hidden text. JSON-LD marks only what is visible on the page.
> 6. **Breakage.** Changed URLs, removed pages, broken internal links, broken HTML structure, and layout on narrow screens (look for fixed widths, unclosed tags).

## After

- **FIX:** fix every item, rebuild, rerun `seo-check.js`, and run the gate again with a fresh subagent. Maximum 3 rounds.
- **Still FIX after 3 rounds:** don't push those changes. Revert them, put the remaining FIX list in the backlog item's notes (`status: blocked`), and push only what passed.
- Record the outcome ("review gate: PASS in round N", or what was held back) in the weekly report.
