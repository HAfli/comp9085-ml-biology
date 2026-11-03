/* Week 8 - Exercise 2: k-NN regression, plain and distance-weighted.
 *
 * Mode "lecture": the slide example. Seven stored cases with known values; the
 * three nearest are 82 (d = 2), 83 (d = 4) and 78 (d = 6). k = 3, uniform gives
 * (82 + 83 + 78) / 3 = 81; weights 1/d^2 give 81.857 (slides 41-42).
 * Mode "heart": real patients. Predict maximum heart rate from age alone with
 * k-NN regression fitted on the training rows; the curve is the prediction at
 * every age, scored on the held-out rows. Ages are whole years, so many queries
 * sit at distance 0 from a training patient: distance weighting then uses only
 * the exact-age matches (scikit-learn's rule), which is visible as a jagged curve.
 */
(function () {
  'use strict';

  window.Chart.register('viz-knn-regression', function (host) {
    var W8 = window.W8, U = window.UI;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var R = window.WEEK08.heart.regression;

    var CASES = [{ v: 82, d: 2 }, { v: 83, d: 4 }, { v: 78, d: 6 }, { v: 84, d: 7.5 },
                 { v: 86, d: 9 }, { v: 82, d: 10 }, { v: 69, d: 11 }];
    var DEFAULT = { mode: 'lecture', k: 3, weighting: 'uniform', p: 2, age: 55, rule: false };
    var state = Object.assign({}, DEFAULT);

    var rows = W8.rows().filter(function (r) { return r.thalach != null; });
    var train = rows.filter(function (r) { return !r.test; }).map(function (r) { return { x: [r.age], v: r.thalach, id: r.id }; });
    var test = rows.filter(function (r) { return r.test; });

    function pw() { return state.weighting === 'distance' ? state.p : 0; }

    function predictAge(a) {
      var nb = W8.neighbours(train, [a], state.k, 'euclidean');
      return { nb: nb, r: W8.regress(nb, pw(), function (n) { return n.p.v; }) };
    }

    function lecture() {
      var nb = CASES.slice(0, state.k).map(function (c, i) { return { d: c.d, p: { v: c.v }, i: i }; });
      var r = W8.regress(nb, pw(), function (n) { return n.p.v; });
      var f = window.Chart.frame(stage, { height: 300, margin: { top: 30, right: 20, bottom: 50, left: 30 },
        title: 'Stored cases placed by their distance from the query' });
      var x = d3.scaleLinear().domain([0, 12]).range([0, f.w]);
      f.g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + (f.h / 2 + 40) + ')')
        .call(d3.axisBottom(x).ticks(12));
      f.g.append('text').attr('class', 'axis-label').attr('x', f.w / 2).attr('y', f.h / 2 + 76)
        .attr('text-anchor', 'middle').text('Distance from the query');
      var g = f.g.append('g');
      g.append('circle').attr('cx', x(0)).attr('cy', f.h / 2).attr('r', 20).attr('fill', '#fff')
        .attr('stroke', 'var(--ink)').attr('stroke-width', 2);
      g.append('text').attr('x', x(0)).attr('y', f.h / 2 + 5).attr('text-anchor', 'middle')
        .style('font-weight', 700).text(W8.fmt(r.value, 1));
      CASES.forEach(function (c, i) {
        var used = i < state.k;
        var rad = used ? 12 + 14 * (r.weights[i] / d3.max(r.weights)) : 12;
        g.append('circle').attr('cx', x(c.d)).attr('cy', f.h / 2).attr('r', rad)
          .attr('fill', used ? 'var(--cat-1)' : '#d8e2ec').attr('opacity', used ? 0.85 : 1);
        g.append('text').attr('x', x(c.d)).attr('y', f.h / 2 + 5).attr('text-anchor', 'middle')
          .attr('fill', used ? '#fff' : 'var(--ink-2)').style('font-weight', 700).text(c.v);
        if (used) g.append('text').attr('x', x(c.d)).attr('y', f.h / 2 - rad - 6).attr('text-anchor', 'middle')
          .style('font-size', '11px').text('w = ' + (pw() ? W8.fmt(r.weights[i], 3) : '1'));
      });
      var parts = CASES.slice(0, state.k);
      var formula = pw() ? '(' + parts.map(function (c, i) { return W8.fmt(r.weights[i], 4) + '×' + c.v; }).join(' + ') +
        ') / (' + parts.map(function (c, i) { return W8.fmt(r.weights[i], 4); }).join(' + ') + ')'
        : '(' + parts.map(function (c) { return c.v; }).join(' + ') + ') / ' + state.k;
      return { value: r.value, formula: formula, nb: nb, w: r.weights };
    }

    function heart() {
      var f = window.Chart.frame(stage, { height: Math.min(420, Math.max(320, stage.clientWidth * 0.55)),
        margin: { top: 16, right: 16, bottom: 48, left: 58 },
        title: 'k-NN regression of maximum heart rate on age' });
      var x = d3.scaleLinear().domain([28, 78]).range([0, f.w]);
      var y = d3.scaleLinear().domain([70, 205]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: W8.LABEL.age, yLabel: W8.LABEL.thalach });
      f.g.append('g').selectAll('circle').data(train).join('circle')
        .attr('cx', function (d) { return x(d.x[0]); }).attr('cy', function (d) { return y(d.v); })
        .attr('r', 3).attr('fill', 'var(--cat-5)').attr('opacity', 0.5);
      f.g.append('g').selectAll('rect').data(test).join('rect')
        .attr('x', function (d) { return x(d.age) - 3; }).attr('y', function (d) { return y(d.thalach) - 3; })
        .attr('width', 6).attr('height', 6).attr('fill', 'none').attr('stroke', 'var(--cat-4)');
      var curve = d3.range(29, 77.01, 0.25).map(function (a) { return [a, predictAge(a).r.value]; });
      f.g.append('path').datum(curve).attr('fill', 'none').attr('stroke', 'var(--cat-2)').attr('stroke-width', 2.4)
        .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
      if (state.rule) {
        f.g.append('line').attr('x1', x(29)).attr('x2', x(77)).attr('y1', y(220 - 29)).attr('y2', y(220 - 77))
          .attr('stroke', 'var(--cat-3)').attr('stroke-width', 2).attr('stroke-dasharray', '6,4');
      }
      var q = predictAge(state.age);
      f.g.append('g').selectAll('circle').data(q.nb).join('circle')
        .attr('cx', function (n) { return x(n.p.x[0]); }).attr('cy', function (n) { return y(n.p.v); })
        .attr('r', 5).attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 1.5);
      f.g.append('line').attr('x1', x(state.age)).attr('x2', x(state.age)).attr('y1', 0).attr('y2', f.h)
        .attr('stroke', 'var(--ink-2)').attr('stroke-dasharray', '2,3');
      f.g.append('circle').attr('cx', x(state.age)).attr('cy', y(q.r.value)).attr('r', 7)
        .attr('fill', 'var(--cat-2)').attr('stroke', '#fff').attr('stroke-width', 2);
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Training patients', colour: 'var(--cat-5)', symbol: 'circle' },
        { label: 'Held-out patients (scored)', colour: 'var(--cat-4)', symbol: 'square' },
        { label: 'k-NN prediction at every age', colour: 'var(--cat-2)', symbol: 'square' }
      ].concat(state.rule ? [{ label: '"220 − age" rule of thumb', colour: 'var(--cat-3)', symbol: 'square' }] : [])));
      var mae = d3.mean(test, function (r) { return Math.abs(predictAge(r.age).r.value - r.thalach); });
      var maeRule = d3.mean(test, function (r) { return Math.abs(220 - r.age - r.thalach); });
      return { q: q, mae: mae, maeRule: maeRule };
    }

    function refresh() {
      host.querySelector('#kr-age').closest('.control').style.display = state.mode === 'heart' ? '' : 'none';
      host.querySelector('#kr-rule').closest('.control').style.display = state.mode === 'heart' ? '' : 'none';
      host.querySelector('#kr-p').closest('.control').style.opacity = state.weighting === 'distance' ? 1 : 0.45;
      var note = host.querySelector('[data-viz-note]');
      if (state.mode === 'lecture') {
        var L = lecture();
        U.setMetric('kr-pred', W8.fmt(L.value, 3), L.formula);
        U.setMetric('kr-nk', String(state.k), state.weighting === 'distance' ? 'weights 1/d^' + state.p : 'uniform average');
        U.setMetric('kr-err', '—', 'no held-out data in the slide example');
        note.innerHTML = '<p class="mb0"><strong>Slide check:</strong> k = 3, uniform gives (82 + 83 + 78) / 3 = 81. ' +
          'With weights 1/d² it gives 81.857: the case at distance 2 counts nine times as much as the one at distance 6. ' +
          'Raise the exponent and the prediction moves towards 82, the nearest value; at p = 0 it is the plain mean. ' +
          'With distance weighting you can let k grow to 7 and the far cases barely matter.</p>';
        altBody.innerHTML = U.altTable('Stored cases, nearest first.', ['Value', 'Distance', 'Used', 'Weight'],
          CASES.map(function (c, i) {
            return [String(c.v), String(c.d), i < state.k ? 'yes' : 'no', i < state.k ? W8.fmt(L.w[i], 4) : '—'];
          })) + '<p>Prediction ' + W8.fmt(L.value, 3) + '.</p>';
      } else {
        var H = heart();
        U.setMetric('kr-pred', W8.fmt(H.q.r.value, 1) + ' bpm', 'predicted at age ' + state.age +
          (H.q.nb.some(function (n) { return n.d === 0; }) && pw() ? ': zero-distance neighbours only' : ''));
        U.setMetric('kr-nk', String(state.k), state.weighting === 'distance' ? 'weights 1/d^' + state.p : 'uniform average');
        U.setMetric('kr-err', W8.fmt(H.mae, 1) + ' bpm', 'mean absolute error on 76 held-out patients ("220 − age": ' +
          W8.fmt(H.maeRule, 1) + ')');
        note.innerHTML = '<p class="mb0"><strong>Real data.</strong> k = 1 gives a jagged curve that chases ' +
          'individual patients; large k flattens it towards the mean. In the lab\'s 10-fold cross-validation the ' +
          'best uniform k-NN reaches a mean absolute error of ' + W8.fmt(d3.min(R.k, function (k) { return R.mae['uniform|' + k]; }), 2) +
          ' bpm, a straight line ' + W8.fmt(R.linear_mae, 2) + ', predicting the mean ' + W8.fmt(R.mean_only_mae, 2) +
          ' and the textbook "220 − age" ' + W8.fmt(R.rule_220_minus_age_mae, 2) + '. When the relationship is close ' +
          'to a line, a line wins: k-NN is not always the right tool. Switch to distance weighting and watch the curve ' +
          'go jagged at every whole-year age: a query at distance 0 from a training patient uses only the exact matches.</p>';
        altBody.innerHTML = '<p>Prediction at age ' + state.age + ': ' + W8.fmt(H.q.r.value, 1) + ' bpm, from ' +
          H.q.nb.length + ' neighbours.</p>' + U.altTable('Cross-validated mean absolute error (bpm), lab protocol.',
          ['k', 'Uniform', 'Distance-weighted'], R.k.map(function (k) {
            return [String(k), W8.fmt(R.mae['uniform|' + k], 2), W8.fmt(R.mae['distance|' + k], 2)];
          }));
      }
    }

    var setMode = W8.seg(host, 'kr-mode', function (v) {
      state.mode = v; state.k = v === 'lecture' ? 3 : 15; setK(state.k);
      host.querySelector('#kr-k').max = v === 'lecture' ? 7 : 75; refresh();
    });
    var setW = W8.seg(host, 'kr-w', function (v) { state.weighting = v; refresh(); });
    var setK = W8.slider(host, 'kr-k', String, function (v) { state.k = v; refresh(); });
    var setP = W8.slider(host, 'kr-p', function (v) { return v.toFixed(1); }, function (v) { state.p = v; refresh(); });
    var setAge = W8.slider(host, 'kr-age', String, function (v) { state.age = v; refresh(); });
    var rule = host.querySelector('#kr-rule');
    rule.addEventListener('change', function () { state.rule = rule.checked; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT);
      host.querySelector('#kr-k').max = 7;
      setMode(state.mode); setW(state.weighting); setK(state.k); setP(state.p); setAge(state.age);
      rule.checked = false; refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
