#!/usr/bin/env python3
"""
Structural audit of the built decks.

Checks the things that can be established mechanically, so that the visual
inspection pass only has to look for things a machine cannot judge.

    python3 slides/audit_slides.py
"""
import glob
import os
import sys

from PIL import ImageFont
from pptx import Presentation
from pptx.util import Emu

HERE = os.path.dirname(os.path.abspath(__file__))
EMU_IN = 914400.0
SLIDE_W, SLIDE_H = 13.3333, 7.5

# The MTU background artwork. Nothing should be placed inside these.
CREST = (9.55, 0.10, 13.30, 1.05)          # x0, y0, x1, y1, in inches
BAND_Y = 6.72                              # "Succeeding Together" / diagonal

FONT_CANDIDATES = [
    "/usr/local/share/fonts/plex/IBMPlexSansCondensed-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _font(size_pt):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return ImageFont.truetype(p, max(6, int(round(size_pt))))
    return None


def _wrapped_height(text, size_pt, width_in, line_factor=1.22):
    """Estimate rendered height in inches by measuring the real font."""
    f = _font(size_pt)
    if f is None or not text:
        return 0.0
    # PIL is asked for a font of `size_pt` pixels, so one pixel of measured
    # advance equals one point of rendered width. A box `width_in` inches wide
    # therefore holds `width_in * 72` of those units.
    max_px = width_in * 72.0
    lines = 0
    for para in text.split("\n"):
        words = para.split()
        if not words:
            lines += 1
            continue
        cur = words[0]
        n = 1
        for w in words[1:]:
            trial = cur + " " + w
            if f.getlength(trial) * (96.0 / 96.0) <= max_px:
                cur = trial
            else:
                n += 1
                cur = w
        lines += n
    return lines * size_pt * line_factor / 72.0


def audit(path):
    prs = Presentation(path)
    week = os.path.basename(path).replace("COMP9085_Week", "").replace(".pptx", "")
    issues = []
    if abs(prs.slide_width / EMU_IN - SLIDE_W) > 0.01 or \
       abs(prs.slide_height / EMU_IN - SLIDE_H) > 0.01:
        issues.append(("deck", "slide size is not 13.33 x 7.5 in"))

    if not prs.slide_masters:
        issues.append(("deck", "no slide master"))
    else:
        names = [L.name for L in prs.slide_layouts]
        if "Douglas Title and Content" not in names:
            issues.append(("deck", "MTU layouts are missing: %s" % names[:4]))

    for i, s in enumerate(prs.slides, 1):
        texts = []
        on_title = s.slide_layout.name == "Title Slide"
        for sh in s.shapes:
            L = (sh.left or 0) / EMU_IN
            T = (sh.top or 0) / EMU_IN
            Wd = (sh.width or 0) / EMU_IN
            Ht = (sh.height or 0) / EMU_IN
            R, B = L + Wd, T + Ht

            if L < -0.02 or T < -0.02 or R > SLIDE_W + 0.02 or B > SLIDE_H + 0.02:
                issues.append((i, "%s runs off the slide (%.2f,%.2f)-(%.2f,%.2f)"
                               % (sh.name, L, T, R, B)))
            if sh.shape_type == 13 or (sh.has_text_frame and
                                       sh.text_frame.text.strip()):
                if not on_title and B > BAND_Y + 0.02 and Ht < 6.0 and T > 1.0:
                    issues.append((i, "%s overlaps the MTU footer band "
                                      "(bottom %.2f in)" % (sh.name, B)))
                if (not on_title and R > CREST[0] and L < CREST[2]
                        and B > CREST[1] and T < CREST[3]):
                    issues.append((i, "%s overlaps the MTU crest" % sh.name))

            if sh.has_text_frame and sh.text_frame.text.strip():
                tf = sh.text_frame
                texts.append(tf.text)
                total = 0.0
                for p in tf.paragraphs:
                    t = "".join(r.text for r in p.runs)
                    if not t.strip():
                        continue
                    sz = None
                    for r in p.runs:
                        if r.font.size:
                            sz = r.font.size.pt
                            break
                    if sz is None:
                        sz = 18.0
                    inner = max(0.5, Wd - 0.16)
                    total += _wrapped_height(t, sz, inner)
                    total += (p.space_after.pt if p.space_after else 0) / 72.0
                if Ht > 0.1 and total > Ht + 0.30:
                    issues.append((i, "%s text may overflow: needs about "
                                      "%.2f in, box is %.2f in"
                                   % (sh.name, total, Ht)))

            if sh.shape_type == 19:                       # TABLE
                for row in sh.table.rows:
                    for cell in row.cells:
                        if len(cell.text) > 110:
                            issues.append((i, "table cell is very long (%d "
                                              "characters)" % len(cell.text)))

        if not any(t.strip() for t in texts) and \
           not any(sh.shape_type == 13 for sh in s.shapes):
            issues.append((i, "slide appears to be empty"))

    return week, len(prs.slides._sldIdLst), issues


def main():
    files = sorted(glob.glob(os.path.join(HERE, "week*", "COMP9085_Week*.pptx")))
    if not files:
        raise SystemExit("no decks built; run slides/build_slides.py first")
    total = 0
    for f in files:
        week, n, issues = audit(f)
        # the footer line sits by design in the strip above the band
        issues = [x for x in issues
                  if not (isinstance(x[0], int) and "TextBox" in str(x[1])
                          and "footer band" in str(x[1]))]
        total += len(issues)
        print("Week %s  %2d slides  %s" % (week, n,
              "clean" if not issues else "%d issue(s)" % len(issues)))
        for where, what in issues:
            print("      slide %-4s %s" % (where, what))
    print("\n%d issue(s) across %d decks." % (total, len(files)))
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
