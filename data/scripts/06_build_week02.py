#!/usr/bin/env python3
"""
Week 2: every number and every figure, computed once from the real data.

Outputs
    slides/figures/w2_*.png            figures for the lecture deck
    js/data/tree.js                    the fitted trees, for the website
    data/scripts/week02_numbers.json   every reported number, for the notes

Nothing here is illustrative. The tree drawn on the slide, the tree the website
renders, the tree the deployment interface evaluates and the tree the lab
reproduces are the same fitted object, exported once.

    python3 data/scripts/06_build_week02.py
"""
import json
import math
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.datasets import load_breast_cancer
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIG = os.path.join(ROOT, "slides", "figures")
SEED = 42

# MTU theme colours, so the figures match the slide master.
NAVY, BLUE, AMBER, RED = "#284F80", "#00A2FF", "#EEAF00", "#D90727"
STEEL, PALE = "#326194", "#6C98C1"
TINT, TINT_A, TINT_R = "#ECF3FA", "#FDF4DE", "#FBE7EA"
PLEX = "IBM Plex Sans Condensed"

# These figures are projected in a lecture theatre, not read on a page, so
# every size here is deliberately large. Slide body text is 15 to 19 pt; nothing
# inside a figure should land below about two thirds of that.
plt.rcParams.update({
    "font.family": [PLEX, "DejaVu Sans"],
    "text.color": NAVY, "axes.labelcolor": NAVY,
    "xtick.color": STEEL, "ytick.color": STEEL,
    "axes.edgecolor": PALE, "axes.linewidth": 1.0,
    "figure.facecolor": "white", "savefig.facecolor": "white",
    "font.size": 14, "axes.titlesize": 14, "axes.labelsize": 14,
    "xtick.labelsize": 13, "ytick.labelsize": 13, "legend.fontsize": 13,
})

out = {}


# --------------------------------------------------------------------------
# 0. Entropy, on the original lecture's own heart-disease table
# --------------------------------------------------------------------------
# The 13 instances printed in the original Week 2 deck, slide 32. Recomputed
# here rather than copied, so every figure on the slide is reproducible.
HEART = [
    # id, age, chest pain, blood pressure, cholesterol, risk
    (1, 53, 3, 135, 160, "High"), (2, 52, 2, 140, 216, "Low"),
    (3, 32, 3, 110, 250, "Low"),  (4, 52, 2, 150, 215, "Low"),
    (5, 53, 2, 130, 220, "Low"),  (6, 60, 1, 120, 291, "High"),
    (7, 49, 2, 140, 238, "Low"),  (8, 55, 4, 140, 268, "High"),
    (9, 24, 4, 100, 253, "Low"),  (10, 39, 2, 160, 147, "Low"),
    (11, 35, 1, 140, 167, "Low"), (12, 49, 2, 142, 207, "Low"),
    (13, 31, 2, 120, 273, "Low"),
]
HEART_COLS = ["Age", "Chest Pain", "Blood Pressure", "Cholesterol"]


def entropy(labels):
    n = len(labels)
    if n == 0:
        return 0.0
    h = 0.0
    for c in set(labels):
        p = labels.count(c) / n
        if p > 0:
            h -= p * math.log2(p)
    return h


def split_at(rows, col, thr):
    left = [r for r in rows if r[col] <= thr]
    right = [r for r in rows if r[col] > thr]
    return left, right


def weighted_entropy(left, right):
    n = len(left) + len(right)
    return (len(left) / n * entropy([r[5] for r in left]) +
            len(right) / n * entropy([r[5] for r in right]))


heart_overall = entropy([r[5] for r in HEART])
heart_rows = []
for ci, name in zip((1, 2, 3, 4), HEART_COLS):
    values = sorted(set(r[ci] for r in HEART))
    best = None
    for a, b in zip(values, values[1:]):
        thr = (a + b) / 2
        L, R = split_at(HEART, ci, thr)
        if not L or not R:
            continue
        h = weighted_entropy(L, R)
        if best is None or h < best[1]:
            best = (thr, h)
    thr, h = best
    heart_rows.append({
        "feature": name, "threshold": thr,
        "remainder": round(h, 3), "gain": round(heart_overall - h, 3),
    })
