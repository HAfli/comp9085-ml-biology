#!/usr/bin/env python3
"""
Week 6 lab: build the student notebook and the instructor solutions notebook
from ONE source, so the two cannot drift apart.

Outputs
    labs/week06/COMP9085_Week06_Lab.ipynb                         public, no answers
    labs/week06/COMP9085_Week06_Lab.html                          public, rendered
    labs/week06/solutions/COMP9085_Week06_Lab_Solutions.ipynb     instructor (gitignored)
    labs/week06/solutions/COMP9085_Week06_Lab_Solutions.html      instructor (gitignored)

The notebook reads the frozen NHANES extract next to it (data/nhanes_L_*.csv):
no network. Both notebooks are EXECUTED here in a fresh kernel:

  * the student notebook, unfilled, must run top to bottom without an error
    (the provided cells never depend on a student's answer cell);
  * the solutions notebook must run without an error, and a check cell (run,
    then removed before saving) asserts that its outputs agree with
    data/scripts/week06_numbers.json, the source the lecture quotes.

    python3 data/scripts/13_build_week06_data.py     # first, if the numbers changed
    python3 data/scripts/14_build_week06_lab.py      # needs nbformat, nbconvert, ipykernel
"""
import copy
import json
import os

import nbformat
from nbconvert import HTMLExporter
from nbconvert.preprocessors import ExecutePreprocessor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "labs", "week06")
SOL = os.path.join(OUT, "solutions")
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week06_numbers.json")))
F, O, MI, OM, SP = N["flow"], N["outcome"], N["missing"], N["outcome_missing"], N["split"]
IMP, OUTL, ENC, SC, IB, RS, T, W = (N["imputation"], N["outliers"], N["encoding"], N["scaling"],
                                    N["imbalance"], N["resampling"], N["test"], N["weights"])
REC, CODES = N["recall"], N["codes"]

STUDENT_CODE = "# your code here\n"
STUDENT_TEXT = "*Your answer here.*"


def pct(x, d=1):
    return f"{100 * x:.{d}f}%"


def f3(x):
    return f"{x:.3f}"


