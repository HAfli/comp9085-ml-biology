/* COMP9085 - reference library.
 *
 * Every entry here was checked against the primary source while the site was
 * built. Where a figure is quoted on the site it carries a [ref] marker that
 * resolves to one of these entries. If you add a claim to the site, add its
 * source here first.
 *
 * `checked` records the date the citation details were last verified.
 */
window.REFERENCES = {

  /* ---------- Datasets ---------- */
  wdbc: {
    tag: 'UCI WDBC',
    cite: 'Wolberg, W., Mangasarian, O., Street, N. & Street, W. (1993). Breast Cancer Wisconsin (Diagnostic). UCI Machine Learning Repository.',
    doi: '10.24432/C5DW2B',
    url: 'https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic',
    checked: '2026-09'
  },
  wbcOriginal: {
    tag: 'UCI WBC (Original)',
    cite: 'Wolberg, W. (1990). Breast Cancer Wisconsin (Original). UCI Machine Learning Repository.',
    doi: '10.24432/C5HP4Z',
    url: 'https://archive.ics.uci.edu/dataset/15/breast+cancer+wisconsin+original',
    checked: '2026-09'
  },
  nhanes: {
    tag: 'NHANES',
    cite: 'Centers for Disease Control and Prevention, National Center for Health Statistics. National Health and Nutrition Examination Survey, August 2021 - August 2023.',
    url: 'https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?Cycle=2021-2023',
    checked: '2026-09'
  },
  openfda: {
    tag: 'openFDA',
    cite: 'U.S. Food and Drug Administration. openFDA Food Enforcement API (Recall Enterprise System, 2004 to present).',
    url: 'https://open.fda.gov/apis/food/enforcement/',
    checked: '2026-09'
  },
  tcga: {
    tag: 'TCGA',
    cite: 'National Cancer Institute & National Human Genome Research Institute. The Cancer Genome Atlas Program.',
    url: 'https://www.cancer.gov/ccg/research/genome-sequencing/tcga',
    checked: '2026-09'
  },
  gdc: {
    tag: 'GDC',
    cite: 'NCI Genomic Data Commons Data Portal.',
    url: 'https://portal.gdc.cancer.gov/',
    checked: '2026-09'
  },
  afdb: {
    tag: 'AlphaFold DB',
    cite: 'Varadi, M. et al. (2024). AlphaFold Protein Structure Database in 2024: providing structure coverage for over 214 million protein sequences. Nucleic Acids Research 52(D1):D368-D375.',
    doi: '10.1093/nar/gkad1011',
    url: 'https://alphafold.ebi.ac.uk/',
    checked: '2026-09'
  },
  afdb2025: {
    tag: 'AlphaFold DB 2025',
    cite: 'AlphaFold Protein Structure Database 2025: a redesigned interface and updated structural coverage. Nucleic Acids Research 54(D1):D358-D362.',
    doi: '10.1093/nar/gkaf1226',
    url: 'https://academic.oup.com/nar/article/54/D1/D358/8340156',
    checked: '2026-09'
  },
  afdbOriginal: {
    tag: 'AlphaFold DB 2022',
    cite: 'Varadi, M. et al. (2022). AlphaFold Protein Structure Database: massively expanding the structural coverage of protein-sequence space with high-accuracy models. Nucleic Acids Research 50(D1):D439-D444.',
    doi: '10.1093/nar/gkab1061',
    url: 'https://academic.oup.com/nar/article/50/D1/D439/6430488',
    checked: '2026-09'
  },

  /* ---------- Foundation models ---------- */
  alphafold2: {
    tag: 'AlphaFold 2',
    cite: 'Jumper, J. et al. (2021). Highly accurate protein structure prediction with AlphaFold. Nature 596:583-589.',
    doi: '10.1038/s41586-021-03819-2',
    url: 'https://www.nature.com/articles/s41586-021-03819-2',
    checked: '2026-09'
  },
  alphafold3: {
    tag: 'AlphaFold 3',
    cite: 'Abramson, J. et al. (2024). Accurate structure prediction of biomolecular interactions with AlphaFold 3. Nature.',
    doi: '10.1038/s41586-024-07487-w',
    url: 'https://www.nature.com/articles/s41586-024-07487-w',
    checked: '2026-09'
  },
  nucleotideTransformer: {
    tag: 'Nucleotide Transformer',
    cite: 'Dalla-Torre, H. et al. (2025). Nucleotide Transformer: building and evaluating robust foundation models for human genomics. Nature Methods 22:287-297.',
    doi: '10.1038/s41592-024-02523-z',
    url: 'https://www.nature.com/articles/s41592-024-02523-z',
    checked: '2026-09'
  },
  dnabert2: {
    tag: 'DNABERT-2',
    cite: 'Zhou, Z. et al. (2024). DNABERT-2: Efficient Foundation Model and Benchmark for Multi-Species Genomes. ICLR 2024.',
    doi: '10.48550/arXiv.2306.15006',
    url: 'https://arxiv.org/abs/2306.15006',
    checked: '2026-09'
  },
  hyenadna: {
    tag: 'HyenaDNA',
    cite: 'Nguyen, E. et al. (2023). HyenaDNA: Long-Range Genomic Sequence Modeling at Single Nucleotide Resolution. NeurIPS 2023.',
    doi: '10.48550/arXiv.2306.15794',
    url: 'https://arxiv.org/abs/2306.15794',
    checked: '2026-09'
  },
  esm2: {
    tag: 'ESM-2 / ESMFold',
    cite: 'Lin, Z. et al. (2023). Evolutionary-scale prediction of atomic-level protein structure with a language model. Science 379:1123-1130.',
    doi: '10.1126/science.ade2574',
    url: 'https://github.com/facebookresearch/esm',
    checked: '2026-09'
  },
  prottrans: {
    tag: 'ProtTrans / ProtT5',
    cite: 'Elnaggar, A. et al. (2022). ProtTrans: Toward Understanding the Language of Life Through Self-Supervised Learning. IEEE TPAMI 44(10):7112-7127.',
    doi: '10.1109/TPAMI.2021.3095381',
    url: 'https://huggingface.co/Rostlab/prot_t5_xl_uniref50',
    checked: '2026-09'
  },
  lora: {
    tag: 'LoRA',
    cite: 'Hu, E. J. et al. (2022). LoRA: Low-Rank Adaptation of Large Language Models. ICLR 2022.',
    doi: '10.48550/arXiv.2106.09685',
    url: 'https://arxiv.org/abs/2106.09685',
    checked: '2026-09'
  },

  /* ---------- Methodology, evaluation and critique ---------- */
  jones2019: {
    tag: 'Jones 2019',
    cite: 'Jones, D. T. (2019). Setting the standards for machine learning in biology. Nature Reviews Molecular Cell Biology 20:659-660.',
    doi: '10.1038/s41580-019-0176-5',
    url: 'https://www.nature.com/articles/s41580-019-0176-5',
    checked: '2026-09'
  },
  janosi1988: {
    tag: 'Janosi et al. 1988',
    cite: 'Janosi, A., Steinbrunn, W., Pfisterer, M. & Detrano, R. (1988). Heart Disease [Dataset]. UCI Machine Learning Repository.',
    doi: '10.24432/C52P4X',
    url: 'https://archive.ics.uci.edu/dataset/45/heart+disease',
    checked: '2026-11'
  },
  detrano1989: {
    tag: 'Detrano et al. 1989',
    cite: 'Detrano, R., Janosi, A., Steinbrunn, W., Pfisterer, M., Schmid, J.-J., Sandhu, S., Guppy, K. H., Lee, S. & Froelicher, V. (1989). International application of a new probability algorithm for the diagnosis of coronary artery disease. American Journal of Cardiology 64(5):304-310.',
    doi: '10.1016/0002-9149(89)90524-9',
    url: 'https://doi.org/10.1016/0002-9149(89)90524-9',
    checked: '2026-11'
  },
  coverhart1967: {
    tag: 'Cover and Hart 1967',
    cite: 'Cover, T. & Hart, P. (1967). Nearest neighbor pattern classification. IEEE Transactions on Information Theory 13(1):21-27.',
    doi: '10.1109/TIT.1967.1053964',
    url: 'https://doi.org/10.1109/TIT.1967.1053964',
    checked: '2026-11'
  },
  greener2022: {
    tag: 'Greener et al. 2022',
    cite: 'Greener, J. G., Kandathil, S. M., Moffat, L. & Jones, D. T. (2022). A guide to machine learning for biologists. Nature Reviews Molecular Cell Biology 23:40-55.',
    doi: '10.1038/s41580-021-00407-0',
    url: 'https://www.nature.com/articles/s41580-021-00407-0',
    checked: '2026-09'
  },
  kapoor2023: {
    tag: 'Kapoor & Narayanan 2023',
    cite: 'Kapoor, S. & Narayanan, A. (2023). Leakage and the reproducibility crisis in machine-learning-based science. Patterns 4(9):100804.',
    doi: '10.1016/j.patter.2023.100804',
    url: 'https://arxiv.org/abs/2207.07048',
    checked: '2026-09'
  },
  ambroise2002: {
    tag: 'Ambroise & McLachlan 2002',
    cite: 'Ambroise, C. & McLachlan, G. J. (2002). Selection bias in gene extraction on the basis of microarray gene-expression data. PNAS 99(10):6562-6566.',
    doi: '10.1073/pnas.102102699',
    url: 'https://www.pnas.org/doi/10.1073/pnas.102102699',
    checked: '2026-09'
  },
  tabeBordbar2018: {
    tag: 'Tabe-Bordbar et al. 2018',
    cite: 'Tabe-Bordbar, S., Emad, A., Zhao, S. D. & Sinha, S. (2018). A closer look at cross-validation for assessing the accuracy of gene regulatory networks and models. Scientific Reports 8:6620.',
    doi: '10.1038/s41598-018-24937-4',
    url: 'https://www.nature.com/articles/s41598-018-24937-4',
    checked: '2026-09'
  },
  yang2020: {
    tag: 'Yang et al. 2020',
    cite: 'Yang, A. et al. (2020). Review on the Application of Machine Learning Algorithms in the Sequence Data Mining of DNA. Frontiers in Bioengineering and Biotechnology 8:1032.',
    doi: '10.3389/fbioe.2020.01032',
    url: 'https://www.frontiersin.org/articles/10.3389/fbioe.2020.01032/full',
    checked: '2026-09'
  },
  kyteDoolittle: {
    tag: 'Kyte & Doolittle 1982',
    cite: 'Kyte, J. & Doolittle, R. F. (1982). A simple method for displaying the hydropathic character of a protein. Journal of Molecular Biology 157(1):105-132.',
    doi: '10.1016/0022-2836(82)90515-0',
    url: 'https://pubmed.ncbi.nlm.nih.gov/7108955/',
    checked: '2026-09'
  },
  geron: {
    tag: 'Geron',
    cite: "Geron, A. Hands-On Machine Learning with Scikit-Learn, Keras and TensorFlow. O'Reilly Media. ISBN 9781492032649.",
    url: 'https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/',
    checked: '2026-09'
  },
  sklearn: {
    tag: 'scikit-learn',
    cite: 'Pedregosa, F. et al. (2011). Scikit-learn: Machine Learning in Python. Journal of Machine Learning Research 12:2825-2830.',
    url: 'https://scikit-learn.org/stable/',
    checked: '2026-09'
  },
  strubell2019: {
    tag: 'Strubell et al. 2019',
    cite: 'Strubell, E., Ganesh, A. & McCallum, A. (2019). Energy and Policy Considerations for Deep Learning in NLP. ACL 2019.',
    doi: '10.48550/arXiv.1906.02243',
    url: 'https://arxiv.org/abs/1906.02243',
    checked: '2026-09'
  },
  gigerenzer1995: {
    tag: 'Gigerenzer & Hoffrage 1995',
    cite: 'Gigerenzer, G. & Hoffrage, U. (1995). How to improve Bayesian reasoning without instruction: frequency formats. Psychological Review 102(4):684-704.',
    doi: '10.1037/0033-295X.102.4.684',
    url: 'https://doi.org/10.1037/0033-295X.102.4.684',
    checked: '2026-09'
  },
  fawcett2006: {
    tag: 'Fawcett 2006',
    cite: 'Fawcett, T. (2006). An introduction to ROC analysis. Pattern Recognition Letters 27:861-874.',
    doi: '10.1016/j.patrec.2005.10.010',
    url: 'https://doi.org/10.1016/j.patrec.2005.10.010',
    checked: '2026-09'
  },
  saito2015: {
    tag: 'Saito & Rehmsmeier 2015',
    cite: 'Saito, T. & Rehmsmeier, M. (2015). The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets. PLOS ONE 10:e0118432.',
    doi: '10.1371/journal.pone.0118432',
    url: 'https://doi.org/10.1371/journal.pone.0118432',
    checked: '2026-09'
  },
  niculescu2005: {
    tag: 'Niculescu-Mizil & Caruana 2005',
    cite: 'Niculescu-Mizil, A. & Caruana, R. (2005). Predicting good probabilities with supervised learning. Proceedings of the 22nd International Conference on Machine Learning (ICML), 625-632.',
    doi: '10.1145/1102351.1102430',
    url: 'https://doi.org/10.1145/1102351.1102430',
    checked: '2026-09'
  },
  guo2017: {
    tag: 'Guo et al. 2017',
    cite: 'Guo, C., Pleiss, G., Sun, Y. & Weinberger, K. Q. (2017). On calibration of modern neural networks. Proceedings of the 34th International Conference on Machine Learning, PMLR 70:1321-1330.',
    url: 'https://proceedings.mlr.press/v70/guo17a.html',
    checked: '2026-09'
  },
  street1993: {
    tag: 'Street et al. 1993',
    cite: 'Street, W. N., Wolberg, W. H. & Mangasarian, O. L. (1993). Nuclear feature extraction for breast tumor diagnosis. Proc. SPIE 1905, Biomedical Image Processing and Biomedical Visualization, 861-870.',
    doi: '10.1117/12.148698',
    url: 'https://doi.org/10.1117/12.148698',
    checked: '2026-09'
  },
  altman1994sens: {
    tag: 'Altman & Bland 1994a',
    cite: 'Altman, D. G. & Bland, J. M. (1994). Diagnostic tests 1: Sensitivity and specificity. BMJ 308:1552.',
    doi: '10.1136/bmj.308.6943.1552',
    url: 'https://pubmed.ncbi.nlm.nih.gov/8019315/',
    checked: '2026-09'
  },
  altman1994pv: {
    tag: 'Altman & Bland 1994b',
    cite: 'Altman, D. G. & Bland, J. M. (1994). Diagnostic tests 2: Predictive values. BMJ 309:102.',
    doi: '10.1136/bmj.309.6947.102',
    url: 'https://pubmed.ncbi.nlm.nih.gov/8038641/',
    checked: '2026-09'
  },
  trevethan2017: {
    tag: 'Trevethan 2017',
    cite: 'Trevethan, R. (2017). Sensitivity, Specificity, and Predictive Values: Foundations, Pliabilities, and Pitfalls in Research and Practice. Frontiers in Public Health 5:307.',
    doi: '10.3389/fpubh.2017.00307',
    url: 'https://pubmed.ncbi.nlm.nih.gov/29209603/',
    checked: '2026-09'
  },
  vanCalster2019: {
    tag: 'Van Calster et al. 2019',
    cite: 'Van Calster, B., McLernon, D. J., van Smeden, M., Wynants, L. & Steyerberg, E. W. (2019). Calibration: the Achilles heel of predictive analytics. BMC Medicine 17:230.',
    doi: '10.1186/s12916-019-1466-7',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31842878/',
    checked: '2026-09'
  },
  sklearnCalibration: {
    tag: 'scikit-learn: Probability calibration',
    cite: 'scikit-learn developers. User Guide, section 1.16: Probability calibration (calibration_curve, CalibrationDisplay, CalibratedClassifierCV).',
    url: 'https://scikit-learn.org/stable/modules/calibration.html',
    checked: '2026-09'
  },
  openfdaDownloads: {
    tag: 'openFDA downloads',
    cite: 'U.S. Food and Drug Administration. openFDA bulk downloads: food enforcement export (the Week 5 snapshot uses the export with last_updated 2026-09-28).',
    url: 'https://open.fda.gov/data/downloads/',
    checked: '2026-10'
  },
  fdaRecallDefinitions: {
    tag: 'FDA recall classes',
    cite: 'U.S. Food and Drug Administration. Recalls Background and Definitions (Class I, II and III).',
    url: 'https://www.fda.gov/safety/industry-guidance-recalls/recalls-background-and-definitions',
    checked: '2026-10'
  },
  manningIR2008: {
    tag: 'Manning et al. 2008, ch. 13',
    cite: 'Manning, C. D., Raghavan, P. & Schütze, H. (2008). Introduction to Information Retrieval, chapter 13: Text classification and Naive Bayes. Cambridge University Press. Free online edition.',
    url: 'https://nlp.stanford.edu/IR-book/html/htmledition/text-classification-and-naive-bayes-1.html',
    checked: '2026-10'
  },
  jurafskySLP: {
    tag: 'Jurafsky & Martin, SLP3',
    cite: 'Jurafsky, D. & Martin, J. H. Speech and Language Processing (3rd edition draft), chapter "Naive Bayes, Text Classification, and Sentiment". Free online draft.',
    url: 'https://web.stanford.edu/~jurafsky/slp3/',
    checked: '2026-10'
  },
  domingos1997: {
    tag: 'Domingos & Pazzani 1997',
    cite: 'Domingos, P. & Pazzani, M. (1997). On the optimality of the simple Bayesian classifier under zero-one loss. Machine Learning 29, 103-130.',
    doi: '10.1023/A:1007413511361',
    url: 'https://doi.org/10.1023/A:1007413511361',
    checked: '2026-10'
  },
  reimers2019: {
    tag: 'Reimers & Gurevych 2019',
    cite: 'Reimers, N. & Gurevych, I. (2019). Sentence-BERT: Sentence embeddings using Siamese BERT-networks. Proceedings of EMNLP-IJCNLP 2019, 3980-3990.',
    doi: '10.18653/v1/D19-1410',
    url: 'https://doi.org/10.18653/v1/D19-1410',
    checked: '2026-10'
  },
  minilm: {
    tag: 'all-MiniLM-L6-v2',
    cite: 'sentence-transformers/all-MiniLM-L6-v2: model card on the Hugging Face Hub (Apache-2.0). Used in Week 5 at revision 1110a243fdf4706b3f48f1d95db1a4f5529b4d41.',
    url: 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2',
    checked: '2026-10'
  },
  sklearnNB: {
    tag: 'scikit-learn: Naive Bayes',
    cite: 'scikit-learn developers. User Guide: Naive Bayes (MultinomialNB, BernoulliNB, ComplementNB, GaussianNB).',
    url: 'https://scikit-learn.org/stable/modules/naive_bayes.html',
    checked: '2026-10'
  },
  sklearnText: {
    tag: 'scikit-learn: Text feature extraction',
    cite: 'scikit-learn developers. User Guide: Feature extraction, text feature extraction (CountVectorizer, TfidfVectorizer).',
    url: 'https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction',
    checked: '2026-10'
  }
};
