# Analysis of the existing COMP9085 module

This document records what was found in the 2025/26 course materials before any
redesign work began, and the decision taken about each piece of it. It exists so
that the redesign can be audited: every "Keep", "Modify" or "Replace" below is
traceable to a specific file in the original folder.

Materials analysed:

- `Module COMP9085 Machine Learning in Biology.pdf` (the approved descriptor)
- Ten lecture decks (`.pptx` and `.pdf`), 90 to 112 slides each
- Seven lab folders with notebooks, solutions and data
- Both project briefs and their supporting notebooks
- `Setup/` system configuration notes

---

## 1. The approved module descriptor

The descriptor is the fixed point of the redesign. Nothing in it was changed.

| Field | Value |
|---|---|
| Code | COMP9085 |
| Title | Machine Learning in Biology (long title: Applied Machine Learning in Biology) |
| NFQ level | Expert (Level 9) |
| Credits | 5 |
| Valid from | Semester 1, 2021/22 |
| Assessment | Coursework 100%: two projects at 50% each, no formal examination |
| Workload | 2h lecture, 2h lab, 3h independent learning per week |

### Learning outcomes, retained verbatim

| | |
|---|---|
| LO1 | Analyse machine learning workflows to facilitate pre-processing, dimensionality reduction and model selection. |
| LO2 | Compare and apply appropriate machine learning algorithms to specific Biological datasets. |
| LO3 | Develop supervised machine learning models for classification tasks. |
| LO4 | Develop unsupervised machine learning models for clustering tasks. |
| LO5 | Evaluate the accuracy of predictive models using standard methods and interpret their results. |

**No change to the learning outcomes is proposed.** They are broad enough to
accommodate foundation models without amendment: LO2's "compare and apply
appropriate ... algorithms" already carries the central argument of the
redesign, and LO1's "model selection" covers the choice between a classical
model and an adapted pretrained one. Amending approved outcomes would require
programme-board approval and would buy nothing pedagogically.

One observation worth recording for a future descriptor review: the indicative
content lists "association rule mining" under unsupervised learning, which does
not appear in any of the delivered lecture material. The redesign follows the
delivered material rather than the indicative list, which is the normal
relationship between the two.

---

## 2. What was found, week by week

### Week 1 — Introduction (`Week1_MLinBiology_Introduction_final.pptx`)

Covers AI/ML/DL framing, categories of learning (supervised, unsupervised,
semi-supervised, reinforcement), the build-and-deploy diagram, AlphaFold as a
success story, and the carbon footprint of deep learning. Two videos are
included: *AlphaFold: The making of a scientific breakthrough* and *When Biology
Meets Computer Science*.

**The central problem.** The entire running worked example is a **credit-scoring
scenario**: an online loans company classifying applicants as repayers or
defaulters using loan-to-salary ratio, age and occupation. It occupies
approximately 25 of the deck's slides and every subsequent decision-tree
illustration in the deck builds on it. In a module called *Machine Learning in
Biology*, the first thing a student sees is a bank.

### Week 2 — Decision trees (`Week2_MLinBio_Decision_Tree.pptx`, 90 slides)

The strongest teaching sequence in the module. Guess Who as motivation, entropy
from first principles, information gain, the ID3 algorithm walked through step
by step on a heart-disease risk dataset, continuous-feature handling,
overfitting, pre- and post-pruning, and an honest advantages/disadvantages
summary.

The heart-disease example is already biomedical, which is good. Lab 2 uses the
UCI **wine** dataset, which is not.

### Weeks 3 and 4 — scikit-learn (`Week3_ML_MTU_2024.pptx`, `Week4_ML_MTU_2024.pptx`)

Introduction to scikit-learn, the estimator API, loading data, decision trees
and k-NN in sklearn, accuracy assessment, train/test splitting and
cross-validation.

**These two files are byte-identical duplicates.** The running example is the
**Iris** dataset throughout. The decision-tree lab in this folder uses
**credit-scoring** data.

The material teaches the mechanics of cross-validation correctly but never
addresses *why the split boundary matters*: there is no treatment of data
leakage, no baseline model, and no discussion of reproducibility.

### Weeks 5 and 6 — Probability and naive Bayes (`Week4_ML_MTU.pptx`, 84 slides)

