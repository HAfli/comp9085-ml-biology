#!/usr/bin/env python3
"""
COMP9085 build script 15: Week 7 data and numbers
(dimensionality reduction and foundation-model embeddings).

Two modes.

1. Module team only, with network and torch/transformers (run once):

       python3 data/scripts/15_build_week07_data.py --freeze /path/outside/repo/uniprot_raw

   * downloads every reviewed (Swiss-Prot), non-fragment human entry from the UniProt
     REST API (or reuses the cached TSV in that folder) and maps each accession to its
     UniRef50 cluster with the UniProt ID-mapping service;
   * keeps proteins of 50-1000 residues written in the 20 standard amino acids, keeps ONE
     protein per UniRef50 cluster (so no two proteins in the set share a 50%-identity
     cluster), and draws a seeded random sample of 2,000;
   * labels each protein from its UniProt keywords: KW-0812 Transmembrane and KW-0732
     Signal, and records the evidence code behind each annotated feature;
   * runs the pinned ESM-2 checkpoint (facebook/esm2_t6_8M_UR50D, 8M parameters, 320-d)
     on every sequence, and on a residue-shuffled copy of every sequence (same composition,
     order destroyed), mean-pooling the final hidden layer over residues;
   * writes labs/week07/data/ (CSV files, PROVENANCE.json).

   Students never run this, and the lab never needs torch or a network.

2. Everyone, no network (default):

       python3 data/scripts/15_build_week07_data.py

   recomputes every Week 7 number the lecture and the lab quote, from the frozen files
   and scikit-learn's bundled copy of WDBC, and writes data/scripts/week07_numbers.json.
"""
import argparse
import hashlib
import io
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import date

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "labs", "week07", "data")
OUT = os.path.join(ROOT, "data", "scripts", "week07_numbers.json")

SEED = 42                 # split and cross-validation, as in Weeks 4-6
SAMPLE_SEED = 9085        # which proteins are drawn, and the residue shuffle
N_SAMPLE = 2000
MIN_LEN, MAX_LEN = 50, 1000
AA = "ACDEFGHIKLMNPQRSTVWY"
QUERY = "(reviewed:true) AND (organism_id:9606) AND (fragment:false)"
FIELDS = ("accession,id,protein_name,gene_primary,length,sequence,keywordid,ft_signal,ft_transmem,"
          "annotation_score")
MODEL = "facebook/esm2_t6_8M_UR50D"
REVISION = "c731040fcd8d73dceaa04b0a8e6329b345b0f5df"     # Hugging Face commit; MIT licence
PROTEINS = "swissprot_human_2000.csv"
EMB = "esm2_t6_8M_embeddings.csv.gz"
EMB_SHUF = "esm2_t6_8M_embeddings_shuffled.csv.gz"

# Kyte, J. & Doolittle, R. F. (1982) J Mol Biol 157:105-132 (the published scale).
KD = {"A": 1.8, "R": -4.5, "N": -3.5, "D": -3.5, "C": 2.5, "Q": -3.5, "E": -3.5,
      "G": -0.4, "H": -3.2, "I": 4.5, "L": 3.8, "K": -3.9, "M": 1.9, "F": 2.8,
      "P": -1.6, "S": -0.8, "T": -0.7, "W": -0.9, "Y": -1.3, "V": 4.2}
WINDOW = 19               # residues; about the length of a membrane-spanning helix


def sha256(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


# ===================================================================== freeze
def fetch(url, data=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "COMP9085-week07"})
    return urllib.request.urlopen(req, timeout=300)


