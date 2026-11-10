/* Week 7 - Exercise 7: k-NN on classical protein descriptors versus ESM-2 embeddings.
 *
 * The controlled comparison from the lab, measured by data/scripts/20_build_week07_refresh.py:
 * the same 1,500 training proteins, the same 5-fold stratified CV (seed 42), the same
 * Pipeline ([scaler] -> KNeighborsClassifier) and the same grid for every representation.
 * Curves: mean CV ROC AUC against k for the scaling, metric and weighting you choose.
 * GridSearchCV's choice for each representation is fixed; the test set (500 proteins) is
 * revealed only on request, once per representation.
 */
(function () {
  'use strict';

  window.Chart.register('viz-w7-knn', function (host) {
    var W7 = window.W7, U = window.UI, D = window.WEEK07;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var REPS = ['composition', 'classical', 'esm2', 'esm2_shuffled'];
    var DEFAULT = { task: 'signal_peptide', scale: 'standard', metric: 'euclidean', weights: 'uniform',
                    shuffled: false, reveal: false };
    var state = Object.assign({}, DEFAULT);

    function refresh() {
      var K = D.knn[state.task], ks = D.kGrid, key = state.scale + '|' + state.metric + '|' + state.weights;
      var reps = REPS.filter(function (r) { return r !== 'esm2_shuffled' || state.shuffled; });
      var f = window.Chart.frame(stage, { height: Math.min(420, Math.max(320, stage.clientWidth * 0.52)),
        margin: { top: 16, right: 16, bottom: 48, left: 58 }, title: 'Cross-validated ROC AUC against k' });
      var x = d3.scaleLog().domain([1, 101]).range([0, f.w]);
      var y = d3.scaleLinear().domain([0.5, 1.0]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'k (number of neighbours, log scale)', yLabel: 'CV ROC AUC',
        xTickValues: [1, 3, 5, 11, 21, 51, 101], xFormat: d3.format('d') });
      reps.forEach(function (r) {
        var C = K[r].curves[key], col = W7.REP_COLOUR[r];
        f.g.append('path').datum(ks.map(function (k, i) { return [k, C.cv[i], C.sd[i]]; }))
          .attr('fill', col).attr('opacity', 0.10)
          .attr('d', d3.area().x(function (d) { return x(d[0]); })
            .y0(function (d) { return y(Math.max(0.5, d[1] - d[2])); }).y1(function (d) { return y(Math.min(1, d[1] + d[2])); }));
        f.g.append('path').datum(ks.map(function (k, i) { return [k, C.cv[i]]; })).attr('fill', 'none')
          .attr('stroke', col).attr('stroke-width', 2.4)
          .attr('stroke-dasharray', r === 'esm2_shuffled' ? '6,3' : null)
          .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
        var b = K[r].best;
        if (b.scale === state.scale && b.metric === state.metric && b.weights === state.weights) {
          window.Chart.symbol(f.g, 'diamond', x(b.k), y(b.cv_roc_auc), 7, col, { stroke: '#fff', strokeWidth: 2 });
        }
      });
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml(reps.map(function (r) {
        return { label: W7.REP[r], colour: W7.REP_COLOUR[r], symbol: 'square' };
      }).concat([{ label: 'GridSearchCV choice (shown when your setting matches it)', colour: 'var(--text, #222)', symbol: 'diamond' }])));

      var bc = K.classical.best, be = K.esm2.best, ba = K.composition.best;
      U.setMetric('w7k-cl', W7.fmt(bc.cv_roc_auc), 'classical: k = ' + bc.k + ', ' + bc.metric + ', ' + bc.weights + ', ' +
        (bc.scale === 'standard' ? 'standardised' : 'unscaled'));
      U.setMetric('w7k-es', W7.fmt(be.cv_roc_auc), 'ESM-2: k = ' + be.k + ', ' + be.metric + ', ' + be.weights + ', ' +
        (be.scale === 'standard' ? 'standardised' : 'unscaled'));
      U.setMetric('w7k-co', W7.fmt(ba.cv_roc_auc), 'composition only: k = ' + ba.k + ', ' + ba.metric);
      U.setMetric('w7k-test', state.reveal ? W7.fmt(be.test.roc_auc) + ' vs ' + W7.fmt(bc.test.roc_auc) : 'hidden',
        state.reveal ? 'test ROC AUC, ESM-2 vs classical' : 'tick the box only after choosing', null);

      var html = '<p>Every representation gets the same split, folds, Pipeline and grid (' +
        (ks.length * 12) + ' settings). The scaler is refitted inside every fold. Fixed, untuned setting for comparison ' +
        '(k = 15, Euclidean, uniform, standardised): ' + REPS.map(function (r) {
          return W7.REP[r] + ' ' + W7.fmt(K.fixed_k15[r]);
        }).join(', ') + '.</p>';
      if (state.metric === 'cosine' && state.scale === 'none')
        html += '<p class="small">Cosine on the <em>unscaled</em> embedding: ESM-2 vectors all point in nearly the same ' +
          'direction (mean cosine 0.84), so cosine similarities are squeezed together; standardising (or centring) ' +
          'first removes that shared direction.</p>';
      if (state.reveal) {
        var row = function (r) {
          var t = K[r].best.test;
          return '<tr><th scope="row">' + W7.REP[r] + '</th><td class="num">' + W7.fmt(t.roc_auc) + '</td><td class="num">' +
            W7.fmt(t.average_precision) + '</td><td class="num">' + W7.fmt(t.precision) + '</td><td class="num">' +
            W7.fmt(t.recall) + '</td><td class="num">' + W7.fmt(t.f1) + '</td><td class="num">[' + t.cm[0].join(', ') +
            '], [' + t.cm[1].join(', ') + ']</td></tr>';
        };
        var B = K.bootstrap;
        html += '<div class="callout"><p><strong>The one test look</strong> (500 proteins; each representation\'s ' +
          'GridSearchCV choice, refitted on all 1,500 training proteins). Precision, recall and F1 are for the positive ' +
          'class at scikit-learn\'s default threshold (probability ≥ 0.5). Confusion matrix rows are true (no, yes), ' +
          'columns predicted.</p><div class="table-scroll"><table class="table-compact"><thead><tr><th scope="col">Representation</th>' +
          '<th class="num" scope="col">ROC AUC</th><th class="num" scope="col">Avg precision</th><th class="num" scope="col">Precision</th>' +
          '<th class="num" scope="col">Recall</th><th class="num" scope="col">F1</th><th class="num" scope="col">Confusion matrix</th>' +
          '</tr></thead><tbody>' + REPS.map(row).join('') + '</tbody></table></div>' +
          '<p class="mb0">Paired bootstrap of the test ROC AUC difference (2,000 resamples): ESM-2 − classical ' +
          W7.fmt(B.esm2_minus_classical.diff) + ' (95% interval ' + W7.fmt(B.esm2_minus_classical.ci95[0]) + ' to ' +
          W7.fmt(B.esm2_minus_classical.ci95[1]) + '); ESM-2 − composition ' + W7.fmt(B.esm2_minus_composition.diff) +
          ' (' + W7.fmt(B.esm2_minus_composition.ci95[0]) + ' to ' + W7.fmt(B.esm2_minus_composition.ci95[1]) + '). ' +
          (state.task === 'signal_peptide'
            ? 'For signal peptides the embedding and the classical descriptors rank proteins about equally well; the ' +
              'interval includes 0. Both are far better than composition alone. But at the default threshold the ESM-2 ' +
              'model finds many more signal-peptide proteins (recall ' + W7.fmt(be.test.recall, 2) + ' vs ' +
              W7.fmt(bc.test.recall, 2) + '): its neighbourhoods contain more positives.'
            : 'For membrane proteins the classical descriptors, which include a 19-residue hydropathy window, beat the ' +
              'embedding under k-NN (the interval excludes 0). The learned representation is not automatically better.') +
          ' The ESM-2 model applied to the shuffled test sequences scores ' + W7.fmt(K.esm2_model_on_shuffled_test) +
          '. Do not go back and change the settings because of these numbers.</p></div>';
      }
      host.querySelector('[data-viz-note]').innerHTML = html;
      altBody.innerHTML = U.altTable('Mean CV ROC AUC by k (' + key.replace(/\|/g, ', ') + '), ' +
        W7.TASK[state.task].short + '.', ['k'].concat(reps.map(function (r) { return W7.REP[r]; })),
        ks.map(function (k, i) {
          return [String(k)].concat(reps.map(function (r) { return W7.fmt(K[r].curves[key].cv[i]); }));
        }));
    }

    var setT = W7.seg(host, 'w7k-task', function (v) { state.task = v; refresh(); });
    var setS = W7.seg(host, 'w7k-scale', function (v) { state.scale = v; refresh(); });
    var setM = W7.seg(host, 'w7k-metric', function (v) { state.metric = v; refresh(); });
    var setW = W7.seg(host, 'w7k-weights', function (v) { state.weights = v; refresh(); });
    var sh = host.querySelector('#w7k-shuffled'), rv = host.querySelector('#w7k-reveal');
    sh.addEventListener('change', function () { state.shuffled = sh.checked; refresh(); });
    rv.addEventListener('change', function () { state.reveal = rv.checked; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); setT(state.task); setS(state.scale); setM(state.metric); setW(state.weights);
      sh.checked = false; rv.checked = false; refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
