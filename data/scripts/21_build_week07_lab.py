#!/usr/bin/env python3
"""
Week 7 lab (refreshed 2026/27, taught after Week 8): build the student notebook and the
instructor solutions notebook from ONE source, so the two cannot drift apart.

Supersedes 16_build_week07_lab.py (the 2026-11-01 lab: WDBC PCA plus a logistic-regression
probe). That lab is archived, unchanged, in Week7/COMP9085_Week07_Refreshed/archive/.

Outputs
    labs/week07/COMP9085_Week07_Lab.ipynb                         public, no answers
    labs/week07/COMP9085_Week07_Lab.html                          public, rendered
    labs/week07/solutions/COMP9085_Week07_Lab_Solutions.ipynb     instructor (gitignored)
    labs/week07/solutions/COMP9085_Week07_Lab_Solutions.html      instructor (gitignored)

Data: the frozen, validated files in labs/week07/data/ (no network). Both notebooks are
EXECUTED here in a fresh kernel:
  * the student notebook, unfilled, must run top to bottom without an error;
  * the solutions must run without an error, and a check cell (run, then removed before
    saving) asserts that their outputs agree with data/scripts/week07r_numbers.json, the
    source the lecture and the website quote.

    python3 data/scripts/20_build_week07_refresh.py   # first, if the numbers changed
    python3 data/scripts/21_build_week07_lab.py       # needs nbformat, nbconvert, ipykernel, umap-learn
"""
import copy
import json
import os

import nbformat
from nbconvert import HTMLExporter
from nbconvert.preprocessors import ExecutePreprocessor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "labs", "week07")
SOL = os.path.join(OUT, "solutions")
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week07r_numbers.json")))
OLD = json.load(open(os.path.join(ROOT, "data", "scripts", "week07_numbers.json")))
K, NB, SH, TR, PC, D = N["knn"], N["neighbourhoods"], N["shuffle"], N["trustworthiness"], N["pca"], N["data"]
KS, KT = K["signal_peptide"], K["transmembrane"]
EX = N["example"]

STUDENT_TEXT = "*Your answer here.*"


def f3(x):
    return f"{x:.3f}"


def pct(x, d=0):
    return f"{100 * x:.{d}f}%"


def best(task, rep):
    b = K[task][rep]["best"]
    return (f"k = {b['k']}, {b['metric']}, {b['weights']}, "
            f"{'standardised' if b['scale'] == 'standard' else 'unscaled'}")


