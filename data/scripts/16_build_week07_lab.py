#!/usr/bin/env python3
"""
Week 7 lab: build the student notebook and the instructor solutions notebook
from ONE source, so the two cannot drift apart (as for Weeks 4-6).

Outputs
    labs/week07/COMP9085_Week07_Lab.ipynb                         public, no answers
    labs/week07/COMP9085_Week07_Lab.html                          public, rendered
    labs/week07/solutions/COMP9085_Week07_Lab_Solutions.ipynb     instructor (gitignored)
    labs/week07/solutions/COMP9085_Week07_Lab_Solutions.html      instructor (gitignored)

Part A uses scikit-learn's bundled copy of WDBC; Part B reads the frozen protein files in
labs/week07/data/ (real Swiss-Prot sequences, real ESM-2 embeddings computed once by the
module team). No network, no torch. Both notebooks are EXECUTED here in a fresh kernel:

  * the student notebook, unfilled, must run top to bottom without an error
    (the provided cells never depend on a student's answer cell);
  * the solutions notebook must run without an error, and a check cell (run, then
    removed before saving) asserts that its outputs agree with
    data/scripts/week07_numbers.json, the source the lecture quotes.

    python3 data/scripts/15_build_week07_data.py     # first, if the numbers changed
    python3 data/scripts/16_build_week07_lab.py      # needs nbformat, nbconvert, ipykernel
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
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week07_numbers.json")))
CU, W, P, G = N["curse"]["by_dimension"], N["wdbc"], N["proteins"], N["geometry"]
PC, PT, PE = N["probe_cv"], N["probe_test"], N["pca_embedding"]
TM, SPP = PC["transmembrane"], PC["signal_peptide"]
COMP, ESM, SHUF, HYD, LEN = ("composition (20)", "ESM-2 (320)", "ESM-2 on shuffled sequences (320)",
                             "composition + 2 hydropathy features (22)", "length only")
K = W["one_se"]["chosen_k"]

STUDENT_CODE = "# your code here\n"
STUDENT_TEXT = "*Your answer here.*"


def pct(x, d=1):
    return f"{100 * x:.{d}f}%"


def f3(x):
    return f"{x:.3f}"


def cells():
    ev_tm, ev_sp = P["tm_evidence"], P["sp_evidence"]
    return [
("md", f"""# COMP9085 Week 7 Laboratory
## PCA and the geometry of a learned representation

**Two hours.** Until now you have chosen the features. This week you meet two ways of
*replacing* them: principal component analysis (PCA), which finds a few directions that
summarise many measured features, and a protein **foundation model**, which turns a raw
sequence into a vector it learned to produce from millions of unlabelled proteins. You will
reduce a real dataset properly, look inside a real learned representation, and then test,
with one fixed classifier, what that representation sees that simple features do not.

**Part A (Tasks 1–5, about 50 minutes): WDBC.** The breast-mass data from Weeks 2–4
(569 fine-needle aspirates, 30 nuclear measurements), loaded from scikit-learn's bundled copy.

**Part B (Tasks 6–10, about 60 minutes): human proteins.** {P['n']:,} reviewed human proteins
from UniProtKB/Swiss-Prot (release {P['uniprot_release']}), one per UniRef50 cluster, each
with two real annotations (is it an integral **membrane** protein? does it carry an
N-terminal **signal peptide**?) and a real 320-dimensional embedding from the protein
language model **ESM-2** (8 million parameters). The module team computed the embeddings
once; you load them from `data/`. **No network, no GPU and no deep-learning library are
needed.** `data/README.md` documents every column and `data/PROVENANCE.json` the sources,
model version and checksums.

**The question.** When does a representation learned by a foundation model beat features
a biologist would choose, and *why*? A higher score is not an answer. An answer says what
property of the task the representation captures.

**By the end of this lab you should be able to**
1. explain the curse of dimensionality and show distance concentration numerically;
2. perform PCA correctly (standardised, inside a pipeline when it feeds a model) and
   interpret the explained-variance spectrum and the loadings;
3. distinguish what PCA preserves from what a neighbour embedding (t-SNE) preserves, and
   read each plot without over-reading it;
4. describe how a protein language-model embedding is produced, and measure two properties
   of its geometry (anisotropy, effective dimension);
5. compare engineered and learned representations under one fixed classifier and one
   protocol, and use a control experiment to explain *why* they differ.

**Prerequisites.** Weeks 3–6: train/test splits, `StratifiedKFold`, `Pipeline`, baselines,
ROC AUC and average precision. No biology beyond the two short explanations in Part B.

**How the cells work.** Cells marked *provided* run as they are: read them, run them, and
make sure you understand them. Cells containing `# your code here` are yours. Before some
tasks you are asked to **predict** a result first: write the prediction down before you
run anything.

**Structure.** **Tasks 1–10 are the core lab.** A checkpoint after Task 10 marks the end of
the core; three optional extensions and a final reflection follow.

**Rules for the whole lab.** Each dataset is split once, in a provided cell. Every choice is
made with 5-fold cross-validation on the training rows. Each test set is used **once**
(Task 5 and Task 10). Anything that learns from data (scaler, PCA, classifier) is fitted
inside a `Pipeline`, so cross-validation refits it in every fold.

**Practice, not assessment.** This lab is not part of Assignment 1 and uses different
data. Do not add PCA or embeddings to your assignment because they appear here; use a
method there only if you can justify it for *your* data, with *your* numbers.

**The Week 7 page is your interactive companion.** Its PCA visualiser lets you rotate and
project WDBC yourself; use it alongside Tasks 2–4.

**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**), with
every question answered in the markdown cells using your own numbers."""),
("md", "### Setup\n\nRun this cell first."),
("code", """import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.datasets import load_breast_cancer
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score, average_precision_score
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

import sklearn
print("scikit-learn", sklearn.__version__, "| pandas", pd.__version__, "| numpy", np.__version__)

SEED = 42
CV = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
DATA = Path("data")


def cv_scores(model, X, y, metrics=("roc_auc", "average_precision")):
    \"\"\"Mean 5-fold CV score of a pipeline on the TRAINING rows (the course protocol).\"\"\"
    s = cross_validate(model, X, y, cv=CV, scoring=list(metrics))
    out = {m: s[f"test_{m}"].mean() for m in metrics}
    out["roc_auc_sd"] = s["test_roc_auc"].std(ddof=1) if "roc_auc" in metrics else np.nan
    return out"""),

# ================================================================== PART A
("md", """# Part A — Principal component analysis on WDBC

---
## Task 1 — The curse of dimensionality (provided, about 8 minutes)

Many biological datasets are *wide*: a transcriptome measures 20,000 genes in perhaps 200
patients. The cell below draws 1,000 points uniformly at random in a cube of dimension
*d* and measures the distance from the first point to every other point.

**Predict first.** As *d* grows from 2 to 1,000, what happens to the ratio between the
farthest and the nearest of those distances? Write your prediction here, then run the cell."""),
("answer", "*(Prediction.)*", "*(Students' predictions vary; the point is to commit before running.)*"),
("code", """rng = np.random.default_rng(SEED)
rows = []
for d in [2, 10, 100, 1000]:
    P = rng.random((1000, d))
    dist = np.linalg.norm(P[1:] - P[0], axis=1)
    rows.append({"dimension": d, "nearest": dist.min(), "farthest": dist.max(),
                 "relative contrast (far - near) / near": (dist.max() - dist.min()) / dist.min()})
pd.DataFrame(rows).set_index("dimension").round(3)"""),
("md", """**Question 1.1.** Describe what happens to the nearest and farthest distances, and to
their relative contrast, as the dimension grows. Why does this matter for any method that
relies on "the nearest points" (next week: k-nearest neighbours)?

**Question 1.2.** WDBC has 30 features and 569 cases; a transcriptome study might have 20,000
features and 200 cases. Give one reason why reducing the dimension can help, and one thing
you could lose by doing it."""),
("answer", f"""**1.1.** In 2 dimensions the nearest point is very close ({CU['2']['min']:.3f}) and
the farthest is about {CU['2']['relative_contrast']:.0f} times further away. In 1,000
dimensions every point is roughly the same distance away (nearest {CU['1000']['min']:.1f},
farthest {CU['1000']['max']:.1f}; relative contrast {CU['1000']['relative_contrast']:.2f}).
Distances *concentrate*: "nearest" stops meaning "much nearer than the rest". Any method
built on neighbourhoods or distances (k-NN, clustering, kernel methods) loses its signal
unless the data occupy far fewer effective dimensions than they are measured in. Uniform
random data are the worst case; real data are usually correlated and lower-dimensional,
which is exactly what PCA exploits.

