// Success Gravity shared scripts
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('sg-menu-btn');
  var menu = document.getElementById('sg-mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', menu.classList.contains('open') ? 'true' : 'false');
    });
  }
  // Copy-email buttons (contact page)
  document.querySelectorAll('[data-copy]').forEach(function (el) {
    el.addEventListener('click', function () {
      var text = el.getAttribute('data-copy');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          var old = el.textContent;
          el.textContent = 'Copied!';
          setTimeout(function () { el.textContent = old; }, 1500);
        });
      }
    });
  });
  // Current year in footer
  document.querySelectorAll('.sg-year').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // ── Design v2: scroll reveal (works for dynamically added cards too) ──
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('sg-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  }
  function observeReveals(root) {
    (root || document).querySelectorAll('.sg-reveal:not(.sg-in)').forEach(function (el) {
      if (io) { io.observe(el); } else { el.classList.add('sg-in'); }
    });
  }
  observeReveals(document);
  if ('MutationObserver' in window) {
    new MutationObserver(function () { observeReveals(document); sgInitTilt(); })
      .observe(document.body, { childList: true, subtree: true });
  }

  // ── v3: 3D tilt cards (desktop pointers only) ──
  function sgInitTilt() {
    if (!window.VanillaTilt) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.sg-card2:not([data-tilt-init]), .sg-card:not([data-tilt-init])').forEach(function (el) {
      el.setAttribute('data-tilt-init', '1');
      // Skip cards with interactive controls — tilt transforms interfere with clicking
      if (el.closest('#programs') || el.querySelector('button') || el.querySelector('a')) return;
      VanillaTilt.init(el, { max: 4, speed: 400, scale: 1.01, glare: true, 'max-glare': 0.1 });
    });
  }
  // libs load with defer — try now and shortly after
  sgInitTilt();
  setTimeout(sgInitTilt, 600);

  // ── v3: GSAP scroll choreography (progressive enhancement, runs once) ──
  var sgGsapDone = false;
  function sgInitGsap() {
    if (sgGsapDone) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    sgGsapDone = true;
    gsap.registerPlugin(ScrollTrigger);
    var hero = document.querySelector('.sg-hero');
    if (hero) {
      var inner = hero.querySelector('.container');
      if (inner) {
        gsap.to(inner, { opacity: 0.65, ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      }
    }
    gsap.utils.toArray('main h2').forEach(function (el) {
      gsap.from(el, { x: -26, opacity: 0, duration: 0.55, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    var tags = gsap.utils.toArray('#tag-cloud .tag');
    if (tags.length) {
      gsap.from(tags, { scale: 0.6, opacity: 0, duration: 0.35, stagger: 0.018, ease: 'back.out(2)',
        scrollTrigger: { trigger: '#tag-cloud', start: 'top 85%' } });
    }
  }
  sgInitGsap();
  setTimeout(sgInitGsap, 700);


  // ── v10: universal share button (every page) ──
  (function () {
    if (document.getElementById('sg-share-fab')) return;
    var fab = document.createElement('button');
    fab.id = 'sg-share-fab';
    fab.setAttribute('aria-label', 'Share this page');
    fab.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>';
    document.body.appendChild(fab);

    var pop = document.createElement('div');
    pop.id = 'sg-share-pop';
    pop.style.display = 'none';
    document.body.appendChild(pop);

    function buildPop() {
      var url = location.href;
      var title = document.title.split('|')[0].trim();
      var eu = encodeURIComponent(url), et = encodeURIComponent(title);
      pop.innerHTML =
        '<p class="sg-share-title">Share this page</p>' +
        '<button class="sg-share-row" data-act="copy">&#128279; Copy link</button>' +
        '<a class="sg-share-row" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=' + eu + '&text=' + et + '">&#120143; Share on X</a>' +
        '<a class="sg-share-row" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + eu + '">&#128216; Facebook</a>' +
        '<a class="sg-share-row" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + eu + '">&#128188; LinkedIn</a>' +
        '<a class="sg-share-row" href="mailto:?subject=' + et + '&body=' + et + '%0A' + eu + '">&#9993;&#65039; Email</a>';
      pop.querySelector('[data-act="copy"]').addEventListener('click', function () {
        var b = this;
        function done() { b.innerHTML = '&#10004; Copied!'; setTimeout(function () { b.innerHTML = '&#128279; Copy link'; }, 1600); }
        if (navigator.clipboard) { navigator.clipboard.writeText(url).then(done, done); } else { done(); }
      });
    }

    fab.addEventListener('click', function () {
      var url = location.href;
      var title = document.title.split('|')[0].trim();
      if (typeof gtag === 'function') gtag('event', 'share_click', { page: location.pathname });
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        navigator.share({ title: title, url: url }).catch(function () {});
        return;
      }
      if (pop.style.display === 'none') { buildPop(); pop.style.display = 'block'; }
      else { pop.style.display = 'none'; }
    });
    document.addEventListener('click', function (e) {
      if (pop.style.display !== 'none' && !pop.contains(e.target) && e.target !== fab && !fab.contains(e.target)) {
        pop.style.display = 'none';
      }
    });
  })();

  // ── Design v2: animated stat counters ──
  function animateCount(el) {
    var to = parseInt(el.getAttribute('data-count-to'), 10) || 0;
    var suffix = el.getAttribute('data-count-suffix') || '';
    var t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / 1200, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length) {
    if (io) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(animateCount);
    }
  }
});

// ── Design v2: tool logo helper (auto favicon with monogram fallback) ──
// Usage: sgLogoHTML('https://tool.com', 'Tool Name') → returns logo markup string.
function sgLogoHTML(link, name, icon) {
  var domain = '';
  try { domain = new URL(link).hostname; } catch (e) { domain = ''; }
  var initial = (name || '?').replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || '?';
  var mono = '<span class="sg-logo-mono">' + initial + '</span>';
  if (!icon && !domain) return '<div class="sg-logo-ring"><span>' + mono + '</span></div>';
  var src = icon || ('https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64');
  return '<div class="sg-logo-ring"><span><img src="' + src + '" alt="' + (name || '') +
    ' logo" width="32" height="32" loading="lazy" onerror="this.outerHTML=\'<span class=&quot;sg-logo-mono&quot;>' +
    initial + '</span>\'"></span></div>';
}

// ── v11: My Stack, Price Watch alerts, newsletter (return-visit features) ──
// Everything here is client-side: the stack lives in localStorage, and price
// changes come from /data/price-changes.json, which the weekly routine updates.
(function () {
  var LS_STACK = 'sg_stack_v1', LS_LAST = 'sg_last_visit', SS_PREV = 'sg_prev_visit';
  var FORM_URL = 'https://formspree.io/f/mzebnylr';

  function store(kind) {
    return function (k, v) {
      try {
        var s = kind === 'l' ? window.localStorage : window.sessionStorage;
        if (v === undefined) return s.getItem(k);
        if (v === null) s.removeItem(k); else s.setItem(k, v);
      } catch (e) { return null; }
    };
  }
  var ls = store('l'), ss = store('s');
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isoToday() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function track(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }

  var jsonCache = {};
  function getJSON(url) {
    if (!jsonCache[url]) {
      jsonCache[url] = fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); });
    }
    return jsonCache[url];
  }

  // ---- Stack storage (shared with /stack/) ----
  var SGStack = {
    load: function () {
      try {
        var o = JSON.parse(ls(LS_STACK) || 'null');
        if (o && Array.isArray(o.items)) return o;
      } catch (e) {}
      return { name: '', items: [] };
    },
    save: function (o) {
      o.updated = isoToday();
      ls(LS_STACK, JSON.stringify(o));
      document.dispatchEvent(new CustomEvent('sg:stack', { detail: o }));
    },
    has: function (id) { return SGStack.load().items.some(function (i) { return i.id === id; }); },
    add: function (id, price, seats) {
      var o = SGStack.load();
      if (o.items.some(function (i) { return i.id === id; })) return o;
      o.items.push({ id: id, price: price == null ? null : price, seats: seats || 1 });
      SGStack.save(o);
      track('stack_add', { tool: id, from: location.pathname });
      return o;
    },
    remove: function (id) {
      var o = SGStack.load();
      o.items = o.items.filter(function (i) { return i.id !== id; });
      SGStack.save(o);
      return o;
    },
    count: function () { return SGStack.load().items.length; },
    tools: function () { return getJSON('/data/tools.json'); },
    changes: function () { return getJSON('/data/price-changes.json'); },
    today: isoToday,
    esc: esc,
    track: track
  };
  window.SGStack = SGStack;

  // ---- Visit tracking: remember the previous visit for this session ----
  var today = isoToday();
  var prevVisit = ss(SS_PREV);
  if (prevVisit === null) {
    prevVisit = ls(LS_LAST) || '';
    ss(SS_PREV, prevVisit);
    ls(LS_LAST, today);
  }
  SGStack.prevVisit = prevVisit;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var path = location.pathname;

    // ---- Nav: My Stack + Price Watch ----
    var desk = document.querySelector('nav div.md\\:flex');
    var about = desk && desk.querySelector('a[href="/about/"]');
    if (desk && about && !desk.querySelector('.sg-nav-stack')) {
      var pw = document.createElement('a');
      pw.href = '/price-watch/';
      pw.className = 'hidden xl:inline hover:text-indigo-600' + (path.indexOf('/price-watch/') === 0 ? ' text-indigo-600 font-semibold' : '');
      pw.textContent = 'Price Watch';
      var st = document.createElement('a');
      st.href = '/stack/';
      st.className = 'sg-nav-stack hidden lg:inline hover:text-indigo-600' + (path.indexOf('/stack/') === 0 ? ' text-indigo-600 font-semibold' : '');
      st.innerHTML = 'My Stack<span class="sg-nav-count" hidden></span>';
      desk.insertBefore(pw, about);
      desk.insertBefore(st, about);
    }
    var mob = document.getElementById('sg-mobile-menu');
    if (mob && !mob.querySelector('.sg-nav-stack')) {
      var first = mob.querySelector('a');
      var m1 = document.createElement('a');
      m1.href = '/stack/'; m1.className = 'sg-nav-stack block py-1 font-semibold text-indigo-600';
      m1.innerHTML = '&#129520; My Stack<span class="sg-nav-count" hidden></span>';
      var m2 = document.createElement('a');
      m2.href = '/price-watch/'; m2.className = 'block py-1 font-semibold text-indigo-600';
      m2.innerHTML = '&#128276; Price Watch';
      if (first && first.nextSibling) { mob.insertBefore(m2, first.nextSibling); mob.insertBefore(m1, m2); }
      else { mob.appendChild(m1); mob.appendChild(m2); }
    }
    function paintCount() {
      var n = SGStack.count();
      document.querySelectorAll('.sg-nav-count').forEach(function (el) {
        el.textContent = n; el.hidden = !n;
      });
    }
    paintCount();
    document.addEventListener('sg:stack', paintCount);

    // ---- "Add to My Stack" buttons on directory/home cards and review pages ----
    var byName = null, byReview = null;
    function withTools(fn) {
      SGStack.tools().then(function (d) {
        if (!byName) {
          byName = {}; byReview = {};
          d.tools.forEach(function (t) { byName[t.n] = t; if (t.rv) byReview[t.rv] = t; });
        }
        fn();
      }).catch(function () {});
    }
    function paintBtn(btn) {
      var on = SGStack.has(btn.getAttribute('data-stack-id'));
      btn.classList.toggle('sg-added', on);
      btn.innerHTML = on ? '&#10003; In My Stack' : '&#65291; Add to My Stack';
    }
    function decorateCards() {
      var cmp = document.querySelectorAll('.compare-btn[data-name], .sgd-cmp-btn[data-name]');
      if (!cmp.length) return;
      withTools(function () {
        cmp.forEach(function (b) {
          var row = b.parentNode;
          if (!row || (row.nextElementSibling && row.nextElementSibling.classList.contains('sg-stack-row'))) return;
          var t = byName[b.getAttribute('data-name')];
          if (!t) return;
          var wrap = document.createElement('div');
          wrap.className = 'sg-stack-row mt-2';
          wrap.innerHTML = '<button type="button" class="sg-btn-ghost sg-btn-sm sg-stack-btn w-full" data-stack-id="' + esc(t.id) + '"></button>';
          row.parentNode.insertBefore(wrap, row.nextSibling);
          paintBtn(wrap.firstChild);
        });
      });
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.sg-stack-btn');
      if (!b) return;
      e.preventDefault();
      var id = b.getAttribute('data-stack-id');
      if (SGStack.has(id)) SGStack.remove(id); else SGStack.add(id);
      document.querySelectorAll('.sg-stack-btn[data-stack-id="' + id + '"]').forEach(paintBtn);
      if (SGStack.has(id)) toast('Added to <a href="/stack/">My Stack</a> &mdash; see your total cost &rarr;');
    });
    document.addEventListener('sg:stack', function () { document.querySelectorAll('.sg-stack-btn').forEach(paintBtn); });
    decorateCards();
    var progs = document.getElementById('programs') || document.getElementById('sgd-grid') || document.querySelector('main');
    if (progs && 'MutationObserver' in window) {
      var pending = false;
      new MutationObserver(function () {
        if (pending) return; pending = true;
        setTimeout(function () { pending = false; decorateCards(); }, 120);
      }).observe(progs, { childList: true, subtree: true });
    }
    if (/^\/review\/[^/]+\/$/.test(path)) {
      var cta = document.querySelector('aside a.sg-cta');
      if (cta) withTools(function () {
        var t = byReview[path];
        if (!t || document.querySelector('aside .sg-stack-btn')) return;
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'sg-btn-ghost sg-stack-btn w-full mt-3';
        b.setAttribute('data-stack-id', t.id);
        cta.parentNode.insertBefore(b, cta.nextSibling);
        paintBtn(b);
      });
    }

    // ---- Toast ----
    var toastEl = null, toastTimer = null;
    function toast(html) {
      if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'sg-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
      toastEl.innerHTML = html; toastEl.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
    }
    SGStack.toast = toast;

    // ---- "Since your last visit" price-change pill ----
    if (prevVisit && path.indexOf('/price-watch/') !== 0 && !ss('sg_pw_dismissed')) {
      SGStack.changes().then(function (d) {
        var mine = {};
        SGStack.load().items.forEach(function (i) { mine[i.id] = 1; });
        var fresh = (d.entries || []).filter(function (e) { return e.date > prevVisit && e.date <= today; });
        if (!fresh.length) return;
        var hit = fresh.filter(function (e) { return mine[e.tool]; }).length;
        var pill = document.createElement('div');
        pill.id = 'sg-since-pill';
        pill.innerHTML = '<a href="/price-watch/?since=' + esc(prevVisit) + '">&#128276; <b>' + fresh.length + '</b> software price ' +
          (fresh.length === 1 ? 'update' : 'updates') + ' since your last visit' +
          (hit ? ' &middot; <b>' + hit + '</b> in your stack' : '') + ' &rarr;</a>' +
          '<button type="button" aria-label="Dismiss">&times;</button>';
        pill.querySelector('button').addEventListener('click', function () { ss('sg_pw_dismissed', '1'); pill.remove(); });
        pill.querySelector('a').addEventListener('click', function () { track('since_pill_click', { count: fresh.length, mine: hit }); });
        document.body.appendChild(pill);
        track('since_pill_view', { count: fresh.length, mine: hit });
      }).catch(function () {});
    }

    // ---- Newsletter: [data-sg-newsletter] blocks, auto-added on content pages ----
    var contentPage = /^\/(review|best|compare|alternatives|guides|category|free-tools)\//.test(path) && path.split('/').length > 3;
    var footer = document.querySelector('footer');
    if (contentPage && footer && !document.querySelector('[data-sg-newsletter]')) {
      var holder = document.createElement('section');
      holder.setAttribute('data-sg-newsletter', 'band');
      footer.parentNode.insertBefore(holder, footer);
    }
    document.querySelectorAll('[data-sg-newsletter]').forEach(function (el) {
      var variant = el.getAttribute('data-sg-newsletter') || 'card';
      var n = SGStack.count();
      el.classList.add('sg-nl', 'sg-nl-' + variant);
      el.innerHTML =
        '<div class="sg-nl-inner">' +
          '<div class="sg-nl-copy"><p class="sg-nl-kicker">&#128276; The Monday Price Watch</p>' +
          '<p class="sg-nl-title">Know when the software you pay for gets more expensive.</p>' +
          '<p class="sg-nl-sub">One short email each Monday: price changes we verified that week, new free plans, and one tool worth a look. No spam &mdash; unsubscribe anytime.</p></div>' +
          '<form class="sg-nl-form" novalidate>' +
            '<div class="sg-nl-row"><input type="email" name="email" required placeholder="you@business.com" aria-label="Email address">' +
            '<button type="submit">Get the Monday email</button></div>' +
            (n ? '<label class="sg-nl-check"><input type="checkbox" name="watch_my_stack" value="yes" checked> Also flag changes to the ' + n + ' tool' + (n === 1 ? '' : 's') + ' in My Stack</label>' : '') +
            '<p class="sg-nl-msg" role="status" hidden></p>' +
          '</form>' +
        '</div>';
      var form = el.querySelector('form');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = form.email.value.trim();
        var msg = form.querySelector('.sg-nl-msg');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.hidden = false; msg.className = 'sg-nl-msg err'; msg.textContent = 'Please enter a valid email address.'; return; }
        var fd = new FormData();
        fd.append('email', email);
        fd.append('form_type', 'newsletter');
        fd.append('_subject', 'Price Watch signup');
        fd.append('signup_page', path);
        if (form.watch_my_stack && form.watch_my_stack.checked) {
          fd.append('stack', SGStack.load().items.map(function (i) { return i.id; }).join(', '));
        }
        var btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Sending…';
        fetch(FORM_URL, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error('status ' + r.status); })
          .then(function () {
            ls('sg_nl_joined', today);
            form.innerHTML = '<p class="sg-nl-msg ok">&#9989; You&#39;re on the list. First email arrives Monday.</p>';
            track('newsletter_signup', { page: path, with_stack: fd.has('stack') ? 1 : 0 });
          })
          .catch(function () {
            btn.disabled = false; btn.textContent = 'Get the Monday email';
            msg.hidden = false; msg.className = 'sg-nl-msg err';
            msg.innerHTML = 'That didn&#39;t go through. Email <a href="mailto:help@successgravity.com?subject=Subscribe">help@successgravity.com</a> and we&#39;ll add you.';
          });
      });
    });
  });
})();

