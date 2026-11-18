#!/usr/bin/env python3
"""
Week 10 (ensemble learning, 2026 revision of the 2025 lecture): the numbers behind the new biology and
nutrition slides and the two new website exercises (AdaBoost step-through, gradient boosting step-through).
Real data only, except the 10-row bacterial-growth table, which is an illustrative teaching table (like the
lecture's 10-row bicycle table) and is labelled as such everywhere it appears.

  * WDBC (UCI Breast Cancer Wisconsin Diagnostic, 569 tumours, 30 features; scikit-learn copy). Same protocol as
    24_build_week10_data.py and js/data/benchmarks.js: 5-fold stratified CV, seed 42.
  * Diabetes progression (Efron, Hastie, Johnstone & Tibshirani 2004, "Least angle regression", Ann. Stat.;
    scikit-learn copy, unscaled): 442 patients; age, sex, BMI, mean blood pressure and six blood-serum
    measurements at baseline; target = a quantitative measure of disease progression one year later.

Out: data/scripts/week10_ensembles_numbers.json and js/data/week10_ensembles.js (window.WEEK10E).

    python3 data/scripts/26_build_week10_ensembles.py     # about a minute on a laptop CPU
"""
import json
import math
import os
import time
import warnings

import numpy as np
import sklearn
from sklearn.datasets import load_breast_cancer, load_diabetes
from sklearn.ensemble import (AdaBoostClassifier, BaggingClassifier, GradientBoostingClassifier,
                              GradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor,
                              VotingClassifier)
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import accuracy_score, mean_squared_error, r2_score, roc_auc_score
from sklearn.model_selection import KFold, StratifiedKFold, cross_validate, train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SEED = 42
t0 = time.time()
r4 = lambda x: round(float(x), 4)
out = {"seed": SEED, "sklearn": sklearn.__version__, "numpy": np.__version__}

# ------------------------------------------------------------------ 1. WDBC: model comparison (same CV)
X, y = load_breast_cancer(return_X_y=True)
y = 1 - y            # 1 = malignant, as in the rest of the course
cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
std = lambda m: make_pipeline(StandardScaler(), m)
models = {
    "tree": ("Single decision tree (unpruned)", DecisionTreeClassifier(random_state=SEED)),
    "bagging": ("Bagged trees (500)", BaggingClassifier(DecisionTreeClassifier(), n_estimators=500, random_state=SEED, n_jobs=-1)),
    "rf": ("Random forest (500 trees)", RandomForestClassifier(500, random_state=SEED, n_jobs=-1)),
    "adaboost": ("AdaBoost (200 decision stumps)", AdaBoostClassifier(DecisionTreeClassifier(max_depth=1), n_estimators=200, random_state=SEED)),
    "gboost": ("Gradient boosting (100 trees, depth 3, rate 0.1)", GradientBoostingClassifier(random_state=SEED)),
    "logreg": ("Logistic regression (standardised)", std(LogisticRegression(max_iter=5000))),
    "knn5": ("k-NN, k = 5 (standardised)", std(KNeighborsClassifier(5))),
    "vote_soft": ("Soft voting: logistic regression + k-NN + forest", VotingClassifier(
        [("lr", std(LogisticRegression(max_iter=5000))), ("knn", std(KNeighborsClassifier(5))),
         ("rf", RandomForestClassifier(500, random_state=SEED, n_jobs=-1))], voting="soft")),
    "vote_hard": ("Hard (majority) voting: same three models", VotingClassifier(
        [("lr", std(LogisticRegression(max_iter=5000))), ("knn", std(KNeighborsClassifier(5))),
         ("rf", RandomForestClassifier(500, random_state=SEED, n_jobs=-1))], voting="hard")),
}
comp = {}
for k, (label, m) in models.items():
    sc = ["accuracy"] + (["roc_auc"] if k != "vote_hard" else [])
    r = cross_validate(m, X, y, cv=cv, scoring=sc)
    comp[k] = {"label": label, "acc": r4(r["test_accuracy"].mean()), "acc_sd": r4(r["test_accuracy"].std()),
               "auc": r4(r["test_roc_auc"].mean()) if "test_roc_auc" in r else None,
               "folds_acc": [r4(v) for v in r["test_accuracy"]]}
