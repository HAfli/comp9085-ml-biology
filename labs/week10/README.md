# Week 10 lab: random forests, honest importances, and a pretrained protein embedding

```
COMP9085_Week10_Lab.ipynb   the notebook (no answers): 9 core tasks + 3 optional extensions, about two hours
COMP9085_Week10_Lab.html    the same notebook, rendered for reading in a browser
data/                       the Week 7 proteins: descriptors and labels, ESM-2 embeddings, shuffled control (see data/README.md)
```

WDBC (569 tumours, 30 features) ships with scikit-learn, so it needs no file. Keep `data/` next to the notebook; in
Google Colab the notebook downloads the protein files from the course website. Requirements: Python 3.10+, numpy,
pandas, matplotlib, scikit-learn ≥ 1.3. No GPU. The complete notebook runs in two to four minutes on a laptop.

The matching website exercises are on the Week 10 page:
https://hafli.github.io/comp9085-ml-biology/weeks/week10.html

Built by the course lab builder (kept with the instructor materials, not in this repository) from the numbers in `data/scripts/week10_numbers.json`
(`24_build_week10_data.py`). Instructor solutions are released on Canvas after the lab; they are not in this repository.
