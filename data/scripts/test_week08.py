#!/usr/bin/env python3
"""
Week 8 interactive check: every lecture number that a "Try this interactively" slide asks
students to reproduce must appear in the corresponding exercise's readout.

    python3 -m http.server 8899 &
    python3 data/scripts/test_week08.py            # or SITE_BASE=https://hafli.github.io/comp9085-ml-biology/
    python3 data/scripts/test_week08.py --shots DIR   # also save one screenshot per exercise
"""
import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("SITE_BASE", "http://localhost:8899/")
URL = BASE.rstrip("/") + "/weeks/week08.html"
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
fails, passes = [], []


def metric(page, mid):
    return page.eval_on_selector("#" + mid + " [data-m-value]", "e => e.textContent.trim()")


def note(page, mid):
    return page.eval_on_selector("#" + mid + " [data-m-note]", "e => e.textContent.trim()")


def check(name, got, want):
    (passes if want in got else fails).append(f"{name}: expected '{want}' in '{got}'")


def setrange(page, sel, v):
    page.eval_on_selector(sel, "(e, v) => { e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); }", str(v))


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1280, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(URL, wait_until="networkidle")
        page.wait_for_timeout(800)

        # page structure
        for vid in ["knn-vote", "knn-regression", "distance-calc", "knn-scaling", "knn-irrelevant",
                    "knn-weighted", "knn-cv", "knn"]:
            check("present", "yes" if page.query_selector("#viz-" + vid + " svg, #viz-" + vid + " table") else "no", "yes")
        txt = page.inner_text("main")
        check("teaching-order note", txt, "Week 8 is taught before Week 7")
        check("lab links", page.inner_html("#lab"), "labs/week08/COMP9085_Week08_Lab.ipynb")
        check("no solutions link", "solutions" not in page.inner_html("#lab").replace("Solutions are released", "") and "ok" or "leak", "ok")

        # Exercise 1: lecture example, k = 1, 3, 5
        for k, want in [(1, "Black"), (3, "Black"), (5, "Yellow"), (8, "Tie")]:
            setrange(page, "#kv-k", k)
            check(f"Ex1 k={k}", metric(page, "kv-pred"), want)
        setrange(page, "#kv-k", 1)
        page.click("#kv-flip")
        check("Ex1 noise flips 1-NN", metric(page, "kv-pred"), "Yellow")
        page.click("#viz-knn-vote [data-viz-reset]")
        check("Ex1 reset", metric(page, "kv-pred"), "Black")
        page.click("#kv-regions")
        page.click("#kv-set button[data-value='heart']")
        check("Ex1 heart mode draws", "ok" if page.query_selector("#viz-knn-vote svg circle") else "no", "ok")
        page.click("#viz-knn-vote [data-viz-reset]")

        # Exercise 2: 81 and 81.857
        check("Ex2 uniform k=3", metric(page, "kr-pred"), "81.000")
        page.click("#kr-w button[data-value='distance']")
        check("Ex2 1/d^2", metric(page, "kr-pred"), "81.857")
        page.click("#kr-mode button[data-value='heart']")
        check("Ex2 heart mode", metric(page, "kr-pred"), "bpm")
        page.click("#viz-knn-regression [data-viz-reset]")

        # Exercise 3: every preset
        sel = "#dc-preset"
        for preset, mid, want in [("movie", "dc-euc", "20.518"), ("table", "dc-euc", "8.124"), ("table", "dc-man", "14"),
                                  ("scaleRaw", "dc-euc", "220.009"), ("scaleNorm", "dc-euc", "0.313"),
                                  ("weather", "dc-ham", "2"), ("dna", "dc-ham", "2"), ("mixed", "dc-ham", ".")]:
            page.select_option(sel, preset)
            check(f"Ex3 {preset}", metric(page, mid), want)
        page.select_option(sel, "weighted")
        page.fill("#viz-distance-calc input[data-k='w'][data-i='2']", "0")
        page.dispatch_event("#viz-distance-calc input[data-k='w'][data-i='2']", "change")
        page.wait_for_timeout(50)
        check("Ex3 weight 0 removes feature", metric(page, "dc-weuc"), "1.414")
        page.click("#viz-distance-calc [data-viz-reset]")

        # Exercise 4: scaling
        check("Ex4 unscaled CV", metric(page, "ks-cv"), "63.4%")
        page.click("#ks-scale button[data-value='standard']")
        check("Ex4 standardised CV", metric(page, "ks-cv"), "83.7%")
        page.click("#ks-next")
        page.click("#viz-knn-scaling [data-viz-reset]")

        # Exercise 5: irrelevant features
        check("Ex5 no noise", metric(page, "ki-acc"), "79.7%")
        setrange(page, "#ki-n", 6)
        check("Ex5 100 noise", metric(page, "ki-acc"), "67.3%")
        page.click("#ki-w button[data-value='0.0']")
        check("Ex5 weight 0", metric(page, "ki-share"), "0.0%")
        page.click("#viz-knn-irrelevant [data-viz-reset]")

        # Exercise 6: weighted votes
        check("Ex6 n=1 blue", metric(page, "kw-blue"), "0.4111")
        check("Ex6 n=1 yellow", metric(page, "kw-yellow"), "0.5667")
        check("Ex6 n=1 black", metric(page, "kw-black"), "2")
        setrange(page, "#kw-n", 3)
        check("Ex6 n=3 blue", metric(page, "kw-blue"), "0.01037")
        check("Ex6 n=3 black", metric(page, "kw-black"), "1.25")
        setrange(page, "#kw-n", 0)
        check("Ex6 uniform tie", metric(page, "kw-win"), "Tie")
        setrange(page, "#kw-n", 1)
        page.click("#kw-zero")
        check("Ex6 zero distance", metric(page, "kw-win"), "Yellow")
        page.click("#viz-knn-weighted [data-viz-reset]")

        # Exercise 7: CV
        check("Ex7 test hidden", metric(page, "kc-test"), "hidden")
        check("Ex7 grid choice", metric(page, "kc-grid"), "k = 33")
        page.click("#kc-reveal")
        check("Ex7 test reveal", metric(page, "kc-test"), "90.8%")
        page.click("#kc-weights button[data-value='distance']")
        check("Ex7 distance train 100%", note(page, "kc-k1"), "training 100%")

        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True)
            page.click("#viz-knn-cv [data-viz-reset]")
            for vid in ["knn-vote", "knn-regression", "distance-calc", "knn-scaling", "knn-irrelevant",
                        "knn-weighted", "knn-cv", "knn"]:
                page.locator("#viz-" + vid).screenshot(path=os.path.join(SHOTS, vid + ".png"))
            mob = b.new_page(viewport={"width": 390, "height": 844})
            mob.goto(URL, wait_until="networkidle"); mob.wait_for_timeout(800)
            mob.locator("#viz-knn-weighted").screenshot(path=os.path.join(SHOTS, "mobile-knn-weighted.png"))
            wide = mob.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
            check("mobile: no horizontal page scroll", "scroll" if wide else "ok", "ok")
        check("no JavaScript errors", "; ".join(errors) or "none", "none")
        b.close()
    for f in fails:
        print("  ✗", f)
    print(f"{len(passes)} checks passed, {len(fails)} failed ({URL})")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
