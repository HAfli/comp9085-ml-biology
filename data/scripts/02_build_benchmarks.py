#!/usr/bin/env python3
"""
COMP9085 build script 02: compute REAL classical-ML benchmark results on the
real WDBC dataset, so that the website's Model Comparison Lab and Leaderboard
report measured numbers rather than invented ones.

Every number produced here comes from an actual scikit-learn run with a fixed
seed. The exact protocol is recorded alongside the numbers so students can see,
and reproduce, how each figure was obtained.

Protocol
--------
- Stratified 5-fold cross-validation, seed 42, repeated once.
- All preprocessing inside the fold (Pipeline) so there is no leakage.
- Metrics: accuracy, precision, recall, F1, ROC-AUC (macro of folds, with SD).
- Positive class = malignant (the clinically important class).

Run:  python3 data/scripts/02_build_benchmarks.py
Out:  js/data/benchmarks.js
"""
import json
import os
import time

import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.decomposition import PCA
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import (GradientBoostingClassifier, RandomForestClassifier)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedKFold
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "js", "data", "benchmarks.js")
SEED = 42

MODELS = {
    "baseline_majority": ("Majority-class baseline",
                          DummyClassifier(strategy="most_frequent")),
    "logreg": ("Logistic regression",
               Pipeline([("sc", StandardScaler()),
                         ("m", LogisticRegression(max_iter=5000, random_state=SEED))])),
    "gnb": ("Gaussian naive Bayes", GaussianNB()),
    "knn5": ("k-NN (k=5, Euclidean, standardised)",
             Pipeline([("sc", StandardScaler()),
                       ("m", KNeighborsClassifier(n_neighbors=5))])),
    "knn5_raw": ("k-NN (k=5, Euclidean, NOT standardised)",
                 KNeighborsClassifier(n_neighbors=5)),
    "tree_full": ("Decision tree (unpruned, entropy)",
                  DecisionTreeClassifier(criterion="entropy", random_state=SEED)),
    "tree_d3": ("Decision tree (max_depth=3, entropy)",
                DecisionTreeClassifier(criterion="entropy", max_depth=3,
                                       random_state=SEED)),
    "rf": ("Random forest (500 trees)",
           RandomForestClassifier(n_estimators=500, random_state=SEED, n_jobs=-1)),
    "gb": ("Gradient boosting (200 stages)",
           GradientBoostingClassifier(n_estimators=200, random_state=SEED)),
    "pca10_logreg": ("PCA (10 comps) + logistic regression",
                     Pipeline([("sc", StandardScaler()),
                               ("pca", PCA(n_components=10, random_state=SEED)),
                               ("m", LogisticRegression(max_iter=5000,
                                                        random_state=SEED))])),
}


def evaluate(model, X, y):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    rows = []
    t0 = time.perf_counter()
    for tr, te in cv.split(X, y):
        m = model.__class__(**model.get_params()) if not isinstance(model, Pipeline) else model
        from sklearn.base import clone
        m = clone(model)
        m.fit(X[tr], y[tr])
        p = m.predict(X[te])
        try:
            s = m.predict_proba(X[te])[:, 1]
            auc = roc_auc_score(y[te], s)
        except Exception:
            auc = float("nan")
        rows.append(dict(
            acc=accuracy_score(y[te], p),
            prec=precision_score(y[te], p, zero_division=0),
            rec=recall_score(y[te], p, zero_division=0),
            f1=f1_score(y[te], p, zero_division=0),
            auc=auc,
        ))
    elapsed = time.perf_counter() - t0

    def agg(k):
        vals = np.array([r[k] for r in rows], dtype=float)
        if np.all(np.isnan(vals)):
            return None, None
        return float(np.nanmean(vals)), float(np.nanstd(vals))

    out = {}
    for k in ("acc", "prec", "rec", "f1", "auc"):
        m_, s_ = agg(k)
        out[k] = None if m_ is None else round(m_, 4)
        out[k + "_sd"] = None if s_ is None else round(s_, 4)
    out["fit_seconds_total"] = round(elapsed, 3)
    return out