**1.2.** Helps: fewer, decorrelated inputs mean fewer parameters to estimate from few
cases, less noise, and distances that mean something again; it also allows a picture.
Loses: whatever lies in the discarded directions. Variance is not the same as relevance;
a low-variance direction can carry the signal that matters (for example a small set of
genes that separates two subtypes)."""),
("teach", """*Time:* 5–8 minutes; run it live and ask for a show of hands on the
prediction first. *Common mistake:* concluding that "high-dimensional data cannot be
modelled". The demo is for uniform noise; real biological data are highly correlated,
which is why PCA works on WDBC. Link forward to Week 8 (k-NN) explicitly."""),

("md", """---
## Task 2 — PCA on standardised WDBC (about 10 minutes)

The provided cell loads WDBC with **malignant = 1**, as in Weeks 2–4, and makes the one
split used in Part A (stratified, 30% test, `SEED = 42`, the Week 4 protocol).

In this task you are **describing** the data, not evaluating a model, so PCA is fitted on
all 569 cases and no label is used. When PCA feeds a model (Task 4) it goes inside the
pipeline instead."""),
("code", """wdbc = load_breast_cancer()
X = wdbc.data
y = (wdbc.target == 0).astype(int)          # 1 = malignant
feature_names = list(wdbc.feature_names)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, stratify=y, random_state=SEED)
print(X.shape, "| malignant:", y.sum(), "| train", len(y_train), "| test", len(y_test))"""),
("md", """**Your task.** Standardise `X` with `StandardScaler`, fit `PCA()` (all components), and
plot (a) the explained-variance ratio of each component (a *scree plot*) and (b) the
cumulative explained variance, with a horizontal line at 0.90. Store the fitted PCA as
`pca_all` and print how many components are needed to reach 90% and 95%.

*Hint:* `pca_all.explained_variance_ratio_` and `np.cumsum`."""),
("task", STUDENT_CODE, """Z = StandardScaler().fit_transform(X)
pca_all = PCA().fit(Z)
evr = pca_all.explained_variance_ratio_
cum = np.cumsum(evr)
fig, ax = plt.subplots(1, 2, figsize=(11, 3.8))
ax[0].bar(range(1, 31), evr)
ax[0].set(xlabel="component", ylabel="explained variance ratio", title="Scree plot")
ax[1].plot(range(1, 31), cum, marker="o", ms=3)
ax[1].axhline(0.9, color="grey", ls="--")
ax[1].set(xlabel="number of components", ylabel="cumulative explained variance", ylim=(0, 1.02))
plt.tight_layout(); plt.show()
print("first two:", cum[1].round(3), "| first six:", cum[5].round(3))
print("components for 90%:", np.searchsorted(cum, 0.90) + 1, "| for 95%:", np.searchsorted(cum, 0.95) + 1)"""),
("md", """**Question 2.1.** How much variance do the first two components carry, and how many
components do you need for 90%? What does that say about how much a two-dimensional plot
of WDBC can show?

**Question 2.2.** WDBC measures 30 features, but ten of them are the *mean*, ten the
*standard error* and ten the *worst* value of the same ten nuclear properties. Why would you
expect such data to be compressible?"""),
("answer", f"""**2.1.** The first two components carry {pct(W['cum'][1])} of the variance and six
carry {pct(W['cum'][5])}; {W['k90']} components are needed for 90% and {W['k95']} for 95%.
A two-dimensional plot therefore shows a little under two thirds of the variation: a
useful summary, but more than a third of the structure is invisible in it. Classes that
overlap in the plot may separate in the full space, which is why you model in more
dimensions than you plot.

**2.2.** The features are strongly correlated by construction: radius, perimeter and area
are geometric functions of one another, and the mean, the worst value and (less so) the
standard error of one property move together. Correlated features share variance, and PCA
collects shared variance into few components."""),
("teach", f"""*Check:* the website quotes 63.2% for two components and 88.8% for six;
students should reproduce exactly these numbers (PCA on all 569 standardised cases).
*Common mistake:* reading "{W['k90']} components for 90%" as "the other {30 - W['k90']} features are useless".
Components are mixtures of all features; no feature has been removed."""),

("md", """---
## Task 3 — What the components mean, and why scaling matters (about 12 minutes)

A component is a weighted sum of the original features. The weights are its **loadings**.
The provided cell shows the six largest loadings (by absolute value) of PC1 and PC2. The sign
of a component is arbitrary: PCA could return PC1 or −PC1, so read the *pattern* of signs,
not the signs themselves."""),
("code", """Z = StandardScaler().fit_transform(X)
pca2 = PCA().fit(Z)
for i in [0, 1]:
    load = pd.Series(pca2.components_[i], index=feature_names)
    top = load.reindex(load.abs().sort_values(ascending=False).index)[:6]
    print(f"PC{i + 1} ({pca2.explained_variance_ratio_[i]:.1%} of variance)  "
          f"| loadings with the same sign: {max((load > 0).sum(), (load < 0).sum())} of 30")
    print(top.round(3).to_string(), "\\n")

scores = pca2.transform(Z)[:, :2]
fig, ax = plt.subplots(figsize=(5.5, 4.5))
for lab, col, name in [(0, "#4a90c2", "benign"), (1, "#c8102e", "malignant")]:
    ax.scatter(scores[y == lab, 0], scores[y == lab, 1], s=8, alpha=0.6, c=col, label=name)
ax.set(xlabel="PC1", ylabel="PC2", title="WDBC projected on PC1 and PC2"); ax.legend()
plt.show()"""),
("md", """**Predict first.** If you run PCA on the **unscaled** features, what share of the
variance do you expect PC1 to take, and which feature will dominate it? (Look at the units:
`worst area` is in square pixels, `mean smoothness` is a small dimensionless number.)

**Your task.** Fit `PCA()` on the unscaled `X`. Print PC1's share of the variance and the
feature with the largest absolute loading on PC1. Then print the standard deviations of
`worst area` and `mean smoothness`."""),
("answer", "*(Prediction.)*", "*(Predictions vary.)*"),
("task", STUDENT_CODE, """pca_raw = PCA().fit(X)
print("unscaled PC1 share:", pca_raw.explained_variance_ratio_[0].round(3))
print("dominant feature:", feature_names[np.argmax(np.abs(pca_raw.components_[0]))])
sd = pd.DataFrame(X, columns=feature_names).std()
print("sd of worst area:", sd["worst area"].round(1), "| sd of mean smoothness:", sd["mean smoothness"].round(4))"""),
("md", """**Question 3.1.** All 30 loadings of PC1 have the same sign. Describe in words what a
case with a high score on PC1 looks like (use the features with the largest loadings), and
relate it to what a pathologist looks for in a malignant nucleus.

**Question 3.2.** PC2 contrasts the fractal-dimension features with the size features. What
kind of variation does it describe, and does it separate the two diagnoses in the plot?

**Question 3.3.** Explain the unscaled result. When would PCA on unscaled data be the right
choice?"""),
("answer", f"""**3.1.** PC1 is a weighted *average* of all 30 features, led by
{', '.join(k for k, _ in W['pc1_top'][:4])}. A high score means a nucleus that is
larger and has a more irregular, indented contour (more and deeper concavities, less
compact). Enlarged nuclei with irregular outlines are classic features of malignancy, and
in the plot malignant cases lie mostly at one end of PC1. PC1 is a "size and irregularity"
axis; it was found without the labels.

**3.2.** PC2 sets the fractal-dimension features ({W['pc2_top'][0][0]}, {W['pc2_top'][1][0]})
against size ({W['pc2_top'][3][0]}, {W['pc2_top'][5][0]}): it describes contour *complexity
relative to size*, which is largely independent of PC1. In the plot the two diagnoses
overlap almost completely along PC2. High variance does not mean diagnostic: PC2 carries
{pct(W['evr'][1])} of the variance but little of the class signal.

