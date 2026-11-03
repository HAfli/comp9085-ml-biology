/* Week 5 - shared helpers for the naive Bayes pages.
 *
 * tokenize() reproduces scikit-learn's CountVectorizer defaults: lowercase,
 * then token_pattern (?u)\b\w\w+\b, i.e. every maximal run of two or more
 * letters, digits or underscores. Using the same rule as the lab means the
 * browser model and the notebook model see exactly the same words.
 *
 * corpus() prepares the frozen openFDA snapshot (window.WEEK05_CORPUS) once:
 * training vocabulary, per-class word counts and training document frequency,
 * and the test texts as (word index, count) lists. multinomialNB() turns the
 * counts into the fitted MultinomialNB(alpha) of the lab.
 */
(function () {
  'use strict';

  var TOKEN = /[\p{L}\p{N}_]{2,}/gu;

  function tokenize(s) {
    return (String(s).toLowerCase().match(TOKEN) || []);
  }

  var cache = null;

  function corpus() {
    if (cache) return cache;
    var C = window.WEEK05_CORPUS;
    if (!C) return null;
    var n = C.texts.length;
    var toks = C.texts.map(tokenize);
    var index = {}, vocab = [];
    var train = [], test = [];
    for (var i = 0; i < n; i++) (C.split.charAt(i) === 'r' ? train : test).push(i);
    train.forEach(function (i) {
      toks[i].forEach(function (t) {
        if (!(t in index)) { index[t] = vocab.length; vocab.push(t); }
      });
    });
    var V = vocab.length;
    var counts = [new Float64Array(V), new Float64Array(V)];
    var df = new Int32Array(V);
    var classN = [0, 0];
    train.forEach(function (i) {
      var c = C.y[i], seen = {};
      classN[c]++;
      toks[i].forEach(function (t) {
        var j = index[t];
        counts[c][j]++;
        if (!seen[j]) { seen[j] = 1; df[j]++; }
      });
    });
    function bag(tokens) {
      var m = {};
      tokens.forEach(function (t) {
        if (t in index) m[index[t]] = (m[index[t]] || 0) + 1;
      });
      return Object.keys(m).map(function (j) { return [+j, m[j]]; });
    }
    cache = {
      raw: C, toks: toks, train: train, test: test,
      vocab: vocab, index: index, V: V,
      counts: counts, df: df, classN: classN,
      testBags: test.map(function (i) { return bag(toks[i]); }),
      testY: test.map(function (i) { return C.y[i]; }),
      bag: bag
    };
    return cache;
  }

  /* MultinomialNB(alpha) from the training counts. With alpha = 0 an unseen
     (word, class) pair gives log 0 = -Infinity, exactly as in scikit-learn. */
  function multinomialNB(K, alpha) {
    var flp = [new Float64Array(K.V), new Float64Array(K.V)];
    for (var c = 0; c < 2; c++) {
      var tot = 0;
      for (var j = 0; j < K.V; j++) tot += K.counts[c][j];
      var den = Math.log(tot + alpha * K.V);
      for (j = 0; j < K.V; j++) flp[c][j] = Math.log(K.counts[c][j] + alpha) - den;
    }
    var nTrain = K.classN[0] + K.classN[1];
    var prior = [Math.log(K.classN[0] / nTrain), Math.log(K.classN[1] / nTrain)];
    function jll(bag) {
      var s = [prior[0], prior[1]];
      bag.forEach(function (b) {
        s[0] += b[1] * flp[0][b[0]];
        s[1] += b[1] * flp[1][b[0]];
      });
      return s;
    }
    /* P(Class I | text), or NaN when both classes score -Infinity. */
    function proba(bag) {
      var s = jll(bag);
      if (s[0] === -Infinity && s[1] === -Infinity) return NaN;
      if (s[0] === -Infinity) return 1;
      if (s[1] === -Infinity) return 0;
      return 1 / (1 + Math.exp(s[0] - s[1]));
    }
    return { alpha: alpha, flp: flp, prior: prior, jll: jll, proba: proba };
  }

  /* Binary metrics at threshold 0.5 (positive if p >= 0.5), plus ROC AUC. */
  function evaluate(y, p) {
    var tp = 0, fp = 0, fn = 0, tn = 0, nan = 0;
    for (var i = 0; i < y.length; i++) {
      if (isNaN(p[i])) { nan++; continue; }
      var pr = p[i] >= 0.5 ? 1 : 0;
      if (pr && y[i]) tp++; else if (pr) fp++; else if (y[i]) fn++; else tn++;
    }
    var n = tp + fp + fn + tn;
    var prec = tp + fp ? tp / (tp + fp) : null, rec = tp + fn ? tp / (tp + fn) : null;
    return {
      tp: tp, fp: fp, fn: fn, tn: tn, n: n, unscorable: nan,
      accuracy: n ? (tp + tn) / n : null, precision: prec, recall: rec,
      f1: prec != null && rec != null && prec + rec > 0 ? 2 * prec * rec / (prec + rec) : null,
      rocAuc: nan ? null : auc(y, p)
    };
  }

  /* Mann-Whitney AUC with average ranks for ties (matches roc_auc_score). */
  function auc(y, p) {
    var idx = p.map(function (v, i) { return i; })
      .sort(function (a, b) { return p[a] - p[b]; });
    var ranks = new Float64Array(p.length);
    for (var i = 0; i < idx.length;) {
      var j = i;
      while (j + 1 < idx.length && p[idx[j + 1]] === p[idx[i]]) j++;
      for (var k = i; k <= j; k++) ranks[idx[k]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    var nPos = 0, sum = 0;
    for (i = 0; i < y.length; i++) if (y[i]) { nPos++; sum += ranks[i]; }
    var nNeg = y.length - nPos;
    return (sum - nPos * (nPos + 1) / 2) / (nPos * nNeg);
  }

  window.W5 = { tokenize: tokenize, corpus: corpus, multinomialNB: multinomialNB,
                evaluate: evaluate, auc: auc };
})();
