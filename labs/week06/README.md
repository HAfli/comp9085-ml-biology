# COMP9085 Week 6 lab: Preparing NHANES without breaking it

**Two hours.** You take a real public-health survey from nine raw files to a documented,
evaluated modelling pipeline, and make every data-preparation decision explicitly.

## Files

| File | What it is |
|---|---|
| `COMP9085_Week06_Lab.ipynb` | The lab notebook: instructions, provided code, your code cells and question cells |
| `COMP9085_Week06_Lab.html` | The same notebook, rendered, for reading without Jupyter |
| `data/` | Nine NHANES CSV extracts, `README.md` (every column and code) and `PROVENANCE.json` (source and checksums) |

## Setup

1. Keep the notebook and the `data/` folder together, as they are here.
2. Use the course environment: Python 3 with Jupyter, numpy, pandas, matplotlib and
   scikit-learn (tested with Python 3.13 and scikit-learn 1.9). Anaconda or Google Colab
   are fine; on Colab, upload the notebook and the `data/` folder.
3. **No download and no extra package are needed.** Extension E3 uses the optional
   `imbalanced-learn` package and skips itself if it is not installed.
4. Run the cells in order. Before you finish, choose **Kernel → Restart & Run All**.

## What you will be able to do

- Merge survey files and account for every participant lost at each step.
- Recognise special codes (refused, don't know), top-codes and reader artefacts.
- Tell a missing outcome from missing predictors, argue with evidence which missingness
  mechanism (MCAR, MAR or MNAR) is most plausible and what the data cannot show, and
  compare strategies for missing predictors inside a pipeline.
- Decide what to do with unusual values using knowledge of the measurement.
- Encode ordinal and nominal variables correctly, and know which models need scaling.
- Handle class imbalance without leakage.
- Explain what a survey weight changes.

## Structure

| Part | Content |
|---|---|
| Tasks 1–2 | Merge the files; read the codebook (short) |
| Checkpoint A | Provided: `eligible` (every adult 20+, before the outcome filter) and `data`, the modelling table every later task uses |
| Task 3 | Missingness and its mechanism: Part A the outcome (who has no HbA1c, in `eligible`), Part B the predictors (in `data`) |
| The split | Provided: one stratified split, used for the rest of the lab |
| Task 4 | Three missing-data strategies in a `ColumnTransformer` pipeline, compared by cross-validation |
| Task 5 | Outliers: IQR fences and `IsolationForest` |
| Task 6 | Encoding and scaling checks (short) |
| Task 7 | Class imbalance: accuracy, class weights and the threshold |
| Task 8 | Survey weights |
| Task 9 | Choose by a fixed rule, use the test set once, write the reproducibility record |
| E1–E3 | Optional: resampling before the split; two dietary recalls; SMOTE |
| Reflection | Two short paragraphs |

**Tasks 1–9 are the core lab.** The extensions are optional. Your numbers should match the
Week 6 lecture exactly, because the data, split and seeds are the same.

## Rules for the whole lab

- One split, made once. Every choice is made by cross-validation on the training rows.
- The test rows are used **once**, in Task 9.
- Anything that learns from data (imputer, scaler, encoder, outlier detector, resampler)
  is fitted on training rows only, inside the pipeline.

## This lab and Assignment 1

This lab is **practice and is not assessed**. It uses a different dataset from
Assignment 1. It practises skills the assignment also needs, but the decisions in your
assignment must be made and justified for your data, with your own numbers. Nothing in
this lab changes the Assignment 1 brief.

## Data and citation

Centers for Disease Control and Prevention, National Center for Health Statistics.
*National Health and Nutrition Examination Survey Data, August 2021 – August 2023.*
Public-use data; do not attempt to identify any participant. See `data/README.md`.

The lab outcome (HbA1c ≥ 6.5%) is a measurement threshold, not a diagnosis, and nothing
in this lab is a clinical tool.
