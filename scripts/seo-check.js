#!/usr/bin/env node
// SEO check for successgravity.com, modeled on cpacedesk's scripts/seo-check.mjs.
//   node scripts/seo-check.js [--report seo-report.md]
//
// The rules live in code so an agent that forgets one is stopped before its
// branch reaches main. auto-merge-claude.yml runs this on the merged result and
// refuses to push main when it fails. Run it locally before every push (after
// the build scripts).
//
// BLOCKING (exit 1 on any violation not listed in seo/check-baseline.json):
//   meta          every indexable page has a <title>, a meta description, a
//                 canonical pointing at its own https://successgravity.com/…/ URL,
//                 and exactly one <h1>
//   unique-title  no two indexable pages share a <title>
//   unique-desc   … or a meta description
//   sitemap       every sitemap URL exists and is indexable; every indexable page is in the sitemap
//   json-ld       every JSON-LD block parses; no aggregateRating (the site has no user reviews)
//   orphan        every indexable page is linked from at least one other page
//   honesty       no first-person testing claims (CLAUDE.md), unless the sentence negates them
//   affiliate     Higgsfield and Hostinger links carry the affiliate URL (CLAUDE.md)
//   slash         internal links to a page use its canonical trailing-slash URL (no 301 hop):
//                 href="/review/x" and the homepage programs' review: "/review/x" fail
//   keyword-map   every owner in seo/keyword-map.json exists and is indexable, and no query
//                 belongs to two clusters (one query, one page)
//
// The baseline holds known violations to fix later. A new one fails; a baseline
// entry that no longer occurs is reported so it can be removed.
//
// REPORT ONLY (the SEO loop works through these, they never fail):
//   titles over 65 characters, descriptions outside 70–165 characters,
//   indexable pages with fewer than 3 inbound links, indexable pages with no
//   JSON-LD, thin pages (under 300 words of visible text), keyword-map support pages
//   that don't link to their owner, category hubs whose title claims "Best …" while
//   a /best/ guide owns that intent.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const SITE = 'https://successgravity.com';
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'workers', 'assets', 'data', 'scripts', 'automation', 'seo', 'images', 'img']);
const ri = process.argv.indexOf('--report');
const REPORT = ri > 0 ? process.argv[ri + 1] : null;

const HONESTY = /\b(when we tested|in our (own )?test(ing|s)|we tested|our tests (show|found)|we found that|surprised us|in our experience|after using it for|hands-on testing showed)\b/i;
const NEGATION = /\b(not|never|no|haven['’]t|hasn['’]t|didn['’]t|don['’]t|doesn['’]t|isn['’]t|aren['’]t|nor|cannot|can['’]t|without)\b/i;
const AFFILIATE = [
  [/href="https:\/\/(www\.)?higgsfield\.ai\/?"/i, 'Higgsfield link without ?fpr=david-8ae430'],
  [/href="https:\/\/www\.hostinger\.com\/?"/i, 'Hostinger link without ?REFERRALCODE=R4NDAVIDH7LG'],
];

