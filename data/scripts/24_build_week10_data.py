#!/usr/bin/env python3
"""
Week 10 (random forests and foundation-model representations): every number used by the lecture, the
website exercises and the lab, computed from real data already in the repository. No network.

  * WDBC (UCI Breast Cancer Wisconsin Diagnostic, 569 tumours, 30 features; the scikit-learn copy, as in
    Weeks 2, 3, 7 and 9). Protocol identical to js/data/benchmarks.js: 5-fold stratified CV, seed 42.
  * The Week 7 proteins: 2,000 human Swiss-Prot proteins, the 23 classical descriptors and the ESM-2 (8M)
    mean-pooled embeddings (labs/week07/data). Split identical to Week 7: 1,500 train / 500 test,
    stratified on both labels, seed 42; the test set is used once per pipeline.

Out: data/scripts/week10_numbers.json and js/data/week10.js (window.WEEK10).

    python3 data/scripts/24_build_week10_data.py        # a few minutes on a laptop CPU
"""
import importlib.util
import json
import os
import time
import warnings

import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.datasets import load_breast_cancer
from sklearn.ensemble import BaggingClassifier, RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, roc_auc_score, f1_score, average_precision_score,
                             balanced_accuracy_score, recall_score)
from sklearn.model_selection import StratifiedKFold, train_test_split, GridSearchCV
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SEED = 42
OUT_JSON = os.path.join(HERE, "week10_numbers.json")
OUT_JS = os.path.join(ROOT, "js", "data", "week10.js")
t00 = time.time()


def r4(x):
    return None if x is None else float(round(float(x), 4))


def cv5():
    return StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)


def logreg():
    return Pipeline([("sc", StandardScaler()), ("m", LogisticRegression(max_iter=5000, random_state=SEED))])


def knn5():
    return Pipeline([("sc", StandardScaler()), ("m", KNeighborsClassifier(n_neighbors=5))])


def rf(n=500, **kw):
    return RandomForestClassifier(n_estimators=n, random_state=SEED, n_jobs=-1, **kw)


def cv_eval(model, X, y):
    """5-fold stratified CV (seed 42): accuracy, ROC AUC, F1 (malignant), fit seconds; mean and SD."""
    acc, auc, f1, sec = [], [], [], []
    for tr, te in cv5().split(X, y):
        m = clone(model)
        t = time.perf_counter(); m.fit(X[tr], y[tr]); sec.append(time.perf_counter() - t)
        p = m.predict_proba(X[te])[:, 1]
        acc.append(accuracy_score(y[te], (p >= 0.5).astype(int))); auc.append(roc_auc_score(y[te], p))
        f1.append(f1_score(y[te], (p >= 0.5).astype(int)))
    return {"acc": r4(np.mean(acc)), "acc_sd": r4(np.std(acc)), "auc": r4(np.mean(auc)),
            "f1": r4(np.mean(f1)), "fit_s": r4(np.mean(sec)), "folds_acc": [r4(a) for a in acc]}


# ============================================================ WDBC
d = load_breast_cancer()
names = [n.replace(" ", "_") for n in d.feature_names]
X = d.data
y = (d.target == 0).astype(int)                      # 1 = malignant (scikit-learn codes benign as 1)
n, p = X.shape
N = {"seed": SEED, "sklearn": sklearn.__version__, "numpy": np.__version__,
     "wdbc": {"n": int(n), "p": int(p), "malignant": int(y.sum()), "benign": int(n - y.sum()),
              "feature_names": names}}
W = N["wdbc"]

# ---- 1. the model ladder: one tree, bagged trees, random forest, and the classical comparators
ladder = {
    "tree": ("Single decision tree (unpruned)", DecisionTreeClassifier(random_state=SEED)),
    "bagging": ("Bagged trees (500, all 30 features per split)",
                BaggingClassifier(DecisionTreeClassifier(), n_estimators=500, random_state=SEED, n_jobs=-1)),
    "rf": ("Random forest (500 trees, 5 features per split)", rf()),
    "logreg": ("Logistic regression (standardised)", logreg()),
    "knn5": ("k-NN, k = 5 (standardised)", knn5()),
}
W["ladder"] = {}
for k, (label, m) in ladder.items():
    W["ladder"][k] = {"label": label, **cv_eval(m, X, y)}
    print("ladder", k, W["ladder"][k]["acc"], W["ladder"][k]["auc"], f"{time.time() - t00:.0f}s")

