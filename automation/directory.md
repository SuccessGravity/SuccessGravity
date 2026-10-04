# Directory expansion — daily run

Goal: grow the directory fast **without** inventing anything. Each run adds 20 new tools and re-checks 10 unverified ones.

## Where things live
- `data/directory.jsonl` — bulk listings, one JSON object per line (append new lines at the end).
- `data/directory-queue.md` — what to add next. "Requested" first, then the other sections top to bottom.
- `data/categories.json` — labels for categories that aren't in the homepage filter. Add a key here only if no existing category fits.
- Core tools (with ratings and reviews) live in `index.html` `programs`. Don't add bulk tools there.

## Line format
```json
{"name": "Dropbox", "category": "file-storage", "link": "https://www.dropbox.com/", "benefit": "One factual sentence, max 150 characters.", "pricing": "Free / Plus $9.99/month", "free": true, "tags": ["Storage", "Files"], "added": "YYYY-MM-DD", "verified": "YYYY-MM-DD", "source": "https://www.dropbox.com/plans"}
```
- `pricing`: the cheapest paid plan, written like `Free / Pro $12/month (billed yearly)`. Start with `Free / ` only when a permanent free plan exists. Add `(billed yearly)` when the price is the annual-billing rate. Write per-seat prices as `$10/user/month`. Use `Usage-based`, `Contact sales`, or `See official site` (when you couldn't read the price).
- `verified` and `source` only when you read the price on the vendor's own pricing page or help center that day. Otherwise leave both out.
- `benefit`: what it does and for whom, from the vendor's site. No hype, no first person, no ratings.
- Category keys: use an existing key from `data/tools.json` → `categories`.

## Steps
1. **Requests and queue:** take the first 20 unchecked `- [ ]` lines from `data/directory-queue.md` ("Requested" first).
2. **For each tool:**
   - Skip it if the name or website is already in `data/tools.json`. Tick it with "dup".
   - Find the official site. Read its pricing page.
   - Write one line. If the product is gone, renamed, or redirects to a different company, don't add it; tick it with a note instead.
3. **Re-check:** pick 10 lines in `directory.jsonl` that have no `verified`, oldest `added` first, and try their pricing pages again. Update the line in place if the price is now readable.
4. **Refill the queue:** when fewer than 40 unchecked lines remain, add 60 more candidates to the right sections. Choose software small businesses actually pay for, especially in categories with few tools (count them in `data/tools.json`). Don't add hype-only launches with no pricing page.
5. **Validate and build:**
   ```
   node scripts/build-tools-json.js
   node scripts/build-price-watch.js
   ```
   The first script prints any skipped or invalid lines; fix them.
6. **Commit:** commit `data/` and `price-watch/index.html` with the message `Directory: +N tools (M verified) YYYY-MM-DD`. Push to a `claude/sg-directory-YYYYMMDD` branch; the auto-merge workflow puts it on main.
7. **Report in Korean**, in 3 lines: tools added (and how many verified), what the total is now, and which requested tools were handled.

## Never
- Never guess a price from memory or a third-party site.
- Never give bulk listings a rating, pros/cons, or "best" labels. Those belong to reviewed core tools only.
- Never add the same tool twice. Check both the name and the website.
- Higgsfield and Hostinger always use the affiliate URLs listed in `CLAUDE.md`.