def download(raw):
    os.makedirs(raw, exist_ok=True)
    tsv, mapping, meta = (os.path.join(raw, n) for n in
                          ("human_swissprot.tsv", "uniref50_mapping.tsv", "download.json"))
    if not os.path.exists(tsv):
        url = ("https://rest.uniprot.org/uniprotkb/stream?format=tsv&query="
               + urllib.parse.quote(QUERY) + "&fields=" + FIELDS)
        r = fetch(url)
        open(tsv, "wb").write(r.read())
        json.dump({"url": url, "uniprot_release": r.headers.get("X-UniProt-Release"),
                   "uniprot_release_date": r.headers.get("X-UniProt-Release-Date"),
                   "downloaded": date.today().isoformat()}, open(meta, "w"), indent=1)
    if not os.path.exists(mapping):
        ids = pd.read_csv(tsv, sep="\t").Entry.tolist()
        body = urllib.parse.urlencode({"from": "UniProtKB_AC-ID", "to": "UniRef50",
                                       "ids": ",".join(ids)}).encode()
        job = json.load(fetch("https://rest.uniprot.org/idmapping/run", body))["jobId"]
        for _ in range(240):
            st = json.load(fetch(f"https://rest.uniprot.org/idmapping/status/{job}"))
            if st.get("jobStatus") in (None, "FINISHED"):
                break
            time.sleep(5)
        txt = fetch(f"https://rest.uniprot.org/idmapping/uniref/results/stream/{job}"
                    "?format=tsv&fields=id").read()
        open(mapping, "wb").write(txt)
    return tsv, mapping, meta


def evidence(feature):
    """Strongest evidence class among the ECO codes of one UniProt feature string."""
    if not isinstance(feature, str) or not feature:
        return "none"
    if "ECO:0000269" in feature or "ECO:0007744" in feature:
        return "experimental"
    if "ECO:0000250" in feature:
        return "by similarity"
    if "ECO:0000305" in feature:
        return "curator inference"
    if "ECO:0000255" in feature:
        return "sequence analysis"
    return "no evidence code"


def select(tsv, mapping):
    t = pd.read_csv(tsv, sep="\t")
    m = pd.read_csv(mapping, sep="\t").rename(columns={"From": "Entry", "Cluster ID": "uniref50"})
    flow = {"swissprot_human_nonfragment": len(t)}
    t = t.merge(m, on="Entry", how="inner")
    flow["mapped_to_uniref50"] = len(t)
    t = t[t.Length.between(MIN_LEN, MAX_LEN)]
    flow["length_50_1000"] = len(t)
    t = t[t.Sequence.str.fullmatch(f"[{AA}]+")]
    flow["standard_residues_only"] = len(t)
    t = t.sample(frac=1, random_state=SAMPLE_SEED).drop_duplicates("uniref50")
    flow["one_per_uniref50_cluster"] = len(t)
    s = t.sample(N_SAMPLE, random_state=SAMPLE_SEED).reset_index(drop=True)
    kw = s["Keyword ID"].fillna("")
    rng = np.random.default_rng(SAMPLE_SEED)
    out = pd.DataFrame({
        "accession": s.Entry, "entry_name": s["Entry Name"], "protein_name": s["Protein names"],
        "gene": s["Gene Names (primary)"], "length": s.Length, "uniref50": s.uniref50,
        "is_transmembrane": kw.str.contains("KW-0812").astype(int),
        "has_signal_peptide": kw.str.contains("KW-0732").astype(int),
        "tm_evidence": s["Transmembrane"].map(evidence),
        "sp_evidence": s["Signal peptide"].map(evidence),
        "sequence": s.Sequence,
        "shuffled_sequence": ["".join(rng.permutation(list(q))) for q in s.Sequence]})
    return out, flow


def embed(seqs, batch=16):
    import torch
    from transformers import AutoModel, AutoTokenizer
    torch.manual_seed(SEED)
    tok = AutoTokenizer.from_pretrained(MODEL, revision=REVISION)
    model = AutoModel.from_pretrained(MODEL, revision=REVISION).eval()
    order = np.argsort([len(q) for q in seqs])           # similar lengths together: less padding
    res = [None] * len(seqs)
    with torch.no_grad():
        for i in range(0, len(seqs), batch):
            idx = order[i:i + batch]
            enc = tok([seqs[j] for j in idx], return_tensors="pt", padding=True)
            hs = model(**enc).last_hidden_state           # (B, tokens, 320)
            for b, j in enumerate(idx):
                # token 0 is <cls>, tokens 1..L are residues, L+1 is <eos>, then padding
                res[j] = hs[b, 1:len(seqs[j]) + 1].mean(0).numpy()
    return np.vstack(res)


def write_emb(acc, E, path):
    df = pd.DataFrame(np.round(E, 5), columns=[f"e{i:03d}" for i in range(E.shape[1])])
    df.insert(0, "accession", acc)
    df.to_csv(path, index=False, compression={"method": "gzip", "mtime": 0})


