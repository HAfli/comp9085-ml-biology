/* Week 7 (refresh) - shared helpers for the dimensionality-reduction and
 * protein-representation exercises.
 *
 * Data: window.WEEK07, written by data/scripts/20_build_week07_refresh.py from the
 * frozen Week 7 lab files (2,000 human Swiss-Prot proteins, UniProt 2026_03, one per
 * UniRef50 cluster; ESM-2 8M embeddings of the real and residue-shuffled sequences).
 * Nothing on the Week 7 page is simulated except the optional explorer, which says so.
 */
(function () {
  'use strict';

  var W7 = {};
  var D = window.WEEK07;

  /* Proteins as objects: {i, accession, name, gene, length, sp, tm, test, sp_evidence, tm_evidence}. */
  W7.proteins = D.proteins.map(function (r, i) {
    var o = { i: i };
    D.protCols.forEach(function (c, j) { o[c] = r[j]; });
    return o;
  });

  W7.TASK = { signal_peptide: { key: 'sp', label: 'Signal peptide', short: 'signal peptide' },
              transmembrane: { key: 'tm', label: 'Transmembrane', short: 'transmembrane' } };
  W7.REP = D.repLabel;
  W7.REP_COLOUR = { composition: 'var(--cat-3)', classical: 'var(--cat-2)', esm2: 'var(--cat-1)',
                    esm2_shuffled: 'var(--cat-5)' };
  W7.REP_SYMBOL = { composition: 'triangle', classical: 'square', esm2: 'circle', esm2_shuffled: 'diamond' };

  W7.fmt = function (v, d) { return (v == null || isNaN(v)) ? '—' : (+v).toFixed(d == null ? 3 : d); };
  W7.pct = function (v, d) { return (v == null || isNaN(v)) ? '—' : (100 * v).toFixed(d == null ? 1 : d) + '%'; };
  W7.esc = function (s) { return window.UI.esc(String(s)); };

  W7.badges = function (p) {
    return (p.sp ? '<span class="pill pill-fm" style="font-size:11px;padding:0 6px">SP</span> ' : '') +
           (p.tm ? '<span class="pill pill-classic" style="font-size:11px;padding:0 6px">TM</span>' : '');
  };

  /* ------------------------------------------------------------ controls */
  W7.seg = function (host, id, fn) {
    var btns = host.querySelectorAll('#' + id + ' button');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        fn(b.getAttribute('data-value'));
      });
    });
    return function set(v) {
      btns.forEach(function (x) {
        x.setAttribute('aria-pressed', String(x.getAttribute('data-value') === String(v)));
      });
    };
  };

  W7.slider = function (host, id, fmt, fn) {
    var el = host.querySelector('#' + id), out = host.querySelector('#' + id + '-val');
    function show() { if (out) out.textContent = fmt(+el.value); }
    el.addEventListener('input', function () { show(); fn(+el.value); });
    show();
    return function set(v) { el.value = v; show(); };
  };

  W7.select = function (host, id, fn) {
    var el = host.querySelector('#' + id);
    el.addEventListener('change', function () { fn(el.value); });
    return function set(v) { el.value = v; };
  };

  /** Options for a protein <select>: the query proteins (all from the test set). */
  W7.queryOptions = function (ids) {
    return ids.map(function (i) {
      var p = W7.proteins[i];
      return { value: String(i), label: p.name.slice(0, 48) + ' (' + p.accession + ')' +
        (p.sp ? ' · SP' : '') + (p.tm ? ' · TM' : '') };
    });
  };

  /* ------------------------------------------------------------ scatter */
  /**
   * Draw a 2-D layout (integers 0..1000 per axis) coloured by a label.
   * opts: {colour: 'sp'|'tm'|'length'|'test', highlight: index, ring: [indices], title,
   *        height, arrows: [[x0,y0,x1,y1]], extra: fn(f, x, y)}
   */
  W7.scatter = function (stage, pts, opts) {
    opts = opts || {};
    var f = window.Chart.frame(stage, { height: opts.height || Math.min(460, Math.max(320, stage.clientWidth * 0.62)),
      margin: { top: 10, right: 10, bottom: 26, left: 10 }, title: opts.title || 'Protein map' });
    var x = d3.scaleLinear().domain([-20, 1020]).range([0, f.w]);
    var y = d3.scaleLinear().domain([-20, 1020]).range([f.h, 0]);
    f.g.append('rect').attr('width', f.w).attr('height', f.h).attr('fill', 'none')
      .attr('stroke', 'var(--border, #ccc)');
    var col = opts.colour || 'sp';
    var lenScale = d3.scaleSequential(d3.interpolateViridis).domain([Math.log(50), Math.log(1000)]);
    function fill(p) {
      if (col === 'length') return lenScale(Math.log(p.length));
      if (col === 'test') return p.test ? 'var(--cat-2)' : 'var(--cat-5)';
      return p[col] ? 'var(--cat-2)' : 'var(--cat-1)';
    }
    var order = W7.proteins.slice().sort(function (a, b) {
      if (col === 'sp' || col === 'tm') return a[col] - b[col];
      return 0;
    });
    var g = f.g.append('g');
    g.selectAll('circle').data(order).join('circle')
      .attr('cx', function (p) { return x(pts[p.i][0]); })
      .attr('cy', function (p) { return y(pts[p.i][1]); })
      .attr('r', function (p) { return (col === 'sp' || col === 'tm') && p[col] ? 2.6 : 2.0; })
      .attr('fill', fill)
      .attr('opacity', function (p) { return (col === 'sp' || col === 'tm') && !p[col] ? 0.35 : 0.8; });
    window.Chart.tips(g.selectAll('circle'), function (p) {
      return '<strong>' + W7.esc(p.name) + '</strong><br>' + p.accession + (p.gene ? ' · ' + W7.esc(p.gene) : '') +
        '<br>' + p.length + ' residues · signal peptide: ' + (p.sp ? 'yes' : 'no') + ' · transmembrane: ' +
        (p.tm ? 'yes' : 'no');
    });
    if (opts.arrows) {
      opts.arrows.forEach(function (a) {
        f.g.append('line').attr('x1', x(a[0])).attr('y1', y(a[1])).attr('x2', x(a[2])).attr('y2', y(a[3]))
          .attr('stroke', 'var(--text, #222)').attr('stroke-width', 1.6).attr('stroke-dasharray', '4,3');
      });
    }
    (opts.ring || []).forEach(function (i) {
      f.g.append('circle').attr('cx', x(pts[i][0])).attr('cy', y(pts[i][1])).attr('r', 6)
        .attr('fill', 'none').attr('stroke', 'var(--cat-4)').attr('stroke-width', 2.2);
    });
    if (opts.highlight != null) {
      var h = pts[opts.highlight];
      window.Chart.symbol(f.g, 'diamond', x(h[0]), y(h[1]), 8, 'var(--cat-4)', { stroke: '#fff', strokeWidth: 2 });
    }
    if (opts.extra) opts.extra(f, x, y);
    f.g.append('text').attr('x', 4).attr('y', f.h + 18).style('font-size', '11px').attr('class', 'muted')
      .text('Axes have no units: only which points are near which is meaningful.');
    return f;
  };

  W7.legendFor = function (col, extra) {
    var items;
    if (col === 'length') items = [{ label: 'Colour: sequence length (short → long, log scale)', colour: d3.interpolateViridis(0.5), symbol: 'circle' }];
    else if (col === 'test') items = [{ label: 'Test protein', colour: 'var(--cat-2)', symbol: 'circle' },
                                      { label: 'Training protein', colour: 'var(--cat-5)', symbol: 'circle' }];
    else items = [{ label: (col === 'sp' ? 'Signal peptide' : 'Transmembrane') + ' (UniProt keyword)', colour: 'var(--cat-2)', symbol: 'circle' },
                  { label: 'Not annotated', colour: 'var(--cat-1)', symbol: 'circle' }];
    return window.Chart.legendHtml(items.concat(extra || []));
  };

  /** Indices of the k nearest points to point i in a 2-D layout. */
  W7.nn2d = function (pts, i, k) {
    var d = pts.map(function (p, j) {
      var dx = p[0] - pts[i][0], dy = p[1] - pts[i][1];
      return { j: j, d: dx * dx + dy * dy };
    }).filter(function (o) { return o.j !== i; });
    d.sort(function (a, b) { return a.d - b.d || a.j - b.j; });
    return d.slice(0, k).map(function (o) { return o.j; });
  };

  /* ------------------------------------------------------------ hydropathy */
  W7.hydro = function (seq, w) {
    var kd = D.kd, h = [], s = 0, i;
    for (i = 0; i < seq.length; i++) {
      s += kd[seq[i]];
      if (i >= w) s -= kd[seq[i - w]];
      if (i >= w - 1) h.push(s / w);
    }
    return h;
  };

  W7.composition = function (seq) {
    var c = {}, i;
    D.aa.split('').forEach(function (a) { c[a] = 0; });
    for (i = 0; i < seq.length; i++) c[seq[i]] += 1;
    return D.aa.split('').map(function (a) { return c[a] / seq.length; });
  };

  window.W7 = W7;
})();
