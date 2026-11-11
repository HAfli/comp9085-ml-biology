#!/usr/bin/env python3
"""
Week 9 lab (clustering biological data): build the student notebook and the instructor solutions notebook from
ONE source, so the two cannot drift apart.

Outputs
    labs/week09/COMP9085_Week09_Lab.ipynb                         public, no answers
    labs/week09/COMP9085_Week09_Lab.html                          public, rendered
    labs/week09/solutions/COMP9085_Week09_Lab_Solutions.ipynb     instructor (gitignored)
    labs/week09/solutions/COMP9085_Week09_Lab_Solutions.html      instructor (gitignored)

Data: WDBC from scikit-learn (offline) and labs/week09/data/ (the Week 7 proteins: 23 classical descriptors and
ESM-2 embeddings). In Colab, the notebook downloads the two protein files from the course website.
Both notebooks are EXECUTED here in a fresh kernel; a check cell (run, then removed) asserts that the solutions
agree with data/scripts/week09_numbers.json, the source the lecture and the website quote.

    python3 data/scripts/22_build_week09_data.py   # first, if the numbers changed
    python3 data/scripts/23_build_week09_lab.py    # needs nbformat, nbconvert, ipykernel
"""
import copy
import json
import os

import nbformat
from nbconvert import HTMLExporter
from nbconvert.preprocessors import ExecutePreprocessor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "labs", "week09")
SOL = os.path.join(OUT, "solutions")
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week09_numbers.json")))
W = N["wdbc"]
SW = {r["k"]: r for r in W["sweep"]}
ST = W["stability_bootstrap"]["by_k"]
H = W["hierarchical"]
B = W["batch"]
PR = N["proteins"]
STUDENT_TEXT = "*Your answer here.*"


def f3(x):
    return f"{x:.3f}"


def pct(x, d=0):
    return f"{100 * x:.{d}f}%"


