/* Week 6 - Data quality explorer.
 *
 * The design decision here is that the damage is known. Rather than handing
 * students a messy dataset and asking them to guess, this takes the real WDBC
 * data, injects a controlled and specified amount of missingness, outlier
 * contamination and class imbalance, and then lets them choose repairs. Because
 * the undamaged data is available, the cost of each choice can be measured
 * rather than argued about.
 *
 * Everything is real: real data, real damage, real logistic regression, real
 * cross-validated accuracy.
 */
(function () {
  'use strict';

  window.Chart.register('viz-data-quality', function (host) {
    var D = window.WDBC;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    /* Ten features is enough to show the effects and fast enough to refit on
       every slider move. */
    var FEATS = ['radius_mean', 'texture_mean', 'perimeter_mean', 'area_mean',
                 'smoothness_mean', 'compactness_mean', 'concavity_mean',
                 'concave_points_mean', 'symmetry_mean', 'fractal_dim_mean']
      .map(function (n) { return D.features.indexOf(n); });

    var state = {
      missing: 15, mechanism: 'mnar', outliers: 5, imbalance: 0,
      impute: 'median', indicator: false, removeOutliers: false,
      scale: true, balance: 'none'
    };

    var baseX = D.X.map(function (r) {
      return FEATS.map(function (i) { return r[i]; });
    });
    var baseY = D.y.slice();

    /* ---- Damage ------------------------------------------------------- */
    function damage() {
      var rng = new window.ML.Random(4242);
      var X = baseX.map(function (r) { return r.slice(); });
      var y = baseY.slice();
      var missMask = X.map(function (r) { return r.map(function () { return false; }); });
      var outlierRows = [];

      /* Class imbalance: drop malignant rows to make the problem harder in the
         way real clinical data usually is. */
      if (state.imbalance > 0) {
        var keep = [];
        var dropProb = state.imbalance / 100;
        for (var i = 0; i < X.length; i++) {
          if (y[i] === 'malignant' && rng.next() < dropProb) continue;
          keep.push(i);
        }
        X = keep.map(function (i) { return X[i]; });
        y = keep.map(function (i) { return y[i]; });
        missMask = keep.map(function () {
          return FEATS.map(function () { return false; });
        });
      }

      /* Missingness. Under MCAR, cells vanish at random. Under MNAR, the
         largest values of the first feature are the ones that go missing,
         which is what happens when the sickest participants do not attend. */
      var frac = state.missing / 100;
      var nCells = X.length;
      if (frac > 0) {
        for (var j = 0; j < FEATS.length; j++) {
          if (state.mechanism === 'mcar') {
            for (var i2 = 0; i2 < nCells; i2++) {
              if (rng.next() < frac) { X[i2][j] = null; missMask[i2][j] = true; }
            }
          } else {
            /* MNAR: probability of being missing rises with the value itself. */
            var col = X.map(function (r) { return r[j]; })
                       .filter(function (v) { return v != null; });
            var lo = Math.min.apply(null, col), hi = Math.max.apply(null, col);
            for (var i3 = 0; i3 < nCells; i3++) {
              if (X[i3][j] == null) continue;
              var t = (X[i3][j] - lo) / (hi - lo || 1);
              if (rng.next() < frac * (0.25 + 1.5 * t)) {
                X[i3][j] = null; missMask[i3][j] = true;
              }
            }
          }
        }
      }

      /* Outliers: instrument-style errors, an order of magnitude out. */
      var nOut = Math.round(X.length * state.outliers / 100);
      for (var o = 0; o < nOut; o++) {
        var ri = rng.int(X.length), ci = rng.int(FEATS.length);
        if (X[ri][ci] == null) continue;
        X[ri][ci] = X[ri][ci] * (rng.next() < 0.5 ? 11 : -6);
        outlierRows.push(ri);
      }

      return { X: X, y: y, missMask: missMask, outlierRows: outlierRows };
    }

    /* ---- Repair ------------------------------------------------------- */
    function repair(d) {
      var X = d.X.map(function (r) { return r.slice(); });
      var y = d.y.slice();
      var kept = X.map(function (_, i) { return i; });

      /* Outlier removal, by the interquartile-range rule applied per column.
         Note this is applied to the whole set here for simplicity of display;
         the caption says so, and the lab does it properly inside the fold. */
      if (state.removeOutliers) {
        var bad = {};
        for (var j = 0; j < FEATS.length; j++) {
          var col = X.map(function (r) { return r[j]; })
                     .filter(function (v) { return v != null; });
          if (!col.length) continue;
          var q1 = window.ML.quantile(col, 0.25);
          var q3 = window.ML.quantile(col, 0.75);
          var iqr = q3 - q1;
          for (var i = 0; i < X.length; i++) {
            if (X[i][j] == null) continue;
            if (X[i][j] < q1 - 3 * iqr || X[i][j] > q3 + 3 * iqr) bad[i] = true;
          }
        }
        kept = kept.filter(function (i) { return !bad[i]; });
        X = kept.map(function (i) { return X[i]; });
        y = kept.map(function (i) { return y[i]; });
      }

      /* Missingness indicators, added before imputation destroys the pattern. */
      var indicators = [];
      if (state.indicator) {
        indicators = X.map(function (r) {
          return r.map(function (v) { return v == null ? 1 : 0; });
        });
      }

      /* Imputation */
      var dropped = 0;
      if (state.impute === 'drop') {
        var complete = [];
        for (var i2 = 0; i2 < X.length; i2++) {
          if (X[i2].every(function (v) { return v != null; })) complete.push(i2);
        }
        dropped = X.length - complete.length;
        var idxMap = complete;
        X = idxMap.map(function (i) { return X[i]; });
        y = idxMap.map(function (i) { return y[i]; });
        if (indicators.length) indicators = idxMap.map(function (i) { return indicators[i]; });
      } else {
        for (var j2 = 0; j2 < FEATS.length; j2++) {
          var vals = X.map(function (r) { return r[j2]; })
                      .filter(function (v) { return v != null; });
          if (!vals.length) vals = [0];
          var fill = state.impute === 'mean'
            ? window.ML.mean(vals)
            : window.ML.quantile(vals, 0.5);
          if (state.impute === 'zero') fill = 0;
          for (var i3 = 0; i3 < X.length; i3++) {
            if (X[i3][j2] == null) X[i3][j2] = fill;
          }
        }
      }

      if (indicators.length) {
        X = X.map(function (r, i) { return r.concat(indicators[i]); });
      }

      return { X: X, y: y, dropped: dropped, keptRows: X.length };
    }

    /* ---- Evaluate ----------------------------------------------------- */
    function evaluate(X, y) {
      if (X.length < 30 || new Set(y).size < 2) return null;

      var folds = window.ML.stratifiedFolds(y, 5, 7);
      var accs = [], recalls = [], balanced = [];

      for (var f = 0; f < 5; f++) {
        var teIdx = folds[f], trIdx = [];
        for (var g = 0; g < 5; g++) if (g !== f) trIdx = trIdx.concat(folds[g]);

        var Xtr = trIdx.map(function (i) { return X[i]; });
        var ytr = trIdx.map(function (i) { return y[i]; });
        var Xte = teIdx.map(function (i) { return X[i]; });
        var yte = teIdx.map(function (i) { return y[i]; });

        /* Resampling belongs inside the fold, on the training portion only. */
        if (state.balance === 'over') {
          var counts = {};
          ytr.forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
          var maxC = Math.max.apply(null, Object.values(counts));
          var rng = new window.ML.Random(3);
          Object.keys(counts).forEach(function (c) {
            var pool = [];
            for (var i = 0; i < ytr.length; i++) if (ytr[i] === c) pool.push(i);
            while (counts[c] < maxC) {
              var pick = pool[rng.int(pool.length)];
              Xtr.push(Xtr[pick]); ytr.push(ytr[pick]);
              counts[c]++;
            }
          });
        } else if (state.balance === 'under') {
          var counts2 = {};
          ytr.forEach(function (c) { counts2[c] = (counts2[c] || 0) + 1; });
          var minC = Math.min.apply(null, Object.values(counts2));
          var rng2 = new window.ML.Random(3);
          var byC = {};
          for (var i4 = 0; i4 < ytr.length; i4++) {
            (byC[ytr[i4]] = byC[ytr[i4]] || []).push(i4);
          }
          var keepIdx = [];
          Object.keys(byC).forEach(function (c) {
            keepIdx = keepIdx.concat(rng2.shuffle(byC[c]).slice(0, minC));
          });
          Xtr = keepIdx.map(function (i) { return Xtr[i]; });
          ytr = keepIdx.map(function (i) { return ytr[i]; });
        }

        if (state.scale) {
          var sc = new window.ML.Scaler().fit(Xtr);   /* fitted on train only */
          Xtr = sc.transform(Xtr);
          Xte = sc.transform(Xte);
        }

        var m = new window.ML.LogReg({ epochs: 180, lr: 0.5, l2: 0.02 })
          .fit(Xtr, ytr);
        var pred = m.predict(Xte);
        var rep = window.ML.classReport(yte, pred, ['benign', 'malignant']);
        accs.push(rep.accuracy);
        recalls.push(rep.per[1].recall);
        balanced.push((rep.per[0].recall + rep.per[1].recall) / 2);
      }
      return { acc: window.ML.mean(accs), accSd: window.ML.sd(accs),
               recall: window.ML.mean(recalls),
               balanced: window.ML.mean(balanced) };
    }

    var current = null;

    function run() {
      var d = damage();
      var r = repair(d);
      var res = evaluate(r.X, r.y);

      /* The reference point: the same model on the undamaged data. */
      if (!current || !current.clean) {
        var savedScale = state.scale, savedBal = state.balance;
        state.scale = true; state.balance = 'none';
        var clean = evaluate(baseX, baseY);
        state.scale = savedScale; state.balance = savedBal;
        current = { clean: clean };
      }
      current.damaged = d;
      current.repaired = r;
      current.result = res;
      return current;
    }

    function draw() {
      var c = current;
      var f = window.Chart.frame(stage, {
        fixedHeight: 250,
        margin: { top: 26, right: 24, bottom: 40, left: 170 },
        title: 'Cross-validated performance after damage and repair'
      });

      var rows = [
        { k: 'Undamaged reference', v: c.clean ? c.clean.acc : 0, c: 'var(--ok)' },
        { k: 'After your choices', v: c.result ? c.result.acc : 0, c: 'var(--clinical)' },
        { k: 'Balanced accuracy', v: c.result ? c.result.balanced : 0, c: 'var(--stage-2)' },
        { k: 'Recall on malignant', v: c.result ? c.result.recall : 0, c: 'var(--cat-2)' }
      ];

      var x = d3.scaleLinear().domain([0.4, 1]).range([0, f.w]);
      var y = d3.scaleBand().domain(rows.map(function (r) { return r.k; }))
        .range([0, f.h]).padding(0.3);

      f.g.selectAll('line.grid-line').data(x.ticks(6)).join('line')
        .attr('class', 'grid-line')
        .attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', f.h);

      if (c.clean) {
        f.g.append('line')
          .attr('x1', x(c.clean.acc)).attr('x2', x(c.clean.acc))
          .attr('y1', -6).attr('y2', f.h)
          .attr('stroke', 'var(--ok)').attr('stroke-width', 1.3)
          .attr('stroke-dasharray', '4 3');
      }

      f.g.selectAll('rect.b').data(rows).join('rect')
        .attr('class', 'b')
        .attr('x', x(0.4))
        .attr('y', function (d) { return y(d.k); })
        .attr('width', function (d) { return Math.max(0, x(d.v) - x(0.4)); })
        .attr('height', y.bandwidth())
        .attr('fill', function (d) { return d.c; })
        .attr('rx', 3);

      f.g.selectAll('text.v').data(rows).join('text')
        .attr('class', 'v')
        .attr('x', function (d) { return x(d.v) + 7; })
        .attr('y', function (d) { return y(d.k) + y.bandwidth() / 2 + 4; })
        .style('font-size', '11.5px').style('font-weight', '700')
        .style('font-family', 'var(--mono)').attr('fill', 'var(--ink)')
        .text(function (d) { return (d.v * 100).toFixed(1) + '%'; });

      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0));
      f.g.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('.0%')));
      f.g.append('text').attr('class', 'axis-label')
        .attr('x', f.w / 2).attr('y', f.h + 34).attr('text-anchor', 'middle')
        .text('5-fold cross-validated score (scaler and resampler fitted inside each fold)');
    }

    function updateMetrics() {
      var c = current;
      if (!c.result) {
        window.UI.setMetric('dq-acc', 'n/a', 'too little data left', 'bad');
        return;
      }
      var delta = c.result.acc - c.clean.acc;
      window.UI.setMetric('dq-acc', window.Chart.pct(c.result.acc),
        '± ' + (c.result.accSd * 100).toFixed(1) + ' across folds');
      window.UI.setMetric('dq-delta',
        (delta >= 0 ? '+' : '') + (delta * 100).toFixed(1) + ' pts',
        'against the undamaged data',
        delta < -0.03 ? 'bad' : (delta > -0.01 ? 'good' : null));
      window.UI.setMetric('dq-rows', String(c.repaired.keptRows),
        c.repaired.dropped ? c.repaired.dropped + ' rows dropped as incomplete'
                           : 'rows available to the model');
      var mal = c.repaired.y ? 0 : 0;
      var counts = {};
      c.repaired.y.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
      window.UI.setMetric('dq-counts',
        (counts.malignant || 0) + ' / ' + (counts.benign || 0),
        'malignant / benign remaining');
      window.UI.setMetric('dq-recall', window.Chart.pct(c.result.recall),
        'malignant cases caught',
        c.result.recall < 0.85 ? 'bad' : 'good');
    }

    function updateExplain() {
      var c = current;
      var el = host.querySelector('[data-viz-note]');
      var parts = [];

      if (!c.result) {
        el.innerHTML = '<p class="mb0">Your choices have left too few rows or ' +
          'too few classes to fit a model. Complete-case analysis with heavy ' +
          'missingness does this quickly, which is itself the lesson.</p>';
        return;
      }

      var delta = c.result.acc - c.clean.acc;

      if (state.impute === 'drop' && c.repaired.dropped > 0) {
        parts.push('Complete-case analysis discarded <strong>' +
          c.repaired.dropped + ' rows</strong>. With ' + state.missing +
          '% of cells missing across ten columns, the chance of a row surviving ' +
          'intact is small, which is why dropping incomplete rows is far more ' +
          'destructive than it sounds.');
      }

      if (state.mechanism === 'mnar' && state.impute !== 'drop') {
        parts.push('Missingness here is <strong>not at random</strong>: the ' +
          'largest values are the ones that disappear, in the way that the ' +
          'sickest participants are the ones who miss an appointment. Imputing ' +
          'with the median of the observed values therefore fills the gaps with ' +
          'systematically low numbers, and the model learns a biased picture. ' +
          'No imputation method can fix this, because the information was never ' +
          'recorded.');
      }

      if (state.indicator) {
        parts.push('The missingness indicator columns are doing real work: the ' +
          'fact that a value is absent is informative here, and giving the model ' +
          'access to it recovers some of what imputation destroyed.');
      }

      if (!state.scale) {
        parts.push('<strong>Scaling is off.</strong> Nuclear area is measured in ' +
          'the hundreds and smoothness around 0.1, so the gradient-based fit is ' +
          'dominated by whichever feature happens to have the largest units. ' +
          'Turn scaling on and watch the accuracy move.');
      }

      if (state.imbalance > 50 && state.balance === 'none') {
        parts.push('With the malignant class reduced by ' + state.imbalance +
          '%, overall accuracy is flattering: predicting benign for everyone ' +
          'would already score highly. Compare the balanced accuracy and the ' +
          'recall on malignant, which are the numbers that would matter clinically.');
      }

      if (state.balance === 'over') {
        parts.push('Random oversampling duplicates minority rows inside each ' +
          'training fold. It improves recall on the minority class and it does ' +
          'not create information, so treat any large gain with suspicion.');
      }

      if (!parts.length) {
        parts.push('These settings cost ' + Math.abs(delta * 100).toFixed(1) +
          ' percentage points against the undamaged reference. Increase the ' +
          'missingness, switch the mechanism to "not at random", or turn scaling ' +
          'off, and watch which of the three does the most damage.');
      }

      el.innerHTML = parts.map(function (p) { return '<p>' + p + '</p>'; })
        .join('').replace(/<p>([^]*)<\/p>$/, '<p class="mb0">$1</p>');
    }

    function updateAlt() {
      var c = current;
      altBody.innerHTML =
        '<p>The chart is a horizontal bar chart with four bars comparing ' +
        'cross-validated performance. The data is the real WDBC dataset, ' +
        'restricted to its ten "mean" features, into which a known amount of ' +
        'damage has been injected: ' + state.missing + '% of cells missing under ' +
        'a ' + (state.mechanism === 'mcar' ? 'missing-completely-at-random' :
                'missing-not-at-random') + ' mechanism, ' + state.outliers +
        '% of cells corrupted into extreme outliers, and ' + state.imbalance +
        '% of malignant rows removed. The repairs currently applied are: ' +
        'imputation by ' + state.impute + ', missingness indicators ' +
        (state.indicator ? 'on' : 'off') + ', outlier removal ' +
        (state.removeOutliers ? 'on' : 'off') + ', scaling ' +
        (state.scale ? 'on' : 'off') + ', class balancing set to ' +
        state.balance + '.</p>' +
        (c.result ? window.UI.altTable(
          'Five-fold cross-validated scores.',
          ['Measure', 'Value'],
          [['Undamaged reference accuracy', window.Chart.pct(c.clean.acc)],
           ['Accuracy after damage and repair', window.Chart.pct(c.result.acc)],
           ['Standard deviation across folds', (c.result.accSd * 100).toFixed(2) + ' pts'],
           ['Balanced accuracy', window.Chart.pct(c.result.balanced)],
           ['Recall on the malignant class', window.Chart.pct(c.result.recall)],
           ['Rows available to the model', String(c.repaired.keptRows)],
           ['Rows dropped as incomplete', String(c.repaired.dropped)]])
          : '<p>Too few rows or classes remain to fit a model with the current ' +
            'settings.</p>');
    }

    function refresh() {
      run(); draw(); updateMetrics(); updateExplain(); updateAlt();
    }

    /* Controls */
    [['dq-missing', 'missing'], ['dq-outliers', 'outliers'],
     ['dq-imbalance', 'imbalance']].forEach(function (p) {
      var el = host.querySelector('#' + p[0]);
      el.addEventListener('input', function () {
        state[p[1]] = +this.value;
        host.querySelector('#' + p[0] + '-val').textContent = this.value + '%';
        refresh();
      });
    });

    window.UI.onSegment(host.querySelector('#dq-mechanism'), function (v) {
      state.mechanism = v; refresh();
    });
    window.UI.onSegment(host.querySelector('#dq-balance'), function (v) {
      state.balance = v; refresh();
    });
    host.querySelector('#dq-impute').addEventListener('change', function () {
      state.impute = this.value; refresh();
    });
    ['indicator', 'removeOutliers', 'scale'].forEach(function (k) {
      var id = 'dq-' + k.toLowerCase();
      var el = host.querySelector('#' + id);
      if (el) el.addEventListener('change', function () {
        state[k] = this.checked; refresh();
      });
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { missing: 15, mechanism: 'mnar', outliers: 5, imbalance: 0,
                impute: 'median', indicator: false, removeOutliers: false,
                scale: true, balance: 'none' };
      host.querySelector('#dq-missing').value = 15;
      host.querySelector('#dq-missing-val').textContent = '15%';
      host.querySelector('#dq-outliers').value = 5;
      host.querySelector('#dq-outliers-val').textContent = '5%';
      host.querySelector('#dq-imbalance').value = 0;
      host.querySelector('#dq-imbalance-val').textContent = '0%';
      host.querySelector('#dq-impute').value = 'median';
      host.querySelector('#dq-indicator').checked = false;
      host.querySelector('#dq-removeoutliers').checked = false;
      host.querySelector('#dq-scale').checked = true;
      ['#dq-mechanism', '#dq-balance'].forEach(function (sel) {
        var def = sel === '#dq-mechanism' ? 'mnar' : 'none';
        host.querySelectorAll(sel + ' button').forEach(function (b) {
          b.setAttribute('aria-pressed',
            String(b.getAttribute('data-value') === def));
        });
      });
      refresh();
    });

    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