heart_rows.sort(key=lambda r: -r["gain"])
out["heart"] = {
    "n": len(HEART),
    "class_counts": {c: [r[5] for r in HEART].count(c) for c in ("High", "Low")},
    "overall_entropy": round(heart_overall, 3),
    "splits": heart_rows,
}


# The six-patient workshop table, from the original deck's slide 58 (it is an
# image there, so the values are transcribed; the entropies are computed).
WORKSHOP = [
    (1, "true",  "false", "true",  "low"),
    (2, "true",  "true",  "true",  "high"),
    (3, "true",  "false", "true",  "low"),
    (4, "false", "true",  "true",  "high"),
    (5, "false", "true",  "false", "low"),
    (6, "false", "true",  "true",  "high"),
]
ws_rows = []
ws_before = entropy([r[4] for r in WORKSHOP])
for ci, name in ((1, "Obese"), (2, "Smoker"), (3, "Drinks alcohol")):
    parts = []
    rem = 0.0
    for level in ("true", "false"):
        sub = [r for r in WORKSHOP if r[ci] == level]
        labels = [r[4] for r in sub]
        h = entropy(labels)
        rem += len(sub) / len(WORKSHOP) * h
        parts.append({"level": level, "n": len(sub),
                      "high": labels.count("high"), "low": labels.count("low"),
                      "entropy": round(h, 3)})
    ws_rows.append({"feature": name, "partitions": parts,
                    "remainder": round(rem, 3),
                    "gain": round(ws_before - rem, 3)})
ws_rows.sort(key=lambda r: -r["gain"])
out["workshop"] = {"before": round(ws_before, 3), "rows": ws_rows,
                   "table": [list(r) for r in WORKSHOP]}


# --------------------------------------------------------------------------
# 1. WDBC: the real dataset
# --------------------------------------------------------------------------
data = load_breast_cancer()
X, y = data.data, data.target          # 0 = malignant, 1 = benign in sklearn
names = list(data.feature_names)
# Recode so that 1 = malignant, which is the clinically meaningful positive.
y = 1 - y
out["wdbc"] = {
    "n_samples": int(X.shape[0]),
    "n_features": int(X.shape[1]),
    "malignant": int(y.sum()),
    "benign": int((1 - y).sum()),
    "majority_baseline": round(float(max((1 - y).mean(), y.mean())), 4),
    "source": "UCI Breast Cancer Wisconsin (Diagnostic), via "
              "sklearn.datasets.load_breast_cancer",
}

Xtr, Xte, ytr, yte = train_test_split(
    X, y, test_size=0.30, stratify=y, random_state=SEED)
out["split"] = {"train": int(len(ytr)), "test": int(len(yte)),
                "test_size": 0.30, "stratified": True, "random_state": SEED}


def fit(depth=None, alpha=0.0, min_leaf=1):
    clf = DecisionTreeClassifier(criterion="entropy", max_depth=depth,
                                 min_samples_leaf=min_leaf, ccp_alpha=alpha,
                                 random_state=SEED)
    clf.fit(Xtr, ytr)
    return clf


# ---- the unrestricted tree, and the depth sweep --------------------------
full = fit()
out["full_tree"] = {
    "depth": int(full.get_depth()), "leaves": int(full.get_n_leaves()),
    "train_acc": round(float(full.score(Xtr, ytr)), 4),
    "test_acc": round(float(full.score(Xte, yte)), 4),
}

sweep = []
for d in range(1, 16):
    m = fit(d)
    sweep.append({"depth": d,
                  "train": round(float(m.score(Xtr, ytr)), 4),
                  "test": round(float(m.score(Xte, yte)), 4),
                  "leaves": int(m.get_n_leaves())})
out["depth_sweep"] = sweep

# ---- the teaching tree ---------------------------------------------------
tree3 = fit(3)
out["tree3"] = {
    "criterion": "entropy", "max_depth": 3, "random_state": SEED,
    "depth": int(tree3.get_depth()), "leaves": int(tree3.get_n_leaves()),
    "train_acc": round(float(tree3.score(Xtr, ytr)), 4),
    "test_acc": round(float(tree3.score(Xte, yte)), 4),
}
cm = confusion_matrix(yte, tree3.predict(Xte))
out["tree3"]["confusion"] = {
    "tn": int(cm[0][0]), "fp": int(cm[0][1]),
    "fn": int(cm[1][0]), "tp": int(cm[1][1]),
}