def cells():
    bs = {r["shift"]: r for r in B["random_by_shift"]}
    cl = {r["k"]: r for r in PR["reps"]["classical"]}
    es = {r["k"]: r for r in PR["reps"]["esm2"]}
    ec = {r["k"]: r for r in PR["reps"]["esm2_cosine"]}
    us = W["unscaled_k2"]
    db30 = {r["eps"]: r for r in W["dbscan_30d"]["sweep"]}
    db2 = {r["eps"]: r for r in W["dbscan_pca2"]["sweep"]}
    return [
("md", """# COMP9085 Week 9 Laboratory
## Clusters, and whether to believe them

**Two hours.** In the lecture you saw that every clustering algorithm returns an answer, and that the hard part is
deciding whether to believe it. Today you cluster real biological data, choose the number of clusters defensibly,
and then try seriously to break your own result: with resampling, with a different algorithm, with a manufactured
batch effect, and with a second kind of biological data.

**Data.**
* **WDBC** (UCI Breast Cancer Wisconsin, Diagnostic): 569 tumours, 30 measurements of cell nuclei from a fine-needle
  aspirate image (Weeks 2, 3 and 7). It ships with scikit-learn, so no download is needed. The diagnosis (malignant or
  benign) is **not used for clustering**. We use it only afterwards, to check what was found. In a real discovery study
  you would not have it.
* **The Week 7 proteins**: 2,000 human Swiss-Prot proteins (UniProt release 2026_03, one per UniRef50 cluster) with
  their 23 classical descriptors and their ESM-2 (8M) embeddings. Files in `data/` (provenance in `data/README.md`).

**Learning objectives.** By the end you should be able to:
1. carry out k-means and a silhouette calculation by hand, and check them against scikit-learn;
2. justify a choice of k with the elbow, silhouette and bootstrap stability together;
3. tune DBSCAN with a k-distance plot and explain its behaviour in high dimension;
4. compare linkage criteria and recognise when a high silhouette is meaningless;
5. show that a technical batch effect can replace the biology, and why correction fails under confounding;
6. explain why clusters in an embedding space need not follow a property the embedding encodes;
7. write a defensible, honest statement of what a clustering result shows.

**How to work.** Core tasks 1–9 fit in two hours (times are a guide). Extensions A–C are optional. Code cells marked
`# your code here` are yours; cells marked `# provided` are complete. Every task ends with a question to answer in the
markdown cell below it: **the written answers matter more than the code.** The matching website exercises are on the
Week 9 page: https://hafli.github.io/comp9085-ml-biology/weeks/week09.html

**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**), with every
question answered in the markdown cells.

**Runs in** Google Colab or any Python 3.10+ environment with numpy, pandas, matplotlib, scipy and scikit-learn
(≥ 1.3). No GPU and no deep-learning package are needed. The whole notebook runs in about a minute."""),
("code", """# provided: setup
import time, warnings
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.cluster.hierarchy import linkage, dendrogram, fcluster
from sklearn.datasets import load_breast_cancer
from sklearn.preprocessing import StandardScaler, normalize
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score, silhouette_samples, adjusted_rand_score
from sklearn.neighbors import NearestNeighbors
import sklearn
warnings.filterwarnings("ignore")
SEED = 42
print("scikit-learn", sklearn.__version__)

# WDBC: X raw measurements, y diagnosis (1 = malignant) kept aside for checking only
wdbc = load_breast_cancer()
X_raw = wdbc.data
names = list(wdbc.feature_names)
y = (wdbc.target == 0).astype(int)
Z = StandardScaler().fit_transform(X_raw)
print(X_raw.shape, "tumours x features;", y.sum(), "malignant,", (1 - y).sum(), "benign")

# The Week 7 proteins: local data/ folder, or the course website (for Colab)
URL = "https://hafli.github.io/comp9085-ml-biology/labs/week09/data/"
DATA = next((p for p in [Path("data"), Path("../data")] if (p / "proteins_classical_features.csv").exists()), None)
if DATA is None:
    import urllib.request
    DATA = Path("data"); DATA.mkdir(exist_ok=True)
    for f in ["proteins_classical_features.csv", "esm2_t6_8M_embeddings.csv.gz"]:
        urllib.request.urlretrieve(URL + f, DATA / f)
prot = pd.read_csv(DATA / "proteins_classical_features.csv")
emb = pd.read_csv(DATA / "esm2_t6_8M_embeddings.csv.gz").set_index("accession").loc[prot.accession]
print(len(prot), "proteins;", emb.shape[1], "embedding dimensions")"""),

# ------------------------------------------------------------------ Task 1
("md", """## Task 1. k-means and the silhouette by hand (10 min)

Six samples with the expression of one gene: `1, 2, 3, 8, 9, 12`. Start k-means with k = 2 from the (poor) centroids
1 and 2, exactly as in the lecture.

**1a.** Write the two steps of Lloyd's algorithm yourself in numpy: assign each value to its nearest centroid, then move
each centroid to the mean of its members. Print the assignment, the centroids and the SSE after every iteration, and
stop when nothing changes.

**1b.** Check your answer with `KMeans(n_clusters=2, init=np.array([[1.], [2.]]), n_init=1)`.

**1c.** Compute the silhouette of the value 3 by hand (in code, without `silhouette_samples`), then check it and the mean
silhouette with scikit-learn."""),
("task",
"""x = np.array([1., 2., 3., 8., 9., 12.])
c = np.array([1., 2.])
# your code here
""",
"""x = np.array([1., 2., 3., 8., 9., 12.])
c = np.array([1., 2.])
lab = None
for it in range(1, 20):
    new_lab = np.argmin(np.abs(x[:, None] - c[None, :]), axis=1)          # assignment step
    if lab is not None and np.array_equal(new_lab, lab):
        print(f"iteration {it}: no change, converged"); break
    lab = new_lab
    c = np.array([x[lab == j].mean() for j in range(2)])                   # update step
    sse = ((x - c[lab]) ** 2).sum()
    print(f"iteration {it}: assignment {lab.tolist()}, centroids {np.round(c, 3).tolist()}, SSE {sse:.2f}")

km1 = KMeans(n_clusters=2, init=np.array([[1.], [2.]]), n_init=1).fit(x.reshape(-1, 1))
print("scikit-learn:", km1.labels_.tolist(), np.round(km1.cluster_centers_.ravel(), 3).tolist(), round(km1.inertia_, 2))

i = 2                                                       # the value 3
own = x[(lab == lab[i]) & (np.arange(len(x)) != i)]
other = x[lab != lab[i]]
a, b = np.abs(own - x[i]).mean(), np.abs(other - x[i]).mean()
s3 = (b - a) / max(a, b)
print(f"a = {a:.3f}, b = {b:.3f}, s = {s3:.3f}")
sv = silhouette_samples(x.reshape(-1, 1), lab)
print("scikit-learn s(i):", np.round(sv, 3).tolist(), "mean", round(sv.mean(), 3))"""),
("md", "**Question 1.** Which value has the lowest silhouette, and why? Would a start at 1 and 12 have reached the same answer?"),
("answer", f"""The value 8 has the lowest silhouette ({N['worked']['silhouette_each'][3]:.3f}): it is on average 2.5 from its
cluster mates 9 and 12 (a = (1 + 4)/2 = 2.5) but only 6 from the left group (b = (7 + 6 + 5)/3 = 6), so it is the
closest to the boundary. The value 3 has s = 1 − 1.5/6.67 = {N['worked']['silhouette_each'][2]:.3f}; the mean is
{N['worked']['silhouette_mean']:.3f}. Starting at 1 and 12 reaches the same partition in one step here, because the two
groups are far apart; with more points and more clusters, different starts reach different local optima (Task 3c)."""),
("teach", """About 10 minutes. Some students compute b as the distance to the other centroid rather than the mean
distance to the other cluster's members: point them to the definition. Others forget that a(i) excludes i itself."""),

# ------------------------------------------------------------------ Task 2
("md", """## Task 2. Does scaling change the clusters? (15 min)

**2a.** Run `KMeans(n_clusters=2, n_init=10, random_state=SEED)` on the **raw** WDBC measurements and on the
**standardised** ones (`Z`). For each, report the silhouette (computed in the same space the algorithm used) and the
adjusted Rand index (ARI) with the diagnosis.

**2b.** Which two features hold most of the raw variance, and what share?"""),
("task", """# your code here
""",
"""for nm, X_ in [("raw", X_raw), ("standardised", Z)]:
    lab_ = KMeans(n_clusters=2, n_init=10, random_state=SEED).fit_predict(X_)
    print(f"{nm:13s} silhouette {silhouette_score(X_, lab_):.3f}   ARI with diagnosis {adjusted_rand_score(y, lab_):.3f}")
share = X_raw.var(axis=0) / X_raw.var(axis=0).sum()
for j in np.argsort(share)[::-1][:3]:
    print(f"{names[j]:25s} {100 * share[j]:.1f}% of the raw variance")"""),
("md", "**Question 2.** The raw clustering has the *higher* silhouette. Is it the better clustering? Explain in two or three sentences."),
("answer", f"""No. On raw data, worst area and mean area hold {pct(us['top_variance_features'][0][1], 1)} and
{pct(us['top_variance_features'][1][1], 1)} of the variance, so k-means is in effect clustering on tumour area; one
dominant feature separates cleanly, which gives a high silhouette ({f3(us['silhouette'])}). Standardised, every
measurement contributes; the silhouette is lower ({f3(SW[2]['silhouette'])}) but the agreement with diagnosis is
higher (ARI {f3(us['ari'])} → {f3(SW[2]['ari'])}). Silhouettes computed in different spaces are not comparable: the
space must be chosen from the biology and reported, not chosen to maximise the score."""),
("teach", """Students who say "raw is better because silhouette is higher" are the target of this task. Ask them
what the silhouette would be if you clustered on area alone. Note: standardising is a choice too (for expression data
in common units, log without scaling is often preferred); the point is to justify it."""),

# ------------------------------------------------------------------ Task 3
("md", """## Task 3. Choosing k: elbow and silhouette (15 min)

**3a.** For k = 1 to 10 on `Z`, record the WCSS (`inertia_`), and for k ≥ 2 the mean silhouette and the cluster sizes.
Plot WCSS and silhouette against k.

**3b.** Draw silhouette plots for k = 2 and k = 4 with the helper below. How many tumours have s(i) < 0?

**3c.** Run k-means at k = 4 from 50 different single starts (`n_init=1, init="random", random_state=s`). How many
distinct final WCSS values do you get?

**Decide your k now, before Task 4 shows the diagnosis.**"""),
("code", """# provided: silhouette plot helper
def silhouette_plot(ax, X, labels, title=""):
    sv = silhouette_samples(X, labels)
    y0 = 0
    for c in np.unique(labels):
        v = np.sort(sv[labels == c])
        ax.fill_betweenx(np.arange(y0, y0 + len(v)), 0, v, alpha=0.8)
        ax.text(-0.1, y0 + len(v) / 2, f"n={len(v)}", fontsize=8)
        y0 += len(v) + 10
    ax.axvline(sv.mean(), color="red", ls="--")
    ax.set_title(f"{title} mean {sv.mean():.3f}; {(sv < 0).sum()} below 0"); ax.set_yticks([])
    return sv"""),
("task", """# your code here
""",
"""rows = []
for k in range(1, 11):
    m = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit(Z)
    rows.append({"k": k, "WCSS": m.inertia_,
                 "silhouette": silhouette_score(Z, m.labels_) if k > 1 else np.nan,
                 "sizes": sorted(np.bincount(m.labels_).tolist(), reverse=True)})
sweep = pd.DataFrame(rows).set_index("k")
print(sweep.round(3))
fig, ax = plt.subplots(1, 2, figsize=(11, 3.5))
ax[0].plot(sweep.index, sweep.WCSS, "o-"); ax[0].set_title("Elbow: WCSS"); ax[0].set_xlabel("k")
ax[1].plot(sweep.index[1:], sweep.silhouette[1:], "o-", color="C1"); ax[1].set_title("Mean silhouette"); ax[1].set_xlabel("k")
plt.show()

fig, ax = plt.subplots(1, 2, figsize=(11, 4))
labels_k = {}
for a_, k in zip(ax, [2, 4]):
    labels_k[k] = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit_predict(Z)
    silhouette_plot(a_, Z, labels_k[k], f"k = {k}:")
plt.show()

finals = [KMeans(n_clusters=4, n_init=1, init="random", random_state=s).fit(Z).inertia_ for s in range(50)]
print("k = 4, 50 single random starts:", len(np.unique(np.round(finals, 1))), "distinct final WCSS values;",
      f"best {min(finals):.1f}, worst {max(finals):.1f}")"""),
("md", "**Question 3.** Which k do you choose, and why? What does the size of the best silhouette tell you?"),
("answer", f"""k = 2. The silhouette is highest at k = 2 ({f3(SW[2]['silhouette'])}), then {f3(SW[3]['silhouette'])},
{f3(SW[4]['silhouette'])} and a sharp drop to {f3(SW[5]['silhouette'])} at k = 5; the elbow is gentle (WCSS
{SW[1]['inertia']:,.0f} → {SW[2]['inertia']:,.0f} → {SW[3]['inertia']:,.0f}), so on its own it is ambiguous between 2 and 3.
At k = 4 two small clusters sit mostly at or below s = 0. A silhouette of about 0.34 is moderate: there is real
structure, but the groups overlap ({W['k2_negative_silhouette']} tumours have s(i) < 0 at k = 2). The 50 single starts
at k = 4 end at many different WCSS values: there is no single obvious four-group partition, which is itself evidence
against four groups."""),
("teach", """Insist that students write their k before running Task 4. The point of the order is the discipline:
decide with unsupervised evidence, then look at the label."""),

# ------------------------------------------------------------------ Task 4
("md", """## Task 4. Stability, then the label (10 min)

**4a.** Write `stability(Z, k, B=50)`: for each of B bootstrap resamples (rows drawn with replacement), fit k-means
(`n_init=10, random_state=b`) on the resample, assign **all** 569 tumours with `.predict`, and compute the ARI with the
full-data clustering. Return the B values. Use one generator, `rng = np.random.default_rng(SEED)`, created once before
looping over k = 2 to 6 in order (so your numbers match the lecture).

**4b.** Now reveal the label: the ARI between the k-means clusters and the diagnosis for k = 2 to 6, and the
2 × 2 table at k = 2."""),
("task", """rng = np.random.default_rng(SEED)
# your code here
""",
"""rng = np.random.default_rng(SEED)
def stability(Z, k, B=50):
    ref = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit(Z).labels_
    out = []
    for b in range(B):
        idx = rng.integers(0, len(Z), len(Z))
        mb = KMeans(n_clusters=k, n_init=10, random_state=b).fit(Z[idx])
        out.append(adjusted_rand_score(ref, mb.predict(Z)))
    return np.array(out)

stab = {k: stability(Z, k) for k in range(2, 7)}
for k, v in stab.items():
    lab_ = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit_predict(Z)
    print(f"k = {k}: stability mean {v.mean():.3f} (lowest {v.min():.3f})   ARI with diagnosis {adjusted_rand_score(y, lab_):.3f}")
print(pd.crosstab(labels_k[2], y, rownames=["cluster"], colnames=["malignant"]))"""),
("md", "**Question 4.** Is a stable clustering necessarily a biological one? Give an example where it is not."),
("answer", f"""Stability is highest at k = 2 (mean bootstrap ARI {f3(ST['2']['mean_ari'])}, against {f3(ST['3']['mean_ari'])}
at 3 and {f3(ST['4']['mean_ari'])} at 4), and k = 2 also agrees best with diagnosis (ARI {f3(SW[2]['ari'])};
{pct(W['k2_agreement'], 1)} of tumours on the expected side). But stability is necessary, not sufficient: anything really
in the data is stable, including a technical artefact. A batch effect (Task 7) or a dominant nuisance variable such as
tumour size in raw units (Task 2) would be found again in every resample."""),

# ------------------------------------------------------------------ Task 5
("md", """## Task 5. DBSCAN and the k-distance plot (15 min)

**5a.** With `min_samples = 5`, compute each tumour's distance to its 4th nearest neighbour (`NearestNeighbors(n_neighbors=5)`;
the first neighbour is the point itself) in the 30-D space `Z` and on the first two principal components `Z2`
(provided). Plot both sorted curves.

**5b.** Run DBSCAN for eps in `[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0]` on `Z` and in `[0.3, 0.5, 0.75, 1.0, 1.25, 1.5]` on
`Z2`. Tabulate the number of clusters, of noise points and the largest cluster.

**5c.** At eps = 0.5 on `Z2`, what share of the noise points are malignant, against 37% overall?"""),
("code", """# provided
Z2 = PCA(2, random_state=SEED).fit_transform(Z)"""),
("task", """# your code here
""",
"""fig, ax = plt.subplots(figsize=(6, 3.5))
for X_, nm in [(Z, "30-D standardised"), (Z2, "first 2 PCs")]:
    d, _ = NearestNeighbors(n_neighbors=5).fit(X_).kneighbors(X_)
    ax.plot(np.sort(d[:, -1]), label=nm)
ax.set_xlabel("tumours, sorted"); ax.set_ylabel("distance to 4th neighbour"); ax.legend(); plt.show()

def db_table(X_, eps_list):
    out = []
    for e in eps_list:
        lab_ = DBSCAN(eps=e, min_samples=5).fit_predict(X_)
        core = lab_ >= 0
        out.append({"eps": e, "clusters": len(set(lab_[core])), "noise": int((~core).sum()),
                    "largest": int(np.bincount(lab_[core]).max()) if core.any() else 0})
    return pd.DataFrame(out).set_index("eps")
db30 = db_table(Z, [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0]); print(db30)
db2 = db_table(Z2, [0.3, 0.5, 0.75, 1.0, 1.25, 1.5]); print(db2)
lab05 = DBSCAN(eps=0.5, min_samples=5).fit_predict(Z2)
print(f"noise at eps 0.5: {(lab05 == -1).sum()} tumours, {100 * y[lab05 == -1].mean():.0f}% malignant (overall {100 * y.mean():.0f}%)")"""),
("md", "**Question 5.** Why does DBSCAN fail in 30 dimensions here, and what kind of biological data would suit it?"),
("answer", f"""In 30 dimensions no eps gives a useful partition: at eps 2.0 there are {db30[2.0]['noise']} noise points and
{db30[2.0]['clusters']} clusters; by eps 3.0 there is a single cluster of {db30[3.0]['largest']}. Distances concentrate in high
dimension (Week 7), so "dense" has little meaning and the k-distance curve has no clear bend. On two principal
components eps 0.5 gives {db2[0.5]['clusters']} clusters and {db2[0.5]['noise']} noise points; most noise points are malignant,
because the malignant tumours are spread out, not dense. DBSCAN suits data with genuinely dense groups against a
sparser background in a low-dimensional space, such as cell populations in a 2- or 3-marker flow-cytometry gate, or
spatial clusters of cells in tissue."""),

# ------------------------------------------------------------------ Task 6
("md", """## Task 6. Linkage and the linkage trap (15 min)

**6a.** For single, complete, average and Ward linkage on `Z` (`scipy.cluster.hierarchy.linkage`), cut each tree into two
clusters (`fcluster(..., 2, criterion="maxclust")`) and report the sizes, the silhouette and the ARI with diagnosis.

**6b.** Draw the four dendrograms for the 60 tumours in `idx60` (provided) side by side.

**6c.** Which tumours does single linkage separate? Print their mean area and compare with the median."""),
("code", """# provided: the 60 tumours used on the website and in the lecture figure
idx60 = np.sort(np.random.default_rng(0).choice(len(Z), 60, replace=False))"""),
("task", """# your code here
""",
"""link_res = {}
for m in ["single", "complete", "average", "ward"]:
    lab_ = fcluster(linkage(Z, m), 2, criterion="maxclust")
    link_res[m] = lab_
    print(f"{m:9s} sizes {sorted(np.bincount(lab_)[1:].tolist(), reverse=True)}  silhouette {silhouette_score(Z, lab_):.3f}"
          f"  ARI {adjusted_rand_score(y, lab_):.3f}")
fig, ax = plt.subplots(1, 4, figsize=(16, 4))
for a_, m in zip(ax, ["single", "complete", "average", "ward"]):
    dendrogram(linkage(Z[idx60], m), ax=a_, no_labels=True, color_threshold=0); a_.set_title(m)
plt.show()
small = np.where(link_res["single"] == np.argmin(np.bincount(link_res["single"])[1:]) + 1)[0]
print("single linkage separates tumours", small.tolist(), "with mean area", X_raw[small, names.index("mean area")].round(0).tolist(),
      "; median mean area", np.median(X_raw[:, names.index("mean area")]).round(0))"""),
("md", "**Question 6.** Single linkage has the highest silhouette. Why is it the least useful answer, and what habit protects you?"),
("answer", f"""Single and complete linkage split off two tumours ({H['single']['k2']['sizes'][0]} / {H['single']['k2']['sizes'][1]}); the
silhouette is high ({f3(H['single']['k2']['silhouette'])}) because those two are far from everything and everyone else is
together, but the ARI with diagnosis is {f3(H['single']['k2']['ari'])}. They are the two largest tumours in the data (mean area 2,501 and 2,499 μm² against a median of 551), both malignant:
outliers, not a subgroup. Ward ({H['ward']['k2']['sizes'][0]} / {H['ward']['k2']['sizes'][1]}, silhouette
{f3(H['ward']['k2']['silhouette'])}, ARI {f3(H['ward']['k2']['ari'])}) finds the main structure. The habit: always print the
cluster sizes and look at the members; inspect outliers before clustering."""),
("teach", """A good discussion point: complete linkage, which is usually described as producing compact clusters,
also isolates the outliers here, because at k = 2 the last merge joins the two extreme tumours to everything else."""),

# ------------------------------------------------------------------ Task 7
("md", """## Task 7. Manufacture a batch effect (25 min): the heart of the lab

Batch effects are technical shifts shared by samples processed together. We **simulate** one on the real tumours: half
the tumours are put in "batch B" and every raw feature of batch B is shifted by `shift` × that feature's standard
deviation, in a direction fixed per feature. Two designs:
* **random**: batch B is a coin toss, independent of diagnosis;
* **confounded**: about 80% of malignant and 20% of benign tumours are in batch B (as when cases and controls are
  collected at different times).

**7a.** Write `run(assign, shift, correct=False)`: shift the raw data, optionally centre each batch on its own mean,
standardise, run k-means (k = 2, `n_init=10, random_state=SEED`) and return the silhouette, the ARI with diagnosis and the
ARI with batch.

**7b.** For the random design, sweep `shift` over `SHIFTS` and plot the three numbers. Where do the clusters switch?

**7c.** At shift 1.5, compare: random; random and centred; confounded; confounded and centred."""),
("code", """# provided: the batch assignments and the shift directions (seeded, as in the lecture)
rng7 = np.random.default_rng(7)
batch_random = rng7.integers(0, 2, len(y))
batch_conf = np.where(y == 1, rng7.random(len(y)) < 0.8, rng7.random(len(y)) < 0.2).astype(int)
SIGN = np.random.default_rng(3).choice([-1, 1], X_raw.shape[1])
SD = X_raw.std(axis=0)
SHIFTS = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
print("confounded design: share of malignant in batch B", batch_conf[y == 1].mean().round(3),
      "; share of benign", batch_conf[y == 0].mean().round(3))"""),
("task", """# your code here
""",
"""def run(assign, shift, correct=False):
    X = X_raw.copy()
    X[assign == 1] += shift * SD * SIGN
    if correct:
        for b_ in [0, 1]:
            X[assign == b_] -= X[assign == b_].mean(axis=0)
    Zb = StandardScaler().fit_transform(X)
    lab_ = KMeans(n_clusters=2, n_init=10, random_state=SEED).fit_predict(Zb)
    return {"silhouette": silhouette_score(Zb, lab_), "ARI diagnosis": adjusted_rand_score(y, lab_),
            "ARI batch": adjusted_rand_score(assign, lab_)}

bsweep = pd.DataFrame([run(batch_random, s) for s in SHIFTS], index=pd.Index(SHIFTS, name="shift"))
print(bsweep.round(3))
bsweep.plot(marker="o", figsize=(7, 3.5)); plt.xlabel("batch shift (SD per feature)"); plt.show()
scen = pd.DataFrame({"random": run(batch_random, 1.5), "random, centred": run(batch_random, 1.5, True),
                     "confounded": run(batch_conf, 1.5), "confounded, centred": run(batch_conf, 1.5, True)}).T
print(scen.round(3))"""),
("md", """**Question 7.** (a) At what shift do the clusters stop following the diagnosis, and what happens to the silhouette?
(b) Why does centring each batch rescue the random design but not the confounded one? (c) What should have been done
when the samples were collected?"""),
("answer", f"""(a) Up to 1.0 SD the clusters follow the diagnosis (ARI ≈ {f3(bs[1.0]['ari_diagnosis'])}); at 1.25 SD they follow the
batch completely (ARI with batch {f3(bs[1.25]['ari_batch'])}, with diagnosis {f3(bs[1.25]['ari_diagnosis'])}). From then on
the silhouette rises with the shift ({f3(bs[1.5]['silhouette'])} at 1.5 SD, {f3(bs[3.0]['silhouette'])} at 3 SD, against
{f3(B['baseline']['silhouette'])} with no batch): a stronger artefact gives a *better* internal score.
(b) With a random design the batch is independent of diagnosis, so each batch's mean contains only the shift;
removing it recovers the biology (ARI {f3(B['random_corrected']['ari_diagnosis'])}). With a confounded design batch B is
mostly malignant, so its mean contains the biology too; centring removes part of the biological difference (ARI with
diagnosis {f3(B['confounded_corrected']['ari_diagnosis'])}). No analysis can separate two effects that were collected
together (and adjusting with the group in the model can exaggerate differences instead; Nygaard et al. 2016).
(c) Balance biological groups across batches (randomise or block), record the batch, and check clusters against it."""),
("teach", """Protect 25 minutes. The most common misreading is "correction works" from the random design alone; the
confounded case is the lesson. If students finish early, ask them to find the shift at which the confounded design's
clusters stop agreeing with diagnosis better than the batch."""),

# ------------------------------------------------------------------ Task 8
("md", """## Task 8. Clusters in protein embedding space (15 min)

In Week 7, k-NN on the ESM-2 embeddings predicted signal peptides and membrane proteins well (test ROC AUC 0.94).
Do k-means clusters of the same embeddings follow those labels?

**8a.** Build three representations (provided): the 23 classical descriptors, standardised; ESM-2, standardised
(Euclidean); and ESM-2 centred and scaled to unit length (cosine).

**8b.** For k = 2 to 8, run k-means (`n_init=10, random_state=SEED`) on each and record the ARI with the signal-peptide
label, the ARI with the membrane label, and η², the share of the variance in log length explained by cluster
membership (function provided).

**8c.** For the classical descriptors at k = 3, print each cluster's size, share with a signal peptide, share membrane
and median length."""),
("code", """# provided
sp = prot.has_signal_peptide.values; tm = prot.is_transmembrane.values
loglen = np.log(prot.length.values)
CLASSICAL = [c for c in prot.columns if c.startswith("frac_")] + ["log_length", "max_hydropathy_19", "nterm_hydropathy_25"]
E = emb.values
REPS = {"classical": StandardScaler().fit_transform(prot[CLASSICAL].values),
        "esm2": StandardScaler().fit_transform(E),
        "esm2_cosine": normalize(E - E.mean(axis=0))}

def eta2(v, lab):
    tot = ((v - v.mean()) ** 2).sum()
    return sum((lab == c).sum() * (v[lab == c].mean() - v.mean()) ** 2 for c in np.unique(lab)) / tot
print({k: v.shape for k, v in REPS.items()})"""),
("task", """# your code here
""",
"""prot_rows = []
prot_labels = {}
for rn, X_ in REPS.items():
    for k in range(2, 9):
        lab_ = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit_predict(X_)
        prot_labels[(rn, k)] = lab_
        prot_rows.append({"rep": rn, "k": k, "ARI SP": adjusted_rand_score(sp, lab_),
                          "ARI TM": adjusted_rand_score(tm, lab_), "eta2 length": eta2(loglen, lab_)})
ptab = pd.DataFrame(prot_rows).set_index(["rep", "k"])
print(ptab.round(3).unstack(0))
lab3 = prot_labels[("classical", 3)]
print(pd.DataFrame({"size": np.bincount(lab3), "SP share": [sp[lab3 == c].mean() for c in range(3)],
                    "TM share": [tm[lab3 == c].mean() for c in range(3)],
                    "median length": [np.median(prot.length.values[lab3 == c]) for c in range(3)]}).round(2))"""),
("md", "**Question 8.** k-NN on ESM-2 predicts both labels well, yet ESM-2 clusters barely follow them. Explain the apparent contradiction, and say what the clusters do follow."),
("answer", f"""The best ARI over k = 2 to 8 is {f3(max(r['ari_tm'] for r in PR['reps']['esm2']))} for membrane proteins and
{f3(max(r['ari_sp'] for r in PR['reps']['esm2']))} for signal peptides with Euclidean ESM-2 (cosine: {f3(max(r['ari_tm'] for r in PR['reps']['esm2_cosine']))} and
{f3(max(r['ari_sp'] for r in PR['reps']['esm2_cosine']))}), while cluster membership explains up to
{pct(max(r['eta2_loglen'] for rr in PR['reps'].values() for r in rr))} of the variance in log length. k-NN is supervised:
the label decides which neighbourhoods matter, and only the local neighbourhood is used. k-means finds the largest
structure in the whole space, which reflects what dominates the embedding's variance (length, composition, families), not
the property we care about. The classical descriptors, which include a hydropathy window designed for membrane helices,
give a cluster that is mostly membrane proteins (ARI {f3(cl[3]['ari_tm'])} at k = 3). A representation can contain a
property without that property being its main cluster structure."""),

# ------------------------------------------------------------------ Task 9
("md", """## Task 9. What can you claim? (10 min)

**9a.** Write the two sentences you would need in a paper to claim that the k = 2 WDBC clusters are biologically
meaningful subgroups. Then say honestly whether your analysis supports them.

**9b.** Using the lecture's checklist (technical variables; robustness; stability; outcome not used to cluster;
coherent biology; independent replication), tick which checks this lab performed and which it could not."""),
("answer", f"""**9a.** "Unsupervised k-means clustering of 30 standardised nuclear features identified two groups of tumours
(silhouette {f3(SW[2]['silhouette'])}; bootstrap stability ARI {f3(ST['2']['mean_ari'])}) that were robust to the choice
between k-means and Ward clustering. Cluster membership was associated with an outcome not used in clustering and
replicated in an independent cohort." Our analysis supports the first sentence only in part (moderate silhouette,
stable, Ward agrees at ARI {f3(H['ward']['k2']['ari'])}) and not the second at all: the diagnosis was used to check, but it
is the label the features were designed to predict, not an independent outcome, and we have no second cohort. The
honest claim: the data contain a moderately separated two-group structure that largely recovers the known
diagnosis; no new subtype is shown.
**9b.** Performed: robustness to scaling (Task 2) and algorithm (Task 6), stability (Task 4), a demonstration of how a
technical variable would show (Task 7). Not possible: checking real technical variables (WDBC has no batch or site
information), an outcome not used in defining the groups, pathway-level biology, independent replication."""),
("md", """## Optional extensions

**A. Other algorithms.** Fit `GaussianMixture(n_components=k)` on `Z2` and compare BIC across k; then run
`sklearn.cluster.HDBSCAN(min_cluster_size=15)` on `Z2`. Do they agree with k-means and DBSCAN?

**B. Cluster-wise stability (Hennig 2007).** For k = 2 and 3, compute for each cluster the mean Jaccard similarity
between it and its best-matching cluster across 50 bootstrap resamples. Are some clusters stable and others not?

**C. PCA before clustering proteins.** Reduce standardised ESM-2 to 10 or 50 principal components before k-means. Do
the ARIs with the labels change?"""),
("task", """# your code here (optional)
""",
"""from sklearn.mixture import GaussianMixture
bic = {k: GaussianMixture(k, random_state=SEED).fit(Z2).bic(Z2) for k in range(1, 7)}
print("A. GMM BIC on Z2:", {k: round(v) for k, v in bic.items()})
if hasattr(sklearn.cluster, "HDBSCAN"):
    hl = sklearn.cluster.HDBSCAN(min_cluster_size=15).fit_predict(Z2)
    print("   HDBSCAN:", len(set(hl[hl >= 0])), "clusters,", (hl == -1).sum(), "noise")

def jaccard_stability(Z, k, B=50, seed=SEED):
    r = np.random.default_rng(seed)
    ref = KMeans(n_clusters=k, n_init=10, random_state=SEED).fit_predict(Z)
    out = np.zeros(k)
    for b in range(B):
        idx = np.unique(r.integers(0, len(Z), len(Z)))
        lb = KMeans(n_clusters=k, n_init=10, random_state=b).fit_predict(Z[idx])
        for c in range(k):
            A = set(idx[ref[idx] == c])
            out[c] += max(len(A & set(idx[lb == d])) / len(A | set(idx[lb == d])) for d in range(k))
    return out / B
print("B. cluster-wise Jaccard stability:", {k: np.round(jaccard_stability(Z, k), 3).tolist() for k in [2, 3]})

for nc in [10, 50]:
    P = PCA(nc, random_state=SEED).fit_transform(REPS["esm2"])
    best = max(adjusted_rand_score(tm, KMeans(n_clusters=k, n_init=10, random_state=SEED).fit_predict(P)) for k in range(2, 9))
    print(f"C. ESM-2 -> PCA {nc}: best ARI with membrane label over k 2-8 = {best:.3f}")"""),
("teach", """Expected results (seeded). Extension A: on the two principal components the GMM BIC is lowest at two
components (5,416 against 5,435 at three), agreeing with k-means; HDBSCAN finds 2 clusters and labels 201 tumours as
noise. Extension B: at k = 2 both clusters are very stable (mean Jaccard 0.98 and 0.96); at k = 3 they range from 0.89
to 0.97, so the third cluster is carved out less reproducibly. Extension C: reducing ESM-2 to 10 principal components
raises the best membrane ARI from 0.052 to 0.101 (50 components: 0.074), still well below the classical descriptors'
0.221. Discussion: "what counts as a cluster" differs between methods; agreement across methods is evidence, not proof."""),
    ]


