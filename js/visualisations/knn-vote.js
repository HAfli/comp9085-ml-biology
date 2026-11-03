/* Week 8 - Exercise 1: nearest neighbour and the k-NN vote.
 *
 * Lecture slides "Nearest neighbour example", "Noise" and "k-NN classification"
 * (k = 1, 3, 5). Two point sets: the lecture's two-class example, laid out so
 * that k = 1, 3 and 5 give the answers discussed on the slides, and real
 * patients (UCI Heart Disease, Cleveland training rows) in age and maximum heart
 * rate, standardised with the training mean and SD. Click to move the query;
 * flip the nearest neighbour's label to inject noise; shade the decision regions.
 */
(function () {
  'use strict';

  window.Chart.register('viz-knn-vote', function (host) {
    var W8 = window.W8, U = window.UI;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var TOY = {
      classes: ['Yellow', 'Black'],
      colour: { Yellow: '#e0b100', Black: '#1b1f22' },
      xLabel: 'Feature 1', yLabel: 'Feature 2', dom: [[0, 10], [0, 10]],
      q: [5, 5],
      pts: [[5.6, 4.7, 'Black'], [4.3, 5.4, 'Black'], [7.2, 3.8, 'Black'], [7.4, 6.0, 'Black'],
            [7.0, 7.5, 'Black'], [8.2, 8.4, 'Black'], [8.6, 6.6, 'Black'],
            [5.3, 6.1, 'Yellow'], [4.0, 6.0, 'Yellow'], [5.9, 6.2, 'Yellow'], [2.5, 7.0, 'Yellow'],
            [2.0, 5.0, 'Yellow'], [3.0, 3.2, 'Yellow'], [1.6, 8.2, 'Yellow']]
    };

    function heart() {
      var rows = W8.rows().filter(function (r) { return !r.test; });
      var sa = W8.fitScaler(W8.rows(), 'age', 'standard');
      var st = W8.fitScaler(W8.rows(), 'thalach', 'standard');
      return {
        classes: ['No disease', 'Disease'],
        colour: { 'No disease': 'var(--cat-1)', Disease: 'var(--cat-2)' },
        xLabel: W8.LABEL.age, yLabel: W8.LABEL.thalach, dom: [[28, 78], [70, 205]],
        q: [58, 140],
        scale: function (raw) { return [sa(raw[0]), st(raw[1])]; },
        pts: rows.map(function (r) { return [r.age, r.thalach, r.disease ? 'Disease' : 'No disease', r.id]; })
      };
    }

    var DEFAULT = { set: 'lecture', k: 1, weighting: 'uniform', regions: false };
    var state, data, flipped;

    function load() {
      data = state.set === 'lecture' ? TOY : heart();
      data.q0 = data.q.slice();
      data.qNow = data.q.slice();
      flipped = {};
    }

    function points() {
      var sc = data.scale || function (v) { return v; };
      return data.pts.map(function (p, i) {
        var y = flipped[i] ? data.classes[1 - data.classes.indexOf(p[2])] : p[2];
        return { raw: [p[0], p[1]], x: sc([p[0], p[1]]), y: y, id: p[3], i: i };
      });
    }

    function predict(P, qRaw) {
      var sc = data.scale || function (v) { return v; };
      var nb = W8.neighbours(P, sc(qRaw), state.k, 'euclidean');
      return { nb: nb, v: W8.vote(nb, state.weighting === 'distance' ? 1 : 0) };
    }

    function draw() {
      var P = points();
      var f = window.Chart.frame(stage, { height: Math.min(460, Math.max(330, stage.clientWidth * 0.62)),
        margin: { top: 16, right: 16, bottom: 48, left: 58 },
        title: 'k-nearest-neighbour vote for one query point' });
      var x = d3.scaleLinear().domain(data.dom[0]).range([0, f.w]);
      var y = d3.scaleLinear().domain(data.dom[1]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: data.xLabel, yLabel: data.yLabel });

      if (state.regions) {
        var nx = 64, ny = 40, cw = f.w / nx, ch = f.h / ny, cells = [];
        for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) {
          var qr = [x.invert((i + 0.5) * cw), y.invert((j + 0.5) * ch)];
          var pr = predict(P, qr).v;
          cells.push({ i: i, j: j, c: pr.winner });
        }
        f.g.append('g').selectAll('rect').data(cells).join('rect')
          .attr('x', function (d) { return d.i * cw; }).attr('y', function (d) { return d.j * ch; })
          .attr('width', cw + 0.5).attr('height', ch + 0.5)
          .attr('fill', function (d) { return d.c ? data.colour[d.c] : '#999'; })
          .attr('opacity', function (d) { return d.c ? 0.13 : 0.3; });
      }

      var res = predict(P, data.qNow);
      var qx = x(data.qNow[0]), qy = y(data.qNow[1]);
      // links to the k neighbours
      f.g.append('g').selectAll('line').data(res.nb).join('line')
        .attr('x1', qx).attr('y1', qy)
        .attr('x2', function (n) { return x(n.p.raw[0]); }).attr('y2', function (n) { return y(n.p.raw[1]); })
        .attr('stroke', 'var(--ink-2)').attr('stroke-dasharray', '3,3').attr('stroke-width', 1.2);
      // neighbourhood circle (exact in the lecture example; in the heart data the
      // distance is measured in standardised units, so the circle is drawn as an ellipse)
      var far = res.nb[res.nb.length - 1];
      if (far) {
        var rx, ry;
        if (data.scale) {
          var s1 = data.scale([data.qNow[0] + 1, data.qNow[1]])[0] - data.scale(data.qNow)[0];
          var s2 = data.scale([data.qNow[0], data.qNow[1] + 1])[1] - data.scale(data.qNow)[1];
          rx = Math.abs(x(data.qNow[0] + far.d / s1) - qx); ry = Math.abs(y(data.qNow[1] + far.d / s2) - qy);
        } else {
          rx = Math.abs(x(data.qNow[0] + far.d) - qx); ry = Math.abs(y(data.qNow[1] + far.d) - qy);
        }
        f.g.append('ellipse').attr('cx', qx).attr('cy', qy).attr('rx', rx).attr('ry', ry)
          .attr('fill', 'none').attr('stroke', 'var(--nucleus)').attr('stroke-width', 1.6);
      }
      var inNb = {};
      res.nb.forEach(function (n) { inNb[n.p.i] = true; });
      var dots = f.g.append('g').selectAll('circle').data(P).join('circle')
        .attr('cx', function (p) { return x(p.raw[0]); }).attr('cy', function (p) { return y(p.raw[1]); })
        .attr('r', function (p) { return state.set === 'lecture' ? 9 : (inNb[p.i] ? 5.5 : 3.6); })
        .attr('fill', function (p) { return data.colour[p.y]; })
        .attr('fill-opacity', function (p) { return state.set === 'lecture' || inNb[p.i] ? 1 : 0.55; })
        .attr('stroke', function (p) { return flipped[p.i] ? 'var(--bad, #b00020)' : (inNb[p.i] ? 'var(--ink)' : '#fff'); })
        .attr('stroke-width', function (p) { return flipped[p.i] ? 3 : (inNb[p.i] ? 1.6 : 0.8); })
        .attr('tabindex', 0);
      window.Chart.tips(dots, function (p) {
        return (p.id ? 'Patient ' + p.id + '<br>' : '') + '<strong>' + p.y + '</strong>' +
          (flipped[p.i] ? ' (label flipped: noise)' : '') + '<br>(' + p.raw[0] + ', ' + p.raw[1] + ')';
      });
      // the query
      f.g.append('circle').attr('cx', qx).attr('cy', qy).attr('r', 11).attr('fill', '#fff')
        .attr('stroke', 'var(--ink)').attr('stroke-width', 2);
      f.g.append('text').attr('x', qx).attr('y', qy + 5).attr('text-anchor', 'middle')
        .style('font-weight', 700).style('font-size', '14px').text('?');
      // click to move the query
      f.g.insert('rect', ':first-child').attr('width', f.w).attr('height', f.h).attr('fill', 'transparent')
        .style('cursor', 'crosshair');
      f.svg.on('click', function (ev) {
        var m = d3.pointer(ev, f.g.node());
        if (m[0] < 0 || m[1] < 0 || m[0] > f.w || m[1] > f.h) return;
        data.qNow = [Math.round(x.invert(m[0]) * 10) / 10, Math.round(y.invert(m[1]) * 10) / 10];
        refresh();
      });
      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml(data.classes.map(function (c) {
        return { label: c, colour: data.colour[c], symbol: 'circle' };
      }).concat([{ label: 'k-th neighbour radius', colour: 'var(--nucleus)', symbol: 'square' }])));
      return res;
    }

    function refresh() {
      var res = draw();
      var v = res.v, tally = data.classes.map(function (c) {
        return c + ' ' + (state.weighting === 'distance' ? W8.fmt(v.tally[c] || 0, 2) : (v.tally[c] || 0));
      }).join(' · ');
      U.setMetric('kv-q', '(' + data.qNow[0] + ', ' + data.qNow[1] + ')', 'click the plot to move it');
      U.setMetric('kv-nn', W8.fmt(res.nb[0].d, 2), res.nb[0].p.y + (data.scale ? ' (standardised units)' : ''));
      U.setMetric('kv-tally', tally, state.weighting === 'distance' ? 'sum of 1/d per class' : 'one vote each');
      U.setMetric('kv-pred', v.winner || 'Tie', v.tie ? 'tie between ' + v.tie.join(' and ') +
        ': scikit-learn would return the first class in sorted order' : 'k = ' + state.k, v.tie ? 'bad' : null);
      var nFlip = Object.keys(flipped).length;
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' +
        (state.k === 1 ? '<strong>k = 1:</strong> the query copies its single nearest neighbour. ' +
          'Flip that neighbour\'s label and the prediction flips with it: one noisy record decides the answer. '
          : '<strong>k = ' + state.k + ':</strong> ' + res.nb.length + ' neighbours vote. ') +
        (v.tie ? 'This is a tie. With two classes an odd k avoids it under uniform voting; distance weighting also breaks it. '
               : '') +
        (nFlip ? nFlip + ' label' + (nFlip > 1 ? 's' : '') + ' flipped (red outline). Compare k = 1 with k = 5 now. ' : '') +
        (state.set === 'heart' ? 'Real training patients. Distances use age and maximum heart rate standardised ' +
          'with the training mean and SD, so the circle is an ellipse in the original units.' : '') + '</p>';
      altBody.innerHTML = '<p>Query at (' + data.qNow.join(', ') + '); k = ' + state.k + ', ' +
        state.weighting + ' voting. Prediction: ' + (v.winner || 'tie') + '.</p>' +
        U.altTable('The k nearest neighbours, nearest first.', ['Rank', 'Point', 'Class', 'Distance', 'Weight'],
          res.nb.map(function (n, i) {
            return [String(i + 1), '(' + n.p.raw.join(', ') + ')', n.p.y, W8.fmt(n.d, 3), W8.fmt(v.weights[i], 3)];
          }));
    }

    var setSet = W8.seg(host, 'kv-set', function (v) { state.set = v; load(); refresh(); });
    var setW = W8.seg(host, 'kv-w', function (v) { state.weighting = v; refresh(); });
    var setK = W8.slider(host, 'kv-k', function (v) { return String(v); }, function (v) { state.k = v; refresh(); });
    var reg = host.querySelector('#kv-regions');
    reg.addEventListener('change', function () { state.regions = reg.checked; refresh(); });
    host.querySelector('#kv-flip').addEventListener('click', function () {
      var res = predict(points(), data.qNow);
      var i = res.nb[0].p.i;
      if (flipped[i]) delete flipped[i]; else flipped[i] = true;
      refresh();
    });
    host.querySelectorAll('[data-kv-k]').forEach(function (b) {
      b.addEventListener('click', function () { state.k = +b.getAttribute('data-kv-k'); setK(state.k); refresh(); });
    });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = Object.assign({}, DEFAULT); load();
      setSet(state.set); setW(state.weighting); setK(state.k); reg.checked = false; refresh();
    });

    state = Object.assign({}, DEFAULT);
    load();
    window.Chart.responsive(stage, refresh);
    refresh();
  });
})();
