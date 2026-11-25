#!/usr/bin/env python3
"""
Week 11 (boosting and fine-tuning foundation models): every number used by the lecture, the website exercises and
the lab, computed from real data already in the repository. No network, no deep-learning package.

Data: the Week 7 proteins (labs/week07/data): 2,000 reviewed human Swiss-Prot proteins (release 2026_03), one per
UniRef50 cluster; 23 classical descriptors (Week 7); frozen ESM-2 8M embeddings of the whole sequence (Week 7) and of
the first 100 residues, and the fine-tuning results (27_build_week11_finetune.py, labs/week11/data).
Task: N-terminal signal peptide (UniProt keyword KW-0732), 350 of 2,000 proteins (17.5%).

Two protocols, each stated where its numbers are used:
  A. Boosting (lecture Part A, website exercise 1): 5-fold stratified CV (seed 42) on the 1,500 training proteins of the
     Week 7 split; the 500 test proteins are scored once, for the chosen settings only.
  C. The adaptation ladder (lecture Part C, website exercise 3): the 1,500 training proteins split 1,200 fit /
     300 validation (stratified, seed 42); every setting chosen on validation; the 500 test proteins used once per
     pipeline. This is the protocol of the fine-tuning runs, so all rungs are compared on identical data.

Out: data/scripts/week11_numbers.json and js/data/week11.js (window.WEEK11).

    python3 data/scripts/28_build_week11_data.py        # about 5-10 minutes on a laptop CPU
"""
import importlib.util
import json
import os
import re
import time
import warnings

import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.ensemble import (AdaBoostClassifier, GradientBoostingClassifier, HistGradientBoostingClassifier,
                              RandomForestClassifier)
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, average_precision_score, log_loss
from sklearn.model_selection import (StratifiedKFold, StratifiedGroupKFold, train_test_split, GridSearchCV,
                                     cross_val_score)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
D11 = os.path.join(ROOT, "labs", "week11", "data")
OUT_JSON = os.path.join(HERE, "week11_numbers.json")
OUT_JS = os.path.join(ROOT, "js", "data", "week11.js")
SEED = 42
t00 = time.time()
r4 = lambda x: float(round(float(x), 4))

spec = importlib.util.spec_from_file_location("w7", os.path.join(HERE, "20_build_week07_refresh.py"))
w7 = importlib.util.module_from_spec(spec); spec.loader.exec_module(w7)
prot, E, Es, _ = w7.load()
CL = w7.features(prot.sequence)[1]
FN = list(w7.FEATURE_NAMES)
EN = pd.read_csv(os.path.join(D11, "esm2_t6_8M_nterm100_embeddings.csv.gz")).set_index("accession").loc[prot.accession].values
FT = json.load(open(os.path.join(D11, "week11_finetune_results.json")))
tm, y = prot.is_transmembrane.values, prot.has_signal_peptide.values
idx = np.arange(len(prot))
tr, te = train_test_split(idx, test_size=0.25, stratify=2 * tm + y, random_state=SEED)      # Week 7 split
fit, val = train_test_split(tr, test_size=0.2, stratify=y[tr], random_state=SEED)
assert FT["split"]["fit"] == len(fit) and FT["split"]["test"] == len(te)


def cv5():
    return StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)


def logreg():
    return Pipeline([("sc", StandardScaler()), ("m", LogisticRegression(max_iter=5000, random_state=SEED))])


N = {"seed": SEED, "sklearn": sklearn.__version__, "numpy": np.__version__, "pandas": pd.__version__,
     "task": "signal peptide (UniProt KW-0732)", "n": int(len(prot)), "positives": int(y.sum()),
     "prevalence": r4(y.mean()), "split": {"train": int(len(tr)), "test": int(len(te)), "fit": int(len(fit)),
                                           "val": int(len(val)), "test_positives": int(y[te].sum())},
     "features": FN}

