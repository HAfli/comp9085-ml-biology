/* COMP9085 - site chrome.
 *
 * Every page declares its depth and its section on the <html> element:
 *   <html lang="en" data-root="../../" data-section="weeks">
 * and this file builds the header, the navigation and the footer from that.
 * Adding a page to the navigation therefore means editing NAV_ITEMS below and
 * nothing else.
 */
(function () {
  'use strict';

  var NAV_ITEMS = [
    { id: 'home',      label: 'Home',              href: 'index.html' },
    { id: 'start',     label: 'Start here',        href: 'start-here.html' },
    { id: 'roadmap',   label: 'Roadmap',           href: 'roadmap.html' },
    { id: 'weeks',     label: 'Weeks',             href: 'weeks/index.html' },
    { id: 'labs',      label: 'Labs',              href: 'labs/index.html' },
    { id: 'datasets',  label: 'Datasets',          href: 'datasets.html' },
    { id: 'fm',        label: 'Foundation models', href: 'foundation-models.html' },
    { id: 'assess',    label: 'Assessment',        href: 'assessment.html' },
    { id: 'resources', label: 'Resources',         href: 'resources.html' }
  ];

  var root = document.documentElement.getAttribute('data-root') || '';
  var section = document.documentElement.getAttribute('data-section') || '';

  /** Resolve a repository-root-relative path for the current page depth. */
  function url(path) { return root + path; }
  window.siteUrl = url;

  /* The mark: a stylised double helix crossed with a data axis. It is drawn
     rather than loaded so there is no asset to go missing. */
  function brandMark() {
    return '' +
      '<svg class="brand-mark" width="26" height="26" viewBox="0 0 26 26" ' +
      'aria-hidden="true" focusable="false">' +
      '<rect width="26" height="26" rx="6" fill="#1f5f4b"/>' +
      '<path d="M8 5.5c0 4 10 4 10 8s-10 4-10 8" stroke="#fff" ' +
      'stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".95"/>' +
      '<path d="M18 5.5c0 4-10 4-10 8s10 4 10 8" stroke="#e7c48a" ' +
      'stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="8"  cy="9"  r="1.35" fill="#fff"/>' +
      '<circle cx="18" cy="13" r="1.35" fill="#e7c48a"/>' +
      '<circle cx="8"  cy="17" r="1.35" fill="#fff"/>' +
      '</svg>';
  }

  function buildHeader() {
    var header = document.createElement('header');
    header.className = 'site-header';

    var links = NAV_ITEMS.map(function (item) {
      var current = item.id === section ? ' aria-current="page"' : '';
      return '<li><a href="' + url(item.href) + '"' + current + '>' +
             item.label + '</a></li>';
    }).join('');

    header.innerHTML =
      '<div class="header-inner">' +
        '<a class="brand" href="' + url('index.html') + '">' +
          brandMark() +
          '<span class="brand-text">' +
            '<span class="brand-code">COMP9085</span>' +
            '<span class="brand-sub">ML and Foundation Models for Biology</span>' +
          '</span>' +
        '</a>' +
        '<button class="nav-toggle" type="button" aria-expanded="false" ' +
                'aria-controls="site-nav">' +
          '<svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">' +
            '<path d="M1 3.5h13M1 7.5h13M1 11.5h13" stroke="currentColor" ' +
            'stroke-width="1.6" stroke-linecap="round"/></svg>' +
          '<span>Menu</span>' +
        '</button>' +
        '<nav class="site-nav" id="site-nav" aria-label="Main"><ul>' + links +
        '</ul></nav>' +
      '</div>';

    return header;
  }

  function buildFooter() {
    var weekLinks = '';
    if (window.COURSE) {
      weekLinks = window.COURSE.weeks.slice(0, 6).map(function (w) {
        return '<li><a href="' + url('weeks/week' + pad(w.n) + '.html') + '">' +
               'Week ' + w.n + '</a></li>';
      }).join('');
    }

    var footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
      '<div class="wrap">' +
        '<div class="footer-grid">' +
          '<div>' +
            '<h4>Module</h4>' +
            '<ul>' +
              '<li><a href="' + url('start-here.html') + '">Start here</a></li>' +
              '<li><a href="' + url('index.html') + '">Home</a></li>' +
              '<li><a href="' + url('roadmap.html') + '">Course roadmap</a></li>' +
              '<li><a href="' + url('weeks/index.html') + '">All twelve weeks</a></li>' +
              '<li><a href="' + url('assessment.html') + '">Assessment</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h4>Materials</h4>' +
            '<ul>' +
              '<li><a href="' + url('labs/index.html') + '">Practical labs</a></li>' +
              '<li><a href="' + url('datasets.html') + '">Dataset catalogue</a></li>' +
              '<li><a href="' + url('foundation-models.html') + '">Foundation models</a></li>' +
              '<li><a href="' + url('resources.html') + '">Resources and reading</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h4>Weeks 1 to 6</h4>' +
            '<ul>' + weekLinks + '</ul>' +
          '</div>' +
          '<div>' +
            '<h4>Contact and links</h4>' +
            '<ul>' +
              '<li>Dr Haithem Afli</li>' +
              '<li><a href="mailto:haithem.afli@mtu.ie">haithem.afli@mtu.ie</a></li>' +
              '<li>Department of Computer Science</li>' +
              '<li>Munster Technological University</li>' +
              '<li style="margin-top:.6rem">' + extLink('academicWebsite') + '</li>' +
              '<li>' + extLink('aiForIrish') + '</li>' +
              '<li>' + extLink('moduleDescriptor') + '</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="footer-base">' +
          '<p>COMP9085 Machine Learning and Foundation Models for Biology, ' +
          'Healthcare and Nutrition. Munster Technological University, ' +
          'Department of Computer Science. 5 credits, NFQ Level 9.</p>' +
          '<p class="tiny muted">Course content licensed CC BY 4.0; site code ' +
          'licensed MIT. Interactive components run entirely in your browser. ' +
          'Weekly check-in responses are stored only in this browser\'s local ' +
          'storage and are never transmitted anywhere. ' +
          '<a href="' + url('resources.html') + '#privacy">More on this</a>.</p>' +
        '</div>' +
      '</div>';
    return footer;
  }

  /** Render an external link from the central config. A link whose URL has
   *  not been established renders as a clearly-marked placeholder rather than
   *  a guess. */
  function extLink(key) {
    var cfg = window.SITE_CONFIG;
    if (!cfg || !cfg.links[key]) return '';
    var l = cfg.links[key];
    var esc = function (t) {
      return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    if (l.status === 'confirmed' && l.url) {
      return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' +
             esc(l.label) + '</a>';
    }
    return '<span class="link-placeholder" title="' +
           esc(l.note || 'URL not yet configured') + '">' + esc(l.label) +
           ' (link to be added)</span>';
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  window.pad2 = pad;

  function mountChrome() {
    var slotHeader = document.getElementById('site-header');
    var slotFooter = document.getElementById('site-footer');

    if (slotHeader) slotHeader.replaceWith(buildHeader());
    else document.body.insertBefore(buildHeader(), document.body.firstChild);

    if (slotFooter) slotFooter.replaceWith(buildFooter());
    else document.body.appendChild(buildFooter());

    /* Mobile menu */
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('open')) {
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      });
    }
  }

  /* Skip link, inserted first so it is the first focusable element. */
  function mountSkipLink() {
    if (document.querySelector('.skip-link')) return;
    var a = document.createElement('a');
    a.className = 'skip-link';
    a.href = '#main';
    a.textContent = 'Skip to main content';
    document.body.insertBefore(a, document.body.firstChild);
  }

  /* Section navigation highlighting on week pages. */
  function mountScrollSpy() {
    var links = document.querySelectorAll('.week-aside nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) map[el.id] = a;
    });

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('active'); });
        if (map[en.target.id]) map[en.target.id].classList.add('active');
      });
    }, { rootMargin: '-70px 0px -70% 0px', threshold: 0 });

    Object.keys(map).forEach(function (id) {
      obs.observe(document.getElementById(id));
    });
  }

  function init() {
    mountSkipLink();
    /* A page can opt out of the site header and footer with
       data-chrome="none" on <html>. canvas.html does this, because it is
       embedded inside Canvas, which supplies its own chrome; a website
       nested inside a website is worse than no website at all. */
    if (document.documentElement.getAttribute('data-chrome') !== 'none') {
      mountChrome();
    }
    mountScrollSpy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
