/* Week 3 - Pipeline builder.
 *
 * Lecture slides 35-48. Three steps, Scaler -> Feature selector -> Model.
 * Each preprocessing step can be fitted once on all the rows before
 * cross-validation (the leaky order of slide 35) or placed inside the
 * Pipeline, where it is refitted on each training fold (slide 36). Click a
 * step to move it. Every reported score was measured once with scikit-learn
 * by data/scripts/17_build_week03_interactives.py, using the recipe of
 * 02_build_benchmarks.py, so the noise-data numbers are slide 38's 88.0% and
 * 55.0%.
 */
(function () {
  'use strict';

  var STEP = {
    scaler: { label: 'StandardScaler', what: 'learns each feature\'s mean and standard deviation',
              code: 'StandardScaler()' },
    selector: { label: 'SelectKBest', what: 'learns which features are most associated with the label',
                code: 'SelectKBest(f_classif, k=K)' },
    model: { label: 'LogisticRegression', what: 'learns the coefficients',
             code: 'LogisticRegression(max_iter=5000)' }
  };

  window.Chart.register('viz-pipeline-builder', function (host) {
    var D = window.WEEK03 && window.WEEK03.pipeline;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var U = window.UI;
    if (!D) { stage.innerHTML = '<p>Week 3 data did not load.</p>'; return; }
    /* The leaky starting point the lecture notes ask for: the selector outside. */
    var DEFAULT = { data: 'noise', scaler: 'in', selector: 'out' };
    var state = Object.assign({}, DEFAULT);

    function key(sc, sel) { return sc + '-' + sel; }
    function E() { return D[state.data]; }

    function stepBox(id, where) {
      var s = STEP[id];
      var fixed = id === 'model';
      var off = id === 'selector' && state.selector === 'none';
      return '<button type="button" class="ppl-step' + (where === 'out' ? ' ppl-out' : '') +
        (off ? ' ppl-off' : '') + '" data-opt="' + id + '"' + (fixed ? ' disabled' : '') +
        ' aria-label="' + s.label + (fixed ? ', always inside the Pipeline' :
          ', currently ' + (where === 'out' ? 'fitted on all rows before CV' : 'inside the Pipeline') +
          '. Activate to move it.') + '">' +
        '<span class="ppl-name mono">' + s.label + '</span>' +
        '<span class="ppl-what">' + s.what + '</span>' +
        (fixed ? '<span class="ppl-hint">always fitted inside each fold</span>'
               : '<span class="ppl-hint">' + (where === 'out' ? 'click to move inside &rarr;'
                                                              : '&larr; click to move outside') +
                 '</span>') + '</button>';
    }

    function code() {
      var k = E().k, out = [], inside = [];
      if (state.scaler === 'out') out.push('X = StandardScaler().fit_transform(X)        # sees every row');
      if (state.selector === 'out') out.push('X = SelectKBest(f_classif, k=' + k + ').fit_transform(X, y)   # sees every label');
      if (state.selector === 'in') inside.push('    ("select", SelectKBest(f_classif, k=' + k + ')),');
      if (state.scaler === 'in') inside.push('    ("scale", StandardScaler()),');
      inside.push('    ("model", LogisticRegression(max_iter=5000)),');
      return out.join('\n') + (out.length ? '\n' : '') +
        'pipe = Pipeline([\n' + inside.join('\n') + '\n])\n' +
        'cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)\n' +
        'cross_val_score(pipe, X, y, cv=cv).mean()';
    }

    function draw() {
      var lanes = { out: [], in: [] };
      lanes[state.scaler].push('scaler');
      if (state.selector !== 'none') lanes[state.selector].push('selector');
      lanes['in'].push('model');
      var leaky = state.scaler === 'out' || state.selector === 'out';
      stage.innerHTML =
        '<div class="ppl">' +
          '<div class="ppl-lane ppl-lane-out"><h4>Fitted once, on all ' + E().n +
            ' rows, before cross-validation</h4>' +
            (lanes.out.length ? lanes.out.map(function (id) { return stepBox(id, 'out'); }).join('')
                              : '<p class="small muted mb0">Nothing here. Good: no step has seen the held-out folds.</p>') +
          '</div>' +
          '<div class="ppl-lane ppl-lane-in"><h4>Inside the Pipeline: refitted on each ' +
            'training fold</h4>' +
            lanes['in'].map(function (id) { return stepBox(id, 'in'); }).join('') +
          '</div>' +
        '</div>' +
        (leaky
          ? '<div class="ppl-warn" role="alert"><strong>Leakage warning.</strong> ' +
            (state.selector === 'out' ? 'SelectKBest chose its features using the labels of ' +
              'every row, including the rows each fold later holds out. ' : '') +
            (state.scaler === 'out' ? 'StandardScaler computed its mean and standard ' +
              'deviation from every row, including the held-out ones. ' : '') +
            'The cross-validation score below has seen its own test data.</div>'
          : '<div class="ppl-ok"><strong>No leakage.</strong> Every step that learns from ' +
            'data is refitted inside each training fold, so the held-out fold is never seen.</div>') +
        '<pre class="ppl-code" aria-label="The Python this configuration corresponds to">' +
          U.esc(code()) + '</pre>';
      stage.querySelectorAll('[data-opt]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-opt');
          if (id === 'scaler') state.scaler = state.scaler === 'in' ? 'out' : 'in';
          if (id === 'selector') state.selector = state.selector === 'in' ? 'out' :
                                                 (state.selector === 'out' ? 'in' : 'in');
          sync(); refresh();
        });
      });
    }

    function update() {
      var e = E();
      var rep = e.scores[key(state.scaler, state.selector)];
      var honest = e.scores[key('in', state.selector === 'none' ? 'none' : 'in')];
      var infl = rep - honest;
      U.setMetric('pb-reported', window.Chart.pct(rep), 'mean 5-fold CV accuracy, as configured',
        infl > 0.005 ? 'bad' : null);
      U.setMetric('pb-honest', window.Chart.pct(honest), 'same steps, all inside the Pipeline');
      U.setMetric('pb-infl', (infl >= 0 ? '+' : '') + (infl * 100).toFixed(1) + ' pts',
        'reported minus honest', infl > 0.005 ? 'bad' : null);
      U.setMetric('pb-truth', state.data === 'noise' ? '50%' : '62.7%',
        state.data === 'noise' ? 'chance: the labels are random' : 'majority-class baseline');
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' +
        (state.data === 'noise'
          ? 'Pure noise: ' + e.n + ' rows, ' + d3.format(',')(e.p) + ' random features, random ' +
            'labels. Nothing can be learned, so an honest protocol must land near 50%. '
          : 'Real WDBC: ' + e.n + ' rows, ' + e.p + ' features, keep ' + e.k + '. ') +
        (infl > 0.005
          ? 'This configuration reports ' + window.Chart.pct(rep) + ' where the honest protocol ' +
            'gives ' + window.Chart.pct(honest) + ': ' + (infl * 100).toFixed(1) +
            ' points of accuracy that do not exist.'
          : (state.scaler === 'out' || state.selector === 'out'
              ? 'Here the leak happens to change the score by only ' + (infl * 100).toFixed(1) +
                ' points. That is luck, not evidence: the protocol is still wrong, and the ' +
                'score cannot tell you so.'
              : 'Every learned step sits inside the Pipeline, so this number is honest.')) +
        ' Leakage is not detectable from the score, only from the protocol.</p>';
      var rows = [];
      ['in', 'out'].forEach(function (sc) {
        ['none', 'in', 'out'].forEach(function (sel) {
          rows.push([(sc === 'in' ? 'inside' : 'before CV'),
                     sel === 'none' ? 'not used' : (sel === 'in' ? 'inside' : 'before CV'),
                     window.Chart.pct(e.scores[key(sc, sel)])]);
        });
      });
      altBody.innerHTML = '<p>Current configuration: scaler ' +
        (state.scaler === 'in' ? 'inside the Pipeline' : 'fitted on all rows before CV') +
        '; feature selector ' + (state.selector === 'none' ? 'not used' :
          state.selector === 'in' ? 'inside the Pipeline' : 'fitted on all rows before CV') +
        '. Model: logistic regression, always inside.</p>' +
        U.altTable('Reported 5-fold CV accuracy for every placement (' +
          (state.data === 'noise' ? 'pure-noise data' : 'real WDBC') + ').',
          ['Scaler', 'Feature selector', 'Reported accuracy'], rows) +
        '<pre>' + U.esc(code()) + '</pre>';
    }

    function refresh() { draw(); update(); }

    U.onSegment(host.querySelector('#pb-data'), function (v) { state.data = v; refresh(); });
    U.onSegment(host.querySelector('#pb-scaler'), function (v) { state.scaler = v; refresh(); });
    U.onSegment(host.querySelector('#pb-selector'), function (v) { state.selector = v; refresh(); });
    function sync() {
      [['pb-data', 'data'], ['pb-scaler', 'scaler'], ['pb-selector', 'selector']].forEach(function (p) {
        host.querySelectorAll('#' + p[0] + ' button').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === state[p[1]]));
        });
      });
    }
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); sync(); refresh();
    });
    sync();
    refresh();
  });
})();
