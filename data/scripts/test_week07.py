#!/usr/bin/env python3
"""
Playwright checks of the Week 7 page (refreshed 2026/27): every exercise mounts, its controls
work, its reset works, and the numbers it shows equal data/scripts/week07r_numbers.json.

    python3 -m http.server 8899 &                         # from the repository root
    python3 data/scripts/test_week07.py                   # or SITE_BASE=https://hafli.github.io/comp9085-ml-biology
    python3 data/scripts/test_week07.py --shots DIR       # also save a screenshot of every exercise
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week07r_numbers.json")))
BASE = os.environ.get("SITE_BASE", "http://localhost:8899").rstrip("/")
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else "  :: " + str(detail)[:300]))


def metric(pg, mid):
    return pg.locator(f"#{mid} [data-m-value]").inner_text().strip()


def note(pg, vid):
    return pg.locator(f"#viz-{vid} [data-viz-note]").inner_text()


def seg(pg, sid, value):
    pg.locator(f"#{sid} button[data-value='{value}']").click()
    pg.wait_for_timeout(150)


def main():
    K, NB, TR, PC = N["knn"], N["neighbourhoods"], N["trustworthiness"], N["pca"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(BASE + "/weeks/week07.html")
        pg.wait_for_timeout(3000)
        ids = ["w7-curse", "pca", "w7-pca", "w7-tsne", "w7-umap", "w7-map", "w7-knn", "w7-neighbours", "w7-shuffle", "embeddings"]
        for v in ids:
            el = pg.locator(f"#viz-{v}")
            check(f"{v}: present and drawn", el.count() == 1 and "<svg" in el.inner_html() and
                  "failed to render" not in el.inner_text(), v)
        txt = pg.locator("main").inner_text() if pg.locator("main").count() else pg.inner_text("body")
        check("teaching-order note shown", "taught in the session after Week 8" in txt)
        check("lab files linked", pg.locator("a[href$='labs/week07/COMP9085_Week07_Lab.ipynb']").count() >= 1)
        check("no link to solutions", pg.locator("a[href*='solutions']").count() == 0)
        check("no .pptx or .pdf links", pg.locator("a[href$='.pptx'], a[href$='.pdf']").count() == 0)

        # 1. curse
        check("curse: d = 2 at start", metric(pg, "w7c-d") == "2")
        pg.locator("#w7c-di").fill("9"); pg.wait_for_timeout(200)
        check("curse: slider to 320", metric(pg, "w7c-d") == "320")
        check("curse: real contrast table", f"{N['concentration']['ESM-2 (320)']:.2f}" in note(pg, "w7-curse"))
        pg.locator("#viz-w7-curse [data-viz-reset]").click(); pg.wait_for_timeout(200)
        check("curse: reset", metric(pg, "w7c-d") == "2")

        # 3. PCA on proteins
        check("pca: classical k90", metric(pg, "w7p-90") == str(PC["classical|standard"]["k90"]))
        seg(pg, "w7p-scale", "none")
        check("pca: unscaled PC1", metric(pg, "w7p-pc1") == f"{100 * PC['classical|none']['pc1']:.1f}%")
        seg(pg, "w7p-rep", "esm2"); seg(pg, "w7p-scale", "standard")
        check("pca: ESM-2 k90", metric(pg, "w7p-90") == str(PC["esm2|standard"]["k90"]))
        pg.locator("#w7p-k").fill("10"); pg.wait_for_timeout(200)
        check("pca: neighbours kept at 10", metric(pg, "w7p-nb") == f"{round(100 * NB['overlap_with_esm2']['esm2_pca10'])}%")
        check("pca: k-NN AUC in note", f"{N['reduced_knn']['signal_peptide']['pca_10']:.3f}" in note(pg, "w7-pca"))
        pg.locator("#viz-w7-pca [data-viz-reset]").click(); pg.wait_for_timeout(200)
        check("pca: reset", metric(pg, "w7p-90") == str(PC["classical|standard"]["k90"]))

        # 4/5. t-SNE, UMAP
        check("tsne: trust default", metric(pg, "w7t-trust") == f"{TR['esm2|tsne|30|0']:.3f}")
        seg(pg, "w7t-perp", "5")
        check("tsne: perplexity 5", metric(pg, "w7t-trust") == f"{TR['esm2|tsne|5|0']:.3f}")
        seg(pg, "w7t-perp", "30"); seg(pg, "w7t-run", "random|2")
        check("tsne: random init seed 2", metric(pg, "w7t-trust") == f"{TR['esm2|tsne_random|30|2']:.3f}")
        seg(pg, "w7u-nn", "200"); seg(pg, "w7u-md", "0.99")
        check("umap: 200 / 0.99", metric(pg, "w7u-trust") == f"{TR['esm2|umap|200|0.99|0']:.3f}")
        pg.locator("#viz-w7-umap [data-viz-reset]").click(); pg.wait_for_timeout(200)
        check("umap: reset", metric(pg, "w7u-trust") == f"{TR['esm2|umap|15|0.1|0']:.3f}")

        # 6. map
        check("map: PCA trust", metric(pg, "w7m-trust") == f"{TR['esm2|pca']:.3f}")
        seg(pg, "w7m-method", "tsne")
        check("map: t-SNE trust", metric(pg, "w7m-trust") == f"{TR['esm2|tsne|30|0']:.3f}")
        seg(pg, "w7m-rep", "classical"); seg(pg, "w7m-method", "umap")
        check("map: classical UMAP trust", metric(pg, "w7m-trust") == f"{TR['classical|umap|15|0.1|0']:.3f}")
        opts = pg.locator("#w7m-q option").count()
        pg.select_option("#w7m-q", index=5); pg.wait_for_timeout(200)
        check("map: protein select works", opts >= 40 and "/ 10" in metric(pg, "w7m-kept"), opts)

        # 7. k-NN comparison
        for task in ["signal_peptide", "transmembrane"]:
            if task == "transmembrane":
                seg(pg, "w7k-task", "transmembrane")
            check(f"knn {task}: classical CV", metric(pg, "w7k-cl") == f"{K[task]['classical']['best']['cv_roc_auc']:.3f}")
            check(f"knn {task}: ESM-2 CV", metric(pg, "w7k-es") == f"{K[task]['esm2']['best']['cv_roc_auc']:.3f}")
            check(f"knn {task}: test hidden", metric(pg, "w7k-test") == "hidden")
        pg.locator("#w7k-reveal").check(); pg.wait_for_timeout(200)
        t = K["transmembrane"]
        check("knn: reveal test", metric(pg, "w7k-test") ==
              f"{t['esm2']['best']['test']['roc_auc']:.3f} vs {t['classical']['best']['test']['roc_auc']:.3f}")
        nt = note(pg, "w7-knn")
        check("knn: bootstrap shown", f"{t['bootstrap']['esm2_minus_classical']['ci95'][0]:.3f}" in nt)
        check("knn: confusion matrix shown", f"[{', '.join(map(str, t['classical']['best']['test']['cm'][0]))}]" in nt)
        pg.locator("#w7k-shuffled").check(); pg.wait_for_timeout(200)
        check("knn: shuffled curve in alt table", "ESM-2 of residue-shuffled" in pg.locator("#viz-w7-knn [data-viz-alt]").inner_html())
        pg.locator("#viz-w7-knn [data-viz-reset]").click(); pg.wait_for_timeout(200)
        check("knn: reset hides test", metric(pg, "w7k-test") == "hidden" and
              metric(pg, "w7k-cl") == f"{K['signal_peptide']['classical']['best']['cv_roc_auc']:.3f}")

        # 8. neighbours
        check("neighbours: classical overlap", metric(pg, "w7n-cl") == f"{round(100 * NB['overlap_with_esm2']['classical'])}%")
        stage = pg.locator("#viz-w7-neighbours [data-viz-stage]").inner_text()
        ex = N["example"]["neighbours"]
        check("neighbours: IL-12B ESM-2 list", "Protein IL-40" in stage and "Interleukin-12 subunit beta" in stage)
        check("neighbours: composition 0/10 SP", "0/10 share its signal-peptide label" in stage,
              [r[2] for r in ex["composition"]])
        pg.select_option("#w7n-c", "esm2_pca2"); pg.wait_for_timeout(200)
        check("neighbours: PCA2 shares 0 with ESM-2",
              "0/10 shared with ESM-2" in pg.locator("#viz-w7-neighbours [data-viz-stage]").inner_text())

        # 9. shuffle
        check("shuffle: composition identical", metric(pg, "w7s-comp") == "identical")
        seg(pg, "w7s-view", "map"); seg(pg, "w7s-view", "hist")
        check("shuffle: share closer", f"{round(100 * N['shuffle']['share_twin_closer_than_nearest_other'])}%" in note(pg, "w7-shuffle"))
        pg.select_option("#w7s-q", index=3); pg.wait_for_timeout(200)
        check("shuffle: other protein still identical", metric(pg, "w7s-comp") == "identical")

        check("no console or page errors", not errors, errors[:5])
        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True)
            for v in ids:
                pg.locator(f"#viz-{v}").screenshot(path=os.path.join(SHOTS, f"{v}.png"))

        # mobile: no horizontal overflow
        m = b.new_page(viewport={"width": 390, "height": 844})
        m.goto(BASE + "/weeks/week07.html"); m.wait_for_timeout(3000)
        over = m.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        check("mobile: no horizontal page scroll", over <= 1, over)
        b.close()
    bad = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(bad)}/{len(results)} checks passed")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
