/**
 * treseiscero — Calculator form
 * Page: /calculator
 *
 * On submit, reads the selected radio of every question and redirects to
 * /calculator-results passing each answer as a URL param (q1..q7).
 * No data is stored in Webflow — this is a redirect-only flow.
 *
 * Place before </body> on the /calculator page (or host via jsDelivr).
 */
(function () {
  "use strict";

  var RESULTS_URL = "/calculator-results";

  // Radio group name (the form "name" attribute) -> param key in the results URL
  var QUESTIONS = {
    "How-much-revenue-did-you-earn-last-year": "q1",
    "How-has-your-revenue-moved": "q2",
    "Roughly-what-s-your-annual-profit": "q3",
    "How-are-your-financials-looking": "q4",
    "Could-the-business-run-without-you-for-a-month": "q5",
    "How-spread-out-is-your-customer-base": "q6",
    "What-s-prompting-you-to-think-about-selling": "q7"
  };

  // Last question gates the redirect: only fire once it has been answered
  var LAST_QUESTION = "What-s-prompting-you-to-think-about-selling";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("#join-our-network-form");
    if (!form) return;

    function buildResultsUrl() {
      var params = new URLSearchParams();
      Object.keys(QUESTIONS).forEach(function (name) {
        var checked = form.querySelector('input[name="' + name + '"]:checked');
        if (checked) params.set(QUESTIONS[name], checked.value);
      });
      return RESULTS_URL + "?" + params.toString();
    }

    function isComplete() {
      return !!form.querySelector('input[name="' + LAST_QUESTION + '"]:checked');
    }

    function goToResults(e) {
      // Let the multistep library handle validation if the form isn't finished
      if (!isComplete()) return;
      e.preventDefault();
      e.stopImmediatePropagation(); // stop Webflow's default submit
      window.location.href = buildResultsUrl();
    }

    // Capture on document so this runs before the multistep library's handlers.
    // The submit button is an <a data-form="submit-btn"> (only active on the last step).
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest('[data-form="submit-btn"]');
        if (!btn || !form.contains(btn)) return;
        goToResults(e);
      },
      true
    );

    // Belt-and-suspenders: also catch a native form submit (e.g. Enter key)
    form.addEventListener("submit", goToResults);
  });
})();
