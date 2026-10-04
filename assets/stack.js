// My Stack — software spend calculator (/stack/)
// Depends on window.SGStack from site.js. Data: /data/tools.json, /data/swaps.json,
// /data/price-changes.json. The stack itself never leaves the browser unless shared.
(function () {
  'use strict';
  var S = window.SGStack;
  if (!S) return;
  var esc = S.esc, track = S.track;
  var $ = function (id) { return document.getElementById(id); };

  var PRESETS = [
    { key: 'free', emoji: '&#127793;', name: 'The $0 Launch Stack', blurb: 'Everything free to start', items: [
      ['google-analytics-4'], ['google-search-console'], ['google-business-profile'], ['canva', 0], ['mailerlite', 0], ['buffer', 0], ['wave', 0], ['google-forms']] },
    { key: 'creator', emoji: '&#127916;', name: 'Solo Creator', blurb: 'Make, post, sell', items: [
      ['canva'], ['capcut'], ['chatgpt', 20], ['kit'], ['notion', 0], ['calendly']] },
    { key: 'store', emoji: '&#128717;&#65039;', name: 'Online Store', blurb: 'Sell and email', items: [
      ['shopify'], ['klaviyo'], ['canva'], ['quickbooks'], ['tidio'], ['google-analytics-4']] },
    { key: 'agency', emoji: '&#129309;', name: 'Small Agency', blurb: '3-person team', items: [
      ['notion', null, 3], ['slack', null, 3], ['zoom', null, 2], ['semrush'], ['clickup', null, 3], ['gamma']] },
    { key: 'builder', emoji: '&#128187;', name: 'AI-First Builder', blurb: 'Ship apps with AI', items: [
      ['cursor'], ['claude'], ['lovable'], ['vercel'], ['cloudflare', 0], ['github-copilot']] }
  ];
  var COLORS = ['#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf', '#facc15', '#c084fc', '#38bdf8'];

  var tools = [], byId = {}, cats = {}, swaps = {}, changes = { entries: [], verified: {} };
  var stack = S.load();
  var shared = null; // stack decoded from ?s= (read-only until saved)

  function money(n, dec) {
    n = Math.round((n || 0) * 100) / 100;
    var fixed = dec === false || n >= 1000 || n === Math.round(n) ? Math.round(n) : n.toFixed(2);
    return '$' + String(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function perSeat(t) { return /\/\s*(user|seat|agent|member)|per (user|seat|agent|member)/i.test(t.p); }
  function rowPrice(it) {
    var t = byId[it.id];
    var p = it.price != null ? it.price : (t && t.pm != null ? t.pm : 0);
    return Math.max(0, Number(p) || 0);
  }
  function rowTotal(it) { return rowPrice(it) * (it.seats || 1); }
  function view() { return shared || stack; }
  function catLabel(c) { return (cats[c] || c || 'Other').replace(/ &.*$| & .*$/, ''); }
  function fmtDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // ---- URL encoding for sharing: s=id~price~seats,id2 & n=name ----
  function encodeStack(o) {
    var parts = o.items.map(function (it) {
      var t = byId[it.id], s = it.id;
      var custom = it.price != null && !(t && t.pm === it.price);
      if (custom || (it.seats || 1) > 1) s += '~' + (custom ? it.price : '');
      if ((it.seats || 1) > 1) s += '~' + it.seats;
      return s;
    });
    var q = 's=' + encodeURIComponent(parts.join(',')).replace(/%2C/g, ',').replace(/%7E/g, '~');
    if (o.name) q += '&n=' + encodeURIComponent(o.name);
    return location.origin + '/stack/?' + q;
  }
  function decodeStack(params) {
    var raw = params.get('s');
    if (!raw) return null;
    var items = [];
    raw.split(',').slice(0, 40).forEach(function (part) {
      var bits = part.split('~'), id = bits[0];
      if (!byId[id] || items.some(function (x) { return x.id === id; })) return;
      var price = bits[1] !== undefined && bits[1] !== '' ? Math.max(0, Math.min(100000, parseFloat(bits[1]) || 0)) : null;
      var seats = bits[2] ? Math.max(1, Math.min(999, parseInt(bits[2], 10) || 1)) : 1;
      items.push({ id: id, price: price, seats: seats });
    });
    if (!items.length) return null;
    return { name: (params.get('n') || '').slice(0, 40), items: items };
  }

  // ---- Persona ----
  function persona(total, n) {
    if (!n) return '';
    if (total === 0) return '&#127793; <b>The Bootstrapper</b> &mdash; all free plans. Respect.';
    if (total < 50) return '&#129718; <b>Lean Machine</b> &mdash; tight, efficient, no fat.';
    if (total < 150) return '&#9881;&#65039; <b>Smart Operator</b> &mdash; paying for what earns its keep.';
    if (total < 400) return '&#128640; <b>Growth Mode</b> &mdash; investing to scale.';
    if (total < 1000) return '&#127970; <b>Scale-Up Stack</b> &mdash; serious tooling. Audit it yearly.';
    return '&#128142; <b>Enterprise Energy</b> &mdash; time for a software budget review.';
  }

  // ---- Swap suggestions ----
  function bestSwap(it) {
    // Swaps are listed in editorial order: use the first one that is actually cheaper.
    var list = swaps[it.id];
    if (!list) return null;
    var current = rowTotal(it);
    if (current <= 0) return null;
    for (var i = 0; i < list.length; i++) {
      var alt = byId[list[i][0]];
      if (!alt || alt.pm == null || alt.usage) continue;
      var altCost = alt.pm * (perSeat(alt) ? (it.seats || 1) : 1);
      var save = (current - altCost) * 12;
      if (save < 12) continue; // under $1/mo isn't worth a switch
      // A free tier rarely replaces a paid plan one-for-one, so it is shown but not counted.
      return { alt: alt, why: list[i][1], altCost: altCost, save: altCost > 0 ? save : 0, free: altCost === 0 };
    }
    return null;
  }

  // ---- Rendering ----
  function render() {
    var v = view(), ro = !!shared;
    var list = $('sgs-list');
    var total = 0, savings = 0, byCat = {};
    list.innerHTML = '';
    v.items.forEach(function (it) {
      var t = byId[it.id];
      if (!t) return;
      var tot = rowTotal(it);
      total += tot;
      byCat[t.c] = (byCat[t.c] || 0) + tot;
      var sw = bestSwap(it);
      if (sw) savings += sw.save;
      var ver = changes.verified[t.id] || (t.vd ? { date: t.vd, source: t.vs } : null);
      var li = document.createElement('li');
      li.className = 'sgs-row px-5 md:px-6 py-4';
      li.setAttribute('data-id', t.id);
      var nameHTML = t.rv ? '<a href="' + esc(t.rv) + '" class="font-bold text-gray-900 hover:text-indigo-600">' + esc(t.n) + '</a>' : '<span class="font-bold text-gray-900">' + esc(t.n) + '</span>';
      var seatHTML = perSeat(t) || (it.seats || 1) > 1
        ? '<label class="sgs-field"><span>Seats</span><input type="number" min="1" max="999" step="1" inputmode="numeric" data-k="seats" value="' + (it.seats || 1) + '"' + (ro ? ' disabled' : '') + '></label>'
        : '';
      li.innerHTML =
        '<div class="flex items-start gap-3">' +
          (window.sgLogoHTML ? sgLogoHTML(t.l, t.n, t.i) : '') +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-start justify-between gap-2">' +
              '<div class="min-w-0">' + nameHTML +
                ' <span class="sg-chip sg-acc-slate ml-1">' + esc(catLabel(t.c)) + '</span>' +
                '<p class="text-xs text-gray-500 mt-1">Listed: ' + esc(t.p || 'n/a') +
                  (ver ? ' &middot; <a href="' + esc(ver.source) + '" target="_blank" rel="noopener" class="sgs-ver" title="Checked against the official pricing page">&#10003; verified ' + esc(fmtDate(ver.date)) + '</a>' : '') +
                  (t.usage ? ' &middot; <span class="text-amber-700">usage-based &mdash; enter your average</span>' :
                    t.pm == null ? ' &middot; <span class="text-amber-700">price not checked yet &mdash; enter what you pay</span>' : '') +
                '</p>' +
              '</div>' +
              (ro ? '' : '<button type="button" class="sgs-x" data-act="remove" aria-label="Remove ' + esc(t.n) + '">&times;</button>') +
            '</div>' +
            '<div class="flex flex-wrap items-end gap-3 mt-3">' +
              '<label class="sgs-field"><span>' + (perSeat(t) ? '$ / seat / mo' : '$ / month') + '</span><input type="number" min="0" max="100000" step="0.01" inputmode="decimal" data-k="price" value="' + rowPrice(it) + '"' + (ro ? ' disabled' : '') + '></label>' +
              seatHTML +
              '<p class="sgs-rowtotal ml-auto text-right"><b>' + money(tot) + '</b><span>/mo</span><br><small>' + money(tot * 12, false) + '/yr</small></p>' +
            '</div>' +
            (sw ? '<div class="sgs-swap mt-3">&#128161; <b>Swap idea:</b> ' +
              '<a href="' + esc(sw.alt.rv || sw.alt.l) + '"' + (sw.alt.rv ? '' : ' target="_blank" rel="sponsored noopener" class="affiliate-link" data-tool="' + esc(sw.alt.id) + '"') + ' data-swap="' + esc(t.id) + '">' + esc(sw.alt.n) + '</a> &mdash; ' + esc(sw.why) +
              (sw.free ? '. It has a free plan &mdash; worth a look if its limits fit you.' : '. Lists from ' + money(sw.altCost) + '/mo, so <b>~' + money(sw.save, false) + '/yr less</b>. Check the features you rely on first.') + '</div>' : '') +
          '</div>' +
        '</div>';
      list.appendChild(li);
    });

    var n = v.items.length;
    $('sgs-empty').style.display = n ? 'none' : '';
    $('sgs-count').textContent = n ? '(' + n + ')' : '';
    $('sgs-clear').classList.toggle('hidden', !n || ro);
    $('sgs-month').textContent = money(total);
    $('sgs-year').textContent = money(total * 12, false);
    $('sgs-tools').textContent = n + (n === 1 ? ' tool' : ' tools');
    $('sgs-persona').innerHTML = persona(total, n);
    var nameEl = $('sgs-name');
    if (document.activeElement !== nameEl) nameEl.value = v.name || '';
    nameEl.disabled = ro;

    // Category bar + legend
    var entries = Object.keys(byCat).map(function (c) { return [c, byCat[c]]; }).filter(function (e) { return e[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1]; });
    var bar = $('sgs-bar'), legend = $('sgs-legend');
    bar.innerHTML = ''; legend.innerHTML = '';
    entries.forEach(function (e, i) {
      var pct = total ? (e[1] / total) * 100 : 0;
      var col = COLORS[i % COLORS.length];
      bar.innerHTML += '<span style="width:' + pct.toFixed(2) + '%;background:' + col + '"></span>';
      if (i < 5) legend.innerHTML += '<li><i style="background:' + col + '"></i>' + esc(catLabel(e[0])) + ' <b>' + Math.round(pct) + '%</b></li>';
    });
    bar.style.display = entries.length ? '' : 'none';

    var save = $('sgs-save');
    if (savings >= 12) {
      save.classList.remove('hidden');
      save.innerHTML = '&#128176; Swaps below could save up to <b>' + money(savings, false) + '/yr</b>';
    } else { save.classList.add('hidden'); }

    renderShare();
    renderQuick();
    renderWatch();
  }

  function renderQuick() {
    var have = {};
    view().items.forEach(function (i) { have[i.id] = 1; });
    var q = tools.filter(function (t) { return !have[t.id] && t.pm && !t.usage && t.c !== 'government-resources'; })
      .sort(function (a, b) { return b.pop - a.pop || b.r - a.r; }).slice(0, 12);
    $('sgs-quick').innerHTML = q.map(function (t) {
      return '<button type="button" class="sgs-chip" data-add="' + esc(t.id) + '"' + (shared ? ' disabled' : '') + '>&#65291; ' + esc(t.n) + '</button>';
    }).join('');
  }

  function renderWatch() {
    var box = $('sgs-watch'), v = view();
    var mine = {};
    v.items.forEach(function (i) { mine[i.id] = 1; });
    var hits = (changes.entries || []).filter(function (e) { return mine[e.tool]; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var html = '<h3 class="font-extrabold text-gray-900 mb-1">&#128276; Price changes in this stack</h3>';
    if (!v.items.length) {
      html += '<p class="text-sm text-gray-500">Add tools and we&rsquo;ll show any price changes we&rsquo;ve logged for them.</p>';
    } else if (!hits.length) {
      html += '<p class="text-sm text-gray-500">No logged changes for these tools yet. We re-check prices every week &mdash; come back, or get the Monday email below.</p>';
    } else {
      html += '<ul class="space-y-3 mt-3">' + hits.slice(0, 6).map(function (e) {
        var arrow = e.dir === 'up' ? '<span class="sgs-up">&#9650;</span>' : e.dir === 'down' ? '<span class="sgs-down">&#9660;</span>' : '<span class="sgs-plan">&#9679;</span>';
        return '<li class="text-sm">' + arrow + ' <b>' + esc(e.name) + '</b> <span class="text-gray-400">' + esc(fmtDate(e.date)) + '</span><br>' +
          '<span class="text-gray-700">' + (e.from ? esc(e.from) + ' &rarr; ' : '') + esc(e.to) + '</span></li>';
      }).join('') + '</ul>';
    }
    html += '<a href="/price-watch/" class="inline-block mt-4 text-sm font-semibold text-indigo-600">See all price changes &rarr;</a>';
    box.innerHTML = html;
  }

  function renderAlerts() {
    var prev = S.prevVisit, box = $('sgs-alerts');
    if (!prev || shared || !stack.items.length) return;
    var mine = {};
    stack.items.forEach(function (i) { mine[i.id] = 1; });
    var fresh = (changes.entries || []).filter(function (e) { return mine[e.tool] && e.date > prev; });
    if (!fresh.length) return;
    box.classList.remove('hidden');
    box.className = 'sgs-alert mb-6';
    box.innerHTML = '&#128276; <b>Since your last visit (' + esc(fmtDate(prev)) + '):</b> ' + fresh.map(function (e) {
      return esc(e.name) + ' ' + (e.dir === 'up' ? '&#9650;' : e.dir === 'down' ? '&#9660;' : '&bull;') + ' ' + esc(e.to);
    }).join(' &middot; ');
  }

  function renderShared() {
    var box = $('sgs-shared');
    $('sgs-adder').classList.toggle('hidden', !!shared);
    $('sgs-presetwrap').classList.toggle('hidden', !!shared);
    if (!shared) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.className = 'sgs-sharedbar mb-6';
    box.innerHTML = '<div><p class="font-extrabold text-lg">&#128064; You&rsquo;re viewing ' + (shared.name ? '<span class="text-indigo-700">' + esc(shared.name) + '</span>' : 'a shared stack') + '</p>' +
      '<p class="text-sm text-gray-600">Someone shared their software stack with you. Compare it with yours, or copy it as a starting point.</p></div>' +
      '<div class="flex flex-wrap gap-2"><button type="button" class="sg-btn-primary sg-btn-sm" data-act="adopt">Copy to My Stack</button>' +
      '<button type="button" class="sg-btn-ghost sg-btn-sm" data-act="own">' + (stack.items.length ? 'Back to my stack' : 'Build my own') + '</button></div>';
  }

  // ---- Share ----
  function shareText() {
    var v = view(), total = v.items.reduce(function (s, it) { return s + rowTotal(it); }, 0);
    return (v.name ? v.name + ' runs' : 'My business runs') + ' on ' + v.items.length + ' tools for ' + money(total) + '/mo. What does yours cost?';
  }
  function renderShare() {
    var url = encodeStack(view()), text = shareText();
    $('sgs-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
    $('sgs-li').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
    var off = !view().items.length;
    ['sgs-copy', 'sgs-img', 'sgs-native'].forEach(function (id) { $(id).disabled = off; });
    ['sgs-x', 'sgs-li'].forEach(function (id) { $(id).classList.toggle('sgs-off', off); });
  }

  function drawCard() {
    var v = view(), W = 1200, H = 630;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1e1b4b'); grad.addColorStop(0.55, '#3730a3'); grad.addColorStop(1, '#6d28d9');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.beginPath(); g.arc(1080, 90, 220, 0, Math.PI * 2); g.fill();
    var font = function (w, s) { return w + ' ' + s + 'px Inter, -apple-system, Segoe UI, Roboto, sans-serif'; };
    var total = v.items.reduce(function (s, it) { return s + rowTotal(it); }, 0);
    g.fillStyle = '#c7d2fe'; g.font = font(700, 26);
    g.fillText((v.name ? v.name : 'MY BUSINESS STACK').toUpperCase().slice(0, 40), 64, 84);
    g.fillStyle = '#ffffff'; g.font = font(800, 104);
    g.fillText(money(total), 60, 196);
    var w = g.measureText(money(total)).width;
    g.fillStyle = '#c7d2fe'; g.font = font(700, 40); g.fillText('/mo', 74 + w, 196);
    g.fillStyle = '#e0e7ff'; g.font = font(600, 30);
    g.fillText(money(total * 12, false) + ' a year  ·  ' + v.items.length + ' tools', 64, 250);
    var rows = v.items.slice().sort(function (a, b) { return rowTotal(b) - rowTotal(a); }).slice(0, 10);
    rows.forEach(function (it, i) {
      var t = byId[it.id], col = i < 5 ? 0 : 1, row = i % 5;
      var x = 64 + col * 540, y = 330 + row * 50;
      g.fillStyle = COLORS[i % COLORS.length]; g.fillRect(x, y - 22, 10, 28);
      g.fillStyle = '#ffffff'; g.font = font(700, 28);
      var nm = t.n.length > 20 ? t.n.slice(0, 19) + '…' : t.n;
      g.fillText(nm, x + 26, y);
      g.fillStyle = '#fcd34d'; g.font = font(700, 28);
      var pr = rowTotal(it) ? money(rowTotal(it)) : 'free';
      g.fillText(pr, x + 470 - g.measureText(pr).width, y);
    });
    if (v.items.length > 10) { g.fillStyle = '#c7d2fe'; g.font = font(600, 24); g.fillText('+ ' + (v.items.length - 10) + ' more', 64, 600 - 20); }
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, H - 64, W, 64);
    g.fillStyle = '#ffffff'; g.font = font(700, 26);
    g.fillText('What does your stack cost?  successgravity.com/stack', 64, H - 22);
    return c;
  }

  function copyLink() {
    var url = encodeStack(view()), btn = $('sgs-copy');
    function done() { btn.innerHTML = '&#10004; Copied!'; setTimeout(function () { btn.innerHTML = '&#128279; Copy link'; }, 1600); }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); });
    else prompt('Copy this link:', url);
    track('stack_share', { method: 'copy', tools: view().items.length });
  }
  function saveImage() {
    var c = drawCard();
    c.toBlob(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'my-software-stack.png', { type: 'image/png' });
      if (navigator.canShare && window.matchMedia('(pointer: coarse)').matches && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: shareText(), url: encodeStack(view()) }).catch(function () {});
      } else {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'my-software-stack.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      }
      track('stack_share', { method: 'image', tools: view().items.length });
    }, 'image/png');
  }

  // ---- Search ----
  var results = [], active = -1;
  function search(q) {
    q = q.trim().toLowerCase();
    var box = $('sgs-results');
    if (!q) { box.classList.add('hidden'); results = []; return; }
    var have = {};
    stack.items.forEach(function (i) { have[i.id] = 1; });
    results = tools.filter(function (t) {
      return t.n.toLowerCase().indexOf(q) !== -1 || (cats[t.c] || '').toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      var as = a.n.toLowerCase().indexOf(q) === 0 ? 0 : 1, bs = b.n.toLowerCase().indexOf(q) === 0 ? 0 : 1;
      return as - bs || b.pop - a.pop;
    }).slice(0, 8);
    active = results.length ? 0 : -1;
    box.innerHTML = results.length ? results.map(function (t, i) {
      return '<li role="option" data-add="' + esc(t.id) + '" class="' + (i === active ? 'on' : '') + '">' +
        '<span class="font-semibold">' + esc(t.n) + '</span> <span class="text-xs text-gray-500">' + esc(catLabel(t.c)) + '</span>' +
        '<span class="ml-auto text-xs ' + (have[t.id] ? 'text-green-600 font-semibold' : 'text-gray-500') + '">' + (have[t.id] ? '&#10003; added' : esc(t.p)) + '</span></li>';
    }).join('') : '<li class="sgs-req text-sm text-gray-600">Not in our directory yet. <button type="button" class="text-indigo-600 font-semibold underline" data-request="' + esc(q) + '">Request &ldquo;' + esc(q) + '&rdquo;</button> &mdash; we add requested tools first.</li>';
    box.classList.remove('hidden');
  }

  // ---- Tool requests (feed the directory queue) ----
  function requestTool(name, li) {
    name = String(name || '').trim().slice(0, 80);
    if (!name) return;
    var fd = new FormData();
    fd.append('form_type', 'tool_request');
    fd.append('_subject', 'Tool request: ' + name);
    fd.append('tool', name);
    fd.append('page', location.pathname);
    li.innerHTML = 'Sending&hellip;';
    fetch('https://formspree.io/f/mzebnylr', { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(); li.innerHTML = '&#9989; Thanks &mdash; &ldquo;' + esc(name) + '&rdquo; is on our list to add.'; })
      .catch(function () { li.innerHTML = 'Couldn&rsquo;t send. Email <a class="text-indigo-600 font-semibold" href="mailto:help@successgravity.com?subject=' + encodeURIComponent('Tool request: ' + name) + '">help@successgravity.com</a>.'; });
    track('tool_request', { tool: name });
  }

  // ---- Mutations ----
  function addTool(id, price, seats) {
    if (shared) return;
    if (stack.items.some(function (i) { return i.id === id; })) { flash(id); return; }
    stack.items.unshift({ id: id, price: price == null ? null : price, seats: seats || 1 });
    commit();
    track('stack_add', { tool: id, from: '/stack/' });
    flash(id);
  }
  function commit() { S.save(stack); stack = S.load(); render(); }
  function flash(id) {
    var el = document.querySelector('.sgs-row[data-id="' + id + '"]');
    if (el) { el.classList.remove('sgs-flash'); void el.offsetWidth; el.classList.add('sgs-flash'); }
  }
  function loadPreset(p) {
    if (shared) exitShared();
    if (stack.items.length && !confirm('Replace your current stack with "' + p.name + '"?')) return;
    stack = { name: p.name, items: p.items.filter(function (x) { return byId[x[0]]; }).map(function (x) {
      return { id: x[0], price: x[1] == null ? null : x[1], seats: x[2] || 1 };
    }) };
    commit();
    track('stack_preset', { preset: p.key });
    $('sgs-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function exitShared() {
    shared = null;
    history.replaceState(null, '', '/stack/');
    renderShared(); render();
  }

  function bind() {
    var input = $('sgs-search');
    input.addEventListener('input', function () { search(input.value); });
    input.addEventListener('keydown', function (e) {
      var box = $('sgs-results');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!results.length) return;
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        box.querySelectorAll('li').forEach(function (li, i) { li.classList.toggle('on', i === active); });
      } else if (e.key === 'Enter') {
        if (active >= 0 && results[active]) { e.preventDefault(); addTool(results[active].id); input.value = ''; search(''); }
      } else if (e.key === 'Escape') { input.value = ''; search(''); }
    });
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t.closest) return;
      var add = t.closest('[data-add]');
      if (add && !add.disabled) {
        addTool(add.getAttribute('data-add'));
        if (add.closest('#sgs-results')) { input.value = ''; search(''); input.focus(); }
        return;
      }
      var req = t.closest('[data-request]');
      if (req) { requestTool(req.getAttribute('data-request'), req.closest('li')); return; }
      if (!t.closest('#sgs-adder')) $('sgs-results').classList.add('hidden');
      var act = t.closest('[data-act]');
      if (act) {
        var a = act.getAttribute('data-act');
        if (a === 'remove') {
          var id = act.closest('.sgs-row').getAttribute('data-id');
          stack.items = stack.items.filter(function (i) { return i.id !== id; });
          commit();
        } else if (a === 'adopt') {
          if (stack.items.length && !confirm('Replace your current stack with this one?')) return;
          stack = { name: shared.name, items: shared.items };
          exitShared(); commit();
          track('stack_adopt', { tools: stack.items.length });
        } else if (a === 'own') { exitShared(); }
        return;
      }
      var pr = t.closest('[data-preset]');
      if (pr) { loadPreset(PRESETS[+pr.getAttribute('data-preset')]); return; }
      var sw = t.closest('[data-swap]');
      if (sw) track('stack_swap_click', { from: sw.getAttribute('data-swap'), to: sw.textContent });
    });
    $('sgs-list').addEventListener('change', function (e) {
      var inp = e.target, row = inp.closest('.sgs-row');
      if (!row || shared) return;
      var id = row.getAttribute('data-id'), k = inp.getAttribute('data-k');
      var it = stack.items.filter(function (i) { return i.id === id; })[0];
      if (!it) return;
      if (k === 'price') it.price = Math.max(0, Math.min(100000, parseFloat(inp.value) || 0));
      if (k === 'seats') it.seats = Math.max(1, Math.min(999, parseInt(inp.value, 10) || 1));
      commit();
    });
    $('sgs-name').addEventListener('input', function (e) {
      if (shared) return;
      stack.name = e.target.value.slice(0, 40);
      S.save(stack);
      renderShare();
    });
    $('sgs-clear').addEventListener('click', function () {
      if (confirm('Remove every tool from your stack?')) { stack = { name: '', items: [] }; commit(); }
    });
    $('sgs-copy').addEventListener('click', copyLink);
    $('sgs-img').addEventListener('click', saveImage);
    if (navigator.share) {
      $('sgs-native').classList.remove('hidden');
      $('sgs-native').addEventListener('click', function () {
        navigator.share({ title: 'My software stack', text: shareText(), url: encodeStack(view()) }).catch(function () {});
        track('stack_share', { method: 'native', tools: view().items.length });
      });
    }
    $('sgs-x').addEventListener('click', function () { track('stack_share', { method: 'x' }); });
    $('sgs-li').addEventListener('click', function () { track('stack_share', { method: 'linkedin' }); });
    document.addEventListener('sg:stack', function (e) { if (!shared && e.detail !== stack) { stack = S.load(); render(); } });
  }

  function renderPresets() {
    $('sgs-presets').innerHTML = PRESETS.map(function (p, i) {
      var total = p.items.reduce(function (s, x) {
        var t = byId[x[0]];
        if (!t) return s;
        var price = x[1] != null ? x[1] : (t.pm || 0);
        return s + price * (x[2] || 1);
      }, 0);
      return '<button type="button" class="sgs-preset" data-preset="' + i + '"><span class="text-2xl" aria-hidden="true">' + p.emoji + '</span>' +
        '<span class="font-bold text-gray-900 text-sm leading-tight mt-1">' + p.name + '</span>' +
        '<span class="text-xs text-gray-500">' + p.blurb + '</span>' +
        '<span class="text-sm font-extrabold text-indigo-600 mt-1">' + money(total, false) + '/mo</span></button>';
    }).join('');
  }

  Promise.all([
    S.tools(),
    fetch('/data/swaps.json').then(function (r) { return r.json(); }).catch(function () { return { swaps: {} }; }),
    S.changes().catch(function () { return { entries: [], verified: {} }; })
  ]).then(function (res) {
    tools = res[0].tools.filter(function (t) { return t.c !== 'government-resources'; });
    cats = res[0].categories || {};
    tools.forEach(function (t) { byId[t.id] = t; });
    swaps = res[1].swaps || {};
    changes = res[2] || changes;
    changes.verified = changes.verified || {};
    stack.items = stack.items.filter(function (i) { return byId[i.id]; });
    shared = decodeStack(new URLSearchParams(location.search));
    if (shared) track('stack_shared_view', { tools: shared.items.length });
    renderPresets();
    renderShared();
    renderAlerts();
    bind();
    render();
  }).catch(function () {
    $('sgs-empty').innerHTML = '<p class="font-semibold text-gray-700">Couldn&rsquo;t load the tool list.</p><p class="text-sm">Please refresh the page.</p>';
  });
})();
