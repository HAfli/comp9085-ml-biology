/* COMP9085 - shared chart primitives built on D3 v7.
 *
 * Every visualisation on the site draws through these helpers so that axes,
 * grids, colours, tooltips and responsive resizing behave identically
 * everywhere. Each helper also knows how to describe itself as text, which is
 * what feeds the "Read this chart as text" disclosure under every figure.
 */
(function () {
  'use strict';

  var Chart = {};
  window.Chart = Chart;

  Chart.CAT = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)',
               'var(--cat-4)', 'var(--cat-5)'];

  /* Shapes as well as colours, so colour is never the only channel. */
  Chart.SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'cross'];

  Chart.colour = function (i) { return Chart.CAT[i % Chart.CAT.length]; };

  /** Draw one of the class symbols at (x, y). */
  Chart.symbol = function (g, shape, x, y, r, fill, opts) {
    opts = opts || {};
    var el;
    switch (shape) {
      case 'square':
        el = g.append('rect')
          .attr('x', x - r).attr('y', y - r)
          .attr('width', r * 2).attr('height', r * 2);
        break;
      case 'triangle':
        el = g.append('path').attr('d',
          'M' + x + ',' + (y - r * 1.2) +
          'L' + (x + r * 1.1) + ',' + (y + r * 0.8) +
          'L' + (x - r * 1.1) + ',' + (y + r * 0.8) + 'Z');
        break;
      case 'diamond':
        el = g.append('path').attr('d',
          'M' + x + ',' + (y - r * 1.25) +
          'L' + (x + r * 1.15) + ',' + y +
          'L' + x + ',' + (y + r * 1.25) +
          'L' + (x - r * 1.15) + ',' + y + 'Z');
        break;
      case 'cross':
        el = g.append('path')
          .attr('d', 'M' + (x - r) + ',' + (y - r) + 'L' + (x + r) + ',' + (y + r) +
                     'M' + (x + r) + ',' + (y - r) + 'L' + (x - r) + ',' + (y + r))
          .attr('stroke', fill).attr('stroke-width', 1.8).attr('fill', 'none');
        return el;
      default:
        el = g.append('circle').attr('cx', x).attr('cy', y).attr('r', r);
    }
    el.attr('fill', fill);
    if (opts.stroke) el.attr('stroke', opts.stroke).attr('stroke-width', opts.strokeWidth || 1);
    if (opts.opacity != null) el.attr('opacity', opts.opacity);
    return el;
  };

  /**
   * Create a responsive SVG inside `host`, with margins and an inner group.
   * Returns { svg, g, w, h, width, height }.
   */
  Chart.frame = function (host, opts) {
    opts = opts || {};
    var margin = Object.assign({ top: 20, right: 20, bottom: 44, left: 54 },
                               opts.margin || {});
    var host_w = host.clientWidth || 640;
    var width = Math.max(opts.minWidth || 300, host_w);
    var height = opts.height || Math.round(width * (opts.ratio || 0.58));
    if (opts.maxHeight) height = Math.min(height, opts.maxHeight);
    if (opts.fixedHeight) height = opts.fixedHeight;

    host.innerHTML = '';
    var svg = d3.select(host).append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('role', 'img');

    if (opts.title) {
      svg.append('title').text(opts.title);
    }
    if (opts.desc) {
      svg.append('desc').text(opts.desc);
    }

    var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    return {
      svg: svg, g: g, margin: margin,
      width: width, height: height,
      w: width - margin.left - margin.right,
      h: height - margin.top - margin.bottom
    };
  };

  /** x and y axes with light grid lines. */
  Chart.axes = function (f, x, y, opts) {
    opts = opts || {};

    if (opts.grid !== false) {
      f.g.append('g').attr('class', 'grid')
        .selectAll('line')
        .data(y.ticks(opts.yTicks || 5))
        .join('line')
        .attr('class', 'grid-line')
        .attr('x1', 0).attr('x2', f.w)
        .attr('y1', function (d) { return y(d); })
        .attr('y2', function (d) { return y(d); });
    }

    var xAxis = d3.axisBottom(x).ticks(opts.xTicks || 6);
    if (opts.xFormat) xAxis.tickFormat(opts.xFormat);
    if (opts.xTickValues) xAxis.tickValues(opts.xTickValues);

    var yAxis = d3.axisLeft(y).ticks(opts.yTicks || 5);
    if (opts.yFormat) yAxis.tickFormat(opts.yFormat);

    f.g.append('g').attr('class', 'axis')
      .attr('transform', 'translate(0,' + f.h + ')')
      .call(xAxis);

    f.g.append('g').attr('class', 'axis').call(yAxis);

    if (opts.xLabel) {
      f.g.append('text').attr('class', 'axis-label')
        .attr('x', f.w / 2).attr('y', f.h + 36)
        .attr('text-anchor', 'middle').text(opts.xLabel);
    }
    if (opts.yLabel) {
      f.g.append('text').attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -f.h / 2).attr('y', -40)
        .attr('text-anchor', 'middle').text(opts.yLabel);
    }
  };

  /** Legend markup for the HTML container beneath a chart. */
  Chart.legendHtml = function (items) {
    return '<div class="legend">' + items.map(function (it, i) {
      var sym = it.symbol || Chart.SYMBOLS[i % Chart.SYMBOLS.length];
      return '<span class="legend-item">' +
        '<svg width="13" height="13" aria-hidden="true" viewBox="0 0 13 13">' +
          symbolPath(sym, it.colour) +
        '</svg>' + window.UI.esc(it.label) + '</span>';
    }).join('') + '</div>';
  };

  function symbolPath(shape, colour) {
    var c = 6.5, r = 4.5;
    switch (shape) {
      case 'square':
        return '<rect x="2" y="2" width="9" height="9" fill="' + colour + '"/>';
      case 'triangle':
        return '<path d="M6.5,1.5 L11.5,10.5 L1.5,10.5 Z" fill="' + colour + '"/>';
      case 'diamond':
        return '<path d="M6.5,1 L12,6.5 L6.5,12 L1,6.5 Z" fill="' + colour + '"/>';
      case 'cross':
        return '<path d="M2,2 L11,11 M11,2 L2,11" stroke="' + colour +
               '" stroke-width="2" fill="none"/>';
      case 'line':
        return '<path d="M1,6.5 L12,6.5" stroke="' + colour +
               '" stroke-width="2.5" fill="none"/>';
      default:
        return '<circle cx="' + c + '" cy="' + c + '" r="' + r +
               '" fill="' + colour + '"/>';
    }
  }
  Chart.symbolPath = symbolPath;

  /** Attach hover and focus tooltips to a selection. */
  Chart.tips = function (sel, htmlFn) {
    sel
      .on('mousemove', function (event, d) {
        window.UI.tip(htmlFn(d), event.clientX, event.clientY);
      })
      .on('mouseleave', function () { window.UI.tip(null); })
      .on('focus', function (event, d) {
        var r = this.getBoundingClientRect();
        window.UI.tip(htmlFn(d), r.left + r.width / 2, r.top);
      })
      .on('blur', function () { window.UI.tip(null); });
  };

  /** Redraw on resize, debounced. Returns a teardown function. */
  Chart.responsive = function (host, draw) {
    var t = null;
    var lastW = host.clientWidth;
    function onResize() {
      if (host.clientWidth === lastW) return;
      lastW = host.clientWidth;
      clearTimeout(t);
      t = setTimeout(draw, 140);
    }
    window.addEventListener('resize', onResize);
    return function () { window.removeEventListener('resize', onResize); };
  };

  /** Format helpers. */
  Chart.pct = function (v, dp) {
    return v == null || isNaN(v) ? 'n/a' : (v * 100).toFixed(dp == null ? 1 : dp) + '%';
  };
  Chart.num = function (v, dp) {
    return v == null || isNaN(v) ? 'n/a' : (+v).toFixed(dp == null ? 3 : dp);
  };

  /** A confusion-matrix table, used in several visualisations. */
  Chart.confusionHtml = function (report, opts) {
    opts = opts || {};
    var cls = report.classes, m = report.matrix;
    var html = '<div class="table-scroll"><table class="table-compact">' +
      '<caption>' + window.UI.esc(opts.caption ||
        'Confusion matrix. Rows are the true class, columns the predicted class.') +
      '</caption><thead><tr><th></th>' +
      cls.map(function (c) {
        return '<th class="num" scope="col">predicted ' + window.UI.esc(c) + '</th>';
      }).join('') + '</tr></thead><tbody>';
    cls.forEach(function (c, i) {
      html += '<tr><th scope="row">true ' + window.UI.esc(c) + '</th>' +
        m[i].map(function (v, j) {
          var strong = i === j;
          return '<td class="num"' + (strong ? ' style="font-weight:700"' : '') +
                 '>' + v + '</td>';
        }).join('') + '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  };

  /** Per-class metric table. */
  Chart.reportHtml = function (report) {
    return '<div class="table-scroll"><table class="table-compact">' +
      '<caption>Per-class performance.</caption>' +
      '<thead><tr><th scope="col">Class</th><th class="num" scope="col">Precision</th>' +
      '<th class="num" scope="col">Recall</th><th class="num" scope="col">F1</th>' +
      '<th class="num" scope="col">Support</th></tr></thead><tbody>' +
      report.per.map(function (p) {
        return '<tr><th scope="row">' + window.UI.esc(p.cls) + '</th>' +
          '<td class="num">' + Chart.num(p.precision) + '</td>' +
          '<td class="num">' + Chart.num(p.recall) + '</td>' +
          '<td class="num">' + Chart.num(p.f1) + '</td>' +
          '<td class="num">' + p.support + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  /**
   * Register a visualisation. Each one supplies an id and a mount function;
   * the loader calls mount(hostElement) when the page contains that id.
   */
  Chart.registry = {};
  Chart.register = function (id, mountFn) { Chart.registry[id] = mountFn; };

  Chart.mountAll = function () {
    if (typeof d3 === 'undefined') {
      document.querySelectorAll('[data-viz]').forEach(function (el) {
        el.innerHTML = '<div class="noscript-note"><strong>The chart library ' +
          'did not load.</strong> The interactive figure needs D3, which is ' +
          'fetched from a CDN. Every figure on this site also has a "Read this ' +
          'chart as text" panel beneath it containing the same information as ' +
          'a table, and those panels do not need D3.</div>';
      });
      return;
    }
    Object.keys(Chart.registry).forEach(function (id) {
      var host = document.getElementById(id);
      /* Mount each figure once. Some renderers insert markup of their own
         (the deployment form, for example), and a second mount duplicated it
         along with its element ids. */
      if (host && host.getAttribute('data-mounted') !== 'yes') {
        host.setAttribute('data-mounted', 'yes');
        try {
          Chart.registry[id](host);
        } catch (err) {
          console.error('Visualisation "' + id + '" failed:', err);
          var stage = host.querySelector('[data-viz-stage]') || host;
          stage.innerHTML = '<div class="noscript-note">This figure failed to ' +
            'render. The text alternative below still contains the underlying ' +
            'numbers.</div>';
        }
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(Chart.mountAll, 0);
    });
  } else {
    setTimeout(Chart.mountAll, 0);
  }
})();
