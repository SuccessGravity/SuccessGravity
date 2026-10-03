#!/usr/bin/env node
// Builds data/tools.json from the `const programs = [...]` array in index.html.
// The homepage array stays the single source of truth; this file feeds
// /stack/, /price-watch/ and the "since your last visit" badge.
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
  if (/%|per transaction|pay[- ]as[- ]you[- ]go|ad spend/i.test(s)) return { pm: null, usage: true, free };
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

const out = { generated: new Date().toISOString().slice(0, 10), count: tools.length, categories: labels, tools };
const dest = path.join(root, 'data', 'tools.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
const json = JSON.stringify(out);
// Skip rewrite when only the date would change (keeps CI from committing noise)
try {
  const prev = JSON.parse(fs.readFileSync(dest, 'utf8'));
  prev.generated = out.generated;
  if (JSON.stringify(prev) === json) { console.log('data/tools.json unchanged (' + tools.length + ' tools)'); process.exit(0); }
} catch (e) { /* first run */ }
fs.writeFileSync(dest, json + '\n');
console.log('wrote data/tools.json — ' + tools.length + ' tools');
