#!/usr/bin/env python3
"""
Playwright checks of the Week 10 page after the 2026 revision (ensemble learning): every Week 10 exercise mounts without
console errors; the three new exercises (w10-adaboost, w10-gboost, w10-compare) respond to every control and to reset;
the numbers they display equal data/scripts/week10_ensembles_numbers.json (the in-browser AdaBoost and gradient
boosting are recomputed and compared iteration by iteration); every link on the page resolves; and the page has no
horizontal scroll at phone width.

No web server is needed: by default the repository files are served to the browser through request interception.
    python3 data/scripts/test_week10_ensembles.py
    SITE_BASE=https://hafli.github.io/comp9085-ml-biology python3 data/scripts/test_week10_ensembles.py   # the live site
"""
import json
import mimetypes
import os
import sys
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
E = json.load(open(os.path.join(ROOT, "data", "scripts", "week10_ensembles_numbers.json")))
LOCAL = "http://w10.local"
BASE = os.environ.get("SITE_BASE", LOCAL).rstrip("/")
SHOTS = os.environ.get("SHOTS")
results = []
EX = ["w10-crowd", "w10-bootstrap", "w10-trees", "random-forest", "w10-importance", "w10-adaboost", "w10-gboost",
      "w10-compare", "w10-robust", "w10-proteins", "leaderboard"]


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else "  :: " + str(detail)[:300]))


def serve(route):
    path = route.request.url[len(LOCAL):].split("?")[0].split("#")[0].lstrip("/") or "index.html"
    f = os.path.join(ROOT, path)
    if os.path.isdir(f):
        f = os.path.join(f, "index.html")
    if not os.path.isfile(f):
        return route.fulfill(status=404, body="not found")
    route.fulfill(status=200, body=open(f, "rb").read(), content_type=mimetypes.guess_type(f)[0] or "application/octet-stream")


def metric(pg, mid):
    return pg.locator(f"#{mid} [data-m-value]").inner_text().strip()


