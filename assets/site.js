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
});
