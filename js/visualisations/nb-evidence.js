/* Week 5 - B. Naive Bayes evidence explorer: a four-word vocabulary.
 *
 * The lecture's hand-worked example (WEEK05.workedExample, illustrative
 * counts). Build a short text from four words and watch each class's log-score
 * accumulate word by word. Switch smoothing off to see a single zero veto a
 * class; repeat the text many times to see why products of probabilities are
 * computed as sums of logs.
 */
(function () {
  'use strict';

  window.Chart.register('viz-nb-evidence', function (host) {
    var U = window.UI, Ch = window.Chart;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var WE = window.WEEK05 && window.WEEK05.workedExample;
    if (!WE) {
      stage.innerHTML = '<div class="noscript-note">The Week 5 data file did not load.</div>';
      return;
    }
    var CL = ['Class I', 'Class II/III'];
    var COL = { 'Class I': 'var(--cat-2)', 'Class II/III': 'var(--cat-1)' };
    var VOC = WE.vocab;
    var DEF = ['undeclared', 'label'];
    var state = { doc: DEF.slice(), alpha: 1, reps: 1 };

    function lik(c, w) {
      var tot = 0;
      VOC.forEach(function (v) { tot += WE.counts[c][v]; });
      return { num: WE.counts[c][w] + state.alpha, den: tot + state.alpha * VOC.length };
    }

    function score() {
      var out = {};
      CL.forEach(function (c) {
        var path = [{ step: 'prior', v: Math.log(WE.prior[c]) }], s = Math.log(WE.prior[c]);
        var prod = WE.prior[c];
        for (var r = 0; r < state.reps; r++) {
          state.doc.forEach(function (w) {
            var l = lik(c, w);
            s += Math.log(l.num / l.den);
            prod *= l.num / l.den;
            if (r === 0) path.push({ step: w, v: s });
          });
        }
        out[c] = { log: s, prod: prod, path: path };
      });
      var a = out['Class I'].log, b = out['Class II/III'].log;
      out.post = (a === -Infinity && b === -Infinity) ? NaN
        : a === -Infinity ? 0 : b === -Infinity ? 1 : 1 / (1 + Math.exp(b - a));
      return out;
    }

    function draw() {
      var s = score();
      var f = Ch.frame(stage, { height: 300,
        margin: { top: 24, right: 24, bottom: 46, left: 58 },
        title: 'Cumulative log-score of each class, word by word' });
      var steps = ['prior'].concat(state.doc.map(function (w, i) { return i + ':' + w; }));
      var x = d3.scalePoint().domain(steps).range([0, f.w]).padding(0.4);
      var finite = [];
      CL.forEach(function (c) { s[c].path.forEach(function (p) { if (isFinite(p.v)) finite.push(p.v); }); });
      var lo = Math.min(d3.min(finite), -1), floor = lo - 1;
      var y = d3.scaleLinear().domain([floor - 0.3, 0]).range([f.h, 0]);
      f.g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).tickFormat(function (d) { return d === 'prior' ? 'prior' : d.split(':')[1]; }));
      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5));
      f.g.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
        .attr('x', -f.h / 2).attr('y', -44).attr('text-anchor', 'middle').text('log-score (natural log)');
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(floor)).attr('y2', y(floor))
        .attr('stroke', 'var(--bad, #b3261e)').attr('stroke-dasharray', '3 3');
      f.g.append('text').attr('x', f.w).attr('y', y(floor) - 5).attr('text-anchor', 'end')
        .style('font-size', '11px').attr('fill', 'var(--ink-3)').text('−∞ (a zero likelihood)');
      CL.forEach(function (c, k) {
        var pts = s[c].path.map(function (p, i) {
          return { x: x(steps[i]), y: y(isFinite(p.v) ? p.v : floor), inf: !isFinite(p.v), v: p.v, step: p.step };
        });
        f.g.append('path').attr('fill', 'none').attr('stroke', COL[c]).attr('stroke-width', 2.4)
          .attr('stroke-dasharray', k ? '7 4' : null)
          .attr('d', d3.line().x(function (d) { return d.x; }).y(function (d) { return d.y; })(pts));
        var dots = f.g.selectAll('circle.c' + k).data(pts).join('circle').attr('class', 'c' + k)
          .attr('cx', function (d) { return d.x; }).attr('cy', function (d) { return d.y; })
          .attr('r', 5).attr('fill', COL[c]).attr('tabindex', 0);
        Ch.tips(dots, function (d) {
          return '<strong>' + c + '</strong> after “' + U.esc(d.step) + '”<br>log-score ' +
            (d.inf ? '−∞' : d.v.toFixed(3));
        });
        f.g.append('text').attr('x', 4).attr('y', 14 + k * 16).style('font-size', '12px')
          .style('font-weight', 650).attr('fill', COL[c]).text((k ? '- - ' : '—— ') + c);
      });
    }

    function frac(c, w) { var l = lik(c, w); return l.num + '/' + l.den; }

    function update() {
      var s = score();
      draw();
      host.querySelector('[data-nbe-doc]').textContent = state.doc.length ? state.doc.join(' ') : '(empty)';
      var post = isNaN(s.post) ? 'undefined' : (s.post * 100).toFixed(1) + '%';
      U.setMetric('nbe-post', post, isNaN(s.post) ? 'both classes vetoed' : 'P(Class I | text)');
      U.setMetric('nbe-prod', s['Class I'].prod === 0 && isFinite(s['Class I'].log)
        ? '0 (underflow)' : s['Class I'].prod.toPrecision(4), 'Class I, multiplied directly');
      U.setMetric('nbe-log', isFinite(s['Class I'].log) ? s['Class I'].log.toFixed(2) : '−∞',
        'Class I, summed in logs');
      var rows = VOC.map(function (w) {
        return '<tr><th scope="row" class="mono">' + w + '</th><td class="num">' + WE.counts['Class I'][w] +
          '</td><td class="num">' + frac('Class I', w) + '</td><td class="num">' +
          WE.counts['Class II/III'][w] + '</td><td class="num">' + frac('Class II/III', w) + '</td></tr>';
      }).join('');
      var table = '<div class="table-scroll"><table class="table-compact"><caption>Training word ' +
        'counts and smoothed likelihoods, alpha = ' + state.alpha + ' (illustrative). Priors: ' +
        'Class I ' + WE.prior['Class I'] + ', Class II/III ' + WE.prior['Class II/III'] +
        '.</caption><thead><tr><th scope="col">word</th><th class="num" scope="col">count, I</th>' +
        '<th class="num" scope="col">P(w | I)</th><th class="num" scope="col">count, II/III</th>' +
        '<th class="num" scope="col">P(w | II/III)</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      var expr = CL.map(function (c) {
        return '<li><strong>' + c + ':</strong> ' + WE.prior[c] + (state.doc.length ? ' × ' : '') +
          state.doc.map(function (w) { return frac(c, w); }).join(' × ') +
          (state.reps > 1 ? ', all repeated ' + state.reps + ' times,' : '') + ' = ' +
          (s[c].prod === 0 && isFinite(s[c].log) ? '0 in floating point (underflow)' :
            s[c].prod.toPrecision(4)) + '</li>';
      }).join('');
      var msg = '';
      if (isNaN(s.post)) {
        msg = 'Both classes contain a zero factor, so neither can be scored.';
      } else if (state.alpha === 0 && (s['Class I'].log === -Infinity || s['Class II/III'].log === -Infinity)) {
        msg = 'With no smoothing, “listeria” never appeared in a Class II/III training text, so ' +
          'P(listeria | II/III) = 0/10 and that class is vetoed outright, whatever the other ' +
          'words say. One unseen pair decides the whole text. Laplace smoothing (alpha = 1) adds ' +
          'one to every count so that no single word can do this.';
      } else if (state.reps > 1 && s['Class I'].prod === 0) {
        msg = 'Repeated ' + state.reps + ' times, the direct product of probabilities has ' +
          'underflowed to exactly 0 for Class I, but the sum of logs is still an ordinary number ' +
          'and the posterior is unaffected. This is why every implementation, including ' +
          'scikit-learn, works in log space.';
      } else {
        msg = 'Each word adds its log-likelihood to each class. The class with the higher final ' +
          'score wins, and the gap between the two lines at the right gives the posterior.';
      }
      host.querySelector('[data-viz-note]').innerHTML = table +
        '<p style="margin-top:var(--s4)"><strong>The naive product</strong> (independence ' +
        'assumed, so the likelihoods multiply):</p><ul>' + expr + '</ul><p class="mb0">' + msg + '</p>';
      altBody.innerHTML = '<p>A line chart of each class\'s cumulative log-score: it starts at ' +
        'the log prior and adds one log-likelihood per word of the text “' +
        U.esc(state.doc.join(' ')) + '”. Smoothing alpha = ' + state.alpha + '. Final log-scores: ' +
        'Class I ' + (isFinite(s['Class I'].log) ? s['Class I'].log.toFixed(3) : '−∞') +
        ', Class II/III ' + (isFinite(s['Class II/III'].log) ? s['Class II/III'].log.toFixed(3) : '−∞') +
        '. Posterior P(Class I | text) = ' + post + '. Illustrative counts, not real data.</p>';
    }

    host.querySelectorAll('[data-nbe-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (state.doc.length < 8) state.doc.push(b.getAttribute('data-nbe-add'));
        update();
      });
    });
    host.querySelector('[data-nbe-clear]').addEventListener('click', function () {
      state.doc = []; update();
    });
    U.onSegment(host.querySelector('#nbe-alpha'), function (v) { state.alpha = +v; update(); });
    host.querySelector('#nbe-reps').addEventListener('input', function () {
      state.reps = +this.value;
      host.querySelector('#nbe-reps-val').textContent = this.value;
      update();
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { doc: DEF.slice(), alpha: 1, reps: 1 };
      host.querySelector('#nbe-reps').value = 1;
      host.querySelector('#nbe-reps-val').textContent = '1';
      host.querySelectorAll('#nbe-alpha button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === '1'));
      });
      update();
    });
    Ch.responsive(stage, draw);
    update();
  });
})();
