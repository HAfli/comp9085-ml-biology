#!/usr/bin/env python3
"""
Week 6: a frozen extract of NHANES August 2021 - August 2023, and every number
the Week 6 lecture and lab report, computed once.

Two modes
---------
1. Freeze the extract (run once, by the module team, with network access):

       python3 data/scripts/13_build_week06_data.py --download RAW_DIR

   downloads the nine public-use SAS transport files listed in FILES from CDC
   into RAW_DIR (anywhere outside this public repository), records their
   SHA-256, and writes the column extracts to labs/week06/data/.

2. Rebuild every number from the frozen extract (no network):

       python3 data/scripts/13_build_week06_data.py

Outputs
    labs/week06/data/nhanes_L_*.csv     one CSV per NHANES file, selected columns,
                                        one row per participant (SEQN), values as
                                        released (special codes 7/9 are KEPT)
    labs/week06/data/PROVENANCE.json    where and when the extract came from
    data/scripts/week06_numbers.json    every reported number

What is changed from the released files
---------------------------------------
Only two things. (1) Columns are selected (see FILES). (2) pandas.read_sas
returns 5.397605e-79 instead of exact zero for some SAS values; those are
rounded to 0. Nothing else: refused / don't-know codes (7, 9), top-codes
(age 80, income-to-poverty ratio 5) and missing values are exactly as released,
because handling them is the lab.

The question the lab asks
-------------------------
Among adults aged 20 or over who had blood drawn in the mobile examination
centre, predict whether glycated haemoglobin (HbA1c, LBXGH) is >= 6.5%, the
diabetes-range threshold used by the American Diabetes Association. This is a
measurement threshold, not a diagnosis: a diagnosis needs confirmation and
clinical context. Predictors are things known without the blood test:
demographics, body measures, blood pressure, total cholesterol, one dietary
recall and smoking history.
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.request
import warnings

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "labs", "week06", "data")
NUMBERS = os.path.join(ROOT, "data", "scripts", "week06_numbers.json")
BASE_URL = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2021/DataFiles/"

FILES = {
    "DEMO_L": ["SEQN", "RIDSTATR", "RIAGENDR", "RIDAGEYR", "RIDRETH3", "DMDEDUC2",
               "INDFMPIR", "WTINT2YR", "WTMEC2YR", "SDMVSTRA", "SDMVPSU"],
    "GHB_L": ["SEQN", "WTPH2YR", "LBXGH"],
    "BMX_L": ["SEQN", "BMXWT", "BMXHT", "BMXBMI", "BMXWAIST"],
    "BPXO_L": ["SEQN", "BPXOSY1", "BPXOSY2", "BPXOSY3"],
    "TCHOL_L": ["SEQN", "LBXTC"],
    "DR1TOT_L": ["SEQN", "DR1DRSTZ", "DR1TKCAL", "DR1TSUGR"],
    "DR2TOT_L": ["SEQN", "DR2DRSTZ", "DR2TKCAL"],
    "SMQ_L": ["SEQN", "SMQ020"],
    "DIQ_L": ["SEQN", "DIQ010"],
}

# The modelling set-up shared by the lab and the lecture.
SEED = 42
TEST_SIZE = 0.25
HBA1C_THRESHOLD = 6.5
NUMERIC = ["RIDAGEYR", "INDFMPIR", "BMXBMI", "BMXWAIST", "SBP", "LBXTC",
           "DR1TKCAL", "DR1TSUGR"]
ORDINAL = ["DMDEDUC2"]
NOMINAL = ["RIAGENDR", "RIDRETH3", "SMQ020"]
FEATURES = NUMERIC + ORDINAL + NOMINAL


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# ------------------------------------------------------------------ freeze
def freeze(raw_dir):
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(DATA, exist_ok=True)
    prov = {}
    for name, cols in FILES.items():
        path = os.path.join(raw_dir, name + ".xpt")
        if not os.path.exists(path):
            print("downloading", name)
            urllib.request.urlretrieve(BASE_URL + name + ".xpt", path)
        d = pd.read_sas(path)
        n_tiny = 0
        num = d.select_dtypes("number").columns
        tiny = (d[num].abs() < 1e-70) & (d[num] != 0)
        n_tiny = int(tiny.loc[:, [c for c in num if c in cols]].sum().sum())
        d[num] = d[num].mask(tiny, 0.0)
        d = d[cols]
        d["SEQN"] = d["SEQN"].astype(int)
        assert d.SEQN.is_unique, name
        out = os.path.join(DATA, "nhanes_L_%s.csv" % name.replace("_L", "").lower())
        d.to_csv(out, index=False)                    # full precision: values as released
        prov[name] = {"url": BASE_URL + name + ".xpt", "xpt_sha256": sha256(path),
                      "rows": len(d), "columns": cols,
                      "tiny_float_cells_rounded_to_zero": n_tiny,
                      "csv": os.path.basename(out)}
    meta = {
        "source": "CDC National Center for Health Statistics, National Health and "
                  "Nutrition Examination Survey (NHANES), August 2021 - August 2023",
        "cycle_page": "https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?Cycle=2021-2023",
        "licence": "US Government public-use data files. NCHS asks that the survey be "
                   "cited and that no attempt is made to identify participants.",
        "citation": "Centers for Disease Control and Prevention, National Center for Health "
                    "Statistics. National Health and Nutrition Examination Survey Data, "
                    "August 2021 - August 2023. Hyattsville, MD: U.S. Department of Health "
                    "and Human Services.",
        "downloaded": pd.Timestamp.now().strftime("%Y-%m-%d"),
        "changes": "Columns selected; pandas.read_sas artefacts (5.4e-79 for zero) rounded "
                   "to 0. Nothing else changed: special codes 7/9, top-codes and missing "
                   "values are as released.",
        "files": prov,
    }
    with open(os.path.join(DATA, "PROVENANCE.json"), "w") as f:
        json.dump(meta, f, indent=1)
    print("froze", len(prov), "files into", DATA)


# ------------------------------------------------------------------ load
def load():
    def rd(name):
        return pd.read_csv(os.path.join(DATA, "nhanes_L_%s.csv" % name))
    return {k: rd(k) for k in ["demo", "ghb", "bmx", "bpxo", "tchol", "dr1tot", "dr2tot",
                               "smq", "diq"]}


def build_analysis_table(T):
    """The lab's Tasks 1-2, in one place: merge, restrict, clean the codes."""
    demo, ghb = T["demo"], T["ghb"]
    adults = demo[demo.RIDAGEYR >= 20]
    df = adults.merge(ghb, on="SEQN", how="left")
    df = df[df.LBXGH.notna()].copy()
    for k in ["bmx", "bpxo", "tchol", "dr1tot", "smq"]:
        df = df.merge(T[k], on="SEQN", how="left")
    df["SBP"] = df[["BPXOSY1", "BPXOSY2", "BPXOSY3"]].mean(axis=1)
    df["DMDEDUC2"] = df.DMDEDUC2.where(df.DMDEDUC2 <= 5)        # 7 refused, 9 don't know
    df["SMQ020"] = df.SMQ020.where(df.SMQ020 <= 2)              # 7 refused, 9 don't know
    df["diabetes_range"] = (df.LBXGH >= HBA1C_THRESHOLD).astype(int)
    return df.reset_index(drop=True)


