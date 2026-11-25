#!/usr/bin/env python3
"""
Week 11 (boosting and fine-tuning foundation models): the part that needs a deep-learning stack.
Module team only; students never run this. It writes small frozen files that the lab and the website read.

Data: the Week 7 proteins (labs/week07/data): 2,000 reviewed human Swiss-Prot proteins, one per UniRef50 cluster.
Task: does the protein carry an N-terminal signal peptide (UniProt keyword KW-0732)?
Model: ESM-2 8M, facebook/esm2_t6_8M_UR50D at the same pinned revision as Week 7.

Protocol (identical for every pipeline in the Week 11 "adaptation ladder"):
  * test set: the Week 7 split (500 proteins, stratified on both labels, seed 42), used ONCE per pipeline;
  * the 1,500 training proteins are split 1,200 fit / 300 validation (stratified on the label, seed 42);
  * every choice (learning rate, number of epochs, the C of a logistic head) is made on the 300 validation proteins;
  * fine-tuning is repeated with 3 seeds for the chosen settings.
Input window: the first 100 residues (signal peptides are N-terminal, typically 15-30 residues).

What it computes
  1. sanity check: whole-sequence mean-pooled embeddings reproduce the Week 7 frozen file;
  2. frozen embeddings of the first 100 residues (mean of the final layer over residues) -> csv.gz;
  3. LoRA (rank 8 on query and value, plus the classification head) and full fine-tuning,
     validation curves, chosen settings, test probabilities for every seed, trainable-parameter counts, timings;
  4. zero-shot: a masked-marginal substitution scan of the insulin signal peptide (P01308, residues 1-24).

Out (labs/week11/data/):
  esm2_t6_8M_nterm100_embeddings.csv.gz
  week11_finetune_results.json

    HF_HOME=/somewhere/outside/repo python3 data/scripts/27_build_week11_finetune.py   # ~30-60 min on a laptop CPU
Needs: torch, transformers, peft (versions recorded in the JSON).
"""
import json
import os
import time
import warnings

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, average_precision_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
W7 = os.path.join(ROOT, "labs", "week07", "data")
OUT = os.path.join(ROOT, "labs", "week11", "data")
os.makedirs(OUT, exist_ok=True)
MODEL, REVISION = "facebook/esm2_t6_8M_UR50D", "c731040fcd8d73dceaa04b0a8e6329b345b0f5df"
SEED, WINDOW, MAXEP, BATCH = 42, 100, 12, 16
SEEDS = [0, 1, 2]
GRID = {"lora": [5e-4, 2e-3], "full": [2e-5, 1e-4]}
INSULIN = ("P01308", "MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN")
INS_SP = 24   # human preproinsulin (UniProt P01308, 110 residues); signal peptide = residues 1-24
AA = "ACDEFGHIKLMNPQRSTVWY"

import torch
import transformers
import peft
from transformers import AutoTokenizer, AutoModel, AutoModelForMaskedLM, AutoModelForSequenceClassification
from peft import LoraConfig, get_peft_model

torch.set_num_threads(8)
t00 = time.time()
r4 = lambda x: float(round(float(x), 4))

prot = pd.read_csv(os.path.join(W7, "swissprot_human_2000.csv"))
E7 = pd.read_csv(os.path.join(W7, "esm2_t6_8M_embeddings.csv.gz")).set_index("accession").loc[prot.accession].values
tm, sp = prot.is_transmembrane.values, prot.has_signal_peptide.values
idx = np.arange(len(prot))
tr, te = train_test_split(idx, test_size=0.25, stratify=2 * tm + sp, random_state=SEED)       # the Week 7 split
fit, val = train_test_split(tr, test_size=0.2, stratify=sp[tr], random_state=SEED)
seqs = prot.sequence.tolist()
win = [q[:WINDOW] for q in seqs]
tok = AutoTokenizer.from_pretrained(MODEL, revision=REVISION)
R = {"model": MODEL, "revision": REVISION, "versions": {"torch": torch.__version__, "transformers": transformers.__version__,
     "peft": peft.__version__}, "task": "has_signal_peptide (UniProt KW-0732)", "window_residues": WINDOW,
     "split": {"fit": len(fit), "val": len(val), "test": len(te), "test_positives": int(sp[te].sum()),
               "val_positives": int(sp[val].sum()), "fit_positives": int(sp[fit].sum())},
     "protocol": "Week 7 test split (500, seed 42, used once per pipeline); training 1,500 -> 1,200 fit / 300 validation "
                 "(stratified, seed 42); every setting chosen on validation ROC AUC; fine-tuning repeated with 3 seeds",
     "hardware": "Apple M1 Max laptop, CPU only, 8 threads"}


