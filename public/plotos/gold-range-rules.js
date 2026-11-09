(function (root) {
  'use strict';
  var rules = {
    valid: function (high, low) { return Number.isFinite(high) && Number.isFinite(low) && low > 0 && high > low; },
    lot: function (balance) { return Math.max(1, Math.floor(balance / 1000)); },
    bucket: function (price) { return Math.floor(price); },
    automatic: function (price) { return { high: +(price + 1).toFixed(2), low: +(price - 1).toFixed(2) }; },
    frozen: function (price, high, low) { return rules.valid(high, low) && price >= low && price <= high; },
    exhausted: function (price, bucket, breakout) { return price > bucket - breakout && price < bucket + 1 + breakout; },
    lossReached: function (pnl) { return pnl <= -1000; },
    canClose: function (openedAt, now, risk) { return risk || now - openedAt >= 60000; },
    adverse: function (side, entry, bid, ask, step) { return side === 'buy' ? bid <= entry - step : ask >= entry + step; }
  };
  root.PLUTUS_GOLD_RULES = Object.freeze(rules);
})(typeof window === 'undefined' ? globalThis : window);