INSTRUCTOR_INTRO = f"""> **Instructor overview.**
> * **Timing.** Task 1 10 min, 2 15, 3 15, 4 10, 5 15, 6 15, 7 25 (protect it), 8 15, 9 10. If short of time, demonstrate
>   Tasks 5 and 6 from the website (Exercises 3 and 4) and take Task 9 as a class discussion.
> * **Results to expect.** k = 2 is best supported on WDBC (silhouette {f3(SW[2]['silhouette'])}, stability {f3(ST['2']['mean_ari'])},
>   ARI with diagnosis {f3(SW[2]['ari'])}); single linkage isolates two outliers; a simulated batch of 1.25 SD or more
>   replaces the biology; centring fails under confounding; ESM-2 clusters do not follow the Week 7 labels.
> * **Common mistakes.** Comparing silhouettes across scalings (Task 2); computing b(i) as distance to the other
>   centroid (Task 1); peeking at the diagnosis before choosing k (Task 3); calling DBSCAN noise "outliers to delete"
>   (Task 5); concluding "batch correction works" from the random design only (Task 7); computing the silhouette on raw
>   data after clustering standardised data.
> * **Troubleshooting.** (1) `HDBSCAN` needs scikit-learn ≥ 1.3; the extension skips it otherwise. (2) In Colab the protein
>   files download from the course website; if the network is blocked, upload the two files in `data/` to the session.
>   (3) Numbers in the third decimal can differ slightly across scikit-learn versions (k-means initialisation); these
>   were produced with scikit-learn {N.get('sklearn_version', '1.9.1')}. (4) If a student's stability numbers differ, check
>   that one generator is created once and k runs 2 to 6 in order.
> * **Runtime.** About 40 seconds for the complete solutions on a laptop; Task 4 and Extension B dominate."""


