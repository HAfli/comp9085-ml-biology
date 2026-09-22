/* Week 2 - Deployment demonstration.
 * ===========================================================================
 * An application-shaped interface around the same decision tree the rest of
 * the page fits: enter measurements for a biological sample, get a prediction,
 * the decision path that produced it, and the statistics of the leaf the case
 * landed in.
 *
 * It is a teaching demonstration, not a clinical diagnostic system, and it
 * says so on every screen it appears on. Input ranges are the ranges actually
 * observed in the WDBC data; no clinical reference range is invented.
 */
(function () {
  'use strict';

  window.Chart.register('viz-deployment', function (host) {
    var D = window.WDBC;
    var stage = host.querySelector('[data-viz-stage]');
    var note = host.querySelector('[data-viz-note]');
    var altBody = host.querySelector('[data-viz-alt]');

    /* The eight features the interface asks for. The model is fitted on all
       30; the other 22 are held at their dataset median so that the case is a
       complete one. That is stated in the interface. */
    var ASK = ['radius_mean', 'texture_mean', 'perimeter_mean',
               'concave_points_mean', 'radius_worst', 'texture_worst',
               'perimeter_worst', 'concave_points_worst']
      .filter(function (f) { return D.features.indexOf(f) >= 0; });
    if (ASK.length < 4) {          // fail loudly rather than silently ask less
      throw new Error('deployment: expected feature names not found in WDBC');
    }

    var stats = D.features.map(function (_, i) {
      var col = D.X.map(function (r) { return r[i]; }).slice().sort(function (a, b) {
        return a - b;
      });
      return { min: col[0], max: col[col.length - 1],
               median: col[Math.floor(col.length / 2)] };
    });

    var state = { depth: 3, minLeaf: 1, values: {}, compare: null, lastPred: null };
    var split, model;

    function fitModel() {
      split = window.ML.stratifiedSplit(D.X, D.y, 0.3, 42);
      model = new window.ML.DecisionTree({
        maxDepth: state.depth, criterion: 'entropy',
        minSamplesLeaf: state.minLeaf, featureNames: D.features
      });
      model.fit(split.train.X, split.train.y);
    }

    function resetValues(from) {
      state.values = {};
      D.features.forEach(function (f, i) {
        state.values[f] = from ? from[i] : stats[i].median;
      });
    }

    /* ---------------------------------------------------------- validation */
    function validate(name, raw) {
      var i = D.features.indexOf(name);
      var s = stats[i];
      if (raw === '' || raw === null || raw === undefined) {
        return { ok: false, level: 'error', msg: 'Enter a value.' };
      }
      var v = Number(raw);
      if (!isFinite(v)) {
        return { ok: false, level: 'error', msg: 'Not a number.' };
      }
      if (v < 0) {
        return { ok: false, level: 'error',
                 msg: 'Negative values are not possible for this measurement.' };
      }
      if (v < s.min || v > s.max) {
        return { ok: true, level: 'warn', value: v,
                 msg: 'Outside the range observed in the teaching dataset (' +
                      window.Chart.num(s.min, 3) + ' to ' +
                      window.Chart.num(s.max, 3) + '). The model will still ' +
                      'return an answer; that answer is an extrapolation.' };
      }
      return { ok: true, level: 'ok', value: v };
    }

    /* ------------------------------------------------------------- predict */
    function run() {
      var vals = D.features.map(function (f) { return state.values[f]; });
      var trace = window.Model.tree.trace(model.root, vals, function (n) {
        return n.feature;
      });
      state.lastPred = {
        prediction: trace.leaf.prediction,
        trace: trace,
        values: vals.slice()
      };
      return state.lastPred;
    }

    /* ---------------------------------------------------------------- form */
    function formHtml() {
      return '<form class="deploy" id="dp-form" novalidate>' +
        '<div class="deploy-head">' +
          '<h4>Biological sample assessment</h4>' +
          '<p class="small muted">Educational deployment demonstration using ' +
          'the teaching model. Not a clinical diagnostic system.</p>' +
        '</div>' +
        '<div class="deploy-grid">' +
          ASK.map(function (f) {
            var i = D.features.indexOf(f);
            return '<div class="deploy-field">' +
              '<label for="dp-' + i + '">' + window.UI.esc(window.Model.pretty(f)) +
              '</label>' +
              '<input type="number" step="any" inputmode="decimal" id="dp-' + i +
              '" data-feature="' + window.UI.esc(f) + '" ' +
              'value="' + window.Chart.num(state.values[f], 3) + '" ' +
              'aria-describedby="dp-hint-' + i + '">' +
              '<span class="deploy-hint" id="dp-hint-' + i + '">dataset range ' +
              window.Chart.num(stats[i].min, 2) + ' to ' +
              window.Chart.num(stats[i].max, 2) + '</span>' +
              '<span class="deploy-msg" data-msg-for="' + i + '"></span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div class="deploy-actions">' +
          '<button type="submit" class="btn btn-primary" id="dp-run">' +
          'Analyse sample</button> ' +
          '<button type="button" class="btn btn-sm" id="dp-example">' +
          'Load example case</button> ' +
          '<button type="button" class="btn btn-sm" id="dp-keep">' +
          'Keep this result to compare</button>' +
        '</div>' +
        '<p class="small muted">The other ' + (D.features.length - ASK.length) +
        ' features are held at their dataset median, so every case sent to the ' +
        'model is complete.</p>' +
      '</form>';
    }

    var exampleIdx = 0;

    function modelInfoHtml() {
      return '<div class="deploy-info"><h4>Model information</h4>' +
        '<table class="inspect-table"><tbody>' +
        [['Model', 'Decision tree, CART-style (scikit-learn family)'],
         ['Criterion', 'entropy'],
         ['Depth', String(state.depth)],
         ['Minimum samples per leaf', String(state.minLeaf)],
         ['Dataset', 'WDBC, ' + D.X.length + ' cases, ' + D.features.length +
                     ' features'],
         ['Fitted on', split.train.y.length + ' cases (stratified 70/30, seed 42)'],
         ['Held-out accuracy', window.Chart.pct(
           window.ML.accuracy(split.test.y, model.predict(split.test.X)), 1)],
         ['Purpose', 'Educational demonstration']]
        .map(function (r) {
          return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] +
                 '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    var TRUST = [
      ['Was the model validated?',
       'On a held-out split of the same dataset. That is the weakest form of ' +
       'validation there is.'],
      ['Was the final test set kept separate?',
       'No. The depth control above lets you choose a depth by watching the ' +
       'held-out score, which is exactly the mistake Week 3 is about.'],
      ['Is the dataset representative?',
       'It is one institution’s cases, digitised in the early 1990s. It ' +
       'is not a sample of any population you would deploy to.'],
      ['Has external validation been performed?',
       'No.'],
      ['Could dataset shift change the result?',
       'Yes. A different scanner, laboratory protocol or patient population ' +
       'changes the feature distributions the thresholds were fitted to.'],
      ['Are the features appropriate?',
       'They require a trained person to trace cell nuclei from an image. ' +
       'They are not available at the point most decisions are made.'],
      ['What do the two error types cost?',
       'A false negative is a missed malignancy. A false positive is an ' +
       'unnecessary biopsy and considerable distress. Accuracy treats them as ' +
       'equal; nobody else does.'],
      ['Is this model clinically validated?',
       'No. It must not be used to inform any clinical decision.']
    ];

    function trustHtml() {
      return '<details class="deploy-trust"><summary>Should we trust this ' +
        'result?</summary><dl>' +
        TRUST.map(function (q) {
          return '<dt>' + q[0] + '</dt><dd>' + q[1] + '</dd>';
        }).join('') + '</dl>' +
        '<p class="small"><strong>A model can be interpretable and still be ' +
        'wrong.</strong> The decision path tells you what this tree did. It ' +
        'tells you nothing about whether what it did is correct.</p>' +
        '</details>';
    }

    function resultHtml(res) {
      if (!res) {
        return '<p class="muted">Enter measurements and press <strong>Analyse ' +
               'sample</strong>.</p>';
      }
      var cmp = '';
      if (state.compare) {
        var changed = D.features.filter(function (f, i) {
          return Math.abs(state.compare.values[i] - res.values[i]) > 1e-9;
        });
        cmp = '<div class="deploy-compare"><h4>Compared with the kept case</h4>' +
          '<p>Kept: <strong>' + state.compare.prediction.toUpperCase() +
          '</strong>  →  now: <strong>' + res.prediction.toUpperCase() +
          '</strong>' + (state.compare.prediction === res.prediction
            ? ' (unchanged)' : ' <em>(changed)</em>') + '</p>' +
          (changed.length
            ? '<p class="small">' + changed.length + ' measurement' +
              (changed.length === 1 ? '' : 's') + ' differ: ' +
              changed.slice(0, 6).map(function (f) {
                var i = D.features.indexOf(f);
                return window.UI.esc(window.Model.pretty(f)) + ' ' +
                  window.Chart.num(state.compare.values[i], 3) + ' → ' +
                  window.Chart.num(res.values[i], 3);
              }).join('; ') + (changed.length > 6 ? ' and others' : '') + '</p>'
            : '<p class="small">No measurement differs.</p>') +
          '</div>';
      }
      return '<div class="deploy-result deploy-' + res.prediction + '">' +
        '<h4>Model output</h4>' +
        '<p class="deploy-pred">Prediction: <strong>' +
        res.prediction.toUpperCase() + '</strong></p>' +
        '<h5>Decision path</h5>' +
        window.Model.pathPanel(res.trace) +
        '</div>' + cmp + modelInfoHtml() + trustHtml() +
        '<p class="deploy-warning"><strong>This is an educational ' +
        'demonstration. It is not a clinical diagnostic system and must not ' +
        'be used to inform any clinical decision.</strong></p>';
    }

    /* ----------------------------------------------------------- rendering */
    function drawTree(res) {
      stage.innerHTML = '';
      window.Model.tree.draw(stage, model.root, model.depth(), {
        title: 'The fitted tree, with this case’s path highlighted',
        highlight: res ? res.trace.path : [],
        criterion: 'entropy'
      });
    }

    function render(res) {
      drawTree(res);
      note.innerHTML = resultHtml(res);
      altText(res);
    }

    function altText(res) {
      var rows = ASK.map(function (f) {
        return '<tr><th scope="row">' + window.UI.esc(window.Model.pretty(f)) +
          '</th><td>' + window.Chart.num(state.values[f], 3) + '</td><td>' +
          window.Chart.num(stats[D.features.indexOf(f)].min, 2) + ' to ' +
          window.Chart.num(stats[D.features.indexOf(f)].max, 2) + '</td></tr>';
      }).join('');
      var path = res ? res.trace.steps.map(function (s) {
        return '<li>' + window.UI.esc(window.Model.pretty(s.feature)) + ' = ' +
          window.Chart.num(s.value, 3) + ', threshold ' +
          window.Chart.num(s.threshold, 3) + ', answer ' + s.answer + '</li>';
      }).join('') : '';
      altBody.innerHTML =
        '<p>Educational deployment demonstration. A decision tree of depth ' +
        state.depth + ', fitted with criterion entropy on ' +
        split.train.y.length + ' WDBC training cases, evaluates one sample. ' +
        'It is not a clinical diagnostic system.</p>' +
        '<table><caption>The measurements entered, and the range observed in ' +
        'the teaching dataset</caption><thead><tr><th scope="col">Measurement' +
        '</th><th scope="col">Value</th><th scope="col">Dataset range</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>' +
        (res ? '<p>Prediction: <strong>' + res.prediction + '</strong>. ' +
          'Decision path:</p><ol>' + path + '</ol><p>Leaf reached: ' +
          res.trace.leaf.n + ' training cases, ' +
          (res.trace.leaf.counts.benign || 0) + ' benign and ' +
          (res.trace.leaf.counts.malignant || 0) + ' malignant.</p>'
        : '<p>No sample has been analysed yet.</p>');
    }

    /* --------------------------------------------------------------- mount */
    fitModel();
    resetValues(null);

    /* The form is inserted into the explain area, ahead of [data-viz-note],
       so that re-rendering the result does not destroy the inputs. */
    var explain = host.querySelector('[data-viz-explain]');
    explain.insertAdjacentHTML('afterbegin', formHtml());

    var form = host.querySelector('#dp-form');

    function readInputs() {
      var allOk = true;
      host.querySelectorAll('#dp-form input[data-feature]').forEach(function (inp) {
        var f = inp.getAttribute('data-feature');
        var i = D.features.indexOf(f);
        var v = validate(f, inp.value);
        var msg = host.querySelector('[data-msg-for="' + i + '"]');
        msg.className = 'deploy-msg deploy-msg-' + v.level;
        msg.textContent = v.msg || '';
        inp.setAttribute('aria-invalid', v.ok && v.level !== 'error'
          ? 'false' : 'true');
        if (v.ok) state.values[f] = v.value;
        else allOk = false;
      });
      return allOk;
    }

    function syncInputs() {
      host.querySelectorAll('#dp-form input[data-feature]').forEach(function (inp) {
        inp.value = window.Chart.num(
          state.values[inp.getAttribute('data-feature')], 3);
      });
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!readInputs()) {
        note.innerHTML = '<p class="deploy-invalid">Fix the highlighted ' +
          'measurements before analysing the sample. The model is not asked ' +
          'to guess what you meant.</p>';
        return;
      }
      render(run());
    });

    host.querySelector('#dp-example').addEventListener('click', function () {
      var pool = split.test.X;
      exampleIdx = (exampleIdx + 1) % Math.min(6, pool.length);
      resetValues(pool[exampleIdx]);
      syncInputs();
      readInputs();
      render(run());
    });

    host.querySelector('#dp-keep').addEventListener('click', function () {
      if (!state.lastPred) return;
      state.compare = {
        prediction: state.lastPred.prediction,
        values: state.lastPred.values.slice()
      };
      render(state.lastPred);
    });

    /* Depth and leaf-size controls come from the shell, like every other
       figure on the site. */
    var depthEl = host.querySelector('#dp-depth');
    var leafEl = host.querySelector('#dp-minleaf');

    depthEl.addEventListener('input', function () {
      state.depth = +this.value;
      host.querySelector('#dp-depth-val').textContent = this.value;
      fitModel();
      render(state.lastPred ? run() : null);
    });
    leafEl.addEventListener('input', function () {
      state.minLeaf = +this.value;
      host.querySelector('#dp-minleaf-val').textContent = this.value;
      fitModel();
      render(state.lastPred ? run() : null);
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.depth = 3;
      state.minLeaf = 1;
      state.compare = null;
      state.lastPred = null;
      depthEl.value = 3;
      host.querySelector('#dp-depth-val').textContent = '3';
      leafEl.value = 1;
      host.querySelector('#dp-minleaf-val').textContent = '1';
      fitModel();
      resetValues(null);
      syncInputs();
      host.querySelectorAll('.deploy-msg').forEach(function (m) {
        m.textContent = '';
        m.className = 'deploy-msg';
      });
      render(null);
    });

    window.Chart.responsive(stage, function () {
      drawTree(state.lastPred);
    });
    render(null);
  });
})();
