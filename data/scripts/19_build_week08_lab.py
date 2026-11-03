#!/usr/bin/env python3
"""
Week 8 lab: build the student notebook and the instructor solutions notebook from ONE
source, so the two cannot drift apart (as for Weeks 4-7).

Outputs
    labs/week08/COMP9085_Week08_Lab.ipynb                         public, no answers
    labs/week08/COMP9085_Week08_Lab.html                          public, rendered
    labs/week08/solutions/COMP9085_Week08_Lab_Solutions.ipynb     instructor (gitignored)
    labs/week08/solutions/COMP9085_Week08_Lab_Solutions.html      instructor (gitignored)

Data: labs/week08/data/heart_disease_cleveland.csv (frozen by 18_build_week08_data.py).
No network. Both notebooks are EXECUTED here in a fresh kernel:
  * the student notebook, unfilled, must run top to bottom without an error;
  * the solutions notebook must run without an error, and a check cell (run, then removed
    before saving) asserts that its outputs agree with data/scripts/week08_numbers.json,
    the source the lecture and the website quote.

    python3 data/scripts/18_build_week08_data.py     # first, if the numbers changed
    python3 data/scripts/19_build_week08_lab.py      # needs nbformat, nbconvert, ipykernel
"""
import copy
import json
import os

import nbformat
from nbconvert import HTMLExporter
from nbconvert.preprocessors import ExecutePreprocessor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "labs", "week08")
SOL = os.path.join(OUT, "solutions")
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week08_numbers.json")))
H, L = N["heart"], N["lecture"]
C, T = H["chosen"], H["test"]

STUDENT_TEXT = "*Your answer here.*"


def pct(x, d=1):
    return f"{100 * x:.{d}f}%"


