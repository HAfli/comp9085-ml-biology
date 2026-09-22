# Week 1: how the original deck became the new one

The 2025/26 Week 1 deck, `Week1/Week1_MLinBiology_Introduction_final.pptx`,
has **52 slides**. The 2026/27 deck, `slides/week01/COMP9085_Week01.pptx`, has
**49**. This table records what happened to each of the original 52.

The new deck is built on the original file's own slide master, layouts and
theme (see `docs/MAINTENANCE.md`, "Rebuilding the lecture slides"), so the MTU
branding, backgrounds, fonts and colours are literally the same ones, not a
reconstruction.

Decisions used: **Keep**, **Modify**, **Condense**, **Replace**, **Remove**.

---

## The mapping

| Original slide | Decision | New slide | Reason |
|---|---|---|---|
| 1 Title, "Machine Learning in Biology" | Modify | 1 | Same MTU title-slide layout and artwork. Title updated to the 2026/27 module title; lecturer block widened so both identity lines fit on the slide, which they did not in the original |
| 2 Roadmap | Modify | 2 "This lecture" | Kept as the orientation slide. Six parts instead of four, reflecting the new structure |
| 3 About me (11 photographs) | Condense | 4 "Your lecturer" | Same content, one slide. Eleven photograph slides is a long time before any teaching happens |
| 4 "AI: Beyond the Hype" (Bohnhoff graph + 34 s video) | Replace | — | The graph is fine but the unattributed 34-second clip is not. See `docs/VIDEO_SOURCES.md`. The AI-domains wheel from this slide is retained instead, at new slide 18 |
| 5-6 Module descriptor screenshots | Replace | 5 "The module", 6 "Learning outcomes" | Two bitmap screenshots of a web page became native MTU tables: legible on a projector, selectable, accessible, and correct if the descriptor page is restyled. The descriptor link is on the website |
| 7-9 Resources, Jupyter, Python setup | Condense | 10 "Software and resources" | One slide plus the resources page of the website. Setup instructions are looked up, not lectured. The jupyter.org screenshot was dropped: it is a dated screenshot of someone else's home page |
| 10-11 AI / ML / DL framing | Keep | 17 "Where machine learning sits" | **The original nested-circles figure is reused as-is** |
| 4, 11 AI domain wheel | Keep | 18 "Artificial intelligence: the domains" | **The original figure is reused as-is.** The clearest diagram in the old deck |
| 12-16 What machine learning is | Modify | 15-16 | Kept, but the bitmap screenshots of bulleted text became real MTU-styled text |
| 17-24 Credit-decision example (8 slides) | Condense | 28 "A small, deliberately generic example", 29 | **Reduced from eight slides to two.** The example is kept because the loan-to-salary framing makes the target variable concrete, then it is transferred straight onto a biological problem |
| 25-31 Build / Deploy two-step | Keep | 19-20 | `D = [(d1,t1)...]`, `M = Learn(D)`, `t = M(q)` retained, now set as MTU equation panels rather than screenshots |
| 32 Generalisation | Keep | 23 | Retained as a full-width statement slide. It is load-bearing for Weeks 3 and 12 |
| 33-36 "A Bigger Dataset" | Keep | 29 | Retained, **including the original speaker note verbatim**: *"don't actually ask them to do this one - the point here is that this is hard!"* |
| 37 Discussion (stock photo) | Remove | — | An unattributed stock photograph carrying no teaching content |
| 38 Quanta video, "Biology Meets Computer Science" | Keep, move | 14 | Same video, same source, **moved earlier**. It motivates the module; in the original it sat in the middle of the credit example, where it did less work |
| 39-44 Terminology, categories of ML | Modify | 21 "The vocabulary, precisely", 24 "Categories of machine learning" | Retained. The tennis-dataset table that illustrated "feature" and "label" is replaced by the WDBC framing, per the biology requirement |
| 45 DeepMind AlphaFold video | Keep | 36 | Same video, same source, **kept late** in the lecture. It lands better once students know what CASP was |
| 46 Full-bleed AlphaFold meme | Remove | — | A screenshot of a social-media post. The AlphaFold point is made by the video and slide 37 |
| 47-49 Carbon footprint | Keep, move | 43-45 | Retained, including the Dan Jurafsky quotation and the Stanford HAI source, and **moved after** the foundation-model section: it is the answer to "why not just use the biggest model?", so the question has to be asked first. The clip-art CO2 footprint and the watermarked horse-versus-automobile images were dropped |
| 50 Next Week (stock render) | Modify | 47 "Before Week 2" | Content kept, stock robot-hand render dropped |
| 51 Discussion (stock photo) | Remove | — | Duplicate of slide 37 |
| 52 Close | Modify | 49 "Questions" | Same purpose, on the MTU section layout |

