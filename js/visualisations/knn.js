/* Week 8 - "Who is biologically similar?"
 *
 * The controls deliberately separate the two things that decide a
 * nearest-neighbour result: the classifier settings (k, metric, weighting) and
 * the representation (which features it measures distance in). Holding one
 * fixed while changing the other is the experiment the week is built around.
 */
(function () {
  'use strict';

  window.Chart.register('viz-knn', function (host) {
    var D = window.WDBC;
    var S = window.SEQUENCES;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var REPS = {
      'wdbc-raw': {
        label: 'WDBC, 30 features, unscaled',
        classes: ['benign', 'malignant'],
        build: function () {
          return { X: D.X, y: D.y, names: D.features };
        }
      },
      'wdbc-scaled': {
        label: 'WDBC, 30 features, standardised',
        classes: ['benign', 'malignant'],
        build: function () {
          return { X: new window.ML.Scaler().fitTransform(D.X), y: D.y,
                   names: D.features };
        }
      },
      'wdbc-noise': {
        label: 'WDBC standardised, plus 60 irrelevant noise features',
        classes: ['benign', 'malignant'],
        build: function () {
          var rng = new window.ML.Random(5);
          var Z = new window.ML.Scaler().fitTransform(D.X);
          return {
            X: Z.map(function (r) {
              var extra = [];
              for (var j = 0; j < 60; j++) extra.push(rng.normal());
              return r.concat(extra);
            }),
            y: D.y, names: D.features
          };
        }
      },
      'prot-eng': {
        label: 'Proteins, engineered features (composition + biophysics)',
        classes: null,
        build: function () {
          return { X: S.records.map(function (r) { return r.eng24; }),
                   y: currentProteinLabels(), names: S.engineeredFeatures };
        }
      },
      'prot-emb': {
        label: 'Proteins, learned embedding',
        classes: null,
        build: function () {
          return { X: S.records.map(function (r) { return r.emb32; }),
                   y: currentProteinLabels(), names: null };
        }
      }
    };

    var state = { rep: 'wdbc-scaled', k: 5, metric: 'euclidean',
                  weighted: false, task: 'family', selected: null };

    function currentProteinLabels() {
      return S.records.map(function (r) {
        return state.task === 'family' ? r.family
          : (r.hasSite ? 'triad present' : 'triad absent');
      });
    }

    var data, model, report, kCurve;

    function build() {
      data = REPS[state.rep].build();
      model = new window.ML.KNN({ k: state.k, metric: state.metric,
                                  weighted: state.weighted }).fit(data.X, data.y);

      /* Leave-one-out on the training set, which is the honest way to score a
         lazy learner without holding data back from the plot. */
      var pred = model.predictLoo();
      var cls = Array.from(new Set(data.y)).sort();
      report = window.ML.classReport(data.y, pred, cls);

      /* Accuracy against k, measured. */
      kCurve = [];
      [1, 3, 5, 7, 9, 15, 21, 31, 51].forEach(function (k) {
        var m = new window.ML.KNN({ k: k, metric: state.metric,
                                    weighted: state.weighted }).fit(data.X, data.y);
        kCurve.push({ k: k, acc: window.ML.accuracy(data.y, m.predictLoo()) });
      });
    }

    function draw() {
      var wide = stage.clientWidth > 700;
      var f = window.Chart.frame(stage, {
        height: wide ? 320 : 620,
        margin: { top: 26, right: 18, bottom: 46, left: 54 },
        title: 'Accuracy against k, and the neighbours of the selected sample'
      });

      var panelW = wide ? (f.w - 48) / 2 : f.w;
      var panelH = wide ? f.h : (f.h - 64) / 2;

      /* ---- Panel 1: accuracy against k ---- */
      var g1 = f.g.append('g');
      g1.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Leave-one-out accuracy against k');

      var x = d3.scaleLog().domain([1, 51]).range([0, panelW]);
      var lo = Math.min(0.85, d3.min(kCurve, function (d) { return d.acc; }) - 0.04);
      var y = d3.scaleLinear().domain([Math.max(0.3, lo), 1]).range([panelH, 0]);

      g1.selectAll('line.grid-line').data(y.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
        .attr('y1', y).attr('y2', y);

      g1.append('path').attr('fill', 'none')
        .attr('stroke', 'var(--clinical)').attr('stroke-width', 2.2)
        .attr('d', d3.line().x(function (d) { return x(d.k); })
                            .y(function (d) { return y(d.acc); })(kCurve));

      var dots = g1.selectAll('circle').data(kCurve).join('circle')
        .attr('cx', function (d) { return x(d.k); })
        .attr('cy', function (d) { return y(d.acc); })
        .attr('r', function (d) { return d.k === state.k ? 6.5 : 4; })
        .attr('fill', function (d) {
          return d.k === state.k ? 'var(--cat-2)' : 'var(--clinical)';
        })
        .attr('stroke', '#fff').attr('stroke-width', 1.4)
        .attr('tabindex', 0);

      window.Chart.tips(dots, function (d) {
        return '<strong>k = ' + d.k + '</strong><br>accuracy ' +
          (d.acc * 100).toFixed(2) + '%';
      });

      g1.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x).tickValues([1, 3, 5, 9, 21, 51])
          .tickFormat(d3.format('d')));
      g1.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
      g1.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
        .text('k (log scale)');

      /* ---- Panel 2: the neighbourhood of one sample, in 2-D ---- */
      var g2 = f.g.append('g').attr('transform',
        wide ? 'translate(' + (panelW + 48) + ',0)'
             : 'translate(0,' + (panelH + 64) + ')');
      g2.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Where the selected sample sits, and who its neighbours are');

      /* Project to two dimensions purely for display. */
      var p = new window.ML.PCA(2).fit(data.X);
      var xy = p.transform(data.X);
      var cls = report.classes;

      var x2 = d3.scaleLinear().domain(d3.extent(xy, function (q) { return q[0]; }))
        .nice().range([0, panelW]);
      var y2 = d3.scaleLinear().domain(d3.extent(xy, function (q) { return q[1]; }))
        .nice().range([panelH, 0]);

      if (state.selected == null) state.selected = 0;
      var sel = Math.min(state.selected, data.X.length - 1);
      var nb = model.neighbours(data.X[sel], state.k, sel);
      var nbSet = {};
      nb.forEach(function (n) { nbSet[n.i] = true; });

      /* Links from the query point to its neighbours. */
      nb.forEach(function (n) {
        g2.append('line')
          .attr('x1', x2(xy[sel][0])).attr('y1', y2(xy[sel][1]))
          .attr('x2', x2(xy[n.i][0])).attr('y2', y2(xy[n.i][1]))
          .attr('stroke', n.y === data.y[sel] ? 'var(--ok)' : 'var(--danger)')
          .attr('stroke-width', 1.4).attr('opacity', 0.7);
      });

      var pts = g2.append('g');
      data.y.forEach(function (c, i) {
        var ci = cls.indexOf(c);
        var isSel = i === sel, isNb = nbSet[i];
        window.Chart.symbol(pts, window.Chart.SYMBOLS[ci],
          x2(xy[i][0]), y2(xy[i][1]),
          isSel ? 8 : (isNb ? 5.5 : 2.8),
          window.Chart.colour(ci),
          { opacity: isSel || isNb ? 1 : 0.28,
            stroke: isSel ? 'var(--ink)' : (isNb ? '#fff' : null),
            strokeWidth: isSel ? 2.5 : 1.4 })
          .attr('data-i', i).attr('tabindex', isNb || isSel ? 0 : -1)
          .style('cursor', 'pointer');
      });

      pts.selectAll('[data-i]')
        .on('click', function () {
          state.selected = +this.getAttribute('data-i');
          draw(); showNeighbours();
        })
        .on('mousemove', function (event) {
          var i = +this.getAttribute('data-i');
          window.UI.tip('<strong>sample ' + i + '</strong><br>' +
            window.UI.esc(data.y[i]) + '<br><em>click to make this the query</em>',
            event.clientX, event.clientY);
        })
        .on('mouseleave', function () { window.UI.tip(null); });

      g2.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x2).ticks(5));
      g2.append('g').attr('class', 'axis').call(d3.axisLeft(y2).ticks(5));
      g2.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
        .text('PCA of the current representation, for display only');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml(
        cls.map(function (c, i) {
          return { label: c, colour: window.Chart.colour(i),
                   symbol: window.Chart.SYMBOLS[i] };
        }).concat([
          { label: 'neighbour with the same label', colour: 'var(--ok)', symbol: 'line' },
          { label: 'neighbour with a different label', colour: 'var(--danger)', symbol: 'line' }
        ])));
    }

    function showNeighbours() {
      var sel = Math.min(state.selected || 0, data.X.length - 1);
      var nb = model.neighbours(data.X[sel], state.k, sel);
      var votes = {};
      nb.forEach(function (n) {
        var w = state.weighted ? 1 / (n.d * n.d + 1e-9) : 1;
        votes[n.y] = (votes[n.y] || 0) + w;
      });
      var pred = Object.keys(votes).reduce(function (a, b) {
        return votes[b] > votes[a] ? b : a;
      });

      host.querySelector('[data-knn-detail]').innerHTML =
        '<h4 style="margin-top:0">Query: sample ' + sel + ', truly <strong>' +
          window.UI.esc(data.y[sel]) + '</strong></h4>' +
        '<div class="table-scroll"><table class="table-compact">' +
          '<caption>The ' + state.k + ' nearest neighbours under ' +
          window.UI.esc(state.metric) + ' distance' +
          (state.weighted ? ', distance-weighted' : '') + '.</caption>' +
          '<thead><tr><th scope="col">rank</th><th scope="col">sample</th>' +
          '<th scope="col">label</th><th class="num" scope="col">distance</th>' +
          '<th class="num" scope="col">vote weight</th></tr></thead><tbody>' +
        nb.map(function (n, i) {
          var same = n.y === data.y[sel];
          var w = state.weighted ? 1 / (n.d * n.d + 1e-9) : 1;
          return '<tr' + (same ? '' : ' style="background:var(--danger-soft)"') + '>' +
            '<td class="num">' + (i + 1) + '</td>' +
            '<th scope="row">' + n.i + '</th>' +
            '<td>' + window.UI.esc(n.y) + '</td>' +
            '<td class="num">' + n.d.toFixed(3) + '</td>' +
            '<td class="num">' + w.toFixed(3) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="' + (pred === data.y[sel] ? '' : 'mb0') + '">' +
          '<strong>Predicted: ' + window.UI.esc(pred) + '.</strong> ' +
          (pred === data.y[sel] ? 'Correct.' :
            'Wrong. The neighbourhood is dominated by the other class, which is ' +
            'what a nearest-neighbour error looks like from the inside.') +
        '</p>';
    }

    function updateMetrics() {
      window.UI.setMetric('kn-acc', window.Chart.pct(report.accuracy),
        'leave-one-out over ' + data.X.length + ' samples',
        report.accuracy > 0.9 ? 'good' : (report.accuracy < 0.6 ? 'bad' : null));
      window.UI.setMetric('kn-f1', window.Chart.num(report.macroF1),
        'macro-averaged F1');
      var best = kCurve.reduce(function (a, b) { return b.acc > a.acc ? b : a; });
      window.UI.setMetric('kn-bestk', 'k = ' + best.k,
        'best k here, at ' + window.Chart.pct(best.acc));
      window.UI.setMetric('kn-dims', String(data.X[0].length) + ' dims',
        'dimensionality of the current representation');
    }

    function updateExplain() {
      var el = host.querySelector('[data-viz-note]');
      var msg;

      if (state.rep === 'wdbc-raw') {
        var scaled = new window.ML.KNN({ k: state.k, metric: state.metric })
          .fit(new window.ML.Scaler().fitTransform(D.X), D.y);
        var sAcc = window.ML.accuracy(D.y, scaled.predictLoo());
        msg = '<strong>This representation is unscaled.</strong> Nuclear area ' +
          'runs to about 2,500 while smoothness sits around 0.1, so the ' +
          'Euclidean distance is essentially the difference in area and every ' +
          'other measurement is noise around it. Accuracy is ' +
          window.Chart.pct(report.accuracy) + ' here against ' +
          window.Chart.pct(sAcc) + ' with standardisation, using the same k and ' +
          'the same metric. Scaling is not a formality for distance-based methods.';
      } else if (state.rep === 'wdbc-noise') {
        var clean = new window.ML.KNN({ k: state.k, metric: state.metric })
          .fit(new window.ML.Scaler().fitTransform(D.X), D.y);
        var cAcc = window.ML.accuracy(D.y, clean.predictLoo());
        msg = '<strong>Sixty pure-noise features have been added.</strong> They ' +
          'carry no information whatsoever, and accuracy has fallen from ' +
          window.Chart.pct(cAcc) + ' to ' + window.Chart.pct(report.accuracy) +
          '. Every irrelevant dimension contributes to every distance, so the ' +
          'genuine signal is progressively drowned. A decision tree would be ' +
          'largely unaffected, because it can decline to split on a feature. ' +
          'k-NN has no such option, and this is the sharpest reason a good ' +
          'representation matters more here than almost anywhere else.';
      } else if (state.rep.indexOf('prot') === 0) {
        var other = state.rep === 'prot-eng' ? 'prot-emb' : 'prot-eng';
        var od = REPS[other].build();
        var om = new window.ML.KNN({ k: state.k, metric: state.metric,
                                     weighted: state.weighted }).fit(od.X, od.y);
        var oAcc = window.ML.accuracy(od.y, om.predictLoo());
        msg = 'The classifier is identical in both arms: k-NN at k = ' + state.k +
          ' with ' + state.metric + ' distance. Only the representation differs. ' +
          'The current one gives ' + window.Chart.pct(report.accuracy) +
          ' and the other gives ' + window.Chart.pct(oAcc) + '. ';
        if (state.task === 'family') {
          msg += 'On the family task the engineered features win or tie, because ' +
            'the families differ in composition and composition is exactly what ' +
            'those features measure.';
        } else {
          msg += 'On the triad task the two classes have identical composition by ' +
            'construction, so the engineered representation cannot exceed chance ' +
            'however you tune the classifier. Only a representation that encodes ' +
            'residue order has anything to work with.';
        }
      } else {
        var best = kCurve.reduce(function (a, b) { return b.acc > a.acc ? b : a; });
        msg = 'Accuracy peaks around k = ' + best.k + ' and declines at large k. ' +
          'Small k gives a flexible boundary that follows noise; large k smooths ' +
          'it until the model approaches predicting the majority class ' +
          'everywhere. Note that this curve is leave-one-out on the whole ' +
          'dataset, which is appropriate for a lazy learner but is still an ' +
          'internal estimate: it says nothing about a different cohort.';
      }

      el.innerHTML = '<p class="mb0">' + msg + '</p>';
    }

    function updateAlt() {
      var rows = [];
      Object.keys(REPS).forEach(function (key) {
        var d = REPS[key].build();
        var m = new window.ML.KNN({ k: 5, metric: 'euclidean' }).fit(d.X, d.y);
        var acc = window.ML.accuracy(d.y, m.predictLoo());
        rows.push([REPS[key].label, String(d.X[0].length),
                   (acc * 100).toFixed(1) + '%']);
      });

      altBody.innerHTML =
        '<p>Two panels. The first plots leave-one-out accuracy against k on a ' +
        'logarithmic axis for the current representation and metric. The second ' +
        'is a PCA scatter plot of the same representation, used only for display, ' +
        'with the query sample enlarged and lines drawn to its k nearest ' +
        'neighbours; green lines go to neighbours with the same label and red ' +
        'lines to neighbours with a different one.</p>' +
        window.UI.altTable(
          'Accuracy against k for the current representation (' +
          REPS[state.rep].label + ') and metric (' + state.metric + ').',
          ['k', 'Leave-one-out accuracy'],
          kCurve.map(function (c) {
            return [String(c.k), (c.acc * 100).toFixed(2) + '%'];
          })) +
        window.UI.altTable(
          'Every representation compared under an identical classifier: k-NN, ' +
          'k = 5, Euclidean distance. Protein tasks use the ' +
          (state.task === 'family' ? 'family' : 'ordered-triad') + ' label.',
          ['Representation', 'Dimensions', 'Accuracy'], rows) +
        window.Chart.confusionHtml(report) +
        window.Chart.reportHtml(report);
    }

    function refresh() {
      build(); draw(); showNeighbours();
      updateMetrics(); updateExplain(); updateAlt();
    }

    host.querySelector('#kn-rep').addEventListener('change', function () {
      state.rep = this.value; state.selected = 0;
      host.querySelector('[data-knn-task]').hidden = this.value.indexOf('prot') !== 0;
      refresh();
    });
    host.querySelector('#kn-k').addEventListener('input', function () {
      state.k = +this.value;
      host.querySelector('#kn-k-val').textContent = this.value;
      refresh();
    });
    host.querySelector('#kn-metric').addEventListener('change', function () {
      state.metric = this.value; refresh();
    });
    host.querySelector('#kn-weighted').addEventListener('change', function () {
      state.weighted = this.checked; refresh();
    });
    window.UI.onSegment(host.querySelector('#kn-task'), function (v) {
      state.task = v; state.selected = 0; refresh();
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { rep: 'wdbc-scaled', k: 5, metric: 'euclidean',
                weighted: false, task: 'family', selected: 0 };
      host.querySelector('#kn-rep').value = 'wdbc-scaled';
      host.querySelector('#kn-k').value = 5;
      host.querySelector('#kn-k-val').textContent = '5';
      host.querySelector('#kn-metric').value = 'euclidean';
      host.querySelector('#kn-weighted').checked = false;
      host.querySelector('[data-knn-task]').hidden = true;
      refresh();
    });

    host.querySelector('[data-knn-task]').hidden = true;
    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
