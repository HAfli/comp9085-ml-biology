#!/usr/bin/env python3
"""
COMP9085 slide template - built on the official MTU master.

This module does NOT define a visual identity. It inherits one.

`new_deck()` opens slides/template/MTU_COMP9085.pptx, which is the 2025/26
COMP9085 deck (Week1_MLinBiology_Introduction_final.pptx) with its 52 slides
removed and everything else left untouched: the slide master, all eighteen
layouts, the theme, the MTU background artwork (crest, "Succeeding Together",
the blue/red diagonal band, www.mtu.ie), the embedded fonts and the colour
scheme. Every slide produced here is placed on one of those layouts, so the
decks are recognisably the same MTU COMP9085 slides as last year.

Inherited from the MTU master, not chosen here
    slide size        13.333 x 7.5 in (16:9)
    title style       IBM Plex Sans Condensed, colour accent2 #00A2FF
    body style        IBM Plex Sans Condensed, level 1 #284F80, level 2 #EEAF00
    colour scheme     "Custom 1": dk2 #284F80, accent1 #D90727, accent2 #00A2FF,
                      accent3 #EEAF00, accent4 #326194, accent5 #6C98C1
    backgrounds       master image1.jpg; title-slide layout image2.jpg
    footer text       "COMP9085 Machine Learning in Biology - Haithem.afli@mtu.ie"

Layout helpers provided (all accept notes=)
    title_slide  section_slide  bullets  deflist  concept  equation  two_col
    table_slide  diagram_pipeline  figure_note  interactive  picture_slide
    references   closing
"""
import os

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "template", "MTU_COMP9085.pptx")
FIGURES = os.path.join(HERE, "figures")

# --- The MTU theme colours, read from theme1.xml of the original deck ------
MTU_NAVY   = RGBColor(0x28, 0x4F, 0x80)   # dk2 / tx2  - body text
MTU_RED    = RGBColor(0xD9, 0x07, 0x27)   # accent1    - the MTU red
MTU_BLUE   = RGBColor(0x00, 0xA2, 0xFF)   # accent2    - titles
MTU_AMBER  = RGBColor(0xEE, 0xAF, 0x00)   # accent3    - master level 2
MTU_STEEL  = RGBColor(0x32, 0x61, 0x94)   # accent4
MTU_PALE   = RGBColor(0x6C, 0x98, 0xC1)   # accent5    - muted text
WHITE      = RGBColor(0xFF, 0xFF, 0xFF)

# Tints derived from the scheme, for table banding and callout panels only.
TINT_BLUE  = RGBColor(0xEC, 0xF3, 0xFA)
TINT_BLUE2 = RGBColor(0xDD, 0xE8, 0xF3)
TINT_AMBER = RGBColor(0xFD, 0xF4, 0xDE)
TINT_RED   = RGBColor(0xFB, 0xE7, 0xEA)

# Names kept so that week01.py and technical.py read naturally.
INK, INK2, INK3, INK4 = MTU_NAVY, MTU_NAVY, MTU_STEEL, MTU_PALE
GROUND, GROUND2, GROUND3 = WHITE, TINT_BLUE, TINT_BLUE2
CLINICAL, SIGNAL, SPECIMEN = MTU_STEEL, MTU_STEEL, MTU_STEEL
NUCLEUS, SPECIMEN_S, CLINICAL_S = MTU_AMBER, TINT_BLUE, TINT_BLUE
NUCLEUS_S, SIGNAL_S, WARN_S = TINT_AMBER, TINT_BLUE, TINT_RED
RULE = RGBColor(0xD8, 0xE2, 0xEC)
WARN, DANGER, OK = MTU_RED, MTU_RED, MTU_STEEL

SANS = "IBM Plex Sans Condensed"     # embedded in the MTU template
MONO = "Consolas"                    # formulas only, where alignment matters

W, H = Inches(13.333), Inches(7.5)

# Geometry taken from the MTU master's own placeholders.
M         = Inches(0.92)     # master body placeholder left edge
CONTENT_W = Inches(11.50)    # master body placeholder width
TOP       = Inches(1.52)     # clears the MTU crest, top right
BOTTOM    = Inches(6.30)     # clears the footer and the MTU band
BODY_H    = BOTTOM - TOP

FOOTER_TEXT = "COMP9085 Machine Learning in Biology - Haithem.afli@mtu.ie"

