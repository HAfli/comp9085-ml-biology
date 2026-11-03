/* Week 3 - Cross-validation explorer.
 *
 * Lecture slides 26-32. Every fold score shown here was measured once with
 * scikit-learn on the real WDBC data by data/scripts/17_build_week03_interactives.py
 * (StratifiedKFold or KFold, shuffle=True, random_state=42, k = 2..10). At
 * k = 5, stratified, the tree and k-NN columns are slide 29's table exactly,
 * and the four means are slide 20's.
 */
(function () {
  'use strict';

  window.Chart.register('viz-cv-explorer', function (host) {
    var D = window.WEEK03 && window.WEEK03.cv;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var U = window.UI;
    if (!D) { stage.innerHTML = '<p>Week 3 data did not load.</p>'; return; }
    var DEFAULT = { k: 5, strat: 's', model: 'tree_d3' };
    var state = Object.assign({}, DEFAULT);
    var OVERALL = 212 / 569;

    function cur() { return D.folds[state.k + '-' + state.strat]; }
    function stats(a) {
      var m = d3.mean(a), sd = Math.sqrt(d3.mean(a.map(function (v) { return (v - m) * (v - m); })));
      return { mean: m, sd: sd, min: d3.min(a), max: d3.max(a) };
    }

    function draw() {
      var E = cur(), sc = E.scores[state.model], S = stats(sc);
      var wide = stage.clientWidth > 620;
      var f = window.Chart.frame(stage, { height: wide ? 300 : 300,
        margin: { top: wide ? 28 : 44, right: 16, bottom: 46, left: 56 } });
      f.svg.attr('aria-label', 'Accuracy of each of the ' + state.k + ' cross-validation folds.');
      f.g.append('text').attr('class', 'chart-title').attr('y', wide ? -10 : -28)
        .text(wide ? D.models[state.model] + ': accuracy on each held-out fold'
                   : 'Accuracy on each held-out fold');
      var x = d3.scaleBand().domain(d3.range(state.k)).range([0, f.w]).padding(0.25);
      var y = d3.scaleLinear().domain([0.5, 1]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { yFormat: d3.format('.0%'), xLabel: 'Fold (each one takes a turn as the held-out set)',
        yLabel: 'Accuracy' });
      f.g.select('.axis').selectAll('.tick text').text(function (d) { return d + 1; });
      f.g.append('rect').attr('x', 0).attr('width', f.w)
        .attr('y', y(Math.min(1, S.mean + S.sd))).attr('height', y(S.mean - S.sd) - y(Math.min(1, S.mean + S.sd)))
        .attr('fill', 'var(--clinical-soft)');
      var folds = sc.map(function (v, i) { return { v: v, i: i }; });
      var bars = f.g.selectAll('rect.fold').data(folds).join('rect').attr('class', 'fold')
        .attr('x', function (d) { return x(d.i); }).attr('width', x.bandwidth())
        .attr('y', function (d) { return y(Math.max(0.5, d.v)); })
        .attr('height', function (d) { return f.h - y(Math.max(0.5, d.v)); })
        .attr('fill', 'var(--cat-1)').attr('tabindex', 0);
      window.Chart.tips(bars, function (d) {
        var i = d.i;
        return '<strong>Fold ' + (i + 1) + ': ' + window.Chart.pct(d.v) + '</strong><br>' +
          E.testSize[i] + ' held-out rows, ' + window.Chart.pct(E.malignantShare[i]) +
          ' malignant<br>trained on ' + E.trainSize[i] + ' rows';
      });
      if (state.k <= 8 || wide) {
        f.g.selectAll('text.fv').data(sc).join('text').attr('class', 'fv')
          .attr('x', function (d, i) { return x(i) + x.bandwidth() / 2; })
          .attr('y', function (d) { return y(Math.max(0.5, d)) - 4; })
          .attr('text-anchor', 'middle').style('font-size', '11px').attr('fill', 'var(--ink-2)')
          .text(function (d) { return (d * 100).toFixed(1); });
      }
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(S.mean)).attr('y2', y(S.mean))
        .attr('stroke', 'var(--nucleus)').attr('stroke-width', 2.5);
      f.g.append('text').attr('x', f.w).attr('y', -10).attr('text-anchor', 'end')
        .style('font-size', '11.5px').style('font-weight', 600).attr('fill', 'var(--nucleus)')
        .text('— mean ' + window.Chart.pct(S.mean) + ' (sd ' + S.sd.toFixed(3) + ')');

      /* Class balance of each held-out fold. */
      var g2h = 64;
      var svg2 = d3.select(stage).append('svg').attr('width', f.width).attr('height', g2h + 30)
        .attr('role', 'img')
        .attr('aria-label', 'Share of malignant cases in each held-out fold');
      var g2 = svg2.append('g').attr('transform', 'translate(56,18)');
      g2.append('text').attr('class', 'chart-title').attr('y', -6)
        .text(wide ? 'Malignant share of each held-out fold (dashed: 37.3% in the whole dataset)'
                   : 'Malignant share per fold (dashed: 37.3%)');
      var y2 = d3.scaleLinear().domain([0.2, 0.55]).range([g2h, 0]);
      g2.selectAll('circle').data(E.malignantShare).join('circle')
        .attr('cx', function (d, i) { return x(i) + x.bandwidth() / 2; })
        .attr('cy', function (d) { return y2(Math.max(0.2, Math.min(0.55, d))); }).attr('r', 5)
        .attr('fill', 'var(--cat-2)');
      g2.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y2(OVERALL)).attr('y2', y2(OVERALL))
        .attr('stroke', 'var(--ink-3)').attr('stroke-dasharray', '4 3');
      g2.append('g').attr('class', 'axis').call(d3.axisLeft(y2).ticks(3).tickFormat(d3.format('.0%')));
      return S;
    }

    function update(S) {
      var E = cur(), other = D.folds[state.k + '-' + (state.strat === 's' ? 'p' : 's')];
      var spread = d3.max(E.malignantShare) - d3.min(E.malignantShare);
      var spreadO = d3.max(other.malignantShare) - d3.min(other.malignantShare);
      U.setMetric('cv-mean', window.Chart.pct(S.mean), 'the number you would report');
      U.setMetric('cv-sd', S.sd.toFixed(3), 'standard deviation across folds');
      U.setMetric('cv-range', window.Chart.pct(S.min) + '–' + window.Chart.pct(S.max),
        ((S.max - S.min) * 100).toFixed(1) + ' points between folds');
      U.setMetric('cv-train', String(d3.min(E.trainSize)) + '–' + String(d3.max(E.trainSize)),
        'rows used to train each fold\'s model');
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">With k = ' + state.k +
        ', each model trains on about ' + Math.round(569 * (state.k - 1) / state.k) +
        ' rows and is tested on about ' + Math.round(569 / state.k) + '. The fold scores run from ' +
        window.Chart.pct(S.min) + ' to ' + window.Chart.pct(S.max) + ': nothing changed between ' +
        'them except which rows were held out. ' +
        (state.strat === 's'
          ? 'Stratified folds keep the malignant share within ' + (spread * 100).toFixed(1) +
            ' points of each other; unstratified folds at the same k vary by ' +
            (spreadO * 100).toFixed(1) + ' points.'
          : 'Without stratification the malignant share of the held-out folds varies by ' +
            (spread * 100).toFixed(1) + ' points; stratified folds at the same k vary by only ' +
            (spreadO * 100).toFixed(1) + '.') +
        (state.model === 'baseline' ? ' The majority-class baseline predicts "benign" for ' +
          'everyone, so its accuracy is simply the benign share of each fold.' : '') +
        ' Report the mean with its spread, and never call a single train/test split ' +
        '"cross-validation".</p>';
      altBody.innerHTML = '<p>' + D.models[state.model] + ', ' + state.k + '-fold, ' +
        (state.strat === 's' ? 'stratified' : 'not stratified') + ', shuffle, random_state=42. ' +
        'Measured with scikit-learn ' + window.WEEK03.sklearnVersion + ' on the real WDBC data.</p>' +
        U.altTable('Accuracy and class balance of each held-out fold.',
          ['Fold', 'Accuracy', 'Held-out rows', 'Malignant share', 'Training rows'],
          E.scores[state.model].map(function (v, i) {
            return [String(i + 1), window.Chart.pct(v), String(E.testSize[i]),
                    window.Chart.pct(E.malignantShare[i]), String(E.trainSize[i])];
          }).concat([['Mean', window.Chart.pct(S.mean), '', '', '']]));
    }

    function refresh() { update(draw()); }

    host.querySelector('#cv-k').addEventListener('input', function () {
      state.k = +this.value; host.querySelector('#cv-k-val').textContent = String(state.k);
      refresh();
    });
    U.onSegment(host.querySelector('#cv-strat'), function (v) { state.strat = v; refresh(); });
    host.querySelector('#cv-model').addEventListener('change', function () {
      state.model = this.value; refresh();
    });
    function sync() {
      host.querySelector('#cv-k').value = state.k;
      host.querySelector('#cv-k-val').textContent = String(state.k);
      host.querySelector('#cv-model').value = state.model;
      host.querySelectorAll('#cv-strat button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === state.strat));
      });
    }
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); sync(); refresh();
    });
    window.Chart.responsive(stage, refresh);
    sync();
    refresh();
  });
})();
