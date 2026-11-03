#!/usr/bin/env python3
"""
Week 5 lab: build the student notebook and the worked-solutions notebook from
ONE source, so the two cannot drift apart.

Outputs
    labs/week05/COMP9085_Week05_Lab.ipynb                         public, no answers
    labs/week05/COMP9085_Week05_Lab.html                          public, rendered
    labs/week05/solutions/COMP9085_Week05_Lab_Worked_Solutions.ipynb
    labs/week05/solutions/COMP9085_Week05_Lab_Worked_Solutions.html

The notebook reads the frozen snapshot next to it (data/openfda_food_recall_events.csv):
no network, no API, no key. The worked solutions are written for students and
released on Canvas after the lab; the solutions folder is excluded by
.gitignore. The worked-solutions notebook is EXECUTED here, so every number in
it is a real output. The worked answers quote numbers from
data/scripts/week05_numbers.json (script 10), the same source as the website
and the lecture; the Week 5 QA checks that the executed outputs agree.

    python3 data/scripts/12_build_week05_lab.py      # needs nbformat, nbconvert, ipykernel
"""
import json
import os

import nbformat
from nbconvert import HTMLExporter
from nbconvert.preprocessors import ExecutePreprocessor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "labs", "week05")
SOL = os.path.join(OUT, "solutions")
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week05_numbers.json")))
M, LK, V, LM = N["main"], N["leakage"], N["variants"], N.get("lmComparison")

STUDENT_CODE = "# your code here\n"
STUDENT_TEXT = "*Your answer here.*"


def pct(x, d=1):
    return f"{100 * x:.{d}f}%"


