/* Week 8 - Exercise 7: choosing k (and the metric, and the weighting) by
 * cross-validation, with the test set kept for one final look.
 *
 * Every curve is the 10-fold stratified cross-validated accuracy measured by
 * data/scripts/18_build_week08_data.py on the 227 training patients, with exactly
 * the lab's Pipeline (imputation, scaling of the continuous features or not,
 * one-hot categorical features, k-NN). Training accuracy is the mean over the
 * same folds. The final-test result belongs to the configuration a GridSearchCV
 * over k x metric x weighting chose; it is hidden until the student asks for it.
 */
(function () {
  'use strict';

  window.Chart.register('viz-knn-cv', function (host) {
    var W8 = window.W8, U = window.UI, H = window.WEEK08.heart, G = H.grid;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var DEFAULT = { scale: 'standard', metric: 'euclidean', weights: 'uniform', train: true, reveal: false };
    var state = Object.assign({}, DEFAULT);

    function key() { return state.scale + '|' + state.metric + '|' + state.weights; }

    function refresh() {
      var C = G.curves[key()], ks = G.k;
      var bi = d3.maxIndex(C.cv), best = ks[bi];
      var f = window.Chart.frame(stage, { height: Math.min(420, Math.max(320, stage.clientWidth * 0.55)),
        margin: { top: 16, right: 16, bottom: 48, left: 58 }, title: 'Accuracy against k' });
      var x = d3.scaleLinear().domain([1, 51]).range([0, f.w]);
      var y = d3.scaleLinear().domain([0.45, 1.0]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'k (number of neighbours)', yLabel: 'Accuracy', yFormat: d3.format('.0%'),
        xTickValues: [1, 5, 11, 15, 21, 31, 41, 51] });
      f.g.append('path').datum(ks.map(function (k, i) { return [k, C.cv[i], C.sd[i]]; }))
        .attr('fill', 'var(--cat-1)').attr('opacity', 0.12)
        .attr('d', d3.area().x(function (d) { return x(d[0]); })
          .y0(function (d) { return y(d[1] - d[2]); }).y1(function (d) { return y(d[1] + d[2]); }));
      f.g.append('path').datum(ks.map(function (k, i) { return [k, C.cv[i]]; })).attr('fill', 'none')
        .attr('stroke', 'var(--cat-1)').attr('stroke-width', 2.6)
        .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
      if (state.train) f.g.append('path').datum(ks.map(function (k, i) { return [k, C.train[i]]; })).attr('fill', 'none')
        .attr('stroke', 'var(--cat-2)').attr('stroke-width', 2).attr('stroke-dasharray', '6,3')
        .attr('d', d3.line().x(function (d) { return x(d[0]); }).y(function (d) { return y(d[1]); }));
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(H.baseline.mean)).attr('y2', y(H.baseline.mean))
        .attr('stroke', 'var(--cat-5)').attr('stroke-dasharray', '3,4');
      f.g.append('text').attr('x', f.w - 4).attr('y', y(H.baseline.mean) - 5).attr('text-anchor', 'end')
        .style('font-size', '11px').text('majority-class baseline ' + W8.pct(H.baseline.mean));
      f.g.append('line').attr('x1', x(H.sqrt_n_rule)).attr('x2', x(H.sqrt_n_rule)).attr('y1', 0).attr('y2', f.h)
        .attr('stroke', 'var(--cat-3)').attr('stroke-dasharray', '2,3');
      f.g.append('text').attr('x', x(H.sqrt_n_rule) + 4).attr('y', 12).style('font-size', '11px')
        .text('√n rule: k ≈ ' + H.sqrt_n_rule.toFixed(1));
      f.g.append('circle').attr('cx', x(best)).attr('cy', y(C.cv[bi])).attr('r', 6).attr('fill', 'var(--cat-1)')
        .attr('stroke', '#fff').attr('stroke-width', 2);
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Cross-validated accuracy (band: ± 1 SD over the 10 folds)', colour: 'var(--cat-1)', symbol: 'square' }]
        .concat(state.train ? [{ label: 'Training accuracy', colour: 'var(--cat-2)', symbol: 'square' }] : [])));

      var c = H.chosen, T = H.test;
      U.setMetric('kc-best', 'k = ' + best, 'best CV for this setting: ' + W8.pct(C.cv[bi]) + ' ± ' + W8.pct(C.sd[bi]));
      U.setMetric('kc-k1', W8.pct(C.cv[0]), 'CV at k = 1 (training ' + W8.pct(C.train[0], 0) + ')');
      U.setMetric('kc-grid', 'k = ' + c.k + ', ' + c.metric + ', ' + c.weights, 'chosen by GridSearchCV over all ' +
        (G.k.length * 4) + ' standardised settings: ' + W8.pct(c.cv));
      U.setMetric('kc-test', state.reveal ? W8.pct(T.accuracy) : 'hidden',
        state.reveal ? 'balanced accuracy ' + W8.pct(T.balanced_accuracy) + ', ROC AUC ' + T.roc_auc.toFixed(3)
                     : 'tick the box only after choosing', null);

      var spread = d3.max(C.cv.slice(1)) - d3.min(C.cv.slice(1));
      host.querySelector('[data-viz-note]').innerHTML = '<p>' +
        (state.weights === 'distance' ? '<strong>Training accuracy is 100% at every k</strong> with distance weighting: ' +
          'each training patient is its own neighbour at distance 0 and takes all the weight. Training accuracy cannot ' +
          'choose k. ' : 'At k = 1 training accuracy is ' + W8.pct(C.train[0], 0) + ' because every training patient ' +
          'is its own nearest neighbour: memorisation, not learning. ') +
        (state.scale === 'none' ? 'Without scaling the whole curve sits about 15–20 points lower: no value of k can ' +
          'repair a distance dominated by cholesterol. ' : '') +
        'Beyond k = 1 the cross-validated curve moves within about ' + (100 * spread).toFixed(0) + ' points, while ' +
        'the fold-to-fold SD is about ' + W8.pct(d3.mean(C.sd), 0) + ': many settings are statistically ' +
        'indistinguishable on 227 patients, so prefer a simple, stable choice over the single highest point.</p>' +
        (state.reveal ? '<div class="callout"><p class="mb0"><strong>The one final look.</strong> The GridSearchCV choice ' +
          '(k = ' + c.k + ', ' + c.metric + ', ' + c.weights + ') on the 76 held-out patients: accuracy ' + W8.pct(T.accuracy) +
          ', sensitivity ' + W8.pct(T.recall) + ', specificity ' + W8.pct(T.specificity) + '. Confusion matrix (rows ' +
          'true, columns predicted; no disease, disease): [' + T.cm[0].join(', ') + '], [' + T.cm[1].join(', ') + ']. ' +
          'Report this number; do not now go back and change k because of it.</p></div>' : '');
      altBody.innerHTML = U.altTable('Accuracy by k for ' + key().replace(/\|/g, ', ') + '.',
        ['k', 'CV mean', 'CV SD', 'Training'], G.k.map(function (k, i) {
          return [String(k), W8.pct(C.cv[i]), W8.pct(C.sd[i]), W8.pct(C.train[i])];
        }));
    }

    var setS = W8.seg(host, 'kc-scale', function (v) { state.scale = v; refresh(); });
    var setM = W8.seg(host, 'kc-metric', function (v) { state.metric = v; refresh(); });
    var setW = W8.seg(host, 'kc-weights', function (v) { state.weights = v; refresh(); });
    var tr = host.querySelector('#kc-train'), rv = host.querySelector('#kc-reveal');
    tr.addEventListener('change', function () { state.train = tr.checked; refresh(); });
    rv.addEventListener('change', function () { state.reveal = rv.checked; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); setS(state.scale); setM(state.metric); setW(state.weights);
      tr.checked = true; rv.checked = false; refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