# ---- the root split, computed by hand as well as by sklearn --------------
t = tree3.tree_
root_feat, root_thr = names[t.feature[0]], float(t.threshold[0])
root_left = ytr[Xtr[:, t.feature[0]] <= root_thr]
root_right = ytr[Xtr[:, t.feature[0]] > root_thr]


def ent(arr):
    arr = list(arr)
    return entropy(arr)


h_before = ent(ytr)
h_after = (len(root_left) / len(ytr) * ent(root_left) +
           len(root_right) / len(ytr) * ent(root_right))
out["root_split"] = {
    "feature": root_feat, "threshold": round(root_thr, 4),
    "entropy_before": round(h_before, 4),
    "entropy_after": round(h_after, 4),
    "information_gain": round(h_before - h_after, 4),
    "left_n": int(len(root_left)), "right_n": int(len(root_right)),
    "left_entropy": round(ent(root_left), 4),
    "right_entropy": round(ent(root_right), 4),
}

# ---- three candidate splits, for the entropy comparison figure ----------
candidates = []
for fname in (root_feat, "mean texture", "worst radius"):
    ci = names.index(fname)
    vals = np.unique(Xtr[:, ci])
    thr_grid = (vals[:-1] + vals[1:]) / 2
    best_thr, best_h = None, 9e9
    for thr in thr_grid:
        L = ytr[Xtr[:, ci] <= thr]
        R = ytr[Xtr[:, ci] > thr]
        if len(L) == 0 or len(R) == 0:
            continue
        h = len(L) / len(ytr) * ent(L) + len(R) / len(ytr) * ent(R)
        if h < best_h:
            best_thr, best_h = float(thr), h
    L = ytr[Xtr[:, ci] <= best_thr]
    R = ytr[Xtr[:, ci] > best_thr]
    candidates.append({
        "feature": fname, "threshold": round(best_thr, 4),
        "entropy_before": round(h_before, 4),
        "entropy_after": round(best_h, 4),
        "gain": round(h_before - best_h, 4),
        "left": {"n": int(len(L)), "malignant": int(L.sum()),
                 "entropy": round(ent(L), 4)},
        "right": {"n": int(len(R)), "malignant": int(R.sum()),
                  "entropy": round(ent(R), 4)},
    })
candidates.sort(key=lambda c: -c["gain"])
out["candidates"] = candidates

# ---- pruning -------------------------------------------------------------
path = fit().cost_complexity_pruning_path(Xtr, ytr)
alphas = [a for a in path.ccp_alphas if a > 0]
pruned_rows = []
for a in alphas:
    m = fit(alpha=float(a))
    pruned_rows.append({"alpha": round(float(a), 6),
                        "leaves": int(m.get_n_leaves()),
                        "depth": int(m.get_depth()),
                        "train": round(float(m.score(Xtr, ytr)), 4),
                        "test": round(float(m.score(Xte, yte)), 4)})
out["pruning"] = pruned_rows

# ---- feature ranges, for input validation in the deployment interface ----
ranges = {}
for i, nm in enumerate(names):
    ranges[nm] = {"min": round(float(X[:, i].min()), 4),
                  "max": round(float(X[:, i].max()), 4),
                  "mean": round(float(X[:, i].mean()), 4)}
out["ranges"] = ranges


# --------------------------------------------------------------------------
# 2. Export the fitted trees for the website
# --------------------------------------------------------------------------
def export_tree(clf):
    t = clf.tree_
    nodes = []
    for i in range(t.node_count):
        left, right = int(t.children_left[i]), int(t.children_right[i])
        counts = t.value[i][0]
        # sklearn 1.8 normalises value to fractions; recover integer counts
        n = float(t.n_node_samples[i])
        benign, malignant = float(counts[0]), float(counts[1])
        if benign + malignant <= 1.0001:
            benign, malignant = benign * n, malignant * n
        nodes.append({
            "id": i,
            "leaf": left == -1,
            "feature": None if left == -1 else names[int(t.feature[i])],
            "featureIndex": None if left == -1 else int(t.feature[i]),
            "threshold": None if left == -1 else round(float(t.threshold[i]), 4),
            "left": None if left == -1 else left,
            "right": None if left == -1 else right,
            "samples": int(t.n_node_samples[i]),
            "benign": int(round(benign)),
            "malignant": int(round(malignant)),
            "entropy": round(float(t.impurity[i]), 4),
            "predict": "malignant" if malignant > benign else "benign",
        })
    return nodes


