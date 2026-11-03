/* Week 5 - D. Leakage explorer: the whole pipeline must not learn from the test set.
 *
 * Three ways of running the same CountVectorizer + MultinomialNB experiment on
 * the frozen openFDA snapshot, each measured once by
 * data/scripts/10_build_week05_data.py (WEEK05.leakage):
 *   correct  - split by recall event; vectorizer and model fitted on training rows
 *   vocab    - vectorizer fitted on all text, training and test together
 *   records  - the split made on product records, so one event's identical
 *              text lands on both sides
 */
(function () {
  'use strict';

  window.Chart.register('viz-nb-leakage', function (host) {
    var U = window.UI, Ch = window.Chart;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var W = window.WEEK05;
    if (!W) {
      stage.innerHTML = '<div class="noscript-note">The Week 5 data file did not load.</div>';
      return;
    }
    var LK = W.leakage, int = d3.format(',');
    var V = {
      correct: { label: 'Correct pipeline', m: LK.vectorizer.count.correct,
        rows: W.dataset.rows, ident: W.split.testTextIdenticalToATrainText,
        steps: [['All texts', int(W.dataset.rows) + ' event-level rows'],
                ['Split by recall event', 'no event on both sides'],
                ['Fit vectorizer on TRAINING text', int(LK.vectorizer.count.vocabularyTrain) + ' words'],
                ['Fit naive Bayes on TRAINING rows', ''],
                ['Transform test text, predict', 'unseen words ignored'],
                ['Evaluate once', int(W.split.test) + ' test texts']],
        leak: -1 },
      vocab: { label: 'Vectorizer fitted on all text', m: LK.vectorizer.count.leaky,
        rows: W.dataset.rows, ident: W.split.testTextIdenticalToATrainText,
        steps: [['All texts', int(W.dataset.rows) + ' event-level rows'],
                ['Fit vectorizer on ALL text', int(LK.vectorizer.count.vocabularyAll) + ' words, ' +
                  int(LK.vectorizer.count.testOnlyWords) + ' only in test'],
                ['Split by recall event', ''],
                ['Fit naive Bayes on training rows', ''],
                ['Transform test text, predict', ''],
                ['Evaluate once', int(W.split.test) + ' test texts']],
        leak: 1 },
      records: { label: 'Split by product record', m: LK.recordSplit,
        rows: LK.recordSplit.rows, ident: LK.recordSplit.identicalTextInTrain,
        steps: [['All product records', int(LK.recordSplit.rows) + ' rows, many repeated'],
                ['Random split by RECORD', 'one event on both sides'],
                ['Fit vectorizer on training text', ''],
                ['Fit naive Bayes on training rows', ''],
                ['Transform test text, predict', ''],
                ['Evaluate once', Math.round(LK.recordSplit.identicalTextInTrain * 100) +
                  '% of test texts already in training']],
        leak: 1 }
    };
    var state = { v: 'correct' };

    function draw() {
      var d = V[state.v];
      var narrow = stage.clientWidth < 600;
      var n = d.steps.length;
      var f = Ch.frame(stage, { height: narrow ? 70 + n * 58 : 190,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        title: d.label + ': the order of the steps' });
      var bw = narrow ? f.w : (f.w - (n - 1) * 14) / n, bh = narrow ? 46 : 120;
      d.steps.forEach(function (s, i) {
        var x = narrow ? 0 : i * (bw + 14), y = narrow ? i * 58 : 20;
        var bad = i === d.leak;
        var g = f.g.append('g').attr('transform', 'translate(' + x + ',' + y + ')');
        g.append('rect').attr('width', bw).attr('height', bh).attr('rx', 8)
          .attr('fill', bad ? '#fbdde0' : '#eef2f5')
          .attr('stroke', bad ? '#b3261e' : 'var(--rule)').attr('stroke-width', bad ? 2.5 : 1);
        var tx = g.append('text').attr('x', bw / 2).attr('y', narrow ? 19 : 34).attr('text-anchor', 'middle')
          .style('font-size', '12px').style('font-weight', 700);
        wrap(tx, s[0], narrow ? bw - 16 : bw - 10);
        g.append('text').attr('x', bw / 2).attr('y', narrow ? 37 : bh - 14).attr('text-anchor', 'middle')
          .style('font-size', '10.5px').attr('fill', bad ? '#b3261e' : 'var(--ink-3)').text(s[1]);
        if (i < n - 1) {
          if (narrow) f.g.append('text').attr('x', f.w / 2).attr('y', y + 56).attr('text-anchor', 'middle').text('↓');
          else f.g.append('text').attr('x', x + bw + 2).attr('y', 84).style('font-size', '13px').text('→');
        }
      });
      if (state.v === 'records') {
        f.g.append('text').attr('x', 0).attr('y', narrow ? f.h : 160).style('font-size', '11.5px')
          .attr('fill', '#b3261e').style('font-weight', 650)
          .text('The leak is in the unit of observation: product records of one event share one text.');
      }
    }

    function wrap(textSel, str, width) {
      var words = str.split(' '), line = [], lines = [];
      words.forEach(function (w) {
        line.push(w);
        if (line.join(' ').length * 6.4 > width && line.length > 1) { line.pop(); lines.push(line.join(' ')); line = [w]; }
      });
      lines.push(line.join(' '));
      lines.forEach(function (l, i) {
        textSel.append('tspan').attr('x', textSel.attr('x')).attr('dy', i ? 14 : 0).text(l);
      });
    }

    function update() {
      var d = V[state.v], c = V.correct.m, m = d.m;
      draw();
      function delta(k) {
        if (state.v === 'correct') return 'the reference';
        var x = m[k] - c[k];
        return (x >= 0 ? '+' : '') + x.toFixed(3) + ' against the correct pipeline';
      }
      U.setMetric('lk-acc', (m.accuracy * 100).toFixed(1) + '%', delta('accuracy'));
      U.setMetric('lk-f1', m.f1.toFixed(3), delta('f1'));
      U.setMetric('lk-auc', m.rocAuc.toFixed(3), delta('rocAuc'));
      U.setMetric('lk-ident', Math.round(d.ident * 100) + '%', 'test texts identical to a training text');
      var msg = {
        correct: 'Everything the pipeline learns, the vocabulary as well as the word probabilities, ' +
          'comes from the training rows, and the split keeps every recall event on one side. ' +
          Math.round(W.split.testTextIdenticalToATrainText * 100) + '% of test texts still match a ' +
          'training text word for word, because firms reuse standard wording across separate events. ' +
          'That is real repetition in the data, not leakage.',
        vocab: 'The vectorizer saw the test texts, so ' + int(LK.vectorizer.count.testOnlyWords) +
          ' words that occur only in test texts entered the vocabulary. Here the score barely moved (' +
          (m.accuracy * 100).toFixed(1) + '% against ' + (c.accuracy * 100).toFixed(1) + '%): ' +
          'naive Bayes never sees those words in a training row, so they carry only smoothing mass. ' +
          'The design is still wrong. It cannot be reproduced on a truly new text, and with TF-IDF ' +
          'the test texts also change every IDF weight. As in Week 3, leakage is not reliably ' +
          'visible in the score: it is prevented by construction (fit inside a Pipeline, on ' +
          'training data only), not detected afterwards.',
        records: 'Splitting the ' + int(LK.recordSplit.rows) + ' product records at random puts ' +
          'products from the same recall event on both sides. ' +
          Math.round(LK.recordSplit.identicalTextInTrain * 100) + '% of test texts appear word for ' +
          'word in training, and accuracy rises to ' + (m.accuracy * 100).toFixed(1) + '% (AUC ' +
          m.rocAuc.toFixed(3) + '). The model has not improved; the test has become easier. A ' +
          'model used on a new recall would see a new event, so the event is the unit of observation.'
      }[state.v];
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' + msg + '</p>';
      altBody.innerHTML = U.altTable('The three pipelines, measured once each on the frozen snapshot.',
        ['Pipeline', 'Rows', 'Accuracy', 'F1 (Class I)', 'ROC AUC', 'Test texts identical to a training text'],
        Object.keys(V).map(function (k) {
          var x = V[k];
          return [x.label, int(x.rows), (x.m.accuracy * 100).toFixed(1) + '%', x.m.f1.toFixed(3),
            x.m.rocAuc.toFixed(3), Math.round(x.ident * 100) + '%'];
        })) + '<p>Steps of the selected pipeline: ' +
        V[state.v].steps.map(function (s) { return U.esc(s[0]); }).join(' → ') + '.</p>';
    }

    U.onSegment(host.querySelector('#lk-v'), function (v) { state.v = v; update(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.v = 'correct';
      host.querySelectorAll('#lk-v button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === 'correct'));
      });
      update();
    });
    Ch.responsive(stage, draw);
    update();
  });
})();
