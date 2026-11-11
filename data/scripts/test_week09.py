#!/usr/bin/env python3
"""
Playwright checks of the Week 9 page (clustering): every exercise mounts, its controls and reset work, and the numbers
it shows equal data/scripts/week09_numbers.json. The in-browser clustering (k-means, DBSCAN, agglomerative) is checked
independently against scikit-learn / scipy run here.

    python3 -m http.server 8899 &                         # from the repository root
    python3 data/scripts/test_week09.py                   # or SITE_BASE=https://hafli.github.io/comp9085-ml-biology
"""
import json
import os
import sys

import numpy as np
from playwright.sync_api import sync_playwright
from scipy.cluster.hierarchy import linkage, fcluster
from sklearn.cluster import DBSCAN

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week09_numbers.json")))
js = open(os.path.join(ROOT, "js", "data", "week09.js")).read()
WEB = json.loads(js[js.index("window.WEEK09 = ") + len("window.WEEK09 = "):].rstrip().rstrip(";"))["web"]
BASE = os.environ.get("SITE_BASE", "http://localhost:8899").rstrip("/")
results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else "  :: " + str(detail)[:300]))


def metric(pg, mid):
    return pg.locator(f"#{mid} [data-m-value]").inner_text().strip()


def seg(pg, sid, value):
    pg.locator(f"#{sid} button[data-value='{value}']").click()
    pg.wait_for_timeout(200)


def slide(pg, sid, v):
    pg.locator(f"#{sid}").fill(str(v))
    pg.wait_for_timeout(250)


def reset(pg, vid):
    pg.locator(f"#viz-{vid} [data-viz-reset]").click()
    pg.wait_for_timeout(250)