# ======================================================================= A. boosting on the 23 descriptors
X, Xtr, ytr = CL, CL[tr], y[tr]
models = {
    "majority": ("Always predict the majority class", None, None),
    "logreg": ("Logistic regression", logreg(), {"m__C": [0.01, 0.1, 1.0, 10.0]}),
    "tree": ("Single decision tree", DecisionTreeClassifier(random_state=SEED),
             {"max_depth": [2, 3, 4, 6, 8], "min_samples_leaf": [1, 10]}),
    "rf": ("Random forest (500 trees)", RandomForestClassifier(n_estimators=500, random_state=SEED, n_jobs=-1),
           {"max_features": ["sqrt", 0.3], "min_samples_leaf": [1, 5]}),
    "adaboost": ("AdaBoost (decision stumps)", AdaBoostClassifier(DecisionTreeClassifier(max_depth=1), random_state=SEED),
                 {"n_estimators": [50, 200, 500], "learning_rate": [0.1, 0.5, 1.0]}),
    "gb": ("Gradient boosting (scikit-learn)", GradientBoostingClassifier(random_state=SEED),
           {"learning_rate": [0.03, 0.1, 0.3], "n_estimators": [100, 300], "max_depth": [2, 3], "subsample": [0.5, 1.0]}),
    "hgb": ("Histogram gradient boosting (XGBoost/LightGBM-style)",
            HistGradientBoostingClassifier(random_state=SEED, early_stopping=True, validation_fraction=0.2,
                                           n_iter_no_change=20, max_iter=1000),
            {"learning_rate": [0.03, 0.1], "max_leaf_nodes": [7, 31], "l2_regularization": [0.0, 1.0]}),
}
A = {"protocol": "5-fold stratified CV (seed 42) on the 1,500 training proteins, mean ROC AUC; settings chosen "
                 "by that CV (GridSearchCV); the 500 test proteins scored once for the chosen settings",
     "rows": {}}
for k, (label, est, grid) in models.items():
    if est is None:
        A["rows"][k] = {"label": label, "cv_auc": 0.5, "cv_auc_sd": 0.0, "test_auc": 0.5,
                        "test_ap": r4(y[te].mean()), "params": {}, "fit_s": 0.0}
        continue
    gs = GridSearchCV(est, grid, scoring="roc_auc", cv=cv5(), n_jobs=-1 if k != "rf" else 1)
    gs.fit(Xtr, ytr)
    sd = gs.cv_results_["std_test_score"][gs.best_index_]
    t = time.perf_counter(); best = clone(gs.best_estimator_).fit(Xtr, ytr); fs = time.perf_counter() - t
    pr = best.predict_proba(X[te])[:, 1]
    row = {"label": label, "cv_auc": r4(gs.best_score_), "cv_auc_sd": r4(sd),
           "params": {p: (v if isinstance(v, (int, str)) else float(v)) for p, v in gs.best_params_.items()},
           "test_auc": r4(roc_auc_score(y[te], pr)), "test_ap": r4(average_precision_score(y[te], pr)),
           "fit_s": r4(fs)}
    if k == "hgb":
        row["n_iter_used"] = int(best.n_iter_)
    A["rows"][k] = row
    if k == "gb":
        GB_BEST = best
    print("A", k, row, f"{time.time() - t00:.0f}s", flush=True)
N["boosting"] = A

# -------- learning curves for the website exercise: GB on the descriptors, CV over the 1,500 training proteins
LR, DEP, SUB, T = [1.0, 0.3, 0.1, 0.03], [1, 3, 6], [1.0, 0.5], 400
STAGES = list(range(1, 20)) + list(range(20, 100, 5)) + list(range(100, T + 1, 20))
curves = {}
folds = list(cv5().split(Xtr, ytr))
for lr in LR:
    for d in DEP:
        for s in SUB:
            tr_ll = np.zeros(T); va_ll = np.zeros(T); va_auc = np.zeros(T)
            for a, b in folds:
                g = GradientBoostingClassifier(learning_rate=lr, n_estimators=T, max_depth=d, subsample=s,
                                               random_state=SEED).fit(Xtr[a], ytr[a])
                for i, p in enumerate(g.staged_predict_proba(Xtr[a])):
                    tr_ll[i] += log_loss(ytr[a], np.clip(p[:, 1], 1e-6, 1 - 1e-6)) / 5
                for i, p in enumerate(g.staged_predict_proba(Xtr[b])):
                    va_ll[i] += log_loss(ytr[b], np.clip(p[:, 1], 1e-6, 1 - 1e-6)) / 5
                    va_auc[i] += roc_auc_score(ytr[b], p[:, 1]) / 5
            key = f"{lr}|{d}|{s}"
            bi = int(np.argmin(va_ll))
            curves[key] = {"train_logloss": [r4(tr_ll[i - 1]) for i in STAGES],
                           "val_logloss": [r4(va_ll[i - 1]) for i in STAGES],
                           "val_auc": [r4(va_auc[i - 1]) for i in STAGES],
                           "best_trees": bi + 1, "best_val_logloss": r4(va_ll[bi]), "val_auc_at_best": r4(va_auc[bi]),
                           "val_logloss_at_max": r4(va_ll[-1]), "val_auc_at_max": r4(va_auc[-1])}
            print("curve", key, curves[key]["best_trees"], curves[key]["best_val_logloss"],
                  curves[key]["val_logloss_at_max"], f"{time.time() - t00:.0f}s", flush=True)
