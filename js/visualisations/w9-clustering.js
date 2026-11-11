/* Week 9 - Clustering biological data: Exercises 1-6.
 *
 * Data: window.WEEK09, written by data/scripts/22_build_week09_data.py from real data already in the
 * repository (WDBC, 569 tumours, standardised; the Week 7 Swiss-Prot / ESM-2 proteins).
 *   1 w9-kmeans    k-means step by step, computed in the browser on the first two principal components
 *   2 w9-choosek   elbow, silhouette, bootstrap stability and a silhouette plot (precomputed, 30-D)
 *   3 w9-dbscan    DBSCAN computed in the browser on the first two principal components, with a k-distance plot
 *   4 w9-hier      agglomerative clustering computed in the browser on 60 tumours (30-D), dendrogram and cut
 *   5 w9-batch     a SIMULATED batch shift on the real tumours: k-means results precomputed in 30-D
 *   6 w9-proteins  k-means on protein representations (precomputed)
 */
(function () {
  'use strict';
  var D = window.WEEK09;
  if (!D) return;
  var WEB = D.web;
  var CAT = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)',
             '#8c6d1f', '#7a4f9a'];
  var NOISE = '#b8c2cc';
  var PTS = D.wdbc.pca2_points;                         // [pc1, pc2, malignant, random batch]
  var Y = PTS.map(function (p) { return p[2]; });
  if (!document.getElementById('w9-style')) {
    var css = document.createElement('style');
    css.id = 'w9-style';
    css.textContent = '.w9-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}' +
                      '.w9-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}' +
                      '.w9-btns{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}';
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
  function f3(v) { return (v == null || isNaN(v)) ? '—' : (+v).toFixed(3); }
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
  function d2(a, b) { var s = 0; for (var j = 0; j < a.length; j++) { var v = a[j] - b[j]; s += v * v; } return s; }

  // adjusted Rand index between two label vectors (labels may include -1, treated as a label)
  function ari(a, b) {
    var n = a.length, tab = {}, ra = {}, rb = {};
    for (var i = 0; i < n; i++) {
      var k = a[i] + '|' + b[i];
      tab[k] = (tab[k] || 0) + 1; ra[a[i]] = (ra[a[i]] || 0) + 1; rb[b[i]] = (rb[b[i]] || 0) + 1;
    }
    function c2(x) { return x * (x - 1) / 2; }
    var sij = 0, sa = 0, sb = 0, k2;
    for (k2 in tab) sij += c2(tab[k2]);
    for (k2 in ra) sa += c2(ra[k2]);
    for (k2 in rb) sb += c2(rb[k2]);
    var exp = sa * sb / c2(n), mx = (sa + sb) / 2;
    return mx === exp ? 0 : (sij - exp) / (mx - exp);
  }
  function silhouette(X, lab) {                         // mean silhouette, Euclidean, ignores label -1
    var idx = [], i, j;
    for (i = 0; i < X.length; i++) if (lab[i] >= 0) idx.push(i);
    var ks = {}; idx.forEach(function (i2) { ks[lab[i2]] = 1; });
    if (Object.keys(ks).length < 2) return NaN;
    var tot = 0;
    idx.forEach(function (i2) {
      var sums = {}, cnt = {};
      idx.forEach(function (j2) {
        if (j2 === i2) return;
        var d = Math.sqrt(d2(X[i2], X[j2]));
        sums[lab[j2]] = (sums[lab[j2]] || 0) + d; cnt[lab[j2]] = (cnt[lab[j2]] || 0) + 1;
      });
      var own = lab[i2];
      if (!cnt[own]) return;                            // singleton: s = 0
      var a = sums[own] / cnt[own], b = Infinity;
      for (var c in sums) if (+c !== own) b = Math.min(b, sums[c] / cnt[c]);
      tot += (b - a) / Math.max(a, b);
    });
    return tot / idx.length;
  }
  function scatter(stage, pts, colourOf, opts) {
    opts = opts || {};
    var f = window.Chart.frame(stage, { height: opts.height || Math.min(400, Math.max(300, stage.clientWidth * 0.55)),
      margin: { top: 14, right: 16, bottom: 40, left: 46 }, title: opts.title || 'Scatter plot' });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x = d3.scaleLinear().domain(d3.extent(xs)).nice().range([0, f.w]);
    var y = d3.scaleLinear().domain(d3.extent(ys)).nice().range([f.h, 0]);
    window.Chart.axes(f, x, y, { xLabel: opts.xLabel || 'PC1', yLabel: opts.yLabel || 'PC2' });
    var sym = d3.symbol().size(30);
    f.g.selectAll('path.pt').data(pts).join('path').attr('class', 'pt')
      .attr('transform', function (p) { return 'translate(' + x(p[0]) + ',' + y(p[1]) + ')'; })
      .attr('d', function (p, i) { return sym.type(opts.shape && opts.shape(i) ? d3.symbolTriangle : d3.symbolCircle)(); })
      .attr('fill', function (p, i) { return colourOf(i); }).attr('opacity', 0.75);
    return { f: f, x: x, y: y };
  }
  function lineChart(el, title, ks, series, mark, opts) {
    opts = opts || {};
    var f = window.Chart.frame(el, { height: 210, margin: { top: 26, right: 12, bottom: 36, left: 48 }, title: title });
    var all = []; series.forEach(function (s) { s.v.forEach(function (v) { if (v != null) all.push(v); }); });
    var x = d3.scaleLinear().domain(d3.extent(ks)).range([0, f.w]);
    var y = d3.scaleLinear().domain(opts.domain || d3.extent(all)).nice().range([f.h, 0]);
    window.Chart.axes(f, x, y, { xLabel: opts.xLabel || 'k', yTicks: 4 });
    f.svg.append('text').attr('x', f.margin.left).attr('y', 15).style('font-size', '12px').style('font-weight', 600).text(title);
    series.forEach(function (s) {
      var pts = ks.map(function (k, i) { return [k, s.v[i]]; }).filter(function (p) { return p[1] != null; });
      f.g.append('path').datum(pts).attr('fill', 'none').attr('stroke', s.c).attr('stroke-width', 2.2)
        .attr('d', d3.line().x(function (p) { return x(p[0]); }).y(function (p) { return y(p[1]); }));
      f.g.selectAll(null).data(pts).join('circle').attr('r', 3).attr('fill', s.c)
        .attr('cx', function (p) { return x(p[0]); }).attr('cy', function (p) { return y(p[1]); });
    });
    if (mark != null) f.g.append('line').attr('x1', x(mark)).attr('x2', x(mark)).attr('y1', 0).attr('y2', f.h)
      .attr('stroke', 'var(--cat-4)').attr('stroke-dasharray', '4,3');
    return f;
  }

  /* ====================================================== 1. k-means stepper */
  window.Chart.register('viz-w9-kmeans', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var X = PTS.map(function (p) { return [p[0], p[1]]; });
    var DEF = { k: 2, init: 'random', seed: 1 };
    var st = Object.assign({}, DEF), C, lab, steps, phase, history;

    function init() {
      var r = rng(st.seed * 7919), i;
      C = [];
      if (st.init === 'random') {
        var used = {};
        while (C.length < st.k) { i = Math.floor(r() * X.length); if (!used[i]) { used[i] = 1; C.push(X[i].slice()); } }
      } else {                                         // k-means++: D^2 sampling
        C.push(X[Math.floor(r() * X.length)].slice());
        while (C.length < st.k) {
          var dd = X.map(function (p) { return d3.min(C, function (c) { return d2(p, c); }); });
          var tot = d3.sum(dd), u = r() * tot, acc = 0;
          for (i = 0; i < X.length; i++) { acc += dd[i]; if (acc >= u) break; }
          C.push(X[Math.min(i, X.length - 1)].slice());
        }
      }
      lab = null; steps = 0; phase = 'assign'; history = [];
    }
    function wcss() { return lab ? d3.sum(X, function (p, i) { return d2(p, C[lab[i]]); }) : NaN; }
    function assign() {
      var changed = false, nl = X.map(function (p) {
        var b = 0, bd = Infinity;
        C.forEach(function (c, j) { var d = d2(p, c); if (d < bd) { bd = d; b = j; } });
        return b;
      });
      if (!lab || nl.some(function (v, i) { return v !== lab[i]; })) changed = true;
      lab = nl; steps++; phase = 'update';
      history.push(['assign ' + steps, wcss()]);
      return changed;
    }
    function update() {
      C = C.map(function (c, j) {
        var m = X.filter(function (p, i) { return lab[i] === j; });
        return m.length ? [d3.mean(m, function (p) { return p[0]; }), d3.mean(m, function (p) { return p[1]; })] : c;
      });
      phase = 'assign';
      history.push(['update ' + steps, wcss()]);
    }
    function converged() {
      if (!lab) return false;
      return X.every(function (p, i) {
        var b = 0, bd = Infinity;
        C.forEach(function (c, j) { var d = d2(p, c); if (d < bd) { bd = d; b = j; } });
        return b === lab[i];
      });
    }
    function draw() {
      var sc = scatter(stage, PTS, function (i) { return lab ? CAT[lab[i]] : NOISE; },
                       { title: 'k-means on WDBC, first two principal components' });
      sc.f.g.selectAll('path.cent').data(C).join('path').attr('class', 'cent')
        .attr('transform', function (c) { return 'translate(' + sc.x(c[0]) + ',' + sc.y(c[1]) + ') rotate(45)'; })
        .attr('d', d3.symbol().type(d3.symbolCross).size(260)()).attr('fill', function (c, j) { return CAT[j]; })
        .attr('stroke', '#111').attr('stroke-width', 1.2);
      var conv = phase === 'assign' && converged() && steps > 0;
      U.setMetric('w9k-step', String(steps), 'assignment steps so far');
      U.setMetric('w9k-wcss', lab ? wcss().toFixed(1) : '—', 'within-cluster sum of squares (2-D)');
      U.setMetric('w9k-next', conv ? 'converged' : (phase === 'assign' ? 'Assign' : 'Update'), 'next step');
      U.setMetric('w9k-ari', lab ? f3(ari(Y, lab)) : '—', 'agreement with diagnosis (ARI)');
      host.querySelector('#w9k-assign').disabled = phase !== 'assign' || conv;
      host.querySelector('#w9k-update').disabled = phase !== 'update';
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>' + (!lab ? 'The ' + st.k + ' starting centroids (crosses) were chosen by ' +
          (st.init === 'random' ? 'picking random tumours' : 'k-means++ (far points are more likely)') + '. Press Assign.' :
          conv ? 'Converged: no tumour changes cluster. Final WCSS ' + wcss().toFixed(1) + '. Change the seed and run again: ' +
          'do you reach the same WCSS?' :
          phase === 'update' ? 'Each tumour now belongs to its nearest centroid. Press Update to move each centroid to the mean of its members.' :
          'Centroids moved. Press Assign to reassign the tumours to the nearest centroid.') + '</p>' +
        '<p><strong>Question.</strong> Run k = 3 from five different seeds. How many different final WCSS values do you get, ' +
        'and what does that tell you about trusting a single run?</p>';
      alt.innerHTML = U.altTable('WCSS after each step (2-D, first two principal components).', ['Step', 'WCSS'],
        history.map(function (h) { return [h[0], h[1].toFixed(1)]; }));
    }
    function run() {
      var guard = 0;
      if (!lab) assign();
      while (guard++ < 100) {
        if (phase === 'update') update();
        if (converged()) break;
        assign();
      }
      if (phase === 'update') update();
      draw();
    }
    var setK = slider(host, 'w9k-k', function (v) { return String(v); }, function (v) { st.k = v; init(); draw(); });
    var setInit = seg(host, 'w9k-init', function (v) { st.init = v; init(); draw(); });
    var setSeed = slider(host, 'w9k-seed', function (v) { return String(v); }, function (v) { st.seed = v; init(); draw(); });
    host.querySelector('#w9k-assign').addEventListener('click', function () { assign(); draw(); });
    host.querySelector('#w9k-update').addEventListener('click', function () { update(); draw(); });
    host.querySelector('#w9k-run').addEventListener('click', run);
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setK(st.k); setInit(st.init); setSeed(st.seed); init(); draw();
    });
    init();
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 2. choosing k */
  window.Chart.register('viz-w9-choosek', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var SW = D.wdbc.sweep, STB = D.wdbc.stability_bootstrap.by_k;
    var DEF = { k: 2, reveal: false }, st = Object.assign({}, DEF);
    function row(k) { return SW.filter(function (r) { return r.k === k; })[0]; }
    function draw() {
      stage.innerHTML = '<div class="w9-grid3"><div data-a></div><div data-b></div><div data-c></div></div><div data-d></div>';
      var ks = SW.map(function (r) { return r.k; });
      lineChart(stage.querySelector('[data-a]'), 'Elbow: WCSS', ks, [{ v: SW.map(function (r) { return r.inertia; }), c: CAT[0] }], st.k);
      var k2 = ks.slice(1);
      lineChart(stage.querySelector('[data-b]'), 'Mean silhouette', k2, [{ v: SW.slice(1).map(function (r) { return r.silhouette; }), c: CAT[1] }], st.k);
      var k3 = [2, 3, 4, 5, 6, 7];
      lineChart(stage.querySelector('[data-c]'), 'Bootstrap stability (ARI)', k3,
        [{ v: k3.map(function (k) { return STB[k].mean_ari; }), c: CAT[2] }], st.k <= 7 ? st.k : null, { domain: [0.3, 1] });
      // silhouette plot
      var S = WEB.silhouettes[String(st.k)], el = stage.querySelector('[data-d]');
      var n = d3.sum(S, function (c) { return c.length; }) + 6 * S.length;
      var f = window.Chart.frame(el, { height: 300, margin: { top: 24, right: 16, bottom: 40, left: 60 }, title: 'Silhouette plot' });
      var x = d3.scaleLinear().domain([-0.3, 0.8]).range([0, f.w]), y = d3.scaleLinear().domain([0, n]).range([0, f.h]);
      window.Chart.axes(f, x, d3.scaleLinear().domain([0, 1]).range([f.h, 0]), { xLabel: 's(i), one bar per tumour', grid: false, yTicks: 0 });
      var y0 = 0, neg = 0;
      S.forEach(function (vals, c) {
        vals.forEach(function (v, i) {
          if (v < 0) neg++;
          f.g.append('line').attr('x1', x(0)).attr('x2', x(v)).attr('y1', y(y0 + i)).attr('y2', y(y0 + i))
            .attr('stroke', CAT[c % CAT.length]).attr('stroke-width', Math.max(0.6, f.h / n));
        });
        f.g.append('text').attr('x', -6).attr('y', y(y0 + vals.length / 2)).attr('text-anchor', 'end')
          .style('font-size', '11px').text('n=' + vals.length);
        y0 += vals.length + 6;
      });
      var r = row(st.k);
      f.g.append('line').attr('x1', x(r.silhouette)).attr('x2', x(r.silhouette)).attr('y1', 0).attr('y2', f.h)
        .attr('stroke', 'var(--cat-4)').attr('stroke-dasharray', '4,3');
      f.svg.append('text').attr('x', f.margin.left).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('Silhouette plot, k = ' + st.k + ' (dashed line: mean)');
      U.setMetric('w9c-sil', f3(r.silhouette), 'mean silhouette');
      U.setMetric('w9c-stab', STB[st.k] ? f3(STB[st.k].mean_ari) : 'not computed', 'mean bootstrap ARI (50 resamples)');
      U.setMetric('w9c-neg', String(neg), 'tumours with s(i) < 0');
      U.setMetric('w9c-ari', st.reveal ? f3(r.ari) : 'hidden', 'ARI with diagnosis');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>k = ' + st.k + ': clusters of ' + r.sizes.join(', ') + ' tumours. ' +
        (st.reveal ? 'Agreement with the pathological diagnosis: ARI ' + f3(r.ari) + '. Remember that in a real discovery study ' +
          'you would not have this label.' : 'Decide which k you would report, and why, before you reveal the diagnosis.') + '</p>' +
        '<p><strong>Question.</strong> The silhouette at k = 2 is ' + f3(row(2).silhouette) + '. Is that strong evidence of two ' +
        'groups? Which other curve supports or weakens your choice?</p>';
      alt.innerHTML = U.altTable('Standardised WDBC, k-means with n_init = 10.', ['k', 'WCSS', 'Silhouette', 'Stability', 'Sizes', 'ARI with diagnosis'],
        SW.slice(1).map(function (q) {
          return [String(q.k), q.inertia.toFixed(0), f3(q.silhouette), STB[q.k] ? f3(STB[q.k].mean_ari) : '—', q.sizes.join('/'),
                  st.reveal ? f3(q.ari) : 'hidden'];
        }));
    }
    var setK = slider(host, 'w9c-k', function (v) { return String(v); }, function (v) { st.k = v; draw(); });
    var setR = check(host, 'w9c-reveal', function (v) { st.reveal = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setK(st.k); setR(false); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 3. DBSCAN */
  function dbscan(X, eps, ms) {
    var n = X.length, e2 = eps * eps, nb = [], i, j;
    for (i = 0; i < n; i++) { var l = []; for (j = 0; j < n; j++) if (d2(X[i], X[j]) <= e2) l.push(j); nb.push(l); }
    var lab = new Array(n).fill(-2), c = 0;              // -2 unvisited, -1 noise
    for (i = 0; i < n; i++) {
      if (lab[i] !== -2) continue;
      if (nb[i].length < ms) { lab[i] = -1; continue; }
      lab[i] = c; var queue = nb[i].slice();
      while (queue.length) {
        var q = queue.pop();
        if (lab[q] === -1) lab[q] = c;
        if (lab[q] !== -2) continue;
        lab[q] = c;
        if (nb[q].length >= ms) queue.push.apply(queue, nb[q]);
      }
      c++;
    }
    return { lab: lab, k: c, core: nb.map(function (l) { return l.length >= ms; }) };
  }
  window.Chart.register('viz-w9-dbscan', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var X = PTS.map(function (p) { return [p[0], p[1]]; });
    var DEF = { eps: 0.5, ms: 5 }, st = Object.assign({}, DEF);
    function kdist(ms) {
      return X.map(function (p) {
        var d = X.map(function (q) { return Math.sqrt(d2(p, q)); }).sort(function (a, b) { return a - b; });
        return d[Math.min(ms - 1, d.length - 1)];
      }).sort(function (a, b) { return a - b; });
    }
    function draw() {
      var r = dbscan(X, st.eps, st.ms);
      stage.innerHTML = '<div class="w9-grid2"><div data-a></div><div data-b></div></div>';
      scatter(stage.querySelector('[data-a]'), PTS, function (i) { return r.lab[i] < 0 ? NOISE : CAT[r.lab[i] % CAT.length]; },
              { title: 'DBSCAN clusters; grey = noise', height: 320 });
      var kd = kdist(st.ms), el = stage.querySelector('[data-b]');
      var f = window.Chart.frame(el, { height: 320, margin: { top: 26, right: 12, bottom: 40, left: 48 }, title: 'k-distance plot' });
      var x = d3.scaleLinear().domain([0, kd.length]).range([0, f.w]);
      var y = d3.scaleLinear().domain([0, Math.min(3, d3.max(kd))]).nice().range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'tumours, sorted', yLabel: 'distance to neighbour ' + (st.ms - 1) });
      f.g.append('path').datum(kd).attr('fill', 'none').attr('stroke', CAT[0]).attr('stroke-width', 2)
        .attr('d', d3.line().x(function (v, i) { return x(i); }).y(function (v) { return y(Math.min(v, y.domain()[1])); }));
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(st.eps)).attr('y2', y(st.eps))
        .attr('stroke', 'var(--cat-4)').attr('stroke-dasharray', '4,3');
      f.svg.append('text').attr('x', f.margin.left).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('k-distance plot (dashed: eps = ' + st.eps.toFixed(2) + ')');
      var noise = r.lab.filter(function (v) { return v < 0; }).length;
      var keep = []; r.lab.forEach(function (v, i) { if (v >= 0) keep.push(i); });
      var sizes = d3.range(r.k).map(function (c) { return r.lab.filter(function (v) { return v === c; }).length; })
        .sort(function (a, b) { return b - a; });
      var a2 = r.k >= 2 ? ari(keep.map(function (i) { return Y[i]; }), keep.map(function (i) { return r.lab[i]; })) : NaN;
      U.setMetric('w9d-k', String(r.k), 'clusters found');
      U.setMetric('w9d-noise', String(noise), 'tumours labelled noise');
      U.setMetric('w9d-big', sizes.length ? String(sizes[0]) : '—', 'size of the largest cluster');
      U.setMetric('w9d-ari', r.k >= 2 ? f3(a2) : '—', 'ARI with diagnosis (non-noise)');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>eps = ' + st.eps.toFixed(2) + ', min_samples = ' + st.ms + ': ' + r.k + ' cluster' + (r.k === 1 ? '' : 's') +
        (sizes.length ? ' (' + sizes.slice(0, 6).join(', ') + (sizes.length > 6 ? ', …' : '') + ')' : '') + ' and ' + noise +
        ' noise points. DBSCAN decides the number of clusters itself, and it can decline to cluster a tumour.</p>' +
        '<p>In the full 30-dimensional space (computed offline) no eps gives a useful answer: at eps 2.0 there are ' +
        D.wdbc.dbscan_30d.sweep.filter(function (q) { return q.eps === 2; })[0].noise + ' noise points; at eps 3.0, one ' +
        'cluster. Distances concentrate in high dimension (Week 7).</p>' +
        '<p><strong>Question.</strong> Is there a range of eps over which the answer stays the same? Why are the malignant ' +
        'tumours so often labelled noise?</p>';
      alt.innerHTML = U.altTable('DBSCAN on the first two principal components, min_samples = 5 (precomputed sweep).',
        ['eps', 'Clusters', 'Noise', 'Largest', 'ARI (non-noise)'], D.wdbc.dbscan_pca2.sweep.map(function (q) {
          return [String(q.eps), String(q.clusters), String(q.noise), String(q.largest), q.ari_non_noise != null ? f3(q.ari_non_noise) : '—'];
        }));
    }
    var setE = slider(host, 'w9d-eps', function (v) { return v.toFixed(2); }, function (v) { st.eps = v; draw(); });
    var setM = slider(host, 'w9d-ms', function (v) { return String(v); }, function (v) { st.ms = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setE(st.eps); setM(st.ms); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 4. hierarchical */
  function agglomerate(X, method) {
    // Lance-Williams on squared distances for Ward (scipy convention: height = sqrt), plain distances otherwise
    var n = X.length, i, j, Dm = [], size = [], active = [], id = [], merges = [];
    for (i = 0; i < n; i++) {
      Dm.push([]); size.push(1); active.push(true); id.push(i);
      for (j = 0; j < n; j++) { var dd = d2(X[i], X[j]); Dm[i].push(method === 'ward' ? dd : Math.sqrt(dd)); }
    }
    for (var step = 0; step < n - 1; step++) {
      var bi = -1, bj = -1, best = Infinity;
      for (i = 0; i < n; i++) if (active[i]) for (j = i + 1; j < n; j++) if (active[j] && Dm[i][j] < best) { best = Dm[i][j]; bi = i; bj = j; }
      var h = method === 'ward' ? Math.sqrt(best) : best;
      merges.push([id[bi], id[bj], h, size[bi] + size[bj]]);
      for (var k = 0; k < n; k++) {
        if (!active[k] || k === bi || k === bj) continue;
        var a = Dm[bi][k], b = Dm[bj][k], v;
        if (method === 'single') v = Math.min(a, b);
        else if (method === 'complete') v = Math.max(a, b);
        else if (method === 'average') v = (size[bi] * a + size[bj] * b) / (size[bi] + size[bj]);
        else v = ((size[k] + size[bi]) * a + (size[k] + size[bj]) * b - size[k] * best) / (size[k] + size[bi] + size[bj]);
        Dm[bi][k] = Dm[k][bi] = v;
      }
      active[bj] = false; size[bi] += size[bj]; id[bi] = n + step;
    }
    return merges;
  }
  function cutTree(merges, n, k) {                     // labels for k clusters: undo the last k-1 merges
    var parent = {};
    merges.slice(0, n - k).forEach(function (m, s) { parent[m[0]] = n + s; parent[m[1]] = n + s; });
    function root(x) { while (parent[x] != null) x = parent[x]; return x; }
    var roots = {}, c = 0;
    return d3.range(n).map(function (i) { var r = root(i); if (roots[r] == null) roots[r] = c++; return roots[r]; });
  }
  window.Chart.register('viz-w9-hier', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var HS = WEB.hier_sample, X = HS.z, n = X.length, cache = {};
    var DEF = { m: 'ward', k: 2 }, st = Object.assign({}, DEF);
    function draw() {
      var M = cache[st.m] || (cache[st.m] = agglomerate(X, st.m));
      var lab = cutTree(M, n, st.k);
      // leaf order
      var kids = {}; M.forEach(function (m, s) { kids[n + s] = [m[0], m[1]]; });
      var order = [];
      (function walk(x) { if (x < n) order.push(x); else { walk(kids[x][0]); walk(kids[x][1]); } })(2 * n - 2);
      var pos = {}; order.forEach(function (leaf, i) { pos[leaf] = i; });
      var f = window.Chart.frame(stage, { height: 380, margin: { top: 16, right: 16, bottom: 46, left: 52 },
        title: 'Dendrogram of 60 tumours, ' + st.m + ' linkage' });
      var x = d3.scaleLinear().domain([-0.5, n - 0.5]).range([0, f.w]);
      var y = d3.scaleLinear().domain([0, d3.max(M, function (m) { return m[2]; }) * 1.05]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'tumours (squares: diagnosis, purple malignant, blue benign; dots: cluster)', yLabel: 'merge height' });
      var X0 = {}, H0 = {};
      order.forEach(function (leaf) { X0[leaf] = pos[leaf]; H0[leaf] = 0; });
      var cutH = st.k > 1 ? (M[n - st.k][2] + M[n - st.k - 1 >= 0 ? n - st.k - 1 : 0][2]) / 2 : M[n - 2][2] * 1.02;
      if (st.k === 1) cutH = M[n - 2][2] * 1.02;
      M.forEach(function (m, s) {
        var a = m[0], b = m[1], node = n + s, xa = X0[a], xb = X0[b];
        f.g.append('path').attr('fill', 'none').attr('stroke', m[2] > cutH ? '#8798a3' : 'var(--cat-1)').attr('stroke-width', 1.2)
          .attr('d', 'M' + x(xa) + ',' + y(H0[a]) + 'V' + y(m[2]) + 'H' + x(xb) + 'V' + y(H0[b]));
        X0[node] = (xa + xb) / 2; H0[node] = m[2];
      });
      f.g.selectAll('rect.leaf').data(order).join('rect').attr('class', 'leaf')
        .attr('x', function (l) { return x(pos[l]) - 3; }).attr('y', f.h + 2).attr('width', 6).attr('height', 6)
        .attr('fill', function (l) { return HS.y[l] ? 'var(--cat-4)' : 'var(--cat-1)'; });
      f.g.selectAll('circle.cl').data(order).join('circle').attr('class', 'cl')
        .attr('cx', function (l) { return x(pos[l]); }).attr('cy', f.h - 4).attr('r', 3)
        .attr('fill', function (l) { return CAT[lab[l] % CAT.length]; });
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(cutH)).attr('y2', y(cutH))
        .attr('stroke', 'var(--cat-4)').attr('stroke-dasharray', '5,3').attr('stroke-width', 1.6);
      var sizes = d3.range(st.k).map(function (c) { return lab.filter(function (v) { return v === c; }).length; })
        .sort(function (a, b) { return b - a; });
      var sil = st.k >= 2 ? silhouette(X, lab) : NaN, a2 = st.k >= 2 ? ari(HS.y, lab) : NaN;
      U.setMetric('w9h-sizes', sizes.join(' / '), 'cluster sizes');
      U.setMetric('w9h-sil', f3(sil), 'mean silhouette (30-D)');
      U.setMetric('w9h-ari', f3(a2), 'ARI with diagnosis');
      U.setMetric('w9h-h', cutH.toFixed(2), 'cut height');
      var full = D.wdbc.hierarchical[st.m];
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>Cutting the ' + st.m + '-linkage tree into ' + st.k + ' cluster' + (st.k === 1 ? '' : 's') + ' gives sizes ' +
        sizes.join(', ') + '. On all 569 tumours (computed offline) the ' + st.m + ' two-cluster cut has sizes ' +
        full.k2.sizes.join(' / ') + ', silhouette ' + f3(full.k2.silhouette) + ' and ARI with diagnosis ' + f3(full.k2.ari) +
        '; cophenetic correlation ' + f3(full.cophenetic) + '.</p>' +
        '<p><strong>Question.</strong> Compare single and Ward linkage at two clusters. Which has the higher silhouette, and ' +
        'which is more useful? What does that tell you about the silhouette?</p>';
      alt.innerHTML = U.altTable('Merges of the ' + st.m + ' tree (last 10 shown; heights on the scipy scale).',
        ['Merge', 'Height', 'Size of new cluster'], M.slice(-10).map(function (m, i) {
          return [String(n - 10 + i), m[2].toFixed(3), String(m[3])];
        }));
    }
    var setM = seg(host, 'w9h-m', function (v) { st.m = v; draw(); });
    var setK = slider(host, 'w9h-k', function (v) { return v + ' cluster' + (v === 1 ? '' : 's'); }, function (v) { st.k = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setM(st.m); setK(st.k); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 5. batch effect */
  window.Chart.register('viz-w9-batch', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var BB = WEB.batch, SH = BB.shifts;
    var DEF = { design: 'random', si: 0, corr: false }, st = Object.assign({}, DEF);
    function key(d, s, c) { return d + '|' + s + '|' + (c ? 1 : 0); }
    function draw() {
      var run = BB.runs[key(st.design, SH[st.si], st.corr)], asg = BB.assign[st.design];
      stage.innerHTML = '<div class="w9-grid2"><div data-a></div><div data-b></div></div>';
      scatter(stage.querySelector('[data-a]'), run.pts, function (i) { return CAT[run.pts[i][2]]; },
              { title: 'k-means clusters (colour); batch A circles, batch B triangles', height: 320,
                shape: function (i) { return asg[i] === 1; } });
      var series = ['ari_diagnosis', 'ari_batch', 'silhouette'].map(function (m, j) {
        return { v: SH.map(function (s) { return BB.runs[key(st.design, s, st.corr)][m]; }), c: [CAT[0], CAT[3], CAT[1]][j] };
      });
      var f = lineChart(stage.querySelector('[data-b]'), 'Blue: ARI diagnosis · purple: ARI batch · orange: silhouette',
                        SH, series, SH[st.si], { domain: [-0.05, 1.05], xLabel: 'batch shift (SD per feature)' });
      var follows = run.ari_batch > 0.5 && run.ari_batch > run.ari_diagnosis ? 'the batch' :
                    run.ari_diagnosis > 0.5 ? 'the diagnosis' : 'a mixture of both';
      U.setMetric('w9b-sil', f3(run.silhouette), 'mean silhouette');
      U.setMetric('w9b-dx', f3(run.ari_diagnosis), 'ARI with diagnosis');
      U.setMetric('w9b-batch', f3(run.ari_batch), 'ARI with batch');
      U.setMetric('w9b-follow', follows, 'the clusters follow');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>' + (st.design === 'random' ? 'Random design: each tumour was put in batch B by a coin toss, independent of diagnosis. ' :
          'Confounded design: 82% of malignant and 20% of benign tumours are in batch B, as when cases and controls are ' +
          'collected at different times. ') + 'Shift ' + SH[st.si] + ' SD added to every feature of batch B' +
        (st.corr ? ', then each batch centred on its own mean (the location step of ComBat-style correction). ' : '. ') +
        'The clusters follow ' + follows + '.</p>' +
        '<p><strong>Question.</strong> Find the shift at which the clusters switch to the batch. Then switch to the confounded ' +
        'design and tick the correction: why does centring per batch rescue the random design but not the confounded one?</p>';
      alt.innerHTML = U.altTable('k-means (k = 2) on standardised WDBC with a SIMULATED batch shift; design: ' + st.design +
        (st.corr ? ', centred per batch' : '') + '.', ['Shift (SD)', 'Silhouette', 'ARI diagnosis', 'ARI batch'],
        SH.map(function (s) { var r = BB.runs[key(st.design, s, st.corr)]; return [String(s), f3(r.silhouette), f3(r.ari_diagnosis), f3(r.ari_batch)]; }));
    }
    var setD = seg(host, 'w9b-design', function (v) { st.design = v; draw(); });
    var setS = slider(host, 'w9b-shift', function (v) { return SH[v] + ' SD'; }, function (v) { st.si = v; draw(); });
    var setC = check(host, 'w9b-corr', function (v) { st.corr = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setD(st.design); setS(st.si); setC(false); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ====================================================== 6. proteins */
  window.Chart.register('viz-w9-proteins', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var P = D.proteins, LBL = { classical: 'Classical descriptors (23)', esm2: 'ESM-2 (320), Euclidean', esm2_cosine: 'ESM-2 (320), cosine' };
    var DEF = { rep: 'esm2', k: 4 }, st = Object.assign({}, DEF);
    function draw() {
      var prof = P.profiles[st.rep][String(st.k)], row = P.reps[st.rep].filter(function (r) { return r.k === st.k; })[0];
      var f = window.Chart.frame(stage, { height: 340, margin: { top: 30, right: 16, bottom: 60, left: 52 },
        title: 'Cluster profiles: ' + LBL[st.rep] + ', k = ' + st.k });
      var x0 = d3.scaleBand().domain(prof.map(function (c, i) { return 'Cluster ' + (i + 1); })).range([0, f.w]).padding(0.25);
      var x1 = d3.scaleBand().domain(['sp', 'tm']).range([0, x0.bandwidth()]).padding(0.1);
      var y = d3.scaleLinear().domain([0, 1]).range([f.h, 0]);
      window.Chart.axes(f, x0, y, { yLabel: 'share of the cluster', xLabel: '' });
      prof.forEach(function (c, i) {
        ['sp', 'tm'].forEach(function (m, j) {
          f.g.append('rect').attr('x', x0('Cluster ' + (i + 1)) + x1(m)).attr('width', x1.bandwidth()).attr('y', y(c[m]))
            .attr('height', f.h - y(c[m])).attr('fill', j ? CAT[1] : CAT[0]);
        });
        f.g.append('text').attr('x', x0('Cluster ' + (i + 1)) + x0.bandwidth() / 2).attr('y', f.h + 32).attr('text-anchor', 'middle')
          .style('font-size', '11px').text('n=' + c.size);
        f.g.append('text').attr('x', x0('Cluster ' + (i + 1)) + x0.bandwidth() / 2).attr('y', f.h + 46).attr('text-anchor', 'middle')
          .style('font-size', '11px').text(c.median_length + ' aa');
      });
      var base = [P.sp / P.n, P.tm / P.n];
      base.forEach(function (b, j) {
        f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(b)).attr('y2', y(b))
          .attr('stroke', j ? CAT[1] : CAT[0]).attr('stroke-dasharray', '4,3');
      });
      f.svg.append('text').attr('x', f.margin.left).attr('y', 16).style('font-size', '12px').style('font-weight', 600)
        .text('Blue: share with a signal peptide · orange: share transmembrane · dashed: all 2,000 proteins');
      U.setMetric('w9p-sil', f3(row.silhouette), 'mean silhouette');
      U.setMetric('w9p-sp', f3(row.ari_sp), 'ARI with signal-peptide label');
      U.setMetric('w9p-tm', f3(row.ari_tm), 'ARI with transmembrane label');
      U.setMetric('w9p-len', f3(row.eta2_loglen), 'η²: log length explained by cluster');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>' + LBL[st.rep] + ', k = ' + st.k + '. Under each bar: cluster size and median length in residues. In Week 7, k-NN ' +
        'on these ESM-2 embeddings predicted both labels well (test ROC AUC 0.94); k-means, which never sees the labels, finds ' +
        'clusters that barely follow them.</p>' +
        '<p><strong>Question.</strong> For which representation and k does one cluster look most like "membrane proteins"? ' +
        'Why can an embedding support good k-NN prediction yet give clusters that do not follow the label?</p>';
      alt.innerHTML = U.altTable('k-means (n_init = 10) on 2,000 human proteins; ' + LBL[st.rep] + '.',
        ['k', 'Silhouette', 'ARI SP', 'ARI TM', 'η² log length'], P.reps[st.rep].map(function (r) {
          return [String(r.k), f3(r.silhouette), f3(r.ari_sp), f3(r.ari_tm), f3(r.eta2_loglen)];
        }));
    }
    var setR = seg(host, 'w9p-rep', function (v) { st.rep = v; draw(); });
    var setK = slider(host, 'w9p-k', function (v) { return String(v); }, function (v) { st.k = v; draw(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      st = Object.assign({}, DEF); setR(st.rep); setK(st.k); draw();
    });
    window.Chart.responsive(stage, draw);
    draw();
  });
})();
