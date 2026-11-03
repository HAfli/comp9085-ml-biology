/* Week 4 - Calibration explorer.
 *
 * "A probability is a claim." 5,000 illustrative cases each have a true
 * probability that is known by construction, and an outcome drawn from it.
 * The student distorts the model's reported probabilities and watches the
 * reliability diagram move away from the diagonal while the ranking of the
 * cases - and therefore the AUC - does not change at all. That is the point:
 * calibration and discrimination answer different questions.
 *
 * Reported probability = sigmoid(k * logit(p_true) + shift).
 *   k > 1  over-confident (pushed towards 0 and 1)
 *   k < 1  under-confident (pulled towards 0.5)
 *   shift  systematic over- or under-prediction
 * Both are monotone, so the order of the cases never changes.
 */
(function () {
  'use strict';

  window.Chart.register('viz-calibration', function (host) {
    var W4 = window.WEEK04;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    if (!W4 || !W4.calibrationData) {
      stage.innerHTML = '<div class="noscript-note">The Week 4 data file did ' +
        'not load.</div>';
      return;
    }
    var P = W4.calibrationData.p, Y = W4.calibrationData.y, N = P.length;
    var LOGIT = P.map(function (p) { return Math.log(p / (1 - p)); });

    var PRESETS = { A: { k: 1, shift: 0 }, B: { k: 2.5, shift: 0 },
                    C: { k: 0.45, shift: 0 }, D: { k: 1, shift: 0.8 } };
    var state = { k: 1, shift: 0, bins: 10, model: 'A' };

    function predictions() {
      return LOGIT.map(function (z) {
        return 1 / (1 + Math.exp(-(state.k * z + state.shift)));
      });
    }

    /* AUC by the rank-sum formula, with ties given their average rank. */
    function auc(pred) {
      var idx = pred.map(function (v, i) { return i; })
        .sort(function (a, b) { return pred[a] - pred[b]; });
      var ranks = new Array(N), i = 0;
      while (i < N) {
        var j = i;
        while (j + 1 < N && pred[idx[j + 1]] === pred[idx[i]]) j++;
        for (var m = i; m <= j; m++) ranks[idx[m]] = (i + j) / 2 + 1;
        i = j + 1;
      }
      var nPos = 0, sumPos = 0;
      for (var q = 0; q < N; q++) if (Y[q] === 1) { nPos++; sumPos += ranks[q]; }
      var nNeg = N - nPos;
      return (sumPos - nPos * (nPos + 1) / 2) / (nPos * nNeg);
    }

    function stats() {
      var pred = predictions();
      var nb = state.bins, bins = [];
      for (var b = 0; b < nb; b++) bins.push({ lo: b / nb, hi: (b + 1) / nb,
                                              n: 0, sp: 0, sy: 0 });
      var correct = 0, brier = 0, n08 = 0, y08 = 0;
      for (var i = 0; i < N; i++) {
        var p = pred[i];
        var bi = Math.min(nb - 1, Math.floor(p * nb));
        bins[bi].n++; bins[bi].sp += p; bins[bi].sy += Y[i];
        if ((p >= 0.5 ? 1 : 0) === Y[i]) correct++;
        brier += (p - Y[i]) * (p - Y[i]);
        if (p >= 0.75 && p < 0.85) { n08++; y08 += Y[i]; }
      }
      var ece = 0;
      bins.forEach(function (bn) {
        bn.mp = bn.n ? bn.sp / bn.n : null;
        bn.fp = bn.n ? bn.sy / bn.n : null;
        if (bn.n) ece += bn.n * Math.abs(bn.mp - bn.fp);
      });
      return { pred: pred, bins: bins, acc: correct / N, brier: brier / N,
               ece: ece / N, auc: auc(pred), n08: n08,
               f08: n08 ? y08 / n08 : null };
    }

    var lastAuc = null;

    function draw(s) {
      s = s || stats();
      var wide = stage.clientWidth > 720;
      var f = window.Chart.frame(stage, {
        height: wide ? 340 : 640,
        margin: { top: 28, right: 18, bottom: 46, left: 58 },
        title: 'Reliability diagram and distribution of predicted probabilities'
      });
      var gap = wide ? 60 : 78;
      var side = wide ? Math.min(f.h, (f.w - gap) * 0.55) : Math.min(f.w, (f.h - gap) * 0.58);
      var pw2 = wide ? f.w - gap - side : f.w;
      var ph2 = wide ? side : f.h - gap - side;

      /* ---- Panel 1: reliability diagram ---- */
      var g1 = f.g.append('g');
      g1.append('text').attr('class', 'chart-title').attr('y', -12)
        .text('Predicted probability vs what actually happened');
      var x = d3.scaleLinear().domain([0, 1]).range([0, side]);
      var y = d3.scaleLinear().domain([0, 1]).range([side, 0]);
      g1.selectAll('line.grid-line').data(y.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', side)
        .attr('y1', y).attr('y2', y);
      g1.append('line').attr('x1', x(0)).attr('y1', y(0))
        .attr('x2', x(1)).attr('y2', y(1))
        .attr('stroke', 'var(--ink-4)').attr('stroke-dasharray', '4 4');
      g1.append('text').attr('x', x(0.62)).attr('y', y(0.70))
        .attr('transform', 'rotate(-45 ' + x(0.62) + ' ' + y(0.70) + ')')
        .style('font-size', '10.5px').attr('fill', 'var(--ink-3)')
        .text('perfectly calibrated');
      var used = s.bins.filter(function (b) { return b.n > 0; });
      var rS = d3.scaleSqrt().domain([0, d3.max(used, function (b) { return b.n; })])
        .range([2.5, 9]);
      g1.append('path').attr('fill', 'none').attr('stroke', 'var(--cat-2)')
        .attr('stroke-width', 2)
        .attr('d', d3.line().x(function (b) { return x(b.mp); })
          .y(function (b) { return y(b.fp); })(used));
      var dots = g1.selectAll('circle.bin').data(used).join('circle')
        .attr('class', 'bin').attr('cx', function (b) { return x(b.mp); })
        .attr('cy', function (b) { return y(b.fp); })
        .attr('r', function (b) { return rS(b.n); })
        .attr('fill', 'var(--cat-2)').attr('stroke', '#fff')
        .attr('stroke-width', 1.3).attr('tabindex', 0);
      window.Chart.tips(dots, function (b) {
        return '<strong>Predictions ' + b.lo.toFixed(2) + '–' + b.hi.toFixed(2) +
          '</strong><br>' + b.n + ' cases<br>mean prediction ' +
          (b.mp * 100).toFixed(1) + '%<br>actually positive ' +
          (b.fp * 100).toFixed(1) + '%';
      });
      g1.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + side + ')')
        .call(d3.axisBottom(x).ticks(5));
      g1.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
      g1.append('text').attr('class', 'axis-label')
        .attr('x', side / 2).attr('y', side + 36).attr('text-anchor', 'middle')
        .text('mean predicted probability (bin)');
      g1.append('text').attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)').attr('x', -side / 2).attr('y', -42)
        .attr('text-anchor', 'middle').text('observed fraction positive');

      /* ---- Panel 2: histogram of predictions ---- */
      var g2 = f.g.append('g').attr('transform', wide
        ? 'translate(' + (side + gap) + ',0)' : 'translate(0,' + (side + gap) + ')');
      g2.append('text').attr('class', 'chart-title').attr('y', -12)
        .text('How confident the model sounds');
      var hx = d3.scaleLinear().domain([0, 1]).range([0, pw2]);
      var hb = d3.bin().domain([0, 1]).thresholds(d3.range(0.05, 1, 0.05))(s.pred);
      var hy = d3.scaleLinear().domain([0, d3.max(hb, function (b) {
        return b.length; })]).nice().range([ph2, 0]);
      g2.selectAll('rect').data(hb).join('rect')
        .attr('x', function (b) { return hx(b.x0) + 0.5; })
        .attr('y', function (b) { return hy(b.length); })
        .attr('width', function (b) { return Math.max(0, hx(b.x1) - hx(b.x0) - 1); })
        .attr('height', function (b) { return ph2 - hy(b.length); })
        .attr('fill', 'var(--cat-1)').attr('opacity', 0.75);
      g2.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + ph2 + ')')
        .call(d3.axisBottom(hx).ticks(5));
      g2.append('g').attr('class', 'axis').call(d3.axisLeft(hy).ticks(4));
      g2.append('text').attr('class', 'axis-label')
        .attr('x', pw2 / 2).attr('y', ph2 + 36).attr('text-anchor', 'middle')
        .text('predicted probability');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Observed vs predicted, dot size = cases in bin',
          colour: 'var(--cat-2)', symbol: 'circle' },
        { label: 'Perfect calibration', colour: 'var(--ink-4)', symbol: 'line' },
        { label: 'Predicted probabilities', colour: 'var(--cat-1)', symbol: 'square' }
      ]));
      return s;
    }

    function pct(v, d) { return v == null ? 'n/a' : (v * 100).toFixed(d || 0) + '%'; }

    function update(s) {
      var U = window.UI;
      U.setMetric('cal-acc', pct(s.acc, 1), 'at threshold 0.5');
      U.setMetric('cal-auc', s.auc.toFixed(3),
        lastAuc != null && Math.abs(s.auc - lastAuc) < 1e-9 ? 'unchanged: same ranking'
                                                           : 'ranking quality');
      lastAuc = s.auc;
      U.setMetric('cal-brier', s.brier.toFixed(3), 'lower is better');
      U.setMetric('cal-ece', pct(s.ece, 1), 'average calibration gap',
        s.ece > 0.05 ? 'bad' : (s.ece < 0.02 ? 'good' : null));
      U.setMetric('cal-08', s.f08 == null ? 'n/a' : pct(s.f08),
        s.n08 + ' cases predicted 0.75–0.85',
        s.f08 != null && Math.abs(s.f08 - 0.8) > 0.08 ? 'bad' : null);

      var msg;
      if (state.k > 1.15) {
        msg = '<strong>Over-confident.</strong> Predictions are pushed towards ' +
          '0 and 1. Look at the cases the model scores around 0.8: only ' +
          pct(s.f08) + ' of them are actually positive. The curve is flatter ' +
          'than the diagonal.';
      } else if (state.k < 0.85) {
        msg = '<strong>Under-confident.</strong> Predictions huddle around 0.5, ' +
          'too cautious. Cases scored around 0.8 are positive ' + pct(s.f08) +
          ' of the time. The curve is steeper than the diagonal.';
      } else if (Math.abs(state.shift) > 0.2) {
        msg = '<strong>Systematically ' + (state.shift > 0 ? 'too high' : 'too low') +
          '.</strong> Every prediction is shifted, so the curve sits ' +
          (state.shift > 0 ? 'below' : 'above') + ' the diagonal. This can ' +
          'occur when a model is used in a population with a different ' +
          'prevalence from the one it was developed in.';
      } else {
        msg = '<strong>Well calibrated.</strong> Among cases scored around 0.8, ' +
          pct(s.f08) + ' are positive: the probability means what it says. ' +
          'Points sit close to the diagonal.';
      }
      msg += ' Where predictions around 0.8 correspond to about 80% observed ' +
        'positives, the model is well calibrated in that region. Calibration is ' +
        'assessed across groups of predictions (each dot is a bin of cases); it is ' +
        'not guaranteed for an individual case.';
      msg += ' AUC is ' + s.auc.toFixed(3) + ' throughout, because every setting ' +
        'here keeps the cases in the same order. A model can rank patients ' +
        'well and still attach misleading numbers to them: discrimination and ' +
        'calibration are different questions.';
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' + msg + '</p>';

      altBody.innerHTML =
        '<p>A reliability diagram: mean predicted probability in each bin on ' +
        'the horizontal axis, the fraction of those cases that were actually ' +
        'positive on the vertical axis, and a dashed diagonal for perfect ' +
        'calibration. Beside it, a histogram of the predicted probabilities. ' +
        'Current settings: confidence factor ' + state.k.toFixed(2) +
        ', shift ' + state.shift.toFixed(1) + ' on the log-odds scale.</p>' +
        window.UI.altTable('Calibration bins for the current settings.',
          ['Bin', 'Cases', 'Mean predicted', 'Observed positive'],
          s.bins.filter(function (b) { return b.n; }).map(function (b) {
            return [b.lo.toFixed(2) + '–' + b.hi.toFixed(2), String(b.n),
                    pct(b.mp, 1), pct(b.fp, 1)];
          })) +
        '<p>Accuracy at 0.5: ' + pct(s.acc, 1) + '. AUC: ' + s.auc.toFixed(3) +
        '. Brier score: ' + s.brier.toFixed(3) + '. Expected calibration ' +
        'error: ' + pct(s.ece, 1) + '.</p>';
    }

    function refresh() { update(draw()); }

    function sync() {
      host.querySelector('#cal-k').value = state.k;
      host.querySelector('#cal-k-val').textContent = state.k.toFixed(2);
      host.querySelector('#cal-shift').value = state.shift;
      host.querySelector('#cal-shift-val').textContent = state.shift.toFixed(1);
      host.querySelectorAll('#cal-model button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === state.model));
      });
    }

    window.UI.onSegment(host.querySelector('#cal-model'), function (v) {
      state.model = v; state.k = PRESETS[v].k; state.shift = PRESETS[v].shift;
      sync(); refresh();
    });
    host.querySelector('#cal-k').addEventListener('input', function () {
      state.k = +this.value; state.model = 'custom'; sync(); refresh();
    });
    host.querySelector('#cal-shift').addEventListener('input', function () {
      state.shift = +this.value; state.model = 'custom'; sync(); refresh();
    });
    host.querySelector('#cal-bins').addEventListener('change', function () {
      state.bins = +this.value; refresh();
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { k: 1, shift: 0, bins: 10, model: 'A' };
      host.querySelector('#cal-bins').value = '10';
      sync(); refresh();
    });

    window.Chart.responsive(stage, function () { draw(); });
    sync();
    refresh();
  });
})();
