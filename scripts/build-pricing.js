#!/usr/bin/env node
// Per-tool pricing pages: /pricing/<id>/ for every tool in data/tools.json, plus /pricing/.
// Run after build-tools-json.js. Pages whose price has not been checked on the vendor's own
// page are generated with noindex (useful to visitors, kept out of search until verified).
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const tools = JSON.parse(read('data/tools.json'));
const pw = JSON.parse(read('data/price-changes.json'));
const swaps = (() => { try { return JSON.parse(read('data/swaps.json')).swaps || {}; } catch (e) { return {}; } })();
const hubs = tools.hubs || {};
const verified = pw.verified || {};
const byId = {};
tools.tools.forEach((t) => { byId[t.id] = t; });

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); };
const short = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
const year = new Date().getUTCFullYear();
const perSeat = (t) => /\/\s*(user|seat|agent|member)|per (user|seat|agent|member)/i.test(t.p || '');
const money = (n) => '$' + (Math.round(n * 100) / 100 % 1 ? (Math.round(n * 100) / 100).toFixed(2) : Math.round(n)).toLocaleString('en-US');
const ver = (t) => verified[t.id] || (t.vd ? { date: t.vd, source: t.vs } : null);
const SKIP = new Set(['government-resources']);
const list = tools.tools.filter((t) => !SKIP.has(t.c));

// Page shell (head, nav, footer) from an existing page
const shell = read('category/crm/index.html');
const headEnd = shell.indexOf('<header');
const footStart = shell.indexOf('  <footer');
function head(title, desc, url, indexable, ld) {
  let h = shell.slice(0, headEnd)
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + title + '</title>')
    .replace(/(<meta name="description" content=")[^"]*/, (m0, a) => a + desc)
    .replace(/(<link rel="canonical" href=")[^"]*/, (m0, a) => a + url)
    .replace(/(<meta property="og:title" content=")[^"]*/, (m0, a) => a + title)
    .replace(/(<meta property="og:description" content=")[^"]*/, (m0, a) => a + desc)
    .replace(/(<meta property="og:url" content=")[^"]*/, (m0, a) => a + url)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '')
    .replace(/\s*<meta name="robots"[^>]*>/g, '')
    .replace(/https:\/\/successgravity\.com\/og-image\.png/g, 'https://successgravity.com/assets/og/pricing.png')
    // Category pages use "Categories" as the active nav item; pricing pages have none
    .replace(/ class="text-indigo-600 font-semibold">Categories/g, ' class="hover:text-indigo-600">Categories')
    .replace(/class="block py-1 text-indigo-600 font-semibold">Categories/g, 'class="block py-1">Categories');
  const robots = indexable ? '' : '  <meta name="robots" content="noindex,follow">\n';
  return h.replace('</head>', robots + (ld || []).map((o) => '  <script type="application/ld+json">' + JSON.stringify(o) + '</script>\n').join('') + '</head>');
}
const foot = shell.slice(footStart).replace('</body>', '  <script src="/assets/pricing.js?v=1"></script>\n</body>');

function similar(t, n) {
  const out = [], seen = new Set([t.id]);
  const push = (x, why) => { if (x && !seen.has(x.id) && !SKIP.has(x.c) && out.length < n) { seen.add(x.id); out.push({ t: x, why }); } };
  (swaps[t.id] || []).forEach(([id, why]) => push(byId[id], why));
  list.filter((x) => x.c === t.c && x.pm != null && !x.usage && (t.pm == null || x.pm < t.pm))
    .sort((a, b) => a.pm - b.pm || b.pop - a.pop).forEach((x) => push(x, null));
  list.filter((x) => x.h && x.h === t.h).sort((a, b) => (b.pop - a.pop) || ((b.r || 0) - (a.r || 0))).forEach((x) => push(x, null));
  return out;
}

