/* Week 8 - Exercise 6: distance-weighted voting and the weighting exponent.
 *
 * The lecture's example (slides "Distance-weighted k-NN, classification" to "Vote,
 * n = 3"): nine stored points at known distances from the query,
 * Blue 10, 9, 5; Yellow 5, 6, 5; Black 1, 2, 2. Votes are sum of 1/d^n over each
 * class's neighbours among the k nearest. Checks against the slides:
 * n = 1, k = 9: Blue 0.411, Yellow 0.567, Black 2; n = 3: 0.0104, 0.0206, 1.25;
 * n = 0 (uniform), k = 9: a three-way tie. A toggle puts one point exactly on the
 * query (d = 0) to show what scikit-learn does when a weight would be infinite.
 */
(function () {
  'use strict';

  window.Chart.register('viz-knn-weighted', function (host) {
    var W8 = window.W8, U = window.UI, V = window.WEEK08.lecture.vote;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var CLS = ['Blue', 'Yellow', 'Black'];
    var COL = { Blue: '#2f7fd0', Yellow: '#e0b100', Black: '#1b1f22' };
    var ANG = { Blue: [-60, -20, 20], Yellow: [150, 190, 230], Black: [60, 100, 300] };
    var DEFAULT = { k: 9, n: 1, zero: false };
    var state = Object.assign({}, DEFAULT);

    function points() {
      var pts = [];
      CLS.forEach(function (c) {
        V.distances[c].forEach(function (d, j) { pts.push({ c: c, d: d, a: ANG[c][j], j: j }); });
      });
      if (state.zero) pts.push({ c: 'Yellow', d: 0, a: 0, j: 3, added: true });
      return pts;
    }

    function refresh() {
      var pts = points().map(function (p, i) { return { p: p, d: p.d, i: i }; });
      pts.sort(function (a, b) { return a.d - b.d || a.i - b.i; });
      var nb = pts.slice(0, state.k);
      var v = W8.vote(nb, state.n, function (n) { return n.p.c; });

      var wide = stage.clientWidth > 640;
      var f = window.Chart.frame(stage, { height: wide ? 360 : 620, margin: { top: 10, right: 10, bottom: 10, left: 10 },
        title: 'Distance-weighted vote' });
      var cx = wide ? f.w * 0.27 : f.w / 2, cy = wide ? f.h / 2 : 165, R = wide ? Math.min(f.h / 2 - 10, f.w * 0.25) : 150;
      var rs = d3.scaleLinear().domain([0, 10.5]).range([0, R]);
      var g = f.g.append('g');
      [2, 4, 6, 8, 10].forEach(function (d) {
        g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', rs(d)).attr('fill', 'none').attr('stroke', '#e3e8ec');
        g.append('text').attr('x', cx + 3).attr('y', cy - rs(d) - 2).style('font-size', '10px').attr('fill', 'var(--ink-2)').text('d = ' + d);
      });
      var kth = nb[nb.length - 1].d;
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', rs(kth) + 9).attr('fill', 'none')
        .attr('stroke', 'var(--nucleus)').attr('stroke-width', 1.6).attr('stroke-dasharray', '5,3');
      var used = {};
      nb.forEach(function (n, i) { used[n.i] = v.weights[i]; });
      var maxw = d3.max(v.weights) || 1;
      pts.forEach(function (n) {
        var a = n.p.a * Math.PI / 180, px = cx + rs(n.d) * Math.cos(a), py = cy - rs(n.d) * Math.sin(a);
        var u = n.i in used;
        g.append('circle').attr('cx', px).attr('cy', py)
          .attr('r', u ? 7 + 9 * Math.sqrt(used[n.i] / maxw) : 7)
          .attr('fill', COL[n.p.c]).attr('opacity', u ? 1 : 0.25)
          .attr('stroke', n.p.added ? 'var(--cat-2)' : '#fff').attr('stroke-width', n.p.added ? 3 : 1.5);
      });
      g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 10).attr('fill', '#fff').attr('stroke', 'var(--ink)').attr('stroke-width', 2);
      g.append('text').attr('x', cx).attr('y', cy + 5).attr('text-anchor', 'middle').style('font-weight', 700).text('?');

      // vote bars
      var bx = wide ? f.w * 0.58 : 20, bw = wide ? f.w * 0.38 : f.w - 40, by = wide ? 40 : 360;
      var tot = d3.sum(CLS, function (c) { return v.tally[c] || 0; });
      var xs = d3.scaleLinear().domain([0, Math.max(1e-9, d3.max(CLS, function (c) { return v.tally[c] || 0; }))]).range([0, bw - 70]);
      g.append('text').attr('x', bx).attr('y', by - 14).style('font-weight', 600)
        .text(state.n ? 'vote(c) = Σ 1 / d^' + state.n + ' over the k nearest' : 'Uniform vote: one each');
      CLS.forEach(function (c, i) {
        var val = v.tally[c] || 0, yy = by + i * 62;
        g.append('rect').attr('x', bx).attr('y', yy).attr('height', 34).attr('width', Math.max(1, xs(val)))
          .attr('fill', COL[c]).attr('opacity', v.winner === c ? 1 : 0.55);
        g.append('text').attr('x', bx + Math.max(1, xs(val)) + 6).attr('y', yy + 22).style('font-size', '13px')
          .style('font-weight', v.winner === c ? 700 : 400)
          .text(c + ' ' + (state.n ? d3.format('.4~g')(val) : val) + (tot ? '  (' + Math.round(100 * val / tot) + '%)' : ''));
      });

      U.setMetric('kw-blue', state.n ? d3.format('.4~g')(v.tally.Blue || 0) : String(v.tally.Blue || 0), 'Blue');
      U.setMetric('kw-yellow', state.n ? d3.format('.4~g')(v.tally.Yellow || 0) : String(v.tally.Yellow || 0), 'Yellow');
      U.setMetric('kw-black', state.n ? d3.format('.4~g')(v.tally.Black || 0) : String(v.tally.Black || 0), 'Black');
      U.setMetric('kw-win', v.winner || 'Tie', v.tie ? 'between ' + v.tie.join(', ') : 'k = ' + state.k + ', n = ' + state.n,
        v.tie ? 'bad' : null);

      var msg;
      if (v.zero) msg = '<strong>Zero distance.</strong> A stored point sits exactly on the query, so 1/d^n would be ' +
        'infinite. scikit-learn (weights="distance") gives the zero-distance neighbours all the weight and everyone else ' +
        'none: the query takes that point\'s class. A hand-written implementation must handle this case explicitly ' +
        '(or add a small ε to every distance), otherwise it divides by zero.';
      else if (!state.n && v.tie) msg = '<strong>Uniform vote, tie.</strong> With k = ' + state.k + ' the classes are tied. ' +
        'Raise n above 0 and the tie is broken in favour of the class whose points are closest.';
      else msg = state.n ? 'Each neighbour\'s vote is 1/d^' + state.n + '. The three Black points (distances 1, 2, 2) ' +
        'dominate: at n = 1 Black has ' + Math.round(100 * (v.tally.Black || 0) / tot) + '% of the vote, and larger n ' +
        'concentrates it further on the closest point. As n grows, distance-weighted k-NN behaves more and more like 1-NN, ' +
        'and so inherits its sensitivity to a single noisy neighbour.' : 'Uniform vote: every neighbour counts once, near or far.';
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' + msg + '</p>';
      altBody.innerHTML = U.altTable('The k nearest stored points and their weights.', ['Rank', 'Class', 'Distance', 'Weight'],
        nb.map(function (n, i) { return [String(i + 1), n.p.c, String(n.d), W8.fmt(v.weights[i], 4)]; })) +
        '<p>Votes: ' + CLS.map(function (c) { return c + ' ' + W8.fmt(v.tally[c] || 0, 4); }).join(', ') +
        '. Prediction: ' + (v.winner || 'tie') + '.</p>';
    }

    var setK = W8.slider(host, 'kw-k', String, function (x) { state.k = x; refresh(); });
    var setN = W8.slider(host, 'kw-n', function (x) { return x ? x.toFixed(1) : '0 (uniform)'; },
      function (x) { state.n = x; refresh(); });
    var z = host.querySelector('#kw-zero');
    z.addEventListener('change', function () {
      state.zero = z.checked; host.querySelector('#kw-k').max = state.zero ? 10 : 9; refresh();
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); z.checked = false; host.querySelector('#kw-k').max = 9;
      setK(state.k); setN(state.n); refresh();
    });
    setN(state.n);
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
