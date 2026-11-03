/* Week 3 - Hyperparameter explorer.
 *
 * Lecture slides 49-53. Training, cross-validation and final-test accuracy
 * for every max_depth (1-12) and every odd k (1-25), measured once with
 * scikit-learn by data/scripts/17_build_week03_interactives.py on one
 * stratified 80/20 split of the real WDBC data (455 train-pool rows, 114
 * final-test rows, random_state=42). Training and CV use the pool only. The
 * final-test line is hidden until the student asks for it, because the
 * choice has to be made without it. Depth 4 (CV 93.8%) and k = 3 (CV 97.4%)
 * are slides 50 and 51.
 */
(function () {
  'use strict';

  window.Chart.register('viz-hyperparameter', function (host) {
    var T = window.WEEK03 && window.WEEK03.tuning;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var U = window.UI;
    if (!T) { stage.innerHTML = '<p>Week 3 data did not load.</p>'; return; }
    var DEFAULT = { model: 'tree', v: 3, reveal: false };
    var state = Object.assign({}, DEFAULT);
    var NAME = { tree: 'max_depth', knn: 'k' };

    function rows() { return T[state.model]; }
    function row() {
      return rows().filter(function (r) { return r.v === state.v; })[0] || rows()[0];
    }

    function draw() {
      var R = rows(), cur = row(), best = T.chosen[state.model];
      var f = window.Chart.frame(stage, { height: 320, margin: { top: 28, right: 18, bottom: 46, left: 56 } });
      f.svg.attr('aria-label', 'Training and cross-validation accuracy against ' + NAME[state.model]);
      f.g.append('text').attr('class', 'chart-title').attr('y', -10)
        .text((state.model === 'tree' ? 'Decision tree' : 'k-NN (standardised)') +
              ': accuracy against ' + NAME[state.model]);
      var x = d3.scaleLinear().domain(d3.extent(R, function (r) { return r.v; })).range([0, f.w]);
      var lo = d3.min(R, function (r) { return Math.min(r.cv - r.cvSd, r.test); });
      var y = d3.scaleLinear().domain([Math.min(0.85, Math.floor(lo * 50) / 50), 1.005]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { yFormat: d3.format('.0%'),
        xTickValues: R.map(function (r) { return r.v; }),
        xLabel: NAME[state.model] + (state.model === 'tree' ? ' (larger = more complex)' :
          ' (smaller = more complex)'), yLabel: 'Accuracy' });
      f.g.append('path').datum(R).attr('fill', 'var(--clinical-soft)')
        .attr('d', d3.area().x(function (r) { return x(r.v); })
          .y0(function (r) { return y(r.cv - r.cvSd); })
          .y1(function (r) { return y(Math.min(1.005, r.cv + r.cvSd)); }));
      function line(k, colour, dash) {
        f.g.append('path').datum(R).attr('fill', 'none').attr('stroke', colour)
          .attr('stroke-width', 2.4).attr('stroke-dasharray', dash || null)
          .attr('d', d3.line().x(function (r) { return x(r.v); }).y(function (r) { return y(r[k]); }));
        var pts = f.g.selectAll('circle.' + k).data(R).join('circle').attr('class', k)
          .attr('cx', function (r) { return x(r.v); }).attr('cy', function (r) { return y(r[k]); })
          .attr('r', 3.5).attr('fill', colour).attr('tabindex', 0);
        window.Chart.tips(pts, function (r) {
          return '<strong>' + NAME[state.model] + ' = ' + r.v + '</strong><br>training ' +
            window.Chart.pct(r.train) + '<br>cross-validation ' + window.Chart.pct(r.cv) +
            ' (sd ' + r.cvSd.toFixed(3) + ')' +
            (state.reveal ? '<br>final test ' + window.Chart.pct(r.test) : '');
        });
      }
      line('train', 'var(--cat-1)');
      line('cv', 'var(--nucleus)');
      if (state.reveal) line('test', 'var(--cat-3)', '5 4');
      f.g.append('line').attr('x1', x(cur.v)).attr('x2', x(cur.v)).attr('y1', 0).attr('y2', f.h)
        .attr('stroke', 'var(--ink-2)').attr('stroke-width', 1.2);
      var bx = x(best), byv = R.filter(function (r) { return r.v === best; })[0].cv;
      f.g.append('path').attr('d', d3.symbol(d3.symbolStar, 150)())
        .attr('transform', 'translate(' + bx + ',' + y(byv) + ')').attr('fill', 'var(--nucleus)')
        .attr('stroke', '#fff');
      f.g.append('text').attr('x', bx + 8).attr('y', y(byv) + 16).style('font-size', '11px')
        .attr('fill', 'var(--nucleus)').style('font-weight', 600).text('best by CV');
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Training accuracy (455 pool rows, refitted on all of them)', colour: 'var(--cat-1)', symbol: 'line' },
        { label: 'Cross-validation accuracy, 5 folds of the pool (band: ±1 sd)', colour: 'var(--nucleus)', symbol: 'line' }
      ].concat(state.reveal ? [{ label: 'Final-test accuracy, 114 rows (for teaching only: never choose with it)',
        colour: 'var(--cat-3)', symbol: 'line' }] : [])));
    }

    function update() {
      var cur = row(), best = T.chosen[state.model];
      var bestRow = rows().filter(function (r) { return r.v === best; })[0];
      U.setMetric('hp-train', window.Chart.pct(cur.train), 'on the rows it was fitted to');
      U.setMetric('hp-cv', window.Chart.pct(cur.cv), 'sd ' + cur.cvSd.toFixed(3) + ' across 5 folds');
      U.setMetric('hp-test', state.reveal ? window.Chart.pct(cur.test) : 'hidden',
        state.reveal ? '114 rows, never used to choose' : 'tick the box to look, once');
      U.setMetric('hp-best', NAME[state.model] + ' = ' + best, 'CV ' + window.Chart.pct(bestRow.cv) +
        ' (ties go to the simpler value)');
      var gap = cur.train - cur.cv;
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">At ' + NAME[state.model] +
        ' = ' + cur.v + ', training accuracy is ' + window.Chart.pct(cur.train) + ' and ' +
        'cross-validation accuracy is ' + window.Chart.pct(cur.cv) + ' (a gap of ' +
        (gap * 100).toFixed(1) + ' points). ' +
        (state.model === 'tree'
          ? 'Training accuracy keeps climbing to 100% as the tree deepens; cross-validation ' +
            'accuracy peaks at depth ' + best + ' and then falls back. '
          : 'k = 1 memorises its own training rows (100% training accuracy) and is visibly ' +
            'worse under cross-validation; cross-validation peaks at k = ' + best + '. ') +
        'Only the cross-validation column may choose the value. ' +
        (state.reveal
          ? 'You have now looked at the final test. In a real study that look is spent: if ' +
            'it changes your choice, the test set has stopped being an unbiased estimate.'
          : 'The final-test line is hidden on purpose: decide first, then look once.') + '</p>';
      altBody.innerHTML = '<p>' + (state.model === 'tree' ? 'Decision tree (entropy)' :
        'k-NN, standardised inside a Pipeline') + '. Training and CV on the 455-row pool; ' +
        'final test on 114 rows, stratified 80/20, random_state=42.</p>' +
        U.altTable('Accuracy by ' + NAME[state.model] + '.',
          [NAME[state.model], 'Training', 'Cross-validation', 'CV sd', 'Final test'],
          rows().map(function (r) {
            return [String(r.v), window.Chart.pct(r.train), window.Chart.pct(r.cv),
                    r.cvSd.toFixed(3), state.reveal ? window.Chart.pct(r.test) : 'hidden'];
          }));
    }

    function refresh() { draw(); update(); }

    var slider = host.querySelector('#hp-v');
    function setRange() {
      var R = rows();
      slider.min = R[0].v; slider.max = R[R.length - 1].v;
      slider.step = state.model === 'tree' ? 1 : 2;
      slider.value = state.v;
      host.querySelector('#hp-v-val').textContent = String(state.v);
      host.querySelector('label[for="hp-v"]').firstChild.textContent =
        (state.model === 'tree' ? 'max_depth ' : 'k (neighbours) ');
    }
    slider.addEventListener('input', function () {
      var v = +this.value;
      if (state.model === 'knn' && v % 2 === 0) v = v - 1;
      state.v = v; host.querySelector('#hp-v-val').textContent = String(v);
      refresh();
    });
    U.onSegment(host.querySelector('#hp-model'), function (v) {
      state.model = v; state.v = v === 'tree' ? 3 : 5; setRange(); refresh();
    });
    host.querySelector('#hp-reveal').addEventListener('change', function () {
      state.reveal = this.checked; refresh();
    });
    function sync() {
      host.querySelectorAll('#hp-model button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === state.model));
      });
      host.querySelector('#hp-reveal').checked = state.reveal;
      setRange();
    }
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); sync(); refresh();
    });
    window.Chart.responsive(stage, refresh);
    sync();
    refresh();
  });
})();