function toolPage(t) {
  const v = ver(t);
  const url = 'https://successgravity.com/pricing/' + t.id + '/';
  const name = esc(t.n);
  const hub = t.h && hubs[t.h];
  const vendor = hostOf(t.l);
  const changes = (pw.entries || []).filter((e) => e.tool === t.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const sim = similar(t, 6);
  const peers = list.filter((x) => x.h && x.h === t.h && x.id !== t.id)
    .sort((a, b) => ((ver(b) ? 1 : 0) - (ver(a) ? 1 : 0)) || (b.pop - a.pop) || a.n.localeCompare(b.n)).slice(0, 10);
  const seat = perSeat(t);
  const freeTxt = t.free ? 'Yes' : (v ? 'No' : 'Not confirmed');
  const priceLine = esc(t.p || 'See official site');

  const title = name + ' Pricing ' + year + ': Plans, Free Plan &amp; Cheaper Alternatives | Success Gravity';
  const desc = v
    ? name + ' starts at ' + priceLine + ' (checked on ' + esc(vendor) + ' on ' + esc(short(v.date)) + '). See the free plan, the cost for your team size, price changes and cheaper alternatives.'
    : name + ' pricing: ' + priceLine + '. See the free plan, the cost for your team size, and cheaper alternatives. Price not yet re-checked by us.';

  const faq = [
    ['How much does ' + t.n + ' cost?', v
      ? t.n + "'s cheapest paid plan is listed at " + (t.p || '') + ' on ' + vendor + ', checked on ' + fmt(v.date) + '. Prices can vary by region, billing period and promotions, so confirm on the official pricing page before buying.'
      : 'Our listing shows ' + (t.p || 'no public price') + ' for ' + t.n + ", but we haven't re-checked it on the vendor's own pricing page yet. Confirm the current price on " + vendor + '.'],
    ['Does ' + t.n + ' have a free plan?', t.free
      ? 'Yes. ' + t.n + ' lists a free plan or free tier; free plans usually have usage or feature limits, so check whether its limits fit how you work.'
      : v ? 'No permanent free plan was listed when we checked ' + vendor + ' on ' + fmt(v.date) + '. Some tools offer a free trial instead.'
        : "We haven't confirmed whether " + t.n + ' has a free plan. Check ' + vendor + '.'],
  ];
  if (seat) faq.push(['Is ' + t.n + ' priced per user?', 'Yes. The listed price is per user (seat) per month, so a team of 5 pays roughly five times the listed price. Use the calculator on this page to estimate your total.']);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Pricing', item: 'https://successgravity.com/pricing/' },
      { '@type': 'ListItem', position: 2, name: t.n + ' pricing', item: url }] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  if (v && t.pm != null && !t.usage) {
    ld.push({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: t.n, applicationCategory: 'BusinessApplication', operatingSystem: 'Web',
      url: t.l, offers: { '@type': 'Offer', price: String(t.pm), priceCurrency: 'USD', url: v.source || t.l } });
  }

  const card =
    '      <div class="pr-card">\n' +
    '        <p class="pr-label">Cheapest paid plan</p>\n' +
    '        <p class="pr-price">' + priceLine + '</p>\n' +
    '        <div class="pr-chips"><span class="pr-chip">' + (t.free ? '&#10003; Free plan' : 'No free plan listed') + '</span>' +
    '<span class="pr-chip">' + (t.usage ? 'Usage-based' : seat ? 'Per user / month' : 'Flat price') + '</span>' +
    (hub ? '<a class="pr-chip" href="/category/' + t.h + '/">' + esc(hub.emoji) + ' ' + esc(hub.short || hub.name) + '</a>' : '') + '</div>\n' +
    (v ? '        <p class="pr-ver">&#10003; Checked ' + esc(fmt(v.date)) + ' on <a href="' + esc(v.source) + '" target="_blank" rel="noopener">' + esc(vendor) + '&rsquo;s pricing page</a></p>\n'
      : '        <p class="pr-unver">Not yet re-checked by us &mdash; confirm on <a href="' + esc(t.l) + '" target="_blank" rel="sponsored noopener" class="affiliate-link" data-tool="' + esc(t.id) + '">' + esc(vendor) + '</a>.</p>\n') +
    '        <div class="pr-actions"><button type="button" class="sg-btn-primary sg-stack-btn" data-stack-id="' + esc(t.id) + '">&#65291; Add to My Stack</button>' +
    '<a href="' + esc(t.l) + '" target="_blank" rel="sponsored noopener" class="affiliate-link sg-btn-ghost" data-tool="' + esc(t.id) + '">Visit ' + name + ' &rarr;</a>' +
    (t.rv ? '<a href="' + esc(t.rv) + '" class="sg-btn-ghost">Read our review</a>' : '') + '</div>\n' +
    '      </div>\n';

  const calc = (t.pm && !t.usage) ?
    '      <section class="pr-sec">\n' +
    '        <h2>What ' + name + ' costs for your team</h2>\n' +
    '        <div class="pr-calc" data-pm="' + t.pm + '" data-seat="' + (seat ? 1 : 0) + '">\n' +
    (seat ? '          <label>Seats <input type="number" min="1" max="999" value="5" data-calc="seats"></label>\n' : '') +
    '          <label>Price per ' + (seat ? 'seat' : 'month') + ' <span class="pr-dollar">$</span><input type="number" min="0" step="0.01" value="' + t.pm + '" data-calc="price"></label>\n' +
    '          <p class="pr-out"><b data-calc="month">' + money(t.pm * (seat ? 5 : 1)) + '</b>/month &middot; <b data-calc="year">' + money(t.pm * (seat ? 5 : 1) * 12) + '</b>/year</p>\n' +
    '        </div>\n' +
    '        <p class="pr-note">Based on the listed entry price' + (/(billed yearly)/i.test(t.p) ? ' (annual billing; monthly billing usually costs more)' : '') + '. Higher plans, add-ons and taxes cost extra.</p>\n' +
    '      </section>\n' : '';

  const hist = '      <section class="pr-sec">\n        <h2>' + name + ' price history</h2>\n' +
    (changes.length ? '        <ul class="pr-hist">\n' + changes.map((e) =>
      '          <li><span class="pr-dir pr-' + esc(e.dir) + '">' + (e.dir === 'up' ? '&#9650;' : e.dir === 'down' ? '&#9660;' : '&#9679;') + '</span><div><b>' + esc(fmt(e.date)) + '</b> &mdash; ' +
      (e.from ? '<s>' + esc(e.from) + '</s> &rarr; ' : '') + esc(e.to) + '<br><span>' + esc(e.note) + ' <a href="' + esc(e.source) + '" target="_blank" rel="noopener">Source</a></span></div></li>').join('\n') + '\n        </ul>\n'
      : '        <p class="pr-note">No price changes logged since we started tracking on ' + esc(fmt(pw.tracking_since || '2026-10-03')) + '. Changes we find are added here and on <a href="/price-watch/">Price Watch</a>.</p>\n') +
    '      </section>\n';

  const alts = sim.length ?
    '      <section class="pr-sec">\n        <h2>Cheaper or similar alternatives to ' + name + '</h2>\n        <div class="pr-alts">\n' + sim.map(({ t: x, why }) =>
      '          <a class="pr-alt" href="/pricing/' + x.id + '/"><b>' + esc(x.n) + '</b><span class="pr-alt-p">' + esc(x.p || 'See official site') + '</span>' +
      (why ? '<span class="pr-alt-why">' + esc(why) + '</span>' : (x.b ? '<span class="pr-alt-why">' + esc(x.b.slice(0, 110)) + (x.b.length > 110 ? '&hellip;' : '') + '</span>' : '')) + '</a>').join('\n') +
    '\n        </div>\n      </section>\n' : '';

  const table = peers.length ?
    '      <section class="pr-sec">\n        <h2>' + esc(hub ? hub.name : 'Similar tools') + ': entry prices compared</h2>\n        <div class="pr-tablewrap"><table class="pr-table"><thead><tr><th>Tool</th><th>Cheapest paid plan</th><th>Checked</th></tr></thead><tbody>\n' +
    '          <tr class="pr-self"><td><b>' + name + '</b></td><td>' + priceLine + '</td><td>' + (v ? esc(short(v.date)) : '&mdash;') + '</td></tr>\n' +
    peers.map((x) => { const xv = ver(x); return '          <tr><td><a href="/pricing/' + x.id + '/">' + esc(x.n) + '</a></td><td>' + esc(x.p || 'See official site') + '</td><td>' + (xv ? esc(short(xv.date)) : '&mdash;') + '</td></tr>'; }).join('\n') +
    '\n        </tbody></table></div>\n' + (hub ? '        <p class="pr-note">See every tool in <a href="/category/' + t.h + '/">' + esc(hub.name) + '</a>.</p>\n' : '') + '      </section>\n' : '';

  const faqHtml = '      <section class="pr-sec">\n        <h2>Questions about ' + name + ' pricing</h2>\n' + faq.map(([q, a]) =>
    '        <details class="pr-faq"><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>').join('\n') + '\n      </section>\n';

  const body =
    '<header class="sg-hero text-white">\n' +
    '    <div class="container mx-auto px-4 py-12 md:py-16">\n' +
    '      <p class="text-indigo-200 text-sm font-semibold mb-2"><a href="/pricing/" class="hover:text-white">Pricing</a> / ' + name + '</p>\n' +
    '      <h1 class="text-3xl md:text-5xl font-extrabold leading-tight mb-3">' + name + ' <span class="sg-hero-accent">Pricing</span> ' + year + '</h1>\n' +
    '      <p class="text-indigo-100 max-w-2xl text-lg">' + esc(t.b) + '</p>\n' +
    '    </div>\n' +
    '  </header>\n\n' +
    '  <main class="container mx-auto px-4 py-10 max-w-5xl">\n' + card + calc + hist + alts + table + faqHtml +
    '      <section class="mt-12" data-sg-newsletter="card"></section>\n' +
    '      <p class="pr-note mt-8">Prices are the cheapest paid plan we list, in USD. We check prices on each vendor&rsquo;s own pricing page and log changes on <a href="/price-watch/">Price Watch</a>. Some links are affiliate links (<a href="/affiliate-disclosure/">disclosure</a>); that never changes a listed price.</p>\n' +
    '  </main>\n\n';
  return head(title, desc, url, !!v, ld) + body + foot;
}