# Layout indices in the MTU master.
L_TITLE, L_SECTION, L_TITLE_ONLY, L_BLANK, L_CONTENT = 0, 2, 5, 6, 11

# The module has one visual identity, the MTU one. The strand argument is
# retained so the week sources stay unchanged, but it no longer recolours the
# deck; it only tints the small emphasis rule on section dividers.
STRAND_COLOUR = {
    "classical": MTU_STEEL, "representation": MTU_STEEL,
    "foundation": MTU_STEEL, "adaptation": MTU_STEEL, "evaluation": MTU_STEEL,
}


# --- deck and slide creation ----------------------------------------------

def new_deck():
    """Open the MTU template. Its master, layouts, theme, background artwork
    and embedded fonts all carry into the deck we build on top of it."""
    if not os.path.exists(TEMPLATE):
        raise SystemExit(
            "Missing %s.\nIt is produced from the original MTU deck; see "
            "docs/MAINTENANCE.md, 'Rebuilding the lecture slides'." % TEMPLATE)
    return Presentation(TEMPLATE)


def _slide(prs, layout=L_CONTENT, keep_body=False):
    s = prs.slides.add_slide(prs.slide_layouts[layout])
    if not keep_body:
        for ph in list(s.placeholders):
            if ph.placeholder_format.idx != 0:
                ph._element.getparent().remove(ph._element)
    return s


def _blank(prs):
    return _slide(prs, L_BLANK)


def _notes(slide, text):
    if text:
        slide.notes_slide.notes_text_frame.text = text.strip()


def _footer(slide, week, prs=None):
    """The footer line the original decks carry, in the same place and the
    same wording, with the slide number appended."""
    n = len(slide.part.package.presentation_part.presentation.slides._sldIdLst)
    # The original decks put this line at y=7.18, where the MTU diagonal band
    # runs underneath it and swallows it. Same wording, same corner, moved up
    # into the clear strip so it can actually be read.
    tf = _tb(slide, Inches(0.92), Inches(6.44), Inches(7.30), Inches(0.26))
    p = tf.paragraphs[0]
    p.space_after = 0
    r = p.add_run()
    r.text = "%s  ·  %d" % (FOOTER_TEXT, n)
    r.font.size = Pt(9)
    r.font.color.rgb = MTU_PALE
    r.font.name = SANS


def _chrome(slide, week, strand=None, title_bar=False):
    _footer(slide, week)


# --- text helpers ----------------------------------------------------------