# consistency with the course's published leaderboard (js/data/benchmarks.js)
bjs = open(os.path.join(ROOT, "js", "data", "benchmarks.js")).read()
W["benchmarks_consistency"] = {"rf_acc_in_benchmarks_js": "0.954" in bjs or "95.4" in bjs}

# ---- 2. bootstrap arithmetic
rg = np.random.default_rng(SEED)
fr = [len(np.unique(rg.integers(0, n, n))) / n for _ in range(2000)]
W["bootstrap"] = {"n": int(n), "expected_unique": r4(1 - (1 - 1 / n) ** n), "limit": r4(1 - np.exp(-1)),
                  "simulated_mean_unique": r4(np.mean(fr)), "simulated_sd": r4(np.std(fr)),
                  "expected_oob_count": r4(n * (1 - 1 / n) ** n)}
rg = np.random.default_rng(7)
draw = rg.integers(1, 9, 8).tolist()                  # tumours numbered 1..8
W["bootstrap"]["worked"] = {"draw": draw, "in_bag": sorted(set(draw)),
                            "oob": [i for i in range(1, 9) if i not in draw]}

# ---- 3. out-of-bag error against the number of trees, for three features-per-split settings
grid = [1, 2, 3, 5, 8, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 400, 500]
W["oob_curve"] = {"trees": grid, "by_m": {}}
for m in [1, 5, 30]:
    f = RandomForestClassifier(n_estimators=1, max_features=m, oob_score=True, warm_start=True,
                               random_state=SEED, n_jobs=-1)
    errs = []
    for t in grid:
        f.set_params(n_estimators=t)
        f.fit(X, y)
        errs.append(r4(1 - f.oob_score_) if t >= 15 else None)   # OOB undefined for some tumours below ~15 trees
    W["oob_curve"]["by_m"][str(m)] = errs
f500 = rf(500, oob_score=True).fit(X, y)
W["oob_curve"]["rf500_oob_acc"] = r4(f500.oob_score_)
W["oob_curve"]["rf500_cv_acc"] = W["ladder"]["rf"]["acc"]
print("oob", W["oob_curve"], f"{time.time() - t00:.0f}s")

# ---- 4. decorrelation: features per split m against tree strength, tree correlation and forest accuracy
dec = []
for m in [1, 2, 3, 5, 8, 12, 20, 30]:
    tree_acc, rho, facc, fauc = [], [], [], []
    for tr, te in cv5().split(X, y):
        f = RandomForestClassifier(n_estimators=200, max_features=m, random_state=SEED, n_jobs=-1).fit(X[tr], y[tr])
        P = np.array([t.predict_proba(X[te])[:, 1] for t in f.estimators_])      # trees x tumours
        tree_acc.append(np.mean([(np.round(pp) == y[te]).mean() for pp in P]))
        R = P - y[te][None, :]                                                   # each tree's residuals
        C = np.corrcoef(R)
        rho.append(np.nanmean(C[np.triu_indices(len(C), 1)]))
        pf = P.mean(0)
        facc.append(((pf >= 0.5) == y[te]).mean()); fauc.append(roc_auc_score(y[te], pf))
    dec.append({"m": m, "tree_acc": r4(np.mean(tree_acc)), "rho": r4(np.mean(rho)),
                "forest_acc": r4(np.mean(facc)), "forest_auc": r4(np.mean(fauc))})
    print("decor", dec[-1], f"{time.time() - t00:.0f}s")
W["decorrelation"] = {"rows": dec, "trees": 200,
                      "rho_definition": "mean pairwise Pearson correlation between trees' residuals "
                                        "(predicted probability minus true label) on held-out tumours, 5-fold CV"}

