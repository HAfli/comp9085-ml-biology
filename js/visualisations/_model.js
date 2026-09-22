/* Reusable model visualisation layer.
 * ===========================================================================
 * Every figure in this module draws a model that was actually fitted in the
 * browser. Nothing here invents a picture: each helper takes a fitted object
 * from js/ml.js and renders what is in it, so the diagram and the numbers
 * cannot disagree.
 *
 * Week 2 uses the tree helpers. The same contract is intended for later weeks:
 *
 *     Decision tree      Model.tree.draw   the fitted tree, node by node
 *     Random forest      several calls to Model.tree.draw, plus the vote
 *     k-NN               Model.pathPanel   the query, its neighbours, the vote
 *     Naive Bayes        Model.pathPanel   per-class log-likelihood terms
 *     k-means, DBSCAN    the cluster assignments the fitted model returned
 *     PCA                the projected coordinates the fitted model returned
 *
 * A model that cannot be drawn honestly is described in words instead. Do not
 * add a helper that draws a plausible-looking picture the model did not
 * produce.
 */
(function () {
  'use strict';

  var Model = {};

  /* ---------------------------------------------------------------- utils */

  function esc(s) { return window.UI.esc(String(s)); }

  function pretty(name) { return String(name).replace(/_/g, ' '); }

  Model.pretty = pretty;

  /* ------------------------------------------------------------ tree layout
   * Walk a fitted js/ml.js tree and return the node list d3 needs, plus a
   * lookup from node object to a stable id so selection survives a redraw.
   */
  Model.tree = {};

  Model.tree.hierarchy = function (root) {
    return d3.hierarchy(root, function (n) {
      return n.leaf ? null : [n.left, n.right];
    });
  };

  /* Which nodes a single case passes through, and what happened at each. */
  Model.tree.trace = function (root, values, indexOf) {
    var path = [], steps = [], node = root, guard = 0;
    while (node && guard++ < 200) {
      path.push(node);
      if (node.leaf) break;
      var i = indexOf ? indexOf(node) : node.feature;
      var v = values[i];
      var goLeft = v <= node.threshold;
      steps.push({
        node: node,
        feature: node.featureName,
        threshold: node.threshold,
        value: v,
        answer: goLeft ? 'true' : 'false',
        direction: goLeft ? 'left' : 'right'
      });
      node = goLeft ? node.left : node.right;
    }
    return { path: path, steps: steps, leaf: path[path.length - 1] };
  };

  /* ------------------------------------------------------------- tree draw
   * opts:
   *   title        figure title
   *   height       pixel height, computed from the depth if omitted
   *   highlight    array of node objects to mark as a decision path
   *   selected     the node object currently selected
   *   onSelect     fn(node) - makes nodes clickable and keyboard-operable
   *   criterion    'entropy' | 'gini', for the label only
   */
  Model.tree.draw = function (stage, root, depth, opts) {
    opts = opts || {};
    var hl = new Set(opts.highlight || []);
    var f = window.Chart.frame(stage, {
      margin: { top: 24, right: 16, bottom: 16, left: 16 },
      height: opts.height || Math.max(280, 90 + depth * 74),
      title: opts.title || 'Fitted decision tree'
    });

    var h = Model.tree.hierarchy(root);
    d3.tree().size([f.w, f.h - 30])(h);

    f.g.selectAll('path.link')
      .data(h.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', function (d) {
        return (hl.has(d.source.data) && hl.has(d.target.data))
          ? 'var(--cat-3)' : 'var(--rule)';
      })
      .attr('stroke-width', function (d) {
        if (hl.has(d.source.data) && hl.has(d.target.data)) return 4;
        return Math.max(1, Math.min(7, 7 * d.target.data.n / root.n));
      })
      .attr('d', d3.linkVertical().x(function (d) { return d.x; })
                                  .y(function (d) { return d.y; }));

    var nodes = f.g.selectAll('g.node')
      .data(h.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      })
      .attr('tabindex', 0)
      .attr('role', opts.onSelect ? 'button' : 'listitem')
      .style('cursor', opts.onSelect ? 'pointer' : 'default');

    nodes.each(function (d) {
      var g = d3.select(this);
      var n = d.data;
      var mal = (n.counts.malignant || 0) / n.n;
      var isLeaf = n.leaf;
      var w = isLeaf ? 66 : 112, bh = isLeaf ? 32 : 40;
      var onPath = hl.has(n);
      var isSel = opts.selected === n;

      g.append('rect')
        .attr('x', -w / 2).attr('y', -bh / 2)
        .attr('width', w).attr('height', bh)
        .attr('rx', 5)
        .attr('fill', d3.interpolateRgb('#e7eff6', '#f6e6d3')(mal))
        .attr('stroke', isSel ? 'var(--ink)'
          : onPath ? 'var(--cat-3)'
          : isLeaf ? (mal > 0.5 ? 'var(--cat-2)' : 'var(--cat-1)')
          : 'var(--ink-4)')
        .attr('stroke-width', isSel ? 3 : onPath ? 2.6 : isLeaf ? 1.8 : 1);

      g.append('title').text(
        (isLeaf ? 'Leaf predicting ' + n.prediction
                : pretty(n.featureName) + ' ≤ ' + n.threshold.toFixed(3)) +
        '. ' + n.n + ' samples, ' + (n.counts.benign || 0) + ' benign and ' +
        (n.counts.malignant || 0) + ' malignant.');

      if (isLeaf) {
        g.append('text')
          .attr('text-anchor', 'middle').attr('y', -1)
          .style('font-size', '10px').style('font-weight', '700')
          .attr('fill', mal > 0.5 ? 'var(--cat-2)' : 'var(--cat-1)')
          .text(n.prediction === 'malignant' ? 'malignant' : 'benign');
        g.append('text')
          .attr('text-anchor', 'middle').attr('y', 10)
          .style('font-size', '9px').attr('fill', 'var(--ink-3)')
          .text('n=' + n.n);
      } else {
        var label = pretty(n.featureName);
        if (label.length > 20) label = label.slice(0, 19) + '…';
        g.append('text')
          .attr('text-anchor', 'middle').attr('y', -6)
          .style('font-size', '9.5px').style('font-weight', '650')
          .attr('fill', 'var(--ink)')
          .text(label);
        g.append('text')
          .attr('text-anchor', 'middle').attr('y', 6)
          .style('font-size', '9px').attr('fill', 'var(--ink-2)')
          .text('≤ ' + n.threshold.toFixed(2));
        g.append('text')
          .attr('text-anchor', 'middle').attr('y', 16)
          .style('font-size', '8px').attr('fill', 'var(--ink-4)')
          .text('gain ' + n.gain.toFixed(3));
      }
    });

    if (opts.onSelect) {
      nodes.on('click', function (ev, d) { opts.onSelect(d.data); })
           .on('keydown', function (ev, d) {
             if (ev.key === 'Enter' || ev.key === ' ') {
               ev.preventDefault();
               opts.onSelect(d.data);
             }
           });
    }

    /* true / false on the first split, where students look first. */
    h.links().filter(function (l) { return l.source.depth === 0; })
      .forEach(function (l, i) {
        f.g.append('text')
          .attr('x', (l.source.x + l.target.x) / 2 + (i === 0 ? -16 : 16))
          .attr('y', (l.source.y + l.target.y) / 2)
          .attr('text-anchor', 'middle')
          .style('font-size', '9.5px').style('font-weight', '650')
          .attr('fill', 'var(--ink-3)')
          .text(i === 0 ? 'true' : 'false');
      });

    return { frame: f, nodes: nodes, hierarchy: h };
  };

  /* --------------------------------------------------------- node inspector
   * The panel that appears when a node is selected. Reports only fields the
   * fitted node actually carries.
   */
  Model.tree.inspectorHtml = function (node, opts) {
    opts = opts || {};
    if (!node) {
      return '<p class="muted small">Select any node in the tree to inspect ' +
             'it. Every figure shown comes from the fitted model.</p>';
    }
    var b = node.counts.benign || 0, m = node.counts.malignant || 0;
    var crit = opts.criterion === 'gini' ? 'Gini impurity' : 'Entropy';
    var rows = [
      ['Node type', node.leaf ? 'Leaf' : 'Internal node'],
      ['Depth', String(node.depth)],
      ['Samples reaching it', String(node.n)],
      ['Class distribution', b + ' benign, ' + m + ' malignant'],
      [crit, node.impurity.toFixed(4) + (node.leaf && node.impurity === 0
        ? ' (pure)' : '')],
      ['Prediction here', node.prediction]
    ];
    if (!node.leaf) {
      rows.splice(1, 0,
        ['Test', esc(pretty(node.featureName)) + ' ≤ ' +
                 node.threshold.toFixed(4)]);
      rows.push(['Information gain', node.gain.toFixed(4) + ' bits']);
      rows.push(['Goes left / right',
                 node.left.n + ' / ' + node.right.n + ' samples']);
    }
    return '<table class="inspect-table"><caption class="sr-only">' +
      'Properties of the selected tree node</caption><tbody>' +
      rows.map(function (r) {
        return '<tr><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td></tr>';
      }).join('') + '</tbody></table>';
  };

  /* ------------------------------------------------------------- path panel
   * The decision path, as an ordered list. Deliberately called a decision
   * path: it is the sequence of learned splits this input followed. It is not
   * an explanation and it does not establish causality.
   */
  Model.pathPanel = function (trace, opts) {
    opts = opts || {};
    var out = ['<ol class="decision-path">'];
    trace.steps.forEach(function (s) {
      out.push('<li class="dp-step dp-' + s.answer + '">' +
        '<span class="dp-test">' + esc(pretty(s.feature)) + ' = ' +
        window.Chart.num(s.value, 3) + '  ≤  ' +
        window.Chart.num(s.threshold, 3) + ' ?</span>' +
        '<span class="dp-answer">' + s.answer + '</span></li>');
    });
    var leaf = trace.leaf;
    var b = leaf.counts.benign || 0, m = leaf.counts.malignant || 0;
    out.push('<li class="dp-leaf dp-' + leaf.prediction + '">' +
      '<span class="dp-test">Leaf reached: <strong>' +
      leaf.prediction.toUpperCase() + '</strong></span>' +
      '<span class="dp-answer">' + leaf.n + ' training cases here: ' +
      b + ' benign, ' + m + ' malignant</span></li>');
    out.push('</ol>');
    if (opts.note !== false) {
      out.push('<p class="small muted dp-note">This is the <strong>decision ' +
        'path</strong>: the sequence of learned splits the tree used for this ' +
        'input. It does not establish causality and it is not a clinical ' +
        'explanation.</p>');
    }
    return out.join('');
  };

  window.Model = Model;
})();
