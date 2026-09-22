/* Week 10 - Random forest visualiser.
 *
 * A real forest is grown in the browser. The out-of-bag curve, the importances
 * and the accuracy are all measured from that forest. The correlated-feature
 * control is the pedagogically important one: it duplicates a strong feature
 * with a small amount of noise and shows the importance being split between the
 * two copies, which is the reason feature importance cannot carry a causal
 * claim.
 */
(function () {
  'use strict';

  window.Chart.register('viz-random-forest', function (host) {
    var D = window.WDBC;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var state = { nTrees: 60, maxDepth: 8, maxFeatures: 5, duplicate: false };

    var split, forest, single, report, oobCurve, names;

    function build() {
      names = D.features.slice();
      var X = D.X.map(function (r) { return r.slice(); });

      if (state.duplicate) {
        /* Duplicate the strongest feature three times with light noise, which
           is exactly what happens naturally when several columns measure the
           same underlying quantity. */
        var rng = new window.ML.Random(31);
        var src = D.features.indexOf('concave_points_worst');
        for (var c = 1; c <= 3; c++) {
          names.push('concave_points_worst_copy' + c);
          X = X.map(function (r, i) {
            return r.concat([D.X[i][src] * (1 + rng.normal() * 0.02)]);
          });
        }
      }

      split = window.ML.stratifiedSplit(X, D.y, 0.3, 42);

      forest = new window.ML.RandomForest({
        nTrees: state.nTrees, maxDepth: state.maxDepth,
        maxFeatures: state.maxFeatures, featureNames: names, seed: 42
      }).fit(split.train.X, split.train.y);

      single = new window.ML.DecisionTree({
        maxDepth: state.maxDepth, criterion: 'entropy', featureNames: names
      }).fit(split.train.X, split.train.y);

      report = window.ML.classReport(split.test.y,
        forest.predict(split.test.X), ['benign', 'malignant']);

      /* Accuracy against ensemble size, measured by re-voting with the first
         t trees rather than refitting, which is both correct and fast. */
      oobCurve = [];
      var votes = split.test.X.map(function () { return {}; });
      for (var t = 0; t < forest.trees.length; t++) {
        for (var i = 0; i < split.test.X.length; i++) {
          var p = forest.trees[t].predictOne(split.test.X[i]);
          votes[i][p] = (votes[i][p] || 0) + 1;
        }
        if (t === 0 || (t + 1) % Math.max(1, Math.round(forest.trees.length / 22)) === 0
            || t === forest.trees.length - 1) {
          var pred = votes.map(function (v) {
            return Object.keys(v).reduce(function (a, b) {
              return v[b] > v[a] ? b : a;
            });
          });
          oobCurve.push({ t: t + 1,
                          acc: window.ML.accuracy(split.test.y, pred) });
        }
      }
    }

    function draw() {
      var wide = stage.clientWidth > 700;
      var f = window.Chart.frame(stage, {
        height: wide ? 340 : 660,
        margin: { top: 26, right: 18, bottom: 46, left: 54 },
        title: 'Accuracy against ensemble size, and feature importances'
      });

      var panelW = wide ? (f.w - 48) / 2 : f.w;
      var panelH = wide ? f.h : (f.h - 64) / 2;

      /* ---- Panel 1: accuracy against number of trees ---- */
      var g1 = f.g.append('g');
      g1.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Held-out accuracy against number of trees');

      var x = d3.scaleLinear().domain([1, state.nTrees]).range([0, panelW]);
      var lo = Math.min(d3.min(oobCurve, function (d) { return d.acc; }),
                        window.ML.accuracy(split.test.y, single.predict(split.test.X)));
      var y = d3.scaleLinear().domain([lo - 0.02, 1]).range([panelH, 0]);

      g1.selectAll('line.grid-line').data(y.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
        .attr('y1', y).attr('y2', y);

      var singleAcc = window.ML.accuracy(split.test.y, single.predict(split.test.X));
      g1.append('line')
        .attr('x1', 0).attr('x2', panelW)
        .attr('y1', y(singleAcc)).attr('y2', y(singleAcc))
        .attr('stroke', 'var(--nucleus)').attr('stroke-width', 1.6)
        .attr('stroke-dasharray', '5 3');
      g1.append('text')
        .attr('x', panelW - 4).attr('y', y(singleAcc) - 6).attr('text-anchor', 'end')
        .style('font-size', '10px').attr('fill', 'var(--nucleus)')
        .text('one tree: ' + (singleAcc * 100).toFixed(1) + '%');

      g1.append('path').attr('fill', 'none')
        .attr('stroke', 'var(--specimen)').attr('stroke-width', 2.2)
        .attr('d', d3.line().x(function (d) { return x(d.t); })
                            .y(function (d) { return y(d.acc); })(oobCurve));

      var dots = g1.selectAll('circle').data(oobCurve).join('circle')
        .attr('cx', function (d) { return x(d.t); })
        .attr('cy', function (d) { return y(d.acc); })
        .attr('r', 3.2).attr('fill', 'var(--specimen)').attr('tabindex', 0);
      window.Chart.tips(dots, function (d) {
        return '<strong>' + d.t + ' trees</strong><br>held-out accuracy ' +
          (d.acc * 100).toFixed(2) + '%';
      });

      g1.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x).ticks(6));
      g1.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
      g1.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
        .text('trees in the ensemble');

      /* ---- Panel 2: importances ---- */
      var g2 = f.g.append('g').attr('transform',
        wide ? 'translate(' + (panelW + 48) + ',0)'
             : 'translate(0,' + (panelH + 64) + ')');
      g2.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Impurity-based feature importance, top 12');

      var imp = forest.importances.map(function (v, i) {
        return { name: names[i], v: v, copy: /_copy\d$/.test(names[i]) ||
                 names[i] === 'concave_points_worst' };
      }).sort(function (a, b) { return b.v - a.v; }).slice(0, 12);

      var x2 = d3.scaleLinear().domain([0, d3.max(imp, function (d) { return d.v; })])
        .nice().range([0, panelW - 130]);
      var y2 = d3.scaleBand().domain(imp.map(function (d) { return d.name; }))
        .range([0, panelH]).padding(0.22);

      var bars = g2.selectAll('rect').data(imp).join('rect')
        .attr('x', 130).attr('y', function (d) { return y2(d.name); })
        .attr('width', function (d) { return x2(d.v); })
        .attr('height', y2.bandwidth())
        .attr('fill', function (d) {
          return state.duplicate && d.copy ? 'var(--cat-2)' : 'var(--clinical)';
        }).attr('rx', 2).attr('tabindex', 0);

      window.Chart.tips(bars, function (d) {
        return '<strong>' + window.UI.esc(d.name.replace(/_/g, ' ')) +
          '</strong><br>importance ' + d.v.toFixed(4) +
          (state.duplicate && d.copy
            ? '<br><em>this feature and its copies measure the same thing</em>' : '');
      });

      g2.selectAll('text.lbl').data(imp).join('text')
        .attr('class', 'lbl')
        .attr('x', 124).attr('y', function (d) { return y2(d.name) + y2.bandwidth() / 2 + 3.5; })
        .attr('text-anchor', 'end').style('font-size', '9.5px')
        .attr('fill', 'var(--ink-2)')
        .text(function (d) {
          var n = d.name.replace(/_/g, ' ');
          return n.length > 22 ? n.slice(0, 21) + '.' : n;
        });

      g2.append('g').attr('class', 'axis')
        .attr('transform', 'translate(130,' + panelH + ')')
        .call(d3.axisBottom(x2).ticks(4));

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml(
        state.duplicate
          ? [{ label: 'the duplicated feature and its copies', colour: 'var(--cat-2)', symbol: 'square' },
             { label: 'other features', colour: 'var(--clinical)', symbol: 'square' },
             { label: 'a single tree, for comparison', colour: 'var(--nucleus)', symbol: 'line' }]
          : [{ label: 'feature importance', colour: 'var(--clinical)', symbol: 'square' },
             { label: 'a single tree, for comparison', colour: 'var(--nucleus)', symbol: 'line' }]));
    }

    function updateMetrics() {
      var singleAcc = window.ML.accuracy(split.test.y, single.predict(split.test.X));
      window.UI.setMetric('rf-acc', window.Chart.pct(report.accuracy),
        state.nTrees + ' trees, held out',
        report.accuracy > singleAcc ? 'good' : null);
      window.UI.setMetric('rf-single', window.Chart.pct(singleAcc),
        'a single tree at the same depth');
      window.UI.setMetric('rf-oob',
        forest.oobScore == null ? 'n/a' : window.Chart.pct(forest.oobScore),
        'out-of-bag estimate, no extra data needed');
      window.UI.setMetric('rf-f1', window.Chart.num(report.macroF1),
        'macro-averaged F1');
      window.UI.setMetric('rf-recall', window.Chart.pct(report.per[1].recall),
        'malignant cases caught',
        report.per[1].recall >= 0.9 ? 'good' : 'bad');
    }

    function updateExplain() {
      var el = host.querySelector('[data-viz-note]');
      var parts = [];
      var singleAcc = window.ML.accuracy(split.test.y, single.predict(split.test.X));

      if (state.duplicate) {
        var imp = forest.importances.map(function (v, i) {
          return { name: names[i], v: v };
        });
        var group = imp.filter(function (d) {
          return d.name.indexOf('concave_points_worst') === 0;
        });
        var total = group.reduce(function (s, d) { return s + d.v; }, 0);
        parts.push('<strong>The strongest feature has been duplicated three ' +
          'times with 2% noise.</strong> The four near-identical columns now ' +
          'score ' + group.map(function (d) { return d.v.toFixed(3); }).join(', ') +
          ', summing to ' + total.toFixed(3) + '. Individually each looks ' +
          'moderate; collectively they dominate. Nothing about the biology ' +
          'changed, and the accuracy barely moved. If you had read the ' +
          'importance table without knowing the columns were duplicates, you ' +
          'would have concluded that this measurement was less important than it ' +
          'is. Real biological data is full of correlated measurements, which is ' +
          'why importance rankings need to be read alongside a correlation ' +
          'matrix, and why they are not a causal claim under any circumstances.');
      }

      if (state.maxFeatures >= 25) {
        parts.push('With ' + state.maxFeatures + ' features considered at every ' +
          'split, the trees are nearly deterministic and therefore nearly ' +
          'identical, so averaging them buys very little. Reduce the number ' +
          'towards the square root of the feature count, which is about 5 or 6 ' +
          'here, and watch the ensemble start to outperform its members. This is ' +
          'the whole reason a random forest is not just bagged trees.');
      }

      if (!parts.length) {
        var plateau = oobCurve.filter(function (d) { return d.t >= 25; });
        parts.push('The ensemble reaches ' + window.Chart.pct(report.accuracy) +
          ' against ' + window.Chart.pct(singleAcc) + ' for a single tree of the ' +
          'same depth, and the curve flattens well before ' + state.nTrees +
          ' trees. Extra trees past that point cost time and buy nothing: a ' +
          'random forest cannot be overfitted by adding members, but it cannot ' +
          'be improved by them indefinitely either. The out-of-bag estimate of ' +
          (forest.oobScore == null ? 'n/a' : window.Chart.pct(forest.oobScore)) +
          ' comes free, because roughly a third of samples are omitted from ' +
          'each bootstrap and can be used to score the trees that did not see ' +
          'them.');
      }

      el.innerHTML = parts.map(function (p) { return '<p>' + p + '</p>'; }).join('')
        .replace(/<p>((?:(?!<p>)[\s\S])*)<\/p>$/, '<p class="mb0">$1</p>');
    }

    function updateAlt() {
      var imp = forest.importances.map(function (v, i) {
        return { name: names[i], v: v };
      }).sort(function (a, b) { return b.v - a.v; }).slice(0, 12);

      altBody.innerHTML =
        '<p>Two panels. The first plots held-out accuracy against the number of ' +
        'trees in the ensemble, with a dashed reference line for a single tree ' +
        'of the same depth. The second is a horizontal bar chart of the twelve ' +
        'largest impurity-based feature importances.</p>' +
        '<p>The forest has ' + state.nTrees + ' trees, maximum depth ' +
        state.maxDepth + ', and considers ' + state.maxFeatures +
        ' randomly chosen features at each split. It is fitted to a 70/30 ' +
        'stratified split of the real WDBC data' +
        (state.duplicate ? ', with the strongest feature duplicated three times ' +
          'with 2% noise added' : '') + '.</p>' +
        window.UI.altTable('Accuracy as trees are added.',
          ['Trees', 'Held-out accuracy'],
          oobCurve.map(function (d) {
            return [String(d.t), (d.acc * 100).toFixed(2) + '%'];
          })) +
        window.UI.altTable('The twelve largest feature importances.',
          ['Feature', 'Importance'],
          imp.map(function (d) {
            return [d.name.replace(/_/g, ' '), d.v.toFixed(4)];
          })) +
        window.Chart.confusionHtml(report) +
        window.Chart.reportHtml(report) +
        '<p>Impurity-based importance is biased towards continuous and ' +
        'high-cardinality features, and it divides credit arbitrarily between ' +
        'correlated ones. Permutation importance measured on held-out data is ' +
        'more trustworthy. Neither is evidence of causation.</p>';
    }

    function refresh() { build(); draw(); updateMetrics(); updateExplain(); updateAlt(); }

    [['rf-trees', 'nTrees'], ['rf-depth', 'maxDepth'],
     ['rf-features', 'maxFeatures']].forEach(function (p) {
      host.querySelector('#' + p[0]).addEventListener('input', function () {
        state[p[1]] = +this.value;
        host.querySelector('#' + p[0] + '-val').textContent = this.value;
        refresh();
      });
    });
    host.querySelector('#rf-duplicate').addEventListener('change', function () {
      state.duplicate = this.checked; refresh();
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { nTrees: 60, maxDepth: 8, maxFeatures: 5, duplicate: false };
      host.querySelector('#rf-trees').value = 60;
      host.querySelector('#rf-trees-val').textContent = '60';
      host.querySelector('#rf-depth').value = 8;
      host.querySelector('#rf-depth-val').textContent = '8';
      host.querySelector('#rf-features').value = 5;
      host.querySelector('#rf-features-val').textContent = '5';
      host.querySelector('#rf-duplicate').checked = false;
      refresh();
    });

    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
