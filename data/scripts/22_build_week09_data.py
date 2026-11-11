#!/usr/bin/env python3
"""
Week 9 (clustering biological data): every number used by the lecture, the website exercises and
the lab, computed from real data that is already in the repository. No network.

  * WDBC (UCI Breast Cancer Wisconsin Diagnostic, 569 tumours, 30 features; the scikit-learn copy,
    as in Weeks 2-3 and 7), standardised.
  * The Week 7 proteins: 2,000 human Swiss-Prot proteins with the 23 classical descriptors and
    the ESM-2 (8M) mean-pooled embeddings (labs/week07/data).

Out: data/scripts/week09_numbers.json and js/data/week09.js (window.WEEK09).

    python3 data/scripts/22_build_week09_data.py        # about 1-2 minutes
"""
import importlib.util
import json
import os
import warnings

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import linkage, cophenet, fcluster
from scipy.spatial.distance import pdist
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.datasets import load_breast_cancer
from sklearn.decomposition import PCA
from sklearn.metrics import (silhouette_score, silhouette_samples, adjusted_rand_score,
                             normalized_mutual_info_score)
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler, normalize

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SEED = 42
OUT_JSON = os.path.join(HERE, "week09_numbers.json")
OUT_JS = os.path.join(ROOT, "js", "data", "week09.js")


def r3(x):
    return float(round(float(x), 4))


def km(X, k, seed=SEED, n_init=10, init="k-means++"):
    return KMeans(n_clusters=k, n_init=n_init, init=init, random_state=seed).fit(X)


# ============================================================ WDBC
d = load_breast_cancer()
names = list(d.feature_names)
Xraw = d.data
y = (d.target == 0).astype(int)                    # 1 = malignant (sklearn codes benign = 1)
Z = StandardScaler().fit_transform(Xraw)
N = {"wdbc": {"n": int(len(y)), "malignant": int(y.sum()), "benign": int((1 - y).sum()), "p": len(names)}}

# k sweep
sweep = []
for k in range(1, 11):
    m = km(Z, k)
    row = {"k": k, "inertia": r3(m.inertia_), "sizes": sorted(np.bincount(m.labels_).tolist(), reverse=True)}
    if k >= 2:
        row["silhouette"] = r3(silhouette_score(Z, m.labels_))
        row["ari"] = r3(adjusted_rand_score(y, m.labels_))
        row["nmi"] = r3(normalized_mutual_info_score(y, m.labels_))
    sweep.append(row)
N["wdbc"]["sweep"] = sweep

# k = 2 cross-tab with diagnosis
m2 = km(Z, 2)
lab2 = m2.labels_
mal_cluster = int(np.argmax([y[lab2 == c].mean() for c in range(2)]))
tab = {"cluster_mostly_malignant": {"malignant": int(((lab2 == mal_cluster) & (y == 1)).sum()),
                                     "benign": int(((lab2 == mal_cluster) & (y == 0)).sum())},
       "cluster_mostly_benign": {"malignant": int(((lab2 != mal_cluster) & (y == 1)).sum()),
                                  "benign": int(((lab2 != mal_cluster) & (y == 0)).sum())}}
N["wdbc"]["k2_crosstab"] = tab
N["wdbc"]["k2_agreement"] = r3(((lab2 == mal_cluster).astype(int) == y).mean())
sil2 = silhouette_samples(Z, lab2)
N["wdbc"]["k2_negative_silhouette"] = int((sil2 < 0).sum())

# without standardisation: raw units, so the area features (hundreds to thousands) dominate every distance
mu = km(Xraw, 2)
var_share = Xraw.var(axis=0) / Xraw.var(axis=0).sum()
top = np.argsort(var_share)[::-1][:2]
N["wdbc"]["unscaled_k2"] = {"silhouette": r3(silhouette_score(Xraw, mu.labels_)),
                            "ari": r3(adjusted_rand_score(y, mu.labels_)),
                            "top_variance_features": [[names[i], r3(var_share[i])] for i in top]}

# initialisation: 300 single random-init runs at k = 4, and 300 single k-means++ runs
inits = {}
for kind in ["random", "k-means++"]:
    vals = [km(Z, 4, seed=s, n_init=1, init=kind).inertia_ for s in range(300)]
    vals = np.array(vals)
    best = vals.min()
    inits[kind] = {"min": r3(best), "median": r3(np.median(vals)), "max": r3(vals.max()),
                   "share_within_0.1pct_of_best": r3(np.mean(vals <= best * 1.001)),
                   "distinct_solutions": int(len(np.unique(np.round(vals, 1))))}
allbest = min(inits["random"]["min"], inits["k-means++"]["min"])
for kind in inits:
    vals = np.array([km(Z, 4, seed=s, n_init=1, init=kind).inertia_ for s in range(300)])
    inits[kind]["share_reaching_overall_best"] = r3(np.mean(vals <= allbest * 1.001))
