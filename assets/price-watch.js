// Price Watch (/price-watch/): filters for the static change log and price table.
(function () {
  'use strict';
  var S = window.SGStack;
  var $ = function (id) { return document.getElementById(id); };
  var entries = [].slice.call(document.querySelectorAll('.pw-entry'));
  var mine = {};
  if (S) S.load().items.forEach(function (i) { mine[i.id] = 1; });
  var hasMine = entries.some(function (e) { return mine[e.getAttribute('data-tool')]; });
  if (hasMine) $('pw-f-mine').classList.remove('hidden');

  var since = (new URLSearchParams(location.search).get('since') || '').replace(/[^0-9-]/g, '');
  if (since) {
    var fresh = entries.filter(function (e) { return e.getAttribute('data-date') > since; });
    fresh.forEach(function (e) { e.classList.add('pw-new'); });
    if (fresh.length) {
      var box = $('pw-since');
      box.className = 'sgs-alert mb-6';
      box.innerHTML = '&#128276; <b>' + fresh.length + ' update' + (fresh.length === 1 ? '' : 's') + ' since your last visit</b> are highlighted below.';
    }
  }

  function applyFilter(f) {
    var shown = 0;
    entries.forEach(function (e) {
      var ok = f === 'all' || (f === 'mine' ? mine[e.getAttribute('data-tool')] : e.getAttribute('data-dir') === f);
      e.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    document.querySelectorAll('.pw-group').forEach(function (g) {
      var vis = [].some.call(g.querySelectorAll('.pw-entry'), function (e) { return e.style.display !== 'none'; });
      g.style.display = vis ? '' : 'none';
      var h = g.previousElementSibling;
      if (h && h.classList.contains('pw-date')) h.style.display = vis ? '' : 'none';
    });
    $('pw-none').classList.toggle('hidden', shown > 0);
  }
  document.querySelectorAll('.pw-filters button').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.pw-filters button').forEach(function (x) { x.classList.toggle('on', x === b); });
      applyFilter(b.getAttribute('data-f'));
      if (S) S.track('price_watch_filter', { filter: b.getAttribute('data-f') });
    });
  });

  // Price table: search, verified-only, collapse to the first rows
  var rows = [].slice.call(document.querySelectorAll('#pw-rows tr'));
  var LIMIT = 40, expanded = false;
  function applyTable() {
    var q = ($('pw-q').value || '').trim().toLowerCase(), v = $('pw-vonly').checked, n = 0, hidden = 0;
    rows.forEach(function (r) {
      var ok = (!q || r.getAttribute('data-name').indexOf(q) !== -1) && (!v || r.hasAttribute('data-ver'));
      if (ok && !expanded && !q && n >= LIMIT) { ok = false; hidden++; }
      r.style.display = ok ? '' : 'none';
      if (ok) n++;
    });
    $('pw-more').style.display = hidden ? '' : 'none';
  }
  $('pw-q').addEventListener('input', applyTable);
  $('pw-vonly').addEventListener('change', applyTable);
  $('pw-more').addEventListener('click', function () { expanded = true; applyTable(); });
  applyTable();

  // Paint "Add to My Stack" buttons for tools already in the stack
  if (S) document.dispatchEvent(new CustomEvent('sg:stack', { detail: S.load() }));
})();
