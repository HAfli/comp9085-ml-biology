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
    week: 4, title: 'From confusion matrix to clinical consequence',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Move a decision threshold and watch the clinical meaning of the model change.',
    tasks: [
      'Fit a logistic regression and obtain predicted probabilities on a held-out set. Produce the confusion matrix at the default 0.5 threshold.',
      'From that matrix compute sensitivity, specificity, PPV, NPV, precision, recall and F1 by hand, using numpy rather than sklearn, so that you can see where each comes from.',
      'Sweep the threshold from 0.05 to 0.95 and plot sensitivity and specificity against it. Mark the point where they cross.',
      'Plot the ROC curve and compute the AUC. Then plot the precision-recall curve. Explain which is more informative for a rare condition and why.',
      'Using the Bayes calculator from the lecture, take your model\'s measured sensitivity and specificity and compute PPV at prevalences of 0.37 (the dataset), 0.10 and 0.005 (population screening).',
      'Choose a threshold and defend it. State whose interests you weighted and what a false negative costs relative to a false positive in your chosen setting.'
    ],
    starter:
      'from sklearn.linear_model import LogisticRegression\n' +
      'from sklearn.metrics import confusion_matrix, roc_curve, auc\n\n' +
      'p = model.predict_proba(X_te)[:, 1]\n' +
      'tn, fp, fn, tp = confusion_matrix(y_te, p > 0.5).ravel()\n' +
      'sensitivity = tp / (tp + fn)\n' +
      'specificity = tn / (tn + fp)\n' +
      'ppv = tp / (tp + fp)',
    deliverable: 'The threshold plot, the PPV table at three prevalences, and a paragraph defending your chosen threshold.',
    los: ['LO2', 'LO5']
  },

  lab05: {
    week: 5, title: 'Naive Bayes on food recall notices',
    dataset: 'openfda', duration: '2 hours',
    goal: 'Build a text classifier on real regulatory data and audit what it learned.',
    tasks: [
      'Pull recall records from the openFDA food enforcement endpoint. Take reason_for_recall as the text and classification as the label. Report the class balance and note the date range you pulled.',
      'Vectorise with CountVectorizer and fit MultinomialNB. Report accuracy, macro-F1 and the majority-class baseline.',
      'Extract the twenty words with the highest log-probability ratio between Class I and Class II. Read them. Do they describe hazard, or do they describe FDA drafting conventions?',
      'Compare alpha=0 (no smoothing), alpha=1 (Laplace) and alpha=0.01. Explain what happens at alpha=0 and why.',
      'Compare MultinomialNB with BernoulliNB and with TfidfVectorizer. Report all four combinations in one table.',
      'Split by year instead of at random: train on records before a cut-off year and test on records after it. Compare with the random split and explain the difference in terms of Week 3.'
    ],
    starter:
      'import requests, pandas as pd\n' +
      'r = requests.get("https://api.fda.gov/food/enforcement.json",\n' +
      '                 params={"limit": 1000})\n' +
      'df = pd.json_normalize(r.json()["results"])\n' +
      'df = df[["reason_for_recall", "classification", "report_date"]].dropna()\n' +
      'print(df.classification.value_counts())',
    deliverable: 'The four-way comparison table, your top-twenty word list with a comment on each, and the random-versus-temporal split comparison.',
    los: ['LO2', 'LO3', 'LO5'],
    note: 'If the API is unreachable from the lab network, a cached extract will be provided on Canvas. Record in your notebook which you used.'
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
    week: 7, title: 'PCA and the geometry of a learned representation',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Reduce a real dataset properly, then compare an engineered representation with a learned one on identical footing.',
    tasks: [
      'Standardise WDBC and run PCA. Plot the explained-variance spectrum and the cumulative curve. How many components are needed for 90 per cent?',
      'Plot PC1 against PC2 coloured by diagnosis. Then inspect the PC1 loadings: which original features dominate it, and what do they have in common biologically?',
      'Fit logistic regression on the raw 30 features and on 2, 5, 10 and 20 principal components, all inside a Pipeline. Plot accuracy against the number of components. Where is the knee?',
      'Load the protein teaching set from js/data/sequences.js. Note the simulation warning and record in your notebook what is simulated and what is not.',
      'For the family label, run k-NN on the engineered representation and on the embedding. For the hasSite label, do the same. Produce one table with four numbers.',
      'Explain the pattern in that table. Which task favours which representation, and what property of each task explains it?'
    ],
    starter:
      'from sklearn.decomposition import PCA\n' +
      'from sklearn.preprocessing import StandardScaler\n\n' +
      'Z = StandardScaler().fit_transform(d.data)\n' +
      'p = PCA().fit(Z)\n' +
      'print(p.explained_variance_ratio_[:5].cumsum())\n' +
      '# loadings for PC1\n' +
      'import numpy as np\n' +
      'order = np.argsort(np.abs(p.components_[0]))[::-1][:6]\n' +
      'print([d.feature_names[i] for i in order])',
    deliverable: 'The variance plot, the components-versus-accuracy plot, the four-number table and your explanation of it.',
    los: ['LO1', 'LO2', 'LO4']
  },

  lab08: {
    week: 8, title: 'What counts as similar?',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Establish experimentally that the representation, not the classifier, determines nearest-neighbour quality.',
    tasks: [
      'Fit k-NN on WDBC with and without StandardScaler, at k = 1, 3, 5, 9, 15, 31 and 51. Produce one plot with both curves.',
      'Explain the gap between the curves by inspecting the feature ranges. Which feature dominates the unscaled distance, and by what factor?',
      'Compare Euclidean, Manhattan and Chebyshev distance at the best k. Is the difference larger or smaller than the scaling effect?',
      'Add 50 columns of pure Gaussian noise to the standardised data and refit. Quantify how much accuracy you lost, then repeat with 200 noise columns.',
      'Repeat task 4 with a decision tree instead of k-NN. Explain why the two models degrade so differently.',
      'On the protein set, hold k-NN fixed and vary only the representation, for both labels. Report accuracy, macro-F1 and the confusion matrix for each of the four combinations.',
      'Answer in writing: does a better representation always produce better nearest neighbours? Use your own numbers as evidence.'
    ],
    starter:
      'from sklearn.neighbors import KNeighborsClassifier\n' +
      'from sklearn.pipeline import make_pipeline\n' +
      'from sklearn.preprocessing import StandardScaler\n\n' +
      'for k in [1, 3, 5, 9, 15, 31, 51]:\n' +
      '    scaled = make_pipeline(StandardScaler(), KNeighborsClassifier(k))\n' +
      '    raw = KNeighborsClassifier(k)\n' +
      '    # cross-validate both and record',
    deliverable: 'The scaling plot, the noise-degradation comparison for k-NN and tree, and your written answer to task 7.',
    los: ['LO2', 'LO3', 'LO5']
  },

  lab09: {
    week: 9, title: 'Clusters, and whether to believe them',
    dataset: 'wdbc', duration: '2 hours',
    goal: 'Cluster real data, choose k defensibly, and then try seriously to disprove your own result.',
    tasks: [
      'Standardise WDBC and run k-means for k = 2 to 10. Plot inertia (the elbow) and silhouette against k. Choose k and justify it in one sentence.',
      'Compare your clusters with the true diagnosis using the adjusted Rand index. Note that in a real discovery setting you would not have this label.',
      'Run DBSCAN. Tune eps using a k-distance plot rather than by trial and error. Report how many points it labels as noise, and inspect several of them.',
      'Run agglomerative clustering with single, complete and Ward linkage. Plot the three dendrograms side by side and comment on how differently they partition the same data.',
      'Stability test: bootstrap the data 50 times, recluster, and measure how often pairs of samples land together. Report the mean pairwise co-assignment for your chosen k, and for k plus one.',
      'Now the important part. Add a fake "batch" variable that is correlated with two of the features, recluster, and show that you can manufacture a convincing cluster structure that has no biological content.',
      'Write the two sentences you would need in a paper to justify claiming these clusters are biologically meaningful, and say honestly whether your analysis supports them.'
    ],
    starter:
      'from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering\n' +
      'from sklearn.metrics import silhouette_score, adjusted_rand_score\n\n' +
      'for k in range(2, 11):\n' +
      '    km = KMeans(k, n_init=10, random_state=42).fit(Z)\n' +
      '    print(k, round(km.inertia_), round(silhouette_score(Z, km.labels_), 3))',
    deliverable: 'The elbow and silhouette plots, the stability numbers, the manufactured-batch demonstration, and your two sentences from task 7.',
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