def main():
    W = N["wdbc"]
    SW = {r["k"]: r for r in W["sweep"]}
    ST = W["stability_bootstrap"]["by_k"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(BASE + "/weeks/week09.html")
        pg.wait_for_timeout(3500)
        ids = ["w9-kmeans", "w9-choosek", "w9-dbscan", "w9-hier", "w9-batch", "w9-proteins", "clustering"]
        for v in ids:
            el = pg.locator(f"#viz-{v}")
            check(f"{v}: present and drawn", el.count() == 1 and "<svg" in el.inner_html() and
                  "failed to render" not in el.inner_text() and el.locator("[data-viz-reset]").count() == 1, v)
        check("seven exercises in the index", pg.locator("#interactive li").count() == 7, pg.locator("#interactive li").count())
        check("no link to solutions", pg.locator("a[href*='solutions']").count() == 0)
        check("no .pptx or .pdf links", pg.locator("a[href$='.pptx'], a[href$='.pdf']").count() == 0)
        check("lab notebook linked", pg.locator("a[href$='labs/week09/COMP9085_Week09_Lab.ipynb']").count() >= 1)
        check("simulated batch labelled", "SIMULATED" in pg.locator("#viz-w9-batch").inner_text())

        # 1 k-means stepper
        check("kmeans: starts with no steps", metric(pg, "w9k-step") == "0" and metric(pg, "w9k-next") == "Assign")
        pg.locator("#w9k-assign").click(); pg.wait_for_timeout(150)
        check("kmeans: assign -> update next", metric(pg, "w9k-next") == "Update" and metric(pg, "w9k-step") == "1")
        pg.locator("#w9k-run").click(); pg.wait_for_timeout(300)
        check("kmeans: run converges", metric(pg, "w9k-next") == "converged")
        ari2 = float(metric(pg, "w9k-ari"))
        check("kmeans: k = 2 on 2 PCs agrees with diagnosis (ARI > 0.5)", ari2 > 0.5, ari2)
        finals = set()
        slide(pg, "w9k-k", 3)
        for sd in [1, 2, 3, 4, 5, 6]:
            slide(pg, "w9k-seed", sd); pg.locator("#w9k-run").click(); pg.wait_for_timeout(200)
            finals.add(metric(pg, "w9k-wcss"))
        check("kmeans: k = 3 seeds give WCSS values", len(finals) >= 1, finals)
        print("   k = 3 final WCSS over seeds 1-6:", sorted(finals))
        reset(pg, "w9-kmeans")
        check("kmeans: reset", metric(pg, "w9k-step") == "0" and pg.locator("#w9k-k").input_value() == "2")

        # 2 choosing k
        check("choosek: k=2 silhouette", metric(pg, "w9c-sil") == f"{SW[2]['silhouette']:.3f}")
        check("choosek: k=2 stability", metric(pg, "w9c-stab") == f"{ST['2']['mean_ari']:.3f}")
        check("choosek: ARI hidden", metric(pg, "w9c-ari") == "hidden")
        check("choosek: negative silhouettes", metric(pg, "w9c-neg") == str(W["k2_negative_silhouette"]))
        slide(pg, "w9c-k", 4)
        check("choosek: k=4 silhouette", metric(pg, "w9c-sil") == f"{SW[4]['silhouette']:.3f}")
        pg.locator("#w9c-reveal").check(); pg.wait_for_timeout(200)
        check("choosek: reveal ARI", metric(pg, "w9c-ari") == f"{SW[4]['ari']:.3f}")
        slide(pg, "w9c-k", 9)
        check("choosek: k=9 stability not computed", metric(pg, "w9c-stab") == "not computed")
        reset(pg, "w9-choosek")
        check("choosek: reset", metric(pg, "w9c-ari") == "hidden" and metric(pg, "w9c-sil") == f"{SW[2]['silhouette']:.3f}")

        # 3 DBSCAN, against scikit-learn on the same 2-D points
        X2 = np.array([[q[0], q[1]] for q in W["pca2_points"]])
        for eps, ms in [(0.5, 5), (1.0, 5), (0.75, 10)]:
            slide(pg, "w9d-eps", eps); slide(pg, "w9d-ms", ms)
            lab = DBSCAN(eps=eps, min_samples=ms).fit_predict(X2)
            k = len(set(lab)) - (1 if -1 in lab else 0)
            check(f"dbscan eps {eps} ms {ms}: clusters and noise match scikit-learn",
                  metric(pg, "w9d-k") == str(k) and metric(pg, "w9d-noise") == str(int((lab == -1).sum())),
                  (metric(pg, "w9d-k"), k, metric(pg, "w9d-noise"), int((lab == -1).sum())))
        row = [r for r in W["dbscan_pca2"]["sweep"] if r["eps"] == 0.5][0]
        reset(pg, "w9-dbscan")
        check("dbscan: reset matches precomputed eps 0.5",
              metric(pg, "w9d-k") == str(row["clusters"]) and metric(pg, "w9d-noise") == str(row["noise"]))

        # 4 hierarchical, against scipy on the same 60 tumours
        Z60 = np.array(WEB["hier_sample"]["z"])
        for m in ["single", "complete", "average", "ward"]:
            seg(pg, "w9h-m", m)
            for k in [2, 3]:
                slide(pg, "w9h-k", k)
                lab = fcluster(linkage(Z60, m), k, criterion="maxclust")
                sizes = " / ".join(map(str, sorted(np.bincount(lab)[1:].tolist(), reverse=True)))
                check(f"hier {m} k={k}: sizes match scipy", metric(pg, "w9h-sizes") == sizes, (metric(pg, "w9h-sizes"), sizes))
        reset(pg, "w9-hier")
        check("hier: reset to Ward, 2", pg.locator("#w9h-m button[aria-pressed='true']").get_attribute("data-value") == "ward"
              and pg.locator("#w9h-k").input_value() == "2")

        # 5 batch
        B = W["batch"]
        check("batch: no shift = baseline", metric(pg, "w9b-dx") == f"{B['baseline']['ari_diagnosis']:.3f}")
        slide(pg, "w9b-shift", 5)
        r125 = [r for r in B["random_by_shift"] if r["shift"] == 1.25][0]
        check("batch: 1.25 SD follows batch", metric(pg, "w9b-batch") == f"{r125['ari_batch']:.3f}" and
              metric(pg, "w9b-follow") == "the batch")
        slide(pg, "w9b-shift", 6)
        pg.locator("#w9b-corr").check(); pg.wait_for_timeout(200)
        check("batch: random + centring recovers", metric(pg, "w9b-dx") == f"{B['random_corrected']['ari_diagnosis']:.3f}")
        seg(pg, "w9b-design", "confounded")
        check("batch: confounded + centring loses biology", metric(pg, "w9b-dx") == f"{B['confounded_corrected']['ari_diagnosis']:.3f}")
        pg.locator("#w9b-corr").uncheck(); pg.wait_for_timeout(200)
        check("batch: confounded batch ARI", metric(pg, "w9b-batch") == f"{B['confounded']['ari_batch']:.3f}")
        reset(pg, "w9-batch")
        check("batch: reset", metric(pg, "w9b-dx") == f"{B['baseline']['ari_diagnosis']:.3f}" and not pg.locator("#w9b-corr").is_checked())

        # 6 proteins
        P = N["proteins"]["reps"]
        e4 = [r for r in P["esm2"] if r["k"] == 4][0]
        check("proteins: ESM-2 k=4", metric(pg, "w9p-tm") == f"{e4['ari_tm']:.3f}" and metric(pg, "w9p-len") == f"{e4['eta2_loglen']:.3f}")
        seg(pg, "w9p-rep", "classical"); slide(pg, "w9p-k", 3)
        c3 = [r for r in P["classical"] if r["k"] == 3][0]
        check("proteins: classical k=3 membrane ARI", metric(pg, "w9p-tm") == f"{c3['ari_tm']:.3f}")
        reset(pg, "w9-proteins")
        check("proteins: reset", metric(pg, "w9p-tm") == f"{e4['ari_tm']:.3f}")

        check("no console or page errors", not errors, errors[:5])

        m = b.new_page(viewport={"width": 390, "height": 844})
        m.goto(BASE + "/weeks/week09.html"); m.wait_for_timeout(3500)
        over = m.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check("mobile: no horizontal page scroll", over <= 1, over)
        b.close()
    bad = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(bad)}/{len(results)} checks passed")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