**3.3.** Unscaled, PC1 takes {pct(W['unscaled_pc1_share'])} of the variance and is dominated by
`{W['unscaled_pc1_top_feature']}`, whose standard deviation ({W['worst_area_sd']:.0f}) is
tens of thousands of times that of mean smoothness ({W['smoothness_sd']:.4f}). PCA maximises
variance, and variance depends on units, so unscaled PCA ranks features by their units.
Unscaled PCA is right only when all features share a unit and their variances are
comparable on purpose, for example log-expression values of genes measured on one
platform, where a gene that varies more *should* count more."""),
("teach", """*Point to make:* "PCA is unsupervised" means the components were found
without the diagnosis; it does not mean they are unrelated to it. *Common mistakes:*
interpreting the sign of PC1 as meaningful; claiming PC2 "is" fractal dimension (it is a
contrast). *Alternative defensible answer for 3.3:* robust scaling, or log-transforming
area before standardising, are reasonable if students argue for them."""),
("md", """### Seeing versus measuring: t-SNE (provided)

t-SNE is a *neighbour embedding*: it places points in two dimensions so that each point's
nearest neighbours in the original space stay near it. It does not preserve distances
between groups, and its picture depends on a tuning parameter (`perplexity`) and on the
random seed. The cell runs it twice on the standardised data (about 20 seconds)."""),
("code", """Z = StandardScaler().fit_transform(X)
fig, ax = plt.subplots(1, 2, figsize=(11, 4.4))
for a, perp in zip(ax, [5, 50]):
    emb = TSNE(n_components=2, perplexity=perp, init="pca", random_state=SEED).fit_transform(Z)
    for lab, col, name in [(0, "#4a90c2", "benign"), (1, "#c8102e", "malignant")]:
        a.scatter(emb[y == lab, 0], emb[y == lab, 1], s=6, alpha=0.6, c=col, label=name)
    a.set(title=f"t-SNE, perplexity {perp}", xticks=[], yticks=[])
ax[0].legend(); plt.tight_layout(); plt.show()"""),
("md", """**Question 3.4.** Compare the two t-SNE plots with each other and with the PCA plot.
Which of the following can you read from a t-SNE plot: (a) which cases are similar to
which; (b) how far apart the two groups are; (c) how large or spread out each group is;
(d) how many groups there are? Why do the axes have no units?"""),
("answer", """**3.4.** (a) Roughly yes: t-SNE is built to keep local neighbourhoods. (b) No:
between-group distances are not preserved, and the gap changes with perplexity. (c) No:
t-SNE tends to equalise densities, so the size and spread of a group in the plot do not
reflect its size or spread in the data. (d) Not reliably: a low perplexity breaks the data into strings and small clumps that are
not real groups (compare the left plot with the right). The axes have no
units because the coordinates are an arbitrary arrangement optimised for neighbourhoods,
not a projection; rotating or reflecting the picture changes nothing. PCA axes *are*
interpretable (loadings, explained variance), but PCA is linear and can hide non-linear
structure. Use t-SNE (or UMAP) to look and form hypotheses; never measure from it."""),
("teach", """*Runtime:* t-SNE on 569 points takes 5–20 s per run. Results can differ
slightly between scikit-learn versions; the qualitative point does not. *Discussion prompt:*
"A published UMAP shows two well-separated blobs of patients. List three non-biological
explanations" (batch, sequencing depth, a preprocessing choice), the Think Like a Scientist
question on the Week 7 page."""),

("md", """---
## Task 4 — How many components does the model need? (about 12 minutes)

Now PCA feeds a classifier, so it goes **inside the pipeline**, where cross-validation refits
the scaler and the PCA on each training fold.

**Your task.** For each `k` in `[1, 2, 3, 5, 7, 10, 15, 20, 30]`, cross-validate
`make_pipeline(StandardScaler(), PCA(n_components=k, random_state=SEED), LogisticRegression(max_iter=5000))` on
`X_train, y_train` with `cv_scores(..., metrics=("roc_auc", "accuracy"))`. Add one row for
logistic regression on all 30 standardised features (no PCA). Store the results in a
DataFrame `curve` indexed by `k`, plot mean ROC AUC against `k` with the all-features value
as a horizontal line, and print the table.

Then choose `k` with the **one-standard-error rule**: take the best mean ROC AUC, compute its
standard error (`roc_auc_sd / sqrt(5)`), and choose the *smallest* `k` whose mean ROC AUC is
within one standard error of the best. Store it as `k_chosen`."""),
("task", STUDENT_CODE, """ks = [1, 2, 3, 5, 7, 10, 15, 20, 30]
rows = {}
for k in ks:
    pipe = make_pipeline(StandardScaler(), PCA(n_components=k, random_state=SEED), LogisticRegression(max_iter=5000))
    rows[k] = cv_scores(pipe, X_train, y_train, metrics=("roc_auc", "accuracy"))
full = make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000))
rows["all 30 features"] = cv_scores(full, X_train, y_train, metrics=("roc_auc", "accuracy"))
curve = pd.DataFrame(rows).T
display(curve.round(4))

fig, ax = plt.subplots(figsize=(6, 3.8))
ax.errorbar(ks, curve.loc[ks, "roc_auc"], yerr=curve.loc[ks, "roc_auc_sd"], marker="o", capsize=3)
ax.axhline(curve.loc["all 30 features", "roc_auc"], color="grey", ls="--", label="all 30 features")
ax.set(xscale="log", xticks=ks, xticklabels=ks, xlabel="number of components k",
       ylabel="mean CV ROC AUC", title="Components vs performance (training rows, 5-fold CV)")
ax.legend(); plt.show()

best = curve.loc[ks, "roc_auc"].max()
best_k = curve.loc[ks, "roc_auc"].idxmax()
se = curve.loc[best_k, "roc_auc_sd"] / np.sqrt(5)
k_chosen = next(k for k in ks if curve.loc[k, "roc_auc"] >= best - se)
print(f"best k = {best_k} (ROC AUC {best:.4f}), one SE = {se:.4f}, chosen k = {k_chosen}")"""),
("md", """**Question 4.1.** Where is the "knee" of the curve? How does the best PCA pipeline
compare with all 30 features, given the standard deviations across folds?

**Question 4.2.** Which `k` does the one-standard-error rule choose, and why prefer the
smallest adequate `k` over the single best mean?

**Question 4.3.** A colleague fits the scaler and PCA on all 569 cases *before* splitting,
then cross-validates only the logistic regression. Is that leakage? On WDBC the effect is
tiny. Why would it be much larger on a dataset with 20,000 features and 100 cases, or if the
reduction step used the labels?"""),
("answer", f"""**4.1.** ROC AUC rises steeply from k = 1 ({f3(W['curve']['1']['roc_auc'])}) to k = 2
({f3(W['curve']['2']['roc_auc'])}) and levels off by k = 5 ({f3(W['curve']['5']['roc_auc'])});
beyond that every value is within about 0.003 of all 30 features
({f3(W['curve']['all 30 features']['roc_auc'])}), much less than the fold-to-fold standard deviation
(about {W['curve']['5']['roc_auc_sd']:.3f}). Five components retain essentially all the
discriminative information of 30 features. (Accuracy is noisier: with about 80 validation
cases per fold, one case is more than 1%.)

**4.2.** The best mean is at k = {W['one_se']['best_k']}, standard error {W['one_se']['se']:.4f}; the
smallest k within one standard error is k = {K}. Differences smaller than the standard error
are not evidence; among models we cannot tell apart, the simpler one has fewer parameters,
is easier to interpret and is less likely to have been chosen for noise.

**4.3.** Yes, in principle: the scaler and PCA saw the validation folds (and the test set),
so the evaluation is no longer of a procedure applied to unseen data. Here the effect is
negligible (CV ROC AUC {f3(W['pca_before_split_cv_roc_auc'])} with PCA fitted on everything,
versus {f3(W['curve'][str(K)]['roc_auc'])} inside the pipeline), because PCA does not use the
labels and 569 cases estimate 30 variances well. With 20,000 features and 100 cases the
components are estimated poorly and fitted to the very cases being evaluated; and if the
reduction is supervised (for example selecting genes by their association with the
outcome), leakage produces large, spurious accuracy (Ambroise & McLachlan 2002, Week 3).
The rule is about the procedure, not the size of the effect on one dataset."""),
("teach", """*Common mistakes:* calling `PCA().fit` on `X_train` once outside the loop
and then cross-validating on the transformed data (that is the leak in 4.3, in a milder
form); choosing k by the test set. *Alternative defensible answers:* choosing k by
explained variance (90% → 7) is acceptable if students say it is not a performance
criterion; choosing all 30 features is defensible ("PCA gains nothing here"). Grade the
argument. *Note:* `roc_auc_sd` is the standard deviation across the 5 folds; the one-SE
rule divides it by √5."""),

("md", f"""---
## Task 5 — One honest number for Part A (about 5 minutes)