CHECK = """import json, math
_N = json.load(open("../../../data/scripts/week09_numbers.json"))
def _eq(a, b, tol=6e-4):
    assert math.isclose(float(a), float(b), abs_tol=tol), (a, b)
_W = _N["wdbc"]
for _r in _W["sweep"]:
    _eq(sweep.loc[_r["k"], "WCSS"], _r["inertia"], 0.05)
    if _r["k"] > 1:
        _eq(sweep.loc[_r["k"], "silhouette"], _r["silhouette"]); assert sweep.loc[_r["k"], "sizes"] == _r["sizes"]
for _k in range(2, 7):
    _eq(stab[_k].mean(), _W["stability_bootstrap"]["by_k"][str(_k)]["mean_ari"]); _eq(stab[_k].min(), _W["stability_bootstrap"]["by_k"][str(_k)]["min_ari"])
for _m, _lab in link_res.items():
    _eq(silhouette_score(Z, _lab), _W["hierarchical"][_m]["k2"]["silhouette"]); _eq(adjusted_rand_score(y, _lab), _W["hierarchical"][_m]["k2"]["ari"])
for _r in _W["dbscan_30d"]["sweep"]:
    assert db30.loc[_r["eps"], "noise"] == _r["noise"] and db30.loc[_r["eps"], "clusters"] == _r["clusters"], _r
for _r in _W["dbscan_pca2"]["sweep"]:
    assert db2.loc[_r["eps"], "noise"] == _r["noise"] and db2.loc[_r["eps"], "clusters"] == _r["clusters"], _r
_B = _W["batch"]
for _r in _B["random_by_shift"]:
    _eq(bsweep.loc[_r["shift"], "ARI diagnosis"], _r["ari_diagnosis"]); _eq(bsweep.loc[_r["shift"], "ARI batch"], _r["ari_batch"])
    _eq(bsweep.loc[_r["shift"], "silhouette"], _r["silhouette"])
for _nm, _key in [("random, centred", "random_corrected"), ("confounded", "confounded"), ("confounded, centred", "confounded_corrected")]:
    _eq(scen.loc[_nm, "ARI diagnosis"], _B[_key]["ari_diagnosis"]); _eq(scen.loc[_nm, "ARI batch"], _B[_key]["ari_batch"])
for _rn, _rows in _N["proteins"]["reps"].items():
    for _r in _rows:
        _eq(ptab.loc[(_rn, _r["k"]), "ARI SP"], _r["ari_sp"]); _eq(ptab.loc[(_rn, _r["k"]), "ARI TM"], _r["ari_tm"])
        _eq(ptab.loc[(_rn, _r["k"]), "eta2 length"], _r["eta2_loglen"])
_eq(s3, _N["worked"]["silhouette_each"][2]); _eq(sv.mean(), _N["worked"]["silhouette_mean"])
print("CHECK PASSED: solutions agree with week09_numbers.json")
"""


