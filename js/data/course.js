/* COMP9085 - course model.
 *
 * This single file holds the curriculum. Every week page, the roadmap, the labs
 * index and the learning-outcome map are rendered from it, so editing a week
 * here changes it everywhere. See docs/MAINTENANCE.md.
 *
 * Field guide for each week:
 *   n, title, strand      - identity and which arc of the course it belongs to
 *   objectives[]          - what the student should be able to do afterwards
 *   los[]                 - official module learning outcomes served
 *   concepts[]            - key concepts, each {term, body}
 *   biology               - the biological framing for the week
 *   viz                   - id of the interactive on the page
 *   worked                - worked example, shown before the interactive
 *   lab                   - id into window.LABS
 *   datasets[]            - ids into window.DATASETS
 *   fm                    - the foundation-model connection {title, body, models[]}
 *   scientist             - the "Think like a scientist" prompt
 *   quiz[]                - self-check questions
 *   reading[]             - reference ids into window.REFERENCES, plus notes
 *   provenance            - what this week inherits from the 2025/26 module
 */
window.COURSE = {
  code: 'COMP9085',
  title: 'Machine Learning and Foundation Models for Biology, Healthcare and Nutrition',
  shortTitle: 'Machine Learning in Biology',
  institution: 'Munster Technological University',
  department: 'Department of Computer Science',
  credits: 5,
  level: 'NFQ Level 9 (MSc)',
  lecturer: 'Dr Haithem Afli',
  contact: 'haithem.afli@mtu.ie',

  strapline:
    'Foundation models do not replace machine-learning fundamentals. They build on them.',

  description:
    'The biological sciences are data-rich and information-intensive, and the ' +
    'methods available to analyse that data have changed substantially. This ' +
    'module teaches classical machine learning properly, then shows where ' +
    'foundation models extend it and where they do not. Every technique is ' +
    'introduced through a biological, clinical or nutritional problem, and ' +
    'every result is examined for whether it would survive scientific scrutiny.',

  centralQuestion:
    'What is the simplest appropriate machine-learning approach for this ' +
    'biological problem, and what evidence do you have that it is appropriate?',

  /* The five official module learning outcomes, unchanged from the approved
   * COMP9085 module descriptor. See docs/CURRICULUM.md for the discussion of
   * why they are retained verbatim. */
  learningOutcomes: [
    { id: 'LO1', text: 'Analyse machine learning workflows to facilitate pre-processing, dimensionality reduction and model selection.' },
    { id: 'LO2', text: 'Compare and apply appropriate machine learning algorithms to specific Biological datasets.' },
    { id: 'LO3', text: 'Develop supervised machine learning models for classification tasks.' },
    { id: 'LO4', text: 'Develop unsupervised machine learning models for clustering tasks.' },
    { id: 'LO5', text: 'Evaluate the accuracy of predictive models using standard methods and interpret their results.' }
  ],

  /* The five-stage learning journey, used by the home page diagram. */
  journey: [
    { id: 'classical', stage: 'Classical machine learning', question: 'Can I build a model?',
      weeks: [1, 2, 3, 4, 5], colour: 'stage-1',
      body: 'Trees, probability, naive Bayes and the full scikit-learn workflow, on clinical and food-safety data.' },
    { id: 'representation', stage: 'Representation learning', question: 'Can I learn useful features?',
      weeks: [6, 7], colour: 'stage-2',
      body: 'Data quality, feature engineering, dimensionality reduction and the idea that a model is only as good as what you feed it.' },
    { id: 'foundation', stage: 'Foundation models', question: 'Can I reuse knowledge learned from massive biological datasets?',
      weeks: [7, 8, 9], colour: 'stage-3',
      body: 'Self-supervised pretraining, embeddings, and what a biological foundation model does and does not know.' },
    { id: 'adaptation', stage: 'Adaptation', question: 'Can I adapt the model to my biological problem?',
      weeks: [10, 11], colour: 'stage-4',
      body: 'Zero-shot use, embeddings plus a classical head, transfer learning, fine-tuning, LoRA and adapters.' },
    { id: 'evaluation', stage: 'Scientific evaluation', question: 'Can I trust the result?',
      weeks: [3, 4, 12], colour: 'stage-5',
      body: 'Leakage, calibration, uncertainty, bias, external validation, cost and the difference between a good score and a real finding.' }
  ],

  /* The persistent comparison used across the whole module. */
  pipelines: {
    classical: {
      title: 'Classical machine learning',
      steps: [
        { id: 'c1', label: 'Biological data', body: 'A cohort, an assay, a survey, a set of images. Usually hundreds to thousands of rows.',
          example: '569 breast masses, each described by 30 measurements taken from a digitised fine-needle aspirate image.' },
        { id: 'c2', label: 'Feature engineering', body: 'A human decides what to measure. Domain knowledge is encoded by hand into columns.',
          example: 'A pathologist-informed choice: nuclear radius, texture, perimeter, concavity. Each column means something a clinician can name.' },
        { id: 'c3', label: 'Model training', body: 'A model with relatively few parameters is fitted to those features.',
          example: 'A random forest of 500 trees fitted to the 30 features. Trains on a laptop in a couple of seconds.' },
        { id: 'c4', label: 'Prediction', body: 'The model outputs a class or a value, and you can usually ask why.',
          example: 'Malignant, with feature importances showing "worst area" and "worst concave points" carrying most of the decision.' }
      ]
    },
    foundation: {
      title: 'Foundation-model approach',
      steps: [
        { id: 'f1', label: 'Massive biological corpus', body: 'Unlabelled sequence, image or text data, far larger than any single study could label.',
          example: 'DNABERT-2 was pretrained on genomes from 135 species totalling 32.49 billion nucleotide bases. [ref:dnabert2]' },
        { id: 'f2', label: 'Self-supervised pretraining', body: 'The model learns by predicting parts of its own input. No human labels are needed.',
          example: 'Masked-language modelling: hide some residues or bases and train the model to reconstruct them from context.' },
        { id: 'f3', label: 'Foundation model', body: 'A large general-purpose network whose weights encode statistical regularities of the corpus.',
          example: 'ESM-2 is released at 8M, 35M, 150M, 650M, 3B and 15B parameters, all pretrained on UniRef50/D. [ref:esm2]' },
        { id: 'f4', label: 'Representation / embedding', body: 'A fixed-length vector per sequence, produced without any task-specific training.',
          example: 'Mean-pool the final hidden layer over the residues to get one vector per protein. Nothing about your task is used.' },
        { id: 'f5', label: 'Downstream model', body: 'A small classical model, or a light fine-tune, maps the representation to your labels.',
          example: 'Logistic regression on the embedding, trained on the 200 labelled examples you actually have.' }
      ],
      note: 'Notice that step 5 is a classical machine-learning model. The foundation model changed the input representation, not the discipline.'
    }
  },

  weeks: [
    /* ------------------------------------------------------------------ 1 */
    {
      n: 1,
      title: 'Machine learning in biology, and an introduction to foundation models',
      strand: 'classical',
      short: 'Module orientation, the biological data landscape, the classical ML workflow, and where foundation models fit.',
      los: ['LO1', 'LO2'],
      noLab: true,
      orientation: true,

      /* ---- Part 1: welcome and module orientation ---------------------- */
      welcome: {
        title: 'Welcome to COMP9085',
        body:
          'This module is about applying machine learning to biological, ' +
          'clinical and nutritional problems, and about being able to defend ' +
          'the result afterwards. Both halves matter. Getting a model to run is ' +
          'the easy part of this work, and it is not what an MSc in this area ' +
          'is for.\n\n' +
          'The module is delivered as a two-hour lecture and a two-hour ' +
          'practical each week, with roughly three hours of independent ' +
          'reading and implementation on top. It is assessed entirely by ' +
          'coursework: two projects, worth 50 per cent each, with no written ' +
          'examination.\n\n' +
          'This week is orientation. There is no practical laboratory in Week ' +
          '1: the first formal lab runs in Week 2, once you have the decision ' +
          'tree material to work with. Use this week to read the module ' +
          'descriptor, set up your Python environment, and watch the two short ' +
          'videos below.',
        lecturer:
          'Dr Haithem Afli lectures in the Department of Computer Science at ' +
          'MTU and is a principal investigator in the national ADAPT Centre, ' +
          'where he leads the Human-Centred AI research group. His research is ' +
          'in natural language processing, trustworthy and explainable AI, and ' +
          'machine learning for biology and the social sciences. Several of the ' +
          'themes in this module, particularly the material on trust and ' +
          'evaluation in Week 12, come directly out of that work.',
        howToUse: [
          { what: 'The lecture', body: 'Two hours a week. The slides are on this site and on Canvas, as both PowerPoint and PDF, before the lecture.' },
          { what: 'This website', body: 'Every week has a page with the concepts, an interactive figure you can manipulate, a worked example and a self-check. The figures are live models, not pictures: when you move a control, a model is genuinely fitted in your browser.' },
          { what: 'The practical', body: 'Two hours a week from Week 2. Bring the deliverable to the following session.' },
          { what: 'Canvas', body: 'Announcements, submissions and grades. The teaching material is here and linked from Canvas, so there is one copy of it rather than two that drift apart.' },
          { what: 'The weekly check-in', body: 'At the bottom of each week page. It stays in your browser and nobody else sees it. It exists so you can see your own confidence change over the semester, and so you have something specific to raise in the lab.' }
        ]
      },

      biology:
        'Biology produces data in shapes that no single method handles well: genomes are ' +
        'long discrete sequences, proteomes are sequences with three-dimensional ' +
        'consequences, medical images are pixel grids, clinical records are sparse ' +
        'irregular tables, and nutrition data is self-reported and noisy. The first job ' +
        'is to recognise which kind of problem you are looking at, because that decides ' +
        'everything downstream.\n\n' +
        'These domains are also harder than the benchmark datasets machine learning is ' +
        'usually taught on. Sample sizes are small and features are many. Labels are ' +
        'expensive, and are often a clinician\'s judgement rather than a measurement. ' +
        'Rows are not independent, because several samples come from one patient. ' +
        'Measurement error is substantial and systematic. And the cost of the two kinds ' +
        'of error is almost never equal.',

      objectives: [
        'Describe what this module covers, how it is assessed, and how the lecture, the website and the practical fit together.',
        'Distinguish artificial intelligence, machine learning and deep learning, and place foundation models within that hierarchy.',
        'Define the basic vocabulary: training data, features, labels, model, prediction, generalisation.',
        'Classify a biological question as supervised, unsupervised, or a representation-learning problem.',
        'Describe the main families of biological data and the measurement process behind each.',
        'Explain the difference between predicting an outcome and explaining a mechanism.',
        'State, in one sentence, what a foundation model is and what pretraining buys you.',
        'Explain why the largest available model is not automatically the right scientific choice.'
      ],

      concepts: [
        { term: 'Machine learning', body: 'Fitting a function from data rather than specifying it by hand. The data, not the programmer, determines the rule. This is the whole idea, and everything else in the module is a consequence of it.' },
        { term: 'Training data', body: 'The set of examples the algorithm learns from. Written D = [(d1, t1), (d2, t2), ..., (dn, tn)], where each d is a description of one instance and each t is its target value.' },
        { term: 'Features and labels', body: 'A feature (or descriptive feature) is an input column; the label (or target feature) is what you are predicting. In the breast-cancer data used from Week 2, thirty nuclear measurements are the features and the benign/malignant diagnosis is the label.' },
        { term: 'Model', body: 'The output of the learning algorithm: M = Learn(D). It is a function you can apply to a new instance q to obtain a prediction, t = M(q). Building the model and deploying it are two distinct steps.' },
        { term: 'Generalisation', body: 'The only thing that matters. A model that reproduces its training data perfectly and fails on a new patient has learned nothing useful. Week 3 is about measuring this honestly and Week 12 about whether the measurement can be believed.' },
        { term: 'Supervised learning', body: 'Every training example carries a label. Classification predicts a category (benign or malignant); regression predicts a quantity (serum vitamin D concentration in nanomoles per litre).' },
        { term: 'Unsupervised learning', body: 'No labels. The task is to find structure: clusters of patients, groups of co-expressed genes, dominant axes of variation. Weeks 7 and 9.' },
        { term: 'Semi-supervised and reinforcement learning', body: 'Two further categories. Semi-supervised learning uses a small labelled set alongside a large unlabelled one, which is the common situation in biology. Reinforcement learning learns from interaction and reward, and is not covered in this module.' },
        { term: 'Representation learning', body: 'Learning what the features should be, instead of choosing them by hand. This is the bridge between classical ML and foundation models, and it is where the module turns in Week 7.' },
        { term: 'Foundation model', body: 'A large model pretrained with self-supervision on a broad corpus, intended to be adapted to many downstream tasks rather than built for one. Note that size is not part of the definition: ESM-2 is released as small as 8 million parameters and is still a foundation model.' },
        { term: 'Prediction versus explanation', body: 'A model can predict an outcome accurately while encoding no causal mechanism. The two goals need different evidence, and conflating them is the most common error in applied biological machine learning.' },
        { term: 'Biological data landscape', body: 'Genomics (discrete, very long), proteomics (sequence plus structure), medical imaging (high-dimensional, spatially structured), clinical records (sparse, irregular, confounded), nutrition (self-reported, high measurement error).' }
      ],

      evolution: [
        { label: 'Traditional programming', body: 'A human writes the rule. "If the loan-to-salary ratio is above 3, flag the application." Works when the rule is knowable, stable and small enough to write down.' },
        { label: 'Classical machine learning', body: 'A human chooses the features; the algorithm learns the rule from labelled examples. This is Weeks 2 to 6.' },
        { label: 'Deep learning', body: 'The network learns a hierarchy of features from raw input, given enough labelled data. The labelled data is usually the binding constraint in biology.' },
        { label: 'Representation learning', body: 'The useful product is the learned intermediate representation, not only the final prediction. Week 7.' },
        { label: 'Foundation models', body: 'Representations are learned once, from a huge unlabelled corpus, by self-supervision. Nobody labelled that corpus, which is why it can be enormous.' },
        { label: 'Downstream biological applications', body: 'Those representations are reused for tasks that individually have far too little labelled data to train from scratch. Weeks 8, 10 and 11.' }
      ],

      /* ---- The credit example, retained and then turned biological ------ */
      transition: {
        title: 'From a generic example to a biological one, deliberately',
        body:
          'The original version of this lecture built its whole introduction on ' +
          'a credit-scoring example: classify loan applicants as repayers or ' +
          'defaulters from occupation, age, loan amount and loan-to-salary ' +
          'ratio. That example is kept here, in short, because it does one job ' +
          'extremely well and it is worth doing before any biology appears.\n\n' +
          'Given six applicants you can invent a rule by eye. Something like ' +
          '"loan-to-salary ratio above 3 means default" fits, and you have just ' +
          'done by hand what a decision tree does automatically.\n\n' +
          'Then the dataset grows to twenty-five rows with seven features and ' +
          'the exercise stops being possible. Not harder: genuinely not doable ' +
          'by inspection. The rules interact, the exceptions have exceptions, ' +
          'and no amount of staring produces the answer. That moment is the ' +
          'entire argument for machine learning, and it is why the original ' +
          'slide carries the instruction not to actually ask the class to ' +
          'attempt it.\n\n' +
          'Now replace the columns and keep the structure exactly. Instead of ' +
          'occupation, age and loan-to-salary ratio, take thirty measurements ' +
          'of cell-nucleus shape and texture from a breast-mass biopsy image. ' +
          'Instead of repaid or defaulted, take benign or malignant. The ' +
          'machine-learning problem is identical. What changes is everything ' +
          'that surrounds it: where the measurements came from, how reliable ' +
          'they are, who is in the dataset and who is not, what a false ' +
          'negative costs, and what you would have to show before anyone should ' +
          'act on the output.\n\n' +
          'That surrounding material is the actual content of this module. The ' +
          'algorithms are the easy part.',
        parallel: [
          { generic: 'Loan applicant', biological: 'Breast-mass biopsy, patient, protein sequence, microbiome sample' },
          { generic: 'Occupation, age, loan-to-salary ratio', biological: 'Nuclear radius, texture, concavity; gene expression; amino-acid composition' },
          { generic: 'Repaid or defaulted', biological: 'Benign or malignant; responder or non-responder; pathogenic or benign variant' },
          { generic: 'A wrong decision costs money', biological: 'A false negative is a missed cancer; a false positive is an unnecessary biopsy' },
          { generic: 'Data is abundant and cheaply labelled', biological: 'Labels need a pathologist, an assay or a five-year follow-up' }
        ]
      },

      viz: 'problem-classifier',

      videos: ['week1BiologyMeetsCS', 'week1AlphaFold'],

      worked: {
        title: 'AlphaFold, read carefully',
        body:
          'For fifty years, predicting a protein\'s three-dimensional structure ' +
          'from its amino-acid sequence was an open problem. AlphaFold 2 ' +
          'changed the practical situation: at CASP14 it produced predictions ' +
          'competitive with experimental structures for many targets ' +
          '[ref:alphafold2], and the AlphaFold Protein Structure Database now ' +
          'provides open predicted structures covering over 214 million protein ' +
          'sequences [ref:afdb].\n\n' +
          'It is worth being precise about what that does and does not mean. ' +
          'AlphaFold predicts a single static structure, and reports its own ' +
          'confidence as pLDDT: above 90 is very high confidence, 70 to 90 ' +
          'confident, 50 to 70 low, and below 50 very low. Regions scoring very ' +
          'low tend to correspond to intrinsically disordered regions ' +
          '[ref:afdbOriginal]. So a low-confidence region is not necessarily a ' +
          'failure of the model; it may be an honest signal that the protein ' +
          'does not have one fixed structure there. AlphaFold 3 extended the ' +
          'approach to complexes with ligands, nucleic acids and modified ' +
          'residues [ref:alphafold3].\n\n' +
          'What AlphaFold did not do is "solve biology". It does not tell you ' +
          'what a protein does, how its structure changes on binding, or which ' +
          'conformation matters in a cell. Holding both halves of that ' +
          'statement at once is the habit this module is trying to build.\n\n' +
          'It is also not a conventional supervised model of the kind you will ' +
          'build in Week 2. It combines learned representations of sequence and ' +
          'of evolutionary relationships with strong architectural assumptions ' +
          'about geometry. Do not file it mentally as "a big classifier". File ' +
          'it as evidence that the representation is where the difficulty lives.',
        keypoint: 'A striking result and a careful reading of its limits are not in tension. Both are required.'
      },

      fm: {
        title: 'Where foundation models enter the story',
        body:
          'Notice the pattern behind AlphaFold and the sequence models you will ' +
          'meet later. A very large model is trained once, at great expense, on ' +
          'data nobody labelled for a specific task, and the resulting ' +
          'representation is then reused for many tasks.\n\n' +
          'Three workflows are worth having in your head from today, at a ' +
          'conceptual level only. You are not expected to implement any of them ' +
          'this week.\n\n' +
          'Classical machine learning: biological data, then feature ' +
          'engineering by a human, then a model, then a prediction.\n\n' +
          'The foundation-model workflow: a biological sequence, image or text, ' +
          'then a pretrained model, then a representation or embedding, then a ' +
          'downstream model. Notice that the last step is an ordinary ' +
          'supervised model. The foundation model changed the input ' +
          'representation, not the discipline.\n\n' +
          'Fine-tuning: a pretrained model, then adaptation to your biological ' +
          'task, then a prediction. This is the most expensive option and ' +
          'Week 11 is about when it is worth it.\n\n' +
          'This module returns to this comparison in every week. The question ' +
          'is never "is the foundation model better", it is "what ' +
          'representation does this problem need, and where is the cheapest ' +
          'honest way to get it".',
        models: ['alphafold2', 'alphafold3']
      },

      sustainability: {
        title: 'Cost, sustainability and choosing the right size of model',
        body:
          'Training large models has a measurable energy and carbon cost. ' +
          'Strubell and colleagues estimated that training a single ' +
          'language-processing model can emit on the order of hundreds of ' +
          'kilograms of carbon dioxide equivalent, and that the full ' +
          'development cycle of architecture search and retraining is very much ' +
          'larger again [ref:strubell2019]. Stanford HAI\'s summary of that ' +
          'work is the reading for this section.\n\n' +
          'As Dan Jurafsky put it, there is a strong push to scale machine ' +
          'learning up to bigger problems with more compute and more data, and ' +
          'as that happens we have to ask whether the benefits of heavy-compute ' +
          'models are worth the environmental cost.\n\n' +
          'This is not an ethical footnote bolted onto a technical module. It ' +
          'is a model-selection criterion, and it belongs beside accuracy. On ' +
          'the real dataset used throughout this module, plain logistic ' +
          'regression reaches 97.4 per cent cross-validated accuracy and a ' +
          '500-tree random forest reaches 95.4 per cent. If a model a thousand ' +
          'times more expensive had matched them, choosing it would have been ' +
          'the wrong engineering decision, not a neutral one.\n\n' +
          'Week 12 returns to this with the full trust checklist, where ' +
          'computational cost sits alongside calibration, external validation ' +
          'and licensing.',
        keypoint: 'A bigger model is not automatically a better scientific model.'
      },

      scientist:
        'Pick a biological question you care about. Write down what a perfect ' +
        'predictive model of it would tell you, and then write down what it ' +
        'would still not tell you. If the two lists look the same, you may be ' +
        'asking for explanation while planning to measure prediction.',

      quiz: [
        { q: 'A researcher has 4,000 unlabelled tumour RNA-seq profiles and wants to know whether there are previously unrecognised subtypes. What kind of problem is this?',
          options: ['Supervised classification', 'Unsupervised clustering', 'Regression', 'Zero-shot prediction'],
          answer: 1,
          why: 'There are no labels and the goal is to discover structure, so this is clustering. Note that finding clusters is not the same as discovering subtypes, which is the point Week 9 develops at length.' },
        { q: 'What makes a model a "foundation model" rather than just a large neural network?',
          options: ['It has more than one billion parameters', 'It was pretrained with self-supervision on a broad corpus and is intended to be adapted to many downstream tasks', 'It uses the transformer architecture', 'It achieves state-of-the-art accuracy'],
          answer: 1,
          why: 'Size and architecture are incidental. The defining features are self-supervised pretraining on broad data and reusability across tasks. ESM-2 is released as small as 8 million parameters and is still a foundation model.' },
        { q: 'An AlphaFold prediction shows a 40-residue stretch with pLDDT around 35. What is the most defensible interpretation?',
          options: ['The prediction failed and should be discarded', 'That region is likely to be intrinsically disordered or conformationally flexible', 'The protein does not exist', 'Confidence scores are unreliable below 50'],
          answer: 1,
          why: 'Very low pLDDT correlates with intrinsic disorder [ref:afdbOriginal]. The model is reporting genuine uncertainty, which is information rather than merely failure.' },
        { q: 'You have a labelled biological dataset and two candidate models. Model A reaches 96.1 per cent accuracy on a laptop in two seconds. Model B reaches 96.4 per cent using a GPU for six hours. What should you do?',
          options: ['Use Model B, since it is more accurate', 'Check whether the difference is larger than the uncertainty in the estimate before treating it as a difference at all', 'Use whichever is more recent', 'Average the two predictions'],
          answer: 1,
          why: 'A gap of 0.3 percentage points on a few hundred samples sits well inside the confidence interval, so the two models are not distinguishable on that evidence. Once they are indistinguishable on accuracy, the cheaper and more interpretable one wins. Weeks 3 and 12 make this precise.' }
      ],

      datasets: ['wdbc', 'afdb'],

      reading: [
        { ref: 'greener2022', note: 'The best single orientation piece for a biologist starting in machine learning. Read it this week; it is worth more than any textbook chapter at this stage.' },
        { ref: 'jones2019', note: 'Two pages on what goes wrong when machine learning meets biology. Short, and worth rereading in Week 12.' },
        { ref: 'alphafold2', note: 'Skim the abstract and the figures. You are not expected to follow the architecture yet.' },
        { ref: 'afdb', note: 'For the scale of the structure database and how to query it.' },
        { ref: 'strubell2019', note: 'For the energy cost of training large models. Stanford HAI has an accessible summary.' },
        { ref: 'geron', note: 'Chapter 1 for the general framing. The module follows its own path from Week 2 onwards.' }
      ],

      provenance: {
        kept: 'The AlphaFold framing and video, the "Biology Meets Computer Science" video, the AI/ML/DL hierarchy, the categories-of-learning material, the Build/Deploy two-step diagram with D = [(d1,t1),...] and M = Learn(D), the generalisation discussion, the credit-decision example in compressed form (including the pedagogical point that hand-writing a rule for 25 rows is not possible, which the original speaker notes flag explicitly), the carbon-footprint material with the Dan Jurafsky quotation and the Stanford HAI source, and the module descriptor link from slide 5.',
        changed: 'The credit example is cut from roughly 21 slides to a compact sequence that makes its point and then transfers structurally onto the breast-cancer diagnosis problem, so the relevance to COMP9085 is immediate. Module orientation, the biological data landscape, the difficulty of biological ML, and a conceptual introduction to foundation models are added. The carbon-footprint material is kept in Week 1 as a model-selection criterion and is revisited in Week 12. The Week 4 hype clip of unclear provenance is dropped; see docs/VIDEO_SOURCES.md. There is no Week 1 practical: the first lab is in Week 2.'
      }
    },

    /* ------------------------------------------------------------------ 2 */
    {
      n: 2,
      title: 'Decision trees and explainable biological prediction',
      strand: 'classical',
      short: 'Entropy, information gain and the first model you can read line by line.',
      los: ['LO2', 'LO3', 'LO5'],
      biology:
        'A fine-needle aspirate of a breast mass is imaged, and the boundary of each cell ' +
        'nucleus is traced. Ten measurements are computed per nucleus, and each is summarised ' +
        'across the image by its mean, its standard error and its worst (largest) value, ' +
        'giving 30 features per sample. The clinical target is whether the mass is benign or ' +
        'malignant. This is the module\'s reference dataset: real, well-documented, small ' +
        'enough to think about, and consequential enough to take seriously.',
      objectives: [
        'Compute entropy and information gain by hand for a small biological dataset.',
        'Explain how a decision tree chooses its root feature, and why that choice is greedy.',
        'Relate tree depth to overfitting, and read a train/test gap correctly.',
        'Apply pre-pruning and post-pruning, and justify which you used.',
        'Interpret a fitted tree as a clinical decision rule, and state where that interpretation breaks down.'
      ],
      concepts: [
        { term: 'Feature and target', body: 'A descriptive feature is an input column; the target is what you are predicting. In WDBC, 30 nuclear measurements predict a benign/malignant diagnosis.' },
        { term: 'Entropy', body: 'Shannon\'s measure of impurity in a set of labels. H(S) = -Σ p(c) log₂ p(c). It is zero when every example has the same label and maximal when the classes are balanced.' },
        { term: 'Information gain', body: 'The reduction in entropy achieved by splitting on a feature: the entropy before the split, minus the weighted average entropy of the resulting partitions.' },
        { term: 'Decision boundary', body: 'A tree carves the feature space into axis-parallel rectangles. This is a real constraint: a diagonal boundary needs a staircase of splits to approximate.' },
        { term: 'Tree depth and overfitting', body: 'Deeper trees fit training data better and, past a point, generalise worse. The gap between training and test accuracy is the diagnostic.' },
        { term: 'Pruning', body: 'Pre-pruning stops growth early (max_depth, min_samples_leaf). Post-pruning grows the full tree and removes subtrees that do not pay for themselves on held-out data.' },
        { term: 'Interpretability, carefully', body: 'A shallow tree is genuinely readable. That is not the same as being correct, and a readable wrong rule is more dangerous than an opaque one because it is more persuasive.' }
      ],
      viz: 'decision-tree',
      viz2: 'entropy',
      viz3: 'deployment',
      worked: {
        title: 'Choosing the root split by hand',
        body:
          'Take a small set of 14 patients, 6 of whom have a high-risk outcome and 8 low-risk. ' +
          'The entropy before any split is H = -(6/14)log2(6/14) - (8/14)log2(8/14) = 0.985 bits. ' +
          'The set is close to maximally impure.\n\n' +
          'Now split on a candidate feature. Suppose "worst concave points > 0.14" produces a ' +
          'partition of 7 patients that is 6 high-risk and 1 low-risk (H = 0.592) and a ' +
          'partition of 7 that is 0 high-risk and 7 low-risk (H = 0). The weighted average ' +
          'after the split is (7/14)(0.592) + (7/14)(0) = 0.296 bits, so the information gain ' +
          'is 0.985 - 0.296 = 0.689 bits.\n\n' +
          'A competing split producing two partitions of 4/3 and 2/5 would leave average ' +
          'entropy near 0.93 and gain only about 0.05 bits. The algorithm takes the first. ' +
          'That is the whole of ID3: try every split, keep the one that removes most ' +
          'uncertainty, recurse. The greediness matters, because the split that looks best ' +
          'now is not always part of the best whole tree.',
        keypoint: 'Information gain is just "how much less uncertain am I after asking this question".'
      },
      fm: {
        title: 'Why we start here and not with a transformer',
        body:
          'On the real WDBC data, a decision tree of depth 3 reaches about 92 per cent ' +
          'cross-validated accuracy, and a random forest about 95 per cent. A foundation ' +
          'model has nothing to contribute to this problem: the features are already ' +
          'meaningful numbers chosen by domain experts, there are only 30 of them, and no ' +
          'pretrained model exists for "digitised nuclear morphometry". This is the first ' +
          'and most important negative example in the module. Foundation models help when ' +
          'the representation is the hard part. Here it is not.',
        models: []
      },
      scientist:
        'Your tree says "if worst concave points > 0.142 then malignant". A clinician asks ' +
        'whether that threshold is real. What would you need to show them before they should ' +
        'believe it: how stable is it across resamples of the data, and would it survive on ' +
        'a cohort imaged with a different scanner?',
      quiz: [
        { q: 'A node contains 20 samples, all malignant. What is its entropy?',
          options: ['1.0 bits', '0.5 bits', '0 bits', 'Undefined'],
          answer: 2,
          why: 'A pure node has zero entropy: there is no uncertainty left about the label. This is why it becomes a leaf.' },
        { q: 'Training accuracy rises from 0.96 to 1.00 as depth goes from 5 to 8, while test accuracy stays at about 0.94. What is happening?',
          options: ['The model is improving', 'The model is overfitting: extra depth buys training fit but no generalisation', 'The test set is too small', 'The features need scaling'],
          answer: 1,
          why: 'This is the measured behaviour on WDBC, shown in the depth explorer on this page. The training curve reaching 1.00 while the test curve flattens is the signature of memorisation.' },
        { q: 'Why do decision trees not require feature scaling, when k-NN does?',
          options: ['Trees are more robust to noise', 'Trees split on thresholds within a single feature at a time, so a monotone rescaling of any feature leaves the tree unchanged', 'Trees use entropy rather than distance', 'They do require scaling'],
          answer: 1,
          why: 'Both parts of the reasoning matter: the split is univariate, and it is threshold-based, so any order-preserving transformation of a feature produces the same partition. Distance-based methods mix features into one number and are therefore scale-sensitive.' }
      ],
      lab: 'lab02',
      datasets: ['wdbc'],
      reading: [
        { ref: 'wdbc', note: 'The dataset documentation, including how the 30 features were derived from the images.' },
        { ref: 'geron', note: 'Chapter 6 on decision trees.' }
      ],
      provenance: {
        kept: 'The Guess Who motivation, the entropy and information-gain derivation, the ID3 walkthrough, continuous-feature handling, and the overfitting and pruning material from the 2025/26 Week 2 deck. This is the strongest teaching sequence in the existing module and is retained essentially intact.',
        changed: 'The worked example moves from the generic heart-disease risk table to the real WDBC data, so the same arithmetic now runs on the dataset used in Project 1. The Week 2 lab moves from the UCI wine dataset to WDBC.'
      }
    },

    /* ------------------------------------------------------------------ 3 */
    {
      n: 3,
      title: 'The complete machine-learning workflow',
      strand: 'classical',
      short: 'scikit-learn end to end, and the four ways a pipeline silently lies to you.',
      los: ['LO1', 'LO3', 'LO5'],
      biology:
        'A biological ML result is only as trustworthy as the protocol that produced it. ' +
        'The failure modes in this week are not exotic: they are the ordinary mistakes that ' +
        'produce impressive published numbers which do not reproduce. A review of ' +
        'machine-learning-based science found 329 papers across 17 fields affected by data ' +
        'leakage [ref:kapoor2023]. In biology specifically, selecting features on the whole ' +
        'dataset before cross-validation has been known to produce dramatically optimistic ' +
        'error estimates since at least 2002 [ref:ambroise2002].',
      objectives: [
        'Construct a complete scikit-learn Pipeline from raw data to a saved model.',
        'Identify data leakage in a described protocol, and name which kind it is.',
        'Choose an appropriate cross-validation scheme, including when grouping matters.',
        'Establish and report a baseline, and interpret a model relative to it rather than to zero.',
        'Make an analysis reproducible: seeds, versions, and a fixed protocol declared before looking at results.'
      ],
      concepts: [
        { term: 'The workflow', body: 'Problem definition, data collection, exploration, preprocessing, train/test split, training, hyperparameter tuning, evaluation, interpretation, deployment. The order is not decorative: preprocessing decisions made after seeing the test set are leakage.' },
        { term: 'Data leakage', body: 'Information from outside the training data reaching the model. It inflates the reported score without improving the model, so it is invisible unless you look for it.' },
        { term: 'Preprocessing leakage', body: 'Fitting a scaler, imputer or feature selector on the full dataset before splitting. The fix is to put every fitted step inside a Pipeline.' },
        { term: 'Duplicate and group leakage', body: 'The same patient, sample or near-duplicate row appearing in both training and test. Use GroupKFold on the patient identifier, not the row index.' },
        { term: 'Temporal leakage', body: 'Training on data collected after the prediction time. If the model will be used prospectively, evaluate it prospectively.' },
        { term: 'Cross-validation', body: 'Stratified k-fold for classification; grouped variants when rows are not independent; nested CV when you are also tuning hyperparameters.' },
        { term: 'Baselines', body: 'The majority class on WDBC gives 62.7 per cent accuracy. A model reporting 85 per cent has beaten nothing worth beating. Always report the baseline alongside.' },
        { term: 'Reproducibility', body: 'Fixed random seeds, recorded library versions, a script rather than a notebook run out of order, and the protocol written down before the results are seen.' }
      ],
      viz: 'leakage',
      worked: {
        title: 'How much does leakage actually cost you?',
        body:
          'This is worth measuring rather than asserting, so the numbers below were produced ' +
          'by running the protocols on real data. The script is in the repository at ' +
          'data/scripts/02_build_benchmarks.py.\n\n' +
          'Case one: 100 samples, 5,000 features of pure Gaussian noise, and labels assigned ' +
          'at random. There is no signal at all, so an honest protocol must report chance. ' +
          'Selecting the best 20 features on the whole dataset and then cross-validating ' +
          'gives 88 per cent accuracy. Selecting inside each fold gives 55 per cent. The ' +
          'first number is entirely manufactured.\n\n' +
          'Case two: the real WDBC data, feature selection done the wrong way. The inflation ' +
          'is essentially zero, because the informative features get selected either way. ' +
          'This is the more unsettling result. The size of the inflation depends on the data, ' +
          'so the absence of a large gap is not evidence that your protocol was sound. You ' +
          'cannot detect leakage by looking at the score.\n\n' +
          'Case three: duplicating a quarter of the rows before splitting, with a 1-nearest-' +
          'neighbour classifier, raises measured accuracy from 95.1 to 97.2 per cent. The ' +
          'model has learned nothing; it is being tested on copies of its own training data.',
        keypoint: 'Leakage is not detectable from the score. It is only detectable from the protocol.'
      },
      fm: {
        title: 'Leakage gets worse, not better, with foundation models',
        body:
          'Two new failure modes appear once pretrained models are involved. First, ' +
          'pretraining-set contamination: if the model was pretrained on a corpus that ' +
          'already contains your test sequences, your held-out set was never held out. ' +
          'Checking this is genuinely difficult, because pretraining corpora are large and ' +
          'not always fully documented. Second, embedding leakage: computing embeddings for ' +
          'the whole dataset is fine, because the foundation model never sees your labels, ' +
          'but any label-aware step applied afterwards, such as selecting embedding ' +
          'dimensions by their correlation with the target, must still go inside the fold.',
        models: ['nucleotideTransformer', 'esm2']
      },
      scientist:
        'A colleague reports 0.97 AUC for predicting treatment response from gene expression, ' +
        'using 5-fold cross-validation on 80 patients with 20,000 genes. Before you believe ' +
        'the number, what three questions do you ask about the protocol, and what answer to ' +
        'each would make you stop worrying?',
      quiz: [
        { q: 'You impute missing values using the column mean computed over the whole dataset, then split into train and test. What is wrong?',
          options: ['Nothing, mean imputation is standard', 'Test-set information has entered the training data through the imputed values', 'The mean is the wrong statistic', 'You should have dropped the rows'],
          answer: 1,
          why: 'The mean was computed using test rows, so every imputed training value carries a trace of the test set. Fit the imputer inside the Pipeline so it is refitted on each training fold.' },
        { q: 'Your dataset has three tissue samples per patient. You use standard 5-fold cross-validation on the rows. What is the risk?',
          options: ['Class imbalance', 'Group leakage: samples from one patient appear in both training and test folds', 'Too few folds', 'Overfitting the hyperparameters'],
          answer: 1,
          why: 'Rows from the same patient are not independent. The model can recognise the patient rather than the biology. GroupKFold on the patient identifier is the fix.' },
        { q: 'On a dataset that is 90 per cent negative, your classifier reports 90 per cent accuracy. What should you conclude?',
          options: ['The model is performing well', 'The model may be no better than always predicting the majority class; check the baseline and use metrics that are not dominated by the majority', 'The model needs more training data', 'Accuracy is always the wrong metric'],
          answer: 1,
          why: 'The majority-class baseline is also 90 per cent. Report balanced accuracy, per-class recall, or AUC, and always state the baseline.' }
      ],
      lab: 'lab03',
      datasets: ['wdbc'],
      reading: [
        { ref: 'kapoor2023', note: 'The central reading for this week. Read the taxonomy of leakage types.' },
        { ref: 'ambroise2002', note: 'The classic demonstration in a genomics setting.' },
        { ref: 'tabeBordbar2018', note: 'Cross-validation done carefully for gene regulatory models. Already on the module reading list.' },
        { ref: 'sklearn', note: 'Pipeline and model_selection documentation.' }
      ],
      provenance: {
        kept: 'The scikit-learn introduction, the train/test split and cross-validation material, and the model-building workflow diagram from the 2025/26 Week 3 deck.',
        changed: 'The Iris running example is replaced by WDBC. Data leakage, baselines and reproducibility are added: the existing deck taught cross-validation mechanics but not why the split boundary matters. Note that Week3_ML_MTU_2024.pptx and Week4_ML_MTU_2024.pptx in the current folder are byte-identical duplicates; only one is carried forward.'
      }
    },

    /* ------------------------------------------------------------------ 4 */
    {
      n: 4,
      title: 'Probability, Bayes and medical decision making',
      strand: 'classical',
      short: 'Why a 99 per cent accurate test can still be wrong most of the time it fires.',
      los: ['LO2', 'LO5'],
      biology:
        'Every diagnostic test has two error rates and operates in a population with some ' +
        'prevalence. Clinicians, patients and, frequently, machine-learning practitioners ' +
        'confuse the probability of a positive test given disease with the probability of ' +
        'disease given a positive test. These are different numbers, sometimes by an order ' +
        'of magnitude, and Bayes\' rule is what converts between them.',
      objectives: [
        'Apply Bayes\' rule to convert between sensitivity and positive predictive value.',
        'Explain the effect of prevalence on PPV and NPV while sensitivity and specificity are held fixed.',
        'Read a confusion matrix and derive every standard metric from it.',
        'Choose an operating threshold according to the relative cost of the two error types.',
        'Explain why screening an unselected population is a different problem from testing a symptomatic one.'
      ],
      concepts: [
        { term: 'Conditional probability', body: 'P(A|B) is the probability of A given that B has occurred. P(positive test | disease) and P(disease | positive test) are not the same quantity.' },
        { term: 'Bayes\' rule', body: 'P(A|B) = P(B|A)P(A) / P(B). It reweights the likelihood by the prior. In diagnosis the prior is the prevalence.' },
        { term: 'Sensitivity', body: 'P(test positive | disease present). The true positive rate, also called recall.' },
        { term: 'Specificity', body: 'P(test negative | disease absent). The true negative rate.' },
        { term: 'Prevalence', body: 'The proportion of the tested population that has the condition. It is a property of the population, not of the test, and it drives PPV.' },
        { term: 'Positive predictive value', body: 'P(disease | test positive). This is what the patient in front of you actually wants to know, and it collapses as prevalence falls.' },
        { term: 'Negative predictive value', body: 'P(no disease | test negative). Usually high when prevalence is low, which is why a negative result is often more informative in screening.' },
        { term: 'The base-rate fallacy', body: 'Judging a positive result by the test\'s accuracy while ignoring how rare the condition is. It is the single most consequential probabilistic error in clinical machine learning.' }
      ],
      viz: 'bayes',
      worked: {
        title: 'A very good test in a low-prevalence population',
        body:
          'Take a test with 99 per cent sensitivity and 99 per cent specificity, applied to a ' +
          'condition with a prevalence of 1 in 1,000. Imagine 100,000 people.\n\n' +
          '100 of them have the condition, and the test correctly identifies 99 of those. ' +
          '99,900 do not have it, and the test wrongly flags 1 per cent of them, which is ' +
          '999 people. So 1,098 people test positive, and only 99 of them are ill.\n\n' +
          'The positive predictive value is 99/1098, which is about 9 per cent. A test that ' +
          'is right 99 per cent of the time produces a positive result that is wrong more ' +
          'than nine times out of ten. Nothing is broken; this is what those numbers mean.\n\n' +
          'Now raise the prevalence to 10 per cent, as it might be in a symptomatic clinic ' +
          'rather than an unselected screening population. Of 100,000 people, 10,000 are ill ' +
          'and 9,900 are correctly flagged; 90,000 are well and 900 are wrongly flagged. PPV ' +
          'rises to 9900/10800, about 92 per cent. The test did not change. The population did.',
        keypoint: 'Sensitivity and specificity belong to the test. Predictive value belongs to the test and the population together.'
      },
      fm: {
        title: 'Calibration is where this reappears',
        body:
          'Modern models, including fine-tuned foundation models, frequently produce ' +
          'confident-looking probabilities that are not calibrated: a set of predictions at ' +
          '"0.9" does not contain 90 per cent positives. Everything in this week depends on ' +
          'the input probabilities meaning what they claim. Week 12 returns to calibration ' +
          'curves and why a well-discriminating model can still be badly calibrated.',
        models: []
      },
      scientist:
        'A screening model is reported as "94 per cent accurate" on a cohort where 6 per cent ' +
        'of participants have the condition. Before reading any further, what accuracy would ' +
        'a model that always predicts "no disease" achieve on that cohort, and what does that ' +
        'tell you about the reported figure?',
      quiz: [
        { q: 'Prevalence falls from 10 per cent to 1 per cent while sensitivity and specificity are unchanged. What happens to PPV?',
          options: ['It rises', 'It falls substantially', 'It is unchanged', 'It depends on sample size'],
          answer: 1,
          why: 'False positives are drawn from the much larger healthy group, so as prevalence falls they increasingly outnumber true positives. Use the calculator on this page to watch it happen.' },
        { q: 'A model has recall 0.95 and precision 0.30 for a rare disease. What is the practical consequence?',
          options: ['It misses most cases', 'It catches almost all cases, but around 70 per cent of its alarms are false', 'It is well calibrated', 'It is unusable'],
          answer: 1,
          why: 'High recall with low precision is the classic screening profile. Whether it is acceptable depends entirely on the cost of a false alarm relative to a missed case, which is a clinical judgement, not a modelling one.' },
        { q: 'Which quantity is a property of the population being tested rather than of the test itself?',
          options: ['Sensitivity', 'Specificity', 'Prevalence', 'The decision threshold'],
          answer: 2,
          why: 'Sensitivity and specificity are conditional on true disease status and are, in principle, transportable. Prevalence is a feature of who you decided to test, and it is what makes a test behave differently in screening and in clinic.' }
      ],
      lab: 'lab04',
      datasets: ['wdbc'],
      reading: [
        { ref: 'greener2022', note: 'Section on evaluation metrics.' },
        { ref: 'jones2019', note: 'On over-claiming from performance figures.' }
      ],
      provenance: {
        kept: 'Conditional probability, the product rule, Bayes\' rule and the worked probability examples from the 2025/26 Week 4 deck.',
        changed: 'The prison-uniform example (P(CellBlockA | BlueU)) is replaced by diagnostic testing, which uses the identical arithmetic in a setting the students will meet professionally. Sensitivity, specificity, PPV, NPV and the base-rate fallacy are added.'
      }
    },

    /* ------------------------------------------------------------------ 5 */
    {
      n: 5,
      title: 'Naive Bayes for biomedical and food-safety text',
      strand: 'classical',
      short: 'A strong, fast, wrong-but-useful model, on real recall notices.',
      los: ['LO2', 'LO3', 'LO5'],
      biology:
        'The FDA publishes every food recall it classifies, with a free-text reason for the ' +
        'recall and a hazard classification: Class I where there is a reasonable probability ' +
        'of serious adverse health consequences, Class II where consequences are temporary or ' +
        'medically reversible, Class III where use is unlikely to cause adverse consequences. ' +
        'The data is public domain under CC0 and covers 2004 to the present [ref:openfda]. ' +
        'Predicting hazard class from the free-text reason is a genuine, useful, tractable ' +
        'text classification problem in food safety.',
      objectives: [
        'Derive the naive Bayes classifier from Bayes\' rule and the conditional independence assumption.',
        'Explain precisely which assumption is "naive" and why the classifier works anyway.',
        'Apply Laplace smoothing and explain the zero-frequency problem it solves.',
        'Work in log space and explain the numerical problem that motivates it.',
        'Compare multinomial and Bernoulli event models and choose between them.'
      ],
      concepts: [
        { term: 'The naive assumption', body: 'Features are assumed conditionally independent given the class. For text this is plainly false, since words co-occur. The classifier is nonetheless often accurate, because the argmax over classes can be right even when the probabilities themselves are badly wrong.' },
        { term: 'Maximum a posteriori classification', body: 'Choose the class maximising P(class) times the product of P(feature|class). The denominator P(features) is the same for every class and can be ignored for ranking.' },
        { term: 'Prior probability', body: 'The class base rate estimated from the training data. On imbalanced recall data this matters a great deal.' },
        { term: 'Likelihood', body: 'P(word|class), estimated by counting. Inspecting the highest-ratio words is the cheapest interpretability you will ever get.' },
        { term: 'Laplace smoothing', body: 'Add one to every count. Without it, a single unseen word forces the whole posterior to zero regardless of all other evidence.' },
        { term: 'Log probabilities', body: 'Multiplying hundreds of small probabilities underflows to zero in floating point. Summing logs is exactly equivalent and numerically stable.' },
        { term: 'Multinomial versus Bernoulli', body: 'Multinomial counts word occurrences; Bernoulli records only presence or absence. Multinomial usually wins on longer documents.' }
      ],
      viz: 'naive-bayes',
      worked: {
        title: 'Classifying one recall notice',
        body:
          'Suppose the training data gives P(Class I) = 0.45 and P(Class II) = 0.55, and a ' +
          'new notice reads "undeclared milk allergen not listed on label".\n\n' +
          'From the counts, P("allergen" | Class I) = 0.081 and P("allergen" | Class II) = ' +
          '0.006; P("undeclared" | Class I) = 0.074 and P("undeclared" | Class II) = 0.009. ' +
          'The word "label" is roughly equally likely in both and contributes almost nothing.\n\n' +
          'Working in logs, the Class I score is log(0.45) + log(0.081) + log(0.074) + ... and ' +
          'the Class II score is log(0.55) + log(0.006) + log(0.009) + ... Even though Class II ' +
          'has the higher prior, the two allergen-related terms are worth more than three ' +
          'orders of magnitude between them, and Class I wins decisively.\n\n' +
          'That is also the interpretability story: you can point at the two words that ' +
          'decided the case. What you cannot do is claim the model understands allergen risk. ' +
          'It has learned which words co-occur with which classification decisions, which is ' +
          'a different and much shallower thing.',
        keypoint: 'Naive Bayes is transparent about which features moved the decision, and silent about whether that reflects anything real.'
      },
      fm: {
        title: 'The first honest comparison',
        body:
          'Text classification is exactly where a pretrained language model should help, ' +
          'because a bag of words throws away order, negation and synonymy. "No undeclared ' +
          'allergens found" and "undeclared allergens found" are nearly identical to naive ' +
          'Bayes. A clinical or general-purpose language model handles this properly.\n\n' +
          'But run the comparison before assuming the answer. With tens of thousands of ' +
          'labelled notices and a strong vocabulary signal, naive Bayes is competitive, ' +
          'trains in under a second, needs no GPU, and can be audited word by word. If a ' +
          'transformer buys two points of F1 for a thousand times the compute and no ' +
          'interpretability, that is a decision to make deliberately, not by default.',
        models: []
      },
      scientist:
        'The classifier learns that the word "listeria" strongly predicts Class I. Is it ' +
        'learning about pathogen risk, or about how FDA staff write notices? Design a test ' +
        'that would distinguish the two, and say what you would expect to see in each case.',
      quiz: [
        { q: 'A word in a new document never appeared in the training data for class C. Without smoothing, what happens to P(C | document)?',
          options: ['It is slightly reduced', 'It becomes exactly zero regardless of all other evidence', 'It is unchanged', 'The word is ignored'],
          answer: 1,
          why: 'One zero factor annihilates the entire product. Laplace smoothing adds one to every count so that no unseen term can veto the classification.' },
        { q: 'Why does naive Bayes often classify well even though its independence assumption is clearly false for text?',
          options: ['The assumption is nearly true for long documents', 'Classification needs only the correct argmax, and the ranking of classes can survive substantial errors in the individual probability estimates', 'Smoothing corrects the dependence', 'It does not classify well'],
          answer: 1,
          why: 'The estimated posteriors are typically badly miscalibrated, often near 0 or 1. The decision, which depends only on which class scores highest, is far more robust than the probabilities are.' },
        { q: 'What is the practical reason for summing log probabilities rather than multiplying probabilities?',
          options: ['Logs are faster to compute', 'Products of many small probabilities underflow to zero in floating-point arithmetic', 'It changes which class wins', 'It applies the smoothing'],
          answer: 1,
          why: 'A 300-word document multiplies 300 numbers below 0.1. That underflows a double long before the end. Logs turn the product into a sum and preserve the ordering exactly.' }
      ],
      lab: 'lab05',
      datasets: ['openfda'],
      reading: [
        { ref: 'openfda', note: 'The API documentation and the field definitions. Note the disclaimer about not using the data for public alerting.' },
        { ref: 'geron', note: 'Chapter 3 on classification metrics.' }
      ],
      provenance: {
        kept: 'The full naive Bayes derivation, the conditional-independence discussion, Laplace smoothing, log-space computation, the multinomial and Bernoulli document models, and the strengths and weaknesses summary from the 2025/26 Week 5-6 deck. This is detailed, correct material and is retained.',
        changed: 'The "Joe / weight / height" employee example and the play-tennis weather dataset are replaced by openFDA food-recall text. The Twitter sentiment example is replaced by the same. Note that Week4_ML_MTU_part1.pptx is a strict subset of Week4_ML_MTU.pptx, and Week5_ML_MTU.pdf and Week6_ML_MTU.pdf are duplicates; the redesign carries one version.'
      }
    },

    /* ------------------------------------------------------------------ 6 */
    {
      n: 6,
      title: 'Biological and nutrition data preparation',
      strand: 'representation',
      short: 'Missingness, outliers, imbalance and scaling, on survey data that has all four.',
      los: ['LO1', 'LO2', 'LO5'],
      biology:
        'NHANES combines an interview with a physical examination and laboratory work on a ' +
        'stratified multi-stage sample of the US civilian non-institutionalised population. ' +
        'The August 2021 to August 2023 cycle released demographic records for 11,933 ' +
        'participants, of whom 8,860 completed the examination component [ref:nhanes]. It is ' +
        'an excellent teaching dataset precisely because it is messy in instructive ways: ' +
        'dietary recall has large measurement error, laboratory values are missing ' +
        'non-randomly, and the survey weights mean that naive row-level analysis gives ' +
        'biased population estimates.',
      objectives: [
        'Distinguish missing completely at random, missing at random and missing not at random, and choose a handling strategy accordingly.',
        'Detect outliers univariately and multivariately, and decide whether to remove, cap or keep them.',
        'Encode ordinal and nominal categorical variables correctly.',
        'Select and justify a scaling strategy, and identify which algorithms require it.',
        'Address class imbalance and explain why resampling belongs inside the cross-validation fold.',
        'Explain what a survey weight is and why ignoring it changes the conclusion rather than just the precision.'
      ],
      concepts: [
        { term: 'Missingness mechanisms', body: 'MCAR: missingness unrelated to anything. MAR: explainable by observed variables. MNAR: depends on the unobserved value itself, as when the sickest participants skip the examination. Only MNAR cannot be fixed by imputation alone, and it is the common case in health data.' },
        { term: 'Imputation', body: 'Mean and median imputation shrink variance and distort correlations. Iterative and k-NN imputation preserve structure better. Always add a missingness indicator column: the fact that a value is absent is often itself predictive.' },
        { term: 'Outliers', body: 'A biological outlier may be an instrument error, a transcription error, or the single most clinically interesting participant in the study. Deleting before understanding is how findings get lost.' },
        { term: 'Categorical encoding', body: 'Ordinal variables have a meaningful order and can be integer-coded. Nominal variables must not be, because that invents a distance. One-hot encoding is the default; watch the dimensionality on high-cardinality fields.' },
        { term: 'Scaling', body: 'Standardisation subtracts the mean and divides by the standard deviation; min-max maps to a fixed range; robust scaling uses the median and interquartile range and survives outliers. Distance and gradient-based methods need it; trees do not.' },
        { term: 'Class imbalance', body: 'Random undersampling discards data. Random oversampling duplicates it and encourages overfitting. SMOTE interpolates new minority points, which can be biologically implausible. All of them must be applied inside the fold, never before splitting.' },
        { term: 'Measurement variability', body: 'A 24-hour dietary recall has substantial within-person day-to-day variation. Treating one recall as a person\'s habitual intake attenuates associations towards the null. This is a property of the instrument, not of the model.' },
        { term: 'Survey weights', body: 'NHANES oversamples some subgroups by design. Unweighted analysis describes the sample, not the population. This is a data-preparation decision with scientific consequences.' }
      ],
      viz: 'data-quality',
      worked: {
        title: 'The order of operations, and why it is not arbitrary',
        body:
          'A plausible-looking pipeline: impute missing values, remove outliers, scale, ' +
          'balance the classes with SMOTE, split into train and test, cross-validate.\n\n' +
          'Every step before the split has leaked. The imputer saw test rows. The outlier ' +
          'rule was set using test rows. The scaler\'s mean and variance include test rows. ' +
          'Worst of all, SMOTE generated synthetic minority points by interpolating between ' +
          'real points, and those synthetic points can land in the test fold, interpolated ' +
          'from training points. The reported score can be dramatically optimistic.\n\n' +
          'The correct order: split first, then build a Pipeline containing the imputer, the ' +
          'encoder, the scaler and the resampler, and let cross-validation refit that whole ' +
          'pipeline on each training fold. In scikit-learn this means using ' +
          'imblearn.pipeline.Pipeline rather than sklearn.pipeline.Pipeline, because the ' +
          'former applies the resampler only during fit and not during predict, which is ' +
          'exactly what you want.\n\n' +
          'Outlier removal deserves a separate remark. Removing outliers from the test set ' +
          'is not leakage, it is worse: it is quietly deleting the hard cases and then ' +
          'reporting how well you did on the easy ones.',
        keypoint: 'Split first. Everything that learns anything from data goes inside the pipeline.'
      },
      fm: {
        title: 'What pretraining does not fix',
        body:
          'It is tempting to assume a large pretrained model absorbs messy data gracefully. ' +
          'For the parts of messiness that are about representation, such as unusual ' +
          'phrasing in clinical notes, that is partly true. For the parts that are about the ' +
          'data-generating process, it is not true at all. If your outcome is missing not at ' +
          'random, no amount of pretraining recovers the missing information, because the ' +
          'information was never collected. If your cohort under-represents a population, a ' +
          'pretrained model will not tell you so; it will simply be less accurate for that ' +
          'group, silently. Data quality is upstream of model choice.',
        models: []
      },
      scientist:
        'You find that serum vitamin D is missing for 18 per cent of NHANES participants, ' +
        'and that missingness is more common among participants who did not attend the ' +
        'examination centre. What kind of missingness is this most likely to be, and what ' +
        'does it do to a model trained only on complete cases?',
      quiz: [
        { q: 'Where in the workflow should SMOTE be applied?',
          options: ['On the full dataset before splitting', 'Inside the cross-validation fold, on the training portion only', 'On the test set only', 'After model training'],
          options_note: '',
          answer: 1,
          why: 'Synthetic minority points are interpolated from real ones. If SMOTE runs before the split, a test point can be a blend of training points, and the score is inflated.' },
        { q: 'Which scaler is most appropriate when a feature has a heavy right tail and several extreme values you want to keep?',
          options: ['StandardScaler', 'MinMaxScaler', 'RobustScaler', 'No scaling'],
          answer: 2,
          why: 'RobustScaler centres on the median and scales by the interquartile range, so extreme values do not dominate the transformation while still being retained in the data.' },
        { q: 'Why is integer-coding a nominal variable such as "race/ethnicity" a modelling error?',
          options: ['Integers use more memory', 'It imposes an order and a distance that do not exist, which distance-based and linear models will act on', 'Trees cannot handle integers', 'It is not an error'],
          answer: 1,
          why: 'Coding categories as 1, 2, 3 tells the model that category 3 is further from 1 than 2 is, and that 2 lies between them. Neither is true, and linear and distance-based models will use both.' }
      ],
      lab: 'lab06',
      datasets: ['nhanes'],
      reading: [
        { ref: 'nhanes', note: 'The analytic guidelines document, particularly the section on survey weights.' },
        { ref: 'kapoor2023', note: 'Reread with the preprocessing pipeline in mind.' }
      ],
      provenance: {
        kept: 'Outlier detection and visualisation, missing-value handling with SimpleImputer and ColumnTransformer, categorical encoding, scaling and normalisation, class imbalance with SMOTE and Tomek links, and the confusion-matrix material from the 2025/26 Week 6 and Week 7 decks.',
        changed: 'Generic and credit-scoring examples are replaced by NHANES. The ensemble-learning slides that currently sit in the middle of the data-preparation deck are moved to Week 10 where they belong; that content is duplicated in the Week 11-12 deck. The missingness taxonomy, survey weights and measurement variability are new.'
      }
    },

    /* ------------------------------------------------------------------ 7 */
    {
      n: 7,
      title: 'Dimensionality reduction and foundation-model embeddings',
      strand: 'representation',
      short: 'The hinge of the module: from features you chose to features a model learned.',
      pivot: true,
      los: ['LO1', 'LO2', 'LO4'],
      biology:
        'Biological data is routinely wider than it is tall. A transcriptome has 20,000 ' +
        'genes measured in perhaps 200 patients; a protein is a sequence of hundreds of ' +
        'residues drawn from an alphabet of twenty. Both need to be reduced to something a ' +
        'model can work with. The classical answer is to project onto directions of maximal ' +
        'variance. The modern answer is to let a model that has read a great deal of ' +
        'biological sequence tell you where the sequence sits in a learned space. This week ' +
        'puts the two side by side.',
      objectives: [
        'Explain the curse of dimensionality and its practical consequences for biological data.',
        'Perform and interpret PCA, including the explained-variance spectrum and loadings.',
        'Distinguish PCA from neighbour-embedding methods such as t-SNE and UMAP, and state what each preserves.',
        'Explain what a foundation-model embedding is and how it is produced.',
        'Compare a hand-engineered representation with a learned one on the same data, and identify which task favours which.'
      ],
      concepts: [
        { term: 'The curse of dimensionality', body: 'As dimension grows, distances between points concentrate and the volume of space grows faster than any feasible sample. Nearest neighbours stop being near.' },
        { term: 'Principal component analysis', body: 'An orthogonal linear projection onto the directions of greatest variance. It is deterministic, invertible, and its components are interpretable through their loadings. On WDBC, the first two components carry 63.2 per cent of the variance and the first six carry 88.8 per cent.' },
        { term: 'Explained variance', body: 'How much of the total variance each component captures. A slowly decaying spectrum means the data genuinely is high-dimensional and no small projection will be faithful.' },
        { term: 't-SNE and UMAP', body: 'Non-linear neighbour-embedding methods that preserve local neighbourhoods. They are excellent for seeing structure and dangerous for measuring it: distances between clusters, cluster sizes and empty space in the plot are not interpretable.' },
        { term: 'Representation learning', body: 'Instead of choosing features, learn a mapping from raw input to a vector space in which the geometry is useful.' },
        { term: 'Embedding', body: 'The vector a model produces for an input. For a protein language model, mean-pooling the final hidden layer over residues gives one fixed-length vector per protein, whatever its length.' },
        { term: 'Self-supervised pretraining', body: 'Training by predicting masked parts of the input. No labels, so the corpus can be enormous: DNABERT-2 used 32.49 billion bases from 135 species [ref:dnabert2].' },
        { term: 'Anisotropy', body: 'Language-model embedding spaces are dominated by a few directions. This affects nearest-neighbour search and often makes centring or whitening worthwhile before using the embeddings downstream.' }
      ],
      viz: 'pca',
      viz2: 'embeddings',
      worked: {
        title: 'The pipeline, stated concretely',
        body:
          'Biological sequence, for instance a 260-residue protein.\n\n' +
          'Into a foundation model: tokenise (single residues for ESM-2, byte-pair-encoded ' +
          'fragments for DNABERT-2, six-mers for the Nucleotide Transformer) and run a ' +
          'forward pass. No training happens, and your labels are never used.\n\n' +
          'Out comes a high-dimensional embedding: one vector per token, mean-pooled over ' +
          'real residue positions into a single vector per sequence. ESM-2 at 8 million ' +
          'parameters gives 320 dimensions; the 650-million-parameter model gives more.\n\n' +
          'Then PCA or UMAP down to two dimensions, purely so a human can look at it.\n\n' +
          'Then the plot, coloured by biological class. And here is the discipline: the plot ' +
          'is a diagnostic, not a result. If classes separate, that is a hypothesis worth ' +
          'testing with a classifier and a held-out set. If they do not, the signal may still ' +
          'be there in the full-dimensional space, since a two-dimensional projection of a ' +
          '320-dimensional space discards a great deal.',
        keypoint: 'You look at two dimensions. You should model in all of them.'
      },
      fm: {
        title: 'Two tasks, two answers',
        body:
          'The embedding explorer on this page carries two different labels for the same ' +
          'sequences, and they behave in opposite ways.\n\n' +
          'The family label is driven by amino-acid usage. A twenty-dimensional composition ' +
          'vector describes it almost perfectly, and hand-engineered features match or beat ' +
          'the embedding. The right answer here is to use the simple thing.\n\n' +
          'The ordered-triad label is driven by residue order alone: both classes contain ' +
          'exactly the same residues at the same positions, differing only in their N-to-C ' +
          'arrangement. Composition is identical by construction, so any bag-of-residues ' +
          'method must sit at chance. Only a representation that encodes order can do better.\n\n' +
          'That is the whole argument for learned representations, in one dataset. Not "the ' +
          'embedding is better", but "the embedding can see something composition cannot, ' +
          'and whether that matters depends entirely on your task".',
        models: ['esm2', 'nucleotideTransformer', 'dnabert2', 'prottrans', 'hyenadna']
      },
      scientist:
        'Your UMAP of patient embeddings shows two well-separated blobs. Before you write ' +
        'that you have found two disease subtypes, list three non-biological explanations ' +
        'that would produce exactly the same picture, and say how you would rule each out.',
      quiz: [
        { q: 'On the WDBC data, the first two principal components explain 63.2 per cent of the variance. What does the remaining 36.8 per cent tell you?',
          options: ['The PCA failed', 'A two-dimensional plot is a substantial simplification and structure may be present in the discarded directions', 'The data should be scaled differently', 'Two components are sufficient'],
          answer: 1,
          why: 'More than a third of the variance is outside the plot. Classes that overlap in two dimensions may separate cleanly in ten, which is why you model in the full space and plot in two.' },
        { q: 'Which statement about a UMAP plot is correct?',
          options: ['Distances between clusters reflect true dissimilarity', 'Cluster sizes reflect the number of points', 'Local neighbourhoods are approximately preserved, but between-cluster distances and empty space are not interpretable', 'It is a linear projection'],
          answer: 2,
          why: 'Neighbour-embedding methods optimise local structure at the cost of global geometry. Reading a between-cluster gap as a measure of biological difference is the most common misuse.' },
        { q: 'A foundation model produces embeddings for your 300 labelled proteins. Does computing those embeddings on all 300 before splitting constitute leakage?',
          options: ['Yes, always', 'No, provided the model was pretrained without your labels and you do no label-aware processing of the embeddings outside the fold', 'Yes, unless you use cross-validation', 'Only if the model is large'],
          answer: 1,
          why: 'The embedding step never sees your target, so it is a fixed transformation, like reading the sequence. The care is needed afterwards: any selection or scaling that uses the labels must be refitted inside each fold. Separately, check that your test sequences were not in the pretraining corpus.' }
      ],
      lab: 'lab07',
      datasets: ['wdbc', 'proteinSim'],
      reading: [
        { ref: 'esm2', note: 'For how a protein language model is trained and what the released checkpoints are.' },
        { ref: 'nucleotideTransformer', note: 'For genomic foundation models, tokenisation and the benchmark suite.' },
        { ref: 'greener2022', note: 'Section on dimensionality reduction.' }
      ],
      provenance: {
        kept: 'The PCA material and dimensionality-reduction motivation from the 2025/26 Week 7 deck.',
        changed: 'This is the week that changes most. PCA is retained and extended; embeddings, self-supervised pretraining and the engineered-versus-learned comparison are new. This becomes the structural pivot of the module.'
      }
    },

    /* ------------------------------------------------------------------ 8 */
    {
      n: 8,
      title: 'k-NN and biological similarity',
      strand: 'foundation',
      short: 'What "similar" means, and why the representation decides it.',
      los: ['LO2', 'LO3', 'LO5'],
      biology:
        'A great deal of biology is reasoning by similarity. BLAST finds homologues by ' +
        'sequence similarity; a clinician reasons from comparable past cases; a nutritionist ' +
        'groups foods by composition. The k-nearest-neighbour classifier makes that reasoning ' +
        'explicit, and in doing so exposes the question everything in this module turns on: ' +
        'similar in what space?',
      objectives: [
        'Implement k-NN classification and regression, and explain the role of k.',
        'Choose an appropriate distance metric, including for mixed-type biological data.',
        'Explain why k-NN requires feature scaling and demonstrate the effect.',
        'Explain how irrelevant features degrade nearest-neighbour search.',
        'Compare hand-engineered and learned representations under an identical k-NN classifier and interpret the difference.'
      ],
      concepts: [
        { term: 'Instance-based learning', body: 'No model is fitted at training time; the training data is the model. Cost is deferred to prediction, which makes k-NN a lazy learner.' },
        { term: 'Choosing k', body: 'Small k gives a flexible, noise-sensitive boundary; large k smooths it and eventually predicts the majority class everywhere. On WDBC, cross-validated accuracy peaks around k = 3 to 9 and then declines.' },
        { term: 'Euclidean distance', body: 'Straight-line distance. Sensible for continuous features on comparable scales.' },
        { term: 'Manhattan distance', body: 'Sum of absolute differences. Often more robust in high dimensions and when features are not directly comparable.' },
        { term: 'Hamming distance', body: 'Number of positions at which two sequences differ. The natural metric for equal-length categorical or sequence data.' },
        { term: 'Heterogeneous distance', body: 'Real biological records mix continuous, ordinal and categorical fields, so the metric must be composed per-field and the components weighted deliberately.' },
        { term: 'Scaling is not optional', body: 'Measured on WDBC: standardised k-NN at k = 5 reaches 96.3 per cent cross-validated accuracy, unstandardised 93.5 per cent. Nuclear area, in the hundreds, otherwise drowns out smoothness, around 0.1.' },
        { term: 'Irrelevant features', body: 'Every uninformative dimension adds distance noise. This is why k-NN benefits so directly from a good representation, and why it is the fairest probe of representation quality.' }
      ],
      viz: 'knn',
      worked: {
        title: 'Two representations, one classifier',
        body:
          'Hold the classifier fixed at k-NN with k = 5 and change only what it measures ' +
          'distance in. Any difference in accuracy is attributable to the representation ' +
          'alone. That is a clean experimental design and it is why this comparison belongs ' +
          'with k-NN rather than with a more powerful model that could compensate.\n\n' +
          'On the family task, the hand-engineered representation of amino-acid composition ' +
          'plus four biophysical descriptors reaches essentially perfect accuracy, because ' +
          'that is precisely how the families differ. The learned embedding does respectably ' +
          'but no better. Buying a foundation model here would be spending compute to lose ' +
          'accuracy.\n\n' +
          'On the ordered-triad task the picture inverts. Composition is identical between ' +
          'the classes by construction, so the engineered representation sits at chance, ' +
          'around 0.50. The learned representation does clearly better. The classifier never ' +
          'changed; only what it could see did.\n\n' +
          'One further observation worth drawing out: the embedding\'s k-NN accuracy on the ' +
          'family task is lower than its logistic-regression accuracy on the same data. In ' +
          'high dimensions, many low-variance directions contribute noise to the distance ' +
          'while a linear model can simply give them small weights. That is the irrelevant-' +
          'feature problem, and a bigger embedding does not automatically make it better.',
        keypoint: 'A better representation gives better neighbours only when the thing it represents better is the thing you are predicting.'
      },
      fm: {
        title: 'Embeddings plus a classical head',
        body:
          'Embeddings followed by k-NN or logistic regression is the most useful ' +
          'foundation-model recipe in practice, and it is the one that gets underused. It ' +
          'needs no gradient steps through the large model, runs on a laptop once the ' +
          'embeddings are computed, keeps the downstream model small enough to interpret and ' +
          'to cross-validate honestly, and works with a few hundred labels. Before you ' +
          'consider fine-tuning in Week 11, this is the baseline that fine-tuning has to beat.',
        models: ['esm2', 'prottrans']
      },
      scientist:
        'Your k-NN on foundation-model embeddings outperforms k-NN on your engineered ' +
        'features. Give two explanations other than "the embedding captures more biology", ' +
        'and say what evidence would let you distinguish them.',
      quiz: [
        { q: 'Increasing k from 1 to 51 on a 569-sample dataset. What happens at large k?',
          options: ['Accuracy keeps improving', 'The decision boundary smooths and eventually the model approaches predicting the majority class everywhere', 'The model overfits more', 'Nothing changes'],
          answer: 1,
          why: 'As k approaches the dataset size, every query returns essentially the global class distribution. The measured curve on this page shows accuracy peaking early and then declining.' },
        { q: 'Why does k-NN suffer more than a decision tree from irrelevant features?',
          options: ['It uses more memory', 'It collapses all features into a single distance, so every irrelevant dimension adds noise to that distance; a tree can simply never split on the feature', 'It cannot handle continuous features', 'It uses the wrong metric'],
          answer: 1,
          why: 'The tree makes a per-feature decision and can ignore a feature entirely. k-NN has no such mechanism: every dimension contributes to every distance, whether it carries signal or not.' },
        { q: 'Both classes contain exactly the same amino acids in the same proportions, differing only in residue order. What accuracy should a composition-based k-NN achieve?',
          options: ['Near perfect', 'About chance, since the representation is identical between the classes by construction', 'It depends on k', 'It depends on the distance metric'],
          answer: 1,
          why: 'If two classes map to the same point distribution in feature space, no classifier operating on that space can separate them. Neither k nor the metric can recover information the representation discarded.' }
      ],
      lab: 'lab08',
      datasets: ['wdbc', 'proteinSim'],
      reading: [
        { ref: 'greener2022', note: 'On choosing between model families.' },
        { ref: 'esm2', note: 'For what the embedding actually is.' }
      ],
      provenance: {
        kept: 'The whole instance-based-learning treatment from the 2025/26 Week 8 deck: nearest neighbour, choosing k, Euclidean, Manhattan, Hamming and heterogeneous metrics, the problems-measuring-distance sequence, irrelevant features, distance-weighted k-NN and eager versus lazy learners. Also the existing Lab 8, which already uses a cancer dataset.',
        changed: 'The romance-versus-action film example is replaced by biological similarity. The representation comparison is new and is what makes this week carry the foundation-model thread.'
      }
    },

    /* ------------------------------------------------------------------ 9 */
    {
      n: 9,
      title: 'Clustering biological data',
      strand: 'foundation',
      short: 'Finding groups, and the much harder question of whether they are real.',
      los: ['LO1', 'LO2', 'LO4', 'LO5'],
      biology:
        'Unsupervised analysis underlies a great deal of modern biology: molecular subtypes ' +
        'of tumours, cell types in single-cell data, community structure in the microbiome, ' +
        'dietary patterns in nutritional epidemiology. Several of these have genuinely ' +
        'changed clinical practice. Others turned out to be artefacts of batch, of ' +
        'preprocessing, or of the number the analyst chose for k. Telling the two apart is ' +
        'the skill this week is about.',
      objectives: [
        'Apply k-means, DBSCAN and agglomerative clustering, and state the assumptions each makes.',
        'Select the number of clusters using the elbow method and silhouette analysis, and explain the limits of both.',
        'Read a dendrogram and choose a cut height defensibly.',
        'Validate a clustering: stability under resampling, external validation, and biological coherence.',
        'Explain why a computational cluster is not by itself a biological discovery.'
      ],
      concepts: [
        { term: 'k-means', body: 'Alternates assignment and centroid update to minimise within-cluster sum of squares. It assumes roughly spherical, similarly sized clusters, requires k in advance, and converges to a local optimum, so initialisation matters. k-means++ improves the initialisation.' },
        { term: 'DBSCAN', body: 'Density-based: finds arbitrarily shaped clusters, decides the number of clusters itself, and labels low-density points as noise. In exchange you must choose eps and min_samples, and it degrades in high dimensions where density estimates become unreliable.' },
        { term: 'Hierarchical clustering', body: 'Builds a nested tree of merges. The dendrogram shows structure at every scale at once, which is often more informative for biological data than a single flat partition.' },
        { term: 'Linkage', body: 'Single linkage chains and produces straggly clusters; complete linkage produces compact ones; Ward minimises the increase in within-cluster variance and behaves well on roughly spherical data.' },
        { term: 'Silhouette score', body: 'For each point, how much closer it is to its own cluster than to the nearest other cluster, from -1 to 1. On standardised WDBC, k-means silhouette is highest at k = 2 (0.343) and declines steadily. Note that 0.343 is a modest value: the data supports two groups better than any other number, but not cleanly.' },
        { term: 'The elbow method', body: 'Plot within-cluster sum of squares against k and look for a bend. It is a heuristic, it is frequently ambiguous, and it should never be the only justification.' },
        { term: 'Cluster validation', body: 'Does the partition survive resampling? Does it correspond to something measured independently, such as survival or treatment response? Is it stable under a different algorithm? A cluster that fails all three is a description of your preprocessing.' },
        { term: 'Batch effects', body: 'Samples processed on different days or instruments cluster by batch. This produces beautiful, highly significant, entirely technical clusters, and it is the single most common way unsupervised biological analysis goes wrong.' }
      ],
      viz: 'clustering',
      worked: {
        title: 'k-means will always give you k clusters',
        body:
          'Run k-means with k = 4 on the standardised WDBC data and you get four clusters, ' +
          'each with a centroid, each with members. The algorithm cannot decline. It has no ' +
          'mechanism for reporting that the data does not contain four groups.\n\n' +
          'The silhouette scores measured on this data tell the more useful story: 0.343 at ' +
          'k = 2, 0.314 at k = 3, 0.283 at k = 4, and then a marked drop to 0.158 at k = 5. ' +
          'Two clusters is the best-supported choice, and it corresponds to the benign and ' +
          'malignant labels, which is reassuring. But 0.343 is a moderate score, not a strong ' +
          'one. The two groups overlap.\n\n' +
          'Now consider what happens if you had not had labels. You would have found two ' +
          'clusters, and you would have been right. If you had instead reported five clusters ' +
          'as five novel subtypes, the algorithm would have supported you just as ' +
          'obediently. The discipline has to come from the validation, not from the ' +
          'clustering.',
        keypoint: 'The algorithm answers the question you asked. It cannot tell you the question was wrong.'
      },
      fm: {
        title: 'Clustering in embedding space',
        body:
          'Clustering foundation-model embeddings is increasingly common and the caveats ' +
          'compound rather than cancel. Embedding spaces are anisotropic, so Euclidean ' +
          'distance may not behave as the algorithm assumes and cosine distance is often ' +
          'more appropriate. The clusters reflect what the pretraining corpus made salient, ' +
          'which may be taxonomy or sequence length rather than the function you care about. ' +
          'And the model has no notion of your batch structure, so it will not protect you ' +
          'from batch effects. Clusters in embedding space are hypotheses, at exactly the ' +
          'same evidential level as clusters in any other space.',
        models: ['esm2', 'nucleotideTransformer']
      },
      scientist:
        'You cluster 200 tumour samples and find three groups. Samples were collected at ' +
        'three hospitals. Design the single analysis that would most efficiently tell you ' +
        'whether you have found biology or logistics.',
      quiz: [
        { q: 'Silhouette scores on standardised WDBC: 0.343 at k=2, 0.314 at k=3, 0.283 at k=4, 0.158 at k=5. What is the defensible reading?',
          options: ['There are exactly two subtypes', 'Two clusters is the best-supported partition among those tested, though the moderate score indicates substantial overlap', 'The clustering has failed', 'More clusters would score better'],
          answer: 1,
          why: 'The score ranks the options; it does not establish biological reality. A value around 0.34 indicates real but overlapping structure, and the finding still needs external validation.' },
        { q: 'Which clustering method can decline to assign a point to any cluster?',
          options: ['k-means', 'Agglomerative clustering', 'DBSCAN', 'None of them'],
          answer: 2,
          why: 'DBSCAN labels points in low-density regions as noise. k-means and standard agglomerative clustering assign every point, which means outliers are forced into a group whether they belong or not.' },
        { q: 'Samples processed in two batches cluster into two groups. What is the most likely explanation you must exclude first?',
          options: ['Two biological subtypes', 'A technical batch effect', 'Poor choice of k', 'Insufficient scaling'],
          answer: 1,
          why: 'When cluster membership aligns with a technical variable, the technical explanation is the default and the biological one carries the burden of proof. Check the alignment before interpreting anything.' }
      ],
      lab: 'lab09',
      datasets: ['wdbc', 'tcga', 'proteinSim'],
      reading: [
        { ref: 'greener2022', note: 'Section on unsupervised methods.' },
        { ref: 'jones2019', note: 'On the standard of evidence for a biological claim.' },
        { ref: 'tcga', note: 'For the molecular-subtype literature and how those subtypes were validated.' }
      ],
      provenance: {
        kept: 'The complete unsupervised-learning treatment from the 2025/26 Week 9/10 deck: k-means with the assignment and centroid steps, the distortion cost function, local optima, k-means++, the elbow method, DBSCAN, silhouette plots, hierarchical clustering, dendrograms and linkage criteria. This is thorough material and is retained.',
        changed: 'The lab moves from customer segmentation to biological data. Cluster validation, stability, batch effects and the "a cluster is not a discovery" material are new, as is clustering in embedding space.'
      }
    },

    /* ----------------------------------------------------------------- 10 */
    {
      n: 10,
      title: 'Random forests and foundation-model representations',
      strand: 'adaptation',
      short: 'Ensembles, feature importance, and the first three-way model comparison.',
      los: ['LO1', 'LO2', 'LO3', 'LO5'],
      biology:
        'Random forests remain one of the most reliable defaults for tabular biological data ' +
        'and are extensively used in genomics and clinical prediction. They need little ' +
        'tuning, handle mixed feature types, are robust to outliers and irrelevant features, ' +
        'and provide a feature-importance ranking. That last property is what makes them ' +
        'attractive to biologists, and also what most often gets over-interpreted.',
      objectives: [
        'Explain bagging and why averaging decorrelated trees reduces variance.',
        'Describe how random feature subsetting at each split further decorrelates the ensemble.',
        'Compute and interpret out-of-bag error.',
        'Interpret feature importances correctly, including the correlated-feature and cardinality caveats.',
        'Compare engineered features, foundation-model embeddings and a fine-tuned model on a shared task, on more than accuracy.'
      ],
      concepts: [
        { term: 'The wisdom of crowds', body: 'Averaging many independent, individually mediocre estimates can beat any one of them. The word doing the work is "independent", and the whole design of a random forest is an attempt to buy independence.' },
        { term: 'Bagging', body: 'Bootstrap aggregating: fit each tree on a resample drawn with replacement, then average. Individual trees are high-variance; the average is not.' },
        { term: 'Random feature subsetting', body: 'At each split, consider only a random subset of features. Without this, every tree would pick the same dominant feature at the root and the ensemble would be highly correlated.' },
        { term: 'Out-of-bag error', body: 'Roughly a third of samples are omitted from each bootstrap, giving a free held-out estimate without a separate validation set.' },
        { term: 'Feature importance, with care', body: 'Impurity-based importance is biased towards high-cardinality and continuous features, and splits importance arbitrarily between correlated features. On WDBC, "worst area" and "worst perimeter" score almost identically (0.129 and 0.129) because they measure nearly the same thing. Permutation importance on held-out data is more trustworthy, and neither is a causal claim.' },
        { term: 'Robustness', body: 'Forests tolerate irrelevant features, outliers and unscaled data far better than k-NN or linear models, which is much of why they are a good default.' },
        { term: 'Where forests still overfit', body: 'They resist overfitting in depth but not in protocol. A forest tuned on the test set is overfitted exactly as badly as anything else.' }
      ],
      viz: 'random-forest',
      viz2: 'leaderboard',
      worked: {
        title: 'Three models, and the columns that are not accuracy',
        body:
          'Model A, engineered features into a random forest: 95.4 per cent cross-validated ' +
          'accuracy on WDBC, measured. Trains in seconds on a laptop, no GPU, gives a feature ' +
          'ranking a clinician can read.\n\n' +
          'Model B, foundation-model embeddings into a random forest: needs a pretrained ' +
          'model appropriate to the data type. For WDBC there is none, because the input is ' +
          'thirty morphometric numbers rather than a sequence, an image or text. This row is ' +
          'not "worse"; it is not applicable, and recognising inapplicability is a skill.\n\n' +
          'Model C, a fine-tuned foundation model: only in play where a suitable pretrained ' +
          'model exists. It requires a GPU, careful regularisation on small data, and a much ' +
          'more demanding validation protocol.\n\n' +
          'The comparison table on this page therefore has columns for training-data ' +
          'requirement, compute cost, interpretability and validation burden alongside ' +
          'accuracy. A model that wins on accuracy and loses on the other four is not ' +
          'obviously the right choice, and for a clinical application it is usually the ' +
          'wrong one.\n\n' +
          'Note the honest scoreboard on the real data: plain logistic regression reaches ' +
          '97.4 per cent, PCA followed by logistic regression 97.7 per cent, and the ' +
          '500-tree random forest 95.4 per cent. The simplest model in the comparison wins. ' +
          'That happens more often than the literature would suggest.',
        keypoint: 'Compare on the axes that will decide whether the model gets used, not only on the one that is easiest to report.'
      },
      fm: {
        title: 'Embeddings plus a forest',
        body:
          'Where a suitable pretrained model does exist, embeddings into a random forest is ' +
          'a strong and underrated pipeline. The forest is cheap, needs no GPU, gives ' +
          'importances over embedding dimensions (though those dimensions rarely mean ' +
          'anything individually), and can be cross-validated honestly in seconds. It is a ' +
          'genuine competitor to fine-tuning, and it should be run before fine-tuning is ' +
          'considered, so that fine-tuning has something to beat.',
        models: ['esm2', 'nucleotideTransformer', 'dnabert2']
      },
      scientist:
        'Your forest ranks gene X as the most important predictor of treatment response. ' +
        'A colleague proposes targeting gene X therapeutically. Explain, in terms a ' +
        'non-specialist would follow, why feature importance does not support that step.',
      quiz: [
        { q: 'Why does a random forest sample features at each split as well as bootstrapping the rows?',
          options: ['To speed up training', 'To decorrelate the trees, since bootstrapping alone leaves them all splitting on the same dominant feature', 'To handle missing values', 'To reduce memory use'],
          answer: 1,
          why: 'Averaging only reduces variance to the extent the estimates are independent. Feature subsetting is what buys that independence, and it is why a random forest beats plain bagged trees.' },
        { q: 'Two features have importances of 0.129 and 0.129 and are highly correlated. What follows?',
          options: ['Both are causally important', 'The forest has split the credit between two near-duplicate measurements; neither figure supports a causal claim', 'One is redundant and should be dropped', 'The model is overfitting'],
          answer: 1,
          why: 'This is the measured situation for "worst area" and "worst perimeter" on WDBC, which are geometrically almost the same quantity. Correlated features share importance arbitrarily, and importance was never a causal measure to begin with.' },
        { q: 'On WDBC, logistic regression reaches 97.4 per cent and a 500-tree random forest 95.4 per cent. What is the right conclusion?',
          options: ['The forest was configured incorrectly', 'On this dataset the simpler model is at least as good, so the added complexity is not justified by the evidence', 'Accuracy is the wrong metric', 'More trees would help'],
          answer: 1,
          why: 'Both figures come from the same cross-validation protocol on this page. When the simpler model matches or beats the complex one, the burden of proof sits with the complex one.' }
      ],
      lab: 'lab10',
      datasets: ['wdbc', 'proteinSim'],
      reading: [
        { ref: 'greener2022', note: 'On model selection for biological data.' },
        { ref: 'geron', note: 'Chapter 7 on ensembles.' }
      ],
      provenance: {
        kept: 'The wisdom-of-crowds motivation, bagging, random forests and the aggregation material from the 2025/26 Week 10-11 deck, together with the tree-based feature selection from the Week 7 deck.',
        changed: 'The ox-weight and bicycle-demand examples are replaced by biological ones. The ensemble slides that currently appear inside the data-preparation deck are consolidated here. The three-way model comparison and the non-accuracy columns are new. The lab moves from credit scoring to WDBC.'
      }
    },

    /* ----------------------------------------------------------------- 11 */
    {
      n: 11,
      title: 'Boosting and foundation-model adaptation',
      strand: 'adaptation',
      short: 'Sequential ensembles, then the full adaptation ladder from zero-shot to LoRA.',
      los: ['LO1', 'LO2', 'LO3', 'LO5'],
      biology:
        'Gradient-boosted trees are, in practice, the strongest general method for tabular ' +
        'biological data, and they remain competitive with deep learning on that data type. ' +
        'Meanwhile, for sequence data, the practical question has become how to adapt a ' +
        'pretrained model to a task with a few hundred labels. This week covers both, ' +
        'because both are answers to the same question: how do you get good performance ' +
        'without a large labelled dataset?',
      objectives: [
        'Explain boosting as sequential error correction and contrast it with bagging.',
        'Describe gradient boosting as fitting successive models to the residuals of the current ensemble.',
        'Place zero-shot use, feature extraction, fine-tuning and parameter-efficient fine-tuning on a single ladder of increasing cost and data requirement.',
        'Compute the trainable-parameter count for a LoRA configuration and compare it with full fine-tuning.',
        'Choose an adaptation strategy given a labelled-data budget, a compute budget and an interpretability requirement.'
      ],
      concepts: [
        { term: 'Boosting', body: 'Fit a weak learner, find what it got wrong, fit the next learner to concentrate on those cases, repeat. Bagging builds its models in parallel and independently; boosting builds them in sequence and dependently.' },
        { term: 'Gradient boosting', body: 'Each new tree is fitted to the negative gradient of the loss with respect to the current predictions. For squared error that is simply the residuals. XGBoost, LightGBM and CatBoost are engineering refinements of this idea.' },
        { term: 'Boosting overfits differently', body: 'A random forest is difficult to overfit by adding trees. A boosted ensemble is not: too many stages, or too high a learning rate, will fit noise. Early stopping on a validation set is not optional.' },
        { term: 'Zero-shot', body: 'Use the pretrained model with no task-specific training at all. Requires the task to be expressible in terms the model already handles. Costs no labels, and the ceiling can be low.' },
        { term: 'Feature extraction', body: 'Freeze the model, take embeddings, train a small classical head. Works with a few hundred labels, needs no GPU after the embeddings are computed, and is the baseline everything else must beat.' },
        { term: 'Fine-tuning', body: 'Continue training the model\'s weights on your task. Highest ceiling, highest cost, and on small biological datasets a real risk of catastrophic forgetting and of overfitting a very large parameter count to very few examples.' },
        { term: 'Parameter-efficient fine-tuning', body: 'Update a small number of parameters and freeze the rest. Adapters insert small trainable modules between layers. LoRA injects trainable low-rank matrices, leaving the pretrained weights untouched.' },
        { term: 'LoRA', body: 'Instead of updating a weight matrix W of size d by k, learn A of size d by r and B of size r by k with r much smaller than both, and use W + BA. On GPT-3 175B this reduced trainable parameters by a factor of 10,000 and GPU memory by a factor of 3, with no added inference latency [ref:lora]. DNABERT-2 uses LoRA for exactly this reason [ref:dnabert2].' }
      ],
      viz: 'fine-tuning',
      worked: {
        title: 'The adaptation ladder, with the arithmetic',
        body:
          'The rungs, in increasing order of cost:\n\n' +
          'Zero-shot. No labels, no training. Try it first, because it is free and it ' +
          'occasionally suffices.\n\n' +
          'Feature extraction. A few hundred labels, one forward pass per example, then a ' +
          'logistic regression. This is the rung most projects should stop at.\n\n' +
          'Parameter-efficient fine-tuning. Low thousands of labels, a GPU for an hour. Take ' +
          'a model with 12 layers and hidden size 768, and apply LoRA at rank 8 to the query ' +
          'and value projections. Each adapted matrix contributes r(d + k) = 8(768 + 768) = ' +
          '12,288 parameters. Two projections per layer across 12 layers gives 12 x 2 x ' +
          '12,288 = 294,912 trainable parameters. Against a 117-million-parameter backbone ' +
          'that is roughly 0.25 per cent. The simulator on this page recomputes this exactly ' +
          'for whatever configuration you set.\n\n' +
          'Full fine-tuning. Tens of thousands of labels, real GPU time, and every parameter ' +
          'in play. On a few hundred biological examples this is usually the wrong tool, ' +
          'because you are fitting a hundred million parameters to a few hundred points and ' +
          'the validation protocol has to be correspondingly strict.\n\n' +
          'The general shape of the learning curve is not a matter of opinion: it was ' +
          'measured on real data for this module. On WDBC, logistic regression goes from ' +
          '89.3 per cent accuracy with 11 labelled examples to 96.5 per cent with 114 and ' +
          '97.6 per cent with 455. Steep gains early, flat later. That diminishing return is ' +
          'why the labelled-data budget, not the model, usually decides which rung you can ' +
          'reach.',
        keypoint: 'Climb the ladder one rung at a time, and only when the rung below has demonstrably run out.'
      },
      fm: {
        title: 'A note on what the simulator is',
        body:
          'Fine-tuning a real foundation model cannot happen in a browser tab. The simulator ' +
          'on this page therefore does two different things, and it is worth being clear ' +
          'about which is which. The parameter arithmetic is exact: given your architecture ' +
          'and rank, it computes the true trainable-parameter counts and memory ratios. The ' +
          'performance curves are a transparent parametric model of learning-curve behaviour, ' +
          'with the assumptions written on screen, calibrated so that its qualitative ' +
          'behaviour matches the real learning curve measured on WDBC. It is a model of how ' +
          'these methods behave, not a record of measured results, and it says so.',
        models: ['lora', 'dnabert2', 'nucleotideTransformer', 'esm2', 'hyenadna']
      },
      scientist:
        'You have 340 labelled sequences and access to one GPU for a day. Argue for the ' +
        'adaptation strategy you would choose, then argue against it. Which argument is ' +
        'stronger, and what single piece of evidence would settle it?',
      quiz: [
        { q: 'What is the essential difference between bagging and boosting?',
          options: ['Boosting uses more trees', 'Bagging trains models independently in parallel and averages them; boosting trains them sequentially, each correcting its predecessors', 'Boosting is always more accurate', 'Bagging cannot use trees'],
          answer: 1,
          why: 'The dependence structure is the whole difference, and it explains the rest: bagging reduces variance and is hard to overfit by adding models, boosting reduces bias and requires early stopping.' },
        { q: 'LoRA at rank 8 on query and value projections, 12 layers, hidden size 768. How many trainable parameters?',
          options: ['12,288', '294,912', '1,179,648', '117,000,000'],
          answer: 1,
          why: 'r(d+k) = 8 x 1536 = 12,288 per adapted matrix; two matrices per layer over 12 layers gives 294,912. Roughly a quarter of one per cent of a 117-million-parameter backbone.' },
        { q: 'You have 200 labelled examples and a suitable pretrained model. What should you try first?',
          options: ['Full fine-tuning', 'Feature extraction: frozen embeddings plus a small classical head', 'LoRA at rank 64', 'Train from scratch'],
          answer: 1,
          why: 'With 200 examples, full fine-tuning fits an enormous parameter count to very little data. Frozen embeddings plus logistic regression is cheap, robust, honestly cross-validatable, and is the baseline anything more elaborate has to beat.' }
      ],
      lab: 'lab11',
      datasets: ['proteinSim', 'wdbc'],
      reading: [
        { ref: 'lora', note: 'The original LoRA paper. The method section is short and worth reading properly.' },
        { ref: 'dnabert2', note: 'A genomics model that uses LoRA, with the efficiency comparison against the Nucleotide Transformer.' },
        { ref: 'geron', note: 'Chapter 7 on boosting.' }
      ],
      provenance: {
        kept: 'Boosting, the weight-update rules, gradient boosting as residual fitting, and the gradient-boosting variants from the 2025/26 Week 10-11 deck.',
        changed: 'The bicycle-demand running example is replaced. The entire adaptation section, from zero-shot through LoRA, is new. The existing ensemble lab, which uses credit-scoring data, is rewritten around biological data.'
      }
    },

    /* ----------------------------------------------------------------- 12 */
    {
      n: 12,
      title: 'Can we trust the model?',
      strand: 'evaluation',
      short: 'Everything from the previous eleven weeks, pointed at a single question.',
      los: ['LO1', 'LO2', 'LO3', 'LO4', 'LO5'],
      biology:
        'A model that is accurate on a retrospective dataset and useless in a clinic is a ' +
        'familiar object. The gap between the two is not usually caused by the algorithm. ' +
        'It is caused by evaluation that answered an easier question than the one that ' +
        'mattered. This week assembles the tools for asking the harder question.',
      objectives: [
        'Assess whether a reported performance figure supports the claim being made from it.',
        'Assess and interpret calibration, and distinguish it from discrimination.',
        'Quantify uncertainty in a performance estimate and report confidence intervals.',
        'Identify dataset shift and evaluate subgroup performance.',
        'Weigh computational and environmental cost, licensing and privacy alongside accuracy.',
        'Explain what external validation means and why internal validation cannot substitute for it.'
      ],
      concepts: [
        { term: 'Discrimination versus calibration', body: 'Discrimination, measured by AUC, is whether the model ranks positives above negatives. Calibration is whether a stated probability of 0.8 corresponds to an 80 per cent event rate. A model can discriminate excellently and be badly calibrated, and for clinical decisions calibration is often the property that matters.' },
        { term: 'Uncertainty in the estimate', body: 'On a 100-patient test set, an observed accuracy of 0.90 has a 95 per cent confidence interval of roughly 0.82 to 0.95. Two models reported as 0.90 and 0.93 on such a set are not distinguishable. Report intervals.' },
        { term: 'Dataset shift', body: 'Covariate shift is a change in the input distribution; label shift a change in the outcome base rate; concept shift a change in the relationship itself. A model deployed at a different hospital, on a different scanner, in a different season, meets all three.' },
        { term: 'Subgroup performance', body: 'Aggregate accuracy conceals systematic failure in a subgroup. Report performance by age, sex, ethnicity and site, and state the sample size in each cell so that the reader can see which estimates are unstable.' },
        { term: 'External validation', body: 'Evaluation on data from a different source, collected independently. Internal cross-validation, however careful, cannot tell you whether the model transports.' },
        { term: 'Interpretability', body: 'Coefficients, feature importances, SHAP values and attention maps describe the model. None of them establishes a mechanism in the biology, and treating them as if they did is the most common over-claim in the field.' },
        { term: 'Computational and environmental cost', body: 'Training large models has a measurable energy and carbon cost [ref:strubell2019]. It is a legitimate axis of model selection, and for a marginal accuracy gain it can be the deciding one.' },
        { term: 'Licensing and privacy', body: 'A model licensed for research use only cannot be deployed clinically. Patient data carries obligations that survive de-identification. Both are constraints on the project, not paperwork at the end of it.' },
        { term: 'Clinical validation', body: 'Prospective evaluation of whether using the model changes patient outcomes. It is a different kind of study from anything in this module, and it is the one that decides whether the work mattered.' }
      ],
      viz: 'trust',
      viz2: 'fm-decision',
      worked: {
        title: 'Interrogating a 97 per cent accuracy claim',
        body:
          'A paper reports 97 per cent accuracy for cancer detection. Take it apart.\n\n' +
          'How many samples? On 200 samples, 97 per cent has a 95 per cent confidence ' +
          'interval of roughly 93.5 to 98.7 per cent. On 50 samples it is roughly 88 to 99.5 ' +
          'per cent, which is compatible with a substantially worse model.\n\n' +
          'What is the class balance? If 95 per cent of samples are negative, then always ' +
          'predicting negative scores 95 per cent, and 97 per cent is an improvement of two ' +
          'points over doing nothing at all.\n\n' +
          'What was the protocol? Was any preprocessing, feature selection or hyperparameter ' +
          'choice made using the test data? Were repeat samples from the same patient split ' +
          'across folds? Recall from Week 3 that you cannot detect this from the score.\n\n' +
          'Was there external validation? A model validated only on its development cohort ' +
          'has been shown to fit that cohort. That is a weaker claim than it appears.\n\n' +
          'Is it calibrated? For a screening application, a model that ranks well but ' +
          'systematically overstates its confidence will produce the wrong number of ' +
          'referrals.\n\n' +
          'Who is in the data? If the cohort is 90 per cent one demographic group, the ' +
          'reported figure describes that group. Performance elsewhere is unmeasured, not ' +
          'equal.\n\n' +
          'What are the sensitivity and specificity, separately? A single accuracy figure ' +
          'conceals which error the model prefers to make, and in medicine those two errors ' +
          'are almost never equally costly.\n\n' +
          'None of these questions is hostile. They are the questions the authors should ' +
          'have answered, and a good paper answers them without being asked.',
        keypoint: 'A high-performing model is not necessarily a scientifically valid or clinically useful one.'
      },
      fm: {
        title: 'The extra questions foundation models raise',
        body:
          'Everything above still applies, and five things are added. Was your test set in ' +
          'the pretraining corpus? What is in that corpus, and which populations or organisms ' +
          'does it under-represent? What is the licence on the weights, and does it permit ' +
          'your use? What does inference cost at the scale you intend to deploy? And can you ' +
          'reproduce the result at all, given that the pretrained weights are a dependency ' +
          'you do not control and may not be able to archive? None of these has a comfortable ' +
          'general answer, which is exactly why they have to be asked case by case.',
        models: ['nucleotideTransformer', 'dnabert2', 'esm2', 'alphafold3']
      },
      scientist:
        'Take one result you produced in this module. Write the paragraph a reviewer would ' +
        'write recommending rejection. Then decide, honestly, whether you can answer it.',
      quiz: [
        { q: 'A model has AUC 0.94 but its predicted probabilities are systematically too high. What is wrong, and does it matter?',
          options: ['Nothing is wrong, AUC is what matters', 'It discriminates well but is poorly calibrated, which matters whenever the probability itself is used to make a decision', 'The AUC must be wrong', 'It needs more training data'],
          answer: 1,
          why: 'AUC depends only on the ranking, so it is blind to calibration. If a clinician acts on "85 per cent probability of malignancy", the number has to mean what it says.' },
        { q: 'Two models score 0.90 and 0.93 accuracy on the same 100-sample test set. What can you conclude?',
          options: ['The second is better', 'The confidence intervals overlap substantially, so the difference is not established by this evidence', 'The first is overfitting', 'You need a third model'],
          answer: 1,
          why: 'A 95 per cent interval around 0.90 on 100 samples runs roughly from 0.82 to 0.95. The two are statistically indistinguishable, and reporting the difference as real is a common error.' },
        { q: 'What does external validation add that careful cross-validation cannot?',
          options: ['A larger sample', 'Evidence that the model transports to data collected independently, under different conditions, by different people', 'Better hyperparameters', 'Faster training'],
          answer: 1,
          why: 'Cross-validation resamples one dataset, so it cannot detect anything shared by every row of it: one scanner, one protocol, one population, one set of collection habits.' }
      ],
      lab: 'lab12',
      datasets: ['wdbc', 'nhanes', 'tcga'],
      reading: [
        { ref: 'jones2019', note: 'Reread it now. It will land differently than it did in Week 1.' },
        { ref: 'kapoor2023', note: 'For the full taxonomy and the scale of the problem.' },
        { ref: 'strubell2019', note: 'For the energy cost of training large models.' },
        { ref: 'greener2022', note: 'For the evaluation checklist.' }
      ],
      provenance: {
        kept: 'The evaluation metrics and confusion-matrix material distributed across the 2025/26 decks, and the carbon-footprint slides from the Week 1 deck, which are relocated here.',
        changed: 'This week is new as a coherent unit. The existing module ends on gradient-boosting variants; the redesign ends on whether the work is defensible, which is the more useful place for an MSc module to finish.'
      }
    }
  ]
};