# A handful of real held-out cases, for "load example case" and for tracing.
rng = np.random.default_rng(SEED)
used = set()
examples = []
wanted = [("malignant", True), ("benign", True), ("malignant", False),
          ("benign", False)]
probe = tree3.predict(Xte)
for label, correct in wanted:
    want_y = 1 if label == "malignant" else 0
    for i in range(len(yte)):
        if i in used or yte[i] != want_y:
            continue
        if (probe[i] == yte[i]) != correct:
            continue
        used.add(i)
        examples.append({
            "id": "test-%03d" % i,
            "truth": label,
            "modelCorrect": bool(correct),
            "values": {nm: round(float(Xte[i][j]), 4)
                       for j, nm in enumerate(names)},
        })
        break

FEATURED = [root_feat, "worst concave points", "worst radius", "worst texture",
            "mean radius", "mean texture", "mean perimeter", "mean concave points"]
FEATURED = list(dict.fromkeys([f for f in FEATURED if f in names]))

tree_js = {
    "provenance": {
        "kind": "real",
        "dataset": "UCI Breast Cancer Wisconsin (Diagnostic)",
        "loader": "sklearn.datasets.load_breast_cancer",
        "nSamples": out["wdbc"]["n_samples"],
        "nFeatures": out["wdbc"]["n_features"],
        "malignant": out["wdbc"]["malignant"],
        "benign": out["wdbc"]["benign"],
        "split": "stratified 70/30",
        "randomState": SEED,
        "criterion": "entropy",
        "builtBy": "data/scripts/06_build_week02.py",
        "note": "Real benchmark dataset used for educational ML "
                "experimentation. The deployment demonstration on this page is "
                "not a clinical diagnostic system.",
    },
    "featureNames": names,
    "featured": FEATURED,
    "ranges": ranges,
    "trees": {
        "depth3": {"maxDepth": 3, "nodes": export_tree(tree3),
                   "trainAcc": out["tree3"]["train_acc"],
                   "testAcc": out["tree3"]["test_acc"],
                   "leaves": out["tree3"]["leaves"]},
    },
    "depthSweep": sweep,
    "confusion": out["tree3"]["confusion"],
    "rootSplit": out["root_split"],
    "candidates": candidates,
    "examples": examples,
    "heart": out["heart"],
    "heartRows": [
        {"id": r[0], "age": r[1], "chestPain": r[2], "bloodPressure": r[3],
         "cholesterol": r[4], "risk": r[5]} for r in HEART],
}
for d in (1, 2, 4, 5):
    m = fit(d)
    tree_js["trees"]["depth%d" % d] = {
        "maxDepth": d, "nodes": export_tree(m),
        "trainAcc": round(float(m.score(Xtr, ytr)), 4),
        "testAcc": round(float(m.score(Xte, yte)), 4),
        "leaves": int(m.get_n_leaves())}

js_path = os.path.join(ROOT, "js", "data", "tree.js")
with open(js_path, "w") as fh:
    fh.write("/* GENERATED by data/scripts/06_build_week02.py - do not edit.\n"
             " * The fitted decision trees the Week 2 page renders, traces and\n"
             " * deploys. Same objects the lecture slides and the lab use.\n"
             " */\n")
    fh.write("window.TREE = ")
    json.dump(tree_js, fh, separators=(",", ":"))
    fh.write(";\n")
print("wrote js/data/tree.js  %.0f KB" % (os.path.getsize(js_path) / 1024))


# --------------------------------------------------------------------------
# 3. Figures for the lecture deck, drawn from the fitted model
# --------------------------------------------------------------------------
def save(fig, name):
    p = os.path.join(FIG, name)
    fig.savefig(p, dpi=200, bbox_inches="tight", pad_inches=0.08)
    plt.close(fig)
    print("  %-34s %5.0f KB" % (name, os.path.getsize(p) / 1024))


def short(nm):
    return nm.replace("mean ", "mean\n").replace("worst ", "worst\n")