def cells():
    lm_dict = ("None" if not LM else json.dumps({
        k: LM[k] for k in ["accuracy", "precision", "recall", "f1", "rocAuc",
                           "averagePrecision", "brier", "fractionExtreme"]}))
    return [
("md", f"""# COMP9085 Week 5 Laboratory
## Naive Bayes on real food-recall text: a complete pipeline

**Two hours.** Naive Bayes is a simple model, but it is a complete
machine-learning pipeline. In this lab you will build one from raw text to an
evaluated, documented result, on real data, and then question what it learned.

**Data.** A frozen snapshot of the U.S. FDA's openFDA food enforcement reports
(export dated 2026-09-28, public domain), in `data/openfda_food_recall_events.csv`
next to this notebook. One row represents an **event–reason–classification
record**: one recall event, one reason text, one FDA classification. Most
event–reason pairs have one classification, but a few have more than one (Task 1).
The target is `is_class_I`: 1 if FDA classified the recall as Class I
(a reasonable probability of serious adverse health consequences or death),
0 for Class II or III. This is real data used for classroom evaluation. The
label is an administrative decision, not a measured health outcome, and nothing
in this lab is a food-safety tool. `data/README.md` documents the source and
how the snapshot was made.

**No network is needed.** Everything runs from the CSV.

**Structure.** **Tasks 1–8 are the core lab.** A checkpoint after Task 8 marks
the end of the core. Two extensions follow; both are optional.

**The Week 5 page is your interactive companion.**

| Task | Interactive on the Week 5 page |
|---|---|
| 1–2 | Section 4 (what is one row?) and explorer D |
| 3 | Explorer C: text representation |
| 4 | The classifier explorer (it reproduces your Task 4 numbers) |
| 5 | Explorer B and the probe in the classifier explorer |
| 6 | The classifier explorer, Errors view |
| 7 | Explorer D: leakage |
| 8 | The classifier explorer, Probabilities view |
| Extensions | Explorer E: model comparison |

**Deliverable.** This notebook, run top to bottom, with every question answered
in the markdown cells."""),
("md", "### Setup"),
("code", """import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import StratifiedGroupKFold, GroupKFold, GridSearchCV, train_test_split
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB, BernoulliNB
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyClassifier
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, brier_score_loss, confusion_matrix)
from sklearn.calibration import calibration_curve

SEED = 42
df = pd.read_csv("data/openfda_food_recall_events.csv", keep_default_na=False)
print(df.shape)
df.head()"""),
("md", """A helper used throughout: every model in this lab is evaluated with the
same function, at the same threshold (positive if p ≥ 0.5)."""),
("code", """def evaluate(y_true, p, name):
    y_pred = (p >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {"model": name,
            "accuracy": accuracy_score(y_true, y_pred),
            "precision": precision_score(y_true, y_pred, zero_division=0),
            "recall": recall_score(y_true, y_pred),
            "f1": f1_score(y_true, y_pred),
            "roc_auc": roc_auc_score(y_true, p) if len(set(p)) > 1 else 0.5,
            "TP": tp, "FP": fp, "FN": fn, "TN": tn}"""),

# ---------------------------------------------------------------- Task 1
("md", """## Task 1 — What is one row?

The FDA export has one record per recalled **product**. A single recall
**event** can cover many products with the same reason text; the column
`n_product_records` says how many product records shared each row's text. Rows
are distinct (`event_id`, `reason_for_recall`, `classification`) combinations.

Compute: the number of rows, the number of distinct recall events, the total
number of product records, the largest number of product records in a single
event, the counts of each FDA class, and the fraction of rows that are Class I.
Then count the distinct event–reason pairs, how many of them carry more than one
FDA classification, and how many disagree on the target `is_class_I`.
Then print five reason texts with their class (use `random_state=SEED`)."""),
("task", STUDENT_CODE, """print("rows:", len(df))
print("recall events:", df.event_id.nunique())
print("product records:", df.n_product_records.sum())
print("largest event (product records):", df.groupby("event_id").n_product_records.sum().max())
print(df.classification.value_counts())
print("fraction Class I:", round(df.is_class_I.mean(), 4))
pairs = df.groupby(["event_id", "reason_for_recall"])
print("event-reason pairs:", pairs.ngroups)
print("pairs with more than one FDA class:", (pairs.classification.nunique() > 1).sum())
print("pairs that disagree on is_class_I:", (pairs.is_class_I.nunique() > 1).sum())
pd.set_option("display.max_colwidth", 120)
df.sample(5, random_state=SEED)[["classification", "reason_for_recall"]]"""),
("md", """**Question 1.1.** Why is one row an event–reason–classification record, and
not a product record? What would go wrong if you trained and tested on product
records?

**Question 1.2.** The target is FDA's hazard classification. Name one thing it
measures and one thing it does not.

**Question 1.3.** Some event–reason pairs appear with more than one
classification. Should they be removed? What do they tell you about the task?"""),
("answer", f"""There are {N['dataset']['rows']:,} rows from {N['dataset']['events']:,}
recall events, de-duplicated from {N['dataset']['productRecords']:,} product records;
one event alone has 409. Class II {N['dataset']['classCounts']['Class II']:,},
Class I {N['dataset']['classCounts']['Class I']:,}, Class III
{N['dataset']['classCounts']['Class III']:,}, so {pct(N['dataset']['positiveRate'])}
of rows are Class I. The rows form {N['dataset']['eventReasonPairs']:,} event–reason
pairs; {N['dataset']['pairsWithMultipleClassifications']} carry more than one FDA
classification, and {N['dataset']['eventsWithConflictingLabels']} of those disagree
on the Class I target.

**1.1** A recall event is one decision about one problem, written once and copied
onto every product in the recall. Counting product records would count that one
decision many times. Worse, a random split of product records would put copies
of the same text on both sides, so the test would reward memory rather than
generalisation to a new recall (you will measure this in Task 7). A model in use
meets new recall events, so whole events are kept together in the split, and one
row is an event–reason–classification record within an event.

**1.2** It records FDA's judgement of how serious the health hazard is. It is not
a measured health outcome: it does not say whether anyone was harmed, and it is
based on more information than the short reason text contains.

**1.3** They are real label conflicts in the FDA records: the same text, in the
same event, received different classifications. There is no strong methodological
reason to remove them. They are kept because they are part of the data the model
must face, they show that the text alone does not necessarily determine the label,
and they cap what any model can achieve. Because the split groups whole events, the
rows of a conflicting pair are always on the same side, so they cannot leak."""),

# ---------------------------------------------------------------- Task 2
("md", """## Task 2 — Split by recall event, and set a baseline

The split below keeps every recall event entirely on one side
(`StratifiedGroupKFold`, 4 folds, first fold used as the test set, groups =
`event_id`). It is the split used on the website and in the lecture, so your
numbers can be compared with theirs. Run it, then:

1. check that no `event_id` appears in both `train` and `test`;
2. report the sizes and the Class I fraction of each side;
3. fit a `DummyClassifier(strategy="most_frequent")` and evaluate it on the
   test set with `evaluate`."""),
("code", """sgk = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=SEED)
train_idx, test_idx = next(sgk.split(df.reason_for_recall, df.is_class_I, groups=df.event_id))
train, test = df.iloc[train_idx], df.iloc[test_idx]
X_train, y_train = train.reason_for_recall, train.is_class_I.values
X_test, y_test = test.reason_for_recall, test.is_class_I.values"""),
("task", STUDENT_CODE, """shared = set(train.event_id) & set(test.event_id)
print("events on both sides:", len(shared))
print("train:", len(train), "rows, Class I", round(y_train.mean(), 4))
print("test: ", len(test), "rows, Class I", round(y_test.mean(), 4))

dummy = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)
results = [evaluate(y_test, dummy.predict_proba(X_test)[:, 1], "majority baseline")]
pd.DataFrame(results).round(4)"""),
("md", """**Question 2.1.** What does the baseline's accuracy mean, and why is its F1
for Class I zero? Any model you build must be compared with this number."""),
("answer", f"""No event is on both sides. Train {N['split']['train']:,} rows, test
{N['split']['test']:,} rows, both about {pct(N['split']['testPositiveRate'])} Class I.

**2.1** Always answering "not Class I" is right {pct(V['majority']['accuracy'])} of
the time on the test set, because that is the share of Class II/III rows. It
never predicts Class I, so it finds no Class I text: recall 0 and F1 0. A model
at 70% accuracy would look respectable and be only ten points better than doing
nothing."""),

# ---------------------------------------------------------------- Task 3
("md", """## Task 3 — Turn text into numbers

Fit a `CountVectorizer()` with its default settings **on the training text
only**. Then:

1. report the size of the vocabulary;
2. transform the first training text and print the words it contains with their
   counts (`vec.inverse_transform` or the non-zero columns of the row);
3. transform the new text `"Product contains undeclared lupin flour."` and say
   which of its words survive.

Explorer C on the Week 5 page does the same thing for three texts at a time."""),
("task", STUDENT_CODE, """vec = CountVectorizer().fit(X_train)
print("vocabulary size:", len(vec.vocabulary_))

row = vec.transform([X_train.iloc[0]])
print(X_train.iloc[0])
print({str(w): int(row[0, vec.vocabulary_[w]]) for w in vec.inverse_transform(row)[0]})

new = "Product contains undeclared lupin flour."
print("tokens:", vec.build_analyzer()(new))
print("kept:  ", [str(w) for w in vec.inverse_transform(vec.transform([new]))[0]])"""),
("md", """**Question 3.1.** What happened to "lupin", and why? What does this mean
for a recall that describes a hazard in words the training data never used?

**Question 3.2.** Why must the vectorizer be fitted on the training text only?"""),
("answer", f"""The training vocabulary has {N['vectorizer']['vocabularyTrain']:,} words. A
typical text uses about a dozen of them, so each row of the document-term matrix
is almost entirely zeros.

**3.1** "lupin" never occurs in the training texts, so it is not in the
vocabulary, and `transform` silently drops it. The model sees only "product",
"contains", "undeclared" and "flour". A hazard described in new words is
invisible to the model; nothing warns you.

**3.2** The vocabulary is learned from data, so the vectorizer is part of the
model. Fitting it on all the text would let the test texts decide which columns
exist (and, for TF-IDF, their weights): the pipeline would learn from the test
set. Task 7 measures what that does here."""),

# ---------------------------------------------------------------- Task 4
("md", """## Task 4 — Build the pipeline and evaluate it

Build a `Pipeline` of `CountVectorizer()` and `MultinomialNB(alpha=1.0)` named
`model`, fit it on the training rows, compute `p = model.predict_proba(X_test)[:, 1]`,
and add its evaluation to `results`. Print the results table (baseline and
naive Bayes)."""),
("task", STUDENT_CODE, """model = Pipeline([("vectorizer", CountVectorizer()),
                  ("classifier", MultinomialNB(alpha=1.0))])
model.fit(X_train, y_train)
p = model.predict_proba(X_test)[:, 1]
results.append(evaluate(y_test, p, "counts + MultinomialNB"))
pd.DataFrame(results).round(4)"""),
("md", """**Question 4.1.** Summarise the result in two sentences, relative to the
baseline. Which error is more common, missed Class I texts or false alarms?

**Question 4.2.** Check your numbers against the classifier explorer on the
Week 5 page at alpha = 1. Why do they agree exactly?"""),
("answer", f"""Naive Bayes reaches {pct(M['accuracy'])} accuracy against
{pct(V['majority']['accuracy'])} for the baseline, with Class I precision
{M['precision']:.3f}, recall {M['recall']:.3f}, F1 {M['f1']:.3f} and ROC AUC
{M['rocAuc']:.3f}.

**4.1** It finds {M['tp']} of the {M['tp'] + M['fn']} Class I texts (missing
{M['fn']}) and raises {M['fp']} false alarms among {M['fp'] + M['tn']:,} Class II/III
texts, so false alarms are the more common error. It is clearly better than the
baseline and far from perfect.

**4.2** The page fits the same model (same tokenisation rule, same vocabulary,
same smoothing) to the same training rows and tests on the same rows. With a fixed
split and a deterministic model, the result is reproducible to the last digit."""),

# ---------------------------------------------------------------- Task 5
("md", """## Task 5 — Open the model

Naive Bayes stores everything it learned in two arrays: `class_log_prior_`
(log P(class)) and `feature_log_prob_` (log P(word | class), one row per class).

**(a)** For the test text whose `p` is closest to 0.5, compute the log-score of each class by hand,
`class_log_prior_ + counts @ feature_log_prob_.T`, turn the two scores into
P(Class I | text), and check that it equals `p[i]`.

**(b)** Compute each word's log-ratio, `feature_log_prob_[1] - feature_log_prob_[0]`.
List the 15 words that push hardest towards Class I, first among words used at
least 10 times in the training text, then among words used in at least 20
different training **events**."""),
("task", STUDENT_CODE, """vec, nb = model.named_steps["vectorizer"], model.named_steps["classifier"]

# (a) one prediction by hand
i = int(np.argmin(np.abs(p - 0.5)))
x = vec.transform([X_test.iloc[i]])
scores = nb.class_log_prior_ + x @ nb.feature_log_prob_.T      # shape (1, 2)
scores = np.asarray(scores).ravel()
by_hand = 1 / (1 + np.exp(scores[0] - scores[1]))
print(X_test.iloc[i])
print("log-scores (not Class I, Class I):", scores.round(3))
print("by hand:", round(by_hand, 6), " predict_proba:", round(p[i], 6))

# (b) the words with the largest log-ratio
words = vec.get_feature_names_out()
ratio = nb.feature_log_prob_[1] - nb.feature_log_prob_[0]
count = np.asarray(vec.transform(X_train).sum(axis=0)).ravel()
order = np.argsort(ratio)[::-1]
print("\\nused >= 10 times:", [str(w) for w in words[order] if count[vec.vocabulary_[w]] >= 10][:15])

analyse = vec.build_analyzer()
events = {}
for eid, text in zip(train.event_id, X_train):
    for w in set(analyse(text)):
        events.setdefault(w, set()).add(eid)
n_events = np.array([len(events.get(w, ())) for w in words])
print("in >= 20 events: ", [str(w) for w in words[order] if n_events[vec.vocabulary_[w]] >= 20][:15])"""),
("md", """**Question 5.1.** Explain in one sentence why `p[i]` can be computed with
only additions, then one subtraction and one exponential.

**Question 5.2.** Read the two word lists. What do the first describe, and what
do the second describe? What does this tell you about what a model learns?"""),
("answer", f"""**5.1** Taking logs turns the naive product P(class) × Π P(word | class)
into a sum; with two classes, the posterior is the logistic function of the
difference between the two sums. That is also why the hand calculation and
`predict_proba` agree to every printed digit.

**5.2** Among words used at least 10 times, the top of the list is
{', '.join(w['word'] for w in N['words']['classI'][:6])}: firm and place names from a
few large outbreak recalls, repeated across many texts. Requiring 20 different
events leaves mostly hazards:
{', '.join(w['word'] for w in N['words']['byEvents']['classI'][:12])} (one firm,
sunland, still leads). The model learns whatever separates the classes in the
training data, including who wrote the notice. A frequency filter for display
does not change the model: the firm names still vote."""),

# ---------------------------------------------------------------- Task 6
("md", """## Task 6 — Error analysis

Print the five most confident false positives (FDA Class II/III, highest `p`)
and the five most confident false negatives (FDA Class I, lowest `p`), with the
FDA class and the full text."""),
("task", STUDENT_CODE, """errors = test.assign(p=p)
fp_ = errors[(errors.is_class_I == 0) & (errors.p >= 0.5)].sort_values("p", ascending=False).head(5)
fn_ = errors[(errors.is_class_I == 1) & (errors.p < 0.5)].sort_values("p").head(5)
for name, d in [("FALSE POSITIVES", fp_), ("FALSE NEGATIVES", fn_)]:
    print(name)
    for _, r in d.iterrows():
        print(f"  p={r.p:.3f}  {r.classification}:  {r.reason_for_recall}")"""),
("md", """**Question 6.1.** For each group, what do the texts have in common? Could the
text alone have told a person the FDA class?

**Question 6.2.** Suggest one change to the data or the task (not the model)
that would make this classification better defined."""),
("answer", """**6.1** The most confident false positives all name *Listeria monocytogenes*,
the word pattern most strongly tied to Class I, yet FDA classified them as Class
II. The most confident false negatives are mostly allergen-labelling texts
(undeclared milk, wheat or soy) that FDA classified as Class I, while many similar
allergen texts are Class II. In both groups the same words lead to different
classes: the decision depends on the product, the exposure and the evidence
behind the recall, which the short reason text only partly records. Some of
these are not model errors in any useful sense; the text does not contain the
answer.

**6.2** Any reasonable change, for example: add the product description and the
distribution pattern as inputs; model allergen and pathogen recalls separately;
or ask domain experts to review a sample of disagreements to estimate how much
of the label the text can carry at all."""),

# ---------------------------------------------------------------- Task 7
("md", """## Task 7 — Leakage: the whole pipeline must not learn from the test set

**(a) Vectorizer fitted on all text.** Fit `CountVectorizer()` on **all**
`df.reason_for_recall`, then fit `MultinomialNB()` on the transformed training
rows and evaluate on the transformed test rows. How many vocabulary words occur
only in test texts?

**(b) Split by product record.** Expand the data to one row per product record,
`rows = df.loc[df.index.repeat(df.n_product_records)]`, split it at random with
`train_test_split(test_size=0.25, stratify=..., random_state=SEED)`, fit the same
pipeline, evaluate it, and report the fraction of test texts that appear word
for word in the training texts. Do the same check for the event split."""),
("task", STUDENT_CODE, """# (a) the vectorizer sees the test text
vec_all = CountVectorizer().fit(df.reason_for_recall)
nb_leaky = MultinomialNB().fit(vec_all.transform(X_train), y_train)
p_leaky = nb_leaky.predict_proba(vec_all.transform(X_test))[:, 1]
print("vocabulary from all text:", len(vec_all.vocabulary_),
      "| only in test:", len(set(vec_all.vocabulary_) - set(vec.vocabulary_)))
results.append(evaluate(y_test, p_leaky, "LEAKY: vectorizer fitted on all text"))

# (b) split by product record
rows = df.loc[df.index.repeat(df.n_product_records)].reset_index(drop=True)
Ra, Rb, ya, yb = train_test_split(rows.reason_for_recall, rows.is_class_I.values,
                                  test_size=0.25, stratify=rows.is_class_I.values,
                                  random_state=SEED)
p_rec = Pipeline([("vectorizer", CountVectorizer()),
                  ("classifier", MultinomialNB())]).fit(Ra, ya).predict_proba(Rb)[:, 1]
results.append(evaluate(yb, p_rec, "LEAKY: split by product record"))
print("product records:", len(rows))
print("test texts already in training, record split:", round(Rb.isin(set(Ra)).mean(), 3))
print("test texts already in training, event split: ", round(X_test.isin(set(X_train)).mean(), 3))
pd.DataFrame(results).round(4)"""),
("md", """**Question 7.1.** Which mistake inflated the score, and by how much? Explain why.

**Question 7.2.** The vectorizer leak barely changed the score. Is it therefore
acceptable? Give two reasons.

**Question 7.3.** 14% of test texts appear word for word in training even with
the event split. Is that leakage?"""),
("answer", f"""**7.1** The record split inflates everything: accuracy
{pct(LK['recordSplit']['accuracy'])} and ROC AUC {LK['recordSplit']['rocAuc']:.3f},
against {pct(M['accuracy'])} and {M['rocAuc']:.3f}. Products from one recall land on
both sides, so {pct(LK['recordSplit']['identicalTextInTrain'], 0)} of test texts
were already seen in training. The model is no better; the test has become a
memory test.

**7.2** No. The leaky vectorizer gives {pct(LK['vectorizer']['count']['leaky']['accuracy'])}
against {pct(M['accuracy'])}: almost no change, because the
{LK['vectorizer']['count']['testOnlyWords']:,} test-only words never appear in a
training row, so naive Bayes gives them only smoothing mass. It is still wrong:
(1) the pipeline cannot be reproduced on a genuinely new text, because its
vocabulary depended on the test set; (2) with another representation, such as
TF-IDF, the test texts change every weight; and (3) as in Week 3, leakage is not
reliably visible in the score, so the only protection is to prevent it by
construction, fitting every learned step inside a `Pipeline` on training data.
The test set is not just data that the classifier does not train on. It is data
that the entire modelling pipeline must not learn from.

**7.3** No. Those are separate recall events that reuse the same standard
wording ("Product may be contaminated with Listeria monocytogenes."). That
repetition is a real property of the data the model will meet in use. Leakage
is when the evaluation sees information the model would not have at prediction
time; a recurring phrase from a different event is not that."""),

# ---------------------------------------------------------------- Task 8
("md", """## Task 8 — Probabilities, and the reproducibility record

**(a)** Plot a histogram of `p` (20 bins) and report the fraction of predictions
below 0.05 or above 0.95.

**(b)** Plot a reliability diagram with `calibration_curve(y_test, p, n_bins=10)`
and the diagonal, and report the Brier score."""),
("task", STUDENT_CODE, """fig, ax = plt.subplots(1, 2, figsize=(11, 4))
ax[0].hist(p, bins=20, color="#1f5f4b")
ax[0].set(xlabel="predict_proba, Class I", ylabel="test texts", title="How the predictions are spread")
frac_true, mean_pred = calibration_curve(y_test, p, n_bins=10)
ax[1].plot([0, 1], [0, 1], "--", color="grey")
ax[1].plot(mean_pred, frac_true, "o-", color="#b8702a")
ax[1].set(xlabel="mean predicted probability", ylabel="observed fraction Class I",
          title="Reliability diagram (test set)")
plt.tight_layout(); plt.show()
print("fraction below 0.05 or above 0.95:", round(np.mean((p < 0.05) | (p > 0.95)), 4))
print("Brier score:", round(brier_score_loss(y_test, p), 4))"""),
("md", """**Question 8.1.** A text gets `predict_proba = 0.99`. Is that a 99%
probability that the recall is Class I? Use your two plots.

**Question 8.2.** Why does naive Bayes push its scores towards 0 and 1?"""),
("answer", f"""{pct(M['fractionExtreme'])} of the predictions are below 0.05 or above
0.95, and the Brier score is {M['brier']:.3f}.

**8.1** Not automatically. The reliability diagram shows the extreme bins are
over-confident: among texts scored below 0.1 (mean score about 0.01), about 8% are
in fact Class I, and among texts scored above 0.9 (mean score about 0.99), only
about 79% are. A score of 0.99 says the model
ranks the text strongly towards Class I. Whether it is a calibrated probability
is a separate question, answered over groups of predictions as in Week 4.

**8.2** The independence assumption counts correlated words ("listeria",
"monocytogenes", "contaminated") as separate pieces of evidence, so the same
evidence is multiplied in several times and the log-odds grow too large."""),
("md", """### The reproducibility record

Complete the table in the markdown cell below. Someone else should be able to
repeat your Task 4 result exactly from it.

| Item | Your entry |
|---|---|
| Data (file, source, snapshot date, rows) | |
| Unit of observation | |
| Target and class balance | |
| Split (method, seed, groups, sizes) | |
| Pipeline (every step and its settings) | |
| What was fitted on what | |
| Baseline | |
| Test-set results (accuracy, precision, recall, F1, ROC AUC, Brier) | |
| Software versions (from the cell below) | |
| One thing this result does **not** show | |"""),
("code", """import sklearn, sys
print("Python", sys.version.split()[0], "| scikit-learn", sklearn.__version__,
      "| numpy", np.__version__, "| pandas", pd.__version__)"""),
("answer", f"""| Item | Entry |
|---|---|
| Data | `data/openfda_food_recall_events.csv`: openFDA food enforcement export, last_updated 2026-09-28, frozen; {N['dataset']['rows']:,} rows |
| Unit of observation | an event–reason–classification record ({N['dataset']['events']:,} events, {N['dataset']['eventReasonPairs']:,} event–reason pairs; {N['dataset']['pairsWithMultipleClassifications']} pairs with more than one FDA class); split groups whole events |
| Target and class balance | `is_class_I` (Class I vs II/III); {pct(N['dataset']['positiveRate'])} Class I |
| Split | StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=42), first fold, groups = event_id; {N['split']['train']:,} train / {N['split']['test']:,} test, no shared events |
| Pipeline | CountVectorizer() defaults → MultinomialNB(alpha=1.0); positive if p ≥ 0.5 |
| What was fitted on what | vectorizer and classifier fitted on the training rows only, via the Pipeline; test set used once |
| Baseline | majority class: accuracy {pct(V['majority']['accuracy'])}, F1 0 |
| Test-set results | accuracy {M['accuracy']:.4f}, precision {M['precision']:.4f}, recall {M['recall']:.4f}, F1 {M['f1']:.4f}, ROC AUC {M['rocAuc']:.4f}, Brier {M['brier']:.4f} |
| Versions | as printed above |
| Not shown | that the model judges health risk: it predicts FDA's administrative label from a short text, on one split, and its probabilities are not calibrated |"""),
("md", """---
## ✅ CORE LAB COMPLETE

You have built a complete pipeline (data, unit of observation, split,
vectorizer, model, evaluation, error analysis, leakage checks, probabilities and
a record). The two extensions below are **optional**."""),

# ---------------------------------------------------------------- Ext A
("md", """## Extension A (optional) — Other representations, and choosing alpha honestly

**(a)** Evaluate `TfidfVectorizer() + MultinomialNB()` and
`CountVectorizer(binary=True) + BernoulliNB()` on the same split and add them to
`results`.

**(b)** Choose `alpha` for the counts + MultinomialNB pipeline with
`GridSearchCV` over `[0.01, 0.03, 0.1, 0.3, 1, 3]`, using `GroupKFold(n_splits=4)`
on the **training rows only** (groups = training `event_id`, scoring = `"f1"`).
Then evaluate the chosen model once on the test set."""),
("task", STUDENT_CODE, """for name, pipe in [
        ("TF-IDF + MultinomialNB", Pipeline([("vectorizer", TfidfVectorizer()), ("classifier", MultinomialNB())])),
        ("presence + BernoulliNB", Pipeline([("vectorizer", CountVectorizer(binary=True)), ("classifier", BernoulliNB())]))]:
    results.append(evaluate(y_test, pipe.fit(X_train, y_train).predict_proba(X_test)[:, 1], name))

search = GridSearchCV(Pipeline([("vectorizer", CountVectorizer()), ("classifier", MultinomialNB())]),
                      {"classifier__alpha": [0.01, 0.03, 0.1, 0.3, 1, 3]},
                      cv=GroupKFold(n_splits=4), scoring="f1")
search.fit(X_train, y_train, groups=train.event_id)
print("cross-validated F1 by alpha:",
      dict(zip(search.cv_results_["param_classifier__alpha"], search.cv_results_["mean_test_score"].round(4))))
print("chosen alpha:", search.best_params_["classifier__alpha"])
results.append(evaluate(y_test, search.predict_proba(X_test)[:, 1],
                        f"counts + MultinomialNB, alpha={search.best_params_['classifier__alpha']} (CV)"))
pd.DataFrame(results).round(4)"""),
("md", """**Question A.1.** Which representation would you choose, and on which metric?
Why is it legitimate to choose alpha with `GridSearchCV` here, but not by
trying values and watching the test score (or the slider on the website)?"""),
("answer", f"""TF-IDF + MultinomialNB: accuracy {pct(V['tfidf_mnb']['accuracy'])}, F1
{V['tfidf_mnb']['f1']:.3f}, ROC AUC {V['tfidf_mnb']['rocAuc']:.3f}; presence +
BernoulliNB: accuracy {pct(V['binary_bnb']['accuracy'])}, F1
{V['binary_bnb']['f1']:.3f}. The accuracy differences (up to about a point) are
within the approximate ±1.6-point sampling interval for accuracy on one test set of
{N['split']['test']:,} texts; for F1 and AUC no interval is computed here, and one
split is not enough to rank them. Counts give the best recall and F1; TF-IDF gives the best ROC AUC and much
less extreme probabilities. The choice depends on what the score will be used
for, and should be made on training data.

Grouped cross-validation on the training rows picks alpha = 0.1 (mean F1 0.706,
against 0.701 at alpha = 1). Evaluated once on the test set, that model scores
79.5% accuracy and F1 0.758: a small change. The accuracy gain (0.4 points) is well
inside the approximate ±1.6-point sampling interval, so it is not evidence of a
better model.

**A.1** `GridSearchCV` compares alpha values on folds of the training rows only,
with whole events kept together, and the test set is used once, after the choice.
Choosing alpha by watching the test score makes the test set part of model
selection, so its score is no longer an unbiased estimate (Week 3)."""),

# ---------------------------------------------------------------- Ext B
("md", f"""## Extension B (optional) — A pretrained sentence encoder

A pretrained encoder maps each text to a fixed-length vector (an embedding),
which a simple classifier then uses. The module team ran this once on exactly
your split, with `sentence-transformers/all-MiniLM-L6-v2` (revision
`1110a243`, about 22.7 million parameters, a ~91 MB download) and
`LogisticRegression(C=1, max_iter=2000)` on the normalised embeddings. The stored
results are below, so **nothing needs to be downloaded**.

If you have `sentence-transformers` installed and want to reproduce them, set
`RUN_ENCODER = True`. This downloads the model once (about 91 MB) and takes
around ten seconds on a laptop CPU. It is not required."""),
("code", f"""RUN_ENCODER = False   # optional: needs the sentence-transformers package and a one-time download

stored = {lm_dict}
if RUN_ENCODER:
    from sentence_transformers import SentenceTransformer
    from sklearn.linear_model import LogisticRegression
    enc = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2",
                              revision="1110a243fdf4706b3f48f1d95db1a4f5529b4d41", device="cpu")
    E_train = enc.encode(list(X_train), batch_size=64, normalize_embeddings=True)
    E_test = enc.encode(list(X_test), batch_size=64, normalize_embeddings=True)
    lr = LogisticRegression(C=1.0, max_iter=2000).fit(E_train, y_train)
    results.append(evaluate(y_test, lr.predict_proba(E_test)[:, 1], "pretrained encoder + LR (run here)"))
    print(pd.DataFrame(results).round(4))
else:
    print("Stored results, same split:", stored)"""),
("md", """**Question B.1.** Compare the encoder with naive Bayes on accuracy, F1, ROC
AUC and Brier score. Then compare them on cost, dependencies and how easily one
prediction can be explained. Which would you deploy for this task, and what
evidence would change your mind?"""),
("answer", ("" if not LM else f"""The encoder: accuracy {pct(LM['accuracy'])}, F1
{LM['f1']:.3f}, ROC AUC {LM['rocAuc']:.3f}, Brier {LM['brier']:.3f}; naive Bayes:
{pct(M['accuracy'])}, {M['f1']:.3f}, {M['rocAuc']:.3f}, {M['brier']:.3f}. The accuracy
difference is small relative to the approximate sampling interval (about ±1.6
points on {N['split']['test']:,} texts). F1 and AUC are also numerically close, but
this single test split is not enough to establish a meaningful difference. The
encoder has higher precision and lower recall. The encoder has better probability
performance on this test set: a lower Brier score and far fewer extreme
predictions (only {pct(LM['fractionExtreme'], 0)} of its predictions are below 0.05
or above 0.95, against {pct(M['fractionExtreme'], 0)}). Whether either model is
well calibrated requires a reliability analysis, as in Week 4.

Naive Bayes has about 13,500 parameters, fits in a fraction of a second with
scikit-learn alone, and every prediction can be read word by word. The encoder
has 22.7 million pretrained parameters, needs PyTorch and a model download, and
its 384 numbers per text have no direct meaning. On these short, formulaic texts,
the simple model holds its own; a reasonable choice is naive Bayes, with
calibration checked if its probabilities are used. Evidence that would change the
choice: a clear gain on a larger or grouped-cross-validated evaluation, texts
where wording varies more (where meaning beyond keywords matters), or a need for
calibrated probabilities that recalibrating naive Bayes cannot meet. This is a
finding about this task, not a verdict on either kind of model.""")),
]