# ---- 5. depth: one tree overfits as it deepens; the forest does not get worse
dep = []
for md in [1, 2, 3, 4, 6, 8, 12, None]:
    row = {"depth": md if md else "none"}
    for k, mk in [("tree", DecisionTreeClassifier(max_depth=md, random_state=SEED)), ("rf", rf(300, max_depth=md))]:
        tra, tea = [], []
        for tr, te in cv5().split(X, y):
            mm = clone(mk).fit(X[tr], y[tr])
            tra.append(mm.score(X[tr], y[tr])); tea.append(mm.score(X[te], y[te]))
        row[k + "_train"] = r4(np.mean(tra)); row[k + "_cv"] = r4(np.mean(tea))
    dep.append(row)
W["depth"] = dep
print("depth", dep, f"{time.time() - t00:.0f}s")

# ---- 6. importances: impurity (MDI) vs permutation on held-out data
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=SEED)
f = rf(500).fit(Xtr, ytr)
mdi = f.feature_importances_
pim = permutation_importance(f, Xte, yte, n_repeats=30, random_state=SEED, scoring="roc_auc", n_jobs=-1)
fall = rf(500).fit(X, y)
imp = {"split": {"train": int(len(ytr)), "test": int(len(yte))},
       "test_acc": r4(f.score(Xte, yte)), "test_auc": r4(roc_auc_score(yte, f.predict_proba(Xte)[:, 1])),
       "mdi": {nm: r4(v) for nm, v in zip(names, mdi)},
       "perm_auc_mean": {nm: r4(v) for nm, v in zip(names, pim.importances_mean)},
       "perm_auc_sd": {nm: r4(v) for nm, v in zip(names, pim.importances_std)},
       "mdi_full_data": {nm: r4(v) for nm, v in zip(names, fall.feature_importances_)}}
corr = np.corrcoef(X.T)
iu = np.triu_indices(p, 1)
o = np.argsort(-np.abs(corr[iu]))
imp["top_correlated_pairs"] = [[names[iu[0][k]], names[iu[1][k]], r4(corr[iu][k])] for k in o[:8]]
imp["corr_worst_area_worst_perimeter"] = r4(corr[names.index("worst_area"), names.index("worst_perimeter")])
# size group: every radius / perimeter / area column
size = [i for i, nm in enumerate(names) if any(s in nm for s in ("radius", "perimeter", "area"))]
imp["size_group"] = [names[i] for i in size]
imp["size_group_mean_abs_corr"] = r4(np.mean(np.abs(corr[np.ix_(size, size)][np.triu_indices(len(size), 1)])))
base_auc = roc_auc_score(yte, f.predict_proba(Xte)[:, 1])
rg = np.random.default_rng(SEED)
drops = []
for _ in range(30):
    Xp = Xte.copy(); perm = rg.permutation(len(Xte)); Xp[:, size] = Xte[perm][:, size]
    drops.append(base_auc - roc_auc_score(yte, f.predict_proba(Xp)[:, 1]))
imp["group_perm_size_auc_drop"] = r4(np.mean(drops))
imp["sum_individual_perm_size"] = r4(sum(pim.importances_mean[i] for i in size))
# drop one of the most correlated pair (largest |r|), refit, watch the survivor
a, b = imp["top_correlated_pairs"][0][:2]
keep = [i for i, nm in enumerate(names) if nm != b]
f2 = rf(500).fit(Xtr[:, keep], ytr)
imp["drop_pair"] = {"dropped": b, "survivor": a,
                    "survivor_mdi_before": r4(mdi[names.index(a)]),
                    "dropped_mdi_before": r4(mdi[names.index(b)]),
                    "survivor_mdi_after": r4(f2.feature_importances_[keep.index(names.index(a))]),
                    "test_auc_after": r4(roc_auc_score(yte, f2.predict_proba(Xte[:, keep])[:, 1]))}
