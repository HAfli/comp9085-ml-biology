#!/usr/bin/env python3
"""
Week 4 lab: build the student notebook and the worked-solutions notebook from
ONE source, so the two cannot drift apart.

Outputs
    labs/week04/COMP9085_Week04_Lab.ipynb                         public, no answers
    labs/week04/COMP9085_Week04_Lab.html                          public, rendered
    labs/week04/solutions/COMP9085_Week04_Lab_Worked_Solutions.ipynb
    labs/week04/solutions/COMP9085_Week04_Lab_Worked_Solutions.html

The worked solutions are written for students and are released on Canvas after
the lab. The solutions folder is excluded by .gitignore, so they are not served
by the public site before then. The worked-solutions notebook is EXECUTED here,
so every number in it is a real output.

    python3 data/scripts/09_build_week04_lab.py          # needs nbformat, nbconvert, ipykernel
"""
import os

import nbformat
from nbconvert import HTMLExporter
from nbconvert.preprocessors import ExecutePreprocessor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "labs", "week04")
SOL = os.path.join(OUT, "solutions")

STUDENT_CODE = "# your code here\n"
STUDENT_TEXT = "*Your answer here.*"

# Each entry: ("md", text) | ("code", starter) | ("task", student_code, solution_code)
# | ("answer", solution_markdown). "answer" cells appear only in the worked
# solutions; the lab notebook shows an empty answer cell instead.
CELLS = [
("md", """# COMP9085 Week 4 Laboratory
## Bayes in healthcare: from prediction to probability

**Two hours.** Week 3 asked whether you could trust the experiment. This lab
asks the Week 4 question: **suppose you trust it, what does the prediction
actually mean?**

You will build a confusion matrix for a real diagnostic model, compute
sensitivity, specificity, PPV and NPV by hand, move the same model into
populations with different prevalence, choose a decision threshold honestly,
and check whether the model's probabilities mean what they say.

**Data.** UCI Breast Cancer Wisconsin (Diagnostic), the same 569 cases and the
same encoding as Weeks 2 and 3: `1 = malignant`. This is **real data used for
classroom evaluation, not evidence of clinical performance.** The prevalence
values in Part B are hypothetical populations chosen for teaching.

**Structure.** The core lab is **Tasks 1–8 and 10–11**. Task 9 is an optional
extension. A checkpoint after Task 8 marks the end of the computational core.

**The Week 4 page is your interactive companion.**

| Tasks | Interactive on the Week 4 page |
|---|---|
| 1 | Confusion-matrix calculator (rows = what is true, columns = what the test says) |
| 2–4 | Diagnostic test (Bayes) calculator and Prevalence explorer |
| 5–7 | Decision threshold explorer |
| 8–9 | Calibration explorer |
| 10 | Which error matters more? (decision reasoning) |
| 11 | The evaluation record |

Explore the calculator and the prevalence explorer before the lab, implement the
same reasoning here in Python, then compare your results with the threshold and
calibration explorers afterwards.

**Deliverable.** This notebook, run top to bottom, with every question answered
in the markdown cells."""),
("md", "### Setup"),
("code", """import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.calibration import calibration_curve, CalibratedClassifierCV
from sklearn.metrics import (confusion_matrix, roc_auc_score, brier_score_loss, accuracy_score,
                             roc_curve, precision_recall_curve, average_precision_score)

import sklearn
print("scikit-learn", sklearn.__version__, "| numpy", np.__version__)   # for Task 11

SEED = 42
X, y = load_breast_cancer(return_X_y=True)
y = (y == 0).astype(int)        # 1 = malignant, as in Weeks 2 and 3

# The same protocol as Week 3: a stratified development (training) pool and a
# final test set. Every modelling decision (including the threshold) is made on
# the development pool; the final test set is used only after it is frozen.
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, stratify=y, random_state=SEED)
print(f"train pool {len(y_train)}  |  final test {len(y_test)} "
      f"({y_test.sum()} malignant, {len(y_test) - y_test.sum()} benign)")"""),

("md", """---
## Part A — The confusion matrix and the four questions

**Definitions used this week** (identical in the lecture, on the Week 4 page and
here). Rows of the confusion matrix are what is true; columns are what the test
or model says.

| | Formula | Question it answers |
|---|---|---|
| Sensitivity | TP / (TP + FN) | Of those who really have the condition, how many were found? |
| Specificity | TN / (TN + FP) | Of those who do not, how many were cleared? |
| PPV | TP / (TP + FP) | Of those flagged positive, how many really have it? |
| NPV | TN / (TN + FN) | Of those cleared, how many are really clear? |

**Prevalence** is the fraction of the tested population that has the condition.
A case is predicted positive when its probability is at least the threshold:
**positive if p ≥ t** (t = 0.5 unless stated otherwise)."""),
("md", """## Task 1 — Build the matrix, and name every cell in biological terms

Fit `make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))` on the
training pool. Obtain predicted probabilities for the test set with
`predict_proba(X_test)[:, 1]`, classify at the default threshold of 0.5, and
produce the confusion matrix. Print TP, FP, FN and TN separately.

**Question 1.1.** Write one sentence for each cell saying what it means *for a
patient*, e.g. "a false negative is ...".

**Question 1.2.** Suppose, hypothetically, this model were used to decide which
masses are sent for further investigation. Which of the two error cells would
you care about most in that setting, and why? Would your answer change in a
different setting? Is that a statistical judgement or a clinical one?"""),
("task", STUDENT_CODE, """lr = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
lr.fit(X_train, y_train)
p_lr = lr.predict_proba(X_test)[:, 1]
pred = (p_lr >= 0.5).astype(int)
tn, fp, fn, tp = confusion_matrix(y_test, pred).ravel()
print(pd.DataFrame([[tn, fp], [fn, tp]],
                   index=["actually benign", "actually malignant"],
                   columns=["predicted benign", "predicted malignant"]))
print(f"TP={tp}  FP={fp}  FN={fn}  TN={tn}")"""),
("answer", """**1.1** TP: a malignant mass correctly flagged. FP: a benign mass flagged,
leading to unnecessary worry and investigation. FN: a malignant mass the model
cleared, so a cancer could be missed or delayed. TN: a benign mass correctly
cleared.

**1.2** It depends on the setting. In this hypothetical triage setting, many
people would weigh the false negative more heavily: a missed malignancy could
delay treatment, while a false positive leads to a further test that is costly
and stressful but usually recoverable. If the next step were invasive or scarce,
false positives would weigh more. Deciding this is a clinical and ethical
judgement about consequences; the statistics only tell you how many of each
error you make."""),

("md", """## Task 2 — Four metrics, four denominators

Using **only** the four counts from Task 1 and plain arithmetic (no sklearn
metric functions), compute sensitivity, specificity, PPV and NPV. For each,
print the fraction as `numerator / denominator = value` so the denominator is
visible.

**Question 2.1.** Sensitivity and PPV both have TP on top. Say, in words, what
group of people each one divides by.

**Question 2.2.** Which two of the four would you expect to stay roughly the
same if this model were used in a hospital where malignancy is much rarer?
Which two would change? (Part B checks your answer.)"""),
("task", STUDENT_CODE, """def show(name, num, den):
    print(f"{name:12s} {num:>3d} / {den:<3d} = {num / den:.3f}")

show("sensitivity", tp, tp + fn)   # of the truly malignant
show("specificity", tn, tn + fp)   # of the truly benign
show("PPV",         tp, tp + fp)   # of those predicted malignant
show("NPV",         tn, tn + fn)   # of those predicted benign
sens_lr, spec_lr = tp / (tp + fn), tn / (tn + fp)"""),
("answer", """**2.1** Sensitivity divides by everyone who is *truly malignant* (TP + FN):
it asks how the test behaves when disease is present. PPV divides by everyone
who *tested positive* (TP + FP): it asks what a positive result means.

**2.2** PPV and NPV will change: prevalence enters their calculation directly.
Sensitivity and specificity are conditional on true disease status, so
prevalence does not enter their formulas. They are not guaranteed to be
unchanged, though: a different population often brings a different case mix
(for example smaller or earlier tumours), which can change them too. Expect
them to be more stable than PPV and NPV, and check."""),

("md", """---
## Part B — Bayes and the population"""),
("md", """## Task 3 — Write Bayes' rule once, and check it against the lecture

Write a function `predictive_values(sens, spec, prev)` that returns
`(ppv, npv)` using Bayes' rule:

$$PPV = \\frac{sens \\cdot prev}{sens \\cdot prev + (1-spec)(1-prev)} \\qquad
NPV = \\frac{spec (1-prev)}{spec (1-prev) + (1-sens)\\, prev}$$

Check it on the lecture's hypothetical example: sensitivity 0.95, specificity
0.95, prevalence 0.01. You should get PPV ≈ 0.161 and NPV ≈ 0.9995.

**Question 3.1.** Redo the same example as **natural frequencies** for 10,000
people: how many are ill, how many test positive, how many of the positives are
ill? Which representation would you use to explain the result to a patient?"""),
("task", STUDENT_CODE, """def predictive_values(sens, spec, prev):
    ppv = sens * prev / (sens * prev + (1 - spec) * (1 - prev))
    npv = spec * (1 - prev) / (spec * (1 - prev) + (1 - sens) * prev)
    return ppv, npv

ppv, npv = predictive_values(0.95, 0.95, 0.01)
print(f"PPV {ppv:.4f}   NPV {npv:.5f}")
assert abs(ppv - 0.161) < 0.001

n = 10_000
ill = n * 0.01; tp_ = ill * 0.95; fp_ = (n - ill) * 0.05
print(f"{ill:.0f} ill, {tp_:.0f} true positives, {fp_:.0f} false positives, "
      f"PPV = {tp_:.0f}/{tp_ + fp_:.0f} = {tp_ / (tp_ + fp_):.3f}")"""),
("answer", """**3.1** Of 10,000 people, 100 are ill; 95 of them test positive. Of the 9,900
who are well, 495 test positive. So 590 test positive and 95 of those are ill:
95/590 ≈ 16 per cent. Natural frequencies are far easier to explain to a patient
than conditional probabilities (Gigerenzer and Hoffrage's classic finding)."""),

("md", """## Task 4 — Same model, different populations

Take the **sensitivity and specificity your model measured in Task 2** and use
`predictive_values` to compute PPV and NPV at four hypothetical prevalences:
the test set's own prevalence, 0.10, 0.01 and 0.001. Put the results in a
table. Then plot PPV and NPV against prevalence from 0.001 to 0.5 on a
log-scaled x-axis.

**Question 4.1.** The model did not change between the rows of your table.
What did change, and why does it lower the PPV so much at 0.001? What could be
changed in practice to raise it?

**Question 4.2.** WDBC is about 37 per cent malignant. What does that tell you
about quoting the PPV you measured on this test set to a population screening
programme?

**Question 4.3.** Open the **Diagnostic test (Bayes) calculator** on the
Week 4 page, set sensitivity and specificity to your measured values and the
prevalence to 1%. Does the calculator's PPV agree with your function? Then use
the **Prevalence explorer** to see the same effect across five populations at
once."""),
("task", STUDENT_CODE, """prevs = [y_test.mean(), 0.10, 0.01, 0.001]
rows = []
for pr in prevs:
    a, b = predictive_values(sens_lr, spec_lr, pr)
    rows.append({"prevalence": round(pr, 4), "PPV": round(a, 3), "NPV": round(b, 5)})
print(pd.DataFrame(rows))

grid = np.logspace(-3, np.log10(0.5), 200)
pv = np.array([predictive_values(sens_lr, spec_lr, g) for g in grid])
plt.figure(figsize=(6, 3.5))
plt.semilogx(grid, pv[:, 0], label="PPV")
plt.semilogx(grid, pv[:, 1], "--", label="NPV")
plt.xlabel("prevalence (log scale)"); plt.ylabel("predictive value")
plt.title(f"Same model: sens {sens_lr:.3f}, spec {spec_lr:.3f}")
plt.legend(); plt.grid(alpha=.3); plt.show()"""),
("answer", """**4.1** The population changed, not the model. At prevalence 0.001 the
healthy group is about 1,000 times larger than the ill group, so even a small
false-positive rate produces more false positives than there are true
positives. The low PPV is not a defect of the model; it is what the same test
characteristics mean in that population. In practice PPV can be raised by
testing a higher-prevalence population (referral, symptoms, risk factors), by a
more specific test, or by a confirmatory second test on the positives.

**4.2** The test set is enriched with malignant cases compared with any
screening population, so its PPV is far higher than a screening programme
would see. Report sensitivity and specificity, state the prevalence, and
recompute PPV for the target population.

**4.3** Yes: at 1% the calculator and the function agree (about 50%) because
both apply the same Bayes' rule to the same three numbers."""),

("md", """---
## Part C — The decision threshold"""),
("md", """## Task 5 — Sweep the threshold

On the **training pool only**, obtain out-of-fold probabilities with
`cross_val_predict(lr, X_train, y_train, cv=StratifiedKFold(5, shuffle=True, random_state=SEED), method="predict_proba")[:, 1]`.
For thresholds from 0.05 to 0.95 in steps of 0.05 compute TP, FP, FN, TN,
sensitivity and specificity. Show the table and plot sensitivity and
specificity against the threshold.

**The protocol for Part C (write it down; Week 3 applies):**

> out-of-fold (OOF) development predictions → threshold selection → **freeze the
> threshold** → apply it to the final test set **once**

Out-of-fold (OOF) predictions are cross-validated predictions: each training case
is scored by a model that did not see it during fitting.

**Question 5.1.** Describe in one sentence what happens to each error type as
the threshold falls.

**Question 5.2.** Why are we using cross-validated predictions on the training
pool here rather than the test set? (Week 3 vocabulary, please.)"""),
("task", STUDENT_CODE, """cv = StratifiedKFold(5, shuffle=True, random_state=SEED)
p_oof = cross_val_predict(lr, X_train, y_train, cv=cv, method="predict_proba")[:, 1]

def at(t, p, yy):
    pr = p >= t
    TP = int((pr & (yy == 1)).sum()); FP = int((pr & (yy == 0)).sum())
    FN = int((~pr & (yy == 1)).sum()); TN = int((~pr & (yy == 0)).sum())
    return dict(threshold=round(t, 2), TP=TP, FP=FP, FN=FN, TN=TN,
                sensitivity=TP / (TP + FN), specificity=TN / (TN + FP))

sweep = pd.DataFrame([at(t, p_oof, y_train) for t in np.arange(0.05, 0.951, 0.05)])
print(sweep.round(3).to_string(index=False))
plt.figure(figsize=(6, 3.5))
plt.plot(sweep.threshold, sweep.sensitivity, label="sensitivity")
plt.plot(sweep.threshold, sweep.specificity, "--", label="specificity")
plt.xlabel("threshold"); plt.legend(); plt.grid(alpha=.3); plt.show()"""),
("answer", """**5.1** As the threshold falls, more cases are called malignant: false
negatives fall (sensitivity rises) and false positives rise (specificity
falls).

**5.2** Choosing the threshold is a modelling decision, like choosing a
hyperparameter. Choosing it by looking at the test set would make the test set
part of development, which is test-set leakage; the final test set must be
touched once, after every decision is fixed."""),

("md", """## Task 6 — ROC and precision–recall curves

Using the same **out-of-fold** probabilities `p_oof` from Task 5, plot the ROC
curve (`roc_curve`) with its AUC, and the precision–recall curve
(`precision_recall_curve`) with its average precision. Mark the point that
corresponds to the 0.5 threshold on both.

The precision–recall (PR) curve plots precision (PPV) against recall
(sensitivity). Because precision depends on how many positives there are, the PR
curve is particularly informative when positives are rare: it shows the
false-alarm burden that a ROC curve can make look small.

**Question 6.1.** What does the AUC summarise, and what two things does it NOT
tell you? (Hint: one is a decision, the other is Part D.)

**Question 6.2.** Precision is PPV. Which of the two curves would change if the
same model were used in a population with 1% prevalence, and why? Which curve
would you show for a rare condition?"""),
("task", STUDENT_CODE, """fpr, tpr, thr_roc = roc_curve(y_train, p_oof)
prec, rec, thr_pr = precision_recall_curve(y_train, p_oof)
i_roc = np.argmin(np.abs(thr_roc - 0.5)); i_pr = np.argmin(np.abs(thr_pr - 0.5))
fig, ax = plt.subplots(1, 2, figsize=(10, 4))
ax[0].plot(fpr, tpr, label=f"AUC {roc_auc_score(y_train, p_oof):.3f}")
ax[0].plot([0, 1], [0, 1], ":", color="grey")
ax[0].plot(fpr[i_roc], tpr[i_roc], "o", label="threshold 0.5")
ax[0].set_xlabel("false positive rate (1 - specificity)"); ax[0].set_ylabel("sensitivity")
ax[1].plot(rec, prec, label=f"AP {average_precision_score(y_train, p_oof):.3f}")
ax[1].plot(rec[i_pr], prec[i_pr], "o", label="threshold 0.5")
ax[1].axhline(y_train.mean(), ls=":", color="grey", label="prevalence (no-skill)")
ax[1].set_xlabel("recall (sensitivity)"); ax[1].set_ylabel("precision (PPV)")
for a in ax: a.legend(); a.grid(alpha=.3)
plt.tight_layout(); plt.show()"""),
("answer", """**6.1** AUC is the probability that a randomly chosen malignant case is scored
above a randomly chosen benign one: it summarises discrimination across all
thresholds. It does not tell you which threshold to use (a decision about the
costs of errors), and it says nothing about whether the probabilities are
calibrated.

**6.2** The ROC curve uses sensitivity and specificity, which condition on true
status, so in principle it does not move with prevalence. The precision–recall
curve uses precision (PPV), which falls sharply at low prevalence, so it would
drop. For a rare condition the PR curve shows the false-alarm burden that the
ROC curve hides (Saito and Rehmsmeier, 2015)."""),

("md", """## Task 7 — Choose a threshold for a stated purpose, then test it once

**Hypothetical scenario.** Suppose the model were used to decide which masses get
**further investigation**, and a (hypothetical) clinical team asked for
sensitivity of at least 0.97. Using the **out-of-fold** table from Task 5,
choose the highest threshold that meets that target and **freeze it**. Only then
apply it to the final test set, once, and report the confusion matrix,
sensitivity, specificity, PPV and NPV.

**Question 7.1.** Compared with the 0.5 threshold in Task 1, what did you gain
and what did you pay?

**Question 7.2.** Did the test set meet the 0.97 target exactly? If not, why
not, and what does that say about reporting a single test-set number?

**Question 7.3.** Describe one concrete setting where this threshold would be
used. What does a false positive cost there, what does a false negative cost,
and whose interests did you weight? This is a judgement, not a calculation:
say so."""),
("task", STUDENT_CODE, """# 1. Select the threshold on OOF development predictions only (sweep uses y_train).
ok = sweep[sweep.sensitivity >= 0.97]
t_star = float(ok.threshold.max())
# 2. Freeze it. Nothing below may change it.
FROZEN_THRESHOLD = t_star
print("threshold chosen from out-of-fold predictions and frozen:", FROZEN_THRESHOLD)

# 3. Use the final test set once.
final = at(FROZEN_THRESHOLD, p_lr, y_test)
ppv_t = final["TP"] / (final["TP"] + final["FP"])
npv_t = final["TN"] / (final["TN"] + final["FN"])
print(final, f"PPV={ppv_t:.3f} NPV={npv_t:.3f}")
print("Task 1 at 0.5:", at(0.5, p_lr, y_test))"""),
("answer", """**7.1** On the out-of-fold training predictions, moving from 0.5 to the
chosen threshold (0.30 with seed 42) buys a few more detected malignancies at
the price of about ten extra false positives. On this particular test set the
lower threshold caught two more malignant cases (FN 4 → 2) and, by chance, cost
no extra false positive. A cost that does not appear in 107 benign test cases
has not disappeared: the out-of-fold table is the better guide to it.

**7.2** Out-of-fold sensitivity met the target; test-set sensitivity was 62/64
= 0.969, a hair below 0.97. The test set is a different, finite sample: with 64
malignant test cases, one case moves sensitivity by about 1.6 points. Report the
uncertainty, not just the point estimate.

**7.3** One worked answer: in a hypothetical setting where the threshold
decides which masses get a further, non-invasive investigation, a false
negative could delay a diagnosis, while a false positive costs a further test,
time and anxiety. Weighting these is a clinical and ethical judgement that the
numbers inform but do not settle, and different settings or patients may
weight them differently."""),

("md", """---
## Part D — Is 0.8 really 80%? Calibration"""),
("md", """## Task 8 — Two models, similar accuracy, different probabilities

Fit a second model, `GaussianNB()`, on the training pool. (Naive Bayes is next
week's classifier: consider this a preview.)

Keep development and final testing separate:

* **Development (calibration analysis):** draw a **reliability diagram** for each
  model using `calibration_curve(y, p, n_bins=5)` on **out-of-fold predictions
  from the training pool** (more cases than the test set, and still honest), with
  the diagonal for reference. Add a histogram of each model's predicted
  probabilities.
* **Final test set (report once):** for both models, report accuracy at 0.5, AUC
  and Brier score. The Brier score is the mean squared difference between the
  predicted probability and the outcome (0 or 1); lower is better.

Calibration is assessed over groups of predictions: a bin of cases predicted
near 0.8 should be about 80% positive. It does not tell you the outcome for any
one case.

**Question 8.1.** Which model's probabilities would you trust as
probabilities? Use the diagram, not the accuracy.

**Question 8.2.** What fraction of Gaussian naive Bayes predictions are below
0.05 or above 0.95? Why does a model that is that sure of itself worry you in a
clinical setting?

**Question 8.3.** Is logistic regression well calibrated here? Point to the
bins that support your answer, and say which bins you trust least and why.

**Question 8.4.** The two models have almost the same AUC but different Brier
scores. Explain the difference between discrimination and calibration using
this result.

*The Calibration explorer on the Week 4 page separates calibration from AUC with a slider.*"""),
("task", STUDENT_CODE, """gnb = GaussianNB().fit(X_train, y_train)
p_gnb = gnb.predict_proba(X_test)[:, 1]
print("FINAL TEST SET (reported once):")
for name, p in [("logistic regression", p_lr), ("Gaussian NB", p_gnb)]:
    print(f"{name:20s} acc {accuracy_score(y_test, p >= 0.5):.3f}  "
          f"AUC {roc_auc_score(y_test, p):.3f}  Brier {brier_score_loss(y_test, p):.3f}  "
          f"extreme {np.mean((p < 0.05) | (p > 0.95)):.2f}")

# Development only: out-of-fold predictions on the training pool.
oof = {"logistic regression": p_oof,
       "Gaussian NB": cross_val_predict(GaussianNB(), X_train, y_train, cv=cv,
                                        method="predict_proba")[:, 1]}
fig, ax = plt.subplots(1, 2, figsize=(10, 4))
ax[0].plot([0, 1], [0, 1], ":", color="grey", label="perfect")
for name, p in oof.items():
    frac, mean = calibration_curve(y_train, p, n_bins=5)
    ax[0].plot(mean, frac, "o-", label=name)
    ax[1].hist(p, bins=20, alpha=.55, label=name)
ax[0].set_title("Reliability diagram (OOF, development)")
ax[0].set_xlabel("mean predicted probability"); ax[0].set_ylabel("fraction malignant")
ax[0].legend(); ax[1].set_xlabel("predicted probability"); ax[1].legend()
plt.tight_layout(); plt.show()"""),
("answer", """**8.1** Logistic regression: its points sit closer to the diagonal. Both
models rank cases well (similar AUC), but naive Bayes pushes almost every
prediction to 0 or 1, so its intermediate probabilities do not mean what they
say. Accuracy cannot show this, because it only looks at which side of 0.5 a
prediction falls.

**8.2** Almost all of them (see the printed "extreme" fraction). A model that
says 0.999 when it is wrong gives a clinician no signal that this case is
uncertain; downstream calculations that treat the output as a probability
(thresholds, expected costs, PPV) inherit the error. Naive Bayes is
over-confident partly because its independence assumption counts correlated
evidence many times, which is a Week 5 topic.

**8.3** Broadly yes at the extremes, where most cases sit and the points lie
near the diagonal; the middle bins hold only a handful of cases each, so their
points are noisy and should not be over-read. A fair answer is "reasonably
calibrated, with too few intermediate cases to be sure".

**8.4** AUC (discrimination) only asks whether malignant cases are ranked above
benign ones, and both models do that almost perfectly. The Brier score also
rewards probabilities that match observed frequencies (calibration), which
naive Bayes does not do. Good ranking does not imply trustworthy probabilities."""),

("md", """---
## ✅ CORE LAB COMPLETE: computational core (Tasks 1–8)

You have completed every computational task in the core lab. **Task 9 is an
optional extension.** Tasks 10 and 11 are short written tasks that complete the
core lab: do them even if you skip Task 9."""),
("md", """## Task 9 (optional extension) — Can calibration be repaired?

Wrap Gaussian naive Bayes in `CalibratedClassifierCV(GaussianNB(), method="sigmoid", cv=5)`,
fit it on the training pool and compare its test-set Brier score and AUC with
the uncalibrated model.

**Question 9.1.** Which number improved, and which barely moved? Explain why
recalibration cannot turn a model that ranks badly into one that ranks well."""),
("task", STUDENT_CODE, """cal = CalibratedClassifierCV(GaussianNB(), method="sigmoid", cv=5).fit(X_train, y_train)
p_cal = cal.predict_proba(X_test)[:, 1]
for name, p in [("Gaussian NB", p_gnb), ("NB + sigmoid calibration", p_cal)]:
    print(f"{name:26s} AUC {roc_auc_score(y_test, p):.3f}  Brier {brier_score_loss(y_test, p):.3f}")"""),
("answer", """**9.1** Here very little changed: Brier 0.056 → 0.055 and AUC unchanged
at 0.996. Gaussian naive Bayes squashes almost every score to within a hair of
0 or 1, so a sigmoid remapping has almost nothing to spread out; isotonic
calibration, or a better-specified model, may do more (try it). Either way
AUC barely moves, because recalibration is a monotone remapping that largely
preserves the order of the cases. Calibration changes what the numbers mean,
not which cases rank above which, so it cannot rescue a model that separates
the classes badly."""),

("md", """---
## Part E — Which metric matters depends on the question"""),
("md", """## Task 10 — Three questions, three answers

No code. For each scenario, state which metric(s) you would prioritise, roughly
where you would put the threshold (low / default / high), what prevalence you
would assume, and what you would need to know that this notebook cannot tell
you.

1. **Screening:** deciding which people in a general population are invited for
   a cheap, safe follow-up scan.
2. **Confirmation:** deciding which patients proceed to surgery.
3. **Discovery:** ranking 2,000 candidate biomarkers so that the top 20 can be
   validated with an expensive laboratory assay.

**Question 10.1.** Is there one "best" metric across all three? Explain."""),
("task", "", ""),
("answer", """These are worked examples of the reasoning, not rules. Each depends on
prevalence, the consequences of each error, the burden and cost of testing, the
availability of a confirmatory step and the intended use.

1. **Screening (hypothetical):** if the follow-up really is cheap and safe and a
missed case is costly, it is reasonable to favour sensitivity and NPV with a
lower threshold. Prevalence is low, so expect a low PPV and plan a confirmatory
step. Need: the harms and capacity of follow-up, the real prevalence.
2. **Confirmation (hypothetical):** before an invasive step, false positives are
costly, so specificity and PPV usually weigh more and the threshold may be
higher. The population is already enriched by earlier tests, so prevalence is
higher. Need: harms of unnecessary surgery versus delay, what other evidence is
combined.
3. **Discovery:** only 20 candidates can be validated, so precision among the
top 20 matters most; calibration matters if expected yield is used for
budgeting. Need: the base rate of true biomarkers, assay cost.

**10.1** No. The appropriate metric depends on the biological question, the
population, the cost of each error and the decision being made."""),

("md", """## Task 11 — Write the evaluation record

Week 3 ended with a reproducibility record. Complete this one for your Task 7
result, in a markdown table: dataset and version; split protocol and seed;
model; how the threshold was chosen and on which data; the test-set confusion
matrix; sensitivity, specificity, PPV and NPV with their denominators; the
prevalence at which PPV and NPV were measured; a calibration statement; and one
sentence on what this result does **not** show.

**Question 11.1.** Why must the prevalence appear in the record whenever PPV or
NPV does?"""),
("code", """# Versions for the record
import sklearn, sys
print("Python", sys.version.split()[0], "| scikit-learn", sklearn.__version__,
      "| numpy", np.__version__, "| pandas", pd.__version__)"""),
("answer", """A complete record states: WDBC loaded via scikit-learn (record the
versions printed above); stratified 70/30 split, seed 42; StandardScaler + logistic
regression; threshold chosen from 5-fold out-of-fold predictions on the
training pool to reach sensitivity ≥ 0.97, then frozen before the single use of
the final test set; the Task 7 confusion matrix and the
four metrics with denominators; test-set prevalence ≈ 0.374; calibration
checked with a 5-bin reliability diagram on out-of-fold predictions; and that
the result is real data used for classroom evaluation on an enriched dataset,
not evidence of clinical performance in any real population.

**11.1** Because PPV and NPV are not properties of the model alone. Without the
prevalence, a PPV cannot be transferred, compared or checked."""),
]


