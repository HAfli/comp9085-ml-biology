#!/usr/bin/env python3
"""
Generate docs/SLIDE_WEBSITE_MAP.md from the built decks and the course data.

Reading the actual .pptx files rather than maintaining the table by hand means
the map cannot drift out of date. Rerun it whenever the slides are rebuilt.

Usage:
    python3 slides/build_slides.py          # build the decks first
    python3 docs/build_slide_map.py
    python3 docs/build_slide_map.py --qr --base https://user.github.io/repo/
"""
import argparse
import json
import os
import re
import subprocess
import sys

from pptx import Presentation
from pptx.util import Pt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VIZ = {
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
}

QUESTION = {
    'problem-classifier': 'Which kind of ML problem is this, and why is the tempting answer wrong?',
    'decision-tree': 'What does changing depth do to generalisation, on real data?',
    'entropy': 'What does information gain actually compute?',
    'leakage': 'How much does a leaky protocol inflate the reported score?',
    'bayes': 'Why can a 99% accurate test be wrong most of the time it fires?',
    'naive-bayes': 'Which words drive the classification, and what does smoothing do?',
    'data-quality': 'What does each preprocessing choice cost, when the damage is known?',
    'pca': 'How much is lost by reducing, and does it matter downstream?',
    'embeddings': 'When does a learned representation beat hand-engineered features?',
    'knn': 'Is it the classifier or the representation that decides the neighbours?',
    'clustering': 'Is this cluster structure biological, or is it the batch?',
    'random-forest': 'What can a feature-importance ranking actually bear?',
    'leaderboard': 'What changes when you sort by something other than accuracy?',
    'fine-tuning': 'What does each rung of the adaptation ladder really cost?',
    'fm-decision': 'Should I use a foundation model for this problem at all?',
    'trust': 'What questions must a performance claim survive?',
}

FOOTER = 'COMP9085 Machine Learning in Biology'
MARKER = 'try this interactively'   # the title of every call-out slide


def course_data():
    script = ("global.window={};require('%s');require('%s');"
              "console.log(JSON.stringify({c:window.COURSE,l:window.LABS}));"
              % (os.path.join(ROOT, 'js/data/course.js'),
                 os.path.join(ROOT, 'js/data/labs.js')))
    r = subprocess.run(['node', '-e', script], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr)
    return json.loads(r.stdout)


def slide_title(slide):
    for sh in slide.shapes:
        if sh.has_text_frame and sh.name.startswith('Title'):
            return sh.text_frame.text.strip()
    return ''


def headline(slide):
    """The activity name: the largest piece of text on the slide that is
    neither the title placeholder nor the footer line."""
    best, best_size = '', -1
    for sh in slide.shapes:
        if not sh.has_text_frame or sh.name.startswith('Title'):
            continue
        for p in sh.text_frame.paragraphs:
            text = ''.join(r.text for r in p.runs).strip()
            if not text or text.startswith(FOOTER):
                continue
            size = max((r.font.size.pt if r.font.size else 12)
                       for r in p.runs)
            if size > best_size:
                best, best_size = text, size
    return best


