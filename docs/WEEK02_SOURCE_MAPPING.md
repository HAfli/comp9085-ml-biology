# Week 2: the original 90 slides, and where each one went

Three sources fed the 2026/27 Week 2:

1. `Week2/Week2_MLinBio_Decision_Tree.pptx` — the original lecture, **90 slides**
2. The 2026/27 course plan — Week 2 is the decision-tree week, not a
   foundation-model week
3. The current COMP9085 website and the Week 1 deck, which supply the MTU
   template and the visual conventions

The new deck is **50 slides**. It is built on the same MTU master as Week 1
(`slides/template/MTU_COMP9085.pptx`, extracted from the original Week 1 file),
so the branding is inherited rather than redrawn.

Decisions: **Keep**, **Modify**, **Condense**, **Replace**, **Remove**.

---

## Act by act

| Original | Topic | Decision | New slides | Reason |
|---|---|---|---|---|
| 1 | Title | Modify | 1 | Same MTU title layout, new subtitle |
| 2 | Section outline | Modify | 2 | Now names the six acts of the lecture |
| — | — | Added | 3 | Where Week 2 sits in the twelve weeks |
| — | — | Added | 4-5 | The biological problem: what a WDBC case actually is |
| **3** | **Guess Who, the four characters and their features** | **Keep** | **6** | The original table, verbatim. The best opening this module has |
| **4** | **Which question would you ask first?** | **Keep** | **7** | The question, and the vote, unchanged |
| 5-8 | The two question trees, and "can we rank how effective this question is?" | Condense | 8 | Four slides of branching diagrams become one figure computed from the four characters, showing both questions side by side with the entropy of each answer |
| **9-10** | **So which question should we start with? / The Big Idea** | **Keep** | **9-10** | The two sentences that carry the whole lecture. Kept close to verbatim |
| 11-12 | The heart-disease tree; what a decision tree is | Keep | 11-12 | The original Age / Chest Pain / Cholesterol tree, redrawn on the MTU layout |
| 13-16 | Root node, interior nodes, leaf nodes | Condense | 13 | Four animation states become one annotated diagram |
| 17 | (blank animation state) | Remove | — | An empty slide |
| **18** | **One query travelling through the tree** (Age 62, Cholesterol 311, Chest Pain 4, BP 130) | **Keep** | **14** | The original query, unchanged. Act 4 then repeats the same move on a real WDBC case |
| 19-22 | But we can build many trees; which would you choose? | Condense | 15-16 | Four slides become two: the two trees, then the vote |
| **23-24** | **Prefer simpler trees; inductive bias, restriction vs preference bias** | **Keep** | **17** | Kept in full, including both bias types and "inductive bias is necessary for generalisation" |
| **25** | **How do we create simple trees? Informative features, purity, entropy** | **Keep** | **18** | The hinge of Act 1 into Act 2 |
| **26** | **Shannon's entropy, impurity, guessing a random selection** | **Keep** | **20** | Verbatim definition |
| 27, 29-31 | Playing-card entropy examples | Replace | 21-22 | Same teaching move, biological deck: pure and mixed nodes of real WDBC cases. The card images had no licence and the biological version costs nothing |
| **28** | **Formula for entropy**, high probability → low entropy | **Keep** | 19 | The formula and the intuition, unchanged |
| **32-37** | **Heart-disease risk table; what is the overall entropy of the target?** | **Keep** | **23-24** | The original 13-row table is reproduced and the overall entropy is **recomputed** from it (see the note below) |
| 38-53 | Splitting by each feature in turn, per-partition entropy, weighted average, repeated four times | **Condense** | **25-26** | Sixteen near-identical slides become two: one worked split in full, then all four features in a single comparison table. This is the largest single reduction in the deck and the reason it fits in 50 slides |
| 54 | Intuitively the ordering makes sense | Keep | 27 | Kept as the takeaway of the sequence |
| 55-57 | Information gain, and the summary table | **Keep** | 28 | The definition, with the recomputed table |
| **58-59** | **Workshop: six patients, three binary features, Cancer Risk** | **Keep** | **29-30** | The in-class exercise is kept, with the reveal on the following slide |
| **60-61** | **ID3: iterative dichotomiser, shallowest consistent tree, the five steps** | **Keep** | **31-32** | Both slides essentially verbatim |
| 62-74 | ID3 applied to the heart-disease set, partition by partition, ending in "Ta-Dah" | Condense | 33 | Thirteen slides become one: the recursion stated, with the resulting tree |
| **75** | **Using the tree on a query with an unseen combination** | Keep | 34 | Kept; it makes the "no example like this in the data" point |
| **76** | **Stopping rules, all three** | **Keep** | 35 | Verbatim |
| **77-81** | **Handling continuous features; the mean is not always best; evaluate every candidate threshold** | **Keep and expand** | **36-38** | Kept, and answered with a real computation: 374 candidate thresholds on `worst perimeter`, the chosen one, and what the mean would have given |
| — | — | **Added** | **39** | **ID3 versus CART / scikit-learn.** The original deck says "ID3" throughout; `DecisionTreeClassifier` is CART-style. The distinction is now explicit |
| — | — | Added | 40-45 | Act 4 and Act 5 on real WDBC data: the fitted tree, a traced held-out case, the depth sweep, the confusion matrix |
| **82** | **Overfitting: splitting on an irrelevant feature; deeper trees, smaller subsets** | **Keep** | 44 | Verbatim, now with the measured curve beside it |
| **83-85** | **Pre-pruning, post-pruning, advantages of pruning** | **Keep and expand** | **46-47** | All three kept, with cost-complexity pruning measured on the same split |
| — | — | Added | 48 | Validation versus final test: why the depth chosen from the test set is not an honest estimate |
| **88** | **Advantages and disadvantages of decision trees** | **Keep** | 49 | Both lists kept in full |
| — | — | Added | 41-43, 50-53 | Deployment: the interface, the decision path, comparing two cases, and "should we trust this result?" |
| 86, 89 | Discussion (stock image) | Modify | 54 | Becomes the exit ticket and the lab transition |
| 87 | Summary | Keep | 55 | Kept as the closing summary |
| 90 | Thank you | Modify | 56 | The MTU closing layout |

