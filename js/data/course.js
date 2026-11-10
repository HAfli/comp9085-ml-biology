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
          { what: 'The lecture', body: 'Two hours a week. Slides are posted on Canvas, as both PowerPoint and PDF, before the lecture.' },
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
      /* The six "Try this interactively" activities of the Week 3 lecture, in
         lecture order (slides 17, 32, 40, 48, 53, 71). Numbers from
         data/scripts/17_build_week03_interactives.py (js/data/week03.js). */
      vizList: ['data-splitter', 'cv-explorer', 'leakage', 'pipeline-builder',
                'hyperparameter', 'wdbc-e2e'],
      interactiveIntro:
        'Six interactives, in the order the lecture uses them: the data splitter (lecture ' +
        'slide 17), cross-validation (slide 32), leakage (slide 40), the pipeline builder ' +
        '(slide 48), hyperparameter tuning (slide 53) and the end-to-end WDBC experiment ' +
        '(slide 71). Every one has a Reset button. All but the data splitter use the real ' +
        'WDBC data, and their numbers are the lecture\'s.',
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
      title: 'Bayes in healthcare: from prediction to probability',
      strand: 'classical',
      short: 'A prediction is not automatically a diagnosis. What a positive result means depends on the test, the threshold and the population.',
      los: ['LO2', 'LO3', 'LO5'],
      biology:
        'Week 3 asked whether we can trust the experiment. Week 4 asks the next question: ' +
        'suppose we do, what does the prediction actually mean? Every diagnostic test, ' +
        'biomarker assay or classifier has two error rates and is used in a population ' +
        'with some prevalence. Clinicians, patients and, frequently, machine-learning ' +
        'practitioners confuse the probability of a positive result given disease with ' +
        'the probability of disease given a positive result. These are different numbers, ' +
        'sometimes by an order of magnitude, and Bayes\' rule is what converts between ' +
        'them [ref:altman1994pv]. All the numerical examples on this page are hypothetical ' +
        'classroom numbers or labelled simulations; none describes the performance of a ' +
        'real clinical test.',
      objectives: [
        'Construct a binary confusion matrix and calculate sensitivity, specificity, PPV and NPV, stating the denominator of each.',
        'Explain why accuracy alone cannot tell you what a positive result means.',
        'Distinguish "how good is the test?" (disease status → result) from "given the result, what should I believe?" (result → disease status).',
        'Use Bayes\' theorem, and natural frequencies, to compute the probability of disease after a positive or negative result.',
        'Explain why PPV and NPV depend on prevalence while sensitivity and specificity do not.',
        'Explain how moving a decision threshold trades false negatives against false positives.',
        'Distinguish discrimination from calibration, and read a reliability diagram.',
        'Treat a model\'s probability as a claim to be checked, not as automatically trustworthy.',
        'Choose and defend the metric that fits a stated biological or clinical question.',
        'Explain how Bayes\' theorem becomes a classifier (naive Bayes, Week 5).'
      ],
      sections: [
        { id: 'from-prediction', nav: '1. From prediction to decision',
          title: '1. From prediction to decision',
          html:
            '<div class="grid grid-3">' +
              '<div class="card"><span class="eyebrow">Week 3</span><h4 style="margin-top:0">Can I trust the experiment?</h4><p class="small mb0">data → correct split → baseline → cross-validation → no leakage → final test once. A trustworthy result is a protocol, not just a score.</p></div>' +
              '<div class="card"><span class="eyebrow">Week 4</span><h4 style="margin-top:0">Can I interpret the prediction?</h4><p class="small mb0">Given a prediction, what does it actually mean for a person, in a population, at a threshold?</p></div>' +
              '<div class="card"><span class="eyebrow">Week 5</span><h4 style="margin-top:0">Can I turn Bayesian reasoning into a classifier?</h4><p class="small mb0">Naive Bayes on real food-safety text.</p></div>' +
            '</div>' +
            '<p style="margin-top:var(--s5)"><strong>This week\'s chain:</strong></p>' +
            '<div class="pill-row" aria-label="features, model, probability, threshold, prediction, decision">' +
              '<span class="pill">features</span> → <span class="pill">model</span> → <span class="pill">probability</span> → <span class="pill">threshold</span> → <span class="pill">prediction</span> → <span class="pill">decision</span></div>',
          body:
            'A model outputs a probability, such as P(malignant | measurements) = 0.73. ' +
            'Someone chooses a threshold that turns it into a prediction, and a person or ' +
            'a team makes a decision with everything else they know. Between the model ' +
            'output and the decision sit the test\'s error rates, the population it is ' +
            'used in, the threshold, and whether the probabilities mean what they say. ' +
            'Each of those is a section below.',
          keypoint: 'A prediction is not automatically a diagnosis, and a model output is not a decision.' },

        { id: 'puzzle', nav: '2. The diagnostic puzzle',
          title: '2. The diagnostic puzzle',
          html:
            '<div class="callout callout-sci"><p class="mb0"><strong>Think before you open ' +
            'the answer.</strong> A diagnostic test is 95% accurate. You test positive. ' +
            'How likely is it that you have the condition?</p></div>' +
            '<details class="card"><summary style="cursor:pointer;font-weight:620">Reveal: ' +
            'why this cannot be answered yet</summary><p style="margin-top:var(--s4)">' +
            'Accuracy alone is not enough. A positive result depends on two error rates ' +
            'and on how many of the people tested have the condition (the prevalence).</p>' +
            '<p>Fix the hypothetical classroom numbers: prevalence 1%, sensitivity 95%, ' +
            'specificity 95%, 1,000 people. Then 10 have the condition and 9.5 of them test ' +
            'positive (TP; an expected count). 990 do not, and 49.5 of them test positive ' +
            '(FP). So 59 people test positive and only 9.5 of them are ill:</p>' +
            '<p><strong>PPV = TP / (TP + FP) = 9.5 / 59 = 16.1%</strong>, even though the ' +
            'test is exactly 95% accurate ((9.5 + 940.5) / 1,000).</p>' +
            '<p class="mb0">A second puzzle from the lecture: a 99% sensitive, 99% specific ' +
            'test where only 1 in 1,000 people have the condition. Of 100,000 people, 99 ' +
            'true positives and 999 false positives: PPV = 99 / 1,098 = 9.0%.</p></details>' },

        { id: 'confusion', nav: '3. The confusion matrix',
          title: '3. The confusion matrix',
          body:
            'Four counts describe every binary test or classifier. Throughout Week 4, on ' +
            'this page, in the lecture and in the lab, the rows are what is true and the ' +
            'columns are what the test says. (scikit-learn\'s confusion_matrix prints ' +
            '[[TN, FP], [FN, TP]] because it orders the classes 0 then 1; the meaning of ' +
            'each cell is the same.)',
          html:
            '<div class="table-scroll"><table class="table-compact"><caption>The confusion ' +
            'matrix. Rows = what is true; columns = what the test says.</caption><thead><tr>' +
            '<th></th><th scope="col">Test positive</th><th scope="col">Test negative</th>' +
            '</tr></thead><tbody><tr><th scope="row">Has the condition</th><td><strong>TP' +
            '</strong>: ill, flagged</td><td><strong>FN</strong>: ill, missed</td></tr><tr>' +
            '<th scope="row">Does not have it</th><td><strong>FP</strong>: healthy, false ' +
            'alarm</td><td><strong>TN</strong>: healthy, cleared</td></tr></tbody></table></div>' +
            '<p class="small muted">Which error matters more depends on the setting: the ' +
            'consequences of a missed case and of a false alarm are a clinical and ' +
            'practical judgement, not a statistical one.</p>' },

        { id: 'sens-spec', nav: '4. Sensitivity and specificity',
          title: '4. Sensitivity and specificity: how good is the test?',
          body:
            'Sensitivity = TP / (TP + FN): of the people who really have the condition, how ' +
            'many did the test find? Specificity = TN / (TN + FP): of the people who do not, ' +
            'how many did it clear? Both divide within one row of the matrix, so they ' +
            'describe how the test behaves given the true status. Prevalence does not enter ' +
            'their formulas, but they can still differ between populations when the case ' +
            'mix differs. 1 − specificity is the false positive rate, FP / (TN + FP), which ' +
            'is not the same as 1 − PPV. Use the calculator below and watch the ' +
            'highlighted denominator.',
          viz: ['cm-calc'] },

        { id: 'ppv-npv', nav: '5. PPV and NPV',
          title: '5. PPV and NPV: the reversal',
          html:
            '<div class="grid grid-2">' +
              '<div class="card"><h4 style="margin-top:0">Test performance</h4><p class="small">Known: disease status. Asked: the test result.</p><p style="font-size:1.25rem;font-weight:700" class="mb0">P(test positive | disease)</p><p class="small mb0">Sensitivity and specificity.</p></div>' +
              '<div class="card"><h4 style="margin-top:0">Evidence interpretation</h4><p class="small">Known: the test result. Asked: disease status.</p><p style="font-size:1.25rem;font-weight:700" class="mb0">P(disease | test positive)</p><p class="small mb0">PPV and NPV: depend on the test AND the population.</p></div>' +
            '</div>',
          body:
            'Sensitivity and specificity ask what happens given disease status. PPV and NPV ' +
            'ask what the result means given the test result. PPV = TP / (TP + FP): of the ' +
            'people the test flagged, how many really have the condition? NPV = TN / (TN + ' +
            'FN): of the people it cleared, how many are really clear? They divide within a ' +
            'column, which mixes people from both rows, so the relative size of the rows, ' +
            'the prevalence, matters.',
          keypoint: 'P(test positive | disease) is not P(disease | test positive).' },

        { id: 'bayes-prevalence', nav: '6. Bayes calculator',
          title: '6. Bayes, by counting people',
          body:
            'Bayes\' theorem is the bridge between the two directions. For a positive ' +
            'result, the prior is the prevalence, the likelihood is the sensitivity, the ' +
            'false-positive probability is one minus the specificity, and the posterior is ' +
            'the PPV: PPV = Se·p / [Se·p + (1 − Sp)(1 − p)]. For a negative result, NPV = ' +
            'Sp(1 − p) / [Sp(1 − p) + (1 − Se)p]. The calculator below shows the same ' +
            'calculation as expected counts of people (natural frequencies). Start from the ' +
            'lecture example: prevalence 1%, sensitivity 95%, specificity 95%, PPV 16.1%.\n\n' +
            'Bayes updates beliefs; it does not repair biased sampling, leakage or poor ' +
            'measurement. If sensitivity was estimated badly, the PPV inherits the error.',
          viz: ['bayes'] },

        { id: 'prevalence-section', nav: '7. Prevalence explorer',
          title: '7. The population changes the meaning',
          body:
            'Keep the test fixed and change who is tested. With a hypothetical 99% ' +
            'sensitive, 99% specific test and 100,000 people: at 0.1% prevalence, 99 true ' +
            'positives and 999 false positives (PPV 9.0%); at 1%, 990 and 990 (50.0%); at ' +
            '10%, 9,900 and 900 (91.7%); at 37.3%, the WDBC cohort\'s malignant fraction, ' +
            '36,927 and 627, so 37,554 positives (98.3%). This is not a defect of the model: ' +
            'it is what the same test characteristics mean in each population.',
          viz: ['prevalence'],
          keypoint: 'The same test can mean something very different in different populations.' },

        { id: 'thresholds', nav: '8. Threshold explorer',
          title: '8. From probability to decision: the threshold',
          body:
            'A classifier such as logistic regression outputs a probability, for example ' +
            'P(malignant | measurements) = 0.73. A decision still needs an operating ' +
            'threshold t, with "positive" meaning a probability of at least t: at t = 0.5, ' +
            '0.73 becomes positive; at t = 0.8 it becomes negative. The chain is ' +
            'probability, threshold, classification, confusion matrix, metrics.\n\n' +
            'Lowering the threshold generally increases the number of positive ' +
            'predictions (more true positives and more false positives); raising it ' +
            'generally decreases them. The model is unchanged; only the decision rule ' +
            'moved. No threshold is best in general: which error matters more depends on ' +
            'the application, the population and what happens next. Choose it on ' +
            'out-of-fold (OOF) development predictions, freeze it, and only then use the ' +
            'final test set, once.',
          viz: ['threshold'],
          keypoint: 'For a fixed model, one error can only be reduced by accepting more of the other.' },

        { id: 'calibration-section', nav: '9. Calibration explorer',
          title: '9. Calibration: is 0.8 really 80%?',
          body:
            'A probability is a claim that can be checked. A model is well calibrated in a ' +
            'population when its predicted probabilities match observed frequencies: among ' +
            'the many cases it scores near 0.8, about 80% turn out positive ' +
            '[ref:sklearnCalibration]. Calibration is assessed over groups of predictions; ' +
            'a prediction of 0.8 does not guarantee that a particular individual has ' +
            'exactly an 80% probability of the outcome.\n\n' +
            'A reliability diagram plots the mean predicted probability in each bin (x) ' +
            'against the observed fraction positive in that bin (y). In the illustrative ' +
            'curves below, points on the diagonal are well calibrated; a curve flatter than ' +
            'the diagonal indicates over-confidence (predictions pushed towards 0 and 1), ' +
            'and a steeper one indicates under-confidence (predictions pulled towards the ' +
            'middle).\n\n' +
            'Calibration is not discrimination. Discrimination, summarised by AUC, asks ' +
            'whether the model ranks positive cases above negative ones. Models A, B and C ' +
            'below rank the cases identically, with the same accuracy and AUC, and still ' +
            'attach different probabilities to them. A model that predicts the prevalence ' +
            'for everyone is calibrated overall and useless for discrimination ' +
            '[ref:vanCalster2019].',
          viz: ['calibration'],
          keypoint: 'A probability is a claim that can be checked, over groups of cases.' },

        { id: 'fm-connection', nav: '10. Foundation models',
          title: '10. Foundation models: confidence is not calibration',
          body:
            'Large modern models, including foundation models, can produce very ' +
            'confident probability-like scores. A confident-looking output is not evidence ' +
            'that the probability is calibrated: accurate modern neural networks can be ' +
            'poorly calibrated [ref:guo2017]. Everything on this page that treats a model ' +
            'output as a probability, from choosing a threshold to computing a predictive ' +
            'value, depends on it meaning what it says, so check calibration on held-out ' +
            'data from the population of use. Foundation models are covered properly from ' +
            'Week 7, and Week 12 returns to calibration, uncertainty and trust.',
          keypoint: 'Confidence is not calibration.' },

        { id: 'wdbc', nav: '11. Real data: WDBC',
          title: '11. Real data: WDBC, two models',
          body:
            'The lab fits two models to the same WDBC split: logistic regression and ' +
            'Gaussian naive Bayes (next week\'s classifier). On the final test set their ' +
            'accuracy is 97.1% and 93.6%, and their AUC is almost identical (0.998 and ' +
            '0.996): similar discrimination. Their probabilities are not alike. Naive ' +
            'Bayes puts 98% of its predictions below 0.05 or above 0.95, and its Brier ' +
            'score is about three times worse (0.056 against 0.019). The Brier score is ' +
            'the mean squared difference between the predicted probability and the ' +
            'outcome (0 or 1); lower is better. This is real data used for classroom ' +
            'evaluation, not evidence of clinical performance.',
          viz: ['wdbc-models'],
          keypoint: 'A model can classify well and still produce probabilities that deserve scrutiny.' },

        { id: 'lab-companion', nav: '12. Using this page with the lab',
          title: '12. Using this page with the lab',
          html:
            '<div class="grid grid-3">' +
              '<div class="card"><span class="eyebrow">Before the lab</span><p class="small mb0">Explore the Bayes calculator and the prevalence explorer. Predict before you move a slider.</p></div>' +
              '<div class="card"><span class="eyebrow">During the lab</span><p class="small mb0">Implement the same reasoning in Python on real WDBC data. The notebook is linked in the lab section below.</p></div>' +
              '<div class="card"><span class="eyebrow">After the lab</span><p class="small mb0">Compare your threshold and calibration results with the threshold and calibration explorers.</p></div>' +
            '</div>' +
            '<div class="table-scroll" style="margin-top:var(--s5)"><table class="table-compact"><caption>Which interactive goes with which lab task.</caption><thead><tr><th scope="col">Lab tasks</th><th scope="col">Section and interactive on this page</th></tr></thead><tbody>' +
              '<tr><th scope="row">Task 1</th><td><a href="#confusion">3. Confusion matrix</a></td></tr>' +
              '<tr><th scope="row">Tasks 2–4</th><td><a href="#viz-cm-calc">Confusion-matrix calculator</a>, <a href="#viz-bayes">Bayes calculator</a>, <a href="#viz-prevalence">prevalence explorer</a></td></tr>' +
              '<tr><th scope="row">Tasks 5–7</th><td><a href="#viz-threshold">Decision threshold explorer</a></td></tr>' +
              '<tr><th scope="row">Tasks 8–9</th><td><a href="#viz-calibration">Calibration explorer</a>, <a href="#viz-wdbc-models">WDBC models</a></td></tr>' +
              '<tr><th scope="row">Task 10</th><td><a href="#thresholds">8. Which error matters more depends on the question</a></td></tr>' +
              '<tr><th scope="row">Task 11</th><td>The evaluation record: protocol, prevalence and calibration (<a href="#from-prediction">1</a>, <a href="#prevalence-section">7</a>, <a href="#calibration-section">9</a>)</td></tr>' +
            '</tbody></table></div>' +
            '<p class="small muted">The page is a companion to the lab, not a replacement for it. The core lab is Tasks 1–8 and 10–11; Task 9 is an optional extension.</p>' }
      ],
      interactiveIntro:
        'Every interactive this week sits next to the idea it illustrates. They share ' +
        'their numbers with the lecture and the lab.',
      interactiveIndex: [
        { id: 'cm-calc', label: 'Confusion-matrix calculator', note: 'section 4; lab Tasks 1–2; lecture slide 75' },
        { id: 'bayes', label: 'Diagnostic test (Bayes) calculator', note: 'section 6; lab Tasks 3–4; lecture slide 41' },
        { id: 'prevalence', label: 'Prevalence explorer', note: 'section 7; lab Task 4; lecture slide 42' },
        { id: 'threshold', label: 'Decision threshold explorer', note: 'section 8; lab Tasks 5–7; lecture slide 49' },
        { id: 'calibration', label: 'Calibration explorer', note: 'section 9; lab Tasks 8–9; lecture slide 60' },
        { id: 'wdbc-models', label: 'WDBC: two models, real data', note: 'section 11; lab Task 8; lecture slide 75' }
      ],
      concepts: [
        { term: 'Confusion matrix', body: 'Four counts: true positives, false positives, false negatives and true negatives. Every metric this week is a ratio of two of them; the skill is knowing which denominator you are dividing by.' },
        { term: 'Sensitivity', body: 'TP / (TP + FN) = P(test positive | disease present). Of the people who really have the condition, the fraction the test finds. Also called recall or the true positive rate.' },
        { term: 'Specificity', body: 'TN / (TN + FP) = P(test negative | disease absent). Of the people who do not have the condition, the fraction the test correctly clears. 1 − specificity is the false positive rate.' },
        { term: 'Positive predictive value', body: 'TP / (TP + FP) = P(disease | test positive). Of the people who test positive, the fraction who really have the condition. This is what the person holding a positive result wants to know.' },
        { term: 'Negative predictive value', body: 'TN / (TN + FN) = P(no disease | test negative). Of the people who test negative, the fraction who really are clear.' },
        { term: 'Prevalence (base rate)', body: 'The proportion of the tested population that has the condition. A property of the population, not the test, and the prior in Bayes\' rule. Screening an unselected population and testing a symptomatic clinic are different problems for this reason.' },
        { term: 'Bayes\' rule', body: 'P(D | +) = P(+ | D) P(D) / [P(+ | D) P(D) + P(+ | not D) P(not D)]. It reweights the test\'s behaviour by the prevalence. It updates beliefs; it does not repair biased sampling, leakage or poor measurement.' },
        { term: 'Decision threshold', body: 'A classifier outputs P(Y = 1 | X); a decision needs a cut-off. Lowering it raises sensitivity and lowers specificity. The model is unchanged; only the decision rule moves.' },
        { term: 'Calibration', body: 'Whether predicted probabilities match observed frequencies: among cases predicted near 0.8, about 80 per cent should be positive [ref:sklearnCalibration]. Read from a reliability diagram.' },
        { term: 'AUC', body: 'The area under the ROC curve: the probability that a randomly chosen positive case is scored above a randomly chosen negative one. It summarises discrimination across all thresholds; it does not choose a threshold and says nothing about calibration.' },
        { term: 'Brier score', body: 'The mean squared difference between the predicted probability and the outcome (0 or 1). Lower is better. Unlike accuracy or AUC, it rewards probabilities that match observed frequencies.' },
        { term: 'Out-of-fold (OOF) predictions', body: 'Cross-validated predictions on the development (training) pool: each case is scored by a model that did not see it. Thresholds and calibration checks are developed on these, never on the final test set.' },
        { term: 'Final test set', body: 'Data held back until every modelling decision, including the threshold, is frozen, then used once to report performance (Week 3).' },
        { term: 'Discrimination versus calibration', body: 'Discrimination (for example AUC) asks whether the model ranks positives above negatives. Calibration asks whether its probabilities can be taken at face value. A model can do one well and the other badly [ref:vanCalster2019].' }
      ],
      viz: 'bayes',
      viz2: 'prevalence',
      viz3: 'threshold',
      viz4: 'calibration',
      worked: {
        title: 'A 95 per cent accurate test in a 1 per cent population',
        body:
          'Hypothetical classroom example. A test has 95 per cent sensitivity and 95 per cent ' +
          'specificity, and 1 per cent of the people tested have the condition. Imagine ' +
          '1,000 people.\n\n' +
          '10 of them have the condition, and the test finds 95 per cent of those: 9.5 ' +
          'people on average (the half-person is an expected count; with 10,000 people it ' +
          'is 95 of 100). 990 do not have the condition, and the test wrongly flags 5 per ' +
          'cent of them: 49.5 people. So 59 people test positive, and only 9.5 of them are ' +
          'ill.\n\n' +
          'The positive predictive value is 9.5 / 59, about 16 per cent. The test\'s ' +
          'accuracy is exactly 95 per cent, and a positive result is still wrong about five ' +
          'times in six. Nothing is broken: false positives are drawn from the 990, true ' +
          'positives from the 10. The negative predictive value, 940.5 / 941, is 99.95 per ' +
          'cent, which is why a negative result is so reassuring in this setting.\n\n' +
          'Now use the same test in a population where 20 per cent have the condition, as ' +
          'it might be among referred, symptomatic patients. PPV rises to about 83 per cent. ' +
          'The test did not change. The population did.',
        keypoint: 'Sensitivity and specificity describe the test. Predictive values describe the test and the population together.'
      },
      fm: {
        inline: true,
        title: 'Foundation models: confidence is not calibration',
        body:
          'Large modern networks, including fine-tuned foundation models, can rank cases ' +
          'well and still produce over-confident probabilities: a group of predictions at ' +
          '"0.9" that contains far fewer than 90 per cent positives. Everything in this week ' +
          'that treats a model output as a probability, from choosing a threshold to ' +
          'computing a predictive value, depends on that probability meaning what it says. ' +
          'Check calibration on held-out data from the population you will use the model ' +
          'in, not only discrimination. Week 12 returns to calibration under dataset shift.',
        models: []
      },
      scientist:
        'A biomarker classifier is reported as "95 per cent sensitive and 95 per cent ' +
        'specific" in a case-control study with equal numbers of patients and healthy ' +
        'controls. A hospital now proposes to use it to screen a general population in which ' +
        'about 1 in 200 people have the condition. What will the PPV be, what information ' +
        'are you missing, and what would you ask for before agreeing?',
      quiz: [
        { q: 'Prevalence falls from 20 per cent to 1 per cent while sensitivity and specificity stay at 95 per cent. What happens to PPV?',
          options: ['It rises', 'It falls substantially, from about 83 per cent to about 16 per cent', 'It is unchanged, because the test is unchanged', 'It depends only on the sample size'],
          answer: 1,
          why: 'False positives come from the healthy group, which becomes far larger relative to the diseased group as prevalence falls. Use the first calculator on this page to watch it happen.' },
        { q: 'You lower a classifier\'s threshold from 0.5 to 0.3. Which is the most likely result?',
          options: ['Sensitivity rises and specificity falls', 'Both rise', 'Both fall', 'Neither changes, because the model is the same'],
          answer: 0,
          why: 'More cases are called positive, so more true cases are caught and more healthy people are flagged. The threshold explorer shows the trade.' },
        { q: 'Two models have the same AUC and the same accuracy. Among cases Model B scores near 0.8, only about 60 per cent are positive. What does that tell you?',
          options: ['Model B is worse at ranking patients', 'Model B is over-confident: its probabilities are not calibrated, even though its ranking is as good as the other model\'s', 'Model B has leakage', 'Nothing, since accuracy is the same'],
          answer: 1,
          why: 'AUC measures discrimination, which is about ordering. Calibration is about whether the numbers mean what they say. The calibration explorer shows both at once.' }
      ],
      lab: 'lab04',
      datasets: ['wdbc'],
      reading: [
        { ref: 'altman1994sens', note: 'One page. The clearest short statement of sensitivity and specificity.' },
        { ref: 'altman1994pv', note: 'One page. Why predictive values depend on prevalence.' },
        { ref: 'trevethan2017', note: 'Common misunderstandings of all four metrics, with screening examples.' },
        { ref: 'vanCalster2019', note: 'Why calibration matters for clinical prediction models.' },
        { ref: 'gigerenzer1995', note: 'Why natural frequencies (counts of people) make Bayesian reasoning easier.' },
        { ref: 'sklearnCalibration', note: 'calibration_curve, CalibrationDisplay and CalibratedClassifierCV, used in the lab.' },
        { ref: 'niculescu2005', note: 'Which classifiers produce well or badly calibrated probabilities, including naive Bayes.' },
        { ref: 'guo2017', note: 'Modern neural networks can be accurate and poorly calibrated.' },
        { ref: 'saito2015', note: 'Why the precision-recall curve can be more informative than ROC under imbalance (lab Task 6).' },
        { ref: 'wdbc', note: 'The dataset used in the lab; classroom evaluation, not clinical performance.' }
      ],
      provenance: {
        kept: 'Conditional probability, the product rule and Bayes\' rule from the 2025/26 Bayesian classification deck (Week4_ML_MTU.pptx), where they introduced naive Bayes.',
        changed: 'The prison-uniform example (P(CellBlockA | BlueU)) is replaced by diagnostic testing, which uses the identical arithmetic in a setting students will meet professionally. Sensitivity, specificity, PPV, NPV, the base-rate effect, decision thresholds and calibration are added. Naive Bayes itself moves to Week 5, where Bayesian reasoning becomes a classifier.'
      }
    },

    /* ------------------------------------------------------------------ 5 */
    {
      n: 5,
      title: 'Naive Bayes for food-safety text: a complete pipeline',
      strand: 'classical',
      short: 'Naive Bayes is a simple model, but it is a complete machine-learning pipeline: text, vectorizer, model, evaluation and trust, on real FDA recall reasons.',
      los: ['LO2', 'LO3', 'LO5'],
      biology:
        'When a food is recalled in the United States, the FDA records a short free-text ' +
        'reason ("Product may be contaminated with Listeria monocytogenes", "Undeclared ' +
        'egg") and a hazard classification. Class I means a reasonable probability that the ' +
        'product will cause serious adverse health consequences or death; Class II, ' +
        'temporary or medically reversible consequences, or a remote probability of ' +
        'serious ones; Class III, not likely to cause adverse health consequences ' +
        '[ref:fdaRecallDefinitions]. The records are public domain [ref:openfda].\n\n' +
        'This week asks whether the reason text predicts a Class I classification. The data ' +
        'is a frozen, checksummed snapshot of the openFDA bulk export ' +
        '[ref:openfdaDownloads], so every number on this page, in the lecture and in the lab ' +
        'is the same and can be reproduced. It is real data used for classroom evaluation. ' +
        'The label is an administrative decision, not a measured health outcome, and ' +
        'nothing here is a food-safety tool.',
      objectives: [
        'Explain how naive Bayes turns Bayes\' rule into a classifier, and state exactly which assumption is "naive".',
        'Calculate a naive Bayes posterior by hand with Laplace smoothing, and explain why implementations work with sums of logs.',
        'Turn text into a document-term matrix (counts, presence or TF-IDF) and explain why the vectorizer is part of the model pipeline.',
        'Build and evaluate a naive Bayes text classifier on real data against a baseline, with a split that respects the unit of observation and a pipeline that never learns from the test set.',
        'Explain why predict_proba output is not automatically a calibrated probability, and compare naive Bayes with a pretrained language-model representation on performance, cost and interpretability.'
      ],
      sections: [
        { id: 'from-bayes', nav: '1. From Bayes to classification',
          title: '1. From Bayes to classification',
          html:
            '<div class="grid grid-3">' +
              '<div class="card"><span class="eyebrow">Week 4</span><h4 style="margin-top:0">Can I interpret the prediction?</h4><p class="small mb0">Prior, likelihood, posterior; thresholds; calibration. Bayes as reasoning about one test result.</p></div>' +
              '<div class="card"><span class="eyebrow">Week 5</span><h4 style="margin-top:0">Can I turn Bayes into a classifier?</h4><p class="small mb0">Naive Bayes on real recall text, built and evaluated as a complete pipeline.</p></div>' +
              '<div class="card"><span class="eyebrow">Week 6</span><h4 style="margin-top:0">Can I trust the data I give it?</h4><p class="small mb0">Preparing real survey data (NHANES) without breaking it.</p></div>' +
            '</div>' +
            '<p style="margin-top:var(--s5)"><strong>This week\'s pipeline:</strong></p>' +
            '<div class="pill-row" aria-label="text, tokens, vectorizer, features, model, probability, threshold, prediction, evaluation">' +
              '<span class="pill">text</span> → <span class="pill">tokens</span> → <span class="pill">vectorizer</span> → <span class="pill">features</span> → <span class="pill">model</span> → <span class="pill">probability</span> → <span class="pill">threshold</span> → <span class="pill">prediction</span> → <span class="pill">evaluation</span></div>',
          body:
            'Week 4 used Bayes\' rule to interpret one result: the prior was the prevalence, ' +
            'the likelihood was the test\'s behaviour, and the posterior was what a positive ' +
            'result means. A classifier does the same thing with different labels. The prior ' +
            'is the share of Class I texts in the training data; the evidence is the words ' +
            'of a reason text; the posterior is P(Class I | text). Explorer A below is the ' +
            'Week 4 calculator with those labels.\n\n' +
            'Naive Bayes is a simple model, but it is a complete machine-learning pipeline. ' +
            'Most of this week is about the parts around the model: how text becomes numbers, ' +
            'what one row of data is, how the split is made, and whether the output can be ' +
            'trusted.',
          viz: ['nb-bayes'],
          keypoint: 'The model is only one part of the experiment.' },

        { id: 'naive-idea', nav: '2. The naive idea, by hand',
          title: '2. The naive idea, worked by hand',
          body:
            'A text has many words, so the evidence is a combination: P(text | class) = ' +
            'P(w1, w2, ..., wn | class). Estimating that joint probability directly is ' +
            'impossible, because almost every text is unique. Naive Bayes assumes that, ' +
            'within a class, words occur independently of one another, so the joint ' +
            'probability becomes a product: P(class | text) ∝ P(class) × P(w1 | class) × ... ' +
            '× P(wn | class). That is the naive assumption, and for text it is plainly false: ' +
            '"Listeria" and "monocytogenes" travel together.\n\n' +
            'Each P(word | class) is estimated by counting: how often the word occurs in ' +
            'that class\'s training texts, divided by the total number of words in them. Two ' +
            'practical problems follow. A word never seen with a class gives a probability ' +
            'of zero, and one zero vetoes the whole product; Laplace smoothing adds one (alpha ' +
            '= 1) to every count so this cannot happen. And a product of hundreds of small ' +
            'probabilities underflows to zero in floating point, so every implementation sums ' +
            'logs instead. The four-word example below is the one worked on the lecture ' +
            'slides: "undeclared label" gives Class I a posterior of 0.421, and adding ' +
            '"listeria" raises it to 0.772.',
          viz: ['nb-evidence'],
          keypoint: 'Naive Bayes multiplies evidence as if words were independent. They are not, and the ranking of classes often survives anyway.' },

        { id: 'text-data', nav: '3. Text becomes data',
          title: '3. Text becomes data',
          body:
            'A model cannot read. A vectorizer first splits each text into tokens ' +
            '(scikit-learn\'s default: lowercase, then every run of two or more letters or ' +
            'digits), builds a vocabulary from the texts it is fitted on, and turns every ' +
            'text into a row of numbers, one column per vocabulary word [ref:sklearnText]. ' +
            'The result is a document-term matrix: very wide and mostly zeros. On the Week 5 ' +
            'training texts the vocabulary has 6,772 words, and a typical text uses about a ' +
            'dozen of them.\n\n' +
            'The numbers can be word counts (CountVectorizer, the main model this week), ' +
            'presence or absence (for BernoulliNB), or TF-IDF weights, which down-weight ' +
            'words that appear in many texts. Whatever the choice, the representation ' +
            'decides what the model can see. Word order is gone, so "listeria detected, ' +
            'salmonella not" and "salmonella detected, listeria not" become the same row; ' +
            '"no" is just another column; and a word the vectorizer did not see when it was ' +
            'fitted is silently ignored. The vocabulary and the IDF weights are learned from ' +
            'data, which makes the vectorizer part of the model.',
          viz: ['text-repr'],
          keypoint: 'The vectorizer is part of the model pipeline.' },

        { id: 'real-data', nav: '4. The data: one row is what?',
          title: '4. The real problem: what is one row?',
          body:
            'The openFDA export has one record per recalled product: 29,462 classified ' +
            'records. One recall event often covers many products with the same reason text; ' +
            'the largest single event in this snapshot has 409. Counting each product as a ' +
            'separate example would count one decision hundreds of times. So one row here ' +
            'represents an event–reason–classification record: 9,490 rows from 7,890 events. ' +
            'Most event–reason pairs have one classification, but 95 of the 9,394 pairs carry ' +
            'more than one FDA classification, and in 73 of them the classifications disagree on ' +
            'the target itself (Class I against Class II or III). ' +
            'The target is is_class_I: 3,836 rows (40.4%) are Class I, and 5,654 are Class ' +
            'II (4,882) or Class III (772).\n\n' +
            'The split keeps whole events together: StratifiedGroupKFold with four folds, ' +
            'seed 42, first fold, groups = event_id. That gives 7,117 training texts and ' +
            '2,373 test texts with the same 40.4% Class I share, and no event on both sides. ' +
            'Even so, 14% of the test texts match some training text word for word, because ' +
            'firms reuse standard wording across separate recalls. That is genuine repetition ' +
            'in the data, and it is part of what a model of this text will meet in use.\n\n' +
            'Two limits to keep in view. The label is FDA\'s judgement of the whole situation, ' +
            'and the reason text describes only part of it. And the 73 event–reason pairs whose ' +
            'classifications disagree on the target are real label conflicts in the FDA records. ' +
            'They are kept, not removed: the same text in the same event received different ' +
            'labels, so no model can get every row right. The text alone does not necessarily ' +
            'determine the label. Because the split groups whole events, the rows of a ' +
            'conflicting pair always fall on the same side.',
          html:
            '<div class="table-scroll"><table class="table-compact"><caption>The frozen Week 5 ' +
            'snapshot (openFDA export last_updated 2026-09-28).</caption><tbody>' +
            '<tr><th scope="row">Product records (classified)</th><td class="num">29,462</td></tr>' +
            '<tr><th scope="row">Recall events</th><td class="num">7,890</td></tr>' +
            '<tr><th scope="row">Rows: event–reason–classification records</th><td class="num">9,490</td></tr>' +
            '<tr><th scope="row">Event–reason pairs (with more than one FDA class / conflicting on Class I)</th><td class="num">9,394 (95 / 73)</td></tr>' +
            '<tr><th scope="row">Class I / II / III</th><td class="num">3,836 / 4,882 / 772</td></tr>' +
            '<tr><th scope="row">Training / test rows (split by event)</th><td class="num">7,117 / 2,373</td></tr>' +
            '<tr><th scope="row">Median words per text</th><td class="num">13</td></tr>' +
            '</tbody></table></div>' +
            '<p class="small muted">Full provenance, including the checksum of the export: ' +
            '<a href="../labs/week05/data/README.md">labs/week05/data/README.md</a>.</p>',
          keypoint: 'Decide what one row is before deciding how to split.' },

        { id: 'build', nav: '5. Build the classifier',
          title: '5. Build the classifier',
          html:
            '<pre>model = Pipeline([("vectorizer", CountVectorizer()),\n' +
            '                  ("classifier", MultinomialNB(alpha=1.0))])\n' +
            'model.fit(X_train, y_train)\n' +
            'p = model.predict_proba(X_test)[:, 1]     # P(Class I | text)\n' +
            'y_pred = (p >= 0.5).astype(int)</pre>',
          body:
            'The whole model is two steps in a scikit-learn Pipeline [ref:sklearnNB]. Fitting ' +
            'the pipeline fits the vectorizer and the classifier on the training rows only; ' +
            'predicting transforms the test text with the training vocabulary. On the 2,373 ' +
            'test texts it reaches 79.1% accuracy, against 59.6% for always answering "not ' +
            'Class I". For Class I, precision is 0.723 and recall 0.785 (F1 0.753); ROC AUC is ' +
            '0.860. In counts: 753 of the 959 Class I texts found, 206 missed, and 289 false alarms ' +
            'among 1,414 Class II/III texts.\n\n' +
            'The explorer below fits exactly this model in your browser and reproduces these ' +
            'numbers at alpha = 1. Use the probe to score any text, word by word.',
          viz: ['naive-bayes'] },

        { id: 'trust', nav: '6. Can we trust the result?',
          title: '6. Can we trust the result?',
          body:
            'A score is a summary; the errors and the learned words are the evidence. Rank ' +
            'the vocabulary by how strongly each word favours Class I and the top of the ' +
            'list, among words seen at least ten times, is snoqualmie, sunland, husky, ' +
            'daniella, mann, salinas: firm and place names from a few large outbreak ' +
            'recalls. The model has learned who wrote the notice as well as why. Keep only ' +
            'words used in at least 20 different training events and the list is mostly ' +
            'hazards (one firm name, sunland, still leads): cucumbers, sprouts, outbreak, ' +
            'salmonella, monocytogenes, hepatitis, listeria. ' +
            'At the other end are foreign-body and quality words: fragments, metal, glass, ' +
            'spoilage, mold.\n\n' +
            'The errors tell the same story. Every one of the six most confident false ' +
            'positives names Listeria, yet FDA classified each as Class II. Five of the six ' +
            'most confident false negatives are allergen-labelling texts (undeclared milk, ' +
            'wheat or soy) that FDA classified as Class I. Neither group is obviously a model failure: the same ' +
            'words lead to different classes, and the text alone does not settle it. Use the ' +
            'Words and Errors views of the explorer above.',
          keypoint: 'A good score does not tell you what the model learned. Read the words and the errors.' },

        { id: 'leakage-section', nav: '7. The whole pipeline and the test set',
          title: '7. The whole pipeline must not learn from the test set',
          body:
            'The test set is not just data that the classifier does not train on. It is data ' +
            'that the entire modelling pipeline must not learn from. Two tempting mistakes:\n\n' +
            'Fitting the vectorizer on all the text before splitting lets the test texts ' +
            'shape the vocabulary (1,193 words appear only in test texts) and, with TF-IDF, ' +
            'every IDF weight. Here the score barely moves: 78.8% against 79.1%. That does not ' +
            'make it correct. As in Week 3, leakage is not reliably visible in the score; it is ' +
            'prevented by construction, by fitting the vectorizer inside the Pipeline.\n\n' +
            'Splitting by product record instead of by event is worse. Products from one ' +
            'recall land on both sides, 79% of test texts appear word for word in training, ' +
            'and accuracy rises to 85.1% (ROC AUC 0.914). The model has not improved; the ' +
            'test has become easier [ref:kapoor2023].',
          viz: ['nb-leakage'],
          keypoint: 'The test set is data that the entire modelling pipeline must not learn from.' },

        { id: 'why-works', nav: '8. Why can a naive model work?',
          title: '8. Why can a naive model work?',
          body:
            'Classification needs only the right ordering of the classes, not accurate ' +
            'probabilities. Naive Bayes can pick the right class even when its independence ' +
            'assumption distorts the scores, and it can be optimal for that decision under ' +
            'conditions well beyond true independence [ref:domingos1997]. It is fast, needs ' +
            'little data per parameter, copes with tens of thousands of sparse features, and ' +
            'every prediction can be traced to the words that made it ' +
            '[ref:manningIR2008].\n\n' +
            'The probabilities are another matter. Correlated words are counted as ' +
            'independent evidence, so scores are pushed towards 0 and 1: 63% of the test ' +
            'predictions are below 0.05 or above 0.95, and the reliability diagram (the ' +
            'Probabilities view above) shows the over-confidence. The Brier score is 0.166. ' +
            'TF-IDF weights shrink the counts, and the same classifier then puts only 7% of ' +
            'its predictions at the extremes (Brier 0.146). So is predict_proba a calibrated ' +
            'probability? Not automatically. As in Week 4, a probability is a claim to be ' +
            'checked over groups of predictions [ref:niculescu2005].',
          keypoint: 'Naive Bayes is often right about the class and over-confident about the probability.' },

        { id: 'to-lms', nav: '9. From naive Bayes to language models',
          title: '9. From naive Bayes to language models',
          body:
            'A bag of words throws away order, negation and synonymy. A pretrained ' +
            'sentence encoder maps a whole text to a fixed-length vector (an embedding) ' +
            'learned from a large general corpus, so texts with similar meaning land close ' +
            'together even when they share few words [ref:reimers2019]. Week 7 covers ' +
            'embeddings properly.\n\n' +
            'Same split, same metrics, same baseline: a frozen general-English encoder ' +
            '(all-MiniLM-L6-v2 [ref:minilm], 22.7 million parameters, run on a laptop CPU) ' +
            'with logistic regression on top reaches 79.4% accuracy, F1 0.745 and ROC AUC ' +
            '0.864, against 79.1%, 0.753 and 0.860 for naive Bayes on word counts. The accuracy ' +
            'difference is small relative to the approximate sampling interval shown in explorer E ' +
            '(about ±1.6 points). F1 and AUC are also numerically close, but this single test split ' +
            'is not enough to establish a meaningful difference. The encoder has better ' +
            'probability performance on this test set: a lower Brier score (0.147 against 0.166) ' +
            'and far fewer extreme predictions. Whether either model is well calibrated requires a ' +
            'reliability analysis, as in Week 4. The encoder also needs a 91 MB model ' +
            'download, deep-learning libraries and more compute, and one prediction cannot be ' +
            'explained word by word. On short, formulaic texts with strong keywords, the ' +
            'simple model holds its own. That is a finding about this task, not a verdict on ' +
            'either model. The comparison is run once by the module team and stored; the lab ' +
            'does not depend on it.',
          viz: ['nb-compare'],
          keypoint: 'Evaluation survives model changes: the same split, the same metrics, the same baseline and the same questions.' },

        { id: 'week6-bridge', nav: '10. Bridge to Week 6',
          title: '10. Bridge to Week 6: can we trust the data?',
          body:
            'Before we can trust a model, can we trust the data we give it? This week\'s ' +
            'problems were mostly data problems: duplicated records, the choice of unit, ' +
            'labels that disagree, wording that names the firm, encoding artefacts, and a ' +
            'label that is a decision rather than a measurement. Week 6 takes these questions ' +
            'to a real health survey (NHANES): merging files, missing values and why they are ' +
            'missing, outliers, encoding, and keeping every preparation step inside the ' +
            'pipeline so that it, too, never learns from the test set.',
          keypoint: 'Before we can trust a model, can we trust the data we give it?' },

        { id: 'lab-companion', nav: '11. Using this page with the lab',
          title: '11. Using this page with the lab',
          html:
            '<div class="table-scroll"><table class="table-compact"><caption>Which section and interactive go with which lab task.</caption><thead><tr><th scope="col">Lab task</th><th scope="col">On this page</th></tr></thead><tbody>' +
              '<tr><th scope="row">1. What is one row?</th><td><a href="#real-data">4. The data</a></td></tr>' +
              '<tr><th scope="row">2. Split by event, baseline</th><td><a href="#real-data">4</a>, <a href="#viz-nb-leakage">explorer D</a></td></tr>' +
              '<tr><th scope="row">3. Text to numbers</th><td><a href="#viz-text-repr">explorer C</a></td></tr>' +
              '<tr><th scope="row">4. Build and evaluate</th><td><a href="#viz-naive-bayes">the classifier explorer</a></td></tr>' +
              '<tr><th scope="row">5. Open the model</th><td><a href="#viz-nb-evidence">explorer B</a> and the probe in <a href="#viz-naive-bayes">the classifier explorer</a></td></tr>' +
              '<tr><th scope="row">6. Error analysis</th><td><a href="#trust">6</a>, Errors view</td></tr>' +
              '<tr><th scope="row">7. Leakage</th><td><a href="#viz-nb-leakage">explorer D</a></td></tr>' +
              '<tr><th scope="row">8. Probabilities and the record</th><td><a href="#why-works">8</a>, Probabilities view</td></tr>' +
              '<tr><th scope="row">Extensions (optional)</th><td><a href="#viz-nb-compare">explorer E</a></td></tr>' +
            '</tbody></table></div>' +
            '<p class="small muted">The page is a companion to the lab, not a replacement for it. Tasks 1–8 are the core lab; the extensions are optional.</p>' }
      ],
      interactiveIntro:
        'Every interactive this week sits next to the idea it illustrates. A and B use ' +
        'illustrative counts that can be checked on paper; C uses real recall texts; the ' +
        'classifier explorer, D and E use the frozen openFDA snapshot and share their ' +
        'numbers with the lecture and the lab.',
      interactiveIndex: [
        { id: 'nb-bayes', label: 'A. From Bayes to a classifier', note: 'section 1' },
        { id: 'nb-evidence', label: 'B. Naive Bayes evidence explorer', note: 'section 2; lab Task 5; lecture slide 20' },
        { id: 'text-repr', label: 'C. Text representation explorer', note: 'section 3; lab Task 3; lecture slide 28' },
        { id: 'naive-bayes', label: 'The Week 5 classifier, trained in your browser', note: 'sections 5, 6 and 8; lab Tasks 4–6 and 8; lecture slide 36' },
        { id: 'nb-leakage', label: 'D. Leakage explorer', note: 'section 7; lab Tasks 2 and 7; lecture slide 44' },
        { id: 'nb-compare', label: 'E. Model comparison', note: 'section 9; lab extensions' }
      ],
      concepts: [
        { term: 'Naive (conditional independence) assumption', body: 'Within a class, each word is assumed to occur independently of the others, so P(text | class) is a product of per-word probabilities. False for text; often good enough for ranking classes.' },
        { term: 'Prior', body: 'P(class), estimated as the share of training rows in each class: 40.4% Class I this week. The Week 4 prevalence in a new role.' },
        { term: 'Likelihood P(word | class)', body: 'How often the word occurs in that class\'s training texts, divided by all the words in them (after smoothing). Comparing it across classes is the model\'s built-in explanation.' },
        { term: 'Laplace smoothing', body: 'Add alpha (usually 1) to every word count. Without it, a word never seen with a class gives P = 0 and vetoes that class whatever else the text says.' },
        { term: 'Log space', body: 'Multiplying many small probabilities underflows to zero in floating point. Summing their logs gives the same ranking and stays an ordinary number.' },
        { term: 'Bag of words', body: 'A text represented only by which words it contains and how often. Order, negation and context are lost.' },
        { term: 'Vectorizer and vocabulary', body: 'The step that turns text into a document-term matrix. It learns a vocabulary (and, for TF-IDF, IDF weights) from the data it is fitted on, so it is part of the model and must be fitted on training data only. Words outside its vocabulary are ignored.' },
        { term: 'Multinomial versus Bernoulli naive Bayes', body: 'MultinomialNB models word counts; BernoulliNB models presence and absence, including the absence of words. On these short texts BernoulliNB scores slightly lower (accuracy 77.9% against 79.1%).' },
        { term: 'Pipeline', body: 'A scikit-learn object that chains the vectorizer and the classifier, so fit() fits both on training data and predict() applies both to new data. The simplest guarantee that nothing learns from the test set.' },
        { term: 'Unit of observation and grouped split', body: 'What one row is, and what must stay together when the data is split. Here one row is an event–reason–classification record; most event–reason pairs have a single FDA classification, but 95 have more than one (73 conflicting on Class I). The split keeps whole recall events on one side (StratifiedGroupKFold with groups = event_id).' },
        { term: 'predict_proba', body: 'The model\'s score for each class, scaled to sum to 1. For naive Bayes it is not automatically a calibrated probability; check it with a reliability diagram and the Brier score (Week 4).' },
        { term: 'Sentence embedding', body: 'A fixed-length vector for a whole text from a pretrained encoder. It captures more than word identity, at the price of size, compute and direct interpretability. Week 7 develops the idea.' }
      ],
      viz: 'naive-bayes',
      worked: {
        title: 'Classifying one short text by hand',
        body:
          'Illustrative simulation — not a biological dataset. Two classes, four words, and ' +
          'hand-made training counts. Class I texts contain listeria 3 times, undeclared 3, ' +
          'label 1 and packaging 1 (8 words); Class II/III texts contain them 0, 1, 4 and 5 ' +
          'times (10 words). The priors are 0.4 and 0.6.\n\n' +
          'With Laplace smoothing (add 1 to each count, so the denominators become 8 + 4 = 12 ' +
          'and 10 + 4 = 14): P(undeclared | I) = 4/12, P(label | I) = 2/12, ' +
          'P(undeclared | II/III) = 2/14, P(label | II/III) = 5/14.\n\n' +
          'For the text "undeclared label": Class I scores 0.4 × 4/12 × 2/12 = 0.0222 and ' +
          'Class II/III scores 0.6 × 2/14 × 5/14 = 0.0306. Normalising, P(Class I | text) = ' +
          '0.0222 / (0.0222 + 0.0306) = 0.421, so the prediction is Class II/III. In logs ' +
          'the scores are −3.81 and −3.49, the same ordering.\n\n' +
          'Add "listeria": Class I gains a factor 4/12 and Class II/III a factor 1/14, and the ' +
          'posterior rises to 0.772. Without smoothing, P(listeria | II/III) would be 0/10, ' +
          'and any text containing "listeria" would be Class I with probability 1, whatever ' +
          'else it said.',
        keypoint: 'Naive Bayes is transparent about which words moved the decision, and silent about whether that reflects anything real.'
      },
      fm: {
        inline: true,
        title: 'From naive Bayes to language models',
        body: 'See section 9.',
        models: []
      },
      scientist:
        'Every one of the six most confident false positives names Listeria, yet FDA ' +
        'classified each as Class II. Is the model learning about pathogen risk, or about ' +
        'how notices are worded and who writes them? Design a check that would tell the two ' +
        'apart (for example, hold out whole firms, or remove firm and place names) and say ' +
        'what you would expect to see in each case.',
      quiz: [
        { q: 'You fit the CountVectorizer on all 9,490 texts, then split and fit naive Bayes on the training rows. Accuracy is almost unchanged. Is the experiment sound?',
          options: ['Yes, because the classifier never saw the test labels', 'No: the vectorizer learned its vocabulary from the test texts, so the pipeline learned from the test set, whether or not the score shows it', 'Yes, because the score did not change', 'No, because CountVectorizer should never be used with naive Bayes'],
          answer: 1,
          why: 'The test set is data that the entire modelling pipeline must not learn from. Leakage is prevented by construction (fit the vectorizer inside a Pipeline), not detected from the score. Explorer D shows both pipelines.' },
        { q: 'Splitting the 29,462 product records at random gives 85.1% accuracy; splitting by recall event gives 79.1%. Why?',
          options: ['The record split has more training data, so the model is better', 'Products from the same recall share one text, so a record split puts identical texts on both sides and the test becomes easier', 'Random splits are always more accurate', 'The event split is unlucky'],
          answer: 1,
          why: 'With the record split, 79% of test texts appear word for word in training. The model is the same; the test measures memory, not generalisation to a new recall.' },
        { q: 'Naive Bayes gives a text predict_proba = 0.99 for Class I. What can you conclude?',
          options: ['There is a 99% chance the recall is Class I', 'The model ranks this text strongly towards Class I, but its probabilities are over-confident, so 0.99 is a score to be checked with a reliability diagram, not a calibrated probability', 'The text must contain the word listeria', 'The model is 99% accurate'],
          answer: 1,
          why: 'Treating correlated words as independent evidence pushes scores towards 0 and 1: 63% of this week\'s test predictions are below 0.05 or above 0.95. As in Week 4, check calibration over groups of predictions.' }
      ],
      lab: 'lab05',
      datasets: ['openfda'],
      reading: [
        { ref: 'manningIR2008', note: 'Chapter 13: the clearest derivation of multinomial and Bernoulli naive Bayes for text, free online.' },
        { ref: 'jurafskySLP', note: 'The naive Bayes and text-classification chapter, with worked examples and evaluation.' },
        { ref: 'domingos1997', note: 'Why naive Bayes can classify well even when its independence assumption is false.' },
        { ref: 'sklearnNB', note: 'MultinomialNB, BernoulliNB and ComplementNB, used in the lab.' },
        { ref: 'sklearnText', note: 'CountVectorizer and TfidfVectorizer: tokenisation, vocabulary and the document-term matrix.' },
        { ref: 'niculescu2005', note: 'Which classifiers give well or badly calibrated probabilities, including naive Bayes.' },
        { ref: 'kapoor2023', note: 'The leakage taxonomy from Week 3; this week\'s two leaks are in it.' },
        { ref: 'reimers2019', note: 'Sentence embeddings, the idea behind the encoder in the comparison; background for Week 7.' },
        { ref: 'openfda', note: 'The data source, field definitions and the openFDA disclaimer.' }
      ],
      provenance: {
        kept: 'The naive Bayes derivation, the conditional-independence discussion, Laplace smoothing, log-space computation, the multinomial and Bernoulli models, and the strengths and weaknesses summary from the 2025/26 Week 5-6 deck.',
        changed: 'The "Joe / weight / height" employee example, the play-tennis data and the Twitter sentiment example are replaced by real openFDA food-recall text. The previous version of this page used an illustrative, template-generated corpus and planned a lab that queried the live API; both are replaced by a frozen, checksummed snapshot at the level of the recall event. The pipeline view, the vectorizer as part of the model, leakage through the vectorizer and the unit of observation, calibration of predict_proba, and a stored comparison with a pretrained sentence encoder are new. Note that Week4_ML_MTU_part1.pptx is a strict subset of Week4_ML_MTU.pptx, and Week5_ML_MTU.pdf and Week6_ML_MTU.pdf are duplicates; the redesign carries one version.'
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
      interactiveIntro:
        'The lecture uses this explorer live (lecture slide 24): set 15 per cent missing, ' +
        'compare "At random" with "Not at random", then try median imputation with and ' +
        'without a missingness indicator.',
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
      title: 'Dimensionality reduction and protein embeddings',
      strand: 'representation',
      short: 'The hinge of the module: from features you chose to features a model learned, and what each does to "nearest".',
      pivot: true,
      scheduleNote: 'Teaching order 2026/27: this week is taught in the session after Week 8 (k-NN), which was brought ' +
        'forward. It builds directly on Week 8: k-NN predicts from the nearest stored cases, so everything here asks what ' +
        '"nearest" means once the features are many, reduced, or learned by a model.',
      los: ['LO1', 'LO2', 'LO4'],
      biology:
        'Biological data is routinely wider than it is tall. A transcriptome has 20,000 genes measured in perhaps 200 ' +
        'patients; a protein is a sequence of hundreds of residues drawn from an alphabet of twenty. Before a model can use ' +
        'either, someone has to decide how to represent it. The classical answer is to choose descriptors (amino-acid ' +
        'composition, length, hydropathy) or to project measured features onto their directions of greatest variance ' +
        'with PCA. The modern answer is to let a protein language model that has read millions of sequences place each ' +
        'protein in a learned space. Last session\'s k-NN makes the stakes concrete: a k-NN prediction is only as good as ' +
        'the space in which "nearest" is measured. This week uses 2,000 real human proteins from UniProtKB/Swiss-Prot, ' +
        'with real ESM-2 embeddings, and asks a controlled question: with everything else held fixed, which ' +
        'representation finds the more useful neighbours, and why?',
      objectives: [
        'Explain why biological data are often high-dimensional, and how distance concentration and irrelevant features affect distance-based learners such as k-NN.',
        'Apply PCA to standardised data inside a Pipeline, and interpret the explained-variance spectrum, the cumulative curve and the loadings.',
        'Distinguish linear (PCA) from nonlinear (t-SNE, UMAP) dimensionality reduction, and state what each preserves.',
        'Explain how t-SNE and UMAP build a two-dimensional map, the effect of perplexity, n_neighbors, min_dist and the random seed, and what such a map can and cannot show.',
        'Distinguish a raw protein sequence, a handcrafted feature vector, a learned embedding and a reduced representation, and explain how ESM-2 embeddings are produced.',
        'Use pretrained protein embeddings in a downstream task (k-NN), with preprocessing fitted inside the cross-validation folds.',
        'Compare representations with a controlled, reproducible protocol, and interpret the result with its biological and methodological limits (homology, pretraining exposure, annotation uncertainty).'
      ],
      sections: [
        { id: 'bridge', nav: '1. From Week 8 to representations',
          title: '1. From Week 6 and Week 8 to this week',
          body:
            'Week 6 prepared real biological data: missing values, scaling, and pipelines that fit every preprocessing step ' +
            'on training rows only. Week 8 used that discipline in k-NN, where the choice of features, their scaling and ' +
            'their relevance decided who the neighbours were: on the heart-disease data, standardising raised ' +
            'cross-validated accuracy from 63 to 84 per cent, and 100 columns of noise lowered it from 80 to 67. This week ' +
            'turns that lesson into the central question of representation learning. If the neighbours depend on the ' +
            'space, which space should we use: features we chose, a compressed version of them, or features a model ' +
            'learned from millions of sequences? Every exercise below uses the same 2,000 real proteins as the lab.',
          keypoint: 'k-NN does not learn features; it inherits them. Choosing the representation is choosing the neighbours.' },

        { id: 'curse', nav: '2. High-dimensional data',
          title: '2. High-dimensional biological data and the curse of dimensionality',
          body:
            'With many features, two things go wrong for distance-based methods. First, distances concentrate: for points ' +
            'scattered at random in 320 dimensions, the farthest point is only about 24 per cent further away than the ' +
            'nearest, so "nearest" carries little information. Second, every irrelevant feature adds noise to every ' +
            'distance (Week 8). Real biological features are correlated, so real data keep far more contrast than random ' +
            'points: on the proteins, the relative contrast is 4.6 in the 320-dimensional ESM-2 space against 0.24 for ' +
            'random points of the same dimension. That correlation is what dimensionality reduction exploits. Feature ' +
            'selection keeps a subset of the original features; feature extraction (PCA, t-SNE, UMAP, a learned ' +
            'embedding) builds new ones from all of them.',
          viz: ['w7-curse'],
          keypoint: 'Reduce dimension because the data are correlated and partly irrelevant, not because a number is large.' },

        { id: 'pca', nav: '3. PCA',
          title: '3. Principal component analysis, by hand and in scikit-learn',
          html:
            '<div class="table-scroll"><table class="table-compact"><caption>A complete numerical example: two standardised ' +
            'features x₁ and x₂ with correlation r. The covariance (here, correlation) matrix is C = [[1, r], [r, 1]].' +
            '</caption><thead><tr><th scope="col">Step</th><th scope="col">Result</th></tr></thead><tbody>' +
            '<tr><th scope="row">Eigenvalues of C</th><td>λ₁ = 1 + r and λ₂ = 1 − r (they sum to 2, the total variance)</td></tr>' +
            '<tr><th scope="row">Eigenvectors</th><td>v₁ = (1, 1)/√2 and v₂ = (1, −1)/√2, whatever the value of r</td></tr>' +
            '<tr><th scope="row">PC1 share of variance</th><td>λ₁ / (λ₁ + λ₂) = (1 + r)/2</td></tr>' +
            '<tr><th scope="row">WDBC: mean radius and mean perimeter</th><td>r = 0.998: PC1 carries 99.9%; one direction suffices</td></tr>' +
            '<tr><th scope="row">WDBC: mean radius and mean texture</th><td>r = 0.324: PC1 carries 66.2%; both directions matter</td></tr>' +
            '</tbody></table></div>',
          body:
            'PCA finds new axes, ordered by how much of the data\'s variance lies along each. In four steps: standardise ' +
            'each feature; form the covariance matrix C = ZᵀZ / (n − 1); find its eigenvectors (the directions, or ' +
            'loadings) and eigenvalues (the variance along each); project the data onto the first k eigenvectors. The ' +
            'explained-variance ratio of a component is its eigenvalue divided by the sum of all eigenvalues. On WDBC, ' +
            'two components carry 63.2 per cent of the variance and seven are needed for 90 per cent. Scaling decides ' +
            'what PCA finds: without standardisation, PC1 takes 98.2 per cent of the variance and is simply the feature ' +
            'with the largest units (worst area). Inside a Pipeline, PCA is refitted in every training fold, like the ' +
            'scaler. Variance is not relevance: the direction of greatest variance need not be the one that separates ' +
            'the classes.',
          viz: ['pca'],
          keypoint: 'Standardise, read the spectrum and the loadings, and fit PCA inside the pipeline.' },

        { id: 'pca-proteins', nav: '4. PCA on proteins',
          title: '4. PCA on protein representations',
          body:
            'The lab\'s classical descriptors are 23 numbers per protein: the 20 amino-acid fractions, log length, the ' +
            'highest mean Kyte–Doolittle hydropathy over any 19-residue window, and the mean hydropathy of the first 25 ' +
            'residues. Standardised, their spectrum is flat (PC1 15.7 per cent; 17 of 23 components for 90 per cent): ' +
            'they are not very redundant. Unstandardised, PC1 takes 55.2 per cent and three components "explain" 90 per ' +
            'cent, but only because the hydropathy and length features are measured in larger units than fractions. The ' +
            '320-dimensional ESM-2 embedding needs 60 components (standardised) for 90 per cent. Reducing it changes the ' +
            'neighbours far more than the k-NN score: 10 components keep only 45 per cent of each protein\'s 10 nearest ' +
            'neighbours, yet k-NN on them still reaches a cross-validated ROC AUC of 0.935 for signal peptides (all 320: 0.950).',
          viz: ['w7-pca'] },

        { id: 'nonlinear', nav: '5. t-SNE and UMAP',
          title: '5. Nonlinear maps: t-SNE and UMAP',
          body:
            'PCA is a linear projection: it can only rotate and drop axes. If the data lie on a curved surface, or if the ' +
            'structure of interest is local, two linear components can hide it. t-SNE converts distances into ' +
            'neighbour probabilities (each point\'s neighbourhood width set so that its perplexity, roughly the number of ' +
            'neighbours it considers, matches the value you choose) and arranges points in two dimensions so that the ' +
            'same neighbours stay likely. UMAP builds a weighted graph of each point\'s n_neighbors nearest neighbours ' +
            'and lays it out so that connected points stay close; min_dist sets how tightly points may pack. Both are ' +
            'stochastic, both have settings that change the picture, and neither preserves global distances: the size ' +
            'of a cluster, the gap between clusters and their positions on the page carry no reliable meaning. On the ' +
            'ESM-2 embeddings, trustworthiness (how many 2-D neighbours are true neighbours) is 0.94 for t-SNE and 0.92 ' +
            'for UMAP, against 0.74 for PCA to two components; but PCA to 10 components scores 0.97.',
          viz: ['w7-tsne', 'w7-umap'],
          keypoint: 'A 2-D map is an approximation for looking. A separated cluster is a hypothesis about biology, not evidence for it.' },

        { id: 'representations', nav: '6. Representations of a protein',
          title: '6. Four representations of one protein',
          html:
            '<div class="table-scroll"><table class="table-compact"><caption>The same protein, four ways. Only the first ' +
            'is the data; the others are choices.</caption><thead><tr><th scope="col">Representation</th><th scope="col">' +
            'What it is</th><th scope="col">Dimensions</th><th scope="col">What it can see</th></tr></thead><tbody>' +
            '<tr><th scope="row">Raw sequence</th><td>The residues in order, e.g. MKTLLV…</td><td>Variable length</td>' +
            '<td>Everything, but no model can use it directly as a fixed-length vector</td></tr>' +
            '<tr><th scope="row">Handcrafted vector</th><td>Composition, length, hydropathy summaries</td><td>23</td>' +
            '<td>What the designer chose; composition is blind to order, the hydropathy windows are not</td></tr>' +
            '<tr><th scope="row">Learned embedding</th><td>ESM-2 (8M parameters), final layer mean-pooled over residues</td>' +
            '<td>320</td><td>Whatever helped the model predict masked residues across millions of sequences</td></tr>' +
            '<tr><th scope="row">Reduced representation</th><td>PCA, t-SNE or UMAP of one of the above</td><td>2 to 100</td>' +
            '<td>Less than its source; what is lost depends on the method</td></tr></tbody></table></div>',
          body:
            'ESM-2 was pretrained by masked language modelling: hide some residues and predict them from the rest, so the ' +
            'sequences themselves are the labels and no annotation is used. Each residue gets a 320-dimensional vector ' +
            'from the final layer; averaging over the residues (mean pooling) gives one vector per protein, whatever its ' +
            'length. The embeddings were computed once by the module team with a pinned model version. Because the step ' +
            'never sees our labels, computing it before the train/test split is not leakage; anything fitted with labels, ' +
            'and the scaler, still belongs inside the folds. Raw ESM-2 vectors all point in nearly the same direction ' +
            '(mean cosine similarity 0.84 between unrelated proteins), so centring or standardising matters before cosine ' +
            'or Euclidean distance.',
          viz: ['w7-map'] },

        { id: 'knn-compare', nav: '7. k-NN: classical vs ESM-2',
          title: '7. The controlled comparison: k-NN on classical descriptors versus ESM-2',
          body:
            'Everything is held fixed except the representation: the same 1,500 training and 500 test proteins, the same ' +
            'target, the same 5-fold cross-validation, the same Pipeline (optional standardisation, then k-NN) and the ' +
            'same grid of 192 settings (16 values of k, three metrics, two weightings, with or without scaling), chosen by ' +
            'mean cross-validated ROC AUC. The test set is used once per representation. For signal peptides, ESM-2 and ' +
            'the classical descriptors rank proteins about equally well (test ROC AUC 0.942 and 0.936; bootstrap 95 per ' +
            'cent interval for the difference −0.026 to 0.037), and both are far ahead of composition alone (0.761). At ' +
            'the default threshold, though, the ESM-2 model recovers about half of the signal-peptide proteins and the ' +
            'classical one about a quarter (recall 0.51 and 0.26). For membrane proteins, the classical descriptors win ' +
            '(0.972 against 0.940; interval −0.064 to −0.003): a 19-residue hydropathy window is close to the biology of a ' +
            'membrane-spanning helix. ESM-2 is not automatically better; what matters is whether a representation encodes ' +
            'the property you need.',
          viz: ['w7-knn'],
          keypoint: 'Report the comparison you ran, with its uncertainty. "Learned beats handcrafted" is a hypothesis to test, task by task.' },

        { id: 'neighbours', nav: '8. Who are the neighbours?',
          title: '8. Representation and reduction change the neighbours',
          body:
            'Across all 2,000 proteins, a protein\'s 10 nearest neighbours by classical descriptors and by ESM-2 overlap by ' +
            'only 20 per cent (chance: 0.5 per cent). Representation choice changes the meaning of "similar". Among a ' +
            'signal-peptide protein\'s ESM-2 neighbours, 64 per cent also carry a signal peptide; by classical ' +
            'descriptors 50 per cent; by composition 34 per cent (base rate 17.5 per cent). Dimensionality reduction ' +
            'changes neighbours too: PCA to 2 components keeps 9 per cent of the ESM-2 neighbours, to 50 components 85 ' +
            'per cent. t-SNE and UMAP maps keep more local neighbours than 2 PCs (46 and 37 per cent), but they are fitted ' +
            'to all points at once and their distances are not to be read, so they are not a faithful substitute for the ' +
            'original space in a downstream model: UMAP to 2 dimensions inside the k-NN Pipeline lowers the ' +
            'cross-validated ROC AUC for signal peptides from 0.950 to 0.827.',
          viz: ['w7-neighbours'] },

        { id: 'shuffle', nav: '9. The shuffling control',
          title: '9. The residue-shuffling control: does order matter?',
          body:
            'Each protein was also embedded after shuffling its residues: same composition and length, order destroyed. ' +
            'k-NN on the shuffled embeddings falls to about the level of composition (signal peptide 0.807, ' +
            'transmembrane 0.855 cross-validated ROC AUC), and the shuffled copy of a protein is nearer to its original ' +
            'than to any other real protein for only 18 per cent of proteins. The ESM-2 signal-peptide model, applied to ' +
            'shuffled test sequences, drops from 0.942 to 0.658. The classical hydropathy features change too, because ' +
            'they are position-aware: the mean N-terminal hydropathy of signal-peptide proteins falls from 0.93 to −0.21. ' +
            'The control shows that the embedding\'s advantage over composition depends on residue order. It does not ' +
            'show which biological mechanism the model has captured.',
          viz: ['w7-shuffle'] },

        { id: 'limits', nav: '10. Structure is not biology',
          title: '10. Observing structure versus demonstrating biology',
          body:
            'Four limits apply to every result on this page. Homology: one protein per UniRef50 cluster removes close ' +
            'relatives but not families; by shared 5-mers, 10 of the 500 test proteins share more than 20 per cent with ' +
            'some training protein (the highest: Ras-related protein Rap-1A and a Rap-1b-like protein, 79 per cent). ' +
            'Pretraining exposure: ESM-2 was trained on UniRef50 sequences that almost certainly include these proteins; ' +
            'it never saw our labels, but "unseen" proteins are not unseen sequences. Annotation uncertainty: 237 of 350 ' +
            'signal-peptide labels and 425 of 488 transmembrane labels rest on sequence analysis (prediction tools such ' +
            'as SignalP), not experiment, and an unannotated protein is not shown to lack the feature. Scope: human ' +
            'proteins of 50 to 1,000 residues. A good score or a clean cluster shows that a representation separates ' +
            'these annotations; it does not demonstrate a mechanism. The optional explorer below uses a simulated set ' +
            'built to isolate the composition-versus-order contrast; it is labelled as simulated.',
          viz: ['embeddings'],
          keypoint: 'Say what the evidence supports, and no more: separation, under this protocol, for these labels.' },

        { id: 'using', nav: '11. Using this page with the lab',
          title: '11. Using this page with the lab',
          html:
            '<div class="table-scroll"><table class="table-compact"><thead><tr><th scope="col">Lab task</th>' +
            '<th scope="col">Exercise on this page</th></tr></thead><tbody>' +
            '<tr><th scope="row">1. Explore the protein dataset</th><td><a href="#viz-w7-map">6. Protein map explorer</a> (colour by split, length)</td></tr>' +
            '<tr><th scope="row">2. Classical protein features</th><td><a href="#viz-w7-shuffle">9. Shuffling control</a> (hydropathy profiles)</td></tr>' +
            '<tr><th scope="row">3. PCA on classical features</th><td><a href="#viz-w7-pca">3. PCA on protein representations</a> and <a href="#viz-pca">2. PCA visualiser</a></td></tr>' +
            '<tr><th scope="row">4. t-SNE and UMAP</th><td><a href="#viz-w7-tsne">4. t-SNE</a>, <a href="#viz-w7-umap">5. UMAP</a></td></tr>' +
            '<tr><th scope="row">5. ESM-2 embeddings</th><td><a href="#viz-w7-map">6. Protein map explorer</a>, <a href="#viz-w7-pca">3</a></td></tr>' +
            '<tr><th scope="row">6. k-NN: classical vs ESM-2</th><td><a href="#viz-w7-knn">7. k-NN comparison</a></td></tr>' +
            '<tr><th scope="row">7. Neighbourhood comparison</th><td><a href="#viz-w7-neighbours">8. Nearest neighbours before and after reduction</a></td></tr>' +
            '<tr><th scope="row">8. Residue shuffling</th><td><a href="#viz-w7-shuffle">9. The residue-shuffling control</a></td></tr>' +
            '<tr><th scope="row">9. Reflection</th><td><a href="#viz-w7-curse">1. Distance concentration</a> and section 10</td></tr>' +
            '</tbody></table></div>' }
      ],
      interactiveIntro:
        'Nine exercises, each inside the section it belongs to; the lecture\'s "Try this interactively" slides send you to ' +
        'them. Exercise 1 uses random points to show a mathematical fact; Exercise 2 uses WDBC (the PCA worked example); ' +
        'Exercises 3 to 9 use the lab\'s 2,000 real proteins and its split and protocol, so the numbers here and in your ' +
        'notebook agree. Exercise 10 is an optional, simulated explorer and says so.',
      interactiveIndex: [
        { id: 'w7-curse', label: '1. Distances concentrate in high dimensions', note: 'section 2; lab Task 9; lecture slide 11' },
        { id: 'pca', label: '2. PCA visualiser (WDBC)', note: 'section 3; lecture slide 22' },
        { id: 'w7-pca', label: '3. PCA on protein representations', note: 'section 4; lab Tasks 3 and 5; lecture slide 22' },
        { id: 'w7-tsne', label: '4. t-SNE: perplexity, seed and initialisation', note: 'section 5; lab Task 4; lecture slide 28' },
        { id: 'w7-umap', label: '5. UMAP: n_neighbors and min_dist', note: 'section 5; lab Task 4; lecture slide 28' },
        { id: 'w7-map', label: '6. Protein map explorer', note: 'section 6; lab Tasks 1, 4 and 5; lecture slide 38' },
        { id: 'w7-knn', label: '7. k-NN on classical descriptors versus ESM-2', note: 'section 7; lab Task 6; lecture slide 45' },
        { id: 'w7-neighbours', label: '8. Nearest neighbours before and after reduction', note: 'section 8; lab Task 7; lecture slide 49' },
        { id: 'w7-shuffle', label: '9. The residue-shuffling control', note: 'section 9; lab Task 8; lecture slide 49' },
        { id: 'embeddings', label: '10. (Optional) Simulated embedding explorer', note: 'section 10; lecture slide 37 notes' }
      ],
      concepts: [
        { term: 'The curse of dimensionality', body: 'As dimension grows, distances between random points concentrate and the volume of space outgrows any feasible sample. Nearest neighbours stop being near; correlated real data suffer less, which is why reduction helps.' },
        { term: 'Feature selection versus extraction', body: 'Selection keeps a subset of the original features (interpretable, may discard signal spread across many). Extraction builds new features from all of them: PCA, t-SNE, UMAP, a learned embedding.' },
        { term: 'Principal component analysis', body: 'An orthogonal linear projection onto the eigenvectors of the covariance matrix, ordered by eigenvalue (variance). Deterministic, linear, interpretable through its loadings, sensitive to scaling.' },
        { term: 'Explained variance', body: 'A component\'s eigenvalue divided by the total. The cumulative curve says how many components a given share needs; a flat spectrum means no small projection is faithful.' },
        { term: 't-SNE', body: 'Matches neighbour probabilities in the original space and in 2-D. Perplexity sets the effective number of neighbours. Stochastic; preserves local structure; cluster sizes and gaps are not interpretable; no transform for new points in the standard algorithm.' },
        { term: 'UMAP', body: 'Lays out a graph of each point\'s n_neighbors nearest neighbours; min_dist controls packing. Faster than t-SNE, has a transform for new points, and shares t-SNE\'s limits on reading global distances.' },
        { term: 'Trustworthiness', body: 'The extent to which a point\'s nearest neighbours in the 2-D map are also its neighbours in the original space (1 = all). A way to measure, rather than admire, a projection.' },
        { term: 'Handcrafted features', body: 'Descriptors a person chose: composition, length, hydropathy. Interpretable and cheap; they see only what was designed into them.' },
        { term: 'Protein language model embedding', body: 'ESM-2 is pretrained to predict masked residues. Mean-pooling its final layer over residues gives one fixed-length vector per protein (320 numbers for the 8M-parameter model).' },
        { term: 'Anisotropy', body: 'Raw embedding vectors share a dominant direction (mean cosine 0.84 here). Centre or standardise before measuring distances.' },
        { term: 'Linear probe', body: 'A simple classifier (logistic regression) trained on frozen embeddings, used to ask what information they contain. k-NN asks a related but different question: are similar proteins near each other?' },
        { term: 'Homology leakage and pretraining exposure', body: 'Related sequences on both sides of a split inflate scores; one per UniRef50 cluster reduces but does not remove this. A pretrained model may have seen the test sequences (not the labels).' }
      ],
      worked: {
        title: 'One protein, three sets of neighbours',
        body:
          'Interleukin-12 subunit beta (IL12B, UniProt P29460, 328 residues) is a secreted cytokine subunit with an ' +
          'experimentally supported signal peptide, and it is in the test set.\n\n' +
          'By amino-acid composition, its 10 nearest proteins are mostly intracellular: WD-repeat proteins, a centromere ' +
          'protein, a chromatin-assembly factor. None has a signal peptide. Composition says only that their residue ' +
          'usage is similar.\n\n' +
          'By the classical descriptors, which add length and the two hydropathy summaries, two of the ten have a ' +
          'signal peptide (two immunoglobulin-like receptors).\n\n' +
          'By the ESM-2 embedding, all ten neighbours have a signal peptide, and most are cytokines, cytokine receptors ' +
          'and other immune-system proteins (IL-40, the IL-5 receptor alpha chain, the common gamma chain, IL-1 ' +
          'receptor-like 2, an HLA class II beta chain). The embedding was never given a label; whether this reflects shared ' +
          'domains, shared signal sequences or something else, it cannot tell us by itself.\n\n' +
          'Then reduce the embedding to two principal components: none of those ten neighbours survives, although 8 of ' +
          'the 10 new neighbours still carry a signal peptide. Exercise 8 shows every list.',
        keypoint: 'The same protein has different neighbours in different spaces. k-NN can only be as good as the space you give it.'
      },
      fm: {
        title: 'What the embedding adds, measured',
        body:
          'On the 2,000 real proteins, the learned representation adds most where the property depends on residue order ' +
          'and the handcrafted descriptors do not encode it. Composition alone cannot see a signal peptide; ESM-2 can ' +
          '(k-NN test ROC AUC 0.761 against 0.942). But two order-aware classical features (a 19-residue hydropathy window ' +
          'and N-terminal hydropathy) recover almost all of that gap for signal peptides, and beat the embedding for ' +
          'membrane proteins.\n\n' +
          'Shuffling the residues removes the embedding\'s advantage, which shows that it depends on order. A linear ' +
          'probe (logistic regression) on the same embeddings, used in the 2026/27 lab\'s earlier version, gives the same ' +
          'qualitative pattern with higher scores for ESM-2 (0.966 and 0.974 cross-validated): how much a representation ' +
          '"contains" depends on how you read it out.\n\n' +
          'The useful conclusion is not "the embedding is better", but "the embedding can see some things the simple ' +
          'features cannot, and whether that matters depends on your task".',
        models: ['esm2', 'nucleotideTransformer', 'dnabert2', 'prottrans', 'hyenadna']
      },
      scientist:
        'Your UMAP of protein embeddings shows a tight, isolated island of 20 proteins. Before you write that ESM-2 has ' +
        'discovered a functional class, list three other explanations (think: homology, pretraining data, the UMAP ' +
        'settings, the labels you coloured by) and say how you would test each.',
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
          why: 'The embedding step never sees your target, so it is a fixed transformation, like reading the sequence. The care is needed afterwards: any scaling, selection or reduction must be refitted inside each fold. Separately, check whether your test sequences were in the pretraining corpus.' },
        { q: 'With identical split, folds, pipeline and grid, k-NN on ESM-2 embeddings scores test ROC AUC 0.942 for signal peptides and the classical descriptors 0.936 (bootstrap 95% interval for the difference −0.026 to 0.037). What is the best summary?',
          options: ['ESM-2 is better', 'The classical descriptors are better', 'On this data and protocol the two rank proteins about equally well; the difference is within the uncertainty', 'The test set is too small to say anything'],
          answer: 2,
          why: 'The interval includes zero, so the data do not distinguish the two rankings. That is a result, and worth reporting; other measures (recall at the default threshold, neighbour purity) can still differ.' },
        { q: 'Why is a 2-D UMAP layout a poor input to the k-NN Pipeline compared with the full embedding?',
          options: ['UMAP is too slow', 'It keeps only part of the neighbourhood structure and its distances are not designed to be measured, so the classifier loses information', 'k-NN cannot take two features', 'UMAP uses the labels'],
          answer: 1,
          why: 'On the proteins, UMAP to 2-D inside the Pipeline lowered cross-validated ROC AUC for signal peptides from 0.950 to 0.827. Plot in two dimensions; model in all of them.' }
      ],
      lab: 'lab07',
      datasets: ['uniprotHuman', 'wdbc', 'proteinSim'],
      reading: [
        { ref: 'esm2', note: 'How a protein language model is trained, and the released checkpoints.' },
        { ref: 'kobak2019', note: 'How to use t-SNE well, and how not to read it.' },
        { ref: 'mcinnes2018', note: 'The UMAP paper; section 6 discusses its limitations.' },
        { ref: 'beyer1999', note: 'When is "nearest neighbour" meaningful? The original analysis of distance concentration.' },
        { ref: 'greener2022', note: 'Section on dimensionality reduction.' }
      ],
      provenance: {
        kept: 'The 2026-11-01 Week 7 lecture (curse of dimensionality, PCA with worked example, spectrum, loadings and scaling, t-SNE/UMAP reading rules, ESM-2 pipeline, anisotropy, label provenance, the residue-shuffling control and the linear-probe result), its real protein data and embeddings, and the PCA material of the 2025/26 deck.',
        changed: 'Refreshed for 2026/27, taught after Week 8: the controlled comparison is now k-NN on classical descriptors versus ESM-2 (same split, folds, pipeline and grid), with neighbourhood analysis before and after PCA, t-SNE and UMAP; UMAP parameters, trustworthiness, homology and pretraining-exposure checks are new; nine interactive exercises on real data replace the two previous ones (the simulated explorer is kept as optional).'
      }
    },

    /* ------------------------------------------------------------------ 8 */
    {
      n: 8,
      title: 'Instance-based learning: k-NN and biological similarity',
      strand: 'foundation',
      short: 'Predict from the most similar stored cases, and decide carefully what "similar" means.',
      los: ['LO2', 'LO3', 'LO5'],
      scheduleNote: 'Teaching order 2026/27: Week 8 is taught before Week 7. Week 7 (dimensionality ' +
        'reduction and protein embeddings) moves to the following session, unchanged. Nothing on this ' +
        'page or in the Week 8 lab assumes Week 7.',
      biology:
        'A great deal of biology is reasoning by similarity. BLAST finds homologues by sequence ' +
        'similarity; a clinician reasons from comparable past cases; a single-cell atlas labels a new ' +
        'cell by the reference cells it most resembles. The k-nearest-neighbour method makes that ' +
        'reasoning explicit: store the labelled cases, and predict a new one from the k most similar. ' +
        'It is simple enough to compute by hand, and in doing so it exposes the question this module ' +
        'keeps returning to: similar in what space, measured how? This week the real data are 303 ' +
        'patients from the Cleveland Clinic heart-disease study [ref:detrano1989], whose records mix ' +
        'measurements in very different units (cholesterol in mg/dl, ST depression in mm) with ' +
        'categories coded as numbers (chest-pain type 1 to 4). Every pitfall of distance-based ' +
        'learning appears in it. All the patients are real; nothing on this page is a clinical tool.',
      objectives: [
        'Explain instance-based (lazy) learning and contrast parametric with non-parametric models.',
        'Apply 1-NN and k-NN by hand to classify by majority vote and to predict by averaging.',
        'Compute Euclidean, Manhattan and Hamming distances, and build heterogeneous and domain-specific distances for mixed biological records.',
        'Explain why k-NN needs feature scaling, demonstrate the effect, and fit the scaler on training data only, inside a Pipeline.',
        'Explain how irrelevant and redundant features distort distances, and use feature weights or selection to counter it.',
        'Compute distance-weighted k-NN predictions, explain the weighting exponent and the zero-distance case.',
        'Select k, the metric and the weighting by cross-validation, evaluate once on a held-out test set, and judge when k-NN is, and is not, the right model.'
      ],
      sections: [
        { id: 'ibl', nav: '1. Learning by remembering',
          title: '1. Learning by remembering',
          html:
            '<div class="grid grid-2">' +
              '<div class="card"><span class="eyebrow">Eager (Weeks 2, 4, 5)</span><h4 style="margin-top:0">Build a model, then discard the data</h4><p class="small mb0">A decision tree, logistic regression or naive Bayes summarises the training set into a fixed set of parameters at training time. Prediction is then fast, and the model itself can be inspected.</p></div>' +
              '<div class="card"><span class="eyebrow">Lazy (this week)</span><h4 style="margin-top:0">Keep the data, decide later</h4><p class="small mb0">k-NN stores every training case. Nothing is fitted; all the work happens when a query arrives: measure its distance to every stored case, take the k nearest, vote or average. Many local approximations instead of one global one.</p></div>' +
            '</div>',
          body:
            'k-NN is non-parametric: it assumes no functional form, so its complexity grows with the data. ' +
            'That flexibility is its strength and the source of every weakness on this page: it is only as ' +
            'good as its distance, it is sensitive to noise and to irrelevant features, and every prediction ' +
            'costs a pass over the training set.',
          keypoint: 'The training data is the model. Everything therefore depends on how you measure similarity.' },

        { id: 'nearest', nav: '2. Nearest neighbour and the k-NN vote',
          title: '2. Nearest neighbour, and why one neighbour is not enough',
          body:
            '1-NN gives a query the label of the single closest stored case: f(x_q) := f(x_n). In the ' +
            'lecture\'s film example, the unseen film (18 kicks, 90 kisses) is closest to "He\'s Not Really ' +
            'into Dudes" (distance 18.87) and so is a romance. But if that one record were mislabelled, the ' +
            'query would be mislabelled too. k-NN asks k neighbours and takes a majority vote, so a single ' +
            'noisy record can be outvoted. In the exercise below, the lecture example gives Black at k = 1 ' +
            'and k = 3 but Yellow at k = 5: k is a real decision, not a detail.',
          viz: ['knn-vote'],
          keypoint: 'Small k follows the data closely, including its noise; large k smooths, and at k = n it predicts the majority class everywhere.' },

        { id: 'regression', nav: '3. k-NN regression',
          title: '3. k-NN regression: averaging instead of voting',
          body:
            'For a numerical target, predict the mean of the k neighbours\' values. The slide example: the ' +
            'three nearest cases have values 82, 78 and 83, so the prediction is (82 + 78 + 83) / 3 = 81. On ' +
            'real patients, predicting maximum heart rate from age alone, k-NN regression reaches a ' +
            'cross-validated mean absolute error of about 17.3 beats per minute, and a straight line does ' +
            'slightly better (17.0): when the relationship is close to linear, a parametric model that knows ' +
            'it is a line uses the data more efficiently. That is a result worth knowing, not a failure.',
          viz: ['knn-regression'] },

        { id: 'distance', nav: '4. Measuring distance',
          title: '4. Measuring distance: Euclidean, Manhattan, Hamming and beyond',
          html:
            '<div class="table-scroll"><table class="table-compact"><caption>The distances used this week. ' +
            'p and q are two records with n features.</caption><thead><tr><th scope="col">Distance</th>' +
            '<th scope="col">Formula</th><th scope="col">Use it for</th></tr></thead><tbody>' +
            '<tr><th scope="row">Euclidean</th><td>d(p, q) = √( Σᵢ (pᵢ − qᵢ)² )</td><td>Continuous features on comparable scales; the straight-line distance.</td></tr>' +
            '<tr><th scope="row">Manhattan</th><td>d(p, q) = Σᵢ |pᵢ − qᵢ|</td><td>Continuous features; less dominated by one large difference.</td></tr>' +
            '<tr><th scope="row">Weighted Euclidean</th><td>d(p, q) = √( Σᵢ wᵢ (pᵢ − qᵢ)² ), 0 ≤ wᵢ ≤ 1</td><td>When features matter unequally; wᵢ = 0 removes a feature.</td></tr>' +
            '<tr><th scope="row">Hamming</th><td>d(p, q) = Σᵢ [pᵢ ≠ qᵢ]</td><td>Categorical features; aligned, equal-length sequences.</td></tr>' +
            '<tr><th scope="row">Heterogeneous</th><td>Σ over continuous |pᵢ − qᵢ| / rangeᵢ + Σ over categorical [pᵢ ≠ qᵢ]</td><td>Mixed records, such as a patient\'s measurements and categories.</td></tr>' +
            '</tbody></table></div>',
          body:
            'Two corrections to the 2025 slides are built into the calculator: in the four-feature table the ' +
            'squared differences sum to 66, so the Euclidean distance is 8.12 (not 57 and 7.55); and in the ' +
            'scaling example (5.5 − 7.5)² is 4, not 16. Categorical codes are not quantities: chest-pain type ' +
            'is recorded as 1 to 4, but |4 − 1| = 3 means nothing. Compare such features by match or mismatch ' +
            '(Hamming), or one-hot encode them, unless domain knowledge supplies a genuine order, as in the ' +
            'lecture\'s foods ranked by calories.',
          viz: ['distance-calc'],
          keypoint: 'No metric is best in general. Choose one that respects what the features are, then let cross-validation compare the candidates.' },

        { id: 'scaling', nav: '5. Feature scaling',
          title: '5. Feature scaling decides who the neighbours are',
          body:
            'Distance adds differences across features, so a feature measured in large units dominates. In ' +
            'the heart data, cholesterol alone supplies 77 per cent of the unscaled squared distance between ' +
            'two patients and ST depression 0.03 per cent, although ST depression is one of the more ' +
            'informative measurements. Standardising (subtract the mean, divide by the standard deviation) or ' +
            'min-max normalising ((x − min) / (max − min)) gives every feature a comparable range. Measured ' +
            'with 10-fold cross-validation on the training patients at k = 5: unscaled 63.4 per cent, min-max ' +
            '83.2 per cent, standardised 83.7 per cent; the majority-class baseline is 54.2 per cent. The ' +
            'scaler must learn its mean and SD from the training rows only, which is what putting it inside a ' +
            'Pipeline guarantees in every fold.',
          viz: ['knn-scaling'] },

        { id: 'irrelevant', nav: '6. Irrelevant features',
          title: '6. Irrelevant and redundant features',
          body:
            'k-NN uses every feature in every distance. A decision tree can simply never split on a useless ' +
            'feature; k-NN has no such mechanism. Adding 50 columns of pure noise to the heart data lowers ' +
            'cross-validated accuracy from 79.7 to 73.1 per cent, and 100 columns to 67.3 per cent. Redundant ' +
            'features do a quieter version of the same damage: three near-copies of one measurement give it ' +
            'three votes in the distance. The remedies are feature weights (a weighted distance), feature ' +
            'selection (weight 0) or a better representation, each chosen by cross-validation on the ' +
            'training data, because in real data you do not know in advance which features are noise.',
          viz: ['knn-irrelevant'] },

        { id: 'weighted', nav: '7. Distance-weighted k-NN',
          title: '7. Distance-weighted k-NN',
          body:
            'With k = 7 a query can be outvoted by distant neighbours of a larger class. Distance weighting ' +
            'gives each neighbour a vote of wᵢ = 1 / d(x_q, xᵢ)ⁿ. For classification, vote(c) = Σ wᵢ [yᵢ = c]; ' +
            'for regression, f(x_q) = Σ wᵢ f(xᵢ) / Σ wᵢ. The lecture example with n = 2 gives ' +
            '(82/4 + 83/16 + 78/36) / (1/4 + 1/16 + 1/36) = 81.857. The exponent n sets how fast influence ' +
            'decays: n = 0 is the plain vote, and large n approaches 1-NN. If a stored case is at distance 0, ' +
            'its weight would be infinite: scikit-learn then lets only the zero-distance neighbours vote, and ' +
            'a hand-written implementation must handle the case explicitly.',
          viz: ['knn-weighted'] },

        { id: 'choosing', nav: '8. Choosing k honestly',
          title: '8. Choosing k, the metric and the weighting by cross-validation',
          body:
            'The rule of thumb k ≈ √n gives about 15 for 227 training patients; odd k avoids two-class ties. ' +
            'Neither replaces measurement. GridSearchCV over odd k from 1 to 51, Euclidean or Manhattan, and ' +
            'uniform or distance weights, all inside the Pipeline, chose k = 33, Manhattan, distance-weighted, ' +
            'at 84.6 per cent cross-validated accuracy (fold SD 7.7 points). Many other settings are within ' +
            'that noise, so read the choice as "a broad k with either metric", not as a precise optimum. ' +
            'Only then is the test set used, once: 90.8 per cent accuracy on 76 patients, 32 of 35 diseased ' +
            'patients found and 37 of 41 healthy ones cleared. A test score this much above the CV estimate ' +
            'is luck of a small test set, not a sign the model improved.',
          viz: ['knn-cv'] },

        { id: 'similarity', nav: '9. Similar is not equivalent',
          title: '9. Similar in feature space is not biologically equivalent',
          body:
            'Two patients can be close because they share the measurements you happened to record, while ' +
            'differing in everything you did not: genotype, medication, the reason they were referred. Two ' +
            'proteins can be close in sequence and differ in function, or share a fold with almost no sequence ' +
            'identity. A nearest neighbour is evidence of similarity in the space you chose, under the ' +
            'scaling and weights you chose, nothing more. In high dimensions there is a further problem: ' +
            'distances concentrate, so the nearest and the farthest neighbours become almost equally far ' +
            'away. Week 7, next session, measures this directly and introduces learned representations in ' +
            'which "near" can mean more. The optional exercise below previews that idea: hold k-NN fixed and ' +
            'change only the representation.',
          viz: ['knn'],
          keypoint: 'A nearest neighbour answers "similar in this space?" Whether that space captures the biology is a separate question, and yours to justify.' },

        { id: 'using', nav: '10. Using this page with the lab',
          title: '10. Using this page with the lab',
          html:
            '<div class="table-scroll"><table class="table-compact"><thead><tr><th scope="col">Lab task</th>' +
            '<th scope="col">Exercise on this page</th></tr></thead><tbody>' +
            '<tr><th scope="row">3. Implement k-NN</th><td><a href="#viz-knn-vote">1. Nearest neighbour and the k-NN vote</a></td></tr>' +
            '<tr><th scope="row">4. Investigate k</th><td><a href="#viz-knn-vote">1</a> (decision regions) and <a href="#viz-knn-cv">7. Choosing k</a></td></tr>' +
            '<tr><th scope="row">5. Distance metrics</th><td><a href="#viz-distance-calc">3. Distance calculator</a></td></tr>' +
            '<tr><th scope="row">6. Feature scaling</th><td><a href="#viz-knn-scaling">4. Feature scaling</a></td></tr>' +
            '<tr><th scope="row">7. Model selection</th><td><a href="#viz-knn-cv">7. Choosing k by cross-validation</a></td></tr>' +
            '<tr><th scope="row">8. Distance weighting</th><td><a href="#viz-knn-weighted">6. Distance-weighted voting</a></td></tr>' +
            '<tr><th scope="row">10. Reflection</th><td><a href="#viz-knn-irrelevant">5. Irrelevant features</a></td></tr>' +
            '<tr><th scope="row">Extension A. k-NN regression</th><td><a href="#viz-knn-regression">2. k-NN regression</a></td></tr>' +
            '</tbody></table></div>' },
      ],
      interactiveIntro:
        'Eight exercises, each inside the section it belongs to. Exercises 1 to 7 are the ones the lecture ' +
        'sends you to ("Try this interactively"); exercise 8 is an optional preview of Week 7. The lecture ' +
        'examples use the slides\' own numbers; everything else uses the real patients from the lab, with ' +
        'the lab\'s split and protocol, so the numbers here and in your notebook agree.',
      interactiveIndex: [
        { id: 'knn-vote', label: '1. Nearest neighbour and the k-NN vote', note: 'section 2; lab Tasks 3–4; lecture slide 13' },
        { id: 'knn-regression', label: '2. k-NN regression', note: 'section 3; lab Extension A; lecture slide 20' },
        { id: 'distance-calc', label: '3. Distance calculator', note: 'section 4; lab Task 5; lecture slide 31' },
        { id: 'knn-scaling', label: '4. Feature scaling', note: 'section 5; lab Task 6; lecture slide 36' },
        { id: 'knn-irrelevant', label: '5. Irrelevant features and weights', note: 'section 6; lab Task 10; lecture slide 39' },
        { id: 'knn-weighted', label: '6. Distance-weighted voting', note: 'section 7; lab Task 8; lecture slide 44' },
        { id: 'knn-cv', label: '7. Choosing k by cross-validation', note: 'section 8; lab Tasks 4 and 7; lecture slide 46' },
        { id: 'knn', label: '8. (Optional) Classifier versus representation', note: 'section 9; preview of Week 7; lecture slide 51 notes' }
      ],
      concepts: [
        { term: 'Instance-based (lazy) learning', body: 'No model is fitted at training time; the stored training cases are the model. Cost moves to prediction: every query is compared with every stored case.' },
        { term: 'Parametric versus non-parametric', body: 'A parametric model (logistic regression) has a fixed number of parameters whatever the data size; k-NN assumes no functional form and its complexity grows with the data.' },
        { term: 'Majority vote and averaging', body: 'Classification: the most common class among the k nearest. Regression: the mean of their values. With two classes, an odd k avoids ties under a plain vote.' },
        { term: 'Choosing k', body: 'Small k: flexible, noise-sensitive (1-NN has 100% training accuracy by construction). Large k: smooth, and at k = n it predicts the majority class. Choose by cross-validation; √n is only a starting point.' },
        { term: 'Euclidean, Manhattan, Hamming', body: 'Straight-line distance; sum of absolute differences; number of mismatched positions. Which is better is an empirical question for your data, settled by cross-validation.' },
        { term: 'Heterogeneous and domain-specific distances', body: 'Mixed records need a distance built per feature type. Domain knowledge can supply an order (foods by calories) where Hamming sees only same or different.' },
        { term: 'Feature scaling', body: 'Standardise or min-max normalise so no feature dominates because of its unit. Fit the scaler on training rows only, inside a Pipeline. On the heart data: 63.4% unscaled, 83.7% standardised (k = 5).' },
        { term: 'Irrelevant features and weights', body: 'Every feature contributes to every distance. Weighted distances and feature selection counter this; the weights are hyperparameters, chosen on training data.' },
        { term: 'Distance weighting', body: 'wᵢ = 1/dⁿ. Larger n trusts the nearest neighbours more. At d = 0 the weight is infinite: only exact matches vote.' },
        { term: 'Cost', body: 'Naive prediction is O(n·d) per query and the whole training set must be kept in memory. Tree indexes (KD-tree, ball tree) help in low dimensions; approximate search is used at scale.' }
      ],
      worked: {
        title: 'One patient, by hand',
        body:
          'A held-out patient is compared with the 227 training patients. Unscaled, the five continuous ' +
          'features enter the distance with cholesterol supplying 77 per cent of it, so the "nearest" patients ' +
          'are mostly those with similar cholesterol, whatever their ST depression, maximum heart rate or ' +
          'chest-pain type. After standardising the continuous features and one-hot encoding the categorical ' +
          'ones, every feature contributes and the neighbours resemble the patient clinically, not just in one ' +
          'blood test.\n\n' +
          'Take k = 5. If three of the five nearest patients have disease, the plain vote says disease, with an ' +
          'estimated probability of 3/5 = 0.6. With distance weighting, a very close healthy neighbour can ' +
          'outweigh two distant diseased ones, and the estimate changes even when the label does not; on these ' +
          'data distance weighting mostly moves the probability rather than the decision.\n\n' +
          'The final step is the honest one: the configuration is chosen by cross-validation on training ' +
          'patients, and the test patients are used once, at the end.',
        keypoint: 'Before trusting a neighbour, ask which features made it the neighbour.'
      },
      fm: {
        title: 'Embeddings plus a nearest-neighbour search',
        body:
          'Nearest-neighbour search is the most common way foundation-model embeddings are used in practice: ' +
          'embed every protein, cell or sequence once, then find the stored items closest to a new one. Next ' +
          'session (Week 7) shows how those embeddings are produced, why they need centring before distances ' +
          'mean much, and how to test whether "near in the embedding" means "similar in biology". Everything ' +
          'on this page carries over: the metric, the scaling, the curse of dimensionality and the need to ' +
          'validate on held-out data.',
        models: ['esm2', 'prottrans']
      },
      scientist:
        'Your k-NN classifier, trained on patients from one hospital, labels a new patient by her five ' +
        'nearest neighbours. List three reasons the neighbours could be "near" without being clinically ' +
        'comparable, and for each say what evidence or extra feature would let you check it.',
      quiz: [
        { q: 'A k-NN model has 100% training accuracy at k = 1. What does that tell you?',
          options: ['The model generalises perfectly', 'Nothing about generalisation: each training case is its own nearest neighbour', 'k = 1 is the best choice', 'The data have no noise'],
          answer: 1,
          why: 'At k = 1 every training point is predicted by itself, at distance 0. Training accuracy cannot choose k; cross-validation can.' },
        { q: 'Two features: cholesterol (SD about 52 mg/dl) and ST depression (SD about 1.2 mm). Unscaled Euclidean k-NN will choose neighbours mainly by…',
          options: ['ST depression, because it is more informative', 'Cholesterol, because its differences are numerically far larger', 'Both equally', 'Neither: k-NN ignores units'],
          answer: 1,
          why: 'Distance adds raw differences. Cholesterol supplies 77% of the unscaled squared distance in the heart data, ST depression 0.03%. Scaling fixes the units, not the informativeness.' },
        { q: 'With distance weights 1/d², the three nearest neighbours have values 82 (d = 2), 83 (d = 4) and 78 (d = 6). The prediction is…',
          options: ['81.0', '81.857', '82.0', '80.5'],
          answer: 1,
          why: '(82/4 + 83/16 + 78/36) / (1/4 + 1/16 + 1/36) = 27.854 / 0.3403 = 81.857, pulled towards the nearest value, 82.' },
        { q: 'Chest-pain type is coded 1, 2, 3, 4. Using the codes directly in Euclidean distance…',
          options: ['is fine because they are numbers', 'claims that type 4 is three times as far from type 1 as from type 3, which is meaningless for categories', 'is the same as Hamming distance', 'only matters for large k'],
          answer: 1,
          why: 'Codes are labels. Use a match/mismatch (Hamming) comparison or one-hot encoding, unless the categories have a real order.' }
      ],
      lab: 'lab08',
      datasets: ['heartCleveland', 'proteinSim'],
      reading: [
        { ref: 'coverhart1967', note: 'The original analysis of the nearest-neighbour rule.' },
        { ref: 'detrano1989', note: 'The study behind this week\'s data: read how the patients were selected.' },
        { ref: 'greener2022', note: 'On choosing between model families.' }
      ],
      provenance: {
        kept: 'The whole instance-based-learning treatment from the 2025/26 Week 8 deck: nearest neighbour, the film example, k-NN classification and regression, choosing k, Euclidean, Manhattan, Hamming, heterogeneous and domain-specific metrics, the problems-measuring-distance sequence (scaling, irrelevant features, weighted Euclidean), distance-weighted k-NN with its worked votes, and eager versus lazy learners.',
        changed: 'Arithmetic corrected (the four-feature Euclidean distance is √66 = 8.12; the scaling example\'s first term is 4). The real dataset is now the Cleveland heart-disease data with documented provenance, replacing the unlabelled cancer CSVs of the old Lab 8. Biological similarity, categorical encoding, Pipelines, cross-validated selection and the zero-distance rule are new, and every "Try this interactively" slide has a working exercise on this page.'
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