# ---- Figure 1: the actual fitted tree ------------------------------------
def draw_tree(nodes, fname, highlight=None, max_depth=3):
    """Draw the exported tree. `highlight` is a list of node ids to mark as the
    decision path taken by one case."""
    depth_of, kids = {0: 0}, {}
    order = [0]
    while order:
        i = order.pop(0)
        nd = nodes[i]
        if not nd["leaf"]:
            for c in (nd["left"], nd["right"]):
                depth_of[c] = depth_of[i] + 1
                order.append(c)
    leaves_at = {}
    xpos = {}
    counter = [0]

    def assign(i):
        nd = nodes[i]
        if nd["leaf"] or depth_of[i] >= max_depth:
            xpos[i] = counter[0]
            counter[0] += 1
            return xpos[i]
        a = assign(nd["left"])
        b = assign(nd["right"])
        xpos[i] = (a + b) / 2
        return xpos[i]

    assign(0)
    width = max(counter[0], 1)
    fig, ax = plt.subplots(figsize=(min(13.2, 2.05 * width),
                                    1.08 * (max_depth + 1) + 0.20))
    ax.axis("off")
    hl = set(highlight or [])

    def box(i):
        nd = nodes[i]
        x, y = xpos[i], -depth_of[i]
        is_leaf = nd["leaf"] or depth_of[i] >= max_depth
        on_path = i in hl
        if is_leaf:
            face = TINT_R if nd["predict"] == "malignant" else TINT
            edge = RED if nd["predict"] == "malignant" else STEEL
        else:
            face, edge = "white", STEEL
        if on_path:
            edge, lw = AMBER, 2.6
        else:
            lw = 1.1
        bw, bh = 1.02, 0.60
        ax.add_patch(plt.Rectangle((x - bw / 2, y - bh / 2), bw, bh,
                                   facecolor=face, edgecolor=edge,
                                   linewidth=lw, zorder=3))
        if is_leaf:
            txt = ("%s\n%d samples\n%d B / %d M"
                   % (nd["predict"].upper(), nd["samples"],
                      nd["benign"], nd["malignant"]))
            size = 9.6
        else:
            txt = ("%s ≤ %.3f\n%d samples   H = %.2f\n%d B / %d M"
                   % (nd["feature"], nd["threshold"], nd["samples"],
                      nd["entropy"], nd["benign"], nd["malignant"]))
            size = 8.6
        ax.text(x, y, txt, ha="center", va="center", fontsize=size,
                color=NAVY, zorder=4, linespacing=1.35)
        if not is_leaf:
            for c, lbl, dx in ((nd["left"], "true", -0.18),
                               (nd["right"], "false", 0.18)):
                cx, cy = xpos[c], -depth_of[c]
                on = on_path and c in hl
                ax.plot([x, cx], [y - bh / 2, cy + bh / 2],
                        color=AMBER if on else PALE,
                        linewidth=2.4 if on else 1.0, zorder=2)
                ax.text((x + cx) / 2 + dx, (y + cy) / 2 + 0.05, lbl,
                        fontsize=8, color=AMBER if on else PALE,
                        ha="center", zorder=4)
                box(c)

    box(0)
    ax.set_xlim(-0.62, width - 0.38)
    ax.set_ylim(-max_depth - 0.45, 0.45)
    # No matplotlib title: the slide carries the title and the caption, and a
    # second one inside the image only shrinks the tree.
    save(fig, fname)


nodes3 = export_tree(tree3)
draw_tree(nodes3, "w2_tree_depth3.png")
draw_tree(export_tree(fit(2)), "w2_tree_depth2.png", max_depth=2)


# ---- Figure 2: one real held-out case traced through the tree -----------
trace_case = next(e for e in examples
                  if e["truth"] == "malignant" and e["modelCorrect"])
vals = trace_case["values"]
path_ids, steps, i = [0], [], 0
while not nodes3[i]["leaf"]:
    nd = nodes3[i]
    v = vals[nd["feature"]]
    go_left = v <= nd["threshold"]
    steps.append({"feature": nd["feature"], "threshold": nd["threshold"],
                  "value": v, "test": "%s = %.4f ≤ %.4f ?"
                  % (nd["feature"], v, nd["threshold"]),
                  "answer": "true" if go_left else "false"})
    i = nd["left"] if go_left else nd["right"]
    path_ids.append(i)
out["trace"] = {"case": trace_case["id"], "truth": trace_case["truth"],
                "steps": steps, "leaf": nodes3[i], "path": path_ids}