def embed(model, seq_list, batch=16):
    order = np.argsort([len(q) for q in seq_list])
    res = [None] * len(seq_list)
    with torch.no_grad():
        for i in range(0, len(seq_list), batch):
            ix = order[i:i + batch]
            enc = tok([seq_list[j] for j in ix], return_tensors="pt", padding=True)
            hs = model(**enc).last_hidden_state
            for b, j in enumerate(ix):
                res[j] = hs[b, 1:len(seq_list[j]) + 1].mean(0).numpy()
    return np.vstack(res)


# ---------------------------------------------------------------- 1-2. frozen embeddings
base = AutoModel.from_pretrained(MODEL, revision=REVISION).eval()
chk = embed(base, [seqs[i] for i in range(40)])
R["sanity_whole_sequence_max_abs_diff_vs_week7"] = r4(np.abs(np.round(chk, 5) - E7[:40]).max())
t = time.perf_counter(); EN = embed(base, win); R["seconds_embed_nterm_2000"] = round(time.perf_counter() - t, 1)
df = pd.DataFrame(np.round(EN, 5), columns=[f"n{i:03d}" for i in range(EN.shape[1])]); df.insert(0, "accession", prot.accession)
df.to_csv(os.path.join(OUT, "esm2_t6_8M_nterm100_embeddings.csv.gz"), index=False, compression={"method": "gzip", "mtime": 0})
print("embeddings done", R["sanity_whole_sequence_max_abs_diff_vs_week7"], f"{time.time()-t00:.0f}s", flush=True)


def frozen_head(M, name):
    """Logistic regression head on a frozen embedding; C chosen on the validation proteins."""
    best = None
    for C in [0.001, 0.01, 0.1, 1.0]:
        p = Pipeline([("sc", StandardScaler()), ("m", LogisticRegression(C=C, max_iter=5000))]).fit(M[fit], sp[fit])
        a = roc_auc_score(sp[val], p.predict_proba(M[val])[:, 1])
        if best is None or a > best[0]:
            best = (a, C, p)
    a, C, p = best
    pr = p.predict_proba(M[te])[:, 1]
    return {"name": name, "C": C, "val_auc": r4(a), "test_auc": r4(roc_auc_score(sp[te], pr)),
            "test_ap": r4(average_precision_score(sp[te], pr)), "trainable_params": int(M.shape[1] + 1),
            "test_prob": [r4(x) for x in pr]}


R["frozen"] = {"whole": frozen_head(E7, "Frozen ESM-2, whole sequence, mean-pooled + logistic regression"),
               "nterm": frozen_head(EN, "Frozen ESM-2, first 100 residues, mean-pooled + logistic regression")}
print("frozen", {k: (v["val_auc"], v["test_auc"]) for k, v in R["frozen"].items()}, flush=True)


# ---------------------------------------------------------------- 3. fine-tuning
def make(kind, seed):
    torch.manual_seed(seed); np.random.seed(seed)
    m = AutoModelForSequenceClassification.from_pretrained(MODEL, revision=REVISION, num_labels=2)
    if kind == "lora":
        cfg = LoraConfig(r=8, lora_alpha=16, lora_dropout=0.1, target_modules=["query", "value"],
                         modules_to_save=["classifier"], bias="none")
        m = get_peft_model(m, cfg)
    return m


def batches(ix, shuffle, rng):
    ix = np.array(ix)
    if shuffle:
        ix = ix[rng.permutation(len(ix))]
    for i in range(0, len(ix), BATCH):
        b = ix[i:i + BATCH]
        enc = tok([win[j] for j in b], return_tensors="pt", padding=True)
        yield enc, torch.tensor(sp[b], dtype=torch.long)


def predict(m, ix):
    m.eval(); out = []
    with torch.no_grad():
        for enc, _ in batches(ix, False, None):
            out.append(torch.softmax(m(**enc).logits, -1)[:, 1].numpy())
    return np.concatenate(out)


