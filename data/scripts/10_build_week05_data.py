#!/usr/bin/env python3
"""
Week 5: the frozen openFDA food-recall snapshot, and every number the Week 5
lecture, website and lab report, computed once.

Two modes
---------
1. Freeze a snapshot (run once, by the module team, with network access):

       curl -O https://download.open.fda.gov/food/enforcement/food-enforcement-0001-of-0001.json.zip
       python3 data/scripts/10_build_week05_data.py --zip food-enforcement-0001-of-0001.json.zip

   This writes labs/week05/data/openfda_food_recall_events.csv and records the
   export date, openFDA last_updated date, record count and SHA-256 of the zip
   in labs/week05/data/PROVENANCE.json.

2. Rebuild every number from the frozen snapshot (no network):

       python3 data/scripts/10_build_week05_data.py

Outputs
    labs/week05/data/openfda_food_recall_events.csv  the frozen, event-level dataset
    labs/week05/data/PROVENANCE.json                 where and when it came from
    data/scripts/week05_numbers.json                 every reported number
    js/data/week05.js                                numbers for the website
    js/data/week05_corpus.js                         texts, labels and split for the
                                                     in-browser naive Bayes explorer

What one row is
---------------
The openFDA food enforcement export has one record per recalled PRODUCT. A single
recall event can cover hundreds of products that share one reason_for_recall
text. Training and testing on product records would put identical texts on both
sides of the split (Week 3: the unit of observation). One row here is therefore
an event-reason-classification record: rows are de-duplicated on
(event_id, reason_for_recall, classification), and n_product_records keeps the
count. Most event-reason pairs have one classification; a few carry more than one
(real label conflicts, kept deliberately: the text alone does not necessarily
determine the label). The split is stratified and grouped by event_id, so no
event, and therefore no conflicting pair, appears on both sides.

Target
------
is_class_I = 1 if FDA classified the recall as Class I ("a reasonable probability
that the use of or exposure to a violative product will cause serious adverse
health consequences or death"), else 0 (Class II or Class III). Records "Not Yet
Classified" are dropped. The label is FDA's administrative classification, not a
measured health outcome.

Text
----
reason_for_recall, with runs of whitespace collapsed and ends stripped. Nothing
else is changed: encoding artefacts in the source (for example "Nestl¿") are kept.
"""
import argparse
import hashlib
import json
import os
import re
import zipfile

