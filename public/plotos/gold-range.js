(function () {
  'use strict';
  var state = { key: '', high: null, low: null, saved: null, lines: [], series: null, drag: null, busy: false, message: '', loaded: false };
  var rules = window.PLUTUS_GOLD_RULES;
  function eligible() { return typeof chart !== 'undefined' && chart.sym === 'XAUUSD' && chart.tf === '1m' && view === 'charts' && myAcc(); }
  function price() { var q = getDisplayQuote('XAUUSD'); return q && q.bid > 0 ? (q.ask > 0 ? (q.ask + q.bid) / 2 : q.bid) : 0; }
  function colors() { var css = getComputedStyle(document.documentElement); return ['--dn', '--up', '--ac'].map(function (key) { return css.getPropertyValue(key).trim(); }); }
  function clear() { if (state.series) state.lines.forEach(function (line) { try { state.series.removePriceLine(line); } catch (_) {} }); state.lines = []; state.series = null; }
  function fields() {
    var high = document.getElementById('input-range-high'), low = document.getElementById('input-range-low'), status = document.getElementById('range-status');
    if (high && document.activeElement !== high) high.value = state.high == null ? '' : state.high.toFixed(2);
    if (low && document.activeElement !== low) low.value = state.low == null ? '' : state.low.toFixed(2);
    if (status) status.textContent = state.message || (rules.frozen(price(), state.high, state.low) ? 'السعر داخل النطاق' : 'السعر خارج النطاق');
    ['btn-save-range', 'btn-auto-range'].forEach(function (id) { var button = document.getElementById(id); if (button) button.disabled = state.busy; });
  }
  function draw() {
    if (!eligible() || !chart.cs) { clear(); return; }
    if (!rules.valid(state.high, state.low)) return;
    if (state.series !== chart.cs) { clear(); state.series = chart.cs; }
    var values = [state.high, state.low, (state.high + state.low) / 2], palette = colors(), titles = ['سقف النطاق', 'قاع النطاق', 'وسط النطاق'];
    values.forEach(function (value, index) {
      var options = { price: value, color: palette[index], lineWidth: index === 2 ? 1 : 2, lineStyle: index === 2 ? 2 : 0, axisLabelVisible: true, title: titles[index] };
      if (!state.lines[index]) state.lines[index] = chart.cs.createPriceLine(options); else state.lines[index].applyOptions(options);
    });
    fields();
  }
  function defaults() { var current = price(); if (!(current > 1)) { state.message = 'سعر الذهب غير متاح'; fields(); return false; } var bounds = rules.automatic(current); state.high = bounds.high; state.low = bounds.low; return true; }
  function saveRange() {
    if (state.busy || !eligible()) return Promise.resolve(false);
    var high = Number(document.getElementById('input-range-high').value), low = Number(document.getElementById('input-range-low').value);
    if (!rules.valid(high, low)) { state.message = 'الحد الأعلى يجب أن يتجاوز الحد الأدنى'; fields(); return Promise.resolve(false); }
    state.high = high; state.low = low; state.busy = true; state.message = 'جارٍ الحفظ…'; draw();
    var key = state.key, account = myAcc();
    return engineRequest('/update-bot-range', { accountId: account.id, symbol: 'XAUUSD', range_high: high, range_low: low }).then(function (data) {
      if (state.key !== key) return false;
      state.high = Number(data.bot.range_high); state.low = Number(data.bot.range_low); state.saved = { high: state.high, low: state.low }; state.message = 'تم الحفظ للروبوت'; return true;
    }).catch(function (error) {
      if (state.key !== key) return false;
      state.message = error.message || 'تعذر حفظ النطاق';
      if (state.saved) { state.high = state.saved.high; state.low = state.saved.low; }
      return false;
    }).finally(function () { if (state.key === key) { state.busy = false; draw(); } });
  }
  function panel() {
    var host = document.getElementById('mainWrap'); if (!host) return;
    var existing = document.getElementById('range-control-panel');
    if (!eligible()) { if (existing) existing.remove(); clear(); return; }
    var key = myAcc().id + ':XAUUSD';
    if (key !== state.key) { clear(); state.key = key; state.saved = null; state.high = null; state.low = null; state.loaded = false; state.busy = false; state.message = ''; }
    if (!existing) {
      var el = document.createElement('details'); el.id = 'range-control-panel'; el.className = 'gold-range-panel';
      el.innerHTML = '<summary>النطاق العرضي · M1</summary><div class="range-inputs"><label>الحد الأعلى<input type="number" id="input-range-high" aria-label="الحد الأعلى" step="0.01"></label><label>الحد الأدنى<input type="number" id="input-range-low" aria-label="الحد الأدنى" step="0.01"></label></div><div class="range-actions"><button id="btn-save-range" type="button">تطبيق</button><button id="btn-auto-range" type="button">تلقائي 2$</button></div><output class="range-status" id="range-status" aria-live="polite"></output>';
      host.appendChild(el);
      document.getElementById('btn-save-range').onclick = saveRange;
      document.getElementById('btn-auto-range').onclick = function () { if (defaults()) { state.message = ''; fields(); saveRange(); } };
      ['input-range-high', 'input-range-low'].forEach(function (id) { document.getElementById(id).onchange = function () { var high = Number(document.getElementById('input-range-high').value), low = Number(document.getElementById('input-range-low').value); if (rules.valid(high, low)) { state.high = high; state.low = low; state.message = 'غير محفوظ'; draw(); } }; });
      bindDrag(host);
    }
    if (state.high == null && price() > 1) { defaults(); state.message = 'غير محفوظ'; }
    if (!state.loaded) {
      state.loaded = true;
      engineRequest('/v1/accounts/' + encodeURIComponent(myAcc().id) + '/bot-range?symbol=XAUUSD').then(function (data) {
        if (state.key !== key) return;
        if (data.bot && rules.valid(Number(data.bot.range_high), Number(data.bot.range_low))) { state.high = Number(data.bot.range_high); state.low = Number(data.bot.range_low); state.saved = { high: state.high, low: state.low }; state.message = 'نطاق محفوظ'; }
        else state.message = 'لم يُحدد نطاق محفوظ'; draw();
      }).catch(function (error) { if (state.key === key) { state.message = error.message; fields(); } });
    }
    draw();
  }
  function bindDrag(host) {
    if (host._goldBound) return; host._goldBound = true;
    host.addEventListener('pointerdown', function (event) {
      if (!eligible() || state.busy || !chart.cs || event.target.closest('button,input,details') || DT.mode || DSEL.drag || DRAG || chart.levelPlacement) return;
      var rect = host.getBoundingClientRect(), y = event.clientY - rect.top, x = event.clientX - rect.left;
      if (x > rect.width - 72) return;
      var target = -1, distance = event.pointerType === 'touch' ? 18 : 10;
      [state.high, state.low, (state.high + state.low) / 2].forEach(function (value, index) { if (!(value > 0)) return; var coord = chart.cs.priceToCoordinate(value); if (coord != null && Math.abs(coord - y) < distance) { target = index; distance = Math.abs(coord - y); } });
      if (target < 0) return;
      state.drag = { index: target, high: state.high, low: state.low, price: chart.cs.coordinateToPrice(y), id: event.pointerId };
      host.setPointerCapture(event.pointerId); chart.c.applyOptions({ handleScroll: false, handleScale: false }); event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    host.addEventListener('pointermove', function (event) {
      if (!state.drag || event.pointerId !== state.drag.id) return;
      var value = chart.cs.coordinateToPrice(event.clientY - host.getBoundingClientRect().top); if (value == null) return;
      var drag = state.drag, high = drag.high, low = drag.low;
      if (drag.index === 0) high = +value.toFixed(2); else if (drag.index === 1) low = +value.toFixed(2); else { high = +(drag.high + value - drag.price).toFixed(2); low = +(drag.low + value - drag.price).toFixed(2); }
      if (rules.valid(high, low)) { state.high = high; state.low = low; state.message = 'غير محفوظ'; draw(); }
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    function finish(event) {
      if (!state.drag) return;
      var drag = state.drag; state.drag = null; restoreChartGestures();
      if (event.type === 'pointercancel') { state.high = drag.high; state.low = drag.low; draw(); } else saveRange();
      event.preventDefault(); event.stopImmediatePropagation();
    }
    host.addEventListener('pointerup', finish, true); host.addEventListener('pointercancel', finish, true);
  }
  window.PLUTUS_GOLD_RANGE = { refresh: panel };
})();