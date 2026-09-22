/* COMP9085 - biological foundation models reference.
 *
 * Only figures that were checked against the primary source are recorded here.
 * Where a value is not stated in the source it is omitted rather than guessed.
 * `ref` points into window.REFERENCES.
 */
window.FOUNDATION_MODELS = [
  {
    id: 'nucleotide-transformer',
    name: 'Nucleotide Transformer',
    org: 'InstaDeep, NVIDIA and collaborators',
    modality: 'DNA',
    ref: 'nucleotideTransformer',
    sizes: '50M, 100M, 250M, 500M and 2.5B parameters',
    pretraining:
      'Three corpora across the model family: the human reference genome; 3,202 human ' +
      'genomes from the 1000 Genomes Project; and 850 genomes from diverse species ' +
      'including 11 model organisms.',
    tokenisation: 'Six-mer tokens, chosen as a trade-off between sequence length and embedding size.',
    context: 'Version 1 handles 6 kilobases (1,000 six-mer tokens); version 2 handles 12 kilobases (2,048 tokens).',
    evaluation: 'Evaluated on 18 downstream genomic prediction tasks including splice sites, promoters, histone modifications and enhancers.',
    useFor: [
      'Embedding regulatory or coding regions for a downstream classifier',
      'Promoter, enhancer and splice-site prediction',
      'Variant-effect exploration where the variant sits within the context window'
    ],
    doNotUse: [
      'Whole-chromosome or long-range regulatory questions that exceed the context window',
      'Species far outside the pretraining set, where the learned statistics may not transfer',
      'Any setting where you need an interpretable, mechanistic account of the prediction'
    ],
    note: 'Published in Nature Methods in 2025. The paper is unusually careful about benchmark construction, which is part of why it is worth reading in full.'
  },
  {
    id: 'dnabert-2',
    name: 'DNABERT-2',
    org: 'Northwestern University (MAGICS Lab) and collaborators',
    modality: 'DNA',
    ref: 'dnabert2',
    sizes: '117M parameters',
    pretraining:
      'Multi-species genomes: 135 species across fungi, protozoa, mammalian, invertebrate, ' +
      'vertebrate and bacterial categories, totalling 32.49 billion nucleotide bases, ' +
      'roughly twelve times the size of the human-genome-only corpus.',
    tokenisation:
      'Byte-pair encoding rather than fixed k-mers, which removes the information leakage ' +
      'and computational inefficiency the authors identify in k-mer tokenisation.',
    context: 'Uses attention with linear biases (ALiBi) in place of learned positional embeddings, which removes the hard input-length restriction.',
    evaluation:
      'Introduced the GUE benchmark: 28 datasets over 7 tasks with inputs of 70 to 1,000 bp, ' +
      'plus GUE+ with 8 datasets over 2 tasks at 5,000 to 10,000 bp, for 36 datasets over 9 ' +
      'tasks in total, spanning human, mouse, yeast, virus and fungal genomes.',
    useFor: [
      'Genomic sequence classification where efficiency matters',
      'A strong baseline to compare against larger genomic models',
      'Demonstrating parameter-efficient fine-tuning, since the model ships with LoRA support'
    ],
    doNotUse: [
      'Tasks needing very long-range context beyond what the architecture was evaluated on',
      'Situations where you cannot verify that your evaluation sequences were absent from the pretraining corpus'
    ],
    note:
      'Reports comparable performance to the 2.5B-parameter Nucleotide Transformer with 21 ' +
      'times fewer parameters and roughly 92 times less GPU time in pretraining. It is the ' +
      'clearest published illustration in genomics that bigger is not automatically better, ' +
      'and it uses ALiBi, FlashAttention and LoRA to get there.'
  },
  {
    id: 'hyenadna',
    name: 'HyenaDNA',
    org: 'Stanford (HazyResearch) and collaborators',
    modality: 'DNA',
    ref: 'hyenadna',
    sizes: 'Several released checkpoints; the paper emphasises that it reaches its results with far fewer parameters and less pretraining data than attention-based competitors.',
    pretraining: 'Human reference genome.',
    tokenisation: 'Single nucleotide, with no k-mer aggregation, so per-base resolution is preserved.',
    context: 'Up to 1 million tokens, a 500-fold increase over the attention-based models it compares against, achieved by replacing attention with implicit long convolutions that scale sub-quadratically.',
    evaluation: 'Reported up to 160 times faster training than a Transformer at equivalent sequence length.',
    useFor: [
      'Long-range genomic dependencies such as distal enhancer-promoter relationships',
      'Any task where single-nucleotide resolution matters and k-mer tokenisation would blur it'
    ],
    doNotUse: [
      'Species other than human without checking whether the human-only pretraining transfers',
      'Short-sequence tasks, where the long-context advantage buys nothing and simpler models are cheaper'
    ],
    note: 'NeurIPS 2023. The interesting claim is architectural: that the quadratic cost of attention, not the modelling problem, was what limited genomic context length.'
  },
  {
    id: 'esm2',
    name: 'ESM-2 and ESMFold',
    org: 'Meta AI (Fundamental AI Research)',
    modality: 'Protein',
    ref: 'esm2',
    sizes: 'Six checkpoints: 8M (6 layers), 35M (12), 150M (30), 650M (33), 3B (36) and 15B (48) parameters.',
    pretraining: 'UniRef50/D, release 2021_04, by masked language modelling over amino-acid sequences.',
    tokenisation: 'Single amino acid.',
    context: 'Per-protein embeddings are normally obtained by mean-pooling the final hidden layer over the residue positions, excluding the special tokens.',
    evaluation: 'ESMFold uses ESM-2 representations to predict atomic-level structure directly from a single sequence, without a multiple sequence alignment.',
    licence: 'MIT licence on the code.',
    useFor: [
      'Per-protein or per-residue embeddings for downstream classification and regression',
      'Function, localisation and stability prediction from sequence alone',
      'Fast structure prediction where the alignment step is the bottleneck'
    ],
    doNotUse: [
      'De novo design without experimental validation',
      'Proteins very unlike anything in UniRef50, such as heavily engineered or non-canonical sequences',
      'Any inference about mechanism: the embedding encodes sequence statistics, not chemistry'
    ],
    note:
      'The 8M-parameter checkpoint is genuinely useful for teaching, runs on a laptop CPU, ' +
      'and is what data/scripts/04_real_esm2_embeddings.py uses by default. A foundation ' +
      'model does not have to be large.'
  },
  {
    id: 'prott5',
    name: 'ProtT5 (ProtTrans)',
    org: 'Rostlab, Technical University of Munich, and collaborators',
    modality: 'Protein',
    ref: 'prottrans',
    sizes: 'ProtT5-XL is built on the T5-3B architecture, approximately 3 billion parameters.',
    pretraining: 'UniRef50, approximately 45 million protein sequences, using a BART-style masked denoising objective with 15 per cent of amino acids masked.',
    tokenisation: 'Single amino acid.',
    useFor: [
      'Per-residue embeddings for secondary structure, subcellular localisation and membrane-protein prediction',
      'A second opinion alongside ESM-2, since the two were trained differently and their errors are not identical'
    ],
    doNotUse: [
      'Settings where the 3-billion-parameter footprint is impractical; the encoder-only half-precision variant is much lighter',
      'Claims about biophysical mechanism'
    ],
    note:
      'The ProtTrans work showed that language-model embeddings learned from unlabelled ' +
      'sequence alone capture biophysical properties governing protein shape, which is one ' +
      'of the clearest demonstrations of what self-supervision buys in biology.'
  },
  {
    id: 'alphafold',
    name: 'AlphaFold 2 and AlphaFold 3',
    org: 'Google DeepMind, with EMBL-EBI for the database',
    modality: 'Protein structure and, in version 3, biomolecular complexes',
    ref: 'alphafold2',
    ref2: 'alphafold3',
    sizes: 'Not a general-purpose embedding model. Included here because it is the example most students arrive already knowing.',
    pretraining:
      'Trained on experimentally determined structures from the PDB together with sequence ' +
      'databases and multiple sequence alignments. Version 3 extends the approach to ' +
      'complexes involving ligands, nucleic acids, ions and modified residues.',
    confidence:
      'Reports per-residue pLDDT: above 90 is very high confidence, 70 to 90 confident, 50 ' +
      'to 70 low, below 50 very low. Very low pLDDT correlates with intrinsic disorder, so ' +
      'it often carries genuine biological information rather than simply indicating failure.',
    useFor: [
      'Obtaining a structural hypothesis for a protein with no experimental structure',
      'Prioritising targets for experimental work',
      'Teaching what a confidence score is for'
    ],
    doNotUse: [
      'Treating a prediction as an experimental structure in a publication without saying so',
      'Conformational questions: a single static structure is predicted',
      'Concluding that protein folding is "solved". Predicting a structure and understanding folding are different problems, and the model does not tell you what the protein does'
    ],
    note:
      'The AlphaFold Protein Structure Database provides open predicted structures covering ' +
      'over 214 million protein sequences under CC BY 4.0.'
  },
  {
    id: 'healthcare-fms',
    name: 'Foundation models in healthcare',
    org: 'Multiple groups',
    modality: 'Clinical text, electronic health records, medical imaging, multimodal',
    ref: null,
    isOverview: true,
    body:
      'Foundation models are being developed across several distinct healthcare modalities, ' +
      'and it is worth keeping them separate rather than treating "healthcare AI" as one ' +
      'thing.\n\n' +
      'Clinical text. Language models adapted to clinical notes, discharge summaries and ' +
      'the biomedical literature. The distinctive problems are dense domain abbreviation, ' +
      'heavy negation ("no evidence of effusion" must not be read as "effusion"), and the ' +
      'fact that notes are written for billing and handover as much as for description.\n\n' +
      'Electronic health records. Models over sequences of structured clinical events. ' +
      'Irregular sampling is intrinsic here, and the fact that a measurement was ordered at ' +
      'all is often more predictive than its value, which is a form of label leakage that ' +
      'is very easy to build in accidentally.\n\n' +
      'Medical imaging. Vision models pretrained on large image collections and adapted to ' +
      'radiology, pathology or dermatology. Scanner, protocol and site effects are severe, ' +
      'and models frequently learn the site rather than the pathology.\n\n' +
      'Genomics. The DNA models above, applied to clinical variant interpretation.\n\n' +
      'Multimodal. Combining imaging with text or with structured data. Promising, and ' +
      'evaluation is correspondingly harder because a failure in either modality can be ' +
      'masked by the other.\n\n' +
      'Across all of these, the evaluation standard is what distinguishes a research result ' +
      'from a clinical tool: external validation on independently collected data, reported ' +
      'subgroup performance, calibration, and prospective study of whether use of the model ' +
      'changes patient outcomes. Very few published models have all four.'
  },
  {
    id: 'nutrition-fms',
    name: 'Foundation models and nutrition',
    org: null,
    modality: 'Nutrition',
    ref: null,
    isOverview: true,
    body:
      'It would be convenient to name a dominant nutrition foundation model. There is not ' +
      'one, and claiming otherwise would misrepresent the field.\n\n' +
      'Nutrition in this module is therefore treated primarily as a downstream application, ' +
      'which is what it honestly is. The places where pretrained models genuinely contribute ' +
      'are specific and modality-borrowed: vision models for food recognition and portion ' +
      'estimation from photographs; language models for parsing free-text dietary recalls ' +
      'and food descriptions, and for mapping them onto composition databases; and general ' +
      'tabular methods, usually gradient-boosted trees, for the survey and cohort data that ' +
      'makes up most nutritional epidemiology.\n\n' +
      'The binding constraint in nutrition research is not model capacity. It is measurement ' +
      'error in the exposure. Self-reported dietary intake has large within-person ' +
      'variability and systematic under-reporting, and no amount of pretraining recovers ' +
      'information that the instrument never captured. A student who understands that will ' +
      'be more use in a nutrition project than one who can fine-tune a transformer.'
  }
];