tree_js["trace"] = out["trace"]
with open(js_path, "w") as fh:
    fh.write("/* GENERATED by data/scripts/06_build_week02.py - do not edit.\n"
             " * The fitted decision trees the Week 2 page renders, traces and\n"
             " * deploys. Same objects the lecture slides and the lab use.\n"
             " */\n")
    fh.write("window.TREE = ")
    json.dump(tree_js, fh, separators=(",", ":"))
    fh.write(";\n")

draw_tree(nodes3, "w2_tree_trace.png", highlight=path_ids)


# ---- Figure 3: three candidate splits, entropy before and after ---------
fig, axes = plt.subplots(1, 3, figsize=(12.6, 3.9))
for ax, c in zip(axes, candidates):
    L, R = c["left"], c["right"]
    for k, (part, x) in enumerate(((L, 0), (R, 1))):
        ben = part["n"] - part["malignant"]
        ax.bar(x, ben, color=BLUE, width=0.62, label="benign" if k == 0 else None)
        ax.bar(x, part["malignant"], bottom=ben, color=RED, width=0.62,
               label="malignant" if k == 0 else None)
        ax.text(x, part["n"] + 8, "H = %.3f" % part["entropy"], ha="center",
                fontsize=13, color=NAVY)
    ax.set_xticks([0, 1])
    ax.set_xticklabels(["≤ %.3g" % c["threshold"], "> %.3g" % c["threshold"]],
                       fontsize=13)
    ax.set_title("%s\nH before %.3f  →  after %.3f\ninformation gain %.3f"
                 % (c["feature"], c["entropy_before"], c["entropy_after"],
                    c["gain"]),
                 fontsize=12.5, color=NAVY, pad=10)
    ax.set_ylim(0, 330)
    ax.spines[["top", "right"]].set_visible(False)
axes[0].set_ylabel("training cases", fontsize=13)
# The legend sits under the panels: inside panel one it collided with the
# entropy label above the taller bar.
handles, labels = axes[0].get_legend_handles_labels()
fig.legend(handles, labels, frameon=False, fontsize=13, ncol=2,
           loc="lower center", bbox_to_anchor=(0.5, -0.11))
fig.suptitle("Three candidate root splits on the 398 training cases. "
             "The algorithm takes the one that removes the most uncertainty.",
             fontsize=13, color=NAVY, y=1.10)
save(fig, "w2_entropy_splits.png")


# ---- Figure 4: depth sweep ----------------------------------------------
fig, ax = plt.subplots(figsize=(11.2, 4.1))
d = [r["depth"] for r in sweep]
ax.plot(d, [r["train"] for r in sweep], "-o", color=AMBER, markersize=4.5,
        linewidth=2, label="training accuracy")
ax.plot(d, [r["test"] for r in sweep], "-s", color=NAVY, markersize=4.5,
        linewidth=2, label="held-out accuracy")
best = max(sweep, key=lambda r: r["test"])
ax.axvline(best["depth"], color=PALE, linestyle=":", linewidth=1.2)
ax.annotate("best held-out\ndepth %d, %.1f%%" % (best["depth"], best["test"] * 100),
            xy=(best["depth"], best["test"]),
            xytext=(best["depth"] + 1.5, best["test"] - 0.06),
            fontsize=13, color=NAVY,
            arrowprops=dict(arrowstyle="->", color=PALE, linewidth=1.4))
ax.set_xlabel("max_depth")
ax.set_ylabel("accuracy")
ax.set_xticks(d)
ax.set_ylim(0.85, 1.01)
ax.spines[["top", "right"]].set_visible(False)
ax.legend(frameon=False, fontsize=13)
ax.set_title("WDBC, stratified 70/30 split, criterion='entropy', "
             "random_state=%d" % SEED, fontsize=12, color=STEEL, pad=12)
save(fig, "w2_depth_sweep.png")


# ---- Figure 5: confusion matrix ------------------------------------------
fig, (ax, axt) = plt.subplots(
    1, 2, figsize=(11.2, 4.1), gridspec_kw={"width_ratios": [1, 1.25]})
cmv = np.array([[out["tree3"]["confusion"]["tn"], out["tree3"]["confusion"]["fp"]],
                [out["tree3"]["confusion"]["fn"], out["tree3"]["confusion"]["tp"]]])
