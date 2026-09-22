/* COMP9085 - machine learning in the browser.
 *
 * These are genuine implementations, not animations of pre-computed results.
 * When you move a slider on this site, a model is actually fitted to the real
 * data in front of you. That is deliberate: a student who suspects the numbers
 * are staged learns nothing from them.
 *
 * Everything is plain ES5-compatible JavaScript with no dependencies, and
 * everything is deterministic given a seed, so two students moving the same
 * sliders see the same result.
 *
 * Contents
 *   Random          seeded PRNG
 *   Metrics         accuracy, precision, recall, F1, ROC-AUC, confusion matrix
 *   Split           stratified train/test and stratified k-fold
 *   Scaler          standardisation fitted on training data only
 *   DecisionTree    CART with entropy or Gini, depth and leaf-size control
 *   RandomForest    bagging plus per-split feature subsetting
 *   KNN             classification with several distance metrics
 *   NaiveBayes      multinomial, with Laplace smoothing, in log space
 *   LogReg          batch gradient descent, L2 regularised
 *   PCA             via Jacobi eigendecomposition of the covariance matrix
 *   KMeans          k-means++ initialisation
 *   DBSCAN          density-based clustering
 *   Agglomerative   hierarchical clustering with three linkages
 *   silhouette      cluster quality
 */
