/* Week 7 - PCA visualiser.
 *
 * PCA is computed in the browser, by Jacobi eigendecomposition of the
 * covariance matrix of the real WDBC data. The scree plot, the projection, the
 * loadings and the downstream accuracy are all recomputed whenever the student
 * changes the standardisation setting or the components on the axes, so the
 * relationship between the three panels is genuinely causal.
 */
(function () {
  'use strict';

  window.Chart.register('viz-pca', function (host) {
    var D = window.WDBC;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var state = { standardise: true, cx: 0, cy: 1, showLoadings: true };
    var pca, proj, accByK;

    function fit() {
      var X = state.standardise
        ? new window.ML.Scaler().fitTransform(D.X)
        : D.X;
      pca = new window.ML.PCA(Math.max(state.cx, state.cy) + 1).fit(X);
      /* Recompute enough components to project onto the chosen pair. */
      proj = pca.transform(X);

      /* Measured downstream accuracy against the number of components kept.
         The projection is fitted on the training fold only, which is the whole
         point of the exercise. */
      accByK = [];
      var ks = [1, 2, 3, 5, 8, 12, 20, 30];
      ks.forEach(function (k) {
        var folds = window.ML.stratifiedFolds(D.y, 5, 11);
        var accs = [];
        for (var f = 0; f < 5; f++) {
          var teIdx = folds[f], trIdx = [];
          for (var g = 0; g < 5; g++) if (g !== f) trIdx = trIdx.concat(folds[g]);
          var Xtr = trIdx.map(function (i) { return D.X[i]; });
          var Xte = teIdx.map(function (i) { return D.X[i]; });
          var sc = new window.ML.Scaler().fit(Xtr);
          Xtr = sc.transform(Xtr); Xte = sc.transform(Xte);
          var p = new window.ML.PCA(k).fit(Xtr);
          var m = new window.ML.LogReg({ epochs: 150, lr: 0.6, l2: 0.02 })
            .fit(p.transform(Xtr), trIdx.map(function (i) { return D.y[i]; }));
          accs.push(window.ML.accuracy(teIdx.map(function (i) { return D.y[i]; }),
                                       m.predict(p.transform(Xte))));
        }
        accByK.push({ k: k, acc: window.ML.mean(accs), sd: window.ML.sd(accs) });
      });
    }

    function draw() {
      var wide = stage.clientWidth > 720;
      var f = window.Chart.frame(stage, {
        height: wide ? 340 : 720,
        margin: { top: 28, right: 16, bottom: 46, left: 54 },
        title: 'Scree plot, principal-component projection and downstream accuracy'
      });

      var cols = wide ? 3 : 1;
      var panelW = wide ? (f.w - 2 * 42) / 3 : f.w;
      var panelH = wide ? f.h : (f.h - 2 * 62) / 3;
      var offset = function (i) {
        return wide ? 'translate(' + (i * (panelW + 42)) + ',0)'
                    : 'translate(0,' + (i * (panelH + 62)) + ')';
      };

      /* ---- 1. Scree ---- */
      var g1 = f.g.append('g').attr('transform', offset(0));
      g1.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Variance explained by each component');

      var nShow = 12;
      var ev = pca.explained.slice(0, nShow);
      var cum = [];
      var run = 0;
      pca.explained.forEach(function (v) { run += v; cum.push(run); });

      var x1 = d3.scaleBand()
        .domain(d3.range(nShow).map(function (i) { return i + 1; }))
        .range([0, panelW]).padding(0.18);
      var y1 = d3.scaleLinear().domain([0, 1]).range([panelH, 0]);

      g1.selectAll('line.grid-line').data(y1.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
        .attr('y1', y1).attr('y2', y1);

      var bars = g1.selectAll('rect').data(ev).join('rect')
        .attr('x', function (d, i) { return x1(i + 1); })
        .attr('y', function (d) { return y1(d); })
        .attr('width', x1.bandwidth())
        .attr('height', function (d) { return panelH - y1(d); })
        .attr('fill', function (d, i) {
          return (i === state.cx || i === state.cy) ? 'var(--clinical)' : 'var(--ink-4)';
        })
        .attr('rx', 2).attr('tabindex', 0);

      window.Chart.tips(bars, function (d) {
        var i = ev.indexOf(d);
        return '<strong>PC' + (i + 1) + '</strong><br>explains ' +
          (d * 100).toFixed(2) + '% of the variance<br>cumulative: ' +
          (cum[i] * 100).toFixed(2) + '%';
      });

      g1.append('path').attr('fill', 'none')
        .attr('stroke', 'var(--nucleus)').attr('stroke-width', 2)
        .attr('d', d3.line()
          .x(function (d, i) { return x1(i + 1) + x1.bandwidth() / 2; })
          .y(function (d) { return y1(d); })(cum.slice(0, nShow)));

      g1.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x1).tickValues([1, 3, 5, 7, 9, 11]));
      g1.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y1).ticks(5).tickFormat(d3.format('.0%')));
      g1.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36)
        .attr('text-anchor', 'middle').text('principal component');

      /* ---- 2. Projection ---- */
      var g2 = f.g.append('g').attr('transform', offset(1));
      g2.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('PC' + (state.cx + 1) + ' against PC' + (state.cy + 1));

      var px = proj.map(function (p) { return p[state.cx]; });
      var py = proj.map(function (p) { return p[state.cy]; });
      var x2 = d3.scaleLinear().domain(d3.extent(px)).nice().range([0, panelW]);
      var y2 = d3.scaleLinear().domain(d3.extent(py)).nice().range([panelH, 0]);

      g2.selectAll('line.grid-line').data(y2.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
        .attr('y1', y2).attr('y2', y2);

      var pts = g2.append('g');
      D.y.forEach(function (cls, i) {
        var ci = cls === 'benign' ? 0 : 1;
        window.Chart.symbol(pts, window.Chart.SYMBOLS[ci],
          x2(px[i]), y2(py[i]), 3.1, window.Chart.colour(ci),
          { opacity: 0.72 });
      });

      /* Loadings, as arrows for the six most influential features. */
      if (state.showLoadings) {
        var lx = pca.components[state.cx], ly = pca.components[state.cy];
        var mags = lx.map(function (v, j) {
          return { j: j, m: Math.sqrt(v * v + ly[j] * ly[j]) };
        }).sort(function (a, b) { return b.m - a.m; }).slice(0, 6);

        var sc = Math.min(panelW, panelH) * 0.40;
        mags.forEach(function (t) {
          var ex = x2.range()[0] + panelW / 2 + lx[t.j] * sc;
          var ey = panelH / 2 - ly[t.j] * sc;
          g2.append('line')
            .attr('x1', panelW / 2).attr('y1', panelH / 2)
            .attr('x2', ex).attr('y2', ey)
            .attr('stroke', 'var(--nucleus)').attr('stroke-width', 1.5)
            .attr('opacity', 0.85);
          g2.append('text')
            .attr('x', ex + (ex > panelW / 2 ? 3 : -3))
            .attr('y', ey + (ey > panelH / 2 ? 9 : -3))
            .attr('text-anchor', ex > panelW / 2 ? 'start' : 'end')
            .style('font-size', '8.5px').style('font-weight', '600')
            .attr('fill', 'var(--nucleus)')
            .text(D.features[t.j].replace(/_/g, ' ').replace(' mean', ''));
        });
      }

      g2.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x2).ticks(5));
      g2.append('g').attr('class', 'axis').call(d3.axisLeft(y2).ticks(5));
      g2.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
        .text('PC' + (state.cx + 1) + ' (' +
              (pca.explained[state.cx] * 100).toFixed(1) + '%)');

      /* ---- 3. Accuracy against components kept ---- */
      var g3 = f.g.append('g').attr('transform', offset(2));
      g3.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Accuracy against components kept');

      var x3 = d3.scaleLog().domain([1, 30]).range([0, panelW]);
      var lo = d3.min(accByK, function (d) { return d.acc; }) - 0.03;
      var y3 = d3.scaleLinear().domain([Math.max(0.5, lo), 1]).range([panelH, 0]);

      g3.selectAll('line.grid-line').data(y3.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
        .attr('y1', y3).attr('y2', y3);

      g3.append('path').attr('fill', 'none')
        .attr('stroke', 'var(--specimen)').attr('stroke-width', 2.2)
        .attr('d', d3.line()
          .x(function (d) { return x3(d.k); })
          .y(function (d) { return y3(d.acc); })(accByK));

      var dots = g3.selectAll('circle').data(accByK).join('circle')
        .attr('cx', function (d) { return x3(d.k); })
        .attr('cy', function (d) { return y3(d.acc); })
        .attr('r', 4).attr('fill', 'var(--specimen)')
        .attr('stroke', '#fff').attr('stroke-width', 1.3)
        .attr('tabindex', 0);

      window.Chart.tips(dots, function (d) {
        return '<strong>' + d.k + ' component' + (d.k > 1 ? 's' : '') +
          '</strong><br>accuracy ' + (d.acc * 100).toFixed(2) +
          '% ± ' + (d.sd * 100).toFixed(1) + '<br>' +
          'cumulative variance ' + (cum[d.k - 1] * 100).toFixed(1) + '%';
      });

      g3.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x3).tickValues([1, 2, 3, 5, 10, 20, 30])
          .tickFormat(d3.format('d')));
      g3.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y3).ticks(5).tickFormat(d3.format('.0%')));
      g3.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
        .text('components retained (log scale)');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'benign', colour: window.Chart.colour(0), symbol: 'circle' },
        { label: 'malignant', colour: window.Chart.colour(1), symbol: 'square' },
        { label: 'cumulative variance', colour: 'var(--nucleus)', symbol: 'line' },
        { label: 'feature loadings', colour: 'var(--nucleus)', symbol: 'line' }
      ]));
    }

    function updateMetrics() {
      var c2 = pca.explained[0] + pca.explained[1];
      var run = 0, need90 = 0;
      for (var i = 0; i < pca.explained.length; i++) {
        run += pca.explained[i];
        if (run >= 0.9) { need90 = i + 1; break; }
      }
      window.UI.setMetric('pca-two', window.Chart.pct(c2),
        'variance in the first two components');
      var pair = state.cx === state.cy ? pca.explained[state.cx]
                                       : pca.explained[state.cx] + pca.explained[state.cy];
      window.UI.setMetric('pca-pair', window.Chart.pct(pair),
        'variance in PC' + (state.cx + 1) + ' + PC' + (state.cy + 1) + ', the pair plotted');
      window.UI.setMetric('pca-90', String(need90) + ' comps',
        'needed to reach 90% of the variance');
      var best = accByK.reduce(function (a, b) { return b.acc > a.acc ? b : a; });
      window.UI.setMetric('pca-best', window.Chart.pct(best.acc),
        'best accuracy, at ' + best.k + ' components', 'good');
      window.UI.setMetric('pca-two-acc',
        window.Chart.pct(accByK[1].acc),
        'accuracy using only 2 components');
    }

    function updateExplain() {
      var el = host.querySelector('[data-viz-note]');
      var c2 = pca.explained[0] + pca.explained[1];
      var msg;

      if (!state.standardise) {
        msg = '<strong>Standardisation is off.</strong> Nuclear area runs into ' +
          'the thousands while smoothness is around 0.1, so the covariance ' +
          'matrix is dominated by whichever feature has the largest units. The ' +
          'first component now explains ' +
          (pca.explained[0] * 100).toFixed(1) + '% of the variance, but it is ' +
          'largely just "area", and the loadings arrows show it. PCA on ' +
          'unstandardised data with mixed units answers a question about ' +
          'measurement scales rather than about biology.';
      } else {
        msg = 'The first two components carry ' + (c2 * 100).toFixed(1) +
          '% of the variance, so the scatter plot is a real but partial view: ' +
          (100 - c2 * 100).toFixed(1) + '% of the variation is in directions ' +
          'you cannot see here. The loadings arrows show which original ' +
          'features point where. Notice how radius, perimeter and area point ' +
          'in almost the same direction, because they are three ways of ' +
          'measuring the same thing, and PCA has collapsed them into roughly ' +
          'one axis. That is the redundancy it exists to find.';
      }

      if (state.cx + state.cy !== 1) {
        msg += ' You are plotting PC' + (state.cx + 1) + ' against PC' + (state.cy + 1) +
          ', which together carry ' + window.Chart.pct(state.cx === state.cy
            ? pca.explained[state.cx] : pca.explained[state.cx] + pca.explained[state.cy]) +
          ' of the variance. Whether the diagnoses separate on a pair is a different ' +
          'question from how much variance it carries: the directions of largest ' +
          'variance are not guaranteed to be the most diagnostic.';
      }
      msg += ' The right-hand panel measures what the reduction costs. Two ' +
        'components give ' + window.Chart.pct(accByK[1].acc) +
        ' and the full 30 give ' +
        window.Chart.pct(accByK[accByK.length - 1].acc) + '. The PCA is ' +
        'refitted inside each cross-validation fold, which is the only correct ' +
        'way to measure this.';

      el.innerHTML = '<p class="mb0">' + msg + '</p>';
    }

    function updateAlt() {
      var cum = [], run = 0;
      pca.explained.forEach(function (v) { run += v; cum.push(run); });
      altBody.innerHTML =
        '<p>Three panels, all computed in your browser from the real WDBC data ' +
        '(569 samples, 30 features), ' +
        (state.standardise ? 'with' : 'without') + ' standardisation.</p>' +
        '<p>The first is a scree plot: bars for the variance explained by each ' +
        'of the first twelve components, with a line for the cumulative total. ' +
        'The second is a scatter plot of PC' + (state.cx + 1) + ' against PC' +
        (state.cy + 1) + ', with benign samples as circles and malignant as ' +
        'squares, overlaid with arrows for the six features with the largest ' +
        'loadings. The third plots cross-validated accuracy against the number ' +
        'of components kept.</p>' +
        window.UI.altTable('Variance explained by the first ten components.',
          ['Component', 'Explained', 'Cumulative'],
          pca.explained.slice(0, 10).map(function (v, i) {
            return ['PC' + (i + 1), (v * 100).toFixed(2) + '%',
                    (cum[i] * 100).toFixed(2) + '%'];
          })) +
        window.UI.altTable(
          'Cross-validated accuracy of logistic regression on PCA components. ' +
          'The PCA is refitted inside each training fold.',
          ['Components kept', 'Accuracy', 'SD across folds'],
          accByK.map(function (a) {
            return [String(a.k), (a.acc * 100).toFixed(2) + '%',
                    (a.sd * 100).toFixed(2) + ' pts'];
          }));
    }

    function refresh() { fit(); draw(); updateMetrics(); updateExplain(); updateAlt(); }

    host.querySelector('#pca-standardise').addEventListener('change', function () {
      state.standardise = this.checked; refresh();
    });
    host.querySelector('#pca-loadings').addEventListener('change', function () {
      state.showLoadings = this.checked; draw();
    });
    host.querySelector('#pca-cx').addEventListener('change', function () {
      state.cx = +this.value; refresh();
    });
    host.querySelector('#pca-cy').addEventListener('change', function () {
      state.cy = +this.value; refresh();
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { standardise: true, cx: 0, cy: 1, showLoadings: true };
      host.querySelector('#pca-standardise').checked = true;
      host.querySelector('#pca-loadings').checked = true;
      host.querySelector('#pca-cx').value = '0';
      host.querySelector('#pca-cy').value = '1';
      refresh();
    });

    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