// ---------- read the site ----------
const pages = []; // { url, file, html }
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!(dir === root && SKIP_DIRS.has(name)) && !name.startsWith('.')) walk(p); continue; }
    if (name !== 'index.html') continue;
    const rel = path.relative(root, path.dirname(p)).split(path.sep).join('/');
    pages.push({ url: '/' + (rel ? rel + '/' : ''), file: path.relative(root, p), html: fs.readFileSync(p, 'utf8') });
  }
})(root);

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (html, re) => { const m = html.match(re); return m ? decode(m[1]).trim() : null; };
function visibleText(html) {
  return decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

for (const pg of pages) {
  const h = pg.html;
  pg.noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(h);
  pg.title = attr(h, /<title>([\s\S]*?)<\/title>/i);
  pg.desc = attr(h, /<meta\s+name="description"\s+content="([^"]*)"/i);
  pg.canonical = attr(h, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  pg.h1 = (h.match(/<h1[\s>]/gi) || []).length;
  pg.ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
}
const byUrl = new Map(pages.map((p) => [p.url, p]));
const sitemap = new Set([...fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(SITE, '')));
const indexable = pages.filter((p) => !p.noindex);

// Inbound links: distinct linking pages per target URL
const inbound = new Map();
for (const pg of pages) {
  const seen = new Set();
  for (const m of pg.html.matchAll(/href="([^"#?]*)/g)) {
    let u = m[1];
    if (u.startsWith(SITE)) u = u.slice(SITE.length);
    if (!u.startsWith('/') || u.startsWith('//')) continue;
    if (!u.endsWith('/') && !/\.[a-z0-9]+$/i.test(u)) u += '/';
    u = u.replace(/index\.html$/, '');
    if (u === pg.url || seen.has(u)) continue;
    seen.add(u);
    inbound.set(u, (inbound.get(u) || 0) + 1);
  }
}

// ---------- blocking rules ----------
const violations = []; // { rule, url, msg }
const v = (rule, url, msg) => violations.push({ rule, url, msg });

for (const p of indexable) {
  if (!p.title) v('meta', p.url, 'missing <title>');
  if (!p.desc) v('meta', p.url, 'missing meta description');
  if (p.canonical !== SITE + p.url) v('meta', p.url, 'canonical is ' + (p.canonical || 'missing') + ', expected ' + SITE + p.url);
  if (p.h1 !== 1) v('meta', p.url, p.h1 + ' <h1> elements');
}
for (const [field, rule] of [['title', 'unique-title'], ['desc', 'unique-desc']]) {
  const seen = new Map();
  for (const p of indexable) {
    if (!p[field]) continue;
    if (seen.has(p[field])) v(rule, p.url, 'same ' + field + ' as ' + seen.get(p[field]));
    else seen.set(p[field], p.url);
  }
}
for (const u of sitemap) {
  const p = byUrl.get(u);
  if (!p) v('sitemap', u, 'in sitemap.xml but no page');
  else if (p.noindex) v('sitemap', u, 'in sitemap.xml but noindex');
}
for (const p of indexable) if (!sitemap.has(p.url)) v('sitemap', p.url, 'indexable but not in sitemap.xml');
for (const p of pages) {
  p.ld.forEach((raw, i) => {
    let j;
    try { j = JSON.parse(raw); } catch (e) { v('json-ld', p.url, 'JSON-LD block ' + (i + 1) + ' does not parse: ' + e.message); return; }
    if (/"aggregateRating"/.test(JSON.stringify(j))) v('json-ld', p.url, 'aggregateRating (the site has no user reviews to aggregate)');
  });
}
for (const p of indexable) if (p.url !== '/' && !inbound.get(p.url)) v('orphan', p.url, 'no other page links here');
for (const p of pages) {
  // Split on block elements and sentence ends, so text from neighbouring elements never merges.
  const blocks = visibleText(p.html.replace(/<\/(p|li|h[1-6]|div|td|th|dt|dd|blockquote|figcaption|summary)>/gi, ' \u2029 ')).split('\u2029');
  outer: for (const b of blocks) {
    for (const s of b.split(/(?<=[.!?])\s+/)) {
      const m = s.match(HONESTY);
      if (m && !NEGATION.test(s.slice(0, m.index + m[0].length))) { v('honesty', p.url, 'first-person testing claim: "' + s.trim().slice(0, 120) + '"'); break outer; }
    }
  }
  for (const [re, msg] of AFFILIATE) if (re.test(p.html)) v('affiliate', p.url, msg);
}

// Trailing slash: /x/y without the slash 301-redirects on GitHub Pages, and Google then
// reports both URLs (2026-11-10: /review/tidio and /review/tidio/ for the same query).
for (const p of pages) {
  for (const m of p.html.matchAll(/(?:href=|review:\s*)["'](\/[a-z0-9-]+(?:\/[a-z0-9.-]+)*)["']/gi)) {
    const u = m[1];
    if (/\.[a-z0-9]+$/i.test(u)) continue; // files
    if (byUrl.has(u + '/')) { v('slash', p.url, 'links to ' + u + ' (redirects) instead of ' + u + '/'); break; }
  }
}

// keyword map (seo/keyword-map.json, built by scripts/build-keyword-map.js)
const kmPath = path.join(root, 'seo', 'keyword-map.json');
const km = fs.existsSync(kmPath) ? JSON.parse(fs.readFileSync(kmPath, 'utf8')) : null;
const kmClusters = km ? [...(km.manual || []), ...(km.auto || [])] : [];
const supportNoLink = [];
if (km) {
  const queryOwner = new Map();
  for (const c of kmClusters) {
    const o = byUrl.get(c.owner);
    if (!o) v('keyword-map', c.owner, 'owner of ' + c.id + ' has no page');
    else if (o.noindex) v('keyword-map', c.owner, 'owner of ' + c.id + ' is noindex');
    for (const q of c.queries || []) {
      if (queryOwner.has(q) && queryOwner.get(q) !== c.id) v('keyword-map', c.owner, '"' + q + '" is in both ' + queryOwner.get(q) + ' and ' + c.id);
      else queryOwner.set(q, c.id);
    }
    for (const s of c.support || []) {
      const sp = byUrl.get(s);
      if (sp && !sp.noindex && !sp.html.includes('href="' + c.owner + '"') && !sp.html.includes('href="' + SITE + c.owner + '"')) supportNoLink.push(s + ' → ' + c.owner);
    }
  }
}
const bestHubs = indexable.filter((p) => p.url.startsWith('/category/') && p.url !== '/category/' && /^Best\b/i.test(p.title || ''));

// ---------- baseline ----------
const basePath = path.join(root, 'seo', 'check-baseline.json');
const base = fs.existsSync(basePath) ? JSON.parse(fs.readFileSync(basePath, 'utf8')) : {};
const known = new Set(base.known || []);
const key = (x) => x.rule + ' ' + x.url;
const fresh = violations.filter((x) => !known.has(key(x)));
const gone = [...known].filter((k) => !violations.some((x) => key(x) === k));

// ---------- report-only ----------
const longTitles = indexable.filter((p) => p.title && p.title.length > 65);
const badDesc = indexable.filter((p) => p.desc && (p.desc.length < 70 || p.desc.length > 165));
const fewInbound = indexable.filter((p) => p.url !== '/' && (inbound.get(p.url) || 0) < 3);
const noLd = indexable.filter((p) => !p.ld.length);
const thin = indexable.map((p) => ({ p, words: visibleText(p.html).split(' ').length })).filter((x) => x.words < 300);

const lines = [];
lines.push('# SEO check — ' + new Date().toISOString().slice(0, 10), '');
lines.push('Pages: ' + pages.length + ' (' + indexable.length + ' indexable, ' + (pages.length - indexable.length) + ' noindex), sitemap: ' + sitemap.size, '');
lines.push('## Blocking', '');
lines.push(fresh.length ? fresh.length + ' new violation(s):' : 'No new violations.' + (violations.length ? ' (' + violations.length + ' known, in seo/check-baseline.json)' : ''));
fresh.slice(0, 200).forEach((x) => lines.push('- `' + x.rule + '` ' + x.url + ' — ' + x.msg));
if (gone.length) { lines.push('', 'Fixed — remove from seo/check-baseline.json:'); gone.forEach((k) => lines.push('- ' + k)); }
lines.push('', '## Report only', '');
lines.push('- Titles over 65 characters: ' + longTitles.length);
lines.push('- Descriptions outside 70–165 characters: ' + badDesc.length);
lines.push('- Indexable pages with under 3 inbound links: ' + fewInbound.length + (fewInbound.length ? ' (e.g. ' + fewInbound.slice(0, 5).map((p) => p.url).join(', ') + ')' : ''));
lines.push('- Indexable pages with no JSON-LD: ' + noLd.length + (noLd.length ? ' (' + noLd.slice(0, 12).map((p) => p.url).join(', ') + ')' : ''));
lines.push('- Thin pages (under 300 words): ' + thin.length + (thin.length ? ' (e.g. ' + thin.slice(0, 5).map((x) => x.p.url + ' ' + x.words).join(', ') + ')' : ''));
lines.push('- Keyword map: ' + kmClusters.length + ' clusters' + (km ? '' : ' (seo/keyword-map.json missing — run node scripts/build-keyword-map.js)'));
lines.push('- Support pages not linking to their owner: ' + supportNoLink.length + (supportNoLink.length ? ' (e.g. ' + supportNoLink.slice(0, 5).join(', ') + ')' : ''));
lines.push('- Category hubs titled "Best …" (the /best/ guides own that intent): ' + bestHubs.length + (bestHubs.length ? ' (' + bestHubs.slice(0, 8).map((p) => p.url).join(', ') + ')' : ''));
const out = lines.join('\n') + '\n';
if (REPORT) fs.writeFileSync(REPORT, out);
console.log(out);
if (process.argv.includes('--write-baseline')) {
  fs.writeFileSync(basePath, JSON.stringify({ _about: base._about, known: violations.map(key).sort() }, null, 2) + '\n');
  console.log('baseline written: ' + violations.length + ' known');
}
process.exit(fresh.length ? 1 : 0);
