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
        gsap.to(inner, { yPercent: 10, opacity: 0.65, ease: 'none',
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