def leakage_demo(X, y):
    """Measure how much each leaky protocol inflates the score. Real measurements.

    Four scenarios are measured, deliberately including one where leakage turns
    out to matter very little. Reporting that honestly is itself a teaching
    point: the size of the inflation depends on the data, and 'we used a
    pipeline' is not a substitute for checking.
    """
    from sklearn.feature_selection import SelectKBest, f_classif
    from sklearn.model_selection import cross_val_score

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    logreg = lambda: Pipeline([("sc", StandardScaler()),
                               ("m", LogisticRegression(max_iter=5000,
                                                        random_state=SEED))])

    # --- 1. Feature selection on the real data (informative features) --------
    sel = SelectKBest(f_classif, k=5).fit(X, y)
    fs_leaky = cross_val_score(logreg(), sel.transform(X), y, cv=cv,
                               scoring="accuracy").mean()
    fs_honest = cross_val_score(
        Pipeline([("sel", SelectKBest(f_classif, k=5)),
                  ("sc", StandardScaler()),
                  ("m", LogisticRegression(max_iter=5000, random_state=SEED))]),
        X, y, cv=cv, scoring="accuracy").mean()

    # --- 2. Feature selection on PURE NOISE (the classic demonstration) -----
    # 100 samples, 5000 random features, labels assigned at random. There is
    # NO signal whatsoever, so an honest protocol must land near chance.
    # Selecting features on the full dataset first manufactures signal.
    # cf. Ambroise & McLachlan (2002) PNAS 99:6562-6566.
    rng = np.random.default_rng(SEED)
    n_noise, p_noise = 100, 5000
    Xn = rng.standard_normal((n_noise, p_noise))
    yn = rng.integers(0, 2, n_noise)
    cvn = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    seln = SelectKBest(f_classif, k=20).fit(Xn, yn)
    noise_leaky = cross_val_score(logreg(), seln.transform(Xn), yn, cv=cvn,
                                  scoring="accuracy").mean()
    noise_honest = cross_val_score(
        Pipeline([("sel", SelectKBest(f_classif, k=20)),
                  ("sc", StandardScaler()),
                  ("m", LogisticRegression(max_iter=5000, random_state=SEED))]),
        Xn, yn, cv=cvn, scoring="accuracy").mean()

    # --- 3. Duplicate rows crossing the split boundary ----------------------
    idx = rng.choice(len(X), size=len(X) // 4, replace=False)
    Xd, yd = np.vstack([X, X[idx]]), np.concatenate([y, y[idx]])
    knn1 = lambda: Pipeline([("sc", StandardScaler()),
                             ("m", KNeighborsClassifier(n_neighbors=1))])
    dup = cross_val_score(knn1(), Xd, yd, cv=cv, scoring="accuracy").mean()
    clean = cross_val_score(knn1(), X, y, cv=cv, scoring="accuracy").mean()

    # --- 4. Scaler fitted on the full dataset before splitting --------------
    Xall = StandardScaler().fit_transform(X)
    sc_leaky = cross_val_score(
        LogisticRegression(max_iter=5000, random_state=SEED), Xall, y, cv=cv,
        scoring="accuracy").mean()
    sc_honest = cross_val_score(logreg(), X, y, cv=cv, scoring="accuracy").mean()

    return {
        "featureSelectionReal": {
            "leaky": round(float(fs_leaky), 4),
            "honest": round(float(fs_honest), 4),
            "note": ("On WDBC the truly informative features are selected either "
                     "way, so the inflation is small. Small inflation is not "
                     "proof that the protocol was sound."),
        },
        "featureSelectionNoise": {
            "leaky": round(float(noise_leaky), 4),
            "honest": round(float(noise_honest), 4),
            "note": ("100 samples, 5000 pure-noise features, random labels. The "
                     "true accuracy is chance (0.50). Selecting features before "
                     "the split manufactures the appearance of signal."),
        },
        "duplicateRows": {
            "withDuplicates": round(float(dup), 4),
            "clean": round(float(clean), 4),
            "note": ("25% of rows duplicated before splitting, 1-NN classifier. "
                     "Copies of training rows appear in the test fold."),
        },
        "scalerOnFullData": {
            "leaky": round(float(sc_leaky), 4),
            "honest": round(float(sc_honest), 4),
            "note": ("StandardScaler fitted on all 569 rows before splitting. "
                     "The effect is small here because the test fold barely "
                     "shifts the mean and variance; with tiny datasets or "
                     "heavy-tailed features it is much larger."),
        },
    }


def learning_curve(X, y):
    """Real measured accuracy as a function of labelled training-set size."""
    from sklearn.base import clone
    from sklearn.model_selection import train_test_split
    fracs = [0.02, 0.05, 0.1, 0.2, 0.4, 0.6, 0.8]
    models = {
        "logreg": Pipeline([("sc", StandardScaler()),
                            ("m", LogisticRegression(max_iter=5000, random_state=SEED))]),
        "rf": RandomForestClassifier(n_estimators=300, random_state=SEED, n_jobs=-1),
        "tree_d3": DecisionTreeClassifier(criterion="entropy", max_depth=3,
                                          random_state=SEED),
    }
    out = {k: [] for k in models}
    for f in fracs:
        for name, mdl in models.items():
            accs = []
            for rep in range(20):
                Xtr, Xte, ytr, yte = train_test_split(
                    X, y, train_size=f, stratify=y, random_state=SEED + rep)
                if len(np.unique(ytr)) < 2:
                    continue
                m = clone(mdl)
                m.fit(Xtr, ytr)
                accs.append(accuracy_score(yte, m.predict(Xte)))
            out[name].append({"frac": f, "n": int(round(f * len(X))),
                              "acc": round(float(np.mean(accs)), 4),
                              "sd": round(float(np.std(accs)), 4)})
    return out


def depth_curve(X, y):
    """Real train/test accuracy against tree depth: the overfitting curve."""
    from sklearn.model_selection import train_test_split
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y,
                                          random_state=SEED)
    rows = []
    for d in range(1, 16):
        m = DecisionTreeClassifier(criterion="entropy", max_depth=d,
                                   random_state=SEED).fit(Xtr, ytr)
        rows.append({"depth": d,
                     "train": round(float(accuracy_score(ytr, m.predict(Xtr))), 4),
                     "test": round(float(accuracy_score(yte, m.predict(Xte))), 4),
                     "leaves": int(m.get_n_leaves())})
    return rows


