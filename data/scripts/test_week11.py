#!/usr/bin/env python3
"""
Playwright checks of the Week 11 page (boosting and fine-tuning foundation models): every exercise mounts without console
errors; the five real-data exercises respond to every control and to reset; the numbers they display equal
data/scripts/week11_numbers.json; the LoRA arithmetic in the browser equals the peft count; every link on the page
(and every lab file it lists) resolves; and the page has no horizontal scroll at phone width.

No web server is needed: by default the repository files are served to the browser through request interception.
    python3 data/scripts/test_week11.py
    SITE_BASE=https://hafli.github.io/comp9085-ml-biology python3 data/scripts/test_week11.py   # the live site
"""
import json
import mimetypes
import os
import sys
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
N = json.load(open(os.path.join(ROOT, "data", "scripts", "week11_numbers.json")))
LOCAL = "http://w11.local"
BASE = os.environ.get("SITE_BASE", LOCAL).rstrip("/")
SHOTS = os.environ.get("SHOTS")
results = []
EX = ["w11-gbtune", "w11-importance", "w11-ladder", "w11-zeroshot", "w11-lora", "fine-tuning"]
NEW = EX[:5]


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


def seg(pg, gid, value):
    pg.locator(f"#{gid} button[data-value='{value}']").click()
    pg.wait_for_timeout(120)


def slide(pg, sid, v):
    pg.locator(f"#{sid}").evaluate("(el, v) => { el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); }", v)
    pg.wait_for_timeout(120)


