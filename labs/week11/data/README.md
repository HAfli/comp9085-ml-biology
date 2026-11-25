# Week 11 data

The **Week 7 proteins**: 2,000 reviewed human UniProtKB/Swiss-Prot proteins (release 2026_03), one per UniRef50 cluster.
The selection, licences and citations are described in [`../../week07/data/README.md`](../../week07/data/README.md).
Three files are unchanged copies; two are new for Week 11. Checksums are in `PROVENANCE.json`.

| File | Contents |
|---|---|
| `swissprot_human_2000.csv` | Copy of `labs/week07/data/`: accession, names, gene, length, UniRef50 cluster, `is_transmembrane`, `has_signal_peptide` (UniProt keywords KW-0812, KW-0732), the evidence behind each annotation (`tm_evidence`, `sp_evidence`), the sequence and a shuffled control sequence. |
| `proteins_classical_features.csv` | Copy of `labs/week10/data/`: the labels and the 23 classical descriptors of Week 7 (20 amino-acid fractions, `log_length`, `max_hydropathy_19`, `nterm_hydropathy_25`), in the Week 7 row order. |
| `esm2_t6_8M_embeddings.csv.gz` | Copy of `labs/week07/data/`: ESM-2 8M (`facebook/esm2_t6_8M_UR50D`), final layer, mean over all residues of the **whole sequence**; 320 columns `e000`–`e319`. |
| `esm2_t6_8M_nterm100_embeddings.csv.gz` | **New.** The same model at the same revision, given only the **first 100 residues** of each protein, final layer averaged over those residues; 320 columns `n000`–`n319`. |
| `week11_finetune_results.json` | **New.** The recorded fine-tuning experiment: LoRA (rank 8, query and value, plus the classification head) and full fine-tuning of ESM-2 8M on the first 100 residues; for each, the learning-rate tuning runs, the chosen rate, three seeds with validation curves, best epoch, test ROC AUC, test probabilities for the 500 test proteins, trainable and total parameters and timings; the two frozen-embedding heads under the same protocol; and the zero-shot masked-marginal scan of the insulin signal peptide (P01308, residues 1–24). |

**Protocol of the new files.** Test set: the Week 7 split (500 proteins, stratified on both labels, seed 42). The 1,500
training proteins are split 1,200 fit / 300 validation (stratified on the signal-peptide label, seed 42); every setting
(learning rate, epoch, the C of a logistic head) was chosen on validation ROC AUC; the test proteins were scored once per
pipeline. Computed on 24 November 2026 on an Apple M1 Max laptop, CPU only, by
`data/scripts/27_build_week11_finetune.py`; library versions are recorded inside the JSON file. Re-running on other
hardware or library versions can change fine-tuning numbers slightly.

**Things to know.**
- The signal-peptide labels are UniProt annotations, mostly from sequence analysis (agreement of prediction tools) rather
  than experiment: annotations, not ground truth. A protein without the keyword is "not annotated", not "shown to lack".
- ESM-2 was pretrained on UniRef sequences that almost certainly include these proteins. Pretraining never used these
  labels, but the model has seen the sequences.
- The zero-shot scan is an illustration on one protein with the smallest ESM-2 model, not a validated variant-effect
  prediction.

Licences: UniProt data CC BY 4.0; ESM-2 weights MIT.
