/* Week 5 - A. From Bayes to a classifier: one word as evidence.
 *
 * Week 4's diagnostic Bayes with the labels changed: the prior is the share of
 * Class I texts, the evidence is one word, and the likelihoods are
 * P(word | class). The numbers start from the lecture's illustrative
 * four-word example (WEEK05.workedExample); everything is exact arithmetic.
 */
(function () {
  'use strict';

  window.Chart.register('viz-nb-bayes', function (host) {
    var U = window.UI, Ch = window.Chart;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var WE = window.WEEK05 && window.WEEK05.workedExample;
    if (!WE) {
      stage.innerHTML = '<div class="noscript-note">The Week 5 data file did not load.</div>';
      return;
    }
    /* exact fractions ("4/12"), not the rounded decimals */
    function exact(cls) {
      var o = {};
      Object.keys(WE.likelihoodFraction[cls]).forEach(function (w) {
        var p = WE.likelihoodFraction[cls][w].split('/');
        o[w] = p[0] / p[1];
      });
      return o;
    }
    var L1 = exact('Class I'), L0 = exact('Class II/III');
    var PRESETS = {
      listeria: { word: 'listeria', a: L1.listeria, b: L0.listeria },
      undeclared: { word: 'undeclared', a: L1.undeclared, b: L0.undeclared },
      label: { word: 'label', a: L1.label, b: L0.label },
      neutral: { word: 'product', a: 0.2, b: 0.2 }
    };
    var DEF = { prior: WE.prior['Class I'], preset: 'listeria' };
    var state = { prior: DEF.prior, word: 'listeria', a: L1.listeria, b: L0.listeria };

    function calc() {
      var s1 = state.prior * state.a, s0 = (1 - state.prior) * state.b;
      return { s1: s1, s0: s0, post: s1 / (s1 + s0),
        priorOdds: state.prior / (1 - state.prior), lr: state.a / state.b,
        postOdds: s1 / s0 };
    }

    function draw() {
      var c = calc();
      var narrow = stage.clientWidth < 520;
      var f = Ch.frame(stage, { height: 250,
        margin: { top: 16, right: 16, bottom: 40, left: narrow ? 110 : 190 },
        title: 'Prior, evidence and posterior for Class I versus Class II/III' });
      var rows = [
        { k: 'Before: prior', v: state.prior },
        { k: 'After seeing “' + state.word + '”', v: c.post }
      ];
      var y = d3.scaleBand().domain(rows.map(function (r) { return r.k; })).range([0, f.h]).padding(0.35);
      var x = d3.scaleLinear().domain([0, 1]).range([0, f.w]);
      rows.forEach(function (r) {
        var g = f.g.append('g').attr('transform', 'translate(0,' + y(r.k) + ')');
        g.append('rect').attr('width', x(r.v)).attr('height', y.bandwidth()).attr('fill', 'var(--cat-2)');
        g.append('rect').attr('x', x(r.v)).attr('width', f.w - x(r.v)).attr('height', y.bandwidth())
          .attr('fill', 'var(--cat-1)').attr('opacity', 0.55);
        g.append('text').attr('x', 6).attr('y', y.bandwidth() / 2 + 5).attr('fill', '#fff')
          .style('font-weight', 700).style('font-size', '13px')
          .text(r.v >= 0.12 ? 'Class I ' + (r.v * 100).toFixed(1) + '%' : '');
        g.append('text').attr('x', f.w - 6).attr('y', y.bandwidth() / 2 + 5).attr('text-anchor', 'end')
          .style('font-weight', 700).style('font-size', '13px').attr('fill', 'var(--ink)')
          .text(1 - r.v >= 0.16 ? 'II/III ' + ((1 - r.v) * 100).toFixed(1) + '%' : '');
      });
      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0));
      f.g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.0%')));
      f.g.append('text').attr('class', 'axis-label').attr('x', f.w / 2).attr('y', f.h + 34)
        .attr('text-anchor', 'middle').text('share of belief: Class I (left) versus Class II/III (right)');
    }

    function update() {
      var c = calc();
      draw();
      U.setMetric('nbb-prior', (state.prior * 100).toFixed(1) + '%', 'odds ' + c.priorOdds.toFixed(3));
      U.setMetric('nbb-lr', c.lr.toFixed(3), state.a.toFixed(4) + ' / ' + state.b.toFixed(4));
      U.setMetric('nbb-post', (c.post * 100).toFixed(1) + '%', 'odds ' + c.postOdds.toFixed(3));
      host.querySelector('[data-viz-note]').innerHTML =
        '<p><strong>Bayes, as in Week 4:</strong> P(I | word) = P(word | I) P(I) / ' +
        '[P(word | I) P(I) + P(word | II/III) P(II/III)] = ' + state.a.toFixed(4) + ' × ' +
        state.prior.toFixed(2) + ' / (' + state.a.toFixed(4) + ' × ' + state.prior.toFixed(2) +
        ' + ' + state.b.toFixed(4) + ' × ' + (1 - state.prior).toFixed(2) + ') = <strong>' +
        c.post.toFixed(3) + '</strong>.</p><p class="mb0">In odds: posterior odds = prior odds × ' +
        'likelihood ratio = ' + c.priorOdds.toFixed(3) + ' × ' + c.lr.toFixed(3) + ' = ' +
        c.postOdds.toFixed(3) + '. ' + (Math.abs(c.lr - 1) < 1e-9
          ? 'A word equally likely in both classes leaves the belief exactly where it was.'
          : 'A likelihood ratio above 1 moves belief towards Class I; below 1, away from it.') +
        ' Naive Bayes repeats this update once for every word in the text.</p>';
      altBody.innerHTML = '<p>Two horizontal bars. Before any evidence, belief in Class I ' +
        'is the prior, ' + (state.prior * 100).toFixed(1) + '%. After seeing the word “' +
        U.esc(state.word) + '”, with P(word | Class I) = ' + state.a.toFixed(4) +
        ' and P(word | Class II/III) = ' + state.b.toFixed(4) + ', it is ' +
        (c.post * 100).toFixed(1) + '%. Illustrative numbers, not estimated from real data.</p>';
    }

    function setSliders() {
      [['nbb-p', state.prior], ['nbb-a', state.a], ['nbb-b', state.b]].forEach(function (s) {
        host.querySelector('#' + s[0]).value = s[1];
        host.querySelector('#' + s[0] + '-val').textContent = (+s[1]).toFixed(s[0] === 'nbb-p' ? 2 : 3);
      });
    }

    function setPreset(k) {
      var p = PRESETS[k];
      state.word = p.word; state.a = p.a; state.b = p.b;
      setSliders(); update();
    }

    [['nbb-p', 'prior'], ['nbb-a', 'a'], ['nbb-b', 'b']].forEach(function (s) {
      host.querySelector('#' + s[0]).addEventListener('input', function () {
        state[s[1]] = +this.value;
        host.querySelector('#' + s[0] + '-val').textContent = (+this.value).toFixed(s[0] === 'nbb-p' ? 2 : 3);
        if (s[0] !== 'nbb-p') { state.word = 'your word'; host.querySelector('#nbb-word').value = 'custom'; }
        update();
      });
    });
    host.querySelector('#nbb-word').addEventListener('change', function () {
      if (PRESETS[this.value]) setPreset(this.value);
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.prior = DEF.prior;
      host.querySelector('#nbb-word').value = DEF.preset;
      setPreset(DEF.preset);
    });
    Ch.responsive(stage, draw);
    setSliders();
    update();
  });
})();
