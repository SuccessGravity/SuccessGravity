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
    new MutationObserver(function () { observeReveals(document); })
      .observe(document.body, { childList: true, subtree: true });
  }

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
function sgLogoHTML(link, name) {
  var domain = '';
  try { domain = new URL(link).hostname; } catch (e) { domain = ''; }
  var initial = (name || '?').replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || '?';
  var mono = '<span class="sg-logo-mono">' + initial + '</span>';
  if (!domain) return '<div class="sg-logo-ring"><span>' + mono + '</span></div>';
  var src = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64';
  return '<div class="sg-logo-ring"><span><img src="' + src + '" alt="' + (name || '') +
    ' logo" loading="lazy" onerror="this.outerHTML=\'<span class=&quot;sg-logo-mono&quot;>' +
    initial + '</span>\'"></span></div>';
}
