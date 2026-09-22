/* COMP9085 - browser-local storage and progress.
 *
 * Everything here is per-browser and never leaves the machine. There is no
 * account, no cookie, no analytics and no network call anywhere in this file.
 * All access is wrapped in try/catch because localStorage throws outright in
 * private-browsing configurations and when site data is blocked, and the page
 * must remain fully usable in that case.
 */
(function () {
  'use strict';

  var PREFIX = 'comp9085.';
  var available = (function () {
    try {
      var k = PREFIX + '__probe';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  var memory = {};   /* fallback so the site still works when storage throws */

  var Store = {
    available: available,

    get: function (key, fallback) {
      if (!available) return memory[key] !== undefined ? memory[key] : fallback;
      try {
        var raw = window.localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },

    set: function (key, value) {
      memory[key] = value;
      if (!available) return false;
      try {
        window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) { return false; }
    },

    remove: function (key) {
      delete memory[key];
      if (!available) return;
      try { window.localStorage.removeItem(PREFIX + key); } catch (e) {}
    },

    /** Remove every key this site owns. Used by the reset control. */
    clearAll: function () {
      memory = {};
      if (!available) return 0;
      var n = 0;
      try {
        Object.keys(window.localStorage)
          .filter(function (k) { return k.indexOf(PREFIX) === 0; })
          .forEach(function (k) { window.localStorage.removeItem(k); n++; });
      } catch (e) {}
      return n;
    },

    /** Everything stored, for the export control on the resources page. */
    dump: function () {
      var out = {};
      if (!available) return memory;
      try {
        Object.keys(window.localStorage)
          .filter(function (k) { return k.indexOf(PREFIX) === 0; })
          .forEach(function (k) {
            try { out[k.slice(PREFIX.length)] = JSON.parse(window.localStorage.getItem(k)); }
            catch (e) { out[k.slice(PREFIX.length)] = null; }
          });
      } catch (e) {}
      return out;
    }
  };

  window.Store = Store;

  /* --- Progress -------------------------------------------------------- */

  var Progress = {
    /** Mark a week visited. */
    visit: function (n) {
      var v = Store.get('visited', {});
      if (!v[n]) { v[n] = Date.now(); Store.set('visited', v); }
    },

    recordQuiz: function (key, qi, correct) {
      var q = Store.get('quiz', {});
      q[key] = q[key] || {};
      q[key][qi] = correct;
      Store.set('quiz', q);
      Progress.refresh();
    },

    /** Summary used by the progress bars. */
    summary: function () {
      var weeks = (window.COURSE && window.COURSE.weeks) || [];
      var visited = Store.get('visited', {});
      var feedback = Store.get('feedback', {});
      var quiz = Store.get('quiz', {});

      var quizAttempted = 0, quizCorrect = 0;
      Object.keys(quiz).forEach(function (k) {
        Object.keys(quiz[k]).forEach(function (qi) {
          quizAttempted++;
          if (quiz[k][qi]) quizCorrect++;
        });
      });

      return {
        totalWeeks: weeks.length,
        visited: Object.keys(visited).length,
        checkins: Object.keys(feedback).length,
        quizAttempted: quizAttempted,
        quizCorrect: quizCorrect
      };
    },

    /** Update any progress widgets on the page. */
    refresh: function () {
      var s = Progress.summary();
      document.querySelectorAll('[data-progress]').forEach(function (el) {
        var kind = el.getAttribute('data-progress');
        var pct = 0, label = '';
        if (kind === 'weeks') {
          pct = s.totalWeeks ? (s.visited / s.totalWeeks) * 100 : 0;
          label = s.visited + ' of ' + s.totalWeeks + ' weeks opened';
        } else if (kind === 'checkins') {
          pct = s.totalWeeks ? (s.checkins / s.totalWeeks) * 100 : 0;
          label = s.checkins + ' of ' + s.totalWeeks + ' check-ins saved';
        } else if (kind === 'quiz') {
          pct = s.quizAttempted ? (s.quizCorrect / s.quizAttempted) * 100 : 0;
          label = s.quizAttempted
            ? s.quizCorrect + ' of ' + s.quizAttempted + ' self-check questions right'
            : 'No self-check questions attempted yet';
        }
        var fill = el.querySelector('.progress-fill');
        var lab = el.querySelector('.progress-label');
        if (fill) fill.style.width = Math.round(pct) + '%';
        if (lab) lab.textContent = label;
      });

      /* Tick marks on week cards that have been visited. */
      var visited = Store.get('visited', {});
      document.querySelectorAll('[data-week-tick]').forEach(function (el) {
        var n = +el.getAttribute('data-week-tick');
        el.textContent = visited[n] ? 'Opened' : '';
        el.className = visited[n] ? 'pill pill-real' : 'sr-only';
      });
    }
  };

  window.Progress = Progress;

  /** Progress widget markup. */
  window.progressWidget = function (kind, title) {
    return '<div data-progress="' + kind + '">' +
      (title ? '<div class="m-label">' + title + '</div>' : '') +
      '<div class="progress-track"><div class="progress-fill" style="width:0"></div></div>' +
      '<div class="progress-label"></div></div>';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Progress.refresh);
  } else {
    Progress.refresh();
  }
})();