def knn_k_curve(X, y):
    """Real accuracy against k, standardised vs not, Euclidean vs Manhattan."""
    from sklearn.model_selection import cross_val_score
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    rows = []
    for k in [1, 3, 5, 7, 9, 11, 15, 21, 31, 51]:
        r = {"k": k}
        for tag, pipe in [
            ("std_euclidean", Pipeline([("sc", StandardScaler()),
                                        ("m", KNeighborsClassifier(k, metric="euclidean"))])),
            ("std_manhattan", Pipeline([("sc", StandardScaler()),
                                        ("m", KNeighborsClassifier(k, metric="manhattan"))])),
            ("raw_euclidean", KNeighborsClassifier(k, metric="euclidean")),
        ]:
            r[tag] = round(float(cross_val_score(pipe, X, y, cv=cv,
                                                 scoring="accuracy").mean()), 4)
        rows.append(r)
    return rows


def pca_spectrum(X):
    p = PCA(random_state=SEED).fit(StandardScaler().fit_transform(X))
    return {
        "explained": [round(float(v), 5) for v in p.explained_variance_ratio_],
        "cumulative": [round(float(v), 5)
                       for v in np.cumsum(p.explained_variance_ratio_)],
    }


def rf_importances(X, y, names):
    m = RandomForestClassifier(n_estimators=1000, random_state=SEED,
                               n_jobs=-1).fit(X, y)
    order = np.argsort(m.feature_importances_)[::-1]
    return [{"feature": names[i],
             "importance": round(float(m.feature_importances_[i]), 5)}
            for i in order]


def clustering_quality(X):
    """Real silhouette scores for k-means on the real data, k = 2..10."""
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score
    Z = StandardScaler().fit_transform(X)
    rows = []
    for k in range(2, 11):
        km = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit(Z)
        rows.append({"k": k,
                     "inertia": round(float(km.inertia_), 2),
                     "silhouette": round(float(silhouette_score(Z, km.labels_)), 4)})
    return rows


def main():
    d = load_breast_cancer()
    X, y = d.data, (d.target == 0).astype(int)   # 1 = malignant (positive class)
    names = list(d.feature_names)

    results = {}
    for key, (label, mdl) in MODELS.items():
        results[key] = {"label": label, **evaluate(mdl, X, y)}
        print(f"{label:48s} acc={results[key]['acc']}")

    payload = {
        "dataset": "UCI Breast Cancer Wisconsin (Diagnostic), 569 x 30",
        "real": True,
        "protocol": ("Stratified 5-fold cross-validation, seed 42. All scaling, "
                     "feature selection and dimensionality reduction fitted inside "
                     "each training fold. Positive class = malignant. "
                     "Produced by data/scripts/02_build_benchmarks.py."),
        "sklearnVersion": __import__("sklearn").__version__,
        "models": results,
        "leakage": leakage_demo(X, y),
        "learningCurve": learning_curve(X, y),
        "depthCurve": depth_curve(X, y),
        "knnCurve": knn_k_curve(X, y),
        "pca": pca_spectrum(X),
        "importances": rf_importances(X, y, names),
        "clustering": clustering_quality(X),
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        f.write("/* AUTO-GENERATED by data/scripts/02_build_benchmarks.py.\n")
        f.write("   REAL measured results from scikit-learn on the real WDBC dataset. */\n")
        f.write("window.BENCHMARKS = ")
        json.dump(payload, f, separators=(",", ":"))
        f.write(";\n")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