def cells():
    cc, md, it = IMP["complete_case"], IMP["median"], IMP["iterative_indicator"]
    bal = IB["balanced"]
    return [
("md", f"""# COMP9085 Week 6 Laboratory
## Preparing NHANES without breaking it

**Two hours.** Last week the problems that mattered most were data problems. This
week you take a real public-health survey from nine raw files to a modelling-ready
matrix and make every preparation decision explicitly: what one row is, what the
codes mean, why values are missing, which unusual values to keep, how to encode
and scale, how to handle an imbalanced outcome, and whom the sample describes.

**Data.** The US National Health and Nutrition Examination Survey (NHANES),
August 2021 – August 2023 cycle, public-use files from the CDC National Center for
Health Statistics. The nine CSV files in `data/` next to this notebook are column
extracts of the released files, one row per participant, linked by the
participant number `SEQN`. Values are exactly as released, including the codes
for "refused" and "don't know"; `data/README.md` documents every column and
`data/PROVENANCE.json` the source and checksums. **No network is needed.**

**The question.** Among adults aged 20 or over who had blood drawn, can routinely
available information (demographics, body measures, blood pressure, cholesterol,
one day of diet, smoking history) identify those whose **HbA1c is 6.5% or
higher**, the diabetes-range threshold? A positive prediction would at most
suggest a confirmatory test. **A prediction is not a diagnosis**, and nothing in
this lab is a clinical tool.

**Who is in the data.** NHANES samples the US civilian non-institutionalised
population. In this lab an adult is **eligible** if aged 20 or over (as recorded;
80 means 80 or older). The **modelling population** is the eligible adults with an
HbA1c result, which requires attending the mobile examination centre and giving a
blood sample. Task 1 counts who is lost at each step; Task 3 asks who is missing
the outcome and whether that matters.

**By the end of this lab you should be able to**
1. merge survey files on a participant key and account for everyone lost at each step;
2. recognise refused/don't-know codes, top-codes and other values that are not quantities;
3. distinguish a missing outcome from missing predictors, profile both, and argue which
   missingness mechanism (MCAR, MAR, MNAR) is most plausible, with evidence and limitations;
4. build a `ColumnTransformer` pipeline that imputes, encodes and scales inside cross-validation;
5. decide what to do with unusual values using knowledge of the measurement;
6. handle an imbalanced outcome and choose metrics that match it;
7. explain what a survey weight changes, and what an unweighted classroom analysis can and cannot claim.

**Prerequisites.** Weeks 3–5: train/test splits, cross-validation, scikit-learn
`Pipeline`, baselines, and the Week 4 metrics (sensitivity, specificity, PPV, ROC AUC).
Python with pandas at the level of the Week 2–5 labs.

**How the cells work.** Cells marked *provided* run as they are: read them, run
them, and make sure you understand them. Cells containing `# your code here` are
yours. Before some tasks you are asked to **predict** a result first: write the
prediction down before you run anything; it is the fastest way to find out what
you misunderstand.

**Structure.** **Tasks 1–9 are the core lab.** Some are short (Tasks 2 and 6).
A checkpoint after Task 9 marks the end of the core; three optional extensions
and a final reflection follow.

**Rules for the whole lab.** One split, made once, in the cell after Task 3. Every
choice is made with cross-validation on the training rows. The test rows are used
**once**, in Task 9. Anything that learns from data (imputers, scalers, encoders,
outlier detectors, resamplers) is fitted on training rows only.

**Practice, not assessment.** This lab is not part of Assignment 1 and uses a
different dataset. It practises skills Assignment 1 also needs, but the decisions
and justifications in your assignment must be made for *your* data, with *your*
numbers. Do not copy this lab's preprocessing into the assignment without
justifying it there.

**The Week 6 page is your interactive companion.** Its data-quality explorer
damages a real dataset in a known way and lets you measure the cost of each
repair; use it alongside Tasks 3–7.

**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**),
with every question answered in the markdown cells using your own numbers."""),
("md", "### Setup\n\nRun this cell first. It loads the nine files and nothing else."),
("code", """import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.pipeline import make_pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.experimental import enable_iterative_imputer  # noqa: F401  (needed before the next import)
from sklearn.impute import IterativeImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import IsolationForest
from sklearn.dummy import DummyClassifier
from sklearn.exceptions import ConvergenceWarning
from sklearn.metrics import (roc_auc_score, average_precision_score, recall_score, precision_score,
                             accuracy_score, balanced_accuracy_score, confusion_matrix)

pd.set_option("display.max_columns", 30)
SEED = 42
DATA = Path("data")
files = {name: pd.read_csv(DATA / f"nhanes_L_{name}.csv")
         for name in ["demo", "ghb", "bmx", "bpxo", "tchol", "dr1tot", "dr2tot", "smq", "diq"]}
demo, ghb = files["demo"], files["ghb"]
for name, d in files.items():
    print(f"{name:7s} {d.shape[0]:6,d} rows  {d.shape[1]:2d} columns: {', '.join(d.columns[1:])}")"""),
("md", """**Variable names.** NHANES names are terse; `data/README.md` has the full
list. The ones you need most: `RIDAGEYR` age in years, `RIAGENDR` sex,
`RIDRETH3` race and Hispanic origin, `DMDEDUC2` education (adults), `INDFMPIR`
family income-to-poverty ratio, `RIDSTATR` interview only (1) or interviewed and
examined (2), `LBXGH` HbA1c (%), `BMXBMI` body-mass index, `BMXWAIST` waist (cm),
`BPXOSY1–3` three systolic readings (mmHg), `LBXTC` total cholesterol (mg/dL),
`DR1TKCAL` / `DR1TSUGR` energy (kcal) / total sugars (g) from the day-1 dietary
recall, `DR1DRSTZ` recall status, `SMQ020` smoked at least 100 cigarettes in life,
`DIQ010` ever told by a doctor you have diabetes, `WTPH2YR` the survey weight for
the blood-draw subsample."""),

("teach", """**Expected results and environment.** Every number in these notes and
worked answers was produced by executing this notebook with Python 3.13.1, scikit-learn
1.9.1, pandas 3.0.6 and numpy 2.5.4 on the frozen extract (seed 42 throughout). Counts,
the split and every quantity in Tasks 1–3 and 8 are exact and environment-independent.
Model scores (Tasks 4–7, 9, E1) are deterministic in this environment and checked against
`data/scripts/week06_numbers.json` by the build; in other versions expect agreement to
about the third decimal, with the non-converged unscaled model (Task 6) and
`IterativeImputer` the most likely to differ. Timing: Tasks 1–3 about 35 min, 4–5 about
35 min, 6–9 about 40 min; E1 about 10 min."""),
# ---------------------------------------------------------------- Task 1
("md", """## Task 1 — From nine files to one table

NHANES releases each component (interview, examination, laboratory, diet) as a
separate file. `SEQN` links them.

1. Check that `SEQN` is unique in every file.
2. Left-join `demo` with `ghb` on `SEQN`. Count: all participants; adults aged
   20 or over; adults who were examined (`RIDSTATR == 2`); adults with a
   measured HbA1c (`LBXGH` not missing).
3. Now inner-join `demo` with `ghb`, `bmx`, `bpxo`, `tchol`, `dr1tot` and `smq`,
   and count the adults in the result. Compare with your counts in step 2.

Step 1 is provided. **Predict first:** will the inner join in step 3 keep more,
fewer or the same number of adults as "adults with a measured HbA1c"?"""),
("code", """# provided: one row per participant in every file?
print({name: d.SEQN.is_unique for name, d in files.items()})"""),
("task", STUDENT_CODE, """merged = demo.merge(ghb, on="SEQN", how="left")
adults = merged[merged.RIDAGEYR >= 20]
counts = {"all participants": len(merged),
          "adults (20+)": len(adults),
          "adults examined": int((adults.RIDSTATR == 2).sum()),
          "adults with HbA1c": int(adults.LBXGH.notna().sum())}
print(counts)

inner = demo
for name in ["ghb", "bmx", "bpxo", "tchol", "dr1tot", "smq"]:
    inner = inner.merge(files[name], on="SEQN", how="inner")
inner_adults = inner[inner.RIDAGEYR >= 20]
print("inner join of seven files, adults:", len(inner_adults),
      "| of whom HbA1c missing:", int(inner_adults.LBXGH.isna().sum()),
      "| BMI missing:", int(inner_adults.BMXBMI.isna().sum()))"""),
("md", """**Question 1.1.** Where are participants lost between "all participants" and
"adults with HbA1c"? For each step, say whether the loss is by design or by
circumstance.

**Question 1.2.** The inner join kept some adults whose HbA1c or BMI is missing.
How can a row survive an inner join and still have no value? What does this tell
you about "the row exists" versus "the value exists"?

**Question 1.3.** Why should the outcome file decide which rows enter the
modelling table, rather than an inner join of every file?"""),
("answer", f"""**1.1.** {F['demo_rows']:,} participants → {F['adults']:,} adults (age
restriction, our choice) → {F['adults_examined']:,} examined adults (the other
{F['adults'] - F['adults_examined']:,} completed the interview only, by their own
choice or circumstance) → {F['adults_with_hba1c']:,} with HbA1c (a further
{F['adults_examined_no_hba1c']} examined adults have no HbA1c: no blood drawn,
refused, or no result). Only the first step is by design; the others depend on
the participants, so they can be related to health.

**1.2.** The inner join gave {F['inner_join_all_files_adults']:,} adults, exactly the examined
adults: every examined adult has a row in each of these files, but the row can hold
missing values (for all ages this is not so: children under 8 have no blood-pressure
row). An inner join tests whether the *key*
is present, not whether the *value* is. Counting rows after a merge is not a
missingness check.

**1.3.** The outcome defines the population we can learn from and evaluate on:
a row without the outcome cannot be used for training or testing. Joining every
file with `inner` would silently impose extra conditions (for example, being
present in the smoking file); a left join from the outcome-defined population
keeps all eligible people and leaves missing predictors to be handled
deliberately, inside the pipeline."""),

("teach", """*Common mistakes:* using `how="inner"` for every merge and
reporting the row count as "complete data"; dropping the interview-only adults without
saying so. *Ask in the room:* which loss could be related to diabetes? (Examination
attendance and blood draw, not the age cut.) *Alternative:* restricting to 18+ is also
defensible, but education (`DMDEDUC2`) is only asked of adults 20+."""),
# ---------------------------------------------------------------- Task 2
("md", """## Task 2 — Read the codebook before you read the data (short)

1. Print `value_counts(dropna=False)` of `DMDEDUC2` and `SMQ020` for the adults
   with HbA1c. NHANES codes 7 as "refused" and 9 as "don't know". How many such
   codes are there?
2. Count adults with `RIDAGEYR == 80` and with `INDFMPIR == 5`. Both are
   **top-codes**: 80 means "80 or older", 5 means "5 or more".
3. Print the counts of `DR1DRSTZ` (1 = reliable and complete recall,
   2 = not reliable or not meeting minimum criteria, 5 = not done) and check
   whether any adult with status other than 1 has a value of `DR1TKCAL`.
4. Systolic blood pressure was measured three times. Make `SBP`, the mean of the
   available readings `BPXOSY1–3` for each participant."""),
("task", STUDENT_CODE, """a = adults[adults.LBXGH.notna()].merge(files["smq"], on="SEQN", how="left") \\
                                   .merge(files["dr1tot"], on="SEQN", how="left") \\
                                   .merge(files["bpxo"], on="SEQN", how="left")
print(a.DMDEDUC2.value_counts(dropna=False).sort_index(), "\\n")
print(a.SMQ020.value_counts(dropna=False).sort_index(), "\\n")
print("age 80 (top-coded):", int((a.RIDAGEYR == 80).sum()),
      "| income-to-poverty 5 (top-coded):", int((a.INDFMPIR == 5).sum()))
print(a.DR1DRSTZ.value_counts().sort_index())
print("kcal present when status != 1:", int(a.loc[a.DR1DRSTZ != 1, "DR1TKCAL"].notna().sum()))
a["SBP"] = a[["BPXOSY1", "BPXOSY2", "BPXOSY3"]].mean(axis=1)
print(a[["BPXOSY1", "BPXOSY2", "BPXOSY3", "SBP"]].head())"""),
("md", """**Question 2.1.** What would a model learn if `DMDEDUC2 = 9` ("don't know")
were left in as a number next to the education levels 1–5?

**Question 2.2.** Is a participant with `RIDAGEYR = 80` an outlier? Is the value
of 80 correct?

**Question 2.3.** `SBP` is computed from each participant's own three readings
before the train/test split. Why is this not leakage, when fitting a scaler before
the split is?"""),
("answer", f"""**2.1.** It would treat "don't know" as an education level above
postgraduate (9 > 5) and, in a linear model, extrapolate the education effect to
it. Among the adults with HbA1c there are only a few such codes
({CODES['DMDEDUC2_7_or_9']} for education and {CODES['SMQ020_7_or_9']} for smoking), so the
damage here would be small, but the error is silent and in
other variables the codes 77/99 or 7777/9999 sit inside a numeric range. They must
become missing values (`NaN`) before modelling.

**2.2.** It is not an error, but it is not exact either: {CODES['age_80_topcoded']}
adults in the table are recorded as 80, meaning 80 or older (disclosure control). It is not an
outlier to remove; it is a censored value. The same holds for an income-to-poverty
ratio of 5 ({CODES['indfmpir_5_topcoded']:,} participants), which means 5 or more.
Top-coding flattens the tail, which matters for analyses of the oldest or richest.

**2.3.** The mean of a participant's own readings uses only that row: nothing is
learned from other participants, so the test rows contribute nothing to the
training rows and vice versa. A scaler learns a mean and a standard deviation
*across rows*; fitted before the split, those statistics include the test rows.
The rule is about **what is learned from which rows**, not about whether a
transformation happens before the split."""),

("teach", """*Common mistakes:* replacing 7/9 with the median "to keep the
rows"; treating age 80 as an error and removing it; computing `SBP` only when all three
readings exist (loses about 1% more rows for no gain). *Point to make:* row-wise
derivations are allowed before the split; anything learned across rows is not."""),
# ---------------------------------------------------------------- checkpoint A
("md", """### Checkpoint A (provided): the eligible adults and the analysis table

The cell below builds two tables with the decisions of Tasks 1 and 2.

* `eligible`: **every** adult aged 20+, with or without an HbA1c result, with two
  flags, `examined` and `has_hba1c`. It is made *before* the outcome filter so that
  Task 3 can ask who is missing the outcome. It is never used for modelling.
* `data`: the **modelling table**, the eligible adults with an HbA1c result, a left
  join of the predictor files, `SBP` as the mean of the available readings, and the
  codes 7 and 9 set to missing. The outcome is `diabetes_range = 1` if HbA1c ≥ 6.5%.
  Every later task uses `data`.

The predictors are grouped by type. Check that you agree with each grouping:
**numeric** (measured quantities), **ordinal** (ordered categories: education
1 = less than 9th grade … 5 = college graduate or above), **nominal** (categories
without an order: sex, race and Hispanic origin, ever smoked). Compare the shape
with your own table from Tasks 1–2."""),
("code", """# 1. every eligible adult, before the outcome filter (Task 3 studies who has no HbA1c)
eligible = demo[demo.RIDAGEYR >= 20].merge(ghb, on="SEQN", how="left", validate="1:1")
eligible["examined"] = eligible.RIDSTATR == 2
eligible["has_hba1c"] = eligible.LBXGH.notna()

# 2. the modelling table: eligible adults WITH an HbA1c result, plus the predictors
data = eligible[eligible.has_hba1c].drop(columns=["examined", "has_hba1c"])
for name in ["bmx", "bpxo", "tchol", "dr1tot", "smq"]:
    data = data.merge(files[name], on="SEQN", how="left")
data["SBP"] = data[["BPXOSY1", "BPXOSY2", "BPXOSY3"]].mean(axis=1)
data["DMDEDUC2"] = data.DMDEDUC2.where(data.DMDEDUC2 <= 5)    # 7 refused, 9 don't know -> NaN
data["SMQ020"] = data.SMQ020.where(data.SMQ020 <= 2)
data["diabetes_range"] = (data.LBXGH >= 6.5).astype(int)
data = data.reset_index(drop=True)

NUMERIC = ["RIDAGEYR", "INDFMPIR", "BMXBMI", "BMXWAIST", "SBP", "LBXTC", "DR1TKCAL", "DR1TSUGR"]
ORDINAL = ["DMDEDUC2"]
NOMINAL = ["RIAGENDR", "RIDRETH3", "SMQ020"]
FEATURES = NUMERIC + ORDINAL + NOMINAL
TARGET = "diabetes_range"
print("eligible adults:", len(eligible), "| with HbA1c:", int(eligible.has_hba1c.sum()),
      "| without:", int((~eligible.has_hba1c).sum()))
print("modelling table:", data.shape, "| positives:", data[TARGET].sum(),
      f"| prevalence {data[TARGET].mean():.3f}")"""),

# ---------------------------------------------------------------- Task 3
("md", """## Task 3 — Profile the missingness, then argue about why

Two different things can be missing, and they are handled differently.

* **Outcome missingness.** An eligible adult has no HbA1c result. That person is not
  in `data` at all: we can neither train nor evaluate on them, and filling in an
  outcome would invent labels. It decides **whom the model describes**. You cannot
  see it in `data` (every row there has an outcome), so study it in `eligible`.
* **Predictor missingness.** An adult in `data` has an HbA1c result but, for
  example, no income. The row stays, and the pipeline handles the gap (Task 4).
  Study it in `data`.

Describing missingness learns no model parameter, so all rows are used here.

**Part A — the outcome (use `eligible`).**

1. *(provided)* Count the eligible adults with and without an HbA1c result, and
   split those without into "not examined" and "examined, no HbA1c result".
2. Merge `files["diq"]` into `eligible` and compare the fraction who report a
   doctor's diagnosis of diabetes (`DIQ010 == 1`; treat 2 and 3 as no, 7 and 9 as
   missing) and the mean age: first between adults with and without HbA1c, then
   for each of the three groups from step 1.

**Part B — the predictors (use `data`).**

3. *(provided)* The fraction missing for each feature, and the number of rows with
   no missing feature.
4. **Income.** Show the fraction of `INDFMPIR` missing at each education level,
   and the prevalence of the outcome among participants with and without income.
5. **Diet.** Compare the mean age and the outcome prevalence of participants with
   and without a day-1 recall (`DR1TKCAL`).

**Predict first:** will adults *without* an HbA1c result report a diabetes diagnosis
more often or less often than adults with one?"""),
("code", """# provided: Part A, step 1. Outcome missingness, counted on every eligible adult.
eligible["stage"] = np.select([eligible.has_hba1c, eligible.examined],
                              ["has HbA1c", "examined, no HbA1c result"], "not examined")
print(eligible.stage.value_counts().to_string())
print(f"no HbA1c: {(~eligible.has_hba1c).sum()} of {len(eligible)} eligible adults "
      f"({(~eligible.has_hba1c).mean():.1%}); none of them is in `data`")"""),
("task", STUDENT_CODE, """o = eligible.merge(files["diq"], on="SEQN", how="left", validate="1:1")
o["dx"] = o.DIQ010.map({1: 1, 2: 0, 3: 0})          # 7, 9 and missing stay NaN
print("self-reported diagnosis and mean age, by HbA1c measured:")
print(o.groupby("has_hba1c")[["dx", "RIDAGEYR"]].mean().round(3))
print("\\nby stage (count = adults with a known answer):")
print(o.groupby("stage").agg(dx=("dx", "mean"), n=("dx", "count"), age=("RIDAGEYR", "mean")).round(3))
print("diagnosis unknown (7, 9 or no answer):", int(o.dx.isna().sum()))"""),
("code", """# provided: Part B, step 3. Predictor missingness, within the modelling table.
miss = data[FEATURES].isna().mean().sort_values(ascending=False)
print(miss.round(3).to_string())
print("rows with no missing feature:", int(data[FEATURES].notna().all(axis=1).sum()), "of", len(data))"""),
("task", STUDENT_CODE, """print("income missing, by education:")
print(data.groupby("DMDEDUC2").INDFMPIR.apply(lambda s: s.isna().mean()).round(3).to_string())
print("prevalence, income missing / present:",
      round(data.loc[data.INDFMPIR.isna(), TARGET].mean(), 3),
      round(data.loc[data.INDFMPIR.notna(), TARGET].mean(), 3))

no_diet = data.DR1TKCAL.isna()
print("\\nmean age, recall missing / present:", round(data.RIDAGEYR[no_diet].mean(), 1),
      round(data.RIDAGEYR[~no_diet].mean(), 1))
print("prevalence, recall missing / present:", round(data[TARGET][no_diet].mean(), 3),
      round(data[TARGET][~no_diet].mean(), 3))"""),
("md", """**Question 3.1 (outcome).** Is the modelling table `data` a random subset of the
eligible adults? Using your Part A numbers, including the two groups without HbA1c
separately, argue which mechanism is most plausible for the missing outcome: missing
completely at random (MCAR), at random given observed variables (MAR), or not at random
(MNAR). State your evidence and what your tables cannot tell you.

**Question 3.2 (predictors).** Make the same argument for **income** and **diet**,
citing your Part B numbers.

**Question 3.3.** Which kind of missingness can the imputation in Task 4 address, and
which can it not? What can an analyst do about the other kind?

**Question 3.4.** Can any table you made *prove* that a variable is MAR rather
than MNAR? What would you need to know?

**Question 3.5.** What would a model trained only on rows with no missing feature
learn about, and whom would it fail to describe?"""),
("answer", f"""**3.1.** No. {OM['n_without_hba1c']:,} of {OM['n_eligible']:,} eligible
adults ({pct(OM['frac_without_hba1c'])}) have no HbA1c result:
{OM['n_not_examined']:,} were never examined and {OM['n_examined_no_hba1c']} were examined
but have no result. Overall, adults without HbA1c reported a diabetes diagnosis *less*
often ({pct(OM['dx_rate_without_hba1c'])} vs {pct(OM['dx_rate_with_hba1c'])}) and were
slightly younger ({OM['age_without_hba1c']} vs {OM['age_with_hba1c']} years). The two groups
without HbA1c differ, though: {pct(OM['dx_rate_interview_only'])} of the never-examined
adults report a diagnosis, but {pct(OM['dx_rate_examined_no_hba1c'])} of the examined adults
without a result (only {OM['n_examined_no_hba1c']} people, so imprecise). Missingness of the
outcome is related to an observed health variable, so **MCAR is not plausible**. A
defensible working position is MAR given observed characteristics (age, self-reported
diagnosis), mainly reflecting who attended the examination; MNAR cannot be excluded,
because attendance or a successful blood draw could depend on the unmeasured HbA1c itself
(for example, undiagnosed high HbA1c). *Limits:* the diagnosis is self-reported and covers
only diagnosed diabetes; the differences are modest and unweighted; and the tables show an
association with an observed proxy, not the missing HbA1c values. *Consequence:* the model
and its scores describe adults who attended the examination and gave blood. Note that the
overall direction is not the "sickest stay away" story many expect: check, do not assume.

**3.2.** *Income*: {pct(MI['by_feature']['INDFMPIR'])} missing, and the rate falls steadily
with education, from {pct(MI['income_by_education']['1'])} (less than 9th grade) to
{pct(MI['income_by_education']['5'])} (college graduates). Missingness depends on an
observed variable, so MCAR is not plausible; MAR (given education) is a reasonable working
assumption, but people may also decline to report income *because* of their income, which
would be MNAR. The outcome prevalence is almost the same with and without income
({pct(MI['income_missing_prev'])} vs {pct(MI['income_present_prev'])}). *Diet*:
{pct(MI['by_feature']['DR1TKCAL'])} have no day-1 recall; they are younger on average
({MI['diet_missing_age']} vs {MI['diet_present_age']} years) and have a slightly higher
prevalence ({pct(MI['diet_missing_prev'])} vs {pct(MI['diet_present_prev'])}), so again
not MCAR; mostly the recall was "not done", which is about participation, not about what
was eaten.

**3.3.** Imputation addresses **predictor** missingness only: the row is kept and the gap
is filled from the training rows. A missing **outcome** removes the row from training and
evaluation altogether; imputing HbA1c would invent the labels the model is trained and
scored on. For the outcome, an analyst reports the participant flow, compares included
and excluded people on observed variables (Part A), states the population to which the
results apply, and, for population estimates, uses the survey weights (NHANES weights
include non-response adjustments based on observed characteristics, itself a MAR-type
assumption) or a sensitivity analysis.

**3.4.** No. MAR versus MNAR depends on the values you did not observe, which the
data cannot show. Tables can show that missingness is *related to observed
variables* (ruling out MCAR); deciding between MAR and MNAR needs knowledge of how
the data were collected, follow-up data, or a sensitivity analysis.

**3.5.** Only {MI['complete_rows']:,} of {O['n']:,} rows ({pct(MI['complete_rows'] / O['n'], 0)}) are
complete. A complete-case model learns about people who completed every component:
more educated, older, more likely to complete a dietary recall. It would describe
them, not the adult population, and it could not score anyone with a missing
value."""),

("teach", """*Common mistakes:* looking for outcome missingness in `data`
(it is always zero there: you cannot see who is missing from a table that excludes
them); imputing HbA1c "to keep the rows"; concluding "MAR" because the outcome rate is
similar with and without income (that is evidence about one consequence, not the
mechanism); claiming the data *prove* MAR. *Grade the argument, not the label:* any of
MAR or MNAR is acceptable for the outcome if supported by the numbers and its limits;
MCAR is not. Some students will argue MNAR because people with known diabetes may
attend for a free test; accept it if argued. *Scope note:* Task 3 describes all rows
because no parameter is learned and no model is chosen from it; an equally defensible
alternative is to profile the training rows only. The choice of strategy is made by CV
in Task 4. `eligible` is never split or modelled."""),
# ---------------------------------------------------------------- split
("md", """### The split (provided): made once, used for the rest of the lab

A stratified 75/25 split with `SEED = 42`, and the 5-fold cross-validation used for
every choice. After this cell, `X_test` and `y_test` are not touched until Task 9."""),
("code", """X, y = data[FEATURES], data[TARGET]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, stratify=y,
                                                    random_state=SEED)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
print(f"train {len(X_train):,} rows ({y_train.sum()} positive, {y_train.mean():.3f}) | "
      f"test {len(X_test):,} rows ({y_test.sum()} positive, {y_test.mean():.3f})")"""),

# ---------------------------------------------------------------- Task 4
("md", """## Task 4 — Three ways to handle missing values, inside a Pipeline

**(a)** Write a function `nhanes_preprocessor(numeric_imputer)` that returns a
`ColumnTransformer` with two parts:

* numeric and ordinal columns: `numeric_imputer`, then `StandardScaler()`;
* nominal columns: `SimpleImputer(strategy="most_frequent")`, then
  `OneHotEncoder(handle_unknown="ignore", drop="if_binary")`.

**(b)** A helper `cv_scores(pipe, X, y)` is provided below. Read it: it runs
`cross_validate` with the `cv` object above and returns the mean and SD of `roc_auc`,
`average_precision`, `recall` and `balanced_accuracy`.

**(c)** With `LogisticRegression(max_iter=1000)` as the model, compare by
cross-validation on the training rows:

1. **complete case**: median imputer, but only the training rows with no missing
   feature;
2. **median**: `SimpleImputer(strategy="median")`, all training rows;
3. **iterative + indicator**: `IterativeImputer(random_state=SEED, add_indicator=True)`,
   all training rows.

Add a majority-class baseline (`DummyClassifier(strategy="most_frequent")`). Show one
table with the number of rows and the prevalence used by each. For the complete-case
variant, also report the fraction of training and of test rows it can score."""),
("code", """# provided: the evaluation helper (step b) and the baseline every model is compared with
SCORING = ["roc_auc", "average_precision", "recall", "balanced_accuracy"]

def cv_scores(pipe, X, y):
    \"\"\"5-fold CV on the rows given; every step of `pipe` is refitted on each training fold.\"\"\"
    res = cross_validate(pipe, X, y, cv=cv, scoring=SCORING)
    out = {"n": len(X), "prevalence": y.mean()}
    for s in SCORING:
        out[s] = res["test_" + s].mean()
        out[s + "_sd"] = res["test_" + s].std()
    return out

results = {"baseline (majority)": cv_scores(DummyClassifier(strategy="most_frequent"), X_train, y_train)}
pd.Series(results["baseline (majority)"]).round(3)"""),
("md", """**(a) is yours:** write `nhanes_preprocessor` in the next cell."""),
("task", STUDENT_CODE, """def nhanes_preprocessor(numeric_imputer):
    return ColumnTransformer([
        ("num", make_pipeline(numeric_imputer, StandardScaler()), NUMERIC + ORDINAL),
        ("nom", make_pipeline(SimpleImputer(strategy="most_frequent"),
                              OneHotEncoder(handle_unknown="ignore", drop="if_binary")), NOMINAL)])"""),
("code", """# provided: your preprocessor + logistic regression, used from here on
def logreg(imputer, **kw):
    return make_pipeline(nhanes_preprocessor(imputer), LogisticRegression(max_iter=1000, **kw))"""),
("md", """**(c) is yours.** **Predict first:** which variant will have the highest CV ROC
AUC, and will the differences be larger or smaller than the fold-to-fold SD?"""),
("task", STUDENT_CODE, """complete = X_train.notna().all(axis=1)
results.update({
    "complete case": cv_scores(logreg(SimpleImputer(strategy="median")), X_train[complete], y_train[complete]),
    "median": cv_scores(logreg(SimpleImputer(strategy="median")), X_train, y_train),
    "iterative + indicator": cv_scores(logreg(IterativeImputer(random_state=SEED, add_indicator=True)),
                                       X_train, y_train),
})
table4 = pd.DataFrame(results).T
display(table4[["n", "prevalence", "roc_auc", "roc_auc_sd", "average_precision",
                "average_precision_sd"]].round(3))
print(f"complete case can score {complete.mean():.1%} of training rows and "
      f"{X_test.notna().all(axis=1).mean():.1%} of test rows")
print(f"prevalence among the training rows it drops: {y_train[~complete].mean():.3f}")"""),
("md", """**Question 4.1.** Which handling gives the best mean ROC AUC and average
precision? Is the difference larger than the cross-validation SD? Would you claim
a winner?

**Question 4.2.** The complete-case scores look similar to the others. Give two
reasons why they are still not comparable with them, and one reason the
complete-case model is unusable in practice.

**Question 4.3.** Which handling would you defend in a paper, and why? Your answer
should mention the population, not only the score.

**Question 4.4.** Why does the imputer have to be inside the Pipeline for
`cross_validate` to give an honest estimate?"""),
("answer", f"""**4.1.** Iterative + indicator is numerically highest (ROC AUC
{f3(it['roc_auc'])} ± {f3(it['roc_auc_sd'])}, AP {f3(it['average_precision'])}) against median
({f3(md['roc_auc'])} ± {f3(md['roc_auc_sd'])}, AP {f3(md['average_precision'])}). The
difference ({f3(it['roc_auc'] - md['roc_auc'])} in AUC) is smaller than one fold-to-fold
SD. There is no evidence of a winner; reporting one would be over-reading noise. All
three are far above the baseline (AUC 0.5, AP = prevalence {f3(N['baseline']['average_precision'])}).

**4.2.** (1) Different rows: complete case uses {cc['n']:,} training rows, the others
{md['n']:,}. (2) A different population: the dropped rows have a higher prevalence
({f3(cc['prev_incomplete_rows'])} vs {f3(cc['prev'])}), so the complete-case folds are an
easier, different problem. Its score describes people with complete data. In
practice, it can score only {pct(cc['coverage_test'], 0)} of test participants: anyone
without a dietary recall or income gets no prediction at all.

**4.3.** A defensible answer: median imputation inside the pipeline, as the simplest
method whose performance is not distinguishable from the best, with the
iterative + indicator version reported as a sensitivity analysis. It keeps everyone
in the population and does not depend on a more complex imputation model.
Choosing iterative + indicator is also defensible if argued (it preserves relations
between variables and lets the model use missingness itself). Complete case is
hard to defend here because missingness is not MCAR (Task 3).

**4.4.** An imputer *learns* (the medians, or a regression model per column). Inside
the pipeline, `cross_validate` refits it on each training fold, so the validation
fold never contributes to the values used to fill it. Fitted beforehand on all
training rows, each validation fold would have helped compute its own fill values,
and the estimate would no longer imitate new data."""),

("teach", """*Common mistakes:* declaring iterative imputation "best" on a
0.006 AUC difference; comparing complete-case CV scores directly with the others (different
rows, different prevalence); writing the imputer outside the pipeline. *What may vary:*
`IterativeImputer` results can change slightly across scikit-learn versions (it is
experimental); differences in the third decimal are expected outside the tested
environment (Python 3.13.1, scikit-learn 1.9.1)."""),
# ---------------------------------------------------------------- Task 5
("md", """## Task 5 — Outliers: look before you delete

Work on the **training rows only**. Never remove rows from the test set: that
would delete the hard cases and then report how well you did on the easy ones.

1. For `BMXBMI`, `DR1TKCAL` and `SBP`, compute the IQR fences
   (Q1 − 1.5 IQR, Q3 + 1.5 IQR). For each, report the fences, the number of
   training rows outside them, and the outcome prevalence inside and outside.
2. Fit `IsolationForest(contamination=0.02, random_state=SEED)` on the numeric
   training features after median imputation and standardisation. Report the number
   flagged and the prevalence among flagged and unflagged rows.
3. Show three flagged training participants: the highest `DR1TKCAL`, the highest
   `BMXBMI` and the lowest `DR1TKCAL`, with all their features.

**Predict first:** among participants outside the BMI fences, will diabetes-range
HbA1c be more common, less common or about as common as among the rest?"""),
("code", """# provided: Tukey's fences, learned from the values you pass in (pass training rows only)
def iqr_fences(values):
    q1, q3 = values.quantile([0.25, 0.75])
    return q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)

print("BMI fences from training rows:", [round(v, 2) for v in iqr_fences(X_train.BMXBMI)])"""),
("task", STUDENT_CODE, """y_tr = y_train
rows = []
for col in ["BMXBMI", "DR1TKCAL", "SBP"]:
    lo, hi = iqr_fences(X_train[col])
    flag = (X_train[col] < lo) | (X_train[col] > hi)
    inside = X_train[col].notna() & ~flag
    rows.append({"feature": col, "lower fence": lo, "upper fence": hi,
                 "n below": int((X_train[col] < lo).sum()), "n above": int((X_train[col] > hi).sum()),
                 "prevalence outside": y_tr[flag].mean(), "prevalence inside": y_tr[inside].mean()})
display(pd.DataFrame(rows).round(3))

Z = make_pipeline(SimpleImputer(strategy="median"), StandardScaler()).fit_transform(X_train[NUMERIC])
iso = IsolationForest(contamination=0.02, random_state=SEED).fit(Z)
iso_flag = iso.predict(Z) == -1
print(f"IsolationForest flagged {iso_flag.sum()} rows; prevalence flagged {y_tr[iso_flag].mean():.3f}, "
      f"unflagged {y_tr[~iso_flag].mean():.3f}")

flagged = X_train[iso_flag].assign(diabetes_range=y_tr[iso_flag])
display(pd.concat([flagged.nlargest(1, "DR1TKCAL"), flagged.nlargest(1, "BMXBMI"),
                   flagged.nsmallest(1, "DR1TKCAL")]))"""),
("md", """**Question 5.1.** What would deleting the BMI "outliers" do to the training
data? Use the prevalence numbers.

**Question 5.2.** For each of your three participants, decide **keep**, **cap** or
**set to missing**, in one sentence each, saying whether the value is more likely a
measurement or reporting error, a real but rare value, or the clinically
interesting case.

**Question 5.3.** The IQR rule flags nothing below zero kcal and a lower fence below
zero. What does that tell you about using the IQR rule on a skewed variable?"""),
("answer", f"""**5.1.** {OUTL['BMXBMI']['n_flagged']} training participants are outside the BMI fences:
{OUTL['BMXBMI']['n_above']} above {OUTL['BMXBMI']['hi']} and {OUTL['BMXBMI']['n_below']} below
{OUTL['BMXBMI']['lo']} (a BMI of {OUTL['BMXBMI']['min']}, implausible for an adult and worth
checking against height and weight). Their prevalence is
{pct(OUTL['BMXBMI']['prev_flagged'])} against {pct(OUTL['BMXBMI']['prev_not'])} for the rest.
Deleting them would remove the participants at highest risk, lower the prevalence the
model learns from, and make the model worse for exactly the people a screening model
is for. A BMI of 50–70 is rare but physiologically real. The same applies to
systolic pressure ({pct(OUTL['SBP']['prev_flagged'])} vs {pct(OUTL['SBP']['prev_not'])}).

**5.2.** Example reasoning (your three rows may differ if your code differs):
*highest energy intake* (about {REC['kcal_max']:,.0f} kcal in one day): implausible as a
true one-day intake for almost anyone and most likely a reporting error; set to
missing (or cap at a documented plausibility limit) and record the rule. *Highest BMI*:
real and clinically important; keep. *Lowest energy intake* (values near
{REC['kcal_min']:.0f} kcal occur): a complete recall reporting almost nothing is either a
reporting failure or a genuinely unusual day (illness, fasting); set to missing or keep
with a flag, and say which. In every case, decide using knowledge of the measurement,
not the distance from the mean, and apply the same rule inside the pipeline.

**5.3.** The IQR rule assumes a roughly symmetric distribution. Energy intake is
right-skewed, so the lower fence ({OUTL['DR1TKCAL']['lo']:.0f} kcal) is impossible and
catches nothing, while the upper fence flags many plausible large eaters. Plausibility
limits from nutrition practice, or a rule applied on a log scale, are better here."""),

("teach", """*Common mistakes:* removing every flagged row, including from the
test set; treating the BMI fences as a clinical rule. *Alternatives:* a log transform
before applying fences to energy intake; documented plausibility limits for recalls
(nutrition studies often exclude extreme reported intakes, with thresholds that must be
stated and justified). *What may vary:* `IsolationForest` flags depend on
`random_state`; with the fixed seed the result is reproducible."""),
# ---------------------------------------------------------------- Task 6
("md", """## Task 6 — Encoding and scaling: two controlled checks (short)

Change **one thing at a time** against the median pipeline from Task 4.

1. **Integer-coded nominal variables.** Replace the preprocessor by a single
   median imputer + `StandardScaler` applied to *all* features, so that `RIDRETH3`
   (codes 1, 2, 3, 4, 6, 7) is treated as a number. Compare cross-validated ROC AUC
   and average precision with the one-hot version.
2. **No scaling.** Build the Task 4 median pipeline without the `StandardScaler`,
   with the default `LogisticRegression()` (100 iterations). Count the
   `ConvergenceWarning`s raised during cross-validation and compare the scores. Print
   the training range (min, max) of `RIDAGEYR`, `SBP` and `DR1TKCAL`."""),
("task", STUDENT_CODE, """int_coded = make_pipeline(
    ColumnTransformer([("all", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), FEATURES)]),
    LogisticRegression(max_iter=1000))
unscaled = make_pipeline(
    ColumnTransformer([
        ("num", SimpleImputer(strategy="median"), NUMERIC + ORDINAL),
        ("nom", make_pipeline(SimpleImputer(strategy="most_frequent"),
                              OneHotEncoder(handle_unknown="ignore", drop="if_binary")), NOMINAL)]),
    LogisticRegression())

with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always", ConvergenceWarning)
    unscaled_scores = cv_scores(unscaled, X_train, y_train)
n_conv = sum(issubclass(w.category, ConvergenceWarning) for w in caught)

table6 = pd.DataFrame({"one-hot, scaled (Task 4 median)": results["median"],
                       "integer-coded nominal": cv_scores(int_coded, X_train, y_train),
                       "no scaling, 100 iterations": unscaled_scores}).T
display(table6[["roc_auc", "roc_auc_sd", "average_precision", "average_precision_sd"]].round(3))
print("ConvergenceWarnings without scaling:", n_conv, "(one per fold that failed)")
print(X_train[["RIDAGEYR", "SBP", "DR1TKCAL"]].agg(["min", "max"]).round(1))"""),
("md", """**Question 6.1.** The integer-coded version scores only slightly lower. Is it
therefore acceptable? What does its coefficient for `RIDRETH3` assume?

**Question 6.2.** Why did the unscaled logistic regression fail to converge, and why
does scaling matter to a *regularised* model even when it converges? Name one model
from this module for which scaling would make no difference, and say why."""),
("answer", f"""**6.1.** No. The scores are close (ROC AUC {f3(ENC['integer_coded']['roc_auc'])}
vs {f3(ENC['one_hot']['roc_auc'])}, within the CV SD), but the model now assumes that the
risk changes by the same amount from code 1 to 2 as from 2 to 3, and that "Non-Hispanic
Asian" (6) lies between "Non-Hispanic Black" (4) and "Other or multi-racial" (7). The
codes are labels, not quantities. A small score difference on this dataset does not make
a wrong representation right, and its coefficients cannot be interpreted.

**6.2.** Unscaled, the features span very different ranges (age 20–80, energy intake
0–{REC['kcal_max']:,.0f} kcal), so the optimisation problem is badly conditioned and the
solver stops at 100 iterations in all {SC['unscaled_default_iter']['convergence_warnings']}
folds, giving a worse model (ROC AUC {f3(SC['unscaled_default_iter']['roc_auc'])} vs
{f3(SC['scaled']['roc_auc'])}). Even when it converges, the L2 penalty shrinks all
coefficients by the same rule, so a feature measured in large units (needing a small
coefficient) is penalised differently from one measured in small units: the scale
of measurement changes the fitted model. A decision tree is unaffected: it splits on
thresholds of one feature at a time, and a monotone rescaling does not change the order
of the values."""),

("teach", """*Common mistakes:* "scaling made no difference so it is unnecessary"
(the unscaled solver did not converge); one-hot encoding the ordinal education variable
is *also* defensible, integer-coding the nominal race variable is not. *What may vary:*
scores of the non-converged unscaled model are numerically fragile and can differ in the
third decimal between environments; the convergence warnings are the stable finding."""),
# ---------------------------------------------------------------- Task 7
("md", """## Task 7 — Class imbalance: accuracy, class weights and the threshold

Only about one in eight participants is positive.

1. What accuracy does the majority-class baseline achieve on the training rows? Use
   your Task 4 table.
2. Compare by cross-validation the Task 4 median pipeline with the same pipeline using
   `LogisticRegression(max_iter=1000, class_weight="balanced")`. Report ROC AUC, average
   precision, recall and balanced accuracy (both at the default threshold 0.5)."""),
("task", STUDENT_CODE, """base_acc = cross_validate(DummyClassifier(strategy="most_frequent"), X_train, y_train, cv=cv,
                          scoring="accuracy")["test_score"].mean()
print(f"majority-class accuracy: {base_acc:.3f}")
balanced = logreg(SimpleImputer(strategy="median"), class_weight="balanced")
results["median, class_weight=balanced"] = cv_scores(balanced, X_train, y_train)
table7 = pd.DataFrame({k: results[k] for k in ["median", "median, class_weight=balanced"]}).T
display(table7[["roc_auc", "average_precision", "recall", "recall_sd", "balanced_accuracy"]].round(3))"""),
("md", """**Question 7.1.** Why is accuracy a poor headline metric for this question?

**Question 7.2.** Class weighting changed recall enormously but ROC AUC hardly at all.
Explain why, using what ROC AUC measures. How is `class_weight="balanced"` related to
moving the decision threshold (Week 4)?

**Question 7.3.** Resampling (duplicating minority rows, or SMOTE) is an alternative to
class weights. Where in the workflow must it happen, and why? (Extension E1 tests this.)"""),
("answer", f"""**7.1.** A model that predicts "no" for everyone scores
{pct(N['baseline']['accuracy'])} accuracy and finds no one. Accuracy is dominated by the
majority class; for a screening question, recall (sensitivity) with specificity or
precision, and threshold-free measures such as ROC AUC and average precision, say more.

**7.2.** Recall went from {pct(IB['unweighted']['recall'])} to {pct(bal['recall'])} and
balanced accuracy from {f3(IB['unweighted']['balanced_accuracy'])} to
{f3(bal['balanced_accuracy'])}, while ROC AUC stayed at {f3(IB['unweighted']['roc_auc'])}
vs {f3(bal['roc_auc'])}. ROC AUC measures how well the model *ranks* positives above
negatives, over all thresholds; in this experiment weighting barely changed the ranking
(with other data or models it can change it more). It mainly shifts
the predicted probabilities upwards, so many more participants cross 0.5. That is close
to keeping the unweighted model and lowering the threshold: an imbalance "fix" is often
a threshold decision in disguise, and the threshold should follow the costs of the two
errors. Weighted probabilities are also no longer estimates of the real risk: do not read
them as calibrated.

**7.3.** Inside the cross-validation, on the training part of each fold only, after the
split. Resampled before the split, copies (or interpolations) of the same participant
land on both sides, and the validation folds no longer have the real prevalence."""),

("teach", """*Common mistakes:* reporting the higher recall as "a better model";
reading class-weighted `predict_proba` as risk. *Alternative:* keep the unweighted model
and choose a threshold from the costs of the two errors (Week 4); equally valid, and its
probabilities stay closer to calibrated."""),
# ---------------------------------------------------------------- Task 8
("md", """## Task 8 — Survey weights: whom does the sample describe?

NHANES is not a simple random sample: some groups are deliberately oversampled and
response differs between groups. Each participant's weight is (roughly) the number of
people in the US civilian non-institutionalised population they represent. HbA1c was
measured in the blood-draw subsample, so the right weight is `WTPH2YR`.

1. Compute the unweighted prevalence of `diabetes_range` in `data`, and the weighted
   prevalence `np.average(data[TARGET], weights=data.WTPH2YR)`.
2. For the age groups 20–39, 40–59 and 60–80, show the share of the sample, the
   weighted share (sum of weights in the group / total weight) and the prevalence."""),
("md", """**Predict first:** older adults were over-represented in this cycle's sample. Will
the weighted prevalence be higher or lower than the unweighted one? Then run the
provided step 1."""),
("code", """# provided: step 1. A weighted mean is a population estimate; it is description, not modelling.
print(f"unweighted prevalence {data[TARGET].mean():.4f} | weighted (WTPH2YR) "
      f"{np.average(data[TARGET], weights=data.WTPH2YR):.4f}")"""),
("task", STUDENT_CODE, """age_group = pd.cut(data.RIDAGEYR, [19, 39, 59, 80], labels=["20-39", "40-59", "60-80"])
g = data.groupby(age_group, observed=True)
table8 = pd.DataFrame({"share of sample": g.size() / len(data),
                       "weighted share": g.WTPH2YR.sum() / data.WTPH2YR.sum(),
                       "prevalence": g[TARGET].mean()})
display(table8.round(3))"""),
("md", """**Question 8.1.** In one paragraph: why is the weighted prevalence lower than
the unweighted one? Use your age table.

**Question 8.2.** Your model was trained and evaluated without weights. What population
do its cross-validation scores describe? Name one thing (beyond a point estimate) that a
proper survey analysis would also need."""),
("answer", f"""**8.1.** The unweighted prevalence is {pct(O['prevalence_unweighted'])}; weighted,
it is {pct(O['prevalence_weighted_WTPH2YR'])}. Older adults, who have by far the highest
prevalence ({pct(W['by_age']['60-80']['prevalence'])} at 60–80 against
{pct(W['by_age']['20-39']['prevalence'])} at 20–39), make up
{pct(W['by_age']['60-80']['share_sample'], 0)} of this sample but only
{pct(W['by_age']['60-80']['share_weighted'], 0)} of the population the weights represent;
young adults are {pct(W['by_age']['20-39']['share_sample'], 0)} of the sample and
{pct(W['by_age']['20-39']['share_weighted'], 0)} of the population. The sample
over-represents the group with the highest prevalence, so the unweighted figure
overstates population prevalence. Ignoring the weights changes the conclusion, not just
its precision.

**8.2.** They describe performance on *this sample* of participants with HbA1c results,
with its over-representation of older adults, not on the US adult population; PPV and
NPV in particular depend on prevalence (Week 4). A proper survey analysis also needs the
design variables (strata `SDMVSTRA` and primary sampling units `SDMVPSU`) to compute
standard errors, because participants in the same sampling unit are not independent."""),

("teach", """*Common mistakes:* using `WTMEC2YR` (the examination weight) for a
blood-based variable (CDC specifies `WTPH2YR`; here the difference is small, 10.45% vs
10.37%, but the principle matters); training the model with weights and believing that
makes it "representative". *Distinction to make:* this lab is a classroom predictive
exercise, evaluated on the sample; population inference (prevalence with standard
errors) needs the weights *and* the design variables."""),
# ---------------------------------------------------------------- Task 9
("md", f"""## Task 9 — Choose by cross-validation, test once, write the record

**The decision rule, fixed before looking:** the purpose is to flag adults for a
confirmatory test, so a missed case costs more than a false alarm. Among the pipelines
that can score every participant (Task 4 median, Task 4 iterative + indicator, Task 7
balanced), take the best mean CV **balanced accuracy** at threshold 0.5, and keep the
simplest pipeline within one SD of it (simplest first: median, median + balanced weights,
iterative + indicator).

1. Apply the rule to your `results` and name the chosen pipeline.
2. Fit it on **all training rows**, and evaluate it **once** on the test rows with the
   provided `test_report`: ROC AUC, average precision, accuracy, recall, specificity,
   precision (PPV) and the confusion matrix. Put the test numbers next to its CV numbers."""),
("code", """# provided: everything reported about the test set, computed in one place, once
def test_report(y_true, p, threshold=0.5):
    pred = (p >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
    scores = {"roc_auc": roc_auc_score(y_true, p), "average_precision": average_precision_score(y_true, p),
              "accuracy": accuracy_score(y_true, pred), "balanced_accuracy": balanced_accuracy_score(y_true, pred),
              "recall": recall_score(y_true, pred), "specificity": tn / (tn + fp),
              "precision": precision_score(y_true, pred, zero_division=0)}
    return scores, (tp, fn, fp, tn)"""),
("task", STUDENT_CODE, """candidates = ["median", "median, class_weight=balanced", "iterative + indicator"]   # simplest first
best = max(candidates, key=lambda k: results[k]["balanced_accuracy"])
bar = results[best]["balanced_accuracy"] - results[best]["balanced_accuracy_sd"]
chosen = next(k for k in candidates if results[k]["balanced_accuracy"] >= bar)
print("best by CV balanced accuracy:", best, "| chosen by the rule:", chosen)

final = {"median": logreg(SimpleImputer(strategy="median")),
         "median, class_weight=balanced": logreg(SimpleImputer(strategy="median"), class_weight="balanced"),
         "iterative + indicator": logreg(IterativeImputer(random_state=SEED, add_indicator=True))}[chosen]
final.fit(X_train, y_train)
p_test = final.predict_proba(X_test)[:, 1]
test_scores, (tp, fn, fp, tn) = test_report(y_test, p_test)
# NaN in the CV column: that metric was not computed in cross-validation
display(pd.DataFrame({"CV (training)": {k: results[chosen].get(k) for k in test_scores},
                      "test (once)": test_scores}).round(3))
print(pd.DataFrame([[tp, fn], [fp, tn]], index=["HbA1c >= 6.5%", "HbA1c < 6.5%"],
                   columns=["flagged", "not flagged"]))"""),
("md", """**Question 9.1.** How do the test results compare with the CV results? Should
the test result change your choice of pipeline?

**Question 9.2.** Of the participants the model flags, what fraction actually have
HbA1c ≥ 6.5%? Explain this number with the prevalence (Week 4), and say what a flag
should and should not mean for a participant.

### The reproducibility record

Complete the table. Someone else should be able to repeat your Task 9 result from it.

| Item | Your entry |
|---|---|
| Data (files, cycle, rows after each step of Task 1) | |
| Population and outcome definition | |
| Codes and cleaning (7/9, top-codes, SBP) | |
| Split (method, seed, sizes, prevalence) | |
| Pipeline (every step and its settings) | |
| What was fitted on what | |
| Decision rule and the CV evidence for the choice | |
| Test results (once) | |
| What the result does **not** show (population, weights, diagnosis) | |"""),
("code", """import sklearn, sys
print("Python", sys.version.split()[0], "| scikit-learn", sklearn.__version__,
      "| numpy", np.__version__, "| pandas", pd.__version__)"""),
("answer", f"""**9.1.** The rule chose **{N['chosen'].replace('_', ' ').replace('median balanced', 'median, class_weight=balanced')}**: its CV balanced accuracy
({f3(bal['balanced_accuracy'])}) is far above the others (about 0.52–0.53). On the test
rows it gives ROC AUC {f3(T['roc_auc'])}, balanced accuracy {f3(T['balanced_accuracy'])},
recall {f3(T['recall'])} and specificity {f3(T['specificity'])}, consistent with the CV
estimates (ROC AUC {f3(bal['roc_auc'])}, recall {f3(bal['recall'])}). The test result
checks the choice; it must not change it. Changing the pipeline now would turn the
test set into a validation set, and there would be no unbiased estimate left.

**9.2.** Precision (PPV) is {f3(T['precision'])}: of {T['tp'] + T['fp']} participants flagged,
{T['tp']} have HbA1c ≥ 6.5% and {T['fp']} do not. With a prevalence of
{pct(SP['test_prev'])}, even a moderately specific rule produces more false than true
positives (Week 4: PPV depends on prevalence). A flag means "worth a confirmatory HbA1c
test"; it is not a diagnosis, and {T['fn']} of {T['tp'] + T['fn']} participants in the
diabetes range were not flagged. In the population, prevalence is lower than in this
sample (Task 8), so PPV would be lower still.

**Record (example).** NHANES 2021–2023, files DEMO_L … SMQ_L (see `data/PROVENANCE.json`);
{F['demo_rows']:,} → {F['adults']:,} adults → {F['adults_with_hba1c']:,} with HbA1c.
Outcome HbA1c ≥ 6.5% ({O['positives']} positive, {pct(O['prevalence_unweighted'])}).
Codes 7/9 → missing; age 80 and income ratio 5 are top-codes, kept; SBP = mean of the
available readings. Stratified 75/25 split, seed 42 ({SP['train']:,}/{SP['test']:,});
5-fold stratified CV, seed 42. Pipeline: median imputer + StandardScaler on numeric and
ordinal, most-frequent imputer + one-hot on nominal, logistic regression
(`class_weight="balanced"`, `max_iter=1000`), threshold 0.5. Everything fitted on
training folds or the full training set; test used once. Not shown: performance in the
population (unweighted), performance with a different threshold, any diagnostic value."""),

("teach", """*Common mistakes:* changing the pipeline after seeing the test
result; reporting test results for every candidate. *What may vary:* exact test numbers
depend on the split (seed 42) and versions; the pattern (recall ≈ 0.7–0.75, PPV ≈ 0.25)
is the teaching point. A student who argues for the unweighted model plus a lower
threshold, decided by CV, is also correct."""),
# ---------------------------------------------------------------- checkpoint
("md", """---
### Checkpoint: end of the core lab

You have taken raw survey files to a documented, evaluated pipeline, and every
decision has a written reason. The extensions are optional."""),

# ---------------------------------------------------------------- E1
("md", """## Extension E1 — Resampling before the split

A tempting "fix" for imbalance: duplicate positive rows at random until the classes are
equal, then cross-validate. Test it.

1. Write `oversample(X, y, seed)` that returns X and y with randomly chosen positive rows
   duplicated (with `np.random.default_rng(seed)`) until the classes are equal.
2. **Wrong:** oversample all training rows, then run the 5-fold `cv` on the result.
3. **Right:** for each fold of `cv` on the original training rows, oversample only the
   training part, fit, and score the untouched validation part.
4. Do both for an unpruned `DecisionTreeClassifier(random_state=SEED)` and for the Task 4
   median logistic regression, using the median preprocessor. Report ROC AUC, average
   precision, recall, precision and the validation prevalence."""),
("task", STUDENT_CODE, """def oversample(X, y, seed):
    rng = np.random.default_rng(seed)
    pos, neg = np.where(y.values == 1)[0], np.where(y.values == 0)[0]
    extra = rng.choice(pos, len(neg) - len(pos), replace=True)
    idx = np.concatenate([neg, pos, extra])
    return X.iloc[idx], y.iloc[idx]

def fold_scores(y_val, p):
    pred = (p >= 0.5).astype(int)
    return {"roc_auc": roc_auc_score(y_val, p), "average_precision": average_precision_score(y_val, p),
            "recall": recall_score(y_val, pred), "precision": precision_score(y_val, pred, zero_division=0),
            "val_prevalence": y_val.mean()}

Xr, yr = X_train.reset_index(drop=True), y_train.reset_index(drop=True)
models = {"tree": lambda: make_pipeline(nhanes_preprocessor(SimpleImputer(strategy="median")),
                                        DecisionTreeClassifier(random_state=SEED)),
          "logistic regression": lambda: logreg(SimpleImputer(strategy="median"))}
rows = []
for name, make in models.items():
    Xo, yo = oversample(Xr, yr, SEED)
    wrong = [fold_scores(yo.iloc[v], make().fit(Xo.iloc[t], yo.iloc[t]).predict_proba(Xo.iloc[v])[:, 1])
             for t, v in cv.split(Xo, yo)]
    right = []
    for t, v in cv.split(Xr, yr):
        Xa, ya = oversample(Xr.iloc[t], yr.iloc[t], SEED)
        right.append(fold_scores(yr.iloc[v], make().fit(Xa, ya).predict_proba(Xr.iloc[v])[:, 1]))
    rows.append({"model": name, "resampling": "before the split (wrong)", **pd.DataFrame(wrong).mean()})
    rows.append({"model": name, "resampling": "inside each fold (right)", **pd.DataFrame(right).mean()})
display(pd.DataFrame(rows).round(3))"""),
("md", """**Question E1.1.** Explain the tree's two results. What fraction of each validation
fold in the "wrong" version could the tree have memorised?

**Question E1.2.** Logistic regression's ROC AUC hardly changed, but its precision did.
Why? Is the "wrong" version acceptable for logistic regression?"""),
("answer", f"""**E1.1.** Before the split, the tree reaches ROC AUC
{f3(RS['tree']['before_split']['roc_auc'])} and recall {f3(RS['tree']['before_split']['recall'])};
done correctly, ROC AUC {f3(RS['tree']['inside_folds']['roc_auc'])} and recall
{f3(RS['tree']['inside_folds']['recall'])}. Oversampling made about seven copies of each
positive participant, so almost every positive row in a validation fold also appears in
the training folds: about {pct(RS['tree']['val_rows_also_in_train_before'], 0)} of all
validation rows had an exact copy in training. An unpruned tree memorises training rows,
so it "recognises" them. This is leakage that a scikit-learn Pipeline does **not**
prevent: it comes from duplicated rows, not from a preprocessing step.

**E1.2.** Logistic regression cannot memorise individual rows, so its ranking barely
changes (ROC AUC {f3(RS['logreg']['before_split']['roc_auc'])} vs
{f3(RS['logreg']['inside_folds']['roc_auc'])}). But the "wrong" validation folds have a
prevalence of {f3(RS['logreg']['before_split']['val_prev'])} instead of
{f3(RS['logreg']['inside_folds']['val_prev'])}, so precision rises from
{f3(RS['logreg']['inside_folds']['precision'])} to {f3(RS['logreg']['before_split']['precision'])}
and average precision from {f3(RS['logreg']['inside_folds']['average_precision'])} to
{f3(RS['logreg']['before_split']['average_precision'])} for the same model: PPV depends on
prevalence (Week 4). It is not acceptable: the protocol is invalid whether or not a
particular model happens to be robust to it, and evaluation must use data with the real
class balance."""),

("teach", """*Common mistakes:* "logistic regression's AUC did not change, so
oversampling first is fine"; fixing it by moving only the scaler into the pipeline. *Point
to make:* a Pipeline prevents preprocessing leakage only; duplicated rows leak with a
perfect Pipeline. *Runtime:* about a minute; the tree is unpruned on purpose."""),
# ---------------------------------------------------------------- E2
("md", """## Extension E2 — One day of diet is not a habit

Every participant was eligible for two 24-hour dietary recalls. In this cycle both were
collected by telephone, the second 3 to 10 days after the first. For participants
in `data` with both, plot day-1 against day-2 energy intake (`files["dr2tot"].DR2TKCAL`),
and report the correlation and the median absolute difference between the two days."""),
("task", STUDENT_CODE, """two = data[["SEQN", "DR1TKCAL"]].merge(files["dr2tot"], on="SEQN").dropna(subset=["DR1TKCAL", "DR2TKCAL"])
r = two.DR1TKCAL.corr(two.DR2TKCAL)
fig, ax = plt.subplots(figsize=(5.5, 5.5))
ax.scatter(two.DR1TKCAL, two.DR2TKCAL, s=4, alpha=0.3)
ax.plot([0, 8000], [0, 8000], color="grey", lw=1)
ax.set(xlim=(0, 8000), ylim=(0, 8000), xlabel="Day-1 energy intake (kcal)",
       ylabel="Day-2 energy intake (kcal)", title=f"Two recalls, {len(two):,} adults: r = {r:.2f}")
plt.show()
print("median |day1 - day2|:", round((two.DR1TKCAL - two.DR2TKCAL).abs().median()), "kcal")"""),
("md", """**Question E2.1.** What does the correlation say about using one recall as a measure
of a person's *usual* intake? What happens to an estimated association between usual
intake and HbA1c when the exposure is measured this noisily? Is this something a better
model could fix?"""),
("answer", f"""**E2.1.** For {REC['n_both_days']:,} adults the two days correlate at only
r = {REC['corr_day1_day2']:.2f}, and the median difference is about
{REC['median_abs_diff']:.0f} kcal. One day is a noisy measurement of usual intake. Random
error in an exposure attenuates (dilutes) its estimated association with an outcome
towards zero, and makes a predictor less useful. This is a property of the instrument,
not of the model: no model choice recovers information that was not measured. Remedies
are in the data: more recall days, or statistical methods for usual intake that use the
repeated recalls."""),

# ---------------------------------------------------------------- E3
("md", """## Extension E3 (challenge, optional software) — SMOTE inside the pipeline

SMOTE creates synthetic minority rows by interpolating between neighbouring minority rows.
It is in the `imbalanced-learn` package, which is **not** part of the course environment.
If you have it (`pip install imbalanced-learn`), build
`imblearn.pipeline.make_pipeline(nhanes_preprocessor(SimpleImputer(strategy="median")),
SMOTE(random_state=SEED), LogisticRegression(max_iter=1000))` and cross-validate it with
`cv_scores`. Why does this need `imblearn`'s Pipeline rather than scikit-learn's? Is a
synthetic participant interpolated between two real ones always biologically plausible?
(Think about a one-hot encoded column.)"""),
("task", STUDENT_CODE, """try:
    from imblearn.pipeline import make_pipeline as imb_pipeline
    from imblearn.over_sampling import SMOTE
    smote = imb_pipeline(nhanes_preprocessor(SimpleImputer(strategy="median")), SMOTE(random_state=SEED),
                         LogisticRegression(max_iter=1000))
    display(pd.Series(cv_scores(smote, X_train, y_train)).round(3))
except ImportError:
    print("imbalanced-learn is not installed; E3 skipped (it is optional).")"""),
("answer", """`imblearn`'s Pipeline applies a resampler only when the pipeline is
*fitted*, so cross-validation resamples each training fold and never the validation
fold, and `predict` never resamples. scikit-learn's Pipeline has no notion of a step that
changes the number of rows. Interpolation is not always plausible: after one-hot encoding,
a synthetic row can be 0.4 of one category and 0.6 of another, and interpolating age,
BMI and blood pressure independently can produce combinations no real person has. Class
weights (Task 7) are simpler and usually as effective for logistic regression."""),

# ---------------------------------------------------------------- reflection
("md", """## Final reflection

Answer in a short paragraph each.

**R1.** List the preparation decisions you made today that changed *who the model is
about*, as opposed to *how well it scores*. Which of them would a reader of a paper be
least likely to notice?

**R2.** A colleague proposes replacing your logistic regression with a large pretrained
model "because it handles messy data". Which of today's problems would it fix, and which
would it not? Consider the missing outcomes, the dietary recall, the weights and the
top-codes."""),
("answer", f"""**R1.** Who the model is about: the outcome-defined population (adults with a
blood result, Task 1), complete-case versus imputation (Task 4: complete case would have
described {pct(cc['coverage_train'], 0)} of participants), outlier deletion (Task 5:
deleting high BMI removes the highest-risk group), and ignoring the weights (Task 8:
the sample is older than the population). How well it scores: the imputer type, the
encoding, the scaling, the class weights. The population decisions are the least visible
in a paper, because they are made before any table of results is produced.

**R2.** A pretrained model might extract more from complicated inputs (for example free
text), but it would fix none of today's problems. It cannot recover outcomes that were
never measured, or know why they are missing; it cannot turn one noisy day of diet into
usual intake; it does not know the survey design or the weights; it cannot undo
top-coding; and it will not tell you that a group is under-represented, it will simply be
less accurate for that group. Data quality is upstream of model choice."""),
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
        elif kind == "teach":                       # instructor notes: solutions only
            if solutions:
                out.append(nbformat.v4.new_markdown_cell("> **Instructor notes.** " + c[1]))
    if solutions:
        first = out[0].source
        first = first.replace("# COMP9085 Week 6 Laboratory",
                              "# COMP9085 Week 06 Lab — Solutions (instructor)", 1)
        first = first.replace(
            "**Deliverable.** This notebook, run top to bottom (**Kernel → Restart & Run All**),\n"
            "with every question answered in the markdown cells using your own numbers.",
            "**About this notebook.** Complete code, outputs, plots and worked answers for every\n"
            "task, plus **instructor teaching notes** (common mistakes, alternative defensible\n"
            "choices, what may vary between environments). **Instructor only:** do not\n"
            "distribute with the student files; the `solutions/` folder is gitignored.")
        assert "About this notebook" in first and "Solutions (instructor)" in first
        out[0].source = first
        # The solutions live in solutions/, one level below the data: find it from either place.
        setup = next(c for c in out if c.cell_type == "code" and 'DATA = Path("data")' in c.source)
        setup.source = setup.source.replace(
            'DATA = Path("data")',
            'DATA = Path("data") if Path("data").exists() else Path("../data")   # run from labs/week06 or solutions/')
    nb.cells = out
    return nb


# Run in the executed solutions notebook, then removed before saving: the
# outputs must agree with week06_numbers.json, which the lecture quotes.
CHECK = """import json, math
_N = json.load(open("../../data/scripts/week06_numbers.json"))
def _eq(a, b, tol=6e-4):
    assert math.isclose(float(a), float(b), abs_tol=tol), (a, b)
_eq(len(data), _N["outcome"]["n"]); _eq(data[TARGET].sum(), _N["outcome"]["positives"])
_OM = _N["outcome_missing"]
_eq(len(eligible), _OM["n_eligible"]); _eq(eligible.has_hba1c.sum(), _OM["n_with_hba1c"])
_eq((~eligible.has_hba1c).sum(), _OM["n_without_hba1c"]); _eq(len(eligible), _N["flow"]["adults"])
_eq((eligible.stage == "not examined").sum(), _OM["n_not_examined"])
_eq((eligible.stage == "examined, no HbA1c result").sum(), _OM["n_examined_no_hba1c"])
_eq(_OM["n_not_examined"] + _OM["n_examined_no_hba1c"], _OM["n_without_hba1c"])
_eq(o.loc[o.has_hba1c, "dx"].mean(), _OM["dx_rate_with_hba1c"]); _eq(o.loc[~o.has_hba1c, "dx"].mean(), _OM["dx_rate_without_hba1c"])
_eq(o.loc[o.stage == "examined, no HbA1c result", "dx"].mean(), _OM["dx_rate_examined_no_hba1c"])
_eq(o.loc[o.stage == "not examined", "dx"].mean(), _OM["dx_rate_interview_only"]); _eq(o.dx.isna().sum(), _OM["n_dx_unknown"])
assert set(data.SEQN) == set(eligible.SEQN[eligible.has_hba1c]) and data.SEQN.is_unique
import importlib.util as _iu
_sp = _iu.spec_from_file_location("b13", "../../data/scripts/13_build_week06_data.py"); _b = _iu.module_from_spec(_sp); _sp.loader.exec_module(_b)
pd.testing.assert_frame_equal(data, _b.build_analysis_table(files)[list(data.columns)], check_dtype=False)
_eq(counts["adults with HbA1c"], _N["flow"]["adults_with_hba1c"])
_eq(len(inner_adults), _N["flow"]["inner_join_all_files_adults"])
_eq((a.RIDAGEYR == 80).sum(), _N["codes"]["age_80_topcoded"]); _eq((a.INDFMPIR == 5).sum(), _N["codes"]["indfmpir_5_topcoded"])
_eq(a.DMDEDUC2.isin([7, 9]).sum(), _N["codes"]["DMDEDUC2_7_or_9"]); _eq(a.SMQ020.isin([7, 9]).sum(), _N["codes"]["SMQ020_7_or_9"])
_eq(len(X_train), _N["split"]["train"]); _eq(y_test.sum(), _N["split"]["test_pos"])
for k, j in [("complete case", "complete_case"), ("median", "median"), ("iterative + indicator", "iterative_indicator")]:
    for m in ["roc_auc", "average_precision", "recall", "balanced_accuracy"]:
        _eq(results[k][m], _N["imputation"][j][m])
for m in ["roc_auc", "recall", "balanced_accuracy"]:
    _eq(results["median, class_weight=balanced"][m], _N["imbalance"]["balanced"][m])
_eq(table6.loc["integer-coded nominal", "roc_auc"], _N["encoding"]["integer_coded"]["roc_auc"])
_eq(table6.loc["no scaling, 100 iterations", "roc_auc"], _N["scaling"]["unscaled_default_iter"]["roc_auc"])
_eq(n_conv, _N["scaling"]["unscaled_default_iter"]["convergence_warnings"])
_eq(iso_flag.sum(), _N["outliers"]["isolation_forest"]["n_flagged"])
_eq(np.average(data[TARGET], weights=data.WTPH2YR), _N["outcome"]["prevalence_weighted_WTPH2YR"])
assert chosen.replace(", class_weight=", "_") == _N["chosen"], chosen
for m in ["roc_auc", "recall", "specificity", "precision"]:
    _eq(test_scores[m], _N["test"][m])
_eq(tp, _N["test"]["tp"]); _eq(fp, _N["test"]["fp"])
_e1 = pd.DataFrame(rows).set_index(["model", "resampling"])
_eq(_e1.loc[("tree", "before the split (wrong)"), "roc_auc"], _N["resampling"]["tree"]["before_split"]["roc_auc"])
_eq(_e1.loc[("tree", "inside each fold (right)"), "roc_auc"], _N["resampling"]["tree"]["inside_folds"]["roc_auc"])
_eq(_e1.loc[("logistic regression", "before the split (wrong)"), "precision"], _N["resampling"]["logreg"]["before_split"]["precision"])
_eq(r, _N["recall"]["corr_day1_day2"], 6e-3)
print("CHECK PASSED: solutions agree with week06_numbers.json")
"""


def html(nb, path):
    body, _ = HTMLExporter().from_notebook_node(nb)
    with open(path, "w") as f:
        f.write(body)


def execute(nb, where=OUT):
    ExecutePreprocessor(timeout=1200, kernel_name="python3").preprocess(nb, {"metadata": {"path": where}})


def main():
    os.makedirs(SOL, exist_ok=True)

    student = build(False)
    for c in student.cells:
        assert "Worked answer" not in c.source
    nbformat.write(student, os.path.join(OUT, "COMP9085_Week06_Lab.ipynb"))
    html(student, os.path.join(OUT, "COMP9085_Week06_Lab.html"))
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
    nbformat.write(sol, os.path.join(SOL, "COMP9085_Week06_Lab_Solutions.ipynb"))
    html(sol, os.path.join(SOL, "COMP9085_Week06_Lab_Solutions.html"))
    print("student and executed solutions written to", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
