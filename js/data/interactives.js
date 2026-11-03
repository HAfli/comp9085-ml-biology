/* COMP9085 - index of the interactive exercises, by teaching week.
 *
 * One entry per exercise. Each exercise has ONE canonical implementation, on
 * its week page (weeks/weekNN.html#viz-<id>); this index only links to it.
 * `slides` gives the lecture slide numbers that send students to the exercise
 * (the Canvas lecture deck for that week), checked against the .pptx files on
 * 2026-11-01 (Weeks 1-7) and 2026-11-03 (Week 8, the refreshed 2026 deck).
 * Weeks 9-12 list their interactives without slide numbers: those lectures
 * had not been audited when this index was written.
 *
 * kind: 'interactive' (controls you manipulate) or 'video' (an embedded video
 * with a question attached).
 */
window.INTERACTIVES = [
  { week: 1, items: [
    { id: 'problem-classifier', kind: 'interactive', title: 'What type of machine-learning problem is this?',
      learn: 'Classify eight real biological scenarios, then read why the tempting wrong answer is tempting.',
      slides: 'the lecture\'s interactive activity' },
    { id: 'videos', kind: 'video', title: 'Watch: Biology meets computer science; AlphaFold',
      learn: 'Two short videos, each with a question to answer before the first lab.',
      slides: 'the two "Watch" call-outs' }
  ] },
  { week: 2, items: [
    { id: 'decision-tree', kind: 'interactive', title: 'Decision tree builder',
      learn: 'Change depth and leaf size; watch the real fitted tree and its held-out accuracy change.' },
    { id: 'entropy', kind: 'interactive', title: 'Entropy and information gain',
      learn: 'Move the class balance and the split; watch entropy and information gain update.' },
    { id: 'deployment', kind: 'interactive', title: 'Deployment demonstration',
      learn: 'Put a case through the tree and read its decision path (not an explanation).' }
  ] },
  { week: 3, items: [
    { id: 'data-splitter', kind: 'interactive', title: 'Biological data splitter', slides: '17',
      learn: 'Split by sample or by patient, and see how a patient on both sides inflates the score.' },
    { id: 'cv-explorer', kind: 'interactive', title: 'Cross-validation explorer', slides: '32',
      learn: 'Change k and stratification; read the individual fold scores, not just their mean.' },
    { id: 'leakage', kind: 'interactive', title: 'Can you spot the leakage? (leakage simulator)', slides: '40',
      learn: 'Judge eight protocols, then measure how much a leaky protocol inflates the score.' },
    { id: 'pipeline-builder', kind: 'interactive', title: 'Pipeline builder', slides: '48',
      learn: 'Move the scaler and feature selector inside or outside the Pipeline and watch the leakage warning.' },
    { id: 'hyperparameter', kind: 'interactive', title: 'Hyperparameter explorer', slides: '53',
      learn: 'Sweep max_depth or k; only cross-validation may choose, and the final test is looked at once.' },
    { id: 'wdbc-e2e', kind: 'interactive', title: 'WDBC end-to-end experiment', slides: '71',
      learn: 'Baseline, two models, CV, tuning, one final test, the confusion matrix and the missed cases.' }
  ] },
  { week: 4, items: [
    { id: 'cm-calc', kind: 'interactive', title: 'Confusion-matrix calculator', slides: '13, 75',
      learn: 'Four counts to sensitivity, specificity, PPV and NPV, with each denominator highlighted.' },
    { id: 'bayes', kind: 'interactive', title: 'Diagnostic test (Bayes) calculator', slides: '41, 74',
      learn: 'Start from the lecture preset; move only the prevalence and watch the PPV change.' },
    { id: 'prevalence', kind: 'interactive', title: 'Prevalence explorer', slides: '42',
      learn: 'One test in five populations: the amber share of each bar is the PPV.' },
    { id: 'threshold', kind: 'interactive', title: 'Decision threshold explorer', slides: '47, 49',
      learn: 'Move the threshold; missed cases trade against false alarms and all eight numbers move.' },
    { id: 'calibration', kind: 'interactive', title: 'Calibration explorer', slides: '56, 60',
      learn: 'Models A to D: AUC stays the same while the reliability diagram moves.' },
    { id: 'wdbc-models', kind: 'interactive', title: 'WDBC: two models, real data', slides: '75',
      learn: 'Logistic regression versus naive Bayes: similar discrimination, different probabilities.' }
  ] },
  { week: 5, items: [
    { id: 'nb-bayes', kind: 'interactive', title: 'A. From Bayes to a classifier: one word as evidence',
      learn: 'Week 4\'s Bayes calculator with a word as the evidence and a class share as the prior.' },
    { id: 'nb-evidence', kind: 'interactive', title: 'B. Four words, by hand', slides: '19, 20',
      learn: 'Build a text word by word; switch smoothing off; repeat it 400 times to see underflow.' },
    { id: 'text-repr', kind: 'interactive', title: 'C. From words to a matrix', slides: '24, 28',
      learn: 'Counts, presence and TF-IDF on the same texts; edit one text and watch the others change.' },
    { id: 'naive-bayes', kind: 'interactive', title: 'The Week 5 classifier, trained in your browser', slides: '36',
      learn: 'The lab\'s model on real openFDA recall text; score your own sentence, including a negation.' },
    { id: 'nb-leakage', kind: 'interactive', title: 'D. Three pipelines', slides: '44',
      learn: 'Which number moves when the vectorizer sees the test text, and which number explains why.' },
    { id: 'nb-compare', kind: 'interactive', title: 'E. Naive Bayes against a pretrained encoder',
      learn: 'Five models, one split; choose the metric, then read the cost table.' }
  ] },
  { week: 6, items: [
    { id: 'data-quality', kind: 'interactive', title: 'Data-quality explorer: damage real data, then repair it',
      slides: '24',
      learn: 'Inject missingness at random or not at random; compare repairs, with and without an indicator.' }
  ] },
  { week: 7, items: [
    { id: 'pca', kind: 'interactive', title: 'PCA visualiser', slides: '13',
      learn: 'Project WDBC onto different pairs of components; compare the variance each pair carries with how well the diagnoses separate; switch standardisation off.' },
    { id: 'embeddings', kind: 'interactive', title: 'Foundation-model embedding explorer', slides: '38',
      learn: 'A simulated teaching set with two tasks, one solvable by composition and one needing order; compare with the real result in the lecture and lab.' }
  ] },
  { week: 8, items: [
    { id: 'knn-vote', kind: 'interactive', title: '1. Nearest neighbour and the k-NN vote', slides: '13',
      learn: 'Place a query, compare k = 1, 3 and 5, flip a label to inject noise, and shade the decision regions.' },
    { id: 'knn-regression', kind: 'interactive', title: '2. k-NN regression', slides: '20',
      learn: 'Average the neighbours (the slide\'s 81 and 81.857), then predict real patients\' maximum heart rate from age.' },
    { id: 'distance-calc', kind: 'interactive', title: '3. Distance calculator', slides: '31',
      learn: 'Euclidean, Manhattan, weighted, Hamming, heterogeneous and domain-specific distances on every slide example, editable.' },
    { id: 'knn-scaling', kind: 'interactive', title: '4. Feature scaling decides the neighbours', slides: '36',
      learn: 'Unscaled, cholesterol picks the neighbours; standardise and watch the neighbourhood change.' },
    { id: 'knn-irrelevant', kind: 'interactive', title: '5. Irrelevant features and feature weights', slides: '39',
      learn: 'Add pure-noise features to real data, watch accuracy fall, then weight them down.' },
    { id: 'knn-weighted', kind: 'interactive', title: '6. Distance-weighted voting and the exponent', slides: '44',
      learn: 'The lecture\'s nine points: change k and n, break the tie, and see what happens at distance 0.' },
    { id: 'knn-cv', kind: 'interactive', title: '7. Choosing k by cross-validation', slides: '46',
      learn: 'Measured CV curves for every k, metric, weighting and scaling; look at the test set once.' },
    { id: 'knn', kind: 'interactive', title: '8. (Optional) Who is biologically similar? Classifier versus representation',
      slides: '51 (notes)',
      learn: 'Change the classifier or the representation it measures distance in: a preview of Week 7.' }
  ] },
  { week: 9, items: [
    { id: 'clustering', kind: 'interactive', title: 'Biological subgroup explorer',
      learn: 'Three clustering algorithms with an injectable batch effect.' }
  ] },
  { week: 10, items: [
    { id: 'random-forest', kind: 'interactive', title: 'Random forest visualiser',
      learn: 'A real forest grown in the browser; duplicate a feature and watch the importances.' },
    { id: 'leaderboard', kind: 'interactive', title: 'Model comparison lab',
      learn: 'Every classical model under one protocol; sort by something other than accuracy.' }
  ] },
  { week: 11, items: [
    { id: 'fine-tuning', kind: 'interactive', title: 'Fine-tuning simulator',
      learn: 'Exact parameter arithmetic for each rung of the adaptation ladder.' }
  ] },
  { week: 12, items: [
    { id: 'trust', kind: 'interactive', title: 'Would you trust this model?',
      learn: 'Investigate two published-style claims before deciding.' },
    { id: 'fm-decision', kind: 'interactive', title: 'Should I use a foundation model?',
      learn: 'Eight questions, five recommendations.' }
  ] }
];