Thorough and correct: unconditional and conditional probability, the product
rule, Bayes' rule, naive Bayes from first principles, the conditional
independence assumption, Laplace smoothing, the zero-frequency problem, log-space
computation, multinomial and Bernoulli document models, and preprocessing for
document classification.

**Duplication.** `Week4_ML_MTU_part1.pptx` (47 slides) is a strict prefix of
`Week4_ML_MTU.pptx` (84 slides). `Week5_ML_MTU.pdf` and `Week6_ML_MTU.pdf` are
identical files.

**Examples.** Bayes' rule is introduced with a prison-uniform problem
(`P(CellBlockA | BlueU)`). Naive Bayes uses an employee database (name, weight,
height → sex) and then the **play-tennis weather dataset**. Document
classification uses Twitter sentiment. None of these is biological, and the
prison example in particular is a missed opportunity: the identical arithmetic
is what governs diagnostic testing.

### Weeks 6 and 7 — Data preparation (`Week6/`, `week7/` decks)

Outlier detection and visualisation, DBSCAN for multivariate outliers, missing
values with `SimpleImputer` and `ColumnTransformer`, categorical encoding,
one-hot encoding, normalisation and standardisation, class imbalance, SMOTE,
Tomek links, confusion matrices, and feature selection (univariate, tree-based,
greedy).

**Structural problem.** Slides 51 to 59 of the Week 7 deck are an
**ensemble-learning section** — bagging, decision trees as base learners, random
forests — sitting in the middle of the data-preparation material. This content is
covered again, more thoroughly, in the Week 10-11 deck. It is here only because
tree-based feature selection needs a forest, and it interrupts the flow.

The two decks in `week6/` and `week7/` also overlap substantially with each
other.

### Week 8 — Instance-based learning (`Week8_ML_Instance-Based Learning.pptx`)

Complete and well-constructed: nearest neighbour, choosing k, Euclidean,
Manhattan, Hamming and heterogeneous distance metrics, domain-knowledge metrics,
the "problems measuring distance" sequence, irrelevant features,
distance-weighted k-NN for both classification and regression, and eager versus
lazy learners. Supporting documents on distance-weighted k-NN answer a real
student question.

The running example is classifying films as **romance or action**. Lab 8,
however, already uses a cancer dataset (`cancerTrain.csv` / `cancerTest.csv`),
so the lab is better aligned to the module than the lecture is.

### Week 9/10 — Unsupervised learning (`Week9_ML_Unsupervised_Learning.pptx`)

k-means with the assignment and centroid steps, the distortion cost function,
local optima, random initialisation, k-means++, the elbow method, DBSCAN,
silhouette plots with worked parameter comparisons, hierarchical clustering,
dendrograms and linkage criteria. Thorough.

The lab is **customer segmentation**.

### Weeks 10-11 — Ensemble learning (`Week10-11_ML_Ensemble Learning.pptx`, 112 slides)

The wisdom of crowds (guessing the weight of an ox), bagging, random forests,
boosting with the weight-update rules worked through, gradient boosting as
residual fitting, and gradient-boosting variants.

The running example throughout is **bicycle demand prediction**. The lab uses
**credit-scoring** data.

### Assessment

**Project 1** (`ML_Bio_Assignment_Project1_questions.ipynb`) is a structured
notebook on the **Wisconsin Breast Cancer (Original)** dataset: 699 instances,
nine ordinal cytology features, benign/malignant. Five parts at 20% each: load,
prepare, model with a decision tree, evaluate, deploy with pickle. Well
constructed and genuinely biological. It also carries a detailed and thoughtful
generative-AI disclosure policy requiring a track-changed version and an AI
Assistance Statement.

**Project 2** (`Project_2_ML_in_Bio.pdf`) is an open research-style project with
a COLING-format report, a required methodological research component, and
student-chosen datasets from biology or nutrition. Also well constructed.

The projects are the strongest part of the existing module and are more
biologically grounded than the lectures that precede them.

---

## 3. Summary of findings

**Strengths, which the redesign preserves.**

1. The decision-tree, naive Bayes, k-NN, clustering and ensemble treatments are
   thorough, mathematically correct and well paced. This is the bulk of the
   module and almost all of it is retained.
2. Both project briefs are biologically framed and well structured.
3. The generative-AI disclosure policy is thoughtful and ahead of most modules.
4. The AlphaFold framing in Week 1 is exactly the right entry point.
5. Environmental-cost material is already present, which is unusual and good.

