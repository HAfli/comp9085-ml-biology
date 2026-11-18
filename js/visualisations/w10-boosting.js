/* Week 10 - Ensemble learning (2026 revision of the 2025 lecture): the boosting, gradient-boosting and comparison exercises.
 *
 * Data: window.WEEK10E, written by data/scripts/26_build_week10_ensembles.py.
 *   w10-adaboost  boosting with decision stumps, step by step, on the lecture's 10-row bacterial-growth table
 *                 (ILLUSTRATIVE teaching table, like the bicycle table). Computed in the browser with the slides' rules:
 *                 eps = sum of weights misclassified, alpha = 0.5 ln((1 - eps) / eps), misclassified w x 1/(2 eps),
 *                 correct w x 1/(2 (1 - eps)). The page test checks it against the Python numbers.
 *   w10-gboost    gradient boosting with regression stumps on 442 real patients (BMI -> diabetes progression one year
 *                 later; Efron et al. 2004), computed in the browser, beside the precomputed held-out curves for all
 *                 ten features at learning rates 1.0 and 0.1.
 *   w10-compare   single models against ensembles on the same cross-validation folds (WDBC; diabetes), precomputed.
 */
(function () {
  'use strict';
  var D = window.WEEK10E;
  if (!D || !window.Chart) return;
  var CAT = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];
  var GREY = '#9aa7b2';
  if (!document.getElementById('w10e-style')) {
    var css = document.createElement('style');
    css.id = 'w10e-style';
    css.textContent = '.w10e-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}' +
      '.w10e-btns{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}' +
      '.w10e-wrong{background:#fde3e6}.w10e-tbl td,.w10e-tbl th{text-align:center}';
    document.head.appendChild(css);
  }
  function f3(v) { return (v == null || isNaN(v)) ? '—' : (+v).toFixed(3); }
  function f4(v) { return (v == null || isNaN(v)) ? '—' : (+v).toFixed(4); }
  function pc(v) { return (v == null || isNaN(v)) ? '—' : (100 * v).toFixed(1) + '%'; }
  function num(v, dp) { return (+v).toLocaleString('en-IE', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }); }
  function seg(host, id, fn) {
    var btns = host.querySelectorAll('#' + id + ' button');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        fn(b.getAttribute('data-value'));
      });
    });
    return function (v) {
      btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-value') === String(v))); });
    };
  }
  function slider(host, id, fmt, fn) {
    var el = host.querySelector('#' + id), out = host.querySelector('#' + id + '-val');
    function show() { if (out) out.textContent = fmt(+el.value); }
    el.addEventListener('input', function () { show(); fn(+el.value); });
    show();
    return function (v) { el.value = v; show(); };
  }
  function click(host, id, fn) { host.querySelector('#' + id).addEventListener('click', fn); }

  /* ================================================================ boosting (AdaBoost) */
  var T = D.bacteria_toy, TEMP = T.temp, Y = T.growth.map(function (g) { return g === 'High' ? 1 : -1; });

  function bestStump(w) {                    // same search order and tie rule as the Python script
    var best = null, i, c, left, pred, e, k;
    for (i = 0; i < TEMP.length - 1; i++) {
      c = (TEMP[i] + TEMP[i + 1]) / 2;
      [-1, 1].forEach(function (lf) {
        pred = TEMP.map(function (t) { return t < c ? lf : -lf; });
        e = 0;
        for (k = 0; k < TEMP.length; k++) if (pred[k] !== Y[k]) e += w[k];
        if (best === null || e < best.e - 1e-12) best = { e: e, cut: c, left: lf, pred: pred.slice() };
      });
    }
    return best;
  }
  function adaboost(rounds) {                // returns the state after each round
    var w = TEMP.map(function () { return 1 / TEMP.length; }), F = TEMP.map(function () { return 0; }), out = [], r, s, a;
    for (r = 0; r < rounds; r++) {
      s = bestStump(w);
      a = 0.5 * Math.log((1 - s.e) / s.e);
      F = F.map(function (f, k) { return f + a * s.pred[k]; });
      out.push({ weights: w.slice(), cut: s.cut, left: s.left, pred: s.pred, eps: s.e, alpha: a, F: F.slice(),
                 errors: F.reduce(function (n, f, k) { return n + ((f > 0 ? 1 : -1) !== Y[k] ? 1 : 0); }, 0) });
      w = w.map(function (wi, k) { return s.pred[k] !== Y[k] ? wi / (2 * s.e) : wi / (2 * (1 - s.e)); });
    }
    return out;
  }
  var ADA = adaboost(10);
  window.W10E = { adaboost: adaboost, gbStages: null };          // exposed for the page tests

  window.Chart.register('viz-w10-adaboost', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { it: 1, q: 25 }, st = Object.assign({}, DEF);
    function lab(v) { return v > 0 ? 'High' : 'Low'; }
    function draw() {
      var R = ADA[st.it - 1], wNext = ADA[st.it] ? ADA[st.it].weights : null;
      var score = 0;
      ADA.slice(0, st.it).forEach(function (s) { score += s.alpha * (st.q < s.cut ? s.left : -s.left); });
      stage.innerHTML = '<div class="w10e-grid2"><div data-a></div><div data-b></div></div>';
      // chart: instances sized by their weight in this round, the stump boundary, the query temperature
      var el = stage.querySelector('[data-a]');
      var f = window.Chart.frame(el, { height: 250, margin: { top: 26, right: 14, bottom: 42, left: 50 },
        title: 'Weighted instances and the stump of iteration ' + (st.it - 1) });
      var x = d3.scaleLinear().domain([0, 55]).range([0, f.w]), y = d3.scaleLinear().domain([-1.6, 1.6]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'Storage temperature (°C)', grid: false, yTicks: 0, yFormat: function () { return ''; } });
      f.svg.append('text').attr('x', f.margin.left).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('Iteration ' + (st.it - 1) + ': area = weight, red ring = wrong');
      f.g.append('text').attr('x', -8).attr('y', y(1) + 4).attr('text-anchor', 'end').style('font-size', '11px').text('High');
      f.g.append('text').attr('x', -8).attr('y', y(-1) + 4).attr('text-anchor', 'end').style('font-size', '11px').text('Low');
      f.g.append('line').attr('x1', x(R.cut)).attr('x2', x(R.cut)).attr('y1', 0).attr('y2', f.h)
        .attr('stroke', 'var(--cat-2)').attr('stroke-dasharray', '5,3');
      f.g.append('text').attr('x', x(R.cut) + 4).attr('y', 12).style('font-size', '11px')
        .text('stump: < ' + R.cut + ' → ' + lab(R.left) + ', ≥ ' + R.cut + ' → ' + lab(-R.left));
      TEMP.forEach(function (t, k) {
        f.g.append('circle').attr('cx', x(t)).attr('cy', y(Y[k])).attr('r', 3 + 40 * Math.sqrt(R.weights[k] / Math.PI))
          .attr('fill', Y[k] > 0 ? 'var(--cat-1)' : GREY).attr('fill-opacity', 0.75)
          .attr('stroke', R.pred[k] !== Y[k] ? '#d90727' : 'none').attr('stroke-width', 3);
      });
      f.g.append('line').attr('x1', x(st.q)).attr('x2', x(st.q)).attr('y1', y(-1.5)).attr('y2', y(1.5))
        .attr('stroke', 'var(--cat-4)').attr('stroke-width', 2);
      f.g.append('text').attr('x', x(st.q)).attr('y', f.h - 2).attr('text-anchor', 'middle').style('font-size', '11px')
        .text('query ' + st.q + ' °C');
      // table
      var tb = '<div class="table-scroll"><table class="table-compact w10e-tbl"><caption>Iteration ' + (st.it - 1) +
        ': weights, this stump, and the vote of the first ' + st.it + ' stump' + (st.it > 1 ? 's' : '') + ' (red rows: still wrong)</caption><thead><tr><th scope="col">ID</th>' +
        '<th scope="col">Temp</th><th scope="col">Growth</th><th scope="col">w</th><th scope="col">Stump</th>' +
        '<th scope="col">Ensemble</th><th scope="col">Next w</th></tr></thead><tbody>';
      TEMP.forEach(function (t, k) {
        var ens = R.F[k] > 0 ? 1 : -1;
        tb += '<tr' + (ens !== Y[k] ? ' class="w10e-wrong"' : '') + '><th scope="row">' + (k + 1) + '</th><td>' + t + '</td><td>' +
          lab(Y[k]) + '</td><td>' + f3(R.weights[k]) + '</td><td>' + lab(R.pred[k]) + (R.pred[k] !== Y[k] ? ' ✗' : '') +
          '</td><td>' + lab(ens) + '</td><td>' + (wNext ? f3(wNext[k]) : '—') + '</td></tr>';
      });
      stage.querySelector('[data-b]').innerHTML = tb + '</tbody></table></div>';
      U.setMetric('w10a-eps', f4(R.eps), 'weighted error ε');
      U.setMetric('w10a-alpha', f4(R.alpha), 'α = ½ ln((1 − ε)/ε)');
      U.setMetric('w10a-err', R.errors + ' of 10', 'ensemble training errors');
      U.setMetric('w10a-pred', lab(score), 'at ' + st.q + ' °C, Σ αM(q) = ' + score.toFixed(3));
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>Iteration ' + (st.it - 1) + ' picks the stump with the smallest <em>weighted</em> error: ε = ' + f4(R.eps) +
        ', so α = ' + f4(R.alpha) + '. ' + (st.it === 1 ? 'These are exactly the numbers of the bicycle example (ε = 0.200, α = 0.6931): ' +
        'the same low–high–low shape. ' : '') + 'Misclassified samples are multiplied by 1/(2ε), correct ones by 1/(2(1 − ε)), ' +
        'so the next stump is pulled towards the samples this one got wrong. After ' + st.it + ' stump' + (st.it > 1 ? 's' : '') +
        ' the weighted vote misclassifies ' + R.errors + ' of the 10 samples.</p><p><strong>Question.</strong> Step through all ten ' +
        'iterations. Does the ensemble\'s training error fall every round? Why can a sum of stumps represent low–high–low when no ' +
        'single stump can?</p>';
      alt.innerHTML = U.altTable('All ten iterations: stump, weighted error, confidence and ensemble training errors.',
        ['Iteration', 'Stump', 'ε', 'α', 'Ensemble errors'],
        ADA.map(function (s, i) {
          return [String(i), '< ' + s.cut + ' → ' + lab(s.left) + ', else ' + lab(-s.left), f4(s.eps), f4(s.alpha), String(s.errors)];
        }));
    }
    click(host, 'w10a-next', function () { if (st.it < ADA.length) { st.it++; draw(); } });
    click(host, 'w10a-prev', function () { if (st.it > 1) { st.it--; draw(); } });
    var setQ = slider(host, 'w10a-q', function (v) { return v + ' °C'; }, function (v) { st.q = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () { st = Object.assign({}, DEF); setQ(st.q); draw(); });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ================================================================ gradient boosting */
  var BMI = D.diabetes_points.bmi, PROG = D.diabetes_points.progression, NP = BMI.length;
  var ORD = BMI.map(function (_, i) { return i; }).sort(function (a, b) { return BMI[a] - BMI[b]; });

  function stump(res) {                      // depth-1 regression tree on BMI, as scikit-learn: midpoint thresholds, first best
    var n = NP, i, tot = 0, tot2 = 0, sl = 0, best = { sse: Infinity };
    for (i = 0; i < n; i++) { tot += res[i]; }
    for (i = 0; i < n - 1; i++) {
      var a = ORD[i], b = ORD[i + 1];
      sl += res[a];
      if (BMI[b] <= BMI[a] + 1e-7) continue;
      var nl = i + 1, nr = n - nl, sr = tot - sl;
      var proxy = sl * sl / nl + sr * sr / nr;          // maximise = minimise SSE
      if (best.sse === Infinity || proxy > best.proxy + 1e-9) best = { proxy: proxy, sse: 0, cut: (BMI[a] + BMI[b]) / 2, l: sl / nl, r: sr / nr };
    }
    return best;
  }
  function gbStages(lr, n) {                 // predictions after 0..n stumps (array of arrays) and MSE
    var mean = PROG.reduce(function (s, v) { return s + v; }, 0) / NP, M = PROG.map(function () { return mean; });
    var preds = [M.slice()], mse = [], stumps = [], k;
    function m(Mv) { var s = 0; for (var i = 0; i < NP; i++) s += (PROG[i] - Mv[i]) * (PROG[i] - Mv[i]); return s / NP; }
    mse.push(m(M));
    for (k = 1; k <= n; k++) {
      var res = PROG.map(function (t, i) { return t - M[i]; }), s = stump(res);
      M = M.map(function (v, i) { return v + lr * (BMI[i] < s.cut ? s.l : s.r); });
      stumps.push(s); preds.push(M.slice()); mse.push(m(M));
    }
    return { mean: mean, preds: preds, mse: mse, stumps: stumps };
  }
  window.W10E.gbStages = gbStages;
  var GBC = {};
  function gb(lr) { if (!GBC[lr]) GBC[lr] = gbStages(+lr, 300); return GBC[lr]; }

  window.Chart.register('viz-w10-gboost', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { n: 0, lr: '1.0' }, st = Object.assign({}, DEF), C = D.diabetes_lr_curves;
    function draw() {
      var G = gb(st.lr), M = G.preds[st.n], mse0 = G.mse[0], msen = G.mse[st.n];
      stage.innerHTML = '<div class="w10e-grid2"><div data-a></div><div data-b></div></div>';
      var el = stage.querySelector('[data-a]');
      var f = window.Chart.frame(el, { height: 260, margin: { top: 26, right: 14, bottom: 42, left: 54 },
        title: 'Diabetes progression against BMI with the current ensemble' });
      var x = d3.scaleLinear().domain([17, 43]).range([0, f.w]), y = d3.scaleLinear().domain([0, 360]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'BMI (kg/m²)', yLabel: 'Progression', yTicks: 4 });
      f.svg.append('text').attr('x', f.margin.left).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('M' + st.n + ': ' + st.n + ' stump' + (st.n === 1 ? '' : 's') + ', rate ' + st.lr + ', 442 patients');
      f.g.selectAll(null).data(d3.range(NP)).join('circle').attr('r', 2).attr('fill', GREY).attr('fill-opacity', 0.6)
        .attr('cx', function (i) { return x(BMI[i]); }).attr('cy', function (i) { return y(PROG[i]); });
      var pts = ORD.map(function (i) { return [BMI[i], M[i]]; });
      f.g.append('path').datum(pts).attr('fill', 'none').attr('stroke', 'var(--cat-2)').attr('stroke-width', 2.4)
        .attr('d', d3.line().curve(d3.curveStepAfter).x(function (q) { return x(q[0]); }).y(function (q) { return y(q[1]); }));
      // held-out curves (precomputed, all ten features)
      var c = C[st.lr], ntr = c.test_mse.length, xs = d3.range(1, ntr + 1);
      var el2 = stage.querySelector('[data-b]');
      var f2 = window.Chart.frame(el2, { height: 260, margin: { top: 26, right: 14, bottom: 42, left: 54 },
        title: 'All ten features: training and held-out error' });
      var x2 = d3.scaleLinear().domain([1, ntr]).range([0, f2.w]), y2 = d3.scaleLinear().domain([0, 7000]).range([f2.h, 0]);
      window.Chart.axes(f2, x2, y2, { xLabel: 'Number of trees (depth 2)', yLabel: 'Mean squared error', yTicks: 4 });
      f2.svg.append('text').attr('x', f2.margin.left).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('All ten features, rate ' + st.lr + ' (precomputed)');
      [['train_mse', '5,3', 'training patients (309)'], ['test_mse', null, 'held-out patients (133)']].forEach(function (s, i) {
        f2.g.append('path').datum(c[s[0]]).attr('fill', 'none').attr('stroke', i ? 'var(--cat-1)' : 'var(--cat-3)')
          .attr('stroke-width', 2).attr('stroke-dasharray', s[1])
          .attr('d', d3.line().x(function (_, k) { return x2(k + 1); }).y(function (v) { return y2(v); }));
        f2.g.append('text').attr('x', f2.w - 4).attr('y', 14 + i * 14).attr('text-anchor', 'end').style('font-size', '11px')
          .attr('fill', i ? 'var(--cat-1)' : 'var(--cat-3)').text((i ? '— ' : '- - ') + s[2]);
      });
      var nn = Math.max(1, Math.min(st.n, ntr));
      f2.g.append('line').attr('x1', x2(nn)).attr('x2', x2(nn)).attr('y1', 0).attr('y2', f2.h).attr('stroke', 'var(--cat-4)')
        .attr('stroke-dasharray', '4,3');
      f2.g.append('circle').attr('cx', x2(c.best_trees)).attr('cy', y2(c.best_test_mse)).attr('r', 4).attr('fill', 'var(--cat-1)');
      var s = G.stumps[st.n - 1];
      U.setMetric('w10g-n', String(st.n), st.n ? 'last split at BMI ' + s.cut : 'M₀ = mean = ' + G.mean.toFixed(1));
      U.setMetric('w10g-mse', num(msen), 'training MSE (BMI only), from ' + num(mse0));
      U.setMetric('w10g-r2', f3(1 - msen / mse0), 'training R² (BMI only)');
      U.setMetric('w10g-test', num(c.test_mse[nn - 1]), 'held-out MSE at ' + nn + ' tree' + (nn > 1 ? 's' : '') + ' (all features)');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>' + (st.n === 0 ? 'M₀ predicts the mean progression, ' + G.mean.toFixed(1) + ', for everyone. Add a stump: it is fitted ' +
        'to the residuals t − M₀(d) and added to the ensemble, exactly as in the bicycle example.' :
        'Each stump is fitted to the current residuals t − M' + (st.n - 1) + '(d) and added' + (st.lr === '1.0' ? '' : ' after ' +
        'multiplying by the learning rate ' + st.lr) + '. The staircase rises with BMI: higher BMI, faster progression in this ' +
        'cohort (an association, not a cause).') + ' Right: with all ten baseline measures and held-out patients, rate ' + st.lr +
        ' is best after ' + c.best_trees + ' tree' + (c.best_trees > 1 ? 's' : '') + ' (MSE ' + num(c.best_test_mse) + '); after 300 ' +
        'trees the held-out MSE is ' + num(c.final_test_mse) + ' while the training error keeps falling.</p>' +
        '<p><strong>Question.</strong> Compare rates 1.0 and 0.1. Why does a boosted ensemble overfit as trees are added when a random ' +
        'forest does not, and how should the number of trees be chosen?</p>';
      alt.innerHTML = U.altTable('Training MSE on BMI after each number of stumps (learning rate ' + st.lr + '), and held-out MSE with all features.',
        ['Stumps / trees', 'Training MSE, BMI only', 'Held-out MSE, all features'],
        [0, 1, 2, 3, 5, 10, 20, 50, 100, 200, 300].map(function (k) {
          return [String(k), num(G.mse[k]), k ? num(c.test_mse[k - 1]) : '—'];
        }));
    }
    function add(k) { st.n = Math.min(300, st.n + k); setN(st.n); draw(); }
    click(host, 'w10g-add1', function () { add(1); });
    click(host, 'w10g-add10', function () { add(10); });
    click(host, 'w10g-add100', function () { add(100); });
    var setN = slider(host, 'w10g-slider', function (v) { return String(v); }, function (v) { st.n = v; draw(); });
    var setLr = seg(host, 'w10g-lr', function (v) { st.lr = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setN(st.n); setLr(st.lr); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ================================================================ comparison on the same folds */
  var ORDER_C = ['tree', 'bagging', 'rf', 'adaboost', 'gboost', 'logreg', 'knn5', 'vote_soft', 'vote_hard'];
  var ORDER_R = ['mean', 'linreg', 'tree', 'rf', 'gboost'];
  var KIND = { tree: 'single', bagging: 'ens', rf: 'ens', adaboost: 'ens', gboost: 'ens', logreg: 'simple', knn5: 'simple',
               vote_soft: 'ens', vote_hard: 'ens', mean: 'base', linreg: 'simple' };
  var COL = { single: GREY, ens: 'var(--cat-1)', simple: 'var(--cat-3)', base: '#c9d3dc' };
  var SHORT = { tree: 'Single tree', bagging: 'Bagging (500)', rf: 'Random forest (500)', adaboost: 'AdaBoost (200 stumps)',
                gboost: 'Gradient boosting', logreg: 'Logistic regression', knn5: 'k-NN (k = 5)', vote_soft: 'Soft voting (LR, k-NN, RF)',
                vote_hard: 'Hard voting (LR, k-NN, RF)', mean: 'Predict the mean', linreg: 'Linear regression' };
  var KLAB = { single: 'single tree', ens: 'ensemble', simple: 'simple model', base: 'baseline' };

  window.Chart.register('viz-w10-compare', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { ds: 'wdbc' }, st = Object.assign({}, DEF);
    function draw() {
      var cls = st.ds === 'wdbc', R = cls ? D.wdbc_comparison : D.diabetes_comparison, keys = cls ? ORDER_C : ORDER_R;
      var v = function (k) { return cls ? R[k].acc : R[k].r2; }, sd = function (k) { return cls ? R[k].acc_sd : R[k].r2_sd; };
      stage.innerHTML = '<div data-a></div>';
      var el = stage.querySelector('[data-a]');
      var f = window.Chart.frame(el, { height: 30 * keys.length + 70, margin: { top: 44, right: 52, bottom: 40, left: 150 },
        title: cls ? 'Accuracy on WDBC, 5-fold CV' : 'R² on the diabetes data, 5-fold CV' });
      var lo = cls ? 0.85 : -0.1, hi = cls ? 1.0 : 0.65;
      var x = d3.scaleLinear().domain([lo, hi]).range([0, f.w]), y = d3.scaleBand().domain(keys).range([0, f.h]).padding(0.25);
      f.g.append('g').attr('transform', 'translate(0,' + f.h + ')').call(d3.axisBottom(x).ticks(f.w < 320 ? 3 : 5)
        .tickFormat(cls ? function (t) { return (100 * t).toFixed(0) + '%'; } : d3.format('.1f')));
      f.g.append('text').attr('x', f.w / 2).attr('y', f.h + 34).attr('text-anchor', 'middle').style('font-size', '11px')
        .text(cls ? 'accuracy: mean, ± 1 SD, five folds' : 'R²: mean, ± 1 SD over five folds');
      f.svg.append('text').attr('x', 6).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text((cls ? 'WDBC: 569 tumours' : 'Diabetes: 442 patients') + ', same folds for every model');
      ['single', 'ens', 'simple'].forEach(function (kd, i) {
        var lg = f.svg.append('g').attr('transform', 'translate(' + (6 + i * 105) + ',30)');
        lg.append('circle').attr('cx', 5).attr('cy', 0).attr('r', 5).attr('fill', COL[kd]).attr('stroke', '#222');
        lg.append('text').attr('x', 14).attr('y', 4).style('font-size', '11px').text(KLAB[kd]);
      });
      keys.forEach(function (k) {
        var cy = y(k) + y.bandwidth() / 2, c = COL[KIND[k]];
        f.g.append('line').attr('x1', x(Math.max(lo, v(k) - sd(k)))).attr('x2', x(Math.min(hi, v(k) + sd(k)))).attr('y1', cy).attr('y2', cy)
          .attr('stroke', c).attr('stroke-width', 3);
        if (cls) R[k].folds_acc.forEach(function (a) {
          f.g.append('circle').attr('cx', x(a)).attr('cy', cy - 6).attr('r', 2.4).attr('fill', '#333');
        });
        f.g.append('circle').attr('cx', x(v(k))).attr('cy', cy).attr('r', 6).attr('fill', c).attr('stroke', '#222');
        f.g.append('text').attr('x', -8).attr('y', cy + 4).attr('text-anchor', 'end').style('font-size', '11px').text(SHORT[k]);
        f.g.append('text').attr('x', f.w + 6).attr('y', cy + 4).style('font-size', '11px').text(cls ? pc(v(k)) : f3(v(k)));
      });
      var bestE = keys.filter(function (k) { return KIND[k] === 'ens'; }).sort(function (a, b) { return v(b) - v(a); })[0];
      var bestS = keys.filter(function (k) { return KIND[k] === 'simple'; }).sort(function (a, b) { return v(b) - v(a); })[0];
      var fm = cls ? pc : f3;
      U.setMetric('w10m-tree', fm(v('tree')), 'single tree');
      U.setMetric('w10m-ens', fm(v(bestE)), R[bestE].label);
      U.setMetric('w10m-simple', fm(v(bestS)), R[bestS].label);
      U.setMetric('w10m-sd', fm(sd(bestE)), 'SD across folds, best ensemble');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>' + (cls ? 'Every ensemble beats the single tree (' + pc(v('tree')) + ') by several standard deviations. The best ensemble (' +
        pc(v(bestE)) + ') and logistic regression (' + pc(v('logreg')) + ') differ by less than one fold-to-fold standard deviation.' :
        'The depth-3 tree reaches R² ' + f3(v('tree')) + '; the forest ' + f3(v('rf')) + ' and gradient boosting ' + f3(v('gboost')) +
        ' do better, but plain linear regression (' + f3(v('linreg')) + ') is at least as good: the signal is largely linear and n is small.') +
        ' The legend above the chart gives the colour of each kind of model.</p><p><strong>Question.</strong> On which dataset do the ' +
        'ensembles add most over a single tree, and do they beat the simple model? What evidence would you need before claiming that one ' +
        'model is better than another?</p>';
      alt.innerHTML = U.altTable((cls ? 'WDBC accuracy' : 'Diabetes R²') + ': mean and standard deviation over the same five folds.',
        ['Model', cls ? 'Accuracy' : 'R²', 'SD'].concat(cls ? ['ROC AUC'] : ['RMSE']),
        keys.map(function (k) { return [R[k].label, cls ? pc(v(k)) : f3(v(k)), cls ? pc(sd(k)) : f3(sd(k)),
          cls ? (R[k].auc == null ? '—' : f3(R[k].auc)) : f3(R[k].rmse)]; }));
    }
    var setD = seg(host, 'w10m-ds', function (v) { st.ds = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () { st = Object.assign({}, DEF); setD(st.ds); draw(); });
    window.Chart.responsive(stage, draw);
    draw();
  });
})();
