# SEO ledger

One row per shipped SEO change. Baseline = the URL's last 28 days from `seo-data/metrics/successgravity/latest.json` at the time of the change (or "no data").
Verdict 4–6 weeks later: ✅ helped · ➖ no clear change · ❌ hurt (revert or rethink), with the numbers behind it.

| Date | Item | Commit | URLs | Baseline (clicks / impr / pos / CTR) | Verdict (date) |
|---|---|---|---|---|---|
| 2026-11-02 | Setup: GA4 `generate_lead` events, IndexNow | (this commit) | all | no data | — |
| 2026-11-04 | C-01 / experiment `pricing-title-v2` (seo/experiments.json) | (this commit) | /pricing/ cloudways, miro, bitwarden, granola, printful, 15five, photoroom | 28 d to 2026-10-31: 0 / 649 / 16.2 / 0% (all other /pricing/: 2 / 6,368 / 38.6 / 0.031%) | review 2026-12-02 |
| 2026-11-04 | X-04 fix: "free trial" no longer marks a tool as having a free plan (build-tools-json.js) | (this commit) | /pricing/cloudways/ (FAQ said it had a free plan) | — | — |