import numpy as np
import pandas as pd
import sklearn
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.metrics import (accuracy_score, average_precision_score,
                             brier_score_loss, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedGroupKFold, train_test_split
from sklearn.naive_bayes import BernoulliNB, MultinomialNB
from sklearn.pipeline import Pipeline

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(ROOT, "labs", "week05", "data")
CSV = os.path.join(DATA_DIR, "openfda_food_recall_events.csv")
PROV = os.path.join(DATA_DIR, "PROVENANCE.json")
RAWCOUNTS = os.path.join(DATA_DIR, "product_record_counts.json")
SEED = 42
SIM = "Illustrative simulation — not a biological dataset."
REAL = ("Real openFDA food-recall data (frozen snapshot), used for classroom "
        "evaluation. The label is FDA's administrative hazard classification.")


def r(x, d=4):
    return round(float(x), d)


def clean(t):
    return re.sub(r"\s+", " ", str(t)).strip()


# ------------------------------------------------------------- freezing
def freeze(zip_path):
    with open(zip_path, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()
    with zipfile.ZipFile(zip_path) as z:
        name = z.namelist()[0]
        payload = json.loads(z.read(name))
    raw = pd.DataFrame(payload["results"])
    n_all = len(raw)
    raw = raw[raw.classification.isin(["Class I", "Class II", "Class III"])].copy()
    raw["reason_for_recall"] = raw.reason_for_recall.map(clean)
    raw = raw[raw.reason_for_recall != ""]
    # product-record-level counts, kept so the leakage demonstration can be rebuilt
    counts = (raw.groupby(["event_id", "reason_for_recall", "classification"])
              .size().rename("n_product_records").reset_index())
    first = (raw.sort_values("report_date")
             .groupby(["event_id", "reason_for_recall", "classification"])
             .report_date.first().reset_index())
    ev = counts.merge(first, on=["event_id", "reason_for_recall", "classification"])
    ev["is_class_I"] = (ev.classification == "Class I").astype(int)
    ev["report_date"] = pd.to_datetime(ev.report_date, format="%Y%m%d").dt.strftime("%Y-%m-%d")
    ev = ev.sort_values(["event_id", "reason_for_recall"]).reset_index(drop=True)
    ev = ev[["event_id", "report_date", "classification", "is_class_I",
             "n_product_records", "reason_for_recall"]]
    os.makedirs(DATA_DIR, exist_ok=True)
    ev.to_csv(CSV, index=False)
    prov = {
        "source": "openFDA food enforcement bulk export (U.S. Food and Drug Administration)",
        "download_url": "https://download.open.fda.gov/food/enforcement/food-enforcement-0001-of-0001.json.zip",
        "api_documentation": "https://open.fda.gov/apis/food/enforcement/",
        "licence": "Public domain (CC0 1.0); see https://open.fda.gov/license/",
        "openfda_disclaimer": payload["meta"].get("disclaimer"),
        "openfda_last_updated": payload["meta"].get("last_updated"),
        "zip_sha256": sha,
        "product_records_in_export": n_all,
        "product_records_kept": int(len(raw)),
        "dropped": "records not yet classified, or with an empty reason_for_recall",
        "event_level_rows": int(len(ev)),
        "recall_events": int(ev.event_id.nunique()),
        "report_date_range": [ev.report_date.min(), ev.report_date.max()],
        "unit_of_observation": "an event-reason-classification record: one row per distinct (event_id, reason_for_recall, classification)",
        "text_preparation": "whitespace collapsed and stripped; nothing else changed",
        "target": "is_class_I = 1 for Class I, 0 for Class II or Class III",
    }
    with open(PROV, "w") as f:
        json.dump(prov, f, indent=1)
    raw_counts = {"product_records": int(len(raw))}
    with open(RAWCOUNTS, "w") as f:
        json.dump(raw_counts, f)
    print("froze", len(ev), "event-level rows from", n_all, "product records")


# ------------------------------------------------------------- analysis
def metrics(y, p, t=0.5):
    pr = (p >= t).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pr).ravel()
    return {"accuracy": r(accuracy_score(y, pr)), "precision": r(precision_score(y, pr)),
            "recall": r(recall_score(y, pr)), "f1": r(f1_score(y, pr)),
            "rocAuc": r(roc_auc_score(y, p)), "averagePrecision": r(average_precision_score(y, p)),
            "brier": r(brier_score_loss(y, p)),
            "fractionExtreme": r(np.mean((p < 0.05) | (p > 0.95))),
            "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn)}


def worked_example():
    """The lecture's hand calculation: two classes, four words, Laplace +1."""
    counts = {"Class I": {"listeria": 3, "undeclared": 3, "label": 1, "packaging": 1},
              "Class II/III": {"listeria": 0, "undeclared": 1, "label": 4, "packaging": 5}}
    prior = {"Class I": 0.4, "Class II/III": 0.6}
    vocab = ["listeria", "undeclared", "label", "packaging"]
    lik = {}
    for c, cnt in counts.items():
        tot = sum(cnt.values())
        lik[c] = {w: (cnt[w] + 1) / (tot + len(vocab)) for w in vocab}

    def post(words):
        s = {c: prior[c] * np.prod([lik[c][w] for w in words]) for c in prior}
        z = sum(s.values())
        return {c: s[c] / z for c in s}, s
    p1, s1 = post(["undeclared", "label"])
    p2, s2 = post(["undeclared", "label", "listeria"])
    assert abs(p1["Class I"] - 0.4208) < 1e-3 and abs(p2["Class I"] - 0.7720) < 1e-3, (p1, p2)
    return {"label": SIM, "vocab": vocab, "counts": counts, "prior": prior,
            "likelihood": {c: {w: r(v, 4) for w, v in d.items()} for c, d in lik.items()},
            "likelihoodFraction": {c: {w: f"{counts[c][w] + 1}/{sum(counts[c].values()) + 4}"
                                       for w in vocab} for c in counts},
            "doc1": {"words": ["undeclared", "label"], "score": {c: r(v, 5) for c, v in s1.items()},
                     "posterior": {c: r(v, 3) for c, v in p1.items()}},
            "doc2": {"words": ["undeclared", "label", "listeria"],
                     "score": {c: r(v, 5) for c, v in s2.items()},
                     "posterior": {c: r(v, 3) for c, v in p2.items()}}}


def analyse():
    ev = pd.read_csv(CSV, keep_default_na=False)
    prov = json.load(open(PROV))
    X, y, g = ev.reason_for_recall, ev.is_class_I.values, ev.event_id.values
    sgk = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=SEED)
    tr, te = next(sgk.split(X, y, g))
    assert not set(g[tr]) & set(g[te])
    Xtr, Xte, ytr, yte = X.iloc[tr], X.iloc[te], y[tr], y[te]

    def run(pipe):
        pipe.fit(Xtr, ytr)
        return pipe, pipe.predict_proba(Xte)[:, 1]

    main, p = run(Pipeline([("vectorizer", CountVectorizer()),
                            ("classifier", MultinomialNB(alpha=1.0))]))
    m_main = metrics(yte, p)
    vec, nb = main.named_steps["vectorizer"], main.named_steps["classifier"]
    vocab = np.array(vec.get_feature_names_out())
    ratio = nb.feature_log_prob_[1] - nb.feature_log_prob_[0]
    # Only words seen at least 10 times in training, so the list is not
    # dominated by rare words with extreme ratios.
    freq = np.asarray(vec.transform(Xtr).sum(axis=0)).ravel()
    ok = freq >= 10
    order = np.argsort(ratio)
    top1 = [w for w in vocab[order[::-1]] if ok[vec.vocabulary_[w]]][:15]
    top0 = [w for w in vocab[order] if ok[vec.vocabulary_[w]]][:15]
    words = {"classI": [{"word": w, "logRatio": r(ratio[vec.vocabulary_[w]], 3),
                         "trainCount": int(freq[vec.vocabulary_[w]])} for w in top1],
             "notClassI": [{"word": w, "logRatio": r(ratio[vec.vocabulary_[w]], 3),
                            "trainCount": int(freq[vec.vocabulary_[w]])} for w in top0]}
    # The same ranking restricted to words used in at least 20 DIFFERENT training
    # events. Without this filter the top "Class I" words are firm and place
    # names from a handful of large outbreak recalls: an error-analysis lesson
    # in its own right (the model learns who wrote the notice, not only why).
    tr_events = ev.iloc[tr]
    word_events = {}
    analyser = vec.build_analyzer()
    for eid, text in zip(tr_events.event_id, tr_events.reason_for_recall):
        for w in set(analyser(text)):
            word_events.setdefault(w, set()).add(eid)
    n_ev = np.array([len(word_events.get(w, ())) for w in vocab])
    ok20 = n_ev >= 20
    topE1 = [w for w in vocab[order[::-1]] if ok20[vec.vocabulary_[w]]][:15]
    topE0 = [w for w in vocab[order] if ok20[vec.vocabulary_[w]]][:15]
    words["byEvents"] = {
        "minEvents": 20,
        "classI": [{"word": w, "logRatio": r(ratio[vec.vocabulary_[w]], 3),
                    "events": int(n_ev[vec.vocabulary_[w]])} for w in topE1],
        "notClassI": [{"word": w, "logRatio": r(ratio[vec.vocabulary_[w]], 3),
                       "events": int(n_ev[vec.vocabulary_[w]])} for w in topE0]}
    # errors: most confident false positives and false negatives (real test texts)
    test = ev.iloc[te].copy()
    test["p"] = p
    fps = test[(test.is_class_I == 0) & (test.p >= 0.5)].sort_values("p", ascending=False).head(6)
    fns = test[(test.is_class_I == 1) & (test.p < 0.5)].sort_values("p").head(6)
    err = lambda d: [{"text": t, "classification": c, "p": r(q, 4)} for t, c, q in
                     zip(d.reason_for_recall, d.classification, d.p)]
    # probability behaviour on the test set
    edges = np.linspace(0, 1, 11)
    bi = np.clip(np.digitize(p, edges) - 1, 0, 9)
    rel = [{"lo": r(edges[b], 1), "hi": r(edges[b + 1], 1), "n": int((bi == b).sum()),
            "meanPredicted": r(p[bi == b].mean()), "fractionPositive": r(yte[bi == b].mean())}
           for b in range(10) if (bi == b).sum()]
    hist = [int(c) for c in np.histogram(p, bins=edges)[0]]

    variants = {}
    for key, label, pipe in (
            ("count_mnb", "Word counts + MultinomialNB", Pipeline([("vectorizer", CountVectorizer()), ("classifier", MultinomialNB())])),
            ("tfidf_mnb", "TF-IDF + MultinomialNB", Pipeline([("vectorizer", TfidfVectorizer()), ("classifier", MultinomialNB())])),
            ("binary_bnb", "Word presence + BernoulliNB", Pipeline([("vectorizer", CountVectorizer(binary=True)), ("classifier", BernoulliNB())]))):
        _, q = run(pipe)
        variants[key] = {"label": label, **metrics(yte, q)}
    base = max(yte.mean(), 1 - yte.mean())
    variants["majority"] = {"label": "Majority-class baseline (always not Class I)",
                            "accuracy": r(base), "precision": None, "recall": 0.0, "f1": 0.0,
                            "rocAuc": 0.5, "averagePrecision": r(yte.mean()), "brier": None,
                            "fractionExtreme": None}

    # leakage 1: vectorizer fitted on all rows before the split
    leak = {}
    for key, V in (("count", CountVectorizer), ("tfidf", TfidfVectorizer)):
        v_all = V().fit(X)
        q = MultinomialNB().fit(v_all.transform(Xtr), ytr).predict_proba(v_all.transform(Xte))[:, 1]
        v_tr = V().fit(Xtr)
        q_ok = MultinomialNB().fit(v_tr.transform(Xtr), ytr).predict_proba(v_tr.transform(Xte))[:, 1]
        leak[key] = {"vocabularyAll": len(v_all.vocabulary_), "vocabularyTrain": len(v_tr.vocabulary_),
                     "testOnlyWords": len(set(v_all.vocabulary_) - set(v_tr.vocabulary_)),
                     "leaky": metrics(yte, q), "correct": metrics(yte, q_ok)}
    # leakage 2: splitting product records at random (duplicates on both sides)
    rows = ev.loc[ev.index.repeat(ev.n_product_records)].reset_index(drop=True)
    assert len(rows) == json.load(open(RAWCOUNTS))["product_records"]
    Ra, Rb, ya, yb = train_test_split(rows.reason_for_recall, rows.is_class_I.values,
                                      test_size=0.25, stratify=rows.is_class_I.values,
                                      random_state=SEED)
    qa = Pipeline([("vectorizer", CountVectorizer()), ("classifier", MultinomialNB())]).fit(Ra, ya).predict_proba(Rb)[:, 1]
    record_split = {"rows": int(len(rows)), "identicalTextInTrain": r(Rb.isin(set(Ra)).mean(), 3),
                    **metrics(yb, qa)}
    event_identical = r(Xte.isin(set(Xtr)).mean(), 3)

    out = {
        "generatedBy": "data/scripts/10_build_week05_data.py", "sklearnVersion": sklearn.__version__,
        "seed": SEED, "labels": {"real": REAL, "sim": SIM}, "provenance": prov,
        "dataset": {"rows": int(len(ev)), "events": int(ev.event_id.nunique()),
                    "productRecords": int(ev.n_product_records.sum()),
                    "classCounts": ev.classification.value_counts().to_dict(),
                    "positiveRate": r(y.mean()),
                    "wordsPerTextMedian": int(ev.reason_for_recall.str.split().str.len().median()),
                    # event-reason pairs, and how many carry more than one FDA class
                    "eventReasonPairs": int(ev.groupby(["event_id", "reason_for_recall"]).ngroups),
                    "pairsWithMultipleClassifications": int(ev.groupby(["event_id", "reason_for_recall"]).classification.nunique().gt(1).sum()),
                    # ... and how many of those disagree on the binary target (I vs II/III)
                    "eventsWithConflictingLabels": int(ev.groupby(["event_id", "reason_for_recall"]).is_class_I.nunique().gt(1).sum())},
        "split": {"method": "StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=42), first fold; groups = event_id",
                  "train": int(len(tr)), "test": int(len(te)), "testPositiveRate": r(yte.mean()),
                  "sharedEvents": 0, "testTextIdenticalToATrainText": event_identical},
        "vectorizer": {"type": "CountVectorizer() defaults: lowercase, token_pattern (?u)\\b\\w\\w+\\b",
                       "vocabularyTrain": len(vocab)},
        "main": {"label": "Word counts + MultinomialNB(alpha=1.0)", **m_main,
                 "priors": {"notClassI": r(np.exp(nb.class_log_prior_[0])), "classI": r(np.exp(nb.class_log_prior_[1]))}},
        "words": words, "errors": {"falsePositives": err(fps), "falseNegatives": err(fns)},
        "reliability": rel, "histogram": hist, "variants": variants,
        "leakage": {"vectorizer": leak, "recordSplit": record_split},
        "workedExample": worked_example(),
    }
    lm_path = os.path.join(ROOT, "data", "scripts", "week05_lm_comparison.json")
    if os.path.exists(lm_path):
        lm = json.load(open(lm_path))
        lm["label"] = ("Frozen pretrained sentence encoder (%s) + logistic regression; "
                       "computed once by data/scripts/11_build_week05_lm_comparison.py on "
                       "the same split" % lm["model"])
        out["lmComparison"] = lm
    # sanity checks on the headline numbers used in the lecture
    assert out["dataset"]["rows"] == len(ev) and out["split"]["train"] + out["split"]["test"] == len(ev)
    assert m_main["tp"] + m_main["fn"] == int(yte.sum())
    assert record_split["accuracy"] > m_main["accuracy"]
    with open(os.path.join(ROOT, "data", "scripts", "week05_numbers.json"), "w") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    with open(os.path.join(ROOT, "js", "data", "week05.js"), "w") as f:
        f.write("/* AUTO-GENERATED by data/scripts/10_build_week05_data.py - do not edit.\n"
                "   Real numbers from the frozen openFDA snapshot, plus the labelled\n"
                "   illustrative worked example. */\nwindow.WEEK05 = " +
                json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n")
    split = np.array(["train"] * len(ev), dtype=object)
    split[te] = "test"
    corpus = {"label": REAL, "texts": ev.reason_for_recall.tolist(),
              "y": [int(v) for v in y], "split": "".join("t" if s == "test" else "r" for s in split)}
    with open(os.path.join(ROOT, "js", "data", "week05_corpus.js"), "w") as f:
        f.write("/* AUTO-GENERATED by data/scripts/10_build_week05_data.py - do not edit.\n"
                "   Frozen openFDA snapshot (see labs/week05/data/PROVENANCE.json): one\n"
                "   reason text per recall event, label is_class_I, and the train/test\n"
                "   split used everywhere in Week 5 (r = train, t = test). */\n"
                "window.WEEK05_CORPUS = " + json.dumps(corpus, separators=(",", ":"),
                                                      ensure_ascii=False) + ";\n")
    print(json.dumps({k: out[k] for k in ("dataset", "split")}, indent=1))
    print("main", {k: m_main[k] for k in ("accuracy", "precision", "recall", "f1", "rocAuc", "averagePrecision", "brier", "fractionExtreme")})
    for k, v in variants.items():
        print(k, v.get("accuracy"), v.get("f1"), v.get("rocAuc"), v.get("brier"))
    print("leak count", leak["count"]["leaky"]["accuracy"], "vs", leak["count"]["correct"]["accuracy"],
          "| tfidf", leak["tfidf"]["leaky"]["accuracy"], "vs", leak["tfidf"]["correct"]["accuracy"],
          "| test-only words", leak["count"]["testOnlyWords"])
    print("record split", record_split["accuracy"], record_split["rocAuc"], "identical", record_split["identicalTextInTrain"], "| event split identical", event_identical)
    print("top Class I words", top1[:10]); print("top not-Class-I words", top0[:10])
    print("by events: Class I", topE1[:12]); print("by events: not Class I", topE0[:12])
    print("LM comparison included:", "lmComparison" in out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", help="openFDA bulk export zip to freeze into the snapshot")
    a = ap.parse_args()
    if a.zip:
        freeze(a.zip)
    analyse()
