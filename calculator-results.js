/**
 * treseiscero — Calculator results
 * Page: /calculator-results
 *
 * Reads the answers from the URL (q1..q7), then:
 *   1. Toggles .result-positive / .result-negative inside each [card] element.
 *   2. Reorders the cards so the negative (yellow) ones sit above the positive
 *      (green) ones, keeping the spacers in place.
 *   3. Fills [result="score"] with the POSITIVE-BLOCK count (0..6).
 *   4. Fills [result="body"] with the intro paragraph that matches the result
 *      ("all strong" when every bullet is green, "here's what to work on" otherwise).
 *   5. Fills [result="title"] with "LOOKING GOOD!" or "YOUR EXIT PLAN STARTS HERE."
 *   6. Injects into the native contact form: Score (0..17), Outcome (HIGH/MED/LOW/DQ),
 *      and the readable answer text of every question (Q1..Q7), so they all show up
 *      in the Webflow form submissions.
 *   7. Removes the answers from the URL (keeps only the path).
 *
 * Two different scores:
 *   - blockScore  (0..6):  how many blocks are positive -> shown in [result="score"].
 *   - weightedScore (0..17): sum of the points encoded in each value -> sent to
 *                            the form and used to decide the Outcome (>=11 HIGH).
 *
 * Q7 ("what's prompting you to sell") is NOT scored: it is kept apart from the
 * scored answers and only forwarded to the form.
 *
 * Each scored value encodes question-answer-points, e.g. "1-5-0" = Q1, option 5, 0 pts.
 *
 * Cards are matched by DOM order: the first [card] is Q1, the second is Q2, etc.
 * They must be direct siblings of the same container (with spacers between them).
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
  var REASON_FIELD = "What-s-prompting-you-to-think-about-selling"; // Q7 hidden input

  // Hidden input names (in the results contact form) for the Q1..Q6 answers
  var ANSWER_FIELDS = {
    q1: "How-much-revenue-did-you-earn-last-year",
    q2: "How-has-your-revenue-moved",
    q3: "Roughly-what-s-your-annual-profit",
    q4: "How-are-your-financials-looking",
    q5: "Could-the-business-run-without-you-for-a-month",
    q6: "How-spread-out-is-your-customer-base"
  };

  // Value code -> human-readable answer label (for the form submissions)
  var ANSWER_LABELS = {
    "1-1-5": "$5M +",
    "1-2-5": "$3M - 4.999M",
    "1-3-5": "$1.5M - 2.999M",
    "1-4-4": "$750K - $1.499M",
    "1-5-0": "Under $750K",
    "2-1-2": "Growing year over year",
    "2-2-1": "Consistent with little to no change",
    "2-3-1": "Fluctuates up and down",
    "2-4-0": "Shrinking year over year",
    "3-1-5": "$200K +",
    "3-2-5": "$100K - 199K",
    "3-3-1": "$50K - 99K",
    "3-4-0": "Under $50k",
    "4-1-2": "3+ years",
    "4-2-0": "1-2 years",
    "4-3-1": "We have 3+ years of records, but they could be cleaner",
    "4-4-1": "I'm not sure",
    "5-1-1": "Yes",
    "5-2-1": "Mostly",
    "5-3-0": "Not yet",
    "6-1-2": "Spread out. No single client is too big",
    "6-2-2": "Mostly spread, one or two are larger",
    "6-3-1": "A few clients bring in most of the money",
    "6-4-1": "One main client"
  };

  // Body copy variants for [result="body"]
  var BODY_ALL_STRONG = "Every great exit starts with preparation. Your readiness signals are all strong.";
  var BODY_WORK = "Every great exit starts with preparation. Here's what to work on.";

  // True when an answer value shows the negative card
  function isNegativeValue(key, value) {
    return !!value && NEGATIVE[key] && NEGATIVE[key].indexOf(value) !== -1;
  }

  // Readable label for a value code (falls back to the raw code if unmapped)
  function labelFor(value) {
    return ANSWER_LABELS[value] || value;
  }

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

  // Reorders cards in place: negatives first, positives after (both stable).
  // Spacers between cards are left untouched by reusing each card's slot via
  // placeholder comment nodes.
  function reorderCards(cards, negativeFlags) {
    if (cards.length < 2) return;
    var parent = cards[0].parentNode;
    if (!parent) return;

    var negatives = [];
    var positives = [];
    cards.forEach(function (card, i) {
      (negativeFlags[i] ? negatives : positives).push(card);
    });
    var ordered = negatives.concat(positives);

    // Mark each original slot, then detach the cards
    var slots = cards.map(function (card) {
      var ph = document.createComment("card-slot");
      parent.insertBefore(ph, card);
      parent.removeChild(card);
      return ph;
    });

    // Drop the cards back into the slots in the new order
    slots.forEach(function (ph, i) {
      parent.insertBefore(ordered[i], ph);
      parent.removeChild(ph);
    });
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

    // Q7 is not scored — keep it apart from the scored answers
    var sellingReason = params.get("q7");

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

    // 1) Cards: toggle positive/negative and remember which are negative.
    //    Cards are in DOM order Q1..Q6.
    var cardEls = Array.prototype.slice.call(document.querySelectorAll("[card]"));
    var cardIsNegative = [];

    cardEls.forEach(function (card, index) {
      var key = "q" + (index + 1);
      var value = answers[key];
      var neg = isNegativeValue(key, value);
      cardIsNegative[index] = neg;

      if (!value) return; // nothing to toggle without an answer

      var positiveEl = card.querySelector(".result-positive");
      var negativeEl = card.querySelector(".result-negative");

      // Active card -> flex. Negatives are display:none by default in the
      // Webflow stylesheet, so the shown one must be set explicitly.
      if (positiveEl) positiveEl.style.display = neg ? "none" : "flex";
      if (negativeEl) negativeEl.style.display = neg ? "flex" : "none";
    });

    // 2) Reorder: yellow (negative) cards above green (positive) ones
    reorderCards(cardEls, cardIsNegative);

    // 3) Block score (0..6): one point per positive block -> [result="score"]
    var blockScore = Object.keys(answers).reduce(function (count, key) {
      var value = answers[key];
      if (!value) return count;
      return count + (isNegativeValue(key, value) ? 0 : 1);
    }, 0);

    document.querySelectorAll('[result="score"]').forEach(function (el) {
      el.textContent = blockScore;
    });

    // 4) Body copy: depends on whether every bullet is green -> [result="body"]
    var bodyCopy = blockScore === 6 ? BODY_ALL_STRONG : BODY_WORK;
    document.querySelectorAll('[result="body"]').forEach(function (el) {
      el.textContent = bodyCopy;
    });

    // 5a) Weighted score (0..17): sum of the 3rd number of each value
    var weightedScore = Object.keys(answers).reduce(function (sum, key) {
      var value = answers[key];
      if (!value) return sum;
      var points = Number(value.split("-")[2]);
      return sum + (isNaN(points) ? 0 : points);
    }, 0);

    // 5b) Outcome / title — priority order (uses the weighted score)
    var outcome;
    if (answers.q1 && answers.q1 !== "1-5-0" &&
        (answers.q3 === "3-1-5" || answers.q3 === "3-2-5")) {
      outcome = "HIGH"; // 1) auto -> always wins, ignores DQ and score
    } else if (answers.q4 === "4-2-0") {
      outcome = "DQ"; // 2) DQ
    } else if (weightedScore >= 11) {
      outcome = "HIGH"; // 3) score branch
    } else if (weightedScore >= 7) {
      outcome = "MED";
    } else {
      outcome = "LOW";
    }

    var title = outcome === "HIGH"
      ? "LOOKING GOOD!"
      : "YOUR EXIT PLAN STARTS HERE.";

    document.querySelectorAll('[result="title"]').forEach(function (el) {
      el.textContent = title;
    });

    // Exposes the outcome on <body> so you can style the two result pages
    // via CSS (e.g. green pills for HIGH vs low-score indicator for the rest):
    //   body[data-outcome="HIGH"] { ... }
    document.body.setAttribute("data-outcome", outcome);

    // 6) Feed the native contact form: score, outcome and every answer (readable)
    var contactForm = document.getElementById(CONTACT_FORM_ID);
    if (contactForm) {
      setHiddenField(contactForm, SCORE_FIELD, String(weightedScore));
      setHiddenField(contactForm, OUTCOME_FIELD, outcome);
      if (sellingReason) setHiddenField(contactForm, REASON_FIELD, sellingReason);

      // Q1..Q6 answers as readable labels
      Object.keys(ANSWER_FIELDS).forEach(function (key) {
        var value = answers[key];
        if (!value) return;
        setHiddenField(contactForm, ANSWER_FIELDS[key], labelFor(value));
      });
    }

    // --- Debug: per-question breakdown so you can verify the numbers ---
    if (DEBUG) {
      var breakdown = Object.keys(answers).map(function (key) {
        var value = answers[key];
        return {
          question: key,
          value: value || "(empty)",
          label: value ? labelFor(value) : null,
          points: value ? Number(value.split("-")[2]) : null,
          card: value ? (isNegativeValue(key, value) ? "negative" : "positive") : null
        };
      });
      console.group("[Calculator results]");
      console.log("Answers:", answers);
      console.table(breakdown);
      console.log("Block score (page):", blockScore, "/ 6");
      console.log("Weighted score (form):", weightedScore, "/ 17");
      console.log("Selling reason (form):", sellingReason || "(none)");
      console.log("Outcome:", outcome, "| Title:", title);
      console.groupEnd();
    }

    // 7) Clean the answers out of the URL (keeps the path, no reload)
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
})();