---

## What was added, and why

These slides have no ancestor in the original deck. They exist because the
module is now *Machine Learning and Foundation Models for Biology, Healthcare
and Nutrition*, and because the Week 1 content list for 2026/27 asks for them.

| New slide | What it is | Why |
|---|---|---|
| 3, 8 | Module orientation, how the parts fit together | The original opened straight into content; students had to infer the structure |
| 7 | Assessment | Both projects, their weights, and the statement that marks are for the reasoning rather than for using a foundation model |
| 9 | "There is no laboratory in Week 1" | Stated explicitly, as a full-width slide, so it cannot be missed |
| 12 | The biological data landscape | What sequence, expression, imaging, EHR and dietary data look like as a matrix |
| 13 | Why these domains are harder than the usual benchmarks | n much less than p, batch effects, label noise, class imbalance, distribution shift |
| 22 | The three task types you will build | Classification, regression and clustering named explicitly, mapped to LO3 and LO4 |
| 25 | Prediction is not explanation | The distinction the projects are marked on |
| 32-33 | Feature engineering, and its ceiling | The hinge of the redesigned module: engineered features fix a limit no downstream model can pass |
| 34 | Representation learning | The one-sentence definition Week 7 assumes |
| 38-40 | Three workflows; foundation model; biological foundation models | Foundation models introduced conceptually, with no mathematics |
| 42 | The central question of the module | "What is the simplest appropriate approach, and what evidence do you have?" |
| 45 | Measured results on the module's own dataset | Real numbers from `data/scripts/02_build_benchmarks.py`, not invented ones |

---

## Images: retain, modify, replace

Every bitmap in the original Week 1 deck, and what happened to it. Image
numbers are the `ppt/media/` part names inside the original `.pptx`.

| Original image | What it is | Decision | Where it is now |
|---|---|---|---|
| image17.tiff | AI domain wheel: cognitive domains and application sub-domains | **RETAIN** | `slides/figures/w1_ai_domain_wheel.png`, new slide 18 |
| image23.png | Nested circles, AI contains ML contains DL | **RETAIN** | `slides/figures/w1_ai_ml_dl_circles.png`, new slide 17 |
| image19.png, image20.png | Screenshots of the module-descriptor web page | REPLACE | Native MTU tables, new slides 5 and 6 |
| image21.tiff | jupyter.org home page screenshot | REMOVE | Setup lives on the resources page |
| image24.png, image42.png, image43.png | Bitmaps of bulleted text and the tennis dataset | REPLACE | Real MTU-styled text and a biological table |
| image39.png | Credit-decision cards, screenshot from another deck's template | REPLACE | Native table, new slide 28 |
| image25.png, image26.jpeg | Smartphone-in-a-field and dairy-cow stock photographs | REMOVE | No teaching content, no attribution |
| image29.jpeg | "LOAN APPROVED" rubber-stamp stock image | REMOVE | The credit example is condensed to two slides |
| image45.jpeg | Olympic-shooting AlphaFold meme | REMOVE | Screenshot of a social-media post |
| image46.png | Sports car being used to plough a field | REMOVE | Unattributed meme |
| image47.tiff | CO2-in-grass footprint clip art | REMOVE | The carbon point is made in text with its source |
| image48.tiff, image49.tiff | 1910s "Horse vs. Automobile" advertisement and photograph | REMOVE | image49 carries a `THEOLDMOTOR.COM` watermark; no licence for either |
| image50.tiff | Robot hand holding a tree, 3D stock render | REMOVE | Decorative |
| image51.tiff | "Machine learning class" cartoon | REMOVE | Watermarked `KDNUGGETS.COM` |
| image1.jpg, image2.jpg | **The MTU background artwork** (crest, diagonal band, "Succeeding Together", www.mtu.ie) | **RETAIN** | In the slide master and title layout of `slides/template/MTU_COMP9085.pptx`, so every slide of every week carries it |
| media1.mp4, media2.mp4, media3.mp4 | Three embedded videos | See `docs/VIDEO_SOURCES.md` | Two embedded from their original YouTube sources; one dropped |

The two retained figures are reused because they are genuine explanatory
diagrams. Most of the rest were bitmaps of text, which a projector renders
worse than real text, a screen reader cannot read, and a search cannot find; or
photographs, memes and watermarked images with no identifiable licence. Each
replacement keeps the same teaching point in the same position in the lecture.
