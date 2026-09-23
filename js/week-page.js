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

    'bayes': {
      title: 'Medical test calculator',
      intro: 'A test does not have one accuracy. It has two error rates, and ' +
             'what a positive result means depends on who you tested.',
      controls:
        U.select({ id: 'by-preset', label: 'Start from', value: 'screening',
          options: [
            { value: 'screening', label: 'Population screening, rare condition' },
            { value: 'wdbc', label: 'The WDBC cohort (37.3% malignant)' },
            { value: 'clinic', label: 'A symptomatic clinic' },
            { value: 'rare', label: 'Very rare condition, near-perfect test' }] }) +
        U.slider({ id: 'by-prev', label: 'Prevalence', min: 0.05, max: 50, value: 0.5, step: 0.05 }) +
        U.slider({ id: 'by-sens', label: 'Sensitivity', min: 50, max: 99.9, value: 99, step: 0.1 }) +
        U.slider({ id: 'by-spec', label: 'Specificity', min: 50, max: 99.9, value: 99, step: 0.1 }),
      readout:
        U.metric('by-ppv', 'PPV', '—') +
        U.metric('by-npv', 'NPV', '—') +
        U.metric('by-acc', 'Accuracy', '—') +
        U.metric('by-fp', 'False positives', '—') +
        U.metric('by-fn', 'False negatives', '—'),
      explain: '',
      altLabel: 'Read the frequencies and predictive values as text'
    },

    'naive-bayes': {
      title: 'Naive Bayes text explorer',
      intro: 'A real multinomial naive Bayes classifier, trained in your ' +
             'browser. Every probability shown is read out of the fitted model.',
      banner: 'sim-corpus',
      controls:
        U.select({ id: 'nb-pair', label: 'Classes to separate', value: 'Class I|Class II',
          options: [
            { value: 'Class I|Class II', label: 'Class I vs Class II' },
            { value: 'Class I|Class III', label: 'Class I vs Class III' },
            { value: 'Class II|Class III', label: 'Class II vs Class III' }] }) +
        U.slider({ id: 'nb-alpha', label: 'Laplace smoothing (alpha)', min: 0, max: 5, value: 1, step: 0.05 }),
      readout:
        U.metric('nb-acc', 'Held-out accuracy', '—') +
        U.metric('nb-f1', 'Macro F1', '—') +
        U.metric('nb-vocab', 'Vocabulary', '—') +
        U.metric('nb-prior', 'Class priors', '—'),
      explain:
        '<div class="field" style="max-width:60ch">' +
          '<label for="nb-probe">Score a notice of your own</label>' +
          '<textarea id="nb-probe" rows="2">undeclared milk allergen not listed on the label</textarea>' +
          '<div class="field-hint">Try adding an unusual word with smoothing set ' +
          'to zero, and watch the classification break.</div>' +
        '</div>' +
        '<div class="flex" style="margin-bottom:var(--s5)">' +
          '<button type="button" class="btn btn-sm" data-nb-example="product may be contaminated with listeria monocytogenes">Pathogen notice</button>' +
          '<button type="button" class="btn btn-sm" data-nb-example="minor printing error on the carton net weight statement">Labelling notice</button>' +
          '<button type="button" class="btn btn-sm" data-nb-example="quixotic bioluminescent perambulation">Nonsense words</button>' +
        '</div>' +
        '<div data-nb-probe></div>',
      altLabel: 'Read the word probabilities and the confusion matrix as text'
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
      title: 'PCA visualiser',
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
        U.metric('pca-90', 'To reach 90%', '—') +
        U.metric('pca-two-acc', 'Accuracy on 2 components', '—') +
        U.metric('pca-best', 'Best accuracy', '—'),
      explain: '',
      altLabel: 'Read the variance spectrum and accuracy curve as text'
    },

    'embeddings': {
      title: 'Foundation-model embedding explorer',
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

    'knn': {
      title: 'Who is biologically similar?',
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

    'clustering': {
      title: 'Biological subgroup explorer',
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
    ].filter(function (s) {
      if (s.id === 'welcome') return !!w.welcome;
      if (s.id === 'transition') return !!w.transition;
      if (s.id === 'videos') return !!(w.videos && w.videos.length);
      if (s.id === 'sustainability') return !!w.sustainability;
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
    html += '<section id="interactive"><h2>Interactive exploration</h2>' +
      vizBlock(w.viz) + (w.viz2 ? vizBlock(w.viz2) : '') +
      (w.viz3 ? vizBlock(w.viz3) : '') + '</section>';

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

    /* 8. Foundation model connection */
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
