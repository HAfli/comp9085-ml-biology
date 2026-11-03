/* Week 5 - E. Model comparison: the same split, the same metrics, different models.
 *
 * Every number was measured once on the Week 5 test set (2,373 texts from
 * recall events not used in training) by data/scripts/10_build_week05_data.py,
 * and, for the pretrained sentence encoder, by
 * data/scripts/11_build_week05_lm_comparison.py. Nothing is simulated.
 */
(function () {
  'use strict';

  var METRICS = {
    accuracy: { label: 'Accuracy', higher: true, prop: function (m, n) { return n; } },
    f1: { label: 'F1 for Class I', higher: true },
    precision: { label: 'Precision for Class I', higher: true, prop: function (m) { return m.tp + m.fp; } },
    recall: { label: 'Recall for Class I', higher: true, prop: function (m) { return m.tp + m.fn; } },
    rocAuc: { label: 'ROC AUC', higher: true },
    averagePrecision: { label: 'Average precision', higher: true },
    brier: { label: 'Brier score', higher: false }
  };

  window.Chart.register('viz-nb-compare', function (host) {
    var U = window.UI, Ch = window.Chart;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var W = window.WEEK05;
    if (!W) {
      stage.innerHTML = '<div class="noscript-note">The Week 5 data file did not load.</div>';
      return;
    }
    var nTest = W.split.test, Vn = W.vectorizer.vocabularyTrain, int = d3.format(',');
    var LM = W.lmComparison;
    var MODELS = [
      { k: 'majority', name: 'Always “not Class I” (baseline)', m: W.variants.majority,
        params: '1 (the majority class)', time: 'none', needs: 'nothing',
        explain: 'nothing to explain' },
      { k: 'count_mnb', name: 'Word counts + MultinomialNB', m: W.variants.count_mnb,
        params: int(2 * Vn + 2) + ' (2 priors + 2 × ' + int(Vn) + ' word likelihoods)',
        time: (LM ? LM.seconds.naiveBayesFitAndPredict + ' s' : 'under a second') + ' to fit and predict',
        needs: 'scikit-learn', explain: 'every word\'s contribution can be read off' },
      { k: 'binary_bnb', name: 'Word presence + BernoulliNB', m: W.variants.binary_bnb,
        params: int(2 * Vn + 2), time: 'similar to MultinomialNB', needs: 'scikit-learn',
        explain: 'every word\'s contribution can be read off' },
      { k: 'tfidf_mnb', name: 'TF-IDF + MultinomialNB', m: W.variants.tfidf_mnb,
        params: int(2 * Vn + 2) + ' plus ' + int(Vn) + ' IDF weights', time: 'similar to MultinomialNB',
        needs: 'scikit-learn', explain: 'word weights readable, but rescaled' }
    ];
    if (LM) {
      MODELS.push({ k: 'lm', name: 'Pretrained sentence encoder + logistic regression', m: LM,
        params: int(LM.parameters) + ' pretrained (frozen) + ' + (LM.embeddingDimension + 1) +
          ' fitted here',
        time: LM.seconds.embedAllTexts + ' s to embed all texts on a laptop CPU, after a one-time ' +
          LM.weightsMB + ' MB download',
        needs: 'PyTorch, sentence-transformers, the model weights',
        explain: '384 numbers per text with no direct meaning; needs extra tools' });
    }
    var state = { metric: 'accuracy' };

    function ci(m, key) {
      var M = METRICS[key];
      if (!M.prop || m[key] == null) return null;
      var n = M.prop(m, nTest), v = m[key];
      var h = 1.96 * Math.sqrt(v * (1 - v) / n);
      return [Math.max(0, v - h), Math.min(1, v + h)];
    }

    function draw() {
      var key = state.metric, M = METRICS[key];
      var rows = MODELS.map(function (d) { return { d: d, v: d.m[key], ci: ci(d.m, key) }; });
      var narrow = stage.clientWidth < 600;
      var f = Ch.frame(stage, { height: 70 + rows.length * 46,
        margin: { top: 12, right: 60, bottom: 44, left: narrow ? 150 : 290 },
        title: M.label + ' of each model on the same 2,373 test texts' });
      var x = d3.scaleLinear().domain([0, 1]).range([0, f.w]);
      var y = d3.scaleBand().domain(rows.map(function (r) { return r.d.name; })).range([0, f.h]).padding(0.3);
      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0))
        .selectAll('text').style('font-size', narrow ? '10px' : '12px')
        .each(function () { if (narrow) shorten(d3.select(this)); });
      f.g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(5));
      f.g.append('text').attr('class', 'axis-label').attr('x', f.w / 2).attr('y', f.h + 36)
        .attr('text-anchor', 'middle').text(M.label + (M.higher ? ' (higher is better)' : ' (lower is better)'));
      var g = f.g.selectAll('g.row').data(rows).join('g').attr('class', 'row')
        .attr('transform', function (r) { return 'translate(0,' + y(r.d.name) + ')'; });
      g.append('rect').attr('height', y.bandwidth()).attr('rx', 3).attr('tabindex', 0)
        .attr('width', function (r) { return r.v == null ? 0 : x(r.v); })
        .attr('fill', function (r) { return r.d.k === 'lm' ? 'var(--cat-3, #7a4fa3)' : r.d.k === 'majority' ? 'var(--ink-4)' : 'var(--cat-1)'; });
      g.filter(function (r) { return r.ci; }).append('line')
        .attr('x1', function (r) { return x(r.ci[0]); }).attr('x2', function (r) { return x(r.ci[1]); })
        .attr('y1', y.bandwidth() / 2).attr('y2', y.bandwidth() / 2)
        .attr('stroke', 'var(--ink)').attr('stroke-width', 1.6);
      g.append('text').attr('x', function (r) { return r.v == null ? 4 : x(r.v) + 6; })
        .attr('y', y.bandwidth() / 2 + 4).style('font-size', '12px').style('font-weight', 650)
        .text(function (r) { return r.v == null ? 'undefined' : r.v.toFixed(3); });
      Ch.tips(g.select('rect'), function (r) {
        return '<strong>' + U.esc(r.d.name) + '</strong><br>' + M.label + ' ' +
          (r.v == null ? 'undefined' : r.v.toFixed(4)) +
          (r.ci ? '<br>approx. 95% interval ' + r.ci[0].toFixed(3) + '–' + r.ci[1].toFixed(3) : '');
      });
    }

    function shorten(t) {
      var s = t.text();
      t.text(s.replace('Pretrained sentence encoder + logistic regression', 'Pretrained encoder + LR')
        .replace('Always “not Class I” (baseline)', 'Baseline').replace('Word counts', 'Counts')
        .replace('Word presence', 'Presence'));
    }

    function update() {
      draw();
      var key = state.metric, M = METRICS[key];
      var nb = W.variants.count_mnb, lm = LM;
      var note = '<p><strong>Read this before ranking the models.</strong> These are single ' +
        'measurements on one split. The black lines show an approximate 95% sampling interval ' +
        'where the metric is a proportion: about ±' +
        (196 * Math.sqrt(nb.accuracy * (1 - nb.accuracy) / nTest)).toFixed(1) + ' percentage points ' +
        'for accuracy on ' + int(nTest) + ' texts. Differences smaller than that are not evidence ' +
        'that one model is better.</p>';
      if (key === 'brier') note += '<p>The Brier score rewards probabilities that match observed ' +
        'frequencies. MultinomialNB on word counts puts ' + Math.round(nb.fractionExtreme * 100) +
        '% of its predictions below 0.05 or above 0.95, and pays for it here' +
        (lm ? '; the encoder + logistic regression puts ' + Math.round(lm.fractionExtreme * 100) + '% there' : '') + '.</p>';
      if (key === 'accuracy' || key === 'f1') note += '<p>The baseline matters: always answering ' +
        '“not Class I” is right ' + (W.variants.majority.accuracy * 100).toFixed(1) + '% of the time ' +
        'and never finds a Class I text (F1 = 0).</p>';
      if (lm) note += '<p class="mb0">On this task and split, a frozen general-English encoder with ' +
        int(LM.parameters) + ' parameters is numerically close to naive Bayes on accuracy, F1 and ROC AUC. ' +
        'The accuracy difference is small relative to the approximate sampling interval; for F1 and AUC ' +
        'no interval is computed here, and this single test split is not enough to establish a ' +
        'meaningful difference. The encoder trades recall for precision and has better probability ' +
        'performance on this test set (a lower Brier score and far fewer extreme predictions); ' +
        'whether either model is well calibrated requires a reliability analysis, as in Week 4. ' +
        'That says something about this data (short, formulaic texts with strong keyword signal) as much ' +
        'as about the models. It is not a general verdict on either. Cost, interpretability and ' +
        'calibration belong in the comparison too.</p>';
      host.querySelector('[data-viz-note]').innerHTML = note;
      host.querySelector('[data-cmp-cost]').innerHTML = '<div class="table-scroll"><table ' +
        'class="table-compact"><caption>What each model costs and what it can tell you.</caption>' +
        '<thead><tr><th scope="col">Model</th><th scope="col">Parameters</th><th scope="col">Time</th>' +
        '<th scope="col">Needs</th><th scope="col">Explaining one prediction</th></tr></thead><tbody>' +
        MODELS.map(function (d) {
          return '<tr><th scope="row">' + U.esc(d.name) + '</th><td>' + U.esc(d.params) + '</td><td>' +
            U.esc(d.time) + '</td><td>' + U.esc(d.needs) + '</td><td>' + U.esc(d.explain) + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="small muted">Timings are one run on one ' +
        'laptop CPU, indicative only. Encoder: ' + (lm ? U.esc(lm.model) + ' at revision ' +
        U.esc(lm.revision.slice(0, 10)) + ', a small general-English model, not a food-safety or ' +
        'clinical one.' : 'not run.') + '</p>';
      U.setMetric('cmp-nb', nb[key] == null ? 'n/a' : nb[key].toFixed(3), 'word counts + MultinomialNB');
      U.setMetric('cmp-lm', lm && lm[key] != null ? lm[key].toFixed(3) : 'n/a', 'pretrained encoder + LR');
      if (lm && lm[key] != null && nb[key] != null) {
        var diff = lm[key] - nb[key], iv = ci(nb, key);
        var half = iv ? (iv[1] - iv[0]) / 2 : null;
        U.setMetric('cmp-diff', (diff >= 0 ? '+' : '') + diff.toFixed(3),
          half == null ? 'one split; no interval computed for this metric'
            : Math.abs(diff) < half ? 'smaller than the ±' + half.toFixed(3) + ' sampling interval'
              : 'larger than the ±' + half.toFixed(3) + ' sampling interval');
      } else U.setMetric('cmp-diff', 'n/a', ' ');
      altBody.innerHTML = U.altTable('All models, all metrics, Week 5 test set (' + int(nTest) + ' texts).',
        ['Model'].concat(Object.keys(METRICS).map(function (k) { return METRICS[k].label; })),
        MODELS.map(function (d) {
          return [d.name].concat(Object.keys(METRICS).map(function (k) {
            return d.m[k] == null ? 'undefined' : d.m[k].toFixed(3);
          }));
        }));
    }

    host.querySelector('#cmp-metric').addEventListener('change', function () {
      state.metric = this.value; update();
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.metric = 'accuracy'; host.querySelector('#cmp-metric').value = 'accuracy'; update();
    });
    Ch.responsive(stage, draw);
    update();
  });
})();
