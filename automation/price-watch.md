# Price Watch — weekly price verification

Run this on every Thursday maintenance run (10 tools), and for any tool whose price you check while writing a page.

## Pick tools (Thursday: 10)
From `data/tools.json`, skip categories `government-resources` and `business-loans`. Choose tools whose id is missing from `verified` in `data/price-changes.json`, or has the oldest date there, highest `pop` first.

## Verify
For each tool, find the cheapest **paid** plan on the vendor's official pricing page, help center, or official announcement. Note whether a free plan exists and whether the price is the annual-billing or monthly rate.
- If the page cannot be read (403, JS-only), skip the tool. Do not use third-party sites as the source. Do not fill in from memory.
- Record it: `verified["<id>"] = {"date": "YYYY-MM-DD", "source": "<official URL you actually read>"}`.

## If the price differs from `programs` in index.html
1. Update the `pricing` string. Format: `"Free / Pro $12/month (billed yearly)"` — start with `Free / ` if a free plan exists; add `(billed yearly)` when it is the annual rate.
2. Add an entry to the top of `entries` in `data/price-changes.json`:
   ```json
   {"date": "YYYY-MM-DD", "tool": "<id from data/tools.json>", "name": "<Tool>",
    "kind": "listing-update", "dir": "up|down|plan",
    "from": "<old listing>", "to": "<new listing>",
    "note": "<1–2 factual sentences>", "source": "<official URL>"}
   ```
   Use `"kind": "vendor-change"` and the announcement's own date only when the vendor published a dated announcement.
3. Update the same price everywhere it appears: `finder/` and `directory/` TOOLS (`p`, and `pm` in finder), plus review/best/alternatives/category/compare/guides pages, including SVG price-chart labels and bar lengths (keep each chart's scale).
4. If prices match, add no entry. Never invent a change.

## Finish
```
node scripts/build-tools-json.js && node scripts/build-price-watch.js
python3 -c "import json;json.load(open('data/price-changes.json'))"
```
Commit `data/`, `price-watch/index.html` and the edited pages together. In the `/new/` entry for the run, add one line: "Price Watch: N verified, M changed" linking to `/price-watch/`.

## Swaps
When you publish a review, check `data/swaps.json`: if another tool in the directory does the same core job for less, add `["<alt id>", "<one-line reason>"]` under the reviewed tool's id (or add the new tool as an alternative to a pricier one). Only when you are sure.