# ------------------------------------------------------------------ numbers
def r(x, d=4):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), d)


def compute():
    from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
    from sklearn.pipeline import make_pipeline
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.experimental import enable_iterative_imputer  # noqa: F401
    from sklearn.impute import IterativeImputer
    from sklearn.preprocessing import StandardScaler, OneHotEncoder
    from sklearn.linear_model import LogisticRegression
    from sklearn.tree import DecisionTreeClassifier
    from sklearn.ensemble import IsolationForest
    from sklearn.dummy import DummyClassifier
    from sklearn.metrics import (roc_auc_score, average_precision_score, recall_score,
                                 precision_score, confusion_matrix, accuracy_score,
                                 balanced_accuracy_score)
    from sklearn.exceptions import ConvergenceWarning
    import sklearn

    T = load()
    N = {"software": {"python": sys.version.split()[0], "sklearn": sklearn.__version__,
                      "pandas": pd.__version__, "numpy": np.__version__},
         "setup": {"seed": SEED, "test_size": TEST_SIZE, "threshold": HBA1C_THRESHOLD,
                   "numeric": NUMERIC, "ordinal": ORDINAL, "nominal": NOMINAL}}

    # ---------------------------------------------------- participant flow
    demo, ghb, diq = T["demo"], T["ghb"], T["diq"]
    adults = demo[demo.RIDAGEYR >= 20]
    examined = adults[adults.RIDSTATR == 2]
    a = adults.merge(ghb, on="SEQN", how="left")
    df = build_analysis_table(T)
    inner_all = demo
    for k in ["ghb", "bmx", "bpxo", "tchol", "dr1tot", "smq"]:
        inner_all = inner_all.merge(T[k], on="SEQN", how="inner")
    inner_all = inner_all[inner_all.RIDAGEYR >= 20]
    N["flow"] = {
        "demo_rows": len(demo), "interview_only": int((demo.RIDSTATR == 1).sum()),
        "examined": int((demo.RIDSTATR == 2).sum()),
        "file_rows": {k: len(v) for k, v in T.items()},
        "adults": len(adults), "adults_examined": len(examined),
        "adults_with_hba1c": len(df),
        "adults_examined_no_hba1c": int(examined.SEQN.isin(ghb.SEQN[ghb.LBXGH.isna()]).sum()
                                        + (~examined.SEQN.isin(ghb.SEQN)).sum()),
        "inner_join_all_files_adults": len(inner_all),
    }
    assert N["flow"]["adults_with_hba1c"] == a.LBXGH.notna().sum()

    # ---------------------------------------------------- codes and quirks
    # Counted on the analysis population (adults with HbA1c), before cleaning: the
    # numbers students see in Task 2. All-adult counts are kept for the lecture.
    raw = a[a.LBXGH.notna()].merge(T["smq"], on="SEQN", how="left") \
                            .merge(T["dr1tot"], on="SEQN", how="left")
    all_smq = adults.merge(T["smq"], on="SEQN")
    N["codes"] = {
        "DMDEDUC2_7_or_9": int(raw.DMDEDUC2.isin([7, 9]).sum()),
        "SMQ020_7_or_9": int(raw.SMQ020.isin([7, 9]).sum()),
        "age_80_topcoded": int((raw.RIDAGEYR == 80).sum()),
        "indfmpir_5_topcoded": int((raw.INDFMPIR == 5).sum()),
        "all_adults": {"DMDEDUC2_7_or_9": int(adults.DMDEDUC2.isin([7, 9]).sum()),
                       "SMQ020_7_or_9": int(all_smq.SMQ020.isin([7, 9]).sum()),
                       "age_80_topcoded": int((adults.RIDAGEYR == 80).sum()),
                       "indfmpir_5_topcoded": int((adults.INDFMPIR == 5).sum())},
        "dr1_status_counts": {str(int(k)): int(v) for k, v in
                              raw.DR1DRSTZ.value_counts().sort_index().items()},
    }
    prov = json.load(open(os.path.join(DATA, "PROVENANCE.json")))
    N["codes"]["tiny_floats"] = {k: v["tiny_float_cells_rounded_to_zero"]
                                 for k, v in prov["files"].items()}

    # ---------------------------------------------------- outcome and weights
    y = df.diabetes_range
    N["outcome"] = {
        "n": len(df), "positives": int(y.sum()), "prevalence_unweighted": r(y.mean()),
        "prevalence_weighted_WTPH2YR": r(np.average(y, weights=df.WTPH2YR)),
        "prevalence_weighted_WTMEC2YR": r(np.average(y, weights=df.WTMEC2YR)),
        "hba1c_median": r(df.LBXGH.median(), 2), "hba1c_max": r(df.LBXGH.max(), 2),
        "majority_baseline_accuracy": r(1 - y.mean()),
    }
    by_age = df.groupby(pd.cut(df.RIDAGEYR, [19, 39, 59, 80],
                               labels=["20-39", "40-59", "60-80"]), observed=True)
    N["weights"] = {
        "by_age": {str(k): {"n": len(g), "share_sample": r(len(g) / len(df)),
                            "share_weighted": r(g.WTPH2YR.sum() / df.WTPH2YR.sum()),
                            "prevalence": r(g.diabetes_range.mean())}
                   for k, g in by_age},
        "by_eth": {str(int(k)): {"n": len(g), "share_sample": r(len(g) / len(df)),
                                 "share_weighted": r(g.WTPH2YR.sum() / df.WTPH2YR.sum()),
                                 "prevalence": r(g.diabetes_range.mean())}
                   for k, g in df.groupby("RIDRETH3")},
        "wt_min": r(df.WTPH2YR.min(), 1), "wt_max": r(df.WTPH2YR.max(), 1),
        "wt_sum": r(df.WTPH2YR.sum(), 0),
    }

    # ---------------------------------------------------- missingness
    miss = df[FEATURES].isna().mean().sort_values(ascending=False)
    N["missing"] = {
        "by_feature": {k: r(v) for k, v in miss.items()},
        "complete_rows": int(df[FEATURES].notna().all(axis=1).sum()),
        "income_by_education": {str(int(k)): r(g.INDFMPIR.isna().mean()) for k, g in
                                df.groupby("DMDEDUC2")},
        "income_missing_prev": r(df.loc[df.INDFMPIR.isna(), "diabetes_range"].mean()),
        "income_present_prev": r(df.loc[df.INDFMPIR.notna(), "diabetes_range"].mean()),
        "diet_missing_prev": r(df.loc[df.DR1TKCAL.isna(), "diabetes_range"].mean()),
        "diet_present_prev": r(df.loc[df.DR1TKCAL.notna(), "diabetes_range"].mean()),
        "diet_missing_age": r(df.loc[df.DR1TKCAL.isna(), "RIDAGEYR"].mean(), 1),
        "diet_present_age": r(df.loc[df.DR1TKCAL.notna(), "RIDAGEYR"].mean(), 1),
    }
    # Outcome missingness, judged against an observed proxy (self-report).
    ad = adults.merge(ghb, on="SEQN", how="left").merge(diq, on="SEQN", how="left")
    ad["dx"] = ad.DIQ010.map({1: 1, 2: 0, 3: 0})               # 3 borderline counted as no
    ad["has_hba1c"] = ad.LBXGH.notna()
    exam_no = (ad.RIDSTATR == 2) & ~ad.has_hba1c
    N["outcome_missing"] = {
        # counted on every eligible adult (20+), before the HbA1c filter
        "n_eligible": int(len(ad)),
        "n_with_hba1c": int(ad.has_hba1c.sum()),
        "frac_without_hba1c": r((~ad.has_hba1c).mean()),
        "n_not_examined": int((ad.RIDSTATR == 1).sum()),
        "n_examined_no_hba1c": int(exam_no.sum()),
        "n_dx_unknown": int(ad.dx.isna().sum()),
        "dx_rate_examined_no_hba1c": r(ad.loc[exam_no, "dx"].mean()),
        "dx_rate_with_hba1c": r(ad.loc[ad.has_hba1c, "dx"].mean()),
        "dx_rate_without_hba1c": r(ad.loc[~ad.has_hba1c, "dx"].mean()),
        "age_with_hba1c": r(ad.loc[ad.has_hba1c, "RIDAGEYR"].mean(), 1),
        "age_without_hba1c": r(ad.loc[~ad.has_hba1c, "RIDAGEYR"].mean(), 1),
        "n_without_hba1c": int((~ad.has_hba1c).sum()),
        "dx_rate_interview_only": r(ad.loc[ad.RIDSTATR == 1, "dx"].mean()),
        "dx_rate_examined": r(ad.loc[ad.RIDSTATR == 2, "dx"].mean()),
    }
    # Median imputation's effect on the income distribution (shown in the lecture).
    med = df.INDFMPIR.median()
    filled = df.INDFMPIR.fillna(med)
    N["median_impute_income"] = {
        "median": r(med, 2), "sd_observed": r(df.INDFMPIR.std(), 3),
        "sd_after": r(filled.std(), 3),
        "share_at_median_before": r((df.INDFMPIR == med).mean()),
        "share_at_median_after": r((filled == med).mean()),
    }

    # ---------------------------------------------------- measurement variability
    dd = df[["SEQN", "DR1TKCAL"]].merge(T["dr2tot"], on="SEQN", how="left")
    both = dd.dropna(subset=["DR1TKCAL", "DR2TKCAL"])
    N["recall"] = {
        "n_both_days": len(both), "corr_day1_day2": r(both.DR1TKCAL.corr(both.DR2TKCAL), 3),
        "median_abs_diff": r((both.DR1TKCAL - both.DR2TKCAL).abs().median(), 0),
        "kcal_min": r(df.DR1TKCAL.min(), 0), "kcal_max": r(df.DR1TKCAL.max(), 0),
        "kcal_lt_500": int((df.DR1TKCAL < 500).sum()), "kcal_gt_5000": int((df.DR1TKCAL > 5000).sum()),
    }

    # ---------------------------------------------------- split
    X, y = df[FEATURES], df.diabetes_range
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=TEST_SIZE, stratify=y,
                                          random_state=SEED)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    N["split"] = {"train": len(Xtr), "test": len(Xte), "train_pos": int(ytr.sum()),
                  "test_pos": int(yte.sum()), "train_prev": r(ytr.mean()),
                  "test_prev": r(yte.mean())}

    # ---------------------------------------------------- outliers (training rows only)
    def fences(s):
        q1, q3 = s.quantile([0.25, 0.75])
        return q1, q3, q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)
    out = {}
    for col in ["BMXBMI", "DR1TKCAL", "SBP"]:
        q1, q3, lo, hi = fences(Xtr[col])
        flag = (Xtr[col] < lo) | (Xtr[col] > hi)
        out[col] = {"q1": r(q1, 2), "q3": r(q3, 2), "lo": r(lo, 2), "hi": r(hi, 2),
                    "n_flagged": int(flag.sum()), "n_observed": int(Xtr[col].notna().sum()),
                    "n_above": int((Xtr[col] > hi).sum()), "n_below": int((Xtr[col] < lo).sum()),
                    "min": r(Xtr[col].min(), 1), "max": r(Xtr[col].max(), 1),
                    "prev_flagged": r(ytr[flag].mean()), "prev_not": r(ytr[~flag & Xtr[col].notna()].mean())}
    Z = make_pipeline(SimpleImputer(strategy="median"), StandardScaler()).fit_transform(Xtr[NUMERIC])
    iso = IsolationForest(contamination=0.02, random_state=SEED).fit(Z)
    f = iso.predict(Z) == -1
    out["isolation_forest"] = {"contamination": 0.02, "n_flagged": int(f.sum()),
                               "prev_flagged": r(ytr[f].mean()), "prev_not": r(ytr[~f].mean()),
                               "median_bmi_flagged": r(Xtr.BMXBMI[f].median(), 1),
                               "median_kcal_flagged": r(Xtr.DR1TKCAL[f].median(), 0)}
    N["outliers"] = out

    # ---------------------------------------------------- the pipelines
    def pre(num_imputer, scale=True):
        num_steps = [num_imputer] + ([StandardScaler()] if scale else [])
        return ColumnTransformer([
            ("num", make_pipeline(*num_steps), NUMERIC + ORDINAL),
            ("nom", make_pipeline(SimpleImputer(strategy="most_frequent"),
                                  OneHotEncoder(handle_unknown="ignore", drop="if_binary")),
             NOMINAL)])

    def lr(**kw):
        return LogisticRegression(max_iter=1000, **kw)

    scoring = ["roc_auc", "average_precision", "recall", "balanced_accuracy"]

    def cvs(pipe, Xa, ya):
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always", ConvergenceWarning)
            res = cross_validate(pipe, Xa, ya, cv=cv, scoring=scoring)
            n_warn = sum(issubclass(x.category, ConvergenceWarning) for x in w)
        d = {"n": len(Xa), "prev": r(ya.mean())}
        for s in scoring:
            d[s] = r(res["test_" + s].mean())
            d[s + "_sd"] = r(res["test_" + s].std())
        d["convergence_warnings"] = n_warn
        return d

    cc = Xtr.notna().all(axis=1)
    imp = {
        "complete_case": cvs(make_pipeline(pre(SimpleImputer(strategy="median")), lr()), Xtr[cc], ytr[cc]),
        "median": cvs(make_pipeline(pre(SimpleImputer(strategy="median")), lr()), Xtr, ytr),
        "iterative_indicator": cvs(make_pipeline(pre(IterativeImputer(random_state=SEED, add_indicator=True)), lr()), Xtr, ytr),
    }
    imp["complete_case"]["coverage_train"] = r(cc.mean())
    imp["complete_case"]["coverage_test"] = r(Xte.notna().all(axis=1).mean())
    imp["complete_case"]["prev_incomplete_rows"] = r(ytr[~cc].mean())
    N["imputation"] = imp

    base = cross_validate(DummyClassifier(strategy="most_frequent"), Xtr, ytr, cv=cv,
                          scoring=["accuracy", "roc_auc", "average_precision", "recall"])
    N["baseline"] = {k.replace("test_", ""): r(v.mean()) for k, v in base.items() if k.startswith("test_")}

    # encoding and scaling
    p_int = ColumnTransformer([("all", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()),
                                NUMERIC + ORDINAL + NOMINAL)])
    N["encoding"] = {"one_hot": imp["median"],
                     "integer_coded": cvs(make_pipeline(p_int, lr()), Xtr, ytr)}
    N["scaling"] = {
        "scaled": imp["median"],
        "unscaled_default_iter": cvs(make_pipeline(pre(SimpleImputer(strategy="median"), scale=False),
                                                   LogisticRegression()), Xtr, ytr),
        "unscaled_max_iter_5000": cvs(make_pipeline(pre(SimpleImputer(strategy="median"), scale=False),
                                                    LogisticRegression(max_iter=5000)), Xtr, ytr),
    }
    rng_ = Xtr[["RIDAGEYR", "INDFMPIR", "BMXBMI", "SBP", "LBXTC", "DR1TKCAL"]]
    N["scaling"]["ranges"] = {c: [r(rng_[c].min(), 1), r(rng_[c].max(), 1)] for c in rng_}
    # worked scaling example: three scalers on energy intake, fitted on training rows
    kc = Xtr.DR1TKCAL.dropna()
    q1, q3 = kc.quantile([0.25, 0.75])
    N["scaling"]["kcal"] = {"mean": r(kc.mean(), 1), "sd": r(kc.std(ddof=0), 1),
                            "median": r(kc.median(), 1), "q1": r(q1, 1), "q3": r(q3, 1),
                            "min": r(kc.min(), 0), "max": r(kc.max(), 0)}

    # class imbalance: class_weight
    N["imbalance"] = {"unweighted": imp["median"],
                      "balanced": cvs(make_pipeline(pre(SimpleImputer(strategy="median")),
                                                    lr(class_weight="balanced")), Xtr, ytr)}

    # resampling before vs inside the folds (random oversampling)
    def oversample(Xa, ya, seed):
        rng = np.random.default_rng(seed)
        pos, neg = np.where(ya.values == 1)[0], np.where(ya.values == 0)[0]
        extra = rng.choice(pos, len(neg) - len(pos), replace=True)
        idx = np.concatenate([neg, pos, extra])
        return Xa.iloc[idx], ya.iloc[idx]

    def fold_metrics(yv, p):
        pr = (p >= 0.5).astype(int)
        return [roc_auc_score(yv, p), average_precision_score(yv, p), recall_score(yv, pr),
                precision_score(yv, pr, zero_division=0), float(np.mean(yv))]

    res = {}
    Xr, yr = Xtr.reset_index(drop=True), ytr.reset_index(drop=True)
    for name, mk in [("tree", lambda: make_pipeline(pre(SimpleImputer(strategy="median")),
                                                     DecisionTreeClassifier(random_state=SEED))),
                     ("logreg", lambda: make_pipeline(pre(SimpleImputer(strategy="median")), lr()))]:
        Xo, yo = oversample(Xr, yr, SEED)
        before, inside, dup = [], [], []
        for tri, vai in cv.split(Xo, yo):
            m = mk().fit(Xo.iloc[tri], yo.iloc[tri])
            before.append(fold_metrics(yo.iloc[vai], m.predict_proba(Xo.iloc[vai])[:, 1]))
            dup.append(np.isin(Xo.index[vai], Xo.index[tri]).mean())
        for tri, vai in cv.split(Xr, yr):
            Xa, ya = oversample(Xr.iloc[tri], yr.iloc[tri], SEED)
            m = mk().fit(Xa, ya)
            inside.append(fold_metrics(yr.iloc[vai], m.predict_proba(Xr.iloc[vai])[:, 1]))
        keys = ["roc_auc", "average_precision", "recall", "precision", "val_prev"]
        res[name] = {"before_split": dict(zip(keys, [r(v) for v in np.mean(before, axis=0)])),
                     "inside_folds": dict(zip(keys, [r(v) for v in np.mean(inside, axis=0)])),
                     "val_rows_also_in_train_before": r(np.mean(dup))}
    N["resampling"] = res

    # ---------------------------------------------------- model selection and final test
    candidates = {"median": imp["median"], "iterative_indicator": imp["iterative_indicator"],
                  "median_balanced": N["imbalance"]["balanced"]}
    # The rule is declared before any result is seen. The purpose is to flag adults
    # for a confirmatory HbA1c test, so a missed case costs more than a false alarm:
    # rank by mean CV balanced accuracy at the 0.5 threshold, and among pipelines
    # within one SD of the best keep the simplest.
    N["selection_rule"] = ("Among pipelines that can score every participant, take the best mean CV "
                           "balanced accuracy at threshold 0.5; keep the simplest pipeline within one "
                           "SD of it.")
    best = max(candidates.values(), key=lambda d: d["balanced_accuracy"])
    order = ["median", "median_balanced", "iterative_indicator"]      # simplest first
    chosen = next(k for k in order if candidates[k]["balanced_accuracy"]
                  >= best["balanced_accuracy"] - best["balanced_accuracy_sd"])
    N["chosen"] = chosen
    final = {"median": make_pipeline(pre(SimpleImputer(strategy="median")), lr()),
             "median_balanced": make_pipeline(pre(SimpleImputer(strategy="median")), lr(class_weight="balanced")),
             "iterative_indicator": make_pipeline(pre(IterativeImputer(random_state=SEED, add_indicator=True)), lr())}[chosen]
    final.fit(Xtr, ytr)
    p = final.predict_proba(Xte)[:, 1]
    pr = (p >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(yte, pr, labels=[0, 1]).ravel()
    N["test"] = {"roc_auc": r(roc_auc_score(yte, p)), "average_precision": r(average_precision_score(yte, p)),
                 "accuracy": r(accuracy_score(yte, pr)), "balanced_accuracy": r(balanced_accuracy_score(yte, pr)),
                 "recall": r(recall_score(yte, pr)), "precision": r(precision_score(yte, pr, zero_division=0)),
                 "specificity": r(tn / (tn + fp)), "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn)}
    return N, df


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--download", metavar="RAW_DIR",
                    help="download the NHANES .xpt files into RAW_DIR (outside the repo) and freeze the extract")
    a = ap.parse_args()
    if a.download:
        freeze(a.download)
    N, df = compute()
    with open(NUMBERS, "w") as f:
        json.dump(N, f, indent=1)
    print("wrote", NUMBERS)
    print(json.dumps({k: N[k] for k in ["flow", "outcome", "split", "chosen", "test"]}, indent=1))


if __name__ == "__main__":
    main()