def build(solutions):
    nb = nbformat.v4.new_notebook()
    nb.metadata["kernelspec"] = {"display_name": "Python 3",
                                 "language": "python", "name": "python3"}
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
    if solutions:
        first = out[0].source
        first = first.replace("# COMP9085 Week 5 Laboratory",
                              "# COMP9085 Week 05 Lab — Worked Solutions", 1)
        first = first.replace(
            "**Deliverable.** This notebook, run top to bottom, with every question answered\n"
            "in the markdown cells.",
            "**About this notebook.** Complete code, outputs, plots and worked answers for\n"
            "every task. Try each task yourself before reading its worked answer.")
        out[0].source = first
    nb.cells = out
    return nb


def html(nb, path):
    body, _ = HTMLExporter().from_notebook_node(nb)
    with open(path, "w") as f:
        f.write(body)


def main():
    os.makedirs(SOL, exist_ok=True)
    student = build(False)
    nbformat.write(student, os.path.join(OUT, "COMP9085_Week05_Lab.ipynb"))
    html(student, os.path.join(OUT, "COMP9085_Week05_Lab.html"))

    sol = build(True)
    assert "About this notebook" in sol.cells[0].source
    ExecutePreprocessor(timeout=600, kernel_name="python3").preprocess(
        sol, {"metadata": {"path": OUT}})
    nbformat.write(sol, os.path.join(SOL, "COMP9085_Week05_Lab_Worked_Solutions.ipynb"))
    html(sol, os.path.join(SOL, "COMP9085_Week05_Lab_Worked_Solutions.html"))
    print("student and executed solutions written to", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
