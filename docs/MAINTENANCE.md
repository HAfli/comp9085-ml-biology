# Maintenance guide

How to change things, with worked examples. The organising principle is that
**course content lives in `js/data/`, never in the HTML files**. The HTML files
are generated shells; a hand edit to one survives until someone re-runs a build
script.

---

## 1. Editing lecture content

Everything a week contains is one object in `js/data/course.js`. Find the week
by its `n` field and edit it. No build step; reload the page.

```js
{
  n: 7,
  title: 'Dimensionality reduction and foundation-model embeddings',
  strand: 'representation',      // sets the accent colour and the journey stage
  short: 'The hinge of the module: ...',
  pivot: true,                   // adds the "pivot of the module" badge
  los: ['LO1', 'LO2', 'LO4'],    // drives the LO map on the assessment page
  biology: '...',                // the biological framing
  objectives: ['...', '...'],    // rendered as a numbered list
  concepts: [{ term: '...', body: '...' }],
  viz: 'pca',                    // id into VIZ_SPECS in js/week-page.js
  viz2: 'embeddings',            // optional second figure
  worked: { title, body, keypoint },
  fm: { title, body, models: ['esm2'] },   // ids into js/data/references.js
  scientist: '...',              // the Think Like a Scientist prompt
  quiz: [{ q, options, answer, why }],     // answer is a 0-based index
  lab: 'lab07',                  // key into js/data/labs.js
  datasets: ['wdbc', 'proteinSim'],        // ids into js/data/datasets.js
  reading: [{ ref: 'esm2', note: '...' }],
  provenance: { kept: '...', changed: '...' }
}
```

### Citing a source inside body text

Write `[ref:key]` where `key` is an id in `js/data/references.js`. It renders as
a superscript link to the source, with the full citation in the hover title.

```js
biology: 'DNABERT-2 was pretrained on 32.49 billion bases [ref:dnabert2].'
```

If the key does not exist the marker renders as nothing, which fails quietly.
Add the reference first.

### Adding a reference

In `js/data/references.js`:

```js
myKey: {
  tag: 'Author 2026',            // what appears in the superscript
  cite: 'Author, A. et al. (2026). Title. Journal 1:1-10.',
  doi: '10.1234/abcd',           // optional
  url: 'https://...',
  checked: '2026-09'             // when you verified the details
}
```

Keep `checked` honest. It is displayed on the resources page and it is the only
signal a future maintainer has about how stale a citation might be.

---

## 2. Editing a lab

`js/data/labs.js`, keyed as `lab02` … `lab12`. The `week` field decides where it
appears; the labs index sorts by it.

```js
lab07: {
  week: 7,
  title: '...',
  dataset: 'wdbc',
  duration: '2 hours',
  goal: 'One sentence on what the student should come away able to do.',
  tasks: ['...', '...'],       // numbered in order
  starter: 'import ...',        // rendered as a code block; keep it short
  deliverable: 'What they bring to the next session.',
  los: ['LO1', 'LO2'],
  note: 'Optional caveat, e.g. about network access.'
}
```

The lab appears both on its week page and on `labs/index.html` automatically.

---

## 3. Editing a dataset entry

`js/data/datasets.js`. The fields that matter beyond the obvious:

- `inSite: true` — the data is shipped and used live in a figure
- `simulated: true` — **switches every badge on the site to the amber
  "simulated" state.** Do not set this to `false` for data that is not real
- `warning` — if present, rendered as a prominent callout on the dataset page
- `limitations` — an array; this is the part students most need and it should
  never be empty
- `weeks` — generates cross-links to the week pages

---

## 4. Editing or adding a foundation-model entry

`js/data/models.js`. Two shapes:

**A specific model** needs `id`, `name`, `org`, `modality`, `ref`, `sizes`,
`pretraining`, `useFor` and `doNotUse`. `tokenisation`, `context`, `evaluation`,
`licence`, `confidence` and `note` are optional and are only rendered if present.

**A domain overview** sets `isOverview: true` and supplies `body` as prose. Blank
lines become paragraphs.

> **Please only record figures you have checked against the primary source.**
> The convention in this repository is that an unverifiable number is omitted
> rather than estimated. Several fields are deliberately absent for this reason,
> and a reader can rely on that.

---

## 5. Changing a visualisation

Two files are involved, and they have different jobs.

**Controls and readout** live in `VIZ_SPECS` in `js/week-page.js`:

