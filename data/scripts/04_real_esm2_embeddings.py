#!/usr/bin/env python3
"""
COMP9085 build script 04 (OPTIONAL): replace the simulated embedding in
js/data/sequences.js with GENUINE ESM-2 embeddings.

Script 03 ships a documented *simulation* of a protein language model
embedding, because the teaching website has to work on a machine with no
internet access and no GPU. If you do have internet access, run this script
once and the website will silently switch from "simulated embedding" banners to
"real ESM-2 embedding" banners. Nothing else needs to change.

Requirements
------------
    pip install torch transformers numpy
    ~100 MB of downloads for facebook/esm2_t6_8M_UR50D
    (or ~140 MB for esm2_t12_35M_UR50D, ~2.6 GB for esm2_t33_650M_UR50D)

CPU is fine. 360 short sequences take a couple of minutes on a laptop.

Usage
-----
    python3 data/scripts/04_real_esm2_embeddings.py
    python3 data/scripts/04_real_esm2_embeddings.py --model facebook/esm2_t12_35M_UR50D

What it does
------------
1. Reads the sequences already in js/data/sequences.js (it does not regenerate
   them, so the family and triad labels are preserved exactly).
2. Runs each sequence through ESM-2 and mean-pools the final hidden layer over
   real residue positions, excluding the BOS/EOS/padding tokens. Mean pooling of
   the last layer is the standard way to obtain a per-protein embedding from
   ESM-2 for downstream classification.
3. Recomputes the top-32 principal components, the 2-D PCA projection and the
   neighbour-preserving 2-D layout, exactly as script 03 does.
4. Writes the file back with simulatedEmbedding = false and embeddingModel set
   to the checkpoint name, so every banner on the website updates itself.

Note on honesty: the sequences remain SIMULATED even after this script runs.
The website will say so. To teach on real sequences as well, replace the
`records` list with real sequences and labels of your own (for example a
DeepLoc subcellular-localisation subset, or a Pfam family sample) and rerun.
"""
import argparse
import json
import os
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "js", "data", "sequences.js")
PREFIX = "window.SEQUENCES = "


def load_payload():
    with open(TARGET) as f:
        text = f.read()
    i = text.index(PREFIX) + len(PREFIX)
    j = text.rindex(";")
    return json.loads(text[i:j])


def embed(seqs, model_name, batch_size=8):
    import torch
    from transformers import AutoModel, AutoTokenizer

    tok = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    model.eval()

    out = []
    with torch.no_grad():
        for i in range(0, len(seqs), batch_size):
            chunk = seqs[i:i + batch_size]
            enc = tok(chunk, return_tensors="pt", padding=True, truncation=True,
                      max_length=1024)
            hs = model(**enc).last_hidden_state          # (B, T, D)
            mask = enc["attention_mask"].clone()
            # Drop the BOS token and the final EOS token of each sequence so
            # that only real residues contribute to the mean.
            mask[:, 0] = 0
            lengths = enc["attention_mask"].sum(1)
            for b, L in enumerate(lengths):
                mask[b, L - 1] = 0
            m = mask.unsqueeze(-1).float()
            pooled = (hs * m).sum(1) / m.sum(1).clamp(min=1)
            out.append(pooled.cpu().numpy())
            print(f"  embedded {min(i + batch_size, len(seqs))}/{len(seqs)}",
                  end="\r", flush=True)
    print()
    return np.vstack(out)


def pca_2d(M):
    Z = M - M.mean(0)
    U, S, _ = np.linalg.svd(Z, full_matrices=False)
    return U[:, :2] * S[:2], (S ** 2 / (S ** 2).sum())[:2]


def neighbour_layout(rng, M, k=12, iters=320):
    """Same force-directed neighbour-preserving layout as script 03."""
    n = M.shape[0]
    D = ((M[:, None, :] - M[None, :, :]) ** 2).sum(-1)
    np.fill_diagonal(D, np.inf)
    nbrs = np.argsort(D, axis=1)[:, :k]
    P, _ = pca_2d(M)
    pos = P / (np.abs(P).max() + 1e-9) * 5.0 + rng.standard_normal(P.shape) * 0.05
    for it in range(iters):
        lr = 0.9 * (1 - it / iters) ** 1.2
        src = np.repeat(np.arange(n), k)
        dst = nbrs.reshape(-1)
        diff = pos[dst] - pos[src]
        dist = np.linalg.norm(diff, axis=1, keepdims=True) + 1e-6
        f = diff * (dist - 0.35) / dist * 0.06
        np.add.at(pos, src, lr * f)
        np.add.at(pos, dst, -lr * f)
        j = rng.integers(0, n, n * 6)
        i2 = np.repeat(np.arange(n), 6)
        diff = pos[j] - pos[i2]
        dist = np.linalg.norm(diff, axis=1, keepdims=True) + 1e-6
        np.add.at(pos, i2, lr * (-diff / (dist ** 2 + 0.25) * 0.06))
    pos -= pos.mean(0)
    return pos / (np.abs(pos).max() + 1e-9) * 6.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="facebook/esm2_t6_8M_UR50D",
                    help="any ESM-2 checkpoint on the Hugging Face Hub")
    ap.add_argument("--batch-size", type=int, default=8)
    args = ap.parse_args()

    payload = load_payload()
    records = payload["records"]
    seqs = [r["seq"] for r in records]
    print(f"{len(seqs)} sequences; embedding with {args.model} ...")

    try:
        E = embed(seqs, args.model, args.batch_size)
    except Exception as exc:                                  # noqa: BLE001
        print("\nEmbedding failed:", exc, file=sys.stderr)
        print("The website will keep using the simulated embedding, and will "
              "keep saying so. Nothing has been overwritten.", file=sys.stderr)
        return 1

    E = E / (np.linalg.norm(E, axis=1, keepdims=True) + 1e-9)
    Ec = E - E.mean(0)
    U, S, _ = np.linalg.svd(Ec, full_matrices=False)
    E32 = U[:, :32] * S[:32]
    E32 = E32 / (E32.std(0) + 1e-9)
    proj, var = pca_2d(E)
    lay = neighbour_layout(np.random.default_rng(payload.get("seed", 0) + 1), E)

    for i, r in enumerate(records):
        r["emb32"] = [round(float(v), 4) for v in E32[i]]
        r["pcaEmb"] = [round(float(v), 4) for v in proj[i]]
        r["umapEmb"] = [round(float(v), 4) for v in lay[i]]

    payload["simulatedEmbedding"] = False
    payload["embeddingModel"] = args.model
    payload["embeddingDim"] = int(E.shape[1])
    payload["pcaVariance"]["embedding"] = [round(float(v), 4) for v in var]
    payload["warning"] = (
        f"The embedding is REAL: mean-pooled final-layer output of {args.model}. "
        "The SEQUENCES are still simulated, generated from hand-specified "
        "position-weight matrices by data/scripts/03_build_sequences.py. "
        "Biophysical descriptors are really computed from those sequences.")

    with open(TARGET, "w") as f:
        f.write("/* Sequences from data/scripts/03_build_sequences.py (SIMULATED).\n")
        f.write(f"   Embedding from data/scripts/04_real_esm2_embeddings.py: REAL {args.model}. */\n")
        f.write(PREFIX)
        json.dump(payload, f, separators=(",", ":"))
        f.write(";\n")
    print("wrote", TARGET, f"({E.shape[1]}-D real embeddings)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