N["wdbc"]["init_k4"] = inits

# stability: bootstrap, fit on resample, predict all rows, ARI vs the full-data partition
rng = np.random.default_rng(SEED)
B = 50
stab = {}
for k in range(2, 8):
    ref = km(Z, k).labels_
    aris = []
    for b in range(B):
        idx = rng.integers(0, len(Z), len(Z))
        mb = km(Z[idx], k, seed=b)
        aris.append(adjusted_rand_score(ref, mb.predict(Z)))
    aris = np.array(aris)
    stab[str(k)] = {"mean_ari": r3(aris.mean()), "min_ari": r3(aris.min()), "q10": r3(np.quantile(aris, 0.1))}
N["wdbc"]["stability_bootstrap"] = {"B": B, "by_k": stab}

# hierarchical: linkages at k = 2 (and 3)
hier = {}
P = pdist(Z)
for meth in ["single", "complete", "average", "ward"]:
    L = linkage(Z, meth)
    coph = cophenet(L, P)[0]
    row = {"cophenetic": r3(coph)}
    for k in [2, 3, 4]:
        lab = fcluster(L, k, criterion="maxclust")
        row[f"k{k}"] = {"sizes": sorted(np.bincount(lab)[1:].tolist(), reverse=True),
                        "ari": r3(adjusted_rand_score(y, lab)),
                        "silhouette": r3(silhouette_score(Z, lab))}
    hier[meth] = row
N["wdbc"]["hierarchical"] = hier

# DBSCAN: k-distance (min_samples = 5 -> 4th neighbour excluding self) and an eps sweep, in 30-D and in PCA-2
def dbscan_block(X, eps_list, ms=5):
    nn = NearestNeighbors(n_neighbors=ms).fit(X)
    dist, _ = nn.kneighbors(X)
    kd = np.sort(dist[:, -1])
    rows = []
    for e in eps_list:
        lab = DBSCAN(eps=e, min_samples=ms).fit_predict(X)
        ncl = len(set(lab)) - (1 if -1 in lab else 0)
        core = lab != -1
        row = {"eps": e, "clusters": ncl, "noise": int((~core).sum()),
               "largest": int(np.bincount(lab[core]).max()) if core.any() else 0}
        if ncl >= 2:
            row["ari_non_noise"] = r3(adjusted_rand_score(y[core], lab[core]))
        rows.append(row)
    q = {str(p): r3(np.quantile(kd, p / 100)) for p in [50, 75, 90, 95]}
    return {"min_samples": ms, "kdist_quantiles": q, "kdist_sorted": [r3(v) for v in kd[::3]], "sweep": rows}

N["wdbc"]["dbscan_30d"] = dbscan_block(Z, [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0])
pca2 = PCA(2, random_state=SEED).fit(Z)
Z2 = pca2.transform(Z)
N["wdbc"]["pca2_var"] = [r3(v) for v in pca2.explained_variance_ratio_]
N["wdbc"]["dbscan_pca2"] = dbscan_block(Z2, [0.3, 0.5, 0.75, 1.0, 1.25, 1.5])

# batch effect: a technical shift added to every one of the 30 raw features (direction +/- fixed per feature, size
# `shift` x that feature's SD), as when an instrument or protocol changes. Samples are assigned to batch B either at
# random (independent of diagnosis) or confounded (about 80% of malignant and 20% of benign tumours in batch B).
shift_feats = list(range(len(names)))
SIGN = np.random.default_rng(3).choice([-1, 1], len(names))
sd = Xraw.std(axis=0)


def batch_run(assign, shift=1.5, correct=False):
    X = Xraw.copy()
    X[assign == 1] += shift * sd * SIGN
    if correct:                                   # per-batch mean centring of every feature (ComBat-like location step)
        for b in [0, 1]:
            X[assign == b] -= X[assign == b].mean(axis=0)
    Zb = StandardScaler().fit_transform(X)
    lab = km(Zb, 2).labels_
    return {"silhouette": r3(silhouette_score(Zb, lab)), "ari_diagnosis": r3(adjusted_rand_score(y, lab)),
            "ari_batch": r3(adjusted_rand_score(assign, lab))}

rng = np.random.default_rng(7)
rand_assign = rng.integers(0, 2, len(y))
conf_assign = np.where(y == 1, rng.random(len(y)) < 0.8, rng.random(len(y)) < 0.2).astype(int)
batch = {"shift_features": "all 30, sign fixed per feature (seed 3)", "shift_sd": 1.5,
         "baseline": {"silhouette": sweep[1]["silhouette"], "ari_diagnosis": sweep[1]["ari"]}}
by_shift = []
for s in [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]:
    by_shift.append({"shift": s, **batch_run(rand_assign, s)})