N["gb_curves"] = {"stages": STAGES, "learning_rates": LR, "depths": DEP, "subsample": SUB, "max_trees": T,
                  "protocol": "GradientBoostingClassifier on the 23 descriptors; mean over the same 5 CV folds of the "
                              "1,500 training proteins (seed 42); log-loss and ROC AUC on each held-out fold",
                  "curves": curves}

# -------- importance: impurity (training) vs permutation (test) for the chosen GB model
imp = GB_BEST.feature_importances_
pi = permutation_importance(GB_BEST, X[te], y[te], n_repeats=20, random_state=SEED, scoring="roc_auc", n_jobs=-1)
order = np.argsort(-pi.importances_mean)
N["importance"] = {"model": "the chosen gradient-boosting model (Part A)",
                   "impurity": {FN[j]: r4(imp[j]) for j in range(len(FN))},
                   "perm_mean": {FN[j]: r4(pi.importances_mean[j]) for j in range(len(FN))},
                   "perm_sd": {FN[j]: r4(pi.importances_std[j]) for j in range(len(FN))},
                   "perm_order": [FN[j] for j in order]}
KD = w7.KD
nh = CL[:, FN.index("nterm_hydropathy_25")]
N["importance"]["nterm_hydropathy_by_class"] = {"with_signal_peptide_median": r4(np.median(nh[y == 1])),
                                                "without_median": r4(np.median(nh[y == 0]))}
# evidence: how many signal-peptide labels come from sequence analysis (prediction tools) rather than experiment
N["label_evidence"] = {k: int(v) for k, v in prot.loc[y == 1, "sp_evidence"].value_counts().items()}

# -------- related proteins: random folds versus folds that keep each gene family together
def family(gene, acc):
    """Gene-symbol family: the leading letters of the HGNC symbol (OR2A4 -> OR, SLC6A4 -> SLC). Proteins without a
    symbol, and the uncharacterised chromosome open reading frames (C1orf50, ...), are each their own group."""
    if not isinstance(gene, str) or not gene:
        return acc
    if "orf" in gene:
        return gene
    m = re.match(r"[A-Za-z]+", gene)
    return m.group(0).upper() if m else gene


fam = pd.Series([family(g, a) for g, a in zip(prot.gene, prot.accession)])
groups = fam.values[tr]
vc = pd.Series(groups).value_counts()
sgk = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED)
fam_rows = {}
for k, est, M in [("gb_descriptors", clone(GB_BEST), CL), ("logreg_esm2_whole", Pipeline([("sc", StandardScaler()),
                  ("m", LogisticRegression(C=0.01, max_iter=5000))]), E)]:
    rnd = cross_val_score(est, M[tr], ytr, cv=cv5(), scoring="roc_auc")
    grp = cross_val_score(est, M[tr], ytr, cv=sgk, groups=groups, scoring="roc_auc")
    fam_rows[k] = {"random_mean": r4(rnd.mean()), "random_sd": r4(rnd.std(ddof=1)),
                   "family_mean": r4(grp.mean()), "family_sd": r4(grp.std(ddof=1))}
N["family_split"] = {"grouping": "gene-symbol family: the leading letters of the HGNC symbol (e.g. OR2A4 -> OR, "
                                 "SLC6A4 -> SLC, ZNF91 -> ZNF); proteins without a gene symbol and chromosome ORFs (C1orf50) "
                                 "are each their own group",
                     "n_groups_train": int(len(vc)), "largest_groups": {k: int(v) for k, v in vc.head(8).items()},
                     "protocol": "5-fold CV on the 1,500 training proteins: StratifiedKFold (seed 42) vs "
                                 "StratifiedGroupKFold by family (seed 42)", "rows": fam_rows}
print("family", fam_rows, f"{time.time() - t00:.0f}s", flush=True)