def _tb(slide, x, y, w, h, anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = 0
    tf.margin_top = tf.margin_bottom = 0
    return tf


def _para(tf, text, size=18, bold=False, colour=MTU_NAVY, space_after=8,
          font=SANS, align=PP_ALIGN.LEFT, first=False, level=0, italic=False):
    p = tf.paragraphs[0] if first else tf.add_paragraph()
    p.alignment = align
    p.level = level
    p.space_after = Pt(space_after)
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = colour
    run.font.name = font
    return p


def _rect(slide, x, y, w, h, fill=None, line=None, line_w=1.0,
          shape=MSO_SHAPE.RECTANGLE):
    sh = slide.shapes.add_shape(shape, x, y, w, h)
    if fill is None:
        sh.fill.background()
    else:
        sh.fill.solid()
        sh.fill.fore_color.rgb = fill
    if line is None:
        sh.line.fill.background()
    else:
        sh.line.color.rgb = line
        sh.line.width = Pt(line_w)
    sh.shadow.inherit = False
    return sh


def _title(slide, text, sub=None):
    """Write into the master's own title placeholder so the title inherits the
    MTU typography exactly. Only the size is adjusted, and only downwards, so a
    long title does not run under the crest."""
    ph = None
    for p in slide.placeholders:
        if p.placeholder_format.idx == 0:
            ph = p
            break
    if ph is None:
        tf = _tb(slide, Inches(0.35), Inches(0.30), Inches(9.45), Inches(1.0))
        _para(tf, text, 34, False, MTU_BLUE, 0, first=True)
    else:
        ph.left, ph.top = Inches(0.35), Inches(0.16)
        ph.width, ph.height = Inches(9.20), Inches(1.10)
        tf = ph.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        n = len(text)
        size = 36 if n <= 38 else (30 if n <= 58 else (26 if n <= 78 else 22))
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run()
        r.text = text
        r.font.size = Pt(size)
    if sub:
        # Below the title box (0.16 + 1.10 = 1.26), so a title that wraps to
        # two lines cannot land on it, and below the crest, which ends at
        # about y = 1.05.
        st = _tb(slide, Inches(0.92), Inches(1.30), Inches(11.50), Inches(0.34))
        _para(st, sub, 13, False, MTU_STEEL, 0, first=True)
        return Inches(1.74)
    return TOP


def _heading(s, title, sub=None):
    return _title(s, title, sub)


# --- layouts ---------------------------------------------------------------

def title_slide(prs, week, title, subtitle, strand="classical", notes=None):
    """The MTU title slide: crest, blue/red diagonal artwork, white title band.
    Uses the template's own 'Title Slide' layout, unchanged."""
    s = prs.slides.add_slide(prs.slide_layouts[L_TITLE])
    got = {}
    for ph in list(s.placeholders):
        got[ph.placeholder_format.idx] = ph

    if 0 in got:
        tf = got[0].text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run()
        r.text = title
        r.font.size = Pt(40 if len(title) <= 44 else 32)
    if 1 in got:
        tf = got[1].text_frame
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run()
        r.text = "Week %d: %s" % (week, subtitle)
        r.font.size = Pt(20)
    # The two small identity placeholders sit low on the artwork and are only
    # 3.4 in wide in the original, so they are widened and set smaller here to
    # keep both lines on the slide.
    if 10 in got:
        ph = got[10]
        ph.left, ph.top = Inches(0.51), Inches(5.62)
        ph.width, ph.height = Inches(5.20), Inches(0.50)
        tf = ph.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run(); r.text = "Dr Haithem Afli"; r.font.size = Pt(22)
    if 11 in got:
        ph = got[11]
        ph.left, ph.top = Inches(0.51), Inches(6.20)
        ph.width, ph.height = Inches(5.20), Inches(0.80)
        tf = ph.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run()
        r.text = "Department of Computer Science"
        r.font.size = Pt(13)
        p2 = tf.add_paragraph()
        r2 = p2.add_run()
        r2.text = "Haithem.afli@mtu.ie"
        r2.font.size = Pt(13)

    _notes(s, notes)
    return s


def section_slide(prs, week, number, title, strapline="", strand="classical",
                  notes=None):
    """The template's own Section Header layout."""
    s = prs.slides.add_slide(prs.slide_layouts[L_SECTION])
    got = {p.placeholder_format.idx: p for p in s.placeholders}
    if 0 in got:
        tf = got[0].text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run()
        r.text = title
        r.font.size = Pt(36 if len(title) <= 40 else 28)
    if 1 in got:
        tf = got[1].text_frame
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run()
        r.text = ("Part %s" % number) + ("   ·   " + strapline
                                         if strapline else "")
        r.font.size = Pt(16)
        r.font.color.rgb = MTU_STEEL
    _footer(s, week)
    _notes(s, notes)
    return s


def bullets(prs, week, title, items, sub=None, strand="classical",
            notes=None, size=19, columns=1):
    """items: list of str, or (str, level) tuples.

    Level 0 takes the master's navy; level 1 takes the master's amber, which is
    the level-2 colour of the MTU body style."""
    s = _slide(prs)
    top = _heading(s, title, sub)
    _footer(s, week)

    norm = [(i, 0) if isinstance(i, str) else i for i in items]
    if columns == 2:
        half = (len(norm) + 1) // 2
        chunks = [norm[:half], norm[half:]]
        col_w = (CONTENT_W - Inches(0.5)) / 2
        xs = [M, M + col_w + Inches(0.5)]
    else:
        chunks, col_w, xs = [norm], CONTENT_W, [M]

    for chunk, x in zip(chunks, xs):
        tf = _tb(s, x, top, col_w, BOTTOM - top)
        for i, (text, lvl) in enumerate(chunk):
            _para(tf, ("•  " if lvl == 0 else "–  ") + text,
                  size if lvl == 0 else size - 2,
                  False,
                  MTU_NAVY if lvl == 0 else MTU_AMBER,
                  14 if lvl == 0 else 8,
                  first=(i == 0), level=lvl)
    _notes(s, notes)
    return s


def deflist(prs, week, title, pairs, sub=None, strand="classical",
            notes=None, size=15):
    """Term/definition pairs, the term in the MTU amber used by the master for
    second-level text, the definition in the master's navy."""
    s = _slide(prs)
    top = _heading(s, title, sub)
    _footer(s, week)

    tf = _tb(s, M, top, CONTENT_W, BOTTOM - top)
    for i, (term, body) in enumerate(pairs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(13)
        r1 = p.add_run()
        r1.text = term + "   "
        r1.font.size = Pt(size + 1)
        r1.font.bold = True
        r1.font.color.rgb = MTU_AMBER
        r1.font.name = SANS
        r2 = p.add_run()
        r2.text = body
        r2.font.size = Pt(size)
        r2.font.color.rgb = MTU_NAVY
        r2.font.name = SANS
    _notes(s, notes)
    return s


def concept(prs, week, term, definition, detail=None, strand="classical",
            notes=None):
    s = _slide(prs)
    _title(s, term)
    _footer(s, week)
    tf2 = _tb(s, M, TOP + Inches(0.35), CONTENT_W * 0.88, Inches(3.4))
    _para(tf2, definition, 21, False, MTU_NAVY, 16, first=True)
    if detail:
        _para(tf2, detail, 15, False, MTU_STEEL, 0)
    _notes(s, notes)
    return s


def equation(prs, week, title, eq, explanation=None, terms=None,
             strand="classical", notes=None):
    """Centred mathematics on a pale panel, then a plain-English reading of it
    and a symbol glossary. Multi-line formulas are split so two expressions
    never collide on one line."""
    s = _slide(prs)
    top = _heading(s, title)
    _footer(s, week)

    lines = [ln.strip() for ln in eq.split("\n") if ln.strip()]
    band_h = Inches(0.55) + Inches(0.44) * len(lines)
    band = _rect(s, M, top + Inches(0.05), CONTENT_W, band_h, fill=TINT_BLUE)
    tf = band.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    longest = max(len(ln) for ln in lines)
    size = 24 if longest <= 46 else (20 if longest <= 58 else 17)
    for i, ln in enumerate(lines):
        _para(tf, ln, size, True, MTU_NAVY, 4, font=MONO,
              align=PP_ALIGN.CENTER, first=(i == 0))

    y = top + Inches(0.05) + band_h + Inches(0.22)
    if explanation:
        tf2 = _tb(s, M, y, CONTENT_W, Inches(0.9))
        _para(tf2, explanation, 16, False, MTU_NAVY, 0, first=True)
        y += Inches(0.95)
    if terms:
        tf3 = _tb(s, M, y, CONTENT_W, max(Inches(0.4), BOTTOM - y))
        for i, (sym, mean) in enumerate(terms):
            p = tf3.paragraphs[0] if i == 0 else tf3.add_paragraph()
            p.space_after = Pt(7)
            r1 = p.add_run(); r1.text = sym + "   "
            r1.font.size = Pt(14); r1.font.bold = True
            r1.font.name = MONO; r1.font.color.rgb = MTU_AMBER
            r2 = p.add_run(); r2.text = mean
            r2.font.size = Pt(14); r2.font.color.rgb = MTU_NAVY
            r2.font.name = SANS
    _notes(s, notes)
    return s


def two_col(prs, week, title, left_title, left_items, right_title, right_items,
            sub=None, strand="classical", notes=None,
            left_colour=None, right_colour=None):
    s = _slide(prs)
    top = _heading(s, title, sub)
    _footer(s, week)
    col_w = (CONTENT_W - Inches(0.5)) / 2

    for x, head, items, colour, soft in (
        (M, left_title, left_items, MTU_STEEL, TINT_BLUE),
        (M + col_w + Inches(0.5), right_title, right_items, MTU_AMBER,
         TINT_AMBER),
    ):
        _rect(s, x, top, col_w, Inches(0.46), fill=soft)
        tfh = _tb(s, x + Inches(0.18), top + Inches(0.07), col_w - Inches(0.36),
                  Inches(0.34))
        _para(tfh, head, 15, True, colour, 0, first=True)
        tf = _tb(s, x + Inches(0.18), top + Inches(0.66),
                 col_w - Inches(0.36), BOTTOM - top - Inches(0.7))
        for i, it in enumerate(items):
            _para(tf, "•  " + it, 15, False, MTU_NAVY, 11, first=(i == 0))
    _notes(s, notes)
    return s


def table_slide(prs, week, title, headers, rows, sub=None, strand="classical",
                notes=None, col_widths=None, size=12):
    s = _slide(prs)
    top = _heading(s, title, sub)
    _footer(s, week)

    nrows, ncols = len(rows) + 1, len(headers)
    height = min(BOTTOM - top - Inches(0.1), Inches(0.34) * nrows)
    shape = s.shapes.add_table(nrows, ncols, M, top + Inches(0.05),
                               CONTENT_W, height)
    tbl = shape.table
    if col_widths:
        total = sum(col_widths)
        for i, cw in enumerate(col_widths):
            tbl.columns[i].width = Emu(int(CONTENT_W * cw / total))

    def _style(cell, text, size, colour, bold=False):
        """An empty header cell has no runs, so setting run properties on
        runs[0] would raise. Add one first."""
        cell.text = str(text)
        cell.margin_top = cell.margin_bottom = Inches(0.02)
        p = cell.text_frame.paragraphs[0]
        if not p.runs:
            p.add_run().text = ""
        r = p.runs[0]
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = colour
        r.font.name = SANS

    for c, h in enumerate(headers):
        cell = tbl.cell(0, c)
        cell.fill.solid(); cell.fill.fore_color.rgb = MTU_NAVY
        _style(cell, h, size, WHITE, bold=True)

    for r, row in enumerate(rows, start=1):
        for c, val in enumerate(row):
            cell = tbl.cell(r, c)
            cell.fill.solid()
            cell.fill.fore_color.rgb = WHITE if r % 2 else TINT_BLUE
            _style(cell, val, size, MTU_NAVY)
    _notes(s, notes)
    return s


def diagram_pipeline(prs, week, title, rows, sub=None, strand="classical",
                     notes=None):
    """rows: list of (label, colour, [step, step, ...])."""
    s = _slide(prs)
    top = _heading(s, title, sub)
    _footer(s, week)

    palette = [(MTU_STEEL, TINT_BLUE), (MTU_AMBER, TINT_AMBER),
               (MTU_RED, TINT_RED)]

    # Fit to the space that is there. With three rows and a sub-heading the
    # fixed geometry used to finish 0.1 in above the footer line.
    avail = BOTTOM - top - Inches(0.22)
    per = avail / max(1, len(rows))
    label_h = Inches(0.34)
    row_gap = Inches(0.20)
    box_h = max(Inches(0.62), min(Inches(0.88), per - label_h - row_gap))

    y = top + Inches(0.10)
    for ri, (label, _ignored, steps) in enumerate(rows):
        colour, soft = palette[ri % len(palette)]
        tf = _tb(s, M, y, CONTENT_W, Inches(0.3))
        _para(tf, label, 14, True, colour, 0, first=True)
        y += label_h

        n = len(steps)
        gap = Inches(0.26)
        bw = (CONTENT_W - gap * (n - 1)) / n
        for i, step in enumerate(steps):
            x = M + i * (bw + gap)
            box = _rect(s, x, y, bw, box_h, fill=soft, line=colour,
                        line_w=1.1)
            tfb = box.text_frame
            tfb.word_wrap = True
            tfb.vertical_anchor = MSO_ANCHOR.MIDDLE
            tfb.margin_left = tfb.margin_right = Inches(0.07)
            for li, line in enumerate(step.split("\n")):
                _para(tfb, line, 11.5, True, MTU_NAVY, 0,
                      align=PP_ALIGN.CENTER, first=(li == 0))
            if i < n - 1:
                ar = _tb(s, x + bw, y + box_h / 2 - Inches(0.18), gap,
                         Inches(0.35))
                _para(ar, "→", 15, True, MTU_PALE, 0,
                      align=PP_ALIGN.CENTER, first=True)
        y += box_h + row_gap
    _notes(s, notes)
    return s


def figure_note(prs, week, statement, caption=None, kind="key",
                strand="classical", notes=None):
    """One large statement, for the takeaway of a section."""
    s = _slide(prs)
    _footer(s, week)
    colour, soft = {
        "key":  (MTU_STEEL, TINT_BLUE),
        "warn": (MTU_RED, TINT_RED),
        "fm":   (MTU_AMBER, TINT_AMBER),
    }.get(kind, (MTU_STEEL, TINT_BLUE))

    lines = 1 + len(statement) // 62
    band_h = Inches(1.05) + Inches(0.48) * lines + (Inches(0.45) if caption
                                                    else Inches(0))
    band_y = Inches(1.95)
    _rect(s, 0, band_y, W, band_h, fill=soft)
    _rect(s, 0, band_y, Inches(0.16), band_h, fill=colour)

    tf = _tb(s, M + Inches(0.25), band_y, CONTENT_W - Inches(0.5), band_h,
             anchor=MSO_ANCHOR.MIDDLE)
    _para(tf, statement, 26, True, colour, 14 if caption else 0, first=True)
    if caption:
        _para(tf, caption, 15, False, MTU_NAVY, 0)
    _notes(s, notes)
    return s


def picture_slide(prs, week, title, image, caption=None, credit=None,
                  strand="classical", notes=None, max_h=None):
    """A retained figure from the original COMP9085 deck, on the MTU layout.
    `image` is a filename inside slides/figures/."""
    from PIL import Image
    s = _slide(prs)
    top = _heading(s, title)
    _footer(s, week)

    path = image if os.path.isabs(image) else os.path.join(FIGURES, image)
    iw, ih = Image.open(path).size

    # Reserve the caption and credit space BEFORE sizing the picture. Sizing
    # the picture first pushed the credit line down onto the footer, and the
    # two printed on top of each other.
    cap_lines = (1 + (len(caption) - 1) // 118) if caption else 0
    cap_h = Inches(0.22) * cap_lines
    cred_h = Inches(0.22) if credit else 0
    text_block = cap_h + cred_h + (Inches(0.10) if (caption or credit) else 0)

    avail_h = max_h or (BOTTOM - top - Inches(0.06) - text_block)
    avail_w = CONTENT_W
    scale = min(avail_w / iw, avail_h / ih)
    w, h = int(iw * scale), int(ih * scale)
    s.shapes.add_picture(path, int(M + (CONTENT_W - w) / 2),
                         int(top + Inches(0.05)), w, h)

    y = top + Inches(0.05) + h + Inches(0.10)
    if caption:
        tf = _tb(s, M, y, CONTENT_W, cap_h)
        _para(tf, caption, 13, False, MTU_NAVY, 0, first=True)
        y += cap_h
    if credit:
        tf = _tb(s, M, y, CONTENT_W, cred_h)
        _para(tf, credit, 10, False, MTU_PALE, 0, first=True, italic=True)
    _notes(s, notes)
    return s


def interactive(prs, week, activity, url_path, question, strand="classical",
                notes=None):
    s = _slide(prs)
    _title(s, "Try this interactively")
    _footer(s, week)

    tf2 = _tb(s, M, TOP + Inches(0.25), CONTENT_W * 0.62, Inches(3.4))
    _para(tf2, activity, 26, True, MTU_NAVY, 16, first=True)
    _para(tf2, question, 16, False, MTU_NAVY, 18)
    _para(tf2, url_path, 13, False, MTU_AMBER, 0, font=MONO)

    box = _rect(s, M + CONTENT_W * 0.68, TOP + Inches(0.4),
                CONTENT_W * 0.32, Inches(2.4), fill=TINT_BLUE, line=MTU_PALE)
    tfb = box.text_frame
    tfb.word_wrap = True
    tfb.vertical_anchor = MSO_ANCHOR.MIDDLE
    for li, line in enumerate(["Open the week page on the",
                               "course website and scroll to",
                               "Interactive exploration."]):
        _para(tfb, line, 13, False, MTU_STEEL, 0,
              align=PP_ALIGN.CENTER, first=(li == 0))
    _notes(s, notes)
    return s


def references(prs, week, items, strand="classical", notes=None):
    s = _slide(prs)
    top = _heading(s, "References and further reading")
    _footer(s, week)
    tf = _tb(s, M, top, CONTENT_W, BOTTOM - top)
    for i, it in enumerate(items):
        _para(tf, it, 13, False, MTU_NAVY, 10, first=(i == 0))
    _notes(s, notes)
    return s


def closing(prs, week, next_week, strand="classical", notes=None):
    s = prs.slides.add_slide(prs.slide_layouts[L_SECTION])
    got = {p.placeholder_format.idx: p for p in s.placeholders}
    if 0 in got:
        tf = got[0].text_frame
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run(); r.text = "Questions"; r.font.size = Pt(36)
    if 1 in got:
        tf = got[1].text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        for r in list(p.runs):
            r._r.getparent().remove(r._r)
        r = p.add_run()
        r.text = next_week
        r.font.size = Pt(16)
        r.font.color.rgb = MTU_STEEL
        p2 = tf.add_paragraph()
        r2 = p2.add_run()
        r2.text = "Dr Haithem Afli  ·  haithem.afli@mtu.ie"
        r2.font.size = Pt(14)
        r2.font.color.rgb = MTU_PALE
    _footer(s, week)
    _notes(s, notes)
    return s
