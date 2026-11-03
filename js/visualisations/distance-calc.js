/* Week 8 - Exercise 3: distance calculator.
 *
 * Every worked distance on the Week 8 slides, editable: the movie query (Euclidean,
 * and the full 1-NN ranking under Euclidean and Manhattan), the four-feature table
 * (the corrected arithmetic: sum of squares 66, Euclidean 8.12, Manhattan 14), the
 * scaling example before and after min-max normalisation, weighted Euclidean,
 * Hamming on the weather records and on two DNA sequences, the calorie-ordered
 * food example, and a heterogeneous distance between two real patients.
 */
(function () {
  'use strict';

  window.Chart.register('viz-distance-calc', function (host) {
    var W8 = window.W8, U = window.UI, L = window.WEEK08.lecture;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var esc = U.esc;

    var PRESETS = {
      movie: { kind: 'num', names: ['kicks', 'kisses'], p: [3, 104], q: [18, 90], w: [1, 1],
               note: 'California Man (3, 104) against the unseen film (18, 90): √(15² + 14²) = √421 = 20.52. ' +
                     'The ranking below shows that the nearest film is "He\'s Not Really into Dudes" under either metric.' },
      table: { kind: 'num', names: ['Area', 'Weight', 'Height', 'Capacity'], p: [10, 8, 4, 8], q: [5, 4, 4, 3], w: [1, 1, 1, 1],
               note: 'Corrected slide: 5² + 4² + 0² + 5² = 66, so the Euclidean distance is √66 = 8.12 (the 2025 slide ' +
                     'said 57 and 7.55). Manhattan: 5 + 4 + 0 + 5 = 14.' },
      scaleRaw: { kind: 'num', names: ['Feature A (1–10)', 'Feature B (1–1000)'], p: [5.5, 787], q: [7.5, 567], w: [1, 1],
               note: '(5.5 − 7.5)² = 4 and (787 − 567)² = 48,400: Feature B supplies 99.99% of the squared distance ' +
                     '(the 2025 slide wrote 16 for the first term). Now choose the normalised preset.' },
      scaleNorm: { kind: 'num', names: ['A normalised', 'B normalised'], p: [0.5, 0.787], q: [0.722, 0.567], w: [1, 1],
               note: 'After (value − min) / (max − min), both features range over [0, 1] and contribute about equally: ' +
                     '√(0.222² + 0.220²) = 0.313. Neither feature is allowed to dominate just because of its unit.' },
      weighted: { kind: 'num', names: ['informative 1', 'informative 2', 'irrelevant'], p: [1, 2, 9], q: [2, 1, 1], w: [1, 1, 1],
               note: 'Two informative features differ by 1; one irrelevant feature differs by 8 and dominates. ' +
                     'Set the irrelevant weight to 0 (feature selection) or 0.1 (down-weighting) and watch its share fall. ' +
                     'Weights must be chosen by cross-validation on training data, never by looking at the test set.' },
      weather: { kind: 'cat', names: ['Outlook', 'Temp', 'Humidity', 'Windy'],
                 p: ['sunny', 'hot', 'high', 'true'], q: ['overcast', 'hot', 'high', 'false'],
                 note: 'Records B and C: Outlook differs (1), Temp (0), Humidity (0), Windy differs (1): Hamming distance 2. ' +
                       '"Play?" is the label, so it is not part of the distance.' },
      dna: { kind: 'seq', p: L.hamming_dna.a, q: L.hamming_dna.b,
             note: 'Hamming distance between two aligned, equal-length DNA sequences: the number of positions that ' +
                   'differ. Only meaningful for sequences of equal length with no insertions or deletions; real ' +
                   'sequence comparison uses alignment scores (BLAST, Needleman–Wunsch) for exactly that reason.' },
      food: { kind: 'food', note: 'Hamming says every pair of different foods is distance 1. A domain-specific distance ' +
              'uses knowledge: an order (ranks 1–4) or the real quantity (kcal). The choice changes which foods are "near".' },
      mixed: { kind: 'mixed', note: 'Two real patients from the Cleveland data. Continuous features are range-normalised ' +
               '(|difference| / training range) and categorical ones score 0 or 1 (Hamming), then summed: a heterogeneous ' +
               'distance. Chest-pain type is coded 1–4, but the codes are categories, not quantities: |4 − 1| = 3 would be meaningless.' }
    };

    var state = { preset: 'movie' };
    var cur;

    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    function numCalc() {
      var rows = cur.names.map(function (n, i) {
        var d = cur.p[i] - cur.q[i];
        return { n: n, d: d, ad: Math.abs(d), sq: d * d, wsq: cur.w[i] * d * d };
      });
      var sq = d3.sum(rows, function (r) { return r.sq; }), wsq = d3.sum(rows, function (r) { return r.wsq; });
      return { rows: rows, euc: Math.sqrt(sq), man: d3.sum(rows, function (r) { return r.ad; }),
               weuc: Math.sqrt(wsq), sq: sq, wsq: wsq };
    }

    function inputRow(label, arr, key, step) {
      return '<tr><th scope="row">' + label + '</th>' + arr.map(function (v, i) {
        return '<td><input type="number" step="' + (step || 'any') + '" data-k="' + key + '" data-i="' + i +
          '" value="' + v + '" style="width:6.5em" aria-label="' + label + ' ' + esc(cur.names[i]) + '"></td>';
      }).join('') + '</tr>';
    }

    function render() {
      var h = '', P = PRESETS[state.preset], res = {};
      if (cur.kind === 'num') {
        var c = numCalc(); res = c;
        h += '<div class="table-scroll"><table class="table-compact"><thead><tr><th></th>' +
          cur.names.map(function (n) { return '<th scope="col">' + esc(n) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          inputRow('p', cur.p, 'p') + inputRow('q', cur.q, 'q') + inputRow('weight w', cur.w, 'w', '0.1') +
          '<tr><th scope="row">|pᵢ − qᵢ|</th>' + c.rows.map(function (r) { return '<td class="num">' + +r.ad.toFixed(4) + '</td>'; }).join('') + '</tr>' +
          '<tr><th scope="row">(pᵢ − qᵢ)²</th>' + c.rows.map(function (r) { return '<td class="num">' + +r.sq.toFixed(4) + '</td>'; }).join('') + '</tr>' +
          '<tr><th scope="row">share of Σ wᵢ(pᵢ − qᵢ)²</th>' + c.rows.map(function (r) {
            var s = c.wsq ? r.wsq / c.wsq : 0;
            return '<td class="num"><span style="display:inline-block;height:9px;width:' + Math.round(60 * s) +
              'px;background:var(--cat-2);margin-right:4px"></span>' + (100 * s).toFixed(1) + '%</td>';
          }).join('') + '</tr></tbody></table></div>' +
          '<p class="small">Euclidean = √(' + c.rows.map(function (r) { return +r.sq.toFixed(4); }).join(' + ') + ') = √' +
          +c.sq.toFixed(4) + ' = <strong>' + c.euc.toFixed(3) + '</strong> · Manhattan = ' +
          c.rows.map(function (r) { return +r.ad.toFixed(4); }).join(' + ') + ' = <strong>' + +c.man.toFixed(4) +
          '</strong> · Weighted Euclidean = √(Σ wᵢ(pᵢ − qᵢ)²) = <strong>' + c.weuc.toFixed(3) + '</strong></p>';
        if (state.preset === 'movie') {
          var M = L.movies;
          h += U.altTable('All six films against the query (18, 90), nearest first by Euclidean distance.',
            ['Film', 'Kicks', 'Kisses', 'Type', 'Euclidean', 'Manhattan'],
            M.rows.slice().sort(function (a, b) { return a.euclidean - b.euclidean; }).map(function (r) {
              return [r.title, String(r.kicks), String(r.kisses), r.type, r.euclidean.toFixed(2), String(r.manhattan)];
            }));
        }
      } else if (cur.kind === 'cat') {
        var mism = cur.p.map(function (v, i) { return v !== cur.q[i] ? 1 : 0; });
        res = { ham: d3.sum(mism), len: mism.length };
        h += '<table class="table-compact"><thead><tr><th></th>' + cur.names.map(function (n) {
          return '<th scope="col">' + n + '</th>'; }).join('') + '</tr></thead><tbody>' +
          ['p', 'q'].map(function (k) {
            return '<tr><th scope="row">' + (k === 'p' ? 'B' : 'C') + '</th>' + cur[k].map(function (v, i) {
              return '<td><input type="text" data-k="' + k + '" data-i="' + i + '" value="' + esc(v) +
                '" style="width:7em" aria-label="' + k + ' ' + cur.names[i] + '"></td>'; }).join('') + '</tr>';
          }).join('') + '<tr><th scope="row">mismatch</th>' + mism.map(function (m) {
            return '<td class="num"' + (m ? ' style="color:var(--cat-2);font-weight:700"' : '') + '>' + m + '</td>'; }).join('') +
          '</tr></tbody></table><p class="small">Hamming distance = ' + mism.join(' + ') + ' = <strong>' + res.ham +
          '</strong> (normalised ' + (res.ham / res.len).toFixed(2) + ')</p>';
      } else if (cur.kind === 'seq') {
        var a = cur.p.toUpperCase(), b = cur.q.toUpperCase(), n = Math.min(a.length, b.length), d = 0, line = '';
        for (var i = 0; i < n; i++) { var m = a[i] !== b[i]; d += m; line += m ? '^' : ' '; }
        res = { ham: a.length === b.length ? d : NaN, len: n };
        h += '<label class="small">Sequence 1 <input type="text" data-k="p" value="' + esc(cur.p) + '" style="font-family:monospace;width:16em"></label> ' +
          '<label class="small">Sequence 2 <input type="text" data-k="q" value="' + esc(cur.q) + '" style="font-family:monospace;width:16em"></label>' +
          '<pre style="font-size:1.05rem;line-height:1.25">' + esc(a) + '\n' + esc(b) + '\n' + line + '</pre>' +
          (a.length !== b.length ? '<p class="small" style="color:var(--cat-2)"><strong>Unequal lengths:</strong> Hamming ' +
            'distance is undefined. An insertion shifts every later position; this is why sequence similarity is measured by alignment.</p>'
            : '<p class="small">Hamming distance = <strong>' + d + '</strong> of ' + n + ' positions (' + (100 * d / n).toFixed(0) + '% different)</p>');
      } else if (cur.kind === 'food') {
        var F = L.food, foods = Object.keys(F.rank);
        var tab = function (fn, cap) {
          return U.altTable(cap, [''].concat(foods), foods.map(function (r) {
            return [r].concat(foods.map(function (c) { return String(fn(r, c)); }));
          }));
        };
        h += '<div class="grid grid-3">' +
          '<div>' + tab(function (r, c) { return r === c ? 0 : 1; }, 'Hamming (same / different)') + '</div>' +
          '<div>' + tab(function (r, c) { return Math.abs(F.rank[r] - F.rank[c]); }, 'Calorie order, ranks 1–4') + '</div>' +
          '<div>' + tab(function (r, c) { return Math.abs(F.kcal[r] - F.kcal[c]); }, 'Calories per serving (lecture values)') + '</div></div>' +
          '<p class="small">dist(carrots, all-bran) is 1 by Hamming, |1 − 3| = 2 by rank, |30 − 70| = 40 by calories. ' +
          'By calories, apple pie is far from everything; by rank it is just one step from all-bran.</p>';
        res = { ham: 1 };
      } else if (cur.kind === 'mixed') {
        var rows = W8.rows(), tr = rows.filter(function (r) { return !r.test; });
        var A = rows.filter(function (r) { return r.id === cur.a; })[0], B = rows.filter(function (r) { return r.id === cur.b; })[0];
        var nums = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak'], cats = ['sex', 'cp', 'exang'];
        var parts = nums.map(function (f) {
          var rng = d3.max(tr, function (r) { return r[f]; }) - d3.min(tr, function (r) { return r[f]; });
          return { f: W8.SHORT[f], a: A[f], b: B[f], v: Math.abs(A[f] - B[f]) / rng, how: '|Δ| / ' + +rng.toFixed(1) };
        }).concat(cats.map(function (f) {
          return { f: { sex: 'sex', cp: 'chest-pain type', exang: 'exercise angina' }[f], a: A[f], b: B[f],
                   v: A[f] === B[f] ? 0 : 1, how: 'match 0 / mismatch 1' };
        }));
        res = { het: d3.sum(parts, function (p) { return p.v; }) };
        h += '<p class="small">Patients <select data-k="a">' + tr.slice(0, 40).map(function (r) {
            return '<option' + (r.id === cur.a ? ' selected' : '') + '>' + r.id + '</option>'; }).join('') +
          '</select> and <select data-k="b">' + tr.slice(0, 40).map(function (r) {
            return '<option' + (r.id === cur.b ? ' selected' : '') + '>' + r.id + '</option>'; }).join('') + '</select></p>' +
          U.altTable('Heterogeneous distance, feature by feature.', ['Feature', 'Patient ' + cur.a, 'Patient ' + cur.b, 'Rule', 'Contribution'],
            parts.map(function (p) { return [p.f, String(p.a), String(p.b), p.how, p.v.toFixed(3)]; })) +
          '<p class="small">Total heterogeneous distance = <strong>' + res.het.toFixed(3) + '</strong> (maximum possible ' +
          parts.length + '). Patient ' + cur.a + ' is ' + (A.disease ? 'diagnosed with' : 'free of') + ' disease; patient ' +
          cur.b + ' is ' + (B.disease ? 'diagnosed with' : 'free of') + ' it.</p>';
      }
      stage.innerHTML = '<div style="padding:var(--s3) 0">' + h + '</div>';
      stage.querySelectorAll('input[data-k], select[data-k]').forEach(function (el) {
        el.addEventListener('change', function () {
          var k = el.getAttribute('data-k'), i = el.getAttribute('data-i');
          if (cur.kind === 'num') cur[k][+i] = +el.value;
          else if (cur.kind === 'cat') cur[k][+i] = el.value.trim();
          else if (cur.kind === 'mixed') cur[k] = +el.value;
          else cur[k] = el.value.replace(/\s+/g, '');
          setTimeout(render, 0);   // not inside the event: a blur during re-render would re-enter
        });
      });
      U.setMetric('dc-euc', res.euc != null ? res.euc.toFixed(3) : '—', 'straight line');
      U.setMetric('dc-man', res.man != null ? String(+res.man.toFixed(4)) : '—', 'sum of |differences|');
      U.setMetric('dc-weuc', res.weuc != null ? res.weuc.toFixed(3) : '—', 'with your weights');
      U.setMetric('dc-ham', res.ham != null ? (isNaN(res.ham) ? 'undefined' : String(res.ham)) :
        (res.het != null ? res.het.toFixed(3) : '—'), res.het != null ? 'heterogeneous (range + Hamming)' : 'mismatched positions');
      host.querySelector('[data-viz-note]').innerHTML = '<p class="mb0">' + esc(P.note) + '</p>';
      altBody.innerHTML = stage.innerHTML.replace(/<input[^>]*value="([^"]*)"[^>]*>/g, '$1')
        .replace(/<select[\s\S]*?<\/select>/g, '');
    }

    function load() {
      cur = clone(PRESETS[state.preset]);
      if (cur.kind === 'mixed') { cur.a = 2; cur.b = 3; }
      var ids = W8.rows().filter(function (r) { return !r.test; }).map(function (r) { return r.id; });
      if (cur.kind === 'mixed') { cur.a = ids[0]; cur.b = ids[1]; }
    }

    var sel = host.querySelector('#dc-preset');
    sel.addEventListener('change', function () { state.preset = sel.value; load(); render(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.preset = 'movie'; sel.value = 'movie'; load(); render();
    });
    load();
    render();
  });
})();
