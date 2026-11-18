#!/usr/bin/env python3
"""
Playwright checks of the Week 10 page (random forests and foundation-model representations): every exercise mounts,
its controls and reset work, and the numbers it shows equal data/scripts/week10_numbers.json. The in-browser arithmetic
(exact majority-vote binomial, inverse normal CDF) is checked independently against scipy.

    python3 -m http.server 8899 &                         # from the repository root
    python3 data/scripts/test_week10.py                   # or SITE_BASE=https://hafli.github.io/comp9085-ml-biology
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright
from scipy.stats import binom, norm

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week10_numbers.json")))
BASE = os.environ.get("SITE_BASE", "http://localhost:8899").rstrip("/")
SHOTS = os.environ.get("SHOTS")
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
    pg.wait_for_timeout(300)


def reset(pg, vid):
    pg.locator(f"#viz-{vid} [data-viz-reset]").click()
    pg.wait_for_timeout(300)


def pc(x):
    return f"{100 * x:.1f}%"


def main():
    W = N["wdbc"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(BASE + "/weeks/week10.html")
        pg.wait_for_timeout(4000)
        ids = ["w10-crowd", "w10-bootstrap", "w10-trees", "random-forest", "w10-importance", "w10-adaboost", "w10-gboost",
               "w10-compare", "w10-robust", "w10-proteins", "leaderboard"]     # 2026 revision: lecture order, optional last
        for v in ids:
            el = pg.locator(f"#viz-{v}")
            check(f"{v}: present and drawn", el.count() == 1 and ("<svg" in el.inner_html() or "<table" in el.inner_html()) and
                  "failed to render" not in el.inner_text() and el.locator("[data-viz-reset]").count() == 1, v)
        idx = [a.get_attribute("href") for a in pg.locator("#interactive li a").all()]
        check("eleven exercises in the index, in lecture order", len(idx) == 11 and all(f"viz-{v}" in h for v, h in zip(ids, idx)), idx)
        check("no link to solutions", pg.locator("a[href*='solutions']").count() == 0)
        check("no .pptx or .pdf links", pg.locator("a[href$='.pptx'], a[href$='.pdf']").count() == 0)
        check("lab notebook linked", pg.locator("a[href$='labs/week10/COMP9085_Week10_Lab.ipynb']").count() >= 1)
        check("arithmetic exercise labelled as not data", "not biological data" in pg.locator("#viz-w10-crowd").inner_text())
        check("real-data banner names the script", "24_build_week10_data.py" in pg.locator("#viz-w10-trees").inner_text())
        txt = pg.locator("main").inner_text()
        check("page quotes measured MDI, not 0.129", "0.129" not in txt and f"{W['importance']['mdi_full_data']['worst_perimeter']:.3f}" in txt)

        # 1 crowd: exact binomial and probit against scipy
        for pp, B in [(0.6, 5), (0.6, 101), (0.45, 51), (0.55, 25)]:
            js = pg.evaluate(f"window.W10.majority({pp}, {B})")
            ref = 1 - binom.cdf(B // 2, B, pp)
            check(f"crowd: majority({pp}, {B}) = scipy", abs(js - ref) < 1e-9, (js, ref))
        for q in [0.05, 0.3, 0.6, 0.97]:
            check(f"crowd: probit({q}) = scipy", abs(pg.evaluate(f"window.W10.probit({q})") - norm.ppf(q)) < 1e-6)
        check("crowd: default B=25 p=0.6", metric(pg, "w10c-ind") == pc(1 - binom.cdf(12, 25, 0.6)) and metric(pg, "w10c-var") == f"{1 / 25:.3f}")
        slide(pg, "w10c-b", 101)
        check("crowd: B=101 exact", metric(pg, "w10c-ind") == pc(W["worked_crowd"]["majority"]["101"]))
        slide(pg, "w10c-rho", 0.3)
        cor = float(metric(pg, "w10c-cor").rstrip("%")) / 100
        check("crowd: rho=0.3 simulated majority falls well below independent", 0.55 < cor < 0.8, cor)
        check("crowd: variance ratio", metric(pg, "w10c-var") == f"{0.3 + 0.7 / 101:.3f}")
        reset(pg, "w10-crowd")
        check("crowd: reset", metric(pg, "w10c-var") == f"{1 / 25:.3f}" and pg.locator("#w10c-b").input_value() == "25")

        # 2 bootstrap
        check("bootstrap: starts empty", metric(pg, "w10b-oob") == "—" and metric(pg, "w10b-exp") == f"{(1 - 1 / 20) ** 20:.3f}")
        pg.locator("#w10b-one").click(); pg.wait_for_timeout(200)
        d, o = int(metric(pg, "w10b-distinct")), int(metric(pg, "w10b-oob"))
        check("bootstrap: one sample, distinct + OOB = n", d + o == 20 and pg.locator("#viz-w10-bootstrap .w10-oob").count() == o, (d, o))
        for _ in range(5):
            pg.locator("#w10b-many").click(); pg.wait_for_timeout(150)
        m = float(metric(pg, "w10b-mean"))
        check("bootstrap: 501 samples, mean OOB share near (1-1/n)^n", abs(m - (1 - 1 / 20) ** 20) < 0.02, m)
        slide(pg, "w10b-n", 100)
        check("bootstrap: n change clears history and updates expected", metric(pg, "w10b-oob") == "—" and
              metric(pg, "w10b-exp") == f"{(1 - 1 / 100) ** 100:.3f}")
        reset(pg, "w10-bootstrap")
        check("bootstrap: reset", pg.locator("#w10b-n").input_value() == "20" and metric(pg, "w10b-mean") == "—")

        # 3 trees
        DEC = {r["m"]: r for r in W["decorrelation"]["rows"]}
        check("trees: default m=5", metric(pg, "w10t-tree") == pc(DEC[5]["tree_acc"]) and metric(pg, "w10t-rho") == f"{DEC[5]['rho']:.3f}"
              and metric(pg, "w10t-forest") == pc(DEC[5]["forest_acc"]))
        check("trees: OOB at 500, m=5", metric(pg, "w10t-oob") == pc(W["oob_curve"]["by_m"]["5"][-1]))
        slide(pg, "w10t-m", 0)
        check("trees: m=1", metric(pg, "w10t-rho") == f"{DEC[1]['rho']:.3f}" and pg.locator("#w10t-m-val").inner_text() == "1")
        slide(pg, "w10t-m", 7)
        check("trees: m=30", metric(pg, "w10t-tree") == pc(DEC[30]["tree_acc"]))
        slide(pg, "w10t-t", 0)
        check("trees: 15 trees", metric(pg, "w10t-oob") == pc(W["oob_curve"]["by_m"]["5"][W["oob_curve"]["trees"].index(15)]))
        reset(pg, "w10-trees")
        check("trees: reset", pg.locator("#w10t-m-val").inner_text() == "5" and pg.locator("#w10t-t-val").inner_text() == "500")

        # 4 the in-browser forest still responds
        before = metric(pg, "rf-acc")
        slide(pg, "rf-trees", 1)
        check("random-forest: responds to the tree slider", metric(pg, "rf-acc") != "—" and pg.locator("#rf-trees-val").inner_text() == "1")
        reset(pg, "random-forest")
        check("random-forest: reset", metric(pg, "rf-acc") == before)

        # 5 robust
        R = {r["noise"]: r for r in W["robustness"]["noise"]}
        SC = W["robustness"]["scaling"]
        check("robust: no noise", metric(pg, "w10r-rf") == pc(R[0]["rf"]) and metric(pg, "w10r-knn") == pc(R[0]["knn5"]))
        slide(pg, "w10r-k", 4)
        check("robust: 300 noise", metric(pg, "w10r-rf") == pc(R[300]["rf"]) and metric(pg, "w10r-knn") == pc(R[300]["knn5"])
              and metric(pg, "w10r-lr") == pc(R[300]["logreg"]))
        seg(pg, "w10r-scaling", "raw")
        check("robust: raw scaling", metric(pg, "w10r-scale") == pc(SC["rf_raw"]) + " / " + pc(SC["knn5_raw"]))
        reset(pg, "w10-robust")
        check("robust: reset", metric(pg, "w10r-rf") == pc(R[0]["rf"]) and
              pg.locator("#w10r-scaling button[aria-pressed='true']").get_attribute("data-value") == "standardised")

        # 6 importance
        I = W["importance"]
        check("importance: group off by default", metric(pg, "w10i-group") == "off" and
              metric(pg, "w10i-area") == f"{I['keep_one_size']['worst_area_mdi_before']:.3f}")
        pg.locator("#w10i-g").check(); pg.wait_for_timeout(200)
        check("importance: group permutation", metric(pg, "w10i-group") == f"{I['group_perm_size_auc_drop']:.3f}")
        pg.locator("#w10i-k").check(); pg.wait_for_timeout(200)
        check("importance: keep worst area", metric(pg, "w10i-area") == f"{I['keep_one_size']['worst_area_mdi_after']:.3f}")
        pg.locator("#w10i-n").check(); pg.wait_for_timeout(200)
        check("importance: noise bars shown", "continuous noise" in pg.locator("#viz-w10-importance").inner_text())
        reset(pg, "w10-importance")
        check("importance: reset", metric(pg, "w10i-group") == "off" and not pg.locator("#w10i-n").is_checked())

        # 7 proteins
        T = N["proteins"]["tasks"]
        tm, sp = T["transmembrane"], T["signal_peptide"]
        check("proteins: TM classical", metric(pg, "w10p-rf") == f"{tm['rows']['classical|rf']['test_auc']:.3f}" and
              metric(pg, "w10p-diff") == f"{tm['boot_esm2rf_minus_classicalrf']['diff']:+.3f}")
        seg(pg, "w10p-rep", "esm2")
        check("proteins: TM ESM-2", metric(pg, "w10p-rf") == f"{tm['rows']['esm2|rf']['test_auc']:.3f}" and
              metric(pg, "w10p-lr") == f"{tm['rows']['esm2|logreg']['test_auc']:.3f}" and
              metric(pg, "w10p-knn") == f"{tm['rows']['esm2|knn']['test_auc']:.3f}")
        seg(pg, "w10p-task", "signal_peptide")
        check("proteins: SP ESM-2", metric(pg, "w10p-rf") == f"{sp['rows']['esm2|rf']['test_auc']:.3f}" and
              metric(pg, "w10p-diff") == f"{sp['boot_esm2rf_minus_classicalrf']['diff']:+.3f}")
        seg(pg, "w10p-rep", "esm2_shuffled")
        check("proteins: shuffled control", metric(pg, "w10p-rf") == f"{sp['rows']['esm2_shuffled|rf']['test_auc']:.3f}" and
              "not computed" in pg.locator("#viz-w10-proteins").inner_text())
        reset(pg, "w10-proteins")
        check("proteins: reset", metric(pg, "w10p-rf") == f"{tm['rows']['classical|rf']['test_auc']:.3f}")

        # 8 leaderboard still renders its table
        check("leaderboard: table rendered", pg.locator("#viz-leaderboard table").count() >= 1)

        check("no console or page errors", not errors, errors[:5])
        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True)
            for v in ids:
                pg.locator(f"#viz-{v}").screenshot(path=os.path.join(SHOTS, f"{v}.png"))

        mob = b.new_page(viewport={"width": 390, "height": 844})
        mob.goto(BASE + "/weeks/week10.html"); mob.wait_for_timeout(4000)
        over = mob.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check("mobile: no horizontal page scroll", over <= 1, over)
        b.close()
    bad = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(bad)}/{len(results)} checks passed")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
