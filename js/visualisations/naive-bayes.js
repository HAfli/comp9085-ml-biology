/* Week 5 - Naive Bayes text explorer.
 *
 * A real multinomial naive Bayes classifier is trained in the browser on the
 * teaching corpus, and every quantity shown is read out of that fitted model:
 * the priors, the per-word likelihoods, the log-probability contributions of an
 * individual document, and the confusion matrix on a held-out split.
 *
 * The smoothing slider is the important control. Set alpha to zero and watch a
 * single unseen word veto an otherwise confident classification.
 */
(function () {
  'use strict';

  function tokenise(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/).filter(function (t) { return t.length > 1; });
  }

  window.Chart.register('viz-naive-bayes', function (host) {
    var R = window.RECALLS;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var docs = R.records.map(function (r) {
      return { tokens: tokenise(r.text), cls: r.cls, text: r.text, id: r.id };
    });

    var state = {
      alpha: 1,
      pair: 'Class I|Class II',
      probe: 'undeclared milk allergen not listed on the label',
      split: null, model: null, report: null
    };

    function classesOf() { return state.pair.split('|'); }

    function fit() {
      var cls = classesOf();
      var subset = docs.filter(function (d) { return cls.indexOf(d.cls) >= 0; });

      var X = subset.map(function (d) { return d.tokens; });
      var y = subset.map(function (d) { return d.cls; });
      var sp = window.ML.stratifiedSplit(X, y, 0.3, 42);

      var m = new window.ML.NaiveBayes(state.alpha);
      m.fit(sp.train.X, sp.train.y);

      var pred = m.predict(sp.test.X);
      state.split = sp;
      state.model = m;
      state.report = window.ML.classReport(sp.test.y, pred, cls);
      state.subsetSize = subset.length;
    }

    function draw() {
      var cls = classesOf();
      var m = state.model;
      var top = m.topTokens(cls[0], cls[1], 9);
      var words = top.forA.concat(top.forB.slice().reverse())
        /* With smoothing at zero a token unseen in one class has a
           log-likelihood of minus infinity, so its ratio is infinite and
           cannot be placed on an axis. Those tokens are dropped from the
           chart and the explanatory text below says why. */
        .filter(function (w) { return isFinite(w.ratio); });

      var f = window.Chart.frame(stage, {
        height: Math.max(300, 44 + words.length * 19),
        margin: { top: 34, right: 30, bottom: 42, left: 168 },
        title: 'Log-probability ratio of each word between the two classes'
      });

      if (!words.length) {
        stage.innerHTML = '<div class="noscript-note"><strong>Every word has an ' +
          'infinite log-ratio.</strong> With smoothing set to zero, any token ' +
          'that never appeared in one class gives that class a likelihood of ' +
          'exactly zero, so the ratio cannot be plotted. Raise alpha above zero ' +
          'and the chart returns. That the chart cannot be drawn at all is the ' +
          'clearest possible statement of the zero-frequency problem.</div>';
        drawProbe();
        return;
      }
      var maxAbs = d3.max(words, function (w) { return Math.abs(w.ratio); }) || 1;
      if (!isFinite(maxAbs) || maxAbs <= 0) maxAbs = 1;
      var x = d3.scaleLinear().domain([-maxAbs * 1.08, maxAbs * 1.08]).range([0, f.w]);
      var y = d3.scaleBand().domain(words.map(function (w) { return w.token; }))
        .range([0, f.h]).padding(0.24);

      f.g.append('line')
        .attr('x1', x(0)).attr('x2', x(0)).attr('y1', -8).attr('y2', f.h)
        .attr('stroke', 'var(--ink-3)').attr('stroke-width', 1.2);

      var bars = f.g.selectAll('rect.w').data(words).join('rect')
        .attr('class', 'w')
        .attr('x', function (d) { return d.ratio >= 0 ? x(0) : x(d.ratio); })
        .attr('y', function (d) { return y(d.token); })
        .attr('width', function (d) { return Math.abs(x(d.ratio) - x(0)); })
        .attr('height', y.bandwidth())
        .attr('fill', function (d) {
          return d.ratio >= 0 ? 'var(--cat-2)' : 'var(--cat-1)';
        })
        .attr('rx', 2).attr('tabindex', 0);

      window.Chart.tips(bars, function (d) {
        return '<strong>' + window.UI.esc(d.token) + '</strong><br>' +
          'appears ' + d.a + ' time(s) in ' + window.UI.esc(cls[0]) + ', ' +
          d.b + ' in ' + window.UI.esc(cls[1]) + '<br>' +
          'log P(w|' + window.UI.esc(cls[0]) + ') − log P(w|' +
          window.UI.esc(cls[1]) + ') = ' + d.ratio.toFixed(3);
      });

      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0));
      f.g.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(5));
      f.g.append('text').attr('class', 'axis-label')
        .attr('x', f.w / 2).attr('y', f.h + 34).attr('text-anchor', 'middle')
        .text('log-likelihood ratio (bits favour the class on that side)');

      f.g.append('text').attr('x', x(0) + 8).attr('y', -14)
        .style('font-size', '11px').style('font-weight', '650')
        .attr('fill', 'var(--cat-2)').text('→ favours ' + cls[0]);
      f.g.append('text').attr('x', x(0) - 8).attr('y', -14)
        .attr('text-anchor', 'end')
        .style('font-size', '11px').style('font-weight', '650')
        .attr('fill', 'var(--cat-1)').text('favours ' + cls[1] + ' ←');

      drawProbe();
    }

    /* The document walk-through, rendered as HTML beneath the chart. */
    function drawProbe() {
      var cls = classesOf();
      var toks = tokenise(state.probe);
      var ex = state.model.explain(toks);
      var slot = host.querySelector('[data-nb-probe]');

      var rows = ex.rows.map(function (r) {
        var unseen = !state.model.vocab[r.token];
        var lead = r.contrib[cls[0]] - r.contrib[cls[1]];
        return '<tr' + (unseen ? ' style="background:var(--warn-soft)"' : '') + '>' +
          '<th scope="row" class="mono">' + window.UI.esc(r.token) +
            (unseen ? ' <span class="pill pill-sim">unseen</span>' : '') + '</th>' +
          '<td class="num">' + fmtLog(r.contrib[cls[0]]) + '</td>' +
          '<td class="num">' + fmtLog(r.contrib[cls[1]]) + '</td>' +
          '<td class="num" style="color:' +
            (lead > 0 ? 'var(--cat-2)' : 'var(--cat-1)') + '">' +
            (isFinite(lead) ? (lead > 0 ? '+' : '') + lead.toFixed(2) : '−∞') +
          '</td></tr>';
      }).join('');

      var pa = ex.proba[cls[0]], pb = ex.proba[cls[1]];
      var broken = !isFinite(ex.logScores[cls[0]]) && !isFinite(ex.logScores[cls[1]]);

      slot.innerHTML =
        '<h4 style="margin-top:0">How this notice is scored</h4>' +
        '<div class="table-scroll"><table class="table-compact">' +
          '<caption>Each row is one token. The columns are its log-likelihood ' +
          'under each class, from the fitted model, and the difference between ' +
          'them.</caption>' +
          '<thead><tr><th scope="col">token</th>' +
          '<th class="num" scope="col">log P(w | ' + window.UI.esc(cls[0]) + ')</th>' +
          '<th class="num" scope="col">log P(w | ' + window.UI.esc(cls[1]) + ')</th>' +
          '<th class="num" scope="col">difference</th></tr></thead>' +
          '<tbody>' + rows +
          '<tr style="border-top:2px solid var(--rule)">' +
            '<th scope="row">prior + all tokens</th>' +
            '<td class="num"><strong>' + fmtLog(ex.logScores[cls[0]]) + '</strong></td>' +
            '<td class="num"><strong>' + fmtLog(ex.logScores[cls[1]]) + '</strong></td>' +
            '<td class="num"></td></tr>' +
          '</tbody></table></div>' +
        (broken
          ? '<div class="callout callout-warn"><div class="callout-title">' +
            'Both classes scored minus infinity</div><p class="mb0">With ' +
            'smoothing at zero, a token that never appeared in the training data ' +
            'for a class gives that class a likelihood of exactly zero, and one ' +
            'zero factor annihilates the entire product. Here it has happened for ' +
            'both classes, so the model cannot express any preference at all. ' +
            'This is the zero-frequency problem, and Laplace smoothing is the ' +
            'standard answer to it.</p></div>'
          : '<p><strong>Prediction: ' + window.UI.esc(ex.prediction) + '</strong> ' +
            'with probability ' + (Math.max(pa, pb) * 100).toFixed(1) + '%. ' +
            'These posteriors are obtained by exponentiating the log scores with ' +
            'the log-sum-exp trick. Treat them as a ranking, not as calibrated ' +
            'probabilities: naive Bayes posteriors are pushed towards 0 and 1 by ' +
            'the independence assumption, which is why the classifier is often ' +
            'right and its confidence almost always overstated.</p>');
    }

    function fmtLog(v) {
      if (!isFinite(v)) return '−∞';
      return v.toFixed(2);
    }

    function updateMetrics() {
      var r = state.report;
      window.UI.setMetric('nb-acc', window.Chart.pct(r.accuracy),
        state.split.test.X.length + ' held-out notices',
        r.accuracy > 0.85 ? 'good' : null);
      window.UI.setMetric('nb-f1', window.Chart.num(r.macroF1),
        'macro-averaged F1');
      window.UI.setMetric('nb-vocab', String(state.model.vocabSize),
        'distinct tokens in training');
      var cls = classesOf();
      window.UI.setMetric('nb-prior',
        (state.model.prior[cls[0]] * 100).toFixed(0) + ' / ' +
        (state.model.prior[cls[1]] * 100).toFixed(0),
        'prior split, ' + cls[0] + ' vs ' + cls[1]);
    }

    function updateExplain() {
      var el = host.querySelector('[data-viz-note]');
      var cls = classesOf();
      var msg;
      if (state.alpha === 0) {
        msg = '<strong>Smoothing is off.</strong> Any token in a document that ' +
          'never appeared in the training data for a class sets that class\'s ' +
          'likelihood to exactly zero, whatever the rest of the document says. ' +
          'Edit the notice below to include an unusual word and watch the ' +
          'classification break. Add a small amount of smoothing and it recovers.';
      } else if (state.alpha > 3) {
        msg = 'Smoothing is heavy at alpha = ' + state.alpha + '. Every ' +
          'likelihood is being pulled towards uniform, so the differences ' +
          'between words shrink and the classifier leans increasingly on the ' +
          'class priors. Accuracy is now ' + window.Chart.pct(state.report.accuracy) +
          '. Over-smoothing is a quieter failure than under-smoothing, because ' +
          'nothing visibly breaks.';
      } else {
        msg = 'With alpha = ' + state.alpha + ' the classifier reaches ' +
          window.Chart.pct(state.report.accuracy) + ' on the held-out split. ' +
          'Read the bars above as the model\'s reasoning: words extending right ' +
          'push a notice towards ' + cls[0] + ', words extending left towards ' +
          cls[1] + '. This is more interpretability than most models offer, and ' +
          'it is worth being careful about what it licenses. The model has ' +
          'learned which words co-occur with which classification decision. It ' +
          'has not learned anything about hazard.';
      }
      el.innerHTML = '<p class="mb0">' + msg + '</p>';
    }

    function updateAlt() {
      var cls = classesOf();
      var top = state.model.topTokens(cls[0], cls[1], 9);
      altBody.innerHTML =
        '<p>A multinomial naive Bayes classifier is trained in your browser on ' +
        state.split.train.X.length + ' notices from the illustrative corpus and ' +
        'evaluated on ' + state.split.test.X.length + ' held out, distinguishing ' +
        window.UI.esc(cls[0]) + ' from ' + window.UI.esc(cls[1]) +
        '. Laplace smoothing is set to alpha = ' + state.alpha + '. The ' +
        'classifier reaches ' + window.Chart.pct(state.report.accuracy) +
        ' accuracy and ' + window.Chart.num(state.report.macroF1) + ' macro-F1.</p>' +
        '<p>The chart is a horizontal bar chart of the words with the strongest ' +
        'log-likelihood ratio between the two classes. Bars extending right ' +
        'favour ' + window.UI.esc(cls[0]) + '; bars extending left favour ' +
        window.UI.esc(cls[1]) + '.</p>' +
        window.UI.altTable('Words most strongly associated with ' + cls[0] + '.',
          ['Token', 'Count in ' + cls[0], 'Count in ' + cls[1], 'Log ratio'],
          top.forA.map(function (w) {
            return [w.token, String(w.a), String(w.b), w.ratio.toFixed(3)];
          })) +
        window.UI.altTable('Words most strongly associated with ' + cls[1] + '.',
          ['Token', 'Count in ' + cls[0], 'Count in ' + cls[1], 'Log ratio'],
          top.forB.map(function (w) {
            return [w.token, String(w.a), String(w.b), w.ratio.toFixed(3)];
          })) +
        window.Chart.confusionHtml(state.report) +
        window.Chart.reportHtml(state.report);
    }

    function refresh() {
      fit(); draw(); updateMetrics(); updateExplain(); updateAlt();
    }

    /* Controls */
    host.querySelector('#nb-alpha').addEventListener('input', function () {
      state.alpha = +this.value;
      host.querySelector('#nb-alpha-val').textContent = state.alpha.toFixed(2);
      refresh();
    });
    host.querySelector('#nb-pair').addEventListener('change', function () {
      state.pair = this.value; refresh();
    });
    var probeEl = host.querySelector('#nb-probe');
    probeEl.addEventListener('input', function () {
      state.probe = this.value; drawProbe();
    });
    host.querySelectorAll('[data-nb-example]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.probe = b.getAttribute('data-nb-example');
        probeEl.value = state.probe;
        drawProbe();
      });
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.alpha = 1; state.pair = 'Class I|Class II';
      state.probe = 'undeclared milk allergen not listed on the label';
      host.querySelector('#nb-alpha').value = 1;
      host.querySelector('#nb-alpha-val').textContent = '1.00';
      host.querySelector('#nb-pair').value = state.pair;
      probeEl.value = state.probe;
      refresh();
    });

    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