**Weaknesses, which the redesign addresses.**

1. **Biology is largely absent from the lectures.** Of the running examples in
   the ten decks, the substantial majority are non-biological: credit decisions,
   loan defaults, films, bicycles, weather, prison uniforms, employee records,
   customer segments, an ox. The biology is in the module title, in the datasets
   the projects use, and in one heart-disease example.
2. **Labs are less biological than the projects.** Wine, credit scoring
   (three separate labs), customer segmentation and generic CSVs. Only Lab 8
   uses biological data.
3. **Substantial duplication.** Two byte-identical scikit-learn decks; a naive
   Bayes deck that is a prefix of another; two identical PDF exports; an
   ensemble section duplicated between the data-preparation and ensemble decks;
   heavy overlap between the two data-preparation decks.
4. **No treatment of data leakage.** Cross-validation mechanics are taught but
   the reason the split boundary matters is not, and this is the single most
   consequential omission for students who will go on to do research.
5. **No baselines.** No deck establishes what a trivial model would score before
   reporting a sophisticated one.
6. **No foundation-model content at all.** The module ends on gradient-boosting
   variants. A 2026/27 MSc graduate in this area who has not met pretrained
   sequence models, embeddings or parameter-efficient fine-tuning is not
   adequately prepared.
7. **Healthcare and nutrition are unrepresented** despite being natural
   application areas for the module and for the lecturer's research.
8. **No week is dedicated to whether a result can be trusted.** Calibration,
   uncertainty, dataset shift, subgroup performance and external validation do
   not appear.
9. **Numbering is inconsistent.** Folders, file names and slide headers disagree:
   `Week4/` contains `Week3_ML_MTU_2024.pptx`, `Week10/` contains
   `Week9_ML_Unsupervised_Learning.pptx`, `week6/` contains a Week 7 deck. This
   is a maintenance hazard.

---

## 4. Content mapping

