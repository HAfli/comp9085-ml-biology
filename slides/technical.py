"""
COMP9085 — the technical core of Weeks 2 to 12.

The narrative of each deck (objectives, concepts, worked example, foundation-
model connection, references) is pulled from js/data/course.js, so the slides
and the website cannot drift apart. What cannot be pulled from there is the
mathematics: the equations, the derivations and the algorithm statements that
make this a Level 9 module rather than a tour. Those live here, one entry per
week, and they are the reason a generated deck is not shallow.

Each week supplies:
    equations   [(title, formula, explanation, [(symbol, meaning), ...]), ...]
    algorithm   (title, [steps], note)              optional
    tables      [(title, headers, rows, sub, widths), ...]  optional
    pipelines   [(title, [(label, colour, [steps])], sub), ...]  optional
    pitfalls    [(title, [items], sub)]             optional
"""
from template import CLINICAL, SIGNAL, NUCLEUS, SPECIMEN, RGBColor

TEAL = RGBColor(0x2B, 0x6F, 0x8C)

TECHNICAL = {

    # ------------------------------------------------------------------ 2
    2: {
        "equations": [
            ("Shannon entropy",
             "H(S) = − Σ  p(c) · log₂ p(c)",
             "The impurity of a set S of labels. Zero when every example shares "
             "a label; maximal when the classes are balanced.",
             [("p(c)", "the proportion of set S belonging to class c"),
              ("log₂", "base 2, so entropy is measured in bits"),
              ("H(S)", "0 for a pure set; 1 bit for a balanced two-class set")]),
            ("Information gain",
             "IG(S, f) = H(S) − Σ  (|Sᵥ| / |S|) · H(Sᵥ)",
             "The reduction in entropy achieved by splitting S on feature f. "
             "The second term is the size-weighted average impurity of the "
             "resulting partitions.",
             [("Sᵥ", "the partition of S for which feature f takes value v"),
              ("|Sᵥ|/|S|", "the weight: a pure partition of three samples is "
                           "worth far less than a moderately pure one of thirty"),
              ("IG", "measured in bits. The tree takes the largest.")]),
            ("Gini impurity, the alternative criterion",
             "Gini(S) = 1 − Σ  p(c)²",
             "Cheaper to compute than entropy because it avoids the logarithm, "
             "and in practice the two rarely choose different trees. The "
             "website lets you switch between them and compare.",
             [("Gini", "0 for a pure set, 0.5 for a balanced two-class set"),
              ("in practice", "entropy and Gini disagree on roughly 2% of splits")]),
        ],
        "algorithm": (
            "ID3, stated",
            ["If every instance in S has the same label, return a leaf with "
             "that label.",
             "If there are no features left to test, return a leaf with the "
             "majority label of S.",
             "Otherwise, compute the information gain of every remaining "
             "feature, and select the feature f with the highest gain.",
             "Create a decision node testing f.",
             "For each value v of f, partition S into Sᵥ and recurse on that "
             "partition with f removed.",
             "Attach each resulting subtree to the corresponding branch."],
            "The algorithm is greedy: it takes the best split available now, "
            "which is not always part of the best whole tree. Nothing "
            "backtracks. That is a real limitation and it is why ensembles "
            "(Week 10) help."),
        "tables": [
            ("Overfitting, measured on the real data",
             ["Max depth", "Training accuracy", "Held-out accuracy", "Leaves"],
             [["1", "93.0%", "89.5%", "2"], ["2", "95.0%", "90.6%", "4"],
              ["3", "96.2%", "91.8%", "8"], ["4", "97.5%", "93.0%", "14"],
              ["5", "99.0%", "94.2%", "22"], ["6", "99.8%", "93.6%", "31"],
              ["8", "100.0%", "94.2%", "43"]],
             "UCI WDBC, 70/30 stratified split, entropy criterion. The gap "
             "between the two columns is the diagnostic, not either column "
             "alone.", [1, 1.4, 1.4, 1]),
        ],
        "pitfalls": [
            ("Handling continuous features and stopping",
             ["A continuous feature has no natural set of values to branch on, "
              "so candidate thresholds are placed between adjacent sorted "
              "values and each is scored as a binary split",
              "Sorting once per feature makes this O(n log n) rather than O(n²)",
              "Pre-pruning stops growth early: max_depth, min_samples_leaf, "
              "min_samples_split",
              "Post-pruning grows the full tree and removes subtrees that do "
              "not pay for themselves on held-out data (cost-complexity, ccp_alpha)",
              "Choosing ccp_alpha by maximising test accuracy is itself a "
              "protocol error. Week 3 explains why."],
             "The mechanics that turn the textbook algorithm into something "
             "that works on real data."),
        ],
    },

    # ------------------------------------------------------------------ 3
    3: {
        "equations": [
            ("k-fold cross-validation",
             "CV(k) = (1/k) · Σ  L( M₋ᵢ , Sᵢ )",
             "Partition the data into k folds. Fit on k−1 of them, evaluate on "
             "the one held out, and average. Stratified folds preserve the "
             "class balance in every fold.",
             [("M₋ᵢ", "the model fitted with fold i held out"),
              ("Sᵢ", "fold i, used only for evaluation"),
              ("L", "the chosen loss or score"),
              ("k", "5 or 10 in practice; larger k means less bias, more "
                    "variance and more compute")]),
        ],
        "tables": [
            ("What leakage actually costs, measured",
             ["Protocol", "Reported", "Honest", "Inflation"],
             [["Feature selection on 5,000 noise features, random labels",
               "88.0%", "55.0%", "33 points"],
              ["Feature selection on the real WDBC data",
               "94.2%", "94.2%", "0 points"],
              ["25% of rows duplicated before splitting, 1-NN",
               "97.2%", "95.1%", "2.1 points"],
              ["Scaler fitted on all rows before splitting",
               "97.4%", "97.4%", "0 points"]],
             "Every figure produced by data/scripts/02_build_benchmarks.py. "
             "Note rows two and four: the inflation is sometimes zero.",
             [3, 1, 1, 1]),
        ],
        "pitfalls": [
            ("The taxonomy of leakage",
             ["Preprocessing leakage: a scaler, imputer or selector fitted "
              "before the split",
              "Feature-selection leakage: columns chosen using all the labels",
              "Group leakage: several rows from one patient, site or batch "
              "split across folds",
              "Temporal leakage: training on data collected after the "
              "prediction time",
              "Target leakage: a feature that is a consequence of the outcome, "
              "such as a medication prescribed because of the diagnosis",
              "Duplicate leakage: the same or near-identical row on both sides",
              "Selection on the test set: tuning a hyperparameter against the "
              "data you then report"],
             "Kapoor and Narayanan (2023) found 329 papers across 17 fields "
             "affected by leakage."),
            ("The rules that prevent it",
             ["Split first. Everything that learns anything from data goes "
              "inside a Pipeline",
              "Use GroupKFold on the patient identifier when rows are not "
              "independent",
              "Establish a baseline before believing any model: the "
              "majority class scores 62.7% on WDBC",
              "Fix seeds, record library versions, and write the protocol down "
              "before you see the result",
              "Touch the test set exactly once"],
             "You cannot detect leakage from the score. Only from the protocol."),
        ],
    },

    # ------------------------------------------------------------------ 4
    4: {
        "equations": [
            ("Bayes' rule",
             "P(A | B)  =  P(B | A) · P(A)  /  P(B)",
             "Converts between the two conditional probabilities that are "
             "routinely confused in diagnosis.",
             [("P(A)", "the prior: prevalence, before the test"),
              ("P(B|A)", "the likelihood: sensitivity, if A is disease and B a "
                         "positive test"),
              ("P(A|B)", "the posterior: the positive predictive value"),
              ("P(B)", "the evidence, which normalises the result")]),
            ("Positive predictive value, written out",
             "PPV = (Se · p) / [ Se · p + (1 − Sp) · (1 − p) ]",
             "Sensitivity and specificity belong to the test. Prevalence "
             "belongs to the population you chose to test. PPV depends on both, "
             "which is why the same test behaves differently in screening and "
             "in clinic.",
             [("Se", "sensitivity, P(test positive | disease)"),
              ("Sp", "specificity, P(test negative | no disease)"),
              ("p", "prevalence in the tested population"),
              ("NPV", "= Sp(1−p) / [Sp(1−p) + (1−Se)p]")]),
        ],
        "tables": [
            ("A 99% sensitive, 99% specific test, at three prevalences",
             ["Prevalence", "Tested positive", "True positives", "PPV"],
             [["0.1%  (screening)", "1,098 of 100,000", "99", "9.0%"],
              ["1%", "1,980 of 100,000", "990", "50.0%"],
              ["10%  (symptomatic clinic)", "10,800 of 100,000", "9,900", "91.7%"],
              ["37.3%  (the WDBC cohort's prevalence)", "37,554 of 100,000", "36,927", "98.3%"]],
             "Hypothetical classroom example. The test never changed. The population did.",
             [1.4, 1.3, 1, 1]),
            ("Reading a confusion matrix",
             ["Metric", "From the matrix", "What it answers"],
             [["Sensitivity / recall", "TP / (TP + FN)",
               "Of those who are ill, how many are found?"],
              ["Specificity", "TN / (TN + FP)",
               "Of those who are well, how many are cleared?"],
              ["Precision / PPV", "TP / (TP + FP)",
               "Of those flagged, how many really are ill?"],
              ["NPV", "TN / (TN + FN)",
               "Of those cleared, how many really are well?"],
              ["F1", "2·P·R / (P + R)",
               "One number when precision and recall matter equally"],
              ["Accuracy", "(TP + TN) / n",
               "Almost useless when the classes are imbalanced"]],
             "Every one of these is derivable from four counts.",
             [1.2, 1, 2]),
        ],
    },

    # ------------------------------------------------------------------ 5
    5: {
        "equations": [
            ("The naive Bayes classifier",
             "ĉ = argmax  P(c) · Π  P(xᵢ | c)",
             "Choose the class maximising the prior times the product of "
             "per-feature likelihoods. The denominator P(x) is the same for "
             "every class and can be dropped for ranking.",
             [("P(c)", "the class prior, estimated by counting"),
              ("P(xᵢ|c)", "the likelihood of feature i given class c"),
              ("Π", "the product over all features, and the naive step: the "
                    "features are assumed conditionally independent given c"),
              ("argmax", "we need only the ranking, not calibrated probabilities")]),
            ("Laplace smoothing",
             "P(w | c)  =  ( count(w, c) + α )  /  ( Nᴄ + α · |V| )",
             "Without it, one unseen word sets the whole product to zero and "
             "vetoes the classification regardless of all other evidence.",
             [("α", "the smoothing strength; α = 1 is Laplace, α < 1 is Lidstone"),
              ("Nᴄ", "total token count in class c"),
              ("|V|", "vocabulary size"),
              ("α = 0", "reproduces the zero-frequency problem exactly")]),
            ("Working in log space",
             "log P(c | x)  ∝  log P(c) + Σ  log P(xᵢ | c)",
             "Multiplying hundreds of probabilities below 0.1 underflows a "
             "double long before the end of a document. Summing logs is exactly "
             "equivalent and numerically stable.",
             [("∝", "proportional to: the normalising constant is recovered "
                    "with the log-sum-exp trick when a probability is needed"),
              ("Σ", "the sum replaces the product"),
              ("why", "a 300-word document multiplies 300 small numbers")]),
        ],
        "pitfalls": [
            ("Multinomial and Bernoulli event models",
             ["Multinomial counts how many times each term occurs, and "
              "generally wins on longer documents",
              "Bernoulli records only presence or absence, and handles "
              "explicit non-occurrence of terms",
              "The naive independence assumption is plainly false for text, "
              "since words co-occur",
              "It classifies well anyway, because the argmax can be right even "
              "when the individual probability estimates are badly wrong",
              "The posteriors are therefore not calibrated, and are typically "
              "pushed towards 0 and 1. Treat them as a ranking",
              "Interpretability is real but shallow: the model has learned "
              "which words co-occur with which decision, not what hazard is"],
             "Why a model with a false assumption is still worth teaching."),
        ],
    },

    # ------------------------------------------------------------------ 6
    6: {
        "equations": [
            ("Standardisation and the alternatives",
             "z = (x − μ) / σ\nx' = (x − min) / (max − min)",
             "Standardisation centres and scales by the standard deviation; "
             "min-max maps to a fixed range. Robust scaling uses the median and "
             "the interquartile range and survives outliers.",
             [("μ, σ", "fitted on the TRAINING fold only, then applied to the "
                       "validation fold"),
              ("needed by", "k-NN, SVM, PCA, and any gradient-based method"),
              ("not needed by", "decision trees and forests: the split is "
                                "threshold-based and univariate")]),
        ],
        "tables": [
            ("Missingness mechanisms, and what each permits",
             ["Mechanism", "Definition", "Can imputation fix it?"],
             [["MCAR", "Missingness unrelated to anything",
               "Yes. Complete-case analysis is unbiased but wasteful"],
              ["MAR", "Explainable by observed variables",
               "Yes, if the model uses those variables"],
              ["MNAR", "Depends on the unobserved value itself",
               "No. The information was never recorded"]],
             "In health data MNAR is the common case: the sickest participants "
             "are the ones who miss the examination.",
             [0.7, 1.6, 2]),
        ],
        "pitfalls": [
            ("Writing the pipeline so the order cannot go wrong",
             ["sklearn.pipeline.Pipeline: every step is fitted on the "
              "training fold only, and applied unchanged to the test fold",
              "ColumnTransformer: different treatment per column type, so the "
              "imputer and the encoder stay inside the same fitted object",
              "imblearn.pipeline.Pipeline: applies a resampler during fit and "
              "skips it during predict, which plain sklearn cannot do",
              "cross_val_score(pipe, X, y, cv=StratifiedKFold(...)): refits "
              "the whole pipeline on each fold, which is the point",
              "The test set is never an argument to fit(), fit_transform() or "
              "fit_resample(). If it is, something has leaked"],
             "If the preprocessing is inside a Pipeline object, the order is "
             "correct by construction rather than by discipline."),
            ("Imbalance, and survey weights",
             ["Random undersampling discards data; random oversampling "
              "duplicates it and encourages overfitting",
              "SMOTE interpolates new minority points, which can be "
              "biologically implausible",
              "All resampling belongs inside the fold, never before the split",
              "Report balanced accuracy and per-class recall, not accuracy",
              "NHANES oversamples some subgroups by design",
              "Unweighted analysis describes the sample, not the population: a "
              "data-preparation decision with scientific consequences"],
             "Measurement error in the exposure is usually the binding "
             "constraint in nutrition research, not model capacity."),
        ],
    },

    # ------------------------------------------------------------------ 7
    7: {
        "equations": [
            ("Principal component analysis",
             "C = (1/(n−1)) Xᵀ X\nC vₖ = λₖ vₖ",
             "Standardise, form the covariance matrix, and take its "
             "eigenvectors. The k-th principal component is the direction of "
             "the k-th largest variance, orthogonal to all the previous ones.",
             [("X", "the centred, standardised data matrix, n × p"),
              ("vₖ", "the k-th eigenvector: the loadings of component k"),
              ("λₖ", "the k-th eigenvalue: the variance along that direction"),
              ("explained", "λₖ / Σλ is the proportion of variance captured")]),
            ("Producing a per-sequence embedding",
             "e  =  (1/L) · Σ  hᵢ            for real residue positions i",
             "Mean-pool the final hidden layer over the residues, excluding the "
             "special tokens. One fixed-length vector per protein, whatever its "
             "length, and computed without using any of your labels.",
             [("hᵢ", "the final-layer hidden state at position i"),
              ("L", "the number of real residues, excluding BOS, EOS and padding"),
              ("e", "320 dimensions for ESM-2 8M, 1,280 for the 650M model"),
              ("note", "your labels are never used, so this is a fixed "
                       "transformation, not a fitted step")]),
        ],
        "tables": [
            ("PCA on the real WDBC data, measured",
             ["Components", "Cumulative variance", "CV accuracy"],
             [["1", "44.3%", "92.6%"], ["2", "63.2%", "94.3%"],
              ["5", "84.7%", "96.5%"], ["10", "95.2%", "97.7%"],
              ["20", "99.5%", "97.5%"], ["30 (all)", "100%", "97.4%"]],
             "The PCA is refitted inside each cross-validation fold, which is "
             "the only correct way to measure this.",
             [1, 1.4, 1.2]),
            ("The two tasks, and why they disagree",
             ["Task", "Engineered features", "Learned embedding"],
             [["Protein family (4 classes, chance 25%)", "100.0%", "97.5%"],
              ["Ordered H-D-S triad (binary, chance 50%)", "51.9%", "89.7%"]],
             "Identical classifiers throughout, so any difference is "
             "attributable to the representation. The family task is defined by "
             "composition; the triad task is defined by order, and both classes "
             "have identical composition by construction.",
             [2.2, 1, 1]),
        ],
        "pipelines": [
            ("From sequence to a two-dimensional picture",
             [("The pipeline", SIGNAL,
               ["Biological\nsequence", "Foundation model\n(no training)",
                "High-dimensional\nembedding", "PCA or UMAP",
                "2-D plot,\ncoloured by class"])],
             "You look at two dimensions. You should model in all of them."),
        ],
        "pitfalls": [
            ("Reading a projection honestly",
             ["PCA is linear, deterministic and invertible; its distances mean "
              "something and its loadings are interpretable",
              "t-SNE and UMAP preserve local neighbourhoods and destroy global "
              "geometry",
              "In a neighbour embedding, between-cluster distance, cluster size "
              "and empty space are all uninterpretable",
              "Language-model embedding spaces are strongly anisotropic, "
              "dominated by a few directions",
              "Centring or whitening before a distance-based method is usually "
              "worth it",
              "The plot is a diagnostic, not a result: if classes separate, "
              "that is a hypothesis to test with a classifier and a held-out set"],
             "The most common misuse in the literature is reading a gap between "
             "two UMAP clusters as a measure of biological difference."),
        ],
    },

    # ------------------------------------------------------------------ 8
    8: {
        "equations": [
            ("Distance metrics",
             "Euclidean  √Σ(aᵢ−bᵢ)²\nManhattan  Σ|aᵢ−bᵢ|\nHamming  Σ 1[aᵢ≠bᵢ]",
             "The metric defines what 'similar' means, and therefore defines "
             "the model. Real biological records mix continuous, ordinal and "
             "categorical fields, so the metric must be composed per field and "
             "the components weighted deliberately.",
             [("Euclidean", "continuous features on comparable scales"),
              ("Manhattan", "often more robust in high dimensions"),
              ("Hamming", "equal-length sequences or categorical data"),
              ("cosine", "1 − (a·b)/(‖a‖‖b‖); usual choice for embeddings")]),
            ("Distance-weighted voting",
             "vote(c) = Σ  1 / d(q, xᵢ)²      over neighbours i of class c",
             "Closer neighbours count for more, which softens the effect of "
             "choosing k slightly wrong and handles ties sensibly.",
             [("d(q,xᵢ)", "distance from the query to neighbour i"),
              ("k", "still needs choosing, but the result is less sensitive to it"),
              ("lazy", "no model is fitted at training time; the data is the "
                       "model, and all cost is deferred to prediction")]),
        ],
        "tables": [
            ("What k-NN is sensitive to, measured on WDBC",
             ["Representation", "Dimensions", "Accuracy at k = 5"],
             [["30 features, standardised", "30", "96.3%"],
              ["30 features, NOT standardised", "30", "93.5%"],
              ["Standardised + 60 pure-noise features", "90", "92.1%"]],
             "Nuclear area runs into the thousands and smoothness sits around "
             "0.1, so without scaling the distance is essentially the "
             "difference in area.",
             [2, 1, 1.3]),
        ],
        "pitfalls": [
            ("Why k-NN suffers from irrelevant features and a tree does not",
             ["k-NN collapses every feature into a single distance, so every "
              "irrelevant dimension adds noise to that distance",
              "A decision tree makes a per-feature decision and can simply "
              "never split on a useless column",
              "Small k gives a flexible, noise-sensitive boundary",
              "Large k smooths it, and as k approaches n the model predicts "
              "the majority class everywhere",
              "This is exactly why k-NN is the fairest probe of representation "
              "quality: hold the classifier fixed and change only what it "
              "measures distance in"],
             "The Week 7 comparison is run again here with the classifier held "
             "constant, which is a clean experimental design."),
        ],
    },

    # ------------------------------------------------------------------ 9
    9: {
        "equations": [
            ("k-means and its objective",
             "J = Σ  ‖ xᵢ − μ⟨c(i)⟩ ‖²",
             "Alternate assignment and centroid update to minimise the "
             "within-cluster sum of squares. Guaranteed to converge, but only "
             "to a local optimum, so initialisation matters and k-means++ "
             "exists to improve it.",
             [("μ⟨c⟩", "the centroid of cluster c"),
              ("c(i)", "the cluster assigned to point i"),
              ("J", "the distortion, also called inertia"),
              ("assumes", "roughly spherical, similarly sized clusters, and k "
                          "given in advance")]),
            ("Silhouette coefficient",
             "s(i) = ( b(i) − a(i) ) / max( a(i), b(i) )",
             "How much closer a point is to its own cluster than to the nearest "
             "other one, from −1 to 1. The mean over all points scores the "
             "whole partition.",
             [("a(i)", "mean distance from i to the other points in its cluster"),
              ("b(i)", "mean distance from i to the points of the nearest "
                       "other cluster"),
              ("s ≈ 1", "well clustered; s ≈ 0 on a boundary; s < 0 probably "
                        "in the wrong cluster")]),
        ],
        "tables": [
            ("Choosing k on the real WDBC data, measured",
             ["k", "Inertia", "Silhouette"],
             [["2", "11,595", "0.343"], ["3", "9,972", "0.314"],
              ["4", "9,072", "0.283"], ["5", "8,406", "0.158"],
              ["6", "7,880", "0.160"], ["8", "7,072", "0.147"]],
             "Two clusters is the best-supported choice, and it corresponds to "
             "the benign/malignant labels. Note that 0.343 is a moderate score, "
             "not a strong one: the two groups overlap.",
             [0.6, 1, 1]),
            ("Three algorithms, three sets of assumptions",
             ["", "k-means", "DBSCAN", "Agglomerative"],
             [["Number of clusters", "You choose k", "Found automatically",
               "Cut the dendrogram"],
              ["Cluster shape", "Roughly spherical", "Arbitrary", "Depends on linkage"],
              ["Can refuse a point?", "No", "Yes, as noise", "No"],
              ["Main parameter", "k", "eps, minPts", "linkage, cut height"],
              ["Degrades when", "Clusters are elongated",
               "Dimension is high", "n is large: O(n²) or worse"]],
             "Choosing an algorithm is choosing a set of assumptions about the "
             "shape of the answer.",
             [1.2, 1, 1, 1]),
        ],
        "pitfalls": [
            ("A computational cluster is not a biological discovery",
             ["k-means cannot decline. Ask for four clusters and you get four, "
              "whatever the data",
              "Validate by stability: bootstrap, recluster, and measure how "
              "often pairs stay together",
              "Validate externally: does the partition correspond to something "
              "measured independently, such as survival or treatment response?",
              "Validate across algorithms: does a different method with "
              "different assumptions agree?",
              "Check batch structure FIRST. Samples processed on different days "
              "or instruments cluster by batch",
              "A batch effect produces beautiful, highly significant, entirely "
              "technical clusters, and no clustering metric detects it"],
             "When cluster membership aligns with a technical variable, the "
             "technical explanation is the default and the biological one "
             "carries the burden of proof."),
        ],
    },

    # ----------------------------------------------------------------- 10
    10: {
        "equations": [
            ("Bagging: why averaging helps",
             "Var( (1/B) Σ T(b) )  =  ρσ²  +  (1−ρ)σ² / B",
             "Averaging B estimators reduces variance, but only the second term "
             "shrinks with B. The first term is floored by the correlation "
             "between the trees, which is why decorrelating them is the whole "
             "design of a random forest.",
             [("B", "number of trees"),
              ("T(b)", "the prediction of the b-th tree, b = 1 ... B"),
              ("σ²", "variance of a single tree"),
              ("ρ", "pairwise correlation between trees"),
              ("consequence", "bootstrapping alone leaves ρ high, because every "
                              "tree splits on the same dominant feature")]),
            ("Random feature subsetting",
             "m  =  ⌊ √p ⌋        considered at each split",
             "At every split, consider only a random subset of the features. "
             "This is what buys the independence that averaging needs, and it "
             "is the difference between a random forest and bagged trees.",
             [("p", "total number of features"),
              ("m", "features sampled per split; √p for classification, p/3 "
                    "for regression"),
              ("OOB", "roughly 37% of samples are omitted from each bootstrap, "
                      "giving a free held-out estimate")]),
        ],
        "tables": [
            ("Measured on WDBC, five-fold cross-validation",
             ["Model", "Accuracy", "F1", "ROC-AUC", "Interpretability"],
             [["Majority-class baseline", "62.7%", "—", "—", "Total"],
              ["Decision tree, depth 3", "91.7%", "0.887", "0.925", "Readable"],
              ["Decision tree, unpruned", "93.8%", "0.917", "0.936", "In principle"],
              ["Random forest, 500 trees", "95.4%", "0.938", "0.991", "Partial"],
              ["Gradient boosting, 200", "95.4%", "0.938", "0.992", "Partial"],
              ["Logistic regression", "97.4%", "0.965", "0.995", "Full"],
              ["PCA (10) + logistic regression", "97.7%", "0.969", "0.996", "Partial"]],
             "The simplest model wins. Standard deviations across folds are one "
             "to two points, so several of these are not distinguishable.",
             [2, 1, 0.8, 1, 1.2]),
        ],
        "pitfalls": [
            ("Feature importance, and what it cannot bear",
             ["Impurity-based importance is biased towards continuous and "
              "high-cardinality features",
              "Correlated features split the credit arbitrarily between them",
              "On WDBC, 'worst area' and 'worst perimeter' score 0.129 and "
              "0.129 because they measure nearly the same thing",
              "Permutation importance on held-out data is more trustworthy",
              "Neither is a causal claim, and neither licenses a therapeutic "
              "target",
              "A forest resists overfitting in depth but not in protocol: one "
              "tuned on the test set is overfitted like anything else"],
             "This is the single most over-interpreted output in applied "
             "biological machine learning."),
        ],
    },

    # ----------------------------------------------------------------- 11
    11: {
        "equations": [
            ("Gradient boosting",
             "Fₘ(x)  =  Fₘ₋₁(x)  +  ν · hₘ(x)",
             "Each new learner is fitted to the negative gradient of the loss "
             "with respect to the current predictions. For squared error that is "
             "simply the residuals.",
             [("Fₘ", "the ensemble after m stages"),
              ("hₘ", "the new weak learner, usually a shallow tree"),
              ("ν", "the learning rate, typically 0.01 to 0.1; smaller needs "
                    "more stages"),
              ("contrast", "bagging is parallel and independent; boosting is "
                           "sequential and dependent, so it must be stopped early")]),
            ("LoRA: low-rank adaptation",
             "W'  =  W  +  B A\nA is d × r,   B is r × k,   with r ≪ min(d, k)",
             "Freeze the pretrained weight matrix W and learn only the low-rank "
             "update BA. On GPT-3 175B this reduced trainable parameters by a "
             "factor of 10,000 and GPU memory by 3, with no added inference "
             "latency because BA folds back into W after training.",
             [("W", "the frozen pretrained weight matrix, d × k"),
              ("r", "the rank; 4 to 64 in practice"),
              ("per matrix", "r(d + k) trainable parameters instead of d·k"),
              ("adapters", "the alternative: small trainable modules inserted "
                           "between frozen layers, which do add latency")]),
            ("The LoRA parameter count, worked",
             "12 layers × 2 matrices × 8 × (768 + 768)  =  294,912",
             "A 12-layer model with hidden size 768, LoRA at rank 8 on the "
             "query and value projections. Against a 117-million-parameter "
             "backbone that is 0.25 per cent.",
             [("r(d+k)", "8 × 1,536 = 12,288 parameters per adapted matrix"),
              ("× 2", "query and value projections per layer"),
              ("× 12", "layers"),
              ("result", "294,912 trainable, 0.25% of the backbone")]),
        ],
        "tables": [
            ("The adaptation ladder",
             ["Rung", "Labels needed", "Compute", "The risk"],
             [["Zero-shot", "None", "Inference only",
               "The ceiling can be low, and you cannot tell in advance"],
              ["Frozen embeddings + classical head", "100 to 1,000",
               "One forward pass, then a CPU",
               "Almost none. Most projects should stop here"],
              ["Parameter-efficient (LoRA, adapters)", "1,000 to 10,000",
               "A GPU for minutes to hours",
               "New hyperparameters, each an opportunity to overfit"],
              ["Full fine-tuning", "10,000 and above", "A GPU for hours to days",
               "Fits a huge parameter count to little data; hard to reproduce"]],
             "Climb one rung at a time, and only when the rung below has "
             "demonstrably run out.",
             [1.4, 1, 1.2, 2]),
            ("Real measured learning curve, WDBC",
             ["Labelled examples", "Logistic regression", "Random forest"],
             [["11", "89.3%", "88.4%"], ["28", "93.9%", "92.6%"],
              ["57", "95.4%", "94.3%"], ["114", "96.5%", "95.3%"],
              ["228", "97.2%", "95.7%"], ["455", "97.6%", "96.1%"]],
             "Steep gains early, flat later. Mean of 20 stratified resamples at "
             "each size. That flattening is why the labelled-data budget, not "
             "the model, usually decides which rung you can reach.",
             [1.4, 1.2, 1.2]),
        ],
    },

    # ----------------------------------------------------------------- 12
    12: {
        "equations": [
            ("Uncertainty in a performance estimate",
             "Wilson 95% CI  around  p̂ = 0.90,  n = 100   →   [0.824, 0.945]",
             "An observed accuracy is an estimate with a standard error. On a "
             "100-patient test set, models reported as 0.90 and 0.93 are not "
             "distinguishable, and reporting the difference as real is a common "
             "error.",
             [("p̂", "the observed proportion correct"),
              ("n", "test-set size; the interval narrows as √n"),
              ("Wilson", "preferred to the normal approximation, which "
                         "misbehaves near 0 and 1"),
              ("report", "the interval, not the point estimate")]),
            ("Calibration versus discrimination",
             "Calibrated:  P( y = 1 | p̂ = q )  =  q     for all q",
             "Discrimination, measured by AUC, is whether the model ranks "
             "positives above negatives. Calibration is whether a stated "
             "probability means what it says. AUC depends only on the ranking, "
             "so it is completely blind to calibration.",
             [("AUC", "can be excellent while calibration is poor"),
              ("matters when", "the probability itself informs a decision"),
              ("fixes", "Platt scaling (a logistic fit) or isotonic regression"),
              ("check", "a reliability diagram, binned by predicted probability")]),
        ],
        "tables": [
            ("Interrogating a 97% accuracy claim",
             ["Question", "Why it matters"],
             [["How many test samples?",
               "97% on n=150 has a 95% CI of about 92.7 to 98.8%"],
              ["What is the class balance?",
               "At 8% positive, predicting 'negative' always scores 92%"],
              ["How were the data split?",
               "Tiles from one patient on both sides inflate by an unknown amount"],
              ["Was there external validation?",
               "One scanner, one protocol, one population cannot be detected "
               "from inside"],
              ["Is it calibrated?",
               "A model can rank well and still state the wrong probability"],
              ["Who is in the data?",
               "Aggregate accuracy conceals systematic subgroup failure"],
              ["Sensitivity and specificity separately?",
               "A single figure hides which error the model prefers to make"]],
             "None of these is hostile. A good paper answers them without being "
             "asked.",
             [1.3, 2.2]),
            ("Dataset shift",
             ["Kind", "What changes", "Biological example"],
             [["Covariate shift", "P(x)", "A different scanner or assay platform"],
              ["Label shift", "P(y)", "Deployment in a lower-prevalence population"],
              ["Concept shift", "P(y | x)",
               "Treatment guidelines change, so the same features imply a "
               "different outcome"]],
             "A model deployed at a different hospital typically meets all three "
             "at once.",
             [1, 0.8, 2.4]),
        ],
        "pitfalls": [
            ("The trust checklist",
             ["Report an interval, not a point estimate",
              "Report the baseline alongside every result",
              "Assess calibration, not only discrimination",
              "Report subgroup performance with the sample size in each cell",
              "State what external validation was done, or that none was",
              "State the computational and environmental cost",
              "Check the licence: research-only weights cannot be deployed "
              "clinically",
              "For foundation models: was your test set in the pretraining "
              "corpus? Can you archive the weights you depended on?"],
             "A high-performing model is not necessarily a scientifically valid "
             "or clinically useful one."),
        ],
    },
}
