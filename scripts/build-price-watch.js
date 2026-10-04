#!/usr/bin/env node
// Renders /price-watch/index.html's change log, stats and price table as static
// HTML from data/price-changes.json + data/tools.json (run build-tools-json.js first).
// Content lives between <!-- PW:<NAME>:START --> and <!-- PW:<NAME>:END --> markers.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'price-watch', 'index.html');
const tools = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tools.json'), 'utf8'));
const pw = JSON.parse(fs.readFileSync(path.join(root, 'data', 'price-changes.json'), 'utf8'));
const verified = Object.assign({}, pw.verified || {});
// Tools verified when added to data/directory.jsonl carry their own date/source
tools.tools.forEach((t) => { if (!verified[t.id] && t.vd && t.vs) verified[t.id] = { date: t.vd, source: t.vs }; });
const byId = {};
tools.tools.forEach((t) => { byId[t.id] = t; });

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (iso) => {
  const d = new Date(iso + 'T12:00:00Z');
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};
const short = (iso) => {
  const d = new Date(iso + 'T12:00:00Z');
  return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};
const catLabel = (c) => (tools.categories[c] || c || '').replace(/ & .*$/, '');
const DIR = {
  up: ['&#9650;', 'Price up', 'pw-up'],
  down: ['&#9660;', 'Cheaper option', 'pw-down'],
  plan: ['&#9679;', 'Plan change', 'pw-plan'],
};

const entries = (pw.entries || []).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.name.localeCompare(b.name)));

// ---- Change log, grouped by date ----
let log = '';
let lastDate = null;
entries.forEach((e) => {
  if (e.date !== lastDate) {
    if (lastDate) log += '        </div>\n';
    log += '        <h3 class="pw-date" id="d-' + esc(e.date) + '">' + esc(fmt(e.date)) + '</h3>\n        <div class="pw-group">\n';
    lastDate = e.date;
  }
  const d = DIR[e.dir] || DIR.plan;
  const t = byId[e.tool];
  const kind = e.kind === 'vendor-change' ? 'Announced by ' + esc(e.name) : 'Listing corrected after a pricing-page check';
  log +=
    '          <article class="pw-entry ' + d[2] + '" data-dir="' + esc(e.dir) + '" data-tool="' + esc(e.tool) + '" data-date="' + esc(e.date) + '">\n' +
    '            <div class="pw-badge" aria-hidden="true">' + d[0] + '</div>\n' +
    '            <div class="pw-body">\n' +
    '              <p class="pw-head"><b>' + esc(e.name) + '</b> <span class="pw-tag">' + d[1] + '</span></p>\n' +
    '              <p class="pw-price">' + (e.from ? '<s>' + esc(e.from) + '</s> &rarr; ' : '') + '<b>' + esc(e.to) + '</b></p>\n' +
    '              <p class="pw-note">' + esc(e.note) + '</p>\n' +
    '              <p class="pw-meta">' + kind + ' &middot; <a href="' + esc(e.source) + '" target="_blank" rel="noopener">Source</a>' +
    (t && t.rv ? ' &middot; <a href="' + esc(t.rv) + '">Our review</a>' : '') +
    (t ? ' &middot; <button type="button" class="pw-stack sg-stack-btn" data-stack-id="' + esc(t.id) + '">&#65291; Add to My Stack</button>' : '') +
    '</p>\n' +
    '            </div>\n' +
    '          </article>\n';
});
if (lastDate) log += '        </div>\n';
if (!entries.length) log = '        <p class="text-gray-500">No changes logged yet.</p>\n';

