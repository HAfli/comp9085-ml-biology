# Putting COMP9085 into Canvas

The site is a static, self-contained website. Canvas does not need to host it,
copy it or convert it. You publish the site once, then point Canvas at it.

This guide gives three options, in increasing order of effort. Option 1 takes
about ten minutes and is the one to use unless you have a reason not to.

---

## What Canvas is being asked to do

Nothing clever. The site:

- requires **no login, no student accounts, no backend, no database**
- sets **no cookies** and runs **no analytics**
- makes exactly **one** third-party request, and only after a student presses
  play on a video (`youtube-nocookie.com`); D3 is served from the site itself
- stores a student's checklist ticks and weekly check-ins in **their own
  browser** (`localStorage`), never on a server, and never leaves that browser

That means it can be embedded in Canvas without any privacy paperwork about
third-party data processing, and without an LTI integration.

---

## Option 1 — Link out from Canvas (recommended)

Canvas holds the structure and the grades; the website holds the teaching.

1. Publish the site (see `README.md`, "Deploying to GitHub Pages"). You will end
   up with a base URL of the form
   `https://USERNAME.github.io/REPO/`.
2. In Canvas, create a **Module** for each teaching week.
3. In each module add an **External URL** item pointing at that week's page:

   | Canvas item | URL |
   |---|---|
   | Week 1 lecture | `<base>/weeks/week01.html` |
   | Week 2 lecture | `<base>/weeks/week02.html` |
   | … | … |
   | Week 12 lecture | `<base>/weeks/week12.html` |

   Tick **"Load in a new tab"**. The week pages are full pages with the site
   header and footer; they are better in their own tab than in a Canvas frame.
4. Add one **External URL** item at the top of the course pointing at
   `<base>/start-here.html`. That is the student entry point: what the module
   is, how a week works, what is assessed, and what to do first.
5. Keep **assignments, submissions, deadlines and grades in Canvas.** The
   website's assessment page describes the assessment; Canvas is where students
   actually hand work in. There is deliberately no submission mechanism on the
   site.

### Direct links worth adding

| Purpose | URL |
|---|---|
| Student entry point | `<base>/start-here.html` |
| Whole-module roadmap | `<base>/roadmap.html` |
| All labs | `<base>/labs/index.html` |
| Assessment and marking | `<base>/assessment.html` |
| Datasets | `<base>/datasets.html` |
| Foundation models | `<base>/foundation-models.html` |
| Resources, reading, tools | `<base>/resources.html` |
| Slide downloads (PPTX + PDF) | `<base>/resources.html#lectures` |

---

## Option 2 — Embed the course table inside a Canvas page

`canvas.html` exists for this. It is the same content with the site header,
footer and navigation removed, so it does not look like a website nested inside
a website. It is a single table of the twelve weeks, with the lecture, both
slide downloads and the lab for each, plus links to the other pages. Every link
inside it uses `target="_top"`, so clicking one navigates the whole browser
window rather than trapping the student in a scrolling frame.

In Canvas: **Pages → + Page → HTML editor** (the `</>` button), then paste:

```html
<p><a href="https://USERNAME.github.io/REPO/canvas.html" target="_blank"
   rel="noopener">Open the COMP9085 course materials in a new tab</a></p>

<iframe src="https://USERNAME.github.io/REPO/canvas.html"
        title="COMP9085 course materials"
        width="100%" height="1400"
        style="border:1px solid #d8dee6; border-radius:8px"
        loading="lazy"></iframe>
```

Notes:

- **Keep the plain link above the iframe.** Some institutional Canvas
  configurations block mixed or framed content, and some students use the Canvas
  mobile app, which handles iframes poorly. The link is the fallback and costs
  nothing.
- `height="1400"` is a fixed height because Canvas iframes cannot resize
  themselves without a script, and the site deliberately runs no cross-frame
  script. 1400 px fits the twelve-week table on a desktop. If it looks cropped,
  raise it; if there is dead space, lower it.
- Do **not** iframe a week page. Week pages contain interactive figures with
  their own controls, and they need the full width. Link out instead.
- Canvas strips `<script>` from pages saved in the rich-content editor. This is
  why the embed is an iframe of a hosted page and not a paste of the site's
  HTML. Pasting the site's markup into Canvas will not work, and is not
  supported.

