# Week 11 lab: boosting, pretrained protein embeddings and fine-tuning, on one biological question

```
COMP9085_Week11_Lab.ipynb               the notebook (no answers): 10 tasks in three parts, about two hours
COMP9085_Week11_Lab.html                the same notebook, rendered for reading in a browser
COMP9085_Week11_FineTuning_Demo.ipynb   OPTIONAL demonstration: one LoRA fine-tuning of ESM-2 8M (needs PyTorch)
COMP9085_Week11_FineTuning_Demo.html    the demonstration, rendered with its recorded output
data/                                   the Week 7 proteins, two ESM-2 embeddings and the recorded fine-tuning runs (see data/README.md)
```

**Task.** Does a human protein carry an N-terminal signal peptide (UniProt keyword KW-0732)? Designed descriptors with a
tree, a forest and gradient boosting; frozen ESM-2 embeddings with a simple head; and recorded LoRA and full fine-tuning
runs, all on the same proteins and the same protocol.

**Requirements (the lab).** Python 3.10+, numpy, pandas, matplotlib, scikit-learn ≥ 1.3. No GPU and no deep-learning
package: the embeddings and the fine-tuning runs are precomputed. Keep `data/` next to the notebook; in Google Colab the
notebook downloads the files from the course website. It runs in a few minutes on a laptop.

**Requirements (the optional demonstration).** `torch`, `transformers`, `peft` (CPU is enough). The first run downloads
`facebook/esm2_t6_8M_UR50D` (about 30 MB, MIT licence) from Hugging Face. About five minutes on a laptop CPU. Students
are not expected to implement fine-tuning independently.

XGBoost is mentioned in the lecture but not required: on macOS it also needs the OpenMP runtime (`brew install libomp`).
The lab uses scikit-learn's `HistGradientBoostingClassifier`, the same histogram-based family of algorithm.

The matching website exercises are on the Week 11 page:
https://hafli.github.io/comp9085-ml-biology/weeks/week11.html

Numbers: `data/scripts/27_build_week11_finetune.py` (embeddings, fine-tuning, zero-shot; module team, needs PyTorch) and
`data/scripts/28_build_week11_data.py` (everything else; scikit-learn only). The notebooks are built by the course lab
builder (kept with the instructor materials, not in this repository). Instructor solutions are released on Canvas after
the lab; they are not in this repository.
