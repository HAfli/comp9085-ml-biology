#!/usr/bin/env python3
"""
COMP9085 interaction test.

The page test checks that each figure draws on load. This one drives every
control on every figure and checks that nothing throws, that the reset button
restores a working state, and that the readout metrics actually change when the
inputs change (a figure that ignores its own controls passes the first test and
is still broken).

Usage:
    python3 -m http.server 8899 &
    python3 data/scripts/test_interactions.py
"""
import os
import sys
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright

BASE = os.environ.get("SITE_BASE", "http://localhost:8899/")

TARGETS = [
    ("weeks/week01.html", "viz-problem-classifier"),
    ("weeks/week02.html", "viz-decision-tree"),
    ("weeks/week02.html", "viz-entropy"),
    ("weeks/week02.html", "viz-deployment"),
    ("weeks/week03.html", "viz-data-splitter"),
    ("weeks/week03.html", "viz-cv-explorer"),
    ("weeks/week03.html", "viz-leakage"),
    ("weeks/week03.html", "viz-pipeline-builder"),
    ("weeks/week03.html", "viz-hyperparameter"),
    ("weeks/week03.html", "viz-wdbc-e2e"),
    ("weeks/week04.html", "viz-cm-calc"),
    ("weeks/week04.html", "viz-bayes"),
    ("weeks/week04.html", "viz-prevalence"),
    ("weeks/week04.html", "viz-threshold"),
    ("weeks/week04.html", "viz-calibration"),
    ("weeks/week04.html", "viz-wdbc-models"),
    ("weeks/week05.html", "viz-nb-bayes"),
    ("weeks/week05.html", "viz-nb-evidence"),
    ("weeks/week05.html", "viz-text-repr"),
    ("weeks/week05.html", "viz-naive-bayes"),
    ("weeks/week05.html", "viz-nb-leakage"),
    ("weeks/week05.html", "viz-nb-compare"),
    ("weeks/week06.html", "viz-data-quality"),
    ("weeks/week07.html", "viz-pca"),
    ("weeks/week07.html", "viz-embeddings"),
    ("weeks/week08.html", "viz-knn-vote"),
    ("weeks/week08.html", "viz-knn-regression"),
    ("weeks/week08.html", "viz-distance-calc"),
    ("weeks/week08.html", "viz-knn-scaling"),
    ("weeks/week08.html", "viz-knn-irrelevant"),
    ("weeks/week08.html", "viz-knn-weighted"),
    ("weeks/week08.html", "viz-knn-cv"),
    ("weeks/week08.html", "viz-knn"),
    ("weeks/week09.html", "viz-clustering"),
    ("weeks/week10.html", "viz-random-forest"),
    ("weeks/week10.html", "viz-leaderboard"),
    ("weeks/week11.html", "viz-fine-tuning"),
    ("weeks/week12.html", "viz-trust"),
    ("weeks/week12.html", "viz-fm-decision"),
    ("index.html", "viz-pipelines"),
]

failures = []


def snapshot(page, vid):
    """Everything visible that should react to a control change."""
    return page.evaluate(
        """(vid) => {
            const v = document.getElementById(vid);
            if (!v) return null;
            const metrics = Array.from(v.querySelectorAll('[data-m-value]'))
                .map(e => e.textContent).join('|');
            const stage = v.querySelector('[data-viz-stage]');
            const alt = v.querySelector('[data-viz-alt]');
            const explain = v.querySelector('[data-viz-explain]');
            // Hash the content rather than measuring its length: a figure can
            // reorder itself without changing how many characters it contains.
            const hash = (s) => {
                let h = 0;
                for (let i = 0; i < s.length; i++) {
                    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
                }
                return h;
            };
            return {
                metrics: metrics,
                stageLen: stage ? stage.innerHTML.length : 0,
                altLen: alt ? alt.innerHTML.length : 0,
                stageHash: stage ? hash(stage.innerHTML) : 0,
                explainHash: explain ? hash(explain.innerHTML) : 0
            };
        }""", vid)


