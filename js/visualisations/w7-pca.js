/* Week 7 - Exercise 3: PCA on protein representations.
 *
 * Explained-variance spectra of the 23 classical descriptors and of the 320-dimensional
 * ESM-2 embedding, with and without standardisation (PCA fitted on all 2,000 proteins:
 * it is unsupervised and uses no labels). The lower panel shows what k-NN keeps when
 * the embedding is reduced to k components: the share of each protein's 10 nearest
 * neighbours that survive, and the cross-validated k-NN ROC AUC with PCA inside the
 * Pipeline (fitted in every fold). All measured by data/scripts/20_build_week07_refresh.py.
 */
(function () {
  'use strict';

  window.Chart.register('viz-w7-pca', function (host) {
    var W7 = window.W7, U = window.UI, D = window.WEEK07;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var DEFAULT = { rep: 'classical', scale: 'standard', k: 2, task: 'signal_peptide' };
    var state = Object.assign({}, DEFAULT);
    var slider = host.querySelector('#w7p-k');

    function refresh() {
      var P = D.pca[state.rep + '|' + state.scale];
      var nmax = P.evr.length, maxK = state.rep === 'classical' ? 23 : 50;
      slider.max = String(maxK);
      if (state.k > maxK) { state.k = maxK; slider.value = String(maxK); }
      host.querySelector('#w7p-k-val').textContent = state.k + ' component' + (state.k > 1 ? 's' : '');
      stage.innerHTML = '<div data-a></div><div data-b></div>';
      var A = stage.querySelector('[data-a]'), B = stage.querySelector('[data-b]');

      /* spectrum */
      var f = window.Chart.frame(A, { height: Math.min(330, Math.max(260, A.clientWidth * 0.42)),
        margin: { top: 14, right: 16, bottom: 48, left: 56 }, title: 'Explained-variance spectrum' });
      var x = d3.scaleBand().domain(d3.range(1, nmax + 1)).range([0, f.w]).padding(0.15);
      var y = d3.scaleLinear().domain([0, 1]).range([f.h, 0]);
      window.Chart.axes(f, d3.scaleLinear().domain([0.5, nmax + 0.5]).range([0, f.w]), y,
        { xLabel: 'Principal component', yLabel: 'Share of variance', yFormat: d3.format('.0%'),
          xTickValues: nmax > 30 ? [1, 10, 20, 30, 40, 50] : d3.range(1, nmax + 1, 2) });
      f.g.selectAll('rect.bar').data(P.evr).join('rect').attr('class', 'bar')
        .attr('x', function (v, i) { return x(i + 1); }).attr('width', x.bandwidth())
        .attr('y', function (v) { return y(v); }).attr('height', function (v) { return f.h - y(v); })
        .attr('fill', function (v, i) { return i < state.k ? 'var(--cat-1)' : 'var(--cat-5)'; });
      f.g.append('path').datum(P.cum).attr('fill', 'none').attr('stroke', 'var(--cat-2)').attr('stroke-width', 2.4)
        .attr('d', d3.line().x(function (v, i) { return x(i + 1) + x.bandwidth() / 2; }).y(function (v) { return y(v); }));
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(0.9)).attr('y2', y(0.9))
        .attr('stroke', 'var(--cat-3)').attr('stroke-dasharray', '4,3');
      f.g.append('text').attr('x', f.w - 4).attr('y', y(0.9) - 5).attr('text-anchor', 'end').style('font-size', '11px')
        .text('90% (needs ' + P.k90 + ' components)');
      A.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Variance of each component (kept: first ' + state.k + ')', colour: 'var(--cat-1)', symbol: 'square' },
        { label: 'Cumulative share', colour: 'var(--cat-2)', symbol: 'line' }]));

      /* what k-NN keeps (ESM-2 only, measured at fixed k values) */
      var R = D.reduced[state.task], NB = D.neighbourhoods.overlap_with_esm2, ks = [2, 5, 10, 20, 50, 100];
      var g = window.Chart.frame(B, { height: 260, margin: { top: 14, right: 16, bottom: 48, left: 56 },
        title: 'What k-NN keeps after PCA of the ESM-2 embedding' });
      var xs = d3.scaleLog().domain([2, 320]).range([0, g.w]);
      var ys = d3.scaleLinear().domain([0, 1]).range([g.h, 0]);
      window.Chart.axes(g, xs, ys, { xLabel: 'Number of principal components kept (log scale)', yLabel: 'Value',
        xTickValues: [2, 5, 10, 20, 50, 100, 320], xFormat: d3.format('d') });
      var s1 = ks.map(function (k) { return [k, NB['esm2_pca' + k]]; }).concat([[320, 1]]);
      var s2 = ks.map(function (k) { return [k, R['pca_' + k]]; }).concat([[320, R.full_320_standardised]]);
      [[s1, 'var(--cat-3)'], [s2, 'var(--cat-1)']].forEach(function (s) {
        g.g.append('path').datum(s[0]).attr('fill', 'none').attr('stroke', s[1]).attr('stroke-width', 2.4)
          .attr('d', d3.line().x(function (d) { return xs(d[0]); }).y(function (d) { return ys(d[1]); }));
        g.g.selectAll(null).data(s[0]).join('circle').attr('cx', function (d) { return xs(d[0]); })
          .attr('cy', function (d) { return ys(d[1]); }).attr('r', 3.5).attr('fill', s[1]);
      });
      g.g.append('line').attr('x1', 0).attr('x2', g.w).attr('y1', ys(D.knn[state.task].prevalence_train))
        .attr('y2', ys(D.knn[state.task].prevalence_train)).attr('stroke', 'none');
      B.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Share of each protein\'s 10 nearest ESM-2 neighbours that are still among its 10 nearest', colour: 'var(--cat-3)', symbol: 'circle' },
        { label: 'k-NN cross-validated ROC AUC, ' + W7.TASK[state.task].short + ' (PCA inside the Pipeline)', colour: 'var(--cat-1)', symbol: 'circle' }]));

      var kept = P.cum[Math.min(state.k, P.cum.length) - 1];
      U.setMetric('w7p-var', W7.pct(kept), 'variance in the first ' + state.k + ' component' + (state.k > 1 ? 's' : ''));
      U.setMetric('w7p-90', String(P.k90), 'components for 90% (of ' + P.n_components + ')');
      U.setMetric('w7p-pc1', W7.pct(P.pc1), 'PC1 alone');
      var near = ks.filter(function (k) { return k <= state.k; }).pop();
      U.setMetric('w7p-nb', near ? W7.pct(NB['esm2_pca' + near], 0) : '—',
        near ? 'ESM-2 neighbours kept with ' + near + ' PCs (measured at 2, 5, 10, 20, 50, 100)' : 'measured from 2 components');

      var note = '';
      if (state.rep === 'classical' && state.scale === 'none') {
        var sh = D.pca['classical|none'];
        note = '<strong>Unscaled, PC1 takes ' + W7.pct(sh.pc1) + ' and 3 components reach 90%.</strong> That is not ' +
          'structure; it is units. The two hydropathy summaries and log length vary by whole units, the 20 composition ' +
          'fractions by a few hundredths, so the largest-variance directions are just those three features ' +
          '(PC1 loadings: ' + sh.pc1_top.slice(0, 2).map(function (t) { return t[0] + ' ' + t[1]; }).join(', ') + ').';
      } else if (state.rep === 'classical') {
        var st = D.pca['classical|standard'];
        note = 'Standardised, the spectrum is flat: PC1 ' + W7.pct(st.pc1) + ', PC2 ' + W7.pct(st.pc2) + ', and ' + st.k90 +
          ' of 23 components are needed for 90%. The descriptors are not very redundant. PC1 contrasts hydrophobic ' +
          'residues and the hydropathy peak (' + st.pc1_top.slice(0, 3).map(function (t) { return t[0]; }).join(', ') +
          ') with charged and proline-rich composition: a membrane-like axis.';
      } else {
        var e = D.pca['esm2|' + state.scale];
        note = 'The 320-dimensional embedding needs ' + e.k90 + ' components for 90% of its variance' +
          (state.scale === 'none' ? ' (unstandardised; ' + D.pca['esm2|standard'].k90 + ' if standardised)' : '') +
          '. Its information is spread over many directions, so a 2-D picture of it discards most of it. In the lower ' +
          'panel, 10 components keep only ' + W7.pct(NB.esm2_pca10, 0) + ' of each protein\'s nearest neighbours, yet k-NN ' +
          'still reaches ' + R.pca_10.toFixed(3) + ' ROC AUC (320 dimensions: ' + R.full_320_standardised.toFixed(3) + '). ' +
          'Neighbours can change a lot while the vote changes little; with 2 components, both collapse (' + R.pca_2.toFixed(3) + ').';
      }
      host.querySelector('[data-viz-note]').innerHTML = '<p>' + note + '</p>';
      altBody.innerHTML = U.altTable('Cumulative explained variance, ' + W7.REP[state.rep === 'classical' ? 'classical' : 'esm2'] +
        ', ' + (state.scale === 'standard' ? 'standardised' : 'not standardised') + '.',
        ['Components', 'This component', 'Cumulative'], P.evr.map(function (v, i) {
          return [String(i + 1), W7.pct(v, 2), W7.pct(P.cum[i], 1)];
        })) + U.altTable('k-NN after PCA of the ESM-2 embedding (' + W7.TASK[state.task].short + ').',
        ['Components', 'Neighbours kept', 'CV ROC AUC'], ks.map(function (k) {
          return [String(k), W7.pct(NB['esm2_pca' + k], 1), R['pca_' + k].toFixed(3)];
        }).concat([['320 (all)', '100%', R.full_320_standardised.toFixed(3)]]));
    }

    var setR = W7.seg(host, 'w7p-rep', function (v) { state.rep = v; refresh(); });
    var setS = W7.seg(host, 'w7p-scale', function (v) { state.scale = v; refresh(); });
    var setT = W7.seg(host, 'w7p-task', function (v) { state.task = v; refresh(); });
    var setK = W7.slider(host, 'w7p-k', function (v) { return v + ' component' + (v > 1 ? 's' : ''); },
      function (v) { state.k = v; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); setR(state.rep); setS(state.scale); setT(state.task); setK(state.k); refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
