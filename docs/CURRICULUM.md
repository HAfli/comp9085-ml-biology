# COMP9085 — the redesigned twelve-week curriculum

**Machine Learning and Foundation Models for Biology, Healthcare and Nutrition**

Munster Technological University, Department of Computer Science.
5 credits, NFQ Level 9. Assessment: coursework only, two projects at 50% each.

> **The argument of the module.** Foundation models do not replace
> machine-learning fundamentals. They build on them.

> **The question the module trains students to ask.** What is the simplest
> appropriate machine-learning approach for this biological problem, and what
> evidence do you have that it is appropriate?

This file is the plain-text version of the curriculum, for anyone who wants it
without JavaScript. It is generated from the same source as the website
(`js/data/course.js`), so if the two ever disagree, the website is authoritative.

---

## A. The complete twelve-week table

| Wk | Lecture | Biology application | Classical ML | Foundation model | Interactive | Lab |
|---|---|---|---|---|---|---|
| 1 | Machine learning in biology | The biological data landscape; AlphaFold as the accessible example | Supervised vs unsupervised; prediction vs explanation | Introduced: what pretraining buys you (AlphaFold 2 and 3) | ML problem classifier | — |
| 2 | Decision trees and explainable biological prediction | Breast-mass diagnosis from nuclear morphometry (WDBC) | Entropy, information gain, ID3, pruning, interpretability | **Deliberately none.** The first negative example: the representation is already good | Decision tree builder; entropy visualiser | Growing and pruning a diagnostic tree |
| 3 | The complete ML workflow | Why biological ML results fail to reproduce | Pipelines, cross-validation, baselines, reproducibility | Pretraining-set contamination; embedding leakage | Train/test leakage simulator | Building a pipeline that does not lie to you |
| 4 | Bayes in healthcare: from prediction to probability | Diagnostic testing; screening vs symptomatic populations | Bayes' rule, sensitivity, specificity, PPV, NPV, decision thresholds, calibration vs discrimination | Calibration as the modern form of the same problem | Diagnostic test (Bayes) calculator; prevalence explorer; decision threshold explorer; calibration explorer | From confusion matrix to calibrated decision |
| 5 | Naive Bayes for food-safety text: a complete pipeline | FDA food-recall hazard classification (frozen openFDA snapshot, event-level) | Naive Bayes, Laplace smoothing, log space, text representation (counts, presence, TF-IDF), the vectorizer as part of the pipeline, leakage, calibration of predict_proba | From naive Bayes to language models: the same evaluation applied to a pretrained sentence encoder | Bayes-to-classifier explorer; evidence explorer; text representation explorer; in-browser classifier; leakage explorer; model comparison | Naive Bayes on real food-recall text: a complete pipeline |
| 6 | Biological and nutrition data preparation | NHANES: survey, examination and laboratory data | Missingness, outliers, encoding, scaling, imbalance | What pretraining does not fix | Nutrition data quality explorer | Preparing NHANES without breaking it |
| 7 | **Dimensionality reduction and foundation-model embeddings** | High-dimensional biological data; protein sequence families | PCA, explained variance, the curse of dimensionality | **The pivot.** Self-supervised pretraining, embeddings, anisotropy (ESM-2, NT, DNABERT-2, ProtT5, HyenaDNA) | PCA visualiser; foundation model embedding explorer | PCA and the geometry of a learned representation |
| 8 | Instance-based learning: k-NN and biological similarity (taught before Week 7 in 2026/27) | Reasoning by similarity: homology, comparable cases; heart-disease patients (UCI Cleveland) | Instance-based (lazy) learning, 1-NN and k-NN classification and regression, choosing k, Euclidean/Manhattan/Hamming/heterogeneous/domain-specific distances, scaling inside a Pipeline, irrelevant features and weighted distances, distance-weighted k-NN, cross-validated selection | Nearest-neighbour search over embeddings (previewed; Week 7 follows) | k-NN vote; k-NN regression; distance calculator; scaling; irrelevant features; distance-weighted voting; choosing k by CV; (optional) representation explorer | k-nearest neighbours on real patients: what counts as similar? |
| 9 | Clustering biological data | Tumour subtypes, cell types, microbiome, dietary patterns | k-means, DBSCAN, hierarchical, silhouette, validation | Clustering in embedding space, and why the caveats compound | k-means / DBSCAN simulator with injectable batch effect | Clusters, and whether to believe them |
| 10 | Random forests and foundation-model representations | Tabular clinical and genomic prediction | Bagging, random forests, OOB error, feature importance | Three-way comparison: features vs embeddings vs fine-tuning | Random forest visualiser; model comparison leaderboard | Ensembles and the limits of feature importance |
| 11 | Boosting and foundation-model adaptation | Getting good performance without a large labelled set | Boosting, gradient boosting, early stopping | The adaptation ladder: zero-shot, feature extraction, PEFT, LoRA, adapters | Fine-tuning simulator with exact LoRA arithmetic | Boosting, and costing an adaptation strategy |
| 12 | Can we trust the model? | The gap between a retrospective score and clinical usefulness | Calibration, uncertainty, dataset shift, subgroup performance, external validation | The five extra questions foundation models raise | "Would you trust this model?"; "Should I use a foundation model?" | Auditing a model you did not build |