| Existing content | Decision | New location | Reason |
|---|---|---|---|
| Module descriptor and LO1–LO5 | **Keep** | Unchanged | Broad enough to cover the new material; amendment would need board approval and buy nothing. |
| Assessment structure, 2 × 50% projects | **Keep** | Assessment page | Approved, well designed, and fits the redesigned content. |
| Generative-AI disclosure policy | **Keep** | Assessment page | Thoughtful and current. |
| AlphaFold framing and video | **Keep** | Week 1 | The right entry point; extended with a careful reading of pLDDT and of what AlphaFold does not do. |
| AI/ML/DL hierarchy, categories of learning | **Keep** | Week 1 | Correct and necessary. |
| Credit-decision running example | **Replace** | — | Non-biological, and it occupies a quarter of the opening lecture. Replaced by biological problem framing throughout. |
| Carbon-footprint slides | **Move** | Week 12 | Belongs with the other cost-and-trust material, where it can be acted on. |
| Guess Who motivation | **Keep** | Week 2 | Genuinely effective. |
| Entropy, information gain, ID3 walkthrough | **Keep** | Week 2 | The strongest sequence in the module. Retained essentially intact. |
| Continuous features, overfitting, pruning | **Keep** | Week 2 | Correct and complete. |
| Heart-disease worked example | **Modify** | Week 2 | Moved onto the real WDBC data so the arithmetic runs on the dataset used in Project 1. |
| Lab 2 (wine dataset) | **Replace** | Week 2 lab | Wine is not biological in the relevant sense. Replaced with WDBC. |
| scikit-learn API introduction | **Keep** | Week 3 | Necessary and well presented. |
| Duplicate Week3/Week4 decks | **Remove** | — | Byte-identical duplicates. One is carried forward. |
| Iris running example | **Replace** | Week 3 | Replaced by WDBC, so one dataset carries the whole module. |
| Train/test split, cross-validation | **Keep and extend** | Week 3 | Retained; leakage, baselines and reproducibility added. |
| Decision-tree lab (credit scoring) | **Replace** | Week 3 lab | Rewritten as a leak-free-pipeline lab on WDBC. |
| Conditional probability, product rule, Bayes' rule | **Keep** | Week 4 | Correct and clearly presented. |
| Prison-uniform example | **Replace** | Week 4 | Identical arithmetic, applied to diagnostic testing. Adds sensitivity, specificity, PPV, NPV and the base-rate fallacy. |
| Naive Bayes derivation, independence assumption | **Keep** | Week 5 | Thorough and correct. |
| Laplace smoothing, log-space, multinomial vs Bernoulli | **Keep** | Week 5 | Retained in full. |
| Employee / weather / Twitter examples | **Replace** | Week 5 | Replaced by FDA food-recall hazard classification. |
| Duplicate naive Bayes decks and PDFs | **Remove** | — | `part1` is a prefix of the full deck; two PDFs are identical. |
| Outliers, missing values, encoding, scaling | **Keep** | Week 6 | Comprehensive. |
| Class imbalance, SMOTE, Tomek links | **Keep and extend** | Week 6 | Retained; the requirement to resample inside the fold is added. |
| Ensemble slides inside the data-prep deck | **Move** | Week 10 | Duplicated there already, and they interrupt the data-preparation flow. |
| Generic and credit-scoring data-prep examples | **Replace** | Week 6 | Replaced by NHANES. Missingness mechanisms, survey weights and measurement error added. |
| PCA and dimensionality reduction | **Keep and extend** | Week 7 | Retained and made the pivot of the module, extended into representation learning and embeddings. |
| Instance-based learning, all distance metrics | **Keep** | Week 8 | Complete treatment, retained. |
| Problems measuring distance, irrelevant features | **Keep** | Week 8 | Sets up the representation comparison precisely. |
| Film romance/action example | **Replace** | Week 8 | Replaced by biological similarity. |
| Lab 8 (cancer data) | **Keep and extend** | Week 8 lab | Already biological. Extended with the representation comparison. |
| k-means, elbow, k-means++, DBSCAN, silhouette | **Keep** | Week 9 | Thorough, retained. |
| Hierarchical clustering, dendrograms, linkage | **Keep** | Week 9 | Retained. |
| Clustering lab (customer segmentation) | **Replace** | Week 9 lab | Rewritten on biological data, with cluster validation and a batch-effect demonstration. |
| Wisdom of crowds, bagging, random forests | **Keep** | Week 10 | Good motivation, retained. |
| Tree-based feature selection | **Keep** | Week 10 | Consolidated here from the data-prep deck. |
| Ox-weight and bicycle-demand examples | **Replace** | Weeks 10, 11 | Replaced by biological ones. |
| Boosting, weight updates, gradient boosting | **Keep** | Week 11 | Detailed and correct, retained. |
| Ensemble lab (credit scoring) | **Replace** | Week 11 lab | Rewritten on biological data, plus the adaptation-ladder costing exercise. |
| Evaluation metrics, confusion matrices | **Consolidate** | Week 12 | Currently scattered across decks; gathered into a coherent unit. |
| Project 1 (WBC Original, decision trees) | **Keep and extend** | Assessment | Retained; an optional representation-comparison extension added. |
| Project 2 (open research project) | **Keep and extend** | Assessment | Retained; cluster validation and batch-effect checking made explicit requirements. |
| — | **New** | Week 3 | Data leakage, baselines, reproducibility. |
| — | **New** | Week 4 | Sensitivity, specificity, PPV, NPV, base rates. |
| — | **New** | Week 6 | Missingness mechanisms, survey weights, measurement variability. |
| — | **New** | Week 7 | Representation learning, embeddings, self-supervised pretraining. |
| — | **New** | Weeks 8, 10 | Engineered versus learned representation comparisons. |
| — | **New** | Week 9 | Cluster validation, stability, batch effects. |
| — | **New** | Week 11 | The adaptation ladder: zero-shot, feature extraction, PEFT, LoRA. |
| — | **New** | Week 12 | Calibration, uncertainty, dataset shift, subgroup performance, external validation, licensing, cost. |
| — | **New** | Throughout | Healthcare framing (Weeks 2, 4, 12) and nutrition framing (Weeks 5, 6). |

---

## 5. Opportunities for interactive teaching identified in the analysis

Each of these was a place where the existing slides showed a static result that
a student would understand better by manipulating. All sixteen became
interactive components on the site.

