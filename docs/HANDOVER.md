# COMP9085 redesign — where things stand

**Status:** complete and tested. The full package is in
`Machine Learning in Biology COMP9085_29584/comp9085-ml-biology/` on the
teaching folder, and is a static site plus twelve lecture decks. No backend, no
build step at runtime, no database, no login.

**Module:** COMP9085, retitled *Machine Learning and Foundation Models for
Biology, Healthcare and Nutrition*. The approved descriptor, the assessment
structure (two projects at 50% each) and LO1–LO5 are **unchanged**.

---

## What is in the package

| Part | Detail |
|---|---|
| Website | 22 pages: home, start-here, canvas, roadmap, twelve week pages, labs index, datasets, foundation models, assessment, resources, weeks index |
| Interactive figures | 16, all computing real ML in the browser (CART, random forest, k-NN, naive Bayes, logistic regression, PCA, k-means, DBSCAN, agglomerative clustering, silhouette, ARI), all seeded so two students see the same result |
| Lecture decks | 12, PowerPoint **and** PDF, 29–41 slides each, with equations, worked examples, diagrams and speaker notes |
| Labs | 11. **Week 1 has no lab** — it is a lecture only, stated explicitly on the week page, the labs index and the week header |
| Videos | 2, both in Week 1, both embedded from the original creators |
| Docs | ANALYSIS, CURRICULUM, CANVAS_GUIDE, VIDEO_SOURCES, SLIDE_WEBSITE_MAP, MAINTENANCE |

Deck sizes: Wk1 41, Wk2 31, Wk3–6 29, Wk7 33, Wk8–9 29, Wk10 31, Wk11 31,
Wk12 32.

---

## The two things that need a human decision

1. **The AI for Irish URL is a deliberate placeholder.** It could not be
   established from the module materials, the repository or the project, so it
   was **not** guessed. `js/config.js` → `links.aiForIrish`: set `url` and
   change `status` to `'confirmed'`. Until then the site renders a visible
   "(link to be added)" marker, not a broken link.
2. **The Canvas course URL** is the same kind of placeholder, to be filled in
   once the Canvas course exists.

Everything else external is confirmed: the academic website
(`hafli.github.io/haithem-afli-academic-website/`), the module descriptor
(`courses.cit.ie` moduleId 15193) and both video IDs.

---

## Week 1, specifically

Rebuilt from the original 52-slide deck, not replaced. The original-slide
mapping lives in the docstring of `slides/week01.py` and in
`docs/ANALYSIS.md` §7.

- The **credit-scoring example was kept**, compressed from eight slides to two,
  and then transferred onto a biological problem side by side so the same `D`,
  `M`, `q` formalism is shown to hold for a tumour biopsy.
- The speaker note from original slide 34 — *"don't actually ask them to do this
  one - the point here is that this is hard!"* — is preserved verbatim.
- Both videos kept and embedded from source: Quanta Magazine *Biology Meets
  Computer Science* (`KDQFUmDJ3nY`, 3:46) moved earlier, DeepMind *AlphaFold*
  (`gg7WjuFs8F4`, 7:54) kept late.
- The 34-second clip on original slide 4 was **dropped**: no title, no author, no
  licence, only a blogspot aggregator as attribution. The Bohnhoff graph on that
  slide was kept and stands on its own.
- **No lab, no programming assignment, no assessed practical.** The first formal
  laboratory is Week 2.

The two MP4s in the `Week1/` folder are downloaded copies of the DeepMind and
Quanta videos. They must **not** be re-uploaded to a YouTube account;
`docs/VIDEO_SOURCES.md` sets out the byte-count evidence and the reasoning.

---

## Scientific integrity, and what is simulated

- The Breast Cancer Wisconsin data (569 × 30) is **real**, from scikit-learn.
- Model comparison numbers are **real**, measured by
  `data/scripts/02_build_benchmarks.py`.
- The protein set and the food-recall corpus are **simulated**, and say so on
  every screen they appear on. The banners are generated from flags inside the
  data files, so they cannot be made to lie by editing prose.
- `data/scripts/04_real_esm2_embeddings.py` ships ready to swap in genuine ESM-2
  embeddings; running it flips the flag and every banner updates.
- Two rows of the model leaderboard read "not applicable" rather than carrying
  an invented number.

No accuracy, F1, dataset statistic, biological finding or medical claim on the
site was invented.

---

## Privacy

No login, no accounts, no backend, no database, no analytics, no cookies. The
weekly check-ins and the progress checklist are stored in the student's own
browser (`localStorage`) and are unreadable by the lecturer — students should be
told this, so that they answer honestly. Video embeds use
`youtube-nocookie.com`, which sets no tracking cookie until the viewer presses
play; that is the only third-party request the site makes, and D3 is vendored
locally rather than loaded from a CDN.

---

## Testing

- `data/scripts/test_site.py` — 22 pages, 460 internal links, headers, single
  `h1`, figure text alternatives, reset controls, labelled form controls, no
  horizontal overflow at 390 px. **Passing.**
- `data/scripts/test_interactions.py` — sweeps every control on all 17 figure
  instances and fails if output does not change. **Passing.**
- Second-phase checks: both video embeds, both slide download links per week,
  the no-lab section, section ordering, `canvas.html` inside an iframe, and 16:9
  video geometry at 390 px. **Passing.**

---

## Deploying

`README.md` has the full procedure. In short: push the folder to a GitHub
repository, enable Pages on the default branch root, and the site is live.
`docs/CANVAS_GUIDE.md` covers the three Canvas options — the recommended one is
external-URL module items pointing at `start-here.html` and each
`weeks/weekNN.html`, keeping assignments and grades in Canvas.

To rebuild slides after a content change:

```bash
python3 slides/build_slides.py        # or a week number, e.g. 7
python3 docs/build_slide_map.py
```
