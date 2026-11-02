#!/usr/bin/env node
// Turns the daily URL Inspection data in BestLoanUSA/seo-data into decisions for
// /pricing/ pages (seo/backlog.md X-01). Read-only: prints a report; the weekly SEO
// routine applies the decisions in seo/index-decisions.json.
//
//   node scripts/index-report.js <path to seo-data>/metrics/successgravity [--out seo/index-report.md]
//
// Per sitemap URL it reads every dated gsc-index.json (one row per URL; with rotation a
// row may be carried over, see seo-data index-status.mjs) and, from latest.json, the
// URL's 28-day Search Console impressions and clicks. Suggestions:
//   noindex     /pricing/ page "Crawled - currently not indexed" for 28+ days and
//               0 impressions — Google looked and passed. Keeping it in the sitemap spends
//               crawl attention that the indexed pages could use.
//   link        "Discovered - currently not indexed" for 14+ days — Google hasn't fetched
//               it yet; add internal links from indexed pages (review, category, compare).
//   canonical   Google chose a different canonical — the page looks like a duplicate;
//               check what it duplicates before anything else.
//   restore     a page in seo/index-decisions.json → noindex that now gets impressions
//               anyway (shouldn't happen) — review the decision.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = process.argv[2];
const oi = process.argv.indexOf('--out');
const OUT = oi > 0 ? process.argv[oi + 1] : null;
if (!dir || !fs.existsSync(dir)) { console.error('usage: node scripts/index-report.js <seo-data>/metrics/successgravity [--out file]'); process.exit(2); }

const days = fs.readdirSync(dir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && fs.existsSync(path.join(dir, d, 'gsc-index.json'))).sort();
if (!days.length) { console.log('No gsc-index.json yet in ' + dir + ' — nothing to report.'); process.exit(0); }

const pathOf = (u) => { try { return new URL(u).pathname; } catch (e) { return u; } };
// Per URL: state per inspection date, oldest first
const hist = new Map();
for (const d of days) {
  const j = JSON.parse(fs.readFileSync(path.join(dir, d, 'gsc-index.json'), 'utf8'));
  for (const r of j.rows || []) {
    const when = (r.inspectedAt || j.takenAt || d).slice(0, 10);
    const p = pathOf(r.url);
    const h = hist.get(p) || [];
    if (!h.length || h[h.length - 1].when !== when) h.push({ when, state: r.error ? 'Inspection failed' : r.coverageState || 'Unknown', pass: r.verdict === 'PASS', googleCanonical: r.googleCanonical ? pathOf(r.googleCanonical) : null });
    hist.set(p, h);
  }
}
const latestDay = days[days.length - 1];
const today = new Date(latestDay + 'T12:00:00Z');
const daysSince = (iso) => Math.round((today - new Date(iso + 'T12:00:00Z')) / 86400000);

// 28-day impressions per page from latest.json (shape varies a little across sites — be lenient)
const perf = new Map();
const lj = path.join(dir, 'latest.json');
if (fs.existsSync(lj)) {
  const j = JSON.parse(fs.readFileSync(lj, 'utf8'));
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') {
      const p = o.page || o.path || o.url;
      if (typeof p === 'string' && typeof o.impressions === 'number') {
        const k = pathOf(p.startsWith('http') ? p : 'https://x' + p);
        const prev = perf.get(k);
        if (!prev || o.impressions > prev.impressions) perf.set(k, { impressions: o.impressions, clicks: o.clicks || 0 });
      }
      Object.values(o).forEach(walk);
    }
  };
  walk(j);
}

const decisionsPath = path.join(root, 'seo', 'index-decisions.json');
const decisions = fs.existsSync(decisionsPath) ? JSON.parse(fs.readFileSync(decisionsPath, 'utf8')) : { noindex: {} };

const out = { noindex: [], link: [], canonical: [], restore: [] };
let indexed = 0, total = 0;
for (const [p, h] of hist) {
  const last = h[h.length - 1];
  total++;
  if (last.pass) { indexed++; continue; }
  // How long has it been in its current state?
  let since = last.when;
  for (let i = h.length - 1; i >= 0 && h[i].state === last.state; i--) since = h[i].when;
  const age = daysSince(since);
  const pf = perf.get(p) || { impressions: 0, clicks: 0 };
  const row = { page: p, state: last.state, since, age, impressions: pf.impressions };
  if (/^\/pricing\/[^/]+\/$/.test(p) && /Crawled - currently not indexed/i.test(last.state) && age >= 28 && pf.impressions === 0) out.noindex.push(row);
  else if (/Discovered - currently not indexed/i.test(last.state) && age >= 14) out.link.push(row);
  else if (last.googleCanonical && last.googleCanonical !== p) out.canonical.push({ ...row, google: last.googleCanonical });
}
for (const id of Object.keys(decisions.noindex || {})) {
  const p = '/pricing/' + id + '/';
  const pf = perf.get(p);
  if (pf && pf.impressions > 0) out.restore.push({ page: p, impressions: pf.impressions });
}

const L = ['# Index report — successgravity — ' + latestDay, '',
  'From ' + days.length + ' daily URL Inspection pass(es) in seo-data. Indexed now: ' + indexed + ' / ' + total + '.', ''];
const list = (title, rows, fmt) => { L.push('## ' + title + ' (' + rows.length + ')', ''); if (!rows.length) L.push('_none_'); rows.slice(0, 60).forEach((r) => L.push('- ' + fmt(r))); L.push(''); };
list('noindex candidates — /pricing/ crawled but not indexed 28+ days, 0 impressions', out.noindex.sort((a, b) => b.age - a.age), (r) => r.page + ' — since ' + r.since + ' (' + r.age + ' days)');
list('needs internal links — discovered, not crawled 14+ days', out.link.sort((a, b) => b.age - a.age), (r) => r.page + ' — since ' + r.since + ' (' + r.age + ' days)');
list('Google chose another canonical — check for duplication', out.canonical, (r) => r.page + ' → Google picked ' + r.google);
list('restore? — set to noindex but getting impressions', out.restore, (r) => r.page + ' — ' + r.impressions + ' impressions');
L.push('Apply: add `noindex` candidates to `seo/index-decisions.json` (max 20 a week, each with date and reason), rebuild, log in `seo/ledger.md`. Links: add from the matching review, category or compare page.');
const md = L.join('\n') + '\n';
if (OUT) fs.writeFileSync(OUT, md);
console.log(md);