# the size group: keep only one size feature (worst_area) and refit
keep2 = [i for i in range(p) if i not in size or names[i] == "worst_area"]
f3 = rf(500).fit(Xtr[:, keep2], ytr)
imp["keep_one_size"] = {"kept": "worst_area", "n_features": len(keep2),
                        "worst_area_mdi_before": r4(mdi[names.index("worst_area")]),
                        "worst_area_mdi_after": r4(f3.feature_importances_[keep2.index(names.index("worst_area"))]),
                        "rank_after": int(1 + np.argsort(-f3.feature_importances_).tolist().index(keep2.index(names.index("worst_area")))),
                        "test_auc_after": r4(roc_auc_score(yte, f3.predict_proba(Xte[:, keep2])[:, 1]))}
# noise columns: a continuous one and a binary one (no information about the diagnosis)
rg = np.random.default_rng(SEED)
nz_c, nz_b = rg.normal(size=n), rg.integers(0, 2, n).astype(float)
Xn = np.column_stack([X, nz_c, nz_b])
Xntr, Xnte, yntr, ynte = train_test_split(Xn, y, test_size=0.3, stratify=y, random_state=SEED)
fn = rf(500).fit(Xntr, yntr)
pn = permutation_importance(fn, Xnte, ynte, n_repeats=30, random_state=SEED, scoring="roc_auc", n_jobs=-1)
mdi_n = fn.feature_importances_
rk = np.argsort(-mdi_n).tolist()
imp["noise"] = {"continuous_mdi": r4(mdi_n[p]), "binary_mdi": r4(mdi_n[p + 1]),
                "continuous_rank": rk.index(p) + 1, "binary_rank": rk.index(p + 1) + 1, "of": p + 2,
                "real_features_below_continuous_noise": int((mdi_n[:p] < mdi_n[p]).sum()),
                "continuous_perm": r4(pn.importances_mean[p]), "binary_perm": r4(pn.importances_mean[p + 1]),
                "continuous_perm_sd": r4(pn.importances_std[p]), "binary_perm_sd": r4(pn.importances_std[p + 1])}
W["importance"] = imp
print("importance", {k: v for k, v in imp.items() if k not in ("mdi", "perm_auc_mean", "perm_auc_sd", "mdi_full_data")})

# ---- 7. robustness: irrelevant features and scaling
rob = []
rg = np.random.default_rng(SEED)
NZ = rg.normal(size=(n, 300))
for k in [0, 10, 30, 100, 300]:
    Xk = np.hstack([X, NZ[:, :k]])
    row = {"noise": k}
    for nm, mk in [("rf", rf(300)), ("knn5", knn5()), ("logreg", logreg())]:
        row[nm] = cv_eval(mk, Xk, y)["acc"]
    rob.append(row)
    print("robust", row, f"{time.time() - t00:.0f}s")
scal = {"rf_raw": cv_eval(rf(500), X, y)["acc"],
        "rf_standardised": cv_eval(Pipeline([("sc", StandardScaler()), ("m", rf(500))]), X, y)["acc"],
        "knn5_raw": cv_eval(KNeighborsClassifier(5), X, y)["acc"],
        "knn5_standardised": W["ladder"]["knn5"]["acc"]}
W["robustness"] = {"noise": rob, "scaling": scal}

# ---- 8. worked examples on the real data
gini = lambda c: 1 - sum((x / sum(c)) ** 2 for x in c)
stump = DecisionTreeClassifier(max_depth=1, random_state=SEED).fit(X, y)
tr_ = stump.tree_
feat, thr = names[tr_.feature[0]], float(tr_.threshold[0])
L, R = tr_.children_left[0], tr_.children_right[0]
cnt = lambda node: [int(round(v)) for v in (tr_.value[node][0] * tr_.n_node_samples[node])]
root_c, l_c, r_c = cnt(0), cnt(L), cnt(R)                    # [benign, malignant] order (classes 0,1)
gr, gl, grr = gini(root_c), gini(l_c), gini(r_c)
dec_ = gr - (sum(l_c) / n) * gl - (sum(r_c) / n) * grr
W["worked_gini"] = {"feature": feat, "threshold": r4(thr), "root": root_c, "left": l_c, "right": r_c,
                    "gini_root": r4(gr), "gini_left": r4(gl), "gini_right": r4(grr), "decrease": r4(dec_),
                    "order": "[benign, malignant]"}