ax.imshow(cmv, cmap="Blues", vmin=0, vmax=cmv.max() * 1.25)
for r in range(2):
    for c in range(2):
        ax.text(c, r, str(cmv[r][c]), ha="center", va="center", fontsize=26,
                color="white" if cmv[r][c] > cmv.max() * 0.6 else NAVY)
ax.set_xticks([0, 1]); ax.set_xticklabels(["predicted\nbenign", "predicted\nmalignant"], fontsize=13)
ax.set_yticks([0, 1]); ax.set_yticklabels(["truly\nbenign", "truly\nmalignant"], fontsize=13)
ax.set_title("max_depth=3 on the %d held-out cases" % out["split"]["test"],
             fontsize=13, color=NAVY, pad=12)
for sp in ax.spines.values():
    sp.set_visible(False)

_c = out["tree3"]["confusion"]
_lines = [
    ("%d true negatives" % _c["tn"], "correctly called benign", STEEL),
    ("%d false positives" % _c["fp"], "benign, called malignant: an "
     "unnecessary intervention", AMBER),
    ("%d false negatives" % _c["fn"], "malignant, called benign: a missed "
     "cancer", RED),
    ("%d true positives" % _c["tp"], "correctly called malignant", STEEL),
]
axt.axis("off")
_y = 0.98
for _head, _body, _col in _lines:
    axt.text(0.0, _y, _head, fontsize=15, fontweight="bold", color=_col,
             va="top", transform=axt.transAxes)
    axt.text(0.0, _y - 0.085, _body, fontsize=12.5, color=NAVY, va="top",
             wrap=True, transform=axt.transAxes)
    _y -= 0.21
axt.text(0.0, 0.05, "Accuracy counts all four equally. Nothing else does.",
         fontsize=13, style="italic", color=STEEL, va="bottom",
         transform=axt.transAxes)
save(fig, "w2_confusion.png")


# ---- Figure 6: pruning ---------------------------------------------------
fig, ax = plt.subplots(figsize=(11.6, 4.2))
al = [r["alpha"] for r in pruned_rows]
ax.plot(al, [r["train"] for r in pruned_rows], "-o", color=AMBER, markersize=5,
        linewidth=2.2, label="training accuracy")
ax.plot(al, [r["test"] for r in pruned_rows], "-s", color=NAVY, markersize=5,
        linewidth=2.2, label="held-out accuracy")
ax2 = ax.twinx()
ax2.plot(al, [r["leaves"] for r in pruned_rows], "--", color=PALE, linewidth=1.8,
         label="leaves")
ax2.set_ylabel("number of leaves", color=PALE, fontsize=13)
ax2.tick_params(colors=PALE, labelsize=12)
ax2.spines[["top"]].set_visible(False)
ax.set_xlabel("ccp_alpha")
ax.set_ylabel("accuracy")
# Fit the axes to the data. A fixed floor of 0.85 clipped the collapse at high
# alpha, which is the part of the curve the caption is about.
lo = min(min(r["train"] for r in pruned_rows),
         min(r["test"] for r in pruned_rows))
ax.set_ylim(max(0.0, lo - 0.05), 1.02)
ax.spines[["top"]].set_visible(False)
# Outside the axes: the leaves curve ran through the legend text.
ax.legend(frameon=False, fontsize=13, ncol=2, loc="lower center",
          bbox_to_anchor=(0.5, -0.30))
ax.set_title("Cost-complexity pruning of the unrestricted tree "
             "(depth %d, %d leaves)" % (out["full_tree"]["depth"],
                                        out["full_tree"]["leaves"]),
             fontsize=12, color=STEEL, pad=12)
save(fig, "w2_pruning.png")


# ---- Figure 7: Guess Who informativeness --------------------------------
fig, axes = plt.subplots(1, 2, figsize=(10.6, 3.6))
CHARS = [("Brian", "man", "short", "glasses"), ("John", "man", "short", "none"),
         ("Aphra", "woman", "long", "none"), ("Aoife", "woman", "short", "none")]