(function () {
  'use strict';

  var ML = {};
  window.ML = ML;

  /* ==================================================================== */
  /* Random                                                               */
  /* ==================================================================== */

  /** Mulberry32: small, fast, adequate for teaching, and reproducible. */
  ML.Random = function (seed) {
    var s = (seed >>> 0) || 42;
    this.next = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    this.int = function (n) { return Math.floor(this.next() * n); };
    this.normal = function () {
      var u = 0, v = 0;
      while (u === 0) u = this.next();
      while (v === 0) v = this.next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    this.shuffle = function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = this.int(i + 1);
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    };
  };

  /* ==================================================================== */
  /* Metrics                                                              */
  /* ==================================================================== */

  ML.confusion = function (yTrue, yPred, classes) {
    var idx = {};
    classes.forEach(function (c, i) { idx[c] = i; });
    var m = classes.map(function () {
      return classes.map(function () { return 0; });
    });
    for (var i = 0; i < yTrue.length; i++) {
      var a = idx[yTrue[i]], b = idx[yPred[i]];
      if (a != null && b != null) m[a][b]++;
    }
    return m;
  };

  ML.accuracy = function (yTrue, yPred) {
    if (!yTrue.length) return 0;
    var n = 0;
    for (var i = 0; i < yTrue.length; i++) if (yTrue[i] === yPred[i]) n++;
    return n / yTrue.length;
  };

  /** Per-class precision, recall and F1, plus macro averages. */
  ML.classReport = function (yTrue, yPred, classes) {
    var cm = ML.confusion(yTrue, yPred, classes);
    var per = classes.map(function (c, i) {
      var tp = cm[i][i];
      var fp = 0, fn = 0;
      for (var j = 0; j < classes.length; j++) {
        if (j !== i) { fp += cm[j][i]; fn += cm[i][j]; }
      }
      var prec = tp + fp ? tp / (tp + fp) : 0;
      var rec = tp + fn ? tp / (tp + fn) : 0;
      var f1 = prec + rec ? 2 * prec * rec / (prec + rec) : 0;
      return { cls: c, tp: tp, fp: fp, fn: fn,
               precision: prec, recall: rec, f1: f1,
               support: tp + fn };
    });
    var macro = function (k) {
      return per.reduce(function (s, p) { return s + p[k]; }, 0) / per.length;
    };
    return {
      matrix: cm, classes: classes, per: per,
      accuracy: ML.accuracy(yTrue, yPred),
      macroPrecision: macro('precision'),
      macroRecall: macro('recall'),
      macroF1: macro('f1')
    };
  };

  /** ROC curve and AUC for binary scores. Uses the rank-based formulation so
   *  ties are handled correctly. */
  ML.rocAuc = function (yTrue, scores, positive) {
    var pairs = [];
    for (var i = 0; i < yTrue.length; i++) {
      pairs.push({ s: scores[i], y: yTrue[i] === positive ? 1 : 0 });
    }
    pairs.sort(function (a, b) { return a.s - b.s; });

    /* Average ranks over ties. */
    var ranks = new Array(pairs.length);
    var i2 = 0;
    while (i2 < pairs.length) {
      var j = i2;
      while (j + 1 < pairs.length && pairs[j + 1].s === pairs[i2].s) j++;
      var avg = (i2 + j) / 2 + 1;
      for (var k = i2; k <= j; k++) ranks[k] = avg;
      i2 = j + 1;
    }

    var nPos = 0, nNeg = 0, sumRankPos = 0;
    for (var m = 0; m < pairs.length; m++) {
      if (pairs[m].y === 1) { nPos++; sumRankPos += ranks[m]; }
      else nNeg++;
    }
    if (!nPos || !nNeg) return { auc: NaN, curve: [] };

    var auc = (sumRankPos - nPos * (nPos + 1) / 2) / (nPos * nNeg);

    /* Curve, from high score to low. */
    var desc = pairs.slice().reverse();
    var tp = 0, fp = 0, curve = [{ fpr: 0, tpr: 0 }];
    for (var q = 0; q < desc.length; q++) {
      if (desc[q].y === 1) tp++; else fp++;
      curve.push({ fpr: fp / nNeg, tpr: tp / nPos });
    }
    return { auc: auc, curve: curve };
  };

  /** Wilson score interval, which behaves properly near 0 and 1 where the
   *  normal approximation does not. */
  ML.wilson = function (successes, n, z) {
    z = z || 1.96;
    if (!n) return [0, 1];
    var p = successes / n;
    var d = 1 + z * z / n;
    var c = p + z * z / (2 * n);
    var s = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
    return [Math.max(0, (c - s) / d), Math.min(1, (c + s) / d)];
  };

  /* ==================================================================== */
  /* Splitting                                                            */
  /* ==================================================================== */

  ML.stratifiedSplit = function (X, y, testFrac, seed) {
    var rng = new ML.Random(seed);
    var byClass = {};
    y.forEach(function (c, i) { (byClass[c] = byClass[c] || []).push(i); });

    var trainIdx = [], testIdx = [];
    Object.keys(byClass).forEach(function (c) {
      var ids = rng.shuffle(byClass[c]);
      var nTest = Math.round(ids.length * testFrac);
      testIdx = testIdx.concat(ids.slice(0, nTest));
      trainIdx = trainIdx.concat(ids.slice(nTest));
    });

    var pick = function (idx) {
      return { X: idx.map(function (i) { return X[i]; }),
               y: idx.map(function (i) { return y[i]; }),
               idx: idx };
    };
    return { train: pick(trainIdx), test: pick(testIdx) };
  };

  ML.stratifiedFolds = function (y, k, seed) {
    var rng = new ML.Random(seed);
    var byClass = {};
    y.forEach(function (c, i) { (byClass[c] = byClass[c] || []).push(i); });

    var folds = [];
    for (var f = 0; f < k; f++) folds.push([]);
    Object.keys(byClass).forEach(function (c) {
      rng.shuffle(byClass[c]).forEach(function (id, i) {
        folds[i % k].push(id);
      });
    });
    return folds;
  };

  /** Cross-validated accuracy. `fit` receives (Xtr, ytr) and returns an object
   *  with a predict(X) method. */
  ML.crossVal = function (X, y, k, seed, fit) {
    var folds = ML.stratifiedFolds(y, k, seed);
    var scores = [];
    for (var f = 0; f < k; f++) {
      var teIdx = folds[f];
      var trIdx = [];
      for (var g = 0; g < k; g++) if (g !== f) trIdx = trIdx.concat(folds[g]);

      var model = fit(trIdx.map(function (i) { return X[i]; }),
                      trIdx.map(function (i) { return y[i]; }));
      var pred = model.predict(teIdx.map(function (i) { return X[i]; }));
      scores.push(ML.accuracy(teIdx.map(function (i) { return y[i]; }), pred));
    }
    var mean = scores.reduce(function (a, b) { return a + b; }, 0) / k;
    var sd = Math.sqrt(scores.reduce(function (a, b) {
      return a + (b - mean) * (b - mean);
    }, 0) / k);
    return { mean: mean, sd: sd, scores: scores };
  };

  /* ==================================================================== */
  /* Scaler                                                               */
  /* ==================================================================== */

  ML.Scaler = function () {
    this.mean = null; this.sd = null;
  };
  ML.Scaler.prototype.fit = function (X) {
    var d = X[0].length, n = X.length;
    this.mean = new Array(d).fill(0);
    this.sd = new Array(d).fill(0);
    for (var i = 0; i < n; i++)
      for (var j = 0; j < d; j++) this.mean[j] += X[i][j];
    for (var j2 = 0; j2 < d; j2++) this.mean[j2] /= n;
    for (var i2 = 0; i2 < n; i2++)
      for (var j3 = 0; j3 < d; j3++) {
        var dv = X[i2][j3] - this.mean[j3];
        this.sd[j3] += dv * dv;
      }
    for (var j4 = 0; j4 < d; j4++) {
      this.sd[j4] = Math.sqrt(this.sd[j4] / n) || 1e-9;
    }
    return this;
  };
  ML.Scaler.prototype.transform = function (X) {
    var self = this;
    return X.map(function (row) {
      return row.map(function (v, j) { return (v - self.mean[j]) / self.sd[j]; });
    });
  };
  ML.Scaler.prototype.fitTransform = function (X) {
    return this.fit(X).transform(X);
  };

  /* ==================================================================== */
  /* Decision tree                                                        */
  /* ==================================================================== */

  function entropy(counts, n) {
    var h = 0;
    for (var k in counts) {
      var p = counts[k] / n;
      if (p > 0) h -= p * Math.log2(p);
    }
    return h;
  }
  function gini(counts, n) {
    var g = 1;
    for (var k in counts) { var p = counts[k] / n; g -= p * p; }
    return g;
  }
  function countLabels(y, idx) {
    var c = {};
    for (var i = 0; i < idx.length; i++) {
      var l = y[idx[i]];
      c[l] = (c[l] || 0) + 1;
    }
    return c;
  }
  function majority(counts) {
    var best = null, bn = -1;
    for (var k in counts) if (counts[k] > bn) { bn = counts[k]; best = k; }
    return best;
  }

  ML.impurity = function (counts, n, criterion) {
    return criterion === 'gini' ? gini(counts, n) : entropy(counts, n);
  };
  ML.entropy = function (counts, n) { return entropy(counts, n); };

  /**
   * opts: { maxDepth, minSamplesLeaf, minSamplesSplit, criterion,
   *         maxFeatures, featureNames, rng }
   */
  ML.DecisionTree = function (opts) {
    opts = opts || {};
    this.maxDepth = opts.maxDepth == null ? 12 : opts.maxDepth;
    this.minSamplesLeaf = opts.minSamplesLeaf || 1;
    this.minSamplesSplit = opts.minSamplesSplit || 2;
    this.criterion = opts.criterion || 'entropy';
    this.maxFeatures = opts.maxFeatures || null;   /* integer, or null for all */
    this.featureNames = opts.featureNames || null;
    this.rng = opts.rng || new ML.Random(42);
    this.root = null;
    this.classes = null;
    this.nNodes = 0;
    this.nLeaves = 0;
  };

  ML.DecisionTree.prototype.fit = function (X, y) {
    this.classes = Array.from(new Set(y)).sort();
    this.nNodes = 0; this.nLeaves = 0;
    var idx = [];
    for (var i = 0; i < X.length; i++) idx.push(i);
    this.root = this._build(X, y, idx, 0);
    return this;
  };

  ML.DecisionTree.prototype._build = function (X, y, idx, depth) {
    this.nNodes++;
    var counts = countLabels(y, idx);
    var n = idx.length;
    var imp = ML.impurity(counts, n, this.criterion);

    var leaf = {
      leaf: true, n: n, counts: counts, depth: depth,
      impurity: imp, prediction: majority(counts),
      proba: this._proba(counts, n)
    };

    if (depth >= this.maxDepth || n < this.minSamplesSplit ||
        Object.keys(counts).length === 1) {
      this.nLeaves++;
      return leaf;
    }

    var best = this._bestSplit(X, y, idx, imp);
    if (!best || best.gain <= 1e-12) { this.nLeaves++; return leaf; }

    var node = {
      leaf: false, n: n, counts: counts, depth: depth, impurity: imp,
      feature: best.feature, threshold: best.threshold, gain: best.gain,
      featureName: this.featureNames ? this.featureNames[best.feature]
                                     : 'x[' + best.feature + ']',
      prediction: majority(counts),
      proba: this._proba(counts, n)
    };
    node.left = this._build(X, y, best.left, depth + 1);
    node.right = this._build(X, y, best.right, depth + 1);
    return node;
  };

  ML.DecisionTree.prototype._proba = function (counts, n) {
    var self = this;
    var p = {};
    this.classes.forEach(function (c) { p[c] = (counts[c] || 0) / n; });
    return p;
  };

  ML.DecisionTree.prototype._bestSplit = function (X, y, idx, parentImp) {
    var d = X[0].length;
    var features = [];
    for (var f = 0; f < d; f++) features.push(f);

    if (this.maxFeatures && this.maxFeatures < d) {
      features = this.rng.shuffle(features).slice(0, this.maxFeatures);
    }

    var best = null;
    var n = idx.length;
    var crit = this.criterion;
    var minLeaf = this.minSamplesLeaf;

    for (var fi = 0; fi < features.length; fi++) {
      var feat = features[fi];

      /* Sort the sample indices by this feature and sweep, maintaining
         running class counts. This is O(n log n) per feature rather than
         O(n^2), which matters because it runs on every slider move. */
      var order = idx.slice().sort(function (a, b) {
        return X[a][feat] - X[b][feat];
      });

      var left = {}, right = {};
      for (var i = 0; i < order.length; i++) {
        var l = y[order[i]];
        right[l] = (right[l] || 0) + 1;
      }

      for (var s = 0; s < order.length - 1; s++) {
        var lab = y[order[s]];
        left[lab] = (left[lab] || 0) + 1;
        right[lab]--;
        if (right[lab] === 0) delete right[lab];

        var nl = s + 1, nr = n - nl;
        if (nl < minLeaf || nr < minLeaf) continue;

        var v1 = X[order[s]][feat], v2 = X[order[s + 1]][feat];
        if (v1 === v2) continue;   /* cannot split between equal values */

        var w = (nl / n) * ML.impurity(left, nl, crit) +
                (nr / n) * ML.impurity(right, nr, crit);
        var gain = parentImp - w;

        if (!best || gain > best.gain) {
          best = { feature: feat, threshold: (v1 + v2) / 2, gain: gain,
                   splitAt: s };
        }
      }
    }

    if (!best) return null;

    /* Rebuild the partitions for the winning split. */
    var L = [], R = [];
    for (var q = 0; q < idx.length; q++) {
      if (X[idx[q]][best.feature] <= best.threshold) L.push(idx[q]);
      else R.push(idx[q]);
    }
    best.left = L; best.right = R;
    return best;
  };

  ML.DecisionTree.prototype.predictOne = function (x) {
    var node = this.root;
    while (node && !node.leaf) {
      node = x[node.feature] <= node.threshold ? node.left : node.right;
    }
    return node ? node.prediction : null;
  };

  ML.DecisionTree.prototype.predict = function (X) {
    var self = this;
    return X.map(function (x) { return self.predictOne(x); });
  };

  ML.DecisionTree.prototype.predictProbaOne = function (x) {
    var node = this.root;
    while (node && !node.leaf) {
      node = x[node.feature] <= node.threshold ? node.left : node.right;
    }
    return node ? node.proba : {};
  };

  ML.DecisionTree.prototype.depth = function () {
    function d(n) { return n.leaf ? n.depth : Math.max(d(n.left), d(n.right)); }
    return this.root ? d(this.root) : 0;
  };

  /** Human-readable rules, as sklearn's export_text produces. */
  ML.DecisionTree.prototype.toText = function (maxDepth) {
    var lines = [];
    var cap = maxDepth == null ? 99 : maxDepth;
    function walk(node, indent, cond) {
      if (node.depth > cap) return;
      var pad = '  '.repeat(indent);
      if (node.leaf) {
        lines.push(pad + (cond ? cond + ' ' : '') + '-> ' + node.prediction +
                   ' (n=' + node.n + ')');
      } else {
        lines.push(pad + (cond ? cond + ' ' : '') + node.featureName +
                   ' <= ' + node.threshold.toFixed(3));
        walk(node.left, indent + 1, 'yes:');
        walk(node.right, indent + 1, 'no: ');
      }
    }
    if (this.root) walk(this.root, 0, '');
    return lines.join('\n');
  };

  /* ==================================================================== */
  /* Random forest                                                        */
  /* ==================================================================== */

  ML.RandomForest = function (opts) {
    opts = opts || {};
    this.nTrees = opts.nTrees || 50;
    this.maxDepth = opts.maxDepth == null ? 10 : opts.maxDepth;
    this.maxFeatures = opts.maxFeatures || null;  /* null = sqrt(d) */
    this.minSamplesLeaf = opts.minSamplesLeaf || 1;
    this.criterion = opts.criterion || 'entropy';
    this.bootstrap = opts.bootstrap !== false;
    this.featureNames = opts.featureNames || null;
    this.seed = opts.seed || 42;
    this.trees = [];
    this.oobScore = null;
    this.importances = null;
  };

  ML.RandomForest.prototype.fit = function (X, y) {
    var rng = new ML.Random(this.seed);
    var n = X.length, d = X[0].length;
    var mf = this.maxFeatures || Math.max(1, Math.round(Math.sqrt(d)));
    this.classes = Array.from(new Set(y)).sort();
    this.trees = [];

    var oobVotes = [];
    for (var i = 0; i < n; i++) oobVotes.push({});

    var imp = new Array(d).fill(0);

    for (var t = 0; t < this.nTrees; t++) {
      var idx = [], inBag = new Array(n).fill(false);
      if (this.bootstrap) {
        for (var b = 0; b < n; b++) {
          var r = rng.int(n);
          idx.push(r); inBag[r] = true;
        }
      } else {
        for (var q = 0; q < n; q++) { idx.push(q); inBag[q] = true; }
      }

      var tree = new ML.DecisionTree({
        maxDepth: this.maxDepth, maxFeatures: mf,
        minSamplesLeaf: this.minSamplesLeaf, criterion: this.criterion,
        featureNames: this.featureNames,
        rng: new ML.Random(this.seed + t * 7919)
      });
      tree.fit(idx.map(function (i) { return X[i]; }),
               idx.map(function (i) { return y[i]; }));
      this.trees.push(tree);

      /* Accumulate impurity-decrease importance. */
      (function walk(node, total) {
        if (node.leaf) return;
        imp[node.feature] += (node.n / total) * node.gain;
        walk(node.left, total); walk(node.right, total);
      })(tree.root, idx.length);

      /* Out-of-bag votes. */
      for (var o = 0; o < n; o++) {
        if (!inBag[o]) {
          var p = tree.predictOne(X[o]);
          oobVotes[o][p] = (oobVotes[o][p] || 0) + 1;
        }
      }
    }

    /* OOB score over samples that were out of bag at least once. */
    var correct = 0, counted = 0;
    for (var s = 0; s < n; s++) {
      var keys = Object.keys(oobVotes[s]);
      if (!keys.length) continue;
      counted++;
      if (majority(oobVotes[s]) === y[s]) correct++;
    }
    this.oobScore = counted ? correct / counted : null;
    this.oobCounted = counted;

    var sum = imp.reduce(function (a, b) { return a + b; }, 0) || 1;
    this.importances = imp.map(function (v) { return v / sum; });
    return this;
  };

  ML.RandomForest.prototype.predictOne = function (x) {
    var votes = {};
    for (var t = 0; t < this.trees.length; t++) {
      var p = this.trees[t].predictOne(x);
      votes[p] = (votes[p] || 0) + 1;
    }
    return majority(votes);
  };

  ML.RandomForest.prototype.predict = function (X) {
    var self = this;
    return X.map(function (x) { return self.predictOne(x); });
  };

  ML.RandomForest.prototype.predictProba = function (X, positive) {
    var self = this;
    return X.map(function (x) {
      var v = 0;
      for (var t = 0; t < self.trees.length; t++) {
        var p = self.trees[t].predictProbaOne(x);
        v += (p[positive] || 0);
      }
      return v / self.trees.length;
    });
  };

  /* ==================================================================== */
  /* k-nearest neighbours                                                 */
  /* ==================================================================== */

  ML.distance = {
    euclidean: function (a, b) {
      var s = 0;
      for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; s += d * d; }
      return Math.sqrt(s);
    },
    manhattan: function (a, b) {
      var s = 0;
      for (var i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
      return s;
    },
    chebyshev: function (a, b) {
      var m = 0;
      for (var i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
      return m;
    },
    cosine: function (a, b) {
      var dot = 0, na = 0, nb = 0;
      for (var i = 0; i < a.length; i++) {
        dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
      }
      var den = Math.sqrt(na) * Math.sqrt(nb);
      return den ? 1 - dot / den : 1;
    }
  };

  ML.KNN = function (opts) {
    opts = opts || {};
    this.k = opts.k || 5;
    this.metric = opts.metric || 'euclidean';
    this.weighted = !!opts.weighted;
  };

  ML.KNN.prototype.fit = function (X, y) {
    this.X = X; this.y = y;
    this.classes = Array.from(new Set(y)).sort();
    return this;
  };

  /** The k nearest training points to x, with their distances. */
  ML.KNN.prototype.neighbours = function (x, k, excludeIdx) {
    var dist = ML.distance[this.metric];
    var out = [];
    for (var i = 0; i < this.X.length; i++) {
      if (excludeIdx === i) continue;
      out.push({ i: i, d: dist(x, this.X[i]), y: this.y[i] });
    }
    out.sort(function (a, b) { return a.d - b.d; });
    return out.slice(0, k == null ? this.k : k);
  };

  ML.KNN.prototype.predictOne = function (x, excludeIdx) {
    var nb = this.neighbours(x, this.k, excludeIdx);
    var votes = {};
    for (var i = 0; i < nb.length; i++) {
      var w = this.weighted ? 1 / (nb[i].d * nb[i].d + 1e-9) : 1;
      votes[nb[i].y] = (votes[nb[i].y] || 0) + w;
    }
    return majority(votes);
  };

  ML.KNN.prototype.predict = function (X) {
    var self = this;
    return X.map(function (x) { return self.predictOne(x); });
  };

  /** Leave-one-out prediction on the training set. Useful for the explorer,
   *  where there is no separate test set to show. */
  ML.KNN.prototype.predictLoo = function () {
    var self = this;
    return this.X.map(function (x, i) { return self.predictOne(x, i); });
  };

  /* ==================================================================== */
  /* Multinomial naive Bayes                                              */
  /* ==================================================================== */

  ML.NaiveBayes = function (alpha) {
    this.alpha = alpha == null ? 1 : alpha;
  };

  /** docs: array of token arrays. labels: array of class labels. */
  ML.NaiveBayes.prototype.fit = function (docs, labels) {
    this.classes = Array.from(new Set(labels)).sort();
    this.vocab = {};
    this.counts = {};      /* class -> token -> count */
    this.total = {};       /* class -> total tokens */
    this.prior = {};
    var self = this;

    this.classes.forEach(function (c) {
      self.counts[c] = {}; self.total[c] = 0; self.prior[c] = 0;
    });

    for (var i = 0; i < docs.length; i++) {
      var c = labels[i];
      self.prior[c]++;
      for (var t = 0; t < docs[i].length; t++) {
        var tok = docs[i][t];
        self.vocab[tok] = true;
        self.counts[c][tok] = (self.counts[c][tok] || 0) + 1;
        self.total[c]++;
      }
    }
    this.vocabSize = Object.keys(this.vocab).length;
    this.classes.forEach(function (c) { self.prior[c] /= docs.length; });
    return this;
  };

  /** Log P(token | class), with Laplace smoothing of strength alpha. */
  ML.NaiveBayes.prototype.logLik = function (token, cls) {
    var c = (this.counts[cls][token] || 0) + this.alpha;
    var d = this.total[cls] + this.alpha * this.vocabSize;
    if (d <= 0) return -Infinity;
    return Math.log(c / d);
  };

  /** Full score breakdown for one document, for the explorer. */
  ML.NaiveBayes.prototype.explain = function (tokens) {
    var self = this;
    var rows = [];
    var scores = {};
    this.classes.forEach(function (c) {
      scores[c] = Math.log(self.prior[c] || 1e-12);
    });

    tokens.forEach(function (tok) {
      var row = { token: tok, contrib: {} };
      self.classes.forEach(function (c) {
        var ll = self.logLik(tok, c);
        row.contrib[c] = ll;
        scores[c] += ll;
      });
      /* Log-ratio between the top two classes, as the discriminating power. */
      if (self.classes.length === 2) {
        row.ratio = row.contrib[self.classes[0]] - row.contrib[self.classes[1]];
      }
      rows.push(row);
    });

    /* Normalise the log scores into probabilities with the log-sum-exp trick. */
    var maxS = -Infinity;
    self.classes.forEach(function (c) { maxS = Math.max(maxS, scores[c]); });
    var z = 0;
    self.classes.forEach(function (c) { z += Math.exp(scores[c] - maxS); });
    var proba = {};
    self.classes.forEach(function (c) {
      proba[c] = Math.exp(scores[c] - maxS) / z;
    });

    return { rows: rows, logScores: scores, proba: proba,
             prediction: majority(proba) };
  };

  ML.NaiveBayes.prototype.predictOne = function (tokens) {
    return this.explain(tokens).prediction;
  };
  ML.NaiveBayes.prototype.predict = function (docs) {
    var self = this;
    return docs.map(function (d) { return self.predictOne(d); });
  };

  /** Tokens ranked by how strongly they favour one class over the other. */
  ML.NaiveBayes.prototype.topTokens = function (clsA, clsB, n) {
    var self = this;
    var out = Object.keys(this.vocab).map(function (tok) {
      var freq = (self.counts[clsA][tok] || 0) + (self.counts[clsB][tok] || 0);
      return { token: tok, freq: freq,
               ratio: self.logLik(tok, clsA) - self.logLik(tok, clsB),
               a: self.counts[clsA][tok] || 0, b: self.counts[clsB][tok] || 0 };
    }).filter(function (r) { return r.freq >= 2; });
    out.sort(function (x, y) { return y.ratio - x.ratio; });
    return { forA: out.slice(0, n), forB: out.slice(-n).reverse() };
  };

  /* ==================================================================== */
  /* Logistic regression                                                  */
  /* ==================================================================== */

  ML.LogReg = function (opts) {
    opts = opts || {};
    this.lr = opts.lr || 0.5;
    this.epochs = opts.epochs || 250;
    this.l2 = opts.l2 == null ? 0.01 : opts.l2;
  };

  ML.LogReg.prototype.fit = function (X, y) {
    this.classes = Array.from(new Set(y)).sort();
    var pos = this.classes[this.classes.length - 1];
    this.positive = pos;
    var n = X.length, d = X[0].length;
    var w = new Array(d).fill(0), b = 0;
    var t = y.map(function (v) { return v === pos ? 1 : 0; });

    for (var e = 0; e < this.epochs; e++) {
      var gw = new Array(d).fill(0), gb = 0;
      for (var i = 0; i < n; i++) {
        var z = b;
        for (var j = 0; j < d; j++) z += w[j] * X[i][j];
        var p = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
        var err = p - t[i];
        for (var j2 = 0; j2 < d; j2++) gw[j2] += err * X[i][j2];
        gb += err;
      }
      for (var j3 = 0; j3 < d; j3++) {
        w[j3] -= this.lr * (gw[j3] / n + this.l2 * w[j3]);
      }
      b -= this.lr * (gb / n);
    }
    this.w = w; this.b = b;
    return this;
  };

  ML.LogReg.prototype.probaOne = function (x) {
    var z = this.b;
    for (var j = 0; j < x.length; j++) z += this.w[j] * x[j];
    return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
  };
  ML.LogReg.prototype.predict = function (X) {
    var self = this;
    return X.map(function (x) {
      return self.probaOne(x) >= 0.5 ? self.positive
                                     : self.classes[0];
    });
  };
  ML.LogReg.prototype.predictProba = function (X) {
    var self = this;
    return X.map(function (x) { return self.probaOne(x); });
  };

  /* ==================================================================== */
  /* PCA                                                                  */
  /* ==================================================================== */

  /** Symmetric eigendecomposition by the cyclic Jacobi method. Reliable, and
   *  fast enough for the 30-by-30 covariance matrices used here. */
  function jacobiEigen(Ain, iters) {
    var n = Ain.length;
    var A = Ain.map(function (r) { return r.slice(); });
    var V = [];
    for (var i = 0; i < n; i++) {
      V.push(new Array(n).fill(0)); V[i][i] = 1;
    }
    for (var sweep = 0; sweep < (iters || 60); sweep++) {
      var off = 0;
      for (var p = 0; p < n; p++)
        for (var q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
      if (off < 1e-14) break;

      for (var p2 = 0; p2 < n - 1; p2++) {
        for (var q2 = p2 + 1; q2 < n; q2++) {
          if (Math.abs(A[p2][q2]) < 1e-15) continue;
          var theta = (A[q2][q2] - A[p2][p2]) / (2 * A[p2][q2]);
          var t = Math.sign(theta || 1) /
                  (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          var c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (var k = 0; k < n; k++) {
            var akp = A[k][p2], akq = A[k][q2];
            A[k][p2] = c * akp - s * akq;
            A[k][q2] = s * akp + c * akq;
          }
          for (var k2 = 0; k2 < n; k2++) {
            var apk = A[p2][k2], aqk = A[q2][k2];
            A[p2][k2] = c * apk - s * aqk;
            A[q2][k2] = s * apk + c * aqk;
          }
          for (var k3 = 0; k3 < n; k3++) {
            var vkp = V[k3][p2], vkq = V[k3][q2];
            V[k3][p2] = c * vkp - s * vkq;
            V[k3][q2] = s * vkp + c * vkq;
          }
        }
      }
    }
    var vals = [];
    for (var d = 0; d < n; d++) vals.push({ value: A[d][d], index: d });
    vals.sort(function (a, b) { return b.value - a.value; });
    return {
      values: vals.map(function (v) { return v.value; }),
      vectors: vals.map(function (v) {
        return V.map(function (row) { return row[v.index]; });
      })
    };
  }
  ML.jacobiEigen = jacobiEigen;

  ML.PCA = function (nComponents) {
    this.n = nComponents || 2;
  };

  ML.PCA.prototype.fit = function (X) {
    var n = X.length, d = X[0].length;
    this.mean = new Array(d).fill(0);
    for (var i = 0; i < n; i++)
      for (var j = 0; j < d; j++) this.mean[j] += X[i][j] / n;

    var cov = [];
    for (var a = 0; a < d; a++) cov.push(new Array(d).fill(0));
    for (var i2 = 0; i2 < n; i2++) {
      for (var a2 = 0; a2 < d; a2++) {
        var da = X[i2][a2] - this.mean[a2];
        for (var b2 = a2; b2 < d; b2++) {
          var db = X[i2][b2] - this.mean[b2];
          cov[a2][b2] += da * db;
        }
      }
    }
    for (var a3 = 0; a3 < d; a3++)
      for (var b3 = a3; b3 < d; b3++) {
        cov[a3][b3] /= (n - 1);
        cov[b3][a3] = cov[a3][b3];
      }

    var e = jacobiEigen(cov);
    var total = e.values.reduce(function (s, v) { return s + Math.max(0, v); }, 0) || 1;
    this.components = e.vectors.slice(0, this.n);
    this.explained = e.values.map(function (v) { return Math.max(0, v) / total; });
    this.eigenvalues = e.values;
    return this;
  };

  ML.PCA.prototype.transform = function (X) {
    var self = this;
    return X.map(function (row) {
      var centred = row.map(function (v, j) { return v - self.mean[j]; });
      return self.components.map(function (comp) {
        var s = 0;
        for (var j = 0; j < comp.length; j++) s += centred[j] * comp[j];
        return s;
      });
    });
  };

  ML.PCA.prototype.fitTransform = function (X) {
    return this.fit(X).transform(X);
  };

  /* ==================================================================== */
  /* Clustering                                                           */
  /* ==================================================================== */

  ML.kmeans = function (X, k, opts) {
    opts = opts || {};
    var rng = new ML.Random(opts.seed || 42);
    var maxIter = opts.maxIter || 100;
    var n = X.length, d = X[0].length;
    var dist = ML.distance[opts.metric || 'euclidean'];

    /* k-means++ initialisation. */
    var centroids = [X[rng.int(n)].slice()];
    while (centroids.length < k) {
      var d2 = X.map(function (x) {
        var m = Infinity;
        for (var c = 0; c < centroids.length; c++)
          m = Math.min(m, dist(x, centroids[c]));
        return m * m;
      });
      var sum = d2.reduce(function (a, b) { return a + b; }, 0);
      if (sum <= 0) { centroids.push(X[rng.int(n)].slice()); continue; }
      var r = rng.next() * sum, acc = 0, pick = n - 1;
      for (var i = 0; i < n; i++) {
        acc += d2[i];
        if (acc >= r) { pick = i; break; }
      }
      centroids.push(X[pick].slice());
    }

    var labels = new Array(n).fill(0), iters = 0, changed = true;
    while (changed && iters < maxIter) {
      changed = false; iters++;
      for (var p = 0; p < n; p++) {
        var best = 0, bd = Infinity;
        for (var c2 = 0; c2 < k; c2++) {
          var dd = dist(X[p], centroids[c2]);
          if (dd < bd) { bd = dd; best = c2; }
        }
        if (labels[p] !== best) { labels[p] = best; changed = true; }
      }
      var sums = [], counts = new Array(k).fill(0);
      for (var c3 = 0; c3 < k; c3++) sums.push(new Array(d).fill(0));
      for (var q = 0; q < n; q++) {
        counts[labels[q]]++;
        for (var j = 0; j < d; j++) sums[labels[q]][j] += X[q][j];
      }
      for (var c4 = 0; c4 < k; c4++) {
        if (!counts[c4]) continue;
        for (var j2 = 0; j2 < d; j2++) centroids[c4][j2] = sums[c4][j2] / counts[c4];
      }
    }

    var inertia = 0;
    for (var s = 0; s < n; s++) {
      var dv = dist(X[s], centroids[labels[s]]);
      inertia += dv * dv;
    }
    return { labels: labels, centroids: centroids, inertia: inertia,
             iterations: iters, k: k };
  };

  ML.dbscan = function (X, eps, minPts, metric) {
    var dist = ML.distance[metric || 'euclidean'];
    var n = X.length;
    var labels = new Array(n).fill(-2);   /* -2 unvisited, -1 noise, >=0 cluster */
    var cluster = 0;

    function region(p) {
      var out = [];
      for (var i = 0; i < n; i++) if (dist(X[p], X[i]) <= eps) out.push(i);
      return out;
    }

    for (var p = 0; p < n; p++) {
      if (labels[p] !== -2) continue;
      var nb = region(p);
      if (nb.length < minPts) { labels[p] = -1; continue; }

      labels[p] = cluster;
      var queue = nb.slice();
      for (var qi = 0; qi < queue.length; qi++) {
        var q = queue[qi];
        if (labels[q] === -1) labels[q] = cluster;      /* border point */
        if (labels[q] !== -2) continue;
        labels[q] = cluster;
        var nb2 = region(q);
        if (nb2.length >= minPts) queue = queue.concat(nb2);
      }
      cluster++;
    }
    return { labels: labels, nClusters: cluster,
             nNoise: labels.filter(function (l) { return l === -1; }).length };
  };

  ML.agglomerative = function (X, k, linkage, metric) {
    var dist = ML.distance[metric || 'euclidean'];
    var n = X.length;
    var clusters = [];
    for (var i = 0; i < n; i++) clusters.push([i]);

    /* Pairwise distances between points, computed once. */
    var D = [];
    for (var a = 0; a < n; a++) {
      D.push(new Array(n).fill(0));
    }
    for (var a2 = 0; a2 < n; a2++)
      for (var b2 = a2 + 1; b2 < n; b2++) {
        D[a2][b2] = D[b2][a2] = dist(X[a2], X[b2]);
      }

    function linkDist(c1, c2) {
      var best = linkage === 'single' ? Infinity : (linkage === 'complete' ? -Infinity : 0);
      var count = 0;
      for (var i2 = 0; i2 < c1.length; i2++) {
        for (var j = 0; j < c2.length; j++) {
          var d = D[c1[i2]][c2[j]];
          if (linkage === 'single') best = Math.min(best, d);
          else if (linkage === 'complete') best = Math.max(best, d);
          else { best += d; count++; }
        }
      }
      return linkage === 'average' ? best / (count || 1) : best;
    }

    var merges = [];
    while (clusters.length > k) {
      var bi = 0, bj = 1, bd = Infinity;
      for (var i3 = 0; i3 < clusters.length; i3++) {
        for (var j3 = i3 + 1; j3 < clusters.length; j3++) {
          var d3 = linkDist(clusters[i3], clusters[j3]);
          if (d3 < bd) { bd = d3; bi = i3; bj = j3; }
        }
      }
      merges.push({ height: bd, size: clusters[bi].length + clusters[bj].length });
      clusters[bi] = clusters[bi].concat(clusters[bj]);
      clusters.splice(bj, 1);
    }

    var labels = new Array(n).fill(0);
    clusters.forEach(function (c, ci) {
      c.forEach(function (p) { labels[p] = ci; });
    });
    return { labels: labels, nClusters: clusters.length, merges: merges };
  };

  /** Mean silhouette coefficient. Points labelled -1 (DBSCAN noise) are
   *  excluded, which is the standard convention. */
  ML.silhouette = function (X, labels, metric) {
    var dist = ML.distance[metric || 'euclidean'];
    var idx = [];
    for (var i = 0; i < labels.length; i++) if (labels[i] >= 0) idx.push(i);
    var groups = {};
    idx.forEach(function (i2) { (groups[labels[i2]] = groups[labels[i2]] || []).push(i2); });
    var keys = Object.keys(groups);
    if (keys.length < 2) return NaN;

    var total = 0;
    idx.forEach(function (i3) {
      var own = groups[labels[i3]];
      if (own.length <= 1) return;   /* silhouette of a singleton is 0 */
      var a = 0;
      own.forEach(function (j) { if (j !== i3) a += dist(X[i3], X[j]); });
      a /= (own.length - 1);

      var b = Infinity;
      keys.forEach(function (kk) {
        if (+kk === labels[i3]) return;
        var s = 0;
        groups[kk].forEach(function (j2) { s += dist(X[i3], X[j2]); });
        b = Math.min(b, s / groups[kk].length);
      });
      total += (b - a) / Math.max(a, b);
    });
    return total / idx.length;
  };

  /** Adjusted Rand index, for comparing a clustering with known labels. */
  ML.adjustedRand = function (a, b) {
    var ca = {}, cb = {}, cab = {};
    for (var i = 0; i < a.length; i++) {
      ca[a[i]] = (ca[a[i]] || 0) + 1;
      cb[b[i]] = (cb[b[i]] || 0) + 1;
      var key = a[i] + '|' + b[i];
      cab[key] = (cab[key] || 0) + 1;
    }
    var c2 = function (x) { return x * (x - 1) / 2; };
    var sumIJ = 0, sumI = 0, sumJ = 0;
    Object.keys(cab).forEach(function (k) { sumIJ += c2(cab[k]); });
    Object.keys(ca).forEach(function (k) { sumI += c2(ca[k]); });
    Object.keys(cb).forEach(function (k) { sumJ += c2(cb[k]); });
    var n2 = c2(a.length);
    var expected = sumI * sumJ / n2;
    var max = (sumI + sumJ) / 2;
    return max - expected === 0 ? 0 : (sumIJ - expected) / (max - expected);
  };

  /* ==================================================================== */
  /* Small helpers used by several visualisations                         */
  /* ==================================================================== */

  ML.mean = function (a) {
    return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0;
  };
  ML.sd = function (a) {
    var m = ML.mean(a);
    return Math.sqrt(ML.mean(a.map(function (v) { return (v - m) * (v - m); })));
  };
  ML.quantile = function (arr, q) {
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var pos = (a.length - 1) * q, base = Math.floor(pos), rest = pos - base;
    return a[base + 1] !== undefined
      ? a[base] + rest * (a[base + 1] - a[base])
      : a[base];
  };
  ML.column = function (X, j) {
    return X.map(function (r) { return r[j]; });
  };
})();