// ---- Stats ----
const tracked = tools.tools.filter((t) => t.c !== 'government-resources' && (t.pm != null || t.usage) && (!t.ext || verified[t.id])).length;
const nVerified = Object.keys(verified).length;
const lastCheck = Object.values(verified).map((v) => v.date).sort().pop() || pw.updated;
const stats =
  '        <div class="sg-stat"><b>' + tracked + '</b><span>Tools tracked</span></div>\n' +
  '        <div class="sg-stat"><b>' + nVerified + '</b><span>Verified at source</span></div>\n' +
  '        <div class="sg-stat"><b>' + entries.length + '</b><span>Changes logged</span></div>\n' +
  '        <div class="sg-stat"><b>' + esc(short(lastCheck)) + '</b><span>Last check</span></div>\n';

// ---- Price table ----
const rows = tools.tools
  .filter((t) => t.c !== 'government-resources' && t.c !== 'business-loans')
  // Bulk directory listings appear only once their price is verified at the source
  .filter((t) => !t.ext || verified[t.id])
  .sort((a, b) => (verified[b.id] ? 1 : 0) - (verified[a.id] ? 1 : 0) || b.pop - a.pop || a.n.localeCompare(b.n))
  .map((t) => {
    const v = verified[t.id];
    const ver = v
      ? '<a href="' + esc(v.source) + '" target="_blank" rel="noopener" class="pw-ver">&#10003; ' + esc(short(v.date)) + '</a>'
      : '<span class="pw-unver">Not yet</span>';
    const name = t.rv ? '<a href="' + esc(t.rv) + '" class="font-semibold text-gray-900 hover:text-indigo-600">' + esc(t.n) + '</a>' : '<span class="font-semibold text-gray-900">' + esc(t.n) + '</span>';
    return '            <tr data-name="' + esc(t.n.toLowerCase()) + '" data-cat="' + esc(t.c) + '" data-pm="' + (t.pm == null ? '' : t.pm) + '"' + (v ? ' data-ver="1"' : '') + '>' +
      '<td>' + name + '<span class="pw-cat">' + esc(catLabel(t.c)) + '</span></td>' +
      '<td>' + esc(t.p || 'n/a') + '</td>' +
      '<td>' + ver + '</td>' +
      '<td><button type="button" class="pw-stack sg-stack-btn" data-stack-id="' + esc(t.id) + '">&#65291; Add to My Stack</button></td></tr>';
  }).join('\n');

let html = fs.readFileSync(pagePath, 'utf8');
function put(name, content) {
  const re = new RegExp('(<!-- PW:' + name + ':START -->\\n)[\\s\\S]*?(\\s*<!-- PW:' + name + ':END -->)');
  if (!re.test(html)) { console.error('marker PW:' + name + ' missing'); process.exit(1); }
  html = html.replace(re, (_, a, b) => a + content.replace(/\n$/, '') + b);
}
put('STATS', stats);
put('LOG', log);
put('TABLE', rows + '\n');
html = html.replace(/(<span id="pw-updated">)[^<]*(<\/span>)/, '$1' + esc(fmt(lastCheck)) + '$2');
fs.writeFileSync(pagePath, html);
console.log('price-watch: ' + entries.length + ' entries, ' + nVerified + ' verified, ' + tracked + ' tracked');

// ---- Static counts on the homepage and /new/ (so no stale number flashes before JS runs) ----
const total = tools.tools.length;
const fmtN = total.toLocaleString('en-US');
const pages = [
  ['index.html', [
    [/(id="sg-stat-tools" data-count-to=")\d+/, '$1' + total],
    [/(id="sg-stat-verified" data-count-to=")\d+/, '$1' + nVerified],
    [/(data-sg-tool-count-plain>)[\d,]+/g, '$1' + fmtN],
  ]],
  ['new/index.html', [[/(data-sg-tool-count>)[\d,]+ tools/, '$1' + fmtN + ' tools']]],
];
pages.forEach(([rel, subs]) => {
  const fp = path.join(root, rel);
  if (!fs.existsSync(fp)) return;
  const before = fs.readFileSync(fp, 'utf8');
  let after = before;
  subs.forEach(([re, rep]) => { after = after.replace(re, rep); });
  if (after !== before) { fs.writeFileSync(fp, after); console.log('counts updated in ' + rel); }
});