batch["random_by_shift"] = by_shift
batch["random"] = batch_run(rand_assign)
batch["random_corrected"] = batch_run(rand_assign, correct=True)
batch["confounded"] = batch_run(conf_assign)
batch["confounded_corrected"] = batch_run(conf_assign, correct=True)
batch["confounded_share_malignant_in_B"] = r3(conf_assign[y == 1].mean())
batch["confounded_share_benign_in_B"] = r3(conf_assign[y == 0].mean())
N["wdbc"]["batch"] = batch

# ---- website-only blocks (kept out of week09_numbers.json to keep it readable) ----
WEB = {}
# silhouette values per sample for k = 2..10 (Exercise 2)
WEB["silhouettes"] = {}
for k in range(2, 11):
    lab = km(Z, k).labels_
    sv = silhouette_samples(Z, lab)
    WEB["silhouettes"][str(k)] = [[round(float(v), 3) for v in np.sort(sv[lab == c])[::-1]] for c in range(k)]
# 60 tumours for the in-browser dendrogram (Exercise 4), seeded as in the deck figure
hidx = np.sort(np.random.default_rng(0).choice(len(Z), 60, replace=False))
WEB["hier_sample"] = {"idx": hidx.tolist(), "y": y[hidx].tolist(),
                      "z": [[round(float(v), 3) for v in row] for row in Z[hidx]]}
# batch exercise (Exercise 5): every design x shift x correction, metrics + PCA-2 layout + cluster labels


def batch_layout(assign, shift, correct):
    X = Xraw.copy()
    X[assign == 1] += shift * sd * SIGN
    if correct:
        for b in [0, 1]:
            X[assign == b] -= X[assign == b].mean(axis=0)
    Zb = StandardScaler().fit_transform(X)
    lab = km(Zb, 2).labels_
    P2 = PCA(2, random_state=SEED).fit_transform(Zb)
    return {"silhouette": r3(silhouette_score(Zb, lab)), "ari_diagnosis": r3(adjusted_rand_score(y, lab)),
            "ari_batch": r3(adjusted_rand_score(assign, lab)),
            "pts": [[round(float(a), 2), round(float(b), 2), int(l)] for (a, b), l in zip(P2, lab)]}


WEB["batch"] = {"shifts": [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0],
                "assign": {"random": rand_assign.tolist(), "confounded": conf_assign.tolist()}, "runs": {}}
for design, asg in [("random", rand_assign), ("confounded", conf_assign)]:
    for sh in WEB["batch"]["shifts"]:
        for corr in [0, 1]:
            WEB["batch"]["runs"][f"{design}|{sh:g}|{corr}"] = batch_layout(asg, sh, bool(corr))
WEB["diagnosis"] = y.tolist()

# PCA-2 coordinates for the website (with diagnosis and the random batch assignment)
N["wdbc"]["pca2_points"] = [[r3(a), r3(b), int(t), int(bb)] for (a, b), t, bb in zip(Z2, y, rand_assign)]

# ============================================================ worked example (by hand), 1-D expression values
xs = [1.0, 2.0, 3.0, 8.0, 9.0, 12.0]
c = [1.0, 2.0]                                    # deliberately poor start: the first two points
steps = []
for it in range(5):
    assign = [int(np.argmin([abs(x - cc) for cc in c])) for x in xs]
    newc = [float(np.mean([x for x, a in zip(xs, assign) if a == j])) for j in range(2)]
    sse = float(sum((x - newc[a]) ** 2 for x, a in zip(xs, assign)))
    steps.append({"centroids_before": [r3(v) for v in c], "assign": assign,
                  "centroids_after": [r3(v) for v in newc], "sse_after": r3(sse)})
    if newc == c:
        break
    c = newc
lab = np.array(steps[-1]["assign"])
sil = silhouette_samples(np.array(xs).reshape(-1, 1), lab)
N["worked"] = {"x": xs, "steps": steps, "silhouette_each": [r3(v) for v in sil],
               "silhouette_mean": r3(sil.mean())}

# ============================================================ worked linkage example: five tumours, two features
pts = np.array([[1.0, 1.0], [2.0, 1.0], [4.0, 3.0], [5.0, 4.0], [5.0, 6.0]])
Dm = np.sqrt(((pts[:, None] - pts[None]) ** 2).sum(-1))
link = {}
for meth in ["single", "complete", "average", "ward"]:
    L = linkage(pts, meth)
    link[meth] = [[int(a), int(b), r3(h), int(c)] for a, b, h, c in L]
N["worked_linkage"] = {"points": pts.tolist(), "dist": [[r3(v) for v in row] for row in Dm], "merges": link}

