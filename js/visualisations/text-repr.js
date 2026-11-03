/* Week 5 - C. Text representation explorer: tokens -> vocabulary -> matrix.
 *
 * Up to three short texts are tokenised with scikit-learn's default rule
 * (window.W5.tokenize), a vocabulary is built from them, and the
 * document-term matrix is shown as counts (CountVectorizer), presence
 * (CountVectorizer(binary=True)) or TF-IDF (TfidfVectorizer defaults:
 * smooth idf = ln((1 + n) / (1 + df)) + 1, rows scaled to unit length).
 * The real presets are verbatim openFDA reason texts.
 */
(function () {
  'use strict';

  var PRESETS = {
    real: {
      note: 'Three real reason texts from the frozen openFDA snapshot (recall events 62282, ' +
            '62368 and 62647; FDA classes I, I and II).',
      docs: ['Product may be contaminated with Listeria monocytogenes.',
             'Product may contain undeclared milk and almond.',
             'Products may contain metal fragments']
    },
    allergen: {
      note: 'Three real texts that all say “undeclared”, from recall events 61467, 62292 and ' +
            '62340. FDA classified them as Class III, Class II and Class I.',
      docs: ['The products contain undeclared soy lecithin',
             'The product contains undeclared wheat.',
             'Undeclared egg']
    },
    order: {
      note: 'Illustrative texts written for this explorer, not FDA records. The first two use ' +
            'the same words in a different order; the third adds “no”.',
      docs: ['listeria was detected in the cheese, salmonella was not',
             'salmonella was detected in the cheese, listeria was not',
             'no listeria was detected in the cheese']
    }
  };

  window.Chart.register('viz-text-repr', function (host) {
    var U = window.UI;
    var stage = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var tok = window.W5 && window.W5.tokenize;
    var state = { preset: 'real', mode: 'count' };
    var areas = [0, 1, 2].map(function (i) { return host.querySelector('#tr-doc' + i); });

    function matrix() {
      var docs = areas.map(function (a) { return a.value; });
      var toks = docs.map(tok);
      var raw = docs.map(function (d) { return String(d).toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []; });
      var dropped = [];
      raw.forEach(function (r) { r.forEach(function (t) { if (t.length < 2 && dropped.indexOf(t) < 0) dropped.push(t); }); });
      var vocab = [];
      toks.forEach(function (t) { t.forEach(function (w) { if (vocab.indexOf(w) < 0) vocab.push(w); }); });
      vocab.sort();
      var counts = toks.map(function (t) {
        return vocab.map(function (w) { return t.filter(function (x) { return x === w; }).length; });
      });
      var n = docs.length;
      var df = vocab.map(function (w, j) { return counts.filter(function (r) { return r[j] > 0; }).length; });
      var idf = df.map(function (d) { return Math.log((1 + n) / (1 + d)) + 1; });
      var vals = counts.map(function (r) {
        if (state.mode === 'count') return r.slice();
        if (state.mode === 'binary') return r.map(function (v) { return v > 0 ? 1 : 0; });
        var w = r.map(function (v, j) { return v * idf[j]; });
        var norm = Math.sqrt(w.reduce(function (a, b) { return a + b * b; }, 0));
        return w.map(function (v) { return norm ? v / norm : 0; });
      });
      return { docs: docs, toks: toks, vocab: vocab, counts: counts, vals: vals, idf: idf, df: df, dropped: dropped };
    }

    function fmt(v) { return state.mode === 'tfidf' ? (v ? v.toFixed(2) : '0') : String(v); }

    function update() {
      var M = matrix();
      var max = d3.max(M.vals, function (r) { return d3.max(r); }) || 1;
      var head = '<tr><th scope="col">text</th>' + M.vocab.map(function (w) {
        return '<th scope="col" class="num mono" style="writing-mode:vertical-rl;transform:rotate(180deg);' +
          'padding:4px 2px;font-weight:600">' + U.esc(w) + '</th>';
      }).join('') + '</tr>';
      var body = M.vals.map(function (r, i) {
        return '<tr><th scope="row">Text ' + (i + 1) + '</th>' + r.map(function (v) {
          var a = v / max;
          return '<td class="num" style="background:' + (v ? 'rgba(31,95,75,' + (0.12 + 0.6 * a).toFixed(2) + ')' : 'transparent') +
            ';color:' + (a > 0.6 ? '#fff' : 'var(--ink)') + '">' + fmt(v) + '</td>';
        }).join('') + '</tr>';
      }).join('');
      var chips = M.toks.map(function (t, i) {
        return '<p class="small" style="margin:0 0 var(--s2)"><strong>Text ' + (i + 1) + ' tokens:</strong> ' +
          (t.length ? t.map(function (w) { return '<span class="pill mono">' + U.esc(w) + '</span>'; }).join(' ')
            : '<em>none</em>') + '</p>';
      }).join('');
      stage.innerHTML = chips +
        '<div class="table-scroll"><table class="table-compact" style="width:auto"><caption>Document-term ' +
        'matrix: one row per text, one column per vocabulary word (' +
        { count: 'word counts', binary: 'presence, 1 or 0', tfidf: 'TF-IDF weights, each row scaled to length 1' }[state.mode] +
        ').</caption><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';

      var cells = M.vals.length * M.vocab.length;
      var nz = M.vals.reduce(function (a, r) { return a + r.filter(function (v) { return v; }).length; }, 0);
      U.setMetric('tr-vocab', String(M.vocab.length), 'distinct words, built from these texts');
      U.setMetric('tr-nz', cells ? Math.round(100 * nz / cells) + '%' : 'n/a',
        nz + ' of ' + cells + ' cells are non-zero');
      U.setMetric('tr-drop', M.dropped.length ? M.dropped.join(' ') : 'none',
        'one-character tokens the default rule discards');
      var same = [];
      for (var i = 0; i < 3; i++) for (var j = i + 1; j < 3; j++) {
        if (M.toks[i].length && M.counts[i].join() === M.counts[j].join() && M.docs[i] !== M.docs[j]) {
          same.push((i + 1) + ' and ' + (j + 1));
        }
      }
      U.setMetric('tr-same', same.length ? 'texts ' + same.join(', ') : 'none',
        'different texts, identical rows');

      var notes = [];
      if (PRESETS[state.preset]) notes.push(U.esc(PRESETS[state.preset].note));
      if (same.length) notes.push('<strong>Texts ' + same.join(', ') + ' are different sentences with ' +
        'identical rows.</strong> A bag of words keeps which words occur and how often, not their ' +
        'order, so the model cannot tell them apart.');
      if (M.vocab.indexOf('no') >= 0 || M.vocab.indexOf('not') >= 0) notes.push('“no” and “not” are ' +
        'just two more columns. Nothing links them to the word they negate.');
      if (state.mode === 'tfidf') notes.push('TF-IDF down-weights words that appear in many texts. Its ' +
        'IDF values are learned from the texts the vectorizer is fitted on: here, these three. That ' +
        'is why the vectorizer is part of the model and must be fitted on training data only.');
      if (state.mode === 'binary') notes.push('Presence only: a word used twice counts once. ' +
        'This is the representation BernoulliNB expects.');
      host.querySelector('[data-viz-note]').innerHTML = notes.map(function (n) {
        return '<p>' + n + '</p>';
      }).join('') + '<p class="mb0 small muted">A new text is transformed with the vocabulary ' +
        'learned at fit time: any word not in it is silently ignored.</p>';
      altBody.innerHTML = '<p>Representation: ' + state.mode + '. Vocabulary (' + M.vocab.length +
        ' words, alphabetical): ' + U.esc(M.vocab.join(', ')) + '.</p>' +
        U.altTable('Document-term matrix.', ['Text'].concat(M.vocab),
          M.vals.map(function (r, i) { return ['Text ' + (i + 1)].concat(r.map(fmt)); }));
    }

    function setPreset(k) {
      state.preset = k;
      PRESETS[k].docs.forEach(function (d, i) { areas[i].value = d; });
      update();
    }

    host.querySelector('#tr-preset').addEventListener('change', function () {
      if (PRESETS[this.value]) setPreset(this.value);
    });
    areas.forEach(function (a) {
      a.addEventListener('input', function () {
        state.preset = 'custom'; host.querySelector('#tr-preset').value = 'custom'; update();
      });
    });
    U.onSegment(host.querySelector('#tr-mode'), function (v) { state.mode = v; update(); });
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      state.mode = 'count';
      host.querySelectorAll('#tr-mode button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-value') === 'count'));
      });
      host.querySelector('#tr-preset').value = 'real';
      setPreset('real');
    });
    setPreset('real');
  });
})();