def cells():
    bs = KS["bootstrap"]["esm2_minus_classical"]
    bt = KT["bootstrap"]["esm2_minus_classical"]
    tS = {r: KS[r]["best"]["test"] for r in ["composition", "classical", "esm2", "esm2_shuffled"]}
    tT = {r: KT[r]["best"]["test"] for r in ["composition", "classical", "esm2", "esm2_shuffled"]}
    ov = NB["overlap_with_esm2"]
    la = NB["label_agreement"]
    hp = N["homology_proxy"]
    R = N["reduced_knn"]
    return [
("md", f"""# COMP9085 Week 7 Laboratory
## Protein representations, dimensionality reduction and k-NN: classical features versus ESM-2

**Two hours.** Last session you built k-NN and found that everything depends on the space in
which "nearest" is measured. Today you build three kinds of space for the same 2,000 real human
proteins (hand-made descriptors, a pretrained protein language-model embedding, and reduced
versions of both) and find out, with a controlled experiment, which one gives k-NN the more
useful neighbours, for which biological question, and why.

**The data.** {N['data']['all']['n']:,} reviewed human proteins from **UniProtKB/Swiss-Prot**
(release {N['provenance']['uniprot_release']}), one per UniRef50 cluster, 50–1,000 residues. Two
labels from UniProt keywords: **signal peptide** (KW-0732; {D['all']['sp']} proteins) and
**transmembrane** (KW-0812; {D['all']['tm']}). Each protein also has an **ESM-2 embedding**
(`{N['provenance']['model']}`, 8 million parameters, 320 numbers), computed once by the module
team from the real sequence and from a residue-shuffled copy. Everything is in `data/`:
`data/README.md` documents every column and `data/PROVENANCE.json` the source, the model
version and checksums. **No network, GPU or deep-learning package is needed.**

**The question.** If k-NN predicts a protein's annotation from its nearest neighbours, does it
find better neighbours among proteins with similar *composition and hydropathy*, or among
proteins with similar *ESM-2 embeddings*? And what happens to the neighbours when we reduce
dimension with PCA, t-SNE or UMAP?

**By the end of this lab you should be able to**
1. explore a real protein dataset and say where its labels come from and how reliable they are;
2. compute classical sequence descriptors and say what each can and cannot see;
3. apply PCA correctly and interpret the spectrum, the loadings and the effect of scaling;
4. run and read t-SNE and UMAP, and measure how faithful a 2-D map is;
5. use pretrained ESM-2 embeddings in a downstream k-NN task, with preprocessing in the folds;
6. compare two representations fairly, select hyperparameters by cross-validation, evaluate once,
   and interpret the difference with its uncertainty and its biological limits.

**Time plan.** Tasks 1–2 about 20 min · Tasks 3–5 about 35 min · Task 6 about 30 min ·
Tasks 7–9 about 35 min. **Tasks 1–9 are the core lab.** Four optional extensions follow.

**How the cells work.** Cells marked *provided* run as they are: read them, then run them.
Cells containing `# your code here` are yours; nothing later depends on them, so the notebook
still runs if you skip one. Some tasks ask you to **predict** first: write the prediction
down before running anything. Markdown cells marked *Your answer here* are for written
answers, using your own numbers.

**Rules for the whole lab.** The proteins are split once, in a provided cell, into 1,500
training and 500 test proteins (the Week 7 split). Every choice is made with 5-fold
cross-validation on the training proteins. The test set is used **once**, in Task 6. Anything
that learns from data (scaler, PCA) sits inside a `Pipeline`, so it is refitted in every fold.

**The Week 7 page is your interactive companion**
(https://hafli.github.io/comp9085-ml-biology/weeks/week07.html). Its section 11 maps each task
to the exercise that shows the same idea with the same numbers.

**Practice, not assessment.** This lab is not part of Assignment 1 and uses different data.

**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**), with every
question answered in the markdown cells."""),
("md", "### Setup (provided)\n\nRun this cell first. `umap-learn` is optional: if it is not installed, the UMAP cells are skipped (`pip install umap-learn` to add it)."),
("code", """import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.decomposition import PCA
from sklearn.manifold import TSNE, trustworthiness
from sklearn.metrics import (roc_auc_score, average_precision_score, confusion_matrix,
                             ConfusionMatrixDisplay, precision_score, recall_score, f1_score)
from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV, cross_val_score
from sklearn.neighbors import KNeighborsClassifier, NearestNeighbors
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

import sklearn
try:
    import umap
    HAVE_UMAP = True
except ImportError:
    HAVE_UMAP = False
print("scikit-learn", sklearn.__version__, "| pandas", pd.__version__, "| numpy", np.__version__,
      "| umap-learn", umap.__version__ if HAVE_UMAP else "not installed")

warnings.filterwarnings("ignore")
SEED = 42
DATA = Path("data")
plt.rcParams["figure.dpi"] = 90"""),

# ------------------------------------------------------------------ Task 1
("md", """## Task 1. Explore the protein dataset (about 15 minutes)

Start with the data, not the model. Load the proteins and the two embedding files (provided)."""),
("code", """# provided
prot = pd.read_csv(DATA / "swissprot_human_2000.csv")
emb = pd.read_csv(DATA / "esm2_t6_8M_embeddings.csv.gz").set_index("accession")
emb_shuf = pd.read_csv(DATA / "esm2_t6_8M_embeddings_shuffled.csv.gz").set_index("accession")
print("proteins:", prot.shape, "| embeddings:", emb.shape, "| shuffled-sequence embeddings:", emb_shuf.shape)
prot.drop(columns=["sequence", "shuffled_sequence"]).head()"""),
("md", """**1a.** Describe the data with code: the distribution of sequence `length` (summary and a
histogram, split by each label), the missing values in every column, how many proteins carry
each label and how many carry both (`pd.crosstab`), and whether any sequence appears twice."""),
("task",
"""# your code here
""",
"""print(prot["length"].describe().round(1))
print("\\nmissing values:\\n", prot.isna().sum()[prot.isna().sum() > 0])
print("\\nduplicate sequences:", prot["sequence"].duplicated().sum(),
      "| duplicate UniRef50 clusters:", prot["uniref50"].duplicated().sum())
print(pd.crosstab(prot["has_signal_peptide"], prot["is_transmembrane"], margins=True))
fig, axes = plt.subplots(1, 2, figsize=(11, 3.4))
for ax, col, name in zip(axes, ["has_signal_peptide", "is_transmembrane"], ["signal peptide", "transmembrane"]):
    for v, c in [(0, "tab:blue"), (1, "tab:orange")]:
        ax.hist(prot.loc[prot[col] == v, "length"], bins=40, alpha=0.55, density=True, color=c,
                label=f"{name}: {'yes' if v else 'no'}")
    ax.set_xlabel("length (residues)"); ax.set_ylabel("density"); ax.legend()
plt.tight_layout(); plt.show()"""),
("md", """**1b.** Where do the labels come from? The provided cell counts the strongest evidence code
behind each annotation (see `data/README.md`)."""),
("code", """# provided
sp = prot["has_signal_peptide"].values
tm = prot["is_transmembrane"].values
print("signal-peptide labels by evidence:\\n", prot.loc[sp == 1, "sp_evidence"].value_counts(), "\\n")
print("transmembrane labels by evidence:\\n", prot.loc[tm == 1, "tm_evidence"].value_counts())"""),
("md", """**1c. The split (provided).** One stratified 75/25 split on both labels together, seed 42:
the same split as the Week 7 lecture and website. Every model in this lab uses these indices."""),
("code", """# provided
idx = np.arange(len(prot))
train_idx, test_idx = train_test_split(idx, test_size=0.25, stratify=2 * tm + sp, random_state=SEED)
CV = StratifiedKFold(5, shuffle=True, random_state=SEED)
pd.DataFrame({"train": [len(train_idx), sp[train_idx].sum(), tm[train_idx].sum()],
              "test": [len(test_idx), sp[test_idx].sum(), tm[test_idx].sum()]},
             index=["proteins", "signal peptide", "transmembrane"])"""),
("md", """**Question 1.** (a) What fraction of proteins carry each label, and what does that imply for
accuracy as a metric? (b) Most labels come from "sequence analysis". What does that mean, and
why might it matter when the *inputs* to our models are also computed from the sequence?
(c) A protein with `has_signal_peptide = 0`: has it been shown to lack a signal peptide?"""),
("answer", f"""(a) {pct(D['all']['sp'] / D['all']['n'], 1)} have a signal peptide and {pct(D['all']['tm'] / D['all']['n'], 1)}
are transmembrane ({D['all']['both']} both). A model that always says "no" would be
{pct(1 - D['all']['sp'] / D['all']['n'], 1)} accurate for signal peptides, so accuracy hides
whether positives are found: use ROC AUC and average precision, and look at recall.
(b) {D['sp_evidence']['sequence analysis']} of {D['all']['sp']} signal-peptide and
{D['tm_evidence']['sequence analysis']} of {D['all']['tm']} transmembrane annotations carry ECO:0000255,
"sequence analysis": they were *predicted* by tools such as SignalP, Phobius or TMHMM and checked
by curators, not observed experimentally (only {D['sp_evidence']['experimental']} and
{D['tm_evidence']['experimental']} are experimental). A model that learns from the sequence may
partly re-learn those tools' rules, so a high score can be partly circular.
(c) No. It means UniProt has no annotation. Most negatives are probably true negatives for
these well-studied features in reviewed entries, but the labels are "annotated / not annotated",
not "present / absent". The only missing values are {N['integrity']['missing_values'].get('gene', 0)} gene
names; there are no duplicate sequences, and every protein is from a different UniRef50 cluster."""),
("teach", """About 15 minutes for Task 1. Students often skip 1b; insist on it, because
it is the basis of the limitations discussion in Task 9. If someone asks why the length
histograms barely differ between classes: that is the point; length alone is a weak feature
(the original Week 7 probe found length-only ROC AUC near 0.5)."""),

# ------------------------------------------------------------------ Task 2
("md", """## Task 2. Classical protein descriptors (about 10 minutes)

The simplest fixed-length description of a protein is its **amino-acid composition**: the
fraction of each of the 20 residues. It ignores order completely. We add three more descriptors:
**log length**, and two summaries of the **Kyte–Doolittle hydropathy** scale (Kyte and Doolittle,
1982): the highest mean hydropathy over any 19-residue window (a membrane-spanning helix is about
that long and strongly hydrophobic) and the mean hydropathy of the first 25 residues (where a
signal peptide's hydrophobic core sits). Unlike composition, the last two depend on *where*
residues are.

**2a.** Using the scale `KD` below, write `max_hydropathy(seq, w=19)` and
`nterm_hydropathy(seq, n=25)`, and compute both for the first protein."""),
("code", """# provided: the Kyte-Doolittle hydropathy scale (J Mol Biol 1982;157:105-132)
KD = {"A": 1.8, "R": -4.5, "N": -3.5, "D": -3.5, "C": 2.5, "Q": -3.5, "E": -3.5, "G": -0.4, "H": -3.2,
      "I": 4.5, "L": 3.8, "K": -3.9, "M": 1.9, "F": 2.8, "P": -1.6, "S": -0.8, "T": -0.7, "W": -0.9,
      "Y": -1.3, "V": 4.2}
AA = "ACDEFGHIKLMNPQRSTVWY\""""),
("task",
"""# your code here
""",
"""def my_max_hydropathy(seq, w=19):
    h = np.array([KD[a] for a in seq])
    return np.convolve(h, np.ones(w) / w, mode="valid").max()

def my_nterm_hydropathy(seq, n=25):
    return np.mean([KD[a] for a in seq[:n]])

q = prot["sequence"][0]
print(prot["protein_name"][0][:60], "| length", len(q))
print("max 19-residue hydropathy %.3f | N-terminal hydropathy %.3f" % (my_max_hydropathy(q), my_nterm_hydropathy(q)))"""),
("md", """**2b. The feature matrices (provided).** The module's reference implementation builds the
23 classical descriptors for every protein (and for the shuffled sequences, used in Task 8). Check
that your two functions agree with columns 21 and 22 for the first protein."""),
("code", """# provided
FEATURES = [f"frac_{a}" for a in AA] + ["log_length", "max_hydropathy_19", "nterm_hydropathy_25"]

def classical_features(seqs, w=19, n=25):
    rows = []
    for q in seqs:
        h = np.array([KD[a] for a in q])
        rows.append([q.count(a) / len(q) for a in AA] +
                    [np.log(len(q)), np.convolve(h, np.ones(w) / w, mode="valid").max(), h[:n].mean()])
    return np.array(rows)

X_classical = classical_features(prot["sequence"])
X_classical_shuf = classical_features(prot["shuffled_sequence"])
X_comp = X_classical[:, :20]                      # composition only
print(X_classical.shape, "| first protein:", np.round(X_classical[0, 20:], 3))
pd.DataFrame(X_classical, columns=FEATURES).describe().T.round(3).iloc[[0, 9, 13, 20, 21, 22]]"""),
("md", """**Question 2.** Which of the 23 descriptors are blind to residue order, and which are not?
Name one biological property of a protein that none of them can capture."""),
("answer", """The 20 composition fractions and the length are identical for any permutation of the
same residues: they are blind to order. The two hydropathy summaries are not: a hydrophobic
stretch of 19 residues gives a high window maximum only if those residues are adjacent, and the
N-terminal mean looks only at the first 25 positions. None of the 23 captures, for example,
which domains a protein contains, the spacing of motifs (a catalytic triad, a glycosylation
site), secondary structure, or interactions between distant residues brought together by the
fold. They describe *how much* of each residue, and *where the most hydrophobic stretch is*,
nothing more."""),

# ------------------------------------------------------------------ Task 3
("md", """## Task 3. PCA on the classical descriptors (about 15 minutes)

PCA finds orthogonal directions of greatest variance. It uses no labels, so here we fit it on
all 2,000 proteins to *describe* the data (when PCA feeds a model, it goes inside the Pipeline:
Extension A).

**Predict first:** without standardising, which descriptors will dominate PC1, and why?

**3a.** Standardise `X_classical` and fit `PCA()`. Report PC1's and PC2's share of the variance
and the number of components needed for 90%. Plot the explained-variance ratio and the
cumulative curve.

**3b.** Plot PC1 against PC2, coloured by signal peptide and, separately, by transmembrane.
List the six largest PC1 loadings (with sign).

**3c.** Repeat PCA *without* standardising. What share does PC1 take now, and which features
dominate it?"""),
("task",
"""# your code here
""",
"""Z_cl = StandardScaler().fit_transform(X_classical)
pca_cl = PCA(random_state=SEED).fit(Z_cl)
evr = pca_cl.explained_variance_ratio_
k90 = int(np.searchsorted(evr.cumsum(), 0.90) + 1)
print("PC1 %.3f | PC2 %.3f | components for 90%%: %d of %d" % (evr[0], evr[1], k90, len(evr)))

fig, axes = plt.subplots(1, 3, figsize=(15, 3.8))
axes[0].bar(range(1, 24), evr, color="tab:blue"); axes[0].plot(range(1, 24), evr.cumsum(), "o-", color="tab:orange")
axes[0].axhline(0.9, ls="--", c="grey"); axes[0].set_xlabel("component"); axes[0].set_title("explained variance (standardised)")
P_cl = pca_cl.transform(Z_cl)[:, :2]
for ax, lab, name in [(axes[1], sp, "signal peptide"), (axes[2], tm, "transmembrane")]:
    ax.scatter(*P_cl[lab == 0].T, s=4, alpha=0.3, label="not annotated")
    ax.scatter(*P_cl[lab == 1].T, s=6, alpha=0.7, label=name)
    ax.set_xlabel("PC1"); ax.set_ylabel("PC2"); ax.legend(markerscale=3)
plt.tight_layout(); plt.show()

load1 = pd.Series(pca_cl.components_[0], index=FEATURES)
print("PC1 loadings:\\n", load1.reindex(load1.abs().sort_values(ascending=False).index)[:6].round(3))

pca_raw = PCA(random_state=SEED).fit(X_classical)
lr = pd.Series(pca_raw.components_[0], index=FEATURES)
print("\\nunscaled: PC1 %.3f, components for 90%%: %d" % (pca_raw.explained_variance_ratio_[0],
      np.searchsorted(pca_raw.explained_variance_ratio_.cumsum(), 0.9) + 1))
print(lr.reindex(lr.abs().sort_values(ascending=False).index)[:3].round(3))"""),
("md", """**Question 3.** (a) Is the standardised spectrum steep or flat, and what does that say about
redundancy among the descriptors? (b) What biological contrast does PC1 express? (c) Explain the
unscaled result: is it telling you about the proteins or about the units?"""),
("answer", f"""(a) Flat: PC1 carries {pct(PC['classical|standard']['pc1'], 1)} and PC2
{pct(PC['classical|standard']['pc2'], 1)}, and {PC['classical|standard']['k90']} of 23 components are
needed for 90%. The descriptors are not very redundant, so no 2-D picture can show most of
their variation.
(b) PC1 loads positively on isoleucine, phenylalanine, the hydropathy peak and valine and
negatively on arginine and proline ({', '.join(f"{a} {b:+.2f}" for a, b in PC['classical|standard']['pc1_top'])};
the sign of a component is arbitrary): a hydrophobic, membrane-like axis against charged,
proline-rich composition. In the PC1–PC2 plot the transmembrane proteins sit towards the
hydrophobic end; signal-peptide proteins are much less separated.
(c) Unscaled, PC1 takes {pct(PC['classical|none']['pc1'], 1)} and {PC['classical|none']['k90']}
components reach 90%. PC1 is essentially the two hydropathy summaries
({', '.join(f"{a} {b:+.2f}" for a, b in PC['classical|none']['pc1_top'][:2])}), because they and log
length vary by whole units while composition fractions vary by hundredths. That is a statement
about units, not biology: exactly the Week 8 lesson that unscaled distances (and variances) are
dominated by the feature with the largest numbers."""),
("teach", """A common mistake is to report the unscaled "3 components explain 90%" as
evidence that the descriptors are low-dimensional. Ask them to compute each feature's variance
(np.var(X_classical, 0)): the three non-composition features carry more than 99% of it."""),

# ------------------------------------------------------------------ Task 4
("md", """## Task 4. t-SNE and UMAP (about 15 minutes)

t-SNE and UMAP place points in 2-D so that near neighbours stay near. They are stochastic and
have settings that change the picture. **Trustworthiness** (between 0 and 1) measures how many
of each point's nearest neighbours in the 2-D map are true neighbours in the original space.

**Predict first:** will a 2-D t-SNE map keep a protein's true neighbours better or worse than
the first two principal components?

**4a. (provided)** The cell computes t-SNE with perplexity 5 and 50, and UMAP with
`n_neighbors` 5 and 50, on the standardised classical descriptors (about 30 seconds).

**4b.** Plot the four maps and the PCA map side by side, coloured by transmembrane, and compute
the trustworthiness (`n_neighbors=10`) of each against `Z_cl`."""),
("code", """# provided
Z_cl = StandardScaler().fit_transform(X_classical)
maps_cl = {"PCA": PCA(n_components=2, random_state=SEED).fit_transform(Z_cl)}
for perp in [5, 50]:
    maps_cl[f"t-SNE, perplexity {perp}"] = TSNE(perplexity=perp, init="pca", random_state=0).fit_transform(Z_cl)
if HAVE_UMAP:
    for nn in [5, 50]:
        maps_cl[f"UMAP, n_neighbors {nn}"] = umap.UMAP(n_neighbors=nn, min_dist=0.1, random_state=0,
                                                       n_jobs=1).fit_transform(Z_cl)
print(list(maps_cl))"""),
("task",
"""# your code here
""",
"""trust_cl = {}
fig, axes = plt.subplots(1, len(maps_cl), figsize=(4 * len(maps_cl), 3.8))
for ax, (name, P) in zip(axes, maps_cl.items()):
    trust_cl[name] = trustworthiness(Z_cl, P, n_neighbors=10)
    ax.scatter(*P[tm == 0].T, s=3, alpha=0.3); ax.scatter(*P[tm == 1].T, s=5, alpha=0.7, c="tab:orange")
    ax.set_title(f"{name}\\ntrustworthiness {trust_cl[name]:.3f}", fontsize=10); ax.set_xticks([]); ax.set_yticks([])
plt.tight_layout(); plt.show()
pd.Series(trust_cl).round(3)"""),
("md", """**Question 4.** (a) Which map keeps neighbours best, and how does perplexity (or
`n_neighbors`) change the picture? (b) Three things you **cannot** read from a t-SNE or UMAP map.
(c) If transmembrane proteins form a visible group, does that show the descriptors "understand"
membrane proteins?"""),
("answer", f"""(a) Trustworthiness: PCA {f3(TR['classical|pca'])}; t-SNE perplexity 5
{f3(TR['classical|tsne|5|0'])}, perplexity 50 {f3(TR['classical|tsne|50|0'])}; UMAP n_neighbors 5
{f3(TR['classical|umap|5|0.1|0'])}, 50 {f3(TR['classical|umap|50|0.1|0'])}. Both neighbour-embedding
methods keep local neighbours far better than two principal components. Low perplexity or
`n_neighbors` breaks the map into many small clumps; high values show broader structure.
(b) The size of a cluster, the distance between clusters, and the position of a cluster on the
page (also: density, and the "emptiness" between groups). Change the seed or the setting and
these change while local neighbourhoods survive.
(c) No. The map was computed without labels, and the transmembrane proteins group because the
hydropathy-peak descriptor and hydrophobic composition put them near each other. That is
evidence that the descriptors *separate* the annotation, which is useful; it is not evidence of
a mechanism, and a classifier with a held-out test set is needed to measure it."""),

# ------------------------------------------------------------------ Task 5
("md", """## Task 5. The ESM-2 embeddings (about 10 minutes)

ESM-2 is a protein language model pretrained to predict masked residues from the rest of the
sequence (no annotations are used). The module team ran the 8-million-parameter model
(`facebook/esm2_t6_8M_UR50D`, pinned revision; see `data/PROVENANCE.json`) on every sequence
and **mean-pooled** the final layer over residue positions: one 320-number vector per protein,
whatever its length.

**5a. (provided)** Put the embeddings in the same row order as `prot` and check integrity."""),
("code", """# provided
E = emb.loc[prot["accession"]].values
E_shuf = emb_shuf.loc[prot["accession"]].values
print("shape", E.shape, "| non-finite values", (~np.isfinite(E)).sum(),
      "| accessions match", set(emb.index) == set(prot["accession"]),
      "| identical real and shuffled rows", int((np.abs(E - E_shuf).sum(1) == 0).sum()))"""),
("md", """**5b.** (i) Anisotropy: compute the mean cosine similarity between all pairs of raw
embeddings, then after subtracting the mean vector. (ii) Standardise `E`, fit `PCA()`, and
report how many components are needed for 90% of the variance. (iii) Plot PC1 against PC2 and
(if UMAP is available) a UMAP (`n_neighbors=15, min_dist=0.1, random_state=0`) coloured by signal
peptide, with the trustworthiness of each."""),
("task",
"""# your code here
""",
"""def mean_cosine(M):
    U = M / np.linalg.norm(M, axis=1, keepdims=True)
    S = U @ U.T
    return (S.sum() - len(M)) / (len(M) * (len(M) - 1))

print("mean cosine: raw %.3f | centred %.3f" % (mean_cosine(E), mean_cosine(E - E.mean(0))))
Z_e = StandardScaler().fit_transform(E)
pca_e = PCA(random_state=SEED).fit(Z_e)
k90_e = int(np.searchsorted(pca_e.explained_variance_ratio_.cumsum(), 0.90) + 1)
print("ESM-2 standardised: PC1 %.3f, components for 90%%: %d of 320" % (pca_e.explained_variance_ratio_[0], k90_e))

maps_e = {"PCA": pca_e.transform(Z_e)[:, :2]}
if HAVE_UMAP:
    maps_e["UMAP"] = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=0, n_jobs=1).fit_transform(Z_e)
fig, axes = plt.subplots(1, len(maps_e), figsize=(5 * len(maps_e), 4))
for ax, (name, P) in zip(np.atleast_1d(axes), maps_e.items()):
    t = trustworthiness(Z_e, P, n_neighbors=10)
    ax.scatter(*P[sp == 0].T, s=3, alpha=0.3); ax.scatter(*P[sp == 1].T, s=5, alpha=0.7, c="tab:orange")
    ax.set_title(f"ESM-2, {name}: trustworthiness {t:.3f}", fontsize=10); ax.set_xticks([]); ax.set_yticks([])
plt.tight_layout(); plt.show()"""),
("md", """**Question 5.** (a) What does a mean raw cosine near 1 mean for cosine-based nearest
neighbours, and what is the fix? (b) The embeddings were computed for all 2,000 proteins
*before* the train/test split. Why is that not leakage, when fitting a `StandardScaler` on all
2,000 would be? (c) Compare the ESM-2 spectrum with the classical one (Task 3)."""),
("answer", f"""(a) The raw mean cosine is {OLD['geometry']['mean_cosine_raw']:.2f}: every embedding
points in nearly the same direction (anisotropy), so cosine similarities are squeezed together
and the shared direction dominates. Subtracting the mean vector (centring, here
{OLD['geometry']['mean_cosine_centred']:.3f}) or standardising removes it; the scaler must be fitted
on training rows only, so it goes in the Pipeline.
(b) The embedding is a fixed function of each sequence, chosen before seeing our data and never
given our labels, like computing composition. Nothing about the test proteins' labels, or about
the training set as a whole, enters any test protein's vector. A scaler fitted on all rows
*learns* means and SDs from the test proteins, so it is a model fitted on test data. (A
different, real limitation: ESM-2 was pretrained on UniRef sequences that probably include these
proteins. That is pretraining exposure, discussed in Task 9.)
(c) ESM-2 needs {PC['esm2|standard']['k90']} of 320 standardised components for 90% (classical:
{PC['classical|standard']['k90']} of 23). Its information is spread over many directions, so a 2-D
view of it (trustworthiness {f3(TR['esm2|pca'])} for PCA, {f3(TR['esm2|umap|15|0.1|0'])} for UMAP)
shows only part of it. Signal-peptide proteins concentrate in one region of the map but overlap
others heavily."""),

# ------------------------------------------------------------------ Task 6
("md", """## Task 6. The key experiment: k-NN on classical descriptors versus ESM-2 (about 30 minutes)

You have studied k-NN, distance metrics and scaling. Now use them to compare two representations
**fairly**. Everything is held fixed except the representation:

| Held fixed | Value |
|---|---|
| Proteins and labels | the same 2,000; the same target |
| Split | `train_idx` / `test_idx` from Task 1 (1,500 / 500) |
| Model selection | 5-fold stratified CV on training proteins only (`CV`), mean ROC AUC |
| Pipeline | optional `StandardScaler` → `KNeighborsClassifier`, refitted in every fold |
| Grid | k in `K_GRID` × metric {euclidean, manhattan, cosine} × weights {uniform, distance} × scaling {none, standardise}: 192 settings |
| Test set | used once per representation, for the selected pipeline only |

**Predict first:** for the signal-peptide task, will 320 learned dimensions beat 23 hand-made
descriptors? For the transmembrane task?

**6a.** Write the pipeline and the `GridSearchCV` for the **classical descriptors** and the
**signal-peptide** label, fitted on the training proteins only. Print `best_params_` and
`best_score_`."""),
("code", """# provided: the one grid every representation gets
K_GRID = [1, 3, 5, 7, 9, 11, 15, 21, 25, 31, 35, 41, 51, 61, 75, 101]
GRID = {"scale": ["passthrough", StandardScaler()], "knn__n_neighbors": K_GRID,
        "knn__metric": ["euclidean", "manhattan", "cosine"], "knn__weights": ["uniform", "distance"]}

def make_pipe():
    return Pipeline([("scale", StandardScaler()), ("knn", KNeighborsClassifier())])"""),
("task",
"""# your code here
""",
"""t0 = time.time()
search_cl_sp = GridSearchCV(make_pipe(), GRID, cv=CV, scoring="roc_auc", n_jobs=-1)
search_cl_sp.fit(X_classical[train_idx], sp[train_idx])
print(search_cl_sp.best_params_, "| CV ROC AUC %.4f | %.0f s" % (search_cl_sp.best_score_, time.time() - t0))"""),
("md", """**6b. (provided)** The same search for every representation and both tasks:
composition only (20), classical (23), ESM-2 (320), and ESM-2 of the shuffled sequences (the
control for Task 8). About a minute."""),
("code", """# provided
REPS = {"composition": X_comp, "classical": X_classical, "esm2": E, "esm2_shuffled": E_shuf}
TASKS = {"signal_peptide": sp, "transmembrane": tm}

def describe(p):
    return (f"k={p['knn__n_neighbors']}, {p['knn__metric']}, {p['knn__weights']}, "
            f"{'unscaled' if isinstance(p['scale'], str) else 'standardised'}")

searches, rows = {}, []
t0 = time.time()
for task, y in TASKS.items():
    for rep, M in REPS.items():
        s = GridSearchCV(make_pipe(), GRID, cv=CV, scoring="roc_auc", n_jobs=-1).fit(M[train_idx], y[train_idx])
        searches[(task, rep)] = s
        sd = s.cv_results_["std_test_score"][s.best_index_]
        rows.append({"task": task, "representation": rep, "dimensions": M.shape[1],
                     "CV ROC AUC": round(s.best_score_, 4), "CV SD": round(sd, 4), "selected": describe(s.best_params_)})
cv_table = pd.DataFrame(rows).set_index(["task", "representation"])
print("%.0f s" % (time.time() - t0))
cv_table"""),
("md", """**6c. The test set, once (provided).** Each representation's selected pipeline (refitted on
all 1,500 training proteins by `GridSearchCV`) predicts the 500 test proteins. A paired bootstrap
gives a 95% interval for the difference in test ROC AUC."""),
("code", """# provided
def bootstrap_diff(y, pa, pb, n=2000, seed=SEED):
    rng = np.random.default_rng(seed)
    d = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        if y[i].min() == y[i].max():
            continue
        d.append(roc_auc_score(y[i], pa[i]) - roc_auc_score(y[i], pb[i]))
    return roc_auc_score(y, pa) - roc_auc_score(y, pb), np.percentile(d, [2.5, 97.5])

test_rows, probs, preds = [], {}, {}
for (task, rep), s in searches.items():
    y = TASKS[task]
    probs[(task, rep)] = s.predict_proba(REPS[rep][test_idx])[:, 1]
    preds[(task, rep)] = s.predict(REPS[rep][test_idx])
    test_rows.append({"task": task, "representation": rep,
                      "ROC AUC": roc_auc_score(y[test_idx], probs[(task, rep)]),
                      "avg precision": average_precision_score(y[test_idx], probs[(task, rep)]),
                      "precision": precision_score(y[test_idx], preds[(task, rep)], zero_division=0),
                      "recall": recall_score(y[test_idx], preds[(task, rep)]),
                      "F1": f1_score(y[test_idx], preds[(task, rep)])})
test_table = pd.DataFrame(test_rows).set_index(["task", "representation"]).round(3)
display(test_table)
for task, y in TASKS.items():
    for other in ["classical", "composition"]:
        d, ci = bootstrap_diff(y[test_idx], probs[(task, "esm2")], probs[(task, other)])
        print(f"{task:15s} ESM-2 minus {other:12s}: {d:+.3f}  95% interval [{ci[0]:+.3f}, {ci[1]:+.3f}]")"""),
("md", """**6d.** Plot the four confusion matrices (classical and ESM-2, both tasks) for the test
set. For the signal-peptide task, explain why recall at scikit-learn's default threshold differs
so much between representations even where the ROC AUC is similar."""),
("task",
"""# your code here
""",
"""fig, axes = plt.subplots(1, 4, figsize=(16, 3.6))
for ax, (task, rep) in zip(axes, [("signal_peptide", "classical"), ("signal_peptide", "esm2"),
                                  ("transmembrane", "classical"), ("transmembrane", "esm2")]):
    ConfusionMatrixDisplay(confusion_matrix(TASKS[task][test_idx], preds[(task, rep)]),
                           display_labels=["no", "yes"]).plot(ax=ax, colorbar=False)
    ax.set_title(f"{task}\\n{rep}", fontsize=10)
plt.tight_layout(); plt.show()
# share of a test protein's neighbours that are positive, for the positives (neighbour purity)
for rep in ["classical", "esm2"]:
    s = searches[("signal_peptide", rep)]
    knn, scale = s.best_estimator_.named_steps["knn"], s.best_estimator_.named_steps["scale"]
    Xt = REPS[rep][test_idx]
    Xt = Xt if isinstance(scale, str) else scale.transform(Xt)
    _, nb = knn.kneighbors(Xt)
    purity = sp[train_idx][nb].mean(1)
    print(rep, "mean share of positive neighbours, test positives: %.2f" % purity[sp[test_idx] == 1].mean())"""),
("md", """**Question 6.** (a) Report, for each task, the selected settings and the test ROC AUC of
the classical and ESM-2 models, with the bootstrap interval. Which representation did better, for
which task? (b) Is the comparison fair? Name every way in which it is, and one way in which the
two representations still differ besides the information they contain. (c) Why did GridSearchCV
choose different metrics and scalings for different representations, and is that a problem?"""),
("answer", f"""(a) **Signal peptide**: classical {best('signal_peptide', 'classical')}, CV
{f3(KS['classical']['best']['cv_roc_auc'])}, test {f3(tS['classical']['roc_auc'])}; ESM-2
{best('signal_peptide', 'esm2')}, CV {f3(KS['esm2']['best']['cv_roc_auc'])}, test
{f3(tS['esm2']['roc_auc'])}. The difference, {bs['diff']:+.3f} (95% interval {bs['ci95'][0]:+.3f} to
{bs['ci95'][1]:+.3f}), is within the uncertainty: the two rank proteins about equally well. Both are
far ahead of composition alone (test {f3(tS['composition']['roc_auc'])}). At the default threshold
ESM-2 finds many more signal-peptide proteins (recall {tS['esm2']['recall']:.2f} against
{tS['classical']['recall']:.2f}; F1 {tS['esm2']['f1']:.2f} against {tS['classical']['f1']:.2f}).
**Transmembrane**: classical {best('transmembrane', 'classical')}, test {f3(tT['classical']['roc_auc'])};
ESM-2 {best('transmembrane', 'esm2')}, test {f3(tT['esm2']['roc_auc'])}; difference {bt['diff']:+.3f}
({bt['ci95'][0]:+.3f} to {bt['ci95'][1]:+.3f}): the classical descriptors are better, and the
interval excludes zero. So: no representation wins everywhere; ESM-2 does not beat descriptors
designed around the relevant biology (a hydrophobic 19-residue window is close to what defines a
membrane-spanning helix).
(b) Fair: same proteins, labels, split, folds, pipeline, grid, selection metric, refitting, and one
test look each; the scaler is refitted inside every fold. Still different: dimensionality (23
against 320: k-NN distances in 320 dimensions concentrate more), and the *origin* of the
information (ESM-2 was pretrained on millions of sequences, possibly including these; the
descriptors were designed by people who knew what signal peptides and membrane helices look
like). The comparison is between two complete recipes, not two "amounts of information".
(c) Each representation has its own geometry: raw ESM-2 vectors share a dominant direction, which
cosine on raw vectors partly ignores; unscaled classical features let the hydropathy features
dominate the distance, a feature weighting that happens to suit the membrane task. Choosing these
per representation by CV on training data only is part of the fair protocol (each gets the same
search); it would be unfair to tune one carefully and run the other at defaults. Many settings are
statistically indistinguishable ({KS['esm2']['best']['n_within_1se']} of 192 ESM-2 settings are
within one standard error of the best for signal peptides), so do not over-read the exact choice."""),
("md", """**Question 6d.** Explain the recall difference."""),
("answer", f"""With distance weighting and k around 30–40, a test protein is predicted positive only if
its positive neighbours outweigh its negative ones. Signal-peptide proteins are only
{pct(KS['prevalence_train'], 1)} of the training set, so a protein must sit in an unusually pure
neighbourhood. ESM-2 neighbourhoods of positives are purer (about {pct(la['esm2']['signal_peptide']['positives'])} of a
signal-peptide protein's 10 nearest proteins also have one, against {pct(la['classical']['signal_peptide']['positives'])}
for the classical descriptors), so more positives cross the 0.5 threshold. ROC AUC only measures
the *ranking*, which is similar. If recall matters, choose the threshold on the training data
(Extension B), not by looking at the test set."""),
("teach", """This is the heart of the lab: protect 30 minutes for it. The full grid takes about a
minute on 8 cores; on a slow laptop, set n_jobs to the number of cores or reduce K_GRID (the
selected settings may then differ slightly; the qualitative pattern does not). Common mistakes:
fitting StandardScaler on all proteins before GridSearchCV (leakage, and it changes nothing
visibly here, which is why it is dangerous); looking at the test set to choose k; comparing a
tuned ESM-2 model with an untuned classical one; reporting accuracy (about 83% for "always no"
on signal peptides). Alternative defensible choices: average precision as the selection metric
(imbalanced classes); a nested CV instead of one test split; a fixed k for both (the website
reports k = 15 for comparison)."""),

# ------------------------------------------------------------------ Task 7
("md", """## Task 7. Whose neighbours? Comparing neighbourhoods (about 10 minutes)

k-NN predicts from neighbours, so compare the neighbours themselves. For every protein, find its
10 nearest proteins (among all 2,000; standardised features, Euclidean) in several spaces.

**7a. (provided)** The helper returns each protein's 10 nearest neighbours."""),
("code", """# provided
def neighbours(M, k=10, metric="euclidean"):
    nn = NearestNeighbors(n_neighbors=k + 1, metric=metric).fit(M)
    _, idx_ = nn.kneighbors(M)
    return np.array([[j for j in row if j != i][:k] for i, row in enumerate(idx_)])

def overlap(A, B):
    return np.mean([len(set(a) & set(b)) / len(a) for a, b in zip(A, B)])

Z_e = StandardScaler().fit_transform(E)
pcs_e = PCA(random_state=SEED).fit_transform(Z_e)       # unsupervised: all proteins
nbr = {"composition": neighbours(StandardScaler().fit_transform(X_comp)),
       "classical": neighbours(StandardScaler().fit_transform(X_classical)),
       "esm2": neighbours(Z_e)}
for kc in [2, 10, 50]:
    nbr[f"esm2_pca{kc}"] = neighbours(pcs_e[:, :kc])
print({k: v.shape for k, v in nbr.items()})"""),
("md", """**7b.** (i) Make a table: for each space, the mean overlap of its neighbour sets with the
ESM-2 neighbour sets, and the mean share of a **signal-peptide** protein's neighbours that also
have a signal peptide. (ii) Print the 10 neighbours of Interleukin-12 subunit beta (P29460, a
secreted protein with an experimentally supported signal peptide) in the composition, classical
and ESM-2 spaces, with their names and labels."""),
("task",
"""# your code here
""",
"""tab = pd.DataFrame({
    "overlap with ESM-2": {k: overlap(v, nbr["esm2"]) for k, v in nbr.items()},
    "SP neighbours of SP proteins": {k: sp[v][sp == 1].mean() for k, v in nbr.items()},
    "TM neighbours of TM proteins": {k: tm[v][tm == 1].mean() for k, v in nbr.items()}}).round(3)
display(tab)
q = int(np.where(prot["accession"] == "P29460")[0][0])
for k in ["composition", "classical", "esm2"]:
    print(f"\\n{k}:")
    for j in nbr[k][q]:
        print(f"   SP={sp[j]} TM={tm[j]}  {prot['protein_name'][j][:70]}")"""),
("md", """**Question 7.** (a) How similar are the neighbourhoods defined by the classical descriptors
and by ESM-2? (b) What does PCA do to the ESM-2 neighbourhoods as the number of components
falls? (c) Interpret the IL-12B example biologically, carefully."""),
("answer", f"""(a) On average only {pct(ov['classical'])} of a protein's 10 nearest neighbours are the same
in the two spaces (composition: {pct(ov['composition'])}), against {pct(NB['overlap_chance'], 1)} by
chance. The representations define genuinely different notions of "similar". The share of a
signal-peptide protein's neighbours that also carry one is {pct(la['esm2']['signal_peptide']['positives'])} for ESM-2,
{pct(la['classical']['signal_peptide']['positives'])} for classical and {pct(la['composition']['signal_peptide']['positives'])}
for composition (base rate {pct(D['all']['sp'] / D['all']['n'], 1)}).
(b) PCA to 50 components keeps {pct(ov['esm2_pca50'])} of the neighbours, to 10 components
{pct(ov['esm2_pca10'])}, to 2 components {pct(ov['esm2_pca2'])}. The neighbourhoods degrade
gradually, then collapse; label agreement follows (SP: {pct(la['esm2_pca10']['signal_peptide']['positives'])}
at 10 components, {pct(la['esm2_pca2']['signal_peptide']['positives'])} at 2). PCA preserves large-scale
variance, not each protein's nearest neighbours.
(c) By composition, IL-12B's neighbours are mostly intracellular proteins (WD-repeat proteins, a
centromere protein, a chromatin-assembly factor), none with a signal peptide: they share residue
usage, nothing more. The classical descriptors add two signal-peptide proteins (two
immunoglobulin-like receptors). In the ESM-2 space all ten neighbours have a signal peptide and
most are cytokines, cytokine receptors or other immune-system proteins (IL-40, the IL-5 receptor
alpha chain, the common gamma chain, IL-1 receptor-like 2, an HLA class II beta chain). This is
consistent with the embedding capturing features shared by secreted immune proteins. It does not
tell us which features (signal sequence, domain types, something else), and it is one example
chosen because it is clear: Task 7b(i) is the systematic evidence."""),

# ------------------------------------------------------------------ Task 8
("md", """## Task 8. The residue-shuffling control (about 10 minutes)

Every protein was also embedded after **shuffling its residues**: the same residues, so the same
composition and length, in random order. If ESM-2's advantage comes from order, it should
vanish for the shuffled sequences.

**Predict first:** after shuffling, will k-NN on the ESM-2 embedding fall to the level of
composition, stay at its original level, or fall below composition?

**8a.** (i) Check that composition and length are unchanged by the shuffle and measure how the
two hydropathy features change (`X_classical` against `X_classical_shuf`). (ii) In the
standardised ESM-2 space (scaler fitted on the real embeddings), compare each protein's distance
to its own shuffled copy with its distance to its nearest *other* real protein. (iii) Use
`cv_table` and `test_table` to compare ESM-2 and shuffled ESM-2."""),
("task",
"""# your code here
""",
"""print("max change in composition:", np.abs(X_classical[:, :21] - X_classical_shuf[:, :21]).max())
print("mean max-hydropathy, transmembrane proteins: real %.3f, shuffled %.3f"
      % (X_classical[tm == 1, 21].mean(), X_classical_shuf[tm == 1, 21].mean()))
print("mean N-terminal hydropathy, signal-peptide proteins: real %.3f, shuffled %.3f"
      % (X_classical[sp == 1, 22].mean(), X_classical_shuf[sp == 1, 22].mean()))
sc = StandardScaler().fit(E)
Z, Zs = sc.transform(E), sc.transform(E_shuf)
d_twin = np.linalg.norm(Z - Zs, axis=1)
d_near = NearestNeighbors(n_neighbors=2).fit(Z).kneighbors(Z)[0][:, 1]
print("median distance to own shuffled copy %.2f | to nearest other protein %.2f | copy closer: %.3f"
      % (np.median(d_twin), np.median(d_near), (d_twin < d_near).mean()))
display(cv_table.loc[(slice(None), ["composition", "esm2", "esm2_shuffled"]), ["CV ROC AUC", "selected"]])
# the real-sequence ESM-2 model applied to the shuffled test proteins
for task, y in TASKS.items():
    s = searches[(task, "esm2")]
    print(task, "ESM-2 model on shuffled test proteins: ROC AUC %.3f" % roc_auc_score(y[test_idx], s.predict_proba(E_shuf[test_idx])[:, 1]))"""),
("md", """**Question 8.** What does the control show, and what does it **not** show?"""),
("answer", f"""Shuffling leaves composition and length exactly unchanged (difference 0) but the
order-aware classical features change: the mean hydropathy peak of membrane proteins falls from
{SH['max_hydropathy_tm_real']:.2f} to {SH['max_hydropathy_tm_shuffled']:.2f}, and the mean N-terminal
hydropathy of signal-peptide proteins from {SH['nterm_hydropathy_sp_real']:.2f} to
{SH['nterm_hydropathy_sp_shuffled']:.2f}. The ESM-2 embedding moves a long way: the shuffled copy is
closer to its original than the nearest other real protein for only
{pct(SH['share_twin_closer_than_nearest_other'])} of proteins (median distance
{SH['esm2_twin_distance_median']} against {SH['esm2_nearest_other_median']}). k-NN on shuffled
embeddings falls to about the composition level (signal peptide CV {f3(KS['esm2_shuffled']['best']['cv_roc_auc'])}
against composition {f3(KS['composition']['best']['cv_roc_auc'])} and ESM-2 {f3(KS['esm2']['best']['cv_roc_auc'])};
transmembrane {f3(KT['esm2_shuffled']['best']['cv_roc_auc'])}, {f3(KT['composition']['best']['cv_roc_auc'])},
{f3(KT['esm2']['best']['cv_roc_auc'])}), and the real-sequence model applied to shuffled test proteins
drops to {f3(KS['esm2_model_on_shuffled_test'])} (signal peptide). So the embedding's advantage over
composition depends on residue order.
It does **not** show *which* order-dependent property the model uses (a hydrophobic N-terminal
segment, a cleavage motif, domain structure, or something without a simple name), nor that the
model "understands" targeting or membrane insertion. The classical hydropathy features also use
order and recover most of the gain, which is a reminder that "order" covers simple patterns too.
A shuffled sequence is also unlike any natural protein, so part of the drop may be the model
being far outside its training distribution."""),

# ------------------------------------------------------------------ Task 9
("md", """## Task 9. Critical reflection (about 10 minutes)

Answer in short paragraphs, using your numbers.

1. Which representation performed better in this experiment, for which task, and how sure are you?
2. What information might explain the difference (and the absence of a difference)?
3. How did dimensionality reduction affect nearest-neighbour relationships?
4. Did visual clusters in the maps correspond to the biological annotations?
5. What are the limitations of the dataset and of the evaluation? Consider homology between
   training and test proteins, pretraining exposure, and annotation uncertainty.
6. What further experiment would you run next, and what would it tell you?"""),
("answer", f"""1. Signal peptide: ESM-2 and the classical descriptors tie on test ROC AUC
({f3(tS['esm2']['roc_auc'])} and {f3(tS['classical']['roc_auc'])}; interval for the difference
{bs['ci95'][0]:+.3f} to {bs['ci95'][1]:+.3f}), though ESM-2 has much better recall at the default
threshold; both beat composition by a wide margin. Transmembrane: the classical descriptors are
better ({f3(tT['classical']['roc_auc'])} against {f3(tT['esm2']['roc_auc'])}; interval
{bt['ci95'][0]:+.3f} to {bt['ci95'][1]:+.3f}). One split of 500 proteins, so modest certainty; CV and
test agree in direction.
2. Both labels depend on *where* hydrophobic residues are. Composition cannot see that; the two
hydropathy summaries and ESM-2 can. The 19-residue window is almost a definition of a membrane
helix, so it is hard to beat for that task. ESM-2's neighbourhoods are purer for signal peptides,
possibly because it also encodes other properties shared by secreted proteins.
3. Reduction changed neighbours more than scores: PCA to 10 components kept {pct(ov['esm2_pca10'])}
of the ESM-2 neighbours yet k-NN on 10 components scored {f3(R['signal_peptide']['pca_10'])} (all
320: {f3(R['signal_peptide']['full_320_standardised'])}); 2 components collapsed both
({pct(ov['esm2_pca2'])}, {f3(R['signal_peptide']['pca_2'])}). 2-D UMAP kept more local neighbours than 2
PCs but cost {f3(R['signal_peptide']['full_320_standardised'] - R['signal_peptide']['umap_2'])} ROC AUC inside the Pipeline.
4. Partly: transmembrane proteins concentrate in regions of the maps, signal-peptide proteins less
clearly; neither forms a clean cluster. The maps were computed without labels, so the overlap is
an observation, not a test, and its appearance changes with perplexity or n_neighbors.
5. Homology: one protein per UniRef50 cluster removes close relatives, but families remain (by
shared 5-mers, {hp['n_test_over_0.2']} test proteins share more than 20% with a training protein; the
highest pair, Rap-1A and a Rap-1b-like protein, {pct(hp['max'])}), which favours any method that
recognises families, including k-NN on ESM-2. Pretraining exposure: ESM-2 was trained on UniRef50
sequences that very probably include these proteins, so "test" proteins are not unseen sequences
(their labels were never used). Annotation uncertainty: most labels are predictions
("sequence analysis"), negatives are "not annotated", and the experimentally supported subset is
small ({D['sp_evidence_test'].get('experimental', 0)} signal-peptide test proteins). Scope: human, 50–1,000
residues, one split, one small ESM-2 model.
6. For example: evaluate on the experimentally supported labels only; split by protein family
(e.g. by UniRef50 → UniRef30 or by Pfam clan) to test generalisation to new families; use a larger
ESM-2 model or a different pooling; tune the threshold for recall; test on proteins added to
UniProt after ESM-2's training data was frozen, to remove pretraining exposure."""),
("teach", """If time is short, take Task 9 as a whole-class discussion and set the written
answers as homework. The most valuable point to draw out is question 1's honesty: "ESM-2 wins" is
the expected answer and is not what the data say for the transmembrane task."""),

# ------------------------------------------------------------------ Extensions
("md", """---
## Checkpoint

You have finished the core lab when Tasks 1–9 run top to bottom and every question is answered.
The extensions are optional."""),
("md", """## Extension A. Dimensionality reduction inside the k-NN pipeline

Put `StandardScaler → PCA(n_components=k) → KNeighborsClassifier` (using ESM-2's selected
signal-peptide setting) in one Pipeline and plot cross-validated ROC AUC for k in 2, 5, 10, 20,
50, 100. If UMAP is available, try `StandardScaler → UMAP(2) → KNeighborsClassifier` (Euclidean)
too. Why can t-SNE not be used this way?"""),
("task",
"""# your code here
""",
"""b = searches[("signal_peptide", "esm2")].best_params_
red = {}
for kc in [2, 5, 10, 20, 50, 100]:
    p = Pipeline([("scale", StandardScaler()), ("pca", PCA(n_components=kc, random_state=SEED)),
                  ("knn", KNeighborsClassifier(n_neighbors=b["knn__n_neighbors"], metric=b["knn__metric"],
                                               weights=b["knn__weights"]))])
    red[kc] = cross_val_score(p, E[train_idx], sp[train_idx], cv=CV, scoring="roc_auc").mean()
if HAVE_UMAP:
    p = Pipeline([("scale", StandardScaler()),
                  ("umap", umap.UMAP(n_components=2, n_neighbors=15, min_dist=0.1, random_state=SEED, n_jobs=1)),
                  ("knn", KNeighborsClassifier(n_neighbors=b["knn__n_neighbors"], weights=b["knn__weights"]))])
    red["UMAP 2"] = cross_val_score(p, E[train_idx], sp[train_idx], cv=CV, scoring="roc_auc").mean()
pd.Series(red).round(4)"""),
("answer", f"""PCA: {', '.join(f"{k} components {f3(R['signal_peptide'][f'pca_{k}'])}" for k in [2, 5, 10, 20, 50, 100])};
all 320 standardised {f3(R['signal_peptide']['full_320_standardised'])}. Ten to twenty components are
enough for k-NN, which is cheaper and slightly less affected by distance concentration; two are not.
UMAP to 2-D inside the pipeline (refitted in every fold, then applied to the held-out fold with
`transform`) scores {f3(R['signal_peptide']['umap_2'])}. Standard t-SNE has no `transform`: it
places only the points it was fitted on, so it cannot map new proteins and cannot sit in a
Pipeline; running it on all proteins first and then cross-validating on the map would let test
proteins shape the training space (a transductive leak)."""),
("md", """## Extension B. Choosing a threshold without touching the test set

For the signal-peptide ESM-2 and classical models, get cross-validated probabilities on the
**training** proteins (`cross_val_predict(..., method="predict_proba")`), choose the threshold
that maximises F1 there, and only then apply it to the test probabilities from Task 6c."""),
("task",
"""# your code here
""",
"""from sklearn.model_selection import cross_val_predict
for rep in ["classical", "esm2"]:
    s = searches[("signal_peptide", rep)]
    p_tr = cross_val_predict(s.best_estimator_, REPS[rep][train_idx], sp[train_idx], cv=CV, method="predict_proba")[:, 1]
    ths = np.linspace(0.05, 0.6, 56)
    f1s = [f1_score(sp[train_idx], p_tr >= t) for t in ths]
    t_best = ths[int(np.argmax(f1s))]
    p_te = probs[("signal_peptide", rep)]
    print(f"{rep:10s} threshold {t_best:.2f} | train-CV F1 {max(f1s):.3f} | test F1 {f1_score(sp[test_idx], p_te >= t_best):.3f}"
          f" recall {recall_score(sp[test_idx], p_te >= t_best):.3f} precision {precision_score(sp[test_idx], p_te >= t_best):.3f}")"""),
("answer", """Lowering the threshold to a value chosen on training folds raises recall sharply for
both representations and narrows the F1 gap between them, as the similar ROC AUCs predict: the
default 0.5 threshold, not the ranking, was responsible for most of the recall difference in
Task 6. The threshold is a hyperparameter like k, so it is chosen on training data and reported
with the test result, never tuned on the test set."""),
("md", """## Extension C. Annotation evidence and related sequences

(i) For the signal-peptide test proteins, compare the recall of the classical and ESM-2 models
separately for experimentally supported and for "sequence analysis" labels. (ii) Measure, for
each test protein, the largest share of its distinct 5-mers found in any single training protein.
How many test proteins have a close relative in the training set?"""),
("task",
"""# your code here
""",
"""ev = prot["sp_evidence"].values[test_idx]
for rep in ["composition", "classical", "esm2"]:
    pr = preds[("signal_peptide", rep)]
    out = {e: f"{int(((pr == 1) & (sp[test_idx] == 1) & (ev == e)).sum())}/{int(((sp[test_idx] == 1) & (ev == e)).sum())}"
           for e in ["experimental", "sequence analysis"]}
    print(rep, out)

def kmers(q, k=5):
    return {q[i:i + k] for i in range(len(q) - k + 1)}
K5 = [kmers(q) for q in prot["sequence"]]
index = {}
for j in train_idx:
    for km in K5[j]:
        index.setdefault(km, []).append(j)
share = []
for i in test_idx:
    cnt = {}
    for km in K5[i]:
        for j in index.get(km, ()):
            cnt[j] = cnt.get(j, 0) + 1
    share.append(max(cnt.values()) / len(K5[i]) if cnt else 0)
share = np.array(share)
print("median %.3f | test proteins > 0.2: %d | > 0.5: %d | max %.3f" % (np.median(share), (share > 0.2).sum(),
      (share > 0.5).sum(), share.max()))"""),
("answer", f"""(i) Recall on the {KS['esm2']['best']['test']['recall_by_evidence']['experimental'][1]}
experimentally supported test positives: composition {KS['composition']['best']['test']['recall_by_evidence']['experimental'][0]},
classical {KS['classical']['best']['test']['recall_by_evidence']['experimental'][0]}, ESM-2
{KS['esm2']['best']['test']['recall_by_evidence']['experimental'][0]}; on the
{KS['esm2']['best']['test']['recall_by_evidence']['sequence analysis'][1]} "sequence analysis" positives: composition
{KS['composition']['best']['test']['recall_by_evidence']['sequence analysis'][0]}, classical
{KS['classical']['best']['test']['recall_by_evidence']['sequence analysis'][0]}, ESM-2
{KS['esm2']['best']['test']['recall_by_evidence']['sequence analysis'][0]}. The groups are small, so
these are descriptive: there is no sign here that the models do much better on predicted labels
than on experimental ones, but 19 proteins cannot show it either way.
(ii) The median test protein shares only {pct(hp['median'], 1)} of its 5-mers with its most similar
training protein; {hp['n_test_over_0.2']} share more than 20% and {hp['n_test_over_0.5']} more than 50%
(the highest, {pct(hp['max'])}, is Ras-related protein Rap-1A with a Rap-1b-like protein). UniRef50
clustering removed near-identical pairs but not all family relationships. This shared-5-mer
measure is a rough proxy, not an alignment; a proper check would align every test protein against
the training set (BLAST or MMseqs2) and split by family."""),
("md", """## Extension D. Regenerating the embeddings (instructions only; needs a network and PyTorch)

The embeddings in `data/` were produced by the module team with the procedure below, recorded
in `data/PROVENANCE.json` (model, revision, pooling, library versions, checksums). Running it is
**not** part of the lab: it needs `torch` and `transformers`, downloads the model (about 30 MB),
and takes about 1–2 minutes on a laptop CPU for 2,000 proteins (a GPU is not needed for the 8M
model; larger ESM-2 models need much more memory).

```python
import torch
from transformers import AutoModel, AutoTokenizer
MODEL, REVISION = "facebook/esm2_t6_8M_UR50D", "c731040fcd8d73dceaa04b0a8e6329b345b0f5df"
tok = AutoTokenizer.from_pretrained(MODEL, revision=REVISION)
model = AutoModel.from_pretrained(MODEL, revision=REVISION).eval()
with torch.no_grad():
    enc = tok([seq], return_tensors="pt")
    h = model(**enc).last_hidden_state[0]          # (tokens, 320): <cls>, residues, <eos>
    vector = h[1:len(seq) + 1].mean(0).numpy()     # mean over residue positions only
```

Compare one protein's vector with the frozen one (`emb.loc["P29460"]`): differences should be
below about 1e-4 (the frozen values are rounded to 5 decimals)."""),
]


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
            out.append(nbformat.v4.new_markdown_cell(
                "**Worked answer.**\n\n" + c[1] if solutions else STUDENT_TEXT))
        elif kind == "teach":
            if solutions:
                out.append(nbformat.v4.new_markdown_cell("> **Instructor notes.** " + c[1]))
    if solutions:
        first = out[0].source
        first = first.replace("# COMP9085 Week 7 Laboratory", "# COMP9085 Week 07 Lab — Solutions (instructor)", 1)
        old = ("**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**), with every\n"
               "question answered in the markdown cells.")
        assert old in first
        first = first.replace(old,
            "**About this notebook.** Complete code, outputs, plots and worked answers for every task, plus\n"
            "**instructor notes** (timing, common mistakes, alternative defensible choices). Every number in a\n"
            "worked answer was checked against `data/scripts/week07r_numbers.json` when the notebook was built.\n"
            "**Instructor only:** do not distribute with the student files; the `solutions/` folder is gitignored.")
        out[0].source = first
        out.insert(1, nbformat.v4.new_markdown_cell(INSTRUCTOR_INTRO))
        setup = next(c for c in out if c.cell_type == "code" and 'DATA = Path("data")' in c.source)
        setup.source = setup.source.replace(
            'DATA = Path("data")',
            'DATA = Path("data") if Path("data").exists() else Path("../data")   # run from labs/week07 or solutions/')
    nb.cells = out
    return nb