def freeze(raw):
    import torch
    import transformers
    tsv, mapping, meta = download(raw)
    prot, flow = select(tsv, mapping)
    os.makedirs(DATA, exist_ok=True)
    prot.to_csv(os.path.join(DATA, PROTEINS), index=False)
    t0 = time.time()
    write_emb(prot.accession, embed(prot.sequence.tolist()), os.path.join(DATA, EMB))
    write_emb(prot.accession, embed(prot.shuffled_sequence.tolist()), os.path.join(DATA, EMB_SHUF))
    m = json.load(open(meta))
    prov = {
        "dataset": "Human UniProtKB/Swiss-Prot proteins, one per UniRef50 cluster, with ESM-2 embeddings",
        "source": {"publisher": "UniProt Consortium", "database": "UniProtKB/Swiss-Prot (reviewed)",
                   "release": m["uniprot_release"], "release_date": m["uniprot_release_date"],
                   "query": QUERY, "fields": FIELDS, "url": m["url"], "downloaded": m["downloaded"],
                   "uniref50_mapping": "https://rest.uniprot.org/idmapping (UniProtKB_AC-ID -> UniRef50)",
                   "licence": "CC BY 4.0 (https://www.uniprot.org/help/license)",
                   "raw_sha256": {"human_swissprot.tsv": sha256(tsv),
                                  "uniref50_mapping.tsv": sha256(mapping)}},
        "selection": {"length": [MIN_LEN, MAX_LEN], "alphabet": AA, "one_per": "UniRef50 cluster",
                      "n_sample": N_SAMPLE, "sample_seed": SAMPLE_SEED, "flow": flow},
        "labels": {"is_transmembrane": "UniProt keyword KW-0812 (Transmembrane)",
                   "has_signal_peptide": "UniProt keyword KW-0732 (Signal)",
                   "evidence": "strongest ECO class on the TRANSMEM / SIGNAL features: experimental "
                               "(ECO:0000269, ECO:0007744) > by similarity (ECO:0000250) > curator "
                               "inference (ECO:0000305) > sequence analysis (ECO:0000255)"},
        "embedding": {"model": MODEL, "revision": REVISION, "licence": "MIT",
                      "parameters": "about 8 million (6 layers)", "dimension": 320,
                      "pooling": "mean of the final hidden layer over residue positions "
                                 "(excluding <cls>, <eos> and padding)",
                      "shuffled": "the same model on shuffled_sequence: each protein's residues "
                                  f"permuted with numpy default_rng({SAMPLE_SEED}) in row order",
                      "rounding": "5 decimal places", "torch": torch.__version__,
                      "transformers": transformers.__version__,
                      "seconds_on_cpu": round(time.time() - t0)},
        "files": {n: sha256(os.path.join(DATA, n)) for n in (PROTEINS, EMB, EMB_SHUF)},
    }
    json.dump(prov, open(os.path.join(DATA, "PROVENANCE.json"), "w"), indent=1)
    print("froze", len(prot), "proteins to", os.path.relpath(DATA, ROOT), flow)


# ===================================================================== numbers
def composition(seqs):
    return np.array([[q.count(a) / len(q) for a in AA] for q in seqs])


def max_hydropathy(q, w=WINDOW):
    h = np.array([KD[a] for a in q])
    return float(np.convolve(h, np.ones(w) / w, mode="valid").max())


def nterm_hydropathy(q, n=25):
    return float(np.mean([KD[a] for a in q[:n]]))


def mean_cosine(M):
    U = M / np.linalg.norm(M, axis=1, keepdims=True)
    S = U @ U.T
    n = len(M)
    return float((S.sum() - n) / (n * (n - 1)))


def r(x, d=4):
    return round(float(x), d)


