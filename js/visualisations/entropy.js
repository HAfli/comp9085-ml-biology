/* Week 2 - Entropy and information gain visualiser.
 *
 * Two linked panels. The left one shows entropy as a function of class balance,
 * with the student's current mix marked on the curve. The right one shows what
 * happens to that entropy when a candidate split partitions the samples, and
 * computes the information gain arithmetic explicitly, term by term, so the
 * formula on the lecture slide becomes something you can move.
 */
(function () {
  'use strict';

  window.Chart.register('viz-entropy', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var state = { n: 20, mal: 8, leftN: 10, leftMal: 7 };

    function H(p) {
      if (p <= 0 || p >= 1) return 0;
      return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
    }

    function compute() {
      var n = state.n;
      var mal = Math.min(state.mal, n);
      var ln = Math.min(state.leftN, n);
      var rn = n - ln;
      /* The malignant samples going left must be at least (mal - rn), because
         the right partition cannot hold more malignant samples than it holds
         samples, and at most min(ln, mal). Without this clamp the sliders can
         be driven into an arrangement that does not correspond to any real
         split, and the bars are drawn with negative widths. */
      var lm = Math.min(state.leftMal, Math.min(ln, mal));
      lm = Math.max(lm, Math.max(0, mal - rn));
      var rm = mal - lm;

      var parent = H(mal / n);
      var hl = ln ? H(lm / ln) : 0;
      var hr = rn ? H(rm / rn) : 0;
      var weighted = (ln / n) * hl + (rn / n) * hr;

      return { n: n, mal: mal, ben: n - mal, parent: parent,
               ln: ln, lm: lm, lb: ln - lm, hl: hl,
               rn: rn, rm: rm, rb: rn - rm, hr: hr,
               weighted: weighted, gain: parent - weighted };
    }

    function draw() {
      var c = compute();
      var wide = stage.clientWidth > 660;

      var f = window.Chart.frame(stage, {
        height: wide ? 300 : 560,
        margin: { top: 26, right: 18, bottom: 46, left: 52 },
        title: 'Entropy against class balance, and the effect of a split'
      });

      var panelW = wide ? (f.w - 46) / 2 : f.w;
      var panelH = wide ? f.h : (f.h - 60) / 2;

      /* ---- Panel 1: the entropy curve ---- */
      var g1 = f.g.append('g');
      var x1 = d3.scaleLinear().domain([0, 1]).range([0, panelW]);
      var y1 = d3.scaleLinear().domain([0, 1.05]).range([panelH, 0]);

      g1.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Entropy of a set against its class balance');

      g1.selectAll('line.grid-line').data(y1.ticks(5)).join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0).attr('x2', panelW)
        .attr('y1', y1).attr('y2', y1);

      var pts = d3.range(0, 1.001, 0.005).map(function (p) {
        return [p, H(p)];
      });
      g1.append('path')
        .attr('fill', 'none').attr('stroke', 'var(--specimen)')
        .attr('stroke-width', 2.2)
        .attr('d', d3.line().x(function (d) { return x1(d[0]); })
                            .y(function (d) { return y1(d[1]); })(pts));

      var p = c.mal / c.n;
      g1.append('line')
        .attr('x1', x1(p)).attr('x2', x1(p))
        .attr('y1', y1(0)).attr('y2', y1(c.parent))
        .attr('stroke', 'var(--cat-2)').attr('stroke-width', 1.4)
        .attr('stroke-dasharray', '3 3');
      g1.append('circle')
        .attr('cx', x1(p)).attr('cy', y1(c.parent)).attr('r', 5.5)
        .attr('fill', 'var(--cat-2)').attr('stroke', '#fff').attr('stroke-width', 1.6);
      g1.append('text')
        .attr('x', x1(p)).attr('y', y1(c.parent) - 12)
        .attr('text-anchor', p > 0.7 ? 'end' : (p < 0.3 ? 'start' : 'middle'))
        .style('font-size', '11px').style('font-weight', '650')
        .attr('fill', 'var(--cat-2)')
        .text('H = ' + c.parent.toFixed(3) + ' bits');

      g1.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x1).ticks(5).tickFormat(d3.format('.0%')));
      g1.append('g').attr('class', 'axis').call(d3.axisLeft(y1).ticks(5));
      g1.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36)
        .attr('text-anchor', 'middle').text('proportion malignant');
      g1.append('text').attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -panelH / 2).attr('y', -38)
        .attr('text-anchor', 'middle').text('entropy (bits)');

      /* ---- Panel 2: the split ---- */
      var g2 = f.g.append('g').attr('transform',
        wide ? 'translate(' + (panelW + 46) + ',0)'
             : 'translate(0,' + (panelH + 60) + ')');

      g2.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('The candidate split, drawn to scale');

      var barW = panelW;
      var boxH = 34;
      var rowY = [10, 82, 82];

      /* Parent bar */
      drawBar(g2, 0, rowY[0], barW, boxH, c.ben, c.mal, c.n,
              'All ' + c.n + ' samples', c.parent);

      /* Children */
      var gap = 16;
      var lw = Math.max(30, (c.ln / c.n) * (barW - gap));
      var rw = Math.max(30, barW - gap - lw);
      drawBar(g2, 0, rowY[1], lw, boxH, c.lb, c.lm, c.ln,
              'yes (' + c.ln + ')', c.hl);
      drawBar(g2, lw + gap, rowY[2], rw, boxH, c.rb, c.rm, c.rn,
              'no (' + c.rn + ')', c.hr);

      /* Connectors */
      g2.append('path')
        .attr('d', 'M' + (barW / 2) + ',' + (rowY[0] + boxH + 4) +
                   'V' + (rowY[1] - 22) +
                   'M' + (lw / 2) + ',' + (rowY[1] - 22) + 'H' + (lw + gap + rw / 2) +
                   'M' + (lw / 2) + ',' + (rowY[1] - 22) + 'V' + (rowY[1] - 4) +
                   'M' + (lw + gap + rw / 2) + ',' + (rowY[1] - 22) + 'V' + (rowY[1] - 4))
        .attr('stroke', 'var(--ink-4)').attr('stroke-width', 1.2).attr('fill', 'none');

      /* The arithmetic, written out */
      var eq = 'Gain = ' + c.parent.toFixed(3) + ' − [ (' + c.ln + '/' + c.n +
               ')(' + c.hl.toFixed(3) + ') + (' + c.rn + '/' + c.n + ')(' +
               c.hr.toFixed(3) + ') ]';
      g2.append('text').attr('x', 0).attr('y', rowY[1] + boxH + 34)
        .style('font-size', '11px').style('font-family', 'var(--mono)')
        .attr('fill', 'var(--ink-2)').text(eq);
      g2.append('text').attr('x', 0).attr('y', rowY[1] + boxH + 52)
        .style('font-size', '12px').style('font-weight', '700')
        .style('font-family', 'var(--mono)')
        .attr('fill', c.gain > 0.15 ? 'var(--ok)' : 'var(--ink-3)')
        .text('     = ' + c.parent.toFixed(3) + ' − ' + c.weighted.toFixed(3) +
              ' = ' + c.gain.toFixed(3) + ' bits');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'benign', colour: 'var(--cat-1)', symbol: 'square' },
        { label: 'malignant', colour: 'var(--cat-2)', symbol: 'square' }
      ]));
    }

    function drawBar(g, x, y, w, h, ben, mal, n, label, ent) {
      w = Math.max(0, w);
      ben = Math.max(0, ben);
      mal = Math.max(0, mal);
      var total = ben + mal || 1;
      var bw = Math.max(0, Math.min(w, (ben / total) * w));
      g.append('rect').attr('x', x).attr('y', y).attr('width', bw).attr('height', h)
        .attr('fill', 'var(--cat-1)').attr('rx', 3);
      g.append('rect').attr('x', x + bw).attr('y', y)
        .attr('width', w - bw).attr('height', h)
        .attr('fill', 'var(--cat-2)').attr('rx', 3);
      g.append('rect').attr('x', x).attr('y', y).attr('width', w).attr('height', h)
        .attr('fill', 'none').attr('stroke', 'var(--ink-4)')
        .attr('stroke-width', 0.8).attr('rx', 3);

      if (bw > 26) {
        g.append('text').attr('x', x + bw / 2).attr('y', y + h / 2 + 4)
          .attr('text-anchor', 'middle').style('font-size', '11px')
          .style('font-weight', '650').attr('fill', '#fff').text(ben);
      }
      if (w - bw > 26) {
        g.append('text').attr('x', x + bw + (w - bw) / 2).attr('y', y + h / 2 + 4)
          .attr('text-anchor', 'middle').style('font-size', '11px')
          .style('font-weight', '650').attr('fill', '#fff').text(mal);
      }
      g.append('text').attr('x', x).attr('y', y - 6)
        .style('font-size', '10.5px').style('font-weight', '600')
        .attr('fill', 'var(--ink-2)').text(label);
      g.append('text').attr('x', x + w).attr('y', y - 6)
        .attr('text-anchor', 'end')
        .style('font-size', '10.5px').style('font-family', 'var(--mono)')
        .attr('fill', ent < 0.3 ? 'var(--ok)' : 'var(--ink-3)')
        .text('H=' + ent.toFixed(3));
    }

    function updateMetrics() {
      var c = compute();
      window.UI.setMetric('en-parent', c.parent.toFixed(3) + ' bits',
        c.ben + ' benign, ' + c.mal + ' malignant');
      window.UI.setMetric('en-after', c.weighted.toFixed(3) + ' bits',
        'weighted average of the two parts');
      window.UI.setMetric('en-gain', c.gain.toFixed(3) + ' bits',
        c.gain > 0.3 ? 'a strong split' : (c.gain > 0.05 ? 'a weak split' : 'almost useless'),
        c.gain > 0.3 ? 'good' : (c.gain < 0.05 ? 'bad' : null));
    }

    function updateExplain() {
      var c = compute();
      var el = host.querySelector('[data-viz-note]');
      var msg;
      if (c.gain < 0.02) {
        msg = 'This split removes almost no uncertainty. Both partitions have ' +
          'roughly the same class balance as the parent, so knowing which side a ' +
          'sample fell on tells you almost nothing about its diagnosis. A tree ' +
          'algorithm would reject this question and try another feature.';
      } else if (c.hl < 0.01 || c.hr < 0.01) {
        msg = 'One of the partitions is pure: every sample in it has the same ' +
          'label, so its entropy is exactly zero and it becomes a leaf. The other ' +
          'side still has work to do. This is how trees terminate.';
      } else {
        msg = 'The split reduces uncertainty from ' + c.parent.toFixed(3) +
          ' bits to ' + c.weighted.toFixed(3) + ' bits, a gain of ' +
          c.gain.toFixed(3) + ' bits. Note that the average is weighted by ' +
          'partition size: a very pure partition containing three samples is ' +
          'worth much less than a moderately pure one containing thirty.';
      }
      msg += ' Try making the parent set perfectly balanced at ' +
        Math.round(c.n / 2) + ' of each. Entropy reaches its maximum of exactly ' +
        '1 bit, which is the formal statement that a coin flip is the least ' +
        'informative situation you can be in.';
      el.innerHTML = '<p class="mb0">' + msg + '</p>';
    }

    function updateAlt() {
      var c = compute();
      var rows = [];
      for (var m = 0; m <= 10; m++) {
        rows.push([String(m) + ' of 10 malignant', H(m / 10).toFixed(4)]);
      }
      altBody.innerHTML =
        '<p>Two panels. The first plots entropy, in bits, against the proportion ' +
        'of malignant samples in a set. The curve is zero at both ends, where the ' +
        'set is pure, and reaches its maximum of 1 bit at a 50/50 balance. The ' +
        'current set of ' + c.n + ' samples (' + c.ben + ' benign, ' + c.mal +
        ' malignant) has entropy ' + c.parent.toFixed(3) + ' bits and is marked ' +
        'on the curve.</p>' +
        '<p>The second panel shows a candidate split of that set into a "yes" ' +
        'partition of ' + c.ln + ' samples (' + c.lb + ' benign, ' + c.lm +
        ' malignant, entropy ' + c.hl.toFixed(3) + ') and a "no" partition of ' +
        c.rn + ' samples (' + c.rb + ' benign, ' + c.rm + ' malignant, entropy ' +
        c.hr.toFixed(3) + '). The size-weighted average entropy after the split ' +
        'is ' + c.weighted.toFixed(3) + ' bits, so the information gain is ' +
        c.parent.toFixed(3) + ' − ' + c.weighted.toFixed(3) + ' = ' +
        c.gain.toFixed(3) + ' bits.</p>' +
        '<h4>Entropy of a ten-sample set at every possible balance</h4>' +
        window.UI.altTable('Entropy in bits for each class balance.',
          ['Composition', 'Entropy (bits)'], rows);
    }

    function refresh() { draw(); updateMetrics(); updateExplain(); updateAlt(); }

    function bindSlider(id, key, extra) {
      var el = host.querySelector('#' + id);
      el.addEventListener('input', function () {
        state[key] = +this.value;
        /* Keep the split consistent with the parent set. */
        state.mal = Math.min(state.mal, state.n);
        state.leftN = Math.min(state.leftN, state.n);
        state.leftMal = Math.min(state.leftMal, Math.min(state.leftN, state.mal));
        syncControls();
        refresh();
      });
    }

    function syncControls() {
      ['n', 'mal', 'leftN', 'leftMal'].forEach(function (k) {
        var id = 'en-' + k.toLowerCase();
        var el = host.querySelector('#' + id);
        var lab = host.querySelector('#' + id + '-val');
        if (el) el.value = state[k];
        if (lab) lab.textContent = state[k];
      });
      var malEl = host.querySelector('#en-mal');
      if (malEl) malEl.max = state.n;
      var lnEl = host.querySelector('#en-leftn');
      if (lnEl) lnEl.max = state.n;
      var lmEl = host.querySelector('#en-leftmal');
      if (lmEl) lmEl.max = Math.min(state.leftN, state.mal);
    }

    bindSlider('en-n', 'n');
    bindSlider('en-mal', 'mal');
    bindSlider('en-leftn', 'leftN');
    bindSlider('en-leftmal', 'leftMal');

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { n: 20, mal: 8, leftN: 10, leftMal: 7 };
      syncControls(); refresh();
    });

    window.Chart.responsive(stage, draw);
    syncControls();
    refresh();
  });
})();