out["wdbc_comparison"] = comp

# ------------------------------------------------------------------ 2. WDBC: bagging stabilises predictions
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=SEED)
rng = np.random.default_rng(SEED)
R = 20
p_tree, p_bag, acc_tree, acc_bag = [], [], [], []
for r in range(R):
    idx = rng.integers(0, len(ytr), len(ytr))         # "collect another sample of patients"
    t = DecisionTreeClassifier(random_state=r).fit(Xtr[idx], ytr[idx])
    b = BaggingClassifier(DecisionTreeClassifier(), n_estimators=100, random_state=r, n_jobs=-1).fit(Xtr[idx], ytr[idx])
    p_tree.append(t.predict(Xte)); p_bag.append(b.predict(Xte))
    acc_tree.append(accuracy_score(yte, p_tree[-1])); acc_bag.append(accuracy_score(yte, p_bag[-1]))
dis = lambda P: np.mean([np.mean(P[i] != P[j]) for i in range(R) for j in range(i + 1, R)])
ever = lambda P: int(np.sum(np.ptp(np.array(P), axis=0) > 0))
out["wdbc_stability"] = {
    "resamples": R, "n_test": int(len(yte)), "bag_trees": 100,
    "tree_pairwise_disagreement": r4(dis(p_tree)), "bag_pairwise_disagreement": r4(dis(p_bag)),
    "tree_test_ever_changes": ever(p_tree), "bag_test_ever_changes": ever(p_bag),
    "tree_acc_mean": r4(np.mean(acc_tree)), "tree_acc_sd": r4(np.std(acc_tree)),
    "bag_acc_mean": r4(np.mean(acc_bag)), "bag_acc_sd": r4(np.std(acc_bag))}

# ------------------------------------------------------------------ 3. WDBC: AdaBoost curve (stumps)
ada = AdaBoostClassifier(DecisionTreeClassifier(max_depth=1), n_estimators=400, random_state=SEED).fit(Xtr, ytr)
tr_curve = [accuracy_score(ytr, p) for p in ada.staged_predict(Xtr)]
te_curve = [accuracy_score(yte, p) for p in ada.staged_predict(Xte)]
stump = DecisionTreeClassifier(max_depth=1).fit(Xtr, ytr)
names = [n.replace(" ", "_") for n in load_breast_cancer().feature_names]
out["wdbc_adaboost"] = {
    "n_train": int(len(ytr)), "n_test": int(len(yte)),
    "stump_feature": names[stump.tree_.feature[0]], "stump_threshold": r4(stump.tree_.threshold[0]),
    "stump_train_acc": r4(accuracy_score(ytr, stump.predict(Xtr))), "stump_test_acc": r4(accuracy_score(yte, stump.predict(Xte))),
    "rounds": [1, 2, 5, 10, 20, 50, 100, 200, 400],
    "train_acc": [r4(tr_curve[k - 1]) for k in [1, 2, 5, 10, 20, 50, 100, 200, 400]],
    "test_acc": [r4(te_curve[k - 1]) for k in [1, 2, 5, 10, 20, 50, 100, 200, 400]],
    "train_curve": [r4(v) for v in tr_curve], "test_curve": [r4(v) for v in te_curve]}

# ------------------------------------------------------------------ 4. Illustrative table: bacterial growth
# Illustrative only (like the lecture's bicycle table): visible growth within 48 h of a mesophilic food-borne
# bacterium at different storage temperatures. Mesophiles typically grow between roughly 8 and 45 C, so growth
# is 'Low' in chilled storage and above the maximum.  Boosting exactly as on the slides: weighted stumps,
# alpha = 0.5 ln((1-e)/e), misclassified w *= 1/(2e), correct w *= 1/(2(1-e)).
temp = [4, 5, 7, 12, 18, 23, 30, 37, 46, 50]
grow = [-1, -1, -1, 1, 1, 1, 1, 1, -1, -1]         # +1 = High, -1 = Low


