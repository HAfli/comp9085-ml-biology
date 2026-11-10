/* COMP9085 - dataset catalogue.
 *
 * Every figure in this file was checked against the primary source listed in
 * `sourceRef` (an id in window.REFERENCES). Where a number could not be
 * verified from the primary source it is absent rather than estimated.
 */
window.DATASETS = [
  {
    id: 'wdbc',
    name: 'Breast Cancer Wisconsin (Diagnostic)',
    aka: 'WDBC',
    domain: 'Healthcare',
    modality: 'Tabular, morphometric',
    inSite: true,
    weeks: [2, 3, 4, 7, 8, 9, 10, 12],
    source: 'UCI Machine Learning Repository',
    sourceRef: 'wdbc',
    url: 'https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic',
    licence: 'CC BY 4.0',
    access: 'Open download. Also bundled with scikit-learn as sklearn.datasets.load_breast_cancer, which is the copy this website uses.',
    samples: '569',
    features: '30 real-valued: ten nuclear measurements, each reported as its mean, standard error and worst (largest) value across the nuclei in one image.',
    target: 'Diagnosis: benign (357) or malignant (212).',
    biology:
      'A fine-needle aspirate is taken from a breast mass and imaged. The boundary of each ' +
      'cell nucleus is traced, and ten geometric and textural properties are computed: ' +
      'radius, texture, perimeter, area, smoothness, compactness, concavity, concave points, ' +
      'symmetry and fractal dimension. Larger, more irregular, more deeply indented nuclei ' +
      'are associated with malignancy, which is why the "worst" values carry most of the ' +
      'predictive signal.',
    limitations: [
      'Single institution, collected in the early 1990s. Imaging and staining practice have changed since.',
      'No demographic information is included, so subgroup performance cannot be assessed at all.',
      'The nuclear boundaries were traced semi-automatically with human input, so the features embed the operator\'s judgement.',
      'The class balance (37 per cent malignant) is far higher than in a screening population, so predictive values computed on it do not transfer to screening.',
      'It is small and easy. Excellent results on it should not be read as evidence that a method will work on harder clinical data.'
    ],
    citation: 'Wolberg, W., Mangasarian, O., Street, N. & Street, W. (1993). Breast Cancer Wisconsin (Diagnostic). UCI Machine Learning Repository. DOI 10.24432/C5DW2B'
  },
  {
    id: 'wbcOriginal',
    name: 'Breast Cancer Wisconsin (Original)',
    aka: 'WBC',
    domain: 'Healthcare',
    modality: 'Tabular, ordinal cytology scores',
    inSite: false,
    weeks: [3],
    source: 'UCI Machine Learning Repository',
    sourceRef: 'wbcOriginal',
    url: 'https://archive.ics.uci.edu/dataset/15/breast+cancer+wisconsin+original',
    licence: 'CC BY 4.0',
    access: 'Open download.',
    samples: '699',
    features: '9 ordinal features scored 1 to 10 by a cytologist: clump thickness, uniformity of cell size, uniformity of cell shape, marginal adhesion, single epithelial cell size, bare nuclei, bland chromatin, normal nucleoli and mitoses.',
    target: 'Class: benign (458) or malignant (241).',
    biology:
      'The earlier and simpler of the two Wisconsin datasets. Each feature is a human ' +
      'cytologist\'s ordinal judgement rather than an automated measurement, which makes it ' +
      'a good vehicle for discussing inter-observer variability and what an ordinal scale ' +
      'does and does not license you to compute.',
    limitations: [
      'The bare-nuclei column has 16 missing values in the original release, which is a useful teaching feature rather than a defect.',
      'Features are human ordinal scores, so differences between adjacent values are not necessarily equal.',
      'Same single-institution and vintage caveats as the Diagnostic set.'
    ],
    note: 'This is the dataset used by Project 1 in the 2025/26 module. It is retained as the Project 1 dataset so that existing assessment material continues to work.',
    citation: 'Wolberg, W. (1990). Breast Cancer Wisconsin (Original). UCI Machine Learning Repository. DOI 10.24432/C5HP4Z'
  },
  {
    id: 'nhanes',
    name: 'National Health and Nutrition Examination Survey',
    aka: 'NHANES, August 2021 to August 2023 cycle',
    domain: 'Nutrition and public health',
    modality: 'Tabular, survey plus examination plus laboratory',
    inSite: false,
    weeks: [6, 12],
    source: 'US Centers for Disease Control and Prevention, National Center for Health Statistics',
    sourceRef: 'nhanes',
    url: 'https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?Cycle=2021-2023',
    licence: 'US Government public-use data files. Free to use; NCHS asks that the survey be cited and that no attempt be made to re-identify participants.',
    access: 'Direct download of SAS transport files by component (demographics, dietary, examination, laboratory, questionnaire). The R package nhanesA and the Python package pandas both read them.',
    samples: '11,933 participants in the demographic file for the August 2021 to August 2023 cycle, of whom 8,860 completed the examination component.',
    features: 'Hundreds of variables across demographics, two 24-hour dietary recalls, anthropometry, blood pressure, and an extensive laboratory panel. SEQN links records across files.',
    target: 'Chosen by the analyst. Common teaching targets: elevated blood pressure, obesity category, vitamin D sufficiency, or a continuous nutrient intake.',
    biology:
      'A stratified, multi-stage, clustered probability sample of the US civilian ' +
      'non-institutionalised population, combining an in-home interview with a physical ' +
      'examination and laboratory work carried out in a mobile examination centre. It is the ' +
      'reference source for US nutritional and health surveillance.',
    limitations: [
      'Survey weights are mandatory. Unweighted analysis describes the sample, not the population, and some subgroups are deliberately oversampled.',
      'Dietary intake is self-reported by 24-hour recall, which carries large within-person day-to-day variability and systematic under-reporting of energy intake.',
      'It is cross-sectional. Associations between diet and health outcomes here cannot establish direction of effect.',
      'Missingness is frequently informative: participants who did not attend the examination centre differ systematically from those who did.',
      'Some variables are top-coded (age at 80) or suppressed for disclosure control, which affects tail analyses.',
      'The August 2021 to August 2023 cycle spans a period of disrupted fieldwork, so comparisons with earlier cycles need care.'
    ],
    citation: 'Centers for Disease Control and Prevention, National Center for Health Statistics. National Health and Nutrition Examination Survey, August 2021 - August 2023.'
  },
  {
    id: 'openfda',
    name: 'openFDA Food Enforcement Reports',
    aka: 'openFDA food/enforcement',
    domain: 'Food safety and nutrition',
    modality: 'Semi-structured records with free text',
    inSite: true,
    weeks: [5],
    source: 'US Food and Drug Administration',
    sourceRef: 'openfda',
    url: 'https://open.fda.gov/apis/food/enforcement/',
    licence: 'Public domain, CC0 1.0 Universal dedication.',
    access: 'Week 5 uses a frozen snapshot of the openFDA bulk export (last_updated 2026-09-28; SHA-256 of the zip recorded in labs/week05/data/PROVENANCE.json), shipped with the lab as labs/week05/data/openfda_food_recall_events.csv. Neither the lab nor this site calls the API. The live API and weekly bulk downloads remain free to use, with no key needed for modest volumes.',
    samples: '9,490 event–reason–classification records (7,890 recall events; 9,394 event–reason pairs), de-duplicated from 29,462 classified product records. Report dates June 2012 to September 2026.',
    features: 'In the snapshot: event_id, report_date, classification, is_class_I, n_product_records and reason_for_recall (free text, the model input). The full export also has product_description, recalling firm, distribution pattern, status and geographic fields.',
    target: 'is_class_I: 1 for Class I (3,836 rows, 40.4%), 0 for Class II (4,882) or Class III (772). FDA defines Class I as a reasonable probability of serious adverse health consequences or death; Class II, temporary or medically reversible consequences or a remote probability of serious ones; Class III, use is not likely to cause adverse health consequences.',
    biology:
      'Each record is a real food-safety event: an undeclared allergen, a pathogen ' +
      'contamination, a labelling error, a foreign-body incident. Predicting the hazard ' +
      'classification from the free-text reason is a genuine text-classification task, ' +
      'and the data also teaches a data lesson: one recall event covers many products ' +
      'with the same text, so the event, not the product record, is the unit of observation.',
    limitations: [
      'The classification is an FDA administrative decision, not a measured health outcome. A model predicting it learns how the FDA classifies, which is related to but not identical with actual risk.',
      'One recall event can cover hundreds of product records with the same reason text. Splitting by record puts identical texts on both sides of the split; Week 5 splits by event.',
      '95 event–reason pairs carry more than one FDA classification within the same event, 73 of them conflicting on the Class I target: real label conflicts, kept in the data, showing that the text alone does not necessarily determine the label. Many texts also repeat stock phrases or name the recalling firm, which a classifier can learn instead of the hazard.',
      'The FDA states the data should not be used for medical decisions or public alerting; recall status is not updated after classification.',
      'Free text is written by many people over many years, so wording drifts over time. A random split will be optimistic relative to prospective use.',
      'US-only, so it does not generalise to other regulatory regimes.'
    ],
    citation: 'U.S. Food and Drug Administration. openFDA Food Enforcement reports, bulk export with last_updated 2026-09-28.'
  },
  {
    id: 'tcga',
    name: 'The Cancer Genome Atlas via the Genomic Data Commons',
    aka: 'TCGA / GDC',
    domain: 'Cancer genomics',
    modality: 'Multi-omic: genomic, epigenomic, transcriptomic, proteomic',
    inSite: false,
    weeks: [9, 12],
    source: 'National Cancer Institute and National Human Genome Research Institute',
    sourceRef: 'tcga',
    url: 'https://portal.gdc.cancer.gov/',
    licence: 'Open-access tiers are freely available. Controlled-access data, including raw sequence and germline variants, requires dbGaP authorisation.',
    access: 'GDC Data Portal, GDC API, and the gdc-client download tool. Derived open-access data such as gene expression quantification can be downloaded without authorisation.',
    samples: 'Over 20,000 primary cancer and matched normal samples across 33 cancer types.',
    features: 'Over 2.5 petabytes of data in total across the assay types.',
    target: 'Chosen by the analyst: tumour type, molecular subtype, stage, or survival.',
    biology:
      'A landmark programme, jointly run by NCI and NHGRI, which molecularly characterised ' +
      'more than 20,000 tumours across 33 cancer types. Much of what is now taught about ' +
      'molecular subtypes derives from it, and it remains the standard public resource for ' +
      'cancer-genomics method development.',
    limitations: [
      'Ancestry is unevenly represented, which limits generalisability of models trained on it and makes subgroup analysis essential.',
      'Samples were collected across many institutions over many years, so batch effects are substantial and must be handled explicitly.',
      'Primary untreated tumours dominate, so the data speaks poorly to treated or metastatic disease.',
      'Clinical annotation depth varies by project, and follow-up is incomplete for some cohorts.',
      'The transcriptomic data is bulk, so it mixes tumour, stromal and immune signal in unknown proportions.'
    ],
    citation: 'National Cancer Institute and National Human Genome Research Institute. The Cancer Genome Atlas Program. Data accessed via the NCI Genomic Data Commons.'
  },
  {
    id: 'afdb',
    name: 'AlphaFold Protein Structure Database',
    aka: 'AlphaFold DB',
    domain: 'Structural biology',
    modality: 'Predicted three-dimensional protein structures',
    inSite: false,
    weeks: [1, 7],
    source: 'Google DeepMind and EMBL-EBI',
    sourceRef: 'afdb',
    url: 'https://alphafold.ebi.ac.uk/',
    licence: 'CC BY 4.0.',
    access: 'Web interface, FTP bulk download, and a programmatic API. Entries are keyed by UniProt accession.',
    samples: 'Structure coverage for over 214 million protein sequences as of the 2024 release.',
    features: 'Per-structure atomic coordinates in mmCIF and PDB format, with per-residue pLDDT confidence and predicted aligned error.',
    target: 'Not a supervised dataset. Used as a structural resource and as a source of confidence scores.',
    biology:
      'Predicted structures for essentially the whole of UniProt, produced by AlphaFold and ' +
      'distributed openly. It made structural information available for proteins that will ' +
      'never be crystallised, which changed what questions are routine to ask.',
    limitations: [
      'These are predictions, not experimental structures, and they should be labelled as such in any downstream analysis.',
      'A single static structure is predicted. Proteins that adopt multiple conformations are not represented as such.',
      'Regions with pLDDT below 50 are very low confidence and tend to correspond to intrinsically disordered regions; treat them as a statement about flexibility rather than as coordinates to be trusted.',
      'The original database entries model the isolated chain: ligands, cofactors, ions and partner proteins are not included, though AlphaFold 3 addresses complexes.',
      'Confidence is self-reported by the model. It is well calibrated in aggregate but is not a guarantee for any individual structure.'
    ],
    citation: 'Varadi, M. et al. (2024). AlphaFold Protein Structure Database in 2024. Nucleic Acids Research 52(D1):D368-D375.'
  },
  {
    id: 'heartCleveland',
    name: 'Heart Disease (Cleveland Clinic subset)',
    aka: 'UCI Heart Disease, processed.cleveland.data',
    domain: 'Healthcare',
    modality: 'Tabular, clinical: continuous measurements and coded categories',
    inSite: true,
    weeks: [8],
    source: 'UCI Machine Learning Repository',
    sourceRef: 'janosi1988',
    url: 'https://archive.ics.uci.edu/dataset/45/heart+disease',
    licence: 'CC BY 4.0',
    access: 'Open download. The Week 8 lab ships a frozen copy with a header row (labs/week08/data/), with checksums in PROVENANCE.json; no account or network is needed in the lab.',
    samples: '303 patients (Cleveland Clinic Foundation, collected 1981-1984)',
    features: '13: five continuous (age, resting blood pressure, serum cholesterol, maximum heart rate on exercise, ST depression) and eight categorical or binary (sex, chest-pain type, fasting blood sugar > 120 mg/dl, resting ECG, exercise-induced angina, ST slope, number of major vessels coloured by fluoroscopy, thallium scan result). Six values are missing (ca 4, thal 2).',
    target: 'Angiographic coronary artery disease, recorded 0-4 and used here as present (1-4: 139) or absent (0: 164).',
    biology:
      'Patients referred for coronary angiography had non-invasive tests (exercise ECG, thallium ' +
      'scintigraphy, fluoroscopy) and routine measurements; the angiogram, which shows whether a major ' +
      'coronary artery is narrowed by more than 50 per cent, provides the label. The measurements sit on ' +
      'very different scales and several categories are stored as integer codes, which is exactly what ' +
      'makes the dataset instructive for distance-based methods [ref:detrano1989].',
    limitations: [
      'A referral population (patients already suspected of coronary disease), so prevalence (46%) and every predictive value are far higher than in the general population.',
      'Collected in the early 1980s at one centre; diagnostic practice and risk-factor treatment have changed since.',
      'Only 303 patients: cross-validation estimates have a fold-to-fold SD of several percentage points, and many model settings are statistically indistinguishable.',
      'Integer-coded categories (chest-pain type 1-4, thal 3/6/7) look numerical but are not quantities.',
      'Sex is recorded as binary and the cohort is two-thirds male, so performance for women is poorly estimated.'
    ],
    citation: 'Janosi, A., Steinbrunn, W., Pfisterer, M. & Detrano, R. (1988). Heart Disease [Dataset]. UCI Machine Learning Repository. DOI 10.24432/C52P4X'
  },
  {
    id: 'uniprotHuman',
    name: 'Human Swiss-Prot proteins with ESM-2 embeddings',
    aka: 'UniProtKB/Swiss-Prot release 2026_03, one protein per UniRef50 cluster',
    domain: 'Protein biology',
    modality: 'Amino-acid sequences, two curated annotations, 320-dimensional embeddings',
    inSite: true,
    weeks: [7],
    source: 'UniProt REST API (reviewed, human, non-fragment entries) and UniRef50 mapping; embeddings from facebook/esm2_t6_8M_UR50D (pinned revision), computed once by the module team (data/scripts/15_build_week07_data.py)',
    sourceRef: 'uniprot2025',
    url: 'https://www.uniprot.org',
    licence: 'UniProt data CC BY 4.0; ESM-2 weights MIT.',
    access: 'Frozen in labs/week07/data/ with PROVENANCE.json (query, release, checksums, model revision, pooling). The lab needs no network, GPU or deep-learning package.',
    samples: '2,000 proteins of 50-1,000 residues, drawn at random (seed 9085) from 16,139 that remain after keeping one per UniRef50 cluster. 1,500 training and 500 test proteins (stratified, seed 42).',
    features: 'Sequence and a residue-shuffled copy; length; the mean-pooled final-layer ESM-2 (8M) embedding of the real and of the shuffled sequence (320 numbers each). The lab derives 23 classical descriptors: 20 composition fractions, log length, and two Kyte-Doolittle hydropathy summaries.',
    target: 'Two UniProt keywords: KW-0732 Signal (signal peptide; 350, 17.5%) and KW-0812 Transmembrane (488, 24.4%); 128 proteins have both. The strongest evidence code behind each annotation is recorded.',
    biology:
      'A signal peptide is a short hydrophobic N-terminal segment that directs a protein into the secretory ' +
      'pathway; a transmembrane protein crosses the lipid bilayer, usually through hydrophobic helices of about ' +
      '20 residues. Both depend on where hydrophobic residues sit in the sequence, not only on how many there are, ' +
      'which is what makes them a good test of composition-only against order-aware representations [ref:uniprot2025].',
    limitations: [
      'Most annotations come from sequence analysis (prediction tools), not experiment: 237 of 350 signal-peptide and 425 of 488 transmembrane labels. Some labels are therefore circular for sequence-based models.',
      'An unannotated protein is not shown to lack the feature: negatives are "not annotated".',
      'One protein per UniRef50 cluster reduces but does not remove homology between training and test proteins (Suzek et al. 2015).',
      'ESM-2 was pretrained on UniRef sequences that almost certainly include these proteins (not their labels): pretraining exposure.',
      'Human proteins of 50-1,000 residues only; results need not transfer to other organisms or lengths.'
    ],
    citation: 'The UniProt Consortium (2025). UniProt: the Universal Protein Knowledgebase in 2025. Nucleic Acids Research 53(D1):D609-D617. Lin, Z. et al. (2023). Science 379:1123-1130 (ESM-2).'
  },
  {
    id: 'proteinSim',
    name: 'Protein family teaching set',
    aka: 'Simulated sequences with a simulated embedding',
    domain: 'Teaching resource',
    modality: 'Amino-acid sequences plus vector representations',
    inSite: true,
    simulated: true,
    weeks: [7, 8, 9, 10, 11],
    source: 'Generated for this module by data/scripts/03_build_sequences.py',
    licence: 'Same licence as this repository (CC BY 4.0 for content, MIT for code).',
    access: 'Shipped with the site at js/data/sequences.js.',
    samples: '360 sequences: four families of 90, each balanced on a second binary label.',
    features: 'The full amino-acid sequence; a 24-dimensional hand-engineered representation (20 composition values plus GRAVY hydropathy, net charge per 100 residues, aromaticity and log length); and a 32-dimensional summary of a 320-dimensional embedding.',
    target: 'Two labels: protein family (four classes, driven by amino-acid usage) and presence of an ordered H..D..S triad (binary, driven by residue order alone).',
    biology:
      'This dataset exists to make one comparison possible in a browser: what changes when ' +
      'you swap a hand-engineered representation for a learned one, holding the classifier ' +
      'fixed. The two labels are constructed to give opposite answers, so students meet both ' +
      'the case where engineering wins and the case where representation wins.',
    warning:
      'SIMULATED. The sequences are drawn from hand-specified position-weight matrices; they ' +
      'are not real proteins and do not correspond to any real family. The 320-dimensional ' +
      'embedding is a documented simulation, not the output of ESM-2 or any other model. ' +
      'The biophysical descriptors are, however, genuinely computed from these sequences ' +
      'using the published Kyte-Doolittle hydropathy scale. Running ' +
      'data/scripts/04_real_esm2_embeddings.py replaces the simulated embedding with real ' +
      'ESM-2 output and updates every banner on the site automatically.',
    limitations: [
      'The sequences are not real, so nothing biological should be concluded from them.',
      'The family label is separable by composition by construction, and the triad label is not, by construction. Both results are designed rather than discovered.',
      'The simulated embedding was built to behave qualitatively like a protein language model embedding. It is a teaching device, and its absolute performance numbers carry no external meaning.',
      'Real ESM-2 embeddings on real families would behave differently in detail, which is precisely why script 04 is provided.'
    ],
    citation: 'Generated for COMP9085. Hydropathy values from Kyte, J. & Doolittle, R. F. (1982). J Mol Biol 157:105-132.'
  }
];
