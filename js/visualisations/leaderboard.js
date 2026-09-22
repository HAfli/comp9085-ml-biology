/* Week 10 - Classical ML versus foundation models leaderboard.
 *
 * The table is sortable by any column, and the columns deliberately include the
 * things that decide whether a model gets deployed: labelled-data requirement,
 * compute, interpretability and validation burden. Sorting by accuracy and then
 * by any other column is the entire argument of the week.
 *
 * Provenance is marked per row. Rows measured on the real WDBC data by
 * data/scripts/02_build_benchmarks.py are marked as measured; rows describing
 * foundation-model pipelines are marked as not applicable to this dataset, or
 * as illustrative, and are never presented as measured results.
 */
(function () {
  'use strict';

  window.Chart.register('viz-leaderboard', function (host) {
    var B = window.BENCHMARKS;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    /* Rows built from the real measured benchmark file, plus honestly-labelled
       rows for the pipelines that cannot be measured on this dataset. */
    function rows() {
      var m = B.models;
      var out = [
        row('baseline_majority', 'Always predict benign', 'baseline', 0, 1, 5,
            'None. It is the number every other row has to beat.'),
        row('gnb', 'Gaussian naive Bayes', 'classical', 1, 1, 5,
            'Fast, transparent, and assumes features are conditionally independent, which they are not.'),
        row('tree_d3', 'Decision tree, depth 3', 'classical', 1, 1, 5,
            'Readable as a clinical rule. Three questions and a diagnosis.'),
        row('tree_full', 'Decision tree, unpruned', 'classical', 1, 1, 4,
            'Readable in principle, too large to read in practice.'),
        row('knn5_raw', 'k-NN, k=5, unscaled', 'classical', 2, 1, 3,
            'The unscaled version is here to show what forgetting to standardise costs.'),
        row('knn5', 'k-NN, k=5, standardised', 'classical', 2, 1, 3,
            'No training at all; all the cost is at prediction time.'),
        row('logreg', 'Logistic regression', 'classical', 1, 1, 5,
            'Coefficients are interpretable and it is easy to calibrate. Often the right answer.'),
        row('pca10_logreg', 'PCA (10) + logistic regression', 'classical', 1, 1, 3,
            'Components are combinations of features, so interpretability drops even as accuracy rises.'),
        row('rf', 'Random forest, 500 trees', 'classical', 2, 2, 3,
            'Robust and low-maintenance. Feature importances, read with care.'),
        row('gb', 'Gradient boosting, 200 stages', 'classical', 2, 2, 3,
            'Usually the strongest tabular method, and the most sensitive to its hyperparameters.')
      ];

      out.push({
        key: 'fm-embed', label: 'Foundation-model embeddings + logistic regression',
        family: 'foundation', provenance: 'na',
        acc: null, f1: null, auc: null,
        data: 2, compute: 3, interp: 2,
        note: 'Not applicable to this dataset. WDBC is 30 hand-measured ' +
              'morphometric numbers, not a sequence, an image or text, and no ' +
              'pretrained model exists for it. Recognising that a foundation ' +
              'model has nothing to offer is a result, not a gap in the table.'
      });
      out.push({
        key: 'fm-ft', label: 'Fine-tuned foundation model',
        family: 'foundation', provenance: 'na',
        acc: null, f1: null, auc: null,
        data: 4, compute: 5, interp: 1,
        note: 'Not applicable, for the same reason, and it would additionally ' +
              'need a GPU and far more than 569 labelled examples to be ' +
              'anything other than an exercise in overfitting.'
      });

      return out;
    }

    function row(key, label, family, data, compute, interp, note) {
      var m = B.models[key];
      return {
        key: key, label: label, family: family, provenance: 'measured',
        acc: m.acc, accSd: m.acc_sd, f1: m.f1, auc: m.auc,
        data: data, compute: compute, interp: interp, note: note,
        time: m.fit_seconds_total
      };
    }

    var DATA_LABEL = ['', 'tens to hundreds', 'hundreds', 'thousands',
                      'tens of thousands', 'hundreds of thousands'];
    var COMPUTE_LABEL = ['', 'a laptop, instantly', 'a laptop, seconds',
                         'a laptop, minutes', 'a GPU, hours', 'a GPU, days'];
    var INTERP_LABEL = ['', 'opaque', 'very limited', 'partial',
                        'mostly readable', 'fully readable'];

    var state = { sort: 'acc', dir: -1 };
    var R = rows();

    function sorted() {
      var s = R.slice();
      s.sort(function (a, b) {
        var av = a[state.sort], bv = b[state.sort];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;      /* not-applicable rows sink */
        if (bv == null) return -1;
        return (av - bv) * state.dir;
      });
      return s;
    }

    function draw() {
      var data = sorted().filter(function (r) { return r.acc != null; });
      var f = window.Chart.frame(stage, {
        fixedHeight: Math.max(240, 40 + data.length * 26),
        margin: { top: 24, right: 60, bottom: 40, left: 210 },
        title: 'Cross-validated accuracy of each measured model on the real WDBC data'
      });

      var x = d3.scaleLinear().domain([0.55, 1]).range([0, f.w]);
      var y = d3.scaleBand().domain(data.map(function (d) { return d.label; }))
        .range([0, f.h]).padding(0.22);

      f.g.selectAll('line.grid-line').data(x.ticks(6)).join('line')
        .attr('class', 'grid-line').attr('x1', x).attr('x2', x)
        .attr('y1', 0).attr('y2', f.h);

      var base = R.filter(function (r) { return r.key === 'baseline_majority'; })[0];
      f.g.append('line')
        .attr('x1', x(base.acc)).attr('x2', x(base.acc))
        .attr('y1', -6).attr('y2', f.h)
        .attr('stroke', 'var(--danger)').attr('stroke-width', 1.4)
        .attr('stroke-dasharray', '4 3');
      f.g.append('text')
        .attr('x', x(base.acc)).attr('y', -10).attr('text-anchor', 'middle')
        .style('font-size', '10px').attr('fill', 'var(--danger)')
        .text('baseline');

      var bars = f.g.selectAll('rect.b').data(data).join('rect')
        .attr('class', 'b')
        .attr('x', x(0.55)).attr('y', function (d) { return y(d.label); })
        .attr('width', function (d) { return Math.max(1, x(d.acc) - x(0.55)); })
        .attr('height', y.bandwidth())
        .attr('fill', function (d) {
          return d.family === 'baseline' ? 'var(--cat-5)'
               : (d.family === 'foundation' ? 'var(--signal)' : 'var(--clinical)');
        })
        .attr('rx', 2).attr('tabindex', 0);

      /* Error bars: one standard deviation across the five folds. */
      f.g.selectAll('line.err').data(data).join('line')
        .attr('class', 'err')
        .attr('x1', function (d) { return x(Math.max(0.55, d.acc - (d.accSd || 0))); })
        .attr('x2', function (d) { return x(Math.min(1, d.acc + (d.accSd || 0))); })
        .attr('y1', function (d) { return y(d.label) + y.bandwidth() / 2; })
        .attr('y2', function (d) { return y(d.label) + y.bandwidth() / 2; })
        .attr('stroke', 'var(--ink)').attr('stroke-width', 1.2).attr('opacity', 0.65);

      window.Chart.tips(bars, function (d) {
        return '<strong>' + window.UI.esc(d.label) + '</strong><br>' +
          'accuracy ' + (d.acc * 100).toFixed(2) + '% ± ' +
          ((d.accSd || 0) * 100).toFixed(2) + '<br>' +
          'F1 ' + d.f1.toFixed(3) +
          (d.auc != null ? ', AUC ' + d.auc.toFixed(3) : '') + '<br>' +
          '<em>' + window.UI.esc(d.note) + '</em>';
      });

      f.g.selectAll('text.v').data(data).join('text')
        .attr('class', 'v')
        .attr('x', function (d) { return x(d.acc) + 7; })
        .attr('y', function (d) { return y(d.label) + y.bandwidth() / 2 + 4; })
        .style('font-size', '10.5px').style('font-family', 'var(--mono)')
        .style('font-weight', '650').attr('fill', 'var(--ink)')
        .text(function (d) { return (d.acc * 100).toFixed(1); });

      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0));
      f.g.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('.0%')));
      f.g.append('text').attr('class', 'axis-label')
        .attr('x', f.w / 2).attr('y', f.h + 34).attr('text-anchor', 'middle')
        .text('5-fold cross-validated accuracy, with one standard deviation');

      drawTable();
    }

    function drawTable() {
      var slot = host.querySelector('[data-lb-table]');
      var cols = [
        { k: 'label', t: 'Model', sortable: false },
        { k: 'acc', t: 'Accuracy' },
        { k: 'f1', t: 'F1' },
        { k: 'auc', t: 'ROC-AUC' },
        { k: 'data', t: 'Labels needed' },
        { k: 'compute', t: 'Compute' },
        { k: 'interp', t: 'Interpretability' }
      ];

      slot.innerHTML =
        '<div class="table-scroll"><table>' +
        '<caption>Every column is sortable. Sort by accuracy, then by ' +
        'interpretability, then by compute, and notice that the ordering ' +
        'changes completely. Choosing a model means deciding which of these ' +
        'columns you are optimising.</caption>' +
        '<thead><tr>' + cols.map(function (c) {
          if (c.sortable === false) return '<th scope="col">' + c.t + '</th>';
          var active = state.sort === c.k;
          return '<th scope="col" class="num" aria-sort="' +
            (active ? (state.dir === -1 ? 'descending' : 'ascending') : 'none') +
            '"><button type="button" class="btn btn-sm" data-sort="' + c.k + '" ' +
            'style="border:0;background:none;padding:2px 4px;font-size:0.76rem;' +
            'text-transform:uppercase;letter-spacing:0.04em;color:' +
            (active ? 'var(--clinical)' : 'var(--ink-3)') + '">' + c.t +
            (active ? (state.dir === -1 ? ' ▾' : ' ▴') : '') + '</button></th>';
        }).join('') + '</tr></thead><tbody>' +
        sorted().map(function (r) {
          var na = r.acc == null;
          return '<tr' + (na ? ' style="background:var(--signal-soft)"' : '') + '>' +
            '<th scope="row">' + window.UI.esc(r.label) +
              (r.provenance === 'measured'
                ? ' <span class="provenance provenance-real" style="font-size:0.62rem">measured</span>'
                : ' <span class="provenance provenance-sim" style="font-size:0.62rem">not applicable here</span>') +
              '<div class="tiny muted" style="font-weight:400;max-width:44ch">' +
              window.UI.esc(r.note) + '</div></th>' +
            '<td class="num">' + (na ? '—' : (r.acc * 100).toFixed(2) + '%') + '</td>' +
            '<td class="num">' + (na ? '—' : r.f1.toFixed(3)) + '</td>' +
            '<td class="num">' + (na || r.auc == null ? '—' : r.auc.toFixed(3)) + '</td>' +
            '<td class="num">' + DATA_LABEL[r.data] + '</td>' +
            '<td class="num">' + COMPUTE_LABEL[r.compute] + '</td>' +
            '<td class="num">' + INTERP_LABEL[r.interp] + '</td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>';

      slot.querySelectorAll('[data-sort]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-sort');
          if (state.sort === k) state.dir = -state.dir;
          else { state.sort = k; state.dir = -1; }
          draw();
        });
      });
    }

    function updateMetrics() {
      var measured = R.filter(function (r) { return r.acc != null; });
      var best = measured.reduce(function (a, b) { return b.acc > a.acc ? b : a; });
      var simplest = R.filter(function (r) { return r.key === 'logreg'; })[0];
      var base = R.filter(function (r) { return r.key === 'baseline_majority'; })[0];

      window.UI.setMetric('lb-best', window.Chart.pct(best.acc),
        best.label, 'good');
      window.UI.setMetric('lb-baseline', window.Chart.pct(base.acc),
        'always predicting the majority class', 'bad');
      window.UI.setMetric('lb-spread',
        ((best.acc - simplest.acc) * 100).toFixed(2) + ' pts',
        'best minus plain logistic regression');
    }

    function updateExplain() {
      var measured = R.filter(function (r) { return r.acc != null; });
      var best = measured.reduce(function (a, b) { return b.acc > a.acc ? b : a; });
      var lr = R.filter(function (r) { return r.key === 'logreg'; })[0];
      var rf = R.filter(function (r) { return r.key === 'rf'; })[0];

      host.querySelector('[data-viz-note]').innerHTML =
        '<p>The best measured model here is <strong>' +
        window.UI.esc(best.label) + '</strong> at ' + window.Chart.pct(best.acc) +
        '. Plain logistic regression reaches ' + window.Chart.pct(lr.acc) +
        ' and the 500-tree random forest ' + window.Chart.pct(rf.acc) +
        '. The standard deviations across folds are around one to two ' +
        'percentage points, so several of these models are not distinguishable ' +
        'on this evidence, and reporting one as better than another would be ' +
        'overreading the data.</p>' +
        '<p>The two foundation-model rows are marked not applicable rather than ' +
        'given a number. That is the honest entry: WDBC is thirty hand-measured ' +
        'morphometric values, there is no pretrained model for that input, and ' +
        'inventing a plausible-looking figure to fill the cell would teach ' +
        'exactly the wrong habit. In Week 7 and Week 8 you have already seen the ' +
        'case where a learned representation does win, on a task where the ' +
        'signal is in sequence order. The point of this table is that the ' +
        'question is always which of the two situations you are in.</p>' +
        '<p class="mb0">Sort by interpretability and the ordering inverts. For a ' +
        'clinical decision-support tool, a model a clinician can read and audit, ' +
        'giving up a point of accuracy that is inside the error bars anyway, is ' +
        'frequently the better engineering decision.</p>';
    }

    function updateAlt() {
      altBody.innerHTML =
        '<p>A horizontal bar chart of cross-validated accuracy for each ' +
        'measured model, with one-standard-deviation error bars and a dashed ' +
        'line at the majority-class baseline. It is accompanied by a sortable ' +
        'table.</p>' +
        '<p><strong>Provenance.</strong> ' + window.UI.esc(B.protocol) +
        ' scikit-learn version ' + window.UI.esc(B.sklearnVersion) + '. Rows ' +
        'marked "not applicable here" carry no accuracy figure because no ' +
        'suitable pretrained model exists for this input type; no number has ' +
        'been invented for them.</p>' +
        window.UI.altTable(
          'All models, with the non-accuracy columns that decide deployment.',
          ['Model', 'Accuracy', 'F1', 'ROC-AUC', 'Labels needed', 'Compute',
           'Interpretability'],
          R.map(function (r) {
            return [r.label,
                    r.acc == null ? 'not applicable' : (r.acc * 100).toFixed(2) + '%',
                    r.f1 == null ? '—' : r.f1.toFixed(3),
                    r.auc == null ? '—' : r.auc.toFixed(3),
                    DATA_LABEL[r.data], COMPUTE_LABEL[r.compute],
                    INTERP_LABEL[r.interp]];
          }));
    }

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { sort: 'acc', dir: -1 }; draw();
    });

    window.Chart.responsive(stage, draw);
    draw(); updateMetrics(); updateExplain(); updateAlt();
  });
})();