def best_stump(w):
    best = None
    cuts = [(temp[i] + temp[i + 1]) / 2 for i in range(len(temp) - 1)]
    for c in cuts:
        for left in (-1, 1):
            pred = [left if t < c else -left for t in temp]
            e = sum(wi for wi, p, g in zip(w, pred, grow) if p != g)
            if best is None or e < best[0] - 1e-12:
                best = (e, c, left, pred)
    return best


w = [0.1] * 10
iters, F = [], [0.0] * 10
for it in range(10):
    e, c, left, pred = best_stump(w)
    a = 0.5 * math.log((1 - e) / e)
    F = [f + a * p for f, p in zip(F, pred)]
    iters.append({"weights": [r4(v) for v in w], "cut": c, "left": "High" if left == 1 else "Low",
                  "right": "Low" if left == 1 else "High", "pred": ["High" if p == 1 else "Low" for p in pred],
                  "eps": r4(e), "alpha": r4(a),
                  "ensemble": ["High" if f > 0 else "Low" for f in F],
                  "ensemble_errors": int(sum((1 if f > 0 else -1) != g for f, g in zip(F, grow)))})
    w = [wi / (2 * e) if p != g else wi / (2 * (1 - e)) for wi, p, g in zip(w, pred, grow)]
out["bacteria_toy"] = {"temp": temp, "growth": ["High" if g == 1 else "Low" for g in grow],
                       "illustrative": True, "iterations": iters}

# ------------------------------------------------------------------ 5. Diabetes progression: gradient boosting
dia = load_diabetes(scaled=False)
D, t = dia.data, dia.target
fn = ["age", "sex", "bmi", "bp", "s1_total_chol", "s2_ldl", "s3_hdl", "s4_chol_hdl", "s5_log_trig", "s6_glucose"]
bmi = D[:, 2]
# 5a: one feature (BMI), regression stumps, learning rate 1, as in the bicycle example
M = np.full_like(t, t.mean(), dtype=float)
stages = {0: M.copy()}
mse = [mean_squared_error(t, M)]
for i in range(1, 21):
    s = DecisionTreeRegressor(max_depth=1).fit(bmi.reshape(-1, 1), t - M)
    M = M + s.predict(bmi.reshape(-1, 1))
    mse.append(mean_squared_error(t, M))
    if i in (1, 2, 3, 20):
        stages[i] = M.copy()
order = np.argsort(bmi)
out["diabetes_bmi"] = {
    "n": int(len(t)), "target_mean": r4(t.mean()), "bmi_min": r4(bmi.min()), "bmi_max": r4(bmi.max()),
    "mse_by_stage": [r4(v) for v in mse], "r2_stage20": r4(1 - mse[20] / mse[0]),
    "first_split_bmi": r4(DecisionTreeRegressor(max_depth=1).fit(bmi.reshape(-1, 1), t - t.mean()).tree_.threshold[0])}
# 5b: all ten features, held-out test set, learning rate vs number of trees
Dtr, Dte, ttr, tte = train_test_split(D, t, test_size=0.3, random_state=SEED)
curves = {}
for lr in (1.0, 0.1):
    g = GradientBoostingRegressor(n_estimators=300, learning_rate=lr, max_depth=2, random_state=SEED).fit(Dtr, ttr)
    te = [mean_squared_error(tte, p) for p in g.staged_predict(Dte)]
    tr = [mean_squared_error(ttr, p) for p in g.staged_predict(Dtr)]
    curves[str(lr)] = {"train_mse": [r4(v) for v in tr], "test_mse": [r4(v) for v in te],
                       "best_trees": int(np.argmin(te) + 1), "best_test_mse": r4(min(te)), "final_test_mse": r4(te[-1])}
