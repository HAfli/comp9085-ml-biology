/* Week 9 - Biological subgroup explorer.
 *
 * k-means, DBSCAN and agglomerative clustering all run in the browser on real
 * data. The silhouette score and the adjusted Rand index against the known
 * diagnosis are measured, and the ARI is what makes the week's central point
 * land: you can produce a high-silhouette clustering that has nothing to do
 * with the biology, and the algorithm will not tell you.
 *
 * The "add a batch effect" control is the important one. It manufactures a
 * technical variable and shows that clustering finds it in preference to the
 * biology, every time.
 */
(function () {
  'use strict';

  window.Chart.register('viz-clustering', function (host) {
    var D = window.WDBC;
    var S = window.SEQUENCES;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var state = { data: 'wdbc', algo: 'kmeans', k: 2, eps: 3.2, minPts: 5,
                  linkage: 'ward', batch: 0, colourBy: 'cluster' };

    var X, truth, truthName, batchLabel, result, sil, ari, sweep;

    function buildData() {
      if (state.data === 'wdbc') {
        var Z = new window.ML.Scaler().fitTransform(D.X);
        truth = D.y.slice();
        truthName = 'diagnosis';
        /* Subsample for speed: agglomerative clustering is O(n^2) per merge. */
        var rng0 = new window.ML.Random(19);
        var idx = rng0.shuffle(Z.map(function (_, i) { return i; })).slice(0, 260);
        idx.sort(function (a, b) { return a - b; });
        Z = idx.map(function (i) { return Z[i]; });
        truth = idx.map(function (i) { return D.y[i]; });
      } else {
        var key = state.data === 'prot-emb' ? 'emb32' : 'eng24';
        Z = S.records.map(function (r) { return r[key]; });
        Z = new window.ML.Scaler().fitTransform(Z);
        truth = S.records.map(function (r) { return r.family; });
        truthName = 'protein family';
      }

      /* Injected batch effect. Half the samples get a constant shift added to
         the first few dimensions, exactly as a different instrument or
         processing day would produce. */
      var rng = new window.ML.Random(77);
      batchLabel = Z.map(function (_, i) { return i % 2 === 0 ? 'batch A' : 'batch B'; });
      if (state.batch > 0) {
        var mag = state.batch / 10;
        Z = Z.map(function (row, i) {
          var shift = batchLabel[i] === 'batch A' ? mag : -mag;
          return row.map(function (v, j) {
            return j < 4 ? v + shift * (1 + 0.4 * (j % 2)) : v;
          });
        });
      }
      X = Z;
    }

    function cluster() {
      if (state.algo === 'kmeans') {
        result = window.ML.kmeans(X, state.k, { seed: 42 });
      } else if (state.algo === 'dbscan') {
        result = window.ML.dbscan(X, state.eps, state.minPts);
      } else {
        result = window.ML.agglomerative(X, state.k, state.linkage);
      }
      sil = window.ML.silhouette(X, result.labels);
      ari = window.ML.adjustedRand(result.labels, truth);
      ariBatch = window.ML.adjustedRand(result.labels, batchLabel);

      /* Silhouette across k, for the elbow / silhouette panel. */
      sweep = [];
      if (state.algo !== 'dbscan') {
        for (var k = 2; k <= 8; k++) {
          var r = state.algo === 'kmeans'
            ? window.ML.kmeans(X, k, { seed: 42 })
            : window.ML.agglomerative(X, k, state.linkage);
          sweep.push({
            k: k,
            sil: window.ML.silhouette(X, r.labels),
            inertia: r.inertia != null ? r.inertia : null,
            ari: window.ML.adjustedRand(r.labels, truth)
          });
        }
      }
    }

    var ariBatch = 0;

    function draw() {
      var wide = stage.clientWidth > 700;
      var f = window.Chart.frame(stage, {
        height: wide ? 340 : 660,
        margin: { top: 26, right: 18, bottom: 46, left: 54 },
        title: 'Cluster assignments and cluster quality'
      });

      var panelW = wide ? (f.w - 48) / 2 : f.w;
      var panelH = wide ? f.h : (f.h - 64) / 2;

      /* ---- Panel 1: projection coloured by cluster or by truth ---- */
      var g1 = f.g.append('g');
      var p = new window.ML.PCA(2).fit(X);
      var xy = p.transform(X);
      var x = d3.scaleLinear().domain(d3.extent(xy, function (q) { return q[0]; }))
        .nice().range([0, panelW]);
      var y = d3.scaleLinear().domain(d3.extent(xy, function (q) { return q[1]; }))
        .nice().range([panelH, 0]);

      var colourFn, legendItems;
      if (state.colourBy === 'cluster') {
        colourFn = function (i) {
          var l = result.labels[i];
          return l < 0 ? 'var(--cat-5)' : window.Chart.colour(l);
        };
        var nC = state.algo === 'dbscan' ? result.nClusters : state.k;
        legendItems = d3.range(nC).map(function (c) {
          return { label: 'cluster ' + c, colour: window.Chart.colour(c),
                   symbol: window.Chart.SYMBOLS[c % 5] };
        });
        if (state.algo === 'dbscan' && result.nNoise) {
          legendItems.push({ label: 'noise (' + result.nNoise + ')',
                             colour: 'var(--cat-5)', symbol: 'cross' });
        }
      } else if (state.colourBy === 'truth') {
        var tv = Array.from(new Set(truth)).sort();
        colourFn = function (i) { return window.Chart.colour(tv.indexOf(truth[i])); };
        legendItems = tv.map(function (t, i) {
          return { label: t, colour: window.Chart.colour(i),
                   symbol: window.Chart.SYMBOLS[i] };
        });
      } else {
        colourFn = function (i) {
          return batchLabel[i] === 'batch A' ? window.Chart.colour(0)
                                             : window.Chart.colour(1);
        };
        legendItems = [
          { label: 'batch A', colour: window.Chart.colour(0), symbol: 'circle' },
          { label: 'batch B', colour: window.Chart.colour(1), symbol: 'square' }
        ];
      }

      g1.append('text').attr('class', 'chart-title').attr('y', -10)
        .text('Coloured by ' + (state.colourBy === 'cluster' ? 'cluster assignment'
              : (state.colourBy === 'truth' ? truthName + ' (the truth)'
                                            : 'processing batch')));

      var pts = g1.append('g');
      X.forEach(function (_, i) {
        var l = state.colourBy === 'cluster' ? result.labels[i] : 0;
        var shape = state.colourBy === 'cluster'
          ? (l < 0 ? 'cross' : window.Chart.SYMBOLS[l % 5])
          : window.Chart.SYMBOLS[
              state.colourBy === 'truth'
                ? Array.from(new Set(truth)).sort().indexOf(truth[i])
                : (batchLabel[i] === 'batch A' ? 0 : 1)];
        window.Chart.symbol(pts, shape, x(xy[i][0]), y(xy[i][1]), 3.4,
          colourFn(i), { opacity: 0.76 });
      });

      /* Centroids for k-means. */
      if (state.algo === 'kmeans' && state.colourBy === 'cluster') {
        var cxy = p.transform(result.centroids);
        cxy.forEach(function (c, ci) {
          g1.append('path')
            .attr('d', 'M' + (x(c[0]) - 7) + ',' + y(c[1]) + 'h14' +
                       'M' + x(c[0]) + ',' + (y(c[1]) - 7) + 'v14')
            .attr('stroke', 'var(--ink)').attr('stroke-width', 2.4);
          g1.append('circle').attr('cx', x(c[0])).attr('cy', y(c[1])).attr('r', 8)
            .attr('fill', 'none').attr('stroke', window.Chart.colour(ci))
            .attr('stroke-width', 2.4);
        });
      }

      g1.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x).ticks(5));
      g1.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5));
      g1.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
        .text('PCA of the data, for display only');

      /* ---- Panel 2: silhouette and ARI across k ---- */
      var g2 = f.g.append('g').attr('transform',
        wide ? 'translate(' + (panelW + 48) + ',0)'
             : 'translate(0,' + (panelH + 64) + ')');

      if (state.algo === 'dbscan') {
        g2.append('text').attr('class', 'chart-title').attr('y', -10)
          .text('Cluster sizes found by DBSCAN');
        var sizes = {};
        result.labels.forEach(function (l) { sizes[l] = (sizes[l] || 0) + 1; });
        var keys = Object.keys(sizes).map(Number).sort(function (a, b) { return a - b; });
        var xb = d3.scaleBand().domain(keys.map(function (k) {
          return k < 0 ? 'noise' : 'c' + k;
        })).range([0, panelW]).padding(0.2);
        var yb = d3.scaleLinear()
          .domain([0, d3.max(keys, function (k) { return sizes[k]; })])
          .nice().range([panelH, 0]);
        g2.selectAll('rect').data(keys).join('rect')
          .attr('x', function (k) { return xb(k < 0 ? 'noise' : 'c' + k); })
          .attr('y', function (k) { return yb(sizes[k]); })
          .attr('width', xb.bandwidth())
          .attr('height', function (k) { return panelH - yb(sizes[k]); })
          .attr('fill', function (k) {
            return k < 0 ? 'var(--cat-5)' : window.Chart.colour(k);
          }).attr('rx', 2);
        g2.append('g').attr('class', 'axis')
          .attr('transform', 'translate(0,' + panelH + ')').call(d3.axisBottom(xb));
        g2.append('g').attr('class', 'axis').call(d3.axisLeft(yb).ticks(5));
        g2.append('text').attr('class', 'axis-label')
          .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
          .text('samples per cluster');
      } else {
        g2.append('text').attr('class', 'chart-title').attr('y', -10)
          .text('Silhouette and agreement with the truth, against k');

        var xk = d3.scalePoint().domain(sweep.map(function (s) { return s.k; }))
          .range([0, panelW]).padding(0.5);
        var yk = d3.scaleLinear().domain([-0.1, 1]).range([panelH, 0]);

        g2.selectAll('line.grid-line').data(yk.ticks(5)).join('line')
          .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
          .attr('y1', yk).attr('y2', yk);
        g2.append('line').attr('x1', 0).attr('x2', panelW)
          .attr('y1', yk(0)).attr('y2', yk(0))
          .attr('stroke', 'var(--ink-4)').attr('stroke-width', 1);

        [['sil', 'var(--specimen)', 'silhouette'],
         ['ari', 'var(--nucleus)', 'adjusted Rand vs ' + truthName]]
          .forEach(function (series) {
            g2.append('path').attr('fill', 'none')
              .attr('stroke', series[1]).attr('stroke-width', 2.2)
              .attr('stroke-dasharray', series[0] === 'ari' ? '5 3' : null)
              .attr('d', d3.line()
                .x(function (s) { return xk(s.k); })
                .y(function (s) { return yk(s[series[0]]); })(sweep));
            g2.selectAll('circle.' + series[0]).data(sweep).join('circle')
              .attr('class', series[0])
              .attr('cx', function (s) { return xk(s.k); })
              .attr('cy', function (s) { return yk(s[series[0]]); })
              .attr('r', function (s) { return s.k === state.k ? 6 : 3.6; })
              .attr('fill', series[1]).attr('stroke', '#fff').attr('stroke-width', 1.3);
          });

        g2.append('g').attr('class', 'axis')
          .attr('transform', 'translate(0,' + panelH + ')').call(d3.axisBottom(xk));
        g2.append('g').attr('class', 'axis').call(d3.axisLeft(yk).ticks(6));
        g2.append('text').attr('class', 'axis-label')
          .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
          .text('number of clusters, k');

        legendItems = legendItems.concat([
          { label: 'silhouette', colour: 'var(--specimen)', symbol: 'line' },
          { label: 'agreement with the truth', colour: 'var(--nucleus)', symbol: 'line' }
        ]);
      }

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml(legendItems));
    }

    function updateMetrics() {
      window.UI.setMetric('cl-sil', isNaN(sil) ? 'n/a' : sil.toFixed(3),
        sil > 0.5 ? 'strong structure' :
          (sil > 0.25 ? 'moderate, overlapping' : 'weak'),
        sil > 0.5 ? 'good' : (sil < 0.15 ? 'bad' : null));
      window.UI.setMetric('cl-ari', ari.toFixed(3),
        'agreement with ' + truthName,
        ari > 0.6 ? 'good' : (ari < 0.2 ? 'bad' : null));
      window.UI.setMetric('cl-aribatch', ariBatch.toFixed(3),
        'agreement with processing batch',
        ariBatch > 0.5 ? 'bad' : null);
      window.UI.setMetric('cl-n',
        String(state.algo === 'dbscan' ? result.nClusters : state.k) + ' clusters',
        state.algo === 'dbscan'
          ? result.nNoise + ' points labelled noise'
          : 'chosen by you, not by the data');
    }

    function updateExplain() {
      var el = host.querySelector('[data-viz-note]');
      var parts = [];

      if (state.batch >= 5 && ariBatch > ari) {
        parts.push('<strong>The clustering has found the batch, not the ' +
          'biology.</strong> Agreement with the processing batch is ' +
          ariBatch.toFixed(3) + ' while agreement with ' + truthName + ' is only ' +
          ari.toFixed(3) + '. The silhouette score is ' + sil.toFixed(3) +
          ', which looks respectable and is telling you nothing about whether ' +
          'the result means anything. This is the single most common way ' +
          'unsupervised analysis of biological data goes wrong, and no clustering ' +
          'metric can detect it. Only knowing your batch structure can.');
      }

      if (state.algo === 'kmeans' && state.k > 3 && state.batch < 5) {
        parts.push('You asked for ' + state.k + ' clusters and k-means gave you ' +
          state.k + ' clusters. It has no mechanism for declining. The silhouette ' +
          'sweep in the right-hand panel is the honest guide: it peaks at k = ' +
          sweep.reduce(function (a, b) { return b.sil > a.sil ? b : a; }).k +
          ' for this data.');
      }

      if (state.algo === 'dbscan') {
        parts.push('DBSCAN found ' + result.nClusters + ' cluster' +
          (result.nClusters === 1 ? '' : 's') + ' and labelled ' + result.nNoise +
          ' points as noise, which is ' +
          ((result.nNoise / X.length) * 100).toFixed(0) + '% of the data. Unlike ' +
          'k-means it decides the number of clusters itself and it can refuse to ' +
          'assign a point, which is often more honest. In exchange you now have to ' +
          'choose eps, and the result is quite sensitive to it. Notice also that ' +
          'density estimation degrades as dimensionality rises, which is why ' +
          'DBSCAN is a better fit for two or three dimensions than for thirty.');
      }

      if (!parts.length) {
        parts.push('Silhouette is ' + sil.toFixed(3) + ' and agreement with ' +
          truthName + ' is ' + ari.toFixed(3) + '. Read those two numbers ' +
          'together. Silhouette says how compact and separated the clusters are; ' +
          'it would be just as high for a clustering that tracked a technical ' +
          'artefact. Agreement with an independently known label is the only ' +
          'thing in this figure that speaks to whether the partition means ' +
          'anything, and in a real discovery setting you would not have it. That ' +
          'is why cluster validation has to come from stability, from external ' +
          'data, or from an independent measurement.');
      }

      el.innerHTML = parts.map(function (p) { return '<p>' + p + '</p>'; }).join('')
        .replace(/<p>((?:(?!<p>)[\s\S])*)<\/p>$/, '<p class="mb0">$1</p>');
    }

    function updateAlt() {
      altBody.innerHTML =
        '<p>Two panels. The first is a PCA scatter plot of the data, used for ' +
        'display only, with points coloured and shaped by ' +
        (state.colourBy === 'cluster' ? 'their assigned cluster'
          : (state.colourBy === 'truth' ? 'the known ' + truthName
                                        : 'their processing batch')) + '. The ' +
        'second ' + (state.algo === 'dbscan'
          ? 'is a bar chart of the number of samples in each DBSCAN cluster, ' +
            'including the noise group.'
          : 'plots the silhouette score and the adjusted Rand index against the ' +
            'known labels, as the number of clusters varies from 2 to 8.') + '</p>' +
        '<p>The data is ' +
        (state.data === 'wdbc' ? 'a 260-sample subset of the standardised real WDBC data'
          : 'the ' + (state.data === 'prot-emb' ? 'learned embedding' :
                      'engineered features') + ' of the protein teaching set') +
        ', with an injected batch effect of strength ' + state.batch +
        ' out of 10. The algorithm is ' + state.algo +
        (state.algo === 'dbscan' ? ' with eps = ' + state.eps + ' and minPts = ' +
          state.minPts : ' with k = ' + state.k) +
        (state.algo === 'agglomerative' ? ' and ' + state.linkage + ' linkage' : '') +
        '.</p>' +
        window.UI.altTable('Current clustering.',
          ['Measure', 'Value'],
          [['Silhouette score', isNaN(sil) ? 'n/a' : sil.toFixed(4)],
           ['Adjusted Rand index against ' + truthName, ari.toFixed(4)],
           ['Adjusted Rand index against processing batch', ariBatch.toFixed(4)],
           ['Clusters found',
            String(state.algo === 'dbscan' ? result.nClusters : state.k)],
           ['Points labelled noise',
            String(state.algo === 'dbscan' ? result.nNoise : 0)]]) +
        (sweep.length ? window.UI.altTable(
          'Silhouette and agreement with the truth as k varies.',
          ['k', 'Silhouette', 'Adjusted Rand'],
          sweep.map(function (s) {
            return [String(s.k), s.sil.toFixed(4), s.ari.toFixed(4)];
          })) : '') +
        '<p>An adjusted Rand index near 0 means the partition is no better than ' +
        'a random one at recovering the labels; 1 means it recovers them exactly. ' +
        'Compare the row for the biological label with the row for the processing ' +
        'batch. A clustering that agrees more with the batch than with the ' +
        'biology has found a technical artefact, and the silhouette score will ' +
        'not warn you.</p>';
    }

    function refresh() {
      buildData(); cluster(); draw();
      updateMetrics(); updateExplain(); updateAlt();
    }

    function syncVisibility() {
      host.querySelector('[data-cl-k]').hidden = state.algo === 'dbscan';
      host.querySelector('[data-cl-dbscan]').hidden = state.algo !== 'dbscan';
      host.querySelector('[data-cl-linkage]').hidden = state.algo !== 'agglomerative';
    }

    host.querySelector('#cl-data').addEventListener('change', function () {
      state.data = this.value; refresh();
    });
    host.querySelector('#cl-algo').addEventListener('change', function () {
      state.algo = this.value; syncVisibility(); refresh();
    });
    host.querySelector('#cl-linkage').addEventListener('change', function () {
      state.linkage = this.value; refresh();
    });
    [['cl-k', 'k'], ['cl-eps', 'eps'], ['cl-minpts', 'minPts'],
     ['cl-batch', 'batch']].forEach(function (p) {
      var el = host.querySelector('#' + p[0]);
      el.addEventListener('input', function () {
        state[p[1]] = p[1] === 'eps' ? +this.value / 10 : +this.value;
        host.querySelector('#' + p[0] + '-val').textContent =
          p[1] === 'eps' ? (+this.value / 10).toFixed(1) : this.value;
        refresh();
      });
    });
    window.UI.onSegment(host.querySelector('#cl-colour'), function (v) {
      state.colourBy = v; draw(); updateAlt();
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { data: 'wdbc', algo: 'kmeans', k: 2, eps: 3.2, minPts: 5,
                linkage: 'ward', batch: 0, colourBy: 'cluster' };
      host.querySelector('#cl-data').value = 'wdbc';
      host.querySelector('#cl-algo').value = 'kmeans';
      host.querySelector('#cl-k').value = 2;
      host.querySelector('#cl-k-val').textContent = '2';
      host.querySelector('#cl-batch').value = 0;
      host.querySelector('#cl-batch-val').textContent = '0';
      host.querySelectorAll('#cl-colour button').forEach(function (b) {
        b.setAttribute('aria-pressed',
          String(b.getAttribute('data-value') === 'cluster'));
      });
      syncVisibility(); refresh();
    });

    syncVisibility();
    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
