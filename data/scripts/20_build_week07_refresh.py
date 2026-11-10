#!/usr/bin/env python3
"""
COMP9085 build script 20: Week 7 refresh (2026/27, taught after Week 8).
Dimensionality reduction, protein representations, and k-NN on classical features
versus ESM-2 embeddings.

Uses ONLY the frozen, validated Week 7 files in labs/week07/data/ (2,000 human
Swiss-Prot proteins, UniProt 2026_03, one per UniRef50 cluster, with ESM-2 8M embeddings
of the real and residue-shuffled sequences; see 15_build_week07_data.py and
PROVENANCE.json). Nothing is downloaded and no new data are generated.

Writes
    data/scripts/week07r_numbers.json   every number the refreshed lecture, lab and site quote
    js/data/week07.js                   window.WEEK07 for the Week 7 website exercises

The protocol (identical for every representation, so the comparison is fair):
    * the existing Week 7 split: 75/25, stratified on (transmembrane, signal peptide),
      seed 42 -> 1,500 training and 500 test proteins;
    * 5-fold stratified CV on the training proteins only (shuffle, seed 42);
    * one Pipeline: [scaler or none] -> KNeighborsClassifier, the scaler refitted per fold;
    * one grid: k in K_GRID x metric {euclidean, manhattan, cosine} x weights {uniform,
      distance} x scaling {none, standardise}; selection by mean CV ROC AUC (GridSearchCV,
      refit on all training proteins);
    * the test set is used once per representation, for the selected pipeline only.

    python3 data/scripts/20_build_week07_refresh.py           # about 4 minutes on a laptop CPU
"""
import json
import warnings
import os
import time

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "labs", "week07", "data")
OUT = os.path.join(ROOT, "data", "scripts", "week07r_numbers.json")
JS = os.path.join(ROOT, "js", "data", "week07.js")
OLD = os.path.join(ROOT, "data", "scripts", "week07_numbers.json")

SEED = 42
AA = "ACDEFGHIKLMNPQRSTVWY"
KD = {"A": 1.8, "R": -4.5, "N": -3.5, "D": -3.5, "C": 2.5, "Q": -3.5, "E": -3.5,
      "G": -0.4, "H": -3.2, "I": 4.5, "L": 3.8, "K": -3.9, "M": 1.9, "F": 2.8,
      "P": -1.6, "S": -0.8, "T": -0.7, "W": -0.9, "Y": -1.3, "V": 4.2}
WINDOW, NTERM = 19, 25
K_GRID = [1, 3, 5, 7, 9, 11, 15, 21, 25, 31, 35, 41, 51, 61, 75, 101]
METRICS = ["euclidean", "manhattan", "cosine"]
WEIGHTS = ["uniform", "distance"]
SCALES = ["none", "standard"]
NB = 10                                     # neighbours in the neighbourhood analysis
PCA_KS = [2, 5, 10, 20, 50, 100]
TASKS = {"signal_peptide": "has_signal_peptide", "transmembrane": "is_transmembrane"}
CLASSICAL = AA_COLS = None                  # set in features()


def r(x, d=4):
    return None if x is None else round(float(x), d)


# ======================================================================= data
def load():
    prot = pd.read_csv(os.path.join(DATA, "swissprot_human_2000.csv"))
    E = pd.read_csv(os.path.join(DATA, "esm2_t6_8M_embeddings.csv.gz")).set_index("accession")
    Es = pd.read_csv(os.path.join(DATA, "esm2_t6_8M_embeddings_shuffled.csv.gz")).set_index("accession")
    integrity = {
        "n_proteins": int(len(prot)),
        "duplicate_accessions": int(prot.accession.duplicated().sum()),
        "duplicate_sequences": int(prot.sequence.duplicated().sum()),
        "uniref50_clusters_unique": bool(prot.uniref50.is_unique),
        "non_standard_residues": int((~prot.sequence.str.fullmatch(f"[{AA}]+")).sum()),
        "length_matches_sequence": bool((prot.sequence.str.len() == prot.length).all()),
        "missing_values": {c: int(v) for c, v in prot.isna().sum().items() if v},
        "embedding_rows": int(len(E)), "embedding_dim": int(E.shape[1]),
        "embedding_missing_or_nonfinite": int((~np.isfinite(E.values)).sum()),
        "embedding_accessions_match": bool(set(E.index) == set(prot.accession)),
        "shuffled_rows": int(len(Es)),
        "shuffled_missing_or_nonfinite": int((~np.isfinite(Es.values)).sum()),
        "shuffled_is_permutation": bool(all(sorted(a) == sorted(b) for a, b in
                                            zip(prot.sequence, prot.shuffled_sequence))),
        "identical_real_and_shuffled_embeddings": int((np.abs(E.loc[prot.accession].values -
                                                              Es.loc[prot.accession].values).sum(1) == 0).sum()),
    }
    return prot, E.loc[prot.accession].values, Es.loc[prot.accession].values, integrity