for ax, (q, groups) in zip(axes, [
        ("Does the person wear glasses?", [("yes", ["Brian"]),
                                           ("no", ["John", "Aphra", "Aoife"])]),
        ("Is it a man?", [("yes", ["Brian", "John"]),
                          ("no", ["Aphra", "Aoife"])])]):
    p = [len(g[1]) / 4 for g in groups]
    h = -sum(x * math.log2(x) for x in p if x > 0)
    for k, (lbl, members) in enumerate(groups):
        ax.bar(k, len(members), color=BLUE if k == 0 else STEEL, width=0.55)
        ax.text(k, len(members) + 0.10, "\n".join(members), ha="center",
                fontsize=12, color=NAVY, va="bottom")
    ax.set_xticks([0, 1]); ax.set_xticklabels([g[0] for g in groups], fontsize=14)
    ax.set_ylim(0, 5.4)
    ax.set_yticks([0, 1, 2, 3, 4])
    ax.set_title("%s\nentropy of the answer = %.3f bits" % (q, h),
                 fontsize=13, color=NAVY, pad=10)
    ax.spines[["top", "right"]].set_visible(False)
axes[0].set_ylabel("characters remaining", fontsize=13)
fig.suptitle("The same four characters, two opening questions. "
             "The better question is the one whose answer is less predictable.",
             fontsize=12.5, color=STEEL, y=1.06)
save(fig, "w2_guess_who.png")
out["guess_who"] = {
    "glasses_entropy": round(-sum(p * math.log2(p) for p in (0.25, 0.75)), 3),
    "man_entropy": 1.0,
}


# ---- Figure 8: candidate thresholds on one continuous feature -----------
ci = names.index(root_feat)
vals = np.unique(Xtr[:, ci])
grid = (vals[:-1] + vals[1:]) / 2
gains = []
for thr in grid:
    L = ytr[Xtr[:, ci] <= thr]; R = ytr[Xtr[:, ci] > thr]
    if len(L) == 0 or len(R) == 0:
        gains.append(np.nan); continue
    gains.append(h_before - (len(L) / len(ytr) * ent(L) +
                             len(R) / len(ytr) * ent(R)))
fig, ax = plt.subplots(figsize=(11.2, 4.1))
ax.plot(grid, gains, color=STEEL, linewidth=1.8)
k = int(np.nanargmax(gains))
ax.plot([grid[k]], [gains[k]], "o", color=RED, markersize=7)
ax.annotate("chosen threshold %.4f\ninformation gain %.3f bits"
            % (grid[k], gains[k]),
            xy=(grid[k], gains[k]), xytext=(grid[k] * 1.06, gains[k] * 0.72),
            fontsize=13, color=NAVY,
            arrowprops=dict(arrowstyle="->", color=PALE, linewidth=1.4))
mean_thr = float(Xtr[:, ci].mean())
mk = int(np.argmin(np.abs(grid - mean_thr)))
ax.plot([grid[mk]], [gains[mk]], "s", color=AMBER, markersize=7)
ax.annotate("the mean, %.4f\ngain %.3f bits" % (mean_thr, gains[mk]),
            xy=(grid[mk], gains[mk]), xytext=(grid[mk] * 0.45, gains[mk] * 0.55),
            fontsize=13, color=NAVY,
            arrowprops=dict(arrowstyle="->", color=PALE, linewidth=1.4))
ax.set_xlabel("candidate threshold on %s" % root_feat)
ax.set_ylabel("information gain (bits)")
ax.spines[["top", "right"]].set_visible(False)
ax.set_title("%d candidate thresholds evaluated, one chosen. The mean is not "
             "the answer." % len(grid), fontsize=12, color=STEEL, pad=12)
save(fig, "w2_thresholds.png")
out["thresholds"] = {
    "feature": root_feat, "n_candidates": int(len(grid)),
    "chosen": round(float(grid[k]), 4), "chosen_gain": round(float(gains[k]), 4),
    "mean": round(mean_thr, 4), "mean_gain": round(float(gains[mk]), 4),
}

jp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "week02_numbers.json")
json.dump(out, open(jp, "w"), indent=1)
print("wrote %s" % os.path.relpath(jp, ROOT))
print("\nWDBC %d x %d, %d malignant / %d benign, baseline %.3f"
      % (out["wdbc"]["n_samples"], out["wdbc"]["n_features"],
         out["wdbc"]["malignant"], out["wdbc"]["benign"],
         out["wdbc"]["majority_baseline"]))
print("root split: %s <= %.4f, gain %.4f bits"
      % (root_feat, root_thr, out["root_split"]["information_gain"]))
print("depth 3: train %.4f  test %.4f  leaves %d"
      % (out["tree3"]["train_acc"], out["tree3"]["test_acc"],
         out["tree3"]["leaves"]))