function indexPage() {
  const groups = {};
  list.forEach((t) => { const k = t.h || 'other'; (groups[k] = groups[k] || []).push(t); });
  const order = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
  const nVer = list.filter(ver).length;
  const title = 'Software Pricing ' + year + ': ' + list.length + ' Business Tools, Checked at the Source | Success Gravity';
  const desc = 'Current entry prices and free plans for ' + list.length + ' business and AI tools, with the date each price was checked on the vendor&#39;s own page and cheaper alternatives.';
  const body =
    '<header class="sg-hero text-white">\n' +
    '    <div class="container mx-auto px-4 py-12 md:py-16 text-center">\n' +
    '      <h1 class="text-3xl md:text-5xl font-extrabold leading-tight mb-3">Software <span class="sg-hero-accent">Pricing</span></h1>\n' +
    '      <p class="text-indigo-100 max-w-2xl mx-auto text-lg">What ' + list.length + ' business tools cost, ' + nVer + ' of them checked on the vendor&rsquo;s own pricing page. Pick a tool for its plans, cost for your team, price history and cheaper alternatives.</p>\n' +
    '      <input id="pr-q" type="search" placeholder="Find a tool&hellip;" class="pr-search" aria-label="Find a tool">\n' +
    '    </div>\n' +
    '  </header>\n\n' +
    '  <main class="container mx-auto px-4 py-10 max-w-6xl" id="pr-index">\n' +
    order.map((k) => {
      const h = hubs[k];
      return '    <section class="pr-group">\n      <h2>' + (h ? esc(h.emoji) + ' ' + esc(h.name) : 'Other') + '</h2>\n      <div class="pr-grid">\n' +
        groups[k].sort((a, b) => a.n.localeCompare(b.n)).map((t) =>
          '        <a href="/pricing/' + t.id + '/" class="pr-item" data-name="' + esc(t.n.toLowerCase()) + '"><b>' + esc(t.n) + '</b><span>' + esc(t.p || 'See official site') + '</span>' + (ver(t) ? '<i>&#10003; checked</i>' : '') + '</a>').join('\n') +
        '\n      </div>\n    </section>';
    }).join('\n') +
    '\n    <section class="mt-12" data-sg-newsletter="card"></section>\n  </main>\n\n';
  return head(title, desc, 'https://successgravity.com/pricing/', true, []) + body + foot;
}