def run(kind, lr, seed, keep_best=True):
    m = make(kind, seed)
    n_train = sum(p.numel() for p in m.parameters() if p.requires_grad)
    n_all = sum(p.numel() for p in m.parameters())
    opt = torch.optim.AdamW([p for p in m.parameters() if p.requires_grad], lr=lr, weight_decay=0.01)
    rng = np.random.default_rng(seed)
    curve, best, best_state, secs = [], -1, None, 0.0
    for ep in range(1, MAXEP + 1):
        m.train(); t = time.perf_counter(); tot = 0.0
        for enc, y in batches(fit, True, rng):
            loss = torch.nn.functional.cross_entropy(m(**enc).logits, y)
            opt.zero_grad(); loss.backward(); opt.step(); tot += float(loss) * len(y)
        secs += time.perf_counter() - t
        pv = predict(m, val); a = roc_auc_score(sp[val], pv)
        curve.append({"epoch": ep, "train_loss": r4(tot / len(fit)), "val_auc": r4(a)})
        if a > best:
            best = a; best_ep = ep
            best_state = {k: v.detach().clone() for k, v in m.state_dict().items()}
    m.load_state_dict(best_state)
    return m, {"kind": kind, "lr": lr, "seed": seed, "trainable_params": int(n_train), "total_params": int(n_all),
               "curve": curve, "best_epoch": best_ep, "val_auc": r4(best), "train_seconds": round(secs, 1),
               "seconds_per_epoch": round(secs / MAXEP, 1)}


R["finetune"] = {"grid": GRID, "max_epochs": MAXEP, "batch": BATCH, "optimizer": "AdamW, weight decay 0.01",
                 "lora_config": {"r": 8, "alpha": 16, "dropout": 0.1, "target_modules": ["query", "value"],
                                 "also_trained": "the classification head (dense 320x320 + output 320x2)"},
                 "head": "EsmForSequenceClassification head on the <cls> token (dense + tanh + linear)",
                 "selection": "learning rate and epoch with the best validation ROC AUC (seed 0); then seeds 0, 1, 2 at that "
                              "learning rate, each stopped at its own best validation epoch",
                 "runs": {}}
for kind in ["lora", "full"]:
    tuning = []
    for lr in GRID[kind]:
        _, info = run(kind, lr, SEEDS[0])
        tuning.append(info); print(kind, lr, info["best_epoch"], info["val_auc"], info["train_seconds"], f"{time.time()-t00:.0f}s", flush=True)
    lr_best = max(tuning, key=lambda d: d["val_auc"])["lr"]
    seeds = []
    for s in SEEDS:
        m, info = run(kind, lr_best, s)
        pr = predict(m, te)
        info.update({"test_auc": r4(roc_auc_score(sp[te], pr)), "test_ap": r4(average_precision_score(sp[te], pr)),
                     "test_prob": [r4(x) for x in pr]})
        seeds.append(info); print(kind, "seed", s, info["val_auc"], info["test_auc"], f"{time.time()-t00:.0f}s", flush=True)
    R["finetune"]["runs"][kind] = {"tuning": tuning, "chosen_lr": lr_best, "seeds": seeds,
                                   "test_auc_mean": r4(np.mean([d["test_auc"] for d in seeds])),
                                   "test_auc_sd": r4(np.std([d["test_auc"] for d in seeds], ddof=1)),
                                   "test_ap_mean": r4(np.mean([d["test_ap"] for d in seeds]))}

# ---------------------------------------------------------------- 4. zero-shot masked-marginal scan
mlm = AutoModelForMaskedLM.from_pretrained(MODEL, revision=REVISION).eval()
acc, src = INSULIN
assert len(src) == 110
sp_seq = src[:INS_SP]
in_set = bool((prot.accession == acc).any())
ids = tok(src, return_tensors="pt")["input_ids"]
aa_ids = [tok.convert_tokens_to_ids(a) for a in AA]
scan = []
with torch.no_grad():
    for pos in range(len(sp_seq)):
        x = ids.clone(); x[0, pos + 1] = tok.mask_token_id
        lp = torch.log_softmax(mlm(input_ids=x).logits[0, pos + 1], -1)
        wt = sp_seq[pos]
        scan.append([r4(lp[aa_ids[k]] - lp[tok.convert_tokens_to_ids(wt)]) for k in range(20)])
R["zero_shot"] = {"protein": "Human insulin precursor (INS, UniProt P01308)", "accession": acc,
                  "region": "signal peptide, residues 1-24", "wild_type": sp_seq,
                  "context": "each position masked in turn within the full 110-residue precursor", "in_the_2000": in_set,
                  "score": "masked marginal: log p(substitute) - log p(wild type) at the masked position; "
                           "negative = the model finds the substitution less plausible than the wild type",
                  "alphabet": AA, "scores": scan}
R["runtime_s"] = round(time.time() - t00)
json.dump(R, open(os.path.join(OUT, "week11_finetune_results.json"), "w"), indent=1)
print("wrote", OUT, f"{time.time()-t00:.0f}s")