out["diabetes_lr_curves"] = curves
cvr = KFold(5, shuffle=True, random_state=SEED)
regs = {"mean": ("Predict the mean (baseline)", None),
        "linreg": ("Linear regression", LinearRegression()),
        "tree": ("Single regression tree (depth 3)", DecisionTreeRegressor(max_depth=3, random_state=SEED)),
        "rf": ("Random forest (500 trees, min leaf 5)", RandomForestRegressor(500, min_samples_leaf=5, random_state=SEED, n_jobs=-1)),
        "gboost": ("Gradient boosting (depth 2, rate 0.1, 100 trees)", GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=2, random_state=SEED))}
rc = {}
for k, (label, m) in regs.items():
    if m is None:
        r2s, rm = [], []
        for a, b in cvr.split(D):
            p = np.full(len(b), t[a].mean())
            r2s.append(r2_score(t[b], p)); rm.append(math.sqrt(mean_squared_error(t[b], p)))
        r2s, rm = np.array(r2s), np.array(rm)
    else:
        r = cross_validate(m, D, t, cv=cvr, scoring=["r2", "neg_root_mean_squared_error"])
        r2s, rm = r["test_r2"], -r["test_neg_root_mean_squared_error"]
    rc[k] = {"label": label, "r2": r4(r2s.mean()), "r2_sd": r4(r2s.std()), "rmse": r4(rm.mean()), "rmse_sd": r4(rm.std())}
out["diabetes_comparison"] = rc
# 5c: feature importance (forest), impurity on training data versus permutation on held-out patients
rf = RandomForestRegressor(500, min_samples_leaf=5, random_state=SEED, n_jobs=-1).fit(Dtr, ttr)
pi = permutation_importance(rf, Dte, tte, n_repeats=30, random_state=SEED, scoring="r2")
C = np.corrcoef(D.T)
out["diabetes_importance"] = {
    "features": fn, "test_r2": r4(r2_score(tte, rf.predict(Dte))),
    "mdi": {f: r4(v) for f, v in zip(fn, rf.feature_importances_)},
    "perm_r2_mean": {f: r4(v) for f, v in zip(fn, pi.importances_mean)},
    "perm_r2_sd": {f: r4(v) for f, v in zip(fn, pi.importances_std)},
    "corr_s1_s2": r4(C[4, 5]), "corr_s3_s4": r4(C[6, 7]), "corr_bmi_s5": r4(C[2, 8])}
# 5d: the 442 (BMI, progression) pairs for the in-browser gradient-boosting exercise
out["diabetes_points"] = {"bmi": [round(float(v), 1) for v in bmi], "progression": [int(v) for v in t]}
out["runtime_s"] = round(time.time() - t0, 1)

with open(os.path.join(HERE, "week10_ensembles_numbers.json"), "w") as f:
    json.dump(out, f, indent=1)
with open(os.path.join(ROOT, "js", "data", "week10_ensembles.js"), "w") as f:
    f.write("/* AUTO-GENERATED by data/scripts/26_build_week10_ensembles.py - do not edit by hand.\n"
            "   REAL DATA: WDBC (UCI, CC BY 4.0) and the diabetes-progression data of Efron et al. (2004).\n"
            "   The 10-row bacterial-growth table is illustrative (bacteria_toy.illustrative = true). */\n")
    f.write("window.WEEK10E = " + json.dumps(out, separators=(",", ":")) + ";\n")
print(json.dumps({k: v for k, v in out.items() if k not in ("diabetes_points", "wdbc_adaboost", "diabetes_lr_curves")}, indent=1)[:6000])
print("adaboost", {k: out["wdbc_adaboost"][k] for k in ("stump_feature", "stump_threshold", "stump_test_acc", "rounds", "train_acc", "test_acc")})
print("lr curves", {k: {kk: v[kk] for kk in ("best_trees", "best_test_mse", "final_test_mse")} for k, v in curves.items()})
