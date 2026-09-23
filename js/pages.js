/* COMP9085 - renderers for the non-week pages.
 *
 * Each page shell calls one of these. Content still comes from the data files,
 * so nothing here needs editing when the curriculum changes.
 */
(function () {
  'use strict';

  var U = window.UI;
  var C = window.COURSE;

  function url(p) { return window.siteUrl(p); }

  /* ==================================================================== */
  /* Home                                                                 */
  /* ==================================================================== */

  window.renderHome = function () {
    var el = document.getElementById('main');

    var journey = C.journey.map(function (j, i) {
      return '<div class="card" style="border-top:3px solid var(--' + j.colour + ')">' +
        '<span class="week-num">Stage ' + (i + 1) + '</span>' +
        '<h3 style="margin-top:0;font-size:1.02rem">' + U.esc(j.stage) + '</h3>' +
        '<p style="font-style:italic;color:var(--ink-2);font-size:0.92rem">' +
          '&ldquo;' + U.esc(j.question) + '&rdquo;</p>' +
        '<p class="small muted">' + U.esc(j.body) + '</p>' +
        '<p class="tiny mb0"><strong>Weeks ' + j.weeks.join(', ') + '</strong></p>' +
        '</div>';
    }).join('');

    el.innerHTML =
      '<div class="page-hero"><div class="wrap">' +
        '<span class="eyebrow">' + U.esc(C.code) + ' &middot; ' +
          U.esc(C.credits) + ' credits &middot; ' + U.esc(C.level) + '</span>' +
        '<h1>' + U.esc(C.title) + '</h1>' +
        '<p class="lede">' + U.esc(C.description) + '</p>' +
        '<div class="callout callout-key" style="max-width:60ch;margin-top:var(--s5)">' +
          '<div class="callout-title">The argument of the module</div>' +
          '<p class="mb0" style="font-size:1.02rem;font-weight:560">' +
            U.esc(C.strapline) + '</p>' +
        '</div>' +
        '<div class="flex" style="margin-top:var(--s5)">' +
          '<a class="btn btn-primary" href="' + url('roadmap.html') + '">' +
            'See the twelve-week roadmap</a>' +
          '<a class="btn" href="' + url('weeks/week01.html') + '">Start at Week 1</a>' +
        '</div>' +
      '</div></div>' +

      '<div class="wrap">' +

      /* Learning journey */
      '<section id="journey"><h2>The learning journey</h2>' +
        '<p class="lede">Five stages, in order. Each one answers a question the ' +
        'previous one raises.</p>' +
        '<div class="grid grid-3">' + journey + '</div>' +
      '</section>' +

      /* The persistent comparison */
      '<section id="comparison"><h2>The comparison the module keeps returning to</h2>' +
        '<p>These two pipelines are the spine of the course. You will meet this ' +
        'diagram again in Weeks 7, 10 and 11, each time with more of it under ' +
        'your control.</p>' +
        window.vizBlock('pipelines') +
      '</section>' +

      /* Central question */
      '<section id="question">' +
        U.callout('sci', 'The question this module trains you to ask',
          '<p style="font-size:1.06rem;font-weight:560;margin-bottom:var(--s4)">' +
          U.esc(C.centralQuestion) + '</p>' +
          '<p class="mb0">It has two halves and the second one is the hard part. ' +
          'Choosing a method is a matter of reading; producing evidence that the ' +
          'choice was appropriate is the actual work, and it is what separates a ' +
          'result from a number.</p>') +
      '</section>' +

      /* Learning outcomes */
      '<section id="outcomes"><h2>Module learning outcomes</h2>' +
        '<p>These are the approved outcomes from the COMP9085 module descriptor, ' +
        'retained unchanged in this redesign. Every week states which it serves.</p>' +
        '<div class="grid grid-2">' + C.learningOutcomes.map(function (lo) {
          return '<div class="card"><span class="pill pill-lo">' + lo.id +
            '</span><p style="margin-top:var(--s3)" class="mb0">' +
            U.esc(lo.text) + '</p></div>';
        }).join('') + '</div>' +
      '</section>' +

      /* Course overview */
      '<section id="overview"><h2>The twelve weeks</h2>' +
        '<div class="grid grid-3">' + C.weeks.map(function (w) {
          return U.weekCard(w, url('weeks/'));
        }).join('') + '</div>' +
      '</section>' +

      /* Progress */
      '<section id="progress"><h2>Your progress</h2>' +
        '<p class="small muted">Recorded in this browser only. Nothing is sent ' +
        'anywhere and no account is involved.</p>' +
        '<div class="grid grid-3">' +
          '<div class="card">' + window.progressWidget('weeks', 'Weeks opened') + '</div>' +
          '<div class="card">' + window.progressWidget('checkins', 'Check-ins saved') + '</div>' +
          '<div class="card">' + window.progressWidget('quiz', 'Self-check questions') + '</div>' +
        '</div>' +
      '</section>' +

      '</div>';

    window.Progress.refresh();
    if (window.Chart) window.Chart.mountAll();
  };


  /* ==================================================================== */
  /* Start here - the student entry point                                 */
  /* ==================================================================== */

  window.renderStartHere = function () {
    var cfg = window.SITE_CONFIG;
    var w1 = C.weeks[0];

    var steps = [
      { n: 1, t: 'Read this page', b: 'Five minutes. It tells you what the module is, how it is assessed, and where everything lives.' },
      { n: 2, t: 'Open Week 1', b: 'Week 1 is orientation and has no practical. Watch the two short videos, try the interactive activity, and read the one recommended paper.', href: url('weeks/week01.html'), cta: 'Go to Week 1' },
      { n: 3, t: 'Install Python before Week 2', b: 'So that the first lab starts with the material rather than with an installation problem. Setup commands are on Canvas, in the module resources.' },
      { n: 4, t: 'Skim the roadmap', b: 'See where the twelve weeks are going and why they are in that order. Useful again in week six when the shape of the module matters.', href: url('roadmap.html'), cta: 'Course roadmap' },
      { n: 5, t: 'Read the assessment brief early', b: 'Both projects are described in full on Canvas now, not released later. Reading Project 2 in Week 1 changes what you notice in Weeks 7 and 9.' }
    ];

    document.getElementById('main').innerHTML =
      '<div class="page-hero"><div class="wrap">' +
        '<span class="eyebrow">Start here</span>' +
        '<h1>Welcome to COMP9085</h1>' +
        '<p class="lede">' + U.esc(C.title) + '. An MSc module in the ' +
        'Department of Computer Science at Munster Technological University. ' +
        'Five credits, NFQ Level 9, assessed entirely by coursework.</p>' +
        '<div class="callout callout-key" style="max-width:60ch;margin-top:var(--s5)">' +
          '<div class="callout-title">What this module argues</div>' +
          '<p class="mb0" style="font-size:1.02rem;font-weight:560">' +
            U.esc(C.strapline) + '</p></div>' +
      '</div></div>' +

      '<div class="wrap">' +

      '<section id="first"><h2>What to do first</h2>' +
        '<div class="grid" style="gap:var(--s4)">' +
          steps.map(function (s2) {
            return '<div class="card" style="display:grid;' +
              'grid-template-columns:2.2rem 1fr;gap:var(--s4);align-items:start">' +
              '<span style="width:2rem;height:2rem;display:grid;place-items:center;' +
              'border-radius:50%;background:var(--clinical-soft);color:var(--clinical);' +
              'font-weight:700;font-family:var(--mono);font-size:.85rem">' + s2.n +
              '</span><span><h3 style="margin:0 0 var(--s2);font-size:1rem">' +
              U.esc(s2.t) + '</h3><p class="small" style="margin-bottom:' +
              (s2.href ? 'var(--s3)' : '0') + '">' + U.esc(s2.b) + '</p>' +
              (s2.href ? '<a class="btn btn-sm" href="' + s2.href + '">' +
                U.esc(s2.cta) + '</a>' : '') + '</span></div>';
          }).join('') +
        '</div>' +
      '</section>' +

      '<section id="week1"><h2>Week 1 has no laboratory</h2>' +
        '<div class="no-lab-notice">' +
          '<h3>The first practical is in Week 2</h3>' +
          '<p>Week 1 is an introductory lecture. There is no lab, no ' +
          'programming assignment and nothing assessed. The labs run weekly ' +
          'from Week 2 to Week 12, each one two hours with scikit-learn.</p>' +
          '<p class="mb0">Use the week to get set up and to watch the two ' +
          'videos on the Week 1 page.</p>' +
        '</div>' +
      '</section>' +

      '<section id="structure"><h2>How the pieces fit together</h2>' +
        '<div class="grid grid-2">' +
          card('The lecture', 'Two hours a week. Slides are published as ' +
            'PowerPoint and PDF on Canvas before each lecture.') +
          card('This website', 'The concepts, worked examples and interactive ' +
            'figures. The figures are live models fitted in your browser, not ' +
            'pictures: moving a control refits the model on real data.') +
          card('The practical', 'Two hours a week from Week 2. Each lab ends ' +
            'with an interpretation task rather than a working-code task, ' +
            'because the interpretation is the part being taught.') +
          card('Canvas', 'Announcements, submission and grades. The teaching ' +
            'material is here and linked from Canvas, so there is one copy ' +
            'rather than two that drift apart.') +
          card('The weekly check-in', 'A short form at the bottom of every ' +
            'week page. It stays in your browser; nobody else can see it. It ' +
            'is there so you can watch your own confidence change, and so you ' +
            'arrive at the lab with a specific question.') +
          card('Independent study', 'About three hours a week. One reading is ' +
            'recommended per week, and the recommendation is genuinely the ' +
            'most useful thing to read rather than a list to work through.') +
        '</div>' +
      '</section>' +

      '<section id="weekshape"><h2>What every week looks like</h2>' +
        '<p>The same twelve-part shape each week, so you always know where to ' +
        'find something. Week 1 omits the practical.</p>' +
        '<div class="table-scroll"><table class="table-compact">' +
        '<caption>The weekly structure and what each part is for.</caption>' +
        '<thead><tr><th scope="col">Section</th><th scope="col">What it is for</th>' +
        '</tr></thead><tbody>' +
        [['Learning objectives', 'What you should be able to do afterwards. Written as actions, not topics.'],
         ['Biological context', 'The problem before the method. Why anyone cares.'],
         ['Key concepts', 'The definitions, stated precisely enough to be examinable.'],
         ['Interactive exploration', 'A live model you manipulate. This is where the understanding happens.'],
         ['Worked example', 'The arithmetic done in full, usually on the real dataset.'],
         ['Practical lab', 'Two hours of scikit-learn. From Week 2.'],
         ['Dataset', 'What the data is, where it came from, and its limitations.'],
         ['Foundation-model connection', 'Where modern pretrained models fit, including the weeks where the answer is that they do not.'],
         ['Think like a scientist', 'One question with no clean answer. Bring it to the lab.'],
         ['Quick self-check', 'Three or four questions. The explanations matter more than the score.'],
         ['Weekly check-in', 'Your own record of confidence. Private to your browser.'],
         ['Further reading', 'One or two sources, with a note on why each is worth your time.']
        ].map(function (r) {
          return '<tr><th scope="row">' + U.esc(r[0]) + '</th><td>' +
                 U.esc(r[1]) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
      '</section>' +

      '<section id="assessment-summary"><h2>Assessment</h2>' +
        '<p class="lede">Assessment, lecture materials and module resources ' +
        'are available on Canvas.</p>' +
      '</section>' +

      '<section id="jump"><h2>Everything, in one place</h2>' +
        '<div class="grid grid-3">' +
          linkCard('The twelve weeks', 'Lectures, concepts and interactives.', url('weeks/index.html')) +
          linkCard('Practical labs', 'All eleven labs, Weeks 2 to 12.', url('labs/index.html')) +
          linkCard('Datasets', 'Sources, licences and limitations.', url('datasets.html')) +
          linkCard('Foundation models', 'What they are and where they stop.', url('foundation-models.html')) +
        '</div>' +
      '</section>' +

      '<section id="help"><h2>If you are stuck</h2>' +
        '<p>Ask in the lab, or email <a href="mailto:' +
        U.esc(cfg.module.email) + '">' + U.esc(cfg.module.email) + '</a>. The ' +
        '"what should be explained again" box in the weekly check-in is the ' +
        'fastest route to getting something revisited in the next lecture, and ' +
        'it is worth using.</p>' +
      '</section>' +

      '</div>';

    function card(t, b) {
      return '<div class="card"><h3 style="margin-top:0;font-size:1rem">' +
        U.esc(t) + '</h3><p class="small mb0">' + U.esc(b) + '</p></div>';
    }
    function linkCard(t, b, href) {
      return '<a class="card" href="' + href + '"><h3 style="margin-top:0;' +
        'font-size:1rem">' + U.esc(t) + '</h3><p class="small mb0 muted">' +
        U.esc(b) + '</p></a>';
    }
  };

  /* ==================================================================== */
  /* Canvas - a low-chrome index designed to sit inside a Canvas page     */
  /* ==================================================================== */

  window.renderCanvas = function () {
    var rows = C.weeks.map(function (w) {
      var lab = w.lab ? window.LABS[w.lab] : null;
      var nn = U.pad(w.n);
      return '<tr>' +
        '<th scope="row" style="white-space:nowrap">Week ' + nn + '</th>' +
        '<td><a href="' + url('weeks/week' + nn + '.html') + '" target="_top">' +
          U.esc(w.title) + '</a>' +
          '<div class="tiny muted">' + U.esc(w.short) + '</div></td>' +
        '<td class="small muted" style="white-space:nowrap">On Canvas</td>' +
        '<td>' + (lab
          ? '<a href="' + url('labs/index.html') + '#' + w.lab +
            '" target="_top">' + U.esc(lab.title) + '</a>'
          : '<span class="muted">No lab (lecture only)</span>') + '</td>' +
        '</tr>';
    }).join('');

    document.getElementById('main').innerHTML =
      '<div class="wrap" style="padding-top:var(--s6)">' +
        '<h1 style="font-size:1.6rem">COMP9085 course materials</h1>' +
        '<p class="lede">Everything for the module, in one table. This page is ' +
        'designed to be embedded in Canvas; links open in the full window.</p>' +

        '<div class="table-scroll" style="margin-top:var(--s6)"><table>' +
          '<caption>The twelve teaching weeks. Week 1 is a lecture only and ' +
          'has no practical. Lecture slides are posted on Canvas, not this ' +
          'site.</caption>' +
          '<thead><tr><th scope="col">Week</th><th scope="col">Lecture</th>' +
          '<th scope="col">Slides</th><th scope="col">Lab</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div>' +

        '<h2>Other pages</h2>' +
        '<div class="grid grid-3">' +
          [['Start here', 'start-here.html'], ['Course roadmap', 'roadmap.html'],
           ['All labs', 'labs/index.html'], ['Datasets', 'datasets.html'],
           ['Foundation models', 'foundation-models.html']]
          .map(function (p) {
            return '<a class="card" href="' + url(p[1]) + '" target="_top">' +
              '<strong>' + U.esc(p[0]) + '</strong></a>';
          }).join('') +
        '</div>' +

        '<p class="small muted" style="margin-top:var(--s7)">This page makes no ' +
        'third-party requests, sets no cookies and requires no login. It works ' +
        'inside a Canvas iframe, as a standalone page, and on GitHub Pages.</p>' +
      '</div>';
  };

  /* ==================================================================== */
  /* Roadmap                                                              */
  /* ==================================================================== */

  window.renderRoadmap = function () {
    var el = document.getElementById('main');

    var rows = C.weeks.map(function (w) {
      var lab = w.lab ? window.LABS[w.lab] : null;
      var viz = w.viz ? window.vizTitle(w.viz) : '';
      var fmModels = (w.fm.models || []).map(function (m) {
        var r = window.REFERENCES[m];
        return r ? r.tag : '';
      }).filter(Boolean).join(', ');

      return '<tr>' +
        '<th scope="row"><a href="' + url('weeks/week' + U.pad(w.n) + '.html') +
          '"><strong>' + w.n + '</strong><br>' + U.esc(w.title) + '</a></th>' +
        '<td>' + U.esc(w.short) + '</td>' +
        '<td>' + U.esc(w.concepts[0].term) +
          (w.concepts[1] ? ', ' + U.esc(w.concepts[1].term) : '') + '</td>' +
        '<td>' + (fmModels || '<span class="muted">deliberately none</span>') + '</td>' +
        '<td>' + U.esc(viz) + '</td>' +
        '<td>' + (lab ? U.esc(lab.title) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + U.loPills(w.los) + '</td>' +
        '</tr>';
    }).join('');

    var timeline = C.weeks.map(function (w) {
      var lab = w.lab ? window.LABS[w.lab] : null;
      return '<article class="card" id="w' + w.n + '" ' +
        'style="border-left:4px solid ' + U.strandColour(w.strand) + '">' +
        '<div class="pill-row">' +
          '<span class="pill" style="background:' + U.strandColour(w.strand) +
            ';color:#fff">Week ' + w.n + '</span>' +
          '<span class="pill">' + U.esc(U.strandLabel(w.strand)) + '</span>' +
          U.loPills(w.los) +
          '<span data-week-tick="' + w.n + '" class="sr-only"></span>' +
        '</div>' +
        '<h3 style="margin-top:0"><a href="' +
          url('weeks/week' + U.pad(w.n) + '.html') + '">' + U.esc(w.title) +
          '</a></h3>' +
        '<p>' + U.esc(w.short) + '</p>' +
        '<div class="grid grid-2" style="gap:var(--s4)">' +
          '<div><h4 style="margin-top:0;font-size:0.82rem;text-transform:uppercase;' +
            'letter-spacing:0.05em;color:var(--ink-3)">Biological application</h4>' +
            '<p class="small mb0">' + U.esc(w.biology.split('. ')[0]) + '.</p></div>' +
          '<div><h4 style="margin-top:0;font-size:0.82rem;text-transform:uppercase;' +
            'letter-spacing:0.05em;color:var(--ink-3)">Foundation-model connection</h4>' +
            '<p class="small mb0">' + U.esc(w.fm.title) + '</p></div>' +
          '<div><h4 style="margin-top:0;font-size:0.82rem;text-transform:uppercase;' +
            'letter-spacing:0.05em;color:var(--ink-3)">Interactive</h4>' +
            '<p class="small mb0">' + U.esc(window.vizTitle(w.viz)) +
            (w.viz2 ? ' and ' + U.esc(window.vizTitle(w.viz2)) : '') + '</p></div>' +
          '<div><h4 style="margin-top:0;font-size:0.82rem;text-transform:uppercase;' +
            'letter-spacing:0.05em;color:var(--ink-3)">Lab</h4>' +
            '<p class="small mb0">' + (lab ? U.esc(lab.title) :
              'No separate lab; see the assessment brief.') + '</p></div>' +
        '</div>' +
        '</article>';
    }).join('');

    el.innerHTML =
      '<div class="page-hero"><div class="wrap">' +
        '<span class="eyebrow">Course roadmap</span>' +
        '<h1>Twelve weeks, five stages</h1>' +
        '<p class="lede">The progression is deliberate. Classical methods first, ' +
        'because foundation models are built on them; representation in the ' +
        'middle, because that is where the two meet; and evaluation last, ' +
        'because it is the part that decides whether any of it mattered.</p>' +
      '</div></div>' +

      '<div class="wrap">' +

      '<section><h2>At a glance</h2>' +
        '<div class="table-scroll"><table>' +
          '<caption>The full redesigned curriculum. Every row links to the ' +
          'week page.</caption>' +
          '<thead><tr><th scope="col">Week and lecture</th>' +
          '<th scope="col">Focus</th><th scope="col">Classical ML</th>' +
          '<th scope="col">Foundation model</th><th scope="col">Interactive</th>' +
          '<th scope="col">Lab</th><th scope="col">Outcomes</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table></div>' +
      '</section>' +

      '<section><h2>The five stages</h2><div class="grid grid-3">' +
        C.journey.map(function (j) {
          return '<div class="card" style="border-top:3px solid var(--' + j.colour + ')">' +
            '<h3 style="margin-top:0;font-size:1rem">' + U.esc(j.stage) + '</h3>' +
            '<p style="font-style:italic;font-size:0.92rem">&ldquo;' +
              U.esc(j.question) + '&rdquo;</p>' +
            '<p class="small muted mb0">Weeks ' + j.weeks.map(function (n) {
              return '<a href="#w' + n + '">' + n + '</a>';
            }).join(', ') + '</p></div>';
        }).join('') + '</div></section>' +

      '<section><h2>Week by week</h2>' +
        '<div class="grid" style="gap:var(--s5)">' + timeline + '</div>' +
      '</section>' +

      '</div>';

    window.Progress.refresh();
  };

  window.vizTitle = function (id) {
    var t = {
      'problem-classifier': 'ML problem classifier',
      'decision-tree': 'Decision tree builder',
      'entropy': 'Entropy visualiser',
      'leakage': 'Train/test leakage simulator',
      'bayes': 'Medical Bayes calculator',
      'naive-bayes': 'Naive Bayes word probability explorer',
      'data-quality': 'Nutrition data quality explorer',
      'pca': 'PCA visualiser',
      'embeddings': 'Foundation model embedding explorer',
      'knn': 'k-NN biological similarity explorer',
      'clustering': 'k-means and DBSCAN simulator',
      'random-forest': 'Random forest visualiser',
      'leaderboard': 'Classical vs foundation model leaderboard',
      'fine-tuning': 'Fine-tuning simulator',
      'fm-decision': 'Should I use a foundation model?',
      'trust': 'Would you trust this model?',
      'pipelines': 'Classical vs foundation pipelines'
    };
    return t[id] || id;
  };

  /* ==================================================================== */
  /* Weeks index                                                          */
  /* ==================================================================== */

  window.renderWeeksIndex = function () {
    document.getElementById('main').innerHTML =
      '<div class="page-hero"><div class="wrap">' +
        '<span class="eyebrow">All weeks</span>' +
        '<h1>The twelve teaching weeks</h1>' +
        '<p class="lede">Each week follows the same shape: concept, biological ' +
        'example, interactive exploration, Python lab, scientific ' +
        'interpretation, reflection.</p>' +
      '</div></div>' +
      '<div class="wrap"><section>' +
        '<div class="grid grid-3">' + C.weeks.map(function (w) {
          return U.weekCard(w, '');
        }).join('') + '</div>' +
      '</section>' +
      '<section><h2>Your progress</h2><div class="grid grid-3">' +
        '<div class="card">' + window.progressWidget('weeks', 'Weeks opened') + '</div>' +
        '<div class="card">' + window.progressWidget('checkins', 'Check-ins saved') + '</div>' +
        '<div class="card">' + window.progressWidget('quiz', 'Self-check questions') + '</div>' +
      '</div></section></div>';
    window.Progress.refresh();
  };

  /* ==================================================================== */
  /* Labs                                                                 */
  /* ==================================================================== */

  window.renderLabs = function () {
    var labs = Object.keys(window.LABS).map(function (k) {
      return Object.assign({ id: k }, window.LABS[k]);
    }).sort(function (a, b) { return a.week - b.week; });

    document.getElementById('main').innerHTML =
      '<div class="page-hero"><div class="wrap">' +
        '<span class="eyebrow">Practical labs</span>' +
        '<h1>Eleven supervised sessions, Weeks 2 to 12</h1>' +
        '<p class="lede">Each lab is two hours with scikit-learn, and each one ' +
        'ends with an interpretation task rather than a working-code task. ' +
        'Getting the code to run is the easy half.</p>' +
      '</div></div>' +
      '<div class="wrap">' +
        '<div class="no-lab-notice" style="margin-bottom:var(--s6)">' +
          '<h3>There is no laboratory in Week 1</h3>' +
          '<p class="mb0">Week 1 is an introductory lecture: no lab, no ' +
          'programming assignment, nothing assessed. The first practical is ' +
          'the Week 2 session below. Use Week 1 to install Python, watch the ' +
          'two videos and do the one recommended reading. ' +
          '<a href="' + url('weeks/week01.html') + '">Open Week 1</a>.</p>' +
        '</div>' +
        U.callout('key', 'How these are marked',
          '<p class="mb0">The labs are not directly assessed. They exist to ' +
          'build the habits the two projects are marked on: establishing a ' +
          'baseline before believing a result, keeping every fitted step inside ' +
          'the fold, and writing down what you would need to see before ' +
          'believing your own number. Bring the deliverable to the next ' +
          'session.</p>') +
        '<section>' + labs.map(function (l) {
          return '<article class="card" id="' + l.id + '" style="margin-bottom:var(--s5)">' +
            '<div class="pill-row">' +
              '<span class="pill">Week ' + l.week + '</span>' +
              '<span class="pill">' + U.esc(l.duration) + '</span>' +
              U.loPills(l.los) +
            '</div>' +
            '<h3 style="margin-top:0">' + U.esc(l.title) + '</h3>' +
            '<p class="lede" style="font-size:1rem">' + U.esc(l.goal) + '</p>' +
            '<h4>Tasks</h4><ol>' + l.tasks.map(function (t) {
              return '<li>' + U.esc(t) + '</li>';
            }).join('') + '</ol>' +
            (l.starter ? '<h4>Starter code</h4><pre>' + U.esc(l.starter) + '</pre>' : '') +
            '<p><strong>Deliverable. </strong>' + U.esc(l.deliverable) + '</p>' +
            (l.note ? '<p class="small muted">' + U.esc(l.note) + '</p>' : '') +
            '<a class="btn btn-sm" href="' +
              url('weeks/week' + U.pad(l.week) + '.html#lab') +
              '">Open Week ' + l.week + '</a>' +
            '</article>';
        }).join('') + '</section>' +
        '<section><h2>Setting up</h2>' +
          '<p>Everything in these labs runs with a standard scientific Python ' +
          'stack. Nothing needs a GPU.</p>' +
          '<pre>python3 -m venv comp9085\n' +
          'source comp9085/bin/activate      # Windows: comp9085\\Scripts\\activate\n' +
          'pip install numpy pandas scikit-learn matplotlib seaborn jupyter\n' +
          'pip install imbalanced-learn requests    # Weeks 5 and 6\n\n' +
          'jupyter notebook</pre>' +
          '<p class="small muted">Week 11 optionally uses <code>torch</code>, ' +
          '<code>transformers</code> and <code>peft</code> if you want to run a ' +
          'real parameter-efficient fine-tune rather than only cost one out. ' +
          'That part is not required to complete the lab.</p>' +
        '</section>' +
      '</div>';
  };

  /* ==================================================================== */
  /* Datasets                                                             */
  /* ==================================================================== */

  window.renderDatasets = function () {
    var cards = window.DATASETS.map(function (d) {
      var ref = d.sourceRef ? window.REFERENCES[d.sourceRef] : null;
      return '<article class="card" id="' + d.id + '" style="margin-bottom:var(--s5)">' +
        '<div class="pill-row">' +
          (d.simulated
            ? '<span class="provenance provenance-sim">▲ Simulated / illustrative</span>'
            : '<span class="provenance provenance-real">● Real data</span>') +
          '<span class="pill pill-bio">' + U.esc(d.domain) + '</span>' +
          '<span class="pill">' + U.esc(d.modality) + '</span>' +
          (d.inSite ? '<span class="pill pill-real">used live on this site</span>' : '') +
          (d.weeks || []).map(function (w) {
            return '<a class="pill" href="' + url('weeks/week' + U.pad(w) + '.html') +
              '">Week ' + w + '</a>';
          }).join('') +
        '</div>' +
        '<h3 style="margin-top:0">' + U.esc(d.name) + '</h3>' +
        (d.aka ? '<p class="small muted">' + U.esc(d.aka) + '</p>' : '') +
        (d.warning
          ? U.callout('warn', 'Read this before using it', '<p class="mb0">' +
            U.esc(d.warning) + '</p>')
          : '') +
        '<p>' + U.esc(d.biology) + '</p>' +
        '<dl class="dl-grid">' +
          '<dt>Source</dt><dd>' + U.esc(d.source) + '</dd>' +
          '<dt>Samples</dt><dd>' + U.esc(d.samples) + '</dd>' +
          '<dt>Features</dt><dd>' + U.esc(d.features) + '</dd>' +
          '<dt>Target</dt><dd>' + U.esc(d.target) + '</dd>' +
          '<dt>Licence</dt><dd>' + U.esc(d.licence) + '</dd>' +
          '<dt>Access</dt><dd>' + U.esc(d.access) + '</dd>' +
          (d.url ? '<dt>Link</dt><dd><a href="' + U.esc(d.url) +
            '" target="_blank" rel="noopener">' + U.esc(d.url) + '</a></dd>' : '') +
        '</dl>' +
        '<h4>Limitations</h4><ul>' + d.limitations.map(function (l) {
          return '<li>' + U.esc(l) + '</li>';
        }).join('') + '</ul>' +
        (d.note ? '<p class="small"><strong>Note. </strong>' + U.esc(d.note) +
          '</p>' : '') +
        '<p class="small muted mb0"><strong>Cite as. </strong>' +
          U.esc(d.citation) + '</p>' +
        '</article>';
    }).join('');

    document.getElementById('main').innerHTML =
      '<div class="page-hero"><div class="wrap">' +
        '<span class="eyebrow">Dataset catalogue</span>' +
        '<h1>Where the data comes from</h1>' +
        '<p class="lede">Every dataset used in this module, with its licence, ' +
        'its provenance and, at least as importantly, its limitations. Two ' +
        'entries are simulated and are marked as such wherever they appear.</p>' +
      '</div></div>' +
      '<div class="wrap">' +
        U.callout('key', 'How to read the provenance labels',
          '<p><strong>● Real data</strong> means measured data from the cited ' +
          'source, used unmodified. Where this site computes something from it, ' +
          'the computation runs live in your browser or is produced by a script ' +
          'in <code>data/scripts/</code> that you can run yourself.</p>' +
          '<p class="mb0"><strong>▲ Simulated</strong> means generated for ' +
          'teaching. Nothing biological should be concluded from it, and the ' +
          'generating script is shipped so you can see exactly how it was made. ' +
          'These labels appear on every figure that uses the data, not only ' +
          'here.</p>') +
        '<section>' + cards + '</section>' +
        '<section><h2>Choosing a dataset for your project</h2>' +
          '<p>Project 2 asks you to choose your own. A dataset is suitable if ' +
          'you can answer all of the following before you start modelling.</p>' +
          '<ol>' +
            '<li>What exactly was measured, by what instrument, and with what ' +
            'error? If you cannot describe the measurement process, you cannot ' +
            'interpret the model.</li>' +
            '<li>What is the target, and is it a measurement or an ' +
            'administrative decision? Predicting a clinical diagnosis and ' +
            'predicting a billing code are different tasks.</li>' +
            '<li>Are the rows independent? If several rows come from one ' +
            'patient, one experiment or one site, your cross-validation has to ' +
            'know that.</li>' +
            '<li>What is the licence, and does it permit what you intend to do?</li>' +
            '<li>Who is in the data, and who is not?</li>' +
            '<li>Has anyone published on it, and what did they report? A ' +
            'published baseline is worth a great deal.</li>' +
          '</ol>' +
        '</section>' +
      '</div>';
  };

  /* ==================================================================== */
  /* Foundation models                                                    */
  /* ==================================================================== */

  window.renderFoundationModels = function () {
    var M = window.FOUNDATION_MODELS;

    var explainer =
      '<section id="what"><h2>What a foundation model is</h2>' +
        '<p class="lede">A large model, pretrained with self-supervision on a ' +
        'broad corpus, intended to be adapted to many downstream tasks rather ' +
        'than built for one.</p>' +
        '<p>Every part of that sentence is doing work. <strong>Self-supervised</strong> ' +
        'means the training signal comes from the data itself, typically by ' +
        'masking part of the input and predicting it, so no human labels are ' +
        'needed and the corpus can be enormous. <strong>Broad</strong> means the ' +
        'corpus was not collected for your task. <strong>Adapted to many ' +
        'tasks</strong> is the actual defining property: a model built and used ' +
        'for one job is not a foundation model however large it is.</p>' +
        '<p>Notice what is not in the definition. Size is not: ESM-2 is released ' +
        'at 8 million parameters and is still a foundation model, while a ' +
        '10-billion-parameter model trained end to end on one labelled dataset ' +
        'is not. Architecture is not either.</p>' +
      '</section>' +

      '<section id="pretraining"><h2>Pretraining</h2>' +
        '<p>The mechanism is simple and the scale is what makes it work. Take a ' +
        'sequence, hide some of it, and train the model to reconstruct the ' +
        'hidden part from what remains. To do that well the model has to ' +
        'represent which residues co-occur, which motifs are conserved, which ' +
        'substitutions are tolerated. None of that was labelled by anyone.</p>' +
        '<p>The corpora are large in a way that is worth stating concretely. ' +
        'DNABERT-2 was pretrained on 32.49 billion nucleotide bases from 135 ' +
        'species [ref:dnabert2]. The Nucleotide Transformer family used the ' +
        'human reference genome, 3,202 human genomes from the 1000 Genomes ' +
        'Project, and 850 genomes from diverse species [ref:nucleotideTransformer]. ' +
        'ESM-2 was trained on UniRef50 [ref:esm2]. No individual research group ' +
        'could label data at that scale, which is precisely the point.</p>' +
        U.callout('warn', 'The question this raises for your evaluation',
          '<p class="mb0">If the pretraining corpus is that large, is your test ' +
          'set in it? For sequence data drawn from public databases this is a ' +
          'real possibility and a genuinely difficult thing to rule out. It is ' +
          'the foundation-model-specific form of data leakage, and it does not ' +
          'have a comfortable general answer.</p>') +
      '</section>' +

      '<section id="embeddings"><h2>Embeddings</h2>' +
        '<p>Run a sequence through a pretrained model, take the final hidden ' +
        'layer, and average over the real residue positions. You now have one ' +
        'fixed-length vector per sequence, whatever its length, produced without ' +
        'using any of your labels.</p>' +
        '<p>That vector is a representation, not a prediction. What you do with ' +
        'it next is an ordinary supervised modelling decision, and it is usually ' +
        'logistic regression. This is worth dwelling on: the most common and ' +
        'most effective use of a foundation model in biology ends with a ' +
        'classical model. The foundation model changed the input ' +
        'representation, not the discipline.</p>' +
        '<p>Two practical notes. Embedding spaces are strongly anisotropic, ' +
        'dominated by a few directions, so centring or whitening before a ' +
        'distance-based method often helps. And a bigger embedding is not ' +
        'automatically a better one for nearest-neighbour work, because ' +
        'low-variance directions contribute noise to every distance.</p>' +
      '</section>' +

      '<section id="adaptation"><h2>Adaptation: the ladder</h2>' +
        '<p>Four rungs, in increasing order of cost and labelled-data ' +
        'requirement. Climb one at a time, and only when the rung below has ' +
        'demonstrably run out.</p>' +
        '<div class="table-scroll"><table>' +
          '<caption>The adaptation ladder.</caption>' +
          '<thead><tr><th scope="col">Method</th><th scope="col">Labels needed</th>' +
          '<th scope="col">Compute</th><th scope="col">What it does</th>' +
          '<th scope="col">The risk</th></tr></thead><tbody>' +
          window.ADAPTATION_LADDER.map(function (a) {
            return '<tr><th scope="row">' + U.esc(a.name) + '</th>' +
              '<td>' + U.esc(a.labels) + '</td>' +
              '<td>' + U.esc(a.compute) + '</td>' +
              '<td>' + U.esc(a.body) + '</td>' +
              '<td>' + U.esc(a.risk) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
      '</section>' +

      '<section id="lora"><h2>LoRA and parameter-efficient fine-tuning</h2>' +
        '<p>Full fine-tuning updates every weight, which means the optimiser has ' +
        'to hold state for every weight, which is where the GPU requirement ' +
        'comes from. Parameter-efficient methods freeze the pretrained weights ' +
        'and train a small number of added parameters instead.</p>' +
        '<p>LoRA is the cleanest version. Instead of learning a full update to a ' +
        'weight matrix W of shape d by k, it learns two much smaller matrices, A ' +
        'of shape d by r and B of shape r by k, with r far smaller than either, ' +
        'and uses W + BA. On GPT-3 175B this reduced the trainable parameter ' +
        'count by a factor of 10,000 and GPU memory by a factor of 3, with no ' +
        'added inference latency because BA can be folded back into W after ' +
        'training [ref:lora]. DNABERT-2 ships with LoRA support for exactly this ' +
        'reason [ref:dnabert2].</p>' +
        '<p>Adapters are the other common approach: small trainable modules ' +
        'inserted between the frozen layers. They do add a little inference ' +
        'latency, which LoRA avoids.</p>' +
        '<p>The <a href="' + url('weeks/week11.html#interactive') + '">fine-tuning ' +
        'simulator in Week 11</a> computes the exact parameter arithmetic for ' +
        'any configuration you set.</p>' +
      '</section>' +

      '<section id="limits"><h2>Limitations, stated plainly</h2>' +
        '<div class="grid grid-2">' +
          card('They do not understand biology',
            'A protein language model has learned the statistics of amino-acid ' +
            'sequences in a database. That is genuinely useful and it is not ' +
            'mechanism. An embedding that separates two protein families is ' +
            'evidence about sequence statistics, not about chemistry, and no ' +
            'amount of downstream accuracy converts one into the other.') +
          card('The corpus decides what they know',
            'Model organisms and well-studied protein families are heavily ' +
            'represented; rare organisms, engineered sequences and ' +
            'under-studied domains are not. Performance degrades in ways that ' +
            'are not announced, so it has to be measured on your own data.') +
          card('They are frequently miscalibrated',
            'Confident-looking probabilities that do not correspond to observed ' +
            'frequencies. For anything where the probability itself informs a ' +
            'decision, calibration has to be assessed and usually corrected.') +
          card('Interpretability is largely absent',
            'Attention maps and attribution methods describe the model. They do ' +
            'not establish a mechanism in the biology, and reading them as if ' +
            'they did is the most common over-claim in this literature.') +
          card('Reproducibility depends on someone else',
            'Your result depends on pretrained weights you did not produce, may ' +
            'not be able to archive, and cannot fully inspect. If the checkpoint ' +
            'is withdrawn or silently updated, your work is not reproducible.') +
          card('Cost is a real constraint',
            'Training large models has a measurable energy and carbon cost ' +
            '[ref:strubell2019], and inference at scale is not free either. For ' +
            'a marginal accuracy gain that sits inside the error bars, this can ' +
            'reasonably be the deciding argument.') +
        '</div>' +
      '</section>';

    function card(t, b) {
      return '<div class="card"><h4 style="margin-top:0">' + U.esc(t) + '</h4>' +
        '<p class="small mb0">' + U.cites(U.esc(b)) + '</p></div>';
    }

    var models = M.filter(function (m) { return !m.isOverview; }).map(function (m) {
      var ref = m.ref ? window.REFERENCES[m.ref] : null;
      return '<article class="card" id="' + m.id + '" style="margin-bottom:var(--s5)">' +
        '<div class="pill-row">' +
          '<span class="pill pill-fm">' + U.esc(m.modality) + '</span>' +
          '<span class="pill">' + U.esc(m.org) + '</span></div>' +
        '<h3 style="margin-top:0">' + U.esc(m.name) + '</h3>' +
        '<dl class="dl-grid">' +
          '<dt>Sizes</dt><dd>' + U.esc(m.sizes) + '</dd>' +
          '<dt>Pretraining</dt><dd>' + U.esc(m.pretraining) + '</dd>' +
          (m.tokenisation ? '<dt>Tokenisation</dt><dd>' + U.esc(m.tokenisation) + '</dd>' : '') +
          (m.context ? '<dt>Context</dt><dd>' + U.esc(m.context) + '</dd>' : '') +
          (m.confidence ? '<dt>Confidence</dt><dd>' + U.esc(m.confidence) + '</dd>' : '') +
          (m.evaluation ? '<dt>Evaluation</dt><dd>' + U.esc(m.evaluation) + '</dd>' : '') +
          (m.licence ? '<dt>Licence</dt><dd>' + U.esc(m.licence) + '</dd>' : '') +
        '</dl>' +
        '<div class="grid grid-2" style="gap:var(--s4)">' +
          '<div><h4 style="margin-top:0;color:var(--ok)">Reasonable uses</h4><ul class="small">' +
            m.useFor.map(function (u) { return '<li>' + U.esc(u) + '</li>'; }).join('') +
            '</ul></div>' +
          '<div><h4 style="margin-top:0;color:var(--danger)">Where it does not belong</h4><ul class="small">' +
            m.doNotUse.map(function (u) { return '<li>' + U.esc(u) + '</li>'; }).join('') +
            '</ul></div>' +
        '</div>' +
        (m.note ? '<p class="small"><strong>Note. </strong>' + U.esc(m.note) + '</p>' : '') +
        (ref ? '<p class="small muted mb0">' + U.esc(ref.cite) +
          ' <a href="' + U.esc(ref.url) + '" target="_blank" rel="noopener">Link</a>' +
          (ref.doi ? ' &middot; DOI ' + U.esc(ref.doi) : '') + '</p>' : '') +
        '</article>';
    }).join('');

    var overviews = M.filter(function (m) { return m.isOverview; }).map(function (m) {
      return '<article class="card" id="' + m.id + '" style="margin-bottom:var(--s5)">' +
        '<h3 style="margin-top:0">' + U.esc(m.name) + '</h3>' +
        U.prose(m.body) + '</article>';
    }).join('');

    document.getElementById('main').innerHTML =
      '<div class="page-hero"><div class="wrap">' +
        '<span class="eyebrow">Foundation models</span>' +
        '<h1>What they are, what they do, and where they stop</h1>' +
        '<p class="lede">A reference section for the whole module. The models ' +
        'change quickly; the questions you should ask about them do not.</p>' +
      '</div></div>' +
      '<div class="wrap">' +
        explainer +
        '<section id="decide"><h2>Should you use one?</h2>' +
          window.vizBlock('fm-decision') + '</section>' +
        '<section id="dna"><h2>Biological foundation models</h2>' + models + '</section>' +
        '<section id="domains"><h2>By domain</h2>' + overviews + '</section>' +
      '</div>';

    if (window.Chart) window.Chart.mountAll();
  };


})();