def numbers():
    from sklearn.datasets import load_breast_cancer
    from sklearn.decomposition import PCA
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, average_precision_score, roc_auc_score
    from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    N = {"seed": SEED}
    cv = StratifiedKFold(5, shuffle=True, random_state=SEED)

    # ---- curse of dimensionality: distance concentration for uniform random points
    rng = np.random.default_rng(SEED)
    conc = {}
    for d in [2, 10, 100, 1000]:
        P = rng.random((1000, d))
        dist = np.linalg.norm(P[1:] - P[0], axis=1)
        conc[str(d)] = {"min": r(dist.min()), "max": r(dist.max()),
                        "relative_contrast": r((dist.max() - dist.min()) / dist.min())}
    N["curse"] = {"n_points": 1000, "query": "point 0", "by_dimension": conc}

    # ---- WDBC
    d = load_breast_cancer()
    X, y = d.data, (d.target == 0).astype(int)  # 1 = malignant, as in Weeks 2-4
    names = list(d.feature_names)
    pca = PCA().fit(StandardScaler().fit_transform(X))
    evr = pca.explained_variance_ratio_
    cum = evr.cumsum()
    pu = PCA().fit(X)
    load1 = pd.Series(pca.components_[0], index=names)
    load2 = pd.Series(pca.components_[1], index=names)
    sign1 = np.sign(load1.sum())
    sign2 = np.sign(load2["mean fractal dimension"])
    N["wdbc"] = {
        "n": int(len(y)), "p": int(X.shape[1]), "malignant": int(y.sum()),
        "evr": [r(v) for v in evr[:10]], "cum": [r(v) for v in cum[:10]],
        "k90": int(np.searchsorted(cum, 0.90) + 1), "k95": int(np.searchsorted(cum, 0.95) + 1),
        "k99": int(np.searchsorted(cum, 0.99) + 1),
        "pc1_same_sign_loadings": int(max((load1 > 0).sum(), (load1 < 0).sum())),
        "pc1_top": [[k, r(sign1 * v, 3)] for k, v in load1.reindex(load1.abs().sort_values(ascending=False).index)[:6].items()],
        "pc2_top": [[k, r(sign2 * v, 3)] for k, v in load2.reindex(load2.abs().sort_values(ascending=False).index)[:6].items()],
        "unscaled_pc1_share": r(pu.explained_variance_ratio_[0]),
        "unscaled_pc1_top_feature": names[int(np.argmax(np.abs(pu.components_[0])))],
        "worst_area_sd": r(X[:, names.index("worst area")].std(ddof=1), 1),
        "smoothness_sd": r(X[:, names.index("mean smoothness")].std(ddof=1), 4),
    }
    # worked example: two standardised features with correlation r -> PC1 explains (1 + |r|) / 2
    pairs = {}
    for f1, f2 in [("mean radius", "mean perimeter"), ("mean radius", "mean texture")]:
        rr = np.corrcoef(X[:, names.index(f1)], X[:, names.index(f2)])[0, 1]
        Z2 = StandardScaler().fit_transform(X[:, [names.index(f1), names.index(f2)]])
        pairs[f"{f1} / {f2}"] = {"r": r(rr), "pc1_share_formula": r((1 + abs(rr)) / 2),
                                 "pc1_share_pca": r(PCA().fit(Z2).explained_variance_ratio_[0])}
    N["wdbc"]["pairs"] = pairs
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=SEED)
    N["wdbc"]["split"] = {"train": int(len(ytr)), "test": int(len(yte)), "test_size": 0.3}
    ks = [1, 2, 3, 5, 7, 10, 15, 20, 30]
    curve = {}
    for k in ks:
        p = make_pipeline(StandardScaler(), PCA(n_components=k, random_state=SEED), LogisticRegression(max_iter=5000))
        s = cross_validate(p, Xtr, ytr, cv=cv, scoring=["accuracy", "roc_auc"])
        curve[str(k)] = {"accuracy": r(s["test_accuracy"].mean()),
                         "accuracy_sd": r(s["test_accuracy"].std(ddof=1)),
                         "roc_auc": r(s["test_roc_auc"].mean()),
                         "roc_auc_sd": r(s["test_roc_auc"].std(ddof=1))}
    full = make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000))
    s = cross_validate(full, Xtr, ytr, cv=cv, scoring=["accuracy", "roc_auc"])
    curve["all 30 features"] = {"accuracy": r(s["test_accuracy"].mean()),
                                "accuracy_sd": r(s["test_accuracy"].std(ddof=1)),
                                "roc_auc": r(s["test_roc_auc"].mean()),
                                "roc_auc_sd": r(s["test_roc_auc"].std(ddof=1))}
    # choose k: the smallest k whose mean CV ROC AUC is within one standard error of the best
    best = max(curve[str(k)]["roc_auc"] for k in ks)
    best_k = next(k for k in ks if curve[str(k)]["roc_auc"] == best)
    se = curve[str(best_k)]["roc_auc_sd"] / np.sqrt(5)
    chosen = next(k for k in ks if curve[str(k)]["roc_auc"] >= best - se)
    N["wdbc"]["curve"] = curve
    N["wdbc"]["one_se"] = {"best_k": best_k, "best_roc_auc": best, "se": r(se), "chosen_k": chosen}
    test = {}
    for name, p in [(f"PCA {chosen}", make_pipeline(StandardScaler(), PCA(n_components=chosen, random_state=SEED),
                                                    LogisticRegression(max_iter=5000))),
                    ("all 30 features", full)]:
        p.fit(Xtr, ytr)
        test[name] = {"accuracy": r(accuracy_score(yte, p.predict(Xte))),
                      "roc_auc": r(roc_auc_score(yte, p.predict_proba(Xte)[:, 1])),
                      "errors": int((p.predict(Xte) != yte).sum())}
    N["wdbc"]["test"] = test
    # PCA fitted on all rows before the split (the leak) vs inside the pipeline
    Z_all = PCA(n_components=chosen, random_state=SEED).fit(StandardScaler().fit(X).transform(X))
    leak = cross_validate(LogisticRegression(max_iter=5000),
                          Z_all.transform(StandardScaler().fit(X).transform(Xtr)), ytr, cv=cv,
                          scoring="roc_auc")["test_score"].mean()
    N["wdbc"]["pca_before_split_cv_roc_auc"] = r(leak)

    # ---- proteins
    prot = pd.read_csv(os.path.join(DATA, PROTEINS))
    E = pd.read_csv(os.path.join(DATA, EMB)).set_index("accession").loc[prot.accession].values
    Es = pd.read_csv(os.path.join(DATA, EMB_SHUF)).set_index("accession").loc[prot.accession].values
    C = composition(prot.sequence)
    H = np.array([[max_hydropathy(q), nterm_hydropathy(q)] for q in prot.sequence])
    L = np.log(prot.length.values)[:, None]
    tm, sp = prot.is_transmembrane.values, prot.has_signal_peptide.values
    prov = json.load(open(os.path.join(DATA, "PROVENANCE.json")))
    N["proteins"] = {
        "n": int(len(prot)), "flow": prov["selection"]["flow"],
        "uniprot_release": prov["source"]["release"],
        "tm": int(tm.sum()), "sp": int(sp.sum()), "tm_rate": r(tm.mean()), "sp_rate": r(sp.mean()),
        "both": int((tm & sp).sum()), "neither": int(((1 - tm) & (1 - sp)).sum()),
        "length": {"min": int(prot.length.min()), "median": float(prot.length.median()),
                   "max": int(prot.length.max())},
        "tm_evidence": prot.loc[tm == 1, "tm_evidence"].value_counts().to_dict(),
        "sp_evidence": prot.loc[sp == 1, "sp_evidence"].value_counts().to_dict(),
        "emb_dim": int(E.shape[1]), "uniref50_unique": bool(prot.uniref50.is_unique),
    }
    # geometry (unsupervised: all rows, no labels)
    def k_for(M, frac=0.9):
        return int(np.searchsorted(PCA().fit(M).explained_variance_ratio_.cumsum(), frac) + 1)
    pe = PCA().fit(E)
    pcs = pe.transform(E)[:, :2]
    gravy = np.array([np.mean([KD[a] for a in q]) for q in prot.sequence])
    N["geometry"] = {
        "mean_cosine_raw": r(mean_cosine(E)), "mean_cosine_centred": r(mean_cosine(E - E.mean(0))),
        "mean_cosine_composition": r(mean_cosine(C)),
        "mean_cosine_composition_centred": r(mean_cosine(C - C.mean(0))),
        "emb_pc1_share": r(pe.explained_variance_ratio_[0]),
        "emb_pc2_share": r(pe.explained_variance_ratio_[1]),
        "emb_top10_share": r(pe.explained_variance_ratio_[:10].sum()),
        "emb_k90": k_for(E), "emb_k90_standardised": k_for(StandardScaler().fit_transform(E)),
        "comp_k90_standardised": k_for(StandardScaler().fit_transform(C)),
        "emb_norm_mean": r(np.linalg.norm(E, axis=1).mean(), 3),
        "emb_mean_vector_norm": r(np.linalg.norm(E.mean(0)), 3),
        "corr_pc1_gravy": r(abs(np.corrcoef(pcs[:, 0], gravy)[0, 1]), 3),
        "corr_pc1_loglength": r(abs(np.corrcoef(pcs[:, 0], np.log(prot.length))[0, 1]), 3),
        "corr_pc2_gravy": r(abs(np.corrcoef(pcs[:, 1], gravy)[0, 1]), 3),
    }
    # the far tail of PC1 (sign-independent: the PC sign is arbitrary)
    pc1 = pcs[:, 0] * np.sign(pd.Series(pcs[:, 0]).skew())
    far = prot[pc1 > 3.5]
    olf = prot.protein_name.str.startswith("Olfactory receptor")
    N["geometry"]["pc1_far_tail"] = {"threshold": 3.5, "n": int(len(far)),
                                     "olfactory_receptors": int(olf[pc1 > 3.5].sum()),
                                     "olfactory_receptors_in_sample": int(olf.sum()),
                                     "transmembrane": int(far.is_transmembrane.sum())}
    # split: stratified on both labels together
    strat = 2 * tm + sp
    idx = np.arange(len(prot))
    tr, te = train_test_split(idx, test_size=0.25, stratify=strat, random_state=SEED)
    N["proteins"]["split"] = {"train": int(len(tr)), "test": int(len(te)),
                              "test_tm": int(tm[te].sum()), "test_sp": int(sp[te].sum())}
    reps = {"length only": L, "composition (20)": C, "ESM-2 (320)": E,
            "ESM-2 on shuffled sequences (320)": Es,
            "composition + 2 hydropathy features (22)": np.hstack([C, H])}
    probe = lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000))
    table = {}
    for task, yv in [("transmembrane", tm), ("signal_peptide", sp)]:
        table[task] = {}
        for name, M in reps.items():
            s = cross_validate(probe(), M[tr], yv[tr], cv=cv, scoring=["roc_auc", "average_precision"])
            table[task][name] = {"roc_auc": r(s["test_roc_auc"].mean()),
                                 "roc_auc_sd": r(s["test_roc_auc"].std(ddof=1)),
                                 "average_precision": r(s["test_average_precision"].mean())}
        table[task]["prevalence_train"] = r(yv[tr].mean())
    N["probe_cv"] = table
    ptest = {}
    for task, yv in [("transmembrane", tm), ("signal_peptide", sp)]:
        ptest[task] = {}
        for name in ["composition (20)", "ESM-2 (320)", "composition + 2 hydropathy features (22)"]:
            p = probe().fit(reps[name][tr], yv[tr])
            pr = p.predict_proba(reps[name][te])[:, 1]
            ptest[task][name] = {"roc_auc": r(roc_auc_score(yv[te], pr)),
                                 "average_precision": r(average_precision_score(yv[te], pr))}
    N["probe_test"] = ptest
    # extension: PCA-compressed embedding inside the pipeline
    comp = {}
    for task, yv in [("transmembrane", tm), ("signal_peptide", sp)]:
        comp[task] = {}
        for k in [2, 8, 16, 32, 64, 128]:
            p = make_pipeline(StandardScaler(), PCA(n_components=k, random_state=SEED), LogisticRegression(max_iter=5000))
            comp[task][str(k)] = r(cross_validate(p, E[tr], yv[tr], cv=cv,
                                                  scoring="roc_auc")["test_score"].mean())
    N["pca_embedding"] = comp
    json.dump(N, open(OUT, "w"), indent=1)
    print("wrote", os.path.relpath(OUT, ROOT))
    return N


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--freeze", metavar="RAW_DIR",
                    help="module team: download/cache UniProt files here and re-freeze the data")
    a = ap.parse_args()
    if a.freeze:
        freeze(a.freeze)
    numbers()
