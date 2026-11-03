#!/usr/bin/env python3
"""
COMP9085 build script 17: the measured numbers behind the Week 3 interactives.

The Week 3 lecture sends students to five interactives that did not exist on
the website (Cross-Validation Explorer, Pipeline Builder, Hyperparameter
Explorer, WDBC End-to-End Experiment; the Biological Data Splitter runs its
illustrative simulation in the browser and needs nothing from here). This
script measures everything they display, with scikit-learn, on the real WDBC
data, using the protocol stated on the Week 3 slides:

- positive class = malignant (WDBC is 212 malignant, 357 benign);
- stratified 5-fold cross-validation, shuffle=True, random_state=42;
- k-NN always standardised inside a Pipeline; trees use criterion="entropy";
- for tuning and the final test: one stratified 80/20 split, random_state=42
  (455 train-pool rows, 114 final-test rows), every choice made by 5-fold CV
  on the pool, the test set scored once per model;
- the leakage measurements reuse the exact recipe of 02_build_benchmarks.py.

The script asserts that it reproduces the numbers printed on the Week 3 slides
(slides 20, 29, 38, 50, 51, 55, 67), so the slides, the website and the lab cannot
drift apart silently.

Run:  python3 data/scripts/17_build_week03_interactives.py
Out:  js/data/week03.js and data/scripts/week03_numbers.json
"""
import json
import os

import numpy as np
import sklearn
from sklearn.datasets import load_breast_cancer
from sklearn.dummy import DummyClassifier
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import (KFold, StratifiedKFold, cross_val_score,
                                     train_test_split)
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_JS = os.path.join(ROOT, "js", "data", "week03.js")
OUT_JSON = os.path.join(ROOT, "data", "scripts", "week03_numbers.json")
SEED = 42


def r4(v):
    return round(float(v), 4)


def load():
    d = load_breast_cancer()
    X = d.data
    y = (d.target == 0).astype(int)            # malignant = 1
    return X, y, list(d.feature_names)


def models():
    return {
        "baseline": ("Majority-class baseline", DummyClassifier(strategy="most_frequent")),
        "tree_d3": ("Decision tree (max_depth=3, entropy)",
                    DecisionTreeClassifier(criterion="entropy", max_depth=3,
                                           random_state=SEED)),
        "knn5": ("k-NN (k=5, standardised)",
                 Pipeline([("sc", StandardScaler()),
                           ("m", KNeighborsClassifier(n_neighbors=5))])),
        "tree_full": ("Decision tree (unpruned, entropy)",
                      DecisionTreeClassifier(criterion="entropy", random_state=SEED)),
    }


def cv_explorer(X, y):
    """Per-fold accuracy for k = 2..10 folds, stratified or not."""
    out = {"models": {}, "folds": {}}
    for key, (label, _) in models().items():
        out["models"][key] = label
    for k in range(2, 11):
        for strat in (True, False):
            cv = (StratifiedKFold(k, shuffle=True, random_state=SEED) if strat
                  else KFold(k, shuffle=True, random_state=SEED))
            splits = list(cv.split(X, y))
            entry = {"testSize": [len(te) for _, te in splits],
                     "trainSize": [len(tr) for tr, _ in splits],
                     "malignantShare": [r4(y[te].mean()) for _, te in splits],
                     "scores": {}}
            for key, (_, m) in models().items():
                entry["scores"][key] = [r4(m.fit(X[tr], y[tr]).score(X[te], y[te]))
                                        for tr, te in splits]
            out["folds"]["%d-%s" % (k, "s" if strat else "p")] = entry
    return out


def tuning(X, y):
    Xp, Xt, yp, yt = train_test_split(X, y, test_size=0.2, stratify=y,
                                      random_state=SEED)
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)

    def sweep(make, values):
        rows = []
        for v in values:
            m = make(v)
            cvs = cross_val_score(m, Xp, yp, cv=cv, scoring="accuracy")
            m.fit(Xp, yp)
            rows.append({"v": v, "train": r4(m.score(Xp, yp)),
                         "cv": r4(cvs.mean()), "cvSd": r4(cvs.std()),
                         "cvFolds": [r4(s) for s in cvs],
                         "test": r4(m.score(Xt, yt))})
        return rows

    tree = sweep(lambda d: DecisionTreeClassifier(criterion="entropy", max_depth=d,
                                                  random_state=SEED), list(range(1, 13)))
    knn = sweep(lambda k: Pipeline([("sc", StandardScaler()),
                                    ("m", KNeighborsClassifier(n_neighbors=k))]),
                list(range(1, 26, 2)))

    def best(rows):          # highest CV; ties go to the first (simplest) value
        return max(rows, key=lambda r: (r["cv"], -rows.index(r)))["v"]

    return {"pool": int(len(yp)), "test": int(len(yt)),
            "poolMalignant": int(yp.sum()), "testMalignant": int(yt.sum()),
            "tree": tree, "knn": knn,
            "chosen": {"tree": best(tree), "knn": best(knn)}}, (Xp, Xt, yp, yt)