INSTRUCTOR_INTRO = f"""> **Instructor overview.**
> * **Timing.** Tasks 1–2 20 min, 3–5 35 min, 6 30 min (protect it), 7–9 35 min. If short of time,
>   demonstrate Task 4 from the website (Exercises 4–6) and take Task 9 as a class discussion.
> * **The result to expect.** Signal peptide: ESM-2 and classical tie on ROC AUC; both far above
>   composition. Transmembrane: classical beats ESM-2. Students who expect "the foundation model wins"
>   should be asked to read their own bootstrap intervals.
> * **Runtime.** The complete solutions take about two minutes on an 8-core laptop (Task 6b and
>   Extension A dominate). The unfilled student notebook runs in about one minute.
> * **What can vary.** t-SNE and UMAP layouts (and their trustworthiness in the third decimal) may differ
>   across library versions and platforms; GridSearchCV choices among near-tied settings may differ
>   if K_GRID is changed. The numbers here were produced with scikit-learn {N['sklearn']},
>   umap-learn {N['umap']}, numpy {N['numpy']}, pandas {N['pandas']}.
> * **If umap-learn is missing**, the UMAP cells are skipped and the rest runs."""


CHECK = """import json, math
_N = json.load(open("../../../data/scripts/week07r_numbers.json"))
def _eq(a, b, tol=6e-4):
    assert math.isclose(float(a), float(b), abs_tol=tol), (a, b)
_D = _N["data"]
_eq(len(prot), _D["all"]["n"]); _eq(sp.sum(), _D["all"]["sp"]); _eq(tm.sum(), _D["all"]["tm"])
_eq(len(train_idx), _D["train"]["n"]); _eq(sp[test_idx].sum(), _D["test"]["sp"])
_eq(evr[0], _N["pca"]["classical|standard"]["pc1"]); assert k90 == _N["pca"]["classical|standard"]["k90"]
_eq(pca_raw.explained_variance_ratio_[0], _N["pca"]["classical|none"]["pc1"]); assert k90_e == _N["pca"]["esm2|standard"]["k90"]
_T = _N["trustworthiness"]
_eq(trust_cl["PCA"], _T["classical|pca"], 2e-3)
for _p in [5, 50]:
    _eq(trust_cl[f"t-SNE, perplexity {_p}"], _T[f"classical|tsne|{_p}|0"], 2e-3)
    _eq(trust_cl[f"UMAP, n_neighbors {_p}"], _T[f"classical|umap|{_p}|0.1|0"], 2e-3)
for (task, rep), s in searches.items():
    _b = _N["knn"][task][rep]["best"]
    assert s.best_params_["knn__n_neighbors"] == _b["k"] and s.best_params_["knn__metric"] == _b["metric"], (task, rep)
    assert s.best_params_["knn__weights"] == _b["weights"], (task, rep)
    assert ("none" if isinstance(s.best_params_["scale"], str) else "standard") == _b["scale"], (task, rep)
    _eq(s.best_score_, _b["cv_roc_auc"]); _eq(test_table.loc[(task, rep), "ROC AUC"], _b["test"]["roc_auc"], 6e-4)
    assert confusion_matrix(TASKS[task][test_idx], preds[(task, rep)]).tolist() == _b["test"]["cm"], (task, rep)
_eq(search_cl_sp.best_score_, _N["knn"]["signal_peptide"]["classical"]["best"]["cv_roc_auc"])
for task in TASKS:
    _d, _ci = bootstrap_diff(TASKS[task][test_idx], probs[(task, "esm2")], probs[(task, "classical")])
    _bb = _N["knn"][task]["bootstrap"]["esm2_minus_classical"]
    _eq(_d, _bb["diff"]); _eq(_ci[0], _bb["ci95"][0]); _eq(_ci[1], _bb["ci95"][1])
_O = _N["neighbourhoods"]["overlap_with_esm2"]
for _k in ["composition", "classical", "esm2_pca2", "esm2_pca10", "esm2_pca50"]:
    _eq(overlap(nbr[_k], nbr["esm2"]), _O[_k], 2e-3)
_eq(tab.loc["esm2", "SP neighbours of SP proteins"], _N["neighbourhoods"]["label_agreement"]["esm2"]["signal_peptide"]["positives"], 2e-3)
_S = _N["shuffle"]
_eq((d_twin < d_near).mean(), _S["share_twin_closer_than_nearest_other"], 2e-3)
_eq(np.median(d_twin), _S["esm2_twin_distance_median"], 0.01)
for _k in [2, 5, 10, 20, 50, 100]:
    _eq(red[_k], _N["reduced_knn"]["signal_peptide"][f"pca_{_k}"])
_eq(red["UMAP 2"], _N["reduced_knn"]["signal_peptide"]["umap_2"], 2e-3)
_eq(np.median(share), _N["homology_proxy"]["median"], 2e-3); assert (share > 0.2).sum() == _N["homology_proxy"]["n_test_over_0.2"]
print("CHECK PASSED: solutions agree with week07r_numbers.json")
"""


