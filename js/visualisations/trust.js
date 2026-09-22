/* Week 12 - "Would you trust this model?"
 *
 * A scenario is presented as a paper abstract would present it. The student
 * runs investigations, each of which reveals something, and each revelation
 * adjusts a running trust assessment. The point is not to reach a verdict but
 * to internalise the list of questions, so the panel ends by showing which
 * investigations were never run.
 *
 * The confidence intervals shown are computed with the Wilson score interval,
 * which is real arithmetic on the scenario's stated numbers.
 */
(function () {
  'use strict';

  var SCENARIOS = {
    cancer: {
      title: 'A cancer detection model reporting 97% accuracy',
      abstract:
        'We present a deep learning model for the detection of malignancy from ' +
        'digitised histopathology slides. On our test set the model achieves 97% ' +
        'accuracy, outperforming previously published approaches. These results ' +
        'suggest the model is ready for clinical evaluation.',
      headline: 0.97,
      n: 150,
      findings: {
        size: { label: 'How many test samples?',
          reveal: '150 samples in the test set.',
          verdict: 'concern',
          detail: 'A 95% Wilson interval around 97% on 150 samples runs from ' +
            'about 92.7% to 98.8%. That interval is compatible with a model ' +
            'several points worse than the headline. It is also wide enough that ' +
            'the comparison with "previously published approaches" is unlikely ' +
            'to be statistically meaningful unless those were evaluated on the ' +
            'same set.' },
        balance: { label: 'What is the class balance?',
          reveal: '8% of the test samples are malignant.',
          verdict: 'serious',
          detail: 'Predicting "benign" for every slide would score 92%. The ' +
            'model beats that by five points, which is real but is a much ' +
            'smaller claim than "97% accurate" suggests. On an imbalanced ' +
            'problem, accuracy is close to uninformative and the paper should ' +
            'have reported sensitivity, specificity and a precision-recall ' +
            'curve.' },
        external: { label: 'Was there external validation?',
          reveal: 'No. Train and test are random splits of one institution\'s archive.',
          verdict: 'serious',
          detail: 'Every slide came from one laboratory, one scanner, one ' +
            'staining protocol and one patient population. A random split cannot ' +
            'detect anything shared by every slide in the archive. Models of this ' +
            'kind routinely lose a large fraction of their performance on the ' +
            'first external cohort, and there is no way to estimate how much from ' +
            'inside the study.' },
        leakage: { label: 'How were the slides split?',
          reveal: 'At random, by image tile. Several tiles come from each patient.',
          verdict: 'serious',
          detail: 'Tiles from the same patient appear in both training and test. ' +
            'The model can recognise the patient rather than the pathology, and ' +
            'the reported figure is inflated by an unknown amount. This is group ' +
            'leakage, and the fix, splitting by patient, is a one-line change ' +
            'that would have been made if anyone had asked.' },
        calib: { label: 'Is the model calibrated?',
          reveal: 'Not assessed. Only thresholded predictions are reported.',
          verdict: 'concern',
          detail: 'Without a calibration curve you cannot tell whether the ' +
            'model\'s stated confidence means anything. A model can rank cases ' +
            'well and still be systematically overconfident, which matters ' +
            'directly if a clinician is meant to act on a probability.' },
        demo: { label: 'Who is represented in the data?',
          reveal: 'Demographics were not recorded and cannot be reported.',
          verdict: 'serious',
          detail: 'Aggregate accuracy conceals subgroup failure. Without ' +
            'demographic information there is no way to check whether the model ' +
            'performs equally across groups, and no way to detect it later. This ' +
            'is a design failure rather than an analysis failure.' },
        sens: { label: 'What are the sensitivity and specificity separately?',
          reveal: 'Sensitivity 0.71, specificity 0.99.',
          verdict: 'serious',
          detail: 'The model misses 29% of malignant cases. It reaches 97% ' +
            'overall accuracy by being very good at the easy, common, benign ' +
            'class. For a detection task, that is close to the opposite of what ' +
            'is wanted, and a single accuracy figure hid it completely.' },
        ci: { label: 'Are confidence intervals reported?',
          reveal: 'No. Point estimates only.',
          verdict: 'concern',
          detail: 'Given the test-set size, the interval is wide enough to ' +
            'change how the result should be read. Reporting point estimates ' +
            'without intervals is the single easiest thing to fix in this paper.' }
      }
    },
    nutrition: {
      title: 'A dietary pattern model reporting AUC 0.89 for predicting metabolic syndrome',
      abstract:
        'Using machine learning on national survey data, we identify dietary ' +
        'patterns predictive of metabolic syndrome, achieving an AUC of 0.89 in ' +
        'cross-validation. Our findings indicate that dietary intervention ' +
        'targeting these patterns could reduce disease burden.',
      headline: 0.89,
      n: 4200,
      findings: {
        size: { label: 'How many participants?',
          reveal: '4,200 participants, cross-validated.',
          verdict: 'ok',
          detail: 'This is a reasonable sample for a survey analysis and the ' +
            'confidence interval on the AUC will be fairly tight. Sample size is ' +
            'not the problem with this study.' },
        balance: { label: 'What is the outcome prevalence?',
          reveal: '31% of participants meet the metabolic syndrome criteria.',
          verdict: 'ok',
          detail: 'A reasonably balanced outcome, so AUC is a sensible summary ' +
            'here and the baseline is not doing the work.' },
        external: { label: 'Was there external validation?',
          reveal: 'No. Cross-validation within a single survey cycle.',
          verdict: 'concern',
          detail: 'Dietary reporting habits, survey instruments and population ' +
            'composition all shift between cycles and between countries. ' +
            'Cross-validation within one cycle cannot detect that.' },
        leakage: { label: 'Which features were used?',
          reveal: 'Includes BMI, waist circumference and fasting glucose.',
          verdict: 'serious',
          detail: 'Waist circumference and fasting glucose are components of the ' +
            'metabolic syndrome definition. The model is partly reading its own ' +
            'outcome, which is target leakage, and it explains the AUC far better ' +
            'than the dietary pattern does. Removing those features is the first ' +
            'thing a reviewer should ask for.' },
        calib: { label: 'Is the model calibrated?',
          reveal: 'Calibration curve reported and close to the diagonal.',
          verdict: 'ok',
          detail: 'Good practice, and unfortunately it does not rescue the study: ' +
            'a well-calibrated model of a leaked outcome is still a model of a ' +
            'leaked outcome.' },
        demo: { label: 'Who is represented in the data?',
          reveal: 'Survey weights were not applied; the analysis is unweighted.',
          verdict: 'concern',
          detail: 'The survey oversamples some subgroups by design. An unweighted ' +
            'analysis describes the sample rather than the population, so the ' +
            'population-level claim in the conclusion is not supported by the ' +
            'analysis as run.' },
        sens: { label: 'What is the claim in the conclusion?',
          reveal: '"Dietary intervention targeting these patterns could reduce disease burden."',
          verdict: 'serious',
          detail: 'This is a causal and interventional claim from a ' +
            'cross-sectional predictive model. Nothing in the design supports the ' +
            'direction of effect, let alone the effect of intervening. The model ' +
            'may be predictively useful and the conclusion still be unsupported.' },
        ci: { label: 'Are confidence intervals reported?',
          reveal: 'Yes, AUC 0.89 (95% CI 0.87 to 0.91).',
          verdict: 'ok',
          detail: 'Properly reported. The interval is narrow, which reflects the ' +
            'sample size. It says nothing about whether the quantity being ' +
            'estimated is the right one.' }
      }
    }
  };

  window.Chart.register('viz-trust', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var state = { scenario: 'cancer', found: {} };

    function S() { return SCENARIOS[state.scenario]; }

    function score() {
      var s = S(), keys = Object.keys(s.findings);
      var serious = 0, concern = 0, ok = 0;
      keys.forEach(function (k) {
        if (!state.found[k]) return;
        var v = s.findings[k].verdict;
        if (v === 'serious') serious++;
        else if (v === 'concern') concern++;
        else ok++;
      });
      return { serious: serious, concern: concern, ok: ok,
               run: serious + concern + ok, total: keys.length };
    }

    function render() {
      var s = S();
      var keys = Object.keys(s.findings);

      stage.innerHTML =
        '<div style="max-width:70ch">' +
          '<div class="callout" style="border-left-color:var(--ink-3)">' +
            '<div class="callout-title">The claim, as it would be published</div>' +
            '<p style="font-style:italic;margin-bottom:0">' +
              window.UI.esc(s.abstract) + '</p>' +
          '</div>' +
          '<p><strong>Investigate before you decide.</strong> Each button asks ' +
            'one question a reviewer should ask. Run them in whatever order you ' +
            'like, and notice how the picture changes.</p>' +
          '<div class="grid grid-2" style="gap:var(--s3);margin-bottom:var(--s5)">' +
            keys.map(function (k) {
              var done = state.found[k];
              var v = done ? s.findings[k].verdict : null;
              var col = v === 'serious' ? 'var(--danger)'
                      : (v === 'concern' ? 'var(--warn)' : 'var(--ok)');
              return '<button type="button" class="btn" data-find="' + k + '" ' +
                'style="justify-content:flex-start;text-align:left' +
                (done ? ';border-color:' + col + ';border-left-width:3px' : '') +
                '"' + (done ? ' disabled' : '') + '>' +
                (done ? '<span style="color:' + col + ';font-weight:700">' +
                        (v === 'serious' ? '✕' : (v === 'concern' ? '!' : '✓')) +
                        '</span> ' : '') +
                window.UI.esc(s.findings[k].label) + '</button>';
            }).join('') +
          '</div>' +
          '<div data-trust-findings></div>' +
        '</div>';

      stage.querySelectorAll('[data-find]').forEach(function (b) {
        b.addEventListener('click', function () {
          state.found[b.getAttribute('data-find')] = true;
          render(); updateMetrics(); updateExplain(); updateAlt();
        });
      });

      renderFindings();
    }

    function renderFindings() {
      var s = S();
      var slot = stage.querySelector('[data-trust-findings]');
      var keys = Object.keys(s.findings).filter(function (k) {
        return state.found[k];
      });
      if (!keys.length) {
        slot.innerHTML = '<p class="small muted mb0">No investigations run yet. ' +
          'The headline figure is ' +
          (s.headline < 1 ? (s.headline * 100).toFixed(0) + '%' : s.headline) +
          ' and, on its own, it tells you almost nothing.</p>';
        return;
      }
      slot.innerHTML = keys.map(function (k) {
        var fnd = s.findings[k];
        var kind = fnd.verdict === 'serious' ? 'warn'
                 : (fnd.verdict === 'concern' ? 'sci' : 'key');
        return window.UI.callout(kind, fnd.label,
          '<p><strong>' + window.UI.esc(fnd.reveal) + '</strong></p>' +
          '<p class="mb0">' + window.UI.esc(fnd.detail) + '</p>');
      }).join('');
    }

    function updateMetrics() {
      var s = S(), sc = score();
      var ci = window.ML.wilson(Math.round(s.headline * s.n), s.n);

      window.UI.setMetric('tr-headline',
        (s.headline * 100).toFixed(0) + '%', 'the reported figure');
      window.UI.setMetric('tr-ci',
        (ci[0] * 100).toFixed(1) + ' to ' + (ci[1] * 100).toFixed(1) + '%',
        '95% Wilson interval on n = ' + s.n,
        (ci[1] - ci[0]) > 0.05 ? 'bad' : null);
      window.UI.setMetric('tr-serious', String(sc.serious),
        'serious problems found',
        sc.serious > 0 ? 'bad' : null);
      window.UI.setMetric('tr-run', sc.run + ' / ' + sc.total,
        'investigations run');
    }

    function updateExplain() {
      var s = S(), sc = score();
      var el = host.querySelector('[data-viz-note]');
      var unrun = Object.keys(s.findings).filter(function (k) {
        return !state.found[k];
      });

      var msg;
      if (sc.run === 0) {
        msg = '<p class="mb0">Nothing has been investigated yet. Note that at ' +
          'this point you have exactly the information a reader of the abstract ' +
          'has, and it is enough to form an impression but not enough to form a ' +
          'judgement. That gap is what this exercise is about.</p>';
      } else if (unrun.length === 0) {
        msg = '<p>Every investigation has been run. ' + sc.serious +
          ' serious problem' + (sc.serious === 1 ? '' : 's') + ', ' + sc.concern +
          ' concern' + (sc.concern === 1 ? '' : 's') + ', and ' + sc.ok +
          ' item' + (sc.ok === 1 ? '' : 's') + ' that stood up.</p>' +
          '<p class="mb0"><strong>The question these buttons are really asking ' +
          'is not whether this model is good.</strong> It is whether the ' +
          'evidence offered supports the claim made. In both scenarios the ' +
          'model may well be doing something useful. What is missing is the ' +
          'work that would let a reader know. When you write up your own ' +
          'projects, the reviewer\'s job is to ask these questions and yours is ' +
          'to have answered them already.</p>';
      } else {
        msg = '<p>' + sc.serious + ' serious problem' +
          (sc.serious === 1 ? '' : 's') + ' and ' + sc.concern + ' concern' +
          (sc.concern === 1 ? '' : 's') + ' so far, with ' + unrun.length +
          ' question' + (unrun.length === 1 ? '' : 's') + ' still unasked.</p>' +
          '<p class="mb0"><strong>Do not stop early.</strong> The most common ' +
          'failure in reviewing is finding one problem, forming a view, and not ' +
          'asking the rest. Some of the remaining questions have reassuring ' +
          'answers and some do not, and you cannot tell which from here.</p>';
      }
      el.innerHTML = msg;
    }

    function updateAlt() {
      var s = S();
      altBody.innerHTML =
        '<p>This activity presents a published-style claim and a set of ' +
        'investigations you can run against it. There is no chart. The full ' +
        'content of both scenarios follows.</p>' +
        Object.keys(SCENARIOS).map(function (key) {
          var sc = SCENARIOS[key];
          var ci = window.ML.wilson(Math.round(sc.headline * sc.n), sc.n);
          return '<h4>' + window.UI.esc(sc.title) + '</h4>' +
            '<p><em>' + window.UI.esc(sc.abstract) + '</em></p>' +
            '<p>Headline figure ' + (sc.headline * 100).toFixed(0) + '% on n = ' +
            sc.n + ', giving a 95% Wilson interval of ' +
            (ci[0] * 100).toFixed(1) + '% to ' + (ci[1] * 100).toFixed(1) +
            '%.</p><dl class="dl-grid">' +
            Object.keys(sc.findings).map(function (k) {
              var fnd = sc.findings[k];
              return '<dt>' + window.UI.esc(fnd.label) + '</dt><dd><strong>' +
                window.UI.esc(fnd.reveal) + '</strong> (' + fnd.verdict + ') ' +
                window.UI.esc(fnd.detail) + '</dd>';
            }).join('') + '</dl>';
        }).join('');
    }

    host.querySelector('#tr-scenario').addEventListener('change', function () {
      state.scenario = this.value; state.found = {};
      render(); updateMetrics(); updateExplain(); updateAlt();
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.found = {};
      render(); updateMetrics(); updateExplain(); updateAlt();
    });

    render(); updateMetrics(); updateExplain(); updateAlt();
  });
})();