**Your task.** Fit two pre-specified pipelines on the training rows: PCA with your
`k_chosen` components followed by logistic regression, and logistic regression on all 30
standardised features. Evaluate each **once** on `X_test`: report accuracy, ROC AUC and the
number of misclassified cases. Store the results in a DataFrame `test_a`."""),
("task", STUDENT_CODE, """test_rows = {}
for name, pipe in [(f"PCA {k_chosen}", make_pipeline(StandardScaler(), PCA(n_components=k_chosen, random_state=SEED),
                                                     LogisticRegression(max_iter=5000))),
                   ("all 30 features", make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000)))]:
    pipe.fit(X_train, y_train)
    pred, prob = pipe.predict(X_test), pipe.predict_proba(X_test)[:, 1]
    test_rows[name] = {"accuracy": accuracy_score(y_test, pred), "roc_auc": roc_auc_score(y_test, prob),
                       "errors": int((pred != y_test).sum())}
test_a = pd.DataFrame(test_rows).T
display(test_a.round(4))"""),
("md", """**Question 5.1.** Which pipeline did better on the test set, and by how many cases?
Is that difference evidence that PCA *improves* the model? What would you report?"""),
("answer", f"""**5.1.** On the {W['split']['test']} test cases, PCA with {K} components made
{W['test'][f'PCA {K}']['errors']} errors (accuracy {f3(W['test'][f'PCA {K}']['accuracy'])}, ROC AUC
{f3(W['test'][f'PCA {K}']['roc_auc'])}) and all 30 features made
{W['test']['all 30 features']['errors']} (accuracy {f3(W['test']['all 30 features']['accuracy'])},
ROC AUC {f3(W['test']['all 30 features']['roc_auc'])}). A difference of
{W['test']['all 30 features']['errors'] - W['test'][f'PCA {K}']['errors']} cases out of
{W['split']['test']} is well within chance, and cross-validation found the two
indistinguishable. Report that a {K}-component representation performs as well as 30
features (with both numbers), not that PCA is better. The honest gain is simplicity:
{K} decorrelated inputs, and a two-dimensional view that shows most of the class structure."""),
("teach", """*Point to make:* this is the Week 3 protocol, unchanged: decide on the
training rows, look at the test set once, report both pre-specified models. A student who
"tries a few more k on the test set" has turned the test set into a validation set."""),

# ================================================================== PART B
("md", f"""# Part B — A learned representation of real proteins

---
## Task 6 — Meet the proteins (about 10 minutes)

**The biology in two paragraphs.** *Integral membrane proteins* (receptors, channels,
transporters) cross the lipid bilayer, usually as α-helices of roughly 20 mostly hydrophobic
residues; about a quarter of human proteins are of this kind. A *signal peptide* is a short
stretch (typically 15–30 residues) at the **N-terminus** of a protein, with a hydrophobic
core, that directs the protein into the secretory pathway; it is usually cut off. Secreted
proteins (hormones, antibodies, digestive enzymes) and many membrane proteins carry one.

**The data.** One row per protein. `sequence` is the amino-acid sequence (one letter per
residue); `is_transmembrane` and `has_signal_peptide` come from the UniProt keywords
Transmembrane (KW-0812) and Signal (KW-0732); `tm_evidence` and `sp_evidence` record the
strongest evidence behind the annotated feature; `uniref50` is the protein's cluster of
sequences sharing at least 50% identity. `shuffled_sequence` is the same protein with its
residues randomly permuted: identical amino-acid composition, order destroyed (used in
Task 9).

The provided cell loads the table and makes the one split used in Part B (25% test,
stratified on both labels together, `SEED = 42`)."""),
("code", """prot = pd.read_csv(DATA / "swissprot_human_2000.csv")
print(prot.shape, "| one protein per UniRef50 cluster:", prot.uniref50.is_unique)
display(prot[["accession", "protein_name", "length", "is_transmembrane", "has_signal_peptide",
              "tm_evidence", "sp_evidence"]].head())
display(pd.crosstab(prot.is_transmembrane, prot.has_signal_peptide, margins=True))
display(pd.concat({"transmembrane": prot.loc[prot.is_transmembrane == 1, "tm_evidence"].value_counts(),
                   "signal peptide": prot.loc[prot.has_signal_peptide == 1, "sp_evidence"].value_counts()},
                  axis=1).fillna(0).astype(int))

y_tm = prot.is_transmembrane.values
y_sp = prot.has_signal_peptide.values
idx_train, idx_test = train_test_split(np.arange(len(prot)), test_size=0.25,
                                       stratify=2 * y_tm + y_sp, random_state=SEED)
print("train", len(idx_train), "| test", len(idx_test))"""),
("md", """**Your task.** Write a function `composition(seqs)` that returns an array with one row
per sequence and 20 columns: the fraction of each amino acid in the order
`AA = "ACDEFGHIKLMNPQRSTVWY"`. Build `C = composition(prot.sequence)`, check that every row
sums to 1, and print `C.shape`. This is the classic hand-engineered protein representation
(Nakashima & Nishikawa used it in 1994 to tell intracellular from extracellular proteins)."""),
("task", STUDENT_CODE, """AA = "ACDEFGHIKLMNPQRSTVWY"

def composition(seqs):
    return np.array([[s.count(a) / len(s) for a in AA] for s in seqs])

C = composition(prot.sequence)
assert np.allclose(C.sum(axis=1), 1)
print(C.shape)"""),
("md", """**Question 6.1.** Why does the dataset keep only one protein per UniRef50 cluster? What
would go wrong in the evaluation if close homologues (say 90% identical paralogues) could
fall on both sides of the split?

**Question 6.2.** Look at the evidence table. What fraction of the transmembrane labels rest
on "sequence analysis" rather than experiment? UniProt annotates a predicted signal peptide
when at least two of Phobius, Predotar, SignalP and TargetP agree, and annotates predicted
transmembrane regions when several tools agree and the prediction fits the protein's
function. What does that imply about what a classifier trained on these labels learns?"""),
("answer", f"""**6.1.** Homologous proteins have similar sequences, similar embeddings and usually the
same annotation. If near-copies sat in both training and test sets, the test would partly
measure recognition of a relative already seen in training, not generalisation to a new
protein, and the score would be optimistic, more so for a flexible representation that can
memorise fine sequence detail. One per UniRef50 cluster means no two proteins in the set
share a 50%-identity cluster. This is the protein version of the Week 3 grouped split.
(It is not a complete guarantee: proteins in different clusters can still be distant
homologues; the olfactory receptors in Task 7 are an example.)

**6.2.** {ev_tm.get('sequence analysis', 0)} of {P['tm']} transmembrane labels
({pct(ev_tm.get('sequence analysis', 0) / P['tm'], 0)}) and {ev_sp.get('sequence analysis', 0)} of
{P['sp']} signal-peptide labels ({pct(ev_sp.get('sequence analysis', 0) / P['sp'], 0)}) carry the
"sequence analysis" evidence code. UniProt also uses that code for the *boundaries* of
transmembrane regions whose existence is supported experimentally, so it does not mean
"unverified" in every case; but a substantial share of these labels were produced by
sequence-based prediction tools and accepted by curators. A classifier trained on them is
partly learning to **reproduce those tools**, and its "accuracy" is agreement with them, not
with experiment. That does not make the exercise useless (the tools encode real biology, and
curators check them), but it limits what a high score can claim: you cannot use these
labels to show that a model *discovers* anything the tools did not already encode."""),
("teach", """*Point to make:* label provenance is part of data provenance (Week 6). This is
the most important limitation of Part B and students rarely think of it unprompted.
*Common mistake on 6.1:* "duplicates make the model overfit". The issue is the
*evaluation*, not the fit."""),

("md", f"""---
## Task 7 — The geometry of a learned representation (about 12 minutes)

**How the embedding was made.** Each sequence was given to ESM-2 (6 layers, 8 million
parameters), a transformer trained by its authors to predict masked amino acids in tens of
millions of UniRef sequences; **no labels were involved in that pretraining, or in computing
these vectors.** For a protein of length L the model outputs one 320-dimensional vector per
residue; averaging them (mean pooling) gives one vector per protein, whatever its length.

The provided cell loads the embeddings of the real and of the shuffled sequences, aligned
row by row with `prot`, and defines a function for the **mean cosine similarity** between all
pairs of rows (1 = all vectors point the same way, 0 = unrelated directions on average)."""),
("code", """def load_embedding(name):
    e = pd.read_csv(DATA / name).set_index("accession").loc[prot.accession]
    return e.values

