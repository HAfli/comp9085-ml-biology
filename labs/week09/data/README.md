# Week 9 data

Two derived files from the **Week 7 dataset** (2,000 reviewed human UniProtKB/Swiss-Prot proteins, release 2026_03,
one per UniRef50 cluster, with ESM-2 embeddings). The full description, selection steps, licences and citations are in
[`../../week07/data/README.md`](../../week07/data/README.md). Nothing here was downloaded anew.

| File | Contents |
|---|---|
| `proteins_classical_features.csv` | accession, entry name, protein name, gene, length, `has_signal_peptide`, `is_transmembrane` (UniProt keywords KW-0732, KW-0812), and the 23 classical descriptors of Week 7: 20 amino-acid fractions (`frac_A` …), `log_length`, `max_hydropathy_19` (highest mean Kyte–Doolittle hydropathy over a 19-residue window), `nterm_hydropathy_25` (mean hydropathy of the first 25 residues). Computed by `features()` in `data/scripts/20_build_week07_refresh.py`, written at full precision. |
| `esm2_t6_8M_embeddings.csv.gz` | An unchanged copy of the Week 7 file: mean-pooled ESM-2 (`facebook/esm2_t6_8M_UR50D`) embeddings, 320 dimensions. |
| `PROVENANCE.json` | SHA-256 checksums of these files and of the Week 7 files they derive from. |

**WDBC** is not stored here: it is the UCI Breast Cancer Wisconsin (Diagnostic) dataset (doi:10.24432/C5DW2B,
CC BY 4.0) shipped with scikit-learn as `load_breast_cancer()`.

The labels are UniProt annotations, many from sequence analysis rather than experiment: treat them as annotations, not
ground truth. Licences: UniProt data CC BY 4.0; ESM-2 weights MIT.
