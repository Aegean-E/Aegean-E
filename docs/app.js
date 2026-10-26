(function () {
  "use strict";

  var root = document.documentElement;

  var header = document.querySelector(".site-header");
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var year = document.getElementById("year");
  var background = Array.prototype.slice.call(
    document.querySelectorAll("main, .site-footer")
  );

  if (year) year.textContent = String(new Date().getFullYear());

  function setBackgroundInert(inert) {
    background.forEach(function (region) {
      region.inert = inert;
    });
  }

  function menuFocusables() {
    return Array.prototype.slice.call(
      header.querySelectorAll('a[href], button:not([disabled])')
    ).filter(function (element) {
      return element.getClientRects().length > 0;
    });
  }

  function setNav(open) {
    if (!header || !navToggle) return;
    header.dataset.open = open ? "true" : "false";
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("nav-open", open);
    setBackgroundInert(open);
  }

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      setNav(header.dataset.open !== "true");
    });
  }

  if (nav) {
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });
  }

  if (header) {
    header.addEventListener("click", function (event) {
      if (event.target.closest("a")) setNav(false);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (!header || header.dataset.open !== "true") return;
    if (event.key === "Escape") {
      setNav(false);
      if (navToggle) navToggle.focus();
      return;
    }
    if (event.key !== "Tab") return;
    var focusables = menuFocusables();
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    var active = document.activeElement;
    if (event.shiftKey && (active === first || !header.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !header.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener("click", function (event) {
    if (!header || header.dataset.open !== "true") return;
    if (!event.target.closest(".site-header")) setNav(false);
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 780) setNav(false);
  });

  var lastScroll = 0;
  function onScroll() {
    if (!header) return;
    var y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle("is-stuck", y > 8);
    if (y > 140 && y > lastScroll && header.dataset.open === "true") setNav(false);
    lastScroll = y;
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var projects = Array.prototype.slice.call(document.querySelectorAll(".project"));
  var status = document.querySelector(".filter-status");

  function applyFilter(value) {
    var shown = 0;
    projects.forEach(function (card) {
      var match = value === "all" || card.dataset.cat === value;
      card.classList.toggle("is-hidden", !match);
      if (match) {
        shown += 1;
        card.classList.add("in");
      }
    });
    chips.forEach(function (chip) {
      var active = chip.dataset.filter === value;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (status) {
      status.textContent = value === "all"
        ? "Showing all " + shown + " public projects."
        : "Showing " + shown + " projects in this discipline.";
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      applyFilter(chip.dataset.filter || "all");
    });
  });

  root.classList.remove("script-failed");
  root.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealables = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("in"); });
  } else {
    try {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      revealables.forEach(function (el) { observer.observe(el); });
    } catch (error) {
      revealables.forEach(function (el) { el.classList.add("in"); });
    }
  }

  var cards = Array.prototype.slice.call(document.querySelectorAll(".work-card"));
  cards.forEach(function (card) {
    card.addEventListener("pointermove", function (event) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", (event.clientX - rect.left) + "px");
      card.style.setProperty("--my", (event.clientY - rect.top) + "px");
    });
  });
})();
