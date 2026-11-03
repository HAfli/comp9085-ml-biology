#!/usr/bin/env python3
"""
Week 4: every number the lecture, the website and the lab report, computed once.

Outputs
    data/scripts/week04_numbers.json   every reported number (deck + notes read this)
    js/data/week04.js                  the same numbers plus the two illustrative
                                       score sets, for the website interactives

Three kinds of number live here, and each is labelled as such wherever it is
shown:

  1. Exact arithmetic. The diagnostic-test examples (1,000 people, 1 per cent
     prevalence, 95 per cent sensitivity and specificity, and the prevalence
     sweep) are not data at all: they are expected counts that follow exactly
     from the stated assumptions. They are hypothetical classroom numbers and
     make no claim about any real test.

  2. Illustrative simulation - not a biological dataset. The threshold demo
     (200 synthetic "patients" with a model score) and the calibration demo
     (5,000 synthetic cases with a known true probability) are generated here
     with a fixed seed, because the teaching point needs ground truth that no
     real dataset provides: in the calibration demo the true probability of
     every case is known by construction.

  3. Real measured data. The WDBC logistic-regression and Gaussian naive Bayes
     numbers are real, computed on the UCI Breast Cancer Wisconsin (Diagnostic)
     data with the same encoding as Weeks 2 and 3 (1 = malignant). They are
     classroom evaluation results, not clinical performance.

    python3 data/scripts/08_build_week04_data.py
"""
import json
import math
import os

import numpy as np
import sklearn
from sklearn.calibration import calibration_curve
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, brier_score_loss,
                             confusion_matrix, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SEED = 42
SIM_LABEL = "Illustrative simulation — not a biological dataset."


def r(x, d=4):
    return round(float(x), d)


# ---------------------------------------------------------------- 1. exact
def diagnostic(n, prev, sens, spec):
    """Expected counts for a test applied to n people. Exact, not simulated."""
    ill = n * prev
    well = n - ill
    tp = ill * sens
    fn = ill - tp
    fp = well * (1 - spec)
    tn = well - fp
    return {
        "n": n, "prevalence": prev, "sensitivity": sens, "specificity": spec,
        "ill": r(ill, 3), "well": r(well, 3),
        "tp": r(tp, 3), "fn": r(fn, 3), "fp": r(fp, 3), "tn": r(tn, 3),
        "testPositive": r(tp + fp, 3), "testNegative": r(tn + fn, 3),
        "ppv": r(tp / (tp + fp), 6), "npv": r(tn / (tn + fn), 6),
        "accuracy": r((tp + tn) / n, 6),
        "fpr": r(1 - spec, 6), "fnr": r(1 - sens, 6),
        "falsePositivesPerTruePositive": r(fp / tp, 4),
    }


hook = diagnostic(1000, 0.01, 0.95, 0.95)
hook10k = diagnostic(10000, 0.01, 0.95, 0.95)
# Sanity checks on the lecture's central example; if any of these ever fail,
# the deck is wrong.
assert abs(hook["ppv"] - 0.0095 / 0.059) < 1e-6
assert hook10k["tp"] == 95 and hook10k["fp"] == 495
assert abs(hook["accuracy"] - 0.95) < 1e-12

prevalence_sweep = [diagnostic(10000, p, 0.95, 0.95)
                    for p in (0.001, 0.005, 0.01, 0.02, 0.05, 0.10, 0.20,
                              0.30, 0.50)]

# The "same test, different population" pair used on the slides.
screening = diagnostic(10000, 0.01, 0.95, 0.95)
clinic = diagnostic(10000, 0.20, 0.95, 0.95)

# The second puzzle: a 99% sensitive, 99% specific test in 100,000 people at
# four prevalences (the last is WDBC's malignant fraction, used here only as a
# prevalence). Hypothetical classroom example. Every count is asserted, so a
# slide table built from these rows cannot silently drift.
ex99 = [diagnostic(100000, p, 0.99, 0.99) for p in (0.001, 0.01, 0.10, 0.373)]
EXPECT99 = [  # ill, TP, FP, positives, PPV (rounded to 0.1 per cent)
    (100, 99, 999, 1098, 0.090), (1000, 990, 990, 1980, 0.500),
    (10000, 9900, 900, 10800, 0.917), (37300, 36927, 627, 37554, 0.983)]
