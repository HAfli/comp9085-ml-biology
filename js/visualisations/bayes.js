/* Week 4 - Medical test calculator.
 *
 * The point of this figure is that the arithmetic is unremarkable and the
 * consequence is not. It draws the natural-frequency square, which is the
 * representation that reliably fixes base-rate errors, alongside a curve of
 * PPV against prevalence so the collapse is visible rather than asserted.
 */
(function () {
  'use strict';

  window.Chart.register('viz-bayes', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var PRESETS = {
      lecture: { prev: 1, sens: 95, spec: 95,
        label: 'The lecture example: 1% prevalence, 95% sensitivity and specificity' },
      screening: { prev: 0.5, sens: 99, spec: 99,
        label: 'Population screening for a rare condition (1 in 200)' },
      wdbc: { prev: 37.3, sens: 96, spec: 96,
        label: 'The WDBC cohort, where 37.3% of masses are malignant' },
      clinic: { prev: 10, sens: 95, spec: 90,
        label: 'A symptomatic clinic, where prior suspicion is already high' },
      rare: { prev: 0.1, sens: 99.9, spec: 99,
        label: 'A very rare condition with a near-perfect test' }
    };

    var DEFAULT = { prev: 1, sens: 95, spec: 95, n: 1000 };
    var state = Object.assign({}, DEFAULT);

    /* Expected counts are not always whole people (1% of 1,000 is 10, and 95%
       of 10 is 9.5). Show the half-person rather than rounding it away, so
       the four cells always add up to the population on screen. */
    function fmtCount(v) {
      return Math.abs(v - Math.round(v)) < 1e-9 ? d3.format(',')(Math.round(v))
                                                : d3.format(',.1f')(v);
    }

    function compute() {
      var prev = state.prev / 100, sens = state.sens / 100, spec = state.spec / 100;
      var n = state.n;
      var ill = n * prev, well = n - ill;
      var tp = ill * sens, fn = ill - tp;
      var tn = well * spec, fp = well - tn;
      return {
        prev: prev, sens: sens, spec: spec, n: n,
        ill: ill, well: well, tp: tp, fn: fn, tn: tn, fp: fp,
        posTotal: tp + fp, negTotal: tn + fn,
        ppv: (tp + fp) ? tp / (tp + fp) : 0,
        npv: (tn + fn) ? tn / (tn + fn) : 0,
        accuracy: (tp + tn) / n
      };
    }

    function draw() {
      var c = compute();
      var wide = stage.clientWidth > 700;
      var f = window.Chart.frame(stage, {
        height: wide ? 320 : 610,
        margin: { top: 26, right: 16, bottom: 44, left: 52 },
        title: 'Natural-frequency square and positive predictive value against prevalence'
      });

      var panelW = wide ? (f.w - 54) / 2 : f.w;
      var panelH = wide ? f.h : (f.h - 66) / 2;

      /* ---- Panel 1: natural frequency square ---- */
      var g1 = f.g.append('g');
      g1.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Of ' + d3.format(',')(c.n) + ' people tested');

      var side = Math.min(panelW, panelH);
      var ox = (panelW - side) / 2;

      /* Same orientation as the lecture and the confusion-matrix calculator:
         rows are what is true (top band = has the condition), and within each
         row the left part is what the test calls positive. */
      var illH = Math.max(1.2, side * c.prev);
      var wellH = side - illH;

      var boxes = [
        { x: ox, y: 0, w: side * c.sens, h: illH, fill: 'var(--cat-2)',
          label: 'True positive', v: c.tp, key: 'tp' },
        { x: ox + side * c.sens, y: 0, w: side * (1 - c.sens), h: illH,
          fill: '#c9b39a', label: 'False negative', v: c.fn, key: 'fn' },
        { x: ox, y: illH, w: side * (1 - c.spec), h: wellH, fill: '#8fa9c2',
          label: 'False positive', v: c.fp, key: 'fp' },
        { x: ox + side * (1 - c.spec), y: illH, w: side * c.spec, h: wellH,
          fill: 'var(--ground-3)', label: 'True negative', v: c.tn, key: 'tn' }
      ];

      var sel = g1.selectAll('rect.box').data(boxes).join('rect')
        .attr('class', 'box')
        .attr('x', function (d) { return d.x; })
        .attr('y', function (d) { return d.y; })
        .attr('width', function (d) { return Math.max(0, d.w); })
        .attr('height', function (d) { return Math.max(0, d.h); })
        .attr('fill', function (d) { return d.fill; })
        .attr('stroke', '#fff').attr('stroke-width', 1)
        .attr('tabindex', 0);

      window.Chart.tips(sel, function (d) {
        return '<strong>' + d.label + '</strong><br>' +
          fmtCount(d.v) + ' people<br>' +
          ((d.v / c.n) * 100).toFixed(3) + '% of everyone tested';
      });

      g1.append('rect')
        .attr('x', ox).attr('y', 0).attr('width', side).attr('height', side)
        .attr('fill', 'none').attr('stroke', 'var(--ink-3)').attr('stroke-width', 1.2);

      /* Bracket over the "tested positive" region */
      g1.append('text')
        .attr('x', ox + side / 2).attr('y', side + 16)
        .attr('text-anchor', 'middle').style('font-size', '10.5px')
        .attr('fill', 'var(--ink-3)')
        .text('top band = has the condition (' + fmtCount(c.ill) + ')');
      g1.append('text')
        .attr('x', ox + side / 2).attr('y', side + 30)
        .attr('text-anchor', 'middle').style('font-size', '10.5px')
        .attr('fill', 'var(--ink-3)')
        .text('left part of each band = tested positive (' +
              fmtCount(c.posTotal) + ')');

      /* ---- Panel 2: PPV and NPV against prevalence ---- */
      var g2 = f.g.append('g').attr('transform',
        wide ? 'translate(' + (panelW + 54) + ',0)'
             : 'translate(0,' + (panelH + 66) + ')');

      g2.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Predictive value as prevalence changes');

      var x = d3.scaleLog().domain([0.0005, 0.6]).range([0, panelW]).clamp(true);
      var y = d3.scaleLinear().domain([0, 1]).range([panelH, 0]);

      g2.selectAll('line.grid-line').data(y.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
        .attr('y1', y).attr('y2', y);

      var pts = d3.range(-3.3, -0.22, 0.02).map(function (lp) {
        var p = Math.pow(10, lp);
        var tp = p * c.sens, fp = (1 - p) * (1 - c.spec);
        var tn = (1 - p) * c.spec, fn = p * (1 - c.sens);
        return { p: p,
                 ppv: (tp + fp) ? tp / (tp + fp) : 0,
                 npv: (tn + fn) ? tn / (tn + fn) : 1 };
      });

      ['npv', 'ppv'].forEach(function (k) {
        g2.append('path').attr('fill', 'none')
          .attr('stroke', k === 'ppv' ? 'var(--cat-2)' : 'var(--cat-1)')
          .attr('stroke-width', 2.2)
          .attr('stroke-dasharray', k === 'npv' ? '5 3' : null)
          .attr('d', d3.line()
            .x(function (d) { return x(d.p); })
            .y(function (d) { return y(d[k]); })(pts));
      });

      g2.append('line')
        .attr('x1', x(c.prev)).attr('x2', x(c.prev))
        .attr('y1', 0).attr('y2', panelH)
        .attr('stroke', 'var(--ink-3)').attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '3 3');
      g2.append('circle')
        .attr('cx', x(c.prev)).attr('cy', y(c.ppv)).attr('r', 5)
        .attr('fill', 'var(--cat-2)').attr('stroke', '#fff').attr('stroke-width', 1.5);
      g2.append('circle')
        .attr('cx', x(c.prev)).attr('cy', y(c.npv)).attr('r', 5)
        .attr('fill', 'var(--cat-1)').attr('stroke', '#fff').attr('stroke-width', 1.5);

      g2.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x).ticks(4, '.2~%'));
      g2.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
      g2.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36)
        .attr('text-anchor', 'middle').text('prevalence (log scale)');
      g2.append('text').attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -panelH / 2).attr('y', -38)
        .attr('text-anchor', 'middle').text('predictive value');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'True positive', colour: 'var(--cat-2)', symbol: 'square' },
        { label: 'False positive', colour: '#8fa9c2', symbol: 'square' },
        { label: 'False negative', colour: '#c9b39a', symbol: 'square' },
        { label: 'True negative', colour: 'var(--ground-3)', symbol: 'square' },
        { label: 'PPV', colour: 'var(--cat-2)', symbol: 'line' },
        { label: 'NPV', colour: 'var(--cat-1)', symbol: 'line' }
      ]));
    }

    function updateMetrics() {
      var c = compute();
      window.UI.setMetric('by-tp', fmtCount(c.tp), 'ill, test positive');
      window.UI.setMetric('by-fp', fmtCount(c.fp), 'healthy, test positive',
        c.fp > c.tp ? 'bad' : null);
      window.UI.setMetric('by-tn', fmtCount(c.tn), 'healthy, test negative');
      window.UI.setMetric('by-fn', fmtCount(c.fn), 'ill, test negative');
      window.UI.setMetric('by-ppv', (c.ppv * 100).toFixed(1) + '%',
        fmtCount(c.tp) + ' / ' + fmtCount(c.posTotal),
        c.ppv < 0.3 ? 'bad' : (c.ppv > 0.8 ? 'good' : null));
      window.UI.setMetric('by-npv', (c.npv * 100).toFixed(2) + '%',
        fmtCount(c.tn) + ' / ' + fmtCount(c.negTotal),
        c.npv > 0.99 ? 'good' : null);
      window.UI.setMetric('by-acc', (c.accuracy * 100).toFixed(1) + '%',
        'overall accuracy');
    }

    function updateExplain() {
      var c = compute();
      var el = host.querySelector('[data-viz-note]');
      var ratio = c.tp > 0 ? c.fp / c.tp : Infinity;
      var msg;

      if (c.ppv < 0.25) {
        msg = '<strong>A positive result here is more likely to be wrong than ' +
          'right.</strong> The test is ' + (c.sens * 100).toFixed(1) +
          '% sensitive and ' + (c.spec * 100).toFixed(1) + '% specific, which ' +
          'sounds excellent, and its overall accuracy is ' +
          (c.accuracy * 100).toFixed(1) + '%. But because only ' +
          (c.prev * 100).toFixed(2) + '% of the tested population has the ' +
          'condition, the false positives are drawn from a far larger pool than ' +
          'the true positives. For every genuine case the test finds, it flags ' +
          ratio.toFixed(1) + ' healthy people.';
      } else if (c.ppv > 0.85) {
        msg = 'At this prevalence a positive result is trustworthy: ' +
          (c.ppv * 100).toFixed(1) + '% of the people it flags really do have ' +
          'the condition. Nothing about the test changed to achieve this. You ' +
          'moved the population it is applied to, which is what a referral ' +
          'pathway does in practice.';
      } else {
        msg = 'A positive result raises the probability of disease from ' +
          (c.prev * 100).toFixed(2) + '% before the test to ' +
          (c.ppv * 100).toFixed(1) + '% after it. That is genuine information, ' +
          'and it is also a long way short of a diagnosis, which is why ' +
          'confirmatory testing exists.';
      }

      msg += ' Note what the accuracy figure conceals: at ' +
        (c.accuracy * 100).toFixed(1) + '%, simply predicting "no disease" for ' +
        'everyone would score ' + ((1 - c.prev) * 100).toFixed(1) + '%.';

      /* The calculation, made transparent, in natural frequencies and in the
         lecture's orientation. */
      var calc = '<div class="table-scroll"><table class="table-compact">' +
        '<caption>Expected counts for ' + d3.format(',')(c.n) + ' people. Rows are ' +
        'what is true; columns are what the test says.</caption><thead><tr><th></th>' +
        '<th class="num" scope="col">Test positive</th><th class="num" scope="col">' +
        'Test negative</th><th class="num" scope="col">Total</th></tr></thead><tbody>' +
        '<tr><th scope="row">Has the condition</th><td class="num">TP ' + fmtCount(c.tp) +
        '</td><td class="num">FN ' + fmtCount(c.fn) + '</td><td class="num">' +
        fmtCount(c.ill) + '</td></tr><tr><th scope="row">Does not</th>' +
        '<td class="num">FP ' + fmtCount(c.fp) + '</td><td class="num">TN ' +
        fmtCount(c.tn) + '</td><td class="num">' + fmtCount(c.well) + '</td></tr>' +
        '<tr><th scope="row">Total</th><td class="num">' + fmtCount(c.posTotal) +
        '</td><td class="num">' + fmtCount(c.negTotal) + '</td><td class="num">' +
        d3.format(',')(c.n) + '</td></tr></tbody></table></div>' +
        '<p>PPV = TP / (TP + FP) = ' + fmtCount(c.tp) + ' / ' + fmtCount(c.posTotal) +
        ' = <strong>' + (c.ppv * 100).toFixed(1) + '%</strong>. &nbsp; NPV = TN / (TN + FN) = ' +
        fmtCount(c.tn) + ' / ' + fmtCount(c.negTotal) + ' = <strong>' +
        (c.npv * 100).toFixed(2) + '%</strong>. &nbsp; The same with Bayes: ' +
        (c.sens).toFixed(3) + ' \u00d7 ' + c.prev.toFixed(4) + ' / (' + c.sens.toFixed(3) +
        ' \u00d7 ' + c.prev.toFixed(4) + ' + ' + (1 - c.spec).toFixed(3) + ' \u00d7 ' +
        (1 - c.prev).toFixed(4) + ') = ' + (c.ppv * 100).toFixed(1) + '%.</p>';
      el.innerHTML = calc + '<p class="mb0">' + msg + '</p>';
    }

    function updateAlt() {
      var c = compute();
      var rows = [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.373, 0.5].map(function (p) {
        var tp = p * c.sens, fp = (1 - p) * (1 - c.spec);
        var tn = (1 - p) * c.spec, fn = p * (1 - c.sens);
        return [(p * 100).toFixed(1) + '%',
                ((tp / (tp + fp)) * 100).toFixed(1) + '%',
                ((tn / (tn + fn)) * 100).toFixed(2) + '%'];
      });

      altBody.innerHTML =
        '<p>Two panels. The first is a natural-frequency square representing ' +
        d3.format(',')(c.n) + ' people tested. Its width is divided by disease ' +
        'status and its height by test result, so the area of each region is the ' +
        'number of people in it.</p>' +
        window.UI.altTable('Outcome counts for the current settings.',
          ['Outcome', 'People'],
          [['True positive (ill, tested positive)', fmtCount(c.tp)],
           ['False positive (well, tested positive)', fmtCount(c.fp)],
           ['False negative (ill, tested negative)', fmtCount(c.fn)],
           ['True negative (well, tested negative)', fmtCount(c.tn)],
           ['Total testing positive', fmtCount(c.posTotal)],
           ['Positive predictive value', (c.ppv * 100).toFixed(2) + '%'],
           ['Negative predictive value', (c.npv * 100).toFixed(2) + '%']]) +
        '<p>The second panel plots positive and negative predictive value against ' +
        'prevalence on a logarithmic axis, holding sensitivity at ' +
        (c.sens * 100).toFixed(1) + '% and specificity at ' +
        (c.spec * 100).toFixed(1) + '%. PPV falls steeply as prevalence falls; ' +
        'NPV rises.</p>' +
        window.UI.altTable(
          'Predictive values across prevalence, at the current sensitivity and specificity.',
          ['Prevalence', 'PPV', 'NPV'], rows);
    }

    function refresh() { draw(); updateMetrics(); updateExplain(); updateAlt(); }

    ['prev', 'sens', 'spec'].forEach(function (k) {
      var el = host.querySelector('#by-' + k);
      el.addEventListener('input', function () {
        state[k] = +this.value;
        host.querySelector('#by-' + k + '-val').textContent =
          (+this.value).toFixed(k === 'prev' ? 2 : 1) + '%';
        refresh();
      });
    });

    host.querySelector('#by-n').addEventListener('change', function () {
      state.n = +this.value;
      refresh();
    });

    var presetEl = host.querySelector('#by-preset');
    presetEl.addEventListener('change', function () {
      var p = PRESETS[this.value];
      if (!p) return;
      state.prev = p.prev; state.sens = p.sens; state.spec = p.spec;
      syncControls(); refresh();
    });

    function syncControls() {
      ['prev', 'sens', 'spec'].forEach(function (k) {
        host.querySelector('#by-' + k).value = state[k];
        host.querySelector('#by-' + k + '-val').textContent =
          state[k].toFixed(k === 'prev' ? 2 : 1) + '%';
      });
    }

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT);
      presetEl.value = 'lecture';
      host.querySelector('#by-n').value = String(DEFAULT.n);
      syncControls(); refresh();
    });

    window.Chart.responsive(stage, draw);
    syncControls();
    refresh();
  });
})();
