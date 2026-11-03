/* Week 4 - Prevalence explorer.
 *
 * One test, several populations, side by side. Each bar is everyone who
 * tested positive in 100,000 people, split into those who are ill (true
 * positives) and those who are not (false positives). Every bar has the same
 * width, so the ill share of a bar IS the positive predictive value: the
 * population effect is visible without reading a number.
 *
 * The default (99% / 99%) reproduces the lecture's second puzzle and the
 * asserted table in data/scripts/08_build_week04_data.py. Hypothetical
 * classroom numbers throughout; the 37.3% row borrows WDBC's malignant
 * fraction as a prevalence only.
 */
(function () {
  'use strict';

  window.Chart.register('viz-prevalence', function (host) {
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var N = 100000;
    var FIXED = [
      { p: 0.001, label: '0.1%  screening' },
      { p: 0.01, label: '1%' },
      { p: 0.10, label: '10%  clinic' },
      { p: 0.373, label: '37.3%  (WDBC)' }
    ];
    var DEFAULT = { sens: 99, spec: 99, custom: 5 };
    var state = Object.assign({}, DEFAULT);

    function fmt(v) {
      return Math.abs(v - Math.round(v)) < 1e-9 ? d3.format(',')(Math.round(v))
                                                : d3.format(',.1f')(v);
    }

    function row(p, label) {
      var se = state.sens / 100, sp = state.spec / 100;
      var ill = N * p, tp = ill * se, fp = (N - ill) * (1 - sp);
      var fn = ill - tp, tn = (N - ill) - fp;
      return { p: p, label: label, ill: ill, tp: tp, fp: fp, pos: tp + fp,
               ppv: tp / (tp + fp), npv: tn / (tn + fn) };
    }

    function rows() {
      return FIXED.map(function (r) { return row(r.p, r.label); })
        .concat([row(state.custom / 100, state.custom.toFixed(2).replace(/\.?0+$/, '') +
                     '%  your choice')]);
    }

    function draw() {
      var R = rows();
      var wide = stage.clientWidth > 640;
      var f = window.Chart.frame(stage, {
        height: wide ? 330 : 540,
        margin: { top: 30, right: wide ? 230 : 12, bottom: wide ? 34 : 56, left: wide ? 205 : 12 },
        title: 'Who is behind a positive result, in five populations'
      });
      f.g.append('text').attr('class', 'chart-title').attr('y', -14)
        .text('Everyone who tested positive, per 100,000 tested');
      var band = d3.scaleBand().domain(d3.range(R.length)).range([0, f.h])
        .paddingInner(wide ? 0.35 : 0.9).paddingOuter(0.1);
      var x = d3.scaleLinear().domain([0, 1]).range([0, f.w]);
      R.forEach(function (r, i) {
        var y = band(i), h = band.bandwidth();
        var g = f.g.append('g').attr('transform', 'translate(0,' + y + ')');
        g.append('text')
          .attr('x', wide ? -12 : 0).attr('y', wide ? h / 2 + 4 : -5)
          .attr('text-anchor', wide ? 'end' : 'start')
          .style('font-size', '12px').style('font-weight', 600)
          .attr('fill', i === 4 ? 'var(--nucleus)' : 'var(--ink-2)')
          .text('Prevalence ' + r.label);
        var bars = g.selectAll('rect').data([
          { x0: 0, x1: r.ppv, fill: 'var(--cat-2)', lab: 'ill (true positive)', v: r.tp },
          { x0: r.ppv, x1: 1, fill: 'var(--cat-1)', lab: 'healthy (false positive)', v: r.fp }
        ]).join('rect')
          .attr('x', function (d) { return x(d.x0); })
          .attr('width', function (d) { return Math.max(0, x(d.x1) - x(d.x0)); })
          .attr('height', h).attr('fill', function (d) { return d.fill; })
          .attr('stroke', '#fff').attr('tabindex', 0);
        window.Chart.tips(bars, function (d) {
          return '<strong>' + fmt(d.v) + ' ' + d.lab + '</strong><br>of ' +
            fmt(r.pos) + ' positives at prevalence ' + (r.p * 100).toFixed(2) + '%';
        });
        var txt = fmt(r.tp) + ' ill + ' + fmt(r.fp) + ' healthy = ' + fmt(r.pos) +
                  ' positive  →  PPV ' + (r.ppv * 100).toFixed(1) + '%';
        g.append('text')
          .attr('x', wide ? f.w + 10 : f.w).attr('y', wide ? h / 2 + 4 : h + 14)
          .attr('text-anchor', wide ? 'start' : 'end')
          .style('font-size', wide ? '11.5px' : '11px').attr('fill', 'var(--ink)')
          .text(wide ? 'PPV ' + (r.ppv * 100).toFixed(1) + '%  (' + fmt(r.pos) + ' positive)'
                     : txt);
      });
      if (wide) f.g.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('.0%')));
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Positive and ill (true positive): its share of the bar is the PPV',
          colour: 'var(--cat-2)', symbol: 'square' },
        { label: 'Positive but healthy (false positive)', colour: 'var(--cat-1)',
          symbol: 'square' }
      ]));
    }

    function update() {
      var R = rows();
      var U = window.UI;
      ['pv-a', 'pv-b', 'pv-c', 'pv-d'].forEach(function (id, i) {
        var r = R[i];
        U.setMetric(id, (r.ppv * 100).toFixed(1) + '%',
          'NPV ' + (r.npv * 100).toFixed(2) + '% \u00b7 ' +
          (r.tp > 0 ? (r.fp / r.tp).toFixed(1) : 'n/a') + ' false alarms per true positive',
          r.ppv < 0.3 ? 'bad' : (r.ppv > 0.9 ? 'good' : null));
      });
      var lo = R[0], hi = R[3];
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' +
        '<strong>The same test can mean something very different in different ' +
        'populations.</strong> The test did not change; the population did. With ' +
        state.sens.toFixed(1) + '% sensitivity and ' + state.spec.toFixed(1) +
        '% specificity, a positive result means a ' + (lo.ppv * 100).toFixed(1) +
        '% chance of disease when 1 in 1,000 people are ill, and ' +
        (hi.ppv * 100).toFixed(1) + '% when 37.3% are. At low prevalence even a ' +
        'small false-positive rate, applied to a very large healthy group, ' +
        'produces more false alarms than there are ill people to find (' +
        (lo.tp > 0 ? (lo.fp / lo.tp).toFixed(1) : 'n/a') + ' per true positive at 0.1%, ' +
        (hi.tp > 0 ? (hi.fp / hi.tp).toFixed(2) : 'n/a') + ' at 37.3%). This is not a ' +
        'defect of the model: it is what the same test characteristics mean in each ' +
        'population. NPV stays ' +
        'above ' + (Math.min.apply(null, R.map(function (r) { return r.npv; })) * 100)
          .toFixed(1) + '% in every row shown.</p>';
      altBody.innerHTML = '<p>Five horizontal bars, one per population, each ' +
        'representing everyone who tested positive out of 100,000 people. The ' +
        'amber part is people who are ill; the blue part is people who are not. ' +
        'Sensitivity ' + state.sens.toFixed(1) + '%, specificity ' +
        state.spec.toFixed(1) + '%.</p>' +
        window.UI.altTable('Positives per 100,000 tested, by prevalence.',
          ['Prevalence', 'Ill', 'True positives', 'False positives',
           'Tested positive', 'PPV', 'NPV'],
          R.map(function (r) {
            return [(r.p * 100).toFixed(2) + '%', fmt(r.ill), fmt(r.tp), fmt(r.fp),
                    fmt(r.pos), (r.ppv * 100).toFixed(1) + '%',
                    (r.npv * 100).toFixed(2) + '%'];
          }));
    }

    function refresh() { draw(); update(); }

    [['sens', 1], ['spec', 1], ['custom', 2]].forEach(function (k) {
      host.querySelector('#pv-' + k[0]).addEventListener('input', function () {
        state[k[0]] = +this.value;
        host.querySelector('#pv-' + k[0] + '-val').textContent =
          state[k[0]].toFixed(k[1]) + '%';
        refresh();
      });
    });
    function sync() {
      ['sens', 'spec', 'custom'].forEach(function (k) {
        host.querySelector('#pv-' + k).value = state[k];
        host.querySelector('#pv-' + k + '-val').textContent =
          state[k].toFixed(k === 'custom' ? 2 : 1) + '%';
      });
    }
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); sync(); refresh();
    });
    window.Chart.responsive(stage, draw);
    sync();
    refresh();
  });
})();