def build(solutions):
    nb = nbformat.v4.new_notebook()
    nb.metadata["kernelspec"] = {"display_name": "Python 3", "language": "python", "name": "python3"}
    out = []
    for c in cells():
        kind = c[0]
        if kind == "md":
            out.append(nbformat.v4.new_markdown_cell(c[1]))
        elif kind == "code":
            out.append(nbformat.v4.new_code_cell(c[1]))
        elif kind == "task":
            out.append(nbformat.v4.new_code_cell(c[2] if solutions else c[1]))
        elif kind == "answer":
            out.append(nbformat.v4.new_markdown_cell("**Worked answer.**\n\n" + c[1] if solutions else STUDENT_TEXT))
        elif kind == "teach":
            if solutions:
                out.append(nbformat.v4.new_markdown_cell("> **Instructor notes.** " + c[1]))
    if solutions:
        first = out[0].source.replace("# COMP9085 Week 9 Laboratory", "# COMP9085 Week 9 Lab — Instructor solution", 1)
        old = ("**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**), with every\n"
               "question answered in the markdown cells.")
        assert old in first
        first = first.replace(old,
            "**About this notebook.** Complete code, outputs, plots and worked answers for every task, plus\n"
            "**instructor notes** (timing, common mistakes, troubleshooting, discussion points). Every number in a worked\n"
            "answer was checked against `data/scripts/week09_numbers.json` when the notebook was built.\n"
            "**Instructor only:** do not distribute with the student files; the `solutions/` folder is gitignored.")
        out[0].source = first
        out.insert(1, nbformat.v4.new_markdown_cell(INSTRUCTOR_INTRO))
    nb.cells = out
    return nb


