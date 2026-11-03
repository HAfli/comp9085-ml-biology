# Week 7 dataset: 2,000 human Swiss-Prot proteins with ESM-2 embeddings

Real proteins, real annotations and real foundation-model embeddings, frozen so every
student gets the same data and every number in the lecture can be reproduced. The lab
never downloads anything and needs no deep-learning package.

## Source

| | |
|---|---|
| Sequences and annotations | UniProtKB/Swiss-Prot (reviewed entries), release **2026_03** (2 September 2026), UniProt Consortium |
| Query | `(reviewed:true) AND (organism_id:9606) AND (fragment:false)`: every reviewed, complete human entry (20,430) |
| Redundancy clusters | UniRef50 cluster of each entry, from the UniProt ID-mapping service |
| Embedding model | ESM-2, `facebook/esm2_t6_8M_UR50D` (6 layers, about 8 million parameters, 320 dimensions), Hugging Face revision `c731040fcd8d73dceaa04b0a8e6329b345b0f5df` |
| Downloaded and computed | 2026-11-01, on CPU, by the module team (`data/scripts/15_build_week07_data.py --freeze`) |
| Checksums, versions | `PROVENANCE.json` |
| Licences | UniProt data CC BY 4.0; ESM-2 weights MIT |

**Cite as:** The UniProt Consortium (2025). UniProt: the Universal Protein Knowledgebase in
2025. *Nucleic Acids Research* 53:D609–D617. doi:10.1093/nar/gkae1010. And for the model:
Lin, Z. et al. (2023). Evolutionary-scale prediction of atomic-level protein structure with
a language model. *Science* 379:1123–1130. doi:10.1126/science.ade2574.

## How the 2,000 proteins were chosen

| Step | Proteins left |
|---|---|
| Reviewed, complete human entries | 20,430 |
| With a UniRef50 cluster from the ID-mapping service | 19,748 |
| Length 50 to 1,000 residues | 17,324 |
| Only the 20 standard amino acids (no U, X, …) | 17,299 |
| **One protein per UniRef50 cluster** (seeded random choice) | 16,139 |
| Seeded random sample (`seed 9085`) | **2,000** |

Keeping one protein per UniRef50 cluster means no two proteins in the set belong to the same
cluster of sequences sharing at least 50% identity, so close homologues cannot sit on both
sides of a train/test split. It does not remove all relatedness: members of large families
(for example the olfactory receptors) fall in different clusters and remain distant
relatives.

## Files and columns

`swissprot_human_2000.csv`: one row per protein.

| Column | Meaning |
|---|---|
| `accession` | UniProtKB accession (look it up at `https://www.uniprot.org/uniprotkb/<accession>`) |
| `entry_name`, `protein_name`, `gene` | UniProt entry name, recommended name(s), primary gene name |
| `length` | Number of residues |
| `uniref50` | UniRef50 cluster identifier (unique in this file) |
| `is_transmembrane` | 1 if the entry has keyword **KW-0812 Transmembrane** (488 proteins, 24.4%) |
| `has_signal_peptide` | 1 if the entry has keyword **KW-0732 Signal** (350 proteins, 17.5%); 128 proteins have both |
| `tm_evidence`, `sp_evidence` | Strongest evidence behind the annotated TRANSMEM / SIGNAL features: `experimental` (ECO:0000269 or ECO:0007744) > `by similarity` (ECO:0000250) > `curator inference` (ECO:0000305) > `sequence analysis` (ECO:0000255); `no evidence code` if the feature carries none; `none` if the protein has no such feature |
| `sequence` | Amino-acid sequence, one letter per residue |
| `shuffled_sequence` | The same residues in random order (numpy `default_rng(9085)`, applied in row order): identical composition, order destroyed |

`esm2_t6_8M_embeddings.csv.gz`: `accession` plus 320 columns `e000`–`e319`. For each
sequence, the final hidden layer of ESM-2, averaged over residue positions (the start,
end and padding tokens are excluded), rounded to 5 decimal places.
`esm2_t6_8M_embeddings_shuffled.csv.gz`: the same, computed from `shuffled_sequence`.
pandas reads the `.csv.gz` files directly.

## Things to know before you analyse it

- **Where the labels come from.** Most features behind the labels carry the "sequence
  analysis" evidence code: 425 of 488 transmembrane and 237 of 350 signal-peptide labels.
  UniProt annotates predicted signal peptides when at least two of Phobius, Predotar,
  SignalP and TargetP agree, and annotates predicted transmembrane regions when several
  tools agree and the prediction is consistent with the protein's function; it also uses
  "sequence analysis" for the *boundaries* of experimentally supported transmembrane regions
  ([uniprot.org/help/signal](https://www.uniprot.org/help/signal),
  [uniprot.org/help/transmem](https://www.uniprot.org/help/transmem)). So a model trained on
  these labels learns partly to agree with sequence-analysis tools. Only 33 transmembrane and
  81 signal-peptide labels rest on experimental evidence.
- **Negatives are "not annotated", not "shown to be absent".** A protein without the keyword
  may still be membrane-associated (for example anchored by a hairpin or a lipid) or be
  incompletely annotated.
- **Pretraining contamination.** ESM-2 was pretrained on UniRef sequences, which almost
  certainly include these proteins. Pretraining used sequences only, never these labels, so
  this is not label leakage, but the model has seen these sequences before.
- **Human proteins only**, of 50–1,000 residues. Results need not transfer to other
  organisms, to very long proteins, or to proteins added to UniProt after ESM-2 was trained.
- **Simulated data elsewhere on the site.** The protein explorer on the course website uses
  a separate, *simulated* teaching set (`js/data/sequences.js`). This folder is real data.

## Rebuilding

```bash
# everyone, no network: recompute every Week 7 number from these files
python3 data/scripts/15_build_week07_data.py
# module team only, with network, torch and transformers: re-download and re-freeze
python3 data/scripts/15_build_week07_data.py --freeze /path/outside/repo/uniprot_raw
```

Re-freezing against a later UniProt release will give a different sample and different
numbers; the frozen files here are what the course quotes.