for row, (ill, tp, fp, pos, ppv) in zip(ex99, EXPECT99):
    assert abs(row["ill"] - ill) < 1e-6 and abs(row["tp"] - tp) < 1e-6, row
    assert abs(row["fp"] - fp) < 1e-6 and abs(row["testPositive"] - pos) < 1e-6, row
    assert round(row["ppv"], 3) == ppv, row

# Mini challenge: a better-specificity test at 1 per cent prevalence.
challenge = diagnostic(10000, 0.01, 0.95, 0.99)
# Case study: two-stage testing. Stage 1 at 1 per cent prevalence; the
# positives from stage 1 become the population for stage 2, whose prevalence
# is stage 1's PPV. Assumes the second test's errors are independent of the
# first's given disease status - stated on the slide.
stage1 = diagnostic(10000, 0.01, 0.95, 0.95)
stage2 = diagnostic(stage1["testPositive"], stage1["ppv"], 0.90, 0.99)

# ---------------------------------------------------------- 2. simulations
rng = np.random.default_rng(SEED)

# Threshold demo: 200 synthetic patients, 50 with the condition. Scores are
# rounded to two decimals so the table on the slide can be checked by hand.
N_ILL, N_WELL = 50, 150
s_ill = np.round(rng.beta(4.5, 2.2, N_ILL), 2)
s_well = np.round(rng.beta(2.0, 4.5, N_WELL), 2)
thr_scores = np.r_[s_ill, s_well]
thr_labels = np.r_[np.ones(N_ILL, int), np.zeros(N_WELL, int)]


def at_threshold(scores, labels, t):
    pred = scores >= t
    tp = int((pred & (labels == 1)).sum())
    fp = int((pred & (labels == 0)).sum())
    fn = int(((~pred) & (labels == 1)).sum())
    tn = int(((~pred) & (labels == 0)).sum())
    return {
        "threshold": t, "tp": tp, "fp": fp, "fn": fn, "tn": tn,
        "sensitivity": r(tp / (tp + fn)), "specificity": r(tn / (tn + fp)),
        "ppv": r(tp / (tp + fp)) if tp + fp else None,
        "npv": r(tn / (tn + fn)) if tn + fn else None,
        "accuracy": r((tp + tn) / len(labels)),
    }


thr_table = [at_threshold(thr_scores, thr_labels, t)
             for t in (0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9)]
thr_auc = roc_auc_score(thr_labels, thr_scores)
_t = {round(t["threshold"], 1): t for t in thr_table}
assert (_t[0.2]["fn"], _t[0.2]["fp"]) == (0, 109)
assert (_t[0.5]["fn"], _t[0.5]["fp"]) == (6, 23)
assert (_t[0.8]["fn"], _t[0.8]["fp"]) == (35, 1)

# Calibration demo: 5,000 synthetic cases with a KNOWN true probability p.
# Outcomes are drawn from p. Model A reports p itself (calibrated by
# construction). Models B and C report a monotone distortion of p, so they
# rank the cases identically (identical AUC) and cross 0.5 at the same place
# (identical accuracy at the 0.5 threshold), yet their probabilities mean
# different things. This is the cleanest possible demonstration that
# calibration and discrimination are different questions.
N_CAL = 5000
# Rounded to three decimals BEFORE anything is computed, because that is the
# precision js/data/week04.js carries: the site and the deck then compute from
# identical inputs.
p_true = np.round(np.clip(rng.beta(1.3, 1.6, N_CAL), 0.01, 0.99), 3)
y_cal = (rng.random(N_CAL) < p_true).astype(int)


