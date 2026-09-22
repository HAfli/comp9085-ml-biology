/* Week 11 - Fine-tuning simulator.
 *
 * This figure does two different things and it is important that a student can
 * tell which is which, so the interface separates them explicitly.
 *
 *   EXACT.       The parameter arithmetic. Given an architecture and a LoRA
 *                configuration, the trainable-parameter counts, the percentage
 *                of the backbone and the optimiser-state memory ratio are
 *                computed exactly. There is nothing approximate about them.
 *
 *   SIMULATED.   The performance curves. A real fine-tune cannot run in a
 *                browser tab, so the curves come from a transparent parametric
 *                model whose form and coefficients are printed on screen. Its
 *                qualitative shape is anchored to the learning curve actually
 *                measured on the real WDBC data by build script 02, which is
 *                drawn alongside for comparison.
 *
 * It is never presented as a record of measured fine-tuning results.
 */
(function () {
  'use strict';

  window.Chart.register('viz-fine-tuning', function (host) {
    var B = window.BENCHMARKS;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    /* Architectural presets. Total parameter counts are the published figures;
       the layer and hidden-size fields are the values you set for the
       arithmetic and are labelled as your configuration, not as a claim about
       the released checkpoint. */
    var PRESETS = {
      small: { label: 'Small encoder (~117M class, e.g. DNABERT-2 scale)',
               layers: 12, dModel: 768, total: 117e6 },
      medium: { label: 'Mid-size protein model (~650M class, e.g. ESM-2 650M scale)',
                layers: 33, dModel: 1280, total: 650e6 },
      large: { label: 'Large model (~2.5B class, e.g. Nucleotide Transformer 2.5B scale)',
               layers: 32, dModel: 2560, total: 2500e6 }
    };

    var state = {
      preset: 'small', rank: 8, targets: 2, method: 'lora',
      nLabels: 500, epochs: 3, frozen: 100
    };

    /* ---- The exact half ------------------------------------------------ */
    function arithmetic() {
      var p = PRESETS[state.preset];
      var d = p.dModel, L = p.layers, r = state.rank, t = state.targets;

      /* LoRA replaces the update to a d x d projection with A (d x r) and
         B (r x d), so each adapted matrix contributes r(d + d) parameters. */
      var perMatrix = r * (d + d);
      var lora = perMatrix * t * L;

      /* A classifier head on top of the pooled representation: d x nClasses
         plus the bias. Two classes here. */
      var head = d * 2 + 2;

      var trainable;
      if (state.method === 'full') trainable = p.total + head;
      else if (state.method === 'lora') trainable = lora + head;
      else if (state.method === 'head') trainable = head;
      else trainable = p.total * (1 - state.frozen / 100) + head;

      return {
        preset: p, perMatrix: perMatrix, lora: lora, head: head,
        trainable: trainable,
        pct: trainable / p.total * 100,
        /* Adam keeps two optimiser states per trainable parameter in addition
           to the gradient, so the optimiser memory scales with the trainable
           count while the frozen weights only need to be held for the forward
           pass. */
        optimiserMemoryRatio: trainable / (p.total + head)
      };
    }

    /* ---- The simulated half -------------------------------------------- */
    /* A saturating power law in the number of labels, with a ceiling that
       depends on the adaptation method and a small-data penalty that grows
       with the number of trainable parameters. Every coefficient is shown on
       screen. */
    var SIM = {
      ceiling: { head: 0.905, lora: 0.945, partial: 0.938, full: 0.955 },
      rate: 0.42,
      n0: 40,
      overfitPenalty: { head: 0.0, lora: 0.35, partial: 0.7, full: 1.6 }
    };

    function simulate(method, n) {
      var a = arithmetic();
      var ceil = SIM.ceiling[method];
      var base = 0.5 + (ceil - 0.5) *
                 (1 - Math.pow(SIM.n0 / (SIM.n0 + n), SIM.rate));
      /* Overfitting penalty: proportional to trainable parameters per label. */
      var perLabel = Math.log10(1 + a.trainable / Math.max(1, n)) / 8;
      var penalty = SIM.overfitPenalty[method] * perLabel * 0.55;
      return Math.max(0.5, Math.min(0.99, base - penalty));
    }

    function draw() {
      var wide = stage.clientWidth > 700;
      var f = window.Chart.frame(stage, {
        height: wide ? 330 : 640,
        margin: { top: 26, right: 18, bottom: 46, left: 58 },
        title: 'Simulated adaptation curves, and the real learning curve measured on WDBC'
      });

      var panelW = wide ? (f.w - 48) / 2 : f.w;
      var panelH = wide ? f.h : (f.h - 64) / 2;

      /* ---- Panel 1: SIMULATED adaptation curves ---- */
      var g1 = f.g.append('g');
      g1.append('text').attr('class', 'chart-title').attr('y', -10)
        .attr('fill', 'var(--warn)')
        .text('SIMULATED: performance against labelled examples');

      var x = d3.scaleLog().domain([20, 50000]).range([0, panelW]);
      var y = d3.scaleLinear().domain([0.5, 1]).range([panelH, 0]);

      g1.selectAll('line.grid-line').data(y.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
        .attr('y1', y).attr('y2', y);

      var ns = d3.range(1.3, 4.71, 0.05).map(function (e) { return Math.pow(10, e); });
      var methods = [
        { k: 'head', label: 'frozen embeddings + head', c: 'var(--stage-1)' },
        { k: 'lora', label: 'LoRA', c: 'var(--stage-4)' },
        { k: 'partial', label: 'partial unfreeze', c: 'var(--stage-2)' },
        { k: 'full', label: 'full fine-tuning', c: 'var(--stage-3)' }
      ];

      methods.forEach(function (m) {
        var pts = ns.map(function (n) { return { n: n, v: simulate(m.k, n) }; });
        g1.append('path').attr('fill', 'none')
          .attr('stroke', m.c)
          .attr('stroke-width', m.k === state.method ? 3 : 1.6)
          .attr('opacity', m.k === state.method ? 1 : 0.45)
          .attr('stroke-dasharray', '6 3')
          .attr('d', d3.line().x(function (p) { return x(p.n); })
                              .y(function (p) { return y(p.v); })(pts));
      });

      var cur = simulate(state.method, state.nLabels);
      g1.append('line')
        .attr('x1', x(state.nLabels)).attr('x2', x(state.nLabels))
        .attr('y1', 0).attr('y2', panelH)
        .attr('stroke', 'var(--ink-3)').attr('stroke-dasharray', '3 3');
      g1.append('circle')
        .attr('cx', x(state.nLabels)).attr('cy', y(cur)).attr('r', 6)
        .attr('fill', methods.filter(function (m) { return m.k === state.method; })[0].c)
        .attr('stroke', '#fff').attr('stroke-width', 2);

      g1.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x).ticks(4, '~s'));
      g1.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')));
      g1.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
        .text('labelled examples (log scale)');

      /* Watermark, so a screenshot of this panel cannot be mistaken for data. */
      g1.append('text')
        .attr('x', panelW / 2).attr('y', panelH / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '30px').style('font-weight', '800')
        .attr('fill', 'var(--warn)').attr('opacity', 0.10)
        .attr('transform', 'rotate(-14 ' + (panelW / 2) + ' ' + (panelH / 2) + ')')
        .text('SIMULATED');

      /* ---- Panel 2: the REAL measured learning curve ---- */
      var g2 = f.g.append('g').attr('transform',
        wide ? 'translate(' + (panelW + 48) + ',0)'
             : 'translate(0,' + (panelH + 64) + ')');
      g2.append('text').attr('class', 'chart-title').attr('y', -10)
        .attr('fill', 'var(--ok)')
        .text('MEASURED: real learning curve on WDBC');

      var lc = B.learningCurve;
      var x2 = d3.scaleLog()
        .domain([d3.min(lc.logreg, function (d) { return d.n; }),
                 d3.max(lc.logreg, function (d) { return d.n; })])
        .range([0, panelW]);
      var y2 = d3.scaleLinear().domain([0.8, 1]).range([panelH, 0]);

      g2.selectAll('line.grid-line').data(y2.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', panelW)
        .attr('y1', y2).attr('y2', y2);

      var real = [
        { k: 'logreg', label: 'logistic regression', c: 'var(--stage-1)' },
        { k: 'rf', label: 'random forest', c: 'var(--stage-5)' },
        { k: 'tree_d3', label: 'decision tree, depth 3', c: 'var(--stage-4)' }
      ];
      real.forEach(function (m) {
        g2.append('path').attr('fill', 'none')
          .attr('stroke', m.c).attr('stroke-width', 2.2)
          .attr('d', d3.line().x(function (d) { return x2(d.n); })
                              .y(function (d) { return y2(d.acc); })(lc[m.k]));
        var dots = g2.selectAll('circle.' + m.k).data(lc[m.k]).join('circle')
          .attr('class', m.k)
          .attr('cx', function (d) { return x2(d.n); })
          .attr('cy', function (d) { return y2(d.acc); })
          .attr('r', 3.5).attr('fill', m.c).attr('tabindex', 0);
        window.Chart.tips(dots, function (d) {
          return '<strong>' + m.label + '</strong><br>' + d.n +
            ' labelled examples<br>accuracy ' + (d.acc * 100).toFixed(2) +
            '% ± ' + (d.sd * 100).toFixed(1) + '<br><em>measured, 20 repeats</em>';
        });
      });

      g2.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + panelH + ')')
        .call(d3.axisBottom(x2).ticks(4, 'd'));
      g2.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y2).ticks(5).tickFormat(d3.format('.0%')));
      g2.append('text').attr('class', 'axis-label')
        .attr('x', panelW / 2).attr('y', panelH + 36).attr('text-anchor', 'middle')
        .text('labelled training examples (log scale)');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml(
        methods.map(function (m) {
          return { label: 'SIMULATED: ' + m.label, colour: m.c, symbol: 'line' };
        }).concat(real.map(function (m) {
          return { label: 'MEASURED: ' + m.label, colour: m.c, symbol: 'circle' };
        }))));
    }

    function updateMetrics() {
      var a = arithmetic();
      window.UI.setMetric('ft-trainable',
        fmtParams(a.trainable),
        'trainable parameters (exact)');
      window.UI.setMetric('ft-pct',
        a.pct < 0.01 ? a.pct.toFixed(4) + '%' : a.pct.toFixed(2) + '%',
        'of the ' + fmtParams(a.preset.total) + ' backbone',
        a.pct < 1 ? 'good' : null);
      window.UI.setMetric('ft-permatrix', fmtParams(a.perMatrix),
        'per adapted matrix: r(d + d)');
      window.UI.setMetric('ft-sim',
        window.Chart.pct(simulate(state.method, state.nLabels)),
        'SIMULATED, not a measurement');
    }

    function fmtParams(n) {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(Math.round(n));
    }

    function updateExplain() {
      var a = arithmetic();
      var p = a.preset;
      var el = host.querySelector('[data-viz-note]');

      var maths = state.method === 'lora'
        ? '<p><strong>The arithmetic, which is exact.</strong> Each adapted ' +
          'projection is a ' + p.dModel + ' by ' + p.dModel + ' matrix. LoRA ' +
          'replaces its update with two matrices of shape ' + p.dModel + ' by ' +
          state.rank + ' and ' + state.rank + ' by ' + p.dModel + ', so it ' +
          'contributes r(d + d) = ' + state.rank + ' × (' + p.dModel + ' + ' +
          p.dModel + ') = ' + a.perMatrix.toLocaleString() + ' parameters. With ' +
          state.targets + ' adapted matri' + (state.targets === 1 ? 'x' : 'ces') +
          ' per layer across ' + p.layers + ' layers, that is ' +
          state.targets + ' × ' + p.layers + ' × ' + a.perMatrix.toLocaleString() +
          ' = ' + a.lora.toLocaleString() + ', plus ' + a.head.toLocaleString() +
          ' for the classification head. Total trainable: <strong>' +
          a.trainable.toLocaleString() + '</strong>, which is ' +
          (a.pct < 0.01 ? a.pct.toFixed(4) : a.pct.toFixed(3)) +
          '% of the backbone.</p>'
        : state.method === 'head'
        ? '<p><strong>The arithmetic, which is exact.</strong> Nothing in the ' +
          'backbone is trained. Only the classification head, ' + p.dModel +
          ' × 2 + 2 = ' + a.head.toLocaleString() + ' parameters. Note that the ' +
          'embeddings can be computed once and cached, after which every ' +
          'subsequent experiment is a logistic regression on a CPU.</p>'
        : state.method === 'full'
        ? '<p><strong>The arithmetic, which is exact.</strong> Every parameter ' +
          'is trainable: ' + a.trainable.toLocaleString() + '. With Adam, the ' +
          'optimiser holds two additional states per trainable parameter, so ' +
          'the optimiser memory is roughly twice the model size on top of the ' +
          'weights and activations. This is where the GPU requirement comes ' +
          'from, and it scales with the trainable count rather than the model ' +
          'size, which is exactly what parameter-efficient methods exploit.</p>'
        : '<p><strong>The arithmetic, which is exact.</strong> With ' +
          state.frozen + '% of the backbone frozen, ' +
          a.trainable.toLocaleString() + ' parameters remain trainable, which ' +
          'is ' + a.pct.toFixed(1) + '% of the model.</p>';

      var reading =
        '<p><strong>What the two panels are.</strong> The left panel is a ' +
        'simulation, watermarked as such. It comes from a parametric model, ' +
        'printed below, whose shape is the standard saturating learning curve ' +
        'with an added penalty proportional to trainable parameters per ' +
        'labelled example. It illustrates a relationship. It is not a record ' +
        'of anyone\'s fine-tuning run and no number read off it should appear ' +
        'in a report.</p>' +
        '<p>The right panel is real. Those points were measured on the real ' +
        'WDBC data by <code>data/scripts/02_build_benchmarks.py</code>, twenty ' +
        'repeats at each training-set size. They show the same shape: steep ' +
        'gains from very few labels, then flattening. Logistic regression goes ' +
        'from ' + window.Chart.pct(B.learningCurve.logreg[0].acc) + ' at ' +
        B.learningCurve.logreg[0].n + ' examples to ' +
        window.Chart.pct(B.learningCurve.logreg[4].acc) + ' at ' +
        B.learningCurve.logreg[4].n + ', and then gains almost nothing from ' +
        'doubling again. That flattening is why the size of your labelled set, ' +
        'not the size of your model, usually decides which rung of the ' +
        'adaptation ladder you can reach.</p>' +
        '<details style="margin-top:var(--s4)"><summary style="cursor:pointer;' +
        'font-weight:600;font-size:0.88rem">The exact simulation formula</summary>' +
        '<pre style="margin-top:var(--s3)">accuracy(n) = 0.5 + (ceiling − 0.5) × [1 − (n0 / (n0 + n))^rate]\n' +
        '              − penalty(method) × log10(1 + trainable / n) / 8 × 0.55\n\n' +
        'n0     = ' + SIM.n0 + '\n' +
        'rate   = ' + SIM.rate + '\n' +
        'ceiling: head ' + SIM.ceiling.head + ', LoRA ' + SIM.ceiling.lora +
        ', partial ' + SIM.ceiling.partial + ', full ' + SIM.ceiling.full + '\n' +
        'penalty: head ' + SIM.overfitPenalty.head + ', LoRA ' + SIM.overfitPenalty.lora +
        ', partial ' + SIM.overfitPenalty.partial + ', full ' + SIM.overfitPenalty.full +
        '</pre><p class="small mb0">These coefficients were chosen so that the ' +
        'curves reproduce three qualitative facts: more labels help with ' +
        'diminishing returns; methods with more trainable parameters have a ' +
        'higher ceiling; and they are worse than simpler methods when labels ' +
        'are scarce. They are not fitted to any published benchmark, and the ' +
        'absolute values carry no external meaning.</p></details>';

      el.innerHTML = maths + reading;
    }

    function updateAlt() {
      var a = arithmetic();
      var ranks = [4, 8, 16, 32, 64].map(function (r) {
        var per = r * (a.preset.dModel * 2);
        var tot = per * state.targets * a.preset.layers + a.head;
        return [String(r), per.toLocaleString(), tot.toLocaleString(),
                (tot / a.preset.total * 100).toFixed(3) + '%'];
      });

      altBody.innerHTML =
        '<p><strong>Two panels, with different status.</strong> The left panel ' +
        'is a SIMULATION of how each adaptation method\'s performance varies ' +
        'with the number of labelled examples. It is watermarked "SIMULATED" ' +
        'and drawn with dashed lines. The right panel contains REAL measured ' +
        'results: the learning curve of three classical models on the real WDBC ' +
        'dataset, twenty repeats at each training-set size, produced by ' +
        'data/scripts/02_build_benchmarks.py.</p>' +
        '<h4>Exact parameter arithmetic for the current configuration</h4>' +
        '<p>Architecture: ' + window.UI.esc(a.preset.label) + ', configured as ' +
        a.preset.layers + ' layers with hidden size ' + a.preset.dModel +
        '. Method: ' + state.method + '. LoRA rank ' + state.rank + ', ' +
        state.targets + ' adapted matrices per layer.</p>' +
        window.UI.altTable('Trainable parameters as LoRA rank varies.',
          ['Rank r', 'Per adapted matrix', 'Total trainable', '% of backbone'],
          ranks) +
        '<h4>Real measured learning curve on WDBC</h4>' +
        window.UI.altTable(
          'Accuracy against the number of labelled training examples. Mean of ' +
          '20 stratified resamples at each size.',
          ['Labelled examples', 'Logistic regression', 'Random forest',
           'Decision tree (depth 3)'],
          B.learningCurve.logreg.map(function (d, i) {
            return [String(d.n),
                    (d.acc * 100).toFixed(1) + '%',
                    (B.learningCurve.rf[i].acc * 100).toFixed(1) + '%',
                    (B.learningCurve.tree_d3[i].acc * 100).toFixed(1) + '%'];
          })) +
        '<h4>The simulation formula</h4>' +
        '<pre>accuracy(n) = 0.5 + (ceiling − 0.5) × [1 − (n0/(n0+n))^rate]\n' +
        '              − penalty × log10(1 + trainable/n) / 8 × 0.55</pre>' +
        '<p>with n0 = ' + SIM.n0 + ', rate = ' + SIM.rate + ', and per-method ' +
        'ceilings and penalties as listed in the figure. No value from the ' +
        'simulated panel should be reported as a result.</p>';
    }

    function refresh() { draw(); updateMetrics(); updateExplain(); updateAlt(); }

    host.querySelector('#ft-preset').addEventListener('change', function () {
      state.preset = this.value; refresh();
    });
    host.querySelector('#ft-method').addEventListener('change', function () {
      state.method = this.value;
      host.querySelector('[data-ft-lora]').hidden = this.value !== 'lora';
      host.querySelector('[data-ft-frozen]').hidden = this.value !== 'partial';
      refresh();
    });
    [['ft-rank', 'rank'], ['ft-targets', 'targets'],
     ['ft-frozen', 'frozen']].forEach(function (p) {
      host.querySelector('#' + p[0]).addEventListener('input', function () {
        state[p[1]] = +this.value;
        host.querySelector('#' + p[0] + '-val').textContent =
          this.value + (p[1] === 'frozen' ? '%' : '');
        refresh();
      });
    });
    host.querySelector('#ft-labels').addEventListener('input', function () {
      state.nLabels = Math.round(Math.pow(10, +this.value / 100));
      host.querySelector('#ft-labels-val').textContent =
        state.nLabels.toLocaleString();
      refresh();
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { preset: 'small', rank: 8, targets: 2, method: 'lora',
                nLabels: 500, epochs: 3, frozen: 100 };
      host.querySelector('#ft-preset').value = 'small';
      host.querySelector('#ft-method').value = 'lora';
      host.querySelector('#ft-rank').value = 8;
      host.querySelector('#ft-rank-val').textContent = '8';
      host.querySelector('#ft-targets').value = 2;
      host.querySelector('#ft-targets-val').textContent = '2';
      host.querySelector('#ft-labels').value = Math.round(Math.log10(500) * 100);
      host.querySelector('#ft-labels-val').textContent = '500';
      host.querySelector('[data-ft-lora]').hidden = false;
      host.querySelector('[data-ft-frozen]').hidden = true;
      refresh();
    });

    host.querySelector('[data-ft-frozen]').hidden = true;
    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