def exercise(page, path, vid):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console",
            lambda m: errors.append("console: " + m.text)
            if m.type == "error" else None)

    page.goto(urljoin(BASE, path), wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(900)

    viz = page.query_selector("#" + vid)
    if viz is None:
        failures.append(f"{path}#{vid}: figure not found")
        return

    before = snapshot(page, vid)
    changed = False

    # --- range inputs -----------------------------------------------------
    for el in viz.query_selector_all("input[type=range]"):
        eid = el.get_attribute("id")
        lo = float(el.get_attribute("min") or 0)
        hi = float(el.get_attribute("max") or 100)
        for target in (lo, (lo + hi) / 2, hi):
            page.evaluate(
                """([id, v]) => {
                    const e = document.getElementById(id);
                    e.value = v;
                    e.dispatchEvent(new Event('input', {bubbles: true}));
                }""", [eid, target])
            page.wait_for_timeout(160)
        changed = True

    # --- selects ----------------------------------------------------------
    for el in viz.query_selector_all("select"):
        eid = el.get_attribute("id")
        values = page.evaluate(
            "(id) => Array.from(document.getElementById(id).options)"
            ".map(o => o.value)", eid)
        for v in values:
            page.select_option("#" + eid, v)
            page.wait_for_timeout(220)
        changed = True

    # --- checkboxes -------------------------------------------------------
    for el in viz.query_selector_all("input[type=checkbox]"):
        eid = el.get_attribute("id")
        for _ in range(2):
            page.evaluate(
                """(id) => {
                    const e = document.getElementById(id);
                    e.checked = !e.checked;
                    e.dispatchEvent(new Event('change', {bubbles: true}));
                }""", eid)
            page.wait_for_timeout(200)
        changed = True

    # --- segmented groups and other in-figure buttons ---------------------
    n_buttons = page.evaluate(
        """(vid) => document.querySelectorAll(
             '#' + vid + ' .seg button, #' + vid + ' [data-opt], ' +
             '#' + vid + ' [data-type], #' + vid + ' [data-ans], ' +
             '#' + vid + ' [data-find], #' + vid + ' [data-sort], ' +
             '#' + vid + ' .pipeline-step, #' + vid + ' [data-nb-example]'
           ).length""", vid)
    for i in range(min(n_buttons, 24)):
        try:
            page.evaluate(
                """([vid, i]) => {
                    const bs = document.querySelectorAll(
                      '#' + vid + ' .seg button, #' + vid + ' [data-opt], ' +
                      '#' + vid + ' [data-type], #' + vid + ' [data-ans], ' +
                      '#' + vid + ' [data-find], #' + vid + ' [data-sort], ' +
                      '#' + vid + ' .pipeline-step, #' + vid + ' [data-nb-example]');
                    if (bs[i] && !bs[i].disabled) bs[i].click();
                }""", [vid, i])
            page.wait_for_timeout(150)
        except Exception as exc:                                # noqa: BLE001
            failures.append(f"{path}#{vid}: clicking button {i} threw: {exc}")
        changed = True

    after = snapshot(page, vid)

    # --- reset ------------------------------------------------------------
    reset = page.query_selector("#" + vid + " [data-viz-reset]")
    if reset:
        reset.click()
        page.wait_for_timeout(500)
        final = snapshot(page, vid)
        if final["stageLen"] < 120:
            failures.append(f"{path}#{vid}: figure is empty after reset")
    else:
        failures.append(f"{path}#{vid}: no reset control")

    for e in errors:
        failures.append(f"{path}#{vid}: {e[:200]}")

    # A figure whose readout never moves while every control is swept is
    # almost certainly ignoring its controls.
    if changed and before and after:
        if (before["metrics"] == after["metrics"]
                and before["stageHash"] == after["stageHash"]
                and before["explainHash"] == after["explainHash"]
                and before["altLen"] == after["altLen"]):
            failures.append(
                f"{path}#{vid}: nothing changed after sweeping every control")


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        page = b.new_context(viewport={"width": 1280, "height": 900}).new_page()
        for path, vid in TARGETS:
            exercise(page, path, vid)
            print(f"  exercised {vid}")
        b.close()

    print(f"\nExercised {len(TARGETS)} figures.")
    if failures:
        print(f"\n{len(failures)} FAILURE(S):")
        for f in failures[:50]:
            print("  ✗", f)
        sys.exit(1)
    print("\nAll interactions passed.")


if __name__ == "__main__":
    main()
