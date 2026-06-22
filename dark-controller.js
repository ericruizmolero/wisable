<script>
  // Dark Body Variant Controller
  (function () {
    'use strict';
    const CONFIG = {
      attribute: 'body',
      value: 'dark',
      targets: [
        {
          selector: 'body',
          classes: ['body-dark'],
        },
      ],
      triggerStart: 'top 50%',
      triggerEnd: 'bottom 50%',
      // Minimum scroll (px) before dark sections can take over a light first section.
      // Raise it (e.g. window.innerHeight * 0.5) if a dark section peeking under a
      // short hero flips too early.
      minScroll: 50,
    };

    let activeDarkCount = 0;
    let pageStartsDark = false; // true if the page literally begins on a dark section
    let scrollPassed = false;   // true once the user has scrolled past CONFIG.minScroll

    // Decide whether the very top of the page sits on a dark section.
    // Probes a point near the top of the first screenful at load.
    function computeStartState() {
      pageStartsDark = false;
      const probeY = window.innerHeight * 0.25;
      document
        .querySelectorAll(`[${CONFIG.attribute}="${CONFIG.value}"]`)
        .forEach((section) => {
          const r = section.getBoundingClientRect();
          if (r.top <= probeY && r.bottom > probeY) pageStartsDark = true;
        });
    }

    function updateClasses() {
      // Dark is only allowed once we've scrolled the minimum, unless the page
      // already starts on a dark section.
      const allowDark = pageStartsDark || scrollPassed;
      const shouldBeDark = activeDarkCount > 0 && allowDark;
      CONFIG.targets.forEach(({ selector, classes }) => {
        const el = document.querySelector(selector);
        if (!el) return;
        classes.forEach((cls) => {
          el.classList[shouldBeDark ? 'add' : 'remove'](cls);
        });
      });
    }

    function enter() {
      activeDarkCount++;
      updateClasses();
    }
    function leave() {
      activeDarkCount = Math.max(0, activeDarkCount - 1);
      updateClasses();
    }

    function createDarkTriggers() {
      const sections = document.querySelectorAll(`[${CONFIG.attribute}="${CONFIG.value}"]`);
      if (!sections.length) return;
      sections.forEach((section) => {
        const isShort = section.offsetHeight < window.innerHeight * 0.5;
        ScrollTrigger.create({
          trigger: section,
          start: isShort ? 'top bottom' : CONFIG.triggerStart,
          end: 'bottom 50%',
          onEnter: enter,
          onEnterBack: enter,
          onLeave: leave,
          onLeaveBack: leave,
        });
      });
    }

    function init() {
      gsap.registerPlugin(ScrollTrigger);

      // Work out the initial state BEFORE creating the dark triggers,
      // so any onEnter that fires on load is correctly gated.
      computeStartState();
      scrollPassed = window.scrollY > CONFIG.minScroll;

      // Dark sections toggle
      createDarkTriggers();

      // Unlock dark mode once we pass the minimum scroll.
      // NOTE: end is pushed BEYOND the bottom of the page on purpose.
      // With end:'max' the trigger deactivates exactly at the page bottom,
      // which flipped the body back to light on the footer when scrolling all
      // the way down. A far end keeps it active down to the very bottom;
      // scrolling back above minScroll re-locks it. Function form so it
      // recalculates on every ScrollTrigger.refresh() (e.g. when the form
      // success message changes the page height).
      ScrollTrigger.create({
        start: CONFIG.minScroll,
        end: () => ScrollTrigger.maxScroll(window) + window.innerHeight,
        onToggle: (self) => {
          scrollPassed = self.isActive;
          updateClasses();
        },
      });

      // Keep pageStartsDark correct after any layout refresh
      ScrollTrigger.addEventListener('refresh', computeStartState);

      // Navbar background and line opacity after 50px of scroll
      const navBg = document.querySelector('.navbar_bg');
      const navLine = document.querySelector('.navbar_line');
      function setNavVisible(visible) {
        const op = visible ? '1' : '0';
        if (navBg) navBg.style.opacity = op;
        if (navLine) navLine.style.opacity = op;
      }
      if (navBg || navLine) {
        // Set correct state on load
        setNavVisible(window.scrollY > 50);
        // Numeric start/end with NO trigger element = absolute scroll positions,
        // so it no longer depends on where the body rect sits.
        ScrollTrigger.create({
          start: 50,
          end: 'max',
          onToggle: (self) => setNavVisible(self.isActive),
        });
      }

      // Refresh ScrollTrigger when form success message appears
      const formSuccessElements = document.querySelectorAll('.w-form-done');
      if (formSuccessElements.length) {
        const observer = new MutationObserver(() => {
          // Reset count and recalculate
          activeDarkCount = 0;
          ScrollTrigger.refresh();
        });
        formSuccessElements.forEach((el) => {
          observer.observe(el, {
            attributes: true,
            attributeFilter: ['style', 'class'],
          });
        });
      }

      // Set the initial body state (light unless the page starts on a dark section)
      updateClasses();
    }

    window.addEventListener('DOMContentLoaded', init);
  })();
</script>
