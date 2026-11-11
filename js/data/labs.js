/* COMP9085 - practical labs.
 *
 * One lab per teaching week. Each is designed for a two-hour supervised session
 * with scikit-learn, and each ends with an interpretation task rather than a
 * working-code task, because the interpretation is what is being assessed
 * indirectly through the projects.
 *
 * `starter` is the code students are given. Keep it short: the lab is the
 * thinking, not the typing.
 */
window.LABS = {
  lab02: {
    week: 2,
    title: 'Diagnostic Model Auditor: decision trees on real biological data',
    dataset: 'wdbc',
    duration: '2 hours',
    goal: 'Grow a decision tree on real diagnostic data, find where it stops ' +
          'generalising, look inside it, trace a real case through it, deploy ' +
          'it, and write the document that says what it must not be used for.',
    tasks: [
      'Meet the data. Report the shape, the class distribution, the feature ' +
      'types and the majority-class baseline before you fit anything. Say ' +
      'what one row physically is, and who produced the numbers.',
      'Grow a tree. Split once, stratified 70/30, random_state=42. Fit ' +
      'DecisionTreeClassifier(criterion="entropy") with no depth limit. ' +
      'Report depth, nodes, leaves and both accuracies, and visualise the tree.',
      'Investigate overfitting. Train at every depth from 1 to 12, plot ' +
      'training against held-out accuracy, and say where the curves separate ' +
      'and what the tree is doing at that point.',
      'Audit the actual tree. Fit max_depth=3, print it with export_text, and ' +
      'answer from the tree itself: what is the root feature and threshold, ' +
      'which leaves are pure, and how many cases are in the smallest leaf?',
      'Trace a real case. Predict one held-out case by hand first, then check ' +
      'with decision_path. How many of the thirty features were consulted?',
      'Deploy the model. Use the deployment demonstration on this page: load ' +
      'a case, change one measurement until the prediction flips, then enter ' +
      'an impossible value and see what the interface does.',
      'Mystery case. Predict a hidden case yourself before you run the model. ' +
      'If you and the model disagree, work out how you would find out which ' +
      'of you is wrong.',
      'Validation, done properly. Split 60/20/20, choose max_depth on the ' +
      'validation set, and evaluate on the final test set exactly once. ' +
      'Report the confusion matrix and the false negatives.',
      'Pruning. Compare the unpruned tree with a cost-complexity pruned one. ' +
      'Choose ccp_alpha on the validation set, not the test set, and say ' +
      'whether the honest choice agrees with the one that flatters the test.',
      'Model card. Document intended use, data, features, model, evidence, ' +
      'limitations, risks, and why this is not a clinical system. Be honest ' +
      'about the protocol you actually followed, including any peeking.'
    ],
    starter:
      'import numpy as np\n' +
      'from sklearn.datasets import load_breast_cancer\n' +
      'from sklearn.model_selection import train_test_split\n' +
      'from sklearn.tree import DecisionTreeClassifier, plot_tree, export_text\n\n' +
      'SEED = 42\n' +
      'd = load_breast_cancer()\n' +
      'X, y = d.data, 1 - d.target        # 1 = malignant, the clinical positive\n' +
      'X_tr, X_te, y_tr, y_te = train_test_split(\n' +
      '    X, y, test_size=0.30, stratify=y, random_state=SEED)\n\n' +
      'tree = DecisionTreeClassifier(criterion="entropy", max_depth=3,\n' +
      '                              random_state=SEED).fit(X_tr, y_tr)\n' +
      'print(export_text(tree, feature_names=list(d.feature_names)))\n' +
      'print("held out", tree.score(X_te, y_te))',
    deliverable: 'A completed notebook containing: the depth sweep plot, the ' +
      'depth-3 tree visualised, the decision path of one real held-out case, ' +
      'the final-test confusion matrix from the 60/20/20 protocol, the ' +
      'unpruned and pruned trees side by side, and your model card.',
    files: [
      { label: 'Download the notebook (.ipynb)',
        href: 'labs/week02/COMP9085_Week02_Lab_Decision_Trees.ipynb',
        download: true },
      { label: 'Read it in the browser (.html)',
        href: 'labs/week02/COMP9085_Week02_Lab_Decision_Trees.html' }
    ],
    los: ['LO1', 'LO2', 'LO3', 'LO5']
  },
  lab03: {
    week: 3, title: 'Building a pipeline that does not lie to you',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Construct a leak-free scikit-learn Pipeline, then deliberately break it and measure the damage.',
    tasks: [
      'Build a Pipeline of StandardScaler, SelectKBest(k=5) and LogisticRegression. Evaluate with stratified 5-fold cross-validation.',
      'Now do it wrongly on purpose: fit SelectKBest on the full dataset first, then cross-validate the reduced data. Compare the two figures.',
      'Repeat both protocols on a synthetic dataset of 100 samples, 5,000 standard-normal features and random labels. The true accuracy is 0.5 by construction. Record what each protocol reports.',
      'Explain why the inflation is dramatic in task 3 and negligible in task 2. What does that tell you about using the score to detect leakage?',
      'Duplicate 25 per cent of the WDBC rows, then cross-validate a 1-NN classifier with and without the duplicates. Explain the gap.',
      'Write down the protocol you would pre-register for a real study using this data: the split, the metric, the baseline, the seeds, and what you would do if the result disappointed you.'
    ],
    starter:
      'import numpy as np\n' +
      'from sklearn.pipeline import Pipeline\n' +
      'from sklearn.preprocessing import StandardScaler\n' +
      'from sklearn.feature_selection import SelectKBest, f_classif\n' +
      'from sklearn.linear_model import LogisticRegression\n' +
      'from sklearn.model_selection import cross_val_score, StratifiedKFold\n\n' +
      'cv = StratifiedKFold(5, shuffle=True, random_state=42)\n' +
      'honest = Pipeline([("sel", SelectKBest(f_classif, k=5)),\n' +
      '                   ("sc", StandardScaler()),\n' +
      '                   ("m", LogisticRegression(max_iter=5000))])\n' +
      'print(cross_val_score(honest, X, y, cv=cv).mean())',
    deliverable: 'A table of the six measured numbers, and your pre-registered protocol from task 6.',
    los: ['LO1', 'LO3', 'LO5']
  },

  lab04: {
    week: 4, title: 'From confusion matrix to calibrated decision',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Compute what a positive result means, move the same model between populations and thresholds, and check whether its probabilities can be taken at face value.',
    tasks: [
      'Fit a scaled logistic regression on a stratified 70/30 split, obtain predicted probabilities, classify at the default 0.5 threshold, and name every cell of the confusion matrix in terms of what it means for a patient.',
      'From the four counts alone, compute sensitivity, specificity, PPV and NPV, printing each as numerator / denominator.',
      'Write Bayes\' rule as a function and check it against the lecture example (1% prevalence, 95% sensitivity and specificity, PPV about 16%), then redo it as natural frequencies.',
      'Apply your model\'s own sensitivity and specificity to hypothetical populations with prevalence 0.37, 0.10, 0.01 and 0.001, plot PPV and NPV against prevalence, and check one row against the Bayes calculator on this page.',
      'Sweep the threshold on cross-validated predictions from the training pool only, and plot sensitivity and specificity against it.',
      'Plot the ROC curve and the precision-recall curve, and explain which one changes with prevalence.',
      'Choose a threshold for a stated purpose (sensitivity at least 0.97) from those predictions, apply it to the test set exactly once, and justify the cost of a false positive against a false negative in a setting you describe.',
      'Plot reliability diagrams for logistic regression and Gaussian naive Bayes, decide whether each is well calibrated, and explain the difference between calibration and discrimination.',
      'Extension: recalibrate naive Bayes with CalibratedClassifierCV and explain what changed and what could not.',
      'For screening, confirmation and biomarker discovery, say which metric matters most and why.',
      'Write an evaluation record that states the prevalence alongside every predictive value.'
    ],
    starter:
      'from sklearn.metrics import confusion_matrix\n\n' +
      'p = model.predict_proba(X_test)[:, 1]\n' +
      'tn, fp, fn, tp = confusion_matrix(y_test, p >= 0.5).ravel()\n' +
      'sensitivity = tp / (tp + fn)   # of the truly malignant\n' +
      'ppv = tp / (tp + fp)           # of those predicted malignant',
    files: [
      { label: 'Download the notebook (.ipynb)',
        href: 'labs/week04/COMP9085_Week04_Lab.ipynb', download: true },
      { label: 'Read it in the browser (.html)',
        href: 'labs/week04/COMP9085_Week04_Lab.html' }
    ],
    deliverable: 'The executed notebook with every question answered, including the PPV table at four prevalences, the threshold you chose with its justification, the reliability diagram, and the evaluation record.',
    los: ['LO2', 'LO3', 'LO5']
  },

  lab05: {
    week: 5, title: 'Naive Bayes on real food-recall text: a complete pipeline',
    dataset: 'openfda', duration: '2 hours',
    goal: 'Build, evaluate and critique a naive Bayes text classifier on a frozen snapshot of real FDA recall reasons, keeping the whole pipeline away from the test set.',
    tasks: [
      'Load the frozen snapshot and decide what one row is: count rows, recall events and product records, report the class balance, and read five texts.',
      'Split by recall event with StratifiedGroupKFold (seed 42), check that no event is on both sides, and compute the majority-class baseline.',
      'Turn text into numbers: fit CountVectorizer on the training text only, inspect the vocabulary and one document-term row, and see what happens to a word the vectorizer never saw.',
      'Build a Pipeline of CountVectorizer and MultinomialNB, fit it on the training rows, and report accuracy, precision, recall, F1, ROC AUC and the confusion matrix against the baseline.',
      'Open the model: reproduce one predict_proba value by hand from the class priors and word log-probabilities, and list the words that push hardest towards Class I, with and without a frequency filter.',
      'Error analysis: read the most confident false positives and false negatives and decide, for each, whether the text alone could have told you the class.',
      'Leakage: compare the correct pipeline with a vectorizer fitted on all the text, and with a split made by product record instead of by event. Explain each result.',
      'Probabilities and the record: plot the distribution of predict_proba and a reliability diagram, report the Brier score, and complete the reproducibility record.',
      'Extension (optional): compare TF-IDF + MultinomialNB and presence + BernoulliNB, and choose alpha by grouped cross-validation on the training rows only.',
      'Extension (optional): read the stored comparison with a pretrained sentence encoder, or run it yourself if the packages are installed, and weigh accuracy against cost and interpretability.'
    ],
    starter:
      'from sklearn.pipeline import Pipeline\n' +
      'from sklearn.feature_extraction.text import CountVectorizer\n' +
      'from sklearn.naive_bayes import MultinomialNB\n\n' +
      'model = Pipeline([("vectorizer", CountVectorizer()),\n' +
      '                  ("classifier", MultinomialNB(alpha=1.0))])\n' +
      'model.fit(X_train, y_train)          # the vectorizer learns from training text only\n' +
      'p = model.predict_proba(X_test)[:, 1]',
    files: [
      { label: 'Download the notebook (.ipynb)',
        href: 'labs/week05/COMP9085_Week05_Lab.ipynb', download: true },
      { label: 'Read it in the browser (.html)',
        href: 'labs/week05/COMP9085_Week05_Lab.html' },
      { label: 'Download the data (.csv)',
        href: 'labs/week05/data/openfda_food_recall_events.csv', download: true },
      { label: 'Data provenance',
        href: 'labs/week05/data/README.md' }
    ],
    deliverable: 'The executed notebook with every question answered, including the results table against the baseline, your error analysis, the leakage comparison, the reliability diagram and the completed reproducibility record.',
    los: ['LO2', 'LO3', 'LO5'],
    note: 'Everything runs offline from the CSV next to the notebook: no API, no key, no download. Tasks 1 to 8 are the core lab; the two extensions are optional.'
  },

  lab06: {
    week: 6, title: 'Preparing NHANES without breaking it',
    dataset: 'nhanes', duration: '2 hours',
    goal: 'Take real survey data from raw files to a modelling-ready matrix, making every preprocessing decision explicitly.',
    tasks: [
      'Download the demographic file and one laboratory or dietary file for the August 2021 to August 2023 cycle. Merge on SEQN. Report how many participants survive the merge and why the number fell.',
      'Profile the missingness. For your chosen outcome, test whether missingness is associated with age, sex or examination attendance. Classify the mechanism as MCAR, MAR or MNAR and justify it.',
      'Handle the missingness three ways: complete-case, median imputation, and iterative imputation with a missingness indicator. Keep all three datasets.',
      'Identify outliers univariately with the IQR rule and multivariately with IsolationForest. For three of the flagged participants, decide whether to keep them and write one sentence of justification each.',
      'Encode the categorical variables correctly, distinguishing ordinal from nominal. Scale appropriately for a downstream logistic regression.',
      'Fit the same model to all three imputation variants inside a proper Pipeline. Report the three cross-validated scores and say which preprocessing choice you would defend in a paper, and why.',
      'Finally, compute a weighted and an unweighted prevalence estimate for your outcome using WTMEC2YR. Explain the difference in one paragraph.'
    ],
    starter:
      'import pandas as pd\n' +
      'demo = pd.read_sas("DEMO_L.xpt")\n' +
      'lab  = pd.read_sas("<YOUR_FILE>_L.xpt")\n' +
      'df = demo.merge(lab, on="SEQN", how="inner")\n' +
      'print(len(demo), len(lab), len(df))\n' +
      'print(df.isna().mean().sort_values(ascending=False).head(20))',
    deliverable: 'A missingness report, your three-way comparison, and the weighted-versus-unweighted paragraph.',
    los: ['LO1', 'LO2', 'LO5']
  },

  lab07: {
    week: 7, title: 'Protein representations, dimensionality reduction and k-NN: classical features versus ESM-2',
    dataset: 'uniprotHuman', duration: '2 hours',
    goal: 'Represent 2,000 real human proteins three ways (classical descriptors, ESM-2 embeddings, reduced versions of both), see what PCA, t-SNE and UMAP keep and lose, and compare classical features with ESM-2 under k-NN in a controlled, reproducible experiment.',
    tasks: [
      'Explore the proteins: provenance, sequence lengths, the signal-peptide and transmembrane labels, their evidence codes, missing values and the class balance in the fixed 1,500/500 split.',
      'Compute classical descriptors: amino-acid composition, log length, and two Kyte-Doolittle hydropathy summaries (the maximum over a 19-residue window, and the first 25 residues). Say what each can and cannot see.',
      'Standardise the classical features and run PCA: explained variance, the cumulative curve, PC1 against PC2 by label, the loadings, and the same without scaling.',
      'Run t-SNE (two perplexities) and UMAP (two n_neighbors settings) on the classical features and the embeddings; measure trustworthiness; say what the maps can and cannot show.',
      'Load the ESM-2 embeddings: check dimensions, missing values and the accession match; describe how they were made; measure anisotropy; compare the PCA spectrum and maps with the classical features.',
      'The key experiment: k-NN on classical descriptors and on ESM-2 embeddings with the same split, target, 5-fold CV, Pipeline and GridSearchCV grid (k, metric, weighting, scaling); report the selected settings, then evaluate each once on the test set (ROC AUC, confusion matrix, precision, recall, F1) with a bootstrap interval for the difference. Signal peptide, then transmembrane.',
      'Compare a protein\'s nearest neighbours in composition, classical, ESM-2 and PCA-reduced spaces: overlap, and how often neighbours share the protein\'s annotations.',
      'The residue-shuffling control: same composition, order destroyed. Compare features, distances and k-NN performance, and explain what the control does and does not show.',
      'Reflect: which representation did better, for which task and why; what dimensionality reduction did to the neighbours; whether visual clusters matched annotations; the limits of the data and the evaluation; what you would test next.'
    ],
    starter:
      'from sklearn.pipeline import Pipeline\n' +
      'from sklearn.preprocessing import StandardScaler\n' +
      'from sklearn.neighbors import KNeighborsClassifier\n' +
      'from sklearn.model_selection import GridSearchCV, StratifiedKFold\n\n' +
      'pipe = Pipeline([("scale", StandardScaler()), ("knn", KNeighborsClassifier())])\n' +
      'grid = {"scale": ["passthrough", StandardScaler()], "knn__n_neighbors": K_GRID,\n' +
      '        "knn__metric": ["euclidean", "manhattan", "cosine"], "knn__weights": ["uniform", "distance"]}\n' +
      '# the SAME pipe, grid, folds and split for every representation',
    files: [
      { label: 'Download the notebook (.ipynb)',
        href: 'labs/week07/COMP9085_Week07_Lab.ipynb', download: true },
      { label: 'Read it in the browser (.html)',
        href: 'labs/week07/COMP9085_Week07_Lab.html' },
      { label: 'Lab README',
        href: 'labs/week07/README.md' },
      { label: 'Data, embeddings and provenance',
        href: 'labs/week07/data/README.md' }
    ],
    deliverable: 'The executed notebook with every question answered: the PCA and map figures with your reading of them, the k-NN comparison table with selected settings, test results and the bootstrap interval, the neighbourhood comparison, the shuffling control, and your reflection.',
    los: ['LO1', 'LO2', 'LO4'],
    note: 'Everything runs offline in about two minutes on a laptop: the proteins and their ESM-2 embeddings are precomputed in labs/week07/data, so no GPU or deep-learning package is needed (umap-learn is optional; the notebook falls back if it is missing). Tasks 1 to 9 are the core lab; four extensions are optional.'
  },

  lab08: {
    week: 8, title: 'k-nearest neighbours on real patients: what counts as similar?',
    dataset: 'heartCleveland', duration: '2 hours',
    goal: 'Build k-NN properly on real clinical data, and measure which decisions matter: k, the metric, the representation of categories, scaling and distance weighting.',
    tasks: [
      'Explore the 303 Cleveland patients: types, missing values, the ranges of the five continuous features, and which integer columns are really categories.',
      'Make one stratified 75/25 split and estimate a majority-class baseline with 10-fold cross-validation.',
      'Build k-NN inside a Pipeline (impute, standardise, one-hot) and explain one prediction from its five neighbours.',
      'Plot training and cross-validated accuracy against k from 1 to 51; identify overfitting and compare with the √n rule.',
      'Compare Euclidean and Manhattan distance, one-hot against raw category codes, and Hamming distance on the categorical features.',
      'Compare no scaling, min-max and standardisation, and show which feature dominates the unscaled distance and why the scaler belongs inside the Pipeline.',
      'Select k, metric and weighting with GridSearchCV on the training data; judge whether the top settings really differ.',
      'Compare uniform and 1/d^p weighting, reproduce the lecture\'s 81.857, and handle the zero-distance case.',
      'Evaluate the chosen model once on the test set: confusion matrix, balanced accuracy, and the class-imbalance problem of the severity label.',
      'Reflect: irrelevant features, computational cost, when another model is preferable, and why neighbours in feature space are not biologically equivalent.'
    ],
    starter:
      'knn = Pipeline([\n' +
      '    ("prep", ColumnTransformer([\n' +
      '        ("num", make_pipeline(SimpleImputer(strategy="median"), StandardScaler()), NUMERIC),\n' +
      '        ("cat", make_pipeline(SimpleImputer(strategy="most_frequent"),\n' +
      '                              OneHotEncoder(handle_unknown="ignore")), CATEGORICAL)])),\n' +
      '    ("knn", KNeighborsClassifier(n_neighbors=5))])\n' +
      'cross_val_score(knn, X_train, y_train, cv=CV).mean()',
    files: [
      { label: 'Download the notebook (.ipynb)',
        href: 'labs/week08/COMP9085_Week08_Lab.ipynb', download: true },
      { label: 'Read it in the browser (.html)',
        href: 'labs/week08/COMP9085_Week08_Lab.html' },
      { label: 'Download the data (.csv)',
        href: 'labs/week08/data/heart_disease_cleveland.csv', download: true },
      { label: 'Data dictionary and provenance',
        href: 'labs/week08/data/README.md' }
    ],
    deliverable: 'The executed notebook with every question answered from your own numbers: the k curve, the metric, representation and scaling comparisons, the cross-validated choice, the single test evaluation and your reflection.',
    note: 'Keep the data folder next to the notebook. No network or GPU is needed. Extensions A to C (k-NN regression, k-NN from scratch, a heterogeneous distance) are optional.',
    los: ['LO2', 'LO3', 'LO5']
  },

  lab09: {
    week: 9, title: 'Clusters, and whether to believe them',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Cluster real data, choose k defensibly, and then try seriously to disprove your own result.',
    tasks: [
      'Carry out k-means and a silhouette calculation by hand on six expression values, and check both against scikit-learn.',
      'Cluster WDBC raw and standardised; explain why the raw clustering has the higher silhouette but the worse agreement with diagnosis.',
      'Sweep k from 1 to 10: elbow, silhouette and silhouette plots; run 50 single starts at k = 4. Choose k before seeing the label.',
      'Measure bootstrap stability for k = 2 to 6, then reveal the agreement with diagnosis (adjusted Rand index).',
      'Tune DBSCAN with a k-distance plot in 30 dimensions and on two principal components; inspect the noise points.',
      'Compare single, complete, average and Ward linkage; draw dendrograms and explain the linkage trap.',
      'Manufacture a batch effect on the real tumours (random and confounded designs), find the tipping point, and show why per-batch centring fails under confounding.',
      'Cluster the Week 7 proteins in classical-descriptor and ESM-2 space; compare clusters with the signal-peptide and membrane labels and with length.',
      'Write the two sentences you would need to claim the clusters are biology, and say honestly whether your analysis supports them.'
    ],
    starter:
      'from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering\n' +
      'from sklearn.metrics import silhouette_score, adjusted_rand_score\n\n' +
      'for k in range(2, 11):\n' +
      '    km = KMeans(k, n_init=10, random_state=42).fit(Z)\n' +
      '    print(k, round(km.inertia_), round(silhouette_score(Z, km.labels_), 3))',
    files: [
      { label: 'Download the notebook (.ipynb)',
        href: 'labs/week09/COMP9085_Week09_Lab.ipynb', download: true },
      { label: 'Read it in the browser (.html)',
        href: 'labs/week09/COMP9085_Week09_Lab.html' },
      { label: 'Protein descriptors (.csv)',
        href: 'labs/week09/data/proteins_classical_features.csv', download: true },
      { label: 'ESM-2 embeddings (.csv.gz)',
        href: 'labs/week09/data/esm2_t6_8M_embeddings.csv.gz', download: true },
      { label: 'Data dictionary and provenance',
        href: 'labs/week09/data/README.md' }
    ],
    deliverable: 'The executed notebook with every question answered from your own numbers: the hand calculation, the scaling comparison, your choice of k with its evidence, the stability numbers, the DBSCAN and linkage comparisons, the manufactured-batch demonstration, the protein clusters and your two sentences from Task 9.',
    note: 'WDBC ships with scikit-learn. Keep the data folder next to the notebook; in Google Colab the notebook downloads the two protein files from this site. No GPU is needed and it runs in about a minute. Extensions A to C (other algorithms, cluster-wise stability, PCA before clustering proteins) are optional.',
    los: ['LO1', 'LO4', 'LO5']
  },

  lab10: {
    week: 10, title: 'Ensembles and the limits of feature importance',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Fit a strong ensemble, then establish how much its feature importances can bear.',
    tasks: [
      'Fit a single decision tree, bagged trees and a random forest with matched settings. Report cross-validated accuracy for all three and explain the ordering you observe.',
      'Sweep n_estimators from 1 to 500 and plot out-of-bag error. Where does it plateau? What does that tell you about the marginal value of more trees?',
      'Extract impurity-based feature importances and rank them. Then compute permutation importance on held-out data. Compare the two rankings and account for any disagreement.',
      'Find the most correlated pair of features in the data. Drop one and refit. What happened to the importance of the survivor, and what does that tell you about reading importances as biological significance?',
      'Fit logistic regression on the same data. Compare its accuracy with the forest. Discuss what you would report if the simpler model were within one standard deviation of the complex one.',
      'Build the full comparison table for this dataset: accuracy, F1, ROC-AUC, training time, whether a GPU is needed, and how interpretable each model is. Recommend one model to a clinical collaborator and justify the recommendation on more than accuracy.'
    ],
    starter:
      'from sklearn.ensemble import RandomForestClassifier\n' +
      'from sklearn.inspection import permutation_importance\n\n' +
      'rf = RandomForestClassifier(500, oob_score=True, random_state=42).fit(X_tr, y_tr)\n' +
      'print("OOB", rf.oob_score_)\n' +
      'pi = permutation_importance(rf, X_te, y_te, n_repeats=30, random_state=42)',
    deliverable: 'The OOB curve, the two importance rankings with your account of their disagreement, and the full comparison table with your recommendation.',
    los: ['LO1', 'LO2', 'LO3', 'LO5']
  },

  lab11: {
    week: 11, title: 'Boosting, and costing an adaptation strategy',
    dataset: 'proteinSim', duration: '2 hours',
    goal: 'Tune a boosted ensemble properly, then cost out the four rungs of the adaptation ladder for a realistic project.',
    tasks: [
      'Fit GradientBoostingClassifier on WDBC. Sweep learning_rate and n_estimators over a grid and plot validation accuracy as a heatmap. Identify the trade-off between the two.',
      'Add early stopping with a validation fraction. Show a configuration that overfits without it and does not overfit with it.',
      'Compare gradient boosting with the random forest from Week 10 on accuracy, training time and sensitivity to hyperparameters. Which would you rather hand to a collaborator, and why?',
      'On the protein set, train logistic regression on the frozen embedding for the hasSite label. This is the feature-extraction rung. Record accuracy and wall-clock time.',
      'Using the LoRA arithmetic from the lecture, compute the trainable-parameter count for a 12-layer, 768-hidden model at ranks 4, 8, 16 and 64 applied to query and value projections. Express each as a percentage of a 117-million-parameter backbone.',
      'Write a one-page adaptation plan for a project with 340 labelled sequences and one GPU-day. State which rung you would use, what you would measure to know whether to climb higher, and what would make you stop.'
    ],
    starter:
      'from sklearn.ensemble import GradientBoostingClassifier\n\n' +
      'gb = GradientBoostingClassifier(n_estimators=200, learning_rate=0.1,\n' +
      '                                validation_fraction=0.15, n_iter_no_change=10,\n' +
      '                                random_state=42).fit(X_tr, y_tr)\n' +
      'print(gb.n_estimators_, "stages actually used")\n\n' +
      '# LoRA parameter count\n' +
      'def lora_params(rank, d_model, n_layers, n_matrices=2):\n' +
      '    return rank * (d_model + d_model) * n_matrices * n_layers',
    deliverable: 'The heatmap, the early-stopping demonstration, the LoRA table, and your one-page adaptation plan.',
    los: ['LO1', 'LO2', 'LO3', 'LO5']
  },

  lab12: {
    week: 12, title: 'Auditing a model you did not build',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Apply the full trust checklist to a model, including one of your own.',
    tasks: [
      'Take your best model from Week 10 or 11. Compute a bootstrap 95 per cent confidence interval for its accuracy. Report the interval, not the point estimate.',
      'Plot a calibration curve with sklearn.calibration.calibration_curve. Is it calibrated? Apply Platt scaling and isotonic regression and replot.',
      'Simulate covariate shift: scale one informative feature in the test set by 1.3, as a different scanner might. Report the accuracy drop.',
      'Split the test set by a proxy subgroup variable of your choice and report performance in each subgroup with sample sizes. Identify which estimates are too small to interpret.',
      'Estimate the compute cost of training your model and of the largest model discussed in this module. Comment on the ratio.',
      'Complete the trust checklist from the lecture for your model. Be honest about the entries you cannot satisfy.',
      'Finally, exchange notebooks with another student and audit theirs. Write the three questions you would ask before believing their headline number.'
    ],
    starter:
      'import numpy as np\n' +
      'from sklearn.calibration import calibration_curve\n\n' +
      'boot = [accuracy_score(y_te[i], pred[i]) for i in\n' +
      '        (np.random.choice(len(y_te), len(y_te), replace=True) for _ in range(2000))]\n' +
      'print(np.percentile(boot, [2.5, 97.5]))\n\n' +
      'frac_pos, mean_pred = calibration_curve(y_te, prob, n_bins=10)',
    deliverable: 'The confidence interval, the calibration curves before and after recalibration, the subgroup table, the completed checklist, and your three audit questions for a peer.',
    los: ['LO1', 'LO2', 'LO3', 'LO4', 'LO5']
  }
};
