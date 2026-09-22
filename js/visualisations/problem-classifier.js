/* Week 1 - "What type of machine-learning problem is this?"
 *
 * Students read a real biological scenario and classify it. The feedback
 * explains not only which answer is right but why the tempting wrong answer is
 * tempting, which is where the learning is.
 */
(function () {
  'use strict';

  var TYPES = [
    { id: 'classification', label: 'Classification',
      hint: 'Predict which of a fixed set of categories a sample belongs to.' },
    { id: 'regression', label: 'Regression',
      hint: 'Predict a continuous quantity.' },
    { id: 'clustering', label: 'Clustering',
      hint: 'Find groups when you have no labels.' },
    { id: 'dimred', label: 'Dimensionality reduction',
      hint: 'Compress many features into a few informative ones.' },
    { id: 'sequence', label: 'Sequence modelling',
      hint: 'The order of the elements carries the signal.' },
    { id: 'representation', label: 'Representation learning',
      hint: 'Learn a useful vector encoding rather than a prediction.' }
  ];

  var SCENARIOS = [
    {
      text: 'You have 569 breast masses, each described by 30 measurements of ' +
            'cell-nucleus shape and texture, and for each one a pathologist has ' +
            'recorded whether it was benign or malignant. Predict the diagnosis ' +
            'for a new mass.',
      answer: 'classification',
      why: 'The target is one of two known categories and every training example ' +
           'is labelled. This is the WDBC problem used throughout the module.',
      trap: 'It is not clustering: you already have the labels, so using them is ' +
            'not only allowed, it would be negligent not to.'
    },
    {
      text: 'From a participant\'s 24-hour dietary recall and demographic data, ' +
            'predict their serum vitamin D concentration in nanomoles per litre.',
      answer: 'regression',
      why: 'The target is a continuous measurement, not a category.',
      trap: 'You could bin the concentration into "deficient" and "sufficient" and ' +
            'make it classification, but that throws information away. Do it only ' +
            'if the clinical decision really is binary.'
    },
    {
      text: 'You have RNA-seq profiles from 4,000 tumours and no subtype ' +
            'annotations. You want to know whether the tumours fall into ' +
            'recognisable groups.',
      answer: 'clustering',
      why: 'No labels exist and the goal is to discover structure.',
      trap: 'Finding clusters is not the same as discovering subtypes. Week 9 is ' +
            'largely about the distance between those two statements.'
    },
    {
      text: 'A transcriptome has 20,000 gene-expression values per patient and ' +
            'you have 180 patients. Before doing anything else you want to ' +
            'compress this to a handful of informative axes you can plot.',
      answer: 'dimred',
      why: 'You are reducing 20,000 features to a few components while retaining ' +
           'as much variance as possible. This is PCA territory.',
      trap: 'With 180 patients and 20,000 features, fitting a classifier directly ' +
            'is asking for trouble. Reduce first, but reduce inside the ' +
            'cross-validation fold.'
    },
    {
      text: 'Given a DNA sequence, predict whether a splice site occurs at a ' +
            'particular position. Which bases are present matters, but so does ' +
            'the order they appear in and their spacing.',
      answer: 'sequence',
      why: 'The signal is in the arrangement, not in the base composition. A ' +
           'bag-of-bases representation destroys exactly the information you need.',
      trap: 'It is a classification task in its output, but the modelling problem ' +
            'is sequential. Choosing a model that ignores order is the mistake.'
    },
    {
      text: 'You run 300 protein sequences through ESM-2 and mean-pool the final ' +
            'hidden layer to get one 320-dimensional vector each. You have not ' +
            'used any labels and you have not made any predictions yet.',
      answer: 'representation',
      why: 'You have produced an encoding, not a prediction. What you do next with ' +
           'those vectors is a separate modelling decision.',
      trap: 'It is easy to call this "using a foundation model to classify ' +
            'proteins". It is not. The classification step has not happened, and ' +
            'it will be an ordinary supervised model when it does.'
    },
    {
      text: 'You have 12,000 FDA food-recall notices, each with a free-text ' +
            'reason and an assigned hazard class of I, II or III. Predict the ' +
            'hazard class of a new notice.',
      answer: 'classification',
      why: 'Three known categories, labelled training data. The input happens to be ' +
           'text, which changes the representation but not the problem type.',
      trap: 'Three classes rather than two does not make it something else. And ' +
            'note that you are predicting the FDA\'s classification decision, not ' +
            'the underlying risk.'
    },
    {
      text: 'You have 8,000 NHANES participants with dietary, demographic and ' +
            'laboratory data, and you want to know whether recognisable dietary ' +
            'patterns exist in the population.',
      answer: 'clustering',
      why: 'No pattern labels exist in advance; the patterns are what you are ' +
           'looking for.',
      trap: 'Nutritional epidemiology does this often, and the resulting patterns ' +
            'are frequently sensitive to preprocessing choices. Stability analysis ' +
            'is not optional here.'
    }
  ];

  window.Chart.register('viz-problem-classifier', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var order = null, pos = 0, score = 0, answered = 0;

    function reset() {
      var rng = new window.ML.Random(7);
      order = rng.shuffle(SCENARIOS.map(function (_, i) { return i; }));
      pos = 0; score = 0; answered = 0;
      render();
    }

    function render() {
      var s = SCENARIOS[order[pos]];
      var html =
        '<div style="max-width:62ch">' +
          '<p class="tiny muted mono">Scenario ' + (pos + 1) + ' of ' +
            SCENARIOS.length + '</p>' +
          '<p style="font-size:1.02rem">' + window.UI.esc(s.text) + '</p>' +
          '<div class="grid grid-3" style="gap:var(--s3);margin-bottom:var(--s5)">' +
            TYPES.map(function (t) {
              return '<button type="button" class="btn" data-type="' + t.id +
                '" style="justify-content:flex-start;text-align:left;' +
                'flex-direction:column;align-items:flex-start;gap:2px;' +
                'padding:var(--s3) var(--s4);height:100%">' +
                '<span style="font-weight:640">' + t.label + '</span>' +
                '<span class="tiny muted" style="font-weight:400;' +
                'white-space:normal;line-height:1.35">' + t.hint + '</span>' +
                '</button>';
            }).join('') +
          '</div>' +
          '<div data-feedback-slot role="status" aria-live="polite"></div>' +
        '</div>';
      stage.innerHTML = html;

      stage.querySelectorAll('[data-type]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          choose(btn.getAttribute('data-type'), s);
        });
      });

      window.UI.setMetric('pc-score', score + ' / ' + answered,
        answered ? Math.round(100 * score / answered) + '% correct so far'
                 : 'No answers yet');
      updateAlt();
    }

    function choose(chosen, s) {
      var right = chosen === s.answer;
      answered++;
      if (right) score++;

      stage.querySelectorAll('[data-type]').forEach(function (b) {
        b.disabled = true;
        var t = b.getAttribute('data-type');
        if (t === s.answer) {
          b.style.borderColor = 'var(--ok)';
          b.style.background = 'var(--ok-soft)';
        } else if (t === chosen) {
          b.style.borderColor = 'var(--danger)';
          b.style.background = 'var(--danger-soft)';
        }
      });

      var label = TYPES.filter(function (t) { return t.id === s.answer; })[0].label;
      var slot = stage.querySelector('[data-feedback-slot]');
      slot.innerHTML =
        '<div class="quiz-why ' + (right ? 'ok' : 'no') + '" style="margin-bottom:var(--s4)">' +
          '<p style="margin-bottom:var(--s2)"><strong>' +
            (right ? 'Correct. ' : 'The answer is ' + label + '. ') +
          '</strong>' + window.UI.esc(s.why) + '</p>' +
          '<p class="mb0"><strong>Worth noticing. </strong>' +
            window.UI.esc(s.trap) + '</p>' +
        '</div>' +
        (pos < SCENARIOS.length - 1
          ? '<button type="button" class="btn btn-primary" data-next>Next scenario</button>'
          : '<p class="mb0"><strong>That is all eight.</strong> You scored ' +
            score + ' out of ' + answered + '. Use Reset to shuffle and go again.</p>');

      var next = slot.querySelector('[data-next]');
      if (next) next.addEventListener('click', function () { pos++; render(); });

      window.UI.setMetric('pc-score', score + ' / ' + answered,
        Math.round(100 * score / answered) + '% correct so far',
        right ? 'good' : null);
    }

    function updateAlt() {
      altBody.innerHTML =
        '<p>This activity is a set of ' + SCENARIOS.length + ' written biological ' +
        'scenarios. For each one you choose which of six problem types it is, and ' +
        'the activity explains both the correct answer and the most tempting wrong ' +
        'one. There is no chart. The full list of scenarios and answers follows, ' +
        'so the activity is usable without interacting with it.</p>' +
        '<dl class="dl-grid">' + TYPES.map(function (t) {
          return '<dt>' + window.UI.esc(t.label) + '</dt><dd>' +
                 window.UI.esc(t.hint) + '</dd>';
        }).join('') + '</dl>' +
        '<ol>' + SCENARIOS.map(function (s) {
          var lbl = TYPES.filter(function (t) { return t.id === s.answer; })[0].label;
          return '<li style="margin-bottom:var(--s4)">' + window.UI.esc(s.text) +
            '<br><strong>Answer: ' + lbl + '.</strong> ' + window.UI.esc(s.why) +
            ' <em>' + window.UI.esc(s.trap) + '</em></li>';
        }).join('') + '</ol>';
    }

    host.querySelector('[data-viz-reset]').addEventListener('click', reset);
    reset();
  });
})();
