/* Week 3 - "Can you spot the leakage?"
 *
 * Two halves. First, a set of described pipelines the student judges as valid
 * or leaky. Second, a live measurement: the same leaky and honest protocols are
 * actually run in the browser on data with a controllable amount of real
 * signal, so the student can see how the inflation depends on the data rather
 * than being told.
 */
(function () {
  'use strict';

  var CASES = [
    {
      title: 'Scaling before splitting',
      code: 'X = StandardScaler().fit_transform(X)\n' +
            'X_tr, X_te, y_tr, y_te = train_test_split(X, y)\n' +
            'model.fit(X_tr, y_tr)\n' +
            'print(model.score(X_te, y_te))',
      leaky: true,
      kind: 'Preprocessing leakage',
      why: 'The scaler computed its mean and standard deviation using every row, ' +
           'including the rows that later became the test set. Each training value ' +
           'therefore carries a trace of the test data.',
      fix: 'Put the scaler in a Pipeline so it is refitted on the training portion ' +
           'of every fold: Pipeline([("sc", StandardScaler()), ("m", model)]).',
      severity: 'Usually small, occasionally large. The live panel below shows why ' +
                'you cannot tell which from the score alone.'
    },
    {
      title: 'Feature selection before cross-validation',
      code: 'sel = SelectKBest(f_classif, k=20).fit(X, y)\n' +
            'X_sel = sel.transform(X)\n' +
            'print(cross_val_score(model, X_sel, y, cv=5).mean())',
      leaky: true,
      kind: 'Feature-selection leakage',
      why: 'SelectKBest looked at every label in the dataset to choose the features. ' +
           'Cross-validation then evaluates on rows whose labels already influenced ' +
           'which columns exist.',
      fix: 'Move the selector inside the Pipeline so it is refitted on each training ' +
           'fold. This is the error Ambroise and McLachlan documented in genomics ' +
           'in 2002, and it is still being made.',
      severity: 'Can be catastrophic. With many features and few samples it can ' +
                'manufacture 88 per cent accuracy from pure noise.'
    },
    {
      title: 'Grouped samples split at random',
      code: 'X, y, patient_id = load_biopsies()   # 3 biopsies per patient\n' +
            'X_tr, X_te, y_tr, y_te = train_test_split(X, y, random_state=0)\n' +
            'model.fit(X_tr, y_tr)',
      leaky: true,
      kind: 'Group leakage',
      why: 'Biopsies from the same patient land in both the training and the test ' +
           'set. The model can recognise the patient rather than the pathology, and ' +
           'it will, because that is easier.',
      fix: 'Use GroupKFold or GroupShuffleSplit with patient_id as the group, so ' +
           'every sample from a patient stays on one side of the split.',
      severity: 'Severe and very common in medical imaging and multi-sample assays.'
    },
    {
      title: 'A pipeline that fits everything inside the fold',
      code: 'pipe = Pipeline([("imp", SimpleImputer()),\n' +
            '                 ("sc",  StandardScaler()),\n' +
            '                 ("sel", SelectKBest(k=20)),\n' +
            '                 ("m",   LogisticRegression())])\n' +
            'cv = StratifiedKFold(5, shuffle=True, random_state=42)\n' +
            'print(cross_val_score(pipe, X, y, cv=cv).mean())',
      leaky: false,
      kind: 'Valid',
      why: 'Every step that learns something from data is inside the Pipeline, so ' +
           'cross_val_score refits the imputer, the scaler and the selector on each ' +
           'training fold independently. The test fold is untouched until prediction.',
      fix: 'Nothing to fix. This is the pattern to reach for by default.',
      severity: 'None. Note it is still worth checking for group structure and for ' +
                'duplicate rows, which a Pipeline cannot protect you from.'
    },
    {
      title: 'Hyperparameters tuned on the test set',
      code: 'best = None\n' +
            'for d in range(1, 20):\n' +
            '    m = DecisionTreeClassifier(max_depth=d).fit(X_tr, y_tr)\n' +
            '    s = m.score(X_te, y_te)\n' +
            '    if best is None or s > best[1]: best = (d, s)\n' +
            'print("best depth", best[0], "accuracy", best[1])',
      leaky: true,
      kind: 'Selection on the test set',
      why: 'The test set chose the depth, so the reported accuracy is the maximum ' +
           'over twenty attempts on that specific set rather than an estimate of ' +
           'performance on new data. It is optimistic by construction.',
      fix: 'Tune on a separate validation split or with an inner cross-validation ' +
           'loop, then touch the test set exactly once, at the end.',
      severity: 'Moderate but systematic, and it grows with the number of ' +
                'configurations tried. It is also the hardest to resist.'
    },
    {
      title: 'Duplicate records crossing the split',
      code: 'df = pd.concat([batch_2019, batch_2021])   # overlapping samples\n' +
            'X_tr, X_te, y_tr, y_te = train_test_split(df[feats], df[target])\n' +
            'knn = KNeighborsClassifier(1).fit(X_tr, y_tr)',
      leaky: true,
      kind: 'Duplicate leakage',
      why: 'The two batches share samples. A 1-nearest-neighbour model tested on a ' +
           'row that also exists in training will retrieve its own copy and be ' +
           'right for no useful reason.',
      fix: 'De-duplicate before splitting, on a content hash or a sample identifier ' +
           'rather than on the row index.',
      severity: 'Measured on WDBC with a quarter of rows duplicated: accuracy rises ' +
                'from 95.1 to 97.2 per cent for a model that learned nothing new.'
    },
    {
      title: 'Predicting from a variable recorded after the outcome',
      code: 'features = ["age", "bmi", "hba1c", "diabetes_medication"]\n' +
            'target   = "diagnosed_with_diabetes"\n' +
            'model.fit(df[features], df[target])   # AUC 0.99',
      leaky: true,
      kind: 'Target leakage',
      why: 'Diabetes medication is prescribed because of the diagnosis. The model is ' +
           'not predicting the outcome, it is reading a consequence of it, which is ' +
           'why the AUC looks implausible.',
      fix: 'Restrict features to information genuinely available at the moment the ' +
           'prediction would be made. A data dictionary with timestamps is the only ' +
           'reliable way to check.',
      severity: 'Severe, and it survives every cross-validation scheme, because the ' +
                'problem is in the columns rather than in the rows.'
    },
    {
      title: 'Imputing with the full-dataset median',
      code: 'X["serum_vitd"] = X["serum_vitd"].fillna(X["serum_vitd"].median())\n' +
            'scores = cross_val_score(model, X, y, cv=5)',
      leaky: true,
      kind: 'Preprocessing leakage',
      why: 'The median was computed across every row, so imputed training values ' +
           'encode information from the rows used for evaluation.',
      fix: 'SimpleImputer inside the Pipeline. Also add a missingness indicator ' +
           'column, because whether a value is missing is often itself informative.',
      severity: 'Usually modest, but it compounds when several columns are imputed ' +
                'and when the missingness is not at random.'
    }
  ];

  window.Chart.register('viz-leakage', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var idx = 0, correct = 0, seen = 0;

    function renderCase() {
      var c = CASES[idx];
      stage.innerHTML =
        '<div style="max-width:70ch">' +
          '<p class="tiny muted mono">Pipeline ' + (idx + 1) + ' of ' + CASES.length +
          ' &middot; ' + window.UI.esc(c.title) + '</p>' +
          '<pre>' + window.UI.esc(c.code) + '</pre>' +
          '<div class="flex" style="margin-bottom:var(--s4)">' +
            '<button type="button" class="btn" data-ans="valid">This pipeline is valid</button>' +
            '<button type="button" class="btn" data-ans="leaky">This pipeline leaks</button>' +
          '</div>' +
          '<div data-slot role="status" aria-live="polite"></div>' +
        '</div>';

      stage.querySelectorAll('[data-ans]').forEach(function (b) {
        b.addEventListener('click', function () {
          judge(b.getAttribute('data-ans') === 'leaky', c);
        });
      });
      updateScore();
    }

    function judge(saidLeaky, c) {
      var right = saidLeaky === c.leaky;
      seen++; if (right) correct++;

      stage.querySelectorAll('[data-ans]').forEach(function (b) {
        b.disabled = true;
        var isLeakyBtn = b.getAttribute('data-ans') === 'leaky';
        if (isLeakyBtn === c.leaky) {
          b.style.borderColor = 'var(--ok)'; b.style.background = 'var(--ok-soft)';
        } else if (isLeakyBtn === saidLeaky) {
          b.style.borderColor = 'var(--danger)'; b.style.background = 'var(--danger-soft)';
        }
      });

      stage.querySelector('[data-slot]').innerHTML =
        '<div class="quiz-why ' + (right ? 'ok' : 'no') + '" style="margin-bottom:var(--s4)">' +
          '<p><strong>' + (right ? 'Correct. ' : 'Not quite. ') +
            window.UI.esc(c.kind) + '.</strong> ' + window.UI.esc(c.why) + '</p>' +
          '<p><strong>The fix. </strong>' + window.UI.esc(c.fix) + '</p>' +
          '<p class="mb0"><strong>How much it matters. </strong>' +
            window.UI.esc(c.severity) + '</p>' +
        '</div>' +
        (idx < CASES.length - 1
          ? '<button type="button" class="btn btn-primary" data-next>Next pipeline</button>'
          : '<p class="mb0"><strong>That is all eight.</strong> You judged ' + correct +
            ' of ' + seen + ' correctly. Now use the panel below to measure how ' +
            'much leakage actually costs.</p>');

      var n = stage.querySelector('[data-next]');
      if (n) n.addEventListener('click', function () { idx++; renderCase(); });
      updateScore();
    }

    function updateScore() {
      window.UI.setMetric('lk-score', correct + ' / ' + seen,
        seen ? Math.round(100 * correct / seen) + '% judged correctly'
             : 'No judgements yet');
    }

    /* ---- The live measurement panel ---------------------------------- */

    var mState = { signal: 0, nFeat: 300, nSamp: 100 };
    var mHost = host.querySelector('[data-leak-measure]');

    function measure() {
      var rng = new window.ML.Random(11);
      var n = mState.nSamp, d = mState.nFeat, sig = mState.signal;

      var y = [], X = [];
      for (var i = 0; i < n; i++) y.push(i % 2 === 0 ? 'a' : 'b');
      y = rng.shuffle(y);
      for (var i2 = 0; i2 < n; i2++) {
        var row = [];
        for (var j = 0; j < d; j++) {
          /* Only the first five features carry any signal, and how much is
             under the student's control. */
          var mu = (j < 5 && y[i2] === 'a') ? sig : 0;
          row.push(rng.normal() + mu);
        }
        X.push(row);
      }

      var K = 10;

      /* Univariate score: absolute difference in class means, which is the
         same ranking f_classif would produce for two balanced classes. */
      function rank(rows, labels) {
        var scores = [];
        for (var j = 0; j < d; j++) {
          var sa = 0, na = 0, sb = 0, nb = 0;
          for (var i = 0; i < rows.length; i++) {
            if (labels[i] === 'a') { sa += rows[i][j]; na++; }
            else { sb += rows[i][j]; nb++; }
          }
          scores.push({ j: j, s: Math.abs((sa / (na || 1)) - (sb / (nb || 1))) });
        }
        scores.sort(function (p, q) { return q.s - p.s; });
        return scores.slice(0, K).map(function (r) { return r.j; });
      }

      function evalWith(selectOnce) {
        var globalSel = selectOnce ? rank(X, y) : null;
        var folds = window.ML.stratifiedFolds(y, 5, 3);
        var accs = [];
        for (var f = 0; f < 5; f++) {
          var teIdx = folds[f], trIdx = [];
          for (var g = 0; g < 5; g++) if (g !== f) trIdx = trIdx.concat(folds[g]);

          var Xtr = trIdx.map(function (i) { return X[i]; });
          var ytr = trIdx.map(function (i) { return y[i]; });
          var sel = globalSel || rank(Xtr, ytr);

          var cut = function (rows) {
            return rows.map(function (r) {
              return sel.map(function (j) { return r[j]; });
            });
          };
          var m = new window.ML.LogReg({ epochs: 160, lr: 0.6, l2: 0.02 })
            .fit(cut(Xtr), ytr);
          var pred = m.predict(cut(teIdx.map(function (i) { return X[i]; })));
          accs.push(window.ML.accuracy(teIdx.map(function (i) { return y[i]; }), pred));
        }
        return window.ML.mean(accs);
      }

      return { leaky: evalWith(true), honest: evalWith(false) };
    }

    function drawMeasure() {
      var r = measure();
      var host2 = mHost.querySelector('[data-measure-stage]');
      var f = window.Chart.frame(host2, {
        fixedHeight: 150,
        margin: { top: 22, right: 100, bottom: 34, left: 132 },
        title: 'Reported accuracy under a leaky and an honest protocol'
      });

      var x = d3.scaleLinear().domain([0.4, 1]).range([0, f.w]);
      var rows = [
        { label: 'Leaky protocol', v: r.leaky, c: 'var(--danger)' },
        { label: 'Honest protocol', v: r.honest, c: 'var(--ok)' }
      ];
      var y = d3.scaleBand().domain(rows.map(function (d2) { return d2.label; }))
        .range([0, f.h]).padding(0.34);

      /* Chance line */
      f.g.append('line')
        .attr('x1', x(0.5)).attr('x2', x(0.5))
        .attr('y1', -6).attr('y2', f.h)
        .attr('stroke', 'var(--ink-4)').attr('stroke-dasharray', '3 3');
      f.g.append('text')
        .attr('x', x(0.5)).attr('y', -10).attr('text-anchor', 'middle')
        .style('font-size', '10px').attr('fill', 'var(--ink-3)')
        .text('chance (0.50)');

      f.g.selectAll('rect.bar').data(rows).join('rect')
        .attr('class', 'bar')
        .attr('x', x(0.4)).attr('y', function (d2) { return y(d2.label); })
        .attr('width', function (d2) { return Math.max(0, x(d2.v) - x(0.4)); })
        .attr('height', y.bandwidth())
        .attr('fill', function (d2) { return d2.c; })
        .attr('rx', 3);

      f.g.selectAll('text.val').data(rows).join('text')
        .attr('class', 'val')
        .attr('x', function (d2) { return x(d2.v) + 8; })
        .attr('y', function (d2) { return y(d2.label) + y.bandwidth() / 2 + 4; })
        .style('font-size', '12px').style('font-weight', '700')
        .style('font-family', 'var(--mono)')
        .attr('fill', 'var(--ink)')
        .text(function (d2) { return (d2.v * 100).toFixed(1) + '%'; });

      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0));
      f.g.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.0%')));

      var gap = r.leaky - r.honest;
      var note = mHost.querySelector('[data-measure-note]');
      if (mState.signal === 0) {
        note.innerHTML = '<p class="mb0"><strong>There is no signal in this data ' +
          'at all.</strong> The labels were assigned at random, so the only honest ' +
          'answer is 50 per cent. The leaky protocol reports ' +
          (r.leaky * 100).toFixed(1) + ' per cent. Every point above the dashed ' +
          'line is manufactured by choosing features with the labels you are about ' +
          'to be tested on.</p>';
      } else if (gap < 0.03) {
        note.innerHTML = '<p class="mb0">With this much real signal the two ' +
          'protocols agree to within ' + (gap * 100).toFixed(1) + ' percentage ' +
          'points, because the genuinely informative features get selected either ' +
          'way. <strong>This is the uncomfortable case.</strong> A small gap is ' +
          'not evidence that your protocol was sound; it is evidence that this ' +
          'particular dataset was forgiving. You cannot detect leakage from the ' +
          'score.</p>';
      } else {
        note.innerHTML = '<p class="mb0">The leaky protocol reports ' +
          (gap * 100).toFixed(1) + ' percentage points more than the honest one. ' +
          'Reduce the signal strength towards zero and watch the gap widen, ' +
          'because the less real signal there is, the more of the reported ' +
          'accuracy leakage has to invent.</p>';
      }

      window.UI.setMetric('lk-leaky', (r.leaky * 100).toFixed(1) + '%',
        'select on all data, then cross-validate', 'bad');
      window.UI.setMetric('lk-honest', (r.honest * 100).toFixed(1) + '%',
        'select inside each fold', 'good');
    }

    function updateAlt() {
      altBody.innerHTML =
        '<p>This activity has two parts and no decorative chart.</p>' +
        '<p>Part one presents ' + CASES.length + ' short scikit-learn pipelines. ' +
        'For each you judge whether it leaks, and the activity then names the kind ' +
        'of leakage, explains the mechanism, gives the fix and comments on how much ' +
        'it matters in practice. The full set follows.</p>' +
        '<ol>' + CASES.map(function (c) {
          return '<li style="margin-bottom:var(--s5)"><strong>' +
            window.UI.esc(c.title) + ' - ' +
            (c.leaky ? 'LEAKS (' + window.UI.esc(c.kind) + ')' : 'VALID') +
            '.</strong><pre style="margin:var(--s2) 0">' + window.UI.esc(c.code) +
            '</pre>' + window.UI.esc(c.why) + ' <em>Fix: ' + window.UI.esc(c.fix) +
            '</em> ' + window.UI.esc(c.severity) + '</li>';
        }).join('') + '</ol>' +
        '<p>Part two is a live measurement. A dataset of ' + mState.nSamp +
        ' samples and ' + mState.nFeat + ' features is generated in the browser, ' +
        'where only the first five features carry any signal and the strength of ' +
        'that signal is under your control. Two protocols are then run: one that ' +
        'selects the ten best features using the whole dataset before ' +
        'cross-validating, and one that selects inside each training fold. A ' +
        'horizontal bar chart compares the accuracy each reports, with chance ' +
        '(50 per cent) marked. At zero signal strength the honest protocol sits at ' +
        'chance and the leaky one reports substantially more.</p>';
    }

    /* Wiring */
    host.querySelector('#lk-signal').addEventListener('input', function () {
      mState.signal = +this.value / 100;
      host.querySelector('#lk-signal-val').textContent = mState.signal.toFixed(2);
      drawMeasure(); updateAlt();
    });
    host.querySelector('#lk-nfeat').addEventListener('input', function () {
      mState.nFeat = +this.value;
      host.querySelector('#lk-nfeat-val').textContent = this.value;
      drawMeasure(); updateAlt();
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      idx = 0; correct = 0; seen = 0;
      mState = { signal: 0, nFeat: 300, nSamp: 100 };
      host.querySelector('#lk-signal').value = 0;
      host.querySelector('#lk-signal-val').textContent = '0.00';
      host.querySelector('#lk-nfeat').value = 300;
      host.querySelector('#lk-nfeat-val').textContent = '300';
      renderCase(); drawMeasure(); updateAlt();
    });

    window.Chart.responsive(mHost.querySelector('[data-measure-stage]'), drawMeasure);
    renderCase();
    drawMeasure();
    updateAlt();
  });
})();
