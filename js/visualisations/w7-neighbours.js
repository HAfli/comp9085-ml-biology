/* Week 7 - Exercise 8: who are a protein's nearest neighbours, and does the answer
 * survive a change of representation or a dimensionality reduction?
 *
 * For a chosen test protein: its 10 nearest neighbours among all 2,000 proteins in each
 * space (standardised features, Euclidean distance; ESM-2 cosine on the raw vectors as an
 * alternative), with their UniProt annotations. The summary chart uses all 2,000 proteins.
 * Computed by data/scripts/20_build_week07_refresh.py.
 */
(function () {
  'use strict';

  window.Chart.register('viz-w7-neighbours', function (host) {
    var W7 = window.W7, U = window.UI, D = window.WEEK07;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var SPACES = { composition: 'Composition (20)', classical: 'Classical (23)', esm2: 'ESM-2 (320)',
                   esm2_cosine_raw: 'ESM-2, cosine, unscaled', esm2_pca2: 'ESM-2 → PCA 2', esm2_pca10: 'ESM-2 → PCA 10',
                   esm2_pca50: 'ESM-2 → PCA 50', esm2_umap2: 'ESM-2 → UMAP 2-D', esm2_tsne2: 'ESM-2 → t-SNE 2-D' };
    var DEFAULT = { q: String(D.queries[0]), a: 'composition', b: 'esm2', c: 'esm2_pca10' };
    var state = Object.assign({}, DEFAULT);
    var sel = host.querySelector('#w7n-q');
    sel.innerHTML = W7.queryOptions(D.queries).map(function (o) {
      return '<option value="' + o.value + '">' + W7.esc(o.label) + '</option>';
    }).join('');

    function list(space, qpos, ref) {
      var ids = D.nbrs[space][qpos], refIds = D.nbrs[ref][qpos];
      return '<ol class="small" style="padding-left:1.4em;margin:0">' + ids.map(function (j) {
        var p = W7.proteins[j], shared = refIds.indexOf(j) >= 0;
        return '<li style="margin-bottom:2px' + (shared ? ';font-weight:600' : '') + '">' + W7.esc(p.name.slice(0, 46)) +
          ' ' + W7.badges(p) + '</li>';
      }).join('') + '</ol>';
    }

    function refresh() {
      var qi = +state.q, qpos = D.queries.indexOf(qi), p = W7.proteins[qi];
      var cols = [state.a, state.b, state.c];
      var html = '<p><strong>' + W7.esc(p.name) + '</strong> (' + p.accession + ', ' + p.length + ' residues) ' +
        W7.badges(p) + ' <span class="small muted">· a test protein; neighbours searched among all 2,000. ' +
        '<strong>Bold</strong> = also an ESM-2 (320) neighbour.</span></p>' +
        '<div class="grid grid-3" style="gap:12px">' + cols.map(function (sp) {
          var ids = D.nbrs[sp][qpos], same = ids.filter(function (j) {
            var key = W7.TASK.signal_peptide.key;
            return W7.proteins[j][key] === p[key];
          }).length, ov = ids.filter(function (j) { return D.nbrs.esm2[qpos].indexOf(j) >= 0; }).length;
          return '<div class="card" style="padding:10px"><h4 style="margin:0 0 4px">' + SPACES[sp] + '</h4>' +
            '<p class="small muted" style="margin:0 0 6px">' + ov + '/10 shared with ESM-2 · ' + same +
            '/10 share its signal-peptide label · ' + ids.filter(function (j) { return W7.proteins[j].tm === p.tm; }).length +
            '/10 its transmembrane label</p>' + list(sp, qpos, 'esm2') + '</div>';
        }).join('') + '</div>';
      stage.innerHTML = html + '<div data-sum></div>';

      /* summary over all 2,000 proteins */
      var S = stage.querySelector('[data-sum]'), NB = D.neighbourhoods;
      var keys = ['composition', 'classical', 'esm2_pca2', 'esm2_pca5', 'esm2_pca10', 'esm2_pca20', 'esm2_pca50',
                  'esm2_pca100', 'esm2_umap2', 'esm2_tsne2', 'esm2_cosine_raw'];
      var lab = { composition: 'Composition', classical: 'Classical', esm2_pca2: 'PCA 2', esm2_pca5: 'PCA 5',
                  esm2_pca10: 'PCA 10', esm2_pca20: 'PCA 20', esm2_pca50: 'PCA 50', esm2_pca100: 'PCA 100',
                  esm2_umap2: 'UMAP 2-D', esm2_tsne2: 't-SNE 2-D', esm2_cosine_raw: 'Cosine, raw' };
      var f = window.Chart.frame(S, { height: 300, margin: { top: 16, right: 16, bottom: 70, left: 58 },
        title: 'Share of ESM-2 neighbours kept, all proteins' });
      var x = d3.scaleBand().domain(keys).range([0, f.w]).padding(0.2);
      var y = d3.scaleLinear().domain([0, 1]).range([f.h, 0]);
      window.Chart.axes(f, d3.scaleLinear().range([0, f.w]), y, { yLabel: 'Neighbours shared with ESM-2', yFormat: d3.format('.0%') });
      f.g.selectAll('g.axis').filter(function (d, i) { return i === 0; }).remove();
      f.g.selectAll('rect.bar').data(keys).join('rect').attr('class', 'bar').attr('x', function (k) { return x(k); })
        .attr('width', x.bandwidth()).attr('y', function (k) { return y(NB.overlap_with_esm2[k]); })
        .attr('height', function (k) { return f.h - y(NB.overlap_with_esm2[k]); })
        .attr('fill', function (k) { return cols.indexOf(k) >= 0 ? 'var(--cat-2)' : 'var(--cat-1)'; });
      f.g.selectAll('text.lab').data(keys).join('text').attr('class', 'lab')
        .attr('transform', function (k) { return 'translate(' + (x(k) + x.bandwidth() / 2) + ',' + (f.h + 10) + ') rotate(35)'; })
        .style('font-size', '11px').text(function (k) { return lab[k]; });
      f.g.selectAll('text.val').data(keys).join('text').attr('class', 'val').attr('text-anchor', 'middle')
        .attr('x', function (k) { return x(k) + x.bandwidth() / 2; }).attr('y', function (k) { return y(NB.overlap_with_esm2[k]) - 4; })
        .style('font-size', '11px').text(function (k) { return Math.round(100 * NB.overlap_with_esm2[k]) + '%'; });

      var la = NB.label_agreement;
      U.setMetric('w7n-cl', W7.pct(NB.overlap_with_esm2.classical, 0), 'classical vs ESM-2 neighbours, all proteins (chance ' +
        W7.pct(NB.overlap_chance, 1) + ')');
      U.setMetric('w7n-sp', W7.pct(la.esm2.signal_peptide.positives, 0) + ' / ' + W7.pct(la.classical.signal_peptide.positives, 0) +
        ' / ' + W7.pct(la.composition.signal_peptide.positives, 0), 'of a signal-peptide protein\'s neighbours also have one: ESM-2 / classical / composition');
      U.setMetric('w7n-p10', W7.pct(NB.overlap_with_esm2.esm2_pca10, 0), 'ESM-2 neighbours kept by PCA to 10 components');
      host.querySelector('[data-viz-note]').innerHTML = '<p>Each representation defines a different "nearest". Composition ' +
        'and ESM-2 agree on about ' + W7.pct(NB.overlap_with_esm2.composition, 0) + ' of neighbours, classical and ESM-2 on ' +
        W7.pct(NB.overlap_with_esm2.classical, 0) + ': far above chance, far from identical. Reduction changes neighbours too: ' +
        'PCA to 2 components keeps ' + W7.pct(NB.overlap_with_esm2.esm2_pca2, 0) + ', 50 components ' +
        W7.pct(NB.overlap_with_esm2.esm2_pca50, 0) + '. The 2-D t-SNE and UMAP maps keep more local neighbours than 2 PCs (' +
        W7.pct(NB.overlap_with_esm2.esm2_tsne2, 0) + ', ' + W7.pct(NB.overlap_with_esm2.esm2_umap2, 0) + ') but they cannot ' +
        'place a new protein the way the lab\'s Pipeline must, and their distances are not to be read. Which neighbours share ' +
        'a protein\'s annotation is a property of the representation, not just of the protein.</p>';
      altBody.innerHTML = U.altTable('Over all 2,000 proteins: share of 10 nearest neighbours shared with ESM-2 (320), and the ' +
        'share of a positive protein\'s neighbours that are also positive.', ['Space', 'Shared with ESM-2', 'SP agreement (positives)',
        'TM agreement (positives)'], ['esm2'].concat(keys).map(function (k) {
          return [lab[k] || 'ESM-2 (320)', W7.pct(NB.overlap_with_esm2[k], 1), W7.pct(la[k].signal_peptide.positives, 1),
                  W7.pct(la[k].transmembrane.positives, 1)];
        }));
    }

    var setQ = W7.select(host, 'w7n-q', function (v) { state.q = v; refresh(); });
    var setA = W7.select(host, 'w7n-a', function (v) { state.a = v; refresh(); });
    var setB = W7.select(host, 'w7n-b', function (v) { state.b = v; refresh(); });
    var setC = W7.select(host, 'w7n-c', function (v) { state.c = v; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); setQ(state.q); setA(state.a); setB(state.b); setC(state.c); refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
