/* Week 11 - Boosting and fine-tuning foundation models: the five real-data exercises.
 *
 * Data: window.WEEK11, written by data/scripts/28_build_week11_data.py (which reads the fine-tuning results of
 * data/scripts/27_build_week11_finetune.py). Task throughout: does a human protein carry an N-terminal signal peptide?
 * 2,000 reviewed Swiss-Prot proteins (one per UniRef50 cluster), the Week 7 split.
 *   w11-gbtune      gradient boosting: learning rate, tree depth, subsampling and number of trees (precomputed CV curves)
 *   w11-importance  impurity importance (training) against permutation importance (test) for the chosen boosted model
 *   w11-ladder      the adaptation ladder: descriptors + boosting, frozen ESM-2 embeddings, LoRA and full fine-tuning,
 *                   on identical fit / validation / test proteins
 *   w11-zeroshot    zero-shot: ESM-2 masked-marginal scores for every substitution in the insulin signal peptide
 *   w11-lora        exact LoRA parameter arithmetic for the ESM-2 family (checked against peft for the 8M model)
 */
(function () {
  'use strict';
  var D = window.WEEK11;
  if (!D || !window.Chart) return;
  var GREY = '#9aa7b2';
  if (!document.getElementById('w11-style')) {
    var css = document.createElement('style');
    css.id = 'w11-style';
    css.textContent = '.w11-btns{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}' +
      '.w11-heat rect.sel{stroke:#111;stroke-width:2px}';
    document.head.appendChild(css);
  }
  function f3(v) { return (v == null || isNaN(v)) ? '—' : (+v).toFixed(3); }
  function num(v) { return (+v).toLocaleString('en-IE'); }
  function z0(ci) { return (ci[0] > 0 || ci[1] < 0) ? 'excludes' : 'includes'; }
  function sg(v) { var t = (+v).toFixed(3); return t === '-0.000' ? '0.000' : t; }
  function seg(host, id, fn) {
    var btns = host.querySelectorAll('#' + id + ' button');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        fn(b.getAttribute('data-value'));
      });
    });
    return function (v) {
      btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-value') === String(v))); });
    };
  }
  function slider(host, id, fmt, fn) {
    var el = host.querySelector('#' + id), out = host.querySelector('#' + id + '-val');
    function show() { if (out) out.textContent = fmt(+el.value); }
    el.addEventListener('input', function () { show(); fn(+el.value); });
    show();
    return function (v) { el.value = v; show(); };
  }
  function reset(host, fn) { host.querySelector('[data-viz-reset]').addEventListener('click', fn); }

  /* ================================================================ 1. tuning gradient boosting */
  var GC = D.gb_curves, STG = GC.stages;
  window.Chart.register('viz-w11-gbtune', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { lr: '0.1', depth: '3', sub: '1.0', n: STG.length - 1 }, st = Object.assign({}, DEF);
    function cur() {                         // keys are written by Python, e.g. "0.1|3|1.0": match numerically
      var k = Object.keys(GC.curves).filter(function (q) {
        var v = q.split('|');
        return +v[0] === +st.lr && +v[1] === +st.depth && +v[2] === +st.sub;
      })[0];
      return GC.curves[k];
    }
    function draw() {
      var c = cur(), n = STG[st.n];
      stage.innerHTML = '<div data-a></div>';
      var f = window.Chart.frame(stage.querySelector('[data-a]'), { height: 290, margin: { top: 30, right: 16, bottom: 44, left: 56 },
        title: 'Training and validation log-loss against the number of trees' });
      var x = d3.scaleLog().domain([1, GC.max_trees]).range([0, f.w]);
      var all = c.train_logloss.concat(c.val_logloss);
      var y = d3.scaleLinear().domain([0, Math.min(0.6, d3.max(all) * 1.05)]).range([f.h, 0]).clamp(true);
      window.Chart.axes(f, x, y, { xLabel: 'Number of trees (log scale)', yLabel: 'Log-loss (lower is better)', yTicks: 5,
        xTickValues: [1, 2, 5, 10, 20, 50, 100, 200, 400], xFormat: d3.format('d') });
      f.svg.append('text').attr('x', 6).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('Rate ' + st.lr + ', depth ' + st.depth + ', subsample ' + st.sub);
      [['train_logloss', '5,3', 'var(--cat-3)', 'training folds'], ['val_logloss', null, 'var(--cat-1)', 'held-out folds']].forEach(function (s, i) {
        f.g.append('path').datum(c[s[0]]).attr('fill', 'none').attr('stroke', s[2]).attr('stroke-width', 2.2)
          .attr('stroke-dasharray', s[1])
          .attr('d', d3.line().x(function (_, k) { return x(STG[k]); }).y(function (v) { return y(v); }));
        f.g.append('text').attr('x', f.w - 4).attr('y', 14 + i * 14).attr('text-anchor', 'end').style('font-size', '11px')
          .attr('fill', s[2]).text((i ? '— ' : '- - ') + s[3]);
      });
      f.g.append('line').attr('x1', x(n)).attr('x2', x(n)).attr('y1', 0).attr('y2', f.h).attr('stroke', 'var(--cat-4)').attr('stroke-dasharray', '4,3');
      f.g.append('circle').attr('cx', x(c.best_trees)).attr('cy', y(c.best_val_logloss)).attr('r', 5).attr('fill', 'var(--cat-1)').attr('stroke', '#222');
      var vl = c.val_logloss[st.n], va = c.val_auc[st.n];
      U.setMetric('w11t-best', String(c.best_trees), 'trees with the lowest held-out log-loss');
      U.setMetric('w11t-bestll', f3(c.best_val_logloss), 'held-out log-loss there (AUC ' + f3(c.val_auc_at_best) + ')');
      U.setMetric('w11t-n', f3(vl), 'held-out log-loss at ' + n + ' tree' + (n > 1 ? 's' : ''));
      U.setMetric('w11t-auc', f3(va), 'held-out ROC AUC at ' + n + ' tree' + (n > 1 ? 's' : ''));
      var over = c.val_logloss_at_max - c.best_val_logloss;
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>With these settings the held-out log-loss is lowest after <strong>' + c.best_trees + '</strong> trees (' +
        f3(c.best_val_logloss) + ') and is ' + f3(c.val_logloss_at_max) + ' after ' + GC.max_trees + ' trees' +
        (over > 0.02 ? ': adding trees beyond the minimum fits noise, while the training loss keeps falling.' :
          ': little overfitting within ' + GC.max_trees + ' trees at this learning rate.') + ' Each curve is the mean over the same ' +
        'five folds of the 1,500 training proteins; the 500 test proteins are not used here.</p>' +
        '<p><strong>Question.</strong> Set depth 6 and rate 1.0, then rate 0.03. What do the learning rate and the tree depth do to the ' +
        'number of trees you need, and to how quickly the ensemble overfits? Does subsampling (0.5) help?</p>';
      alt.innerHTML = U.altTable('Held-out (CV) log-loss and ROC AUC for rate ' + st.lr + ', depth ' + st.depth + ', subsample ' + st.sub + '.',
        ['Trees', 'Training log-loss', 'Held-out log-loss', 'Held-out ROC AUC'],
        STG.map(function (s, k) { return [String(s), f3(c.train_logloss[k]), f3(c.val_logloss[k]), f3(c.val_auc[k])]; })
          .filter(function (_, k) { return [0, 1, 2, 4, 9, 18, 19, 23, 28, 34, 35, 40, 45, STG.length - 1].indexOf(k) >= 0; }));
    }
    var sLr = seg(host, 'w11t-lr', function (v) { st.lr = v; draw(); });
    var sD = seg(host, 'w11t-depth', function (v) { st.depth = v; draw(); });
    var sS = seg(host, 'w11t-sub', function (v) { st.sub = v; draw(); });
    var sN = slider(host, 'w11t-trees', function (v) { return String(STG[v]); }, function (v) { st.n = v; draw(); });
    reset(host, function () { st = Object.assign({}, DEF); sLr(st.lr); sD(st.depth); sS(st.sub); sN(st.n); draw(); });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ================================================================ 2. importance */
  var NICE = function (k) {
    if (k.indexOf('frac_') === 0) return 'fraction of ' + k.slice(5);
    return { log_length: 'log length', max_hydropathy_19: 'max hydropathy (19-window)',
             nterm_hydropathy_25: 'N-terminal hydropathy (first 25)' }[k] || k;
  };
  window.Chart.register('viz-w11-importance', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var I = D.importance, DEF = { top: '10' }, st = Object.assign({}, DEF);
    function draw() {
      var keys = I.perm_order.slice(0, +st.top);
      stage.innerHTML = '<div data-a></div>';
      var f = window.Chart.frame(stage.querySelector('[data-a]'), { height: 26 * keys.length + 80,
        margin: { top: 42, right: 20, bottom: 40, left: 205 }, title: 'Impurity and permutation importance' });
      var mx = d3.max(keys, function (k) { return Math.max(I.impurity[k], I.perm_mean[k] + I.perm_sd[k]); });
      var x = d3.scaleLinear().domain([Math.min(0, d3.min(keys, function (k) { return I.perm_mean[k] - I.perm_sd[k]; })), mx * 1.05]).range([0, f.w]);
      var y = d3.scaleBand().domain(keys).range([0, f.h]).padding(0.2);
      f.g.append('g').attr('transform', 'translate(0,' + f.h + ')').call(d3.axisBottom(x).ticks(f.w < 320 ? 3 : 5));
      f.g.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', f.h).attr('stroke', '#333');
      [['var(--cat-3)', 'impurity (training data, sums to 1)'], ['var(--cat-1)', 'permutation: drop in test ROC AUC (± 1 SD)']].forEach(function (s, i) {
        var lg = f.svg.append('g').attr('transform', 'translate(6,' + (14 + i * 15) + ')');
        lg.append('rect').attr('width', 10).attr('height', 10).attr('y', -8).attr('fill', s[0]);
        lg.append('text').attr('x', 15).attr('y', 1).style('font-size', '11px').text(s[1]);
      });
      keys.forEach(function (k) {
        var y0 = y(k), h = y.bandwidth() / 2;
        f.g.append('rect').attr('x', x(0)).attr('y', y0).attr('width', x(I.impurity[k]) - x(0)).attr('height', h - 1).attr('fill', 'var(--cat-3)');
        var p = I.perm_mean[k];
        f.g.append('rect').attr('x', x(Math.min(0, p))).attr('y', y0 + h).attr('width', Math.abs(x(p) - x(0))).attr('height', h - 1).attr('fill', 'var(--cat-1)');
        f.g.append('line').attr('x1', x(p - I.perm_sd[k])).attr('x2', x(p + I.perm_sd[k])).attr('y1', y0 + 1.5 * h).attr('y2', y0 + 1.5 * h).attr('stroke', '#222');
        f.g.append('text').attr('x', -6).attr('y', y0 + h + 4).attr('text-anchor', 'end').style('font-size', '11px').text(NICE(k));
      });
      var top = I.perm_order[0];
      U.setMetric('w11i-top', NICE(top), 'largest permutation importance');
      U.setMetric('w11i-drop', f3(I.perm_mean[top]), 'test ROC AUC lost when it is shuffled');
      U.setMetric('w11i-med', f3(I.nterm_hydropathy_by_class.with_signal_peptide_median) + ' vs ' +
        f3(I.nterm_hydropathy_by_class.without_median), 'median N-terminal hydropathy: with vs without a signal peptide');
      var ev = D.label_evidence, sa = ev['sequence analysis'] || 0, tot = 0;
      Object.keys(ev).forEach(function (k) { tot += ev[k]; });
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>The boosted model relies above all on <strong>' + NICE(top) + '</strong>. That agrees with what biologists know about ' +
        'signal peptides (a hydrophobic core near the N-terminus), but the importance measures the model, not the biology. ' +
        sa + ' of the ' + tot + ' signal-peptide labels come from sequence analysis (agreement of prediction tools that themselves ' +
        'look for that hydrophobic core), so the model partly learns to agree with those tools.</p>' +
        '<p><strong>Question.</strong> Which features rank differently under the two measures, and why can impurity importance be ' +
        'large for a feature whose permutation importance is near zero?</p>';
      alt.innerHTML = U.altTable('Importance of each descriptor for the chosen gradient-boosting model.',
        ['Descriptor', 'Impurity (training)', 'Permutation (test AUC drop)', 'SD'],
        I.perm_order.map(function (k) { return [NICE(k), f3(I.impurity[k]), f3(I.perm_mean[k]), f3(I.perm_sd[k])]; }));
    }
    var sT = seg(host, 'w11i-n', function (v) { st.top = v; draw(); });
    reset(host, function () { st = Object.assign({}, DEF); sT(st.top); draw(); });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ================================================================ 3. the adaptation ladder */
  var LAD = D.ladder, LR_ = LAD.rows;
  var KIND = { majority: 'base', logreg_desc: 'desc', rf_desc: 'desc', hgb_desc: 'desc', logreg_esm_whole: 'frozen',
               logreg_esm_nterm: 'frozen', hgb_esm_nterm: 'frozen', ft_lora: 'ft', ft_full: 'ft' };
  var COL = { base: '#c9d3dc', desc: GREY, frozen: 'var(--cat-3)', ft: 'var(--cat-1)' };
  var KLAB = { desc: 'descriptors', frozen: 'frozen ESM-2', ft: 'fine-tuned' };
  var SHORT = { majority: 'Majority class', logreg_desc: 'Descriptors + LR', rf_desc: 'Descriptors + forest',
                hgb_desc: 'Descriptors + boosting', logreg_esm_whole: 'Frozen, whole seq. + LR',
                logreg_esm_nterm: 'Frozen, first 100 + LR', hgb_esm_nterm: 'Frozen, first 100 + boosting',
                ft_lora: 'LoRA fine-tuning', ft_full: 'Full fine-tuning' };
  window.Chart.register('viz-w11-ladder', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { view: 'auc' }, st = Object.assign({}, DEF);
    var keys = LAD.order.filter(function (k) { return k !== 'majority'; });
    function trainable(k) { return LR_[k].trainable; }
    function draw() {
      stage.innerHTML = '<div data-a></div>';
      var auc = st.view === 'auc';
      var f = window.Chart.frame(stage.querySelector('[data-a]'), { height: 30 * keys.length + 74,
        margin: { top: 44, right: 64, bottom: 40, left: 172 }, title: auc ? 'Test ROC AUC with 95% interval' : 'Trainable parameters' });
      var x = auc ? d3.scaleLinear().domain([0.9, 1.0]).range([0, f.w]).clamp(true)
                  : d3.scaleLog().domain([10, 2e7]).range([0, f.w]);
      var y = d3.scaleBand().domain(keys).range([0, f.h]).padding(0.25);
      f.g.append('g').attr('transform', 'translate(0,' + f.h + ')').call(d3.axisBottom(x).ticks(f.w < 320 ? 3 : 5, auc ? '.2f' : '~s'));
      f.g.append('text').attr('x', f.w / 2).attr('y', f.h + 34).attr('text-anchor', 'middle').style('font-size', '11px')
        .text(auc ? '500 test proteins, used once per pipeline' : 'parameters fitted to the 1,200 labelled proteins (log scale)');
      ['desc', 'frozen', 'ft'].forEach(function (kd, i) {
        var lg = f.svg.append('g').attr('transform', 'translate(' + (6 + i * (f.w < 360 ? 105 : 140)) + ',30)');
        lg.append('circle').attr('cx', 5).attr('cy', 0).attr('r', 5).attr('fill', COL[kd]).attr('stroke', '#222');
        lg.append('text').attr('x', 14).attr('y', 4).style('font-size', '11px').text(KLAB[kd]);
      });
      f.svg.append('text').attr('x', 6).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('Signal peptides: identical fit / validation / test proteins for every rung');
      keys.forEach(function (k) {
        var r = LR_[k], cy = y(k) + y.bandwidth() / 2, c = COL[KIND[k]];
        if (auc) {
          var ci = r.ci95 || r.ci95_seed0;
          f.g.append('line').attr('x1', x(ci[0])).attr('x2', x(ci[1])).attr('y1', cy).attr('y2', cy).attr('stroke', c).attr('stroke-width', 3);
          if (r.test_auc_seeds) r.test_auc_seeds.forEach(function (a) {
            f.g.append('circle').attr('cx', x(a)).attr('cy', cy - 7).attr('r', 2.6).attr('fill', '#333');
          });
          f.g.append('circle').attr('cx', x(r.test_auc)).attr('cy', cy).attr('r', 6).attr('fill', c).attr('stroke', '#222');
          f.g.append('text').attr('x', f.w + 6).attr('y', cy + 4).style('font-size', '11px').text(f3(r.test_auc));
        } else {
          var tp = trainable(k);
          if (tp) {
            f.g.append('rect').attr('x', 0).attr('y', y(k)).attr('width', x(tp)).attr('height', y.bandwidth()).attr('fill', c);
            f.g.append('text').attr('x', f.w + 6).attr('y', cy + 4).style('font-size', '11px').text(d3.format('~s')(tp));
          } else {
            f.g.append('text').attr('x', 4).attr('y', cy + 4).style('font-size', '11px').text('trees: not a parameter count');
          }
        }
        f.g.append('text').attr('x', -8).attr('y', cy + 4).attr('text-anchor', 'end').style('font-size', '11px').text(SHORT[k]);
      });
      var lo = LR_.ft_lora, fu = LR_.ft_full, fr = LR_.logreg_esm_nterm, ds = LR_.hgb_desc, pd = D.ladder_paired;
      U.setMetric('w11l-desc', f3(ds.test_auc), 'descriptors + gradient boosting');
      U.setMetric('w11l-frozen', f3(fr.test_auc), 'frozen ESM-2 (first 100) + logistic regression');
      U.setMetric('w11l-lora', f3(lo.test_auc) + ' ± ' + f3(lo.test_auc_sd), 'LoRA, mean ± SD of 3 seeds; ' + num(lo.trainable) + ' trainable');
      U.setMetric('w11l-full', f3(fu.test_auc) + ' ± ' + f3(fu.test_auc_sd), 'full fine-tuning, 3 seeds; ' + num(fu.trainable) + ' trainable');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>Every rung saw the same 1,200 labelled proteins, chose its settings on the same 300 validation proteins and was scored ' +
        'once on the same 500 test proteins. LoRA minus the frozen first-100 head (seed 0): ' + sg(pd.lora_seed0_minus_frozen_nterm.diff) +
        ' (95% CI ' + sg(pd.lora_seed0_minus_frozen_nterm.ci95[0]) + ' to ' + sg(pd.lora_seed0_minus_frozen_nterm.ci95[1]) + ', which ' + z0(pd.lora_seed0_minus_frozen_nterm.ci95) + ' zero); full ' +
        'fine-tuning minus the same head: ' + sg(pd.full_seed0_minus_frozen_nterm.diff) + ' (' + sg(pd.full_seed0_minus_frozen_nterm.ci95[0]) +
        ' to ' + sg(pd.full_seed0_minus_frozen_nterm.ci95[1]) + ', which ' + z0(pd.full_seed0_minus_frozen_nterm.ci95) + ' zero). Compare the whole-sequence and first-100 frozen rows: what you ' +
        'pool matters before any fine-tuning.</p>' +
        '<p><strong>Question.</strong> Switch to trainable parameters. How many more parameters does each rung fit to the same ' +
        '1,200 proteins, and does the test evidence justify the extra cost and the extra validation burden?</p>';
      alt.innerHTML = U.altTable('The adaptation ladder on identical proteins.',
        ['Pipeline', 'Validation AUC', 'Test ROC AUC', '95% CI', 'Average precision', 'Trainable parameters'],
        LAD.order.map(function (k) {
          var r = LR_[k], ci = r.ci95 || r.ci95_seed0;
          return [r.label, f3(r.val_auc), f3(r.test_auc) + (r.test_auc_sd != null ? ' ± ' + f3(r.test_auc_sd) : ''),
                  f3(ci[0]) + '–' + f3(ci[1]), f3(r.test_ap), r.trainable != null ? num(r.trainable) : 'trees'];
        }));
    }
    var sV = seg(host, 'w11l-view', function (v) { st.view = v; draw(); });
    reset(host, function () { st = Object.assign({}, DEF); sV(st.view); draw(); });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ================================================================ 4. zero-shot scan */
  var Z = D.zero_shot, AAS = Z.alphabet.split('');
  window.Chart.register('viz-w11-zeroshot', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var L = Z.wild_type.length, DEF = { pos: 11 }, st = Object.assign({}, DEF);
    function draw() {
      stage.innerHTML = '<div data-a></div>';
      var f = window.Chart.frame(stage.querySelector('[data-a]'), { height: 380, margin: { top: 30, right: 12, bottom: 44, left: 34 },
        title: 'Zero-shot substitution scores for the insulin signal peptide' });
      f.svg.attr('class', 'w11-heat');
      var x = d3.scaleBand().domain(d3.range(L)).range([0, f.w]).padding(0.04);
      var y = d3.scaleBand().domain(AAS).range([0, f.h]).padding(0.04);
      var col = d3.scaleDiverging(d3.interpolateRdBu).domain([-8, 0, 8]).clamp(true);
      f.svg.append('text').attr('x', 6).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('INS (P01308), residues 1–24; red = less plausible than the wild type');
      Z.scores.forEach(function (row, p) {
        row.forEach(function (s, a) {
          var wt = AAS[a] === Z.wild_type[p];
          f.g.append('rect').attr('x', x(p)).attr('y', y(AAS[a])).attr('width', x.bandwidth()).attr('height', y.bandwidth())
            .attr('fill', wt ? '#fff' : col(s)).attr('class', p === st.pos ? 'sel' : null)
            .style('cursor', 'pointer').on('click', function () { st.pos = p; setP(p); draw(); });
        });
      });
      f.g.append('g').attr('transform', 'translate(0,' + f.h + ')').call(d3.axisBottom(x).tickFormat(function (p) {
        return Z.wild_type[p] + (f.w > 500 || p % 2 === 0 ? '' : ''); }).tickSize(0)).selectAll('text').style('font-size', '10px');
      f.g.append('g').call(d3.axisLeft(y).tickSize(0)).selectAll('text').style('font-size', '10px');
      f.g.append('text').attr('x', f.w / 2).attr('y', f.h + 32).attr('text-anchor', 'middle').style('font-size', '11px')
        .text('wild-type residue at each position (white cell = the wild type)');
      var row = Z.scores[st.pos], ord = d3.range(20).filter(function (a) { return AAS[a] !== Z.wild_type[st.pos]; })
        .sort(function (a, b) { return row[a] - row[b]; });
      U.setMetric('w11z-pos', Z.wild_type[st.pos] + (st.pos + 1), 'selected position (wild type and number)');
      U.setMetric('w11z-worst', Z.wild_type[st.pos] + (st.pos + 1) + AAS[ord[0]] + ': ' + f3(row[ord[0]]), 'least plausible substitution');
      U.setMetric('w11z-best', Z.wild_type[st.pos] + (st.pos + 1) + AAS[ord[ord.length - 1]] + ': ' + f3(row[ord[ord.length - 1]]), 'most plausible substitution');
      var hyd = 'AILMFVW', ch = 'DEKR', mh = 0, mc = 0, nh = 0, nc = 0;
      for (var p = 5; p < 17; p++) {
        AAS.forEach(function (a, k) { if (a === Z.wild_type[p]) return; if (hyd.indexOf(a) >= 0) { mh += Z.scores[p][k]; nh++; } if (ch.indexOf(a) >= 0) { mc += Z.scores[p][k]; nc++; } });
      }
      U.setMetric('w11z-core', f3(mc / nc) + ' vs ' + f3(mh / nh), 'positions 6–17: mean score to charged vs to hydrophobic residues');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>No labels were used. Each position was masked in turn inside the full 110-residue precursor and ESM-2 (8M) was asked how ' +
        'plausible each residue is there; the score is log p(substitute) − log p(wild type). In the hydrophobic core (positions 6–17) ' +
        'substitutions to charged residues score ' + f3(mc / nc) + ' on average and to hydrophobic residues ' + f3(mh / nh) + '. ' +
        'This is the idea behind zero-shot variant-effect prediction. It is an illustration on one protein with the smallest ESM-2, ' +
        'not a validated prediction: a score is a plausibility under the pretraining data, not a measured effect on secretion.</p>' +
        '<p><strong>Question.</strong> Click positions in the core and near the cleavage site (positions 20–24). Where does the model ' +
        'tolerate substitutions, and what experiment would you need before calling any of these variants damaging?</p>';
      alt.innerHTML = U.altTable('Masked-marginal scores at position ' + (st.pos + 1) + ' (wild type ' + Z.wild_type[st.pos] + ').',
        ['Substitute', 'Score'], ord.map(function (a) { return [AAS[a], f3(row[a])]; }));
    }
    var setP = slider(host, 'w11z-slider', function (v) { return Z.wild_type[v] + (v + 1); }, function (v) { st.pos = v; draw(); });
    reset(host, function () { st = Object.assign({}, DEF); setP(st.pos); draw(); });
    window.Chart.responsive(stage, draw);
    draw();
  });

  /* ================================================================ 5. LoRA arithmetic */
  // ESM-2 family (Lin et al. 2023): layers and hidden size; nominal sizes from the model names
  var FAM = { '8M': [6, 320, 7.5e6], '35M': [12, 480, 35e6], '150M': [30, 640, 150e6], '650M': [33, 1280, 650e6] };
  function loraCount(model, r, tgt) {
    var L = FAM[model][0], d = FAM[model][1];
    var attn = { qv: 2, qkvo: 4 }[tgt === 'all' ? 'qkvo' : tgt];
    var n = L * attn * r * (d + d);
    if (tgt === 'all') n += L * (r * (d + 4 * d) + r * (4 * d + d));        // feed-forward up (d x 4d) and down (4d x d)
    return n;
  }
  window.W11 = { loraCount: loraCount };
  window.Chart.register('viz-w11-lora', function (host) {
    var U = window.UI, stage = host.querySelector('[data-viz-stage]'), alt = host.querySelector('[data-viz-alt]');
    var DEF = { model: '8M', r: 8, tgt: 'qv' }, st = Object.assign({}, DEF);
    var RANKS = [1, 2, 4, 8, 16, 32, 64];
    function draw() {
      var n = loraCount(st.model, st.r, st.tgt), back = FAM[st.model][2], A = D.lora_arith;
      stage.innerHTML = '<div data-a></div>';
      var f = window.Chart.frame(stage.querySelector('[data-a]'), { height: 240, margin: { top: 30, right: 70, bottom: 44, left: 64 },
        title: 'LoRA trainable parameters against rank' });
      var x = d3.scaleBand().domain(RANKS).range([0, f.w]).padding(0.25);
      var y = d3.scaleLog().domain([100, 1e9]).range([f.h, 0]);
      window.Chart.axes(f, x, y, { xLabel: 'LoRA rank r', yLabel: 'parameters (log)', yTicks: 4, yFormat: d3.format('~s') });
      f.svg.append('text').attr('x', 6).attr('y', 15).style('font-size', '12px').style('font-weight', 600)
        .text('ESM-2 ' + st.model + ' (' + FAM[st.model][0] + ' layers, hidden size ' + FAM[st.model][1] + ')');
      RANKS.forEach(function (r) {
        var v = loraCount(st.model, r, st.tgt);
        f.g.append('rect').attr('x', x(r)).attr('y', y(v)).attr('width', x.bandwidth()).attr('height', f.h - y(v))
          .attr('fill', r === st.r ? 'var(--cat-1)' : GREY);
      });
      f.g.append('line').attr('x1', 0).attr('x2', f.w).attr('y1', y(back)).attr('y2', y(back)).attr('stroke', 'var(--cat-3)').attr('stroke-dasharray', '5,3');
      f.g.append('text').attr('x', f.w + 4).attr('y', y(back) + 4).style('font-size', '11px').attr('fill', 'var(--cat-3)').text('backbone');
      var per = st.r * 2 * FAM[st.model][1];
      U.setMetric('w11r-per', num(per), 'per adapted d × d matrix: r(d + d)');
      U.setMetric('w11r-tot', num(n), 'LoRA parameters (adapters only)');
      U.setMetric('w11r-pct', (100 * n / back).toFixed(3) + '%', 'of the ~' + st.model + ' backbone');
      U.setMetric('w11r-check', num(A.total_trainable), 'our 8M LoRA run (rank 8, query+value, + head), as counted by peft');
      host.querySelector('[data-viz-note]').innerHTML =
        '<p>LoRA keeps a pretrained weight matrix W (d × k) frozen and learns W + BA, with B (d × r) and A (r × k): r(d + k) ' +
        'parameters instead of d·k. For the lab model (ESM-2 8M, d = 320, 6 layers, rank 8 on query and value) that is ' +
        num(A.per_matrix) + ' per matrix × ' + A.matrices + ' matrices = ' + num(A.lora_total) + ', plus the ' + num(A.head) +
        '-parameter classification head = ' + num(A.total_trainable) + ', exactly the number peft reported, against ' +
        num(A.backbone_params) + ' for full fine-tuning. Backbone sizes for the larger models are the nominal sizes in their names.</p>' +
        '<p><strong>Question.</strong> Fewer trainable parameters lowers memory and the risk of overfitting a small labelled set. Does it ' +
        'remove the need for a validation set and a single, untouched test set?</p>';
      alt.innerHTML = U.altTable('LoRA parameters for ESM-2 ' + st.model + ' by rank.', ['Rank', 'LoRA parameters', 'Share of backbone'],
        RANKS.map(function (r) { var v = loraCount(st.model, r, st.tgt); return [String(r), num(v), (100 * v / back).toFixed(3) + '%']; }));
    }
    var sM = seg(host, 'w11r-model', function (v) { st.model = v; draw(); });
    var sT = seg(host, 'w11r-tgt', function (v) { st.tgt = v; draw(); });
    var sR = slider(host, 'w11r-rank', function (v) { return String(RANKS[v]); }, function (v) { st.r = RANKS[v]; draw(); });
    reset(host, function () { st = Object.assign({}, DEF); sM(st.model); sT(st.tgt); sR(3); draw(); });
    window.Chart.responsive(stage, draw);
    draw();
  });
})();
