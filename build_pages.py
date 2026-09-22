#!/usr/bin/env python3
"""
Generate the twelve week-page shells.

Each week page is a thin HTML document that loads the shared scripts and calls
renderWeek(n). All the content lives in js/data/course.js, so this script only
ever needs to be re-run if the shell itself changes (a new script include, say),
not when course content changes.

Run:  python3 build_pages.py
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

SCRIPTS = [
    "js/config.js",
    "js/data/course.js",
    "js/data/references.js",
    "js/data/datasets.js",
    "js/data/models.js",
    "js/data/labs.js",
    "js/data/wdbc.js",
    "js/data/benchmarks.js",
    "js/data/sequences.js",
    "js/data/recalls.js",
    "js/store.js",
    "js/components.js",
    "js/ml.js",
    "js/navigation.js",
    "js/visualisations/_chart.js",
    "js/visualisations/_model.js",
    "js/visualisations/problem-classifier.js",
    "js/visualisations/decision-tree.js",
    "js/visualisations/deployment.js",
    "js/visualisations/entropy.js",
    "js/visualisations/leakage.js",
    "js/visualisations/bayes.js",
    "js/visualisations/naive-bayes.js",
    "js/visualisations/data-quality.js",
    "js/visualisations/pca.js",
    "js/visualisations/embeddings.js",
    "js/visualisations/knn.js",
    "js/visualisations/clustering.js",
    "js/visualisations/random-forest.js",
    "js/visualisations/leaderboard.js",
    "js/visualisations/fine-tuning.js",
    "js/visualisations/foundation-models.js",
    "js/visualisations/trust.js",
    "js/week-page.js",
]

TEMPLATE = """<!DOCTYPE html>
<html lang="en" data-root="../" data-section="weeks">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Week {n}: {title} | COMP9085</title>
<meta name="description" content="{desc}">
<link rel="icon" href="data:image/svg+xml,{favicon}">
<link rel="stylesheet" href="../css/main.css">
<link rel="stylesheet" href="../css/responsive.css">
</head>
<body>
<div id="site-header"></div>
<main id="main">
  <div class="wrap" style="padding-top:3rem">
    <noscript>
      <div class="noscript-note">
        <h1>Week {n}: {title}</h1>
        <p><strong>This page needs JavaScript.</strong> The week pages are
        assembled in the browser from a single course-content file so that the
        material stays consistent across the site, and every figure on this site
        is a live model fitted in your browser rather than a picture.</p>
        <p>If you cannot enable JavaScript, the full curriculum, including every
        week's objectives, concepts, worked example and lab, is available as
        plain text in <code>docs/CURRICULUM.md</code> in the repository.</p>
      </div>
    </noscript>
    <p class="muted" id="loading-note">Loading week {n}...</p>
  </div>
</main>
<div id="site-footer"></div>

<script src="../js/vendor/d3.min.js"></script>
{scripts}
<script>
  document.addEventListener('DOMContentLoaded', function () {{
    window.renderWeek({n});
  }});
</script>
</body>
</html>
"""

FAVICON = ("%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 26 26'%3E"
           "%3Crect width='26' height='26' rx='6' fill='%231f5f4b'/%3E"
           "%3Cpath d='M8 5.5c0 4 10 4 10 8s-10 4-10 8' stroke='white' "
           "stroke-width='1.6' fill='none'/%3E%3Cpath d='M18 5.5c0 4-10 4-10 8"
           "s10 4 10 8' stroke='%23e7c48a' stroke-width='1.6' fill='none'/%3E"
           "%3C/svg%3E")


def read_weeks():
    """Pull the week titles and one-liners straight out of course.js so that
    this script cannot drift from the content."""
    import json
    import re
    src = open(os.path.join(ROOT, "js", "data", "course.js")).read()
    weeks = []
    for m in re.finditer(r"\n      n: (\d+),\n      title: '([^']+)',"
                         r"\n      strand: '[^']+',\n      short:\s*'([^']+)'",
                         src):
        weeks.append({"n": int(m.group(1)), "title": m.group(2),
                      "short": m.group(3)})
    return weeks


def main():
    weeks = read_weeks()
    if len(weeks) != 12:
        raise SystemExit(f"expected 12 weeks in course.js, parsed {len(weeks)}")

    scripts = "\n".join(f'<script src="../{s}"></script>' for s in SCRIPTS)
    outdir = os.path.join(ROOT, "weeks")
    os.makedirs(outdir, exist_ok=True)

    for w in weeks:
        path = os.path.join(outdir, f"week{w['n']:02d}.html")
        html = TEMPLATE.format(
            n=w["n"],
            title=w["title"].replace("&", "&amp;"),
            desc=w["short"].replace('"', "&quot;"),
            favicon=FAVICON,
            scripts=scripts,
        )
        with open(path, "w") as f:
            f.write(html)
        print("wrote", os.path.relpath(path, ROOT))

    print(f"\n{len(weeks)} week pages generated.")


if __name__ == "__main__":
    main()
