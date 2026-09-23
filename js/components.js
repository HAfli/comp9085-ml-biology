/* COMP9085 - reusable UI components.
 *
 * Each function returns an HTML string or mounts behaviour onto an element.
 * Anything that appears on more than one page lives here so that changing it
 * once changes it everywhere.
 */
(function () {
  'use strict';

  var C = {};
  window.UI = C;

  /* --- helpers --------------------------------------------------------- */

  C.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /** Turn [ref:key] markers in body text into superscript citation links. */
  C.cites = function (text) {
    var refs = window.REFERENCES || {};
    return String(text).replace(/\[ref:([a-zA-Z0-9_]+)\]/g, function (m, key) {
      var r = refs[key];
      if (!r) return '';
      return '<a class="cite" href="' + C.esc(r.url) + '" target="_blank" ' +
             'rel="noopener" title="' + C.esc(r.cite) + '">[' +
             C.esc(r.tag) + ']</a>';
    });
  };

  /** Escape, then render citations, then turn blank lines into paragraphs. */
  C.prose = function (text) {
    return C.cites(C.esc(text))
      .split(/\n\n+/)
      .map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; })
      .join('');
  };

  C.pad = function (n) { return n < 10 ? '0' + n : String(n); };

  C.strandColour = function (strand) {
    return ({
      classical: 'var(--stage-1)', representation: 'var(--stage-2)',
      foundation: 'var(--stage-3)', adaptation: 'var(--stage-4)',
      evaluation: 'var(--stage-5)'
    })[strand] || 'var(--ink-4)';
  };

  C.strandLabel = function (strand) {
    return ({
      classical: 'Classical ML', representation: 'Representation learning',
      foundation: 'Foundation models', adaptation: 'Adaptation',
      evaluation: 'Scientific evaluation'
    })[strand] || strand;
  };

  /* --- components ------------------------------------------------------ */

  /** Learning-outcome pills. */
  C.loPills = function (los) {
    if (!los || !los.length) return '';
    return los.map(function (lo) {
      return '<span class="pill pill-lo" title="' +
        C.esc(C.loText(lo)) + '">' + C.esc(lo) + '</span>';
    }).join('');
  };

  C.loText = function (id) {
    var lo = (window.COURSE.learningOutcomes || []).filter(function (l) {
      return l.id === id;
    })[0];
    return lo ? lo.text : id;
  };

  /** A week card, used on the home page, the roadmap and the weeks index. */
  C.weekCard = function (w, hrefPrefix) {
    var href = (hrefPrefix || '') + 'week' + C.pad(w.n) + '.html';
    return '' +
      '<a class="card week-card" href="' + href + '">' +
        '<span class="strand-bar" style="background:' +
          C.strandColour(w.strand) + '"></span>' +
        '<span class="week-num">Week ' + C.pad(w.n) + '</span>' +
        '<h3>' + C.esc(w.title) + '</h3>' +
        '<p>' + C.esc(w.short) + '</p>' +
        '<div class="pill-row" style="margin-bottom:0">' +
          C.loPills(w.los) +
        '</div>' +
      '</a>';
  };

  /** Callout box. */
  C.callout = function (kind, title, bodyHtml) {
    return '' +
      '<aside class="callout callout-' + kind + '">' +
        (title ? '<div class="callout-title">' + C.esc(title) + '</div>' : '') +
        bodyHtml +
      '</aside>';
  };

  /** Concept list. */
  C.concepts = function (list) {
    return '<ul class="concept-list">' + list.map(function (c) {
      return '<li><div class="concept-term">' + C.esc(c.term) + '</div>' +
             '<p class="concept-body">' + C.cites(C.esc(c.body)) + '</p></li>';
    }).join('') + '</ul>';
  };

  /** Numbered learning objectives. */
  C.objectives = function (list) {
    return '<ol class="objectives">' + list.map(function (o) {
      return '<li>' + C.cites(C.esc(o)) + '</li>';
    }).join('') + '</ol>';
  };

  /** Reference panel. */
  C.references = function (items) {
    var refs = window.REFERENCES || {};
    return '<ol class="refs">' + items.map(function (it) {
      var r = refs[it.ref];
      if (!r) return '';
      var doi = r.doi ? ' DOI: <a href="https://doi.org/' + C.esc(r.doi) +
                        '" target="_blank" rel="noopener">' + C.esc(r.doi) + '</a>.' : '';
      var link = r.url ? ' <a href="' + C.esc(r.url) +
                         '" target="_blank" rel="noopener">Link</a>.' : '';
      return '<li><span class="ref-cite">' + C.esc(r.cite) + '</span>' + doi + link +
             (it.note ? '<div class="ref-note">' + C.esc(it.note) + '</div>' : '') +
             '</li>';
    }).join('') + '</ol>';
  };

  /** Data-provenance badge. Reads the live simulation flags so the site can
   *  never claim data is real when it is not. */
  C.provenance = function (isReal, label) {
    return '<span class="provenance provenance-' + (isReal ? 'real' : 'sim') + '">' +
           (isReal ? '● Real measured data' : '▲ ' + (label || 'Simulated data')) +
           '</span>';
  };

  /* --- Quiz ------------------------------------------------------------ */

  C.quiz = function (questions, storageKey) {
    if (!questions || !questions.length) return '';
    var html = '<div class="quiz" data-quiz="' + C.esc(storageKey || '') + '">';
    questions.forEach(function (q, qi) {
      html += '<div class="quiz-q" data-qi="' + qi + '">' +
        '<p class="quiz-stem"><span class="sr-only">Question ' + (qi + 1) + '. </span>' +
        C.cites(C.esc(q.q)) + '</p>' +
        '<ul class="quiz-opts" role="group" aria-label="Answer options">';
      q.options.forEach(function (opt, oi) {
        html += '<li><button type="button" class="quiz-opt" data-oi="' + oi + '">' +
          '<span class="marker" aria-hidden="true">' +
          String.fromCharCode(65 + oi) + '</span>' +
          '<span>' + C.esc(opt) + '</span></button></li>';
      });
      html += '</ul><div class="quiz-feedback" role="status" aria-live="polite"></div></div>';
    });
    html += '</div>';
    return html;
  };

  C.mountQuizzes = function (rootEl) {
    (rootEl || document).querySelectorAll('[data-quiz]').forEach(function (quiz) {
      var key = quiz.getAttribute('data-quiz');
      var questions = quiz.__questions;
      if (!questions) return;

      quiz.querySelectorAll('.quiz-q').forEach(function (qEl) {
        var qi = +qEl.getAttribute('data-qi');
        var q = questions[qi];
        var fb = qEl.querySelector('.quiz-feedback');

        qEl.querySelectorAll('.quiz-opt').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var oi = +btn.getAttribute('data-oi');
            var right = oi === q.answer;

            qEl.querySelectorAll('.quiz-opt').forEach(function (b) {
              b.disabled = true;
              var bi = +b.getAttribute('data-oi');
              if (bi === q.answer) b.classList.add('is-correct');
              else if (bi === oi) b.classList.add('is-wrong');
            });

            fb.innerHTML = '<div class="quiz-why ' + (right ? 'ok' : 'no') + '">' +
              '<strong>' + (right ? 'Correct. ' : 'Not quite. ') + '</strong>' +
              C.cites(C.esc(q.why)) + '</div>';

            if (key && window.Progress) window.Progress.recordQuiz(key, qi, right);
          });
        });
      });
    });
  };

  /* --- Weekly check-in ------------------------------------------------- */

  C.feedbackForm = function (weekNum) {
    var id = 'wk' + weekNum;
    return '' +
    '<div class="feedback" data-feedback="' + id + '">' +
      '<h3 id="checkin-h">Weekly check-in</h3>' +
      '<p class="small muted">These answers stay in this browser. Nothing is ' +
      'sent anywhere, no account is involved, and no personal information is ' +
      'collected. They exist so that you can look back over the semester and ' +
      'see where you were struggling, and so that you can bring something ' +
      'specific to the next lab.</p>' +

      '<div class="field">' +
        '<span class="control-label" id="conf-label-' + id + '">' +
          'How confident are you with this week\'s topic?</span>' +
        '<div class="confidence-scale" role="group" ' +
             'aria-labelledby="conf-label-' + id + '">' +
          [1,2,3,4,5].map(function (n) {
            return '<button type="button" data-conf="' + n + '" ' +
                   'aria-pressed="false" aria-label="' + n + ' out of 5">' +
                   n + '</button>';
          }).join('') +
        '</div>' +
        '<div class="scale-ends"><span>1 - not at all</span>' +
        '<span>5 - I could teach it</span></div>' +
      '</div>' +

      '<div class="field">' +
        '<label for="diff-' + id + '">What was the most difficult concept?</label>' +
        '<textarea id="diff-' + id + '" data-fb="difficult" ' +
        'placeholder="Name the specific idea, not the whole week."></textarea>' +
      '</div>' +

      '<div class="field">' +
        '<label for="useful-' + id + '">Which biological application was most useful?</label>' +
        '<textarea id="useful-' + id + '" data-fb="useful" ' +
        'placeholder="Which example made the method make sense?"></textarea>' +
      '</div>' +

      '<div class="field">' +
        '<label for="again-' + id + '">What should be explained again?</label>' +
        '<textarea id="again-' + id + '" data-fb="again" ' +
        'placeholder="This is the one that shapes the next lecture."></textarea>' +
      '</div>' +

      '<div class="flex">' +
        '<button type="button" class="btn btn-primary" data-fb-save>Save check-in</button>' +
        '<button type="button" class="btn" data-fb-clear>Clear this week</button>' +
        '<span class="small muted" data-fb-status role="status" aria-live="polite"></span>' +
      '</div>' +

      '<p class="privacy-note">Stored with your browser\'s local storage under ' +
      'the key <code>comp9085.feedback</code>. Clearing your browser data ' +
      'removes it.</p>' +
    '</div>';
  };

  C.mountFeedback = function (rootEl) {
    (rootEl || document).querySelectorAll('[data-feedback]').forEach(function (box) {
      var id = box.getAttribute('data-feedback');
      var store = window.Store;
      var saved = store.get('feedback', {})[id] || {};

      /* Restore */
      if (saved.confidence) {
        var b = box.querySelector('[data-conf="' + saved.confidence + '"]');
        if (b) b.setAttribute('aria-pressed', 'true');
      }
      ['difficult', 'useful', 'again'].forEach(function (f) {
        var t = box.querySelector('[data-fb="' + f + '"]');
        if (t && saved[f]) t.value = saved[f];
      });

      var status = box.querySelector('[data-fb-status]');
      if (saved.saved) {
        status.textContent = 'Saved ' + new Date(saved.saved).toLocaleDateString();
      }

      box.querySelectorAll('[data-conf]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          box.querySelectorAll('[data-conf]').forEach(function (b) {
            b.setAttribute('aria-pressed', 'false');
          });
          btn.setAttribute('aria-pressed', 'true');
        });
      });

      box.querySelector('[data-fb-save]').addEventListener('click', function () {
        var chosen = box.querySelector('[data-conf][aria-pressed="true"]');
        var all = store.get('feedback', {});
        all[id] = {
          confidence: chosen ? +chosen.getAttribute('data-conf') : null,
          difficult: box.querySelector('[data-fb="difficult"]').value.trim(),
          useful: box.querySelector('[data-fb="useful"]').value.trim(),
          again: box.querySelector('[data-fb="again"]').value.trim(),
          saved: Date.now()
        };
        store.set('feedback', all);
        status.textContent = 'Saved to this browser.';
        if (window.Progress) window.Progress.refresh();
      });

      box.querySelector('[data-fb-clear]').addEventListener('click', function () {
        var all = store.get('feedback', {});
        delete all[id];
        store.set('feedback', all);
        box.querySelectorAll('[data-conf]').forEach(function (b) {
          b.setAttribute('aria-pressed', 'false');
        });
        ['difficult', 'useful', 'again'].forEach(function (f) {
          box.querySelector('[data-fb="' + f + '"]').value = '';
        });
        status.textContent = 'Cleared.';
        if (window.Progress) window.Progress.refresh();
      });
    });
  };


  /* --- Video ----------------------------------------------------------- */

  /**
   * A video card. Reads everything from window.SITE_CONFIG.youtube, so a video
   * ID is changed in exactly one place. If the ID is absent the card renders a
   * clearly-marked placeholder with the upload instructions rather than a
   * broken embed, which is the honest failure mode.
   *
   * `nocookie` uses youtube-nocookie.com, which does not set tracking cookies
   * until the viewer presses play. That matters because this site otherwise
   * makes no third-party requests at all.
   */
  C.video = function (key) {
    var v = window.SITE_CONFIG && window.SITE_CONFIG.youtube[key];
    if (!v) return '';

    var head =
      '<div class="video-head">' +
        '<h3>' + C.esc(v.title) + '</h3>' +
        '<div class="video-meta">' +
          '<span>' + C.esc(v.creator) + '</span>' +
          '<span>' + C.esc(v.duration) + '</span>' +
          (v.status === 'confirmed'
            ? '<span class="pill pill-real">source verified</span>'
            : '<span class="pill pill-sim">awaiting upload</span>') +
        '</div>' +
      '</div>';

    var media;
    if (v.id) {
      var src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.id) +
                '?rel=0&modestbranding=1';
      media =
        '<div class="video-frame">' +
          '<iframe src="' + src + '" ' +
            'title="' + C.esc(v.title) + '" ' +
            'loading="lazy" ' +
            'allow="accelerometer; clipboard-write; encrypted-media; ' +
                   'gyroscope; picture-in-picture" ' +
            'referrerpolicy="strict-origin-when-cross-origin" ' +
            'allowfullscreen></iframe>' +
        '</div>';
    } else {
      media =
        '<div class="video-placeholder">' +
          '<h4>This video has not been published yet</h4>' +
          '<p class="small">The embed will appear here automatically once the ' +
          'YouTube ID is set. Nothing else on the site needs editing.</p>' +
          '<p class="small mb0"><strong>To publish it:</strong> upload the video, ' +
          'copy the eleven-character ID from its URL, and set ' +
          '<code>youtube.' + C.esc(key) + '.id</code> in ' +
          '<code>js/config.js</code>. See ' +
          '<code>docs/VIDEO_SOURCES.md</code> for the suggested title, ' +
          'description and visibility setting.</p>' +
        '</div>';
    }

    var body =
      '<div class="video-body">' +
        '<p class="video-purpose"><strong>Why you are watching this. </strong>' +
          C.esc(v.purpose) + '</p>' +
        (v.question
          ? '<div class="video-question"><strong>Think about. </strong>' +
            C.esc(v.question) + '</div>'
          : '') +
        (v.id
          ? '<div class="video-actions">' +
              '<a class="btn btn-sm" href="https://www.youtube.com/watch?v=' +
                encodeURIComponent(v.id) + '" target="_blank" rel="noopener">' +
                'Watch on YouTube</a>' +
              '<span class="small muted">Captions are available on YouTube via ' +
              'the CC button.</span>' +
            '</div>'
          : '') +
      '</div>';

    return '<div class="video-card">' + head + media + body + '</div>';
  };

  /* Lecture slides are distributed through Canvas only and are never
     committed to this public repository or linked from this public site -
     see README.md, "Lecture slides". C.slideDownloads() used to render a
     PPTX/PDF download block here; it has been removed. */

  /* --- External link, honest about placeholders ------------------------- */

  C.extLink = function (key) {
    var cfg = window.SITE_CONFIG;
    if (!cfg) return '';
    var l = cfg.links[key];
    if (!l) return '';
    if (l.status === 'confirmed' && l.url) {
      return '<a href="' + C.esc(l.url) + '" target="_blank" rel="noopener">' +
             C.esc(l.label) + '</a>';
    }
    return '<span class="link-placeholder" title="' +
           C.esc(l.note || 'URL not yet configured') + '">' +
           C.esc(l.label) + ' (link to be added)</span>';
  };

  /* --- Visualisation container ----------------------------------------- */

  /**
   * Standard chrome for every interactive. `spec` supplies:
   *   id, title, intro, controls (HTML), readout (HTML), explain (HTML),
   *   altLabel (text for the accessible-alternative disclosure)
   */
  C.vizShell = function (spec) {
    return '' +
    '<section class="viz" id="' + C.esc(spec.id) + '" ' +
             'aria-labelledby="' + C.esc(spec.id) + '-h">' +
      '<div class="viz-head">' +
        '<h3 id="' + C.esc(spec.id) + '-h">' + C.esc(spec.title) + '</h3>' +
        (spec.intro ? '<p>' + C.cites(C.esc(spec.intro)) + '</p>' : '') +
      '</div>' +
      (spec.banner || '') +
      '<div class="viz-controls">' + (spec.controls || '') +
        '<div class="spacer"></div>' +
        '<button type="button" class="btn btn-sm" data-viz-reset>Reset</button>' +
      '</div>' +
      '<div class="viz-body"><div class="viz-stage" data-viz-stage></div></div>' +
      (spec.readout ? '<div class="viz-readout" data-viz-readout>' +
                      spec.readout + '</div>' : '') +
      '<div class="viz-explain" data-viz-explain>' + (spec.explain || '') +
        '<div data-viz-note></div></div>' +
      '<details class="viz-alt">' +
        '<summary>' + C.esc(spec.altLabel || 'Read this chart as text') + '</summary>' +
        '<div class="alt-body" data-viz-alt>' +
          '<p class="muted">Loading...</p>' +
        '</div>' +
      '</details>' +
    '</section>';
  };

  /** Slider control. */
  C.slider = function (o) {
    return '<div class="control">' +
      '<label for="' + o.id + '">' + C.esc(o.label) +
        ' <span class="val" id="' + o.id + '-val">' +
        C.esc(o.value) + '</span></label>' +
      '<input type="range" id="' + o.id + '" min="' + o.min + '" max="' + o.max +
      '" step="' + (o.step || 1) + '" value="' + o.value + '"' +
      (o.describedby ? ' aria-describedby="' + o.describedby + '"' : '') + '>' +
    '</div>';
  };

  /** Select control. */
  C.select = function (o) {
    return '<div class="control">' +
      '<label for="' + o.id + '">' + C.esc(o.label) + '</label>' +
      '<select id="' + o.id + '">' + o.options.map(function (op) {
        return '<option value="' + C.esc(op.value) + '"' +
               (op.value === o.value ? ' selected' : '') + '>' +
               C.esc(op.label) + '</option>';
      }).join('') + '</select></div>';
  };

  /** Segmented button group. */
  C.segmented = function (o) {
    return '<div class="control">' +
      '<span class="control-label" id="' + o.id + '-label">' +
        C.esc(o.label) + '</span>' +
      '<div class="seg" role="group" aria-labelledby="' + o.id + '-label" ' +
           'id="' + o.id + '">' +
        o.options.map(function (op) {
          return '<button type="button" data-value="' + C.esc(op.value) + '" ' +
                 'aria-pressed="' + (op.value === o.value) + '">' +
                 C.esc(op.label) + '</button>';
        }).join('') +
      '</div></div>';
  };

  /** Checkbox control. */
  C.checkbox = function (o) {
    return '<div class="control control-inline">' +
      '<input type="checkbox" id="' + o.id + '"' + (o.checked ? ' checked' : '') + '>' +
      '<label for="' + o.id + '">' + C.esc(o.label) + '</label></div>';
  };

  /** Metric readout tile. */
  C.metric = function (id, label, value, note) {
    return '<div class="metric" id="' + id + '">' +
      '<div class="m-label">' + C.esc(label) + '</div>' +
      '<div class="m-value" data-m-value>' + C.esc(value) + '</div>' +
      (note ? '<div class="m-note" data-m-note>' + C.esc(note) + '</div>' : '') +
    '</div>';
  };

  /** Wire up a segmented group; calls back with the chosen value. */
  C.onSegment = function (el, cb) {
    if (!el) return;
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-value]');
      if (!btn) return;
      el.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      cb(btn.getAttribute('data-value'));
    });
  };

  C.segValue = function (el) {
    var b = el && el.querySelector('button[aria-pressed="true"]');
    return b ? b.getAttribute('data-value') : null;
  };

  C.setMetric = function (id, value, note, tone) {
    var el = document.getElementById(id);
    if (!el) return;
    el.querySelector('[data-m-value]').textContent = value;
    var n = el.querySelector('[data-m-note]');
    if (n && note != null) n.textContent = note;
    el.classList.remove('is-good', 'is-bad');
    if (tone) el.classList.add(tone === 'good' ? 'is-good' : 'is-bad');
  };

  /* --- Tooltip --------------------------------------------------------- */
  var tip;
  C.tip = function (html, x, y) {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'viz-tip';
      tip.setAttribute('role', 'status');
      document.body.appendChild(tip);
    }
    if (html == null) { tip.classList.remove('on'); return; }
    tip.innerHTML = html;
    tip.classList.add('on');
    var r = tip.getBoundingClientRect();
    var left = Math.min(Math.max(8, x + 14), window.innerWidth - r.width - 8);
    var top = y - r.height - 12;
    if (top < 8) top = y + 18;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  };

  /* --- Table builder for text alternatives ----------------------------- */
  C.altTable = function (caption, headers, rows) {
    return '<table class="table-compact"><caption>' + C.esc(caption) + '</caption>' +
      '<thead><tr>' + headers.map(function (h) {
        return '<th scope="col">' + C.esc(h) + '</th>';
      }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) {
          return i === 0 ? '<th scope="row">' + C.esc(c) + '</th>'
                         : '<td class="num">' + C.esc(c) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  };
})();
