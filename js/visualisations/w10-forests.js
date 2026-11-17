/* Week 10 - Random forests and foundation-model representations: Exercises 1-3 and 5-7.
 * (Exercise 4 is the existing in-browser forest, random-forest.js; Exercise 8 the existing leaderboard.)
 *
 * Data: window.WEEK10, written by data/scripts/24_build_week10_data.py from real data already in the repository
 * (WDBC, 569 tumours; the Week 7 Swiss-Prot / ESM-2 proteins). Exercises 1 and 2 are arithmetic and simulation computed
 * in the browser, and say so.
 *   1 w10-crowd       majority vote of B voters: exact binomial (independent) and simulation (correlated); variance formula
 *   2 w10-bootstrap   bootstrap samples drawn in the browser; out-of-bag share against 1/e
 *   3 w10-trees       features per split: tree strength, tree correlation, forest accuracy; OOB curves (precomputed)
 *   5 w10-robust      pure-noise features and scaling: forest, k-NN, logistic regression (precomputed)
 *   6 w10-importance  impurity vs permutation importance, the correlated size group, noise columns (precomputed)
 *   7 w10-proteins    classical descriptors vs ESM-2 embeddings, forest vs logistic vs k-NN (precomputed)
 */
(function () {
  'use strict';
  var D = window.WEEK10;
  if (!D) return;
  var W = D.wdbc, P = D.proteins.tasks;
  var CAT = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', '#8c6d1f'];
  var GREY = '#9aa7b2';
  if (!document.getElementById('w10-style')) {
    var css = document.createElement('style');
    css.id = 'w10-style';
    css.textContent = '.w10-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}' +
                      '.w10-btns{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}' +
                      '.w10-boxes{display:flex;flex-wrap:wrap;gap:3px;margin:6px 0 10px}' +
                      '.w10-box{min-width:30px;padding:3px 2px;text-align:center;border:1px solid var(--border,#c9d3dc);' +
                      'border-radius:4px;font-size:12px;line-height:1.2}' +
                      '.w10-box b{display:block;font-size:13px}.w10-oob{background:#fde3e6;border-color:#d90727}';
    document.head.appendChild(css);
  }

  /* ------------------------------------------------------------ helpers */
  function rng(seed) {                                  // mulberry32
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {                                   // Box-Muller
    var u = 0, v = 0;
    while (u === 0) u = r();
    v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function probit(p) {                                  // Acklam's inverse normal CDF (|error| < 1.2e-9)
    var a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924],
        b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857],
        c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878],
        d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742], q, r2;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r2 = q * q;
    return (((((a[0] * r2 + a[1]) * r2 + a[2]) * r2 + a[3]) * r2 + a[4]) * r2 + a[5]) * q / (((((b[0] * r2 + b[1]) * r2 + b[2]) * r2 + b[3]) * r2 + b[4]) * r2 + 1);
  }
  function majority(p, B) {                             // exact binomial P(more than B/2 of B independent voters right)
    var lp = Math.log(p), lq = Math.log(1 - p), lc = 0, s = 0, k;
    for (k = 0; k <= B; k++) {
      if (k > 0) lc += Math.log(B - k + 1) - Math.log(k);
      if (k > B / 2) s += Math.exp(lc + k * lp + (B - k) * lq);
    }
    return s;
  }
  function majoritySim(p, B, rho, sims, seed) {        // latent-Gaussian voters with pairwise correlation rho
    var r = rng(seed), thr = probit(p), a = Math.sqrt(rho), b = Math.sqrt(1 - rho), win = 0, s, k, sh, right;
    for (s = 0; s < sims; s++) {
      sh = gauss(r); right = 0;
      for (k = 0; k < B; k++) if (a * sh + b * gauss(r) < thr) right++;
      if (right > B / 2) win++;
    }
    return win / sims;
  }
  function f3(v) { return (v == null || isNaN(v)) ? '—' : (+v).toFixed(3); }
  function f4(v) { return (v == null || isNaN(v)) ? '—' : (+v).toFixed(4); }
  function pc(v) { return (v == null || isNaN(v)) ? '—' : (100 * v).toFixed(1) + '%'; }
  function pretty(s) { return String(s).replace(/_/g, ' '); }
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
  function check(host, id, fn) {
    var el = host.querySelector('#' + id);
    el.addEventListener('change', function () { fn(el.checked); });
    return function (v) { el.checked = !!v; };
  }
  function title(f, t) {
    f.svg.append('text').attr('x', f.margin.left).attr('y', 15).style('font-size', '12px').style('font-weight', 600).text(t);
  }
  function lineChart(el, t, xs, series, opts) {
    opts = opts || {};
    var f = window.Chart.frame(el, { height: opts.height || 230, margin: { top: 26, right: 12, bottom: 40, left: 50 }, title: t });
    var all = []; series.forEach(function (s) { s.v.forEach(function (v) { if (v != null && !isNaN(v)) all.push(v); }); });
    var x = (opts.log ? d3.scaleLog() : opts.symlog ? d3.scaleSymlog().constant(10) : d3.scaleLinear()).domain(d3.extent(xs)).range([0, f.w]);
    var y = d3.scaleLinear().domain(opts.domain || d3.extent(all)).nice().range([f.h, 0]);
    window.Chart.axes(f, x, y, { xLabel: opts.xLabel || '', yTicks: 4, xTicks: opts.log ? 4 : undefined });
    title(f, t);
    series.forEach(function (s) {
      var pts = xs.map(function (k, i) { return [k, s.v[i]]; }).filter(function (q) { return q[1] != null && !isNaN(q[1]); });
      f.g.append('path').datum(pts).attr('fill', 'none').attr('stroke', s.c).attr('stroke-width', 2.2)
        .attr('stroke-dasharray', s.dash || null)
        .attr('d', d3.line().x(function (q) { return x(q[0]); }).y(function (q) { return y(q[1]); }));
      if (!s.noDots) f.g.selectAll(null).data(pts).join('circle').attr('r', 2.6).attr('fill', s.c)
        .attr('cx', function (q) { return x(q[0]); }).attr('cy', function (q) { return y(q[1]); });
    });
    (opts.hlines || []).forEach(function (h) {
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(h.v)).attr('y2', y(h.v))
        .attr('stroke', h.c || GREY).attr('stroke-dasharray', '4,3');
    });
    if (opts.mark != null) f.g.append('line').attr('x1', x(opts.mark)).attr('x2', x(opts.mark)).attr('y1', 0).attr('y2', f.h)
      .attr('stroke', 'var(--cat-4)').attr('stroke-dasharray', '4,3');
    if (opts.legend) {
      var lg = f.g.append('g').attr('transform', 'translate(' + (opts.legendX != null ? opts.legendX : f.w - 170) + ',' + (opts.legendY || 4) + ')');
      opts.legend.forEach(function (l, i) {
        lg.append('rect').attr('x', 0).attr('y', i * 15).attr('width', 10).attr('height', 3).attr('fill', l.c);
        lg.append('text').attr('x', 14).attr('y', i * 15 + 5).style('font-size', '11px').text(l.t);
      });
    }
    return { f: f, x: x, y: y };
  }
  function hbars(el, t, rows, opts) {                   // rows: [{label, v, sd?, c?}]
    opts = opts || {};
    var h = Math.max(160, 22 * rows.length + 60);
    var f = window.Chart.frame(el, { height: h, margin: { top: 26, right: 52, bottom: 36, left: opts.left || 150 }, title: t });
    var mx = d3.max(rows, function (r) { return r.v + (r.sd || 0); }) || 1;
    var x = d3.scaleLinear().domain([Math.min(0, d3.min(rows, function (r) { return r.v; })), mx * 1.05]).nice().range([0, f.w]);
    var y = d3.scaleBand().domain(rows.map(function (r, i) { return i; })).range([0, f.h]).padding(0.18);
    f.g.append('g').attr('transform', 'translate(0,' + f.h + ')').call(d3.axisBottom(x).ticks(4))
      .selectAll('text').style('font-size', '10px');
    if (opts.xLabel) f.g.append('text').attr('x', f.w / 2).attr('y', f.h + 32).attr('text-anchor', 'middle')
      .style('font-size', '11px').text(opts.xLabel);
    f.svg.append('text').attr('x', 6).attr('y', 15).style('font-size', '12px').style('font-weight', 600).text(t);
    rows.forEach(function (r, i) {
      f.g.append('rect').attr('x', x(Math.min(0, r.v))).attr('y', y(i)).attr('width', Math.abs(x(r.v) - x(0)))
        .attr('height', y.bandwidth()).attr('fill', r.c || CAT[0]);
      if (r.sd) f.g.append('line').attr('x1', x(r.v - r.sd)).attr('x2', x(r.v + r.sd)).attr('y1', y(i) + y.bandwidth() / 2)
        .attr('y2', y(i) + y.bandwidth() / 2).attr('stroke', '#222');
      f.g.append('text').attr('x', -6).attr('y', y(i) + y.bandwidth() / 2 + 4).attr('text-anchor', 'end')
        .style('font-size', '11px').text(r.label);
      f.g.append('text').attr('x', x(Math.max(0, r.v)) + 4).attr('y', y(i) + y.bandwidth() / 2 + 4)
        .style('font-size', '10px').text(opts.fmt ? opts.fmt(r.v) : f3(r.v));
    });
    return f;
  }

  /* ====================================================== 1. the wisdom of crowds */
  var BGRID = [1, 3, 5, 9, 15, 25, 41, 61, 101, 151, 201];
  window.W10 = { majority: majority, majoritySim: majoritySim, probit: probit };   // exposed for the tests
  window.Chart.register('viz-w10-crowd', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { p: 0.6, B: 25, rho: 0 }, st = Object.assign({}, DEF);
    function draw() {
      var exact = BGRID.map(function (B) { return majority(st.p, B); });
      var sim = st.rho > 0 ? BGRID.map(function (B) { return majoritySim(st.p, B, st.rho, 1500, 7 + B); }) : exact.slice();
      var here = majority(st.p, st.B), hereSim = st.rho > 0 ? majoritySim(st.p, st.B, st.rho, 4000, 11) : here;
      stage.innerHTML = '<div class="w10-grid2"><div data-a></div><div data-b></div></div>';
      lineChart(stage.querySelector('[data-a]'), 'Majority-vote accuracy', BGRID,
        [{ v: exact, c: CAT[0] }, { v: sim, c: CAT[3], dash: '5,3' }],
        { xLabel: 'number of voters B', domain: [Math.min(0.3, d3.min(exact.concat(sim))), 1], mark: st.B,
          hlines: [{ v: st.p }], legend: [{ c: CAT[0], t: 'independent (exact)' }, { c: CAT[3], t: 'correlated ρ = ' + st.rho.toFixed(2) + ' (sim.)' }],
          legendY: st.p > 0.5 ? 150 : 4 });
      var Bs = d3.range(1, 202, 4);
      lineChart(stage.querySelector('[data-b]'), 'Variance of an average / σ²', Bs,
        [{ v: Bs.map(function (B) { return st.rho + (1 - st.rho) / B; }), c: CAT[1], noDots: true }],
        { xLabel: 'number of trees B', domain: [0, 1], mark: st.B, hlines: [{ v: st.rho, c: CAT[3] }] });
      U.setMetric('w10c-one', pc(st.p), 'one voter');
      U.setMetric('w10c-ind', pc(here), 'B independent voters, exact');
      U.setMetric('w10c-cor', st.rho > 0 ? pc(hereSim) : pc(here), st.rho > 0 ? 'correlated, simulated (4,000 runs)' : 'ρ = 0: same as exact');
      U.setMetric('w10c-var', f3(st.rho + (1 - st.rho) / st.B), 'ρ + (1 − ρ)/B');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>With p = ' + st.p.toFixed(2) + ' and B = ' + st.B + ', independent voters are right ' + pc(here) + ' of the time' +
        (st.rho > 0 ? '; with correlation ' + st.rho.toFixed(2) + ' the simulated crowd is right ' + pc(hereSim) + '.' : '.') +
        (st.p < 0.5 ? ' Each voter is worse than a coin, so adding voters makes the majority <em>more</em> reliably wrong.' : '') +
        ' The variance of an average of B trees with pairwise correlation ρ is ρσ² + (1 − ρ)σ²/B: more trees can only remove the ' +
        'second term.</p><p><strong>Question.</strong> Which of the two conditions for a good ensemble (members better than chance; ' +
        'members not all making the same mistakes) does the ρ slider control, and which does the p slider control?</p>';
      alt.innerHTML = U.altTable('Majority-vote accuracy by number of voters (p = ' + st.p.toFixed(2) + ').',
        ['B', 'Independent (exact)', 'Correlated ρ = ' + st.rho.toFixed(2) + ' (simulated)', 'Variance ratio'],
        BGRID.map(function (B, i) { return [String(B), f3(exact[i]), f3(sim[i]), f3(st.rho + (1 - st.rho) / B)]; }));
    }
    var setP = slider(host, 'w10c-p', function (v) { return v.toFixed(2); }, function (v) { st.p = v; draw(); });
    var setB = slider(host, 'w10c-b', function (v) { return String(v); }, function (v) { st.B = v; draw(); });
    var setR = slider(host, 'w10c-rho', function (v) { return v.toFixed(2); }, function (v) { st.rho = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setP(st.p); setB(st.B); setR(st.rho); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 2. bootstrap samples */
  window.Chart.register('viz-w10-bootstrap', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { n: 20 }, st, r, last, hist;
    function reset() { st = Object.assign({}, DEF); r = rng(2026); last = null; hist = []; }
    function drawOne() {
      var c = new Array(st.n).fill(0), i;
      for (i = 0; i < st.n; i++) c[Math.floor(r() * st.n)]++;
      last = c;
      hist.push(c.filter(function (v) { return v === 0; }).length / st.n);
    }
    function draw() {
      var exp = Math.pow(1 - 1 / st.n, st.n);
      var html = '<div class="small muted">Last bootstrap sample: how many times each of the ' + st.n +
        ' tumours was drawn. Red boxes were never drawn: they are out of bag for this tree.</div><div class="w10-boxes">';
      if (last) last.forEach(function (v, i) {
        html += '<div class="w10-box' + (v === 0 ? ' w10-oob' : '') + '"><b>' + (i + 1) + '</b>×' + v + '</div>';
      });
      else html += '<div class="small muted">Press “Draw one sample”.</div>';
      stage.innerHTML = html + '</div><div data-a></div>';
      var run = [], s = 0;
      hist.forEach(function (h, i) { s += h; run.push(s / (i + 1)); });
      var xs = run.map(function (v, i) { return i + 1; });
      if (xs.length < 2) { xs = [1, 2]; run = run.length ? [run[0], run[0]] : [null, null]; }
      lineChart(stage.querySelector('[data-a]'), 'Running mean of the out-of-bag share', xs, [{ v: run, c: CAT[0], noDots: xs.length > 40 }],
        { xLabel: 'bootstrap samples drawn', domain: [0.15, 0.6], hlines: [{ v: exp, c: CAT[3] }, { v: Math.exp(-1), c: GREY }],
          legend: [{ c: CAT[3], t: '(1 − 1/n)ⁿ = ' + f3(exp) }, { c: GREY, t: '1/e = 0.368' }] });
      var oobLast = last ? last.filter(function (v) { return v === 0; }).length : null;
      U.setMetric('w10b-distinct', last ? String(st.n - oobLast) : '—', 'distinct tumours in the last sample');
      U.setMetric('w10b-oob', last ? String(oobLast) : '—', 'out of bag in the last sample');
      U.setMetric('w10b-mean', hist.length ? f3(d3.mean(hist)) : '—', 'mean OOB share over ' + hist.length + ' samples');
      U.setMetric('w10b-exp', f3(exp), 'expected (1 − 1/n)ⁿ');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>Each draw takes ' + st.n + ' tumours <em>with replacement</em>, so some appear twice or more and about a third never ' +
        'appear. For n = ' + st.n + ' the expected out-of-bag share is (1 − 1/n)ⁿ = ' + f3(exp) + '; as n grows it approaches ' +
        '1/e ≈ 0.368 (WDBC, n = 569: 0.368).</p><p><strong>Question.</strong> Why does every tumour get an out-of-bag ' +
        'prediction once a forest has a few dozen trees, and roughly how many of 500 trees vote on it?</p>';
      alt.innerHTML = U.altTable('Bootstrap samples drawn so far (n = ' + st.n + ').', ['Sample', 'Out-of-bag share', 'Running mean'],
        hist.slice(-20).map(function (h, i) {
          var k = hist.length - Math.min(20, hist.length) + i;
          return [String(k + 1), f3(h), f3(d3.mean(hist.slice(0, k + 1)))];
        }));
    }
    reset();
    var setN = slider(host, 'w10b-n', function (v) { return String(v); }, function (v) { st.n = v; last = null; hist = []; r = rng(2026); draw(); });
    host.querySelector('#w10b-one').addEventListener('click', function () { drawOne(); draw(); });
    host.querySelector('#w10b-many').addEventListener('click', function () { for (var k = 0; k < 100; k++) drawOne(); draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () { reset(); setN(st.n); draw(); });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 3. features per split and number of trees */
  var DEC = W.decorrelation.rows, MS = DEC.map(function (r) { return r.m; });
  window.Chart.register('viz-w10-trees', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var OC = W.oob_curve, TG = OC.trees.filter(function (t) { return t >= 15; });
    var DEF = { mi: MS.indexOf(5), ti: TG.indexOf(500) }, st = Object.assign({}, DEF);
    function oobAt(m, t) { return OC.by_m[String(m)][OC.trees.indexOf(t)]; }
    function draw() {
      var row = DEC[st.mi], T = TG[st.ti];
      stage.innerHTML = '<div class="w10-grid2"><div data-a></div><div data-b></div></div><div data-c></div>';
      lineChart(stage.querySelector('[data-a]'), 'Strength: accuracy (5-fold CV)', MS,
        [{ v: DEC.map(function (r) { return r.tree_acc; }), c: CAT[0] }, { v: DEC.map(function (r) { return r.forest_acc; }), c: CAT[3] }],
        { xLabel: 'features per split, m', domain: [0.88, 0.97], mark: row.m,
          legend: [{ c: CAT[0], t: 'mean single tree' }, { c: CAT[3], t: 'forest of 200' }], legendY: 120 });
      lineChart(stage.querySelector('[data-b]'), 'Correlation of tree errors', MS,
        [{ v: DEC.map(function (r) { return r.rho; }), c: CAT[1] }], { xLabel: 'features per split, m', mark: row.m });
      var TT = OC.trees.filter(function (t) { return t >= 15; });
      lineChart(stage.querySelector('[data-c]'), 'Out-of-bag error against the number of trees (all 569 tumours)', TT,
        ['1', '5', '30'].map(function (m, i) { return { v: TT.map(function (t) { return oobAt(m, t); }), c: [CAT[1], CAT[0], CAT[3]][i] }; }),
        { xLabel: 'number of trees (log scale)', log: true, domain: [0, 0.08], mark: T,
          hlines: [{ v: 1 - W.ladder.tree.acc, c: CAT[2] }],
          legend: [{ c: CAT[1], t: 'm = 1' }, { c: CAT[0], t: 'm = 5 (default)' }, { c: CAT[3], t: 'm = 30 (bagging)' },
                   { c: CAT[2], t: 'one tree, CV error' }], legendY: 4 });
      U.setMetric('w10t-tree', pc(row.tree_acc), 'mean single-tree CV accuracy, m = ' + row.m);
      U.setMetric('w10t-rho', f3(row.rho), 'mean correlation of tree errors');
      U.setMetric('w10t-forest', pc(row.forest_acc), 'forest (200 trees) CV accuracy');
      U.setMetric('w10t-oob', pc(oobAt('5', T)), 'OOB error with ' + T + ' trees, m = 5');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>m = ' + row.m + ': single trees ' + pc(row.tree_acc) + ', error correlation ' + f3(row.rho) + ', forest ' +
        pc(row.forest_acc) + '. Across all m the forest stays between ' + pc(d3.min(DEC, function (r) { return r.forest_acc; })) +
        ' and ' + pc(d3.max(DEC, function (r) { return r.forest_acc; })) + ': on WDBC, stronger trees and less correlated trees ' +
        'cancel out. All numbers are measured with scikit-learn (5-fold stratified CV, seed 42). One tumour is 0.18 percentage ' +
        'points of OOB error.</p><p><strong>Question.</strong> Why is the flat forest line <em>not</em> evidence that ' +
        'decorrelation is useless? Name a kind of biological data where you would expect m to matter more.</p>';
      alt.innerHTML = U.altTable('Features per split (5-fold CV, 200 trees).', ['m', 'Mean tree accuracy', 'Error correlation', 'Forest accuracy', 'Forest AUC'],
        DEC.map(function (r) { return [String(r.m), f3(r.tree_acc), f3(r.rho), f3(r.forest_acc), f3(r.forest_auc)]; })) +
        U.altTable('OOB error by number of trees.', ['Trees', 'm = 1', 'm = 5', 'm = 30'],
          TT.map(function (t) { return [String(t), f4(oobAt('1', t)), f4(oobAt('5', t)), f4(oobAt('30', t))]; }));
    }
    var setM = slider(host, 'w10t-m', function (v) { return String(MS[v]); }, function (v) { st.mi = v; draw(); });
    var setT = slider(host, 'w10t-t', function (v) { return String(TG[v]); }, function (v) { st.ti = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setM(st.mi); setT(st.ti); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 5. robustness */
  window.Chart.register('viz-w10-robust', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var R = W.robustness.noise, K = R.map(function (r) { return r.noise; }), SC = W.robustness.scaling;
    var DEF = { ki: 0, scale: 'standardised' }, st = Object.assign({}, DEF);
    function draw() {
      var row = R[st.ki];
      stage.innerHTML = '<div data-a></div><div data-b></div>';
      lineChart(stage.querySelector('[data-a]'), 'Accuracy as pure-noise features are added (5-fold CV)', K,
        [{ v: R.map(function (r) { return r.rf; }), c: CAT[3] }, { v: R.map(function (r) { return r.logreg; }), c: CAT[0] },
         { v: R.map(function (r) { return r.knn5; }), c: CAT[1] }],
        { xLabel: 'pure-noise features added (symmetric log scale)', symlog: true, domain: [0.85, 0.99], mark: K[st.ki],
          legend: [{ c: CAT[3], t: 'random forest (300)' }, { c: CAT[0], t: 'logistic regression' }, { c: CAT[1], t: 'k-NN, k = 5' }], legendX: 8, legendY: 150 });
      var raw = st.scale === 'raw';
      hbars(stage.querySelector('[data-b]'), 'No noise: effect of scaling (5-fold CV; forest of 500)', [
        { label: 'forest, raw', v: SC.rf_raw, c: raw ? CAT[3] : GREY }, { label: 'forest, standardised', v: SC.rf_standardised, c: raw ? GREY : CAT[3] },
        { label: 'k-NN, raw', v: SC.knn5_raw, c: raw ? CAT[1] : GREY }, { label: 'k-NN, standardised', v: SC.knn5_standardised, c: raw ? GREY : CAT[1] }],
        { fmt: pc, left: 140 });
      U.setMetric('w10r-rf', pc(row.rf), 'forest, ' + row.noise + ' noise features');
      U.setMetric('w10r-knn', pc(row.knn5), 'k-NN');
      U.setMetric('w10r-lr', pc(row.logreg), 'logistic regression');
      U.setMetric('w10r-scale', raw ? pc(SC.rf_raw) + ' / ' + pc(SC.knn5_raw) : pc(SC.rf_standardised) + ' / ' + pc(SC.knn5_standardised),
        'forest / k-NN, ' + st.scale + ', no noise');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>With ' + row.noise + ' noise columns appended to the 30 real features: forest (300 trees) ' + pc(row.rf) + ', logistic regression ' +
        pc(row.logreg) + ', k-NN ' + pc(row.knn5) + ' (all with no noise: ' + pc(R[0].rf) + ', ' + pc(R[0].logreg) + ', ' +
        pc(R[0].knn5) + '). Scaling: the forest gives ' + pc(SC.rf_raw) + ' raw and ' + pc(SC.rf_standardised) + ' standardised; ' +
        'k-NN ' + pc(SC.knn5_raw) + ' raw and ' + pc(SC.knn5_standardised) + ' standardised. Measured with scikit-learn on real WDBC; ' +
        'the noise is N(0, 1), seed 42.</p><p><strong>Question.</strong> Why does k-NN lose most from noise, and why does ' +
        'standardising change nothing for the forest?</p>';
      alt.innerHTML = U.altTable('Accuracy with pure-noise features added (5-fold CV).', ['Noise features', 'Forest', 'Logistic', 'k-NN'],
        R.map(function (r) { return [String(r.noise), f3(r.rf), f3(r.logreg), f3(r.knn5)]; })) +
        U.altTable('Scaling, no noise.', ['Model', 'Raw', 'Standardised'],
          [['Forest', f3(SC.rf_raw), f3(SC.rf_standardised)], ['k-NN', f3(SC.knn5_raw), f3(SC.knn5_standardised)]]);
    }
    var setK = slider(host, 'w10r-k', function (v) { return String(K[v]); }, function (v) { st.ki = v; draw(); });
    var setS = seg(host, 'w10r-scaling', function (v) { st.scale = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setK(st.ki); setS(st.scale); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 6. two kinds of importance */
  window.Chart.register('viz-w10-importance', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var I = W.importance, names = Object.keys(I.mdi);
    var DEF = { group: false, keep: false, noise: false, top: 10 }, st = Object.assign({}, DEF);
    var SIZE = I.size_group;
    function draw() {
      stage.innerHTML = '<div class="w10-grid2"><div data-a></div><div data-b></div></div>';
      var mdiTop = names.slice().sort(function (a, b) { return I.mdi[b] - I.mdi[a]; }).slice(0, st.top);
      var mrows = mdiTop.map(function (n2) {
        var v = I.mdi[n2];
        if (st.keep && n2 === 'worst_area') v = I.keep_one_size.worst_area_mdi_after;
        var gone = st.keep && SIZE.indexOf(n2) >= 0 && n2 !== 'worst_area';
        return { label: pretty(n2) + (gone ? ' (removed)' : ''), v: gone ? 0 : v,
                 c: (st.keep && n2 === 'worst_area') ? CAT[3] : (SIZE.indexOf(n2) >= 0 ? CAT[0] : CAT[2]) };
      });
      if (st.noise) mrows.push({ label: 'continuous noise', v: I.noise.continuous_mdi, c: GREY },
                               { label: 'binary noise', v: I.noise.binary_mdi, c: GREY });
      hbars(stage.querySelector('[data-a]'), 'Impurity importance (MDI), training data', mrows, { left: 160 });
      var pTop = names.slice().sort(function (a, b) { return I.perm_auc_mean[b] - I.perm_auc_mean[a]; }).slice(0, st.top);
      var prow = pTop.map(function (n2) { return { label: pretty(n2), v: I.perm_auc_mean[n2], sd: I.perm_auc_sd[n2],
                                                   c: SIZE.indexOf(n2) >= 0 ? CAT[0] : CAT[2] }; });
      if (st.group) prow.unshift({ label: 'ALL 9 SIZE FEATURES', v: I.group_perm_size_auc_drop, c: CAT[3] });
      if (st.noise) prow.push({ label: 'continuous noise', v: I.noise.continuous_perm, sd: I.noise.continuous_perm_sd, c: GREY },
                              { label: 'binary noise', v: I.noise.binary_perm, sd: I.noise.binary_perm_sd, c: GREY });
      hbars(stage.querySelector('[data-b]'), 'Permutation importance, held-out (AUC drop)', prow, { left: 160, fmt: f4 });
      U.setMetric('w10i-mdi', pretty(mdiTop[0]) + ' ' + f3(I.mdi[mdiTop[0]]), 'largest MDI');
      U.setMetric('w10i-perm', f4(I.perm_auc_mean[pTop[0]]), 'largest single permutation drop');
      U.setMetric('w10i-group', st.group ? f3(I.group_perm_size_auc_drop) : 'off', 'size group permuted together');
      U.setMetric('w10i-area', st.keep ? f3(I.keep_one_size.worst_area_mdi_after) : f3(I.keep_one_size.worst_area_mdi_before),
        'MDI of worst area' + (st.keep ? ', relatives removed' : ''));
      var parts = ['<p>A 500-tree forest on 398 training tumours; permutation importance on the 171 held-out tumours (test AUC ' +
        f3(I.test_auc) + ', 30 repeats). Blue bars are the nine radius / perimeter / area features (mean |r| = ' +
        f3(I.size_group_mean_abs_corr) + ').</p>'];
      if (st.group) parts.push('<p><strong>Group permutation.</strong> Permuting the nine size features together costs ' +
        f3(I.group_perm_size_auc_drop) + ' AUC; the sum of their individual drops is only ' + f4(I.sum_individual_perm_size) +
        '. One at a time, each near-copy covers for the others.</p>');
      if (st.keep) parts.push('<p><strong>Relatives removed.</strong> Refitting with worst area as the only size feature raises its MDI from ' +
        f3(I.keep_one_size.worst_area_mdi_before) + ' to ' + f3(I.keep_one_size.worst_area_mdi_after) + ' (rank ' +
        I.keep_one_size.rank_after + '), while test AUC stays ' + f3(I.keep_one_size.test_auc_after) + '. The other bars are from ' +
        'the original forest, for reference.</p>');
      if (st.noise) parts.push('<p><strong>Noise columns</strong> (from a refit with the two extra columns): continuous noise gets MDI ' +
        f4(I.noise.continuous_mdi) + ', binary noise ' + f4(I.noise.binary_mdi) + '; permutation gives both about zero.</p>');
      parts.push('<p><strong>Question.</strong> Your collaborator wants to write “worst perimeter is the most important feature for ' +
        'malignancy”. What would you report instead: a feature, or a group? Neither importance is a causal claim.</p>');
      host.querySelector('[data-viz-note]').innerHTML = parts.join('');
      alt.innerHTML = U.altTable('Importances on WDBC (all 30 features).', ['Feature', 'MDI', 'Permutation (AUC drop)', 'SD'],
        names.map(function (n2) { return [pretty(n2), f4(I.mdi[n2]), f4(I.perm_auc_mean[n2]), f4(I.perm_auc_sd[n2])]; })) +
        '<p>Size group permuted together: ' + f3(I.group_perm_size_auc_drop) + '. Worst area MDI alone: ' +
        f3(I.keep_one_size.worst_area_mdi_after) + '. Noise MDI: continuous ' + f4(I.noise.continuous_mdi) + ', binary ' +
        f4(I.noise.binary_mdi) + '.</p>';
    }
    var setG = check(host, 'w10i-g', function (v) { st.group = v; draw(); });
    var setK = check(host, 'w10i-k', function (v) { st.keep = v; draw(); });
    var setN = check(host, 'w10i-n', function (v) { st.noise = v; draw(); });
    var setTop = seg(host, 'w10i-top', function (v) { st.top = +v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setG(false); setK(false); setN(false); setTop(10); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 7. proteins */
  window.Chart.register('viz-w10-proteins', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { task: 'transmembrane', rep: 'classical' }, st = Object.assign({}, DEF);
    var REPN = { classical: 'Classical (23)', esm2: 'ESM-2 (320)', esm2_shuffled: 'Shuffled ESM-2 (320)' };
    var MODN = { rf: 'forest', logreg: 'logistic', knn: 'k-NN (Week 7)' };
    function draw() {
      var T = P[st.task], rows = T.rows, b = T.boot_esm2rf_minus_classicalrf;
      stage.innerHTML = '<div class="w10-grid2"><div data-a></div><div data-b></div></div><div data-c></div>';
      var bars = [];
      ['classical', 'esm2', 'esm2_shuffled'].forEach(function (rep) {
        ['rf', 'logreg', 'knn'].forEach(function (m) {
          var r = rows[rep + '|' + m];
          if (r) bars.push({ label: REPN[rep].split(' (')[0] + ', ' + MODN[m], v: r.test_auc,
                             c: rep === st.rep ? (m === 'rf' ? CAT[3] : m === 'logreg' ? CAT[0] : CAT[1]) : GREY });
        });
      });
      hbars(stage.querySelector('[data-a]'), 'Test ROC AUC, 500 held-out proteins', bars, { left: 170 });
      var fr = rows[st.rep + '|rf'];
      if (fr && fr.perm_top) {
        hbars(stage.querySelector('[data-b]'), 'Forest: permutation importance (test AUC drop)',
          fr.perm_top.slice(0, 6).map(function (q) { return { label: pretty(q[0]), v: q[1], sd: q[2], c: /hydropathy/.test(q[0]) ? CAT[3] : CAT[0] }; }),
          { left: 150, fmt: f4 });
      } else {
        stage.querySelector('[data-b]').innerHTML = '<p class="small muted" style="padding:2em 1em">Importances were not computed for the ' +
          'shuffled control.</p>';
      }
      var lr = rows[st.rep + '|logreg'], kn = rows[st.rep + '|knn'];
      U.setMetric('w10p-rf', f3(fr.test_auc), 'forest, test AUC');
      U.setMetric('w10p-lr', f3(lr.test_auc), 'logistic, test AUC');
      U.setMetric('w10p-knn', kn ? f3(kn.test_auc) : '—', 'k-NN (Week 7), test AUC');
      U.setMetric('w10p-diff', (b.diff >= 0 ? '+' : '') + f3(b.diff), '95% CI [' + f3(b.ci95[0]) + ', ' + f3(b.ci95[1]) + ']');
      var tbl = '<div class="table-scroll"><table class="table-compact"><caption>The columns that decide use (' +
        (st.task === 'transmembrane' ? 'transmembrane' : 'signal peptide') + ')</caption><thead><tr><th scope="col">Pipeline</th>' +
        '<th scope="col">Test AUC</th><th scope="col">Average precision</th><th scope="col">Chosen settings (5-fold CV on 1,500)</th>' +
        '<th scope="col">Compute</th><th scope="col">Interpretability</th></tr></thead><tbody>';
      [['classical|rf', 'Seconds, CPU', 'High: named features'], ['classical|logreg', 'Seconds, CPU', 'High: named features'],
       ['esm2|logreg', 'Embedding pass, then seconds', 'Low: 320 unnamed weights'], ['esm2|rf', 'Embedding pass, then seconds', 'Low: unnamed dimensions']]
        .forEach(function (q) {
          var r = rows[q[0]];
          tbl += '<tr><th scope="row">' + REPN[q[0].split('|')[0]] + ', ' + MODN[q[0].split('|')[1]] + '</th><td>' + f3(r.test_auc) +
            '</td><td>' + f3(r.test_ap) + '</td><td>' + U.esc(JSON.stringify(r.params).replace(/[{}"]/g, '').replace(/,/g, ', ')) +
            '</td><td>' + q[1] + '</td><td>' + q[2] + '</td></tr>';
        });
      tbl += '<tr><th scope="row">Fine-tuned ESM-2</th><td colspan="3">Not run (Week 11)</td><td>GPU hours</td><td>Low</td></tr></tbody></table></div>';
      stage.querySelector('[data-c]').innerHTML = tbl;
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>' + (st.task === 'transmembrane' ? 'Transmembrane' : 'Signal peptide') + ' (' + pc(T.prevalence_test) + ' of the test ' +
        'proteins). ESM-2 forest minus classical forest: ' + (b.diff >= 0 ? '+' : '') + f3(b.diff) + ' AUC, paired-bootstrap 95% CI [' +
        f3(b.ci95[0]) + ', ' + f3(b.ci95[1]) + ']' + (b.ci95[1] < 0 ? ': the classical forest is better.' : ': no detectable difference on 500 proteins.') +
        ' On ESM-2, logistic regression (' + f3(rows['esm2|logreg'].test_auc) + ') beats the forest (' + f3(rows['esm2|rf'].test_auc) +
        '). The shuffled-sequence control (same composition and length, no order) is far lower.</p>' +
        '<p><strong>Question.</strong> What can you claim from these numbers, and what can you not? Are the classical forest\'s ' +
        'top features a discovery?</p>';
      alt.innerHTML = U.altTable('Test ROC AUC and average precision (500 proteins).', ['Representation', 'Model', 'Test AUC', 'Test AP'],
        Object.keys(rows).map(function (k) { var r = rows[k]; return [REPN[k.split('|')[0]], MODN[k.split('|')[1]], f3(r.test_auc), f3(r.test_ap)]; }));
    }
    var setT = seg(host, 'w10p-task', function (v) { st.task = v; draw(); });
    var setR = seg(host, 'w10p-rep', function (v) { st.rep = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setT(st.task); setR(st.rep); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });
})();