# ============================================================ proteins (Week 7 data)
# the 23 classical descriptors are computed by the Week 7 script's features() (import only; main() is guarded)
spec = importlib.util.spec_from_file_location("w7r", os.path.join(HERE, "20_build_week07_refresh.py"))
w7 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w7)
P7 = os.path.join(ROOT, "labs", "week07", "data")
prot = pd.read_csv(os.path.join(P7, "swissprot_human_2000.csv"))
emb = pd.read_csv(os.path.join(P7, "esm2_t6_8M_embeddings.csv.gz")).set_index("accession").loc[prot.accession].values
cls = w7.features(prot.sequence.tolist())[1]
sp, tm = prot.has_signal_peptide.values, prot.is_transmembrane.values
four = sp * 2 + tm                                # 0 neither, 1 TM only, 2 SP only, 3 both
loglen = np.log(prot.length.values)


def eta2(v, lab):
    g = [v[lab == c] for c in np.unique(lab)]
    tot = ((v - v.mean()) ** 2).sum()
    return float(sum(len(x) * (x.mean() - v.mean()) ** 2 for x in g) / tot)


reps = {"classical": StandardScaler().fit_transform(cls),
        "esm2": StandardScaler().fit_transform(emb),
        "esm2_cosine": normalize(emb - emb.mean(axis=0))}
pro = {"n": int(len(prot)), "sp": int(sp.sum()), "tm": int(tm.sum()), "both": int((sp & tm).sum()), "reps": {}}
for rname, X in reps.items():
    rows = []
    for k in range(2, 9):
        m = km(X, k)
        rows.append({"k": k, "silhouette": r3(silhouette_score(X, m.labels_, random_state=SEED, sample_size=2000)),
                     "ari_sp": r3(adjusted_rand_score(sp, m.labels_)),
                     "ari_tm": r3(adjusted_rand_score(tm, m.labels_)),
                     "nmi_four": r3(normalized_mutual_info_score(four, m.labels_)),
                     "eta2_loglen": r3(eta2(loglen, m.labels_)),
                     "sizes": sorted(np.bincount(m.labels_).tolist(), reverse=True)})
    pro["reps"][rname] = rows
# per-cluster profile (size, share with SP, share TM, median length) for every representation and k
pro["profiles"] = {}
for rname in reps:
    pro["profiles"][rname] = {}
    for k in range(2, 9):
        m = km(reps[rname], k)
        rows = []
        for cc in range(k):
            mk = m.labels_ == cc
            rows.append({"size": int(mk.sum()), "sp": r3(sp[mk].mean()), "tm": r3(tm[mk].mean()),
                         "median_length": int(np.median(prot.length.values[mk]))})
        pro["profiles"][rname][str(k)] = sorted(rows, key=lambda r: -r["size"])
pro["k4_profile_classical"] = pro["profiles"]["classical"]["4"]
pro["k4_profile_esm2_cosine"] = pro["profiles"]["esm2_cosine"]["4"]
N["proteins"] = pro

# ============================================================ write
json.dump(N, open(OUT_JSON, "w"), indent=1)
web = {k: v for k, v in N.items()}
web["web"] = WEB
import sklearn
web["sklearn"] = sklearn.__version__
with open(OUT_JS, "w") as f:
    f.write("/* AUTO-GENERATED by data/scripts/22_build_week09_data.py - do not edit by hand.\n"
            "   REAL DATA: WDBC (UCI, CC BY 4.0) and the Week 7 Swiss-Prot/ESM-2 proteins. */\n")
    f.write("window.WEEK09 = " + json.dumps(web, separators=(",", ":")) + ";\n")
print("wrote", OUT_JSON, "and", OUT_JS, f"({os.path.getsize(OUT_JS) / 1e3:.0f} kB)")
s = N["wdbc"]["sweep"]
print("WDBC sil:", [(r["k"], r.get("silhouette"), r.get("ari")) for r in s])
print("init:", inits)
print("stab:", stab)
print("hier:", {m: (h["cophenetic"], h["k2"]) for m, h in hier.items()})
print("dbscan30:", N["wdbc"]["dbscan_30d"]["sweep"], N["wdbc"]["dbscan_30d"]["kdist_quantiles"])
print("dbscan2:", N["wdbc"]["dbscan_pca2"]["sweep"], N["wdbc"]["dbscan_pca2"]["kdist_quantiles"])
print("batch:", {k: v for k, v in batch.items() if k not in ("random_by_shift",)}, batch["random_by_shift"])
print("worked:", N["worked"])
print("unscaled:", N["wdbc"]["unscaled_k2"])
print("linkage:", N["worked_linkage"])
for rname in reps:
    print(rname, [(r["k"], r["silhouette"], r["ari_sp"], r["ari_tm"], r["nmi_four"], r["eta2_loglen"]) for r in pro["reps"][rname]])
print(pro["k4_profile_classical"], pro["k4_profile_esm2_cosine"])
