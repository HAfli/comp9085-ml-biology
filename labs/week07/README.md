# COMP9085 Week 7 lab: PCA and the geometry of a learned representation

**Two hours.** You reduce a real dataset properly with PCA, look inside a real protein
language-model embedding, and test with one fixed classifier what that learned
representation captures that simple, hand-chosen features do not, and why.

## Files

| File | What it is |
|---|---|
| `COMP9085_Week07_Lab.ipynb` | The lab notebook: instructions, provided code, your code cells and question cells |
| `COMP9085_Week07_Lab.html` | The same notebook, rendered, for reading without Jupyter |
| `data/` | 2,000 human Swiss-Prot proteins with labels, their ESM-2 embeddings, `README.md` (every column) and `PROVENANCE.json` (sources, model version, checksums) |

Part A uses WDBC, which is bundled with scikit-learn (`load_breast_cancer`), so it needs no file.

## Setup

1. Keep the notebook and the `data/` folder together, as they are here.
2. Use the course environment: Python 3 with Jupyter, numpy, pandas, matplotlib and
   scikit-learn (tested with Python 3.13, scikit-learn 1.9 and pandas 3.1). Anaconda or
   Google Colab are fine; on Colab, upload the notebook and the `data/` folder.
3. **No download, no GPU and no deep-learning package are needed.** The embeddings were
   computed once by the module team and are read from `data/`.
4. Run the cells in order. Before you finish, choose **Kernel → Restart & Run All**.
   The whole notebook runs in well under a minute on a laptop (about 15 seconds when complete,
   on the machine it was tested on).

## What you will be able to do

- Explain the curse of dimensionality and show distance concentration numerically.
- Perform PCA correctly (standardised; inside the pipeline when it feeds a model) and
  interpret the explained-variance spectrum and the loadings.
- Say what PCA and t-SNE each preserve, and read each plot without over-reading it.
- Describe how a protein language-model embedding is produced, and measure its anisotropy
  and effective dimension.
- Compare engineered and learned representations under one classifier and one protocol,
  and use a control experiment to explain why they differ.

## Structure

| Part | Content |
|---|---|
| Task 1 | The curse of dimensionality (provided demonstration, predict first) |
| Tasks 2–3 | PCA on WDBC: spectrum, loadings, the effect of scaling; t-SNE (provided) |
| Task 4 | How many components the classifier needs, chosen by cross-validation inside a `Pipeline` |
| Task 5 | The WDBC test set, used once |
| Task 6 | The protein data, amino-acid composition, and where the labels come from |
| Task 7 | The geometry of the ESM-2 embedding: anisotropy, effective dimension, a 2-D view |
| Task 8 | One classifier, four representations (length, composition, ESM-2, ESM-2 on shuffled sequences) |
| Task 9 | What is the embedding seeing? A control experiment and two classical hydropathy features |
| Task 10 | The protein test set, used once |
| E1–E3 | Optional: compressing the embedding; which proteins the model gets wrong; t-SNE of the embedding |
| Reflection | Two short paragraphs |

**Tasks 1–10 are the core lab** (Part A about 50 minutes, Part B about 60). The extensions
are optional. Your numbers should match the Week 7 lecture exactly, because the data,
splits and seeds are the same.

## Rules for the whole lab

- Each dataset is split once, in a provided cell. Every choice is made by 5-fold
  cross-validation on the training rows.
- Each test set is used **once** (Tasks 5 and 10).
- Anything that learns from data (scaler, PCA, classifier) is fitted inside a `Pipeline`.

## This lab and Assignment 1

This lab is **practice and is not assessed**. It uses different data from Assignment 1.
Nothing in it changes the Assignment 1 brief; use PCA or embeddings in your assignment only
if you can justify them for your data, with your own numbers.

## Data and citation

- Protein sequences and annotations: The UniProt Consortium. *UniProt: the Universal
  Protein Knowledgebase in 2025.* Nucleic Acids Research 53:D609–D617 (2025). UniProtKB
  release 2026_03, licensed CC BY 4.0.
- Embeddings: computed with ESM-2 (`facebook/esm2_t6_8M_UR50D`, MIT licence). Lin, Z. et al.
  *Evolutionary-scale prediction of atomic-level protein structure with a language model.*
  Science 379:1123–1130 (2023).
- WDBC: Wolberg, W., Mangasarian, O., Street, N. & Street, W. (1993). Breast Cancer Wisconsin
  (Diagnostic). UCI Machine Learning Repository, CC BY 4.0.

See `data/README.md` for every column, how the proteins were chosen and the limitations of
the labels.