/* The adaptation ladder, used by the foundation-models page and Week 11. */
window.ADAPTATION_LADDER = [
  {
    id: 'zero-shot',
    name: 'Zero-shot',
    labels: 'None',
    compute: 'Inference only',
    body: 'Use the pretrained model directly. The task must already be expressible in terms the model handles. Free to try, so try it first.',
    risk: 'The ceiling can be low, and it is difficult to know in advance whether the task is within scope.'
  },
  {
    id: 'features',
    name: 'Feature extraction (frozen embeddings)',
    labels: 'Roughly 100 to 1,000',
    compute: 'One forward pass per example, then a classical model on a CPU',
    body: 'Freeze the model, extract embeddings, train logistic regression, k-NN or a random forest on top. Cross-validates honestly in seconds because the downstream model is small.',
    risk: 'Almost none, and this is the baseline every more expensive option must beat. Most projects should stop here.'
  },
  {
    id: 'peft',
    name: 'Parameter-efficient fine-tuning (LoRA, adapters)',
    labels: 'Roughly 1,000 to 10,000',
    compute: 'A GPU for minutes to hours',
    body: 'Freeze the pretrained weights and train a small number of added parameters. LoRA injects low-rank matrices; adapters insert small trainable modules between layers.',
    risk: 'Manageable, but you now have hyperparameters (rank, which modules, learning rate) and each one is another opportunity to overfit your validation set.'
  },
  {
    id: 'full',
    name: 'Full fine-tuning',
    labels: 'Roughly 10,000 and above',
    compute: 'A GPU for hours to days',
    body: 'Update every weight. Highest ceiling when the labelled data genuinely supports it.',
    risk: 'On small biological datasets this fits a very large parameter count to very little data, with real risk of catastrophic forgetting. It also makes reproducibility harder, since the result depends on weights you do not control.'
  }
];
