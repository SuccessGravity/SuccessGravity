#!/usr/bin/env node
// Builds data/tools.json from two sources:
//   1. the `const programs = [...]` array in index.html (core tools with ratings/reviews)
//   2. data/directory.jsonl (bulk directory listings, one JSON object per line)
// Core tools win on duplicates (same name or same website). The output feeds
// /directory/, /stack/, /price-watch/ and the "since your last visit" badge.
// Run: node scripts/build-tools-json.js   (also runs in GitHub Actions)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const m = html.match(/const programs = (\[[\s\S]*?\n\s*\]);/);
if (!m) { console.error('programs array not found in index.html'); process.exit(1); }
const programs = vm.runInNewContext(m[1]);

// Category labels from the homepage filter <select>
const labels = {};
const sel = html.match(/<select id="category-filter"[\s\S]*?<\/select>/);
if (sel) {
  sel[0].replace(/<option value="([^"]+)">([^<]+)/g, (_, v, t) => {
    labels[v] = t.replace(/&amp;/g, '&').trim();
  });
}

function slugify(s) {
  return String(s).toLowerCase().replace(/&/g, 'and').replace(/\.com\b/g, '-com')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Cheapest paid price per month from a free-text pricing string.
// Returns { pm: number|null, usage: bool, free: bool }
function parsePrice(p, freeFlag) {
  const s = String(p || '');
  const free = !!freeFlag || /\bfree\b/i.test(s);
  if (/%|per transaction|pay[- ]as[- ]you[- ]go|usage[- ]based|ad spend/i.test(s)) return { pm: null, usage: true, free };
  if (/^\s*free\b[^$]*$/i.test(s)) return { pm: 0, usage: false, free: true };
  const re = /\$\s?([0-9]+(?:[.,][0-9]+)?)\s*(?:\/\s*|per\s+)?((?:user|seat|agent|member)\s*\/\s*)?(year|yr|annually|month|mo)?/gi;
  let best = null, mt;
  while ((mt = re.exec(s))) {
    let v = parseFloat(mt[1].replace(',', ''));
    if (!(v > 0)) continue;
    if (/^(year|yr|annually)$/i.test(mt[3] || '')) v = v / 12;
    if (best === null || v < best) best = v;
  }
  return { pm: best === null ? null : Math.round(best * 100) / 100, usage: false, free };
}

function reviewPath(p) {
  const r = p.review;
  if (!r) return null;
  const clean = r.replace(/\/?$/, '/');
  return fs.existsSync(path.join(root, clean, 'index.html')) ? clean : null;
}

const seen = new Set();
const tools = programs.map((p) => {
  let id = slugify(p.name);
  while (seen.has(id)) id += '-2';
  seen.add(id);
  const pr = parsePrice(p.pricing, p.free);
  return {
    id,
    n: p.name,
    c: p.category,
    l: p.link,
    i: p.icon || null,
    p: p.pricing || '',
    pm: pr.pm,
    usage: pr.usage,
    free: pr.free,
    r: typeof p.rating === 'number' ? p.rating : null,
    pop: p.popularity || 0,
    b: p.benefit || '',
    rv: reviewPath(p),
  };
});

// Also pick up reviews registered in the REVIEWS map but missing on the program
const rm = html.match(/const REVIEWS = \{([\s\S]*?)\};/);
if (rm) {
  rm[1].replace(/'([^']+)'\s*:\s*'([^']+)'/g, (_, name, href) => {
    const t = tools.find((x) => x.n === name);
    const clean = href.replace(/\/?$/, '/');
    if (t && !t.rv && fs.existsSync(path.join(root, clean, 'index.html'))) t.rv = clean;
  });
}

// ---- Verified prices recorded in Price Watch ----
let verified = {};
try { verified = JSON.parse(fs.readFileSync(path.join(root, 'data', 'price-changes.json'), 'utf8')).verified || {}; } catch (e) {}
tools.forEach((t) => { if (verified[t.id]) { t.vd = verified[t.id].date; t.vs = verified[t.id].source; } });

// ---- Bulk directory listings ----
// Site key = hostname + path, so different products on one vendor domain
// (zoho.com/crm vs zoho.com/books) don't count as duplicates.
function host(u) {
  try {
    const x = new URL(u);
    return x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '').toLowerCase();
  } catch (e) { return ''; }
}
const extraLabels = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'data', 'categories.json'), 'utf8')); } catch (e) { return {}; } })();
Object.keys(extraLabels).forEach((k) => { if (!labels[k]) labels[k] = extraLabels[k]; });
const takenNames = new Set(tools.map((t) => t.n.toLowerCase()));
const takenHosts = new Set(tools.map((t) => host(t.l)).filter(Boolean));
let ext = 0, skipped = 0;
const dirFile = path.join(root, 'data', 'directory.jsonl');
if (fs.existsSync(dirFile)) {
  fs.readFileSync(dirFile, 'utf8').split('\n').forEach((line, i) => {
    line = line.trim();
    if (!line || line[0] === '#') return;
    let d;
    try { d = JSON.parse(line); } catch (e) { console.warn('directory.jsonl line ' + (i + 1) + ': invalid JSON — skipped'); skipped++; return; }
    if (!d.name || !d.link || !d.category) { console.warn('directory.jsonl line ' + (i + 1) + ': needs name, link, category — skipped'); skipped++; return; }
    const h = host(d.link);
    if (takenNames.has(d.name.toLowerCase()) || (h && takenHosts.has(h))) { skipped++; return; }
    if (!labels[d.category]) console.warn('directory.jsonl line ' + (i + 1) + ': unknown category "' + d.category + '" (add it to data/categories.json)');
    takenNames.add(d.name.toLowerCase()); if (h) takenHosts.add(h);
    let id = slugify(d.name);
    while (seen.has(id)) id += '-2';
    seen.add(id);
    const pr = parsePrice(d.pricing, d.free);
    const t = {
      id, n: d.name, c: d.category, l: d.link, i: d.icon || null,
      p: d.pricing || 'See official site', pm: pr.pm, usage: pr.usage, free: !!d.free || pr.free,
      r: null, pop: 0, b: (d.benefit || '').slice(0, 200), rv: null,
      tg: Array.isArray(d.tags) ? d.tags.slice(0, 4) : [], ext: 1, ad: d.added || null,
    };
    if (d.verified && d.source) { t.vd = d.verified; t.vs = d.source; }
    if (verified[id]) { t.vd = verified[id].date; t.vs = verified[id].source; }
    tools.push(t);
    ext++;
  });
}
if (skipped) console.log('directory.jsonl: ' + skipped + ' line(s) skipped (duplicates or invalid)');

const out = { generated: new Date().toISOString().slice(0, 10), count: tools.length, categories: labels, tools };
const dest = path.join(root, 'data', 'tools.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
const json = JSON.stringify(out);
// Skip rewrite when only the date would change (keeps CI from committing noise)
try {
  const prev = JSON.parse(fs.readFileSync(dest, 'utf8'));
  prev.generated = out.generated;
  if (JSON.stringify(prev) === json) { console.log('data/tools.json unchanged (' + tools.length + ' tools, ' + ext + ' from directory.jsonl)'); process.exit(0); }
} catch (e) { /* first run */ }
fs.writeFileSync(dest, json + '\n');
console.log('wrote data/tools.json — ' + tools.length + ' tools (' + ext + ' from directory.jsonl)');
