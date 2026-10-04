// Success Gravity — share previews for My Stack links (Cloudflare Worker, no dependencies).
//
// The site is static (GitHub Pages), so /stack/?s=... returns the same HTML for every stack.
// This Worker sits in front of it and:
//   1. /stack/?s=...  → serves the normal page, but rewrites og:title / og:description /
//                        og:image so a shared link previews that stack (name, total, tools).
//   2. /og/stack.svg?s=... → draws the 1200×630 card as SVG. Social sites need PNG, so the
//                        og:image points at wsrv.nl (free image proxy) to convert it.
// Routes to add in Cloudflare: successgravity.com/stack*  and  successgravity.com/og/*
// Deploy steps: see README.md in this folder.

const ORIGIN = 'https://successgravity.com';
const PNG_PROXY = 'https://wsrv.nl/?output=png&w=1200&h=630&url=';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/og/stack.svg') return await svgResponse(url);
      if (url.pathname.startsWith('/stack') && url.searchParams.get('s')) return await stackPage(request, url);
    } catch (e) {
      // Never break the page because of a preview problem
    }
    return fetch(request);
  },
};

async function loadTools() {
  const r = await fetch(ORIGIN + '/data/tools.json', { cf: { cacheTtl: 600, cacheEverything: true } });
  const d = await r.json();
  const byId = {};
  d.tools.forEach((t) => { byId[t.id] = t; });
  return byId;
}

// Same link format as assets/stack.js: s=id~price~seats,id2,...  n=name
export function decodeStack(params, byId) {
  const items = [];
  String(params.get('s') || '').split(',').slice(0, 40).forEach((part) => {
    const bits = part.split('~');
    const t = byId[bits[0]];
    if (!t || items.some((x) => x.t.id === t.id)) return;
    const price = bits[1] !== undefined && bits[1] !== '' ? Math.max(0, Math.min(100000, parseFloat(bits[1]) || 0)) : (t.pm || 0);
    const seats = bits[2] ? Math.max(1, Math.min(999, parseInt(bits[2], 10) || 1)) : 1;
    items.push({ t, cost: price * seats, seats });
  });
  const name = String(params.get('n') || '').slice(0, 40);
  const total = items.reduce((s, x) => s + x.cost, 0);
  return { name, items, total };
}

export function money(n) {
  n = Math.round(n * 100) / 100;
  const s = n >= 1000 || n === Math.round(n) ? String(Math.round(n)) : n.toFixed(2);
  return '$' + s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const COLORS = ['#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf', '#facc15', '#c084fc', '#38bdf8'];

export function stackSvg(st) {
  const W = 1200, H = 630;
  const font = "font-family=\"Inter, 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif\"";
  const rows = st.items.slice().sort((a, b) => b.cost - a.cost).slice(0, 10);
  const label = (st.name || 'My business stack').toUpperCase();
  const totalTxt = money(st.total);
  let out = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset=".55" stop-color="#3730a3"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs>' +
    '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>' +
    '<circle cx="1080" cy="90" r="220" fill="#ffffff" fill-opacity=".06"/>' +
    '<text x="64" y="84" ' + font + ' font-size="26" font-weight="700" fill="#c7d2fe" letter-spacing="1">' + xml(label) + '</text>' +
    '<text x="60" y="196" ' + font + ' font-size="104" font-weight="800" fill="#ffffff">' + xml(totalTxt) +
    '<tspan dx="12" font-size="40" font-weight="700" fill="#c7d2fe">/mo</tspan></text>' +
    '<text x="64" y="250" ' + font + ' font-size="30" font-weight="600" fill="#e0e7ff">' + xml(money(st.total * 12) + ' a year  ·  ' + st.items.length + (st.items.length === 1 ? ' tool' : ' tools')) + '</text>';
  rows.forEach((it, i) => {
    const col = i < 5 ? 0 : 1, row = i % 5;
    const x = 64 + col * 540, y = 330 + row * 50;
    const nm = it.t.n.length > 20 ? it.t.n.slice(0, 19) + '…' : it.t.n;
    const pr = it.cost ? money(it.cost) : 'free';
    out += '<rect x="' + x + '" y="' + (y - 22) + '" width="10" height="28" fill="' + COLORS[i % COLORS.length] + '"/>' +
      '<text x="' + (x + 26) + '" y="' + y + '" ' + font + ' font-size="28" font-weight="700" fill="#ffffff">' + xml(nm) + '</text>' +
      '<text x="' + (x + 470) + '" y="' + y + '" ' + font + ' font-size="28" font-weight="700" fill="#fcd34d" text-anchor="end">' + xml(pr) + '</text>';
  });
  if (st.items.length > 10) {
    out += '<text x="64" y="590" ' + font + ' font-size="24" font-weight="600" fill="#c7d2fe">+ ' + (st.items.length - 10) + ' more</text>';
  }
  out += '<rect x="0" y="' + (H - 64) + '" width="' + W + '" height="64" fill="#ffffff" fill-opacity=".12"/>' +
    '<text x="64" y="' + (H - 22) + '" ' + font + ' font-size="26" font-weight="700" fill="#ffffff">What does your stack cost?  successgravity.com/stack</text>' +
    '</svg>';
  return out;
}

export function stackMeta(st, url) {
  const who = st.name || 'This business';
  const top = st.items.slice().sort((a, b) => b.cost - a.cost).slice(0, 4).map((x) => x.t.n).join(', ');
  return {
    title: who + ' runs on ' + st.items.length + ' tools for ' + money(st.total) + '/mo',
    description: (top ? top + (st.items.length > 4 ? ' and more' : '') + ' — ' : '') + money(st.total * 12) + ' a year. Build your own software stack and see what yours costs on Success Gravity.',
    image: PNG_PROXY + encodeURIComponent(ORIGIN + '/og/stack.svg' + url.search),
    url: ORIGIN + '/stack/' + url.search,
  };
}

async function svgResponse(url) {
  const st = decodeStack(url.searchParams, await loadTools());
  return new Response(stackSvg(st), {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
}

async function stackPage(request, url) {
  const [res, byId] = await Promise.all([fetch(request), loadTools()]);
  const st = decodeStack(url.searchParams, byId);
  if (!st.items.length) return res;
  const m = stackMeta(st, url);
  const set = (attr) => ({ element(el) { el.setAttribute('content', attr); } });
  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(m.title + ' | Success Gravity'); } })
    .on('meta[property="og:title"]', set(m.title))
    .on('meta[property="og:description"]', set(m.description))
    .on('meta[property="og:image"]', set(m.image))
    .on('meta[property="og:url"]', set(m.url))
    .on('meta[name="twitter:image"]', set(m.image))
    .on('head', { element(el) { el.append('<meta name="twitter:title" content="' + xml(m.title) + '"><meta name="twitter:description" content="' + xml(m.description) + '">', { html: true }); } })
    .transform(res);
}