```js
'pca': {
  title: 'PCA visualiser',
  intro: 'One sentence under the title.',
  banner: 'real',              // 'real' | 'sim-embed' | 'sim-corpus' | 'mixed'
  controls: UI.slider({ id: 'pca-k', label: 'Components', min: 1, max: 30, value: 2 }) +
            UI.checkbox({ id: 'pca-standardise', label: 'Standardise first', checked: true }),
  readout: UI.metric('pca-two', 'Variance in PC1 + PC2', '—'),
  explain: '',                 // persistent HTML that lives above the commentary
  altLabel: 'Read the variance spectrum as text'
}
```

**Behaviour** lives in `js/visualisations/pca.js`.

### Two rules that will save you an hour

1. **Write commentary into `[data-viz-note]`, never `[data-viz-explain]`.** The
   explain container also holds any persistent UI declared in the spec.
   Overwriting the whole container destroys that UI. This was a real bug.
2. **Metric ids and control ids share one namespace.** `UI.metric('dq-balance', …)`
   and a segmented control with `id: 'dq-balance'` collide silently and the
   metric stops updating. Also a real bug. Prefix consistently.

### Adding a new figure

1. Create `js/visualisations/my-figure.js`:

```js
(function () {
  'use strict';
  window.Chart.register('viz-my-figure', function (host) {
    var stage   = host.querySelector('[data-viz-stage]');
    var altBody = host.querySelector('[data-viz-alt]');
    var note    = host.querySelector('[data-viz-note]');

    function draw() {
      var f = window.Chart.frame(stage, { height: 320,
        title: 'What a screen reader should hear' });
      // ... draw with d3 into f.g ...
    }
    function updateAlt() {
      altBody.innerHTML = window.UI.altTable('Caption.',
        ['Column', 'Value'], [['a', '1']]);
    }
    host.querySelector('[data-viz-reset]').addEventListener('click', function () {
      /* restore defaults, then redraw */
    });
    window.Chart.responsive(stage, draw);
    draw(); updateAlt();
  });
})();
```

2. Add an entry to `VIZ_SPECS` in `js/week-page.js` keyed `my-figure`.
3. Set `viz: 'my-figure'` on a week in `js/data/course.js`.
4. Add the file to the `SCRIPTS` list in **both** `build_pages.py` and
   `build_top_pages.py`.
5. Re-run both build scripts.
6. Add it to `TARGETS` in `data/scripts/test_interactions.py` and run the tests.

**The text alternative is not optional.** `test_site.py` fails the build if it is
missing or under 200 characters, and that check exists because it is the part
that gets skipped.

---

## 6. Adding a thirteenth week

1. Append a week object to `COURSE.weeks` in `js/data/course.js` with `n: 13`.
2. Add a lab to `js/data/labs.js` if it has one.
3. Change the guard in `build_pages.py`:

   ```python
   if len(weeks) != 12:   →   if len(weeks) != 13:
   ```

4. Run `python3 build_pages.py`.
5. Add `weeks/week13.html` to `PAGES` in `data/scripts/test_site.py`.

The roadmap, the weeks index, the home page, the learning-outcome map, the
footer and the previous/next pager all pick it up with no further work.

---

## 7. Changing the visual design

All design tokens are CSS custom properties at the top of `css/main.css`. To
retheme the site, change them and nothing else.

```css
--specimen: #1f5f4b;   /* biology: deep green */
--nucleus:  #b5762a;   /* biology: stained-nucleus amber */
--clinical: #1f4e79;   /* data: clinical blue */
--signal:   #7b3f8f;   /* data: learned representation violet */

--cat-1 … --cat-5      /* categorical series, used by every figure */
--stage-1 … --stage-5  /* the five journey stages */
```

`--cat-*` is the palette every visualisation uses. If you change it, keep the
five hues distinguishable in the common forms of colour vision deficiency; the
figures also vary shape, so colour is never the only channel, but the shapes are
a backstop rather than a licence to pick a bad palette.

---

## 8. Changing the quizzes and check-ins

Quiz questions live with their week in `js/data/course.js`. `answer` is a
zero-based index into `options`. The `why` field is shown whether the student is
right or wrong, so write it as an explanation rather than a correction.

The weekly check-in is identical on every week and is generated by
`UI.feedbackForm(n)` in `js/components.js`. To change the questions, edit that
one function.

Responses are stored under `comp9085.feedback` in `localStorage`, keyed `wk1` …
`wk12`. They never leave the browser. If you want to collect them, you would
need to add a backend, and the privacy note on the resources page and in the
footer would need changing to match — please do both, or neither.

---

## 9. Rebuilding the lecture slides

The decks are generated, not maintained by hand. `slides/build_slides.py` reads
the week's content out of `js/data/course.js` and `js/data/labs.js` and composes
a deck from it, which is why the slides and the site cannot disagree with each
other.

