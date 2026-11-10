/* Week 7 - Exercise 4: protein map explorer. PCA, t-SNE and UMAP of three real
 * representations of the same 2,000 proteins, coloured by real UniProt annotations.
 *
 * Choose a protein: its 10 nearest neighbours in the ORIGINAL (high-dimensional,
 * standardised) space are ringed. Where do they land in the 2-D picture? The readout
 * counts how many of them are also among its 10 nearest points in the map.
 * Layouts: data/scripts/20_build_week07_refresh.py (t-SNE perplexity 30, PCA
 * initialisation, seed 0; UMAP n_neighbors 15, min_dist 0.1, seed 0).
 */
(function () {
  'use strict';

  window.Chart.register('viz-w7-map', function (host) {
    var W7 = window.W7, U = window.UI, D = window.WEEK07;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var DEFAULT = { rep: 'esm2', method: 'pca', colour: 'sp', q: String(D.queries[0]) };
    var state = Object.assign({}, DEFAULT);
    var sel = host.querySelector('#w7m-q');
    sel.innerHTML = W7.queryOptions(D.queries).map(function (o) {
      return '<option value="' + o.value + '">' + W7.esc(o.label) + '</option>';
    }).join('');

    function key() {
      return state.method === 'pca' ? state.rep + '|pca' : state.method === 'tsne' ? state.rep + '|tsne|30|0'
        : state.rep + '|umap|15|0.1|0';
    }

    function refresh() {
      var pts = D.layouts[key()], qi = +state.q, qpos = D.queries.indexOf(qi);
      var hi = D.nbrs[state.rep][qpos];
      var near2d = W7.nn2d(pts, qi, 10);
      var kept = hi.filter(function (j) { return near2d.indexOf(j) >= 0; }).length;
      stage.innerHTML = '';
      W7.scatter(stage, pts, { colour: state.colour, highlight: qi, ring: hi,
        title: W7.REP[state.rep] + ', ' + state.method.toUpperCase() });
      stage.insertAdjacentHTML('beforeend', W7.legendFor(state.colour, [
        { label: 'Chosen protein', colour: 'var(--cat-4)', symbol: 'diamond' },
        { label: 'Its 10 nearest neighbours in the full space (ringed)', colour: 'var(--cat-4)', symbol: 'circle' }]));
      var p = W7.proteins[qi], T = D.trust[key()];
      U.setMetric('w7m-trust', W7.fmt(T, 3), 'trustworthiness (1 = 2-D neighbours are true neighbours)');
      U.setMetric('w7m-kept', kept + ' / 10', 'true neighbours also among its 10 nearest in the map');
      U.setMetric('w7m-dims', state.rep === 'esm2' ? '320 → 2' : state.rep === 'classical' ? '23 → 2' : '20 → 2', 'dimensions');
      var nb = hi.map(function (j) { return W7.proteins[j]; });
      host.querySelector('[data-viz-note]').innerHTML =
        '<p><strong>' + W7.esc(p.name) + '</strong> (' + p.accession + ', ' + p.length + ' residues) ' + W7.badges(p) +
        '. Its 10 nearest neighbours in the full space (' + W7.REP[state.rep] + '): ' +
        nb.filter(function (q) { return q.sp; }).length + ' have a signal peptide, ' +
        nb.filter(function (q) { return q.tm; }).length + ' are transmembrane.</p>' +
        '<p class="small">' + (state.method === 'pca' ? 'PCA is a linear projection onto the two directions of greatest ' +
          'variance. Distances along those two axes are honest, but most of the variance is elsewhere, so true neighbours ' +
          'are often far apart in the plot.' : 'This method places points so that near neighbours stay near. Local ' +
          'neighbourhoods survive better than in PCA (compare the trustworthiness), but the size of a cluster, the gap ' +
          'between clusters and the position of a cluster on the page carry no meaning.') + ' Colour comes from labels the ' +
          'map never saw: separation in colour is an observation to test, not a result.</p>';
      altBody.innerHTML = U.altTable('The chosen protein\'s 10 nearest neighbours in the full space, and whether each is ' +
        'among its 10 nearest points in this 2-D map.', ['Protein', 'Accession', 'SP', 'TM', 'Near in the map?'],
        nb.map(function (q) {
          return [q.name.slice(0, 60), q.accession, q.sp ? 'yes' : 'no', q.tm ? 'yes' : 'no',
                  near2d.indexOf(q.i) >= 0 ? 'yes' : 'no'];
        }));
    }

    var setR = W7.seg(host, 'w7m-rep', function (v) { state.rep = v; refresh(); });
    var setM = W7.seg(host, 'w7m-method', function (v) { state.method = v; refresh(); });
    var setC = W7.seg(host, 'w7m-colour', function (v) { state.colour = v; refresh(); });
    var setQ = W7.select(host, 'w7m-q', function (v) { state.q = v; refresh(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); setR(state.rep); setM(state.method); setC(state.colour); setQ(state.q); refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
