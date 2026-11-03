#!/usr/bin/env python3
"""
Week 8 (instance-based learning, k-NN): every number used by the lecture, the website
interactives and the lab, computed once from one source so the three cannot disagree.

Inputs
    UCI Heart Disease, Cleveland subset (processed.cleveland.data), CC BY 4.0.
    Downloaded once with --fetch DIR (or read from labs/week08/data/ when present).

Outputs
    labs/week08/data/heart_disease_cleveland.csv   the 303 records with a header ('' = missing)
    labs/week08/data/PROVENANCE.json               source, licence, checksums, versions
    data/scripts/week08_numbers.json               every number the lecture and lab quote
    js/data/week08.js                              window.WEEK08: data and measured curves
                                                   for the Week 8 interactives

    python3 data/scripts/18_build_week08_data.py --fetch ../Week8/COMP9085_Week08_Enhanced/raw
    python3 data/scripts/18_build_week08_data.py        # later runs: from the frozen CSV

Protocol (identical in the lab):
    binary target disease = (num > 0); one stratified 75/25 split, random_state 42;
    every choice by 10-fold stratified CV (shuffle, random_state 42) on the training rows;
    preprocessing inside a Pipeline (median / most-frequent imputation, StandardScaler on
    the five continuous features, one-hot on the eight categorical ones);
    the test set is used once, for the configuration chosen by CV.
"""
import argparse
import hashlib
import json
import math
import os
import platform
import sys
import warnings
from datetime import date

import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, confusion_matrix,
                             precision_score, recall_score, roc_auc_score,
                             mean_absolute_error)
from sklearn.model_selection import (StratifiedKFold, KFold, cross_val_score, cross_validate,
                                     train_test_split, GridSearchCV)
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.pipeline import make_pipeline, Pipeline
from sklearn.preprocessing import MinMaxScaler, OneHotEncoder, StandardScaler

warnings.filterwarnings("ignore")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "labs", "week08", "data")
CSV = os.path.join(DATA, "heart_disease_cleveland.csv")
NUMBERS = os.path.join(ROOT, "data", "scripts", "week08_numbers.json")
JS = os.path.join(ROOT, "js", "data", "week08.js")

URL = "https://archive.ics.uci.edu/static/public/45/heart+disease.zip"
DOI = "10.24432/C52P4X"
RAW_SHA = "a74b7efa387bc9d108d7d0115d831fe9b414b29ae7124f331b622b4efa0427c8"
COLS = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang",
        "oldpeak", "slope", "ca", "thal", "num"]
NUM = ["age", "trestbps", "chol", "thalach", "oldpeak"]
CAT = ["sex", "cp", "fbs", "restecg", "exang", "slope", "ca", "thal"]
SEED = 42
KS = list(range(1, 52, 2))


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def r(x, d=4):
    return float(round(float(x), d))


