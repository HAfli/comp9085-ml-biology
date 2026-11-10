/* Week 7 - Exercise 9: the residue-shuffling control.
 *
 * Each protein was also embedded after shuffling its residues (same composition and
 * length, order destroyed; numpy default_rng(9085)). Hydropathy profiles and composition
 * are computed here in the browser from the real sequences; distances between ESM-2
 * embeddings (standardised with the real proteins' mean and SD) and every k-NN number
 * come from data/scripts/20_build_week07_refresh.py.
 */
(function () {
  'use strict';

  window.Chart.register('viz-w7-shuffle', function (host) {
    var W7 = window.W7, U = window.UI, D = window.WEEK07, S = D.shuffle;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var DEFAULT = { q: String(D.shuffleIds[0]), view: 'profile' };
    var state = Object.assign({}, DEFAULT);
    var sel = host.querySelector('#w7s-q');
    sel.innerHTML = W7.queryOptions(D.shuffleIds).map(function (o) {
      return '<option value="' + o.value + '">' + W7.esc(o.label) + '</option>';
    }).join('');

    function profile(i) {
      var seqs = D.seqs[String(i)], hr = W7.hydro(seqs[0], D.window), hs = W7.hydro(seqs[1], D.window);
      var f = window.Chart.frame(stage, { height: 300, margin: { top: 14, right: 16, bottom: 48, left: 56 },
        title: 'Hydropathy along the sequence' });
      var x = d3.scaleLinear().domain([1, seqs[0].length]).range([0, f.w]);
      var y = d3.scaleLinear().domain([-4, 4]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'Residue position (window centre)', yLabel: 'Mean Kyte–Doolittle, ' + D.window + ' residues' });
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(1.6)).attr('y2', y(1.6))
        .attr('stroke', 'var(--cat-3)').attr('stroke-dasharray', '4,3');
      f.g.append('text').attr('x', f.w - 4).attr('y', y(1.6) - 5).attr('text-anchor', 'end').style('font-size', '11px')
        .text('1.6: a threshold often used with a 19-residue window');
      [[hs, 'var(--cat-5)', '5,3'], [hr, 'var(--cat-1)', null]].forEach(function (s) {
        f.g.append('path').datum(s[0]).attr('fill', 'none').attr('stroke', s[1]).attr('stroke-width', 2)
          .attr('stroke-dasharray', s[2])
          .attr('d', d3.line().x(function (v, j) { return x(j + 1 + (D.window - 1) / 2); }).y(function (v) { return y(v); }));
      });
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Real sequence', colour: 'var(--cat-1)', symbol: 'line' },
        { label: 'Same residues, shuffled', colour: 'var(--cat-5)', symbol: 'line' }]));
    }

    function map(i) {
      var arrows = [[D.pcaReal[i][0], D.pcaReal[i][1], D.pcaShuf[i][0], D.pcaShuf[i][1]]];
      W7.scatter(stage, D.pcaReal, { colour: 'sp', highlight: i, arrows: arrows, title: 'ESM-2, first two PCs',
        extra: function (f, x, y) {
          f.g.selectAll(null).data(D.shuffleIds).join('circle')
            .attr('cx', function (j) { return x(D.pcaShuf[j][0]); }).attr('cy', function (j) { return y(D.pcaShuf[j][1]); })
            .attr('r', function (j) { return j === i ? 6 : 3; }).attr('fill', 'none')
            .attr('stroke', 'var(--cat-5)').attr('stroke-width', function (j) { return j === i ? 2.5 : 1.2; });
        } });
      stage.insertAdjacentHTML('beforeend', W7.legendFor('sp', [
        { label: 'Chosen protein (real)', colour: 'var(--cat-4)', symbol: 'diamond' },
        { label: 'Shuffled copies of the listed proteins (arrow: the chosen one)', colour: 'var(--cat-5)', symbol: 'circle' }]));
    }

    function hist() {
      var H = S.hist, f = window.Chart.frame(stage, { height: 300, margin: { top: 14, right: 16, bottom: 48, left: 56 },
        title: 'Distances in the standardised ESM-2 space, all proteins' });
      var x = d3.scaleLinear().domain([0, 40]).range([0, f.w]);
      var y = d3.scaleLinear().domain([0, d3.max(H.nearest.concat(H.twin, H.random))]).nice().range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'Euclidean distance', yLabel: 'Number of proteins / pairs' });
      [[H.nearest, 'var(--cat-1)'], [H.twin, 'var(--cat-2)'], [H.random, 'var(--cat-5)']].forEach(function (s) {
        f.g.append('path').datum(s[0]).attr('fill', 'none').attr('stroke', s[1]).attr('stroke-width', 2.4)
          .attr('d', d3.line().curve(d3.curveStepAfter).x(function (v, j) { return x(H.bins[j]); }).y(function (v) { return y(v); }));
      });
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'Protein → its nearest OTHER real protein', colour: 'var(--cat-1)', symbol: 'line' },
        { label: 'Protein → its own shuffled copy', colour: 'var(--cat-2)', symbol: 'line' },
        { label: 'Two random proteins', colour: 'var(--cat-5)', symbol: 'line' }]));
    }

    function refresh() {
      var i = +state.q, p = W7.proteins[i], seqs = D.seqs[String(i)], t = D.twin[String(i)];
      var cr = W7.composition(seqs[0]), cs = W7.composition(seqs[1]);
      var same = cr.every(function (v, j) { return Math.abs(v - cs[j]) < 1e-12; });
      var cf = D.classicalShuffle[String(i)];
      stage.innerHTML = '';
      if (state.view === 'profile') profile(i); else if (state.view === 'map') map(i); else hist();
      U.setMetric('w7s-comp', same ? 'identical' : 'different', 'amino-acid composition and length (checked here)');
      U.setMetric('w7s-hyd', W7.fmt(cf[0][1], 2) + ' → ' + W7.fmt(cf[1][1], 2), 'max 19-residue hydropathy, real → shuffled');
      U.setMetric('w7s-twin', W7.fmt(t[0], 1), 'ESM-2 distance to its own shuffled copy');
      U.setMetric('w7s-near', W7.fmt(t[1], 1), 'distance to its nearest other real protein; ' + t[2] +
        ' real proteins are closer to the shuffled copy than the original is');
      var KS = D.knn.signal_peptide, KT = D.knn.transmembrane;
      host.querySelector('[data-viz-note]').innerHTML = '<p><strong>' + W7.esc(p.name) + '</strong> ' + W7.badges(p) +
        '. Shuffling keeps every residue and so the composition (' + (same ? 'identical, as checked' : 'not identical?') +
        ') but destroys order: hydrophobic stretches and the N-terminal signal region dissolve into the average. ' +
        'Over all 2,000 proteins the shuffled copy is closer to its original than the nearest other real protein for only ' +
        W7.pct(S.share_twin_closer_than_nearest_other, 0) + ' of proteins (median ESM-2 distance to the copy ' +
        S.esm2_twin_distance_median + ', to the nearest other protein ' + S.esm2_nearest_other_median + ', between random ' +
        'proteins ' + S.esm2_random_pair_median + '). Yet the raw cosine similarity between a protein and its shuffled copy ' +
        'is ' + S.cosine_raw_median.toFixed(3) + ': anisotropy makes unscaled cosine look reassuring when it is not.</p>' +
        '<div class="table-scroll"><table class="table-compact"><caption>k-NN cross-validated ROC AUC (training proteins, ' +
        'each representation tuned with the same grid).</caption><thead><tr><th scope="col">Representation</th>' +
        '<th class="num" scope="col">Signal peptide</th><th class="num" scope="col">Transmembrane</th></tr></thead><tbody>' +
        ['composition', 'classical', 'esm2', 'esm2_shuffled'].map(function (r) {
          return '<tr><th scope="row">' + W7.REP[r] + '</th><td class="num">' + W7.fmt(KS[r].best.cv_roc_auc) +
            '</td><td class="num">' + W7.fmt(KT[r].best.cv_roc_auc) + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="small">The embedding of a shuffled sequence carries about as much ' +
        'information as composition: the gain from ESM-2 depends on residue order. That shows the representation uses ' +
        'order; it does not show which biological mechanism it has captured.</p>';
      altBody.innerHTML = U.altTable('Composition of the chosen protein, real and shuffled.', ['Residue', 'Real', 'Shuffled'],
        D.aa.split('').map(function (a, j) { return [a, W7.pct(cr[j], 2), W7.pct(cs[j], 2)]; }));
    }

    var setQ = W7.select(host, 'w7s-q', function (v) { state.q = v; refresh(); });
    var setV = W7.seg(host, 'w7s-view', function (v) { state.view = v; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); setQ(state.q); setV(state.view); refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
