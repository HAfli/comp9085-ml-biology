/* The persistent classical-versus-foundation pipeline diagram, and the
 * "Should I use a foundation model?" decision tool.
 *
 * Both appear on more than one page, so both live here.
 */
(function () {
  'use strict';

  /* ==================================================================== */
  /* 1. The persistent pipeline comparison                                */
  /* ==================================================================== */

  window.Chart.register('viz-pipelines', function (host) {
    var P = window.COURSE.pipelines;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var open = { classical: null, foundation: null };

    function render() {
      stage.innerHTML =
        '<div class="grid grid-2" style="align-items:start">' +
          column('classical', P.classical, 'var(--stage-1)') +
          column('foundation', P.foundation, 'var(--stage-3)') +
        '</div>' +
        '<div class="callout callout-key" style="margin-top:var(--s5)">' +
          '<div class="callout-title">The part people skip</div>' +
          '<p class="mb0">' + window.UI.esc(P.foundation.note) + '</p>' +
        '</div>';

      stage.querySelectorAll('.pipeline-step').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var side = btn.getAttribute('data-side');
          var id = btn.getAttribute('data-step');
          open[side] = open[side] === id ? null : id;
          render();
        });
      });
    }

    function column(side, spec, colour) {
      return '<div>' +
        '<h4 style="color:' + colour + ';margin-top:0">' +
          window.UI.esc(spec.title) + '</h4>' +
        '<div class="pipeline">' +
          spec.steps.map(function (s, i) {
            var isOpen = open[side] === s.id;
            return '<button type="button" class="pipeline-step" ' +
              'data-side="' + side + '" data-step="' + s.id + '" ' +
              'aria-expanded="' + isOpen + '">' +
              '<span class="idx">' + (i + 1) + '</span>' +
              '<span><span class="label">' + window.UI.esc(s.label) + '</span>' +
              '<span class="body">' + window.UI.esc(s.body) + '</span></span>' +
              '</button>' +
              (isOpen ? '<div class="pipeline-detail"><strong>For example. </strong>' +
                        window.UI.cites(window.UI.esc(s.example)) + '</div>' : '') +
              (i < spec.steps.length - 1
                ? '<div style="text-align:center;color:var(--ink-4);' +
                  'font-size:1.1rem;line-height:0.7" aria-hidden="true">↓</div>'
                : '');
          }).join('') +
        '</div></div>';
    }

    altBody.innerHTML =
      '<p>Two vertical flow diagrams side by side. Each stage is a button that ' +
      'expands to show a concrete example. The full content follows.</p>' +
      ['classical', 'foundation'].map(function (side) {
        var spec = P[side];
        return '<h4>' + window.UI.esc(spec.title) + '</h4><ol>' +
          spec.steps.map(function (s) {
            return '<li><strong>' + window.UI.esc(s.label) + '.</strong> ' +
              window.UI.esc(s.body) + ' <em>Example: ' +
              window.UI.cites(window.UI.esc(s.example)) + '</em></li>';
          }).join('') + '</ol>' +
          (spec.note ? '<p><strong>' + window.UI.esc(spec.note) + '</strong></p>' : '');
      }).join('');

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      open = { classical: null, foundation: null };
      render();
    });

    render();
  });

  /* ==================================================================== */
  /* 2. "Should I use a foundation model?"                                */
  /* ==================================================================== */

  var TREE = {
    start: {
      q: 'Is your input a sequence, an image, or free text?',
      help: 'Foundation models exist for data types where a general pretrained ' +
            'representation is possible. A table of hand-measured clinical ' +
            'values is not one of them.',
      options: [
        { label: 'Yes, one of those', next: 'pretrained' },
        { label: 'No, it is tabular or bespoke measurements', next: 'tabular' }
      ]
    },
    tabular: {
      terminal: 'classical',
      title: 'Use classical machine learning.',
      body: 'For tabular biological and clinical data, gradient-boosted trees ' +
            'and regularised linear models remain the strongest and most ' +
            'practical choice, and no general pretrained model exists for your ' +
            'columns. This is not a limitation you should work around; it is ' +
            'the correct answer. The WDBC results in this module make the point: ' +
            'logistic regression reaches 97.4 per cent and nothing more elaborate ' +
            'beats it by a margin the error bars can support.'
    },
    pretrained: {
      q: 'Does a pretrained model exist that was trained on data like yours?',
      help: 'DNA and protein have several. Clinical text has some. Rare ' +
            'modalities, unusual organisms and specialised assays often have none.',
      options: [
        { label: 'Yes, and it covers my organism or domain', next: 'similarity' },
        { label: 'Something exists but the domain is quite different', next: 'similarity' },
        { label: 'No', next: 'nomodel' }
      ]
    },
    nomodel: {
      terminal: 'classical',
      title: 'Classical machine learning, and consider building features by hand.',
      body: 'Without a suitable pretrained model, the foundation-model route ' +
            'means pretraining one yourself, which needs a corpus and a compute ' +
            'budget most projects do not have. Hand-engineered features plus a ' +
            'strong classical model is the realistic path, and it is often ' +
            'competitive: on the family task in Week 7, composition features beat ' +
            'the learned representation outright.'
    },
    similarity: {
      q: 'How many labelled examples do you have?',
      help: 'This is usually the binding constraint, and it is worth counting ' +
            'properly rather than estimating.',
      options: [
        { label: 'Fewer than about 100', next: 'tiny' },
        { label: 'Roughly 100 to 1,000', next: 'embed' },
        { label: 'Roughly 1,000 to 10,000', next: 'compute' },
        { label: 'More than 10,000', next: 'compute' }
      ]
    },
    tiny: {
      q: 'Can the task be expressed in terms the pretrained model already handles?',
      help: 'If so, zero-shot use costs nothing to try and occasionally works.',
      options: [
        { label: 'Possibly, it is worth a try', next: 'zeroshot' },
        { label: 'No, it needs task-specific supervision', next: 'embed' }
      ]
    },
    zeroshot: {
      terminal: 'zeroshot',
      title: 'Try zero-shot first, then frozen embeddings.',
      body: 'Zero-shot costs no labels and no training, so there is no reason ' +
            'not to measure it. Whatever it gives you becomes the baseline. Then ' +
            'try frozen embeddings with a simple classifier on the few labels you ' +
            'have. With fewer than a hundred examples, anything more elaborate ' +
            'will overfit and, more importantly, you will not be able to detect ' +
            'that it has: your validation set is too small to distinguish models ' +
            'that differ by less than about ten percentage points.'
    },
    embed: {
      terminal: 'embeddings',
      title: 'Frozen embeddings plus a classical model.',
      body: 'This is the recipe that gets underused. Compute the embeddings once, ' +
            'cache them, and train logistic regression, k-NN or a random forest ' +
            'on top. No gradient ever passes through the large model, so it runs ' +
            'on a CPU, cross-validates honestly in seconds, and the downstream ' +
            'model is small enough to interpret. Compare it against ' +
            'hand-engineered features on the same task before going further: on ' +
            'some tasks the simple features win, and you want to know that before ' +
            'you spend a GPU-week finding out.'
    },
    compute: {
      q: 'Do you have GPU access for at least several hours?',
      help: 'Parameter-efficient fine-tuning needs much less than full ' +
            'fine-tuning, but it still needs a GPU.',
      options: [
        { label: 'Yes', next: 'interp' },
        { label: 'No, CPU only', next: 'embed' }
      ]
    },
    interp: {
      q: 'Does this application require an interpretable model?',
      help: 'Clinical decision support, regulatory submission and anything a ' +
            'clinician must be able to justify to a patient usually do.',
      options: [
        { label: 'Yes, interpretability is a requirement', next: 'interpYes' },
        { label: 'No, predictive performance is what matters', next: 'clinical' }
      ]
    },
    interpYes: {
      terminal: 'embeddings',
      title: 'Frozen embeddings plus an interpretable head, and compare against features.',
      body: 'A fine-tuned network is not interpretable, and post-hoc attribution ' +
            'methods describe the model rather than the biology. Embeddings plus ' +
            'a linear model at least gives you coefficients and a calibratable ' +
            'output, though the embedding dimensions themselves rarely mean ' +
            'anything individually. Run the hand-engineered-feature model ' +
            'alongside it: if the two are within each other\'s error bars, the ' +
            'interpretable one is the one to deploy.'
    },
    clinical: {
      q: 'Is this a clinical application, or will it inform patient care?',
      help: 'The evidential bar is different, and it is not a matter of degree.',
      options: [
        { label: 'Yes', next: 'clinicalYes' },
        { label: 'No, it is research or exploratory', next: 'finetune' }
      ]
    },
    clinicalYes: {
      terminal: 'caution',
      title: 'Do not deploy without external validation, whatever the model.',
      body: 'You may well have the data and compute to fine-tune, and it may well ' +
            'give the best internal score. That is not the question. A clinical ' +
            'model needs validation on independently collected data, reported ' +
            'subgroup performance with sample sizes, calibration assessment, and ' +
            'ideally prospective evidence that using it changes outcomes. It also ' +
            'needs a licence that permits clinical use, which many pretrained ' +
            'weights do not have, and a reproducibility story for a dependency ' +
            'you do not control. Build the model by all means. Just do not let ' +
            'the internal cross-validation figure stand in for any of the above.'
    },
    finetune: {
      terminal: 'finetune',
      title: 'Consider parameter-efficient fine-tuning, with the baselines already measured.',
      body: 'You have the labels, the compute and no hard interpretability ' +
            'constraint, so LoRA or adapters are a reasonable next step. Two ' +
            'conditions before you start. First, you should already have measured ' +
            'the frozen-embedding baseline and the hand-engineered-feature ' +
            'baseline, so that fine-tuning has something concrete to beat. ' +
            'Second, you need a held-out set that was not touched during ' +
            'hyperparameter search, because parameter-efficient methods introduce ' +
            'several new hyperparameters and each one is another opportunity to ' +
            'overfit your validation set.'
    }
  };

  var TERMINAL_STYLE = {
    classical: { colour: 'var(--stage-1)', pill: 'Classical ML' },
    embeddings: { colour: 'var(--stage-3)', pill: 'Embeddings + classical head' },
    zeroshot: { colour: 'var(--stage-4)', pill: 'Zero-shot first' },
    finetune: { colour: 'var(--stage-4)', pill: 'Consider fine-tuning' },
    caution: { colour: 'var(--danger)', pill: 'Validation before deployment' }
  };

  window.Chart.register('viz-fm-decision', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var path = ['start'];

    function render() {
      var node = TREE[path[path.length - 1]];
      var trail = path.slice(0, -1).map(function (id, i) {
        var n = TREE[id];
        var chosen = n.options.filter(function (o) {
          return o.next === path[i + 1];
        })[0];
        return '<div style="padding:var(--s2) 0;border-bottom:1px solid var(--rule-soft)">' +
          '<span class="tiny muted">' + window.UI.esc(n.q) + '</span><br>' +
          '<strong style="font-size:0.9rem">' +
          window.UI.esc(chosen ? chosen.label : '') + '</strong></div>';
      }).join('');

      var body;
      if (node.terminal) {
        var st = TERMINAL_STYLE[node.terminal];
        body =
          '<div class="card" style="border-left:4px solid ' + st.colour + '">' +
            '<span class="pill" style="background:' + st.colour +
              ';color:#fff;margin-bottom:var(--s3)">' + st.pill + '</span>' +
            '<h4 style="color:' + st.colour + '">' + window.UI.esc(node.title) + '</h4>' +
            '<p class="mb0">' + window.UI.esc(node.body) + '</p>' +
          '</div>' +
          '<div class="flex" style="margin-top:var(--s4)">' +
            '<button type="button" class="btn" data-back>Back one step</button>' +
            '<button type="button" class="btn btn-primary" data-restart>Start again</button>' +
          '</div>';
      } else {
        body =
          '<p style="font-size:1.05rem;font-weight:600;margin-bottom:var(--s2)">' +
            window.UI.esc(node.q) + '</p>' +
          '<p class="small muted">' + window.UI.esc(node.help) + '</p>' +
          '<div class="grid" style="gap:var(--s3);margin-bottom:var(--s4)">' +
            node.options.map(function (o, i) {
              return '<button type="button" class="btn" data-opt="' + i + '" ' +
                'style="justify-content:flex-start;text-align:left">' +
                window.UI.esc(o.label) + '</button>';
            }).join('') +
          '</div>' +
          (path.length > 1
            ? '<button type="button" class="btn btn-sm" data-back>Back one step</button>'
            : '');
      }

      stage.innerHTML =
        '<div style="max-width:64ch">' +
          (trail ? '<div style="margin-bottom:var(--s5)">' +
                   '<span class="eyebrow">Your answers so far</span>' + trail +
                   '</div>' : '') +
          body +
        '</div>';

      stage.querySelectorAll('[data-opt]').forEach(function (b) {
        b.addEventListener('click', function () {
          path.push(node.options[+b.getAttribute('data-opt')].next);
          render();
        });
      });
      var back = stage.querySelector('[data-back]');
      if (back) back.addEventListener('click', function () {
        path.pop(); render();
      });
      var restart = stage.querySelector('[data-restart]');
      if (restart) restart.addEventListener('click', function () {
        path = ['start']; render();
      });
    }

    altBody.innerHTML =
      '<p>An interactive decision tree. You answer a sequence of questions and ' +
      'it reaches one of five recommendations. The whole tree is written out ' +
      'below, so it can be used as a checklist without interacting with it.</p>' +
      '<h4>Questions</h4><dl class="dl-grid">' +
      Object.keys(TREE).filter(function (k) { return TREE[k].q; })
        .map(function (k) {
          return '<dt>' + window.UI.esc(TREE[k].q) + '</dt><dd>' +
            window.UI.esc(TREE[k].help) + ' Options: ' +
            TREE[k].options.map(function (o) {
              return '"' + window.UI.esc(o.label) + '"';
            }).join(', ') + '.</dd>';
        }).join('') + '</dl>' +
      '<h4>Recommendations</h4><dl class="dl-grid">' +
      Object.keys(TREE).filter(function (k) { return TREE[k].terminal; })
        .map(function (k) {
          return '<dt>' + window.UI.esc(TREE[k].title) + '</dt><dd>' +
            window.UI.esc(TREE[k].body) + '</dd>';
        }).join('') + '</dl>';

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      path = ['start']; render();
    });

    render();
  });
})();