# ------------------------------------------------------------------ lecture arithmetic
def lecture_examples():
    L = {}
    # Movie example (slides: "Sample dataset", 1-NN, Euclidean). Harrington, ML in Action, ch. 2.
    movies = [("California Man", 3, 104, "Romance"), ("He's Not Really into Dudes", 2, 100, "Romance"),
              ("Beautiful Woman", 1, 81, "Romance"), ("Kevin Longblade", 101, 10, "Action"),
              ("Robo Slayer 3000", 99, 5, "Action"), ("Amped II", 98, 2, "Action")]
    q = (18, 90)
    rows = []
    for t, k, s, c in movies:
        e = math.hypot(k - q[0], s - q[1])
        m = abs(k - q[0]) + abs(s - q[1])
        rows.append({"title": t, "kicks": k, "kisses": s, "type": c, "euclidean": r(e, 2), "manhattan": m})
    L["movies"] = {"query": q, "rows": rows,
                   "nearest_euclidean": min(rows, key=lambda x: x["euclidean"])["title"],
                   "nearest_manhattan": min(rows, key=lambda x: x["manhattan"])["title"]}
    assert L["movies"]["nearest_euclidean"] == "He's Not Really into Dudes"
    assert abs(rows[0]["euclidean"] - 20.52) < 1e-9 and abs(rows[1]["euclidean"] - 18.87) < 1e-9
    # k = 3 / 5 votes on the movie data
    srt = sorted(rows, key=lambda x: x["euclidean"])
    L["movies"]["k3_vote"] = [x["type"] for x in srt[:3]]
    L["movies"]["k5_vote"] = [x["type"] for x in srt[:5]]

    # Area / weight / height / capacity (original slides 24-25)
    train = [(10, 8, 4, 8), (12, 10, 6, 12), (14, 9, 4, 11)]
    qq = (5, 4, 4, 3)
    tab = []
    for t in train:
        sq = [(a - b) ** 2 for a, b in zip(t, qq)]
        tab.append({"x": t, "squares": sq, "sum_squares": sum(sq), "euclidean": r(math.sqrt(sum(sq)), 2),
                    "manhattan": sum(abs(a - b) for a, b in zip(t, qq))})
    assert tab[0]["sum_squares"] == 66 and tab[0]["manhattan"] == 14   # the original slide said 57 / 7.55
    L["table"] = {"query": qq, "rows": tab}

    # Hamming (weather; Play? is the target, not a feature)
    wx = {"A": ("sunny", "hot", "high", "false"), "B": ("sunny", "hot", "high", "true"),
          "C": ("overcast", "hot", "high", "false")}
    ham = lambda a, b: sum(x != y for x, y in zip(wx[a], wx[b]))
    L["hamming_weather"] = {"AB": ham("A", "B"), "AC": ham("A", "C"), "BC": ham("B", "C")}
    assert L["hamming_weather"]["BC"] == 2
    s1, s2 = "GATTACAGCA", "GACTACTGCA"
    L["hamming_dna"] = {"a": s1, "b": s2, "d": sum(x != y for x, y in zip(s1, s2)), "len": len(s1)}

    # Domain-specific ordinal (calorie) distance
    L["food"] = {"rank": {"carrots": 1, "broccoli": 2, "all-bran cereal": 3, "apple pie": 4},
                 "kcal": {"carrots": 30, "broccoli": 50, "all-bran cereal": 70, "apple pie": 300}}

    # Scaling (original slides 34-36): feature A in [1, 10], feature B in [1, 1000]
    a, b = (5.5, 787), (7.5, 567)
    raw = math.hypot(a[0] - b[0], a[1] - b[1])
    na = [(v - 1) / 9 for v in (a[0], b[0])]
    nb = [(v - 1) / 999 for v in (a[1], b[1])]
    norm = math.hypot(na[0] - na[1], nb[0] - nb[1])
    L["scaling"] = {"a": a, "b": b, "raw": r(raw, 3), "raw_share_B": r((a[1] - b[1]) ** 2 / raw ** 2, 5),
                    "norm_a": [r(na[0], 3), r(nb[0], 3)], "norm_b": [r(na[1], 3), r(nb[1], 3)],
                    "normalised": r(norm, 3),
                    "norm_share_B": r((nb[0] - nb[1]) ** 2 / norm ** 2, 3)}
    assert abs(raw - 220.009) < 1e-3 and abs(norm - 0.313) < 1e-3

    # Regression (original slide 17) and distance-weighted regression (slides 41-42, p = 2)
    vals = {"82": (82, 2), "83": (83, 4), "78": (78, 6)}
    L["regression"] = {"k3_mean": r(np.mean([82, 78, 83]), 3)}
    for p in (1, 2, 3):
        w = [1 / d ** p for _, d in vals.values()]
        L["regression"][f"weighted_p{p}"] = r(sum(wi * v for wi, (v, _) in zip(w, vals.values())) / sum(w), 3)
    assert L["regression"]["k3_mean"] == 81.0 and abs(L["regression"]["weighted_p2"] - 81.857) < 1e-3

    # Distance-weighted vote (slides 45-50): k = 9, all points
    pts = {"Blue": [10, 9, 5], "Yellow": [5, 6, 5], "Black": [1, 2, 2]}
    V = {}
    for p in (0, 1, 2, 3):
        V[f"p{p}"] = {c: r(sum(1 / d ** p for d in ds), 5) for c, ds in pts.items()}
    assert V["p0"] == {"Blue": 3, "Yellow": 3, "Black": 3}                 # uniform k = 9: a three-way tie
    assert abs(V["p1"]["Black"] - 2) < 1e-9 and abs(V["p3"]["Black"] - 1.25) < 1e-9
    flat = sorted([(d, c) for c, ds in pts.items() for d in ds])
    k5 = flat[:5]
    L["vote"] = {"distances": pts, "votes": V,
                 "uniform_k3": [c for _, c in flat[:3]], "uniform_k5": [c for _, c in k5]}
    return L