// ---- write ----
let written = 0;
const keep = new Set();
function put(rel, html) {
  keep.add(path.dirname(rel));
  const fp = path.join(root, rel);
  const prev = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : null;
  if (prev === html) return;
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, html);
  written++;
}
put('pricing/index.html', indexPage());
list.forEach((t) => put('pricing/' + t.id + '/index.html', toolPage(t)));
// Remove pages for tools that no longer exist
let removed = 0;
fs.readdirSync(path.join(root, 'pricing')).forEach((d) => {
  const full = path.join(root, 'pricing', d);
  if (fs.statSync(full).isDirectory() && !keep.has(path.join('pricing', d))) { fs.rmSync(full, { recursive: true }); removed++; }
});

// ---- sitemap: verified pricing pages + index ----
let sm = read('sitemap.xml');
const today = new Date().toISOString().slice(0, 10);
const want = ['https://successgravity.com/pricing/'].concat(list.filter(ver).map((t) => 'https://successgravity.com/pricing/' + t.id + '/'));
const wantSet = new Set(want);
// drop pricing URLs that are no longer verified/existing
sm = sm.replace(/  <url><loc>https:\/\/successgravity\.com\/pricing\/[^<]*<\/loc>[^\n]*\n/g, (m) => {
  const u = m.match(/<loc>([^<]+)<\/loc>/)[1];
  return wantSet.has(u) ? m : '';
});
let smAdded = 0;
want.forEach((u) => {
  if (sm.indexOf('<loc>' + u + '</loc>') === -1) {
    sm = sm.replace('</urlset>', '  <url><loc>' + u + '</loc><lastmod>' + today + '</lastmod><changefreq>weekly</changefreq><priority>' + (u.endsWith('/pricing/') ? '0.8' : '0.6') + '</priority></url>\n</urlset>');
    smAdded++;
  }
});
if (smAdded || sm !== read('sitemap.xml')) fs.writeFileSync(path.join(root, 'sitemap.xml'), sm);

console.log('pricing: ' + list.length + ' tool pages (' + list.filter(ver).length + ' indexable), ' + written + ' written, ' + removed + ' removed, sitemap +' + smAdded);