def main():
    GC = N["gb_curves"]; S = GC["stages"]; L = N["ladder"]["rows"]; LA = N["lora_arith"]; Z = N["zero_shot"]
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1280, "height": 900})
        if BASE == LOCAL:
            ctx.route(LOCAL + "/**", serve)
        pg = ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(BASE + "/weeks/week11.html")
        pg.wait_for_selector("#viz-w11-lora [data-viz-stage] svg", timeout=20000)
        pg.wait_for_timeout(800)

        h1 = pg.locator("h1").first.inner_text()
        check("page title is the new lecture", "Boosting and fine-tuning foundation models" in h1, h1)
        for ex in EX:
            check(f"exercise {ex} present", pg.locator(f"#viz-{ex}").count() == 1)
            check(f"exercise {ex} rendered", pg.locator(f"#viz-{ex} [data-viz-stage] svg, #viz-{ex} [data-viz-stage] table, #viz-{ex} svg").count() > 0)
        for ex in NEW:
            t = pg.locator(f"#viz-{ex}").inner_text()
            check(f"{ex}: banner says real data or exact arithmetic", "Real data" in t or "Exact arithmetic" in t)

        # ---------------- 1. gradient-boosting curves
        c = GC["curves"]["0.1|3|1.0"]
        check("gbtune: default best trees", metric(pg, "w11t-best") == str(c["best_trees"]), metric(pg, "w11t-best"))
        check("gbtune: default best log-loss", metric(pg, "w11t-bestll") == f"{c['best_val_logloss']:.3f}")
        check("gbtune: log-loss at 400 trees", metric(pg, "w11t-n") == f"{c['val_logloss'][-1]:.3f}")
        ok = True
        for lr in ["1.0", "0.3", "0.03"]:
            for d in ["1", "6"]:
                for s in ["0.5", "1.0"]:
                    seg(pg, "w11t-lr", lr); seg(pg, "w11t-depth", d); seg(pg, "w11t-sub", s)
                    cc = GC["curves"][f"{float(lr)}|{int(d)}|{float(s)}"]
                    if metric(pg, "w11t-best") != str(cc["best_trees"]) or metric(pg, "w11t-bestll") != f"{cc['best_val_logloss']:.3f}":
                        ok = False; print("   mismatch", lr, d, s, metric(pg, "w11t-best"), cc["best_trees"])
        check("gbtune: 12 combinations of rate, depth and subsample equal the Python curves", ok)
        slide(pg, "w11t-trees", 9)
        cc = GC["curves"]["0.03|6|1.0"]
        check("gbtune: trees slider reads the curve at that stage",
              metric(pg, "w11t-n") == f"{cc['val_logloss'][9]:.3f}" and metric(pg, "w11t-auc") == f"{cc['val_auc'][9]:.3f}",
              (metric(pg, "w11t-n"), cc["val_logloss"][9]))
        pg.locator("#viz-w11-gbtune [data-viz-reset]").click(); pg.wait_for_timeout(150)
        check("gbtune: reset restores the defaults", metric(pg, "w11t-best") == str(c["best_trees"]))

        # ---------------- 2. importance
        I = N["importance"]; top = I["perm_order"][0]
        check("importance: top feature drop equals Python", metric(pg, "w11i-drop") == f"{I['perm_mean'][top]:.3f}")
        n10 = pg.locator("#viz-w11-importance [data-viz-stage] svg rect").count()
        seg(pg, "w11i-n", "23")
        n23 = pg.locator("#viz-w11-importance [data-viz-stage] svg rect").count()
        check("importance: 'All 23' shows more bars than 'Top 10'", n23 > n10, (n10, n23))
        pg.locator("#viz-w11-importance [data-viz-reset]").click(); pg.wait_for_timeout(150)
        check("importance: reset", pg.locator("#viz-w11-importance [data-viz-stage] svg rect").count() == n10)

        # ---------------- 3. ladder
        check("ladder: descriptors + boosting", metric(pg, "w11l-desc") == f"{L['hgb_desc']['test_auc']:.3f}")
        check("ladder: frozen first-100 head", metric(pg, "w11l-frozen") == f"{L['logreg_esm_nterm']['test_auc']:.3f}")
        check("ladder: LoRA mean ± SD", metric(pg, "w11l-lora") == f"{L['ft_lora']['test_auc']:.3f} ± {L['ft_lora']['test_auc_sd']:.3f}")
        check("ladder: full fine-tuning mean ± SD", metric(pg, "w11l-full") == f"{L['ft_full']['test_auc']:.3f} ± {L['ft_full']['test_auc_sd']:.3f}")
        seg(pg, "w11l-view", "params")
        txt = pg.locator("#viz-w11-ladder [data-viz-stage]").inner_text()
        check("ladder: parameter view shows a bar for each rung with a parameter count (5)", pg.locator("#viz-w11-ladder [data-viz-stage] svg g rect").count() >= 5,
              pg.locator("#viz-w11-ladder [data-viz-stage] svg g rect").count())
        pg.locator("#viz-w11-ladder [data-viz-reset]").click(); pg.wait_for_timeout(150)
        check("ladder: reset returns to the AUC view (one marker per rung)", pg.locator("#viz-w11-ladder [data-viz-stage] svg g circle").count() >= 8)
        alt = pg.locator("#viz-w11-ladder [data-viz-alt]").text_content()
        check("ladder: text alternative lists all nine pipelines", all(L[k]["label"] in alt for k in N["ladder"]["order"]))

        # ---------------- 4. zero-shot
        AA = Z["alphabet"]; wt = Z["wild_type"]
        check("zero-shot: default position", metric(pg, "w11z-pos") == f"{wt[11]}12", metric(pg, "w11z-pos"))
        ok = True
        for pos in [0, 5, 11, 20, 23]:
            slide(pg, "w11z-slider", pos)
            row = Z["scores"][pos]
            ks = [k for k in range(20) if AA[k] != wt[pos]]
            worst = min(ks, key=lambda k: row[k])
            exp = f"{wt[pos]}{pos + 1}{AA[worst]}: {row[worst]:.3f}"
            if metric(pg, "w11z-worst") != exp:
                ok = False; print("   zero-shot mismatch", pos, metric(pg, "w11z-worst"), exp)
        check("zero-shot: least plausible substitution equals Python at 5 positions", ok)
        pg.locator("#viz-w11-zeroshot [data-viz-stage] svg rect").nth(3 * 20 + 4).click(); pg.wait_for_timeout(150)
        check("zero-shot: clicking a cell selects its position", metric(pg, "w11z-pos") == f"{wt[3]}4", metric(pg, "w11z-pos"))
        pg.locator("#viz-w11-zeroshot [data-viz-reset]").click(); pg.wait_for_timeout(150)
        check("zero-shot: reset", metric(pg, "w11z-pos") == f"{wt[11]}12")

        # ---------------- 5. LoRA arithmetic
        check("lora: per-matrix count", metric(pg, "w11r-per") == f"{LA['per_matrix']:,}", metric(pg, "w11r-per"))
        check("lora: adapter total equals the Python arithmetic", metric(pg, "w11r-tot") == f"{LA['lora_total']:,}")
        check("lora: peft check value", metric(pg, "w11r-check") == f"{LA['peft_reported']:,}")
        js_total = pg.evaluate("window.W11.loraCount('8M', 8, 'qv')")
        check("lora: browser formula + head equals the peft count", js_total + LA["head"] == LA["peft_reported"], (js_total, LA))
        seg(pg, "w11r-model", "650M"); slide(pg, "w11r-rank", 4)
        exp = 33 * 2 * 16 * (1280 + 1280)
        check("lora: ESM-2 650M rank 16 query+value", metric(pg, "w11r-tot") == f"{exp:,}", metric(pg, "w11r-tot"))
        seg(pg, "w11r-tgt", "all")
        exp2 = 33 * 4 * 16 * 2560 + 33 * (16 * (1280 + 5120) * 2)
        check("lora: attention + feed-forward adds the FFN matrices", metric(pg, "w11r-tot") == f"{exp2:,}", metric(pg, "w11r-tot"))
        pg.locator("#viz-w11-lora [data-viz-reset]").click(); pg.wait_for_timeout(150)
        check("lora: reset", metric(pg, "w11r-tot") == f"{LA['lora_total']:,}")

        # ---------------- page content and lab
        body = pg.locator("main").inner_text()
        for s in ["From Week 10 to Week 11", "Boosting: sequential error correction", "XGBoost-style implementations",
                  "What does the boosted model rely on", "Foundation models, pretraining and embeddings", "Zero-shot",
                  "LoRA and adapters", "One protein task, every rung", "homology, pretraining overlap", "Optional"]:
            check(f"section present: {s}", s in body)
        check("lab section names the Week 11 lab", "Boosting, pretrained protein embeddings and fine-tuning" in body)
        check("no console errors", not errors, errors[:5])

        # ---------------- links (including the lab files)
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
            except Exception as ex:
                code = getattr(ex, "code", None)
                if code not in (401, 403, 405, 418, 429):
                    bad.append((h, str(ex)[:80]))
        lab_links = [h for h in hrefs if "labs/week11/" in h]
        check("the page links the lab notebook, demo and five data files", len(set(lab_links)) >= 8, len(set(lab_links)))
        check(f"all {len(set(hrefs))} links on the page resolve (403/429 from publishers tolerated)", not bad, bad[:6])

        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True)
            for ex in NEW:
                pg.locator(f"#viz-{ex}").screenshot(path=os.path.join(SHOTS, f"{ex}_desktop.png"))

        # ---------------- mobile
        m = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, device_scale_factor=2)
        if BASE == LOCAL:
            m.route(LOCAL + "/**", serve)
        mp = m.new_page()
        merr = []
        mp.on("pageerror", lambda e: merr.append(str(e)))
        mp.goto(BASE + "/weeks/week11.html")
        mp.wait_for_selector("#viz-w11-lora [data-viz-stage] svg", timeout=20000)
        mp.wait_for_timeout(600)
        sw = mp.evaluate("[document.documentElement.scrollWidth, window.innerWidth]")
        check("mobile: no horizontal page scroll", sw[0] <= sw[1] + 1, sw)
        for ex in NEW:
            w = mp.evaluate(f"document.querySelector('#viz-{ex}').getBoundingClientRect().width")
            check(f"mobile: {ex} fits the screen", w <= 390, w)
        mp.locator("#w11t-lr button[data-value='1.0']").click(); mp.wait_for_timeout(200)
        check("mobile: controls work", mp.locator("#w11t-best [data-m-value]").inner_text().strip() ==
              str(GC["curves"]["1.0|3|1.0"]["best_trees"]))
        check("mobile: no script errors", not merr, merr[:3])
        if SHOTS:
            for ex in NEW:
                mp.locator(f"#viz-{ex}").screenshot(path=os.path.join(SHOTS, f"{ex}_mobile.png"))
        b.close()

    n_fail = sum(1 for r in results if not r[1])
    print(f"\n{len(results) - n_fail} passed, {n_fail} failed")
    sys.exit(1 if n_fail else 0)


if __name__ == "__main__":
    main()