---

## B. The five-stage learning journey

| Stage | The question | Weeks | What happens |
|---|---|---|---|
| 1. Classical machine learning | *Can I build a model?* | 1–5 | Trees, probability, naive Bayes and the full scikit-learn workflow, on clinical and food-safety data. |
| 2. Representation learning | *Can I learn useful features?* | 6–7 | Data quality, feature engineering, dimensionality reduction, and the idea that a model is only as good as what you feed it. |
| 3. Foundation models | *Can I reuse knowledge learned from massive biological datasets?* | 7–9 | Self-supervised pretraining, embeddings, and what a biological foundation model does and does not know. |
| 4. Adaptation | *Can I adapt the model to my biological problem?* | 10–11 | Zero-shot use, embeddings plus a classical head, transfer learning, fine-tuning, LoRA and adapters. |
| 5. Scientific evaluation | *Can I trust the result?* | 3, 4, 12 | Leakage, calibration, uncertainty, bias, external validation, cost, and the difference between a good score and a real finding. |

Note that stages overlap deliberately. Evaluation is not saved for the end; it
is introduced in Week 3, revisited in Week 4, and consolidated in Week 12.

---

## C. How foundation models are integrated

The brief was explicit that foundation models must not be an isolated final-week
topic. They are not. Every week states its foundation-model connection, and the
answer is sometimes "there isn't one, and here is why".

| Week | The foundation-model connection |
|---|---|
| 1 | Introduced as the pattern behind AlphaFold: train once at great expense on unlabelled data, reuse the representation. |
| 2 | **Deliberately none.** Thirty expert-chosen morphometric features, no suitable pretrained model. The first and most important negative example. |
| 3 | Two new leakage modes: pretraining-set contamination, and label-aware processing of embeddings outside the fold. |
| 4 | Calibration: modern models often produce confident probabilities that do not mean what they say, and everything in Week 4 depends on them meaning it. |
| 5 | From naive Bayes to language models. Same split, same metrics, same baseline: a frozen pretrained sentence encoder is compared with naive Bayes on performance, cost and interpretability. Evaluation survives model changes. |
| 6 | What pretraining does not fix: missing-not-at-random data, under-represented populations, measurement error in the instrument. |
| 7 | **The pivot.** Pretraining, embeddings, and the two-task comparison that gives opposite answers. |
| 8 | Embeddings plus a classical head, and why it is the baseline everything else must beat. |
| 9 | Clustering embedding space: anisotropy, cosine distance, and the fact that the model knows nothing about your batch structure. |
| 10 | The three-way comparison, including the honest "not applicable to this dataset" entry. |
| 11 | The full adaptation ladder, with exact LoRA parameter arithmetic. |
| 12 | The five extra questions: contamination, corpus composition, licensing, inference cost, reproducibility of a dependency you do not control. |

---

## D. Datasets