def max_hydropathy(q):
    h = np.array([KD[a] for a in q])
    return float(np.convolve(h, np.ones(WINDOW) / WINDOW, mode="valid").max())


def nterm_hydropathy(q):
    return float(np.mean([KD[a] for a in q[:NTERM]]))


def features(seqs):
    """The classical descriptors: 20 composition fractions, log length, and two
    position-aware hydropathy summaries (Kyte-Doolittle scale)."""
    C = np.array([[q.count(a) / len(q) for a in AA] for q in seqs])
    L = np.log(np.array([len(q) for q in seqs]))[:, None]
    H = np.array([[max_hydropathy(q), nterm_hydropathy(q)] for q in seqs])
    return C, np.hstack([C, L, H])


FEATURE_NAMES = [f"frac_{a}" for a in AA] + ["log_length", "max_hydropathy_19", "nterm_hydropathy_25"]


# ======================================================================= helpers
def pipe(scale="standard", k=5, metric="euclidean", weights="uniform"):
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    return Pipeline([("scale", StandardScaler() if scale == "standard" else "passthrough"),
                     ("knn", KNeighborsClassifier(n_neighbors=k, metric=metric, weights=weights))])


def grid_search(M, y, cv):
    from sklearn.model_selection import GridSearchCV
    from sklearn.preprocessing import StandardScaler
    g = GridSearchCV(pipe(), {"scale": ["passthrough", StandardScaler()], "knn__n_neighbors": K_GRID,
                              "knn__metric": METRICS, "knn__weights": WEIGHTS},
                     cv=cv, scoring="roc_auc", n_jobs=-1).fit(M, y)
    res = pd.DataFrame(g.cv_results_)
    res["scale_name"] = res.param_scale.map(lambda s: "none" if isinstance(s, str) else "standard")
    curves = {}
    for sc in SCALES:
        for m in METRICS:
            for w in WEIGHTS:
                sub = res[(res.scale_name == sc) & (res.param_knn__metric == m) & (res.param_knn__weights == w)]
                sub = sub.set_index("param_knn__n_neighbors").loc[K_GRID]
                curves[f"{sc}|{m}|{w}"] = {"cv": [r(v) for v in sub.mean_test_score],
                                           "sd": [r(v) for v in sub.std_test_score]}
    bp = g.best_params_
    best = {"k": int(bp["knn__n_neighbors"]), "metric": bp["knn__metric"], "weights": bp["knn__weights"],
            "scale": "none" if isinstance(bp["scale"], str) else "standard",
            "cv_roc_auc": r(g.best_score_),
            "cv_sd": r(res.loc[g.best_index_, "std_test_score"])}
    # how many settings are within one standard error of the best
    se = res.loc[g.best_index_, "std_test_score"] / np.sqrt(cv.get_n_splits())
    best["n_within_1se"] = int((res.mean_test_score >= g.best_score_ - se).sum())
    best["n_settings"] = int(len(res))
    return g, curves, best


def test_metrics(y, prob, pred):
    from sklearn.metrics import (accuracy_score, average_precision_score, balanced_accuracy_score,
                                 confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score)
    return {"roc_auc": r(roc_auc_score(y, prob)), "average_precision": r(average_precision_score(y, prob)),
            "accuracy": r(accuracy_score(y, pred)), "balanced_accuracy": r(balanced_accuracy_score(y, pred)),
            "precision": r(precision_score(y, pred, zero_division=0)), "recall": r(recall_score(y, pred)),
            "f1": r(f1_score(y, pred)), "cm": confusion_matrix(y, pred).tolist()}


def bootstrap_diff(y, pa, pb, n=2000, seed=SEED):
    """Paired bootstrap of ROC AUC(a) - ROC AUC(b) over test proteins."""
    from sklearn.metrics import roc_auc_score
    rng = np.random.default_rng(seed)
    d = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        if y[i].min() == y[i].max():
            continue
        d.append(roc_auc_score(y[i], pa[i]) - roc_auc_score(y[i], pb[i]))
    d = np.array(d)
    return {"diff": r(roc_auc_score(y, pa) - roc_auc_score(y, pb)), "ci95": [r(np.percentile(d, 2.5)),
            r(np.percentile(d, 97.5))], "share_above_0": r((d > 0).mean(), 3), "n_boot": int(len(d))}