def build(solutions):
    nb = nbformat.v4.new_notebook()
    nb.metadata["kernelspec"] = {"display_name": "Python 3",
                                 "language": "python", "name": "python3"}
    cells = []
    for c in CELLS:
        kind = c[0]
        if kind == "md":
            cells.append(nbformat.v4.new_markdown_cell(c[1]))
        elif kind == "code":
            cells.append(nbformat.v4.new_code_cell(c[1]))
        elif kind == "task":
            student, sol = c[1], c[2]
            if solutions and sol:
                cells.append(nbformat.v4.new_code_cell(sol))
            elif not solutions and student:
                cells.append(nbformat.v4.new_code_cell(student))
        elif kind == "answer":
            if solutions:
                cells.append(nbformat.v4.new_markdown_cell(
                    "**Worked answer.**\n\n" + c[1]))
            else:
                cells.append(nbformat.v4.new_markdown_cell(STUDENT_TEXT))
    if solutions:
        # Retitle the first cell for the worked-solutions notebook.
        first = cells[0].source
        first = first.replace("# COMP9085 Week 4 Laboratory",
                              "# COMP9085 Week 04 Lab — Worked Solutions", 1)
        first = first.replace(
            "**Deliverable.** This notebook, run top to bottom, with every question "
            "answered\nin the markdown cells.",
            "**About this notebook.** Complete code, outputs, plots and worked answers "
            "for every\ntask. Try each task yourself before reading its worked answer.")
        cells[0].source = first
    nb.cells = cells
    return nb


def html(nb, path):
    body, _ = HTMLExporter().from_notebook_node(nb)
    with open(path, "w") as f:
        f.write(body)


def main():
    os.makedirs(SOL, exist_ok=True)
    student = build(False)
    nbformat.write(student, os.path.join(OUT, "COMP9085_Week04_Lab.ipynb"))
    html(student, os.path.join(OUT, "COMP9085_Week04_Lab.html"))

    sol = build(True)
    ExecutePreprocessor(timeout=300, kernel_name="python3").preprocess(
        sol, {"metadata": {"path": OUT}})
    nbformat.write(sol, os.path.join(SOL, "COMP9085_Week04_Lab_Worked_Solutions.ipynb"))
    html(sol, os.path.join(SOL, "COMP9085_Week04_Lab_Worked_Solutions.html"))
    print("student and executed solutions written to", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