| Where the static version appears | What it became |
|---|---|
| Week 2, entropy tables computed by hand | Entropy visualiser with live information-gain arithmetic |
| Week 2, three fixed tree images (`tree1.png`–`tree3.png`) | Decision tree builder fitting a real tree on every control change |
| Week 3, cross-validation diagrams | Leakage simulator that measures the inflation on data whose true signal you control |
| Week 4, Bayes' rule worked once | Medical test calculator with the natural-frequency square |
| Week 5, word-probability tables | Naive Bayes explorer showing every token's log-likelihood contribution |
| Week 6, before/after imputation screenshots | Data quality explorer with known injected damage |
| Week 7, static PCA scatter plots | PCA visualiser with live loadings and downstream cost |
| Week 8, k-NN boundary illustrations | k-NN explorer separating classifier settings from representation |
| Week 9, silhouette plots at three eps values | Clustering explorer with an injectable batch effect |
| Week 10, feature-importance bar chart | Random forest visualiser with a duplicate-feature control |
| Week 11, boosting iterations drawn by hand | Fine-tuning simulator with exact LoRA arithmetic |
| Nowhere in the existing module | ML problem classifier, embedding explorer, model leaderboard, foundation-model decision tool, trust challenge |

---

## 6. Housekeeping recommendations for the source folder

These are not part of the redesign but were noticed while reading it, and are
cheap to act on.

1. Align folder names, file names and slide headers to one week numbering.
   `Week4/Week3_ML_MTU_2024.pptx` and `Week10/Week9_...` will cause confusion.
2. Delete `Week4/Week4_ML_MTU_2024.pptx` (identical to the Week 3 file) and
   `Week5-6/Week4_ML_MTU_part1.pptx` (a prefix of the full deck).
3. `Week5-6/Week5_ML_MTU.pdf` and `Week5-6/Week6_ML_MTU.pdf` are identical.
4. `old_Week2/` contains 2018-era material (shark attacks, bike sharing, Cork
   rainfall) no longer used. Archive it out of the working folder.
5. Several `~$*.pptx` PowerPoint lock files are committed alongside the real
   decks and can be removed.

---

## 7. Week 1 in detail

Week 1 was re-examined slide by slide before it was redesigned, because it is
the week that sets a student's expectation of the whole module, and because the
redesign changes it more than any other week. This section records what was in
the original and what happened to each part of it.

### What was inspected

| File | What it is | Size |
|---|---|---|
| `Week1_MLinBiology_Introduction_final.pptx` | The lecture deck, **52 slides** | 62 MB |
| `Week1_MLinBiology_Introduction_final.pdf` | The same deck exported | — |
| `AlphaFold_ The making of a scientific breakthrough.mp4` | Standalone video file | 39,500,441 bytes |
| `When Biology Meets Computer Science.mp4` | Standalone video file | 16,589,585 bytes |
| `ppt/media/media1.mp4` … `media3.mp4` | Three videos embedded inside the deck | see below |

The deck was unzipped and read as XML, so the analysis covers speaker notes,
hyperlinks and embedded media, not just the visible slides. The three embedded
videos were matched to the two standalone files by exact byte count; the
provenance work is written up in full in `docs/VIDEO_SOURCES.md`.

### The shape of the original 52 slides

| Slides | Content |
|---|---|
| 1–3 | Title, lecture roadmap, lecturer introduction (11 photographs across the sequence) |
| 4 | "AI: Beyond the Hype", a Bohnhoff graph plus a 34-second unattributed video |
| 5–9 | Module descriptor link, resources, Jupyter and Python setup |
| 10–16 | What machine learning is; the AI / ML / DL framing; the categorisation wheel |
| 17–24 | **The credit-scoring example**: an online loans company, loan-to-salary ratio, age, occupation |
| 25–31 | The Build/Deploy two-step, `D = [(d1,t1)…]`, `M = Learn(D)`, `t = M(q)` |
| 32 | Generalisation |
| 33–37 | "A Bigger Dataset" — deliberately unmanageable by hand |
| 38 | Quanta Magazine video |
| 39–44 | Terminology and categories of ML algorithms |
| 45 | DeepMind AlphaFold video |
| 46–49 | Carbon footprint of deep learning, with a Dan Jurafsky quotation |
| 50–52 | Wrap-up |

### The finding that mattered most

Slides 17 to 31 — roughly a third of the lecture, and every subsequent
worked illustration — run on a **credit-scoring** example. The material itself
is good: the loan-to-salary framing makes the target variable concrete and the
Build/Deploy formalism follows from it cleanly. The problem is placement. In a
module called *Machine Learning in Biology*, the first substantive thing a
student meets is a bank.