def html(nb, path):
    body, _ = HTMLExporter().from_notebook_node(nb)
    with open(path, "w") as f:
        f.write(body)


def execute(nb, where=OUT):
    ExecutePreprocessor(timeout=1800, kernel_name="python3").preprocess(nb, {"metadata": {"path": where}})


def main():
    os.makedirs(SOL, exist_ok=True)
    student = build(False)
    for c in student.cells:
        assert "Worked answer" not in c.source and "Instructor" not in c.source
    nbformat.write(student, os.path.join(OUT, "COMP9085_Week09_Lab.ipynb"))
    html(student, os.path.join(OUT, "COMP9085_Week09_Lab.html"))
    trial = copy.deepcopy(student)
    execute(trial)
    errors = [o for c in trial.cells if c.cell_type == "code" for o in c.outputs if o.output_type == "error"]
    assert not errors, errors
    print(f"student notebook (unfilled, {len(student.cells)} cells) executed without errors")

    sol = build(True)
    sol.cells.append(nbformat.v4.new_code_cell(CHECK))
    execute(sol, SOL)
    assert "CHECK PASSED" in "".join(o.get("text", "") for o in sol.cells[-1].outputs), sol.cells[-1].outputs
    sol.cells = sol.cells[:-1]
    errors = [o for c in sol.cells if c.cell_type == "code" for o in c.outputs if o.output_type == "error"]
    assert not errors, errors
    nbformat.write(sol, os.path.join(SOL, "COMP9085_Week09_Lab_Solutions.ipynb"))
    html(sol, os.path.join(SOL, "COMP9085_Week09_Lab_Solutions.html"))
    print(f"solutions ({len(sol.cells)} cells) executed, CHECK PASSED; written to", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
