/**
 * treseiscero — Calculator results
 * Page: /calculator-results
 *
 * Reads the answers from the URL (q1..q6), then:
 *   1. Toggles .result-positive / .result-negative inside each [card] element.
 *   2. Fills [result="score"] with the total score (sum of the points in q1..q6).
 *   3. Fills [result="title"] with "LOOKING GOOD" or "YOUR EXIT PLAN STARTS HERE."
 *   4. Injects Score + Outcome as hidden fields into the native contact form,
 *      so they get recorded with the Webflow submission.
 *   5. Removes the answers from the URL (keeps only the path).
 *
 * Each answer value encodes question-answer-points, e.g. "1-5-0" = Q1, option 5, 0 pts.
 * Max possible total = 5 + 2 + 5 + 2 + 1 + 2 = 17.
 *
 * Cards are matched by DOM order: the first [card] is Q1, the second is Q2, etc.
 * Place before </body> on the /calculator-results page (or host via jsDelivr).
 */
(function () {
  "use strict";

  // Set to false in production to silence the console output
  var DEBUG = true;

  // Values that should show the NEGATIVE card (from the scoring doc).
  // Everything not listed here shows the POSITIVE card.
  var NEGATIVE = {
    q1: ["1-5-0"],
    q2: ["2-3-1", "2-4-0"],
    q3: ["3-4-0"],
    q4: ["4-2-0", "4-3-1", "4-4-1"],
    q5: ["5-2-1", "5-3-0"],
    q6: ["6-3-1", "6-4-1"]
  };

  // Native contact form on this page + the field names we send to it
  var CONTACT_FORM_ID = "wf-form-Calculator-Results-Form";
  var SCORE_FIELD = "Score";
  var OUTCOME_FIELD = "Outcome";

  // Finds a form field by name, creating a hidden one if it doesn't exist
  function setHiddenField(form, name, value) {
    var field = form.querySelector('[name="' + name + '"]');
    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = name;
      field.setAttribute("data-name", name); // nicer label in Webflow submissions
      form.appendChild(field);
    }
    field.value = value;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var params = new URLSearchParams(window.location.search);

    var answers = {
      q1: params.get("q1"),
      q2: params.get("q2"),
      q3: params.get("q3"),
      q4: params.get("q4"),
      q5: params.get("q5"),
      q6: params.get("q6")
    };

    // No answers in the URL (e.g. direct visit) -> do nothing.
    // Uncomment the redirect to force users back to the form instead.
    var hasAnswers = Object.keys(answers).some(function (k) {
      return !!answers[k];
    });
    if (!hasAnswers) {
      if (DEBUG) console.warn("[Calculator results] No answers in URL.");
      // window.location.href = "/calculator";
      return;
    }

    // 1) Cards: show positive or negative (cards are in DOM order Q1..Q6)
    var cards = document.querySelectorAll("[card]");
    cards.forEach(function (card, index) {
      var key = "q" + (index + 1);
      var value = answers[key];
      if (!value || !NEGATIVE[key]) return;

      var isNegative = NEGATIVE[key].indexOf(value) !== -1;
      var positiveEl = card.querySelector(".result-positive");
      var negativeEl = card.querySelector(".result-negative");

      // Active card -> flex. Negatives are display:none by default in the
      // Webflow stylesheet, so the shown one must be set explicitly.
      if (positiveEl) positiveEl.style.display = isNegative ? "none" : "flex";
      if (negativeEl) negativeEl.style.display = isNegative ? "flex" : "none";
    });

    // 2) Total score: sum of the 3rd number of q1..q6
    var total = Object.keys(answers).reduce(function (sum, key) {
      var value = answers[key];
      if (!value) return sum;
      var points = Number(value.split("-")[2]);
      return sum + (isNaN(points) ? 0 : points);
    }, 0);

    document.querySelectorAll('[result="score"]').forEach(function (el) {
      el.textContent = total;
    });

    // 3) Outcome / title — priority order
    var outcome;
    if (answers.q1 && answers.q1 !== "1-5-0" &&
        (answers.q3 === "3-1-5" || answers.q3 === "3-2-5")) {
      outcome = "HIGH"; // 1) auto -> always wins, ignores DQ and score
    } else if (answers.q4 === "4-2-0") {
      outcome = "DQ"; // 2) DQ
    } else if (total >= 11) {
      outcome = "HIGH"; // 3) score branch
    } else if (total >= 7) {
      outcome = "MED";
    } else {
      outcome = "LOW";
    }

    var title = outcome === "HIGH"
      ? "LOOKING GOOD"
      : "YOUR EXIT PLAN STARTS HERE.";

    document.querySelectorAll('[result="title"]').forEach(function (el) {
      el.textContent = title;
    });

    // Exposes the outcome on <body> so you can style the two result pages
    // via CSS (e.g. green pills for HIGH vs low-score indicator for the rest):
    //   body[data-outcome="HIGH"] { ... }
    document.body.setAttribute("data-outcome", outcome);

    // 4) Pass Score + Outcome to the native contact form on this page
    var contactForm = document.getElementById(CONTACT_FORM_ID);
    if (contactForm) {
      setHiddenField(contactForm, SCORE_FIELD, String(total));
      setHiddenField(contactForm, OUTCOME_FIELD, outcome);
    }

    // --- Debug: per-question breakdown so you can verify the numbers ---
    if (DEBUG) {
      var breakdown = Object.keys(answers).map(function (key) {
        var value = answers[key];
        return {
          question: key,
          value: value || "(empty)",
          points: value ? Number(value.split("-")[2]) : null
        };
      });
      console.group("[Calculator results]");
      console.log("Answers:", answers);
      console.table(breakdown);
      console.log("Total score:", total, "/ 17 max");
      console.log("Outcome:", outcome, "| Title:", title);
      console.groupEnd();
    }

    // 5) Clean the answers out of the URL (keeps the path, no reload)
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
})();