# soft vs hard voting for one held-out tumour on which the trees disagree
Pt = np.array([t.predict_proba(Xte)[:, 1] for t in f.estimators_])
vote = (Pt >= 0.5).mean(0)
soft = Pt.mean(0)
cand = np.where((vote > 0.35) & (vote < 0.65))[0]
i0 = int(cand[np.argmin(np.abs(vote[cand] - 0.5))]) if len(cand) else int(np.argmin(np.abs(soft - 0.5)))
W["worked_vote"] = {"test_index": i0, "true_label": int(yte[i0]), "trees": 500,
                    "share_trees_malignant": r4(vote[i0]), "mean_probability": r4(soft[i0]),
                    "n_test_hard_soft_disagree": int(((vote >= 0.5) != (soft >= 0.5)).sum()),
                    "n_test_trees_split_35_65": int(len(cand))}
# variance and majority-vote arithmetic
from math import comb
def maj(pp, B):
    return sum(comb(B, k) * pp ** k * (1 - pp) ** (B - k) for k in range(B // 2 + 1, B + 1))
W["worked_crowd"] = {"p": 0.6, "majority": {str(B): r4(maj(0.6, B)) for B in [1, 5, 25, 101]},
                     "variance_rho_0.3": {str(B): r4(0.3 + 0.7 / B) for B in [1, 10, 100, 1000]}}

# ============================================================ PROTEINS (Week 7 data and split)
spec = importlib.util.spec_from_file_location("w7", os.path.join(HERE, "20_build_week07_refresh.py"))
w7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(w7)
prot, E, Es, _ = w7.load()
CL = w7.features(prot.sequence)[1]
FN = w7.FEATURE_NAMES
tm, sp = prot["is_transmembrane"].values, prot["has_signal_peptide"].values
idx = np.arange(len(prot))
tr, te = train_test_split(idx, test_size=0.25, stratify=2 * tm + sp, random_state=SEED)
K7 = json.load(open(os.path.join(HERE, "week07r_numbers.json")))["knn"]
reps = {"classical": CL, "esm2": E, "esm2_shuffled": Es}
P = {"split": {"train": int(len(tr)), "test": int(len(te))},
     "selection": "5-fold stratified CV (seed 42) on the 1,500 training proteins, mean ROC AUC; "
                  "the test set is used once per pipeline",
     "rf_grid": {"max_features": ["sqrt", 0.1, 0.3], "min_samples_leaf": [1, 5]}, "tasks": {}}
for task, ycol in [("signal_peptide", sp), ("transmembrane", tm)]:
    T = {"prevalence_test": r4(ycol[te].mean()), "rows": {}}
    for rep, M in reps.items():
        for model in ["rf", "logreg"]:
            if model == "rf":
                gs = GridSearchCV(RandomForestClassifier(n_estimators=500, random_state=SEED, n_jobs=-1,
                                                         oob_score=True),
                                  {"max_features": ["sqrt", 0.1, 0.3], "min_samples_leaf": [1, 5]},
                                  scoring="roc_auc", cv=cv5(), n_jobs=1)
            else:
                gs = GridSearchCV(Pipeline([("sc", StandardScaler()),
                                            ("m", LogisticRegression(max_iter=5000, random_state=SEED))]),
                                  {"m__C": [0.01, 0.1, 1.0]}, scoring="roc_auc", cv=cv5(), n_jobs=-1)
            t = time.perf_counter(); gs.fit(M[tr], ycol[tr]); fit_s = time.perf_counter() - t
            best = gs.best_estimator_
            t = time.perf_counter(); best_ = clone(best).fit(M[tr], ycol[tr]); refit_s = time.perf_counter() - t
            pr = best.predict_proba(M[te])[:, 1]
            pd_ = (pr >= 0.5).astype(int)
            row = {"cv_auc": r4(gs.best_score_), "params": {k: (v if isinstance(v, (int, str)) else float(v))
                                                             for k, v in gs.best_params_.items()},
                   "test_auc": r4(roc_auc_score(ycol[te], pr)), "test_ap": r4(average_precision_score(ycol[te], pr)),
                   "test_bal_acc": r4(balanced_accuracy_score(ycol[te], pd_)),
                   "test_recall": r4(recall_score(ycol[te], pd_)), "fit_s": r4(refit_s), "_prob": pr}
            if model == "rf":
                row["oob_auc_note"] = "oob_score_ is accuracy"; row["oob_acc"] = r4(best.oob_score_)
                if rep in ("classical", "esm2"):
                    mdi = best.feature_importances_
                    o = np.argsort(-mdi)[:8]
                    fnames = FN if rep == "classical" else [f"dim_{j}" for j in range(M.shape[1])]
                    row["mdi_top"] = [[fnames[j], r4(mdi[j])] for j in o]
                    pi = permutation_importance(best, M[te], ycol[te], n_repeats=10, random_state=SEED,
                                                scoring="roc_auc", n_jobs=-1)
                    o2 = np.argsort(-pi.importances_mean)[:8]
                    row["perm_top"] = [[fnames[j], r4(pi.importances_mean[j]), r4(pi.importances_std[j])] for j in o2]
                    if rep == "esm2":
                        row["perm_n_dims_positive_2sd"] = int((pi.importances_mean - 2 * pi.importances_std > 0).sum())
                        row["mdi_top10_share"] = r4(np.sort(mdi)[::-1][:10].sum())
                        row["mdi_uniform_share_10"] = r4(10 / M.shape[1])
            T["rows"][rep + "|" + model] = row
            print(task, rep, model, {k: v for k, v in row.items() if k not in ("_prob", "mdi_top", "perm_top")},
                  f"{time.time() - t00:.0f}s")
    # k-NN from Week 7 (same split, same CV protocol; reused, not recomputed)
    for rep in ["classical", "esm2", "esm2_shuffled"]:
        b = K7[task][rep]["best"]
        T["rows"][rep + "|knn"] = {"cv_auc": b["cv_roc_auc"], "test_auc": b["test"]["roc_auc"],
                                   "test_ap": b["test"]["average_precision"],
                                   "test_bal_acc": b["test"]["balanced_accuracy"],
                                   "test_recall": b["test"].get("recall"),
                                   "params": {"k": b["k"], "metric": b["metric"], "weights": b["weights"],
                                              "scale": b["scale"]}, "source": "Week 7 (week07r_numbers.json)"}
    # paired bootstrap: ESM-2 RF minus classical RF, test ROC AUC
    pa, pb = T["rows"]["esm2|rf"]["_prob"], T["rows"]["classical|rf"]["_prob"]
    yy = ycol[te]
    rg = np.random.default_rng(SEED)
    diffs = []
    for _ in range(2000):
        bi = rg.integers(0, len(yy), len(yy))
        if yy[bi].min() == yy[bi].max():
            continue
        diffs.append(roc_auc_score(yy[bi], pa[bi]) - roc_auc_score(yy[bi], pb[bi]))
    T["boot_esm2rf_minus_classicalrf"] = {"diff": r4(roc_auc_score(yy, pa) - roc_auc_score(yy, pb)),
                                          "ci95": [r4(np.percentile(diffs, 2.5)), r4(np.percentile(diffs, 97.5))]}
    for row in T["rows"].values():
        row.pop("_prob", None)
    P["tasks"][task] = T
N["proteins"] = P
N["runtime_s"] = round(time.time() - t00)

# ============================================================ write
json.dump(N, open(OUT_JSON, "w"), indent=1)
with open(OUT_JS, "w") as fh:
    fh.write("/* AUTO-GENERATED by data/scripts/24_build_week10_data.py - do not edit by hand.\n"
             "   REAL DATA: WDBC (UCI, CC BY 4.0) and the Week 7 Swiss-Prot/ESM-2 proteins. */\n")
    fh.write("window.WEEK10 = " + json.dumps(N, separators=(",", ":")) + ";\n")
print("wrote", OUT_JSON, OUT_JS, f"{os.path.getsize(OUT_JS) / 1e3:.0f} kB", f"{time.time() - t00:.0f}s")
