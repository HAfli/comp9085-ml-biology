#!/usr/bin/env python3
"""
COMP9085 — build every lecture deck.

Weeks 2 to 12 are composed from two sources:
  * js/data/course.js   the narrative: objectives, concepts, worked example,
                        foundation-model connection, self-check, reading.
                        Parsed directly, so the slides and the website cannot
                        drift apart.
  * slides/technical.py the mathematics: equations, algorithm statements,
                        measured tables and pitfall slides.

Week 1 is hand-authored in slides/week01.py, because it is a rebuild of a
specific existing deck and its structure is not the standard weekly shape.

Outputs, for every week:
    slides/weekNN/COMP9085_WeekNN.pptx
    slides/weekNN/COMP9085_WeekNN.pdf     (via LibreOffice, if available)

Run:
    python3 slides/build_slides.py            # all weeks
    python3 slides/build_slides.py 2 7 12     # selected weeks
    python3 slides/build_slides.py --no-pdf   # skip the PDF conversion
"""
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from template import (new_deck, title_slide, section_slide, bullets, concept,   # noqa: E402
                      deflist,
                      equation, two_col, table_slide, diagram_pipeline,
                      figure_note, interactive, references, closing,
                      CLINICAL, SIGNAL, NUCLEUS, SPECIMEN)
from technical import TECHNICAL                                                 # noqa: E402

VIZ_TITLES = {
    'problem-classifier': 'ML Problem Classifier',
    'decision-tree': 'Decision Tree Builder',
    'entropy': 'Entropy and Information Gain Visualiser',
    'leakage': 'Train/Test Leakage Simulator',
    'bayes': 'Medical Test Calculator',
    'naive-bayes': 'Naive Bayes Word Probability Explorer',
    'data-quality': 'Data Quality Explorer',
    'pca': 'PCA Visualiser',
    'embeddings': 'Foundation Model Embedding Explorer',
    'knn': 'Biological Similarity Explorer',
    'clustering': 'Clustering Simulator',
    'random-forest': 'Random Forest Visualiser',
    'leaderboard': 'Model Comparison Lab',
    'fine-tuning': 'Fine-Tuning Simulator',
    'fm-decision': 'Should I Use a Foundation Model?',
    'trust': 'Would You Trust This Model?',
    'pipelines': 'Classical vs Foundation Pipelines',
}

# The teaching question each interactive answers. An interactive that does not
# answer a question is decoration; these are the questions, and they are also
# printed in docs/SLIDE_WEBSITE_MAP.md.
VIZ_QUESTIONS = {
    'problem-classifier': 'Which kind of ML problem is this, and why is the '
                          'tempting answer wrong?',
    'decision-tree': 'What does changing the depth do to generalisation, on '
                     'real diagnostic data?',
    'entropy': 'What does information gain actually compute, split by split?',
    'leakage': 'How much does a leaky protocol inflate the reported score?',
    'bayes': 'Why can a 99 per cent accurate test be wrong most of the times '
             'it fires?',
    'naive-bayes': 'Which words drive the classification, and what does '
                   'smoothing change?',
    'data-quality': 'What does each preprocessing choice cost, when the damage '
                    'is known?',
    'pca': 'How much is lost by reducing, and does the loss matter downstream?',
    'embeddings': 'When does a learned representation beat hand-engineered '
                  'features, and when does it not?',
    'knn': 'Is it the classifier or the representation that decides who the '
           'neighbours are?',
    'clustering': 'Is this cluster structure biological, or is it the batch?',
    'random-forest': 'What weight can a feature-importance ranking actually '
                     'bear?',
    'leaderboard': 'What changes when you sort by something other than '
                   'accuracy?',
    'fine-tuning': 'What does each rung of the adaptation ladder really cost?',
    'fm-decision': 'Should I use a foundation model for this problem at all?',
    'trust': 'What questions must a performance claim survive?',
    'pipelines': 'Where do the three workflows actually differ?',
}



# --------------------------------------------------------------------------
# Reading the course data
# --------------------------------------------------------------------------

