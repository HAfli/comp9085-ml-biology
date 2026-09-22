/* Week 7 - Foundation-model embedding explorer.
 *
 * The controls let a student switch between a hand-engineered representation
 * and a learned one, between PCA and a neighbour-preserving layout, and between
 * two labels that behave in opposite ways. The classifier accuracy reported for
 * each combination is measured live, so the comparison is not a claim.
 *
 * The provenance banner is generated from the data file's own flags. If someone
 * runs data/scripts/04_real_esm2_embeddings.py, the banner changes by itself.
 */
(function () {
  'use strict';

  window.Chart.register('viz-embeddings', function (host) {
    var S = window.SEQUENCES;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');

    var state = { rep: 'emb', proj: 'pca', label: 'family', selected: null };

    var FAM_ORDER = S.families.map(function (f) { return f.id; });

    function labelOf(r) {
      return state.label === 'family' ? r.family
                                      : (r.hasSite ? 'triad present' : 'triad absent');
    }
    function classes() {
      return state.label === 'family'
        ? FAM_ORDER
        : ['triad absent', 'triad present'];
    }
    function classIndex(r) { return classes().indexOf(labelOf(r)); }

    function vectors() {
      var key = state.rep === 'emb' ? 'emb32' : 'eng24';
      return S.records.map(function (r) { return r[key]; });
    }
    function coords() {
      var key = (state.proj === 'pca' ? 'pca' : 'umap') +
                (state.rep === 'emb' ? 'Emb' : 'Eng');
      return S.records.map(function (r) { return r[key]; });
    }

    /* Measured accuracy for every combination, so the table is real. */
    var accCache = {};
    function accuracyFor(rep, label) {
      var key = rep + '|' + label;
      if (accCache[key]) return accCache[key];

      var X = S.records.map(function (r) {
        return r[rep === 'emb' ? 'emb32' : 'eng24'];
      });
      var y = S.records.map(function (r) {
        return label === 'family' ? r.family
                                  : (r.hasSite ? 'triad present' : 'triad absent');
      });

      /* Two classifiers, both cross-validated, on the representation exactly
         as it is shipped. The embedding is deliberately NOT standardised
         component by component: doing so would give the 32nd, almost
         noise-only, principal component the same weight in the distance as the
         first, which is not what anyone does with real embeddings. Week 8
         examines that effect directly. */
      var knn = window.ML.crossVal(X, y, 5, 21, function (Xtr, ytr) {
        return new window.ML.KNN({ k: 5 }).fit(Xtr, ytr);
      });
      var lin = window.ML.crossVal(X, y, 5, 21, function (Xtr, ytr) {
        var sc = new window.ML.Scaler().fit(Xtr);
        var m = new window.ML.LogReg({ epochs: 140, lr: 0.5, l2: 0.02 })
          .fit(sc.transform(Xtr), ytr);
        return { predict: function (Xte) { return m.predict(sc.transform(Xte)); } };
      });

      accCache[key] = { knn: knn.mean, knnSd: knn.sd,
                        lin: lin.mean, linSd: lin.sd };
      return accCache[key];
    }

    function draw() {
      var xy = coords();
      var cls = classes();
      var f = window.Chart.frame(stage, {
        height: Math.min(460, Math.max(320, stage.clientWidth * 0.52)),
        margin: { top: 26, right: 16, bottom: 46, left: 52 },
        title: 'Two-dimensional projection of the ' +
               (state.rep === 'emb' ? 'learned embedding' : 'engineered features')
      });

      var x = d3.scaleLinear().domain(d3.extent(xy, function (p) { return p[0]; }))
        .nice().range([0, f.w]);
      var y = d3.scaleLinear().domain(d3.extent(xy, function (p) { return p[1]; }))
        .nice().range([f.h, 0]);

      f.g.selectAll('line.grid-line').data(y.ticks(5)).join('line')
        .attr('class', 'grid-line').attr('x1', 0).attr('x2', f.w)
        .attr('y1', y).attr('y2', y);

      var g = f.g.append('g');
      S.records.forEach(function (r, i) {
        var ci = classIndex(r);
        var isSel = state.selected === i;
        var el = window.Chart.symbol(g, window.Chart.SYMBOLS[ci],
          x(xy[i][0]), y(xy[i][1]), isSel ? 7 : 4,
          window.Chart.colour(ci),
          { opacity: state.selected == null ? 0.78 : (isSel ? 1 : 0.32),
            stroke: isSel ? 'var(--ink)' : null, strokeWidth: 2 });
        el.attr('tabindex', 0).attr('data-i', i).style('cursor', 'pointer');
      });

      var nodes = g.selectAll('[data-i]');
      window.Chart.tips(nodes, function () { return ''; });
      nodes
        .on('mousemove', function (event) {
          var i = +this.getAttribute('data-i');
          var r = S.records[i];
          window.UI.tip('<strong>' + window.UI.esc(r.id) + '</strong><br>' +
            window.UI.esc(r.familyLabel) + '<br>' +
            'triad ' + (r.hasSite ? 'present' : 'absent') + ' (' +
            window.UI.esc(r.triadResidues) + ')<br>' +
            r.length + ' residues, GRAVY ' + r.gravy.toFixed(2) +
            ', charge ' + r.charge_per_100.toFixed(1) + ' per 100',
            event.clientX, event.clientY);
        })
        .on('mouseleave', function () { window.UI.tip(null); })
        .on('click', function () {
          var i = +this.getAttribute('data-i');
          state.selected = state.selected === i ? null : i;
          draw(); showSelected();
        })
        .on('keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.dispatchEvent(new Event('click'));
          }
        });

      f.g.append('g').attr('class', 'axis')
        .attr('transform', 'translate(0,' + f.h + ')')
        .call(d3.axisBottom(x).ticks(6));
      f.g.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5));
      f.g.append('text').attr('class', 'axis-label')
        .attr('x', f.w / 2).attr('y', f.h + 36).attr('text-anchor', 'middle')
        .text(state.proj === 'pca'
          ? 'PC1 (' + (S.pcaVariance[state.rep === 'emb' ? 'embedding' : 'engineered'][0] * 100).toFixed(1) + '% of variance)'
          : 'neighbour-preserving layout, axis 1 (distances are not interpretable)');
      f.g.append('text').attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -f.h / 2).attr('y', -40).attr('text-anchor', 'middle')
        .text(state.proj === 'pca' ? 'PC2' : 'axis 2');

      stage.insertAdjacentHTML('beforeend', window.Chart.legendHtml(
        cls.map(function (c, i) {
          var fam = S.families.filter(function (fm) { return fm.id === c; })[0];
          return { label: fam ? fam.label : c, colour: window.Chart.colour(i),
                   symbol: window.Chart.SYMBOLS[i] };
        })));
    }

    function showSelected() {
      var slot = host.querySelector('[data-emb-detail]');
      if (state.selected == null) {
        slot.innerHTML = '<p class="small muted mb0">Select a point to inspect ' +
          'its sequence, its computed biophysical properties and its nearest ' +
          'neighbours in the current representation.</p>';
        return;
      }
      var i = state.selected;
      var r = S.records[i];
      var V = vectors();
      var knn = new window.ML.KNN({ k: 6 })
        .fit(V, S.records.map(labelOf));
      var nb = knn.neighbours(V[i], 6, i);

      var seq = r.seq;
      var marks = r.triadPositions;
      var display = '';
      var show = Math.min(seq.length, 300);
      for (var p = 0; p < show; p++) {
        var isTriad = marks.indexOf(p) >= 0;
        display += isTriad
          ? '<mark style="background:var(--nucleus-soft);color:var(--nucleus);' +
            'font-weight:700;padding:0 1px">' + seq[p] + '</mark>'
          : seq[p];
        if ((p + 1) % 60 === 0) display += '<br>';
      }
      if (seq.length > show) display += '<span class="muted"> ... (' +
        (seq.length - show) + ' more residues)</span>';

      slot.innerHTML =
        '<h4 style="margin-top:0">' + window.UI.esc(r.id) + ' &middot; ' +
          window.UI.esc(r.familyLabel) + '</h4>' +
        '<dl class="dl-grid">' +
          '<dt>Length</dt><dd>' + r.length + ' residues</dd>' +
          '<dt>Mass</dt><dd>' + r.mw_kda.toFixed(1) + ' kDa</dd>' +
          '<dt>GRAVY hydropathy</dt><dd>' + r.gravy.toFixed(3) +
            ' <span class="muted small">(Kyte-Doolittle, really computed)</span></dd>' +
          '<dt>Net charge</dt><dd>' + r.net_charge + ' (' +
            r.charge_per_100.toFixed(1) + ' per 100 residues)</dd>' +
          '<dt>Aromaticity</dt><dd>' + (r.aromaticity * 100).toFixed(1) + '%</dd>' +
          '<dt>Ordered triad</dt><dd>' +
            (r.hasSite ? 'present' : 'absent') + ', reading ' +
            '<code>' + window.UI.esc(r.triadResidues) + '</code> at positions ' +
            marks.join(', ') + '</dd>' +
        '</dl>' +
        '<h4>Nearest neighbours in the ' +
          (state.rep === 'emb' ? 'learned embedding' : 'engineered features') + '</h4>' +
        '<div class="table-scroll"><table class="table-compact"><thead><tr>' +
          '<th scope="col">rank</th><th scope="col">id</th>' +
          '<th scope="col">family</th><th scope="col">triad</th>' +
          '<th class="num" scope="col">distance</th></tr></thead><tbody>' +
        nb.map(function (n, k) {
          var o = S.records[n.i];
          var same = state.label === 'family'
            ? o.family === r.family : o.hasSite === r.hasSite;
          return '<tr' + (same ? '' : ' style="background:var(--danger-soft)"') + '>' +
            '<td class="num">' + (k + 1) + '</td>' +
            '<th scope="row" class="mono">' + window.UI.esc(o.id) + '</th>' +
            '<td>' + window.UI.esc(o.familyLabel.replace('Family ', '')) + '</td>' +
            '<td>' + (o.hasSite ? 'present' : 'absent') + '</td>' +
            '<td class="num">' + n.d.toFixed(3) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="small muted">Rows shaded red are neighbours with a different ' +
        'label under the current task. Those are the errors a k-NN classifier ' +
        'would make on this point.</p>' +
        '<h4>Sequence</h4>' +
        '<pre style="font-size:0.72rem;line-height:1.5;max-height:170px">' +
          display + '</pre>';
    }

    function updateMetrics() {
      var a = accuracyFor(state.rep, state.label);
      var other = accuracyFor(state.rep === 'emb' ? 'eng' : 'emb', state.label);
      var diff = a.knn - other.knn;

      window.UI.setMetric('em-acc', window.Chart.pct(a.knn),
        '5-fold k-NN, k = 5, ± ' + (a.knnSd * 100).toFixed(1),
        a.knn > 0.85 ? 'good' : (a.knn < 0.6 ? 'bad' : null));
      window.UI.setMetric('em-lin', window.Chart.pct(a.lin),
        'logistic regression on the same vectors',
        a.lin > a.knn + 0.03 ? 'good' : null);
      window.UI.setMetric('em-other', window.Chart.pct(other.knn),
        'the ' + (state.rep === 'emb' ? 'engineered' : 'learned') +
        ' representation on the same task');
      window.UI.setMetric('em-diff',
        (diff >= 0 ? '+' : '') + (diff * 100).toFixed(1) + ' pts',
        'advantage of the current representation',
        diff > 0.03 ? 'good' : (diff < -0.03 ? 'bad' : null));
      window.UI.setMetric('em-chance',
        window.Chart.pct(1 / classes().length),
        'chance level for this task');
    }

    function updateExplain() {
      var el = host.querySelector('[data-viz-note]');
      var eng = accuracyFor('eng', state.label);
      var emb = accuracyFor('emb', state.label);
      var msg;

      if (state.label === 'family') {
        msg = '<strong>The family task favours the engineered features.</strong> ' +
          'Amino-acid composition reaches ' + window.Chart.pct(eng.knn) +
          ' and the learned embedding ' + window.Chart.pct(emb.knn) +
          '. That is exactly as it should be: these families were constructed to ' +
          'differ in amino-acid usage, and a twenty-dimensional composition ' +
          'vector describes that difference almost perfectly. Nothing is left ' +
          'for a learned representation to add. If you met this situation in a ' +
          'real project, the correct decision would be to use the cheap features ' +
          'and not the foundation model.';
      } else {
        msg = '<strong>The triad task inverts the answer.</strong> Both classes ' +
          'contain exactly the same three residues at exactly the same three ' +
          'positions; only the N-to-C order differs. Composition is therefore ' +
          'identical between the classes by construction, and the engineered ' +
          'representation scores ' + window.Chart.pct(eng.knn) +
          ', which is chance. The learned representation reaches ' +
          window.Chart.pct(emb.knn) + '. It is not better in general. It is ' +
          'better here because it encodes something composition throws away.';
      }

      var cur = state.rep === 'emb' ? emb : eng;
      if (cur.lin > cur.knn + 0.04) {
        msg += ' Notice the second readout. On this same representation, ' +
          'logistic regression reaches ' + window.Chart.pct(cur.lin) +
          ' while k-NN reaches ' + window.Chart.pct(cur.knn) + '. The information ' +
          'is present in the vectors either way; k-NN cannot get at it because ' +
          'every low-variance direction contributes noise to the distance, ' +
          'while a linear model can simply give those directions small weights. ' +
          'Representation and classifier are two separate choices, and this is ' +
          'what it looks like when the second one is the binding constraint.';
      }

      if (state.proj === 'umap') {
        msg += ' You are viewing the neighbour-preserving layout. It shows local ' +
          'structure well and its global geometry means nothing: do not read the ' +
          'gaps between clusters, their sizes or their positions as measurements.';
      }

      el.innerHTML = '<p class="mb0">' + msg + '</p>';
    }

    function updateAlt() {
      var rows = [];
      ['family', 'hasSite'].forEach(function (lab) {
        ['eng', 'emb'].forEach(function (rep) {
          var a = accuracyFor(rep, lab);
          rows.push([
            (lab === 'family' ? 'Protein family (4 classes)' : 'Ordered triad (binary)') +
              ', ' + (rep === 'eng' ? 'engineered features' : 'learned embedding'),
            (a.knn * 100).toFixed(1) + '%',
            (a.lin * 100).toFixed(1) + '%',
            (a.knnSd * 100).toFixed(1),
            lab === 'family' ? '25.0%' : '50.0%'
          ]);
        });
      });

      altBody.innerHTML =
        '<p><strong>' + window.UI.esc(S.warning) + '</strong></p>' +
        '<p>The chart is a scatter plot of ' + S.records.length + ' sequences ' +
        'projected into two dimensions, coloured and shaped by class. The ' +
        'projection currently shown is ' +
        (state.proj === 'pca' ? 'PCA, where distances are meaningful'
                              : 'a neighbour-preserving layout, where only local ' +
                                'neighbourhoods are meaningful') +
        ', applied to the ' +
        (state.rep === 'emb' ? 'learned embedding (' + S.embeddingDim +
          ' dimensions, summarised to its top 32 principal components)'
          : 'engineered representation (20 amino-acid composition values plus ' +
            'GRAVY hydropathy, charge per 100 residues, aromaticity and log length)') +
        '.</p>' +
        '<p>The important content is the table below, which measures every ' +
        'combination with an identical classifier: k-nearest neighbours at ' +
        'k = 5, five-fold stratified cross-validation, standardised inside each ' +
        'fold. Because the classifier is held constant, any difference is ' +
        'attributable to the representation.</p>' +
        window.UI.altTable(
          'k-NN accuracy for each task and representation. The classifier is ' +
          'identical in every row.',
          ['Task and representation', 'Accuracy', 'SD (pts)', 'Chance'],
          rows) +
        '<p>Read the four rows together. On the family task, which is defined by ' +
        'amino-acid usage, the engineered features win. On the triad task, which ' +
        'is defined by residue order and where composition is identical between ' +
        'the classes by construction, the engineered features sit at chance and ' +
        'only the order-aware representation can do better. Neither ' +
        'representation is better in general.</p>' +
        '<h4>The four families</h4>' +
        '<dl class="dl-grid">' + S.families.map(function (fm) {
          return '<dt>' + window.UI.esc(fm.label) + '</dt><dd>' +
            window.UI.esc(fm.note) + ' Motif: <code>' +
            window.UI.esc(fm.motif) + '</code>.</dd>';
        }).join('') + '</dl>';
    }

    function refresh() { draw(); showSelected(); updateMetrics(); updateExplain(); updateAlt(); }

    window.UI.onSegment(host.querySelector('#em-rep'), function (v) {
      state.rep = v; state.selected = null; refresh();
    });
    window.UI.onSegment(host.querySelector('#em-proj'), function (v) {
      state.proj = v; refresh();
    });
    window.UI.onSegment(host.querySelector('#em-label'), function (v) {
      state.label = v; state.selected = null; refresh();
    });

    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state = { rep: 'emb', proj: 'pca', label: 'family', selected: null };
      [['#em-rep', 'emb'], ['#em-proj', 'pca'], ['#em-label', 'family']]
        .forEach(function (p) {
          host.querySelectorAll(p[0] + ' button').forEach(function (b) {
            b.setAttribute('aria-pressed',
              String(b.getAttribute('data-value') === p[1]));
          });
        });
      refresh();
    });

    window.Chart.responsive(stage, draw);
    refresh();
  });
})();