def distort(p, k, shift=0.0):
    z = np.log(p / (1 - p))
    return 1 / (1 + np.exp(-(k * z + shift)))


cal_models = {
    "A": {"label": "Model A (calibrated)", "k": 1.0},
    "B": {"label": "Model B (over-confident)", "k": 2.5},
    "C": {"label": "Model C (under-confident)", "k": 0.45},
}
EDGES = np.linspace(0, 1, 11)
for key, m in cal_models.items():
    p = distort(p_true, m["k"])
    bins = []
    idx = np.clip(np.digitize(p, EDGES) - 1, 0, 9)
    for b in range(10):
        sel = idx == b
        if sel.sum() == 0:
            continue
        bins.append({"lo": r(EDGES[b], 2), "hi": r(EDGES[b + 1], 2),
                     "n": int(sel.sum()),
                     "meanPredicted": r(p[sel].mean()),
                     "fractionPositive": r(y_cal[sel].mean())})
    ece = sum(bn["n"] * abs(bn["meanPredicted"] - bn["fractionPositive"])
              for bn in bins) / N_CAL
    near08 = (p >= 0.75) & (p < 0.85)
    m.update({
        "accuracy": r(accuracy_score(y_cal, p >= 0.5)),
        "auc": r(roc_auc_score(y_cal, p)),
        "brier": r(brier_score_loss(y_cal, p)),
        "ece": r(ece),
        "bins": bins,
        "near08": {"n": int(near08.sum()),
                   "fractionPositive": r(y_cal[near08].mean())},
        # What a stated 0.8 actually corresponds to, exactly, under this model.
        "trueProbabilityWhenItSays08": r(distort(np.array([0.8]), 1 / m["k"])[0]),
    })
assert cal_models["A"]["auc"] == cal_models["B"]["auc"] == cal_models["C"]["auc"]
assert cal_models["A"]["accuracy"] == cal_models["B"]["accuracy"]

# ------------------------------------------------------------- 3. real WDBC
X, y = load_breast_cancer(return_X_y=True)
y = (y == 0).astype(int)            # 1 = malignant, as in Weeks 2 and 3
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y,
                                      random_state=SEED)
wdbc = {"nTrain": int(len(ytr)), "nTest": int(len(yte)),
        "testMalignant": int(yte.sum()), "testBenign": int(len(yte) - yte.sum()),
        "prevalenceTest": r(yte.mean()), "models": {}}
for key, model in (("logreg", make_pipeline(StandardScaler(),
                                            LogisticRegression(max_iter=1000))),
                   ("gnb", GaussianNB())):
    model.fit(Xtr, ytr)
    p = model.predict_proba(Xte)[:, 1]
    tn, fp, fn, tp = confusion_matrix(yte, p >= 0.5).ravel()
    fr, mp = calibration_curve(yte, p, n_bins=5, strategy="uniform")
    wdbc["models"][key] = {
        "accuracy": r(accuracy_score(yte, p >= 0.5)),
        "auc": r(roc_auc_score(yte, p)), "brier": r(brier_score_loss(yte, p)),
        "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn),
        "sensitivity": r(tp / (tp + fn)), "specificity": r(tn / (tn + fp)),
        "fractionExtreme": r(np.mean((p < 0.05) | (p > 0.95))),
        "calibration": {"meanPredicted": [r(v) for v in mp],
                        "fractionPositive": [r(v) for v in fr]},
    }
    # For the website's WDBC comparison: reliability bins WITH case counts
    # (5 equal-width bins, empty bins dropped, as calibration_curve does), and a
    # 10-bin histogram of the predicted probabilities, all on the final test set.
    edges = np.linspace(0, 1, 6)
    bidx = np.clip(np.digitize(p, edges) - 1, 0, 4)
    wdbc["models"][key]["reliability"] = [
        {"lo": r(edges[b], 1), "hi": r(edges[b + 1], 1), "n": int((bidx == b).sum()),
         "meanPredicted": r(p[bidx == b].mean()), "fractionPositive": r(yte[bidx == b].mean())}
        for b in range(5) if (bidx == b).sum() > 0]
    wdbc["models"][key]["histogram"] = [int(c) for c in
                                        np.histogram(p, bins=np.linspace(0, 1, 11))[0]]
    assert sum(wdbc["models"][key]["histogram"]) == len(yte)
    # The same model moved to other prevalences, from the EXACT sensitivity and
    # specificity (tp/(tp+fn), tn/(tn+fp)), so the deck agrees with the lab.
    se_x, sp_x = tp / (tp + fn), tn / (tn + fp)
    wdbc["models"][key]["ppvAtPrevalence"] = [
        {"prevalence": r(pv), "ppv": r(se_x * pv / (se_x * pv + (1 - sp_x) * (1 - pv)))}
        for pv in (yte.mean(), 0.10, 0.01, 0.001)]

