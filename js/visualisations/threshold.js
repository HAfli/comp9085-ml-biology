/* Week 4 - Decision threshold explorer.
 *
 * A classifier outputs a score; someone still has to decide where "positive"
 * begins. This figure puts 200 illustrative patients on a score axis, lets the
 * student drag that boundary, and shows the two error counts trading against
 * each other. The data are a fixed, seeded simulation from
 * data/scripts/08_build_week04_data.py, so the numbers on the lecture slide
 * and the numbers here are the same numbers.
 */
(function () {
  'use strict';

  window.Chart.register('viz-threshold', function (host) {
    var D = window.WEEK04 && window.WEEK04.thresholdData;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    if (!D) {
      stage.innerHTML = '<div class="noscript-note">The Week 4 data file did ' +
        'not load.</div>';
      return;
    }

    var DEFAULT = 0.5;
    var state = { t: DEFAULT };

    var pts = D.scores.map(function (s, i) {
      return { s: s, y: D.labels[i], i: i };
    });
    var nIll = pts.filter(function (p) { return p.y === 1; }).length;
    var nWell = pts.length - nIll;

    var COL = { tp: 'var(--cat-2)', fn: 'var(--danger)',
                fp: 'var(--cat-1)', tn: 'var(--ink-4)' };
    var NAME = { tp: 'True positive', fn: 'False negative (missed case)',
                 fp: 'False positive (false alarm)', tn: 'True negative' };

    function outcome(p, t) {
      var pos = p.s >= t;
      if (p.y === 1) return pos ? 'tp' : 'fn';
      return pos ? 'fp' : 'tn';
    }

    function counts(t) {
      var c = { tp: 0, fp: 0, fn: 0, tn: 0 };
      pts.forEach(function (p) { c[outcome(p, t)]++; });
      c.sens = c.tp / (c.tp + c.fn);
      c.spec = c.tn / (c.tn + c.fp);
      c.ppv = (c.tp + c.fp) ? c.tp / (c.tp + c.fp) : null;
      c.npv = (c.tn + c.fn) ? c.tn / (c.tn + c.fn) : null;
      return c;
    }

    /* Stack points with equal rounded scores so none hide behind another. */
    function stacked(group) {
      var seen = {};
      return pts.filter(function (p) { return p.y === group; })
        .sort(function (a, b) { return a.s - b.s; })
        .map(function (p) {
          var k = p.s.toFixed(2);
          seen[k] = (seen[k] || 0) + 1;
          return { p: p, k: seen[k] - 1 };
        });
    }
    var illStack = stacked(1), wellStack = stacked(0);

    function draw() {
      var c = counts(state.t);
      var wide = stage.clientWidth > 720;
      var f = window.Chart.frame(stage, {
        height: wide ? 330 : 620,
        margin: { top: 28, right: 18, bottom: 46, left: 58 },
        title: 'Model scores for 200 illustrative patients, and sensitivity ' +
               'and specificity as the threshold moves'
      });
      var gap = wide ? 56 : 74;
      var pw = wide ? (f.w - gap) * 0.56 : f.w;
      var ph = wide ? f.h : (f.h - gap) / 2;
      var pw2 = wide ? f.w - gap - pw : f.w;

      /* ---- Panel 1: the two groups on the score axis ---- */
      var g1 = f.g.append('g');
      var roomy = pw > 420;
      g1.append('text').attr('class', 'chart-title').attr('y', -12)
        .text(roomy ? 'Model score, by true status'
                    : 'Model score (shaded = predicted positive)');
      var x = d3.scaleLinear().domain([0, 1]).range([0, pw]);
      var rowH = ph / 2;
      var r = Math.max(2.4, Math.min(4, pw / 170));
      var step = r * 1.9;

      [['Has the condition (' + nIll + ')', illStack, 0],
       ['Does not (' + nWell + ')', wellStack, 1]].forEach(function (row) {
        var base = row[2] * rowH + rowH - 8;
        g1.append('line').attr('x1', 0).attr('x2', pw)
          .attr('y1', base + r + 2).attr('y2', base + r + 2)
          .attr('stroke', 'var(--rule)');
        g1.append('text').attr('x', 0).attr('y', row[2] * rowH + 12)
          .style('font-size', '11px').attr('fill', 'var(--ink-2)')
          .style('font-weight', 600).text(row[0]);
        var sel = g1.selectAll(null).data(row[1]).join('circle')
          .attr('cx', function (d) { return x(d.p.s); })
          .attr('cy', function (d) {
            return Math.max(row[2] * rowH + 20, base - d.k * step);
          })
          .attr('r', r)
          .attr('fill', function (d) { return COL[outcome(d.p, state.t)]; })
          .attr('stroke', '#fff').attr('stroke-width', 0.6)
          .attr('tabindex', -1);
        window.Chart.tips(sel, function (d) {
          return '<strong>' + NAME[outcome(d.p, state.t)] + '</strong><br>' +
            'score ' + d.p.s.toFixed(2);
        });
      });

      g1.append('rect').attr('x', x(state.t)).attr('y', 0)
        .attr('width', Math.max(0, pw - x(state.t))).attr('height', ph)
        .attr('fill', 'var(--nucleus-soft)').attr('opacity', 0.45)
        .lower();
      g1.append('line').attr('x1', x(state.t)).attr('x2', x(state.t))
        .attr('y1', -4).attr('y2', ph)
        .attr('stroke', 'var(--ink)').attr('stroke-width', 2);
      if (roomy) g1.append('text').attr('x', pw).attr('y', -12)
        .attr('text-anchor', 'end')
        .style('font-size', '10.5px').attr('fill', 'var(--ink-3)')
        .text('shaded = predicted positive');
      g1.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + ph + ')')
        .call(d3.axisBottom(x).ticks(5));
      g1.append('text').attr('class', 'axis-label')
        .attr('x', pw / 2).attr('y', ph + 36).attr('text-anchor', 'middle')
        .text('model score, P(condition | measurements)');

      /* ---- Panel 2: sensitivity and specificity against threshold ---- */
      var g2 = f.g.append('g').attr('transform', wide
        ? 'translate(' + (pw + gap) + ',0)' : 'translate(0,' + (ph + gap) + ')');
      g2.append('text').attr('class', 'chart-title').attr('y', -12)
        .text('Sensitivity and specificity vs threshold');
      var x2 = d3.scaleLinear().domain([0, 1]).range([0, pw2]);
      var y2 = d3.scaleLinear().domain([0, 1]).range([ph, 0]);
      g2.selectAll('line.grid-line').data(y2.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', pw2)
        .attr('y1', y2).attr('y2', y2);
      var curve = d3.range(0.02, 0.99, 0.01).map(function (t) {
        var k = counts(t); return { t: t, sens: k.sens, spec: k.spec };
      });
      [['sens', 'var(--cat-2)', null], ['spec', 'var(--cat-1)', '5 3']]
        .forEach(function (s) {
          g2.append('path').attr('fill', 'none').attr('stroke', s[1])
            .attr('stroke-width', 2.2).attr('stroke-dasharray', s[2])
            .attr('d', d3.line().curve(d3.curveStepAfter)
              .x(function (d) { return x2(d.t); })
              .y(function (d) { return y2(d[s[0]]); })(curve));
        });
      g2.append('line').attr('x1', x2(state.t)).attr('x2', x2(state.t))
        .attr('y1', 0).attr('y2', ph).attr('stroke', 'var(--ink)')
        .attr('stroke-width', 1.4).attr('stroke-dasharray', '3 3');
      [['sens', 'var(--cat-2)'], ['spec', 'var(--cat-1)']].forEach(function (s) {
        g2.append('circle').attr('cx', x2(state.t)).attr('cy', y2(c[s[0]]))
          .attr('r', 5).attr('fill', s[1]).attr('stroke', '#fff')
          .attr('stroke-width', 1.5);
      });
      g2.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + ph + ')')
        .call(d3.axisBottom(x2).ticks(5));
      g2.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y2).ticks(5).tickFormat(d3.format('.0%')));
      g2.append('text').attr('class', 'axis-label')
        .attr('x', pw2 / 2).attr('y', ph + 36).attr('text-anchor', 'middle')
        .text('decision threshold');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'True positive', colour: COL.tp, symbol: 'circle' },
        { label: 'False negative (missed)', colour: COL.fn, symbol: 'circle' },
        { label: 'False positive (false alarm)', colour: COL.fp, symbol: 'circle' },
        { label: 'True negative', colour: COL.tn, symbol: 'circle' },
        { label: 'Sensitivity', colour: 'var(--cat-2)', symbol: 'line' },
        { label: 'Specificity', colour: 'var(--cat-1)', symbol: 'line' }
      ]));
    }

    function pct(v) { return v == null ? 'n/a' : (v * 100).toFixed(0) + '%'; }

    function updateMetrics() {
      var c = counts(state.t);
      var U = window.UI;
      U.setMetric('th-tp', String(c.tp), 'ill, flagged');
      U.setMetric('th-fp', String(c.fp), 'false alarms', c.fp > 40 ? 'bad' : null);
      U.setMetric('th-tn', String(c.tn), 'healthy, cleared');
      U.setMetric('th-fn', String(c.fn), 'missed cases', c.fn > 10 ? 'bad' : null);
      U.setMetric('th-sens', pct(c.sens), c.tp + ' of ' + nIll + ' cases found');
      U.setMetric('th-spec', pct(c.spec), c.tn + ' of ' + nWell + ' cleared');
      U.setMetric('th-ppv', pct(c.ppv), 'of positives truly have it');
      U.setMetric('th-npv', pct(c.npv), 'of negatives truly clear');
    }

    function updateExplain() {
      var c = counts(state.t);
      var msg;
      var pos = c.tp + c.fp;
      if (state.t <= 0.3) {
        msg = '<strong>A low threshold calls many cases positive (' + pos + ' of ' +
          (nIll + nWell) + ').</strong> Almost every case is caught (' + c.fn +
          ' missed), but ' + c.fp + ' healthy people are flagged. A setting where a ' +
          'missed case is very costly and a positive leads to a cheap, safe ' +
          'follow-up test might accept that; another setting might not.';
      } else if (state.t >= 0.7) {
        msg = '<strong>A high threshold calls few cases positive (' + pos + ' of ' +
          (nIll + nWell) + ').</strong> False alarms are rare (' + c.fp + '), but ' +
          c.fn + ' of the ' + nIll + ' real cases are now missed. A setting where ' +
          'acting on a positive is invasive or expensive might accept that; ' +
          'another setting might not.';
      } else {
        msg = 'At ' + state.t.toFixed(2) + ', ' + pos + ' cases are called positive: ' +
          'the model misses ' + c.fn + ' cases and raises ' + c.fp + ' false ' +
          'alarms. Neither number is "the error rate".';
      }
      msg += ' Lowering the threshold generally increases the number of positive ' +
        'predictions; raising it generally decreases them. For a fixed model, one ' +
        'error can only be reduced by accepting more of the other. No threshold is ' +
        'best in general: choosing one is a judgement about consequences, and it ' +
        'should be made on development data, never on the final test set.';
      host.querySelector('[data-viz-note]').innerHTML =
        '<p class="mb0">' + msg + '</p>';
    }

    function updateAlt() {
      var rows = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map(function (t) {
        var k = counts(t);
        return [t.toFixed(1), String(k.tp), String(k.fp), String(k.fn),
                String(k.tn), pct(k.sens), pct(k.spec), pct(k.ppv), pct(k.npv)];
      });
      var c = counts(state.t);
      altBody.innerHTML =
        '<p>Two panels. The first places each of ' + pts.length +
        ' illustrative patients on a horizontal axis of model score, in two ' +
        'rows by true status, with a vertical line at the current threshold ' +
        'of ' + state.t.toFixed(2) + '. Everyone to the right of the line is ' +
        'predicted positive. The second panel plots sensitivity and ' +
        'specificity against the threshold.</p>' +
        '<p>At the current threshold: ' + c.tp + ' true positives, ' + c.fp +
        ' false positives, ' + c.fn + ' false negatives and ' + c.tn +
        ' true negatives.</p>' +
        window.UI.altTable('Outcomes at nine thresholds.',
          ['Threshold', 'TP', 'FP', 'FN', 'TN', 'Sensitivity', 'Specificity', 'PPV', 'NPV'],
          rows);
    }

    function refresh() { draw(); updateMetrics(); updateExplain(); updateAlt(); }

    var slider = host.querySelector('#th-t');
    slider.addEventListener('input', function () {
      state.t = +this.value;
      host.querySelector('#th-t-val').textContent = state.t.toFixed(2);
      refresh();
    });
    host.querySelector('#th-preset').addEventListener('change', function () {
      if (!this.value) return;
      state.t = +this.value;
      slider.value = state.t;
      host.querySelector('#th-t-val').textContent = state.t.toFixed(2);
      refresh();
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.t = DEFAULT;
      slider.value = DEFAULT;
      host.querySelector('#th-preset').value = '0.5';
      host.querySelector('#th-t-val').textContent = DEFAULT.toFixed(2);
      refresh();
    });

    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