def end_to_end(X, y, names, T, split):
    Xp, Xt, yp, yt = split
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
    base = DummyClassifier(strategy="most_frequent")
    base_cv = cross_val_score(base, Xp, yp, cv=cv).mean()
    base.fit(Xp, yp)
    fi = {n: i for i, n in enumerate(names)}
    show = ["worst perimeter", "worst concave points", "mean texture"]
    final = {}
    for fam, make in (
            ("tree", lambda v: DecisionTreeClassifier(criterion="entropy", max_depth=v,
                                                      random_state=SEED)),
            ("knn", lambda v: Pipeline([("sc", StandardScaler()),
                                        ("m", KNeighborsClassifier(n_neighbors=v))]))):
        v = T["chosen"][fam]
        m = make(v).fit(Xp, yp)
        p = m.predict(Xt)
        tn, fp, fn, tp = confusion_matrix(yt, p, labels=[0, 1]).ravel()
        miss = np.where((yt == 1) & (p == 0))[0]
        alarm = np.where((yt == 0) & (p == 1))[0]
        row = next(r for r in T[fam] if r["v"] == v)
        final[fam] = {
            "value": v, "train": row["train"], "cv": row["cv"], "cvSd": row["cvSd"],
            "test": r4((tp + tn) / len(yt)),
            "cm": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "precision": r4(tp / (tp + fp)) if tp + fp else None,
            "recall": r4(tp / (tp + fn)), "specificity": r4(tn / (tn + fp)),
            "falseNegatives": [[r4(Xt[i, fi[s]]) for s in show] for i in miss],
            "falsePositives": [[r4(Xt[i, fi[s]]) for s in show] for i in alarm],
        }
    return {"baseline": {"cv": r4(base_cv), "test": r4(base.score(Xt, yt)),
                         "train": r4(base.score(Xp, yp))},
            "shownFeatures": show, "final": final}


def pipeline_builder(X, y):
    """Reported CV accuracy for every placement of the scaler and the feature
    selector: fitted once on all rows before CV ('out') or inside the Pipeline
    ('in'), on the real WDBC data and on the pure-noise data of 02_build_benchmarks."""
    def score(Xd, yd, k_sel, scaler, selector):
        cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
        Z = Xd
        if scaler == "out":
            Z = StandardScaler().fit_transform(Z)
        if selector == "out":
            Z = SelectKBest(f_classif, k=k_sel).fit_transform(Z, yd)
        steps = []
        if selector == "in":
            steps.append(("sel", SelectKBest(f_classif, k=k_sel)))
        if scaler == "in":
            steps.append(("sc", StandardScaler()))
        steps.append(("m", LogisticRegression(max_iter=5000, random_state=SEED)))
        return r4(cross_val_score(Pipeline(steps), Z, yd, cv=cv,
                                  scoring="accuracy").mean())

    rng = np.random.default_rng(SEED)
    Xn = rng.standard_normal((100, 5000))
    yn = rng.integers(0, 2, 100)
    out = {}
    for name, (Xd, yd, k) in {"wdbc": (X, y, 5), "noise": (Xn, yn, 20)}.items():
        out[name] = {"k": k, "n": int(len(yd)), "p": int(Xd.shape[1]), "scores": {}}
        for scaler in ("in", "out"):
            for selector in ("none", "in", "out"):
                out[name]["scores"]["%s-%s" % (scaler, selector)] = \
                    score(Xd, yd, k, scaler, selector)
    return out