# ------------------------------------------------------------------ the heart data
def load(fetch_dir):
    os.makedirs(DATA, exist_ok=True)
    if fetch_dir:
        raw = os.path.join(fetch_dir, "heart_disease", "processed.cleveland.data")
        assert sha256(raw) == RAW_SHA, "processed.cleveland.data does not match the frozen checksum"
        df = pd.read_csv(raw, names=COLS, na_values="?")
        for c in ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang",
                  "slope", "ca", "thal", "num"]:
            df[c] = df[c].astype("Int64")
        df.insert(0, "patient_id", np.arange(1, len(df) + 1))
        df.to_csv(CSV, index=False)
    df = pd.read_csv(CSV)
    assert len(df) == 303 and list(df.columns[1:]) == COLS
    df["disease"] = (df["num"] > 0).astype(int)
    return df


def preprocess(scale="standard", encode="onehot"):
    if scale == "standard":
        nt = make_pipeline(SimpleImputer(strategy="median"), StandardScaler())
    elif scale == "minmax":
        nt = make_pipeline(SimpleImputer(strategy="median"), MinMaxScaler())
    else:
        nt = SimpleImputer(strategy="median")
    if encode == "onehot":
        ct = make_pipeline(SimpleImputer(strategy="most_frequent"),
                           OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    else:   # the integer codes used as if they were measurements (the mistake)
        ct = SimpleImputer(strategy="most_frequent")
    return ColumnTransformer([("num", nt, NUM), ("cat", ct, CAT)], sparse_threshold=0)


def knn(k=5, metric="euclidean", weights="uniform", **pre):
    return Pipeline([("prep", preprocess(**pre)),
                     ("knn", KNeighborsClassifier(n_neighbors=k, metric=metric, weights=weights))])


def heart_numbers(df):
    H = {}
    X, y = df[NUM + CAT], df["disease"]
    H["n"] = len(df)
    H["disease"] = int(y.sum())
    H["no_disease"] = int((1 - y).sum())
    H["num_counts"] = {str(k): int(v) for k, v in df["num"].value_counts().sort_index().items()}
    H["missing"] = {c: int(v) for c, v in df[COLS].isna().sum().items() if v}
    H["ranges"] = {c: [r(df[c].min(), 1), r(df[c].max(), 1), r(df[c].mean(), 2), r(df[c].std(), 2)] for c in NUM}

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, stratify=y, random_state=SEED)
    H["split"] = {"train": len(Xtr), "test": len(Xte), "train_pos": int(ytr.sum()), "test_pos": int(yte.sum())}
    cv = StratifiedKFold(n_splits=10, shuffle=True, random_state=SEED)

    def cvs(model, Xx=Xtr):
        s = cross_val_score(model, Xx, ytr, cv=cv)
        return {"mean": r(s.mean()), "sd": r(s.std())}

    H["baseline"] = cvs(DummyClassifier(strategy="most_frequent"))
    H["baseline_test"] = r(accuracy_score(yte, DummyClassifier().fit(Xtr, ytr).predict(Xte)))
    H["logreg"] = cvs(Pipeline([("prep", preprocess()), ("lr", LogisticRegression(max_iter=2000))]))
    H["k5"] = {"unscaled_codes": cvs(knn(5, scale=None, encode="codes")),
               "unscaled": cvs(knn(5, scale=None)),
               "minmax": cvs(knn(5, scale="minmax")),
               "standard_codes": cvs(knn(5, encode="codes")),
               "standard": cvs(knn(5))}
    H["k1"] = cvs(knn(1))
    # Training accuracy of 1-NN (it memorises) vs 5-NN
    H["k1_train"] = r(knn(1).fit(Xtr, ytr).score(Xtr, ytr))

    # Hamming on the categorical features alone (one-hot, so Hamming = mismatched indicators / width)
    ham = Pipeline([("prep", ColumnTransformer([("cat", make_pipeline(
        SimpleImputer(strategy="most_frequent"), OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        CAT)], sparse_threshold=0)), ("knn", KNeighborsClassifier(15, metric="hamming"))])
    H["hamming_categorical_k15"] = cvs(ham)
    H["euclid_categorical_k15"] = cvs(Pipeline([("prep", ham.named_steps["prep"]),
                                                ("knn", KNeighborsClassifier(15))]))

    # Where does the unscaled distance come from? share of the summed squared differences
    Z = SimpleImputer(strategy="median").fit(Xtr[NUM]).transform(Xtr[NUM])
    var = Z.var(axis=0)
    H["unscaled_distance_share"] = {c: r(v / var.sum(), 4) for c, v in zip(NUM, var)}
    # (expected squared difference between two random patients = 2 * variance per feature)

    # The k x metric x weights grid, standardised + one-hot, with training accuracy too
    grid = {}
    for scale in ["standard", "none"]:
        for metric in ["euclidean", "manhattan"]:
            for w in ["uniform", "distance"]:
                key = f"{scale}|{metric}|{w}"
                cvm, cvsd, tr = [], [], []
                for k in KS:
                    m = knn(k, metric, w, scale=None if scale == "none" else "standard")
                    res = cross_validate(m, Xtr, ytr, cv=cv, return_train_score=True)
                    cvm.append(r(res["test_score"].mean()))
                    cvsd.append(r(res["test_score"].std()))
                    tr.append(r(res["train_score"].mean()))
                grid[key] = {"cv": cvm, "sd": cvsd, "train": tr}
    H["grid"] = {"k": KS, "curves": grid}

    # Model selection exactly as the lab does it: GridSearchCV over k, metric, weights
    gs = GridSearchCV(knn(), {"knn__n_neighbors": KS, "knn__metric": ["euclidean", "manhattan"],
                              "knn__weights": ["uniform", "distance"]}, cv=cv)
    gs.fit(Xtr, ytr)
    bp = gs.best_params_
    H["chosen"] = {"k": int(bp["knn__n_neighbors"]), "metric": bp["knn__metric"],
                   "weights": bp["knn__weights"], "cv": r(gs.best_score_),
                   "cv_sd": r(gs.cv_results_["std_test_score"][gs.best_index_])}
    key = f"standard|{bp['knn__metric']}|{bp['knn__weights']}"
    assert abs(grid[key]["cv"][KS.index(H["chosen"]["k"])] - H["chosen"]["cv"]) < 1e-4
    # One-standard-error alternative (the simplest model within 1 SE): largest k within 1 SE
    se = H["chosen"]["cv_sd"] / math.sqrt(10)
    H["chosen"]["one_se_threshold"] = r(H["chosen"]["cv"] - se)
    H["sqrt_n_rule"] = r(math.sqrt(len(Xtr)), 2)

    best = gs.best_estimator_
    pred = best.predict(Xte)
    prob = best.predict_proba(Xte)[:, 1]
    cm = confusion_matrix(yte, pred, labels=[0, 1])
    H["test"] = {"accuracy": r(accuracy_score(yte, pred)), "balanced_accuracy": r(balanced_accuracy_score(yte, pred)),
                 "recall": r(recall_score(yte, pred)), "specificity": r(cm[0, 0] / cm[0].sum()),
                 "precision": r(precision_score(yte, pred)), "roc_auc": r(roc_auc_score(yte, prob)),
                 "cm": cm.tolist()}
    # The unscaled k = 5 model on the test set, for contrast only (reported, never used to choose)
    H["test_unscaled_k5"] = r(knn(5, scale=None).fit(Xtr, ytr).score(Xte, yte))

    # Irrelevant features: add n pure-noise standardised columns; 5 repeats; noise weight 1 or 0.25
    noise = {"n": [0, 2, 5, 10, 20, 50, 100], "weight": {}}
    k_fixed = 15
    for wgt in [1.0, 0.5, 0.25, 0.0]:
        means, sds = [], []
        for nn in noise["n"]:
            reps = []
            for rep in range(5):
                rs = np.random.default_rng(1000 * rep + nn)
                N = rs.normal(size=(len(Xtr), nn)) * wgt
                # pure N(0, w^2) columns, passed through unscaled so the weight acts like a feature weight
                Xn = Xtr.copy()
                for j in range(nn):
                    Xn[f"noise_{j}"] = N[:, j]
                cols = [f"noise_{j}" for j in range(nn)]
                pre = ColumnTransformer([("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), NUM),
                                         ("cat", make_pipeline(SimpleImputer(strategy="most_frequent"),
                                                               OneHotEncoder(handle_unknown="ignore", sparse_output=False)), CAT),
                                         ("noise", "passthrough", cols)], sparse_threshold=0)
                reps.append(cross_val_score(Pipeline([("prep", pre), ("knn", KNeighborsClassifier(k_fixed))]),
                                            Xn, ytr, cv=cv).mean())
            means.append(r(np.mean(reps)))
            sds.append(r(np.std(reps)))
        noise["weight"][str(wgt)] = {"mean": means, "sd": sds}
    noise["k"] = k_fixed
    # expected squared distance between two random training patients from the real columns
    # (= 2 x the summed column variances after preprocessing); each noise column adds 2 w^2
    P = preprocess().fit_transform(Xtr)
    noise["real_sq"] = r(2 * P.var(axis=0).sum(), 3)
    noise["real_columns"] = int(P.shape[1])
    H["noise"] = noise

    # k-NN regression (optional lab extension, and the real-data mode of the regression explorer):
    # maximum heart rate from age; compare with the textbook 220 - age and a straight line
    reg = df[["age", "thalach"]].dropna()
    kcv = KFold(10, shuffle=True, random_state=SEED)
    xa, yt = reg[["age"]].values, reg["thalach"].values
    R = {"n": len(reg), "k": [1, 3, 5, 9, 15, 25, 41, 75], "mae": {}}
    for k in R["k"]:
        for w in ["uniform", "distance"]:
            s = -cross_val_score(KNeighborsRegressor(k, weights=w), xa, yt, cv=kcv,
                                 scoring="neg_mean_absolute_error")
            R["mae"][f"{w}|{k}"] = r(s.mean(), 2)
    R["linear_mae"] = r(-cross_val_score(LinearRegression(), xa, yt, cv=kcv, scoring="neg_mean_absolute_error").mean(), 2)
    R["rule_220_minus_age_mae"] = r(mean_absolute_error(yt, 220 - reg["age"].values), 2)
    R["mean_only_mae"] = r(-cross_val_score(DummyRegressor(), xa, yt, cv=kcv,
                                            scoring="neg_mean_absolute_error").mean(), 2)
    H["regression"] = R
    return H, (Xtr, Xte, ytr, yte)


def write_js(df, H, L, split):
    Xtr, Xte, ytr, yte = split
    test_ids = set(df.loc[Xte.index, "patient_id"])
    rows = []
    for _, rw in df.iterrows():
        def v(c):
            x = rw[c]
            return None if pd.isna(x) else (float(x) if c == "oldpeak" else int(x))
        rows.append([int(rw["patient_id"]), v("age"), v("trestbps"), v("chol"), v("thalach"), v("oldpeak"),
                     v("sex"), v("cp"), v("exang"), int(rw["disease"]), 1 if rw["patient_id"] in test_ids else 0])
    payload = {
        "source": "UCI Heart Disease (Cleveland Clinic Foundation subset), Janosi, Steinbrunn, Pfisterer "
                  "and Detrano (1988), doi:10.24432/C52P4X, CC BY 4.0",
        "sklearnVersion": sklearn.__version__,
        "columns": ["id", "age", "trestbps", "chol", "thalach", "oldpeak", "sex", "cp", "exang",
                    "disease", "test"],
        "rows": rows,
        "lecture": L,
        "heart": {k: H[k] for k in ["n", "disease", "no_disease", "split", "baseline", "logreg", "k5", "k1",
                                    "k1_train", "chosen", "sqrt_n_rule", "test", "test_unscaled_k5",
                                    "unscaled_distance_share", "grid", "noise", "regression", "ranges",
                                    "hamming_categorical_k15", "euclid_categorical_k15"]},
    }
    with open(JS, "w") as f:
        f.write("/* COMP9085 Week 8 - generated by data/scripts/18_build_week08_data.py. Do not edit.\n"
                " * Real data: UCI Heart Disease (Cleveland), CC BY 4.0. Curves measured with scikit-learn "
                + sklearn.__version__ + ";\n * the protocol is the Week 8 lab's. */\n")
        f.write("window.WEEK08 = " + json.dumps(payload, separators=(",", ":")) + ";\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", help="folder holding the unzipped UCI download (heart_disease/)")
    a = ap.parse_args()
    df = load(a.fetch)
    L = lecture_examples()
    H, split = heart_numbers(df)
    out = {"generated": str(date.today()), "lecture": L, "heart": H,
           "versions": {"python": platform.python_version(), "sklearn": sklearn.__version__,
                        "pandas": pd.__version__, "numpy": np.__version__}}
    json.dump(out, open(NUMBERS, "w"), indent=1)
    prov = {
        "dataset": "Heart Disease (Cleveland subset, processed.cleveland.data)",
        "creators": "Andras Janosi (Hungarian Institute of Cardiology, Budapest), William Steinbrunn and "
                    "Matthias Pfisterer (University Hospitals Zurich and Basel), Robert Detrano (V.A. Medical "
                    "Center, Long Beach, and Cleveland Clinic Foundation)",
        "year": 1988, "repository": "UCI Machine Learning Repository", "doi": DOI, "url": URL,
        "licence": "CC BY 4.0",
        "citation": "Janosi, A., Steinbrunn, W., Pfisterer, M. & Detrano, R. (1988). Heart Disease [Dataset]. "
                    "UCI Machine Learning Repository. https://doi.org/10.24432/C52P4X",
        "original_study": "Detrano, R. et al. (1989). International application of a new probability algorithm "
                          "for the diagnosis of coronary artery disease. American Journal of Cardiology 64(5), "
                          "304-310. https://doi.org/10.1016/0002-9149(89)90524-9",
        "raw_sha256_processed_cleveland": RAW_SHA,
        "csv_sha256": sha256(CSV),
        "changes": "Header added; a patient_id column (row order 1-303) added; '?' written as an empty cell "
                   "(6 values: ca 4, thal 2). No rows removed, no values changed.",
        "frozen_on": "2026-11-03",
        "versions": out["versions"],
    }
    json.dump(prov, open(os.path.join(DATA, "PROVENANCE.json"), "w"), indent=1)
    write_js(df, H, L, split)
    c = H["chosen"]
    print(f"heart: n={H['n']} disease={H['disease']} split={H['split']}")
    print(f"baseline CV {H['baseline']['mean']}  k5 unscaled {H['k5']['unscaled']['mean']}  "
          f"k5 standard {H['k5']['standard']['mean']}  codes {H['k5']['standard_codes']['mean']}")
    print(f"chosen k={c['k']} {c['metric']} {c['weights']} CV {c['cv']}±{c['cv_sd']}  test {H['test']}")
    print("noise", H["noise"]["weight"]["1.0"]["mean"], "w0.25", H["noise"]["weight"]["0.25"]["mean"])
    print("regression", H["regression"])
    print("wrote", os.path.relpath(NUMBERS, ROOT), os.path.relpath(JS, ROOT), os.path.relpath(CSV, ROOT))


if __name__ == "__main__":
    main()
