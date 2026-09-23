#!/usr/bin/env python3
"""
Generate the top-level page shells (home, roadmap, labs index, datasets,
foundation models, weeks index). Assessment and Resources are Canvas-only
and are deliberately not generated here - see README.md, "Lecture slides"
and the public/private boundary notes.

Like build_pages.py, these are thin shells; all content comes from the data
files, so this only needs re-running if the shell changes.

Run:  python3 build_top_pages.py
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
    "js/visualisations/foundation-models.js",
    "js/week-page.js",
    "js/pages.js",
]

FAVICON = ("%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 26 26'%3E"
           "%3Crect width='26' height='26' rx='6' fill='%231f5f4b'/%3E"
           "%3Cpath d='M8 5.5c0 4 10 4 10 8s-10 4-10 8' stroke='white' "
           "stroke-width='1.6' fill='none'/%3E%3Cpath d='M18 5.5c0 4-10 4-10 8"
           "s10 4 10 8' stroke='%23e7c48a' stroke-width='1.6' fill='none'/%3E"
           "%3C/svg%3E")

TEMPLATE = """<!DOCTYPE html>
<html lang="en" data-root="{root}" data-section="{section}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="data:image/svg+xml,{favicon}">
<link rel="stylesheet" href="{root}css/main.css">
<link rel="stylesheet" href="{root}css/responsive.css">
</head>
<body>
<div id="site-header"></div>
<main id="main">
  <div class="wrap" style="padding-top:3rem">
    <noscript>
      <div class="noscript-note">
        <h1>{h1}</h1>
        <p><strong>This page needs JavaScript.</strong> The site is assembled in
        the browser from a single set of course-content files so that the
        material stays consistent everywhere, and every figure is a live model
        fitted in your browser rather than a picture of one.</p>
        <p>The complete curriculum, learning-outcome map and deployment notes are
        available as plain Markdown in the <code>docs/</code> folder of the
        repository, and need no JavaScript at all.</p>
      </div>
    </noscript>
    <p class="muted">Loading...</p>
  </div>
</main>
<div id="site-footer"></div>

{scripts}
<script>
  document.addEventListener('DOMContentLoaded', function () {{
    window.{render}();
  }});
</script>
</body>
</html>
"""

CANVAS_TEMPLATE = """<!DOCTYPE html>
<html lang="en" data-root="{root}" data-section="{section}" data-chrome="none">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="data:image/svg+xml,{favicon}">
<link rel="stylesheet" href="{root}css/main.css">
<link rel="stylesheet" href="{root}css/responsive.css">
<style>
  /* Canvas supplies its own page chrome, so this page carries none of its
     own. It is deliberately plain: it has to sit inside an iframe without
     fighting the surrounding LMS styling. */
  body {{ background: transparent; }}
  .wrap {{ max-width: 940px; }}
  h1 {{ margin-top: 0; }}
</style>
</head>
<body>
<main id="main">
  <div class="wrap" style="padding-top:2rem">
    <noscript>
      <div class="noscript-note">
        <h1>{h1}</h1>
        <p><strong>This page needs JavaScript.</strong> Open the course site
        directly, or use the week links in your Canvas module list.</p>
      </div>
    </noscript>
    <p class="muted">Loading...</p>
  </div>
</main>

{scripts}
<script>
  document.addEventListener('DOMContentLoaded', function () {{
    window.{render}();
  }});
</script>
</body>
</html>
"""

PAGES = [
    dict(path="start-here.html", root="", section="start",
         render="renderStartHere",
         title="Start here | COMP9085", h1="Welcome to COMP9085",
         desc="The student entry point for COMP9085: what to do first, how the "
              "lecture, website and labs fit together, and where everything is."),
    dict(path="canvas.html", root="", section="canvas", render="renderCanvas",
         template="canvas",
         title="COMP9085 course materials", h1="COMP9085 course materials",
         desc="A low-chrome index of every COMP9085 lecture, slide deck and lab, "
              "designed to be embedded in Canvas."),
    dict(path="index.html", root="", section="home", render="renderHome",
         title="COMP9085: Machine Learning and Foundation Models for Biology, "
               "Healthcare and Nutrition",
         h1="COMP9085: Machine Learning and Foundation Models for Biology, "
            "Healthcare and Nutrition",
         desc="MSc module at Munster Technological University. Classical "
              "machine learning and modern foundation models, taught through "
              "real biological, clinical and nutritional problems."),
    dict(path="roadmap.html", root="", section="roadmap", render="renderRoadmap",
         title="Course roadmap | COMP9085", h1="Course roadmap",
         desc="The twelve-week structure of COMP9085, with the biological "
              "application, classical method, foundation-model connection, "
              "interactive activity and lab for each week."),
    dict(path="weeks/index.html", root="../", section="weeks",
         render="renderWeeksIndex",
         title="All weeks | COMP9085", h1="The twelve teaching weeks",
         desc="Index of all twelve teaching weeks of COMP9085."),
    dict(path="labs/index.html", root="../", section="labs", render="renderLabs",
         title="Practical labs | COMP9085", h1="Practical labs",
         desc="Eleven two-hour scikit-learn labs, each ending with an "
              "interpretation task rather than a working-code task."),
    dict(path="datasets.html", root="", section="datasets",
         render="renderDatasets",
         title="Dataset catalogue | COMP9085", h1="Dataset catalogue",
         desc="Every dataset used in COMP9085, with source, licence, sample "
              "counts, biological meaning and limitations."),
    dict(path="foundation-models.html", root="", section="fm",
         render="renderFoundationModels",
         title="Foundation models | COMP9085", h1="Foundation models",
         desc="What biological foundation models are, how pretraining and "
              "embeddings work, the adaptation ladder from zero-shot to LoRA, "
              "and where these models stop."),
]


CANVAS_SCRIPTS = [
    "js/config.js",
    "js/data/course.js",
    "js/data/labs.js",
    "js/store.js",
    "js/components.js",
    "js/navigation.js",
    "js/pages.js",
]


def main():
    for p in PAGES:
        is_canvas = p.get("template") == "canvas"
        script_list = CANVAS_SCRIPTS if is_canvas else SCRIPTS
        scripts = "\n".join(
            f'<script src="{p["root"]}{s}"></script>' for s in script_list)
        if not is_canvas:
            scripts = (f'<script src="{p["root"]}js/vendor/d3.min.js"></script>\n'
                       + scripts)
        template = CANVAS_TEMPLATE if is_canvas else TEMPLATE
        html = template.format(
            root=p["root"], section=p["section"], render=p["render"],
            title=p["title"], desc=p["desc"], h1=p["h1"],
            favicon=FAVICON, scripts=scripts)
        out = os.path.join(ROOT, p["path"])
        os.makedirs(os.path.dirname(out) or ROOT, exist_ok=True)
        with open(out, "w") as f:
            f.write(html)
        print("wrote", p["path"])
    print(f"\n{len(PAGES)} top-level pages generated.")


if __name__ == "__main__":
    main()
