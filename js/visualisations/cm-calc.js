/* Week 4 - Confusion-matrix calculator.
 *
 * Four counts in, four questions out. The matrix is drawn in the lecture's
 * orientation (rows = what is true, columns = what the test says), and the
 * cells a metric divides by are highlighted, so the denominator is the thing
 * the student looks at. Invalid input and zero denominators are reported in
 * words rather than as NaN.
 */
(function () {
  'use strict';

  window.Chart.register('viz-cm-calc', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var PRESETS = {
      lecture: { tp: 95, fn: 5, fp: 495, tn: 9405,
        note: 'Hypothetical classroom example: 10,000 people, prevalence 1%, ' +
              'sensitivity and specificity 95%.' },
      wdbc: { tp: 60, fn: 4, fp: 1, tn: 106,
        note: 'WDBC logistic regression, final test set at threshold 0.5 (lab ' +
              'Task 1). Real data used for classroom evaluation, not evidence of ' +
              'clinical performance.' },
      zero: { tp: 0, fn: 0, fp: 3, tn: 97,
        note: 'An edge case: nobody in this sample has the condition, so ' +
              'sensitivity cannot be computed.' }
    };
    var METRICS = {
      sens: { label: 'Sensitivity', num: 'tp', den: ['tp', 'fn'],
        q: 'Of the people who really have the condition, how many did the test find?' },
      spec: { label: 'Specificity', num: 'tn', den: ['tn', 'fp'],
        q: 'Of the people who do not have the condition, how many did the test clear?' },
      ppv: { label: 'PPV', num: 'tp', den: ['tp', 'fp'],
        q: 'Of the people the test flagged, how many really have the condition?' },
      npv: { label: 'NPV', num: 'tn', den: ['tn', 'fn'],
        q: 'Of the people the test cleared, how many are really clear?' }
    };
    var state = { preset: 'lecture', focus: 'sens' };
    var KEYS = ['tp', 'fn', 'fp', 'tn'];

    function read() {
      var c = {}, bad = [];
      KEYS.forEach(function (k) {
        var raw = host.querySelector('#cm-' + k).value.trim();
        var v = Number(raw);
        if (raw === '' || !isFinite(v) || v < 0 || Math.floor(v) !== v) bad.push(k.toUpperCase());
        c[k] = v;
      });
      c.bad = bad;
      return c;
    }

    function metric(c, key) {
      var m = METRICS[key];
      var den = m.den.reduce(function (a, k) { return a + c[k]; }, 0);
      return { num: c[m.num], den: den, v: den > 0 ? c[m.num] / den : null };
    }

    function fmtInt(v) { return d3.format(',')(v); }

    function draw(c) {
      var wide = stage.clientWidth > 560;
      var f = window.Chart.frame(stage, {
        height: wide ? 250 : 300,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        title: 'Confusion matrix: rows are what is true, columns are what the test says'
      });
      var hw = wide ? 170 : 104, hh = 40;
      var cw = Math.min(wide ? 190 : 118, (f.w - hw) / 2), ch = (f.h - hh) / 2;
      var active = METRICS[state.focus].den;
      var cells = [
        { k: 'tp', r: 0, c: 0, ab: 'TP', m: 'ill, flagged', fill: '#fdebc8' },
        { k: 'fn', r: 0, c: 1, ab: 'FN', m: 'ill, missed', fill: '#fbdde0' },
        { k: 'fp', r: 1, c: 0, ab: 'FP', m: 'healthy, false alarm', fill: '#dce9f6' },
        { k: 'tn', r: 1, c: 1, ab: 'TN', m: 'healthy, cleared', fill: '#eef2f5' }
      ];
      var g = f.g;
      ['Test positive', 'Test negative'].forEach(function (t, j) {
        g.append('rect').attr('x', hw + j * cw).attr('y', 0).attr('width', cw - 4)
          .attr('height', hh - 4).attr('fill', 'var(--clinical)');
        g.append('text').attr('x', hw + j * cw + cw / 2 - 2).attr('y', hh / 2 + 2)
          .attr('text-anchor', 'middle').attr('fill', '#fff')
          .style('font-size', '12px').style('font-weight', 700).text(t);
      });
      (wide ? ['Has the condition', 'Does not'] : ['Has condition', 'Does not'])
        .forEach(function (t, i) {
        g.append('rect').attr('x', 0).attr('y', hh + i * ch).attr('width', hw - 4)
          .attr('height', ch - 4).attr('fill', 'var(--clinical)');
        g.append('text').attr('x', (hw - 4) / 2).attr('y', hh + i * ch + ch / 2 + 4)
          .attr('text-anchor', 'middle').attr('fill', '#fff')
          .style('font-size', wide ? '12px' : '10.5px').style('font-weight', 700).text(t);
      });
      cells.forEach(function (d) {
        var on = active.indexOf(d.k) >= 0;
        var x = hw + d.c * cw, y = hh + d.r * ch;
        g.append('rect').attr('x', x).attr('y', y).attr('width', cw - 4)
          .attr('height', ch - 4).attr('fill', on ? d.fill : '#f7f9fb')
          .attr('stroke', on ? 'var(--ink)' : 'none').attr('stroke-width', 2.5);
        g.append('text').attr('x', x + cw / 2 - 2).attr('y', y + ch / 2 - 4)
          .attr('text-anchor', 'middle').style('font-size', wide ? '20px' : '16px')
          .style('font-weight', 700).attr('fill', on ? 'var(--ink)' : 'var(--ink-4)')
          .text(d.ab + ' ' + (isFinite(c[d.k]) ? fmtInt(c[d.k]) : '?'));
        g.append('text').attr('x', x + cw / 2 - 2).attr('y', y + ch / 2 + 16)
          .attr('text-anchor', 'middle').style('font-size', '11px')
          .attr('fill', on ? 'var(--ink-3)' : 'var(--ink-4)').text(d.m);
      });
    }

    function refresh() {
      var c = read();
      var U = window.UI;
      draw(c);
      var note = host.querySelector('[data-viz-note]');
      if (c.bad.length) {
        ['cm-sens', 'cm-spec', 'cm-ppv', 'cm-npv'].forEach(function (id) {
          U.setMetric(id, '—', 'enter whole numbers ≥ 0');
        });
        note.innerHTML = '<p class="mb0" role="alert"><strong>Check the counts.</strong> ' +
          'Each cell must be a whole number of people, 0 or more (' +
          c.bad.join(', ') + ' ' + (c.bad.length > 1 ? 'are' : 'is') +
          ' not).</p>';
        altBody.innerHTML = '<p>The counts entered are not valid, so no metric is shown.</p>';
        return;
      }
      var parts = [];
      Object.keys(METRICS).forEach(function (k) {
        var r = metric(c, k), m = METRICS[k];
        var shown = r.v == null ? 'undefined' : (r.v * 100).toFixed(1) + '%';
        U.setMetric('cm-' + k, shown, fmtInt(r.num) + ' / ' + fmtInt(r.den) +
          (r.v == null ? ' (no one in the denominator)' : ''));
        parts.push([m.label, m.num.toUpperCase() + ' / (' +
          m.den.map(function (x) { return x.toUpperCase(); }).join(' + ') + ')',
          fmtInt(r.num) + ' / ' + fmtInt(r.den), shown]);
      });
      var fm = METRICS[state.focus], fr = metric(c, state.focus);
      var n = c.tp + c.fn + c.fp + c.tn;
      note.innerHTML = '<p><strong>' + fm.label + ':</strong> ' + fm.q + ' The ' +
        'highlighted cells are its denominator: ' +
        fm.den.map(function (x) { return x.toUpperCase(); }).join(' + ') + ' = ' +
        fmtInt(fr.den) + (fr.v == null ? '. With nobody in that group the metric ' +
        'is undefined, not zero.' : ', and ' + fm.num.toUpperCase() + ' = ' +
        fmtInt(fr.num) + ' of them, so ' + (fr.v * 100).toFixed(1) + '%.') + '</p>' +
        '<p class="mb0">' + (PRESETS[state.preset] ? U.esc(PRESETS[state.preset].note) + ' '
        : '') + 'Prevalence in these counts: ' + (n ? ((c.tp + c.fn) / n * 100)
        .toFixed(1) + '%' : 'undefined') + '. Sensitivity and specificity divide within a ' +
        'row (what is true); PPV and NPV divide within a column (what the test ' +
        'says).</p>';
      altBody.innerHTML = '<p>A 2 by 2 confusion matrix. Rows are what is true (has ' +
        'the condition, does not); columns are what the test says (positive, ' +
        'negative). TP ' + fmtInt(c.tp) + ', FN ' + fmtInt(c.fn) + ', FP ' +
        fmtInt(c.fp) + ', TN ' + fmtInt(c.tn) + '.</p>' +
        U.altTable('The four metrics and their denominators.',
          ['Metric', 'Formula', 'Counts', 'Value'], parts);
    }

    function setPreset(key) {
      var p = PRESETS[key];
      if (!p) return;
      state.preset = key;
      KEYS.forEach(function (k) { host.querySelector('#cm-' + k).value = p[k]; });
      refresh();
    }

    KEYS.forEach(function (k) {
      host.querySelector('#cm-' + k).addEventListener('input', function () {
        state.preset = 'custom'; host.querySelector('#cm-preset').value = 'custom';
        refresh();
      });
    });
    host.querySelector('#cm-preset').addEventListener('change', function () {
      if (this.value !== 'custom') setPreset(this.value);
    });
    window.UI.onSegment(host.querySelector('#cm-focus'), function (v) {
      state.focus = v; refresh();
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      host.querySelector('#cm-preset').value = 'lecture';
      state.focus = 'sens';
      host.querySelectorAll('#cm-focus button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === 'sens'));
      });
      setPreset('lecture');
    });
    window.Chart.responsive(stage, function () { draw(read()); });
    setPreset('lecture');
  });
})();
