/* Week 8 - Exercise 4: feature scaling decides who the neighbours are.
 *
 * Real training patients (UCI Heart Disease, Cleveland). Choose two continuous
 * features and a scaling: none, min-max, or standardisation, each fitted on the
 * TRAINING rows only (as a Pipeline would). The plot is always drawn in
 * standardised units so the shapes are comparable; the highlighted points are the
 * k neighbours the chosen scaling actually selects. Unscaled, cholesterol (mg/dl,
 * SD ~52) swamps ST depression (mm, SD ~1.2): the "neighbourhood" is a thin band of
 * patients with similar cholesterol and any ST depression at all.
 */
(function () {
  'use strict';

  window.Chart.register('viz-knn-scaling', function (host) {
    var W8 = window.W8, U = window.UI, H = window.WEEK08.heart;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var all = W8.rows();
    var train = all.filter(function (r) { return !r.test; });

    var DEFAULT = { fx: 'chol', fy: 'oldpeak', scale: 'none', k: 15, qi: 0 };
    var state = Object.assign({}, DEFAULT);
    var queries = all.filter(function (r) { return r.test; });

    function build() {
      var sx = W8.fitScaler(all, state.fx, state.scale), sy = W8.fitScaler(all, state.fy, state.scale);
      var zx = W8.fitScaler(all, state.fx, 'standard'), zy = W8.fitScaler(all, state.fy, 'standard');
      var pts = train.map(function (r) {
        return { r: r, x: [sx(r[state.fx]), sy(r[state.fy])], z: [zx(r[state.fx]), zy(r[state.fy])], y: r.disease };
      });
      var q = queries[state.qi];
      return { pts: pts, q: q, qx: [sx(q[state.fx]), sy(q[state.fy])], qz: [zx(q[state.fx]), zy(q[state.fy])] };
    }

    function refresh() {
      var B = build();
      var nb = W8.neighbours(B.pts, B.qx, state.k, 'euclidean');
      var v = W8.vote(nb, 0, function (n) { return n.p.y; });
      var inNb = {};
      nb.forEach(function (n) { inNb[n.i] = true; });
      // share of the squared distance from each feature, averaged over the k neighbours
      var sxs = d3.mean(nb, function (n) { var d = n.p.x[0] - B.qx[0]; return d * d; });
      var sys = d3.mean(nb, function (n) { var d = n.p.x[1] - B.qx[1]; return d * d; });
      // and over ALL training patients (the distance the classifier would see in general)
      var axs = d3.mean(B.pts, function (p) { var d = p.x[0] - B.qx[0]; return d * d; });
      var ays = d3.mean(B.pts, function (p) { var d = p.x[1] - B.qx[1]; return d * d; });

      var f = window.Chart.frame(stage, { height: Math.min(440, Math.max(330, stage.clientWidth * 0.6)),
        margin: { top: 16, right: 16, bottom: 48, left: 58 }, title: 'Which patients are the neighbours?' });
      var ex = d3.extent(B.pts.map(function (p) { return p.z[0]; }).concat([B.qz[0]]));
      var ey = d3.extent(B.pts.map(function (p) { return p.z[1]; }).concat([B.qz[1]]));
      var x = d3.scaleLinear().domain([ex[0] - 0.2, ex[1] + 0.2]).range([0, f.w]);
      var y = d3.scaleLinear().domain([ey[0] - 0.2, ey[1] + 0.2]).range([f.h, 0]);
      // both axes are drawn in standardised units (one SD per unit) and labelled in original units
      window.Chart.axes(f, x, y, { xLabel: W8.LABEL[state.fx], yLabel: W8.LABEL[state.fy] });
      f.g.selectAll('.axis').remove();
      // ticks at round values of the ORIGINAL units, placed at their standardised positions
      function origTicks(feat, sc) {
        var lo = invert(feat, sc.domain()[0]), hi = invert(feat, sc.domain()[1]);
        var zf = W8.fitScaler(all, feat, 'standard');
        return d3.ticks(lo, hi, 6).map(function (t) { return { z: zf(t), t: t }; });
      }
      var tx = origTicks(state.fx, x), ty = origTicks(state.fy, y);
      f.g.append('g').attr('class', 'axis').attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).tickValues(tx.map(function (d) { return d.z; }))
          .tickFormat(function (z, i) { return d3.format('~')(tx[i].t); }));
      f.g.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).tickValues(ty.map(function (d) { return d.z; }))
          .tickFormat(function (z, i) { return d3.format('~')(ty[i].t); }));
      var dots = f.g.append('g').selectAll('circle').data(B.pts).join('circle')
        .attr('cx', function (p) { return x(p.z[0]); }).attr('cy', function (p) { return y(p.z[1]); })
        .attr('r', function (p, i) { return inNb[i] ? 5.5 : 3.2; })
        .attr('fill', function (p) { return W8.CLASS_COLOUR[p.y]; })
        .attr('fill-opacity', function (p, i) { return inNb[i] ? 1 : 0.28; })
        .attr('stroke', function (p, i) { return inNb[i] ? 'var(--ink)' : 'none'; }).attr('tabindex', 0);
      window.Chart.tips(dots, function (p) {
        return 'Patient ' + p.r.id + ' (' + (p.y ? 'disease' : 'no disease') + ')<br>' +
          W8.SHORT[state.fx] + ' ' + p.r[state.fx] + ', ' + W8.SHORT[state.fy] + ' ' + p.r[state.fy];
      });
      f.g.append('path').attr('d', d3.symbol(d3.symbolStar, 260)())
        .attr('transform', 'translate(' + x(B.qz[0]) + ',' + y(B.qz[1]) + ')')
        .attr('fill', '#fff').attr('stroke', 'var(--ink)').attr('stroke-width', 2);
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml([
        { label: 'No disease', colour: W8.CLASS_COLOUR[0], symbol: 'circle' },
        { label: 'Disease', colour: W8.CLASS_COLOUR[1], symbol: 'circle' },
        { label: 'Query: held-out patient ' + B.q.id, colour: '#fff', symbol: 'diamond' }]));

      var shareX = sxs / (sxs + sys), allX = axs / (axs + ays);
      U.setMetric('ks-share', W8.pct(allX, 1), W8.SHORT[state.fx] + '\'s share of the squared distance (all patients)',
        allX > 0.95 || allX < 0.05 ? 'bad' : null);
      U.setMetric('ks-spread', W8.fmt(d3.deviation(nb, function (n) { return n.p.r[state.fy]; }), 2) + ' / ' +
        W8.fmt(d3.deviation(train, function (r) { return r[state.fy]; }), 2),
        'SD of ' + W8.SHORT[state.fy] + ' among the neighbours / all patients');
      U.setMetric('ks-pred', v.winner === null ? 'Tie' : (+v.winner ? 'Disease' : 'No disease'),
        'truth: ' + (B.q.disease ? 'disease' : 'no disease') + ' · votes ' + (v.tally[1] || 0) + ' of ' + nb.length);
      U.setMetric('ks-cv', W8.pct(H.k5[state.scale === 'none' ? 'unscaled' : state.scale].mean, 1),
        'all 13 features, k = 5, 10-fold CV (lab Task 6)');

      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' +
        (state.scale === 'none'
          ? '<strong>Unscaled.</strong> ' + W8.SHORT[state.fx] + ' supplies ' + W8.pct(allX, 1) + ' of the squared ' +
            'distance, so the neighbours are chosen almost entirely on it: look at how they spread vertically. '
          : '<strong>' + (state.scale === 'minmax' ? 'Min-max' : 'Standardised') + '.</strong> Both features now ' +
            'contribute, and the neighbourhood is a compact patch around the query. ') +
        'The scaler is fitted on the 227 training patients only and then applied to the held-out query, exactly ' +
        'what a scikit-learn Pipeline does in each cross-validation fold. On all 13 features, unscaled k-NN (k = 5) ' +
        'reaches ' + W8.pct(H.k5.unscaled.mean) + ' cross-validated accuracy, standardised ' + W8.pct(H.k5.standard.mean) +
        ', against a majority-class baseline of ' + W8.pct(H.baseline.mean) + '.</p>';
      altBody.innerHTML = '<p>Query patient ' + B.q.id + ' (' + W8.SHORT[state.fx] + ' ' + B.q[state.fx] + ', ' +
        W8.SHORT[state.fy] + ' ' + B.q[state.fy] + '); scaling: ' + state.scale + '; k = ' + state.k + '.</p>' +
        U.altTable('The k nearest training patients.', ['Patient', W8.SHORT[state.fx], W8.SHORT[state.fy], 'Class', 'Distance'],
          nb.map(function (n) {
            return [String(n.p.r.id), String(n.p.r[state.fx]), String(n.p.r[state.fy]),
                    n.p.y ? 'disease' : 'no disease', W8.fmt(n.d, 3)];
          })) + U.altTable('Share of the unscaled squared distance by feature (all five continuous features, training rows).',
          ['Feature', 'Share'], Object.keys(H.unscaled_distance_share).map(function (k) {
            return [W8.SHORT[k], W8.pct(H.unscaled_distance_share[k], 2)]; }));
    }

    function invert(f, z) {
      var v = train.map(function (r) { return r[f]; });
      return z * d3.deviation(v) + d3.mean(v);
    }

    function fillQuery() {
      host.querySelector('#ks-q-val').textContent = 'patient ' + queries[state.qi].id;
    }
    var setScale = W8.seg(host, 'ks-scale', function (v) { state.scale = v; refresh(); });
    var setK = W8.slider(host, 'ks-k', String, function (v) { state.k = v; refresh(); });
    var sx = host.querySelector('#ks-fx'), sy = host.querySelector('#ks-fy');
    sx.addEventListener('change', function () { state.fx = sx.value; refresh(); });
    sy.addEventListener('change', function () { state.fy = sy.value; refresh(); });
    host.querySelector('#ks-next').addEventListener('click', function () {
      state.qi = (state.qi + 1) % queries.length; fillQuery(); refresh();
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); sx.value = state.fx; sy.value = state.fy;
      setScale(state.scale); setK(state.k); fillQuery(); refresh();
    });
    fillQuery();
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