// ── v11: homepage "This week" strip (latest Price Watch entries + My Stack teaser) ──
(function () {
  if (!window.SGStack) return;
  function run() {
    var list = document.getElementById('sg-weekly-list');
    if (!list) return;
    var S = window.SGStack, esc = S.esc;
    S.changes().then(function (d) {
      var es = (d.entries || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).slice(0, 4);
      if (!es.length) { list.innerHTML = '<li class="text-sm text-gray-500">No changes logged yet.</li>'; return; }
      list.innerHTML = es.map(function (e) {
        var cls = e.dir === 'up' ? 'up' : e.dir === 'down' ? 'down' : 'plan';
        var arrow = e.dir === 'up' ? '&#9650;' : e.dir === 'down' ? '&#9660;' : '&#9679;';
        return '<li><span class="sg-wk-dir ' + cls + '">' + arrow + '</span><b>' + esc(e.name) + '</b> <span class="sg-wk-to">' + esc(e.to) + '</span></li>';
      }).join('');
    }).catch(function () { list.innerHTML = '<li class="text-sm"><a href="/price-watch/" class="text-indigo-600 font-semibold">Open Price Watch &rarr;</a></li>'; });
    var items = S.load().items;
    if (items.length) {
      S.tools().then(function (d) {
        var by = {}; d.tools.forEach(function (t) { by[t.id] = t; });
        var total = items.reduce(function (s, it) {
          var t = by[it.id]; var p = it.price != null ? it.price : (t && t.pm) || 0;
          return s + p * (it.seats || 1);
        }, 0);
        document.getElementById('sg-weekly-stack-title').textContent = 'Your stack: $' + Math.round(total).toLocaleString('en-US') + '/mo across ' + items.length + ' tool' + (items.length === 1 ? '' : 's');
        document.getElementById('sg-weekly-stack-sub').textContent = 'Check for cheaper swaps and any price changes since you last looked.';
      }).catch(function () {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

// ── v11: footer links to My Stack + Price Watch (footers are static per page) ──
(function () {
  function run() {
    document.querySelectorAll('footer ul').forEach(function (ul) {
      var dir = ul.querySelector('a[href="/directory/"]');
      if (!dir || ul.querySelector('a[href="/stack/"]')) return;
      var li = dir.parentNode;
      [['/price-watch/', '&#128276; Price Watch'], ['/stack/', '&#129520; My Stack']].forEach(function (x) {
        var n = document.createElement('li');
        n.innerHTML = '<a href="' + x[0] + '" class="hover:text-white">' + x[1] + '</a>';
        li.parentNode.insertBefore(n, li.nextSibling);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

// ── v12: site-wide tool count = core tools + bulk directory listings ──
(function () {
  if (!window.SGStack) return;
  function run() {
    var stat = document.getElementById('sg-stat-tools');
    var see = document.getElementById('sg-see-all');
    var marks = document.querySelectorAll('[data-sg-tool-count]');
    if (!stat && !see && !marks.length && !document.querySelector('[data-sg-tool-count-plain]')) return;
    window.SGStack.tools().then(function (d) {
      var n = d.count || (d.tools || []).length;
      if (!n) return;
      window.SG_TOTAL_TOOLS = n;
      var txt = n.toLocaleString('en-US');
      if (stat) {
        stat.setAttribute('data-count-to', n);
        // The count-up animation may already be running toward the old value; set the final number after it ends
        var fin = function () { if (stat.textContent !== '0') stat.textContent = n + (stat.getAttribute('data-count-suffix') || ''); };
        fin(); setTimeout(fin, 1400);
      }
      var btn = document.getElementById('sg-see-all');
      if (btn) btn.innerHTML = 'See All ' + txt + ' Tools &rarr;';
      marks.forEach(function (el) { el.textContent = txt + ' tools'; });
      document.querySelectorAll('[data-sg-tool-count-plain]').forEach(function (el) { el.textContent = txt; });
    }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

// ── v12: homepage hero card — the visitor's own stack, or a live example ──
(function () {
  var S = window.SGStack;
  if (!S) return;
  var EXAMPLE = [['notion', 3], ['slack', 3], ['zoom', 2], ['semrush', 1], ['clickup', 3], ['gamma', 1]];
  function money(n) {
    n = Math.round(n * 100) / 100;
    return '$' + (n >= 1000 || n === Math.round(n) ? Math.round(n).toLocaleString('en-US') : n.toFixed(2));
  }
  function perSeat(t) { return /\/\s*(user|seat|agent|member)|per (user|seat|agent|member)/i.test(t.p); }
  function run() {
    var rowsEl = document.getElementById('sg-hcard-rows');
    if (!rowsEl) return;
    var esc = S.esc;
    Promise.all([
      S.tools(),
      fetch('/data/swaps.json').then(function (r) { return r.json(); }).catch(function () { return { swaps: {} }; }),
      S.changes().catch(function () { return { entries: [] }; })
    ]).then(function (res) {
      var by = {};
      res[0].tools.forEach(function (t) { by[t.id] = t; });
      var mine = S.load().items.filter(function (i) { return by[i.id]; });
      var items = mine.length
        ? mine.map(function (i) { return { t: by[i.id], price: i.price != null ? i.price : (by[i.id].pm || 0), seats: i.seats || 1 }; })
        : EXAMPLE.filter(function (x) { return by[x[0]]; }).map(function (x) { return { t: by[x[0]], price: by[x[0]].pm || 0, seats: x[1] }; });
      if (mine.length) {
        var name = S.load().name;
        document.getElementById('sg-hcard-title').innerHTML = '&#129520; ' + esc(name || 'Your stack');
        document.getElementById('sg-hcard-cta').innerHTML = 'Open my stack &rarr;';
      }
      var total = 0;
      items.forEach(function (it) { it.cost = it.price * it.seats; total += it.cost; });
      var shown = items.slice().sort(function (a, b) { return b.cost - a.cost; }).slice(0, 4);
      rowsEl.innerHTML = shown.map(function (it) {
        var t = it.t, host = '';
        try { host = new URL(t.l).hostname; } catch (e) {}
        return '<div class="sg-hcard-row"><img src="https://www.google.com/s2/favicons?domain=' + encodeURIComponent(host) + '&amp;sz=64" alt="" width="22" height="22" loading="lazy">' +
          '<span class="n">' + esc(t.n) + (it.seats > 1 ? ' <small>&times;' + it.seats + '</small>' : '') + '</span>' +
          '<span class="p">' + (it.cost ? money(it.cost) + '<small>/mo</small>' : 'free') + '</span></div>';
      }).join('') + (items.length > 4 ? '<p class="sg-hcard-more">+ ' + (items.length - 4) + ' more</p>' : '');
      document.getElementById('sg-hcard-total').innerHTML = money(total) + '<small>/mo</small> <em>' + money(total * 12) + '/yr</em>';
      // First swap that is actually cheaper (editorial order), as in My Stack
      var swaps = res[1].swaps || {}, tip = null;
      items.some(function (it) {
        return (swaps[it.t.id] || []).some(function (pair) {
          var alt = by[pair[0]];
          if (!alt || alt.pm == null || alt.usage || !alt.pm) return false;
          var altCost = alt.pm * (perSeat(alt) ? it.seats : 1);
          var save = (it.cost - altCost) * 12;
          if (save < 12) return false;
          tip = '&#128161; <b>Swap idea:</b> ' + esc(it.t.n) + ' &rarr; ' + esc(alt.n) + ', about <b>$' + Math.round(save).toLocaleString('en-US') + '/yr</b> less';
          return true;
        });
      });
      if (tip) { var tipEl = document.getElementById('sg-hcard-tip'); tipEl.innerHTML = tip; tipEl.hidden = false; }
      var ids = {};
      items.forEach(function (it) { ids[it.t.id] = 1; });
      var ch = (res[2].entries || []).filter(function (e) { return ids[e.tool]; })
        .sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
      if (ch) {
        var al = document.getElementById('sg-hcard-alert');
        al.innerHTML = '&#128276; <b>' + esc(ch.name) + '</b> ' + (ch.dir === 'up' ? '&#9650;' : ch.dir === 'down' ? '&#9660;' : '&bull;') + ' ' + esc(ch.to);
        al.hidden = false;
      }
    }).catch(function () {
      rowsEl.innerHTML = '<p class="text-sm text-gray-500 py-4 text-center">Add your tools and see your monthly bill.</p>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