### If your Canvas blocks iframes

Some deployments set `Content-Security-Policy: frame-ancestors`, or turn off
external iframes entirely. If the frame renders blank or shows "refused to
connect", fall back to Option 1. Nothing is lost — the iframe is a convenience,
not a requirement.

---

## Option 3 — Upload the site into Canvas Files

Only do this if your institution requires all teaching material to live inside
the VLE, or if you need the material available with no external network access.

1. Zip the repository, excluding `.git`.
2. **Canvas → Files → Upload**, then unzip in place.
3. Link to `index.html` from a module item.

The trade-offs, honestly:

- Canvas serves files from a per-file URL, so **relative links between pages can
  break** depending on your Canvas version. Test every page after upload, not
  just the front page.
- Canvas Files download some file types rather than rendering them. `.pptx` and
  `.pdf` are fine; `.html` behaviour varies.
- You lose the "update once, everyone sees it" property. Every change means
  re-uploading.
- Total size is about 6 MB, which is within any normal course quota.

Option 1 avoids all of this. Prefer it.

---

## Slides in Canvas

Every week's deck is built in both formats:

```
slides/weekNN/COMP9085_WeekNN.pptx
slides/weekNN/COMP9085_WeekNN.pdf
```

Both are linked at the top of each week page, on `resources.html#lectures` and
on `canvas.html`. Two reasonable approaches:

- **Link to them on the site** (with Option 1 or 2). One copy, always current.
- **Upload the PDFs to Canvas Files** as well, if your students expect to find
  slides inside Canvas. Upload the PDF, not the PPTX: it previews inline in
  Canvas, it cannot be accidentally edited, and it renders identically
  everywhere. Keep the PPTX on the site for anyone who wants the editable
  source.

If you upload PDFs to Canvas, re-upload them after rebuilding the slides.
`docs/MAINTENANCE.md` covers the rebuild.

---

## Assessment and grades

The website never handles marks. Specifically:

- The **weekly check-in** on each week page is private to the student's browser.
  It is a reflection prompt, not a submission, and there is no way for you to
  read it. Do not use it as evidence of engagement, and tell students that it is
  private so they answer honestly.
- The **self-check questions** are formative and unrecorded.
- Project briefs, rubrics and the LO map are described on `assessment.html`, but
  **submission, deadlines, extensions, plagiarism checking and grade return all
  stay in Canvas**, which is where the institutional record belongs.

Set up in Canvas:

| Canvas assignment | Weight | Website reference |
|---|---|---|
| Project 1 | 50% | `<base>/assessment.html#project1` |
| Project 2 | 50% | `<base>/assessment.html#project2` |

This matches the approved module descriptor, which was not changed.

---

## Accessibility

Canvas has its own accessibility checker, which only inspects content stored in
Canvas. It cannot see inside an external site or an iframe, so it will report
nothing about the website — a clean Canvas report is not evidence that the site
is accessible.

The site was built and tested against WCAG 2.1 AA: semantic headings, keyboard
operability for every interactive figure, visible focus, a text alternative for
every figure, contrast checked against the AA threshold, a skip link, and no
information carried by colour alone. `docs/MAINTENANCE.md` lists the checks and
how to re-run them after a change.

Two things to add on the Canvas side:

1. Give the iframe a `title` attribute (the snippet above does). Screen readers
   announce it.
2. Keep the plain-text link above the iframe. It is also the accessible route
   for anyone whose assistive technology handles nested frames badly.

---

## Checklist before the module opens

- [ ] Site published, base URL known and working from off campus
- [ ] `start-here.html` linked at the top of the Canvas course
- [ ] Twelve week items created, each pointing at the right `weekNN.html`
- [ ] "Load in a new tab" ticked on external URL items
- [ ] Project 1 and Project 2 created in Canvas with the correct weights
- [ ] Video IDs in `js/config.js` confirmed (both Week 1 videos play)
- [ ] Any placeholder links in `js/config.js` either filled in or accepted as
      visible placeholders — see `README.md`, "Links you must set"
- [ ] Slides downloadable from a week page in both formats
- [ ] One week page opened on a phone and checked for horizontal scrolling
