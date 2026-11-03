#!/usr/bin/env python3
"""
COMP9085 site test harness.

Loads every page in a headless browser, checks that it rendered, that no
JavaScript errors were thrown, that every internal link resolves, that every
visualisation actually drew something, and that the accessible text alternative
under each figure is populated.

Usage:
    python3 -m http.server 8899 &
    python3 data/scripts/test_site.py
"""
import json
import os
import re
import sys
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright

BASE = os.environ.get("SITE_BASE", "http://localhost:8899/")
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PAGES = [
    "index.html", "start-here.html", "canvas.html", "roadmap.html",
    "weeks/index.html", "labs/index.html", "datasets.html",
    "foundation-models.html", "interactives.html",
] + [f"weeks/week{n:02d}.html" for n in range(1, 13)]

# canvas.html deliberately carries no site chrome: it is embedded inside
# Canvas, which supplies its own.
NO_CHROME = {"canvas.html"}

# Ignore console noise that is not our problem.
IGNORE = re.compile(r"favicon|DevTools|Autofill", re.I)

failures = []
warnings = []


def check_page(page, path):
    url = urljoin(BASE, path)
    errors, console = [], []

    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: console.append((m.type, m.text))
            if m.type in ("error", "warning") else None)

    resp = page.goto(url, wait_until="networkidle", timeout=30000)
    if resp is None or resp.status >= 400:
        failures.append(f"{path}: HTTP {resp.status if resp else 'no response'}")
        return

    page.wait_for_timeout(900)   # let the visualisations mount

    # 1. Did the page render past the loading placeholder?
    main_text = page.inner_text("#main")
    if "Loading" in main_text[:80] or len(main_text) < 400:
        failures.append(f"{path}: main content did not render "
                        f"({len(main_text)} chars)")

    # 2. JavaScript errors
    for e in errors:
        failures.append(f"{path}: pageerror: {e}")
    for kind, text in console:
        if kind == "error" and not IGNORE.search(text):
            failures.append(f"{path}: console error: {text[:220]}")

    # 3. Header and footer mounted (except on the embedded Canvas page)
    if path not in NO_CHROME:
        if not page.query_selector("header.site-header"):
            failures.append(f"{path}: site header did not mount")
        if not page.query_selector("footer.site-footer"):
            failures.append(f"{path}: site footer did not mount")

    # 4. Exactly one h1
    h1s = page.query_selector_all("h1")
    if len(h1s) != 1:
        warnings.append(f"{path}: {len(h1s)} <h1> elements (expected 1)")

    # 5. Every visualisation drew something and has a text alternative
    for viz in page.query_selector_all(".viz"):
        vid = viz.get_attribute("id") or "?"
        stage = viz.query_selector("[data-viz-stage]")
        if stage is None:
            failures.append(f"{path}: {vid}: no stage element")
            continue
        html = stage.inner_html()
        if len(html) < 120:
            failures.append(f"{path}: {vid}: stage is empty "
                            f"({len(html)} chars) - visualisation did not draw")
        alt = viz.query_selector("[data-viz-alt]")
        if alt is None or len(alt.inner_html()) < 200:
            failures.append(f"{path}: {vid}: text alternative is empty")
        if not viz.query_selector("[data-viz-reset]"):
            failures.append(f"{path}: {vid}: no reset control")

    # 6. Images have alt text; buttons have accessible names
    for img in page.query_selector_all("img"):
        if img.get_attribute("alt") is None:
            failures.append(f"{path}: <img> without alt attribute")
    unnamed = page.evaluate("""() => {
        const out = [];
        document.querySelectorAll('button').forEach(b => {
            const name = (b.innerText || '').trim() ||
                         b.getAttribute('aria-label') || '';
            if (!name) out.push(b.outerHTML.slice(0, 90));
        });
        return out;
    }""")
    for u in unnamed:
        failures.append(f"{path}: button with no accessible name: {u}")

    # 7. Form controls have labels
    unlabelled = page.evaluate("""() => {
        const out = [];
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.type === 'hidden') return;
            const id = el.id;
            const hasLabel = id && document.querySelector(`label[for="${id}"]`);
            if (!hasLabel && !el.getAttribute('aria-label') &&
                !el.getAttribute('aria-labelledby')) {
                out.push((el.tagName + '#' + (id || '(no id)')));
            }
        });
        return out;
    }""")
    for u in unlabelled:
        failures.append(f"{path}: unlabelled form control: {u}")

    # 8. Every slide download must resolve, and every video embed must have a
    #    title and a real source.
    for a in page.query_selector_all('a[download]'):
        href = a.get_attribute("href") or ""
        if not href:
            failures.append(f"{path}: download link with no href")
    for fr in page.query_selector_all("iframe"):
        src = fr.get_attribute("src") or ""
        if not fr.get_attribute("title"):
            failures.append(f"{path}: iframe without a title attribute")
        if "youtube" in src and "/embed/" not in src:
            failures.append(f"{path}: YouTube iframe is not an embed URL: {src}")

    # 9. Collect internal links for the link check
    links = page.evaluate("""() => Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.getAttribute('href'))""")
    return links


def main():
    seen_links = set()
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()

        for p in PAGES:
            links = check_page(page, p) or []
            for href in links:
                if href.startswith(("http://", "https://", "mailto:", "#",
                                    "data:")):
                    continue
                target = urljoin(urljoin(BASE, p), href).split("#")[0]
                seen_links.add((p, target))

        # Link check
        import urllib.request
        checked = {}
        for src, target in sorted(seen_links):
            if target in checked:
                code = checked[target]
            else:
                try:
                    req = urllib.request.Request(target, method="HEAD")
                    with urllib.request.urlopen(req, timeout=10) as r:
                        code = r.status
                except Exception as exc:                       # noqa: BLE001
                    code = getattr(exc, "code", 0) or 0
                checked[target] = code
            if code >= 400 or code == 0:
                failures.append(f"{src}: broken internal link -> {target} "
                                f"(HTTP {code})")

        # Mobile viewport pass on a representative sample
        mobile = ctx.new_page()
        mobile.set_viewport_size({"width": 390, "height": 844})
        for p in ["index.html", "weeks/week02.html", "weeks/week07.html",
                  "weeks/week12.html", "datasets.html"]:
            mobile.goto(urljoin(BASE, p), wait_until="networkidle")
            mobile.wait_for_timeout(700)
            overflow = mobile.evaluate(
                "() => document.documentElement.scrollWidth - "
                "document.documentElement.clientWidth")
            if overflow > 2:
                failures.append(f"{p}: horizontal overflow at 390px "
                                f"({overflow}px)")
        browser.close()

    print(f"\nChecked {len(PAGES)} pages and {len(seen_links)} internal links.")
    if warnings:
        print(f"\n{len(warnings)} warning(s):")
        for w in warnings[:30]:
            print("  ~", w)
    if failures:
        print(f"\n{len(failures)} FAILURE(S):")
        for f in failures[:60]:
            print("  ✗", f)
        if len(failures) > 60:
            print(f"  ... and {len(failures) - 60} more")
        sys.exit(1)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