E = load_embedding("esm2_t6_8M_embeddings.csv.gz")
E_shuf = load_embedding("esm2_t6_8M_embeddings_shuffled.csv.gz")
print("E:", E.shape, "| E_shuf:", E_shuf.shape)


def mean_cosine(M):
    U = M / np.linalg.norm(M, axis=1, keepdims=True)
    S = U @ U.T
    n = len(M)
    return (S.sum() - n) / (n * (n - 1))"""),
("md", """**Predict first.** Pick two unrelated proteins, say a membrane transporter and a nuclear
transcription factor. What cosine similarity do you expect between their embeddings?

**Your task.**
1. Print the mean cosine similarity of `E`, and of `E` after **centring** (subtracting the
   mean vector, `E - E.mean(axis=0)`). Do the same for the composition matrix `C`.
2. Fit `PCA()` to `E` and to standardised `C`. Print PC1's share of the variance for `E`,
   and how many components each needs to reach 90% of the variance.
3. Plot PC1 against PC2 of `E` twice, side by side, coloured by `y_tm` and by `y_sp`."""),
("answer", "*(Prediction.)*", "*(Predictions vary; most students guess near 0.)*"),
("task", STUDENT_CODE, """print("mean cosine, E raw:", round(mean_cosine(E), 3), "| centred:", round(mean_cosine(E - E.mean(0)), 3))
print("mean cosine, C raw:", round(mean_cosine(C), 3), "| centred:", round(mean_cosine(C - C.mean(0)), 3))

pca_e = PCA().fit(E)
pca_c = PCA().fit(StandardScaler().fit_transform(C))
k90 = lambda p: np.searchsorted(np.cumsum(p.explained_variance_ratio_), 0.9) + 1
print("E: PC1 share", pca_e.explained_variance_ratio_[0].round(3), "| components for 90%:", k90(pca_e), "of", E.shape[1])
print("C: components for 90%:", k90(pca_c), "of", C.shape[1])

pcs = pca_e.transform(E)[:, :2]
fig, ax = plt.subplots(1, 2, figsize=(11, 4.4))
for a, lab, title in [(ax[0], y_tm, "transmembrane"), (ax[1], y_sp, "signal peptide")]:
    a.scatter(pcs[lab == 0, 0], pcs[lab == 0, 1], s=5, alpha=0.4, c="#9aa5b1", label="no")
    a.scatter(pcs[lab == 1, 0], pcs[lab == 1, 1], s=5, alpha=0.6, c="#c8102e", label="yes")
    a.set(xlabel="PC1", ylabel="PC2", title=f"ESM-2 embedding, coloured by {title}")
    a.legend(markerscale=3)
plt.tight_layout(); plt.show()"""),
("md", """**Question 7.1.** What is the mean cosine similarity of the raw embeddings, and what
happens after centring? Explain what *anisotropy* means and why it matters if you use
cosine similarity to find "similar proteins".

**Question 7.2.** The raw composition vectors have a high mean cosine too. What does that
tell you about interpreting a raw cosine similarity, whatever the representation?

**Question 7.3.** How many dimensions does the embedding need for 90% of its variance? Do the
two labels separate in the PC1–PC2 plot? Does that tell you how well a classifier using all
320 dimensions will do?"""),
("answer", f"""**7.1.** Raw: {G['mean_cosine_raw']:.2f}. Two unrelated proteins point in almost the
same direction, because every embedding shares a large common component (the mean vector
has norm {G['emb_mean_vector_norm']:.1f}, while a typical embedding has norm
{G['emb_norm_mean']:.1f}). After centring, the mean cosine is {G['mean_cosine_centred']:.3f}.
*Anisotropy* means the vectors occupy a narrow cone rather than spreading in all directions,
which is common in language-model embeddings. Raw cosine similarities are then all high and
compressed together, so a threshold such as "cosine > 0.8 means similar" is meaningless, and
nearest-neighbour rankings are dominated by the shared direction. Centring (and often
standardising) before measuring similarity is the usual remedy; we return to this with k-NN
in Week 8.

**7.2.** Composition vectors are all non-negative and dominated by the common amino acids, so
they also share one large direction (raw {G['mean_cosine_composition']:.2f}, centred
{G['mean_cosine_composition_centred']:.3f}). A high raw cosine is not a special property of
neural embeddings: any representation with a large shared mean has it. Always ask "similar
compared with what?" and centre before interpreting.

**7.3.** PC1 carries {pct(G['emb_pc1_share'])} of the variance; {G['emb_k90']} of 320
dimensions are needed for 90% (composition: {G['comp_k90_standardised']} of 20). The
embedding is genuinely high-dimensional, though far from using all 320 directions.
Transmembrane proteins lean towards one side of PC2 (PC2 correlates with mean hydropathy,
|r| = {G['corr_pc2_gravy']:.2f}), and the isolated group at the far end of PC1 is
{G['pc1_far_tail']['n']} proteins, all transmembrane, {G['pc1_far_tail']['olfactory_receptors']} of
them olfactory receptors: a protein family the model grouped without ever being told about
families (each is from a different UniRef50 cluster). Signal-peptide proteins overlap much
more.
A two-dimensional projection holds a fraction of the information; a classifier using all 320
dimensions can do much better than the picture suggests (Task 8). Look in two
dimensions; model in all of them."""),
("teach", """*Point to make:* the prediction exercise reliably surprises students
(most guess ~0). *Common mistake:* concluding from 7.2 that composition and ESM-2 are "equally
anisotropic, so equivalent". The point is about the measure, not the representations.
*Extra if time:* PC2 vs GRAVY (mean Kyte–Doolittle hydropathy) is a nice
"what has the model learned without labels" moment."""),

("md", f"""---
## Task 8 — One classifier, four representations (about 15 minutes)

A **linear probe** asks how much of a property can be read off a representation by a simple,
fixed classifier. Everything except the representation is held constant: the same pipeline
(`StandardScaler` → `LogisticRegression(max_iter=5000)`), the same training rows, the same
5-fold CV, the same metrics. Any difference is due to the representation.

The four representations:
- **length only** (`np.log(prot.length)`, one column): a baseline that knows nothing about
  the sequence except its size;
- **composition** (`C`, 20 columns): what a biologist would compute first;
- **ESM-2** (`E`, 320 columns): the learned representation;
- **ESM-2 on shuffled sequences** (`E_shuf`, 320 columns): the same model given the same
  residues in random order (Task 9 explains why).

**Predict first.** For each task (transmembrane, signal peptide), rank the four
representations by the ROC AUC you expect."""),
("answer", "*(Prediction.)*", "*(Predictions vary.)*"),
("md", """**Your task.** For each task and each representation, run `cv_scores` on the training
rows only (`M[idx_train]`, `y[idx_train]`). Collect mean ROC AUC, its standard deviation and
mean average precision into a DataFrame `probe` with one row per representation and
columns grouped by task. Print the training prevalence of each label (the average
precision of a random ranking)."""),
("task", STUDENT_CODE, """L = np.log(prot.length.values)[:, None]
reps = {"length only": L, "composition (20)": C, "ESM-2 (320)": E,
        "ESM-2 on shuffled sequences (320)": E_shuf}
probe_model = lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000))
results = {}
for task, yv in [("transmembrane", y_tm), ("signal_peptide", y_sp)]:
    for name, M in reps.items():
        s = cv_scores(probe_model(), M[idx_train], yv[idx_train])
        results[(task, name)] = {"roc_auc": s["roc_auc"], "roc_auc_sd": s["roc_auc_sd"],
                                 "average_precision": s["average_precision"]}
    print(task, "training prevalence:", yv[idx_train].mean().round(3))
probe = pd.DataFrame(results).T.unstack(0).swaplevel(axis=1).sort_index(axis=1)
display(probe.round(3))"""),
("md", """**Question 8.1.** Describe the table. Which representation wins each task, and by how
much relative to the fold-to-fold standard deviation? How does each compare with the
length-only baseline?

**Question 8.2.** Composition does much better on one task than on the other. Using the
biology at the start of Task 6, explain why."""),
("answer", f"""**8.1.** Mean CV ROC AUC (training rows):

| representation | transmembrane | signal peptide |
|---|---|---|
| length only | {f3(TM[LEN]['roc_auc'])} | {f3(SPP[LEN]['roc_auc'])} |
| composition (20) | {f3(TM[COMP]['roc_auc'])} | {f3(SPP[COMP]['roc_auc'])} |
| ESM-2 (320) | {f3(TM[ESM]['roc_auc'])} | {f3(SPP[ESM]['roc_auc'])} |
| ESM-2, shuffled sequences | {f3(TM[SHUF]['roc_auc'])} | {f3(SPP[SHUF]['roc_auc'])} |