def check(N):
    """The numbers printed on the Week 3 lecture slides."""
    f5 = N["cv"]["folds"]["5-s"]["scores"]
    m = lambda v: round(100 * float(np.mean(v)), 1)
    got = {
        "slide 20 baseline": m(f5["baseline"]), "slide 20 tree d3": m(f5["tree_d3"]),
        "slide 20 k-NN 5": m(f5["knn5"]), "slide 20 unpruned": m(f5["tree_full"]),
        "slide 29 tree folds": [round(100 * s, 1) for s in f5["tree_d3"]],
        "slide 29 k-NN folds": [round(100 * s, 1) for s in f5["knn5"]],
        "slide 50 chosen depth": N["tuning"]["chosen"]["tree"],
        "slide 50 depth-4 train/cv": [round(100 * r[k], 1) for r in N["tuning"]["tree"]
                                      if r["v"] == 4 for k in ("train", "cv")],
        "slide 51 chosen k": N["tuning"]["chosen"]["knn"],
        "slide 51 k-3 train/cv": [round(100 * r[k], 1) for r in N["tuning"]["knn"]
                                  if r["v"] == 3 for k in ("train", "cv")],
        "slide 55 tree confusion": N["e2e"]["final"]["tree"]["cm"],
        "slide 67 test (base/tree/knn)": [round(100 * N["e2e"]["baseline"]["test"], 1),
                                          round(100 * N["e2e"]["final"]["tree"]["test"], 1),
                                          round(100 * N["e2e"]["final"]["knn"]["test"], 1)],
        "slide 38 noise selection leaky/honest": [
            round(100 * N["pipeline"]["noise"]["scores"]["in-out"], 1),
            round(100 * N["pipeline"]["noise"]["scores"]["in-in"], 1)],
    }
    want = {
        "slide 20 baseline": 62.7, "slide 20 tree d3": 91.7, "slide 20 k-NN 5": 96.3,
        "slide 20 unpruned": 93.8,
        "slide 29 tree folds": [92.1, 86.0, 93.9, 94.7, 92.0],
        "slide 29 k-NN folds": [98.2, 94.7, 93.9, 98.2, 96.5],
        "slide 50 chosen depth": 4, "slide 50 depth-4 train/cv": [97.8, 93.8],
        "slide 51 chosen k": 3, "slide 51 k-3 train/cv": [98.5, 97.4],
        "slide 55 tree confusion": {"tn": 72, "fp": 0, "fn": 8, "tp": 34},
        "slide 67 test (base/tree/knn)": [63.2, 93.0, 93.9],
        "slide 38 noise selection leaky/honest": [88.0, 55.0],
    }
    bad = []
    for k in want:
        ok = got[k] == want[k]
        print("  %-4s %-40s %s" % ("ok" if ok else "DIFF", k, got[k]))
        if not ok:
            bad.append("%s: got %s, slide says %s" % (k, got[k], want[k]))
    return got, bad


def main():
    X, y, names = load()
    T, split = tuning(X, y)
    N = {
        "provenance": ("Measured by data/scripts/17_build_week03_interactives.py with "
                       "scikit-learn %s on the UCI Breast Cancer Wisconsin (Diagnostic) "
                       "data (569 x 30, CC BY 4.0). Positive class = malignant. "
                       "Stratified 5-fold CV, shuffle, random_state=42; tuning and the "
                       "final test use one stratified 80/20 split, random_state=42."
                       % sklearn.__version__),
        "sklearnVersion": sklearn.__version__,
        "cv": cv_explorer(X, y),
        "tuning": T,
        "e2e": end_to_end(X, y, names, T, split),
        "pipeline": pipeline_builder(X, y),
    }
    got, bad = check(N)
    N["slideCheck"] = {"matches": not bad, "differences": bad}
    with open(OUT_JSON, "w") as f:
        json.dump(N, f, indent=1)
    with open(OUT_JS, "w") as f:
        f.write("/* AUTO-GENERATED by data/scripts/17_build_week03_interactives.py.\n"
                "   REAL measured results (scikit-learn, real WDBC data) behind the\n"
                "   Week 3 interactives. Do not edit by hand. */\n")
        f.write("window.WEEK03 = " + json.dumps(N, separators=(",", ":")) + ";\n")
    print("\nwrote", os.path.relpath(OUT_JS, ROOT), "and", os.path.relpath(OUT_JSON, ROOT))
    if bad:
        print("\n%d number(s) differ from the slides:" % len(bad))
        for b in bad:
            print("  ", b)


if __name__ == "__main__":
    main()
