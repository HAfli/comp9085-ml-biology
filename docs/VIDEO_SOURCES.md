# Video sources

Every video used in COMP9085, where it came from, and what was decided about
it. Video IDs are set in one place only: `js/config.js`. Nothing else on the
site hard-codes a video URL.

---

## Summary table

| Week | Video | Source | YouTube ID | URL | Duration | Purpose | Lecture location | Decision |
|---|---|---|---|---|---|---|---|---|
| 1 | Biology Meets Computer Science | Quanta Magazine | `KDQFUmDJ3nY` | `youtube.com/watch?v=KDQFUmDJ3nY` | 3 min 46 s | Motivate why biology is now a computational discipline, before any algorithm appears | Part 2, deck slide 14; Week 1 page, Videos | **Kept**, embedded from the original source |
| 1 | AlphaFold: The making of a scientific breakthrough | Google DeepMind | `gg7WjuFs8F4` | `youtube.com/watch?v=gg7WjuFs8F4` | 7 min 54 s | Show what changed when a learned representation met a fifty-year-old biological problem | Part 5, deck slide 36; Week 1 page, Videos | **Kept**, embedded from the original source |
| 1 | (untitled 34-second clip on "AI Beyond the Hype") | Unattributed; linked to `nativevideotube.blogspot.com` | none | none | 34 s | Illustrated the AI hype cycle | Original slide 4; not in the new deck | **Dropped.** See below |

There are no videos in Weeks 2 to 12. That is deliberate: see "How videos are
used in this module" at the end.

---

## How the sources were established

The original `Week1/` folder contains two standalone MP4 files and a 52-slide
PowerPoint. The PowerPoint embeds three videos. Matching them up:

| Embedded in PPTX | Bytes | Standalone file in Week1/ | Hyperlinked on that slide |
|---|---|---|---|
| `ppt/media/media3.mp4` (slide 45) | 39,500,441 | `AlphaFold_ The making of a scientific breakthrough.mp4` | `youtube.com/watch?v=gg7WjuFs8F4&ab_channel=DeepMind` |
| `ppt/media/media2.mp4` (slide 38) | 16,589,585 | `When Biology Meets Computer Science.mp4` | `youtube.com/watch?v=KDQFUmDJ3nY&ab_channel=QuantaMagazine` |
| `ppt/media/media1.mp4` (slide 4) | 5,777,709 | — (not present as a standalone file) | `nativevideotube.blogspot.com` |

The byte counts of `media3.mp4` and `media2.mp4` match the standalone files
exactly, and each slide carries a hyperlink to the corresponding YouTube video
alongside the embed. The two MP4s in the folder are therefore **downloaded
copies of publicly available third-party videos**, not original teaching
material.

The two IDs were then checked independently. A web search for the DeepMind
title returns `youtube.com/watch?v=gg7WjuFs8F4`, matching the deck. A search for
the Quanta video returns `quantamagazine.org/videos/biology-meets-computer-
science/`, whose title matches the standalone filename exactly. The measured
durations (7 min 54 s and 3 min 46 s, from `ffprobe`) are recorded in
`js/config.js` alongside each ID.

---

## Decisions, one video at a time

### 1. AlphaFold: The making of a scientific breakthrough — KEPT

**This is Option A: a suitable public version exists, from the original
creator.** It is Google DeepMind's own video about their own work, which is the
best possible source under the priority order (official sources first).

- **Do not re-upload it.** It is DeepMind's copyright. The local MP4 should not
  be uploaded to a personal or institutional YouTube account. Embedding the
  original is both correct and better: it keeps attribution intact, it stays
  current, and it carries DeepMind's own captions.
- Embedded on the Week 1 page through `youtube-nocookie.com`, which sets no
  tracking cookies until the viewer presses play.
- Placement: Part 5 of the lecture, after the biological framing and the
  classical ML workflow, not at the start. It lands far better once students
  know what CASP was and why the problem mattered. The original deck also placed
  it late (slide 45), which was the right instinct.
- Viewing question: *What information must a model learn about proteins before
  it can predict a structure at all? Where would that information come from?*
- **Accessibility:** DeepMind provides captions. The Week 1 page states this and
  gives a "Watch on YouTube" link for students who prefer the full player. The
  surrounding written material covers the same ground, so nothing essential is
  available only in the video.

### 2. Biology Meets Computer Science — KEPT

Also Option A. Quanta Magazine is a well-regarded science publication and the
original creator.

- Same reasoning: embed rather than re-upload.
- Placement: Part 2, early, right after "why machine learning for biology". It
  motivates the module before any algorithm appears. The original deck had it at
  slide 38, in the middle of the credit-scoring sequence, where it did less
  work.
- Viewing question: *What is it about modern biological data that makes
  computation necessary rather than merely convenient?*

### 3. The 34-second clip on slide 4 — DROPPED

**This is Option C: obsolete, and it should not be replaced like-for-like.**

- Provenance cannot be established. The only attribution on the slide is a link
  to `nativevideotube.blogspot.com`, a video aggregator, not a creator. There is
  no title, no author and no licence.