def cells():
    k5 = H["k5"]
    return [
("md", f"""# COMP9085 Week 8 Laboratory
## Instance-based learning: k-nearest neighbours on real patients

**Two hours.** This week's model stores the training data and predicts from the most similar
stored cases. You will build k-NN properly on real clinical data and find out, with your own
numbers, which decisions matter: the value of k, the distance metric, how the features are
represented and scaled, and how neighbours are weighted.

**The data.** {H['n']} patients referred to the Cleveland Clinic for coronary angiography
(1981–1984): the **UCI Heart Disease** dataset, Cleveland subset (Janosi, Steinbrunn, Pfisterer
and Detrano, 1988; CC BY 4.0). Each patient has 13 features from routine measurements and
non-invasive tests; the label is whether the angiogram showed significant coronary artery
disease. The frozen copy is in `data/`: `data/README.md` documents every column and
`data/PROVENANCE.json` the source and checksums. **No network is needed.**

**The question.** For a new patient, which past patients are "similar", and can their
diagnoses predict hers? A good answer says *similar in which features, measured how*.

**By the end of this lab you should be able to**
1. explore a mixed clinical dataset and separate continuous features from coded categories;
2. build a k-NN classifier inside a scikit-learn `Pipeline` and explain one prediction from
   its neighbours;
3. show how k, the distance metric, feature representation, scaling and distance weighting
   change the result;
4. select hyperparameters by cross-validation and evaluate once on a held-out test set;
5. judge the strengths, limits and cost of k-NN, and when another model is preferable.

**Time plan.** Tasks 1–2 about 20 min · Tasks 3–5 about 40 min · Tasks 6–8 about 35 min ·
Tasks 9–10 about 25 min. **Tasks 1–10 are the core lab.** Three optional extensions follow the
checkpoint after Task 10.

**How the cells work.** Cells marked *provided* run as they are: read them and run them.
Cells containing `# your code here` are yours. Some tasks ask you to **predict** first: write
the prediction down before running anything. Markdown cells marked *Your answer here* are
for written answers, using your own numbers.

**Rules for the whole lab.** The data are split once, in a provided cell. Every choice is made
with 10-fold cross-validation on the training patients. The test set is used **once**, in
Task 9. Anything that learns from data (imputer, scaler, encoder) sits inside a `Pipeline`.

**The Week 8 page is your interactive companion**
(https://hafli.github.io/comp9085-ml-biology/weeks/week08.html). Its section 10 maps each
task to the exercise that shows the same idea.

**Practice, not assessment.** This lab is not part of Assignment 1 and uses different data.

**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**), with every
question answered in the markdown cells."""),
("md", "### Setup (provided)\n\nRun this cell first."),
("code", """import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, balanced_accuracy_score, classification_report,
                             confusion_matrix, ConfusionMatrixDisplay, roc_auc_score)
from sklearn.model_selection import (train_test_split, StratifiedKFold, cross_val_score,
                                     cross_validate, GridSearchCV)
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.preprocessing import StandardScaler, MinMaxScaler, OneHotEncoder

import sklearn
print("scikit-learn", sklearn.__version__, "| pandas", pd.__version__, "| numpy", np.__version__)

warnings.filterwarnings("ignore", category=FutureWarning)
SEED = 42
CV = StratifiedKFold(n_splits=10, shuffle=True, random_state=SEED)
DATA = Path("data")
pd.set_option("display.precision", 3)"""),

# ------------------------------------------------------------------ Task 1
("md", """## Task 1. The biological problem and the data (about 15 minutes)

Coronary artery disease narrows the arteries that supply the heart muscle. The reference
test, **angiography**, is invasive. The question behind this dataset is whether routine
measurements and non-invasive tests can indicate who has the disease. The features:

| Column | Meaning | Type |
|---|---|---|
| `age` | age (years) | continuous |
| `trestbps` | resting blood pressure (mm Hg) | continuous |
| `chol` | serum cholesterol (mg/dl) | continuous |
| `thalach` | maximum heart rate reached in the exercise test (beats/min) | continuous |
| `oldpeak` | ST-segment depression on exercise relative to rest (mm) | continuous |
| `sex` | 1 = male, 0 = female | binary |
| `cp` | chest-pain type: 1 typical angina, 2 atypical, 3 non-anginal, 4 asymptomatic | categorical (coded 1–4) |
| `fbs` | fasting blood sugar > 120 mg/dl | binary |
| `restecg` | resting ECG: 0 normal, 1 ST-T abnormality, 2 left-ventricular hypertrophy | categorical |
| `exang` | exercise-induced angina | binary |
| `slope` | slope of the peak-exercise ST segment: 1 up, 2 flat, 3 down | categorical |
| `ca` | number of major vessels (0–3) coloured by fluoroscopy | categorical (count) |
| `thal` | thallium scan: 3 normal, 6 fixed defect, 7 reversible defect | categorical (coded) |
| `num` | angiographic diagnosis, 0 (< 50% narrowing) to 4 | **label** |

We predict `disease = (num > 0)`.

**1a (provided).** Load the data."""),
("code", """df = pd.read_csv(DATA / "heart_disease_cleveland.csv")
df["disease"] = (df["num"] > 0).astype(int)
NUMERIC = ["age", "trestbps", "chol", "thalach", "oldpeak"]
CATEGORICAL = ["sex", "cp", "fbs", "restecg", "exang", "slope", "ca", "thal"]
print(df.shape)
df.head()"""),
("md", """**1b.** Inspect the data. Show (i) the data types, (ii) the number of missing values in
each column, (iii) `describe()` for the five continuous features, and (iv) the counts of
`disease` and of the original `num`."""),
("task",
"""# your code here
""",
"""print(df.dtypes.value_counts(), "\\n")
print("missing values:\\n", df.isna().sum()[lambda s: s > 0], "\\n")
display(df[NUMERIC].describe().T[["mean", "std", "min", "max"]])
print(df["disease"].value_counts().rename({0: "no disease", 1: "disease"}))
print(df["num"].value_counts().sort_index())"""),
("md", """**1c.** Plot a histogram of each continuous feature (one figure, five panels). Look at
the x-axis ranges."""),
("task",
"""# your code here
""",
"""fig, axes = plt.subplots(1, 5, figsize=(16, 3))
for ax, col in zip(axes, NUMERIC):
    ax.hist(df[col].dropna(), bins=25, color="#1f4e79")
    ax.set_title(col)
plt.tight_layout(); plt.show()"""),
("md", """**Questions 1.** (i) Which continuous feature has the largest numerical spread, and which
the smallest? By roughly what factor do their standard deviations differ? (ii) `cp` and `thal`
are stored as integers. Are they measurements? What would `|cp₁ − cp₂| = 3` mean? (iii) How
many values are missing, in which columns, and what will you do about them?"""),
("answer", f"""(i) Cholesterol has the largest spread (SD ≈ {H['ranges']['chol'][3]:.0f} mg/dl, range
{H['ranges']['chol'][0]:.0f}–{H['ranges']['chol'][1]:.0f}); ST depression the smallest (SD ≈
{H['ranges']['oldpeak'][3]:.2f} mm). The SDs differ by a factor of about
{H['ranges']['chol'][3] / H['ranges']['oldpeak'][3]:.0f}: in an unscaled distance a typical cholesterol
difference outweighs a typical ST-depression difference by that factor, before squaring.
(ii) No. They are category labels. Chest-pain type 4 (asymptomatic) is not "three units" from
type 1 (typical angina) in any clinical sense; the integers are an arbitrary code. Treating
them as numbers imposes a fake order and fake distances. (iii) Six values: `ca` 4, `thal` 2.
Impute them (median for continuous, most frequent for categorical) **inside the Pipeline**, so
the imputation is learned from training folds only. Dropping six patients would also be
defensible here; imputing keeps the protocol general."""),

# ------------------------------------------------------------------ Task 2
("md", """## Task 2. Split, and a baseline (about 10 minutes)

**2a (provided).** One stratified split, 75% training and 25% test. The test set is now put
away until Task 9."""),
("code", """X = df[NUMERIC + CATEGORICAL]
y = df["disease"]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, stratify=y, random_state=SEED)
print("training patients:", len(X_train), "| test patients:", len(X_test))
print("disease share: train %.3f, test %.3f" % (y_train.mean(), y_test.mean()))"""),
("md", """**2b.** Estimate the accuracy of a majority-class baseline (`DummyClassifier`) with 10-fold
cross-validation on the training data (`cv=CV`). Store the mean in `baseline_cv`."""),
("task",
"""baseline_cv = None
# your code here
""",
"""baseline_cv = cross_val_score(DummyClassifier(strategy="most_frequent"), X_train, y_train, cv=CV).mean()
print("majority-class baseline, 10-fold CV accuracy: %.3f" % baseline_cv)"""),
("md", """**Question 2.** What does the baseline predict for every patient, and why must any model
you report beat it? Why stratify the split?"""),
("answer", f"""It predicts "no disease" for everyone (the majority class in the training data) and is
right {pct(H['baseline']['mean'])} of the time in cross-validation. Any accuracy has to be read
against that number: 60% sounds respectable but is barely better than ignoring the patient.
Stratifying keeps the disease share the same in training and test sets
({H['split']['train_pos']}/{H['split']['train']} and {H['split']['test_pos']}/{H['split']['test']}), so a
lucky or unlucky split cannot shift the baseline under you."""),

# ------------------------------------------------------------------ Task 3
("md", """## Task 3. Build k-NN properly, and read one prediction (about 15 minutes)

k-NN needs every feature to be a number on a sensible scale. Build a preprocessing step that
(i) imputes and standardises the continuous features, and (ii) imputes and **one-hot encodes**
the categorical ones; then a `KNeighborsClassifier(n_neighbors=5)`.

**3a.** Complete `my_knn` and estimate its 10-fold CV accuracy on the training data."""),
("task",
"""my_preprocess = ColumnTransformer([
    # ("num", <pipeline: SimpleImputer(strategy="median") then StandardScaler()>, NUMERIC),
    # ("cat", <pipeline: SimpleImputer(strategy="most_frequent") then OneHotEncoder(...)>, CATEGORICAL),
], sparse_threshold=0)
my_knn = None   # Pipeline([("prep", my_preprocess), ("knn", KNeighborsClassifier(5))])
# your code here
""",
"""my_preprocess = ColumnTransformer([
    ("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), NUMERIC),
    ("cat", make_pipeline(SimpleImputer(strategy="most_frequent"),
                          OneHotEncoder(handle_unknown="ignore", sparse_output=False)), CATEGORICAL),
], sparse_threshold=0)
my_knn = Pipeline([("prep", my_preprocess), ("knn", KNeighborsClassifier(n_neighbors=5))])
print("k = 5, 10-fold CV accuracy: %.3f" % cross_val_score(my_knn, X_train, y_train, cv=CV).mean())"""),
("md", """**3b (provided).** The same pipeline as a function, so later tasks do not depend on your
cell. Compare its output with yours: they should agree."""),
("code", """def make_preprocess(scale="standard", encode="onehot"):
    \"\"\"Continuous: median imputation, then StandardScaler / MinMaxScaler / nothing.
    Categorical: most-frequent imputation, then one-hot ('onehot') or the raw codes ('codes').\"\"\"
    scaler = {"standard": [StandardScaler()], "minmax": [MinMaxScaler()], None: []}[scale]
    num = make_pipeline(SimpleImputer(strategy="median"), *scaler)
    if encode == "onehot":
        cat = make_pipeline(SimpleImputer(strategy="most_frequent"),
                            OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    else:
        cat = SimpleImputer(strategy="most_frequent")
    return ColumnTransformer([("num", num, NUMERIC), ("cat", cat, CATEGORICAL)], sparse_threshold=0)


def make_knn(k=5, metric="euclidean", weights="uniform", scale="standard", encode="onehot"):
    return Pipeline([("prep", make_preprocess(scale, encode)),
                     ("knn", KNeighborsClassifier(n_neighbors=k, metric=metric, weights=weights))])


def cv_acc(model, X_=None):
    s = cross_val_score(model, X_train if X_ is None else X_, y_train, cv=CV)
    return s.mean(), s.std()

print("make_knn(5): CV accuracy %.3f (SD %.3f)" % cv_acc(make_knn(5)))"""),
("md", """**3c.** Fit `make_knn(5)` on the training data. For the **first patient in `X_train`**,
use `kneighbors()` on the fitted k-NN step (applied to the *transformed* row) to list the 5
nearest training patients, their distances and their labels. Reproduce `predict_proba`
for that patient by counting. *Hint:* `model.named_steps["prep"].transform(...)` and
`model.named_steps["knn"].kneighbors(...)`. What do you notice about the nearest distance?"""),
("task",
"""# your code here
""",
"""model = make_knn(5).fit(X_train, y_train)
row = X_train.iloc[[0]]
dist, idx = model.named_steps["knn"].kneighbors(model.named_steps["prep"].transform(row))
nbrs = X_train.iloc[idx[0]].assign(distance=dist[0], disease=y_train.iloc[idx[0]].values)
display(nbrs[["age", "chol", "thalach", "oldpeak", "cp", "distance", "disease"]])
print("share of neighbours with disease:", nbrs["disease"].mean())
print("predict_proba:", model.predict_proba(row)[0])"""),
("md", """**Question 3.** Explain in two or three sentences how the five neighbours produce this
prediction. Why is the nearest distance 0 here, and what does that tell you about evaluating
k-NN on its own training data?"""),
("answer", """The prediction is the majority label of the five stored patients closest in the
standardised, one-hot feature space; `predict_proba` is simply the share of those five with
disease, so it moves in steps of 0.2. The first neighbour is the patient herself, at distance
0 (up to floating-point rounding), because she is in the training set: on training data k-NN always "sees" the answer among
its neighbours. Training accuracy is therefore optimistic by construction (100% at k = 1),
and only held-out data (cross-validation folds or the test set) can measure performance."""),

# ------------------------------------------------------------------ Task 4
("md", """## Task 4. How does k change the model? (about 15 minutes)

**Predict first:** at k = 1, what will training accuracy be? Will cross-validated accuracy be
higher or lower than at k = 15?

**4a.** For every odd k from 1 to 51, use `cross_validate(make_knn(k), X_train, y_train, cv=CV,
return_train_score=True)` to record the mean training and CV accuracy. Store a DataFrame
`curve` indexed by k with columns `train` and `cv`, and plot both against k, with the baseline
as a horizontal line."""),
("task",
"""K_VALUES = list(range(1, 52, 2))
rows = []
for k in K_VALUES:
    # your code here
    pass
curve = pd.DataFrame(rows)
""",
"""K_VALUES = list(range(1, 52, 2))
rows = []
for k in K_VALUES:
    res = cross_validate(make_knn(k), X_train, y_train, cv=CV, return_train_score=True)
    rows.append({"k": k, "train": res["train_score"].mean(), "cv": res["test_score"].mean(),
                 "cv_sd": res["test_score"].std()})
curve = pd.DataFrame(rows).set_index("k")
plt.figure(figsize=(8, 4))
plt.plot(curve.index, curve["train"], "--", label="training accuracy")
plt.plot(curve.index, curve["cv"], "-o", ms=3, label="10-fold CV accuracy")
plt.fill_between(curve.index, curve["cv"] - curve["cv_sd"], curve["cv"] + curve["cv_sd"], alpha=0.15)
plt.axhline(baseline_cv, color="grey", ls=":", label="majority baseline")
plt.axvline(np.sqrt(len(X_train)), color="green", ls=":", label="√n rule")
plt.xlabel("k"); plt.ylabel("accuracy"); plt.legend(); plt.show()
print(curve.loc[[1, 3, 5, 15, 33, 51]].round(3))"""),
("md", """**Questions 4.** (i) Describe the two curves. Where is the model overfitting, and does it
underfit anywhere in this range? (ii) What would happen at k = 227? (iii) The √n rule suggests
k ≈ 15. Is that a good choice here? (iv) How large is the fold-to-fold standard deviation
compared with the differences between k = 5, 15 and 33?"""),
("answer", f"""(i) Training accuracy is 100% at k = 1 (each patient is her own nearest neighbour)
and falls as k grows; CV accuracy is lowest at k = 1 ({pct(H['k1']['mean'])}) and is roughly
flat at about 80–84% from k = 5 onwards. k = 1 overfits: the boundary follows individual,
possibly mislabelled, patients. Within k ≤ 51 there is no strong underfitting; the gap between
training and CV accuracy closes as k grows. (ii) At k = 227 every query's neighbourhood is the
whole training set, so every patient is predicted "no disease" and accuracy equals the
baseline ({pct(H['baseline']['mean'])}). (iii) k = 15 sits on the plateau and is a reasonable,
cheap default, but the rule is a heuristic, not evidence. (iv) The fold SD is about 7–8
percentage points, larger than most differences between k values on the plateau. With 227
patients, choices between k = 5, 15 and 33 are not clearly distinguishable."""),

# ------------------------------------------------------------------ Task 5
("md", """## Task 5. Distance metrics and feature representation (about 15 minutes)

**5a.** At k = 5 and k = 15, compare `metric="euclidean"` with `metric="manhattan"` (scaled,
one-hot). Report CV mean and SD in a small table."""),
("task",
"""# your code here
""",
"""tab = pd.DataFrame({m: {k: "%.3f ± %.3f" % cv_acc(make_knn(k, metric=m)) for k in [5, 15]}
                    for m in ["euclidean", "manhattan"]})
tab"""),
("md", """**5b.** Representation of the categorical features. At k = 5 compare (i) one-hot encoding
with (ii) the raw integer codes (`encode="codes"`), both standardised."""),
("task",
"""# your code here
""",
"""for enc in ["onehot", "codes"]:
    print("%-7s CV accuracy %.3f (SD %.3f)" % ((enc,) + cv_acc(make_knn(5, encode=enc))))"""),
("md", """**5c.** Hamming distance is natural for categorical features. Build a k-NN (k = 15) that
uses **only the eight categorical features**, one-hot encoded, with `metric="hamming"`, and
compare it with Euclidean distance on the same one-hot features."""),
("task",
"""# your code here
""",
"""cat_only = ColumnTransformer([("cat", make_pipeline(SimpleImputer(strategy="most_frequent"),
    OneHotEncoder(handle_unknown="ignore", sparse_output=False)), CATEGORICAL)], sparse_threshold=0)
for metric in ["hamming", "euclidean"]:
    m = Pipeline([("prep", cat_only), ("knn", KNeighborsClassifier(15, metric=metric))])
    print("%-9s categorical only: CV accuracy %.3f (SD %.3f)" % ((metric,) + cv_acc(m)))"""),
("md", """**Questions 5.** (i) Is one metric clearly better? Should you conclude Manhattan "is better
for medical data"? (ii) What changed between one-hot and raw codes, and why can raw codes be
harmful even when the score barely moves? (iii) On one-hot (0/1) vectors, how are Hamming and
Euclidean distance related, and does that explain your 5c result?"""),
("answer", f"""(i) No. The differences are around one or two points, well inside the fold SD of 7–8
points. Which metric suits a dataset is an empirical question for that dataset, to be settled
by cross-validation, never a general rule. (ii) With raw codes, chest-pain type 4 counts as
three units away from type 1 and thal 7 as four units from thal 3: invented distances. At
k = 5 one-hot gives {pct(k5['standard']['mean'])} and raw codes {pct(k5['standard_codes']['mean'])}
with a larger fold SD; even where the mean barely changes, the model is now relying on an
arbitrary coding that would change if someone renumbered the categories. (iii) For 0/1
vectors, (pᵢ − qᵢ)² = |pᵢ − qᵢ| = [pᵢ ≠ qᵢ], so squared Euclidean distance = Manhattan
distance = the number of mismatched indicators, and scikit-learn's Hamming is that count
divided by the vector length. All three rank neighbours identically (up to ties), so similar
accuracy is expected ({pct(H['hamming_categorical_k15']['mean'])} vs
{pct(H['euclid_categorical_k15']['mean'])}; the small gap comes from how ties at equal distance are
broken)."""),

# ------------------------------------------------------------------ Task 6
("md", """## Task 6. Feature scaling (about 15 minutes)

**Predict first:** without scaling, which feature will decide who the neighbours are?

**6a.** At k = 5, compare `scale=None`, `scale="minmax"` and `scale="standard"`."""),
("task",
"""# your code here
""",
"""for sc in [None, "minmax", "standard"]:
    print("%-9s CV accuracy %.3f (SD %.3f)" % ((str(sc),) + cv_acc(make_knn(5, scale=sc))))"""),
("md", """**6b.** Show *why*. For the five continuous features (training rows, median-imputed but
unscaled), compute each feature's share of the expected squared distance between two random
patients. *Hint:* for two independent random rows, E[(xᵢ − x'ᵢ)²] = 2·Var(xᵢ)."""),
("task",
"""# your code here
""",
"""v = X_train[NUMERIC].var()
print((v / v.sum()).round(4).sort_values(ascending=False))"""),
("md", """**6c (provided).** Why the scaler belongs inside the Pipeline. The leaky version below fits
the scaler on *all* the training rows before cross-validation, so each validation fold has
already influenced the scaling. Here the effect is small; with feature selection or target
encoding it can be large (Weeks 3 and 5)."""),
("code", """leaky_X = X_train.copy()
leaky_X[NUMERIC] = StandardScaler().fit_transform(SimpleImputer(strategy="median").fit_transform(leaky_X[NUMERIC]))
print("scaler fitted outside CV : %.3f" % cv_acc(make_knn(5, scale=None), leaky_X)[0])
print("scaler inside the Pipeline: %.3f" % cv_acc(make_knn(5))[0])"""),
("md", """**Questions 6.** (i) Which feature dominates the unscaled distance, with what share, and
which feature is almost ignored? (ii) Explain the accuracy difference in one sentence.
(iii) Why must the scaler be fitted on training data only, even though it never sees the
label? (iv) Min-max or standardisation: which is more sensitive to a single extreme patient?"""),
("answer", f"""(i) Cholesterol supplies {pct(H['unscaled_distance_share']['chol'])} of the expected
squared distance and maximum heart rate {pct(H['unscaled_distance_share']['thalach'])}; ST
depression only {pct(H['unscaled_distance_share']['oldpeak'], 2)}, although it is clinically
informative. (ii) Unscaled, the neighbours are essentially "patients with similar cholesterol",
and cholesterol alone predicts angiographic disease poorly, so accuracy falls from
{pct(k5['standard']['mean'])} to {pct(k5['unscaled']['mean'])}, barely above the
{pct(H['baseline']['mean'])} baseline. (iii) The mean and SD are statistics of the data; computed on
all rows they carry information about the validation or test patients into training, so the
estimate no longer describes performance on unseen patients. In deployment, a new patient
is scaled with the training statistics, and validation must mimic that. (iv) Min-max: one
extreme cholesterol value (564 mg/dl here) stretches the range and squeezes everyone else into
a narrow band; standardisation is less affected (although not robust either; `RobustScaler`
uses the median and IQR)."""),

# ------------------------------------------------------------------ Task 7
("md", """## Task 7. Model selection by cross-validation (about 15 minutes)

**7a.** Use `GridSearchCV(make_knn(), param_grid, cv=CV)` to search odd k from 1 to 51,
`metric` in {euclidean, manhattan} and `weights` in {uniform, distance}. (Parameter names
inside a Pipeline are `"knn__n_neighbors"`, etc.) Fit on the training data only. Store it as
`search`; print the best parameters and CV score, and the ten best rows of `cv_results_`
with their standard deviations."""),
("task",
"""search = None
# your code here
""",
"""param_grid = {"knn__n_neighbors": list(range(1, 52, 2)),
              "knn__metric": ["euclidean", "manhattan"],
              "knn__weights": ["uniform", "distance"]}
search = GridSearchCV(make_knn(), param_grid, cv=CV)
search.fit(X_train, y_train)
print("best:", search.best_params_, "CV accuracy %.3f" % search.best_score_)
res = pd.DataFrame(search.cv_results_)
top = res.sort_values("rank_test_score").head(10)
top[["param_knn__n_neighbors", "param_knn__metric", "param_knn__weights",
     "mean_test_score", "std_test_score"]]"""),
("md", """**Questions 7.** (i) Which configuration was chosen? (ii) Look at the ten best rows: are
they meaningfully different? What would you report, and how would you pick between nearly
equal settings (*hint:* the one-standard-error rule)? (iii) Why is the test set not used here,
even though it would be easy to evaluate each configuration on it?"""),
("answer", f"""(i) k = {C['k']}, {C['metric']}, {C['weights']} weights, with CV accuracy {pct(C['cv'])}
(fold SD {pct(C['cv_sd'])}). (ii) No: the top ten span about one or two percentage points, while
the fold SD is about 7–8 points, so they are statistically indistinguishable on 227 patients.
Report the chosen setting with its CV mean and SD, and say that a range of k with either
metric performs similarly. The one-standard-error rule picks the simplest (here: the largest,
smoothest k, or uniform weights) whose CV score is within one standard error of the best
({C['cv']:.3f} − {C['cv_sd']:.3f}/√10 ≈ {C['one_se_threshold']:.3f}). (iii) Every configuration you check
on the test set is a choice informed by it; choosing the best of 104 test scores would report
the luckiest one, not the expected performance. The test set must be used once, after all
choices are made."""),

# ------------------------------------------------------------------ Task 8
("md", f"""## Task 8. Distance weighting (about 10 minutes)

**8a (provided).** The lecture's worked regression example, checked with scikit-learn: three
stored cases at distances 2, 4 and 6 from the query with values 82, 83 and 78."""),
("code", """X_toy = np.array([[2.0], [4.0], [6.0]]); y_toy = np.array([82, 83, 78])
for name, w in [("uniform", "uniform"), ("1/d", "distance"), ("1/d^2", lambda d: 1 / d**2)]:
    r = KNeighborsRegressor(n_neighbors=3, weights=w).fit(X_toy, y_toy)
    print("%-8s prediction at x = 0: %.3f" % (name, r.predict([[0.0]])[0]))"""),
("md", """**8b.** On the heart data at k = 15 (scaled, Euclidean), compare weights `1/d^p` for p = 0
(uniform), 0.5, 1, 2 and 4, using a callable: `weights=lambda d, p=p: 1 / d**p`.
(scikit-learn passes the array of neighbour distances to the callable.) Report CV accuracy.
Then fit the p = 0 and p = 2 models on all training patients except the first five
(`X_train.iloc[5:]`), and compare their `predict_proba` for those five (`X_train.iloc[:5]`).
The test set stays untouched."""),
("task",
"""# your code here
""",
"""for p in [0, 0.5, 1, 2, 4]:
    w = "uniform" if p == 0 else (lambda d, p=p: 1 / np.maximum(d, 1e-12) ** p)
    print("p = %-4s CV accuracy %.3f (SD %.3f)" % ((p,) + cv_acc(make_knn(15, weights=w))))
fitted = {p: make_knn(15, weights="uniform" if p == 0 else (lambda d, p=p: 1 / np.maximum(d, 1e-12) ** p))
             .fit(X_train.iloc[5:], y_train.iloc[5:]) for p in [0, 2]}
pd.DataFrame({"P(disease), p = 0": fitted[0].predict_proba(X_train.iloc[:5])[:, 1],
              "P(disease), p = 2": fitted[2].predict_proba(X_train.iloc[:5])[:, 1],
              "true": y_train.iloc[:5].values}).round(3)"""),
("md", """**Questions 8.** (i) Explain the three toy predictions. Which one did the lecture compute?
(ii) What does increasing p do, and what does the model become as p grows very large?
(iii) What happens if a query is at distance 0 from a stored patient, and how does
scikit-learn's `weights="distance"` handle it? Why did 8b guard with `np.maximum(d, 1e-12)`?
(iv) Did weighting change the decisions or mostly the probabilities?"""),
("answer", f"""(i) Uniform: (82 + 83 + 78)/3 = {L['regression']['k3_mean']:.3f}. 1/d:
{L['regression']['weighted_p1']:.3f}. 1/d²: (82/4 + 83/16 + 78/36)/(1/4 + 1/16 + 1/36) =
{L['regression']['weighted_p2']:.3f}, the lecture's calculation. Each weighting pulls the prediction
towards 82, the nearest value. (ii) Larger p makes influence decay faster with distance: the
nearest neighbour dominates and, as p → ∞, the model becomes 1-NN with its sensitivity to a
single noisy patient. (iii) The weight 1/0 is infinite. With `weights="distance"`,
scikit-learn gives all the weight to the neighbours at distance 0 (exact matches) and none to
the rest. A hand-written callable divides by zero (a warning and NaN or inf), hence the guard;
alternatives are adding a small ε to every distance or handling exact matches explicitly.
(iv) Mostly the probabilities: CV accuracy barely moves (identical for p up to 2 and about
half a point lower at p = 4, far inside the fold SD), while individual P(disease) values shift.
At large p the fold SD grows: the model is leaning on fewer, closer neighbours. Weighting is most useful for
probability estimates and for regression."""),

# ------------------------------------------------------------------ Task 9
("md", """## Task 9. Final evaluation, once (about 15 minutes)

**9a.** Take `search.best_estimator_` (already refitted on all the training data by
`GridSearchCV`), predict the test set **once**, and report accuracy, balanced accuracy, ROC AUC
(from `predict_proba`), the classification report and the confusion matrix."""),
("task",
"""# your code here
""",
"""best = search.best_estimator_
pred = best.predict(X_test)
prob = best.predict_proba(X_test)[:, 1]
test_acc = accuracy_score(y_test, pred)
print("test accuracy %.3f | balanced accuracy %.3f | ROC AUC %.3f"
      % (test_acc, balanced_accuracy_score(y_test, pred), roc_auc_score(y_test, prob)))
print(classification_report(y_test, pred, target_names=["no disease", "disease"]))
cm = confusion_matrix(y_test, pred)
ConfusionMatrixDisplay(cm, display_labels=["no disease", "disease"]).plot(colorbar=False); plt.show()"""),
("md", """**9b (provided).** Class balance. The binary label is nearly balanced, but the original
severity label `num` is not. A k-NN asked to predict severity votes among neighbours that are
mostly class 0."""),
("code", """print(df["num"].value_counts(normalize=True).sort_index().round(3))
sev = cross_val_score(make_knn(15), X_train, df.loc[X_train.index, "num"], cv=StratifiedKFold(5, shuffle=True, random_state=SEED),
                      scoring="balanced_accuracy")
print("severity (5 classes), k = 15: balanced accuracy %.3f (chance 0.200)" % sev.mean())"""),
("md", """**Questions 9.** (i) Interpret the confusion matrix clinically: what do the false
negatives and false positives mean for a patient? (ii) The test accuracy differs from the CV
estimate. Which number is the better estimate of future performance, and why should you *not*
now change k? (iii) Why is balanced accuracy the better summary for the severity task, and
what happens to rare severe classes under a majority vote? (iv) What population does this
result apply to?"""),
("answer", f"""(i) Rows are true classes, columns predictions: [{T['cm'][0][0]}, {T['cm'][0][1]}] /
[{T['cm'][1][0]}, {T['cm'][1][1]}]. {T['cm'][1][0]} patients with disease were predicted healthy (false
negatives: missed disease, the more dangerous error if the model were used to decide who
needs angiography); {T['cm'][0][1]} healthy patients were flagged (false positives: an unnecessary
invasive test). Sensitivity {pct(T['recall'])}, specificity {pct(T['specificity'])}. (ii) Test
accuracy {pct(T['accuracy'])} is above the CV estimate {pct(C['cv'])}: 76 patients is a small
test set (one patient = 1.3 points), so the gap is mostly chance. The CV estimate, based on all
227 training patients in rotation, is the steadier number; the test result confirms there is
no gross overfitting. Changing k now would turn the test set into a validation set and
invalidate it. (iii) Most patients are class 0 and class 4 has only 13 patients; among 15
neighbours the severe classes are rarely the majority, so they are almost never predicted.
Accuracy rewards predicting the common classes; balanced accuracy averages recall over classes
and exposes this. (iv) Patients referred for angiography at one US centre in 1981–1984, with
46% disease prevalence: not a screening population, and not today's patients."""),

# ------------------------------------------------------------------ Task 10
("md", """## Task 10. Critical reflection (about 10 minutes)

**10a (provided).** Irrelevant features. Add columns of pure noise and measure the damage
(k = 15). The noise is generated once with a fixed seed."""),
("code", """rng = np.random.default_rng(SEED)
for n_noise in [0, 20, 50, 100]:
    noise_cols = [f"noise_{j}" for j in range(n_noise)]
    Xn = pd.concat([X_train, pd.DataFrame(rng.normal(size=(len(X_train), n_noise)),
                                          index=X_train.index, columns=noise_cols)], axis=1)
    pre = ColumnTransformer([("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), NUMERIC),
                             ("cat", make_pipeline(SimpleImputer(strategy="most_frequent"),
                                     OneHotEncoder(handle_unknown="ignore", sparse_output=False)), CATEGORICAL),
                             ("noise", "passthrough", noise_cols)], sparse_threshold=0)
    acc = cross_val_score(Pipeline([("prep", pre), ("knn", KNeighborsClassifier(15))]), Xn, y_train, cv=CV).mean()
    print("%3d noise features: CV accuracy %.3f" % (n_noise, acc))"""),
("md", """**10b (provided).** Cost. k-NN does its work at prediction time. Compare fitting and
predicting times with logistic regression on a larger, artificially replicated training set."""),
("code", """big_X = pd.concat([X_train] * 200, ignore_index=True); big_y = pd.concat([y_train] * 200, ignore_index=True)
for name, mdl in [("k-NN (k = 15)", make_knn(15)),
                  ("logistic regression", Pipeline([("prep", make_preprocess()), ("lr", LogisticRegression(max_iter=2000))]))]:
    t0 = time.perf_counter(); mdl.fit(big_X, big_y); t1 = time.perf_counter()
    mdl.predict(X_test); t2 = time.perf_counter()
    print("%-20s fit %.3f s | predict 76 patients %.3f s | training rows stored: %s"
          % (name, t1 - t0, t2 - t1, f"{len(big_X):,}" if "k-NN" in name else "none (coefficients only)"))"""),
("md", """**Questions 10.** Answer briefly, using your numbers where you can.
1. Give two strengths of k-NN for this problem.
2. Explain the effect of irrelevant features seen in 10a, and why a decision tree would suffer less.
3. Describe the computational cost of k-NN in training and prediction, and its memory cost.
4. Name a situation in biology or medicine where you would prefer another model to k-NN, and say which model and why.
5. Two patients are nearest neighbours in this feature space. Does that make them biologically or clinically equivalent? Give one reason why not."""),
("answer", f"""1. No training assumptions about the shape of the boundary; every prediction can be
explained by showing the similar past patients (case-based reasoning that clinicians
recognise); it handles classification and regression with the same machinery; adding new
patients needs no retraining.
2. Each noise column adds a random term to every distance, so the ranking of neighbours is
increasingly decided by chance: in 10a, about 80% with no noise falls to about 73% with 50
noise columns (averaged over five draws, the data script measures
{pct(H['noise']['weight']['1.0']['mean'][0])} falling to {pct(H['noise']['weight']['1.0']['mean'][-1])} with
100 columns; single draws scatter by a point or two). A tree chooses one feature per
split and can simply never use a noise column; k-NN has no way to ignore a dimension unless
you remove or down-weight it.
3. Training is just storing the data (O(1) work, O(n·d) memory); each prediction compares the
query with every stored case, O(n·d), plus sorting. Logistic regression is the opposite: work
at fit time, a handful of coefficients, near-instant predictions. Tree indexes (KD-tree, ball
tree) speed up search in low dimensions; approximate nearest-neighbour libraries are used for
millions of items, such as embedding databases.
4. For example: gene-expression data with 20,000 genes and 200 patients (distances concentrate
and most genes are irrelevant: penalised logistic regression or a random forest); a deployed
screening tool that must answer instantly on a device, or must not store patient records
(a parametric model); a relationship that is close to linear, as in Extension A, where a line
uses the data more efficiently; or when an interpretable global rule is needed (a shallow tree).
5. No. They are close only in the 13 features recorded, after our scaling and encoding
choices. They may differ in everything unrecorded (genetics, medication, comorbidities, why
they were referred), and different combinations of physiology can produce the same
measurements. Similarity in feature space is a modelling assumption to be justified, not a
biological finding."""),
("teach", """**Timing.** Most groups finish Tasks 1–8 in 90 minutes; Task 7's grid search takes
about 10 seconds. If time is short, run 10a/10b as a demonstration and discuss Q10 together.
**Common mistakes.** (1) Scaling the whole dataset before the split (Task 6c shows why not).
(2) Using `predict` on the training set and reporting 100% at k = 1 as a result. (3) Choosing k
by test accuracy. (4) Feeding the integer codes of `cp`/`thal` directly to the distance.
(5) Writing `weights=lambda d: 1/d` without guarding d = 0 and getting warnings or NaN.
(6) Reading a one-point CV difference as a real improvement: always show the fold SD.
**Alternative defensible choices.** Dropping the six incomplete patients instead of imputing;
`RobustScaler`; treating `ca` (a count, 0–3) as ordinal rather than one-hot; choosing k by the
one-standard-error rule (it gives a larger k with practically the same accuracy); reporting
ROC AUC rather than accuracy as the selection score. **What can vary between environments.**
Exact CV numbers are fixed by the seed and the frozen data; timings in 10b and the 10a noise
values depend on the machine and the draw; the conclusions do not."""),

# ------------------------------------------------------------------ checkpoint and extensions
("md", """---
## Checkpoint: end of the core lab

If you have answered Questions 1–10, you have completed the lab. The extensions are optional."""),
("md", """## Extension A. k-NN regression: predicting maximum heart rate from age

Maximum heart rate falls with age; the textbook rule of thumb is **220 − age**. Using all 303
patients with 10-fold `KFold(10, shuffle=True, random_state=SEED)` cross-validation and the mean
absolute error, compare: `KNeighborsRegressor` with k in {1, 5, 15, 41}, uniform and distance
weights; `LinearRegression`; and the 220 − age rule. Plot the k = 15 prediction curve over the
scatter."""),
("task",
"""# your code here
""",
"""from sklearn.model_selection import KFold
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
kcv = KFold(10, shuffle=True, random_state=SEED)
xa, yt = df[["age"]].values, df["thalach"].values
for k in [1, 5, 15, 41]:
    for w in ["uniform", "distance"]:
        mae = -cross_val_score(KNeighborsRegressor(k, weights=w), xa, yt, cv=kcv, scoring="neg_mean_absolute_error").mean()
        print("k-NN k = %-2d %-8s MAE %.2f" % (k, w, mae))
print("linear regression     MAE %.2f" % -cross_val_score(LinearRegression(), xa, yt, cv=kcv, scoring="neg_mean_absolute_error").mean())
print("220 - age rule        MAE %.2f" % mean_absolute_error(yt, 220 - df["age"]))
grid = np.linspace(29, 77, 200).reshape(-1, 1)
plt.scatter(xa, yt, s=8, alpha=0.4, label="patients")
plt.plot(grid, KNeighborsRegressor(15).fit(xa, yt).predict(grid), label="k-NN, k = 15")
plt.plot(grid, 220 - grid, "--", label="220 − age")
plt.xlabel("age"); plt.ylabel("maximum heart rate"); plt.legend(); plt.show()"""),
("answer", f"""Cross-validated MAE: best uniform k-NN about {min(v for kk, v in H['regression']['mae'].items() if kk.startswith('uniform')):.1f} bpm
(large k), linear regression {H['regression']['linear_mae']:.2f}, predicting the mean {H['regression']['mean_only_mae']:.2f},
220 − age {H['regression']['rule_220_minus_age_mae']:.2f}. The relationship is close to linear, so the line uses
the data more efficiently and k-NN only approaches it at large k. The 220 − age rule is worse than
both because these patients reached a lower maximum than the healthy population the rule was
derived from (many stopped the exercise test because of symptoms, or took heart-rate-limiting
drugs). Distance weighting is *worse* here: ages are whole years, so most queries are at
distance 0 from some training patients, and scikit-learn then averages only those exact-age
matches, whatever k is: the zero-distance rule in action."""),
("md", """## Extension B. k-NN from scratch

Write `knn_predict(X_tr, y_tr, X_q, k)` in NumPy (Euclidean distance, majority vote, ties
broken towards the smaller label) and check that it agrees with scikit-learn on the
standardised, one-hot test data at k = 5."""),
("task",
"""# your code here
""",
"""def knn_predict(X_tr, y_tr, X_q, k):
    d = np.sqrt(((X_q[:, None, :] - X_tr[None, :, :]) ** 2).sum(axis=2))   # (n_query, n_train)
    idx = np.argsort(d, axis=1, kind="stable")[:, :k]
    votes = y_tr[idx]
    return (votes.mean(axis=1) > 0.5).astype(int)   # ties (k even) go to class 0, as scikit-learn

prep = make_preprocess().fit(X_train)
A, B = prep.transform(X_train), prep.transform(X_test)
mine = knn_predict(A, y_train.values, B, 5)
theirs = KNeighborsClassifier(5).fit(A, y_train).predict(B)
print("agreement with scikit-learn:", (mine == theirs).mean())"""),
("answer", """The two agree on every test patient (agreement 1.0). The function makes the cost visible:
the distance matrix has one entry per (query, training patient) pair, so prediction time and
memory grow with the size of the training set."""),
("md", """## Extension C. A heterogeneous distance

Write a distance for the **raw** (imputed, unscaled, not one-hot) records: for each continuous
feature |difference| / (training range), for each categorical feature 0 if equal and 1 if
not, summed (a Gower-style distance). Use it with `KNeighborsClassifier(15, metric=your_function,
algorithm="brute")` and compare with the one-hot Euclidean pipeline."""),
("task",
"""# your code here
""",
"""imp = ColumnTransformer([("num", SimpleImputer(strategy="median"), NUMERIC),
                         ("cat", SimpleImputer(strategy="most_frequent"), CATEGORICAL)], sparse_threshold=0)
Xi_train = imp.fit_transform(X_train)
ranges = Xi_train[:, :5].max(axis=0) - Xi_train[:, :5].min(axis=0)

def heterogeneous(a, b):
    return np.sum(np.abs(a[:5] - b[:5]) / ranges) + np.sum(a[5:] != b[5:])

# The ranges come from all the training rows, a small simplification for brevity; strictly they
# should be recomputed in each fold (wrap the distance in a custom estimator to do so).
m = Pipeline([("imp", imp), ("knn", KNeighborsClassifier(15, metric=heterogeneous, algorithm="brute"))])
print("heterogeneous distance, k = 15: CV accuracy %.3f (SD %.3f)" % cv_acc(m))
print("one-hot Euclidean,      k = 15: CV accuracy %.3f (SD %.3f)" % cv_acc(make_knn(15)))"""),
("answer", """Both reach similar accuracy (within the fold SD). The heterogeneous distance needs no
one-hot expansion, treats each categorical feature as one unit of disagreement (one-hot
Euclidean gives a mismatch a squared contribution of 2 per feature, spread over more columns),
and makes the per-feature contributions directly readable. Its weakness is speed: a Python
distance function forces brute-force search and is much slower than the compiled metrics."""),
("md", """## Final reflection

In three or four sentences: what did this lab teach you about the word **"similar"**? Which
single decision (k, metric, representation, scaling, weighting) had the largest effect on these
data, and how do you know?"""),
("answer", f"""Scaling and representation mattered far more than k, the metric or the weighting:
scaling moved CV accuracy from {pct(k5['unscaled']['mean'])} to {pct(k5['standard']['mean'])}, while all
reasonable choices of k ≥ 5, metric and weighting sat within about two points of each other,
inside the fold SD. "Similar" is therefore not a property of patients but of the feature space
and distance we build; k-NN makes that choice explicit, which is both its weakness and its
value as a teaching model and a baseline."""),
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
        first = first.replace("# COMP9085 Week 8 Laboratory",
                              "# COMP9085 Week 08 Lab — Solutions (instructor)", 1)
        old = ("**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**), with every\n"
               "question answered in the markdown cells.")
        assert old in first
        first = first.replace(old,
            "**About this notebook.** Complete code, outputs, plots and worked answers for every task,\n"
            "plus **instructor notes** (timing, common mistakes, alternative defensible choices, what may vary\n"
            "between environments). **Instructor only:** do not distribute with the student files; the\n"
            "`solutions/` folder is gitignored.")
        out[0].source = first
        setup = next(c for c in out if c.cell_type == "code" and 'DATA = Path("data")' in c.source)
        setup.source = setup.source.replace(
            'DATA = Path("data")',
            'DATA = Path("data") if Path("data").exists() else Path("../data")   # run from labs/week08 or solutions/')
    nb.cells = out
    return nb


CHECK = """import json, math
_N = json.load(open("../../../data/scripts/week08_numbers.json"))
_H = _N["heart"]
def _eq(a, b, tol=6e-4):
    assert math.isclose(float(a), float(b), abs_tol=tol), (a, b)
_eq(len(df), _H["n"]); _eq(y.sum(), _H["disease"]); _eq(len(X_train), _H["split"]["train"])
_eq(baseline_cv, _H["baseline"]["mean"])
_eq(cv_acc(make_knn(5))[0], _H["k5"]["standard"]["mean"]); _eq(cv_acc(make_knn(5, scale=None))[0], _H["k5"]["unscaled"]["mean"])
_eq(cv_acc(make_knn(5, scale="minmax"))[0], _H["k5"]["minmax"]["mean"]); _eq(cv_acc(make_knn(5, encode="codes"))[0], _H["k5"]["standard_codes"]["mean"])
for i, k in enumerate(_H["grid"]["k"]):
    _eq(curve.loc[k, "cv"], _H["grid"]["curves"]["standard|euclidean|uniform"]["cv"][i])
    _eq(curve.loc[k, "train"], _H["grid"]["curves"]["standard|euclidean|uniform"]["train"][i])
assert search.best_params_ == {"knn__n_neighbors": _H["chosen"]["k"], "knn__metric": _H["chosen"]["metric"],
                               "knn__weights": _H["chosen"]["weights"]}, search.best_params_
_eq(search.best_score_, _H["chosen"]["cv"]); _eq(test_acc, _H["test"]["accuracy"])
assert cm.tolist() == _H["test"]["cm"], cm
_v = X_train[NUMERIC].var(); _eq(_v["chol"] / _v.sum(), _H["unscaled_distance_share"]["chol"])
assert (mine == theirs).all()
print("CHECK PASSED: solutions agree with week08_numbers.json")
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
    nbformat.write(student, os.path.join(OUT, "COMP9085_Week08_Lab.ipynb"))
    html(student, os.path.join(OUT, "COMP9085_Week08_Lab.html"))
    trial = copy.deepcopy(student)
    execute(trial)
    print("student notebook (unfilled) executed without errors")

    sol = build(True)
    sol.cells.append(nbformat.v4.new_code_cell(CHECK))
    execute(sol, SOL)
    assert "CHECK PASSED" in "".join(o.get("text", "") for o in sol.cells[-1].outputs)
    sol.cells = sol.cells[:-1]
    errors = [o for c in sol.cells if c.cell_type == "code" for o in c.outputs if o.output_type == "error"]
    assert not errors, errors
    nbformat.write(sol, os.path.join(SOL, "COMP9085_Week08_Lab_Solutions.ipynb"))
    html(sol, os.path.join(SOL, "COMP9085_Week08_Lab_Solutions.html"))
    print("student and executed solutions written to", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