def knn_sets(M, k=NB, metric="euclidean"):
    from sklearn.neighbors import NearestNeighbors
    nn = NearestNeighbors(n_neighbors=k + 1, metric=metric).fit(M)
    _, idx = nn.kneighbors(M)
    out = []
    for i, row in enumerate(idx):          # drop the query itself (robust to exact ties)
        row = [j for j in row if j != i][:k]
        out.append(row)
    return np.array(out)


def overlap(A, B):
    return float(np.mean([len(set(a) & set(b)) / len(a) for a, b in zip(A, B)]))


def label_agreement(nbrs, y):
    """Mean share of a protein's neighbours that carry its own label, for positives and
    negatives separately (the negatives are the majority, so a pooled figure hides the
    positives)."""
    share = (y[nbrs] == y[:, None]).mean(1)
    return {"positives": r(share[y == 1].mean(), 3), "negatives": r(share[y == 0].mean(), 3)}


def relative_contrast(M, n_query=200, seed=SEED):
    """(farthest - nearest) / nearest distance from a query to all other points, averaged
    over random queries (Beyer et al. 1999's measure of distance concentration)."""
    from sklearn.metrics import pairwise_distances
    rng = np.random.default_rng(seed)
    q = rng.choice(len(M), n_query, replace=False)
    D = pairwise_distances(M[q], M)
    vals = []
    for i, qi in enumerate(q):
        d = np.delete(D[i], qi)
        vals.append((d.max() - d.min()) / d.min())
    return r(np.median(vals), 3)


def quant(P):
    """Scale a 2-D layout to integers 0..1000 per axis (for the website)."""
    lo, hi = P.min(0), P.max(0)
    return np.round((P - lo) / (hi - lo) * 1000).astype(int).tolist()