def html(nb, path):
    body, _ = HTMLExporter().from_notebook_node(nb)
    with open(path, "w") as f:
        f.write(body)


def execute(nb, where=OUT):
    ExecutePreprocessor(timeout=3600, kernel_name="python3").preprocess(nb, {"metadata": {"path": where}})


def main():
    os.makedirs(SOL, exist_ok=True)
    student = build(False)
    for c in student.cells:
        assert "Worked answer" not in c.source and "Instructor" not in c.source
    nbformat.write(student, os.path.join(OUT, "COMP9085_Week07_Lab.ipynb"))
    html(student, os.path.join(OUT, "COMP9085_Week07_Lab.html"))
    trial = copy.deepcopy(student)
    execute(trial)
    errors = [o for c in trial.cells if c.cell_type == "code" for o in c.outputs if o.output_type == "error"]
    assert not errors, errors
    print("student notebook (unfilled) executed without errors")

    sol = build(True)
    sol.cells.append(nbformat.v4.new_code_cell(CHECK))
    execute(sol, SOL)
    assert "CHECK PASSED" in "".join(o.get("text", "") for o in sol.cells[-1].outputs)
    sol.cells = sol.cells[:-1]
    errors = [o for c in sol.cells if c.cell_type == "code" for o in c.outputs if o.output_type == "error"]
    assert not errors, errors
    nbformat.write(sol, os.path.join(SOL, "COMP9085_Week07_Lab_Solutions.ipynb"))
    html(sol, os.path.join(SOL, "COMP9085_Week07_Lab_Solutions.html"))
    print("student and executed solutions written to", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