### The MTU template is the base, and it must stay that way

`slides/template/MTU_COMP9085.pptx` **is** the 2025/26 Week 1 deck
(`Week1_MLinBiology_Introduction_final.pptx`) with its 52 slides removed and
nothing else touched. It carries the slide master, all eighteen layouts, the
theme, the MTU background artwork (crest, "Succeeding Together", the blue and
red diagonal band, www.mtu.ie), the embedded fonts and the "Custom 1" colour
scheme.

`new_deck()` opens that file. Every slide is then placed on one of its layouts,
so the branding is inherited rather than redrawn. **Do not** replace
`new_deck()` with a bare `Presentation()`: that produces a default Office theme
and silently loses the MTU identity.

To regenerate the template from a newer MTU deck:

```python
from pptx import Presentation
RID = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
prs = Presentation('the-new-MTU-deck.pptx')
lst = prs.slides._sldIdLst
for sldId in list(lst):
    prs.part.drop_rel(sldId.get(RID))
    lst.remove(sldId)
prs.save('slides/template/MTU_COMP9085.pptx')
```

Values read out of that file and recorded at the top of `slides/template.py`:

| | |
|---|---|
| Slide size | 13.333 x 7.5 in (16:9) |
| Title | IBM Plex Sans Condensed, theme accent2 `#00A2FF` |
| Body level 1 / level 2 | `#284F80` navy / `#EEAF00` amber, as in the master |
| Other scheme colours | accent1 `#D90727`, accent4 `#326194`, accent5 `#6C98C1` |
| Content band | x 0.92 to 12.42 in, y 1.52 to 6.30 in: clears the crest and the band |
| Footer | "COMP9085 Machine Learning in Biology - Haithem.afli@mtu.ie  ·  N" |
| Workhorse layout | index 11, "Douglas Title and Content" |

One deliberate change from the original: the footer sat at y = 7.18, where the
MTU diagonal band runs underneath and swallows it. Same wording, same corner,
moved up into the clear strip at y = 6.44 so it can be read.

### The source files

| File | What it holds |
|---|---|
| `slides/template/MTU_COMP9085.pptx` | The MTU master, layouts, theme, artwork and embedded fonts |
| `slides/template.py` | The layout library on top of that master: `title_slide`, `section_slide`, `bullets`, `concept`, `deflist`, `equation`, `two_col`, `table_slide`, `diagram_pipeline`, `figure_note`, `picture_slide`, `interactive`, `references`, `closing` |
| `slides/technical.py` | Per-week equations, algorithm boxes, comparison tables and pitfalls. This is the technical depth that is not on the website |
| `slides/week01.py` | Week 1 only, hand-authored, because it is a rebuild of the original 52-slide deck. Its docstring and `docs/WEEK1_SLIDE_MAPPING.md` map every retained element to its original slide number |
| `slides/figures/` | Figures retained from the original decks and reused as-is |
| `slides/audit_slides.py` | Structural check: slide size, master retained, nothing off-slide, nothing under the crest or the band, no empty slides, no text overflow |

### To change a slide

Work out which of three things it is:

1. **Content that is also on the website** (objectives, concepts, the worked
   example, the biological framing, the lab summary) — edit `js/data/course.js`
   and rebuild. Do not edit the deck.
2. **Technical material that only exists on slides** (an equation, an algorithm
   box, a worked calculation) — edit that week's entry in `slides/technical.py`
   and rebuild.
3. **Week 1** — edit `slides/week01.py`.

Then:

```bash
python3 slides/build_slides.py 7      # rebuild one week
python3 slides/audit_slides.py        # structural check, all twelve decks
python3 docs/build_slide_map.py       # if you added or moved an interactive panel
```

Then look at the result. The audit checks geometry, not judgement:

```bash
pdftoppm -png -r 55 slides/week07/COMP9085_Week07.pdf /tmp/w07
```

Editing a `.pptx` by hand works until the next rebuild, at which point the edit
is gone. This is the same rule as for the HTML shells.

### Speaker notes

Every layout function takes `notes=`. Notes are for what to say and what to
watch for, not a transcript of the slide. The one in Week 1 quoting the original
deck verbatim is deliberate and should not be paraphrased:

> don't actually ask them to do this one - the point here is that this is hard!

### Four things that will bite you

- **Multi-line formulas must be split on `\n`.** `equation()` centres each line
  separately. A formula written as one long string with two spaces between the
  halves wraps badly and looks broken on a projector. Write symbols in Unicode:
  a literal `^{d x r}` or `_{c(i)}` prints the braces.
