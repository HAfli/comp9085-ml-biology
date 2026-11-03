# COMP9085 Week 8 lab: instance-based learning (k-NN) on real patients

| File | What it is |
|---|---|
| `COMP9085_Week08_Lab.ipynb` | The lab notebook (open in Jupyter or VS Code) |
| `COMP9085_Week08_Lab.html` | The same notebook, readable in a browser |
| `data/heart_disease_cleveland.csv` | UCI Heart Disease, Cleveland subset: 303 patients (CC BY 4.0) |
| `data/README.md`, `data/PROVENANCE.json` | Column definitions, source, licence, checksums |

**Run it.** Keep the `data/` folder next to the notebook, then **Kernel → Restart & Run All**.
Needs Python 3.10+ with numpy, pandas, matplotlib and scikit-learn ≥ 1.2. No network, no GPU.
Tested with Python 3.13.1, scikit-learn 1.9.1, pandas 3.1.0, numpy 2.5.4, matplotlib 3.11.

**Structure (two hours).** Tasks 1–10 are the core lab: data exploration, baseline, k-NN in a
Pipeline, the effect of k, distance metrics and categorical representation, scaling, model
selection by cross-validation, distance weighting, one final test evaluation, and reflection.
Extensions A–C (k-NN regression, k-NN from scratch, a heterogeneous distance) are optional.

**Interactive companion.** https://hafli.github.io/comp9085-ml-biology/weeks/week08.html:
section 10 maps each task to the exercise that shows the same idea with the same data.

Solutions are released on Canvas after the lab; they are not on the public site.