def stated_path(slide):
    """The relative page path printed on the slide, e.g. weeks/week07.html."""
    for sh in slide.shapes:
        if not sh.has_text_frame:
            continue
        m = re.search(r'weeks/week\d\d\.html', sh.text_frame.text)
        if m:
            return m.group(0)
    return ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--qr', action='store_true',
                    help='also generate QR codes into slides/qr/')
    ap.add_argument('--base', default='',
                    help='deployed base URL, needed for --qr')
    args = ap.parse_args()

    data = course_data()
    weeks = data['c']['weeks']

    rows, counts = [], []
    for w in weeks:
        n = w['n']
        path = os.path.join(ROOT, 'slides', 'week%02d' % n,
                            'COMP9085_Week%02d.pptx' % n)
        if not os.path.exists(path):
            print('missing deck for week %d; run slides/build_slides.py' % n)
            continue
        prs = Presentation(path)
        slides = list(prs.slides)
        counts.append((n, len(slides)))

        for i, s in enumerate(slides, 1):
            if slide_title(s).lower() != MARKER:
                continue
            name = headline(s)
            is_video = name.lower().startswith('watch')
            base = stated_path(s) or ('weeks/week%02d.html' % n)
            target = '%s#%s' % (base, 'videos' if is_video else 'interactive')
            rows.append((n, i, w['title'], name,
                         'Video' if is_video else 'Interactive', target))

    out = [
        '# Slide to website map', '',
        'Which slide sends students to which part of the site.', '',
        'Generated from the built `.pptx` files by `docs/build_slide_map.py`, so',
        'it cannot drift out of date. Rerun it after rebuilding the slides.', '',
        'Each slide listed here is a full-slide **Try this interactively**',
        'call-out on the MTU layout. It names the activity and prints the page',
        'path in monospace, so it can be read aloud or typed in a lecture',
        'theatre.', '',
        '## The mapping', '',
        '| Week | Slide | Lecture topic | Website activity | Type | Path |',
        '|---|---|---|---|---|---|',
    ]
    for n, i, topic, name, kind, target in rows:
        out.append('| %d | %d | %s | %s | %s | `%s` |'
                   % (n, i, topic, name, kind, target))

    out += ['', '## Deck sizes and downloads', '',
            '| Week | Slides | PowerPoint | PDF |', '|---|---|---|---|']
    for n, c in counts:
        out.append('| %d | %d | `slides/week%02d/COMP9085_Week%02d.pptx` | '
                   '`slides/week%02d/COMP9085_Week%02d.pdf` |'
                   % (n, c, n, n, n, n))
    out.append('')
    out.append('Both formats are linked at the top of every week page, on the '
               'resources page and on `canvas.html`.')

    out += ['', '## Every interactive, and the teaching question it answers', '',
            'An interactive that does not answer a question is decoration. '
            'These are the questions.', '',
            '| Interactive | Week | Teaching question |', '|---|---|---|']
    seen = set()
    for w in weeks:
        for key in (w.get('viz'), w.get('viz2')):
            if key and key not in seen:
                seen.add(key)
                out.append('| %s | %d | %s |'
                           % (VIZ.get(key, key), w['n'], QUESTION.get(key, '')))

    out += ['', '## QR codes for classroom use', '',
            'The slides print the page path in monospace, which is enough to '
            'type. For QR codes on a printed handout, encode your deployed base '
            'URL plus the path from the table above, for example:', '',
            '```', 'https://USERNAME.github.io/REPO/weeks/week02.html#interactive',
            '```', '',
            'They are not committed to the repository, because the base URL is '
            'not known until you deploy. To generate them:', '',
            '```bash', 'pip install "qrcode[pil]"',
            'python3 docs/build_slide_map.py --qr \\',
            '    --base https://USERNAME.github.io/REPO/', '```', '',
            'This writes one PNG per week into `slides/qr/`, which you can drop '
            'onto the title slide of each deck.', '']

    dest = os.path.join(ROOT, 'docs', 'SLIDE_WEBSITE_MAP.md')
    open(dest, 'w').write('\n'.join(out) + '\n')
    print('wrote docs/SLIDE_WEBSITE_MAP.md: %d activity slides across %d decks'
          % (len(rows), len(counts)))

    if args.qr:
        if not args.base:
            raise SystemExit('--qr needs --base https://.../')
        try:
            import qrcode
        except ImportError:
            raise SystemExit('pip install "qrcode[pil]" first')
        qdir = os.path.join(ROOT, 'slides', 'qr')
        os.makedirs(qdir, exist_ok=True)
        for n, _ in counts:
            url = args.base.rstrip('/') + '/weeks/week%02d.html' % n
            qrcode.make(url).save(os.path.join(qdir, 'week%02d.png' % n))
        print('wrote %d QR codes into slides/qr/' % len(counts))


if __name__ == '__main__':
    main()