---

## What the numbers are

Everything quantitative in the new deck is computed by
`data/scripts/06_build_week02.py` and written to
`data/scripts/week02_numbers.json`. Nothing is quoted from memory and nothing is
illustrative.

**On the heart-disease example.** The original deck's worked example runs on 25
instances; the table printed on slide 32 shows 13 of them, and the remaining
rows appear only inside the ID3 walk-through. The new deck therefore reproduces
the **13 instances that are actually printed** and recomputes the entropies from
them, so that a student can verify every figure on the slide. The recomputed
numbers differ from the original slide 57 table for that reason, and the slide
says so. The conclusion is unchanged: **Age is still the winning root feature.**

| | Original deck (25 instances) | New deck (the 13 printed instances) |
|---|---|---|
| Overall entropy | 0.990 | 0.779 |
| Age | remainder 0.637, gain 0.353 | threshold 52.5, remainder 0.250, gain 0.530 |
| Chest Pain | remainder 0.794, gain 0.195 | threshold 2.5, remainder 0.656, gain 0.123 |
| Cholesterol | remainder 0.846, gain 0.144 | threshold 260.5, remainder 0.573, gain 0.207 |
| Blood Pressure | remainder 0.989, gain 0.001 | threshold 141.0, remainder 0.678, gain 0.101 |
| Winning root feature | **Age** | **Age** |

**On WDBC.** 569 cases, 30 features, 212 malignant and 357 benign, from
`sklearn.datasets.load_breast_cancer`. Stratified 70/30 split,
`random_state=42`, `criterion='entropy'`. The depth-3 tree used throughout the
lecture, the website and the lab is one exported object: 398 training cases,
6 leaves, 96.2 per cent training accuracy and 91.8 per cent on the 171 held-out
cases, root split `worst perimeter ≤ 112.8` with an information gain of 0.585
bits.

---

## What was deliberately left out

| | Why |
|---|---|
| Foundation models as a topic | Week 2 is not a foundation-model week. They appear on **one** slide, as the contrast that makes the course argument: WDBC already has meaningful engineered numerical features, so a pretrained encoder has nothing to add here. Weeks 7 and 11 do the mechanics |
| Cross-validation, pipelines, leakage in depth | Week 3 |
| Gini as a full treatment | Named on the ID3-versus-CART slide, because `DecisionTreeClassifier` defaults to it, but not derived. Entropy carries the teaching |
| Random forests | Week 10. The original deck does not cover them either |
| The playing-card images, the stock discussion photographs | No licence, no teaching content that the biological version does not carry |

---

## The lab

| Original | New |
|---|---|
| `ML Lab 2.ipynb`: read an age and set `adult`; convert an exam mark to a grade; implement three loan-churn decision trees with `if/else` | `COMP9085_Week02_Lab_Decision_Trees.ipynb`: ten tasks on real WDBC data, ending in a model card |

The original lab taught Python control flow, not machine learning: no dataset,
no fitting, no evaluation, and a loan-churn example the course has moved away
from. The `if/else` tracing idea survives, in Task 5, where students trace a
real held-out case through the real fitted tree by hand and check their answer
against the model.

`wine.data` in the original `Lab2/` folder is no longer used; the lab now works
on the diagnostic dataset the whole module is built around.
