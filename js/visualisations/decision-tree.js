/* Week 2 - Decision Tree Builder.
 *
 * A genuine CART implementation is fitted to the real WDBC data every time a
 * control moves. The tree drawn is the tree that was fitted, and the accuracies
 * reported are measured on a held-out stratified split.
 */
(function () {
  'use strict';

  window.Chart.register('viz-decision-tree', function (host) {
    var D = window.WDBC;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    /* Feature subsets, so students can see what happens when you take away the
       features that carry the signal. */
    var SUBSETS = {
      all: { label: 'All 30 features', idx: D.features.map(function (_, i) { return i; }) },
      mean: { label: 'The 10 "mean" features only',
              idx: D.features.map(function (f, i) { return /_mean$/.test(f) ? i : -1; })
                    .filter(function (i) { return i >= 0; }) },
      worst: { label: 'The 10 "worst" features only',
               idx: D.features.map(function (f, i) { return /_worst$/.test(f) ? i : -1; })
                     .filter(function (i) { return i >= 0; }) },
      two: { label: 'Just texture_mean and smoothness_mean',
             idx: [D.features.indexOf('texture_mean'),
                   D.features.indexOf('smoothness_mean')] }
    };

    var state = { depth: 3, criterion: 'entropy', minLeaf: 1, subset: 'all',
                 seed: 42, selected: null, trace: null, traceIdx: -1 };

    host.querySelector('[data-viz-controls-slot]');

    var split, model, report, teacc, tracc;

    function build() {
      var idx = SUBSETS[state.subset].idx;
      var names = idx.map(function (i) { return D.features[i]; });
      var X = D.X.map(function (row) {
        return idx.map(function (i) { return row[i]; });
      });

      split = window.ML.stratifiedSplit(X, D.y, 0.3, state.seed);

      model = new window.ML.DecisionTree({
        maxDepth: state.depth,
        criterion: state.criterion,
        minSamplesLeaf: state.minLeaf,
        featureNames: names
      });
      model.fit(split.train.X, split.train.y);

      tracc = window.ML.accuracy(split.train.y, model.predict(split.train.X));
      var pred = model.predict(split.test.X);
      teacc = window.ML.accuracy(split.test.y, pred);
      report = window.ML.classReport(split.test.y, pred, ['benign', 'malignant']);
    }

    function draw() {
      var res = window.Model.tree.draw(stage, model.root, model.depth(), {
        title: 'Decision tree fitted to the WDBC training split',
        criterion: state.criterion,
        highlight: state.trace ? state.trace.path : [],
        selected: state.selected,
        onSelect: function (n) {
          state.selected = (state.selected === n) ? null : n;
          draw();
          updateExplain();
        }
      });

      window.Chart.tips(res.nodes, function (d) {
        var n = d.data;
        var b = n.counts.benign || 0, m = n.counts.malignant || 0;
        return '<strong>' + (n.leaf ? 'Leaf'
          : window.UI.esc(window.Model.pretty(n.featureName))) +
          '</strong><br>' + n.n + ' samples: ' + b + ' benign, ' + m +
          ' malignant<br>' +
          (state.criterion === 'gini' ? 'Gini' : 'Entropy') + ': ' +
          n.impurity.toFixed(4) +
          (n.leaf ? '' : '<br>Split at ' + n.threshold.toFixed(3) +
                         ', information gain ' + n.gain.toFixed(4)) +
          '<br>Depth ' + n.depth + '<br><em>Click to inspect</em>';
      });

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Leaf predicting benign', colour: 'var(--cat-1)', symbol: 'square' },
        { label: 'Leaf predicting malignant', colour: 'var(--cat-2)', symbol: 'square' },
        { label: 'Branch thickness shows how many samples flow down it',
          colour: 'var(--rule)', symbol: 'line' }
      ]));
    }

    function updateMetrics() {
      var gap = tracc - teacc;
      window.UI.setMetric('dt-train', window.Chart.pct(tracc),
        Math.round(split.train.X.length) + ' samples');
      window.UI.setMetric('dt-test', window.Chart.pct(teacc),
        Math.round(split.test.X.length) + ' held out',
        teacc >= 0.93 ? 'good' : null);
      window.UI.setMetric('dt-gap', window.Chart.pct(gap),
        gap > 0.05 ? 'overfitting' : 'healthy',
        gap > 0.05 ? 'bad' : 'good');
      window.UI.setMetric('dt-size', model.nLeaves + ' leaves',
        model.nNodes + ' nodes, depth ' + model.depth());
      window.UI.setMetric('dt-recall',
        window.Chart.pct(report.per[1].recall),
        'malignant cases caught',
        report.per[1].recall >= 0.9 ? 'good' : 'bad');
    }

    function updateExplain() {
      var gap = tracc - teacc;
      var root = model.root;
      var el = host.querySelector('[data-viz-note]');
      var msg;

      if (gap > 0.06) {
        msg = 'The training accuracy is ' + window.Chart.pct(tracc) +
          ' but the held-out accuracy is only ' + window.Chart.pct(teacc) +
          '. That gap of ' + window.Chart.pct(gap) + ' is the tree memorising ' +
          'individual training samples. Reduce the depth, or raise the minimum ' +
          'leaf size, and watch the gap close while the test accuracy barely moves.';
      } else if (state.depth <= 2) {
        msg = 'At depth ' + state.depth + ' the tree can only ask ' + state.depth +
          ' question' + (state.depth === 1 ? '' : 's') + ' before deciding. It is ' +
          'underfitting: both accuracies are limited by how little the model is ' +
          'allowed to say. Increase the depth and both will rise together, which ' +
          'is what genuine improvement looks like.';
      } else {
        msg = 'Training and held-out accuracy are within ' + window.Chart.pct(gap) +
          ' of each other, so this tree is generalising rather than memorising. ' +
          'It uses ' + model.nLeaves + ' leaves to do it.';
      }

      msg += ' The root split is on <strong>' +
        window.UI.esc(root.featureName.replace(/_/g, ' ')) + '</strong> at ' +
        (root.threshold != null ? root.threshold.toFixed(3) : 'n/a') +
        ', chosen because it removes ' + root.gain.toFixed(3) +
        ' bits of uncertainty, more than any other single question available.';

      if (state.subset === 'two') {
        msg += ' You have restricted the model to two of the weakest features, ' +
          'so it is working with very little. Compare the accuracy with the ' +
          'full feature set: this is what "the representation matters" means in ' +
          'the simplest possible setting.';
      }

      var extra = '';
      if (state.trace) {
        var c = state.trace;
        extra += '<div class="viz-panel"><h4>Decision path for held-out case ' +
          state.traceIdx + '</h4>' +
          '<p class="small">True diagnosis: <strong>' +
          (c.truth === 1 ? 'malignant' : 'benign') + '</strong>. Model says: ' +
          '<strong>' + c.leaf.prediction + '</strong>.' +
          ((c.truth === 1) === (c.leaf.prediction === 'malignant')
            ? ' The model is right about this one.'
            : ' <em>The model is wrong about this one.</em>') + '</p>' +
          window.Model.pathPanel(c) + '</div>';
      }
      extra += '<div class="viz-panel"><h4>Node inspector</h4>' +
        window.Model.tree.inspectorHtml(state.selected,
          { criterion: state.criterion }) + '</div>';

      el.innerHTML = '<p>' + msg + '</p>' + extra;
    }

    function updateAlt() {
      var rows = [];
      for (var d = 1; d <= 12; d++) {
        var idx = SUBSETS[state.subset].idx;
        var X = D.X.map(function (row) {
          return idx.map(function (i) { return row[i]; });
        });
        var sp = window.ML.stratifiedSplit(X, D.y, 0.3, state.seed);
        var m = new window.ML.DecisionTree({
          maxDepth: d, criterion: state.criterion, minSamplesLeaf: state.minLeaf
        }).fit(sp.train.X, sp.train.y);
        rows.push([
          String(d),
          window.Chart.pct(window.ML.accuracy(sp.train.y, m.predict(sp.train.X))),
          window.Chart.pct(window.ML.accuracy(sp.test.y, m.predict(sp.test.X))),
          String(m.nLeaves)
        ]);
      }

      altBody.innerHTML =
        '<p>The figure is a decision tree fitted to a 70/30 stratified split of ' +
        'the real WDBC data (569 samples, ' + SUBSETS[state.subset].label.toLowerCase() +
        '), using ' + state.criterion + ' as the splitting criterion, a maximum ' +
        'depth of ' + state.depth + ' and a minimum of ' + state.minLeaf +
        ' sample(s) per leaf. It currently has ' + model.nLeaves + ' leaves and ' +
        'reaches ' + window.Chart.pct(tracc) + ' training accuracy and ' +
        window.Chart.pct(teacc) + ' held-out accuracy.</p>' +
        '<h4>The fitted tree as rules</h4>' +
        '<pre style="max-height:280px">' + window.UI.esc(model.toText(4)) + '</pre>' +
        '<h4>Accuracy against depth, with the current settings</h4>' +
        window.UI.altTable(
          'Training and held-out accuracy as maximum depth increases.',
          ['Max depth', 'Training accuracy', 'Held-out accuracy', 'Leaves'],
          rows) +
        '<h4>Performance of the tree shown</h4>' +
        window.Chart.confusionHtml(report) +
        window.Chart.reportHtml(report);
    }

    function retrace() {
      /* build() refits, so any stored node references are stale. Recompute
         the traced path against the tree that exists now. */
      if (state.traceIdx < 0 || state.traceIdx >= split.test.X.length) {
        state.trace = null;
        return;
      }
      var t = window.Model.tree.trace(model.root, split.test.X[state.traceIdx],
        function (n) { return n.feature; });
      t.truth = split.test.y[state.traceIdx];
      state.trace = t;
    }

    function refresh() {
      build();
      state.selected = null;
      retrace();
      draw();
      updateMetrics();
      updateExplain();
      updateAlt();
    }

    /* Controls */
    var depthEl = host.querySelector('#dt-depth');
    var leafEl = host.querySelector('#dt-minleaf');
    var critEl = host.querySelector('#dt-criterion');
    var subEl = host.querySelector('#dt-subset');
    var seedEl = host.querySelector('#dt-seed');

    depthEl.addEventListener('input', function () {
      state.depth = +this.value;
      host.querySelector('#dt-depth-val').textContent = this.value;
      refresh();
    });
    leafEl.addEventListener('input', function () {
      state.minLeaf = +this.value;
      host.querySelector('#dt-minleaf-val').textContent = this.value;
      refresh();
    });
    window.UI.onSegment(critEl, function (v) { state.criterion = v; refresh(); });
    subEl.addEventListener('change', function () { state.subset = this.value; refresh(); });
    seedEl.addEventListener('click', function () {
      state.seed = 1 + Math.floor(Math.random() * 9999);
      state.selected = null;
      state.trace = null;
      state.traceIdx = -1;
      refresh();
    });

    /* Trace a real held-out case through the fitted tree. Walks the held-out
       set in order so repeated presses show different cases, including ones
       the model gets wrong. */
    var traceEl = host.querySelector('#dt-trace');
    if (traceEl) {
      traceEl.addEventListener('click', function () {
        state.traceIdx = (state.traceIdx + 1) % split.test.X.length;
        var row = split.test.X[state.traceIdx];
        var t = window.Model.tree.trace(model.root, row, function (n) {
          return n.feature;
        });
        t.truth = split.test.y[state.traceIdx];
        state.trace = t;
        draw();
        updateExplain();
      });
    }

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { depth: 3, criterion: 'entropy', minLeaf: 1, subset: 'all',
                seed: 42, selected: null, trace: null, traceIdx: -1 };
      depthEl.value = 3; host.querySelector('#dt-depth-val').textContent = '3';
      leafEl.value = 1; host.querySelector('#dt-minleaf-val').textContent = '1';
      subEl.value = 'all';
      critEl.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === 'entropy'));
      });
      refresh();
    });

    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
