#!/usr/bin/env python3
"""
COMP9085 build script 11 (OPTIONAL): a small, reproducible pretrained-language-
model comparison for Week 5.

Students never run this. It is run once by the module team, and only its
RESULTS (metrics and timings) are stored, in data/scripts/week05_lm_comparison.json,
which script 10 then folds into the website and lecture numbers. The Week 5 lab
does not depend on it.

What it compares, on exactly the Week 5 split
---------------------------------------------
    Text -> pretrained sentence encoder (frozen) -> 384-d embedding
         -> LogisticRegression (trained on the Week 5 training rows) -> Class I?

Model: sentence-transformers/all-MiniLM-L6-v2, pinned to a fixed revision below.
It is a small general-English sentence encoder (about 22.7M parameters), not a
food-safety or clinical model. No API key, no paid service; the weights are
downloaded once from the Hugging Face Hub at the pinned revision.

Requirements (a separate environment is fine):
    pip install torch --index-url https://download.pytorch.org/whl/cpu
    pip install sentence-transformers scikit-learn pandas

    python3 data/scripts/11_build_week05_lm_comparison.py
"""
import json
import os
import time

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score,
                             brier_score_loss, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedGroupKFold

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CSV = os.path.join(ROOT, "labs", "week05", "data", "openfda_food_recall_events.csv")
OUT = os.path.join(ROOT, "data", "scripts", "week05_lm_comparison.json")
MODEL = "sentence-transformers/all-MiniLM-L6-v2"
REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"   # Hub commit, licence Apache-2.0
SEED = 42


def r(x, d=4):
    return round(float(x), d)


def main():
    import torch
    from sentence_transformers import SentenceTransformer
    torch.manual_seed(SEED)
    ev = pd.read_csv(CSV, keep_default_na=False)
    X, y, g = ev.reason_for_recall.tolist(), ev.is_class_I.values, ev.event_id.values
    tr, te = next(StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=SEED).split(X, y, g))

    t0 = time.time()
    enc = SentenceTransformer(MODEL, revision=REVISION, device="cpu")
    n_params = sum(p.numel() for p in enc.parameters())
    from huggingface_hub import hf_hub_download
    weights = hf_hub_download(MODEL, "model.safetensors", revision=REVISION)
    weights_mb = os.path.getsize(weights) / 1e6
    t_load = time.time() - t0
    t0 = time.time()
    E = enc.encode(X, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    t_embed = time.time() - t0
    t0 = time.time()
    clf = LogisticRegression(max_iter=2000, C=1.0).fit(E[tr], y[tr])
    t_fit = time.time() - t0
    p = clf.predict_proba(E[te])[:, 1]
    pr = (p >= 0.5).astype(int)

    # naive Bayes timing on the same machine, for a like-for-like cost column
    from sklearn.feature_extraction.text import CountVectorizer
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.pipeline import Pipeline
    t0 = time.time()
    nb = Pipeline([("vectorizer", CountVectorizer()), ("classifier", MultinomialNB())])
    nb.fit([X[i] for i in tr], y[tr]).predict_proba([X[i] for i in te])
    t_nb = time.time() - t0

    out = {
        "model": MODEL, "revision": REVISION, "parameters": int(n_params),
        "embeddingDimension": int(E.shape[1]), "weightsMB": r(weights_mb, 1),
        "classifier": "LogisticRegression(C=1.0, max_iter=2000) on L2-normalised embeddings",
        "split": "identical to Week 5 (StratifiedGroupKFold, 4 folds, seed 42, first fold, groups = event_id)",
        "accuracy": r(accuracy_score(y[te], pr)), "precision": r(precision_score(y[te], pr)),
        "recall": r(recall_score(y[te], pr)), "f1": r(f1_score(y[te], pr)),
        "rocAuc": r(roc_auc_score(y[te], p)), "averagePrecision": r(average_precision_score(y[te], p)),
        "brier": r(brier_score_loss(y[te], p)),
        "fractionExtreme": r(np.mean((p < 0.05) | (p > 0.95))),
        "seconds": {"loadModel": r(t_load, 1), "embedAllTexts": r(t_embed, 1),
                    "fitClassifier": r(t_fit, 2), "naiveBayesFitAndPredict": r(t_nb, 2)},
        "hardware": "CPU only (laptop), single run; timings are indicative, not benchmarks",
    }
    with open(OUT, "w") as f:
        json.dump(out, f, indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
