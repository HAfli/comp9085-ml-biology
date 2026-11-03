/* Week 8 - shared helpers for the instance-based-learning interactives.
 *
 * One implementation of distance, neighbour search and (weighted) voting, used by
 * every Week 8 exercise so that they agree with each other and with scikit-learn:
 *   - weights 1 / d^p (p = 0 is the uniform vote);
 *   - if any of the k neighbours is at distance 0, only the zero-distance
 *     neighbours vote, equally (scikit-learn's rule for weights="distance");
 *   - ties between classes are reported as ties; scikit-learn would return the
 *     class that comes first in sorted label order.
 */
(function () {
  'use strict';

  var W8 = {};

  W8.CLASS_COLOUR = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)'];

  W8.dist = function (a, b, metric, w) {
    var s = 0, i, d;
    for (i = 0; i < a.length; i++) {
      d = a[i] - b[i];
      var wi = w ? w[i] : 1;
      if (metric === 'manhattan') s += wi * Math.abs(d);
      else s += wi * d * d;
    }
    return metric === 'manhattan' ? s : Math.sqrt(s);
  };

  /** The k nearest of `pts` ([{x: [...], y: label, ...}]) to q, nearest first. */
  W8.neighbours = function (pts, q, k, metric, w) {
    var all = pts.map(function (p, i) {
      return { i: i, p: p, d: W8.dist(p.x, q, metric, w) };
    });
    all.sort(function (a, b) { return a.d - b.d || a.i - b.i; });
    return all.slice(0, Math.min(k, all.length));
  };

  /** Weight of each neighbour: 1/d^p, with scikit-learn's zero-distance rule. */
  W8.weights = function (nb, p) {
    if (!p) return nb.map(function () { return 1; });
    var zero = nb.some(function (n) { return n.d === 0; });
    return nb.map(function (n) {
      if (zero) return n.d === 0 ? 1 : 0;
      return 1 / Math.pow(n.d, p);
    });
  };

  /** Weighted vote. Returns {tally: {label: weight}, winner, tie: [labels] | null}. */
  W8.vote = function (nb, p, labelOf) {
    var w = W8.weights(nb, p), tally = {};
    nb.forEach(function (n, i) {
      var c = labelOf ? labelOf(n) : n.p.y;
      tally[c] = (tally[c] || 0) + w[i];
    });
    var best = -1, win = [];
    Object.keys(tally).forEach(function (c) {
      if (tally[c] > best + 1e-12) { best = tally[c]; win = [c]; }
      else if (Math.abs(tally[c] - best) <= 1e-12) win.push(c);
    });
    return { tally: tally, weights: w, winner: win.length === 1 ? win[0] : null,
             tie: win.length > 1 ? win : null,
             zero: nb.some(function (n) { return n.d === 0; }) && !!p };
  };

  /** Weighted mean of neighbour values (k-NN regression). */
  W8.regress = function (nb, p, valueOf) {
    var w = W8.weights(nb, p), s = 0, sw = 0;
    nb.forEach(function (n, i) { s += w[i] * valueOf(n); sw += w[i]; });
    return { value: s / sw, weights: w };
  };

  /* --------------------------------------------------------------- data */
  W8.rows = function () {
    var D = window.WEEK08, cols = D.columns;
    return D.rows.map(function (r) {
      var o = {};
      cols.forEach(function (c, i) { o[c] = r[i]; });
      return o;
    });
  };

  W8.LABEL = { age: 'Age (years)', trestbps: 'Resting blood pressure (mm Hg)',
               chol: 'Serum cholesterol (mg/dl)', thalach: 'Maximum heart rate (beats/min)',
               oldpeak: 'ST depression on exercise (mm)' };
  W8.SHORT = { age: 'age', trestbps: 'resting BP', chol: 'cholesterol',
               thalach: 'max heart rate', oldpeak: 'ST depression' };

  /** Mean and SD, or min and max, of a feature over the TRAINING rows only. */
  W8.fitScaler = function (rows, f, kind) {
    var v = rows.filter(function (r) { return !r.test && r[f] != null; })
                .map(function (r) { return r[f]; });
    if (kind === 'minmax') {
      var lo = d3.min(v), hi = d3.max(v);
      return function (x) { return (x - lo) / (hi - lo); };
    }
    if (kind === 'standard') {
      var m = d3.mean(v), s = d3.deviation(v);
      return function (x) { return (x - m) / s; };
    }
    return function (x) { return x; };
  };

  /* ------------------------------------------------------------ controls */
  W8.seg = function (host, id, fn) {
    var btns = host.querySelectorAll('#' + id + ' button');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        fn(b.getAttribute('data-value'));
      });
    });
    return function set(v) {
      btns.forEach(function (x) {
        x.setAttribute('aria-pressed', String(x.getAttribute('data-value') === String(v)));
      });
    };
  };

  W8.slider = function (host, id, fmt, fn) {
    var el = host.querySelector('#' + id), out = host.querySelector('#' + id + '-val');
    function show() { out.textContent = fmt(+el.value); }
    el.addEventListener('input', function () { show(); fn(+el.value); });
    return function set(v) { el.value = v; show(); };
  };

  W8.fmt = function (v, d) { return (v == null || isNaN(v)) ? '—' : v.toFixed(d == null ? 3 : d); };
  W8.pct = function (v, d) { return (v == null || isNaN(v)) ? '—' : (100 * v).toFixed(d == null ? 1 : d) + '%'; };

  window.W8 = W8;
})();
