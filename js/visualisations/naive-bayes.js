/* Week 5 - Naive Bayes classifier explorer, on real openFDA recall text.
 *
 * The lab's model, CountVectorizer() + MultinomialNB(alpha), is fitted in the
 * browser to the training rows of the frozen Week 5 snapshot and evaluated on
 * its test rows (the same grouped split as the lab, from WEEK05_CORPUS). At
 * alpha = 1 it reproduces the lab's numbers exactly. Three views:
 *   words          - which words push a text towards Class I and which away
 *   errors         - the confusion matrix and the most confident mistakes
 *   probabilities  - how predict_proba is spread, and a reliability diagram
 * and a probe that scores any text word by word.
 */
(function () {
  'use strict';

  var DEFAULT_PROBE = 'Product may be contaminated with Listeria monocytogenes.';

  window.Chart.register('viz-naive-bayes', function (host) {
    var U = window.UI, Ch = window.Chart;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var K = window.W5 && window.W5.corpus();
    if (!K) {
      stage.innerHTML = '<div class="noscript-note">The Week 5 data file did not load.</div>';
      return;
    }
    var state = { alpha: 1, view: 'words', minDf: 20, probe: DEFAULT_PROBE };
    var model, p, ev;

    function fmt(v, d) { return v == null || isNaN(v) ? 'n/a' : (+v).toFixed(d == null ? 3 : d); }
    function pct(v) { return Ch.pct(v); }
    function int(v) { return d3.format(',')(v); }

    function fit() {
      model = window.W5.multinomialNB(K, state.alpha);
      p = K.testBags.map(model.proba);
      ev = window.W5.evaluate(K.testY, p);
    }

    function ratioOf(j) { return model.flp[1][j] - model.flp[0][j]; }

    function topWords(k) {
      var ok = [];
      for (var j = 0; j < K.V; j++) if (K.df[j] >= state.minDf) ok.push(j);
      var finite = ok.filter(function (j) { return isFinite(ratioOf(j)); });
      finite.sort(function (a, b) { return ratioOf(b) - ratioOf(a); });
      return { up: finite.slice(0, k), down: finite.slice(-k).reverse(),
               infinite: ok.length - finite.length, considered: ok.length };
    }

    /* ---- view 1: words ---------------------------------------------- */
    function drawWords() {
      var t = topWords(9);
      var words = t.up.concat(t.down.slice().reverse()).map(function (j) {
        return { j: j, word: K.vocab[j], r: ratioOf(j) };
      });
      if (!words.length) {
        stage.innerHTML = '<div class="noscript-note"><strong>No word can be ' +
          'placed on the chart.</strong> With smoothing at zero, every word ' +
          'here was missing from one of the classes, so its log-ratio is ' +
          'infinite. Raise alpha above zero and the chart returns.</div>';
        return;
      }
      var narrow = stage.clientWidth < 520;
      var f = Ch.frame(stage, {
        height: 60 + words.length * 21,
        margin: { top: 34, right: 16, bottom: 44, left: narrow ? 104 : 140 },
        title: 'Log-likelihood ratio of each word, Class I versus Class II/III'
      });
      var m = d3.max(words, function (w) { return Math.abs(w.r); }) || 1;
      var x = d3.scaleLinear().domain([-m * 1.08, m * 1.08]).range([0, f.w]);
      var y = d3.scaleBand().domain(words.map(function (w) { return w.word; }))
        .range([0, f.h]).padding(0.22);
      f.g.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', -8).attr('y2', f.h)
        .attr('stroke', 'var(--ink-3)').attr('stroke-width', 1.2);
      var bars = f.g.selectAll('rect.w').data(words).join('rect').attr('class', 'w')
        .attr('x', function (d) { return d.r >= 0 ? x(0) : x(d.r); })
        .attr('y', function (d) { return y(d.word); })
        .attr('width', function (d) { return Math.abs(x(d.r) - x(0)); })
        .attr('height', y.bandwidth()).attr('rx', 2).attr('tabindex', 0)
        .attr('fill', function (d) { return d.r >= 0 ? 'var(--cat-2)' : 'var(--cat-1)'; });
      Ch.tips(bars, function (d) {
        return '<strong>' + U.esc(d.word) + '</strong><br>' +
          int(K.counts[1][d.j]) + ' times in Class I training texts, ' +
          int(K.counts[0][d.j]) + ' in Class II/III<br>in ' + int(K.df[d.j]) +
          ' training texts<br>log P(w | I) − log P(w | II/III) = ' + d.r.toFixed(2);
      });
      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0));
      f.g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(5));
      f.g.append('text').attr('class', 'axis-label').attr('x', f.w / 2).attr('y', f.h + 36)
        .attr('text-anchor', 'middle').text('log P(word | Class I) − log P(word | Class II/III)');
      f.g.append('text').attr('x', x(0) + 6).attr('y', -14).style('font-size', '11px')
        .style('font-weight', 650).attr('fill', 'var(--cat-2)').text('→ towards Class I');
      f.g.append('text').attr('x', x(0) - 6).attr('y', -14).attr('text-anchor', 'end')
        .style('font-size', '11px').style('font-weight', 650).attr('fill', 'var(--cat-1)')
        .text('towards Class II/III ←');
    }

    /* ---- view 2: errors --------------------------------------------- */
    function mistakes() {
      var fps = [], fns = [];
      p.forEach(function (v, i) {
        if (isNaN(v)) return;
        var yv = K.testY[i];
        if (!yv && v >= 0.5) fps.push(i);
        if (yv && v < 0.5) fns.push(i);
      });
      fps.sort(function (a, b) { return p[b] - p[a]; });
      fns.sort(function (a, b) { return p[a] - p[b]; });
      return { fp: fps.slice(0, 4), fn: fns.slice(0, 4) };
    }

    function drawErrors() {
      stage.innerHTML = '<div data-nb-cm></div><div data-nb-err class="small"></div>';
      var cmHost = stage.querySelector('[data-nb-cm]');
      var wide = stage.clientWidth > 560;
      var f = Ch.frame(cmHost, { height: 210, margin: { top: 8, right: 8, bottom: 8, left: 8 },
        title: 'Confusion matrix on the test set: rows are the FDA class, columns the prediction' });
      var hw = wide ? 150 : 96, hh = 36;
      var cw = Math.min(wide ? 200 : 120, (f.w - hw) / 2), chh = (f.h - hh) / 2;
      var cells = [
        { r: 0, c: 0, ab: 'TP', v: ev.tp, m: 'Class I, flagged', fill: '#fdebc8' },
        { r: 0, c: 1, ab: 'FN', v: ev.fn, m: 'Class I, missed', fill: '#fbdde0' },
        { r: 1, c: 0, ab: 'FP', v: ev.fp, m: 'II/III, flagged', fill: '#dce9f6' },
        { r: 1, c: 1, ab: 'TN', v: ev.tn, m: 'II/III, cleared', fill: '#eef2f5' }];
      ['Predicted Class I', 'Predicted II/III'].forEach(function (t, j) {
        f.g.append('rect').attr('x', hw + j * cw).attr('width', cw - 4).attr('height', hh - 4)
          .attr('fill', 'var(--clinical)');
        f.g.append('text').attr('x', hw + j * cw + cw / 2 - 2).attr('y', hh / 2 + 2)
          .attr('text-anchor', 'middle').attr('fill', '#fff').style('font-size', wide ? '12px' : '10.5px')
          .style('font-weight', 700).text(t);
      });
      ['FDA: Class I', 'FDA: II or III'].forEach(function (t, i) {
        f.g.append('rect').attr('y', hh + i * chh).attr('width', hw - 4).attr('height', chh - 4)
          .attr('fill', 'var(--clinical)');
        f.g.append('text').attr('x', (hw - 4) / 2).attr('y', hh + i * chh + chh / 2 + 4)
          .attr('text-anchor', 'middle').attr('fill', '#fff').style('font-size', wide ? '12px' : '10.5px')
          .style('font-weight', 700).text(t);
      });
      cells.forEach(function (d) {
        var x0 = hw + d.c * cw, y0 = hh + d.r * chh;
        f.g.append('rect').attr('x', x0).attr('y', y0).attr('width', cw - 4).attr('height', chh - 4)
          .attr('fill', d.fill);
        f.g.append('text').attr('x', x0 + cw / 2 - 2).attr('y', y0 + chh / 2 - 4)
          .attr('text-anchor', 'middle').style('font-size', wide ? '19px' : '15px')
          .style('font-weight', 700).text(d.ab + ' ' + int(d.v));
        f.g.append('text').attr('x', x0 + cw / 2 - 2).attr('y', y0 + chh / 2 + 15)
          .attr('text-anchor', 'middle').style('font-size', '11px').attr('fill', 'var(--ink-3)')
          .text(d.m);
      });
      var mk = mistakes();
      function li(i) {
        return '<li><span class="mono">p = ' + p[i].toFixed(3) + '</span> · FDA ' +
          (K.testY[i] ? 'Class I' : 'Class II/III') + ' · “' +
          U.esc(K.raw.texts[K.test[i]]) + '”</li>';
      }
      stage.querySelector('[data-nb-err]').innerHTML =
        '<h4>The most confident false positives (FDA class II or III, model says Class I)</h4>' +
        '<ul>' + mk.fp.map(li).join('') + '</ul>' +
        '<h4>The most confident false negatives (FDA Class I, model says II/III)</h4>' +
        '<ul>' + mk.fn.map(li).join('') + '</ul>' +
        '<p class="muted mb0">Real test texts, quoted exactly as in the FDA record. Before ' +
        'calling them model errors, ask whether the text alone could have told a ' +
        'person the class.</p>';
    }

    /* ---- view 3: probabilities -------------------------------------- */
    function bins() {
      var out = d3.range(10).map(function (b) {
        return { lo: b / 10, hi: (b + 1) / 10, n: 0, sp: 0, pos: 0 };
      });
      p.forEach(function (v, i) {
        if (isNaN(v)) return;
        var b = Math.min(9, Math.floor(v * 10));
        out[b].n++; out[b].sp += v; out[b].pos += K.testY[i];
      });
      return out;
    }

    function drawProbs() {
      var B = bins();
      var wide = stage.clientWidth > 700;
      var f = Ch.frame(stage, {
        height: wide ? 320 : 620, margin: { top: 28, right: 16, bottom: 46, left: 56 },
        title: 'Histogram of predicted probabilities and reliability diagram, test set'
      });
      var gap = wide ? 60 : 78;
      var side = wide ? Math.min(f.h, (f.w - gap) * 0.5) : Math.min(f.w, (f.h - gap) / 2);
      var pw2 = wide ? f.w - gap - side : f.w, ph2 = wide ? side : f.h - gap - side;

      var g1 = f.g.append('g');
      g1.append('text').attr('class', 'chart-title').attr('y', -12)
        .text('How the ' + int(ev.n) + ' predictions are spread');
      var hx = d3.scaleBand().domain(d3.range(10)).range([0, side]).padding(0.08);
      var hy = d3.scaleLinear().domain([0, d3.max(B, function (b) { return b.n; }) || 1]).nice()
        .range([side, 0]);
      var hb = g1.selectAll('rect.h').data(B).join('rect').attr('class', 'h')
        .attr('x', function (b, i) { return hx(i); }).attr('width', hx.bandwidth())
        .attr('y', function (b) { return hy(b.n); })
        .attr('height', function (b) { return side - hy(b.n); })
        .attr('fill', 'var(--cat-2)').attr('tabindex', 0);
      Ch.tips(hb, function (b) {
        return '<strong>p from ' + b.lo.toFixed(1) + ' to ' + b.hi.toFixed(1) + '</strong><br>' +
          int(b.n) + ' test texts';
      });
      g1.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + side + ')')
        .call(d3.axisBottom(hx).tickFormat(function (i) { return (i / 10).toFixed(1); }));
      g1.append('g').attr('class', 'axis').call(d3.axisLeft(hy).ticks(5));
      g1.append('text').attr('class', 'axis-label').attr('x', side / 2).attr('y', side + 36)
        .attr('text-anchor', 'middle').text('predicted P(Class I), lower edge of bin');
      g1.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
        .attr('x', -side / 2).attr('y', -42).attr('text-anchor', 'middle').text('test texts');

      var g2 = f.g.append('g').attr('transform', wide
        ? 'translate(' + (side + gap) + ',0)' : 'translate(0,' + (side + gap) + ')');
      var s2 = Math.min(pw2, ph2);
      g2.append('text').attr('class', 'chart-title').attr('y', -12).text('Predicted vs observed');
      var x = d3.scaleLinear().domain([0, 1]).range([0, s2]);
      var y = d3.scaleLinear().domain([0, 1]).range([s2, 0]);
      g2.append('line').attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(1)).attr('y2', y(1))
        .attr('stroke', 'var(--ink-3)').attr('stroke-width', 1.6).attr('stroke-dasharray', '6 4');
      var pts = B.filter(function (b) { return b.n > 0; });
      g2.append('path').attr('fill', 'none').attr('stroke', 'var(--cat-1)').attr('stroke-width', 2)
        .attr('d', d3.line().x(function (b) { return x(b.sp / b.n); })
          .y(function (b) { return y(b.pos / b.n); })(pts));
      var r = d3.scaleSqrt().domain([0, 1000]).range([3, 13]);
      var dots = g2.selectAll('circle').data(pts).join('circle')
        .attr('cx', function (b) { return x(b.sp / b.n); })
        .attr('cy', function (b) { return y(b.pos / b.n); })
        .attr('r', function (b) { return r(b.n); }).attr('fill', 'var(--cat-1)')
        .attr('stroke', '#fff').attr('stroke-width', 1.3).attr('tabindex', 0);
      Ch.tips(dots, function (b) {
        return '<strong>p ' + b.lo.toFixed(1) + '–' + b.hi.toFixed(1) + '</strong><br>' +
          int(b.n) + ' texts<br>mean prediction ' + pct(b.sp / b.n) +
          '<br>actually Class I ' + pct(b.pos / b.n);
      });
      g2.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + s2 + ')')
        .call(d3.axisBottom(x).ticks(5));
      g2.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
      g2.append('text').attr('class', 'axis-label').attr('x', s2 / 2).attr('y', s2 + 36)
        .attr('text-anchor', 'middle').text('mean predicted probability (bin)');
      g2.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
        .attr('x', -s2 / 2).attr('y', -42).attr('text-anchor', 'middle').text('observed fraction Class I');
    }

    function extremeFraction() {
      var n = 0, e = 0;
      p.forEach(function (v) { if (!isNaN(v)) { n++; if (v < 0.05 || v > 0.95) e++; } });
      return n ? e / n : null;
    }

    /* ---- probe ------------------------------------------------------ */
    function drawProbe() {
      var slot = host.querySelector('[data-nb-probe]');
      var toks = window.W5.tokenize(state.probe);
      var seen = {}, rows = [];
      toks.forEach(function (t) { seen[t] = (seen[t] || 0) + 1; });
      Object.keys(seen).forEach(function (t) {
        var j = K.index[t];
        rows.push({ t: t, n: seen[t], j: j,
          d: j == null ? null : seen[t] * ratioOf(j) });
      });
      var bag = K.bag(toks);
      var s = model.jll(bag), pr = model.proba(bag);
      var tr = rows.map(function (r) {
        var dtxt = r.j == null ? 'ignored' : (isFinite(r.d) ? (r.d > 0 ? '+' : '') + r.d.toFixed(2)
          : (r.d > 0 ? '+∞' : '−∞'));
        return '<tr' + (r.j == null ? ' style="background:var(--warn-soft)"' : '') + '>' +
          '<th scope="row" class="mono">' + U.esc(r.t) + (r.n > 1 ? ' ×' + r.n : '') +
          (r.j == null ? ' <span class="pill pill-sim">not in the training vocabulary</span>' : '') +
          '</th><td class="num" style="color:' + (r.d > 0 ? 'var(--cat-2)' : 'var(--cat-1)') + '">' +
          dtxt + '</td></tr>';
      }).join('');
      var priorDiff = model.prior[1] - model.prior[0];
      var verdict;
      if (isNaN(pr)) {
        verdict = '<div class="callout callout-warn"><div class="callout-title">Both classes ' +
          'scored minus infinity</div><p class="mb0">With alpha = 0 this text contains a word ' +
          'never seen in Class I training texts and another never seen in Class II/III ' +
          'texts. Each zero likelihood vetoes its class, so the model cannot score the ' +
          'text at all. This is the zero-frequency problem that smoothing solves.</p></div>';
      } else {
        verdict = '<p class="mb0"><strong>Prediction: ' + (pr >= 0.5 ? 'Class I' : 'Class II/III') +
          '</strong>, predict_proba gives P(Class I) = ' + pr.toFixed(3) + '. Positive if ' +
          'p ≥ 0.5. Treat this number as a score to be checked, not as a calibrated ' +
          'probability: see the Probabilities view.' +
          (!bag.length ? ' No word of this text is in the training vocabulary, so only ' +
            'the prior decided.' : '') + '</p>';
      }
      slot.innerHTML = '<h4 style="margin-top:0">How this text is scored</h4>' +
        '<div class="table-scroll"><table class="table-compact"><caption>Each token, as ' +
        'CountVectorizer splits it, and how much it moves the log-score towards Class I ' +
        '(count × [log P(w | I) − log P(w | II/III)]).</caption><thead><tr>' +
        '<th scope="col">token</th><th class="num" scope="col">pushes towards Class I by</th>' +
        '</tr></thead><tbody><tr><th scope="row">prior: log P(I) − log P(II/III)</th>' +
        '<td class="num">' + priorDiff.toFixed(2) + '</td></tr>' + tr +
        '<tr style="border-top:2px solid var(--rule)"><th scope="row">total ' +
        '(log-odds of Class I)</th><td class="num"><strong>' +
        (isNaN(pr) ? 'undefined' : isFinite(s[1] - s[0]) ? (s[1] - s[0]).toFixed(2) :
          (s[1] > s[0] ? '+∞' : '−∞')) + '</strong></td></tr></tbody></table></div>' + verdict;
    }

    /* ---- readouts, notes, text alternative -------------------------- */
    function updateMetrics() {
      var maj = 1 - d3.mean(K.testY);
      U.setMetric('nb-acc', pct(ev.accuracy), int(ev.n) + ' test texts; always-II/III baseline ' +
        pct(maj));
      U.setMetric('nb-pr', fmt(ev.precision, 2) + ' / ' + fmt(ev.recall, 2),
        'Class I precision / recall');
      U.setMetric('nb-auc', fmt(ev.rocAuc, 3), ev.unscorable ? 'undefined: ' + ev.unscorable +
        ' texts cannot be scored' : 'ranking quality, threshold-free');
      U.setMetric('nb-ext', pct(extremeFraction()), 'predictions below 0.05 or above 0.95');
      U.setMetric('nb-vocab', int(K.V), 'words learned from ' + int(K.train.length) +
        ' training texts');
    }

    function updateNote() {
      var el = host.querySelector('[data-viz-note]');
      var msg = '';
      if (state.alpha === 0) {
        msg = '<strong>Smoothing is off (alpha = 0).</strong> ' + int(ev.unscorable) +
          ' of the ' + int(K.test.length) + ' test texts cannot be scored at all, because ' +
          'they contain one word never seen in Class I training texts and another never seen ' +
          'in Class II/III texts. The metrics above are computed on the remaining ' +
          int(ev.n) + '.';
      } else if (state.alpha !== 1) {
        msg = '<strong>alpha = ' + state.alpha.toFixed(2) + '.</strong> The scores above are on ' +
          'the test set. Watching them while you move alpha is fine for exploring; choosing ' +
          'alpha this way is not. That would be tuning on the test set (Week 3). In the lab, ' +
          'choose alpha by cross-validation on the training rows only.';
      } else {
        msg = 'At alpha = 1 this is exactly the lab\'s model, and these are the lab\'s numbers: ' +
          'accuracy ' + pct(ev.accuracy) + ' against ' + pct(1 - d3.mean(K.testY)) +
          ' for always predicting the majority class.';
      }
      if (state.view === 'words') {
        var t = topWords(9);
        msg += ' Showing words used in at least ' + state.minDf + ' training text' +
          (state.minDf > 1 ? 's' : '') + ' (' + int(t.considered) + ' words qualify' +
          (t.infinite ? ', ' + t.infinite + ' with an infinite ratio left off the chart' : '') +
          '). Lower the threshold and firm and place names from single large recalls take ' +
          'over: the model learns who wrote a notice as well as why.';
      } else if (state.view === 'probs') {
        msg += ' ' + pct(extremeFraction()) + ' of the predictions are below 0.05 or above ' +
          '0.95. The naive independence assumption counts correlated words as separate ' +
          'evidence, which pushes scores towards 0 and 1. predict_proba is not automatically ' +
          'a calibrated probability.';
      } else {
        msg += ' Most of the confident false positives name a pathogen such as Listeria, ' +
          'yet FDA classified them as Class II. The label is FDA\'s assessment of the whole ' +
          'situation, which the short reason text only partly describes.';
      }
      el.innerHTML = '<p class="mb0">' + msg + '</p>';
    }

    function updateAlt() {
      var t = topWords(9), B = bins(), mk = mistakes();
      function wrow(j) {
        return [K.vocab[j], int(K.counts[1][j]), int(K.counts[0][j]), int(K.df[j]),
                ratioOf(j).toFixed(2)];
      }
      var head = ['Word', 'Count in Class I texts', 'Count in Class II/III texts',
                  'Training texts containing it', 'Log-ratio'];
      altBody.innerHTML =
        '<p>CountVectorizer and MultinomialNB with alpha = ' + state.alpha.toFixed(2) +
        ', fitted in your browser to ' + int(K.train.length) + ' training texts from the ' +
        'frozen openFDA snapshot and evaluated on ' + int(K.test.length) + ' test texts ' +
        'from different recall events. Accuracy ' + pct(ev.accuracy) + ', Class I precision ' +
        fmt(ev.precision, 3) + ', recall ' + fmt(ev.recall, 3) + ', ROC AUC ' +
        fmt(ev.rocAuc, 3) + '. Confusion matrix (rows = FDA class): Class I: TP ' + ev.tp +
        ', FN ' + ev.fn + '; Class II/III: FP ' + ev.fp + ', TN ' + ev.tn +
        (ev.unscorable ? '; ' + ev.unscorable + ' texts could not be scored' : '') + '.</p>' +
        U.altTable('Words pushing towards Class I (used in at least ' + state.minDf +
          ' training texts).', head, t.up.map(wrow)) +
        U.altTable('Words pushing towards Class II/III.', head, t.down.map(wrow)) +
        U.altTable('Predicted probabilities on the test set, by bin.',
          ['Bin', 'Texts', 'Mean prediction', 'Observed fraction Class I'],
          B.map(function (b) {
            return [b.lo.toFixed(1) + '–' + b.hi.toFixed(1), int(b.n),
              b.n ? pct(b.sp / b.n) : 'n/a', b.n ? pct(b.pos / b.n) : 'n/a'];
          })) +
        U.altTable('The most confident mistakes.', ['Kind', 'p', 'Text'],
          mk.fp.map(function (i) { return ['False positive', p[i].toFixed(3), K.raw.texts[K.test[i]]]; })
            .concat(mk.fn.map(function (i) {
              return ['False negative', p[i].toFixed(3), K.raw.texts[K.test[i]]]; })));
    }

    function draw() {
      if (state.view === 'words') drawWords();
      else if (state.view === 'errors') drawErrors();
      else drawProbs();
    }

    function refresh() {
      fit(); draw(); drawProbe(); updateMetrics(); updateNote(); updateAlt();
    }

    host.querySelector('#nb-alpha').addEventListener('input', function () {
      state.alpha = +this.value;
      host.querySelector('#nb-alpha-val').textContent = state.alpha.toFixed(2);
      refresh();
    });
    U.onSegment(host.querySelector('#nb-view'), function (v) {
      state.view = v; draw(); updateNote();
    });
    host.querySelector('#nb-mindf').addEventListener('change', function () {
      state.minDf = +this.value; draw(); updateNote(); updateAlt();
    });
    var probeEl = host.querySelector('#nb-probe');
    probeEl.addEventListener('input', function () { state.probe = this.value; drawProbe(); });
    host.querySelectorAll('[data-nb-example]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.probe = b.getAttribute('data-nb-example');
        probeEl.value = state.probe;
        drawProbe();
      });
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { alpha: 1, view: 'words', minDf: 20, probe: DEFAULT_PROBE };
      host.querySelector('#nb-alpha').value = 1;
      host.querySelector('#nb-alpha-val').textContent = '1.00';
      host.querySelector('#nb-mindf').value = '20';
      host.querySelectorAll('#nb-view button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === 'words'));
      });
      probeEl.value = DEFAULT_PROBE;
      refresh();
    });

    Ch.responsive(stage, draw);
    refresh();
  });
})();
