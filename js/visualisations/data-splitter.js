/* Week 3 - Biological data splitter.
 *
 * Lecture slides 15-17: the unit of splitting. WDBC has one row per patient,
 * so it cannot show this problem; the explorer therefore uses a clearly
 * labelled illustrative simulation, generated in the browser with a fixed
 * seed: 60 simulated patients (24 with the condition), 2-4 samples each.
 * Samples from the same patient share a strong patient-specific offset, so a
 * 1-nearest-neighbour classifier can "recognise the patient" when a sibling
 * sample sits in the training set. Splitting by row lets it do that; splitting
 * by patient (group-aware, as GroupShuffleSplit does) does not.
 *
 * The simulation is built the same way as the slide's (60 patients, 2-4
 * samples, seeds 42-61) but is not the same draw, so its averages differ a
 * little from the slide's 95.9% and 68.5%. The direction is the lesson.
 */
(function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    var u = 0;
    while (u === 0) u = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
  }
  function shuffle(a, r) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* The cohort is fixed (seed 2026); only the split changes. */
  var P = { dims: 6, informative: 2, signal: 0.5, patient: 1.0, noise: 0.25 };
  function cohort() {
    var r = mulberry32(2026), patients = [], samples = [];
    for (var p = 0; p < 60; p++) {
      var y = p < 24 ? 1 : 0, n = 2 + Math.floor(r() * 3), off = [];
      for (var d = 0; d < P.dims; d++) {
        off.push(gauss(r) * P.patient + (d < P.informative ? (y ? P.signal : -P.signal) : 0));
      }
      patients.push({ id: p, y: y, n: n, samples: [] });
      for (var s = 0; s < n; s++) {
        patients[p].samples.push(samples.length);
        samples.push({ p: p, y: y, x: off.map(function (o) { return o + gauss(r) * P.noise; }) });
      }
    }
    return { patients: patients, samples: samples };
  }

  function split(C, o) {
    var r = mulberry32(o.seed), isTest = C.samples.map(function () { return false; });
    if (o.unit === 'patient') {
      var groups = o.strat ? [C.patients.filter(function (p) { return p.y; }),
                              C.patients.filter(function (p) { return !p.y; })]
                           : [C.patients];
      var testP = {};
      groups.forEach(function (g) {
        shuffle(g, r).slice(0, Math.round(g.length * o.test))
          .forEach(function (p) { testP[p.id] = true; });
      });
      C.samples.forEach(function (s, i) { isTest[i] = !!testP[s.p]; });
    } else {
      var idx = C.samples.map(function (s, i) { return i; });
      var g2 = o.strat ? [idx.filter(function (i) { return C.samples[i].y; }),
                          idx.filter(function (i) { return !C.samples[i].y; })]
                       : [idx];
      g2.forEach(function (g) {
        shuffle(g, r).slice(0, Math.round(g.length * o.test))
          .forEach(function (i) { isTest[i] = true; });
      });
    }
    return isTest;
  }

  function accuracy(C, isTest) {
    var tr = [], te = [];
    C.samples.forEach(function (s, i) { (isTest[i] ? te : tr).push(s); });
    if (!te.length || !tr.length) return NaN;
    var ok = 0;
    te.forEach(function (t) {
      var best = Infinity, lab = 0;
      tr.forEach(function (u) {
        var d = 0;
        for (var k = 0; k < t.x.length; k++) { var q = t.x[k] - u.x[k]; d += q * q; }
        if (d < best) { best = d; lab = u.y; }
      });
      if (lab === t.y) ok++;
    });
    return ok / te.length;
  }

  window.Chart.register('viz-data-splitter', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var U = window.UI;
    var C = cohort();
    var DEFAULT = { test: 30, seed: 42, strat: true, unit: 'row' };
    var state = Object.assign({}, DEFAULT);
    var avgCache = {};

    function opts(unit, seed) {
      return { test: state.test / 100, seed: seed, strat: state.strat, unit: unit };
    }
    function average(unit) {
      var key = unit + '|' + state.test + '|' + state.strat;
      if (avgCache[key] == null) {
        var s = 0;
        for (var seed = 42; seed < 62; seed++) s += accuracy(C, split(C, opts(unit, seed)));
        avgCache[key] = s / 20;
      }
      return avgCache[key];
    }

    function summary(isTest) {
      var both = 0, leakSamples = 0, nTest = 0, testY = 0, trainY = 0, nTrain = 0;
      C.patients.forEach(function (p) {
        var t = p.samples.filter(function (i) { return isTest[i]; }).length;
        if (t > 0 && t < p.n) { both++; leakSamples += t; }
      });
      C.samples.forEach(function (s, i) {
        if (isTest[i]) { nTest++; testY += s.y; } else { nTrain++; trainY += s.y; }
      });
      return { both: both, leak: leakSamples, nTest: nTest, nTrain: nTrain,
               testShare: testY / nTest, trainShare: trainY / nTrain };
    }

    function draw() {
      var isTest = split(C, opts(state.unit, state.seed));
      var wide = stage.clientWidth > 620;
      var cols = wide ? 12 : 6, rows = Math.ceil(60 / cols);
      var cellH = 46;
      var f = window.Chart.frame(stage, {
        height: rows * cellH + 40, margin: { top: 30, right: 8, bottom: 10, left: 8 }
      });
      f.svg.attr('aria-label', 'Sixty simulated patients; each square is one sample, ' +
        'coloured by whether it went to the training or the test set.');
      f.g.append('text').attr('class', 'chart-title').attr('y', -12)
        .text(wide ? '60 simulated patients, each with 2 to 4 samples: where did each sample go?'
                   : 'Where did each patient\'s samples go?');
      var cw = f.w / cols;
      C.patients.forEach(function (p, k) {
        var gx = (k % cols) * cw, gy = Math.floor(k / cols) * cellH;
        var t = p.samples.filter(function (i) { return isTest[i]; }).length;
        var mixed = t > 0 && t < p.n;
        var g = f.g.append('g').attr('transform', 'translate(' + gx + ',' + gy + ')')
          .attr('tabindex', 0).datum(p);
        g.append('rect').attr('x', 2).attr('y', 2).attr('width', cw - 4).attr('height', cellH - 6)
          .attr('rx', 5).attr('fill', mixed ? 'var(--danger-soft)' : 'var(--ground-2)')
          .attr('stroke', mixed ? 'var(--danger)' : 'var(--rule)')
          .attr('stroke-width', mixed ? 2 : 1);
        g.append('text').attr('x', 7).attr('y', 15).style('font-size', '10px')
          .attr('fill', 'var(--ink-3)').text('P' + p.id + (p.y ? ' ●' : ' ○'));
        var sz = Math.min(11, (cw - 14) / 4 - 2);
        p.samples.forEach(function (si, j) {
          g.append('rect').attr('x', 7 + j * (sz + 3)).attr('y', 21).attr('width', sz)
            .attr('height', sz).attr('rx', 2)
            .attr('fill', isTest[si] ? 'var(--cat-2)' : 'var(--cat-1)');
        });
      });
      window.Chart.tips(f.g.selectAll('g[tabindex]'), function (p) {
        var t = p.samples.filter(function (i) { return isTest[i]; }).length;
        return '<strong>Patient ' + p.id + '</strong> (' + (p.y ? 'has the condition' :
          'healthy') + ')<br>' + (p.n - t) + ' sample(s) in training, ' + t + ' in test' +
          (t > 0 && t < p.n ? '<br><strong>Split across both sides</strong>' : '');
      });
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Sample in the training set', colour: 'var(--cat-1)', symbol: 'square' },
        { label: 'Sample in the test set', colour: 'var(--cat-2)', symbol: 'square' },
        { label: 'Red outline: this patient is on both sides of the split',
          colour: 'var(--danger)', symbol: 'line' }
      ]) + '<p class="small muted mb0">● has the condition &nbsp; ○ healthy. ' +
        'Hover or tab to a patient for details.</p>');
      return isTest;
    }

    function update(isTest) {
      var s = summary(isTest);
      var acc = accuracy(C, isTest);
      var other = state.unit === 'row' ? 'patient' : 'row';
      var aNow = average(state.unit), aOther = average(other);
      U.setMetric('ds-shared', s.both + ' of 60', 'patients with samples in both sets',
        s.both ? 'bad' : 'good');
      U.setMetric('ds-leak', s.leak + ' of ' + s.nTest,
        'test samples whose patient is also in training', s.leak ? 'bad' : 'good');
      U.setMetric('ds-acc', window.Chart.pct(acc), '1-nearest-neighbour, this split');
      U.setMetric('ds-avg', window.Chart.pct(aNow),
        'mean over seeds 42-61; the other unit gives ' + window.Chart.pct(aOther));
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' +
        (state.unit === 'row'
          ? '<strong>Splitting by sample (row).</strong> ' + s.both + ' patients have ' +
            'samples on both sides, so ' + s.leak + ' of the ' + s.nTest + ' test samples ' +
            'have a sibling sample in training. The nearest neighbour of a test sample is ' +
            'usually its own patient, so the classifier recognises the patient rather than ' +
            'the condition. Averaged over 20 seeds it scores ' + window.Chart.pct(aNow) +
            '; split by patient, the same model scores ' + window.Chart.pct(aOther) + '.'
          : '<strong>Splitting by patient (group-aware).</strong> Every patient is entirely ' +
            'in training or entirely in test, so no test sample has a sibling to copy. ' +
            'Averaged over 20 seeds the classifier scores ' + window.Chart.pct(aNow) +
            ', against ' + window.Chart.pct(aOther) + ' when the split is by row. The lower ' +
            'number is the honest one: it is what to expect on a new patient.') +
        ' Test set: ' + s.nTest + ' samples, ' + window.Chart.pct(s.testShare) +
        ' with the condition (training ' + window.Chart.pct(s.trainShare) + ').</p>';
      altBody.innerHTML = '<p>Illustrative simulation, not a biological dataset. ' +
        'Split by ' + (state.unit === 'row' ? 'sample (row)' : 'patient') + ', ' +
        state.test + '% test, seed ' + state.seed + ', ' +
        (state.strat ? 'stratified' : 'not stratified') + '.</p>' +
        U.altTable('Where each patient\'s samples went.',
          ['Patient', 'Condition', 'Samples', 'In training', 'In test', 'Both sides?'],
          C.patients.map(function (p) {
            var t = p.samples.filter(function (i) { return isTest[i]; }).length;
            return ['P' + p.id, p.y ? 'yes' : 'no', String(p.n), String(p.n - t), String(t),
                    t > 0 && t < p.n ? 'yes' : 'no'];
          }));
    }

    function refresh() { update(draw()); }

    host.querySelector('#ds-test').addEventListener('input', function () {
      state.test = +this.value;
      host.querySelector('#ds-test-val').textContent = state.test + '%';
      refresh();
    });
    host.querySelector('#ds-seed').addEventListener('input', function () {
      state.seed = +this.value;
      host.querySelector('#ds-seed-val').textContent = String(state.seed);
      refresh();
    });
    host.querySelector('#ds-strat').addEventListener('change', function () {
      state.strat = this.checked; refresh();
    });
    U.onSegment(host.querySelector('#ds-unit'), function (v) { state.unit = v; refresh(); });

    function sync() {
      host.querySelector('#ds-test').value = state.test;
      host.querySelector('#ds-test-val').textContent = state.test + '%';
      host.querySelector('#ds-seed').value = state.seed;
      host.querySelector('#ds-seed-val').textContent = String(state.seed);
      host.querySelector('#ds-strat').checked = state.strat;
      host.querySelectorAll('#ds-unit button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === state.unit));
      });
    }
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); sync(); refresh();
    });
    window.Chart.responsive(stage, refresh);
    sync();
    refresh();
  });
})();
