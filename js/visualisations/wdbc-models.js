/* Week 4 - WDBC: two models, similar discrimination, different probabilities.
 *
 * Real WDBC final-test-set results for the lab's two models (logistic
 * regression and Gaussian naive Bayes), computed once by
 * data/scripts/08_build_week04_data.py: accuracy, AUC, Brier score, a
 * reliability diagram with the number of cases behind each point, and the
 * distribution of predicted probabilities.
 */
(function () {
  'use strict';

  window.Chart.register('viz-wdbc-models', function (host) {
    var W = window.WEEK04 && window.WEEK04.wdbc;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    if (!W) {
      stage.innerHTML = '<div class="noscript-note">The Week 4 data file did not load.</div>';
      return;
    }
    var NAMES = { logreg: 'Logistic regression', gnb: 'Gaussian naive Bayes' };
    var COL = { logreg: 'var(--cat-1)', gnb: 'var(--cat-2)' };
    var state = { model: 'logreg' };

    function pct(v, d) { return (v * 100).toFixed(d == null ? 1 : d) + '%'; }

    function draw() {
      var m = W.models[state.model];
      var wide = stage.clientWidth > 700;
      var f = window.Chart.frame(stage, {
        height: wide ? 320 : 620,
        margin: { top: 28, right: 16, bottom: 46, left: 56 },
        title: 'Reliability diagram and predicted-probability histogram, WDBC test set'
      });
      var gap = wide ? 60 : 78;
      var side = wide ? Math.min(f.h, (f.w - gap) * 0.5) : Math.min(f.w, (f.h - gap) / 2);
      var pw2 = wide ? f.w - gap - side : f.w;
      var ph2 = wide ? side : f.h - gap - side;

      var g1 = f.g.append('g');
      g1.append('text').attr('class', 'chart-title').attr('y', -12)
        .text(NAMES[state.model] + ': predicted vs observed');
      var x = d3.scaleLinear().domain([0, 1]).range([0, side]);
      var y = d3.scaleLinear().domain([0, 1]).range([side, 0]);
      g1.selectAll('line.grid-line').data(y.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', side)
        .attr('y1', y).attr('y2', y);
      g1.append('line').attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(1)).attr('y2', y(1))
        .attr('stroke', 'var(--ink-3)').attr('stroke-width', 1.6)
        .attr('stroke-dasharray', '6 4');
      var r = d3.scaleSqrt().domain([0, 120]).range([3, 13]);
      g1.append('path').attr('fill', 'none').attr('stroke', COL[state.model])
        .attr('stroke-width', 2)
        .attr('d', d3.line().x(function (b) { return x(b.meanPredicted); })
          .y(function (b) { return y(b.fractionPositive); })(m.reliability));
      var dots = g1.selectAll('circle.bin').data(m.reliability).join('circle')
        .attr('class', 'bin').attr('cx', function (b) { return x(b.meanPredicted); })
        .attr('cy', function (b) { return y(b.fractionPositive); })
        .attr('r', function (b) { return r(b.n); }).attr('fill', COL[state.model])
        .attr('stroke', '#fff').attr('stroke-width', 1.3).attr('tabindex', 0);
      window.Chart.tips(dots, function (b) {
        return '<strong>Predictions ' + b.lo.toFixed(1) + '–' + b.hi.toFixed(1) +
          '</strong><br>' + b.n + ' cases<br>mean prediction ' + pct(b.meanPredicted) +
          '<br>actually malignant ' + pct(b.fractionPositive);
      });
      g1.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + side + ')')
        .call(d3.axisBottom(x).ticks(5));
      g1.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
      g1.append('text').attr('class', 'axis-label').attr('x', side / 2).attr('y', side + 36)
        .attr('text-anchor', 'middle').text('mean predicted probability (bin)');
      g1.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
        .attr('x', -side / 2).attr('y', -42).attr('text-anchor', 'middle')
        .text('observed fraction malignant');

      var g2 = f.g.append('g').attr('transform', wide
        ? 'translate(' + (side + gap) + ',0)' : 'translate(0,' + (side + gap) + ')');
      g2.append('text').attr('class', 'chart-title').attr('y', -12)
        .text('How the ' + W.nTest + ' predictions are spread');
      var hx = d3.scaleBand().domain(d3.range(10)).range([0, pw2]).padding(0.08);
      var hy = d3.scaleLinear().domain([0, d3.max(W.models.logreg.histogram.concat(
        W.models.gnb.histogram))]).nice().range([ph2, 0]);
      g2.selectAll('rect').data(m.histogram).join('rect')
        .attr('x', function (d, i) { return hx(i); }).attr('width', hx.bandwidth())
        .attr('y', function (d) { return hy(d); })
        .attr('height', function (d) { return ph2 - hy(d); })
        .attr('fill', COL[state.model]).attr('opacity', 0.8);
      g2.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + ph2 + ')')
        .call(d3.axisBottom(hx).tickFormat(function (i) { return i % 2 ? '' : (i / 10).toFixed(1); }));
      g2.append('g').attr('class', 'axis').call(d3.axisLeft(hy).ticks(4));
      g2.append('text').attr('class', 'axis-label').attr('x', pw2 / 2).attr('y', ph2 + 36)
        .attr('text-anchor', 'middle').text('predicted probability of malignancy');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Observed vs predicted; dot size = number of test cases',
          colour: COL[state.model], symbol: 'circle' },
        { label: 'Perfect calibration (diagonal)', colour: 'var(--ink-3)', symbol: 'line' }
      ]));
    }

    function update() {
      var m = W.models[state.model], U = window.UI;
      U.setMetric('wd-acc', pct(m.accuracy), 'at threshold 0.5');
      U.setMetric('wd-auc', m.auc.toFixed(3), 'discrimination');
      U.setMetric('wd-brier', m.brier.toFixed(3), 'lower is better');
      U.setMetric('wd-ext', pct(m.fractionExtreme, 0), 'below 0.05 or above 0.95');
      U.setMetric('wd-ss', pct(m.sensitivity) + ' / ' + pct(m.specificity),
        m.tp + '/' + (m.tp + m.fn) + ' and ' + m.tn + '/' + (m.tn + m.fp));
      var o = W.models[state.model === 'logreg' ? 'gnb' : 'logreg'];
      var low = m.reliability[0];
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' +
        (state.model === 'gnb'
          ? '<strong>Gaussian naive Bayes is over-confident here.</strong> ' +
            pct(m.fractionExtreme, 0) + ' of its test predictions are below 0.05 or ' +
            'above 0.95. Its lowest bin holds ' + low.n + ' cases with a mean ' +
            'prediction of ' + pct(low.meanPredicted, 2) + ', yet ' +
            pct(low.fractionPositive) + ' of them are malignant. '
          : '<strong>Logistic regression sits closer to the diagonal</strong> where ' +
            'most cases are, but its middle bins hold only a handful of cases ' +
            '(see dot sizes), so those points are noisy. ') +
        'AUC is ' + m.auc.toFixed(3) + ' against ' + o.auc.toFixed(3) + ' for the ' +
        'other model: similar discrimination. The Brier score (' + m.brier.toFixed(3) +
        ' against ' + o.brier.toFixed(3) + ') also rewards honest probabilities. ' +
        'In the lab (Task 8) you draw the same diagrams on out-of-fold development ' +
        'predictions, which have more cases per bin.</p>';
      altBody.innerHTML = '<p>' + NAMES[state.model] + ' on the WDBC final test set (' +
        W.nTest + ' cases). Accuracy ' + pct(m.accuracy) + ', AUC ' + m.auc.toFixed(3) +
        ', Brier score ' + m.brier.toFixed(3) + '.</p>' +
        U.altTable('Reliability bins (test set).',
          ['Predicted range', 'Cases', 'Mean predicted', 'Observed malignant'],
          m.reliability.map(function (b) {
            return [b.lo.toFixed(1) + '–' + b.hi.toFixed(1), String(b.n),
                    pct(b.meanPredicted), pct(b.fractionPositive)];
          })) +
        U.altTable('Predicted probabilities (10 equal bins).',
          ['Bin', 'Cases'], m.histogram.map(function (c, i) {
            return [(i / 10).toFixed(1) + '–' + ((i + 1) / 10).toFixed(1), String(c)];
          }));
    }

    function refresh() { draw(); update(); }
    window.UI.onSegment(host.querySelector('#wd-model'), function (v) {
      state.model = v; refresh();
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.model = 'logreg';
      host.querySelectorAll('#wd-model button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === 'logreg'));
      });
      refresh();
    });
    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
