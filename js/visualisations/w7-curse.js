/* Week 7 - Exercise 1: distances concentrate in high dimensions.
 *
 * Left: 1,000 points drawn uniformly in a d-dimensional unit cube in the browser
 * (seeded, so everyone sees the same draw); the histogram shows every point's distance
 * from one query point, divided by the mean distance. As d grows the histogram
 * narrows: nearest and farthest become almost equally far.
 * Right: the same measure on the real proteins, measured by
 * data/scripts/20_build_week07_refresh.py (median over 200 query proteins).
 */
(function () {
  'use strict';

  function rng(seed) {                       // mulberry32: a small, seeded generator
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  window.Chart.register('viz-w7-curse', function (host) {
    var W7 = window.W7, U = window.UI, C = window.WEEK07.concentration;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var DIMS = [1, 2, 3, 5, 10, 20, 50, 100, 200, 320, 500, 1000];
    var DEFAULT = { di: 1 };
    var state = Object.assign({}, DEFAULT);
    var cache = {};

    function distances(d) {
      if (cache[d]) return cache[d];
      var r = rng(42), n = 1000, q = [], i, j, out = [];
      for (j = 0; j < d; j++) q.push(r());
      for (i = 1; i < n; i++) {
        var s = 0;
        for (j = 0; j < d; j++) { var v = r() - q[j]; s += v * v; }
        out.push(Math.sqrt(s));
      }
      cache[d] = out;
      return out;
    }

    function refresh() {
      var d = DIMS[state.di], dist = distances(d);
      var mn = d3.min(dist), mx = d3.max(dist), mean = d3.mean(dist);
      var rel = dist.map(function (v) { return v / mean; });
      var f = window.Chart.frame(stage, { height: Math.min(360, Math.max(280, stage.clientWidth * 0.45)),
        margin: { top: 14, right: 16, bottom: 48, left: 56 }, title: 'Distances from one point, d = ' + d });
      var x = d3.scaleLinear().domain([0, 2.5]).range([0, f.w]);
      var bins = d3.bin().domain([0, 2.5]).thresholds(50)(rel);
      var y = d3.scaleLinear().domain([0, d3.max(bins, function (b) { return b.length; })]).nice().range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'Distance ÷ mean distance', yLabel: 'Number of points' });
      f.g.selectAll('rect.bar').data(bins).join('rect').attr('class', 'bar')
        .attr('x', function (b) { return x(b.x0) + 0.5; }).attr('width', function (b) { return Math.max(0, x(b.x1) - x(b.x0) - 1); })
        .attr('y', function (b) { return y(b.length); }).attr('height', function (b) { return f.h - y(b.length); })
        .attr('fill', 'var(--cat-1)');
      [[mn / mean, 'nearest'], [mx / mean, 'farthest']].forEach(function (m) {
        f.g.append('line').attr('x1', x(m[0])).attr('x2', x(m[0])).attr('y1', 0).attr('y2', f.h)
          .attr('stroke', 'var(--cat-2)').attr('stroke-dasharray', '4,3');
        f.g.append('text').attr('x', x(m[0]) + 3).attr('y', 12).style('font-size', '11px').text(m[1]);
      });
      U.setMetric('w7c-d', String(d), 'dimensions (features)');
      U.setMetric('w7c-ratio', (mx / mn).toFixed(2) + '×', 'farthest ÷ nearest');
      U.setMetric('w7c-rc', ((mx - mn) / mn).toFixed(3), 'relative contrast (farthest − nearest) ÷ nearest');
      var real = [['Uniform cube, d = 20', C.uniform_cube['20']], ['Uniform cube, d = 320', C.uniform_cube['320']],
                  ['Amino-acid composition (20)', C['composition (20)']], ['Classical descriptors (23)', C['classical (23)']],
                  ['ESM-2 embedding (320)', C['ESM-2 (320)']], ['ESM-2, first 10 PCs', C['ESM-2 PCA 10']]];
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>' + (d <= 3 ? 'In ' + d + ' dimension' + (d > 1 ? 's' : '') + ' the nearest point is much closer than the farthest: ' +
          '"nearest" means something.' : d >= 100 ? 'In ' + d + ' dimensions every point is roughly the same distance away: the ' +
          'farthest is only ' + (100 * (mx / mn - 1)).toFixed(0) + '% further than the nearest. A k-NN vote among "nearest" ' +
          'neighbours is then close to a vote among random points.' : 'The histogram narrows as d grows.') + '</p>' +
        '<div class="table-scroll"><table class="table-compact"><caption>Relative contrast, (farthest − nearest) ÷ nearest, ' +
        'median over 200 query points (standardised features, Euclidean). Real proteins keep far more contrast than uniform ' +
        'random points of the same dimension, because their features are correlated: they lie near a lower-dimensional ' +
        'structure. That is why k-NN still works on them, and why reducing dimension can help.</caption>' +
        '<thead><tr><th scope="col">Data</th><th class="num" scope="col">Relative contrast</th></tr></thead><tbody>' +
        real.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td class="num">' + r[1].toFixed(2) + '</td></tr>'; }).join('') +
        '</tbody></table></div>';
      altBody.innerHTML = U.altTable('Uniform random points, 1,000 per dimension, seed 42.',
        ['d', 'Nearest', 'Farthest', 'Farthest ÷ nearest'], DIMS.map(function (dd) {
          var v = distances(dd), a = d3.min(v), b = d3.max(v);
          return [String(dd), a.toFixed(3), b.toFixed(3), (b / a).toFixed(2)];
        }));
    }

    var setD = W7.slider(host, 'w7c-di', function (i) { return 'd = ' + DIMS[i]; }, function (v) { state.di = v; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); setD(state.di); refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