# ======================================================================= C. the adaptation ladder (fit/val/test)
def boot_ci(prob, n=2000):
    rg = np.random.default_rng(SEED); yy = y[te]; prob = np.asarray(prob); v = []
    for _ in range(n):
        b = rg.integers(0, len(yy), len(yy))
        if yy[b].min() == yy[b].max():
            continue
        v.append(roc_auc_score(yy[b], prob[b]))
    return [r4(np.percentile(v, 2.5)), r4(np.percentile(v, 97.5))]


def choose(est, grid, M):
    """Pick the setting with the best validation ROC AUC (fit on the 1,200), then score the test set once."""
    best = None
    keys = list(grid)
    import itertools
    for vals in itertools.product(*[grid[k] for k in keys]):
        e = clone(est).set_params(**dict(zip(keys, vals)))
        t = time.perf_counter(); e.fit(M[fit], y[fit]); fs = time.perf_counter() - t
        a = roc_auc_score(y[val], e.predict_proba(M[val])[:, 1])
        if best is None or a > best[0]:
            best = (a, dict(zip(keys, vals)), e, fs)
    a, p, e, fs = best
    pr = e.predict_proba(M[te])[:, 1]
    return {"val_auc": r4(a), "params": {k: (v if isinstance(v, (int, str)) else float(v)) for k, v in p.items()},
            "test_auc": r4(roc_auc_score(y[te], pr)), "test_ap": r4(average_precision_score(y[te], pr)),
            "fit_s": r4(fs), "ci95": boot_ci(pr), "_prob": pr}


L = {}
L["majority"] = {"val_auc": 0.5, "test_auc": 0.5, "test_ap": r4(y[te].mean()), "ci95": [0.5, 0.5], "fit_s": 0.0,
                 "trainable": 0, "params": {}}
L["logreg_desc"] = choose(logreg(), {"m__C": [0.01, 0.1, 1.0, 10.0]}, CL); L["logreg_desc"]["trainable"] = 24
L["rf_desc"] = choose(RandomForestClassifier(n_estimators=500, random_state=SEED, n_jobs=-1),
                      {"max_features": ["sqrt", 0.3], "min_samples_leaf": [1, 5]}, CL)
L["hgb_desc"] = choose(HistGradientBoostingClassifier(random_state=SEED, max_iter=300),
                       {"learning_rate": [0.03, 0.1], "max_leaf_nodes": [7, 31], "l2_regularization": [0.0, 1.0]}, CL)
L["logreg_esm_whole"] = choose(logreg(), {"m__C": [0.001, 0.01, 0.1, 1.0]}, E); L["logreg_esm_whole"]["trainable"] = 321
L["logreg_esm_nterm"] = choose(logreg(), {"m__C": [0.001, 0.01, 0.1, 1.0]}, EN); L["logreg_esm_nterm"]["trainable"] = 321
L["hgb_esm_nterm"] = choose(HistGradientBoostingClassifier(random_state=SEED, max_iter=300),
                            {"learning_rate": [0.03, 0.1], "max_leaf_nodes": [7, 31], "l2_regularization": [0.0, 1.0]}, EN)
# cross-check: the frozen-head numbers in the fine-tuning file used the same protocol
assert abs(L["logreg_esm_nterm"]["test_auc"] - FT["frozen"]["nterm"]["test_auc"]) < 1e-3, "frozen n-term head differs"
for kind in ["lora", "full"]:
    R = FT["finetune"]["runs"][kind]
    probs = np.mean([s["test_prob"] for s in R["seeds"]], axis=0)
    L["ft_" + kind] = {"val_auc": r4(np.mean([s["val_auc"] for s in R["seeds"]])), "test_auc": R["test_auc_mean"],
                       "test_auc_sd": R["test_auc_sd"], "test_auc_seeds": [s["test_auc"] for s in R["seeds"]],
                       "test_ap": R["test_ap_mean"], "ci95_seed0": boot_ci(R["seeds"][0]["test_prob"]),
                       "trainable": R["seeds"][0]["trainable_params"], "total": R["seeds"][0]["total_params"],
                       "lr": R["chosen_lr"], "best_epochs": [s["best_epoch"] for s in R["seeds"]],
                       "train_s_mean": r4(np.mean([s["train_seconds"] for s in R["seeds"]])),
                       "s_per_epoch": r4(np.mean([s["seconds_per_epoch"] for s in R["seeds"]])),
                       "ensemble_of_seeds_test_auc": r4(roc_auc_score(y[te], probs))}