- It is 34 seconds long, 720 × 720 (square, social-media format), and appears
  only inside the PowerPoint. It was not kept as a standalone file, which
  suggests it was not considered core material.
- Its slide, "Artificial intelligence (AI): Beyond the Hype", also carries a
  graph credited to Tobias Bohnhoff. **That graph is the actual content of the
  slide and it stands perfectly well on its own**, which is why no replacement
  video is recommended.
- Re-uploading it would be a copyright risk with no identifiable rights holder
  to ask.

**Recommendation:** keep the slide, keep the Bohnhoff graph, drop the clip. If
you want a hype-cycle video later, prefer a named source with a clear licence.

---

## If you later want to add your own video

The site is already wired for it. Nothing needs to be edited except
`js/config.js`.

1. Add an entry to `youtube` in `js/config.js` with `id: null` and
   `status: 'awaiting-upload'`, plus the title, creator, duration, purpose and
   viewing question.
2. Add the key to the `videos` array of the relevant week in
   `js/data/course.js`.
3. The page then renders a clearly-marked placeholder card, with the upload
   instructions on it, instead of a broken embed.
4. When the video is live, set `id` to the eleven-character YouTube ID and
   `status` to `'confirmed'`. The embed appears automatically.

### Metadata to use when uploading

For a lecture recording of your own, the following works well and matches how
the two existing videos are described on the site.

- **Title:** `COMP9085 Week NN — <topic>` (put the module code first; students
  search for it)
- **Description:** one paragraph on what the video covers, then the course
  website URL, then your name and MTU. Add chapter timestamps if the video is
  over about eight minutes.
- **Visibility:** **Unlisted**, not Private. Unlisted plays inside an embed and
  needs no Google sign-in; Private does not embed for students. Use Public only
  if you are happy for it to be found and cited outside the module.
- **Thumbnail:** the deck's title slide exported as PNG at 1280 × 720. The
  slides are 16:9, so it crops perfectly. `slides/weekNN/COMP9085_WeekNN.pdf`
  page 1 is the source.
- **Captions:** upload a transcript rather than relying on auto-captions. YouTube
  aligns an uploaded transcript automatically and the result is far more
  accurate for technical vocabulary, which auto-captioning handles badly.
- **Timestamps:** if only part of the video is needed in the lecture, put the
  range in the `purpose` field in `js/config.js` and the page will show it.

**Do not upload the two existing MP4s.** They belong to DeepMind and Quanta
Magazine respectively, and the originals are already embedded.

---

## How videos are used in this module

Videos support the teaching; they do not carry it. The rules applied here:

1. **Short.** Both are under eight minutes. Nothing longer is used.
2. **Purposeful.** Each has a stated reason for being watched and a question
   attached, shown on the page next to the embed.
3. **Placed where they do work**, not collected at the bottom of the page. One
   motivates the module before any method appears; the other lands after the
   students have the vocabulary to interpret it.
4. **Never load-bearing for assessment.** No assessment information appears only
   in a video. Everything a video covers is also in the written material.
5. **Accessible.** Captions available on both, a description and a purpose on
   the page, and a "Watch on YouTube" link for students who prefer the full
   player with its own caption and speed controls.
6. **Not stored in the repository.** The MP4s total 56 MB. Keeping them in git
   would bloat every clone for no benefit, since both are publicly available at
   source. Keep your local copies as an offline teaching fallback if the lecture
   theatre network is unreliable.

---

## Privacy note

Embeds use `youtube-nocookie.com`, which does not set tracking cookies until the
viewer presses play. This is the only third-party request the site makes; D3 is
served from the site itself. The privacy statement on the resources page says
so.

---

## On the lecture slides

Each video has a full-slide call-out in the Week 1 deck, on the MTU layout,
carrying the title, the source, the approximate duration, the page path, and a
question to hold in mind while watching:

| Deck slide | Call-out |
|---|---|
| 14 | **Watch: Biology Meets Computer Science** — Quanta Magazine · 3 min 46 s · on the Week 1 page. *What is it about modern biological data that makes computation necessary rather than merely convenient?* |
| 36 | **Watch: AlphaFold, the making of a scientific breakthrough** — Google DeepMind · 7 min 54 s · on the Week 1 page. *What information must a model learn about proteins before it can predict a structure at all? Where would that information come from?* |

The videos themselves are played from the website, which embeds them through
`youtube-nocookie.com`. Nothing is embedded inside the `.pptx`: the decks stay
small, and the videos stay attributed to their creators.

## Accessibility

| | Biology Meets Computer Science | AlphaFold |
|---|---|---|
| Captions | Provided by Quanta Magazine on YouTube | Provided by Google DeepMind on YouTube |
| Transcript | Available through the YouTube transcript panel | Available through the YouTube transcript panel |
| Player controls | Full YouTube player: speed, captions, full screen | Same |
| "Watch on YouTube" link | Yes, next to the embed on the Week 1 page | Yes |
| Load-bearing for assessment | No. Everything either video covers is also in the written material | No |
| Cookies before play | None. Embeds use `youtube-nocookie.com` | None |

Neither video is the only route to any assessed content, which is the
accessibility requirement that matters most: a student who cannot use video
loses nothing from the module.