Length alone is at chance for both tasks. ESM-2 is best for both, and by a margin many times
the fold-to-fold standard deviation (about {TM[ESM]['roc_auc_sd']:.2f}–{SPP[COMP]['roc_auc_sd']:.2f}).
Average precision tells the same story more sharply, because the classes are imbalanced
(training prevalence {pct(TM['prevalence_train'], 0)} and {pct(SPP['prevalence_train'], 0)}):
for signal peptides composition reaches {f3(SPP[COMP]['average_precision'])} and ESM-2
{f3(SPP[ESM]['average_precision'])}.

**8.2.** Membrane proteins are enriched in hydrophobic residues throughout their
membrane-spanning helices, so whole-protein composition carries a real signal
({f3(TM[COMP]['roc_auc'])}). A signal peptide is about 20 residues at one end of a protein that
is typically hundreds of residues long ({P['length']['median']:.0f} median here): its
hydrophobic core barely changes the whole-protein composition, so composition is much weaker
({f3(SPP[COMP]['roc_auc'])}). What matters for a signal peptide is *where* the hydrophobic
residues are, and composition discards position."""),
("teach", f"""*Runtime:* about 20–40 s (the 320-column fits dominate). *Common mistakes:*
fitting the scaler on all rows before cross-validating; comparing representations with
different classifiers or different folds; reading "ESM-2 wins" as the conclusion. Push for
*why*. *Note:* AP for a random ranking equals prevalence ({pct(TM['prevalence_train'], 1)} /
{pct(SPP['prevalence_train'], 1)}), which is the AP baseline."""),

("md", """---
## Task 9 — What is the embedding seeing? (about 10 minutes)

Look again at the fourth row of your table. The shuffled sequences have **exactly** the
composition of the real ones, so ESM-2 on shuffled sequences can only use composition (and
length). This is a **control experiment**: it removes one property (residue order) and keeps
everything else.

Biochemists have described the order-dependent signals for decades. The provided cell
builds two engineered features from the Kyte–Doolittle hydropathy scale (1982):
- **max window hydropathy**: the highest average hydropathy of any 19 consecutive residues
  (a membrane-spanning helix is a long hydrophobic stretch);