def load_course():
    """Evaluate the course data with node, so the slides read exactly what the
    website reads. Falling back to a regex parse would be fragile and would
    eventually disagree with the site, which is the failure this avoids."""
    script = (
        "global.window = {};"
        "require('%s');"
        "require('%s');"
        "require('%s');"
        "console.log(JSON.stringify({course: window.COURSE, labs: window.LABS,"
        " refs: window.REFERENCES}));"
        % (os.path.join(ROOT, 'js/data/course.js'),
           os.path.join(ROOT, 'js/data/labs.js'),
           os.path.join(ROOT, 'js/data/references.js'))
    )
    out = subprocess.run(['node', '-e', script], capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit('Could not read course data:\n' + out.stderr)
    return json.loads(out.stdout)


def strip_refs(text):
    """Remove the [ref:key] markers used by the website; the decks carry a
    proper reference list instead."""
    return re.sub(r'\s*\[ref:[a-zA-Z0-9_]+\]', '', text or '')


def paras(text, limit=None):
    ps = [p.strip() for p in strip_refs(text).split('\n\n') if p.strip()]
    return ps[:limit] if limit else ps


def sentences(text):
    """Split prose into sentences, keeping abbreviations such as 'e.g.' whole
    enough for slide use."""
    text = ' '.join(text.split())
    parts = re.split(r'(?<=[.!?])\s+(?=[\"(A-Z0-9])', text)
    return [p.strip() for p in parts if p.strip()]


def shorten(text, n):
    """Keep whole sentences up to about n characters.

    An earlier version cut at the character limit and appended an ellipsis,
    which left slides ending mid-clause: "...giving 30...". A slide that ends
    mid-sentence is worse than a slide that is one line longer, so this keeps
    complete sentences and never truncates one. A single sentence longer than
    the limit is kept in full; audit_slides.py flags it if it does not fit.
    """
    text = ' '.join(text.split())
    if len(text) <= n:
        return text
    ss = sentences(text)
    if not ss:
        return text
    out = ss[0]
    for nxt in ss[1:]:
        if len(out) + 1 + len(nxt) > n:
            break
        out += ' ' + nxt
    return out


def bullet_items(text, soft=300):
    """Turn prose into slide bullets without losing any of it.

    One bullet per paragraph, because the source paragraphs are already the
    unit of argument ("Zero-shot. No labels, no training. Try it first..."):
    splitting on every sentence scattered a label onto one bullet and its
    explanation onto the next. A paragraph longer than `soft` is divided at a
    sentence boundary instead of being truncated.
    """
    out = []
    for para in paras(text):
        ss = sentences(para)
        if not ss:
            continue
        cur = ss[0]
        for nxt in ss[1:]:
            if len(cur) + 1 + len(nxt) > soft:
                out.append(cur)
                cur = nxt
            else:
                cur += ' ' + nxt
        out.append(cur)
    return out


def chunk_bullets(items, max_items=4, max_chars=900):
    """Group bullets into slide-sized chunks, by count and by total length."""
    chunks, cur, n = [], [], 0
    for it in items:
        if cur and (len(cur) >= max_items or n + len(it) > max_chars):
            chunks.append(cur)
            cur, n = [], 0
        cur.append(it)
        n += len(it)
    if cur:
        chunks.append(cur)
    if len(chunks) > 1 and len(chunks[-1]) == 1 and \
            len(chunks[-2]) < max_items + 1:
        tail = chunks.pop()
        chunks[-1] = chunks[-1] + tail
    return chunks

# --------------------------------------------------------------------------
# The standard weekly deck
# --------------------------------------------------------------------------

def build_week(prs, w, labs, refs):
    n, strand = w['n'], w['strand']
    tech = TECHNICAL.get(n, {})

    title_slide(prs, n, w['title'], w['short'], strand,
                notes='Open by naming the biological problem, not the '
                      'algorithm. The method should arrive as the answer to a '
                      'question the room already has.')

    # ---- Objectives
    bullets(prs, n, 'By the end of this week you should be able to',
            [shorten(o, 200) for o in w['objectives']],
            sub='Learning outcomes served: ' + ', '.join(w['los']),
            strand=strand, size=16,
            notes='Read two or three of these aloud. Students use them when '
                  'revising and when scoping their projects.')

    # ---- Part 1: the biological problem
    section_slide(prs, n, 1, 'The biological problem',
                  'Why anyone cares about this week\'s method', strand)

    bio_chunks = chunk_bullets(bullet_items(w['biology']))[:2]
    for bi, chunk in enumerate(bio_chunks):
        bullets(prs, n,
            'Biological context' + (' (continued)' if bi else ''),
            chunk,
            strand=strand, size=15,
            notes='Spend real time here. The single most common failure in '
                  'this module is a student who can fit the model and cannot '
                  'say what question it answers.')

    # ---- Part 2: the method
    section_slide(prs, n, 2, 'The method',
                  'Concepts, then the mathematics', strand)

    con = w['concepts']
    for c in con[:2]:
        concept(prs, n, c['term'], shorten(strip_refs(c['body']), 320),
                strand=strand,
                notes='Definition slide. Keep to about ninety seconds each.')

    if len(con) > 2:
        rest = con[2:]
        groups = [rest[i:i + 4] for i in range(0, len(rest), 4)]
        # A trailing group of one leaves a "(continued)" slide with a single
        # definition on it.
        if len(groups) > 1 and len(groups[-1]) == 1:
            tail = groups.pop()
            groups[-1] = groups[-1] + tail
        for i, chunk in enumerate(groups):
            deflist(prs, n, 'Key concepts' + (' (continued)' if i else ''),
                    [(c['term'], shorten(strip_refs(c['body']), 235))
                     for c in chunk],
                    strand=strand, size=14,
                    notes='These are the definitions the self-check and the '
                          'projects assume.')

    # ---- The mathematics
    for eq in tech.get('equations', []):
        equation(prs, n, eq[0], eq[1], eq[2], eq[3], strand=strand,
                 notes='Work through the symbols one at a time. This is the '
                       'Level 9 content; do not rush it.')

    if 'algorithm' in tech:
        t, steps, note = tech['algorithm']
        bullets(prs, n, t, steps, sub=note, strand=strand, size=15,
                notes='Walk the algorithm on the worked example that follows.')

    for tb in tech.get('tables', []):
        table_slide(prs, n, tb[0], tb[1], tb[2], sub=tb[3], strand=strand,
                    col_widths=tb[4] if len(tb) > 4 else None, size=12,
                    notes='These figures are measured, not illustrative. The '
                          'website recomputes them live in the browser.')

    for pl in tech.get('pipelines', []):
        diagram_pipeline(prs, n, pl[0], pl[1], sub=pl[2], strand=strand)

    for pf in tech.get('pitfalls', []):
        bullets(prs, n, pf[0], pf[1], sub=pf[2], strand=strand, size=14,
                notes='The practical knowledge that separates a working '
                      'pipeline from a publishable one.')

    # ---- Part 3: worked example
    section_slide(prs, n, 3, 'Worked example',
                  w['worked']['title'], strand)

    for i, chunk in enumerate(chunk_bullets(bullet_items(w['worked']['body']))[:6]):
        bullets(prs, n,
                w['worked']['title'] if i == 0 else
                w['worked']['title'] + ' (continued)',
                chunk, strand=strand, size=15,
                notes='Do the arithmetic on the board as well as the slide. '
                      'Students who see it done believe it.')

    figure_note(prs, n, w['worked']['keypoint'], kind='key', strand=strand,
                notes='The sentence to leave them with from this section.')

    # ---- Interactive
    for key in (w['viz'], w.get('viz2')):
        if not key:
            continue
        interactive(prs, n, VIZ_TITLES.get(key, key),
                    'weeks/week%02d.html  ·  Interactive exploration' % n,
                    VIZ_QUESTIONS.get(key, 'Move a control and watch what the '
                                           'model does.'),
                    strand=strand,
                    notes='Every figure is a live model fitted in the browser '
                          'on real data, not an animation. Demonstrate it for '
                          'two or three minutes, then let them explore in the '
                          'lab. Ask the room for a prediction before you move '
                          'a slider.')

    # ---- Part 4: foundation-model connection
    section_slide(prs, n, 4, 'The foundation-model connection',
                  w['fm']['title'], strand)

    for i, chunk in enumerate(chunk_bullets(bullet_items(w['fm']['body']))[:4]):
        bullets(prs, n,
                w['fm']['title'] if i == 0
                else w['fm']['title'] + ' (continued)',
                chunk, strand=strand, size=15,
                notes='Some weeks the honest answer here is that a foundation '
                      'model has nothing to offer. Say so plainly when it is.')

    # ---- Part 5: interpretation and the lab
    section_slide(prs, n, 5, 'Interpretation and practical',
                  'What the result means, and what you will do with it', strand)

    figure_note(prs, n, shorten(w['scientist'], 300),
                'Think like a scientist. Bring your answer to the laboratory.',
                kind='warn', strand=strand,
                notes='There is no clean answer. That is the point; it is the '
                      'kind of question the projects are marked on.')

    lab = labs.get(w.get('lab'))
    if lab:
        # The title alone. Prefixing "This week's laboratory: " pushed a single
        # orphan word onto a second line on three of the twelve decks.
        bullets(prs, n, lab['title'],
                [shorten(t, 300) for t in lab['tasks']],
                sub="This week's laboratory  ·  " + lab['goal'] + '  ·  '
                    + lab['duration'],
                strand=strand, size=13,
                notes='Deliverable: ' + lab['deliverable'])
    else:
        figure_note(prs, n, 'There is no laboratory this week.',
                    'The first practical is in Week 2.', kind='key',
                    strand=strand)

    # ---- Self-check
    for q in w['quiz'][:2]:
        opts = [('%s)  %s' % (chr(65 + i), o)) for i, o in enumerate(q['options'])]
        bullets(prs, n, 'Self-check', [shorten(q['q'], 320)] + opts,
                strand=strand, size=15,
                notes='Answer: %s. %s' % (chr(65 + q['answer']),
                                          strip_refs(q['why'])))

    # ---- References
    ref_items = []
    for r in w.get('reading', []):
        meta = refs.get(r['ref'])
        if meta:
            ref_items.append(meta['cite'] +
                             (('  doi:' + meta['doi']) if meta.get('doi') else ''))
    if ref_items:
        references(prs, n, ref_items, strand=strand)

    nxt = ('Next week: continue to Week %d.' % (n + 1)) if n < 12 else \
          'That is the module. Both projects are described in full on the ' \
          'assessment page.'
    closing(prs, n, nxt, strand=strand)


# --------------------------------------------------------------------------

def to_pdf(pptx_path, outdir):
    if not shutil.which('soffice'):
        return False
    try:
        subprocess.run(
            ['soffice', '--headless', '--convert-to', 'pdf',
             '--outdir', outdir, pptx_path],
            capture_output=True, timeout=240, check=True)
        return os.path.exists(pptx_path.replace('.pptx', '.pdf'))
    except Exception:                                          # noqa: BLE001
        return False


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    want = set(int(a) for a in args) if args else set(range(1, 13))
    make_pdf = '--no-pdf' not in sys.argv

    data = load_course()
    course, labs, refs = data['course'], data['labs'], data['refs']

    built = []
    for w in course['weeks']:
        n = w['n']
        if n not in want:
            continue
        prs = new_deck()
        if n == 1:
            import week01
            week01.build(prs)
        elif n == 2:
            import week02
            week02.build(prs)
        else:
            build_week(prs, w, labs, refs)

        outdir = os.path.join(HERE, 'week%02d' % n)
        os.makedirs(outdir, exist_ok=True)
        pptx = os.path.join(outdir, 'COMP9085_Week%02d.pptx' % n)
        prs.save(pptx)

        pdf_ok = to_pdf(pptx, outdir) if make_pdf else False
        built.append((n, len(prs.slides._sldIdLst), pdf_ok))
        print('  Week %02d: %2d slides  %s'
              % (n, len(prs.slides._sldIdLst), 'pptx + pdf' if pdf_ok else 'pptx'))

    print('\nBuilt %d deck(s) into slides/.' % len(built))
    if make_pdf and not all(b[2] for b in built):
        print('Some PDFs were not produced. Install LibreOffice, or open the '
              'PPTX and export manually.')


if __name__ == '__main__':
    main()