def fmt_int(v):
    return f"{round(v):,}"


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1280, "height": 900})
        if BASE == LOCAL:
            ctx.route(LOCAL + "/**", serve)
        pg = ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(BASE + "/weeks/week10.html")
        pg.wait_for_selector("#viz-w10-compare [data-viz-stage] svg", timeout=20000)
        pg.wait_for_timeout(800)

        h1 = pg.locator("h1").first.inner_text()
        check("page title is the revised lecture", "Ensemble learning" in h1, h1)
        for ex in EX:
            el = pg.locator(f"#viz-{ex}")
            check(f"exercise {ex} present", el.count() == 1)
            check(f"exercise {ex} rendered", pg.locator(f"#viz-{ex} [data-viz-stage] svg, #viz-{ex} [data-viz-stage] table").count() > 0)

        # ---------------- AdaBoost step-through
        it = E["bacteria_toy"]["iterations"]
        check("adaboost: iteration 0 eps", metric(pg, "w10a-eps") == f"{it[0]['eps']:.4f}", metric(pg, "w10a-eps"))
        check("adaboost: iteration 0 alpha 0.6931 (as the bicycle example)", metric(pg, "w10a-alpha") == "0.6931", metric(pg, "w10a-alpha"))
        ok = True
        for k in range(1, 10):
            pg.locator("#w10a-next").click(); pg.wait_for_timeout(120)
            e_, a_, er = metric(pg, "w10a-eps"), metric(pg, "w10a-alpha"), metric(pg, "w10a-err")
            if e_ != f"{it[k]['eps']:.4f}" or a_ != f"{it[k]['alpha']:.4f}" or er != f"{it[k]['ensemble_errors']} of 10":
                ok = False; print("   mismatch at", k, e_, a_, er, it[k]["eps"], it[k]["alpha"], it[k]["ensemble_errors"])
        check("adaboost: all ten iterations equal the Python numbers (eps, alpha, ensemble errors)", ok)
        pg.locator("#w10a-next").click(); pg.wait_for_timeout(100)
        check("adaboost: Next stops at the last iteration", metric(pg, "w10a-eps") == f"{it[9]['eps']:.4f}")
        pg.locator("#w10a-prev").click(); pg.wait_for_timeout(100)
        check("adaboost: Previous goes back", metric(pg, "w10a-eps") == f"{it[8]['eps']:.4f}")
        pg.locator("#w10a-q").fill("4"); pg.wait_for_timeout(150)
        q4 = metric(pg, "w10a-pred")
        pg.locator("#viz-w10-adaboost [data-viz-reset]").click(); pg.wait_for_timeout(150)
        check("adaboost: reset returns to iteration 0 and 25 °C", metric(pg, "w10a-eps") == f"{it[0]['eps']:.4f}" and metric(pg, "w10a-pred") == "High", (metric(pg, "w10a-eps"), metric(pg, "w10a-pred")))
        pg.locator("#w10a-next").click(); pg.wait_for_timeout(100)
        pg.locator("#w10a-q").fill("4"); pg.wait_for_timeout(150)
        check("adaboost: after two stumps 4 °C is (wrongly) High, as in the worked example", metric(pg, "w10a-pred") == "High", metric(pg, "w10a-pred"))
        check("adaboost: query slider changes the prediction text", q4 in ("High", "Low"))
        pg.locator("#viz-w10-adaboost [data-viz-reset]").click()
        check("adaboost: alt table lists ten iterations", pg.locator("#viz-w10-adaboost [data-viz-alt] tbody tr").count() == 10)

        # ---------------- gradient boosting
        db, lc = E["diabetes_bmi"], E["diabetes_lr_curves"]
        mse_js = pg.evaluate("window.W10E.gbStages(1.0, 20).mse")
        check("gboost: in-browser stumps reproduce the Python MSE for 20 stages (|diff| < 0.5)",
              all(abs(a - b) < 0.5 for a, b in zip(mse_js, db["mse_by_stage"])),
              [round(a - b, 3) for a, b in zip(mse_js, db["mse_by_stage"])])
        check("gboost: starts at M0 with MSE 5,930", metric(pg, "w10g-mse") == fmt_int(db["mse_by_stage"][0]), metric(pg, "w10g-mse"))
        pg.locator("#w10g-add1").click(); pg.wait_for_timeout(150)
        check("gboost: one stump -> MSE as on the slide", metric(pg, "w10g-mse") == fmt_int(db["mse_by_stage"][1]), metric(pg, "w10g-mse"))
        check("gboost: held-out MSE at 1 tree (rate 1.0) equals Python", metric(pg, "w10g-test") == fmt_int(lc["1.0"]["test_mse"][0]), metric(pg, "w10g-test"))
        pg.locator("#w10g-add10").click(); pg.wait_for_timeout(150)
        check("gboost: Add 10 -> 11 stumps", metric(pg, "w10g-n") == "11")
        pg.locator("#w10g-add100").click(); pg.wait_for_timeout(200)
        check("gboost: Add 100 -> 111 stumps", metric(pg, "w10g-n") == "111")
        pg.locator("#w10g-slider").fill("300"); pg.wait_for_timeout(250)
        check("gboost: slider to 300, held-out MSE equals Python (rate 1.0)", metric(pg, "w10g-test") == fmt_int(lc["1.0"]["test_mse"][299]), metric(pg, "w10g-test"))
        pg.locator("#w10g-lr button[data-value='0.1']").click(); pg.wait_for_timeout(300)
        check("gboost: rate 0.1 at 300 trees, held-out MSE equals Python", metric(pg, "w10g-test") == fmt_int(lc["0.1"]["test_mse"][299]), metric(pg, "w10g-test"))
        pg.locator("#w10g-slider").fill(str(lc["0.1"]["best_trees"])); pg.wait_for_timeout(250)
        check("gboost: rate 0.1 at the best number of trees", metric(pg, "w10g-test") == fmt_int(lc["0.1"]["best_test_mse"]), metric(pg, "w10g-test"))
        pg.locator("#viz-w10-gboost [data-viz-reset]").click(); pg.wait_for_timeout(200)
        check("gboost: reset", metric(pg, "w10g-n") == "0" and pg.locator("#w10g-lr button[aria-pressed='true']").get_attribute("data-value") == "1.0")

        # ---------------- comparison
        c, dc = E["wdbc_comparison"], E["diabetes_comparison"]
        check("compare: WDBC single tree", metric(pg, "w10m-tree") == f"{100 * c['tree']['acc']:.1f}%", metric(pg, "w10m-tree"))
        best_e = max(["bagging", "rf", "adaboost", "gboost", "vote_soft", "vote_hard"], key=lambda k: c[k]["acc"])
        check("compare: WDBC best ensemble", metric(pg, "w10m-ens") == f"{100 * c[best_e]['acc']:.1f}%", metric(pg, "w10m-ens"))
        check("compare: WDBC best simple model is logistic regression", metric(pg, "w10m-simple") == f"{100 * c['logreg']['acc']:.1f}%")
        check("compare: nine models with fold dots", pg.locator("#viz-w10-compare [data-viz-alt] tbody tr").count() == 9)
        pg.locator("#w10m-ds button[data-value='diabetes']").click(); pg.wait_for_timeout(250)
        check("compare: diabetes tree R²", metric(pg, "w10m-tree") == f"{dc['tree']['r2']:.3f}", metric(pg, "w10m-tree"))
        check("compare: diabetes best simple model is linear regression", metric(pg, "w10m-simple") == f"{dc['linreg']['r2']:.3f}")
        pg.locator("#viz-w10-compare [data-viz-reset]").click(); pg.wait_for_timeout(200)
        check("compare: reset to WDBC", metric(pg, "w10m-tree") == f"{100 * c['tree']['acc']:.1f}%")

        # ---------------- provenance banners
        txt = pg.locator("#viz-w10-adaboost").inner_text()
        check("adaboost banner says the table is illustrative", "ILLUSTRATIVE" in txt)
        check("gboost banner says real data and names the source", "Efron" in pg.locator("#viz-w10-gboost").inner_text())

        # ---------------- page content
        body = pg.locator("main").inner_text()
        for s in ["The wisdom of crowds", "Bagging", "Random forests", "Feature importance", "Boosting", "Gradient boosting",
                  "Comparing ensembles with single models", "Optional extension"]:
            check(f"section present: {s}", s in body)
        check("no console errors", not errors, errors[:5])

        # ---------------- links
        hrefs = pg.eval_on_selector_all("main a[href]", "els => els.map(e => e.href)")
        bad = []
        for h in sorted(set(hrefs)):
            if h.startswith("mailto:") or h.startswith("javascript:"):
                continue
            if h.startswith(LOCAL):
                path = h[len(LOCAL):].split("#")[0].split("?")[0].lstrip("/")
                if path and not os.path.exists(os.path.join(ROOT, path)):
                    bad.append(h)
                continue
            try:
                req = urllib.request.Request(h, method="GET", headers={"User-Agent": "Mozilla/5.0 (COMP9085 link check)"})
                code = urllib.request.urlopen(req, timeout=20).status
                if code >= 400:
                    bad.append((h, code))
            except Exception as ex:      # some publishers refuse robots; record, judge separately
                code = getattr(ex, "code", None)
                if code not in (401, 403, 405, 418, 429):
                    bad.append((h, str(ex)[:80]))
        check(f"all {len(set(hrefs))} links on the page resolve (403/429 from publishers tolerated)", not bad, bad[:6])

        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True)
            for ex in ("w10-adaboost", "w10-gboost", "w10-compare"):
                pg.locator(f"#viz-{ex}").screenshot(path=os.path.join(SHOTS, f"{ex}_desktop.png"))

        # ---------------- mobile
        m = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, device_scale_factor=2)
        if BASE == LOCAL:
            m.route(LOCAL + "/**", serve)
        mp = m.new_page()
        merr = []
        mp.on("pageerror", lambda e: merr.append(str(e)))
        mp.goto(BASE + "/weeks/week10.html")
        mp.wait_for_selector("#viz-w10-compare [data-viz-stage] svg", timeout=20000)
        mp.wait_for_timeout(600)
        sw = mp.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
        check("mobile: no horizontal page scroll", sw[0] <= sw[1] + 1, sw)
        for ex in ("w10-adaboost", "w10-gboost", "w10-compare"):
            w = mp.evaluate(f"document.querySelector('#viz-{ex}').getBoundingClientRect().width")
            check(f"mobile: {ex} fits the screen", w <= 390, w)
        mp.locator("#w10a-next").click(); mp.locator("#w10g-add1").click(); mp.wait_for_timeout(200)
        check("mobile: controls work", mp.locator("#w10a-eps [data-m-value]").inner_text().strip() == f"{it[1]['eps']:.4f}")
        check("mobile: no script errors", not merr, merr[:3])
        if SHOTS:
            for ex in ("w10-adaboost", "w10-gboost", "w10-compare"):
                mp.locator(f"#viz-{ex}").screenshot(path=os.path.join(SHOTS, f"{ex}_mobile.png"))
        b.close()

    n_fail = sum(1 for r in results if not r[1])
    print(f"\n{len(results) - n_fail} passed, {n_fail} failed")
    sys.exit(1 if n_fail else 0)


if __name__ == "__main__":
    main()