- **N-terminal hydropathy**: the average hydropathy of the first 25 residues (where a signal
  peptide's hydrophobic core sits)."""),
("code", """KD = {"A": 1.8, "R": -4.5, "N": -3.5, "D": -3.5, "C": 2.5, "Q": -3.5, "E": -3.5, "G": -0.4,
      "H": -3.2, "I": 4.5, "L": 3.8, "K": -3.9, "M": 1.9, "F": 2.8, "P": -1.6, "S": -0.8,
      "T": -0.7, "W": -0.9, "Y": -1.3, "V": 4.2}          # Kyte & Doolittle (1982)


def max_window_hydropathy(seq, w=19):
    h = np.array([KD[a] for a in seq])
    return np.convolve(h, np.ones(w) / w, mode="valid").max()


def nterm_hydropathy(seq, n=25):
    return np.mean([KD[a] for a in seq[:n]])


H = np.array([[max_window_hydropathy(s), nterm_hydropathy(s)] for s in prot.sequence])
print(H.shape, "| first protein:", H[0].round(2))"""),
("md", """**Your task.** Build `CH = np.hstack([C, H])` and cross-validate the same probe on `CH`
(composition plus the two hydropathy features) for both tasks, exactly as in Task 8, and add the results to `probe`
as a fifth row named `"composition + 2 hydropathy features (22)"`. Display the updated
table."""),
("task", STUDENT_CODE, """CH = np.hstack([C, H])
for task, yv in [("transmembrane", y_tm), ("signal_peptide", y_sp)]:
    s = cv_scores(probe_model(), CH[idx_train], yv[idx_train])
    for m in ["roc_auc", "roc_auc_sd", "average_precision"]:
        probe.loc["composition + 2 hydropathy features (22)", (task, m)] = s[m]
display(probe.round(3))"""),
("md", """**Question 9.1.** What happens to ESM-2's advantage when the residues are shuffled?
What does that tell you about *what* the embedding contributes for these two tasks?

**Question 9.2.** How does composition plus two hand-engineered features compare with ESM-2
on each task? What does this say about the module's question, "what is the simplest
appropriate approach, and what evidence do you have that it is appropriate"?

**Question 9.3.** Recall Question 6.2. Several of the tools UniProt relies on for predicted
annotations look for exactly these hydrophobic patterns. How should that change the way you
describe your results in 9.2?"""),
("answer", f"""**9.1.** Shuffling removes the advantage almost completely: transmembrane
{f3(TM[ESM]['roc_auc'])} → {f3(TM[SHUF]['roc_auc'])}, signal peptide {f3(SPP[ESM]['roc_auc'])} →
{f3(SPP[SHUF]['roc_auc'])}, which is close to composition alone ({f3(TM[COMP]['roc_auc'])} and
{f3(SPP[COMP]['roc_auc'])}). The model is the same and the residues are the same; only their
order differs. So for these tasks what ESM-2 adds over composition is information about
**residue order**: contiguous hydrophobic stretches and where they occur. It was never told
about membranes or signal peptides; it learned order-dependent patterns from unlabelled
sequences, and mean pooling preserved enough of them for a linear classifier to read.

**9.2.** Transmembrane: composition plus two features reaches {f3(TM[HYD]['roc_auc'])}, matching
ESM-2 ({f3(TM[ESM]['roc_auc'])}) with 22 interpretable numbers instead of 320 learned ones.
Signal peptide: {f3(SPP[HYD]['roc_auc'])}, closing most of the gap from composition
({f3(SPP[COMP]['roc_auc'])}) but still below ESM-2 ({f3(SPP[ESM]['roc_auc'])}; average precision
{f3(SPP[HYD]['average_precision'])} vs {f3(SPP[ESM]['average_precision'])}). A signal peptide has
more structure than one hydropathy average (a positively charged n-region, a hydrophobic
h-region, a cleavage-site motif), and the embedding captures more of it than our crude
feature. The honest conclusion is task-dependent: for transmembrane detection the simple,
interpretable representation is sufficient and should be preferred; for signal peptides the
learned representation earns its cost. That is the module's question answered with evidence,
not "the foundation model is better".

**9.3.** Our labels are partly the output of sequence-analysis tools that use hydropathy
patterns. Agreement between our engineered features and those labels is therefore partly
circular: we may be re-deriving the annotation rule rather than discovering biology. The
safe wording is "these representations reproduce UniProt's annotations to this degree";
claims about biological function would need labels from experiment (only
{ev_tm.get('experimental', 0)} transmembrane and {ev_sp.get('experimental', 0)} signal-peptide labels
here are experimental, too few for a separate evaluation)."""),
("teach", """*This is the conceptual centre of the lab.* Make sure every group reaches 9.1
before leaving. *Common mistakes:* "shuffling breaks the model" (the model works fine; the
information is gone); "the embedding understands membranes" (it captures sequence patterns
correlated with them). *Alternative defensible approaches:* a sliding-window composition,
or the position of the most hydrophobic window, are good student ideas; TMHMM-style HMMs are
the classical tool. *Link:* SignalP 6.0 (2022) itself uses a protein language model, so
modern annotation pipelines and our "learned" representation are converging."""),

("md", """---
## Task 10 — One honest number for Part B (about 5 minutes)

**Your task.** For each task, fit the probe on the training rows for three pre-specified
representations (composition, ESM-2, composition + 2 hydropathy features) and evaluate
each **once** on the test rows (`idx_test`): ROC AUC and average precision. Store the
results in a DataFrame `test_b`."""),
("task", STUDENT_CODE, """final = {"composition (20)": C, "ESM-2 (320)": E, "composition + 2 hydropathy features (22)": CH}
rows = {}
for task, yv in [("transmembrane", y_tm), ("signal_peptide", y_sp)]:
    for name, M in final.items():
        model = probe_model().fit(M[idx_train], yv[idx_train])
        p = model.predict_proba(M[idx_test])[:, 1]
        rows[(task, name)] = {"roc_auc": roc_auc_score(yv[idx_test], p),
                              "average_precision": average_precision_score(yv[idx_test], p)}
test_b = pd.DataFrame(rows).T
display(test_b.round(3))"""),
("md", """**Question 10.1.** Do the test results agree with cross-validation? Summarise Part B in
three sentences that a biologist could act on, including one limitation.

**Question 10.2.** ESM-2 was pretrained on UniRef sequences that almost certainly include
these {n} human proteins, test set included. Is that leakage? What exactly did the model see
during pretraining, and what did it not see?""".replace("{n}", f"{P['n']:,}")),
("answer", f"""**10.1.** Yes. Test ROC AUC: transmembrane composition
{f3(PT['transmembrane'][COMP]['roc_auc'])}, ESM-2 {f3(PT['transmembrane'][ESM]['roc_auc'])},
composition + hydropathy {f3(PT['transmembrane'][HYD]['roc_auc'])}; signal peptide
{f3(PT['signal_peptide'][COMP]['roc_auc'])}, {f3(PT['signal_peptide'][ESM]['roc_auc'])} and
{f3(PT['signal_peptide'][HYD]['roc_auc'])}, within a few hundredths of the CV estimates and in the
same order. *Summary:* a frozen ESM-2 embedding with a linear classifier reproduces UniProt's
membrane and signal-peptide annotations of unseen, non-redundant human proteins well (test
ROC AUC about {PT['transmembrane'][ESM]['roc_auc']:.2f} and {PT['signal_peptide'][ESM]['roc_auc']:.2f}),
because it encodes residue order that composition discards. For membrane proteins, two
classical hydropathy features match it and are interpretable. Limitation: most labels come
from sequence-analysis tools, so this measures agreement with annotation, on human proteins
only.

**10.2.** It is not *label* leakage: pretraining used only sequences, never our annotations,
and computing an embedding is a fixed transformation applied to each protein independently,
like computing its composition. But the model has seen these exact sequences, so the test is
not of a protein the model has never encountered: a model that memorised sequences could
perform better on them than on genuinely new proteins (for example from a newly sequenced
organism). This is pretraining-set contamination (Week 3). It matters most when the
claim is "generalises to novel proteins"; it would need a test set of sequences added to
UniProt after the model's training data were collected."""),
("teach", """*Point to make for 10.2:* distinguish label leakage (fatal) from contamination
(a scope limitation). Students often say "yes, leakage" or "no, nothing to worry about";
both are incomplete. *If time is short:* Task 10 can be done as a demonstration; Task 9 is
the one not to skip."""),

("md", """---
## Checkpoint: end of the core lab

You should now have: the explained-variance plots and k for 90% (Task 2); the unscaled-PCA
result and your loading interpretation (Task 3); the components-versus-ROC-AUC curve and
`k_chosen` (Task 4); the Part A test result (Task 5); the anisotropy and PCA results for the
embedding (Task 7); the five-row representation table (Tasks 8–9); and the Part B test
result (Task 10), with every question answered.

The extensions below are optional."""),

# ---------------------------------------------------------------- E1
("md", """## Extension E1 — How much of the embedding does the probe need?

Put PCA *inside* the probe: `make_pipeline(StandardScaler(), PCA(n_components=k, random_state=SEED),
LogisticRegression(max_iter=5000))` on `E` for `k` in `[2, 8, 16, 32, 64, 128]`, for both
tasks (training rows, `cv_scores`). Plot ROC AUC against `k`. How many of the 320 dimensions
does each task need? Compare with your answer to 7.3."""),
("task", STUDENT_CODE, """ks_e = [2, 8, 16, 32, 64, 128]
e1 = {}
for task, yv in [("transmembrane", y_tm), ("signal_peptide", y_sp)]:
    e1[task] = [cv_scores(make_pipeline(StandardScaler(), PCA(n_components=k, random_state=SEED), LogisticRegression(max_iter=5000)),
                          E[idx_train], yv[idx_train])["roc_auc"] for k in ks_e]
e1 = pd.DataFrame(e1, index=ks_e)
ax = e1.plot(marker="o", logx=True, figsize=(6, 3.6), xticks=ks_e,
             title="Probe on the first k principal components of ESM-2")
ax.set(xlabel="k", ylabel="mean CV ROC AUC"); ax.set_xticklabels(ks_e); plt.show()
display(e1.round(3))"""),
("answer", f"""Transmembrane: {', '.join(f'k={k}: {PE["transmembrane"][str(k)]:.3f}' for k in [2, 16, 32])};
signal peptide: {', '.join(f'k={k}: {PE["signal_peptide"][str(k)]:.3f}' for k in [2, 16, 32])}.
`random_state` matters here: with more than 500 rows scikit-learn's PCA uses a randomized
solver for a few components, so an unseeded run can differ in the third decimal.
Two components (the picture) give roughly composition-level performance; about 32 components
recover essentially all of the full embedding's performance for both tasks. The task-relevant
information lives in a few dozen directions, fewer than the {G['emb_k90']} needed for 90% of
the variance: variance and relevance are different things, again. Compressing embeddings
this way is common when storage or downstream model size matters."""),

# ---------------------------------------------------------------- E2
("md", """## Extension E2 — Which membrane proteins does the embedding miss?

The lecture showed the probe's most confident *false positives*. Here you look at the other
kind of error. Using cross-validated predictions on the training rows
(`sklearn.model_selection.cross_val_predict` with `method="predict_proba"`), list the five
**transmembrane** proteins with the *lowest* predicted probability from the ESM-2 probe, with
their length and evidence. Look one or two up on uniprot.org (Subcellular location and
Topology). Then compute the same cross-validated predictions with the composition + 2
hydropathy probe (`CH`) for those five proteins, and their max window hydropathy (`H[:, 0]`).
What do the five have in common, and why might mean pooling miss them?"""),
("task", STUDENT_CODE, """from sklearn.model_selection import cross_val_predict
tr = prot.iloc[idx_train].copy()
tr["p_esm"] = cross_val_predict(probe_model(), E[idx_train], y_tm[idx_train], cv=CV, method="predict_proba")[:, 1]
tr["p_ch"] = cross_val_predict(probe_model(), CH[idx_train], y_tm[idx_train], cv=CV, method="predict_proba")[:, 1]
tr["max_window_hydropathy"] = H[idx_train, 0]
missed = tr[tr.is_transmembrane == 1].nsmallest(5, "p_esm")
display(missed[["accession", "protein_name", "length", "tm_evidence", "p_esm", "p_ch", "max_window_hydropathy"]])
print("median max window hydropathy: transmembrane", np.median(H[y_tm == 1, 0]).round(2),
      "| not transmembrane", np.median(H[y_tm == 0, 0]).round(2))"""),
("answer", """In this run the five are 17-beta-hydroxysteroid dehydrogenase 7 (P56937), LRRC59
(Q96AG4), transmembrane protease serine 12 (Q86WS5), erlin-2 (O94905) and the Bcl-2 family
protein BOK (Q9UMX3), checked on uniprot.org (release 2026_03). **All five are single-pass
proteins**: one helix of about 21 residues (annotated by sequence analysis) in a protein of
212–348 residues that is otherwise a soluble domain. In erlin-2 the helix is at the
N-terminus (residues 4–24; its ER membrane location is experimental); in BOK it is near the
C-terminus (189–209). Mean pooling averages that one segment with roughly 200–330 soluble
residues, so its signal is diluted, and the ESM-2 probe gives probabilities close to 0.
The composition + hydropathy probe ranks them far higher, because its max-window feature is
a *maximum over positions*: one hydrophobic 19-residue stretch is enough (their values,
about 1.8–2.5, are well above the median for non-membrane proteins, about 1.2).

Lessons: how a per-residue representation is pooled into one vector decides what survives
(mean pooling favours properties spread over the protein); the two representations make
*different* errors, which is a reason to inspect errors and not just compare one number;
and per-residue models (TMHMM, or classifiers on per-residue embeddings) exist because
membrane topology is a local property. A student who suggests max pooling or attention
pooling of the ESM-2 residue vectors has found a sensible extension (it would need the
per-residue outputs, which are not in the frozen files)."""),

# ---------------------------------------------------------------- E3
("md", """## Extension E3 — t-SNE of the embedding, and what its picture depends on

Run t-SNE on the standardised embeddings `E` at perplexity 30 twice: once with
`init="pca", random_state=SEED` and once with `init="random", random_state=1`. Colour by
`y_sp` and compare the two pictures with each other and with the PCA plot from Task 7.
Which features of the picture survive the change? Would you report "signal-peptide proteins
form a separate cluster" on this evidence? (About a minute.)"""),
("task", STUDENT_CODE, """Ez = StandardScaler().fit_transform(E)
fig, ax = plt.subplots(1, 2, figsize=(11, 4.4))
for a, (init, rs) in zip(ax, [("pca", SEED), ("random", 1)]):
    t = TSNE(n_components=2, perplexity=30, init=init, random_state=rs).fit_transform(Ez)
    a.scatter(t[y_sp == 0, 0], t[y_sp == 0, 1], s=4, alpha=0.35, c="#9aa5b1", label="no signal peptide")
    a.scatter(t[y_sp == 1, 0], t[y_sp == 1, 1], s=4, alpha=0.7, c="#c8102e", label="signal peptide")
    a.set(title=f"t-SNE of ESM-2, init={init}, random_state={rs}", xticks=[], yticks=[])
ax[0].legend(markerscale=3); plt.tight_layout(); plt.show()"""),
("answer", """With PCA initialisation the layout is reproducible: rerunning with another
seed changes it very little, because the starting positions come from the data. With random
initialisation the global arrangement changes: where the signal-peptide-rich region sits,
which groups are neighbours and the gaps between them all move. What survives both runs is
**local**: signal-peptide proteins tend to have signal-peptide neighbours, and the small
dense family groups (for example the olfactory receptors) stay intact. The plot supports
"signal-peptide proteins tend to be near each other in the embedding" (which the probe in
Task 8 quantifies properly); it does not support "they form a separate cluster", and
nothing about how far they are from other proteins. PCA initialisation is recommended
practice (Kobak & Berens 2019), but a reproducible picture is not thereby a measurement."""),

# ---------------------------------------------------------------- reflection
("md", """## Final reflection

Answer in a short paragraph each.

**R1.** You are given a new biological dataset. Describe how you would decide between (a) the
raw measured features, (b) PCA of those features, and (c) a foundation-model embedding.
What evidence would you collect before choosing?

**R2.** Week 6 asked what pretraining does not fix. After today, add one thing to that list and
one thing pretraining *did* provide here."""),
("answer", f"""**R1.** Start from the question and a baseline. Use the raw features when they are
few, interpretable and well measured (WDBC: PCA gained nothing but simplicity). Use PCA when
features are many and correlated, to summarise, visualise or regularise, fitted inside the
pipeline, with the number of components chosen by cross-validation and the loadings
inspected. Consider an embedding when the raw input (a sequence, an image, a text) has no
obvious fixed-length features or when the task depends on structure that simple features
miss. Evidence: the same classifier and protocol across representations, a simple engineered
baseline, a control that removes the property you think matters (the shuffle), the cost, and
a check that the test data are not in the pretraining corpus.

**R2.** Not fixed: the quality and provenance of the labels (Task 6.2); the model learns
whatever the annotation encodes, including its shortcuts. Provided: a representation of
residue order learned from unlabelled sequences that a linear classifier could use for two
tasks it was never trained on ({f3(SPP[ESM]['roc_auc'])} vs {f3(SPP[COMP]['roc_auc'])} for signal
peptides), at zero labelling cost."""),
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
            if len(c) == 3:                              # a prediction prompt
                out.append(nbformat.v4.new_markdown_cell(c[2] if solutions else c[1]))
            else:
                out.append(nbformat.v4.new_markdown_cell(
                    "**Worked answer.**\n\n" + c[1] if solutions else STUDENT_TEXT))
        elif kind == "teach":                            # instructor notes: solutions only
            if solutions:
                out.append(nbformat.v4.new_markdown_cell("> **Instructor notes.** " + c[1]))
    if solutions:
        first = out[0].source
        first = first.replace("# COMP9085 Week 7 Laboratory",
                              "# COMP9085 Week 07 Lab — Solutions (instructor)", 1)
        first = first.replace(
            "**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**), with\n"
            "every question answered in the markdown cells using your own numbers.",
            "**About this notebook.** Complete code, outputs, plots and worked answers for every\n"
            "task, plus **instructor teaching notes** (common mistakes, alternative defensible\n"
            "choices, what may vary between environments). **Instructor only:** do not\n"
            "distribute with the student files; the `solutions/` folder is gitignored.")
        assert "About this notebook" in first and "Solutions (instructor)" in first
        out[0].source = first
        setup = next(c for c in out if c.cell_type == "code" and 'DATA = Path("data")' in c.source)
        setup.source = setup.source.replace(
            'DATA = Path("data")',
            'DATA = Path("data") if Path("data").exists() else Path("../data")   # run from labs/week07 or solutions/')
    nb.cells = out
    return nb


# Run in the executed solutions notebook, then removed before saving: the
# outputs must agree with week07_numbers.json, which the lecture quotes.
CHECK = """import json, math
_N = json.load(open("../../data/scripts/week07_numbers.json"))
def _eq(a, b, tol=6e-4):
    assert math.isclose(float(a), float(b), abs_tol=tol), (a, b)
_W, _P, _G = _N["wdbc"], _N["proteins"], _N["geometry"]
_eq(y.sum(), _W["malignant"]); _eq(len(y_train), _W["split"]["train"])
_eq(cum[1], _W["cum"][1]); _eq(cum[5], _W["cum"][5]); _eq(np.searchsorted(cum, 0.9) + 1, _W["k90"])
_eq(pca_raw.explained_variance_ratio_[0], _W["unscaled_pc1_share"])
for k, v in _W["curve"].items():
    key = k if k == "all 30 features" else int(k)
    _eq(curve.loc[key, "roc_auc"], v["roc_auc"]); _eq(curve.loc[key, "accuracy"], v["accuracy"])
_eq(k_chosen, _W["one_se"]["chosen_k"])
for name, v in _W["test"].items():
    _eq(test_a.loc[name, "roc_auc"], v["roc_auc"]); _eq(test_a.loc[name, "errors"], v["errors"])
_eq(len(prot), _P["n"]); _eq(y_tm.sum(), _P["tm"]); _eq(y_sp.sum(), _P["sp"])
_eq(len(idx_test), _P["split"]["test"]); _eq(y_sp[idx_test].sum(), _P["split"]["test_sp"])
_eq(mean_cosine(E), _G["mean_cosine_raw"]); _eq(mean_cosine(E - E.mean(0)), _G["mean_cosine_centred"])
_eq(mean_cosine(C), _G["mean_cosine_composition"]); _eq(k90(pca_e), _G["emb_k90"]); _eq(k90(pca_c), _G["comp_k90_standardised"])
for task in ["transmembrane", "signal_peptide"]:
    for name, v in _N["probe_cv"][task].items():
        if name == "prevalence_train":
            continue
        _eq(probe.loc[name, (task, "roc_auc")], v["roc_auc"]); _eq(probe.loc[name, (task, "average_precision")], v["average_precision"])
    for name, v in _N["probe_test"][task].items():
        _eq(test_b.loc[(task, name), "roc_auc"], v["roc_auc"]); _eq(test_b.loc[(task, name), "average_precision"], v["average_precision"])
    for k, v in _N["pca_embedding"][task].items():
        _eq(e1.loc[int(k), task], v)
_rng = np.random.default_rng(SEED)
for d, v in _N["curse"]["by_dimension"].items():
    _Pp = _rng.random((1000, int(d))); _dist = np.linalg.norm(_Pp[1:] - _Pp[0], axis=1)
    _eq((_dist.max() - _dist.min()) / _dist.min(), v["relative_contrast"], 1e-3)
assert (np.sort(C, axis=1) == np.sort(composition(prot.shuffled_sequence), axis=1)).all()
assert set(missed.accession) == {"P56937", "Q96AG4", "Q86WS5", "O94905", "Q9UMX3"}   # E2 answer
assert (missed.p_esm < 0.001).all() and (missed.p_ch > 0.15).all() and (missed.max_window_hydropathy > 1.8).all()
_eq(_G["pc1_far_tail"]["olfactory_receptors"], 20)
print("CHECK PASSED: solutions agree with week07_numbers.json")
"""


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
        assert "Worked answer" not in c.source and "Instructor notes" not in c.source
    nbformat.write(student, os.path.join(OUT, "COMP9085_Week07_Lab.ipynb"))
    html(student, os.path.join(OUT, "COMP9085_Week07_Lab.html"))
    trial = copy.deepcopy(student)
    execute(trial)                           # raises if any provided cell fails on an unfilled notebook
    print("student notebook (unfilled) executed without errors")

    sol = build(True)
    sol.cells.append(nbformat.v4.new_code_cell(CHECK.replace("../../data/scripts", "../../../data/scripts")))
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
