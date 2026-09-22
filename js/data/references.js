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
  }
};
