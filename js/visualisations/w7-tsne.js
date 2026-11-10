/* Week 7 - Exercises 5 and 6: t-SNE perplexity and UMAP parameters, on the real
 * ESM-2 embeddings of 2,000 human proteins. Every layout was computed once by
 * data/scripts/20_build_week07_refresh.py (scikit-learn TSNE, umap-learn UMAP) and is
 * shown here as it came out; trustworthiness (k = 10) is measured against the
 * standardised 320-dimensional embedding.
 */
(function () {
  'use strict';

  function mount(host, kind) {
    var W7 = window.W7, U = window.UI, D = window.WEEK07;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var pre = kind === 'tsne' ? 'w7t' : 'w7u';
    var DEFAULT = kind === 'tsne' ? { perp: '30', run: 'pca|0', colour: 'sp' }
                                  : { nn: '15', md: '0.1', seed: '0', colour: 'sp' };
    var state = Object.assign({}, DEFAULT);

    function key() {
      if (kind === 'tsne') {
        var r = state.run.split('|');
        if (state.perp !== '30') return 'esm2|tsne|' + state.perp + '|0';
        return r[0] === 'pca' ? 'esm2|tsne|30|' + r[1] : 'esm2|tsne_random|30|' + r[1];
      }
      var seed = (state.nn === '15' && state.md === '0.1') ? state.seed : '0';
      return 'esm2|umap|' + state.nn + '|' + state.md + '|' + seed;
    }

    function refresh() {
      var k = key(), pts = D.layouts[k];
      if (kind === 'tsne') {
        host.querySelectorAll('#' + pre + '-run button').forEach(function (b) { b.disabled = state.perp !== '30'; });
      } else {
        host.querySelectorAll('#' + pre + '-seed button').forEach(function (b) {
          b.disabled = !(state.nn === '15' && state.md === '0.1');
        });
      }
      stage.innerHTML = '';
      W7.scatter(stage, pts, { colour: state.colour, title: k });
      stage.insertAdjacentHTML('beforeend', W7.legendFor(state.colour));
      U.setMetric(pre + '-trust', W7.fmt(D.trust[k], 3), 'trustworthiness at k = 10');
      U.setMetric(pre + '-pca', W7.fmt(D.trust['esm2|pca'], 3), 'PCA to 2 components, for comparison');
      var note;
      if (kind === 'tsne') {
        note = state.perp === '2' || state.perp === '5'
          ? 'Very low perplexity: each point attends to only a handful of neighbours, so the map breaks into many small ' +
            'clumps and strings. Some clumps are real neighbourhoods, many are artefacts of the setting.'
          : state.perp === '100' ? 'High perplexity: each point attends to about a hundred neighbours, so broader structure ' +
            'appears and small groups merge. Neither setting is "correct"; they answer different questions.'
          : 'Perplexity is roughly the number of neighbours each point tries to keep close. Change it, and change the ' +
            'seed and the initialisation (perplexity 30 only): which features of the picture survive every run?';
        if (state.perp === '30' && state.run.indexOf('random') === 0)
          note += ' <strong>Random initialisation:</strong> the arrangement of the groups on the page changes from seed to ' +
            'seed, while the local neighbourhoods (trustworthiness) barely move. Global placement is not interpretable.';
      } else {
        note = (state.md === '0.0' ? 'min_dist 0 lets points pack tightly: clusters look sharper than the data are. '
          : state.md === '0.99' ? 'min_dist 0.99 spreads points evenly: the same data look almost structureless. ' : '') +
          (state.nn === '5' ? 'n_neighbors 5 is very local: many small islands. '
           : state.nn === '200' ? 'n_neighbors 200 looks at 10% of the data for every point: more global shape, less local detail. '
           : '') +
          'Trustworthiness moves only a little across settings, while the picture changes a great deal: the visual ' +
          'impression of clusters is partly a choice of parameters.';
      }
      host.querySelector('[data-viz-note]').innerHTML = '<p>' + note + '</p>';
      var rows = Object.keys(D.trust).filter(function (t) { return t.indexOf('esm2|' + kind) === 0; }).sort()
        .map(function (t) { return [t.replace('esm2|', ''), W7.fmt(D.trust[t], 3)]; });
      altBody.innerHTML = U.altTable('Trustworthiness (k = 10) of every ' + (kind === 'tsne' ? 't-SNE' : 'UMAP') +
        ' layout of the ESM-2 embedding; PCA to 2 components scores ' + W7.fmt(D.trust['esm2|pca'], 3) + '.',
        ['Setting', 'Trustworthiness'], rows);
    }

    var sets = [];
    if (kind === 'tsne') {
      sets.push(['perp', W7.seg(host, pre + '-perp', function (v) { state.perp = v; refresh(); })]);
      sets.push(['run', W7.seg(host, pre + '-run', function (v) { state.run = v; refresh(); })]);
    } else {
      sets.push(['nn', W7.seg(host, pre + '-nn', function (v) { state.nn = v; refresh(); })]);
      sets.push(['md', W7.seg(host, pre + '-md', function (v) { state.md = v; refresh(); })]);
      sets.push(['seed', W7.seg(host, pre + '-seed', function (v) { state.seed = v; refresh(); })]);
    }
    sets.push(['colour', W7.seg(host, pre + '-colour', function (v) { state.colour = v; refresh(); })]);
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT);
      sets.forEach(function (s) { s[1](state[s[0]]); });
      refresh();
    });
    window.Chart.responsive(stage, refresh);
    refresh();
  }

  window.Chart.register('viz-w7-tsne', function (host) { mount(host, 'tsne'); });
  window.Chart.register('viz-w7-umap', function (host) { mount(host, 'umap'); });
})();
