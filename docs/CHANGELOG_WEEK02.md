# Week 2 changelog

What changed, what stayed, and what it was measured against.
Slide-by-slide provenance is in `docs/WEEK02_SOURCE_MAPPING.md`.

---

## Lecture

| | Before | After |
|---|---|---|
| Deck | `Week2_MLinBio_Decision_Tree.pptx`, 90 slides | `slides/week02/COMP9085_Week02.pptx` + `.pdf`, 58 slides |
| Template | MTU master | The same MTU master, inherited from the file itself |
| Structure | Linear | Six acts: why trees, how a tree chooses, from idea to algorithm, real data, can we trust it, deployment |
| Worked example | Heart-disease risk, 26 slides, numbers not reproducible from the printed table | The same example, 6 slides, every entropy recomputed from the 13 printed instances |
| Real data | None in the lecture | WDBC throughout Acts 4 to 6: the fitted tree, a traced case, the depth sweep, the confusion matrix, pruning |
| Figures | Screenshots and diagrams | Nine figures generated from the fitted model by `data/scripts/06_build_week02.py` |
| ID3 versus CART | Not distinguished | An explicit two-column slide, repeated in the notes, the lab and the site |
| Continuous thresholds | "We set it to the mean; this is not always best" | 374 candidates evaluated and plotted; the chosen threshold is 0.069 bits better than the mean |
| Speaker notes | Present on about a dozen slides | On 52 of 58, with the question to ask and the expected answer |

**Retained from the original, essentially verbatim:** the Guess Who sequence and
its opening-question vote; "so which question should we start with?"; the Big
Idea; the heart-disease tree and the query travelling through it; the
many-trees vote; inductive bias including both bias types; "how do we create
simple trees?"; Shannon's entropy and the formula; the workshop table and its
question; the ID3 description and its five steps; all three stopping rules;
"using the tree" on an unseen combination; the continuous-features argument;
overfitting; pre- and post-pruning and the advantages of pruning; the
advantages and disadvantages lists.

**Removed:** the playing-card entropy images (no licence, and the biological
version costs nothing); the stock discussion photographs; sixteen slides of
repeated entropy arithmetic; thirteen slides of ID3 bookkeeping.

---

## Website

**New: a reusable model-visualisation layer**, `js/visualisations/_model.js`.
It draws fitted models, never plausible-looking pictures. Week 2 uses the tree
helpers; the same contract is documented there for random forests, k-NN, naive
Bayes, k-means, DBSCAN, hierarchical clustering and PCA.

| | Before | After |
|---|---|---|
| Week 2 figures | Tree builder, entropy visualiser | Tree builder, entropy visualiser, **deployment demonstration** |
| Tree builder | Fitted a real tree, drew it | Also: click or keyboard-select any node to inspect it; trace a real held-out case and see its path highlighted |
| Node inspection | None | Node type, depth, test, samples, class distribution, impurity, prediction, information gain, left/right counts |
| Case tracing | None | Walks the held-out set, including cases the model gets wrong, and says so |
| Deployment | None | An application-shaped interface: enter measurements or load a real case, get a prediction, the decision path, the leaf statistics, the model information and a trust panel |
| Input validation | n/a | Empty, non-numeric, negative and out-of-range values are all handled distinctly. Out-of-range uses the **actual dataset range**; no clinical reference range is invented |
| Comparing cases | n/a | Keep a result, change a measurement, analyse again, and the interface reports which measurements moved and whether the prediction changed |
| Language | n/a | "Decision path", never "reasoning" or "why the AI thinks this", on the site, in the deck and in the lab |

**Fixed while working on this:** `Chart.mountAll()` mounted every figure twice,
which was invisible until a renderer inserted markup of its own. It is now
idempotent.

---

## Laboratory

| | Before | After |
|---|---|---|
| File | `Lab2/ML Lab 2.ipynb`, 24 cells | `labs/week02/COMP9085_Week02_Lab_Decision_Trees.ipynb` |
| Content | Set `adult` from an age; convert a mark to a grade; implement three loan-churn trees with `if/else` | Ten tasks auditing a real model on WDBC |
| Dataset | None; `wine.data` unused in the tasks | WDBC, 569 cases |
| Machine learning | None | Fitting, depth sweep, tree inspection, decision paths, 60/20/20 validation, cost-complexity pruning, confusion matrices, a model card |
| Visualisations | None | Class distribution, depth-versus-performance, two full tree plots, a decision path, a confusion matrix, a pruning sweep, unpruned versus pruned |
| Solutions | `ML Lab 2 - Solutions.ipynb`, answers only | Executed end to end with outputs, plus interpretation, expected findings and common mistakes |
| Published | Both notebooks and both HTML files sat together | The student notebook and its HTML are on the site; **the solutions are not** |

The one thing kept from the original lab is its best idea: tracing a decision
tree by hand. It is Task 5, where students predict a real held-out case by
reading the tree, then check themselves with `decision_path`.

---

## Scientific integrity

Every number in the deck, the notes and the site is computed, not quoted:

- `data/scripts/06_build_week02.py` → `data/scripts/week02_numbers.json`,
  `js/data/tree.js` and nine figures.
- `data/scripts/07_build_week02_lab.py` builds both notebooks, **executes** the
  solutions, and generates the HTML from the student copy.

Recorded with every reported figure: dataset, split, random seed, criterion and
hyperparameters. WDBC is labelled **REAL** benchmark data; the deployment
interface is labelled an **educational demonstration**, not a clinical
diagnostic system, on the slide, on the page and in the lab.

Two honest discrepancies, both stated rather than smoothed over:

1. The original deck's worked example used 25 instances but printed 13. The new
   deck reproduces the 13 printed rows and recomputes from them, so the slide
   can be checked. Age still wins the root, as in the original.
2. The slides use scikit-learn; the website refits in the browser with
   `js/ml.js` and its own splitter. Same data, same criterion, same winning root
   feature, slightly different threshold (112.8 against 115.4). The lecture
   notes turn this into a teaching point about sampling variability.

---

## Files

**Created**

```
slides/week02.py                                  the deck source
slides/figures/w2_*.png                           9 generated figures
data/scripts/06_build_week02.py                   model, numbers, figures
data/scripts/07_build_week02_lab.py               notebooks and HTML
data/scripts/week02_numbers.json                  every reported number
js/data/tree.js                                   the exported fitted trees
js/visualisations/_model.js                       reusable model layer
js/visualisations/deployment.js                   the deployment interface
labs/week02/COMP9085_Week02_Lab_Decision_Trees.ipynb
labs/week02/COMP9085_Week02_Lab_Decision_Trees_Solutions.ipynb
labs/week02/COMP9085_Week02_Lab_Decision_Trees.html
docs/WEEK02_SOURCE_MAPPING.md
docs/CHANGELOG_WEEK02.md
docs/MODEL_VISUALISATION.md
docs/notes/COMP9085_Week02_Lecture_Notes.md
```

**Modified**

```
slides/build_slides.py        week 2 now delegates to week02.py
slides/template.py            picture sizing
js/data/course.js             week 2 gains viz3; one ASCII formula corrected
js/data/labs.js               lab02 rewritten, with notebook links
js/week-page.js               deployment spec, viz3 support, lab file links
js/visualisations/decision-tree.js   node inspection, case tracing
js/visualisations/_chart.js   mountAll is idempotent
css/main.css                  section 11: inspection and deployment
build_pages.py, build_top_pages.py   the two new scripts
```

**Unchanged:** Week 1 and Weeks 3 to 12, in the deck, on the site and in the
data. Week 1 still has no laboratory.