- **Four items per `deflist`, five per `bullets`, maximum.** The layouts do not
  shrink text to fit; they overflow the slide. If you need more, add a slide.
- **Never truncate prose to fit.** `shorten()` keeps whole sentences, and
  `bullet_items()` splits a long paragraph at a sentence boundary. An earlier
  version cut at a character count and appended an ellipsis, which left slides
  ending "...giving 30..." and dropped the second half of a "First... Second..."
  argument. Add a slide instead; `(continued)` titles are handled for you.
- **Keep the content band clear.** Anything below y = 6.30 in collides with the
  footer line or the MTU diagonal band, and anything above y = 1.05 in on the
  right runs under the crest. `audit_slides.py` reports both.

---

## 10. Changing links, videos and slide paths

Everything external lives in `js/config.js`. Nothing else in the site
hard-codes a URL or a video ID.

```js
window.SITE_CONFIG = {
  links:   { academicWebsite: {...}, aiForIrish: {...}, moduleDescriptor: {...},
             canvasCourse: {...} },
  youtube: { week1BiologyMeetsCS: {...}, week1AlphaFold: {...} },
  slides:  { base: 'slides/', pattern: 'week{NN}/COMP9085_Week{NN}' },
  features:{ weeksWithoutLab: [1], showQrCodes: true }
};
```

### Filling in a placeholder link

Set `url` and change `status` to `'confirmed'`. That is the whole change; every
page that references the link updates. While `status` is anything else, the site
renders a visible "(link to be added)" marker instead of a link, which is
deliberate: a placeholder that looks like a placeholder is safe, and an invented
URL is not.

### Swapping or adding a video

```js
week5Something: {
  id: null,                       // 'dQw4w9WgXcQ' once it is live
  status: 'awaiting-upload',      // then 'confirmed'
  title: '...', creator: '...', duration: '4 min 10 s',
  purpose: 'Why students are watching this',
  question: 'The question to hold in mind while watching',
  placement: 'Where in the lecture it belongs'
}
```

Then add `'week5Something'` to the `videos` array of that week in
`js/data/course.js`. With `id: null` the page renders a clearly-marked
placeholder card carrying the upload instructions; set the ID and the embed
appears. Embeds use `youtube-nocookie.com`, which sets no tracking cookies until
the viewer presses play — do not change this to `youtube.com`, because the
privacy statement on the resources page depends on it.

`docs/VIDEO_SOURCES.md` records the provenance of every video currently used and
the reasoning behind each decision, including why the two Week 1 MP4s in the
original folder must not be re-uploaded.

### Making another week lecture-only

Add its number to `features.weeksWithoutLab` and remove the week's `lab` key in
`js/data/course.js`. The week page then renders the "No lab this week" section
instead of the practical, the header carries the "Lecture only, no lab" pill,
and the labs index states it. Nothing else needs changing.

---

## 11. What the tests check, and why each check exists

| Check | Why it is there |
|---|---|
| Page renders past the loading placeholder | A JS error in a data file leaves the page blank |
| No console or page errors | Silent breakage in one figure is easy to miss |
| Header and footer mounted | `data-root` typos break every relative path on a page |
| Exactly one `h1` | Screen-reader document structure |
| Every internal link resolves | Renaming a week page breaks links in four places |
| Every figure drew something | A figure can register and still fail before drawing |
| Every figure has a text alternative | The accessibility guarantee, enforced |
| Every figure has a reset control | Students get figures into odd states |
| Every form control is labelled | Screen-reader usability |
| No horizontal overflow at 390 px | Long URLs and wide tables break phone layouts |
| Sweeping every control changes the output | Catches a figure that ignores its own controls |
| Reset restores a working state | Catches reset handlers that miss a variable |

Run both after any content change:

```bash
python3 -m http.server 8899 &
python3 data/scripts/test_site.py
python3 data/scripts/test_interactions.py
```

---

## 12. Conventions worth keeping

1. **Never invent a number.** If a figure cannot be verified, omit it and say
   why. The leaderboard has two rows reading "not applicable" for exactly this
   reason, and that honesty is itself part of what the module teaches.
2. **Label simulated data everywhere it appears,** not only where it is defined.
   The banners are generated from data-file flags so this cannot drift.
3. **Every claim that needs a source gets a `[ref:...]` marker.**
4. **UK/EU English throughout.**
5. **No em dashes.**
6. **Every figure gets a text alternative that contains the information,** not a
   description of the picture.
7. **Regenerate rather than hand-edit** anything under `js/data/*.js` that a
   script produces, or `weeks/*.html`.