The decision was **not** to delete it. It was to keep the sequence, compress it
from eight slides to two, and then transfer the identical formalism onto a
biological problem on the very next slide, side by side, so students see that
`D`, `M` and `q` mean the same thing whether the row is a loan applicant or a
tumour biopsy. That transfer is a teaching move the original did not make, and
it costs nothing that the original had.

A second finding: the speaker note on slide 34 reads, exactly,

> don't actually ask them to do this one - the point here is that this is hard!

That is the pedagogical payload of the whole "Bigger Dataset" sequence, and it
is the kind of thing that is lost when a deck is rebuilt by someone else. It is
preserved **verbatim** in the notes of the corresponding slide in the new deck.

### Decisions, item by item

| Original | Decision | Reason |
|---|---|---|
| Lecture roadmap (s2) | **Kept**, updated to six parts | It works; students orient themselves by it |
| Lecturer introduction (s3) | **Kept**, compressed to one slide | Eleven photograph slides is a long time before any content |
| 34-second hype clip (s4) | **Dropped** | No title, no author, no licence; only attribution is a blogspot aggregator |
| Bohnhoff graph (s4) | **Kept** | It is the actual content of that slide and stands on its own |
| Module descriptor link (s5–6) | **Kept** | Now in `js/config.js` so it is set in one place |
| Setup material (s7–9) | **Kept**, moved to the website | Setup instructions are looked up, not lectured |
| What ML is; the wheel (s12–16) | **Kept** | Clear, and still correct |
| Credit example (s17–24) | **Kept but compressed and transferred** | See above |
| Build/Deploy formalism (s25–31) | **Kept** | The clearest part of the original deck |
| Generalisation (s32) | **Kept** | Load-bearing for Weeks 2 and 3 |
| "A Bigger Dataset" (s33–36) | **Kept**, with the speaker note verbatim | The point is the difficulty, not the answer |
| Quanta video (s38) | **Kept**, moved earlier | It motivates the module; it did less work mid–credit-example |
| Terminology, algorithm categories (s40–44) | **Kept** | Vocabulary the rest of the module assumes |
| AlphaFold video (s45) | **Kept**, kept late | It lands better once CASP has been explained |
| Carbon footprint (s47–49) | **Kept**, moved after foundation models | It is the answer to "why not just use the biggest model?", so it needs that question asked first |

### What was added

- **Module orientation**: how a week works, what is assessed, and what to do
  first. The original opened with content; students had to infer the structure.
- **The biological data landscape**: what sequence, expression, imaging, EHR and
  dietary data actually look like as a matrix, and why that shape matters.
- **Why biological ML is hard**: `n ≪ p`, batch effects, label noise, class
  imbalance and distribution shift, stated once at the start so they can be
  referred back to for twelve weeks.
- **Foundation models, conceptually**: the three workflows — classical, frozen
  pretrained representation, and fine-tuning — introduced as a picture, with no
  mathematics. Weeks 7 and 11 do the mechanics.

### No lab in Week 1

The original Week 1 had no practical component either; the setup slides (7–9)
were instructions to be followed in the student's own time, not an assessed
exercise. The redesign keeps this and makes it explicit rather than implicit:

- `js/config.js` declares `features.weeksWithoutLab: [1]`.
- The Week 1 page renders a dedicated **"No lab this week"** section stating in
  full sentences that there is no practical laboratory, no programming
  assignment and no assessed practical work in Week 1, and that the first
  formal laboratory is in Week 2.
- The labs index carries the same notice, so a student browsing labs cannot
  conclude that Lab 1 is missing.
- The Week 1 header carries a "Lecture only, no lab" pill.

The setup instructions still exist — on the resources page, where they can be
returned to — but nothing in Week 1 is assessed and nothing is due.

### The rebuilt deck

`slides/week01/COMP9085_Week01.pptx` (and `.pdf`) is **49 slides**, built by
`slides/week01.py` on the university's own master. The template file,
`slides/template/MTU_COMP9085.pptx`, *is* the original 52-slide deck with its
slides removed: the slide master, all eighteen layouts, the theme, the MTU
background artwork and the embedded fonts are inherited from it rather than
reconstructed, so the 2026/27 decks are the same MTU slides with new content in
them.

`docs/WEEK1_SLIDE_MAPPING.md` carries the slide-by-slide and image-by-image
mapping: what each of the original 52 slides became, and what happened to every
bitmap in them. It is the longest deck in the module, which is appropriate for
the week that has no lab.