_moved = {round(x["prevalence"], 3): x["ppv"] for x in wdbc["models"]["logreg"]["ppvAtPrevalence"]}
assert round(_moved[0.374], 3) == 0.984 and round(_moved[0.01], 3) == 0.503 \
    and round(_moved[0.001], 3) == 0.091, _moved

out = {
    "generatedBy": "data/scripts/08_build_week04_data.py",
    "sklearnVersion": sklearn.__version__, "seed": SEED,
    "labels": {"exact": "Hypothetical classroom example — exact expected counts, "
                        "not a real test.",
               "sim": SIM_LABEL,
               "real": "Real WDBC data — classroom evaluation, not clinical "
                       "performance."},
    "hook": hook, "hook10k": hook10k, "prevalenceSweep": prevalence_sweep,
    "ex99": ex99,
    "screening": screening, "clinic": clinic, "challenge": challenge,
    "twoStage": {"stage1": stage1, "stage2": stage2},
    "threshold": {"nIll": N_ILL, "nWell": N_WELL, "auc": r(thr_auc),
                  "table": thr_table},
    "calibration": {"n": N_CAL, "positives": int(y_cal.sum()),
                    "models": cal_models},
    "wdbc": wdbc,
}

with open(os.path.join(ROOT, "data", "scripts", "week04_numbers.json"), "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)

js = dict(out)
js["thresholdData"] = {"scores": [float(v) for v in thr_scores],
                       "labels": [int(v) for v in thr_labels]}
js["calibrationData"] = {"p": [r(v, 3) for v in p_true],
                         "y": [int(v) for v in y_cal]}
with open(os.path.join(ROOT, "js", "data", "week04.js"), "w") as f:
    f.write("/* AUTO-GENERATED by data/scripts/08_build_week04_data.py - do not "
            "edit by hand.\n   Exact arithmetic, labelled illustrative "
            "simulations, and real WDBC results.\n   See the script docstring "
            "for which is which. */\n")
    f.write("window.WEEK04 = " + json.dumps(js, separators=(",", ":"),
                                            ensure_ascii=False) + ";\n")

print("hook PPV %.4f  NPV %.6f  acc %.3f" % (hook["ppv"], hook["npv"], hook["accuracy"]))
print("prevalence sweep PPV:", [(p["prevalence"], round(p["ppv"], 4)) for p in prevalence_sweep])
print("threshold AUC %.3f" % thr_auc)
for t in thr_table:
    print("  t=%.1f TP %d FP %d FN %d TN %d sens %.2f spec %.2f" % (
        t["threshold"], t["tp"], t["fp"], t["fn"], t["tn"], t["sensitivity"], t["specificity"]))
for k, m in cal_models.items():
    print("cal", k, "acc", m["accuracy"], "auc", m["auc"], "brier", m["brier"],
          "ece", m["ece"], "near0.8", m["near08"], "true|0.8", m["trueProbabilityWhenItSays08"])
print("challenge PPV", challenge["ppv"], "two-stage PPV", stage2["ppv"], stage2["n"])
print("wdbc", json.dumps(wdbc["models"], indent=0)[:900])
