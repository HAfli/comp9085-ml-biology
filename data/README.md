# Data

This folder contains the scripts that generate everything the site loads. The
generated files themselves live in `js/data/` so the browser can load them as
plain scripts, which is what lets the site work from the filesystem with no
server and no CORS configuration.

## What is real and what is not

| Generated file | Status | Source |
|---|---|---|
| `js/data/wdbc.js` | **Real measured data** | UCI Breast Cancer Wisconsin (Diagnostic), 569 × 30, CC BY 4.0, via scikit-learn |
| `js/data/benchmarks.js` | **Real measured results** | scikit-learn runs on the above, fixed seed, protocol recorded in the file |
| `js/data/sequences.js` | **Simulated** | Generated from hand-specified position-weight matrices; the embedding is a documented simulation |
| `js/data/recalls.js` | **Illustrative** | Generated from hand-written phrase templates; not real FDA records. No longer used by the Week 5 page |
| `js/data/week04.js` | **Mixed, labelled per figure** | `data/scripts/08_build_week04_data.py`: exact diagnostic-test arithmetic (hypothetical), two seeded illustrative simulations (threshold, calibration), and real WDBC results. The same numbers feed the Week 4 deck and lab |
| `js/data/week05.js`, `js/data/week05_corpus.js` | **Real (frozen snapshot), plus one labelled illustrative example** | `data/scripts/10_build_week05_data.py`: openFDA food enforcement export (last_updated 2026-09-28, checksum in `labs/week05/data/PROVENANCE.json`), de-duplicated to one row per event–reason–classification record; all Week 5 metrics, plus the hand-worked four-word example (illustrative). `11_build_week05_lm_comparison.py` (optional, needs PyTorch) adds the stored pretrained-encoder comparison. The same numbers feed the Week 5 deck and lab |

Every figure on the site displays this status, and the banners are read from
flags inside the files rather than written by hand, so they cannot drift out of
step with the data.

## Regenerating

```bash
pip install numpy pandas scikit-learn

python3 data/scripts/01_build_wdbc.py
python3 data/scripts/02_build_benchmarks.py    # a minute or two
python3 data/scripts/03_build_sequences.py
python3 data/scripts/05_build_recalls.py
python3 data/scripts/08_build_week04_data.py
python3 data/scripts/09_build_week04_lab.py      # needs nbformat, nbconvert, ipykernel
python3 data/scripts/10_build_week05_data.py     # analyses the frozen snapshot in labs/week05/data/
python3 data/scripts/12_build_week05_lab.py      # needs nbformat, nbconvert, ipykernel
```

## Substituting real ESM-2 embeddings

```bash
pip install torch transformers
python3 data/scripts/04_real_esm2_embeddings.py
```

Needs internet and about 100 MB of downloads; runs on a CPU. It replaces the
simulated embedding with genuine mean-pooled ESM-2 output and sets
`simulatedEmbedding: false`, at which point the site's banners update themselves.
The sequences remain simulated and the site continues to say so.

## Sample data

`data/sample/` holds a small extract for anyone who wants to look at the shape
of the data without running the browser or the scripts.
