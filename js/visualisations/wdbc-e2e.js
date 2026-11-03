/* Week 3 - WDBC end-to-end experiment.
 *
 * Lecture slides 64-71 (Act 8), made explorable: question, split, baseline,
 * two models under cross-validation, tuning, one final test, the confusion
 * matrix and the errors. Every number was measured once with scikit-learn by
 * data/scripts/17_build_week03_interactives.py on the real WDBC data (one
 * stratified 80/20 split, random_state=42: 455 train-pool rows, 114
 * final-test rows). Slide 67's three honest numbers and slide 55's confusion
 * matrix are reproduced exactly. The final test set stays locked until step 6.
 */
(function () {
  'use strict';

  var STEPS = ['Question and data', 'Split once', 'Baseline', 'Two models, cross-validated',
               'Tune by cross-validation', 'Final test, once', 'Errors'];

  window.Chart.register('viz-wdbc-e2e', function (host) {
    var W = window.WEEK03;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var U = window.UI, pct = window.Chart.pct;
    if (!W) { stage.innerHTML = '<p>Week 3 data did not load.</p>'; return; }
    var T = W.tuning, E = W.e2e;
    var DEFAULT = { step: 1, final: 'tree' };
    var state = Object.assign({}, DEFAULT);

    function at(fam, v) { return T[fam].filter(function (r) { return r.v === v; })[0]; }

    function stepper() {
      return '<ol class="e2e-steps">' + STEPS.map(function (s, i) {
        var n = i + 1;
        return '<li class="' + (n === state.step ? 'is-current' : (n < state.step ? 'is-done' : '')) +
          '"><button type="button" data-opt="step-' + n + '" aria-current="' +
          (n === state.step ? 'step' : 'false') + '"><span class="n">' + n + '</span>' +
          U.esc(s) + '</button></li>';
      }).join('') + '</ol>';
    }

    function table(caption, head, rows) {
      return '<div class="table-scroll"><table class="table-compact"><caption>' + U.esc(caption) +
        '</caption><thead><tr>' + head.map(function (h, i) {
          return '<th scope="col"' + (i ? ' class="num"' : '') + '>' + U.esc(h) + '</th>';
        }).join('') + '</tr></thead><tbody>' + rows.map(function (r) {
          return '<tr>' + r.map(function (c, i) {
            return i ? '<td class="num">' + c + '</td>' : '<th scope="row">' + c + '</th>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }

    function panel() {
      var t3 = at('tree', 3), k5 = at('knn', 5);
      var ct = T.chosen.tree, ck = T.chosen.knn, F = E.final[state.final];
      switch (state.step) {
        case 1:
          return '<h4>The question</h4><p>From 30 measurements of cell nuclei in a fine-needle ' +
            'aspirate, can a model tell a malignant breast mass from a benign one, and how well ' +
            'would it do on a <em>new</em> patient?</p>' +
            table('The data (real, UCI WDBC).', ['', 'Rows'],
              [['Malignant (positive class)', '212'], ['Benign', '357'], ['Total, one row per patient', '569']]) +
            '<p class="small muted mb0">One row per patient, so a row-level split is appropriate here. ' +
            'Check that before you split your own data.</p>';
        case 2:
          return '<h4>Split once, stratified, seed 42</h4>' +
            table('The only split in the experiment.', ['', 'Rows', 'Malignant'],
              [['Train pool: every development decision', String(T.pool), String(T.poolMalignant)],
               ['Final test: locked until step 6', String(T.test), String(T.testMalignant)]]) +
            '<p class="mb0">Everything from step 3 to step 5 uses the pool only. The final test ' +
            'set is not opened for debugging, tuning or reassurance.</p>';
        case 3:
          return '<h4>What does doing nothing score?</h4><p>The majority-class baseline predicts ' +
            '"benign" for everyone. Its cross-validated accuracy on the pool is <strong>' +
            pct(E.baseline.cv) + '</strong>, without learning anything.</p>' +
            '<p class="mb0">Every later number is read against this one, not against zero.</p>';
        case 4:
          return '<h4>Two models, the same protocol</h4>' +
            table('Stratified 5-fold cross-validation on the 455-row pool.',
              ['Model', 'Training', 'Cross-validation', 'sd'],
              [['Majority baseline', pct(E.baseline.train), pct(E.baseline.cv), '–'],
               ['Decision tree, max_depth = 3', pct(t3.train), pct(t3.cv), t3.cvSd.toFixed(3)],
               ['k-NN, k = 5, standardised', pct(k5.train), pct(k5.cv), k5.cvSd.toFixed(3)]]) +
            '<p class="mb0">Both clear the baseline by a wide margin. The training column is not ' +
            'evidence: it measures memory, not generalisation.</p>';
        case 5:
          return '<h4>Tune each by cross-validation, on the pool</h4>' +
            table('The value each search chose (highest CV accuracy).',
              ['Model', 'Chosen value', 'Training', 'Cross-validation'],
              [['Decision tree', 'max_depth = ' + ct, pct(at('tree', ct).train), pct(at('tree', ct).cv)],
               ['k-NN', 'k = ' + ck, pct(at('knn', ck).train), pct(at('knn', ck).cv)]]) +
            '<p class="mb0">Choose which tuned model goes to the final test <strong>now</strong>, ' +
            'with the control above. Cross-validation favours k-NN; the lecture carries the ' +
            'depth-' + ct + ' tree forward because it can be inspected. Either is defensible ' +
            'if it is decided and stated before the test set is opened.</p>';
        case 6:
          return '<h4>The final test, used once</h4>' +
            table('Three honest numbers per model (slide 67). The final-test column was computed once.',
              ['Model', 'Training', 'Cross-validation', 'Final test'],
              [['Majority baseline', '–', '–', pct(E.baseline.test)],
               ['Decision tree (max_depth = ' + ct + ')', pct(E.final.tree.train), pct(E.final.tree.cv), pct(E.final.tree.test)],
               ['k-NN (k = ' + ck + ')', pct(E.final.knn.train), pct(E.final.knn.cv), pct(E.final.knn.test)]]) +
            '<p class="mb0">You chose <strong>' + (state.final === 'tree' ? 'the tree' : 'k-NN') +
            '</strong>, so the number you report is <strong>' + pct(F.test) + '</strong>, beside its ' +
            'protocol. The other model\'s test score is shown for teaching only: picking the ' +
            'winner after looking would be test-set leakage.</p>';
        default:
          var cm = F.cm;
          return '<h4>Behind the number: the confusion matrix</h4>' +
            table('Final test set, ' + T.test + ' cases. Rows are the truth.',
              ['', 'Predicted benign', 'Predicted malignant'],
              [['Actually benign', String(cm.tn), String(cm.fp)],
               ['Actually malignant', String(cm.fn), String(cm.tp)]]) +
            '<p>Sensitivity (recall) ' + pct(F.recall) + ', specificity ' + pct(F.specificity) +
            (F.precision != null ? ', precision ' + pct(F.precision) : '') + '. <strong>' + cm.fn +
            ' malignant case' + (cm.fn === 1 ? ' was' : 's were') + ' missed</strong> and ' + cm.fp +
            ' benign case' + (cm.fp === 1 ? ' was' : 's were') + ' flagged.</p>' +
            (F.falseNegatives.length
              ? table('The missed malignant cases, individually (real held-out values).',
                  ['Case'].concat(E.shownFeatures),
                  F.falseNegatives.map(function (r, i) {
                    return ['missed ' + (i + 1)].concat(r.map(function (v) { return String(v); }));
                  }))
              : '') +
            '<p class="small muted mb0">Classroom evaluation on real data, not evidence of clinical ' +
            'performance. Are these borderline cases, or readings the model should have caught?</p>';
      }
    }

    function draw() {
      stage.innerHTML = stepper() + '<div class="e2e">' + panel() + '</div>';
      stage.querySelectorAll('[data-opt^="step-"]').forEach(function (b) {
        b.addEventListener('click', function () {
          state.step = +b.getAttribute('data-opt').slice(5); sync(); refresh();
        });
      });
    }

    function update() {
      var F = E.final[state.final];
      var opened = state.step >= 6;
      U.setMetric('e2e-step', state.step + ' of 7', STEPS[state.step - 1]);
      U.setMetric('e2e-test', opened ? 'Used once' : 'Locked',
        opened ? T.test + ' rows, opened at step 6' : 'not yet opened', opened ? null : 'good');
      U.setMetric('e2e-choice', state.final === 'tree' ? 'Tree, depth ' + T.chosen.tree :
        'k-NN, k = ' + T.chosen.knn, 'CV ' + pct(F.cv) + ' on the pool');
      U.setMetric('e2e-report', opened ? pct(F.test) : '—',
        opened ? 'final test, with its protocol' : 'nothing to report yet');
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' +
        'Building a model is easy. Designing an experiment that gives trustworthy evidence is ' +
        'the harder and more important skill. Step through in order, or jump with the slider; ' +
        'the final-test numbers stay hidden until step 6.</p>';
      altBody.innerHTML = '<p>Step ' + state.step + ' of 7: ' + STEPS[state.step - 1] + '.</p>' +
        '<div>' + panel() + '</div>';
    }

    function refresh() { draw(); update(); }

    host.querySelector('#e2e-s').addEventListener('input', function () {
      state.step = +this.value; host.querySelector('#e2e-s-val').textContent = String(state.step);
      refresh();
    });
    host.querySelector('[data-e2e-prev]').addEventListener('click', function () {
      state.step = Math.max(1, state.step - 1); sync(); refresh();
    });
    host.querySelector('[data-e2e-next]').addEventListener('click', function () {
      state.step = Math.min(7, state.step + 1); sync(); refresh();
    });
    U.onSegment(host.querySelector('#e2e-final'), function (v) { state.final = v; refresh(); });
    function sync() {
      host.querySelector('#e2e-s').value = state.step;
      host.querySelector('#e2e-s-val').textContent = String(state.step);
      host.querySelectorAll('#e2e-final button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === state.final));
      });
    }
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); sync(); refresh();
    });
    sync();
    refresh();
  });
})();
