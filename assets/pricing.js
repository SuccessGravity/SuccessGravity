// Pricing pages: team-size cost calculator and search on /pricing/.
(function () {
  'use strict';
  function money(n) {
    n = Math.round(n * 100) / 100;
    return '$' + (n % 1 ? n.toFixed(2) : String(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  document.querySelectorAll('.pr-calc').forEach(function (box) {
    var seatEl = box.querySelector('[data-calc="seats"]'), priceEl = box.querySelector('[data-calc="price"]');
    function update() {
      var seats = seatEl ? Math.max(1, parseInt(seatEl.value, 10) || 1) : 1;
      var price = Math.max(0, parseFloat(priceEl.value) || 0);
      box.querySelector('[data-calc="month"]').textContent = money(price * seats);
      box.querySelector('[data-calc="year"]').textContent = money(price * seats * 12);
    }
    box.addEventListener('input', update);
  });
  var q = document.getElementById('pr-q');
  if (q) {
    q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase();
      document.querySelectorAll('.pr-item').forEach(function (a) { a.style.display = !v || a.getAttribute('data-name').indexOf(v) !== -1 ? '' : 'none'; });
      document.querySelectorAll('.pr-group').forEach(function (g) {
        g.style.display = [].some.call(g.querySelectorAll('.pr-item'), function (a) { return a.style.display !== 'none'; }) ? '' : 'none';
      });
    });
  }
})();
