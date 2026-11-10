# COMP9085 Week 7 lab: protein representations, dimensionality reduction and k-NN

**Two hours.** Taught after Week 8 (k-NN) in 2026/27. You represent 2,000 real human proteins
three ways (hand-made descriptors, a pretrained ESM-2 protein language-model embedding, and
reduced versions of both). You see what PCA, t-SNE and UMAP keep and lose. Then you compare
classical features with ESM-2 under k-NN in a controlled, reproducible experiment: same
proteins, split, folds, pipeline and hyperparameter grid, and one look at the test set.

## Files

| File | What it is |
|---|---|
| `COMP9085_Week07_Lab.ipynb` | The lab notebook: instructions, provided code, your code cells and question cells |
| `COMP9085_Week07_Lab.html` | The same notebook, rendered, for reading without Jupyter |
| `data/` | 2,000 human Swiss-Prot proteins with labels, their ESM-2 embeddings (real and residue-shuffled sequences), `README.md` (every column) and `PROVENANCE.json` (sources, model version, checksums) |

## Setup

1. Keep the notebook and the `data/` folder together, as they are here.
2. Use the course environment: Python 3 with Jupyter, numpy, pandas, matplotlib and
   scikit-learn (tested with Python 3.13, scikit-learn 1.9, pandas 3.1, numpy 2.5).
   **`umap-learn` is optional** (`pip install umap-learn`): without it, the UMAP cells are
   skipped and everything else runs. Anaconda or Google Colab are fine; on Colab, upload the
   notebook and the `data/` folder.
3. **No download, no GPU and no deep-learning package are needed.** The embeddings were
   computed once by the module team; Extension D shows how, for reference.
4. Run the cells in order. Before you finish, choose **Kernel → Restart & Run All**. The
   completed notebook runs in about two minutes on a laptop (Task 6 is the longest step).

## Structure

| Task | Content | Time |
|---|---|---|
| 1 | Explore the proteins: provenance, lengths, labels and their evidence, missing values, the split | 15 min |
| 2 | Classical descriptors: composition, log length, two Kyte–Doolittle hydropathy summaries | 10 min |
| 3 | PCA on the classical descriptors: spectrum, loadings, scaled versus unscaled | 15 min |
| 4 | t-SNE and UMAP: settings and trustworthiness | 15 min |
| 5 | The ESM-2 embeddings: integrity, how they were made, anisotropy, PCA and UMAP | 10 min |
| 6 | **The key experiment:** k-NN on classical descriptors versus ESM-2, same protocol, test once | 30 min |
| 7 | Nearest neighbours in composition, classical, ESM-2 and PCA-reduced spaces | 10 min |
| 8 | The residue-shuffling control | 10 min |
| 9 | Critical reflection | 10 min |
| A–D | Optional: reduction inside the k-NN pipeline; choosing a threshold; annotation evidence and related sequences; regenerating the embeddings | — |

**Tasks 1–9 are the core lab.** Your numbers should match the Week 7 lecture and website
exactly, because the data, split and seeds are the same.

## Rules for the whole lab

- The proteins are split once (1,500 training, 500 test), in a provided cell. Every choice is
  made by 5-fold cross-validation on the training proteins.
- The test set is used **once**, in Task 6, for each representation's selected pipeline.
- Anything that learns from data (scaler, PCA) is fitted inside a `Pipeline`.
- Every representation gets the same split, folds, pipeline and grid.

## The website

Every task has a matching exercise on the Week 7 page:
https://hafli.github.io/comp9085-ml-biology/weeks/week07.html (section 11 maps them).

## This lab and Assignment 1

This lab is **practice and is not assessed**. It uses different data from Assignment 1.
Nothing in it changes the Assignment 1 brief.

## Data and citation

- Protein sequences and annotations: The UniProt Consortium. *UniProt: the Universal
  Protein Knowledgebase in 2025.* Nucleic Acids Research 53:D609–D617 (2025). UniProtKB
  release 2026_03, licensed CC BY 4.0. One protein per UniRef50 cluster (Suzek et al., 2015).
- Embeddings: ESM-2 (`facebook/esm2_t6_8M_UR50D`, MIT licence, pinned revision in
  `data/PROVENANCE.json`). Lin, Z. et al. *Evolutionary-scale prediction of atomic-level
  protein structure with a language model.* Science 379:1123–1130 (2023).
- Hydropathy: Kyte, J. & Doolittle, R. F. (1982). J Mol Biol 157:105–132.

See `data/README.md` for every column, how the proteins were chosen, and the limitations of
the labels (most come from sequence analysis; negatives mean "not annotated"; homology and
pretraining exposure).

*The 2026-11-01 version of this lab (WDBC PCA and a logistic-regression probe) is archived by
the module team; its PCA material is in the lecture and in Exercise 2 on the website.*
