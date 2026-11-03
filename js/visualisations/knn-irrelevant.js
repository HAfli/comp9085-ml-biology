/* Week 8 - Exercise 5: irrelevant features and feature weights.
 *
 * Measured, not simulated: data/scripts/18_build_week08_data.py adds 0-100 columns of
 * pure Gaussian noise to the real heart-disease training rows and records the
 * 10-fold cross-validated accuracy of k-NN (k = 15, standardised + one-hot), five
 * repeats per point, with the noise columns given weight 1, 0.5, 0.25 or 0 in the
 * distance (a weighted Euclidean distance). The share-of-distance readout is exact
 * arithmetic: the real columns contribute an expected squared distance of
 * `real_sq` between two random patients, and each noise column adds 2w^2.
 */
(function () {
  'use strict';

  window.Chart.register('viz-knn-irrelevant', function (host) {
    var W8 = window.W8, U = window.UI, H = window.WEEK08.heart, N = H.noise;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var WEIGHTS = ['1.0', '0.5', '0.25', '0.0'];
    var DEFAULT = { ni: 0, w: '1.0' };
    var state = Object.assign({}, DEFAULT);

    function share(n, w) { var e = n * 2 * w * w; return e / (e + N.real_sq); }

    function refresh() {
      var n = N.n[state.ni], w = +state.w, cur = N.weight[state.w];
      var f = window.Chart.frame(stage, { height: Math.min(400, Math.max(300, stage.clientWidth * 0.5)),
        margin: { top: 16, right: 110, bottom: 48, left: 58 }, title: 'Accuracy as irrelevant features are added' });
      var x = d3.scalePoint().domain(N.n).range([0, f.w]).padding(0.3);
      var y = d3.scaleLinear().domain([0.5, 0.86]).range([f.h, 0]);
      window.Chart.axes(f, d3.scaleLinear().domain([0, 1]).range([0, 0]), y, { yFormat: d3.format('.0%'),
        yLabel: '10-fold CV accuracy' });
      f.g.selectAll('.axis').filter(function (d, i) { return i === 0; }).remove();
      f.g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + f.h + ')').call(d3.axisBottom(x));
      f.g.append('text').attr('class', 'axis-label').attr('x', f.w / 2).attr('y', f.h + 38).attr('text-anchor', 'middle')
        .text('Number of pure-noise features added');
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(H.baseline.mean)).attr('y2', y(H.baseline.mean))
        .attr('stroke', 'var(--cat-5)').attr('stroke-dasharray', '5,4');
      f.g.append('text').attr('x', f.w + 6).attr('y', y(H.baseline.mean) + 4).style('font-size', '11px')
        .text('majority baseline');
      var labels = [];
      WEIGHTS.forEach(function (wk, i) {
        var s = N.weight[wk], on = wk === state.w;
        var pts = N.n.map(function (nn, j) { return [x(nn), y(s.mean[j]), s.sd[j]]; });
        if (on) f.g.append('path').datum(pts).attr('fill', 'var(--cat-2)').attr('opacity', 0.15)
          .attr('d', d3.area().x(function (d) { return d[0]; })
            .y0(function (d, j) { return y(s.mean[j] - s.sd[j]); }).y1(function (d, j) { return y(s.mean[j] + s.sd[j]); }));
        f.g.append('path').datum(pts).attr('fill', 'none')
          .attr('stroke', on ? 'var(--cat-2)' : 'var(--cat-' + (i === 3 ? 3 : 1) + ')')
          .attr('stroke-width', on ? 3 : 1.4).attr('opacity', on ? 1 : 0.5)
          .attr('d', d3.line().x(function (d) { return d[0]; }).y(function (d) { return d[1]; }));
        labels.push({ y: pts[pts.length - 1][1] + 4, on: on, t: 'noise weight ' + (+wk) });
      });
      labels.sort(function (a, b) { return a.y - b.y; });
      labels.forEach(function (l, i) { if (i && l.y < labels[i - 1].y + 13) l.y = labels[i - 1].y + 13; });
      labels.forEach(function (l) {
        f.g.append('text').attr('x', f.w + 6).attr('y', l.y).style('font-size', '11px')
          .style('font-weight', l.on ? 700 : 400).text(l.t);
      });
      f.g.append('circle').attr('cx', x(n)).attr('cy', y(cur.mean[state.ni])).attr('r', 7)
        .attr('fill', 'var(--cat-2)').attr('stroke', '#fff').attr('stroke-width', 2);

      U.setMetric('ki-acc', W8.pct(cur.mean[state.ni]), '± ' + W8.pct(cur.sd[state.ni]) + ' over 5 noise draws');
      U.setMetric('ki-drop', (100 * (cur.mean[state.ni] - N.weight['1.0'].mean[0])).toFixed(1) + ' points',
        'against no noise features', cur.mean[state.ni] < N.weight['1.0'].mean[0] - 0.03 ? 'bad' : null);
      U.setMetric('ki-share', W8.pct(share(n, w)), 'of the expected squared distance is pure noise',
        share(n, w) > 0.5 ? 'bad' : null);
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' + n + ' noise feature' + (n === 1 ? '' : 's') +
        ' with weight ' + w + ': ' + W8.pct(share(n, w)) + ' of the squared distance between two random patients comes ' +
        'from columns that carry no information about disease, so "nearest" increasingly means "nearest by chance". ' +
        'k-NN cannot ignore a column the way a decision tree can simply never split on it. Down-weighting (a weighted ' +
        'Euclidean distance) or removing the column (weight 0, feature selection) restores the accuracy, but in real ' +
        'data you do not know which columns are noise: the weights have to be chosen by cross-validation on the training data.</p>';
      altBody.innerHTML = U.altTable('10-fold CV accuracy (mean of 5 noise draws), k = ' + N.k + '.',
        ['Noise features'].concat(WEIGHTS.map(function (wk) { return 'weight ' + (+wk); })),
        N.n.map(function (nn, j) {
          return [String(nn)].concat(WEIGHTS.map(function (wk) { return W8.pct(N.weight[wk].mean[j]); }));
        }));
    }

    var setN = W8.slider(host, 'ki-n', function (v) { return String(N.n[v]); }, function (v) { state.ni = v; refresh(); });
    var setW = W8.seg(host, 'ki-w', function (v) { state.w = v; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); setN(state.ni); setW(state.w); refresh();
    });
    setN(state.ni);
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