labels = {"majority": "Majority class (no model)", "logreg_desc": "Logistic regression, 23 descriptors",
          "rf_desc": "Random forest, 23 descriptors", "hgb_desc": "Gradient boosting (histogram), 23 descriptors",
          "logreg_esm_whole": "Frozen ESM-2, whole sequence + logistic regression",
          "logreg_esm_nterm": "Frozen ESM-2, first 100 residues + logistic regression",
          "hgb_esm_nterm": "Frozen ESM-2, first 100 residues + gradient boosting",
          "ft_lora": "LoRA fine-tuning of ESM-2 (first 100 residues)",
          "ft_full": "Full fine-tuning of ESM-2 (first 100 residues)"}
for k, v in L.items():
    v["label"] = labels[k]
    v.pop("_prob", None)
# paired bootstrap of the two cheapest strong rungs against fine-tuning (seed-0 probabilities for fine-tuning)
def paired(pa, pb, n=2000):
    rg = np.random.default_rng(SEED); yy = y[te]; v = []
    pa, pb = np.asarray(pa), np.asarray(pb)
    for _ in range(n):
        b = rg.integers(0, len(yy), len(yy))
        if yy[b].min() == yy[b].max():
            continue
        v.append(roc_auc_score(yy[b], pa[b]) - roc_auc_score(yy[b], pb[b]))
    return {"diff": r4(roc_auc_score(yy, pa) - roc_auc_score(yy, pb)),
            "ci95": [r4(np.percentile(v, 2.5)), r4(np.percentile(v, 97.5))]}
pn = FT["frozen"]["nterm"]["test_prob"]
N["ladder_paired"] = {"lora_seed0_minus_frozen_nterm": paired(FT["finetune"]["runs"]["lora"]["seeds"][0]["test_prob"], pn),
                      "full_seed0_minus_frozen_nterm": paired(FT["finetune"]["runs"]["full"]["seeds"][0]["test_prob"], pn)}
N["ladder"] = {"protocol": "1,200 fit / 300 validation / 500 test (Week 7 test split); settings chosen on validation "
                           "ROC AUC; test set used once per pipeline; 95% CI: 2,000 bootstrap resamples of the test set; "
                           "fine-tuning: mean of 3 seeds",
               "rows": L, "order": list(labels)}

# -------- LoRA arithmetic for ESM-2 8M (checked against the count reported by peft)
d, layers, r = 320, 6, 8
per = r * (d + d)
head = (d * d + d) + (d * 2 + 2)
N["lora_arith"] = {"hidden": d, "layers": layers, "rank": r, "per_matrix": per, "matrices": 2 * layers,
                   "lora_total": per * 2 * layers, "head": head, "total_trainable": per * 2 * layers + head,
                   "peft_reported": FT["finetune"]["runs"]["lora"]["seeds"][0]["trainable_params"],
                   "backbone_params": FT["finetune"]["runs"]["full"]["seeds"][0]["total_params"]}
assert N["lora_arith"]["total_trainable"] == N["lora_arith"]["peft_reported"], N["lora_arith"]
N["finetune_meta"] = {k: FT[k] for k in ["model", "revision", "versions", "protocol", "hardware", "window_residues",
                                         "seconds_embed_nterm_2000", "sanity_whole_sequence_max_abs_diff_vs_week7"]}
N["finetune_meta"]["grid"] = FT["finetune"]["grid"]
N["finetune_meta"]["curves"] = {k: FT["finetune"]["runs"][k]["seeds"][0]["curve"] for k in ["lora", "full"]}
N["finetune_meta"]["tuning"] = {k: [{"lr": t["lr"], "val_auc": t["val_auc"], "best_epoch": t["best_epoch"]}
                                    for t in FT["finetune"]["runs"][k]["tuning"]] for k in ["lora", "full"]}
N["zero_shot"] = {k: v for k, v in FT["zero_shot"].items()}
N["runtime_s"] = round(time.time() - t00)

json.dump(N, open(OUT_JSON, "w"), indent=1)
with open(OUT_JS, "w") as fh:
    fh.write("/* AUTO-GENERATED by data/scripts/28_build_week11_data.py - do not edit by hand.\n"
             "   REAL DATA: the Week 7 Swiss-Prot proteins (UniProt 2026_03, CC BY 4.0), ESM-2 8M (MIT). */\n")
    fh.write("window.WEEK11 = " + json.dumps(N, separators=(",", ":")) + ";\n")
print("wrote", OUT_JSON, OUT_JS, f"{os.path.getsize(OUT_JS) / 1e3:.0f} kB", f"{time.time() - t00:.0f}s")
