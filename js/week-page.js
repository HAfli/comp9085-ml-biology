/* COMP9085 - week page renderer.
 *
 * Every week page is a thin shell that declares its number and calls this. All
 * the content comes from js/data/course.js, so a week is edited in one place
 * and the page, the roadmap, the labs index and the learning-outcome map all
 * update together.
 *
 * The visualisation controls for each week are declared in VIZ_SPECS below,
 * next to the visualisation they belong to.
 */
(function () {
  'use strict';

  var U = window.UI;

  /* Control panels for each interactive. Kept here so the visualisation
     modules stay concerned with behaviour and these stay concerned with
     presentation. */
  var VIZ_SPECS = {

    'problem-classifier': {
      title: 'What type of machine-learning problem is this?',
      intro: 'Eight real biological scenarios. Classify each one, then read why ' +
             'the tempting wrong answer is tempting.',
      controls: '',
      readout: U.metric('pc-score', 'Score', '0 / 0', 'No answers yet'),
      explain: '<p class="mb0">Getting the problem type right is not a ' +
        'formality. It determines which algorithms are even candidates, what ' +
        'counts as evidence that the model works, and whether you need labels ' +
        'at all. Most wasted effort in applied biological machine learning ' +
        'traces back to a problem that was framed wrongly in the first week.</p>',
      altLabel: 'Read every scenario and answer as text'
    },

    'decision-tree': {
      title: 'Decision tree builder',
      intro: 'A real CART tree is fitted to the real WDBC data every time you ' +
             'move a control. The tree you see is the tree that was fitted.',
      banner: 'real',
      controls:
        U.slider({ id: 'dt-depth', label: 'Maximum depth', min: 1, max: 12, value: 3 }) +
        U.slider({ id: 'dt-minleaf', label: 'Minimum samples per leaf', min: 1, max: 40, value: 1 }) +
        U.segmented({ id: 'dt-criterion', label: 'Splitting criterion', value: 'entropy',
          options: [{ value: 'entropy', label: 'Entropy' }, { value: 'gini', label: 'Gini' }] }) +
        U.select({ id: 'dt-subset', label: 'Features available', value: 'all',
          options: [
            { value: 'all', label: 'All 30 features' },
            { value: 'mean', label: 'The 10 "mean" features' },
            { value: 'worst', label: 'The 10 "worst" features' },
            { value: 'two', label: 'Two weak features only' }] }) +
        '<div class="control"><span class="control-label">Resample the split</span>' +
        '<button type="button" class="btn btn-sm" id="dt-seed">New random split</button></div>' +
        '<div class="control"><span class="control-label">Trace a held-out case</span>' +
        '<button type="button" class="btn btn-sm" id="dt-trace">Trace a real case</button></div>',
      readout:
        U.metric('dt-train', 'Training accuracy', '—') +
        U.metric('dt-test', 'Held-out accuracy', '—') +
        U.metric('dt-gap', 'Gap', '—') +
        U.metric('dt-size', 'Tree size', '—') +
        U.metric('dt-recall', 'Recall, malignant', '—'),
      explain: '',
      altLabel: 'Read the tree, the rules and the depth curve as text'
    },

    'deployment': {
      title: 'Deployment demonstration',
      intro: 'The same tree the builder above fits, wrapped in an ' +
             'application. Enter a sample or load a real held-out case, and ' +
             'read the decision path that produced the answer.',
      banner: 'real',
      controls:
        U.slider({ id: 'dp-depth', label: 'Model depth', min: 1, max: 8, value: 3 }) +
        U.slider({ id: 'dp-minleaf', label: 'Minimum samples per leaf',
                   min: 1, max: 40, value: 1 }),
      readout: '',
      explain: '',
      altLabel: 'Read the sample, the prediction and the decision path as text'
    },

    'entropy': {
      title: 'Entropy and information gain',
      intro: 'Move the class balance and the split and watch the arithmetic on ' +
             'the lecture slide change with it.',
      controls:
        U.slider({ id: 'en-n', label: 'Samples in the set', min: 6, max: 40, value: 20 }) +
        U.slider({ id: 'en-mal', label: 'How many are malignant', min: 0, max: 40, value: 8 }) +
        U.slider({ id: 'en-leftn', label: 'Samples going left', min: 1, max: 39, value: 10 }) +
        U.slider({ id: 'en-leftmal', label: 'Malignant among them', min: 0, max: 39, value: 7 }),
      readout:
        U.metric('en-parent', 'Entropy before', '—') +
        U.metric('en-after', 'Weighted entropy after', '—') +
        U.metric('en-gain', 'Information gain', '—'),
      explain: '',
      altLabel: 'Read the entropy values as text'
    },

    'leakage': {
      title: 'Can you spot the leakage?',
      intro: 'Eight pipelines to judge, then a live measurement of what leakage ' +
             'actually costs on data whose true signal you control.',
      banner: 'real',
      controls:
        U.slider({ id: 'lk-signal', label: 'True signal strength', min: 0, max: 150, value: 0, step: 5 }) +
        U.slider({ id: 'lk-nfeat', label: 'Number of features', min: 50, max: 2000, value: 300, step: 50 }),
      readout:
        U.metric('lk-score', 'Your judgements', '0 / 0') +
        U.metric('lk-leaky', 'Leaky protocol reports', '—') +
        U.metric('lk-honest', 'Honest protocol reports', '—'),
      explain:
        '<div data-leak-measure>' +
          '<h4 style="margin-top:0">Live measurement</h4>' +
          '<p>A dataset of 100 samples is generated in your browser. Only the ' +
          'first five features carry any signal, and the slider controls how ' +
          'much. Two protocols are then run on it: one selects the ten best ' +
          'features using the whole dataset before cross-validating, the other ' +
          'selects inside each training fold. Set the signal strength to zero ' +
          'and the honest answer is exactly 50%.</p>' +
          '<div data-measure-stage></div>' +
          '<div data-measure-note style="margin-top:var(--s4)"></div>' +
        '</div>',
      altLabel: 'Read every pipeline and the measurement as text'
    },

    'data-splitter': {
      title: 'Biological data splitter',
      intro: 'Change the test size, the seed, and whether the split is stratified or ' +
             'group-aware. Watch what happens to a patient\'s samples, and to the score.',
      banner: 'week3-sim',
      controls:
        U.slider({ id: 'ds-test', label: 'Test size', min: 10, max: 50, value: 30, step: 5 }) +
        U.slider({ id: 'ds-seed', label: 'Random seed', min: 42, max: 61, value: 42 }) +
        U.checkbox({ id: 'ds-strat', label: 'Stratified (keep the class ratio)', checked: true }) +
        U.segmented({ id: 'ds-unit', label: 'Unit of splitting', value: 'row',
          options: [{ value: 'row', label: 'By sample (row)' },
                    { value: 'patient', label: 'By patient (group-aware)' }] }),
      readout:
        U.metric('ds-shared', 'Patients on both sides', '—') +
        U.metric('ds-leak', 'Test samples with a sibling in training', '—') +
        U.metric('ds-acc', 'Accuracy, this split', '—') +
        U.metric('ds-avg', 'Accuracy, 20 seeds', '—'),
      explain: '<p><strong>Predict first:</strong> a classifier is tested on samples from ' +
        'patients it has already seen in training. Will its score be higher or lower than ' +
        'on genuinely new patients? Start with "By sample", then switch to "By patient".</p>',
      altLabel: 'Read where every patient\'s samples went as text'
    },

    'cv-explorer': {
      title: 'Cross-validation explorer',
      intro: 'Change the number of folds and whether they are stratified. Watch the ' +
             'individual fold scores, not just their mean.',
      banner: 'week3-real',
      controls:
        U.slider({ id: 'cv-k', label: 'Number of folds, k', min: 2, max: 10, value: 5 }) +
        U.segmented({ id: 'cv-strat', label: 'Folds', value: 's',
          options: [{ value: 's', label: 'Stratified' }, { value: 'p', label: 'Not stratified' }] }) +
        U.select({ id: 'cv-model', label: 'Model', value: 'tree_d3',
          options: [
            { value: 'tree_d3', label: 'Decision tree, max_depth = 3' },
            { value: 'knn5', label: 'k-NN, k = 5, standardised' },
            { value: 'tree_full', label: 'Decision tree, unpruned' },
            { value: 'baseline', label: 'Majority-class baseline' }] }),
      readout:
        U.metric('cv-mean', 'Mean accuracy', '—') +
        U.metric('cv-sd', 'Spread (sd)', '—') +
        U.metric('cv-range', 'Lowest to highest fold', '—') +
        U.metric('cv-train', 'Training rows per fold', '—'),
      explain: '<p><strong>Predict first:</strong> at k = 5 the tree averages 91.7%. Will ' +
        'every fold be close to that? Then try k = 2 and k = 10, and switch stratification off.</p>',
      altLabel: 'Read every fold score as text'
    },

    'pipeline-builder': {
      title: 'Pipeline builder: Scaler, then feature selector, then model',
      intro: 'Click a step to move it between "fitted once on all rows" and "inside the ' +
             'Pipeline". Each step that learns from data must sit inside, and the score alone ' +
             'will not tell you when one does not.',
      banner: 'week3-real-noise',
      controls:
        U.segmented({ id: 'pb-data', label: 'Data', value: 'noise',
          options: [{ value: 'noise', label: 'Pure noise, random labels' },
                    { value: 'wdbc', label: 'Real WDBC' }] }) +
        U.segmented({ id: 'pb-scaler', label: 'StandardScaler', value: 'in',
          options: [{ value: 'in', label: 'Inside' }, { value: 'out', label: 'Before CV' }] }) +
        U.segmented({ id: 'pb-selector', label: 'SelectKBest', value: 'out',
          options: [{ value: 'in', label: 'Inside' }, { value: 'out', label: 'Before CV' },
                    { value: 'none', label: 'Not used' }] }),
      readout:
        U.metric('pb-reported', 'Reported CV accuracy', '—') +
        U.metric('pb-honest', 'Honest CV accuracy', '—') +
        U.metric('pb-infl', 'Inflation', '—') +
        U.metric('pb-truth', 'Reference point', '—'),
      explain: '<p>The builder starts the way the lecture suggests: with the feature selector ' +
        'outside the Pipeline. Read the warning, then move it inside.</p>',
      altLabel: 'Read every configuration and its score as text'
    },

    'hyperparameter': {
      title: 'Hyperparameter explorer',
      intro: 'Sweep max_depth or k and watch training, cross-validation and final-test ' +
             'accuracy behave differently. Only one of them is allowed to choose.',
      banner: 'week3-real',
      controls:
        U.segmented({ id: 'hp-model', label: 'Model', value: 'tree',
          options: [{ value: 'tree', label: 'Decision tree: max_depth' },
                    { value: 'knn', label: 'k-NN: k' }] }) +
        U.slider({ id: 'hp-v', label: 'max_depth', min: 1, max: 12, value: 3 }) +
        U.checkbox({ id: 'hp-reveal', label: 'Show the final-test accuracy (look once, after choosing)',
                     checked: false }),
      readout:
        U.metric('hp-train', 'Training', '—') +
        U.metric('hp-cv', 'Cross-validation', '—') +
        U.metric('hp-test', 'Final test', 'hidden') +
        U.metric('hp-best', 'Chosen by CV', '—'),
      explain: '<p><strong>Your turn:</strong> find the point where the training curve keeps ' +
        'climbing and the cross-validation curve does not. Which depth, or which k, would you ' +
        'actually choose, and why?</p>',
      altLabel: 'Read training, CV and test accuracy for every value as text'
    },

    'wdbc-e2e': {
      title: 'WDBC end-to-end experiment',
      intro: 'Baseline, decision tree, k-NN, cross-validation, tuning, one final test, and ' +
             'the confusion matrix it produces: the lab\'s Task 8 onward, step by step.',
      banner: 'week3-real',
      controls:
        U.slider({ id: 'e2e-s', label: 'Step', min: 1, max: 7, value: 1 }) +
        '<div class="control"><span class="control-label">Move</span><div class="flex">' +
          '<button type="button" class="btn btn-sm" data-e2e-prev data-opt="prev">Back</button>' +
          '<button type="button" class="btn btn-sm" data-e2e-next data-opt="next">Next step</button>' +
        '</div></div>' +
        U.segmented({ id: 'e2e-final', label: 'Model taken to the final test', value: 'tree',
          options: [{ value: 'tree', label: 'Tuned tree' }, { value: 'knn', label: 'Tuned k-NN' }] }),
      readout:
        U.metric('e2e-step', 'Step', '—') +
        U.metric('e2e-test', 'Final test set', '—') +
        U.metric('e2e-choice', 'Model chosen', '—') +
        U.metric('e2e-report', 'Number you may report', '—'),
      explain: '',
      altLabel: 'Read the current step and its numbers as text'
    },

    'bayes': {
      title: 'Diagnostic test and prevalence explorer',
      intro: 'A test does not have one accuracy. It has two error rates, and ' +
             'what a positive result means depends on who you tested. Change ' +
             'the population and watch the same test change meaning.',
      banner: 'week4-exact',
      controls:
        U.select({ id: 'by-preset', label: 'Start from', value: 'lecture',
          options: [
            { value: 'lecture', label: 'Lecture example: 1% prevalence, 95% / 95%' },
            { value: 'screening', label: 'Population screening, rare condition' },
            { value: 'wdbc', label: 'The WDBC cohort (37.3% malignant)' },
            { value: 'clinic', label: 'A symptomatic clinic' },
            { value: 'rare', label: 'Very rare condition, near-perfect test' }] }) +
        U.select({ id: 'by-n', label: 'People tested', value: '1000',
          options: [
            { value: '1000', label: '1,000' },
            { value: '10000', label: '10,000' },
            { value: '100000', label: '100,000' }] }) +
        U.slider({ id: 'by-prev', label: 'Prevalence', min: 0.05, max: 50, value: 1, step: 0.05 }) +
        U.slider({ id: 'by-sens', label: 'Sensitivity', min: 50, max: 99.9, value: 95, step: 0.1 }) +
        U.slider({ id: 'by-spec', label: 'Specificity', min: 50, max: 99.9, value: 95, step: 0.1 }),
      readout:
        U.metric('by-tp', 'TP', '—', ' ') +
        U.metric('by-fp', 'FP', '—', ' ') +
        U.metric('by-tn', 'TN', '—', ' ') +
        U.metric('by-fn', 'FN', '—', ' ') +
        U.metric('by-ppv', 'PPV', '—', ' ') +
        U.metric('by-npv', 'NPV', '—', ' ') +
        U.metric('by-acc', 'Accuracy', '—', ' '),
      explain: '<p><strong>Before you touch anything:</strong> the test is 95% ' +
        'sensitive and 95% specific, and 1% of the people tested have the ' +
        'condition. Guess the PPV, then read it off. Then move only the ' +
        'prevalence slider and ask: what changed, the test or the population?</p>',
      altLabel: 'Read the frequencies and predictive values as text'
    },

    'cm-calc': {
      title: 'Confusion-matrix calculator: four questions, four denominators',
      intro: 'Enter four counts, or start from a preset. Rows are what is true; ' +
             'columns are what the test says. Choose a metric to highlight the ' +
             'cells it divides by.',
      controls:
        U.select({ id: 'cm-preset', label: 'Start from', value: 'lecture',
          options: [
            { value: 'lecture', label: 'Lecture example: 10,000 people, 1%, 95% / 95%' },
            { value: 'wdbc', label: 'WDBC logistic regression, test set (lab Task 1)' },
            { value: 'zero', label: 'Edge case: nobody has the condition' },
            { value: 'custom', label: 'Your own counts' }] }) +
        '<div class="control"><label for="cm-tp">TP (ill, test positive)</label>' +
        '<input type="number" id="cm-tp" min="0" step="1" value="95" inputmode="numeric"></div>' +
        '<div class="control"><label for="cm-fn">FN (ill, test negative)</label>' +
        '<input type="number" id="cm-fn" min="0" step="1" value="5" inputmode="numeric"></div>' +
        '<div class="control"><label for="cm-fp">FP (healthy, test positive)</label>' +
        '<input type="number" id="cm-fp" min="0" step="1" value="495" inputmode="numeric"></div>' +
        '<div class="control"><label for="cm-tn">TN (healthy, test negative)</label>' +
        '<input type="number" id="cm-tn" min="0" step="1" value="9405" inputmode="numeric"></div>' +
        U.segmented({ id: 'cm-focus', label: 'Highlight the denominator of', value: 'sens',
          options: [
            { value: 'sens', label: 'Sensitivity' }, { value: 'spec', label: 'Specificity' },
            { value: 'ppv', label: 'PPV' }, { value: 'npv', label: 'NPV' }] }),
      readout:
        U.metric('cm-sens', 'Sensitivity', '—', ' ') +
        U.metric('cm-spec', 'Specificity', '—', ' ') +
        U.metric('cm-ppv', 'PPV', '—', ' ') +
        U.metric('cm-npv', 'NPV', '—', ' '),
      explain: '<p><strong>Sensitivity</strong> = TP / (TP + FN) and ' +
        '<strong>specificity</strong> = TN / (TN + FP) divide within a row: they ' +
        'ask how the test behaves given the true status. <strong>PPV</strong> = ' +
        'TP / (TP + FP) and <strong>NPV</strong> = TN / (TN + FN) divide within a ' +
        'column: they ask what a result means.</p>',
      altLabel: 'Read the matrix and the four metrics as text'
    },

    'wdbc-models': {
      title: 'WDBC: two models, similar discrimination, different probabilities',
      intro: 'The lab\'s two models on the WDBC final test set (171 cases): ' +
             'logistic regression and Gaussian naive Bayes. Compare their ' +
             'reliability diagrams and how their predictions are spread.',
      banner: 'week4-real',
      controls:
        U.segmented({ id: 'wd-model', label: 'Model', value: 'logreg',
          options: [
            { value: 'logreg', label: 'Logistic regression' },
            { value: 'gnb', label: 'Gaussian naive Bayes' }] }),
      readout:
        U.metric('wd-acc', 'Accuracy', '—', ' ') +
        U.metric('wd-auc', 'AUC', '—', ' ') +
        U.metric('wd-brier', 'Brier score', '—', ' ') +
        U.metric('wd-ext', 'Extreme predictions', '—', ' ') +
        U.metric('wd-ss', 'Sensitivity / specificity', '—', ' '),
      explain: '<p><strong>Brier score</strong> = the mean squared difference ' +
        'between the predicted probability and the outcome (0 or 1); lower is ' +
        'better, and it rewards probabilities that match observed frequencies.</p>',
      altLabel: 'Read the reliability bins and histogram as text'
    },

    'prevalence': {
      title: 'Prevalence explorer: one test, five populations',
      intro: 'The same test is used in five populations of 100,000 people. Each ' +
             'bar is everyone who tested positive; the amber share is the ' +
             'fraction who are really ill, which is the PPV.',
      banner: 'week4-exact',
      controls:
        U.slider({ id: 'pv-sens', label: 'Sensitivity', min: 50, max: 99.9, value: 99, step: 0.1 }) +
        U.slider({ id: 'pv-spec', label: 'Specificity', min: 50, max: 99.9, value: 99, step: 0.1 }) +
        U.slider({ id: 'pv-custom', label: 'Your own prevalence', min: 0.05, max: 50, value: 5, step: 0.05 }),
      readout:
        U.metric('pv-a', 'PPV at 0.1%', '—', ' ') +
        U.metric('pv-b', 'PPV at 1%', '—', ' ') +
        U.metric('pv-c', 'PPV at 10%', '—', ' ') +
        U.metric('pv-d', 'PPV at 37.3%', '—', ' '),
      explain: '<p><strong>Predict first:</strong> the test is 99% sensitive and ' +
        '99% specific. In a population where 1 in 1,000 people is ill, what ' +
        'fraction of positive results are real? Then lower the specificity to ' +
        '95% and watch which bars change most.</p>',
      altLabel: 'Read the counts for every population as text'
    },

    'threshold': {
      title: 'Decision threshold explorer',
      intro: 'A model outputs a probability. A decision needs a threshold. ' +
             'Drag it and watch missed cases trade against false alarms.',
      banner: 'week4-sim',
      controls:
        U.slider({ id: 'th-t', label: 'Threshold', min: 0.05, max: 0.95, value: 0.5, step: 0.01 }) +
        U.select({ id: 'th-preset', label: 'Jump to', value: '0.5',
          options: [
            { value: '0.2', label: '0.2 (screening-like)' },
            { value: '0.5', label: '0.5 (the default)' },
            { value: '0.8', label: '0.8 (confirmatory-like)' }] }),
      readout:
        U.metric('th-tp', 'True positives', '—', ' ') +
        U.metric('th-fp', 'False positives', '—', ' ') +
        U.metric('th-tn', 'True negatives', '—', ' ') +
        U.metric('th-fn', 'False negatives', '—', ' ') +
        U.metric('th-sens', 'Sensitivity', '—', ' ') +
        U.metric('th-spec', 'Specificity', '—', ' ') +
        U.metric('th-ppv', 'PPV', '—', ' ') +
        U.metric('th-npv', 'NPV', '—', ' '),
      explain: '<p><strong>Ask yourself first:</strong> in this setting, ' +
        'would you rather miss a true case or raise a false alarm? Set the ' +
        'threshold that matches your answer, then justify it.</p>',
      altLabel: 'Read the outcomes at each threshold as text'
    },

    'calibration': {
      title: 'Calibration explorer: is 0.8 really 80%?',
      intro: 'A probability is a claim. If a model says 0.8 for a hundred ' +
             'cases, about eighty of them should turn out positive. Distort ' +
             'the model and see which numbers change and which do not.',
      banner: 'week4-sim',
      controls:
        U.segmented({ id: 'cal-model', label: 'Model', value: 'A',
          options: [
            { value: 'A', label: 'A: calibrated' },
            { value: 'B', label: 'B: over-confident' },
            { value: 'C', label: 'C: under-confident' },
            { value: 'D', label: 'D: shifted up' }] }) +
        U.slider({ id: 'cal-k', label: 'Confidence factor', min: 0.3, max: 3, value: 1, step: 0.05 }) +
        U.slider({ id: 'cal-shift', label: 'Shift (log-odds)', min: -1.5, max: 1.5, value: 0, step: 0.1 }) +
        U.select({ id: 'cal-bins', label: 'Bins', value: '10',
          options: [{ value: '5', label: '5' }, { value: '10', label: '10' }] }),
      readout:
        U.metric('cal-acc', 'Accuracy', '—', ' ') +
        U.metric('cal-auc', 'AUC', '—', ' ') +
        U.metric('cal-brier', 'Brier score', '—', ' ') +
        U.metric('cal-ece', 'Calibration error', '—', ' ') +
        U.metric('cal-08', 'Scored ~0.8, positive', '—', ' '),
      explain: '<p><strong>Which model\'s probability would you trust?</strong> ' +
        'Models A and B have the same accuracy and the same AUC. Compare ' +
        'their reliability diagrams before deciding.</p>',
      altLabel: 'Read the calibration bins as text'
    },

    'nb-bayes': {
      title: 'A. From Bayes to a classifier: one word as evidence',
      intro: 'Week 4\'s Bayes calculator with new labels. The prior is the share ' +
             'of Class I texts; the evidence is one word in the reason text.',
      banner: 'week5-sim',
      controls:
        U.select({ id: 'nbb-word', label: 'Evidence word (worked example)', value: 'listeria',
          options: [
            { value: 'listeria', label: '“listeria”: 4/12 vs 1/14' },
            { value: 'undeclared', label: '“undeclared”: 4/12 vs 2/14' },
            { value: 'label', label: '“label”: 2/12 vs 5/14' },
            { value: 'neutral', label: 'a word equally likely in both' },
            { value: 'custom', label: 'your own likelihoods (move a slider)' }] }) +
        U.slider({ id: 'nbb-p', label: 'Prior P(Class I)', min: 0.05, max: 0.95, value: 0.4, step: 0.01 }) +
        U.slider({ id: 'nbb-a', label: 'P(word | Class I)', min: 0.01, max: 0.6, value: 0.333, step: 0.001 }) +
        U.slider({ id: 'nbb-b', label: 'P(word | Class II/III)', min: 0.01, max: 0.6, value: 0.071, step: 0.001 }),
      readout:
        U.metric('nbb-prior', 'Prior P(Class I)', '—', ' ') +
        U.metric('nbb-lr', 'Likelihood ratio', '—', ' ') +
        U.metric('nbb-post', 'Posterior P(Class I | word)', '—', ' '),
      explain: '<p><strong>Predict first:</strong> the word “listeria” is about ' +
        'five times more likely in a Class I text. Starting from a 40% prior, ' +
        'will the posterior be above or below 75%?</p>',
      altLabel: 'Read the calculation as text'
    },

    'nb-evidence': {
      title: 'B. Naive Bayes evidence explorer: four words, by hand',
      intro: 'The lecture\'s worked example. Build a short text from four words ' +
             'and watch the evidence for each class accumulate, one word at a time.',
      banner: 'week5-sim',
      controls:
        '<div class="control"><span class="control-label" id="nbe-add-label">Add a word</span>' +
        '<div class="flex" role="group" aria-labelledby="nbe-add-label">' +
          '<button type="button" class="btn btn-sm" data-nbe-add="listeria">listeria</button>' +
          '<button type="button" class="btn btn-sm" data-nbe-add="undeclared">undeclared</button>' +
          '<button type="button" class="btn btn-sm" data-nbe-add="label">label</button>' +
          '<button type="button" class="btn btn-sm" data-nbe-add="packaging">packaging</button>' +
          '<button type="button" class="btn btn-sm" data-nbe-clear>Clear the text</button>' +
        '</div><p class="small mb0" aria-live="polite">Text: <strong class="mono" data-nbe-doc></strong></p></div>' +
        U.segmented({ id: 'nbe-alpha', label: 'Smoothing', value: '1',
          options: [{ value: '1', label: 'Laplace (alpha = 1)' }, { value: '0', label: 'None (alpha = 0)' }] }) +
        U.slider({ id: 'nbe-reps', label: 'Repeat the text (copies)', min: 1, max: 400, value: 1, step: 1 }),
      readout:
        U.metric('nbe-post', 'Posterior P(Class I)', '—', ' ') +
        U.metric('nbe-prod', 'Score, multiplied', '—', ' ') +
        U.metric('nbe-log', 'Score, as a sum of logs', '—', ' '),
      explain: '<p><strong>Predict first:</strong> “undeclared label” gives Class I a ' +
        'posterior of 0.421. Add “listeria”. Which way does it move, and by how much? ' +
        'Then switch smoothing off.</p>',
      altLabel: 'Read the scores as text'
    },

    'text-repr': {
      title: 'C. Text representation explorer: from words to a matrix',
      intro: 'Before naive Bayes can count anything, a vectorizer turns each text ' +
             'into a row of numbers. Edit the texts and watch the vocabulary and ' +
             'the matrix change.',
      banner: 'week5-text',
      controls:
        U.select({ id: 'tr-preset', label: 'Start from', value: 'real',
          options: [
            { value: 'real', label: 'Three real recall reasons (I, I, II)' },
            { value: 'allergen', label: 'Real: “undeclared” in Class III, II and I' },
            { value: 'order', label: 'Illustrative: word order and negation' },
            { value: 'custom', label: 'Your own texts' }] }) +
        U.segmented({ id: 'tr-mode', label: 'Representation', value: 'count',
          options: [{ value: 'count', label: 'Counts' }, { value: 'binary', label: 'Presence' },
            { value: 'tfidf', label: 'TF-IDF' }] }) +
        '<div class="control" style="flex-basis:100%"><label for="tr-doc0">Text 1</label>' +
        '<textarea id="tr-doc0" rows="2"></textarea></div>' +
        '<div class="control" style="flex-basis:100%"><label for="tr-doc1">Text 2</label>' +
        '<textarea id="tr-doc1" rows="2"></textarea></div>' +
        '<div class="control" style="flex-basis:100%"><label for="tr-doc2">Text 3</label>' +
        '<textarea id="tr-doc2" rows="2"></textarea></div>',
      readout:
        U.metric('tr-vocab', 'Vocabulary', '—', ' ') +
        U.metric('tr-nz', 'Non-zero cells', '—', ' ') +
        U.metric('tr-drop', 'Dropped tokens', '—', ' ') +
        U.metric('tr-same', 'Identical rows', '—', ' '),
      explain: '<p>Tokens follow scikit-learn\'s default rule: lowercase, then every ' +
        'run of two or more letters or digits. The same rule is used in the lab.</p>',
      altLabel: 'Read the vocabulary and the matrix as text'
    },

    'naive-bayes': {
      title: 'The Week 5 classifier, trained in your browser',
      intro: 'CountVectorizer + MultinomialNB, fitted to the 7,117 training texts ' +
             'of the frozen openFDA snapshot and tested on 2,373 texts from other ' +
             'recall events. At alpha = 1 it is the lab\'s model, with the lab\'s numbers.',
      banner: 'week5-live',
      controls:
        U.segmented({ id: 'nb-view', label: 'View', value: 'words',
          options: [
            { value: 'words', label: 'Words' },
            { value: 'errors', label: 'Errors' },
            { value: 'probs', label: 'Probabilities' }] }) +
        U.slider({ id: 'nb-alpha', label: 'Smoothing (alpha)', min: 0, max: 5, value: 1, step: 0.05 }) +
        U.select({ id: 'nb-mindf', label: 'Words view: used in at least', value: '20',
          options: [
            { value: '1', label: '1 training text (every word)' },
            { value: '10', label: '10 training texts' },
            { value: '20', label: '20 training texts' },
            { value: '50', label: '50 training texts' }] }),
      readout:
        U.metric('nb-acc', 'Test accuracy', '—', ' ') +
        U.metric('nb-pr', 'Precision / recall', '—', ' ') +
        U.metric('nb-auc', 'ROC AUC', '—', ' ') +
        U.metric('nb-ext', 'Extreme predictions', '—', ' ') +
        U.metric('nb-vocab', 'Vocabulary', '—', ' '),
      explain:
        '<div class="field" style="max-width:60ch">' +
          '<label for="nb-probe">Score a text of your own</label>' +
          '<textarea id="nb-probe" rows="2">Product may be contaminated with Listeria monocytogenes.</textarea>' +
          '<div class="field-hint">Words the model never saw in training are ignored. ' +
          'Try a negation, or a word that is not in the vocabulary.</div>' +
        '</div>' +
        '<div class="flex" style="margin-bottom:var(--s5)">' +
          '<button type="button" class="btn btn-sm" data-nb-example="Product may be contaminated with Listeria monocytogenes.">Pathogen</button>' +
          '<button type="button" class="btn btn-sm" data-nb-example="Product contains undeclared milk.">Allergen</button>' +
          '<button type="button" class="btn btn-sm" data-nb-example="Products may contain metal fragments">Foreign body</button>' +
          '<button type="button" class="btn btn-sm" data-nb-example="No Listeria monocytogenes was found in the product.">Negation</button>' +
          '<button type="button" class="btn btn-sm" data-nb-example="quixotic bioluminescent perambulation">Unknown words</button>' +
        '</div>' +
        '<div data-nb-probe></div>',
      altLabel: 'Read the words, the errors and the probabilities as text'
    },

    'nb-leakage': {
      title: 'D. Leakage explorer: the whole pipeline must not learn from the test set',
      intro: 'The same vectorizer and the same model, run three ways on the same ' +
             'snapshot. Only the order of the steps and the unit of the split change.',
      banner: 'week5-measured',
      controls:
        U.segmented({ id: 'lk-v', label: 'Pipeline', value: 'correct',
          options: [
            { value: 'correct', label: 'Correct' },
            { value: 'vocab', label: 'Vectorizer fitted on all text' },
            { value: 'records', label: 'Split by product record' }] }),
      readout:
        U.metric('lk-acc', 'Accuracy', '—', ' ') +
        U.metric('lk-f1', 'F1 for Class I', '—', ' ') +
        U.metric('lk-auc', 'ROC AUC', '—', ' ') +
        U.metric('lk-ident', 'Test text already in training', '—', ' '),
      explain: '<p><strong>Predict first:</strong> which of the two mistakes will ' +
        'inflate the score more, fitting the vocabulary on all the text, or ' +
        'splitting by product record instead of by recall event?</p>',
      altLabel: 'Read the three pipelines and their results as text'
    },

    'nb-compare': {
      title: 'E. Model comparison: naive Bayes, its variants and a pretrained encoder',
      intro: 'Five models, one split, one test set. Choose the metric, then read ' +
             'the cost table before deciding anything.',
      banner: 'week5-measured',
      controls:
        U.select({ id: 'cmp-metric', label: 'Metric', value: 'accuracy',
          options: [
            { value: 'accuracy', label: 'Accuracy' },
            { value: 'f1', label: 'F1 for Class I' },
            { value: 'precision', label: 'Precision for Class I' },
            { value: 'recall', label: 'Recall for Class I' },
            { value: 'rocAuc', label: 'ROC AUC' },
            { value: 'averagePrecision', label: 'Average precision' },
            { value: 'brier', label: 'Brier score (lower is better)' }] }),
      readout:
        U.metric('cmp-nb', 'Naive Bayes', '—', ' ') +
        U.metric('cmp-lm', 'Pretrained encoder', '—', ' ') +
        U.metric('cmp-diff', 'Encoder minus naive Bayes', '—', ' '),
      explain: '<div data-cmp-cost></div>',
      altLabel: 'Read every model and metric as a table'
    },

    'data-quality': {
      title: 'Nutrition and clinical data quality explorer',
      intro: 'Real data, damaged in a known and controlled way, so that the ' +
             'cost of each repair can be measured rather than argued about.',
      banner: 'real',
      controls:
        U.slider({ id: 'dq-missing', label: 'Cells missing', min: 0, max: 45, value: 15 }) +
        U.segmented({ id: 'dq-mechanism', label: 'Missingness mechanism', value: 'mnar',
          options: [{ value: 'mcar', label: 'At random' },
                    { value: 'mnar', label: 'Not at random' }] }) +
        U.slider({ id: 'dq-outliers', label: 'Outlier contamination', min: 0, max: 25, value: 5 }) +
        U.slider({ id: 'dq-imbalance', label: 'Malignant rows removed', min: 0, max: 90, value: 0, step: 5 }) +
        U.select({ id: 'dq-impute', label: 'Handle missing values by', value: 'median',
          options: [
            { value: 'median', label: 'Median imputation' },
            { value: 'mean', label: 'Mean imputation' },
            { value: 'zero', label: 'Filling with zero' },
            { value: 'drop', label: 'Complete-case analysis' }] }) +
        U.segmented({ id: 'dq-balance', label: 'Class balancing', value: 'none',
          options: [{ value: 'none', label: 'None' },
                    { value: 'over', label: 'Oversample' },
                    { value: 'under', label: 'Undersample' }] }) +
        U.checkbox({ id: 'dq-indicator', label: 'Add missingness indicators', checked: false }) +
        U.checkbox({ id: 'dq-removeoutliers', label: 'Remove outliers (IQR rule)', checked: false }) +
        U.checkbox({ id: 'dq-scale', label: 'Standardise features', checked: true }),
      readout:
        U.metric('dq-acc', 'Accuracy', '—') +
        U.metric('dq-delta', 'Cost of the damage', '—') +
        U.metric('dq-rows', 'Rows available', '—') +
        U.metric('dq-counts', 'Class counts', '—') +
        U.metric('dq-recall', 'Recall, malignant', '—'),
      explain: '',
      altLabel: 'Read the measured scores as text'
    },

    'pca': {
      title: 'Exercise 2. PCA visualiser (WDBC)',
      intro: 'Principal components computed in your browser from the real WDBC ' +
             'data, with the downstream cost of the reduction measured properly.',
      banner: 'real',
      controls:
        U.checkbox({ id: 'pca-standardise', label: 'Standardise first', checked: true }) +
        U.checkbox({ id: 'pca-loadings', label: 'Show feature loadings', checked: true }) +
        U.select({ id: 'pca-cx', label: 'Horizontal axis', value: '0',
          options: [0,1,2,3,4,5].map(function (i) {
            return { value: String(i), label: 'PC' + (i + 1) };
          }) }) +
        U.select({ id: 'pca-cy', label: 'Vertical axis', value: '1',
          options: [0,1,2,3,4,5].map(function (i) {
            return { value: String(i), label: 'PC' + (i + 1) };
          }) }),
      readout:
        U.metric('pca-two', 'Variance in PC1 + PC2', '—') +
        U.metric('pca-pair', 'Variance in the plotted pair', '—') +
        U.metric('pca-90', 'To reach 90%', '—') +
        U.metric('pca-two-acc', 'Accuracy on 2 components', '—') +
        U.metric('pca-best', 'Best accuracy', '—'),
      explain: '',
      altLabel: 'Read the variance spectrum and accuracy curve as text'
    },

    /* ---- Week 7 (refreshed 2026/27): dimensionality reduction and protein representations.
       Real data throughout (2,000 human Swiss-Prot proteins, ESM-2 8M); the lecture's
       "Try this interactively" slides point at these anchors. */
    'w7-curse': {
      title: 'Exercise 1. Distances concentrate in high dimensions',
      intro: 'Points scattered uniformly in a d-dimensional cube: the histogram shows every point\'s distance from one ' +
             'query, divided by the mean. Predict first: as d grows, what happens to the gap between nearest and farthest?',
      banner: 'week7-mixed',
      controls:
        U.slider({ id: 'w7c-di', label: 'Dimensions', min: 0, max: 11, value: 1 }),
      readout:
        U.metric('w7c-d', 'Dimensions', '—', ' ') + U.metric('w7c-ratio', 'Farthest ÷ nearest', '—', ' ') +
        U.metric('w7c-rc', 'Relative contrast', '—', ' '),
      explain: '',
      altLabel: 'Read the distances for every dimension as text'
    },

    'w7-pca': {
      title: 'Exercise 3. PCA on protein representations: components, variance and scaling',
      intro: 'The explained-variance spectrum of the 23 classical descriptors and of the 320-dimensional ESM-2 embedding. ' +
             'Change the number of components kept, and switch standardisation off. The lower panel shows what k-NN keeps.',
      banner: 'week7-real',
      controls:
        U.segmented({ id: 'w7p-rep', label: 'Representation', value: 'classical',
          options: [{ value: 'classical', label: 'Classical (23)' }, { value: 'esm2', label: 'ESM-2 (320)' }] }) +
        U.segmented({ id: 'w7p-scale', label: 'Before PCA', value: 'standard',
          options: [{ value: 'standard', label: 'Standardise' }, { value: 'none', label: 'Centre only' }] }) +
        U.slider({ id: 'w7p-k', label: 'Components kept', min: 1, max: 23, value: 2 }) +
        U.segmented({ id: 'w7p-task', label: 'k-NN task (lower panel)', value: 'signal_peptide',
          options: [{ value: 'signal_peptide', label: 'Signal peptide' }, { value: 'transmembrane', label: 'Transmembrane' }] }),
      readout:
        U.metric('w7p-var', 'Variance kept', '—', ' ') + U.metric('w7p-90', 'For 90%', '—', ' ') +
        U.metric('w7p-pc1', 'PC1', '—', ' ') + U.metric('w7p-nb', 'Neighbours kept', '—', ' '),
      explain: '',
      altLabel: 'Read the spectrum and the k-NN results as text'
    },

    'w7-map': {
      title: 'Exercise 6. Protein map explorer: PCA, t-SNE and UMAP of three representations',
      intro: 'The same 2,000 proteins drawn from composition, classical descriptors or ESM-2, by PCA, t-SNE or UMAP. ' +
             'Choose a protein: its 10 nearest neighbours in the full space are ringed. Do they stay near it in the picture?',
      banner: 'week7-real',
      controls:
        U.segmented({ id: 'w7m-rep', label: 'Representation', value: 'esm2',
          options: [{ value: 'composition', label: 'Composition' }, { value: 'classical', label: 'Classical' },
                    { value: 'esm2', label: 'ESM-2' }] }) +
        U.segmented({ id: 'w7m-method', label: 'Method', value: 'pca',
          options: [{ value: 'pca', label: 'PCA' }, { value: 'tsne', label: 't-SNE' }, { value: 'umap', label: 'UMAP' }] }) +
        U.segmented({ id: 'w7m-colour', label: 'Colour by', value: 'sp',
          options: [{ value: 'sp', label: 'Signal peptide' }, { value: 'tm', label: 'Transmembrane' },
                    { value: 'length', label: 'Length' }, { value: 'test', label: 'Split' }] }) +
        U.select({ id: 'w7m-q', label: 'Protein', value: '', options: [] }),
      readout:
        U.metric('w7m-trust', 'Trustworthiness', '—', ' ') + U.metric('w7m-kept', 'Neighbours near in 2-D', '—', ' ') +
        U.metric('w7m-dims', 'Reduction', '—', ' '),
      explain: '',
      altLabel: 'Read the chosen protein\'s neighbours as text'
    },

    'w7-tsne': {
      title: 'Exercise 4. t-SNE: perplexity, seed and initialisation',
      intro: 'Six perplexities, and for perplexity 30 three seeds with PCA initialisation and two with random ' +
             'initialisation, all of the same ESM-2 embeddings. Which features of the picture survive every setting?',
      banner: 'week7-real',
      controls:
        U.segmented({ id: 'w7t-perp', label: 'Perplexity', value: '30',
          options: ['2', '5', '15', '30', '50', '100'].map(function (v) { return { value: v, label: v }; }) }) +
        U.segmented({ id: 'w7t-run', label: 'Initialisation and seed (perplexity 30)', value: 'pca|0',
          options: [{ value: 'pca|0', label: 'PCA, 0' }, { value: 'pca|1', label: 'PCA, 1' }, { value: 'pca|2', label: 'PCA, 2' },
                    { value: 'random|1', label: 'Random, 1' }, { value: 'random|2', label: 'Random, 2' }] }) +
        U.segmented({ id: 'w7t-colour', label: 'Colour by', value: 'sp',
          options: [{ value: 'sp', label: 'Signal peptide' }, { value: 'tm', label: 'Transmembrane' }, { value: 'length', label: 'Length' }] }),
      readout:
        U.metric('w7t-trust', 'Trustworthiness', '—', ' ') + U.metric('w7t-pca', 'PCA 2-D', '—', ' '),
      explain: '',
      altLabel: 'Read the trustworthiness of every t-SNE layout as text'
    },

    'w7-umap': {
      title: 'Exercise 5. UMAP: n_neighbors and min_dist',
      intro: 'Sixteen UMAP layouts of the same ESM-2 embeddings. n_neighbors sets how local the view is; min_dist sets ' +
             'how tightly points may pack. Watch how much the impression of "clusters" depends on the two settings.',
      banner: 'week7-real',
      controls:
        U.segmented({ id: 'w7u-nn', label: 'n_neighbors', value: '15',
          options: ['5', '15', '50', '200'].map(function (v) { return { value: v, label: v }; }) }) +
        U.segmented({ id: 'w7u-md', label: 'min_dist', value: '0.1',
          options: ['0.0', '0.1', '0.5', '0.99'].map(function (v) { return { value: v, label: v }; }) }) +
        U.segmented({ id: 'w7u-seed', label: 'Seed (15, 0.1 only)', value: '0',
          options: [{ value: '0', label: '0' }, { value: '1', label: '1' }] }) +
        U.segmented({ id: 'w7u-colour', label: 'Colour by', value: 'sp',
          options: [{ value: 'sp', label: 'Signal peptide' }, { value: 'tm', label: 'Transmembrane' }, { value: 'length', label: 'Length' }] }),
      readout:
        U.metric('w7u-trust', 'Trustworthiness', '—', ' ') + U.metric('w7u-pca', 'PCA 2-D', '—', ' '),
      explain: '',
      altLabel: 'Read the trustworthiness of every UMAP layout as text'
    },

    'w7-knn': {
      title: 'Exercise 7. k-NN on classical descriptors versus ESM-2 embeddings',
      intro: 'The lab\'s controlled comparison: same proteins, split, folds, Pipeline and grid for every representation. ' +
             'Explore the curves, compare the settings GridSearchCV chose, and only then reveal the test set.',
      banner: 'week7-real',
      controls:
        U.segmented({ id: 'w7k-task', label: 'Task', value: 'signal_peptide',
          options: [{ value: 'signal_peptide', label: 'Signal peptide' }, { value: 'transmembrane', label: 'Transmembrane' }] }) +
        U.segmented({ id: 'w7k-scale', label: 'Scaling (in the Pipeline)', value: 'standard',
          options: [{ value: 'standard', label: 'Standardise' }, { value: 'none', label: 'None' }] }) +
        U.segmented({ id: 'w7k-metric', label: 'Metric', value: 'euclidean',
          options: [{ value: 'euclidean', label: 'Euclidean' }, { value: 'manhattan', label: 'Manhattan' }, { value: 'cosine', label: 'Cosine' }] }) +
        U.segmented({ id: 'w7k-weights', label: 'Voting', value: 'uniform',
          options: [{ value: 'uniform', label: 'Uniform' }, { value: 'distance', label: 'Distance-weighted' }] }) +
        U.checkbox({ id: 'w7k-shuffled', label: 'Add ESM-2 of shuffled sequences (control)', checked: false }) +
        U.checkbox({ id: 'w7k-reveal', label: 'Show the final-test results (look once, after choosing)', checked: false }),
      readout:
        U.metric('w7k-cl', 'Classical, best CV', '—', ' ') + U.metric('w7k-es', 'ESM-2, best CV', '—', ' ') +
        U.metric('w7k-co', 'Composition, best CV', '—', ' ') + U.metric('w7k-test', 'Final test', 'hidden', ' '),
      explain: '<p><strong>Predict first:</strong> will the 320-dimensional learned embedding beat 23 hand-made ' +
        'descriptors under k-NN for both tasks? By how much?</p>',
      altLabel: 'Read every cross-validated value as text'
    },

    'w7-neighbours': {
      title: 'Exercise 8. Nearest neighbours before and after dimensionality reduction',
      intro: 'Pick a protein and compare its 10 nearest neighbours in three spaces side by side: composition, classical ' +
             'descriptors, ESM-2, or ESM-2 after PCA, UMAP or t-SNE. Which neighbours share its annotations?',
      banner: 'week7-real',
      controls:
        U.select({ id: 'w7n-q', label: 'Protein', value: '', options: [] }) +
        ['a', 'b', 'c'].map(function (c, i) {
          return U.select({ id: 'w7n-' + c, label: 'Space ' + (i + 1), value: ['composition', 'esm2', 'esm2_pca10'][i],
            options: [{ value: 'composition', label: 'Composition (20)' }, { value: 'classical', label: 'Classical (23)' },
                      { value: 'esm2', label: 'ESM-2 (320)' }, { value: 'esm2_cosine_raw', label: 'ESM-2, cosine, unscaled' },
                      { value: 'esm2_pca2', label: 'ESM-2 → PCA 2' }, { value: 'esm2_pca10', label: 'ESM-2 → PCA 10' },
                      { value: 'esm2_pca50', label: 'ESM-2 → PCA 50' }, { value: 'esm2_umap2', label: 'ESM-2 → UMAP 2-D' },
                      { value: 'esm2_tsne2', label: 'ESM-2 → t-SNE 2-D' }] });
        }).join(''),
      readout:
        U.metric('w7n-cl', 'Classical vs ESM-2', '—', ' ') + U.metric('w7n-sp', 'SP neighbours that are SP', '—', ' ') +
        U.metric('w7n-p10', 'PCA 10 keeps', '—', ' '),
      explain: '',
      altLabel: 'Read the neighbourhood summary as text'
    },

    'w7-shuffle': {
      title: 'Exercise 9. The residue-shuffling control',
      intro: 'Each protein was also embedded after shuffling its residues: same composition, order destroyed. Compare the ' +
             'hydropathy profiles, see where the shuffled copy lands, and what happens to k-NN.',
      banner: 'week7-real',
      controls:
        U.select({ id: 'w7s-q', label: 'Protein', value: '', options: [] }) +
        U.segmented({ id: 'w7s-view', label: 'View', value: 'profile',
          options: [{ value: 'profile', label: 'Hydropathy profile' }, { value: 'map', label: 'Embedding map' },
                    { value: 'hist', label: 'All distances' }] }),
      readout:
        U.metric('w7s-comp', 'Composition', '—', ' ') + U.metric('w7s-hyd', 'Hydropathy peak', '—', ' ') +
        U.metric('w7s-twin', 'To its shuffled copy', '—', ' ') + U.metric('w7s-near', 'To nearest other', '—', ' '),
      explain: '',
      altLabel: 'Read the composition and the k-NN results as text'
    },

    'embeddings': {
      title: 'Exercise 10 (optional). Simulated embedding explorer',
      intro: 'Two representations, two tasks, one classifier held fixed. The ' +
             'two tasks are built to give opposite answers.',
      banner: 'sim-embed',
      controls:
        U.segmented({ id: 'em-rep', label: 'Representation', value: 'emb',
          options: [{ value: 'emb', label: 'Learned embedding' },
                    { value: 'eng', label: 'Engineered features' }] }) +
        U.segmented({ id: 'em-proj', label: 'Projection', value: 'pca',
          options: [{ value: 'pca', label: 'PCA' },
                    { value: 'umap', label: 'Neighbour layout' }] }) +
        U.segmented({ id: 'em-label', label: 'Colour by', value: 'family',
          options: [{ value: 'family', label: 'Protein family' },
                    { value: 'hasSite', label: 'Ordered triad' }] }),
      readout:
        U.metric('em-acc', 'k-NN accuracy', '—') +
        U.metric('em-lin', 'Linear model', '—') +
        U.metric('em-other', 'Other representation, k-NN', '—') +
        U.metric('em-diff', 'Difference', '—') +
        U.metric('em-chance', 'Chance level', '—'),
      explain: '<div data-emb-detail></div>',
      altLabel: 'Read the four measured accuracies and the family definitions as text'
    },

    /* ---- Week 8: instance-based learning. One canonical implementation each;
       the lecture's "Try this interactively" slides point at these anchors. */
    'knn-vote': {
      title: 'Exercise 1. Nearest neighbour and the k-NN vote',
      intro: 'Click anywhere to place the query. Start at k = 1, then try k = 3 and k = 5 (lecture slides 7 and 15). ' +
             'Flip the nearest neighbour\'s label to inject noise, and shade the decision regions to see the boundary.',
      banner: 'week8-mixed',
      controls:
        U.segmented({ id: 'kv-set', label: 'Points', value: 'lecture',
          options: [{ value: 'lecture', label: 'Lecture example' }, { value: 'heart', label: 'Real patients' }] }) +
        U.slider({ id: 'kv-k', label: 'k', min: 1, max: 25, value: 1 }) +
        '<div class="control"><span class="control-label">Jump to</span><div class="flex">' +
          '<button type="button" class="btn btn-sm" data-kv-k="1">k = 1</button>' +
          '<button type="button" class="btn btn-sm" data-kv-k="3">k = 3</button>' +
          '<button type="button" class="btn btn-sm" data-kv-k="5">k = 5</button></div></div>' +
        U.segmented({ id: 'kv-w', label: 'Voting', value: 'uniform',
          options: [{ value: 'uniform', label: 'Majority' }, { value: 'distance', label: 'Weighted 1/d' }] }) +
        U.checkbox({ id: 'kv-regions', label: 'Shade the decision regions', checked: false }) +
        '<div class="control"><span class="control-label">Noise</span>' +
        '<button type="button" class="btn btn-sm" id="kv-flip">Flip the nearest neighbour\'s label</button></div>',
      readout:
        U.metric('kv-q', 'Query', '—', ' ') + U.metric('kv-nn', 'Nearest distance', '—', ' ') +
        U.metric('kv-tally', 'Votes', '—', ' ') + U.metric('kv-pred', 'Prediction', '—', ' '),
      explain: '<p><strong>Predict first:</strong> on the lecture example, what does k = 1 predict? k = 3? k = 5? ' +
        'Then flip the nearest neighbour\'s label: which of the three answers changes, and why is that the ' +
        'argument for k &gt; 1?</p>',
      altLabel: 'Read the neighbours and the vote as text'
    },

    'knn-regression': {
      title: 'Exercise 2. k-NN regression: averaging the neighbours',
      intro: 'The lecture example first: k = 3 averages 82, 83 and 78 to 81. Then switch on distance weighting ' +
             '(the slides use 1/d², which gives 81.857), and finally predict a real patient\'s maximum heart rate from age.',
      banner: 'week8-mixed',
      controls:
        U.segmented({ id: 'kr-mode', label: 'Data', value: 'lecture',
          options: [{ value: 'lecture', label: 'Lecture example' }, { value: 'heart', label: 'Real patients' }] }) +
        U.slider({ id: 'kr-k', label: 'k', min: 1, max: 7, value: 3 }) +
        U.segmented({ id: 'kr-w', label: 'Average', value: 'uniform',
          options: [{ value: 'uniform', label: 'Plain mean' }, { value: 'distance', label: 'Distance-weighted' }] }) +
        U.slider({ id: 'kr-p', label: 'Exponent p in 1/d^p', min: 0.5, max: 4, value: 2, step: 0.5 }) +
        U.slider({ id: 'kr-age', label: 'Query age', min: 29, max: 77, value: 55 }) +
        U.checkbox({ id: 'kr-rule', label: 'Show the "220 − age" rule', checked: false }),
      readout:
        U.metric('kr-pred', 'Prediction', '—', ' ') + U.metric('kr-nk', 'Neighbours', '—', ' ') +
        U.metric('kr-err', 'Held-out error', '—', ' '),
      explain: '',
      altLabel: 'Read the neighbours, weights and errors as text'
    },

    'distance-calc': {
      title: 'Exercise 3. Distance calculator',
      intro: 'Every distance worked on the slides, with the numbers editable. Change a value and every distance, ' +
             'and each feature\'s share of the distance, updates.',
      banner: 'week8-mixed',
      controls:
        U.select({ id: 'dc-preset', label: 'Example', value: 'movie', options: [
          { value: 'movie', label: 'Movies: Euclidean and the 1-NN ranking' },
          { value: 'table', label: 'Four-feature table: Euclidean vs Manhattan' },
          { value: 'scaleRaw', label: 'Scaling: raw features (1–10 and 1–1000)' },
          { value: 'scaleNorm', label: 'Scaling: after min-max normalisation' },
          { value: 'weighted', label: 'Weighted Euclidean: an irrelevant feature' },
          { value: 'weather', label: 'Hamming: categorical records' },
          { value: 'dna', label: 'Hamming: two DNA sequences' },
          { value: 'food', label: 'Domain-specific: ordering foods by calories' },
          { value: 'mixed', label: 'Heterogeneous: two real patients' }] }),
      readout:
        U.metric('dc-euc', 'Euclidean', '—', ' ') + U.metric('dc-man', 'Manhattan', '—', ' ') +
        U.metric('dc-weuc', 'Weighted Euclidean', '—', ' ') + U.metric('dc-ham', 'Hamming / mixed', '—', ' '),
      explain: '',
      altLabel: 'Read the calculation as text'
    },

    'knn-scaling': {
      title: 'Exercise 4. Feature scaling decides who the neighbours are',
      intro: 'One held-out patient (the star) and its k nearest training patients (outlined), chosen with the scaling ' +
             'you select. Start unscaled with cholesterol against ST depression, then standardise.',
      banner: 'week8-real',
      controls:
        U.segmented({ id: 'ks-scale', label: 'Scaling (fitted on training rows)', value: 'none',
          options: [{ value: 'none', label: 'None' }, { value: 'minmax', label: 'Min-max' },
                    { value: 'standard', label: 'Standardise' }] }) +
        U.select({ id: 'ks-fx', label: 'Feature 1', value: 'chol', options: [
          { value: 'chol', label: 'Cholesterol (mg/dl)' }, { value: 'trestbps', label: 'Resting BP (mm Hg)' },
          { value: 'thalach', label: 'Max heart rate (bpm)' }, { value: 'age', label: 'Age (years)' }] }) +
        U.select({ id: 'ks-fy', label: 'Feature 2', value: 'oldpeak', options: [
          { value: 'oldpeak', label: 'ST depression (mm)' }, { value: 'age', label: 'Age (years)' },
          { value: 'thalach', label: 'Max heart rate (bpm)' }] }) +
        U.slider({ id: 'ks-k', label: 'k', min: 1, max: 31, value: 15, step: 2 }) +
        '<div class="control"><span class="control-label">Query <span class="val" id="ks-q-val"></span></span>' +
        '<button type="button" class="btn btn-sm" id="ks-next">Next held-out patient</button></div>',
      readout:
        U.metric('ks-share', 'Feature 1 share of distance', '—', ' ') + U.metric('ks-spread', 'Feature 2 spread', '—', ' ') +
        U.metric('ks-pred', 'Prediction', '—', ' ') + U.metric('ks-cv', 'All features, CV', '—', ' '),
      explain: '<p><strong>Predict first:</strong> cholesterol has a standard deviation of about 52 mg/dl; ST ' +
        'depression about 1.2 mm. Unscaled, which feature decides who the neighbours are?</p>',
      altLabel: 'Read the neighbours and distance shares as text'
    },

    'knn-irrelevant': {
      title: 'Exercise 5. Irrelevant features, and weighting them down',
      intro: 'Add columns of pure noise to the real patients and watch cross-validated accuracy fall. Then give the ' +
             'noise columns a smaller weight in the distance.',
      banner: 'week8-real',
      controls:
        U.slider({ id: 'ki-n', label: 'Noise features added', min: 0, max: 6, value: 0 }) +
        U.segmented({ id: 'ki-w', label: 'Weight of the noise features', value: '1.0',
          options: [{ value: '1.0', label: '1' }, { value: '0.5', label: '0.5' },
                    { value: '0.25', label: '0.25' }, { value: '0.0', label: '0 (removed)' }] }),
      readout:
        U.metric('ki-acc', 'CV accuracy', '—', ' ') + U.metric('ki-drop', 'Change', '—', ' ') +
        U.metric('ki-share', 'Distance that is noise', '—', ' '),
      explain: '',
      altLabel: 'Read the accuracy table as text'
    },

    'knn-weighted': {
      title: 'Exercise 6. Distance-weighted voting and the exponent n',
      intro: 'The lecture\'s nine points. Votes are the sum of 1/dⁿ for each class among the k nearest. ' +
             'Check the slide numbers at n = 1 and n = 3, then set n = 0 (a plain vote) with k = 9.',
      banner: 'week8-exact',
      controls:
        U.slider({ id: 'kw-k', label: 'k', min: 1, max: 9, value: 9 }) +
        U.slider({ id: 'kw-n', label: 'Exponent n', min: 0, max: 4, value: 1, step: 0.5 }) +
        U.checkbox({ id: 'kw-zero', label: 'Add a Yellow point exactly on the query (d = 0)', checked: false }),
      readout:
        U.metric('kw-blue', 'Blue', '—', ' ') + U.metric('kw-yellow', 'Yellow', '—', ' ') +
        U.metric('kw-black', 'Black', '—', ' ') + U.metric('kw-win', 'Prediction', '—', ' '),
      explain: '',
      altLabel: 'Read the weights and votes as text'
    },

    'knn-cv': {
      title: 'Exercise 7. Choosing k by cross-validation',
      intro: 'Measured 10-fold cross-validated accuracy for every odd k from 1 to 51 on the 227 training patients, ' +
             'for each scaling, metric and weighting. Choose a setting from these curves; only then look at the test set.',
      banner: 'week8-real',
      controls:
        U.segmented({ id: 'kc-scale', label: 'Continuous features', value: 'standard',
          options: [{ value: 'standard', label: 'Standardised' }, { value: 'none', label: 'Unscaled' }] }) +
        U.segmented({ id: 'kc-metric', label: 'Metric', value: 'euclidean',
          options: [{ value: 'euclidean', label: 'Euclidean' }, { value: 'manhattan', label: 'Manhattan' }] }) +
        U.segmented({ id: 'kc-weights', label: 'Weights', value: 'uniform',
          options: [{ value: 'uniform', label: 'Uniform' }, { value: 'distance', label: 'Distance' }] }) +
        U.checkbox({ id: 'kc-train', label: 'Show training accuracy', checked: true }) +
        U.checkbox({ id: 'kc-reveal', label: 'Show the final-test result (look once, after choosing)', checked: false }),
      readout:
        U.metric('kc-best', 'Best k here', '—', ' ') + U.metric('kc-k1', 'k = 1', '—', ' ') +
        U.metric('kc-grid', 'GridSearchCV choice', '—', ' ') + U.metric('kc-test', 'Final test', 'hidden', ' '),
      explain: '',
      altLabel: 'Read every accuracy value as text'
    },

    'knn': {
      title: 'Exercise 8 (extension). Who is biologically similar? Classifier versus representation',
      intro: 'Change the classifier, or change what it measures distance in. ' +
             'Only one of those two is about the model.',
      banner: 'real',
      controls:
        U.select({ id: 'kn-rep', label: 'Representation', value: 'wdbc-scaled',
          options: [
            { value: 'wdbc-scaled', label: 'WDBC, standardised' },
            { value: 'wdbc-raw', label: 'WDBC, unscaled' },
            { value: 'wdbc-noise', label: 'WDBC + 60 noise features' },
            { value: 'prot-eng', label: 'Proteins, engineered features' },
            { value: 'prot-emb', label: 'Proteins, learned embedding' }] }) +
        U.slider({ id: 'kn-k', label: 'k', min: 1, max: 51, value: 5, step: 2 }) +
        U.select({ id: 'kn-metric', label: 'Distance metric', value: 'euclidean',
          options: [
            { value: 'euclidean', label: 'Euclidean' },
            { value: 'manhattan', label: 'Manhattan' },
            { value: 'chebyshev', label: 'Chebyshev' },
            { value: 'cosine', label: 'Cosine' }] }) +
        U.checkbox({ id: 'kn-weighted', label: 'Distance-weighted voting', checked: false }) +
        '<div data-knn-task>' +
        U.segmented({ id: 'kn-task', label: 'Protein task', value: 'family',
          options: [{ value: 'family', label: 'Family' },
                    { value: 'hasSite', label: 'Ordered triad' }] }) +
        '</div>',
      readout:
        U.metric('kn-acc', 'Leave-one-out accuracy', '—') +
        U.metric('kn-f1', 'Macro F1', '—') +
        U.metric('kn-bestk', 'Best k', '—') +
        U.metric('kn-dims', 'Dimensionality', '—'),
      explain: '<div data-knn-detail></div>',
      altLabel: 'Read the k curve and every representation compared, as text'
    },

    'w9-kmeans': {
      title: 'Exercise 1. k-means step by step',
      intro: 'The 569 WDBC tumours on their first two principal components. Choose k, a starting rule and a seed, then ' +
             'alternate the two steps of Lloyd\'s algorithm yourself. Predict first: will every seed reach the same answer?',
      banner: 'week9-real',
      controls:
        U.slider({ id: 'w9k-k', label: 'Number of clusters k =', min: 2, max: 6, value: 2 }) +
        U.segmented({ id: 'w9k-init', label: 'Starting centroids', value: 'random',
          options: [{ value: 'random', label: 'Random tumours' }, { value: 'plusplus', label: 'k-means++' }] }) +
        U.slider({ id: 'w9k-seed', label: 'Seed', min: 1, max: 20, value: 1 }) +
        '<div class="control w9-btns"><button type="button" class="btn" id="w9k-assign">Assign</button>' +
        '<button type="button" class="btn" id="w9k-update">Update</button>' +
        '<button type="button" class="btn" id="w9k-run">Run to convergence</button></div>',
      readout:
        U.metric('w9k-step', 'Steps', '—', ' ') + U.metric('w9k-wcss', 'WCSS', '—', ' ') +
        U.metric('w9k-next', 'Next', '—', ' ') + U.metric('w9k-ari', 'ARI with diagnosis', '—', ' '),
      explain: '',
      altLabel: 'Read the WCSS after every step as text'
    },

    'w9-choosek': {
      title: 'Exercise 2. Choosing k: elbow, silhouette and stability',
      intro: 'k-means on all 30 standardised WDBC features for k = 2 to 10. Read the three curves and the silhouette ' +
             'plot, commit to a k, and only then reveal how the clusters relate to the diagnosis.',
      banner: 'week9-real',
      controls:
        U.slider({ id: 'w9c-k', label: 'k =', min: 2, max: 10, value: 2 }) +
        U.checkbox({ id: 'w9c-reveal', label: 'Reveal the diagnosis (ARI)' }),
      readout:
        U.metric('w9c-sil', 'Silhouette', '—', ' ') + U.metric('w9c-stab', 'Stability', '—', ' ') +
        U.metric('w9c-neg', 'Negative s(i)', '—', ' ') + U.metric('w9c-ari', 'ARI with diagnosis', '—', ' '),
      explain: '',
      altLabel: 'Read every k as text'
    },

    'w9-dbscan': {
      title: 'Exercise 3. DBSCAN: eps, min_samples and the k-distance plot',
      intro: 'DBSCAN runs in your browser on the tumours\' first two principal components. Drag eps and min_samples: ' +
             'how many clusters, how much noise, and is there a stable range?',
      banner: 'week9-real',
      controls:
        U.slider({ id: 'w9d-eps', label: 'eps =', min: 0.1, max: 2, step: 0.05, value: 0.5 }) +
        U.slider({ id: 'w9d-ms', label: 'min_samples', min: 3, max: 15, value: 5 }),
      readout:
        U.metric('w9d-k', 'Clusters', '—', ' ') + U.metric('w9d-noise', 'Noise', '—', ' ') +
        U.metric('w9d-big', 'Largest', '—', ' ') + U.metric('w9d-ari', 'ARI with diagnosis', '—', ' '),
      explain: '',
      altLabel: 'Read the precomputed eps sweep as text'
    },

    'w9-hier': {
      title: 'Exercise 4. Linkage and the dendrogram cut',
      intro: 'Agglomerative clustering of 60 tumours (all 30 standardised features), computed in your browser. Choose a ' +
             'linkage and the number of clusters; the dashed line is the cut. Can you reproduce the linkage trap?',
      banner: 'week9-real',
      controls:
        U.segmented({ id: 'w9h-m', label: 'Linkage', value: 'ward',
          options: [{ value: 'single', label: 'Single' }, { value: 'complete', label: 'Complete' },
                    { value: 'average', label: 'Average' }, { value: 'ward', label: 'Ward' }] }) +
        U.slider({ id: 'w9h-k', label: 'Cut into', min: 1, max: 8, value: 2 }),
      readout:
        U.metric('w9h-sizes', 'Sizes', '—', ' ') + U.metric('w9h-sil', 'Silhouette', '—', ' ') +
        U.metric('w9h-ari', 'ARI with diagnosis', '—', ' ') + U.metric('w9h-h', 'Cut height', '—', ' '),
      explain: '',
      altLabel: 'Read the last ten merges as text'
    },

    'w9-batch': {
      title: 'Exercise 5. Manufacture a batch effect',
      intro: 'A simulated technical shift is added to every feature of half the real tumours ("batch B"). k-means (k = 2) ' +
             'on all 30 features, precomputed for every setting. When do the clusters stop being about biology?',
      banner: 'week9-sim',
      controls:
        U.segmented({ id: 'w9b-design', label: 'Who is in batch B?', value: 'random',
          options: [{ value: 'random', label: 'Random (coin toss)' }, { value: 'confounded', label: 'Confounded with diagnosis' }] }) +
        U.slider({ id: 'w9b-shift', label: 'Batch shift', min: 0, max: 10, value: 0 }) +
        U.checkbox({ id: 'w9b-corr', label: 'Centre each batch on its own mean (correction)' }),
      readout:
        U.metric('w9b-sil', 'Silhouette', '—', ' ') + U.metric('w9b-dx', 'ARI diagnosis', '—', ' ') +
        U.metric('w9b-batch', 'ARI batch', '—', ' ') + U.metric('w9b-follow', 'Clusters follow', '—', ' '),
      explain: '',
      altLabel: 'Read every shift as text'
    },

    'w9-proteins': {
      title: 'Exercise 6. Clusters in protein embedding space',
      intro: 'k-means on the 2,000 Week 7 proteins, using the classical descriptors or the ESM-2 embedding (Euclidean ' +
             'or cosine). Each bar pair shows one cluster: how many have a signal peptide, how many are membrane proteins.',
      banner: 'week9-real',
      controls:
        U.segmented({ id: 'w9p-rep', label: 'Representation', value: 'esm2',
          options: [{ value: 'classical', label: 'Classical (23)' }, { value: 'esm2', label: 'ESM-2, Euclidean' },
                    { value: 'esm2_cosine', label: 'ESM-2, cosine' }] }) +
        U.slider({ id: 'w9p-k', label: 'k =', min: 2, max: 8, value: 4 }),
      readout:
        U.metric('w9p-sil', 'Silhouette', '—', ' ') + U.metric('w9p-sp', 'ARI signal peptide', '—', ' ') +
        U.metric('w9p-tm', 'ARI membrane', '—', ' ') + U.metric('w9p-len', 'η² length', '—', ' '),
      explain: '',
      altLabel: 'Read every k as text'
    },

    'clustering': {
      title: 'Exercise 7. Biological subgroup explorer',
      intro: 'Three clustering algorithms on real data, with an injectable ' +
             'batch effect. Watch what the silhouette score does and does not ' +
             'tell you.',
      banner: 'real',
      controls:
        U.select({ id: 'cl-data', label: 'Data', value: 'wdbc',
          options: [
            { value: 'wdbc', label: 'WDBC (260-sample subset)' },
            { value: 'prot-eng', label: 'Proteins, engineered features' },
            { value: 'prot-emb', label: 'Proteins, learned embedding' }] }) +
        U.select({ id: 'cl-algo', label: 'Algorithm', value: 'kmeans',
          options: [
            { value: 'kmeans', label: 'k-means' },
            { value: 'dbscan', label: 'DBSCAN' },
            { value: 'agglomerative', label: 'Agglomerative' }] }) +
        '<div data-cl-k>' +
        U.slider({ id: 'cl-k', label: 'Number of clusters, k', min: 2, max: 8, value: 2 }) +
        '</div>' +
        '<div data-cl-dbscan>' +
        U.slider({ id: 'cl-eps', label: 'eps (÷10)', min: 10, max: 80, value: 32 }) +
        U.slider({ id: 'cl-minpts', label: 'minPts', min: 2, max: 20, value: 5 }) +
        '</div>' +
        '<div data-cl-linkage>' +
        U.select({ id: 'cl-linkage', label: 'Linkage', value: 'ward',
          options: [
            { value: 'ward', label: 'Average' },
            { value: 'single', label: 'Single' },
            { value: 'complete', label: 'Complete' }] }) +
        '</div>' +
        U.slider({ id: 'cl-batch', label: 'Injected batch effect', min: 0, max: 20, value: 0 }) +
        U.segmented({ id: 'cl-colour', label: 'Colour points by', value: 'cluster',
          options: [{ value: 'cluster', label: 'Cluster' },
                    { value: 'truth', label: 'Truth' },
                    { value: 'batch', label: 'Batch' }] }),
      readout:
        U.metric('cl-sil', 'Silhouette', '—') +
        U.metric('cl-ari', 'Agreement with biology', '—') +
        U.metric('cl-aribatch', 'Agreement with batch', '—') +
        U.metric('cl-n', 'Clusters', '—'),
      explain: '',
      altLabel: 'Read the cluster quality measures as text'
    },

    'random-forest': {
      title: 'Random forest visualiser',
      intro: 'A real forest, grown in your browser. The duplicate-feature ' +
             'control is the one worth spending time on.',
      banner: 'real',
      controls:
        U.slider({ id: 'rf-trees', label: 'Trees in the ensemble', min: 1, max: 150, value: 60 }) +
        U.slider({ id: 'rf-depth', label: 'Maximum depth', min: 1, max: 14, value: 8 }) +
        U.slider({ id: 'rf-features', label: 'Features per split', min: 1, max: 30, value: 5 }) +
        U.checkbox({ id: 'rf-duplicate', label: 'Duplicate the strongest feature 3 times', checked: false }),
      readout:
        U.metric('rf-acc', 'Forest accuracy', '—') +
        U.metric('rf-single', 'Single tree', '—') +
        U.metric('rf-oob', 'Out-of-bag estimate', '—') +
        U.metric('rf-f1', 'Macro F1', '—') +
        U.metric('rf-recall', 'Recall, malignant', '—'),
      explain: '',
      altLabel: 'Read the ensemble curve and importances as text'
    },

    'leaderboard': {
      title: 'Model comparison lab',
      intro: 'Every classical model measured on the real WDBC data under one ' +
             'protocol, with the columns that actually decide deployment.',
      banner: 'real',
      controls: '<div class="control"><span class="control-label">Sorting</span>' +
        '<span class="small muted">Click any column heading in the table below.</span></div>',
      readout:
        U.metric('lb-best', 'Best measured', '—') +
        U.metric('lb-baseline', 'Majority baseline', '—') +
        U.metric('lb-spread', 'Best minus logistic regression', '—'),
      explain: '<div data-lb-table></div>',
      altLabel: 'Read the full comparison table as text'
    },

    'fine-tuning': {
      title: 'Fine-tuning simulator',
      intro: 'Exact parameter arithmetic on the left of the readout, a clearly ' +
             'labelled simulation on the left panel, and real measured learning ' +
             'curves on the right.',
      banner: 'mixed',
      controls:
        U.select({ id: 'ft-preset', label: 'Model scale', value: 'small',
          options: [
            { value: 'small', label: '~117M class (DNABERT-2 scale)' },
            { value: 'medium', label: '~650M class (ESM-2 650M scale)' },
            { value: 'large', label: '~2.5B class (NT 2.5B scale)' }] }) +
        U.select({ id: 'ft-method', label: 'Adaptation method', value: 'lora',
          options: [
            { value: 'head', label: 'Frozen embeddings + head' },
            { value: 'lora', label: 'LoRA' },
            { value: 'partial', label: 'Partial unfreeze' },
            { value: 'full', label: 'Full fine-tuning' }] }) +
        '<div data-ft-lora>' +
        U.slider({ id: 'ft-rank', label: 'LoRA rank r', min: 1, max: 128, value: 8 }) +
        U.slider({ id: 'ft-targets', label: 'Adapted matrices per layer', min: 1, max: 6, value: 2 }) +
        '</div>' +
        '<div data-ft-frozen>' +
        U.slider({ id: 'ft-frozen', label: 'Percentage frozen', min: 0, max: 100, value: 100, step: 5 }) +
        '</div>' +
        U.slider({ id: 'ft-labels', label: 'Labelled examples (log)', min: 130, max: 470, value: 270 }),
      readout:
        U.metric('ft-trainable', 'Trainable parameters', '—') +
        U.metric('ft-pct', 'Share of the backbone', '—') +
        U.metric('ft-permatrix', 'Per adapted matrix', '—') +
        U.metric('ft-sim', 'Simulated accuracy', '—'),
      explain: '',
      altLabel: 'Read the parameter arithmetic and the real learning curve as text'
    },

    'fm-decision': {
      title: 'Should I use a foundation model?',
      intro: 'Eight questions, five possible recommendations, and no path that ' +
             'ends in "use the biggest model available".',
      controls: '',
      readout: '',
      explain: '',
      altLabel: 'Read the whole decision tree as text'
    },

    'trust': {
      title: 'Would you trust this model?',
      intro: 'Two published-style claims. Investigate before you decide, and ' +
             'notice how long the list of questions is.',
      controls:
        U.select({ id: 'tr-scenario', label: 'Scenario', value: 'cancer',
          options: [
            { value: 'cancer', label: 'A cancer detection model, 97% accuracy' },
            { value: 'nutrition', label: 'A dietary pattern model, AUC 0.89' }] }),
      readout:
        U.metric('tr-headline', 'Headline figure', '—') +
        U.metric('tr-ci', '95% interval', '—') +
        U.metric('tr-serious', 'Serious problems', '—') +
        U.metric('tr-run', 'Questions asked', '—'),
      explain: '',
      altLabel: 'Read both scenarios and every finding as text'
    },

    'pipelines': {
      title: 'Classical machine learning and foundation models, side by side',
      intro: 'Click any stage for a concrete example. This diagram recurs ' +
             'through the module because the comparison it makes is the ' +
             'module\'s spine.',
      controls: '',
      readout: '',
      explain: '',
      altLabel: 'Read both pipelines and every example as text'
    }
  };

  /* Provenance banners, generated from the live data flags so the site cannot
     claim data is real when it is not. */
  function banner(kind) {
    if (kind === 'real') {
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">' +
        '● Real measured data</span></div>' +
        '<div class="control"><span class="small muted">Computed live in your ' +
        'browser from the UCI Breast Cancer Wisconsin (Diagnostic) dataset, ' +
        '569 samples, CC BY 4.0.</span></div></div>';
    }
    if (kind === 'week3-real' || kind === 'week3-real-noise') {
      var W3 = window.WEEK03;
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">' +
        '● Real measured data</span></div>' +
        '<div class="control"><span class="small muted" style="max-width:70ch">' +
        'UCI Breast Cancer Wisconsin (Diagnostic), 569 cases. Measured once with ' +
        'scikit-learn' + (W3 ? ' ' + U.esc(W3.sklearnVersion) : '') + ' by ' +
        'data/scripts/17_build_week03_interactives.py, with the protocol on the Week 3 ' +
        'slides. Every number that also appears on a slide matches it exactly.' +
        (kind === 'week3-real-noise' ? ' The "pure noise" option is 100 rows of random ' +
          'numbers with random labels, generated with seed 42: a known ground truth ' +
          '(chance, 50%), not biological data.' : '') +
        '</span></div></div>';
    }
    if (kind === 'week3-sim') {
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0;' +
        'background:var(--warn-soft)">' +
        '<div class="control"><span class="provenance provenance-sim">' +
        '▲ Illustrative simulation — not a biological dataset.</span></div>' +
        '<div class="control"><span class="small" style="max-width:70ch">' +
        'WDBC has one row per patient, so it cannot show this problem. Sixty simulated ' +
        'patients with 2 to 4 samples each are generated in your browser with a fixed seed, ' +
        'built like the lecture\'s simulation but not the same draw, so the averages differ ' +
        'slightly from slide 16. The direction of the effect is the lesson.</span></div></div>';
    }
    if (kind === 'week4-real') {
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">' +
        '● Real data</span></div>' +
        '<div class="control"><span class="small muted" style="max-width:70ch">' +
        'UCI Breast Cancer Wisconsin (Diagnostic), final test set of 171 cases, ' +
        'computed once by data/scripts/08_build_week04_data.py. Real data used for ' +
        'classroom evaluation, not evidence of clinical performance.</span></div></div>';
    }
    if (kind === 'week7-real' || kind === 'week7-mixed') {
      var W7v = window.WEEK07 ? ' ' + U.esc(window.WEEK07.sklearn) : '';
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">' +
        (kind === 'week7-real' ? '● Real data' : '● Mathematical illustration and real data') + '</span></div>' +
        '<div class="control"><span class="small muted" style="max-width:70ch">' +
        (kind === 'week7-mixed' ? 'The histogram uses uniform random points (a mathematical fact, not biological data). ' : '') +
        'Real data: 2,000 human UniProtKB/Swiss-Prot proteins (release 2026_03, one per UniRef50 cluster; CC BY 4.0) with ' +
        'ESM-2 (8M, 320-d) embeddings, the Week 7 lab\'s files; 1,500 training and 500 test proteins, the lab\'s split. ' +
        'Measured with scikit-learn' + W7v + ' by data/scripts/20_build_week07_refresh.py. Labels are UniProt keywords, ' +
        'mostly from sequence analysis: annotations, not ground truth.</span></div></div>';
    }
    if (kind === 'week9-real' || kind === 'week9-sim') {
      var W9v = window.WEEK09 ? ' ' + U.esc(window.WEEK09.sklearn) : '';
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">' +
        (kind === 'week9-real' ? '● Real data' : '● Real data with a simulated batch effect') + '</span></div>' +
        '<div class="control"><span class="small muted" style="max-width:70ch">' +
        (kind === 'week9-sim' ? 'The batch shift is SIMULATED (seeded) and added to real measurements, to show what a ' +
          'technical artefact does; it is not an observed batch effect. ' : '') +
        'Real data: UCI Breast Cancer Wisconsin (Diagnostic), 569 tumours, 30 features, CC BY 4.0; and the Week 7 ' +
        'proteins (2,000 human Swiss-Prot entries with ESM-2 8M embeddings). Computed with scikit-learn' + W9v +
        ' by data/scripts/22_build_week09_data.py, or in your browser where stated. The diagnosis is used only to check ' +
        'clusters after the fact.</span></div></div>';
    }
    if (kind === 'week8-real' || kind === 'week8-mixed') {
      var W8v = window.WEEK08 ? ' ' + U.esc(window.WEEK08.sklearnVersion) : '';
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">' +
        (kind === 'week8-real' ? '● Real data' : '● Lecture arithmetic and real data') + '</span></div>' +
        '<div class="control"><span class="small muted" style="max-width:70ch">' +
        (kind === 'week8-mixed' ? 'The lecture example is the slide\'s own numbers. ' : '') +
        'Real data: UCI Heart Disease, Cleveland Clinic subset (Janosi et al. 1988), 303 patients, CC BY 4.0; ' +
        '227 training and 76 held-out patients, the lab\'s split. Measured with scikit-learn' + W8v + ' by ' +
        'data/scripts/18_build_week08_data.py with the lab\'s protocol. Classroom analysis, not a clinical tool.' +
        '</span></div></div>';
    }
    if (kind === 'week8-exact') {
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">● Exact arithmetic</span></div>' +
        '<div class="control"><span class="small muted" style="max-width:70ch">The lecture\'s worked ' +
        'example: nine stored points at the distances on the slides. Every vote is computed exactly.</span></div></div>';
    }
    if (kind === 'week4-exact') {
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">' +
        '● Exact arithmetic</span></div>' +
        '<div class="control"><span class="small muted" style="max-width:70ch">' +
        'Hypothetical classroom numbers. The counts are the exact expected ' +
        'values that follow from the prevalence, sensitivity and specificity ' +
        'you set; they are not the performance of any real test.</span></div></div>';
    }
    if (kind === 'week4-sim') {
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0;' +
        'background:var(--warn-soft)">' +
        '<div class="control"><span class="provenance provenance-sim">' +
        '▲ Illustrative simulation — not a biological dataset.</span></div>' +
        '<div class="control"><span class="small" style="max-width:70ch">' +
        'Synthetic, seeded data from data/scripts/08_build_week04_data.py, ' +
        'identical to the numbers on the lecture slides. Chosen because the ' +
        'teaching point needs a known ground truth; nothing here describes a ' +
        'real clinical model.</span></div></div>';
    }
    if (kind === 'week5-live' || kind === 'week5-measured' || kind === 'week5-text') {
      var P = window.WEEK05 && window.WEEK05.provenance;
      var when = P ? 'snapshot of ' + P.openfda_last_updated + ', ' : '';
      var how = {
        'week5-live': 'Fitted live in your browser to a frozen ' + when + 'one row per ' +
          'event–reason–classification record, split by event exactly as in the lab.',
        'week5-measured': 'Measured once on the frozen ' + when + 'same split as the lab, by ' +
          'data/scripts/10_build_week05_data.py (and 11_ for the pretrained encoder).',
        'week5-text': 'The first two presets are verbatim reason texts from the frozen ' + when +
          'the third is an illustrative example written for this explorer.'
      }[kind];
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
        '<div class="control"><span class="provenance provenance-real">' +
        '● Real openFDA food-recall data</span></div>' +
        '<div class="control"><span class="small muted" style="max-width:70ch">' + how +
        ' US FDA, public domain (CC0). The label is FDA\'s hazard classification, an ' +
        'administrative decision, not a measured health outcome; classroom use, not a ' +
        'food-safety tool.</span></div></div>';
    }
    if (kind === 'week5-sim') {
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0;' +
        'background:var(--warn-soft)">' +
        '<div class="control"><span class="provenance provenance-sim">' +
        '▲ Illustrative simulation — not a biological dataset.</span></div>' +
        '<div class="control"><span class="small" style="max-width:70ch">' +
        'Hand-made counts for a four-word vocabulary, chosen so the arithmetic can be ' +
        'done on paper. They are the numbers on the lecture slides and are not ' +
        'estimated from FDA data.</span></div></div>';
    }
    if (kind === 'sim-embed') {
      var S = window.SEQUENCES;
      if (S && S.simulatedEmbedding === false) {
        return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0">' +
          '<div class="control"><span class="provenance provenance-real">' +
          '● Real ' + U.esc(S.embeddingModel) + ' embeddings</span></div>' +
          '<div class="control"><span class="small muted">The sequences are ' +
          'still simulated. ' + U.esc(S.warning) + '</span></div></div>';
      }
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0;' +
        'background:var(--warn-soft)">' +
        '<div class="control"><span class="provenance provenance-sim">' +
        '▲ Simulated sequences and simulated embedding</span></div>' +
        '<div class="control"><span class="small" style="max-width:70ch">' +
        U.esc(S ? S.warning : '') + '</span></div></div>';
    }
    if (kind === 'sim-corpus') {
      var R = window.RECALLS;
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0;' +
        'background:var(--warn-soft)">' +
        '<div class="control"><span class="provenance provenance-sim">' +
        '▲ Illustrative corpus</span></div>' +
        '<div class="control"><span class="small" style="max-width:70ch">' +
        U.esc(R ? R.warning : '') + '</span></div></div>';
    }
    if (kind === 'mixed') {
      return '<div class="viz-controls" style="border-bottom:0;padding-bottom:0;' +
        'background:var(--warn-soft)">' +
        '<div class="control"><span class="provenance provenance-real">' +
        '● Exact arithmetic</span> <span class="provenance provenance-sim">' +
        '▲ Simulated curves</span></div>' +
        '<div class="control"><span class="small" style="max-width:70ch">' +
        'The parameter counts are computed exactly from the architecture you ' +
        'set. The performance curves in the left panel are a transparent ' +
        'parametric simulation, watermarked as such, and no number from them ' +
        'should be reported as a result. The right panel contains real measured ' +
        'learning curves from the WDBC data.</span></div></div>';
    }
    return '';
  }

  function vizBlock(id) {
    var spec = VIZ_SPECS[id];
    if (!spec) return '';
    return U.vizShell({
      id: 'viz-' + id,
      title: spec.title,
      intro: spec.intro,
      banner: banner(spec.banner),
      controls: spec.controls,
      readout: spec.readout,
      explain: spec.explain,
      altLabel: spec.altLabel
    });
  }
  window.vizBlock = vizBlock;

  /* ------------------------------------------------------------------ */

  window.renderWeek = function (n) {
    var w = window.COURSE.weeks.filter(function (x) { return x.n === n; })[0];
    if (!w) return;

    document.title = 'Week ' + n + ': ' + w.title + ' | COMP9085';

    var lab = w.lab ? window.LABS[w.lab] : null;
    var prev = window.COURSE.weeks.filter(function (x) { return x.n === n - 1; })[0];
    var next = window.COURSE.weeks.filter(function (x) { return x.n === n + 1; })[0];

    var sections = [
      { id: 'welcome', label: 'Welcome and orientation' },
      { id: 'objectives', label: 'Learning objectives' },
      { id: 'biology', label: 'Biological context' },
    ].concat((w.sections || []).map(function (x) {
      return { id: x.id, label: x.nav || x.title };
    })).concat([
      { id: 'concepts', label: 'Key concepts' },
      { id: 'transition', label: 'From generic to biological' },
      { id: 'videos', label: 'Watch' },
      { id: 'interactive', label: 'Interactive exploration' },
      { id: 'worked', label: 'Worked example' },
      { id: 'lab', label: lab ? 'Practical lab' : 'No lab this week' },
      { id: 'datasets', label: 'Dataset' },
      { id: 'foundation', label: 'Foundation-model connection' },
      { id: 'sustainability', label: 'Cost and sustainability' },
      { id: 'scientist', label: 'Think like a scientist' },
      { id: 'selfcheck', label: 'Quick self-check' },
      { id: 'checkin', label: 'Weekly check-in' },
      { id: 'reading', label: 'Further reading' }
    ]).filter(function (s) {
      if (s.id === 'welcome') return !!w.welcome;
      if (s.id === 'transition') return !!w.transition;
      if (s.id === 'videos') return !!(w.videos && w.videos.length);
      if (s.id === 'sustainability') return !!w.sustainability;
      if (s.id === 'foundation') return !w.fm.inline;
      if (s.id === 'datasets') return !!(w.datasets && w.datasets.length);
      return true;
    });

    var html = '';

    /* Hero */
    html +=
      '<div class="page-hero"><div class="wrap">' +
        '<span class="eyebrow">Week ' + U.pad(n) + ' &middot; ' +
          U.esc(U.strandLabel(w.strand)) + '</span>' +
        '<h1>' + U.esc(w.title) + '</h1>' +
        '<p class="lede">' + U.esc(w.short) + '</p>' +
        '<div class="pill-row">' + U.loPills(w.los) +
          (w.pivot ? '<span class="pill pill-fm">The pivot of the module</span>' : '') +
          (w.noLab ? '<span class="pill pill-classic">Lecture only, no lab</span>' : '') +
        '</div>' +
      '</div></div>';

    html += '<div class="wrap"><div class="week-layout"><div>';

    /* Lecture slides are distributed through Canvas, not this public site
       (see README "Lecture slides") - no download button here. */
    html += '<p class="canvas-note small muted">The Week ' + n + ' lecture is ' +
      'given from slides posted on Canvas. This page is the interactive ' +
      'companion: explore the ideas here, then work through the lab below.</p>';
    if (w.scheduleNote) {
      html += U.callout('sci', 'Teaching order', '<p class="mb0">' + U.esc(w.scheduleNote) + '</p>');
    }

    /* 0. Welcome and orientation (Week 1 only) */
    if (w.welcome) {
      html += '<section id="welcome"><h2>' + U.esc(w.welcome.title) + '</h2>' +
        U.prose(w.welcome.body) +
        '<h3>Your lecturer</h3>' + U.prose(w.welcome.lecturer) +
        '<h3>How the parts fit together</h3>' +
        '<ul class="orient-list">' + w.welcome.howToUse.map(function (h) {
          return '<li><span class="what">' + U.esc(h.what) + '</span>' +
                 '<span class="body">' + U.esc(h.body) + '</span></li>';
        }).join('') + '</ul>' +
        '<p style="margin-top:var(--s5)"><a class="btn" href="' +
          window.siteUrl('start-here.html') + '">Full Start Here guide</a> ' +
        '<a class="btn" href="' + window.siteUrl('roadmap.html') +
          '">The twelve-week roadmap</a></p>' +
        '</section>';
    }

    /* 1. Objectives */
    html += '<section id="objectives"><h2>Learning objectives</h2>' +
      '<p>By the end of this week you should be able to:</p>' +
      U.objectives(w.objectives) + '</section>';

    /* 2. Biology first: the problem before the method. */
    html += '<section id="biology"><h2>Biological context</h2>' +
      U.prose(w.biology) +
      (w.evolution
        ? '<h3>How we got here</h3><div class="grid grid-3">' +
          w.evolution.map(function (e, i) {
            return '<div class="card"><span class="week-num">Step ' + (i + 1) +
              '</span><h4 style="margin-top:0">' + U.esc(e.label) + '</h4>' +
              '<p class="small mb0">' + U.esc(e.body) + '</p></div>';
          }).join('') + '</div>'
        : '') +
      '</section>';

    /* 2b. Optional explanatory sections (Week 4 uses these for the ideas
       that need more than a glossary entry). Each is {id, title, body}. */
    /* A section may also carry trusted HTML from course.js (x.html, e.g. a
       worked table or a think-first reveal) and embed interactives (x.viz,
       a list of ids), so a concept and its interactive sit together. */
    (w.sections || []).forEach(function (x) {
      html += '<section id="' + U.esc(x.id) + '"><h2>' + U.esc(x.title) + '</h2>' +
        (x.body ? U.prose(x.body) : '') + (x.html || '') +
        (x.viz || []).map(function (v) { return vizBlock(v); }).join('') +
        (x.keypoint ? U.callout('key', 'The point', '<p class="mb0">' +
          U.esc(x.keypoint) + '</p>') : '') + '</section>';
    });

    /* 3. Concepts */
    html += '<section id="concepts"><h2>Key concepts</h2>' +
      U.concepts(w.concepts) + '</section>';

    /* 3b. The generic-to-biological transition (Week 1) */
    if (w.transition) {
      html += '<section id="transition"><h2>' + U.esc(w.transition.title) +
        '</h2>' + U.prose(w.transition.body) +
        (w.transition.parallel
          ? '<div class="table-scroll"><table class="parallel-table">' +
            '<caption>The same machine-learning problem, with the columns ' +
            'replaced. The algorithm does not change; everything around it ' +
            'does.</caption><thead><tr>' +
            '<th scope="col">Generic example</th>' +
            '<th scope="col">The biological version</th></tr></thead><tbody>' +
            w.transition.parallel.map(function (r) {
              return '<tr><td>' + U.esc(r.generic) + '</td><td>' +
                     U.esc(r.biological) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '') +
        '</section>';
    }

    /* 3c. Videos, placed where they do pedagogical work. */
    if (w.videos && w.videos.length) {
      html += '<section id="videos"><h2>Watch</h2>' +
        '<p>Two short videos. Each has a question attached; bring your answer ' +
        'to the first lab.</p>' +
        w.videos.map(function (k) { return U.video(k); }).join('') +
        '</section>';
    }

    /* 4. Interactive */
    var allLink = '<p class="small muted">Every week\'s exercises, with the lecture ' +
      'slide that points to each: <a href="' + window.siteUrl('interactives.html') +
      '#week-' + n + '">the interactive exercises index</a>.</p>';
    if (w.interactiveIndex) {
      /* The week's interactives live inside its sections; this section keeps
         the #interactive anchor and lists them. */
      html += '<section id="interactive"><h2>Interactive exploration</h2>' +
        (w.interactiveIntro ? U.prose(w.interactiveIntro) : '') + allLink +
        '<ol>' + w.interactiveIndex.map(function (it) {
          return '<li><a href="#viz-' + U.esc(it.id) + '">' + U.esc(it.label) +
            '</a>' + (it.note ? ': ' + U.esc(it.note) : '') + '</li>';
        }).join('') + '</ol></section>';
    } else
    html += '<section id="interactive"><h2>Interactive exploration</h2>' +
      (w.interactiveIntro ? U.prose(w.interactiveIntro) : '') + allLink +
      (w.vizList ? w.vizList.map(vizBlock).join('') :
        vizBlock(w.viz) + (w.viz2 ? vizBlock(w.viz2) : '') +
        (w.viz3 ? vizBlock(w.viz3) : '') +
        (w.viz4 ? vizBlock(w.viz4) : '')) + '</section>';

    /* 5. Worked example */
    html += '<section id="worked"><h2>Worked example</h2>' +
      '<h3 style="margin-top:0">' + U.esc(w.worked.title) + '</h3>' +
      U.prose(w.worked.body) +
      U.callout('key', 'The point', '<p class="mb0">' +
        U.esc(w.worked.keypoint) + '</p>') +
      '</section>';

    /* 6. Lab, or an explicit statement that there is not one. */
    if (!lab) {
      html += '<section id="lab"><h2>No lab this week</h2>' +
        '<div class="no-lab-notice">' +
          '<h3>Week ' + n + ' is a lecture only</h3>' +
          '<p>There is <strong>no practical laboratory, no programming ' +
          'assignment and no assessed practical work in Week ' + n +
          '</strong>. The first formal lab runs in Week 2, once you have the ' +
          'decision-tree material to work with.</p>' +
          '<p>Three things are worth doing before then, none of them assessed:</p>' +
          '<ol>' +
            '<li>Install Python and the scientific stack, so that Week 2 starts ' +
            'with the material rather than with an installation problem. Setup ' +
            'commands are on Canvas, in the module resources.</li>' +
            '<li>Watch the two videos above and write a sentence on each ' +
            'question.</li>' +
            '<li>Read Greener et al. (2022), listed under further reading. It ' +
            'is the single most useful thing you can read at this stage.</li>' +
          '</ol>' +
          '<p class="mb0"><a class="btn" href="' +
            window.siteUrl('labs/index.html') + '">See all the labs, from ' +
            'Week 2 onwards</a></p>' +
        '</div></section>';
    }
    if (lab) {
      html += '<section id="lab"><h2>Practical lab</h2>' +
        '<div class="card">' +
          '<div class="pill-row"><span class="pill">' + U.esc(lab.duration) +
            '</span>' + U.loPills(lab.los) + '</div>' +
          '<h3 style="margin-top:0">' + U.esc(lab.title) + '</h3>' +
          '<p>' + U.esc(lab.goal) + '</p>' +
          (lab.files ? '<div class="lab-files"><h4>The notebook</h4><p>' +
            lab.files.map(function (f) {
              return '<a class="btn btn-sm" href="' +
                (window.siteUrl ? window.siteUrl(f.href) : f.href) + '"' +
                (f.download ? ' download' : '') + '>' + U.esc(f.label) + '</a>';
            }).join(' ') + '</p>' +
            '<p class="small muted mb0">Solutions are released after the lab, ' +
            'on Canvas. They are not on this site.</p></div>' : '') +
          '<h4>Tasks</h4><ol>' + lab.tasks.map(function (t) {
            return '<li>' + U.esc(t) + '</li>';
          }).join('') + '</ol>' +
          (lab.starter ? '<h4>Starter code</h4><pre>' + U.esc(lab.starter) +
            '</pre>' : '') +
          '<p class="mb0"><strong>Deliverable. </strong>' +
            U.esc(lab.deliverable) + '</p>' +
          (lab.note ? '<p class="small muted" style="margin-top:var(--s3)">' +
            U.esc(lab.note) + '</p>' : '') +
        '</div></section>';
    }

    /* 7. Datasets */
    if (w.datasets && w.datasets.length) {
      html += '<section id="datasets"><h2>Dataset</h2><div class="grid grid-2">' +
        w.datasets.map(function (id) {
          var d = window.DATASETS.filter(function (x) { return x.id === id; })[0];
          if (!d) return '';
          return '<div class="card">' +
            '<div class="pill-row">' +
              (d.simulated ? '<span class="provenance provenance-sim">▲ Simulated</span>'
                           : '<span class="provenance provenance-real">● Real data</span>') +
              '<span class="pill">' + U.esc(d.domain) + '</span></div>' +
            '<h3 style="margin-top:0">' + U.esc(d.name) + '</h3>' +
            '<p class="small">' + U.esc(d.biology) + '</p>' +
            '<dl class="dl-grid" style="font-size:0.84rem">' +
              '<dt>Samples</dt><dd>' + U.esc(d.samples) + '</dd>' +
              '<dt>Target</dt><dd>' + U.esc(d.target) + '</dd>' +
              '<dt>Licence</dt><dd>' + U.esc(d.licence) + '</dd>' +
            '</dl>' +
            '<a class="btn btn-sm" href="' + window.siteUrl('datasets.html') +
              '#' + U.esc(d.id) + '">Full dataset entry</a>' +
            '</div>';
        }).join('') + '</div></section>';
    }

    /* 8. Foundation model connection (skipped when the week places it inline,
       as one of its own sections) */
    if (!w.fm.inline)
    html += '<section id="foundation"><h2>Foundation-model connection</h2>' +
      U.callout('fm', w.fm.title, U.prose(w.fm.body)) +
      (w.fm.models && w.fm.models.length
        ? '<p class="small muted">Models referred to here: ' +
          w.fm.models.map(function (m) {
            var r = window.REFERENCES[m];
            return r ? '<a href="' + U.esc(r.url) + '" target="_blank" ' +
                       'rel="noopener">' + U.esc(r.tag) + '</a>' : '';
          }).filter(Boolean).join(', ') +
          '. See the <a href="' + window.siteUrl('foundation-models.html') +
          '">foundation models reference</a>.</p>'
        : '') +
      '</section>';

    /* 8b. Cost and sustainability, which refers back to the section above. */
    if (w.sustainability) {
      html += '<section id="sustainability"><h2>' +
        U.esc(w.sustainability.title) + '</h2>' +
        U.prose(w.sustainability.body) +
        U.callout('key', 'The point', '<p class="mb0">' +
          U.esc(w.sustainability.keypoint) + '</p>') +
        '</section>';
    }

    /* 9. Think like a scientist */
    html += '<section id="scientist">' +
      U.callout('sci', 'Think like a scientist',
        '<p class="mb0">' + U.esc(w.scientist) + '</p>') +
      '</section>';

    /* 10. Self-check */
    html += '<section id="selfcheck"><h2>Quick self-check</h2>' +
      '<p>Three questions. The explanations matter more than the answers.</p>' +
      U.quiz(w.quiz, 'week' + n) + '</section>';

    /* 11. Check-in */
    html += '<section id="checkin"><h2>Weekly check-in</h2>' +
      U.feedbackForm(n) + '</section>';

    /* 12. Reading */
    html += '<section id="reading"><h2>Further reading</h2>' +
      U.references(w.reading) + '</section>';

    /* Provenance of the redesign */
    if (w.provenance) {
      html += '<section id="provenance">' +
        '<details class="card"><summary style="cursor:pointer;font-weight:620">' +
        'What this week inherits from the previous version of the module' +
        '</summary>' +
        '<p style="margin-top:var(--s4)"><strong>Retained. </strong>' +
          U.esc(w.provenance.kept) + '</p>' +
        '<p class="mb0"><strong>Changed. </strong>' +
          U.esc(w.provenance.changed) + '</p>' +
        '</details></section>';
    }

    /* Pager */
    html += '<nav class="pager" aria-label="Week navigation">' +
      (prev ? '<a href="week' + U.pad(prev.n) + '.html"><span class="dir">' +
              'Previous</span><span class="ttl">Week ' + prev.n + ': ' +
              U.esc(prev.title) + '</span></a>' : '<span></span>') +
      (next ? '<a class="next" href="week' + U.pad(next.n) + '.html">' +
              '<span class="dir">Next</span><span class="ttl">Week ' + next.n +
              ': ' + U.esc(next.title) + '</span></a>' : '') +
      '</nav>';

    html += '</div>' +
      /* Sticky section nav */
      '<aside class="week-aside"><nav aria-label="On this page">' +
        '<span class="eyebrow">On this page</span><ul>' +
        sections.map(function (s) {
          return '<li><a href="#' + s.id + '">' + U.esc(s.label) + '</a></li>';
        }).join('') + '</ul></nav></aside>' +
      '</div></div>';

    document.getElementById('main').innerHTML = html;

    /* Wire up the interactive pieces. */
    var quizEl = document.querySelector('[data-quiz]');
    if (quizEl) { quizEl.__questions = w.quiz; U.mountQuizzes(); }
    U.mountFeedback();
    window.Progress.visit(n);
    window.Progress.refresh();
    if (window.Chart) window.Chart.mountAll();
  };
})();