| Dataset | Weeks | Status | Licence |
|---|---|---|---|
| UCI Breast Cancer Wisconsin (Diagnostic), 569 × 30 | 2, 3, 4, 7, 8, 9, 10, 12 | Real, used live in the browser | CC BY 4.0 |
| UCI Breast Cancer Wisconsin (Original), 699 × 9 | 3, Project 1 | Real | CC BY 4.0 |
| CDC NHANES, Aug 2021 – Aug 2023 | 6, 12 | Real, used in the lab | US public-use files |
| openFDA Food Enforcement | 5 | Real, frozen snapshot (2026-09-28) used in the lab and on the site | CC0 1.0 public domain |
| NCI GDC / TCGA | 9, 12 | Real, referenced | Open and controlled tiers |
| AlphaFold Protein Structure Database | 1, 7 | Real, referenced | CC BY 4.0 |
| Protein family teaching set, 360 sequences | 7, 8, 9, 10, 11 | **Simulated**, labelled as such everywhere | Repository licence |
| Food-recall teaching corpus | — | **Illustrative**; superseded in Week 5 by the real snapshot, no longer used on the Week 5 page | Repository licence |

Every figure that uses simulated data carries a visible provenance banner. The
banners are generated from flags in the data files themselves, so running
`data/scripts/04_real_esm2_embeddings.py` to substitute genuine ESM-2 embeddings
updates them automatically.

---

## E. Assessment

Unchanged in structure from the approved descriptor.

**Project 1 — Supervised biological machine learning (50%).** Define a
biological classification or regression problem; prepare the data; establish a
baseline; select and justify at least three model families; train and tune with
a leak-free protocol; evaluate with metrics appropriate to the class balance and
report uncertainty; interpret biologically; discuss limitations. Optional
extension: compare classical ML against foundation-model embeddings. Marks are
for the quality of the comparison, not for using a foundation model.

**Project 2 — Unsupervised biological machine learning (50%).** Preprocess;
reduce dimensionality and interpret what was discarded; apply at least two
clustering algorithms with different assumptions; validate through stability,
cross-algorithm agreement and external correspondence; **check explicitly for
technical structure**; interpret biologically; discuss limitations honestly.
Foundation-model representations permitted, never required.

Generative-AI disclosure policy retained from the existing module: a
track-changed version of the written deliverable and an AI Assistance Statement
are both required.

---

## F. Learning-outcome map

| Outcome | Weeks | Interactive activities | Labs | Assessment |
|---|---|---|---|---|
| **LO1** Analyse ML workflows to facilitate pre-processing, dimensionality reduction and model selection | 1, 3, 6, 7, 9, 10, 11, 12 | Leakage simulator; data quality explorer; PCA visualiser; clustering simulator; random forest; leaderboard; fine-tuning simulator; trust challenge | 3, 6, 7, 9, 10, 11, 12 | Projects 1 and 2 |
| **LO2** Compare and apply appropriate ML algorithms to specific biological datasets | 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12 | Problem classifier; decision tree builder; Bayes calculator; naive Bayes explorer; embedding explorer; k-NN explorer; clustering; leaderboard; FM decision tool | 2, 4, 5, 6, 7, 8, 9, 10, 11, 12 | Projects 1 and 2 |
| **LO3** Develop supervised ML models for classification tasks | 2, 3, 5, 8, 10, 11, 12 | Decision tree builder; naive Bayes explorer; k-NN explorer; random forest; leaderboard | 2, 3, 5, 8, 10, 11, 12 | Project 1 |
| **LO4** Develop unsupervised ML models for clustering tasks | 7, 9, 12 | PCA visualiser; embedding explorer; clustering simulator | 7, 9, 12 | Project 2 |
| **LO5** Evaluate the accuracy of predictive models and interpret their results | 2, 3, 4, 5, 6, 8, 9, 10, 11, 12 | Every figure reports measured performance with uncertainty; leakage simulator; Bayes calculator; leaderboard; trust challenge | 2, 3, 4, 5, 6, 8, 9, 10, 11, 12 | Projects 1 and 2 |

Coverage is deliberately redundant: no outcome depends on a single week, so a
student who misses one session has not missed an outcome.

---

## G. Weekly structure

Every week page follows the same twelve-part shape:

1. Learning objectives
2. Key concepts
3. Biological context
4. Interactive visualisation
5. Worked example
6. Practical lab
7. Dataset
8. Foundation-model connection
9. Think Like a Scientist question
10. Quick self-check
11. Weekly check-in
12. Further reading

and the pedagogical sequence within it is always:

> concept → biological example → interactive exploration → Python lab →
> scientific interpretation → reflection