# ======================================================================= main
def main():
    from sklearn.decomposition import PCA
    from sklearn.manifold import TSNE, trustworthiness
    from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    import sklearn
    import umap

    warnings.filterwarnings("ignore")
    t0 = time.time()
    prot, E, Es, integ = load()
    C, CL = features(prot.sequence)
    Cs, CLs = features(prot.shuffled_sequence)
    ys = {t: prot[c].values for t, c in TASKS.items()}
    tm, sp = ys["transmembrane"], ys["signal_peptide"]
    old = json.load(open(OLD))
    prov = json.load(open(os.path.join(DATA, "PROVENANCE.json")))
    N = {"seed": SEED, "sklearn": sklearn.__version__, "umap": umap.__version__,
         "numpy": np.__version__, "pandas": pd.__version__, "integrity": integ,
         "provenance": {"uniprot_release": prov["source"]["release"],
                        "uniprot_release_date": prov["source"]["release_date"],
                        "model": prov["embedding"]["model"], "revision": prov["embedding"]["revision"],
                        "pooling": prov["embedding"]["pooling"], "dimension": prov["embedding"]["dimension"],
                        "flow": prov["selection"]["flow"]},
         "feature_names": FEATURE_NAMES, "k_grid": K_GRID}
    assert integ["duplicate_sequences"] == 0 and integ["embedding_missing_or_nonfinite"] == 0
    assert integ["shuffled_is_permutation"] and integ["embedding_accessions_match"]

    # ---- split: identical to the 2026-11-01 Week 7 lab (stratified on both labels)
    idx = np.arange(len(prot))
    tr, te = train_test_split(idx, test_size=0.25, stratify=2 * tm + sp, random_state=SEED)
    assert len(tr) == old["proteins"]["split"]["train"] and int(tm[te].sum()) == old["proteins"]["split"]["test_tm"]
    split = np.array(["train"] * len(prot), dtype=object)
    split[te] = "test"
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)

    # ---- dataset description
    def counts(ix):
        return {"n": int(len(ix)), "sp": int(sp[ix].sum()), "tm": int(tm[ix].sum()),
                "both": int((sp[ix] & tm[ix]).sum()), "neither": int(((1 - sp[ix]) & (1 - tm[ix])).sum())}
    N["data"] = {"all": counts(idx), "train": counts(tr), "test": counts(te),
                 "length": {"min": int(prot.length.min()), "q1": float(prot.length.quantile(.25)),
                            "median": float(prot.length.median()), "q3": float(prot.length.quantile(.75)),
                            "max": int(prot.length.max())},
                 "median_length_by_class": {
                     "sp": float(prot.length[sp == 1].median()), "no_sp": float(prot.length[sp == 0].median()),
                     "tm": float(prot.length[tm == 1].median()), "no_tm": float(prot.length[tm == 0].median())},
                 "sp_evidence": prot.loc[sp == 1, "sp_evidence"].value_counts().to_dict(),
                 "tm_evidence": prot.loc[tm == 1, "tm_evidence"].value_counts().to_dict(),
                 "sp_evidence_test": prot.loc[te][sp[te] == 1].sp_evidence.value_counts().to_dict(),
                 "olfactory_receptors": int(prot.protein_name.str.startswith("Olfactory receptor").sum())}

    # ---- related sequences across the split (a homology proxy; UniRef50 is not independence)
    def kmers(q, k=5):
        return {q[i:i + k] for i in range(len(q) - k + 1)}
    K5 = [kmers(q) for q in prot.sequence]
    index = {}
    for j in tr:
        for km in K5[j]:
            index.setdefault(km, []).append(j)
    best_share, best_j = [], []
    for i in te:
        cnt = {}
        for km in K5[i]:
            for j in index.get(km, ()):
                cnt[j] = cnt.get(j, 0) + 1
        j, c = max(cnt.items(), key=lambda kv: kv[1]) if cnt else (-1, 0)
        best_share.append(c / len(K5[i]))
        best_j.append(j)
    best_share = np.array(best_share)
    top = int(np.argmax(best_share))
    N["homology_proxy"] = {
        "measure": "for each test protein, the largest share of its distinct 5-mers found in any ONE training protein",
        "median": r(np.median(best_share), 3), "p95": r(np.percentile(best_share, 95), 3),
        "max": r(best_share.max(), 3),
        "n_test_over_0.2": int((best_share > 0.2).sum()), "n_test_over_0.5": int((best_share > 0.5).sum()),
        "max_pair": [prot.accession[te[top]], prot.protein_name[te[top]],
                     prot.accession[best_j[top]], prot.protein_name[best_j[top]]]}

    # ---- PCA (unsupervised: all proteins, no labels)
    def spectrum(M, scale):
        Z = StandardScaler().fit_transform(M) if scale else M - M.mean(0)
        p = PCA(random_state=SEED).fit(Z)
        ev = p.explained_variance_ratio_
        cum = ev.cumsum()
        return p, ev, cum
    pcs = {}
    for name, M in [("classical", CL), ("esm2", E)]:
        for scale in [True, False]:
            p, ev, cum = spectrum(M, scale)
            pcs[f"{name}|{'standard' if scale else 'none'}"] = {
                "evr": [r(v, 5) for v in ev[:min(50, len(ev))]], "cum": [r(v, 4) for v in cum[:min(50, len(ev))]],
                "k80": int(np.searchsorted(cum, .80) + 1), "k90": int(np.searchsorted(cum, .90) + 1),
                "k95": int(np.searchsorted(cum, .95) + 1), "pc1": r(ev[0]), "pc2": r(ev[1]),
                "n_components": int(len(ev))}
            if name == "classical":
                lo = pd.Series(p.components_[0], index=FEATURE_NAMES)
                lo2 = pd.Series(p.components_[1], index=FEATURE_NAMES)
                s1, s2 = np.sign(lo["max_hydropathy_19"]) or 1, np.sign(lo2["log_length"]) or 1
                pcs[f"{name}|{'standard' if scale else 'none'}"].update({
                    "pc1_top": [[k, r(s1 * v, 3)] for k, v in lo.reindex(lo.abs().sort_values(ascending=False).index)[:6].items()],
                    "pc2_top": [[k, r(s2 * v, 3)] for k, v in lo2.reindex(lo2.abs().sort_values(ascending=False).index)[:6].items()],
                    "loadings_pc1": [r(s1 * v, 3) for v in lo], "loadings_pc2": [r(s2 * v, 3) for v in lo2]})
    N["pca"] = pcs
    N["pca"]["unscaled_classical_variance_share"] = {
        k: r(v, 4) for k, v in zip(FEATURE_NAMES, (CL.var(0) / CL.var(0).sum()))
        if k in ("log_length", "max_hydropathy_19", "nterm_hydropathy_25", "frac_L")}

    # ---- distance concentration in real representations (all standardised)
    rng = np.random.default_rng(SEED)
    Zc, Zcl, Ze = (StandardScaler().fit_transform(M) for M in (C, CL, E))
    pe_all = PCA(random_state=SEED).fit(Ze)
    N["concentration"] = {
        "uniform_cube": {str(d): relative_contrast(rng.random((2000, d))) for d in [2, 10, 20, 100, 320, 1000]},
        "composition (20)": relative_contrast(Zc), "classical (23)": relative_contrast(Zcl),
        "ESM-2 (320)": relative_contrast(Ze),
        "ESM-2 PCA 2": relative_contrast(pe_all.transform(Ze)[:, :2]),
        "ESM-2 PCA 10": relative_contrast(pe_all.transform(Ze)[:, :10]),
        "note": "median over 200 random query proteins of (farthest - nearest) / nearest, Euclidean, standardised"}

    # ---- THE comparison: k-NN, same split, same grid, same CV, test once
    reps = {"composition": C, "classical": CL, "esm2": E, "esm2_shuffled": Es}
    rep_label = {"composition": "Amino-acid composition (20)",
                 "classical": "Classical descriptors (23)",
                 "esm2": "ESM-2 embedding (320)",
                 "esm2_shuffled": "ESM-2 of residue-shuffled sequences (320)"}
    knn = {"reps": rep_label, "grid": {"k": K_GRID, "metric": METRICS, "weights": WEIGHTS, "scale": SCALES},
           "selection": "GridSearchCV, 5-fold stratified CV (seed 42) on the 1,500 training proteins, mean ROC AUC"}
    probs = {}
    for task, y in ys.items():
        knn[task] = {"prevalence_train": r(y[tr].mean()), "prevalence_test": r(y[te].mean())}
        for rep, M in reps.items():
            g, curves, best = grid_search(M[tr], y[tr], cv)
            pr = g.predict_proba(M[te])[:, 1]
            probs[(task, rep)] = pr
            best["test"] = test_metrics(y[te], pr, g.predict(M[te]))
            # recall by label evidence on the test positives (descriptive; small groups)
            if task == "signal_peptide":
                ev = prot.sp_evidence.values[te]
                pred = g.predict(M[te])
                best["test"]["recall_by_evidence"] = {
                    e: [int(((pred == 1) & (y[te] == 1) & (ev == e)).sum()), int(((y[te] == 1) & (ev == e)).sum())]
                    for e in ["experimental", "by similarity", "curator inference", "sequence analysis"]
                    if ((y[te] == 1) & (ev == e)).sum()}
            knn[task][rep] = {"best": best, "curves": curves}
            print(f"  {task:15s} {rep:14s} CV {best['cv_roc_auc']:.4f} test {best['test']['roc_auc']:.4f} "
                  f"k={best['k']} {best['metric']} {best['weights']} {best['scale']}  ({time.time() - t0:.0f}s)")
        knn[task]["bootstrap"] = {
            "esm2_minus_classical": bootstrap_diff(y[te], probs[(task, "esm2")], probs[(task, "classical")]),
            "esm2_minus_composition": bootstrap_diff(y[te], probs[(task, "esm2")], probs[(task, "composition")]),
            "classical_minus_composition": bootstrap_diff(y[te], probs[(task, "classical")], probs[(task, "composition")])}
        # an ESM-2 model trained on real embeddings, applied to the shuffled test embeddings
        b = knn[task]["esm2"]["best"]
        g = pipe(b["scale"], b["k"], b["metric"], b["weights"]).fit(E[tr], y[tr])
        from sklearn.metrics import roc_auc_score
        knn[task]["esm2_model_on_shuffled_test"] = r(roc_auc_score(y[te], g.predict_proba(Es[te])[:, 1]))
        # one fixed, untuned reference setting for everyone: k = 15, Euclidean, uniform, standardised
        knn[task]["fixed_k15"] = {rep: r(cross_val_score(pipe("standard", 15), M[tr], y[tr], cv=cv,
                                                         scoring="roc_auc").mean()) for rep, M in reps.items()}
        knn[task]["linear_probe_cv"] = {  # from week07_numbers.json (the 2026-11-01 lab), for comparison
            "composition": old["probe_cv"][task]["composition (20)"]["roc_auc"],
            "esm2": old["probe_cv"][task]["ESM-2 (320)"]["roc_auc"],
            "esm2_shuffled": old["probe_cv"][task]["ESM-2 on shuffled sequences (320)"]["roc_auc"],
            "composition_plus_hydropathy": old["probe_cv"][task]["composition + 2 hydropathy features (22)"]["roc_auc"]}
    N["knn"] = knn

    # ---- dimensionality reduction inside the k-NN pipeline (ESM-2, the selected k-NN setting)
    red = {}
    for task, y in ys.items():
        b = knn[task]["esm2"]["best"]
        red[task] = {"setting": {k: b[k] for k in ("k", "metric", "weights")}}
        for kc in PCA_KS:
            p = Pipeline([("scale", StandardScaler()), ("pca", PCA(n_components=kc, random_state=SEED)),
                          ("knn", pipe("none", b["k"], b["metric"], b["weights"]).named_steps["knn"])])
            red[task][f"pca_{kc}"] = r(cross_val_score(p, E[tr], y[tr], cv=cv, scoring="roc_auc").mean())
        p = Pipeline([("scale", StandardScaler()),
                      ("umap", umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1, random_state=SEED, n_jobs=1)),
                      ("knn", pipe("none", b["k"], "euclidean", b["weights"]).named_steps["knn"])])
        red[task]["umap_2"] = r(cross_val_score(p, E[tr], y[tr], cv=cv, scoring="roc_auc").mean())
        red[task]["full_320_standardised"] = r(cross_val_score(pipe("standard", b["k"], b["metric"], b["weights"]),
                                                               E[tr], y[tr], cv=cv, scoring="roc_auc").mean())
        print("  reduced", task, red[task], f"({time.time() - t0:.0f}s)")
    N["reduced_knn"] = red

    # ---- 2-D layouts (unsupervised; all 2,000 proteins; labels only colour the plot)
    lay, trust = {}, {}
    def add(key, P, Zref):
        lay[key] = P
        trust[key] = r(trustworthiness(Zref, P, n_neighbors=NB), 3)
    for name, Z in [("classical", Zcl), ("esm2", Ze), ("composition", Zc)]:
        add(f"{name}|pca", PCA(n_components=2, random_state=SEED).fit_transform(Z), Z)
        add(f"{name}|tsne|30|0", TSNE(perplexity=30, init="pca", random_state=0).fit_transform(Z), Z)
        add(f"{name}|umap|15|0.1|0", umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=0, n_jobs=1).fit_transform(Z), Z)
    for perp in [2, 5, 15, 50, 100]:
        add(f"esm2|tsne|{perp}|0", TSNE(perplexity=perp, init="pca", random_state=0).fit_transform(Ze), Ze)
    for seed in [1, 2]:
        add(f"esm2|tsne|30|{seed}", TSNE(perplexity=30, init="pca", random_state=seed).fit_transform(Ze), Ze)
        add(f"esm2|tsne_random|30|{seed}", TSNE(perplexity=30, init="random", random_state=seed).fit_transform(Ze), Ze)
    for nn_ in [5, 15, 50, 200]:
        for md in [0.0, 0.1, 0.5, 0.99]:
            if (nn_, md) != (15, 0.1):
                add(f"esm2|umap|{nn_}|{md}|0", umap.UMAP(n_neighbors=nn_, min_dist=md, random_state=0,
                                                         n_jobs=1).fit_transform(Ze), Ze)
    add("esm2|umap|15|0.1|1", umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=1, n_jobs=1).fit_transform(Ze), Ze)
    for perp in [5, 50]:          # the lab's Task 4 settings on the classical descriptors
        trust[f"classical|tsne|{perp}|0"] = r(trustworthiness(
            Zcl, TSNE(perplexity=perp, init="pca", random_state=0).fit_transform(Zcl), n_neighbors=NB), 3)
    for nn_ in [5, 50]:
        trust[f"classical|umap|{nn_}|0.1|0"] = r(trustworthiness(
            Zcl, umap.UMAP(n_neighbors=nn_, min_dist=0.1, random_state=0, n_jobs=1).fit_transform(Zcl), n_neighbors=NB), 3)
    print(f"  layouts done ({time.time() - t0:.0f}s)")
    N["trustworthiness"] = trust
    N["trustworthiness"]["esm2|pca10"] = r(trustworthiness(Ze, pe_all.transform(Ze)[:, :10], n_neighbors=NB), 3)

    # ---- neighbourhoods: who are a protein's 10 nearest neighbours in each space?
    sets = {"composition": knn_sets(Zc), "classical": knn_sets(Zcl), "esm2": knn_sets(Ze),
            "esm2_cosine_raw": knn_sets(E, metric="cosine")}
    Pe = pe_all.transform(Ze)
    for kc in PCA_KS:
        sets[f"esm2_pca{kc}"] = knn_sets(Pe[:, :kc])
    sets["esm2_tsne2"] = knn_sets(lay["esm2|tsne|30|0"])
    sets["esm2_umap2"] = knn_sets(lay["esm2|umap|15|0.1|0"])
    sets["classical_pca2"] = knn_sets(PCA(n_components=2, random_state=SEED).fit_transform(Zcl))
    nbh = {"k": NB, "space": "standardised features, Euclidean distance, all 2,000 proteins (unsupervised); "
                             "PCA fitted on all proteins; t-SNE perplexity 30, UMAP n_neighbors 15, min_dist 0.1",
           "overlap_with_esm2": {k: r(overlap(v, sets["esm2"]), 3) for k, v in sets.items()},
           "overlap_with_classical": {k: r(overlap(v, sets["classical"]), 3) for k, v in sets.items()},
           "label_agreement": {k: {t: label_agreement(v, y) for t, y in ys.items()} for k, v in sets.items()}}
    # chance overlap of two random 10-sets from 1,999
    nbh["overlap_chance"] = r(NB / (len(prot) - 1), 4)
    N["neighbourhoods"] = nbh

    # ---- residue shuffling
    sc = StandardScaler().fit(E)
    Z, Zsh = sc.transform(E), sc.transform(Es)
    d_twin = np.linalg.norm(Z - Zsh, axis=1)
    from sklearn.neighbors import NearestNeighbors
    dn, _ = NearestNeighbors(n_neighbors=2).fit(Z).kneighbors(Z)
    d_near = dn[:, 1]
    rng = np.random.default_rng(SEED)
    a, b = rng.integers(0, len(Z), 5000), rng.integers(0, len(Z), 5000)
    keep = a != b
    d_rand = np.linalg.norm(Z[a[keep]] - Z[b[keep]], axis=1)
    # rank of the shuffled twin among all real proteins as neighbours of the original
    from sklearn.metrics import pairwise_distances
    rank = []
    for i in range(len(Z)):
        dd = pairwise_distances(Zsh[i:i + 1], Z)[0]
        rank.append(int((dd < dd[i]).sum()))   # how many real proteins are closer to the shuffle than its own original
    rank = np.array(rank)
    cos = (E * Es).sum(1) / np.linalg.norm(E, axis=1) / np.linalg.norm(Es, axis=1)
    N["shuffle"] = {
        "composition_distance_max": r(np.abs(C - Cs).max(), 12),
        "length_identical": True,
        "max_hydropathy_mean_abs_change": r(np.abs(CL[:, 21] - CLs[:, 21]).mean(), 3),
        "max_hydropathy_mean_real": r(CL[:, 21].mean(), 3), "max_hydropathy_mean_shuffled": r(CLs[:, 21].mean(), 3),
        "max_hydropathy_tm_real": r(CL[tm == 1, 21].mean(), 3), "max_hydropathy_tm_shuffled": r(CLs[tm == 1, 21].mean(), 3),
        "nterm_hydropathy_sp_real": r(CL[sp == 1, 22].mean(), 3), "nterm_hydropathy_sp_shuffled": r(CLs[sp == 1, 22].mean(), 3),
        "esm2_twin_distance_median": r(np.median(d_twin), 2), "esm2_nearest_other_median": r(np.median(d_near), 2),
        "esm2_random_pair_median": r(np.median(d_rand), 2),
        "share_twin_closer_than_nearest_other": r((d_twin < d_near).mean(), 3),
        "twin_rank_median": int(np.median(rank)), "twin_rank_is_0_share": r((rank == 0).mean(), 3),
        "cosine_raw_median": r(np.median(cos), 4),
        "hist": {"bins": np.linspace(0, 40, 41).tolist(),
                 "twin": np.histogram(d_twin, np.linspace(0, 40, 41))[0].tolist(),
                 "nearest": np.histogram(d_near, np.linspace(0, 40, 41))[0].tolist(),
                 "random": np.histogram(d_rand, np.linspace(0, 40, 41))[0].tolist()}}

    # ---- named examples for slides and the lab (chosen by rule, then checked by hand)
    # a signal-peptide protein in the TEST set whose ESM-2 neighbours mostly share the label
    # while its composition neighbours mostly do not
    gain = (sp[sets["esm2"]].mean(1) - sp[sets["composition"]].mean(1))
    cand = [i for i in np.argsort(-gain) if split[i] == "test" and sp[i] == 1 and prot.length[i] <= 600]
    ex = int(cand[0])
    N["example"] = {"index": ex, "accession": prot.accession[ex], "name": prot.protein_name[ex],
                    "gene": prot.gene[ex], "length": int(prot.length[ex]), "sp_evidence": prot.sp_evidence[ex],
                    "neighbours": {k: [[prot.accession[j], str(prot.protein_name[j])[:60], int(sp[j]), int(tm[j])]
                                       for j in sets[k][ex]] for k in ["composition", "classical", "esm2", "esm2_pca2", "esm2_umap2"]}}

    # ---- website data
    rng = np.random.default_rng(SEED)
    q_ids = [ex]
    for t_sp, t_tm, n in [(1, 0, 14), (0, 1, 14), (1, 1, 8), (0, 0, 14)]:
        pool = [i for i in te if sp[i] == t_sp and tm[i] == t_tm and i != ex]
        q_ids += [int(i) for i in rng.choice(pool, n, replace=False)]
    shuffle_ids = [int(i) for i in q_ids if prot.length[i] <= 700][:30]
    p2 = PCA(n_components=2, random_state=SEED).fit(Ze)
    W = {
        "version": "week07r", "sklearn": sklearn.__version__, "umap": umap.__version__,
        "aa": AA, "kd": KD, "window": WINDOW, "nterm": NTERM,
        "proteins": [[prot.accession[i], str(prot.protein_name[i]).split(" (")[0][:70],
                      str(prot.gene[i]) if isinstance(prot.gene[i], str) else "", int(prot.length[i]),
                      int(sp[i]), int(tm[i]), split[i] == "test", prot.sp_evidence[i], prot.tm_evidence[i]]
                     for i in range(len(prot))],
        "protCols": ["accession", "name", "gene", "length", "sp", "tm", "test", "sp_evidence", "tm_evidence"],
        "layouts": {k: quant(v) for k, v in lay.items()},
        "trust": N["trustworthiness"],
        "pca": {k: v for k, v in pcs.items()},
        "featureNames": FEATURE_NAMES,
        "concentration": N["concentration"],
        "knn": {t: {"prevalence_train": knn[t]["prevalence_train"],
                    "fixed_k15": knn[t]["fixed_k15"], "bootstrap": knn[t]["bootstrap"],
                    "linear_probe_cv": knn[t]["linear_probe_cv"],
                    "esm2_model_on_shuffled_test": knn[t]["esm2_model_on_shuffled_test"],
                    **{rep: knn[t][rep] for rep in reps}} for t in ys},
        "repLabel": rep_label, "kGrid": K_GRID,
        "reduced": red,
        "neighbourhoods": {k: v for k, v in nbh.items()},
        "queries": q_ids,
        "nbrs": {k: [sets[k][i].tolist() for i in q_ids] for k in
                 ["composition", "classical", "esm2", "esm2_cosine_raw", "esm2_pca2", "esm2_pca10", "esm2_pca50",
                  "esm2_tsne2", "esm2_umap2"]},
        "shuffle": {k: v for k, v in N["shuffle"].items()},
        "shuffleIds": shuffle_ids,
        "seqs": {str(i): [prot.sequence[i], prot.shuffled_sequence[i]] for i in shuffle_ids},
        "twin": {str(i): [r(d_twin[i], 2), r(d_near[i], 2), int(rank[i])] for i in shuffle_ids},
        "pcaReal": quant(np.vstack([p2.transform(Z), p2.transform(Zsh)]))[:len(Z)],
        "pcaShuf": quant(np.vstack([p2.transform(Z), p2.transform(Zsh)]))[len(Z):],
        "classicalShuffle": {str(i): [[r(v, 3) for v in CL[i, 20:]], [r(v, 3) for v in CLs[i, 20:]]] for i in shuffle_ids},
        "data": N["data"], "homology": N["homology_proxy"], "provenance": N["provenance"],
    }
    os.makedirs(os.path.dirname(JS), exist_ok=True)
    with open(JS, "w") as f:
        f.write("/* COMP9085 Week 7 (refresh): generated by data/scripts/20_build_week07_refresh.py from the frozen\n"
                " * labs/week07/data files (2,000 human Swiss-Prot proteins, ESM-2 8M embeddings). Do not edit. */\n")
        f.write("window.WEEK07 = " + json.dumps(W, separators=(",", ":")) + ";\n")
    json.dump(N, open(OUT, "w"), indent=1)
    print("wrote", os.path.relpath(OUT, ROOT), "and", os.path.relpath(JS, ROOT),
          f"({os.path.getsize(JS) / 1e6:.2f} MB) in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
