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
  var status = document.querySelector(".filter-status");
  var grid = document.getElementById("project-grid");
  var searchInput = document.getElementById("project-search");
  var sortSelect = document.getElementById("project-sort");
  var clearButton = document.getElementById("clear-filters");
  var topicContainer = document.getElementById("topic-filters");
  var CATEGORY_VALUES = ["ai", "research", "health", "tools", "play"];
  var SORT_VALUES = ["curated", "recent", "name"];
  var TOPIC_LIMIT = 12;
  var BOILERPLATE_TOPICS = {
    aikit: true,
    python: true,
    "source-available": true,
    "local-first": true,
    "drm-free": true,
    "zero-dependencies": true,
  };
  var state = { q: "", topic: "", cat: "all", sort: "curated" };
  var curatedOrder = new Map();
  var topicChips = [];
  var focusSearch = false;

  function projects() {
    return Array.prototype.slice.call(document.querySelectorAll(".project"));
  }

  function recordCuratedOrder() {
    if (state.sort !== "curated") return;
    curatedOrder = new Map();
    projects().forEach(function (card, index) {
      curatedOrder.set(card, index);
    });
  }

  function hasNarrowing() {
    return Boolean(state.q || state.topic || state.cat !== "all");
  }

  function hasViewChange() {
    return Boolean(hasNarrowing() || state.sort !== "curated");
  }

  function updateProjectCounts(detail) {
    var total = detail && typeof detail.total === "number" ? detail.total : projects().length;
    document.querySelectorAll("[data-project-count]").forEach(function (element) {
      element.textContent = String(total);
    });
  }

  function cardTitle(card) {
    var title = card.querySelector("h3");
    return title ? title.textContent.trim() : "";
  }

  function projectHaystack(card) {
    var description = card.querySelector("p");
    var facts = card.querySelector(".project-facts");
    return [
      cardTitle(card),
      description ? description.textContent : "",
      card.dataset.topics || "",
      card.dataset.language || "",
      card.dataset.license || "",
      facts ? facts.textContent : "",
    ].join(" ").toLowerCase();
  }

  function sortProjects() {
    if (!grid) return;
    var cards = projects();
    var sorted = cards.slice();
    if (state.sort === "recent") {
      sorted.sort(function (left, right) {
        var a = Date.parse(left.dataset.pushedAt || "");
        var b = Date.parse(right.dataset.pushedAt || "");
        if (!Number.isFinite(a)) a = 0;
        if (!Number.isFinite(b)) b = 0;
        if (a !== b) return b - a;
        return cardTitle(left).localeCompare(cardTitle(right));
      });
    } else if (state.sort === "name") {
      sorted.sort(function (left, right) {
        return cardTitle(left).localeCompare(cardTitle(right));
      });
    } else {
      sorted.sort(function (left, right) {
        return (curatedOrder.has(left) ? curatedOrder.get(left) : 1e9) -
          (curatedOrder.has(right) ? curatedOrder.get(right) : 1e9);
      });
    }
    var changed = sorted.some(function (card, index) {
      return card !== cards[index];
    });
    if (!changed) return;
    var fragment = document.createDocumentFragment();
    sorted.forEach(function (card) {
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
  }

  function updateDisciplineChips() {
    chips.forEach(function (chip) {
      var active = (chip.dataset.filter || "all") === state.cat;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function updateTopicChips() {
    topicChips.forEach(function (chip) {
      var active = (chip.dataset.topic || "") === state.topic;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function makeTopicChip(value, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "topic-chip";
    button.dataset.topic = value;
    button.setAttribute("aria-pressed", "false");
    button.textContent = label;
    topicContainer.appendChild(button);
  }

  // Counts only rank the chips; they are not printed, so the shelf stays quiet.
  function buildTopicChips() {
    if (!topicContainer) return;
    var counts = new Map();
    var total = projects().length;
    projects().forEach(function (card) {
      var topics = new Set(
        (card.dataset.topics || "").toLowerCase().split(",").map(function (topic) {
          return topic.trim();
        }).filter(Boolean)
      );
      topics.forEach(function (topic) {
        counts.set(topic, (counts.get(topic) || 0) + 1);
      });
    });
    var topics = Array.from(counts.entries()).filter(function (entry) {
      return (
        (!BOILERPLATE_TOPICS[entry[0]] && entry[1] < total) ||
        entry[0] === state.topic
      );
    });
    topics.sort(function (left, right) {
      if (left[1] !== right[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    });
    var visible = topics.slice(0, TOPIC_LIMIT);
    if (state.topic && !visible.some(function (entry) { return entry[0] === state.topic; })) {
      var active = topics.find(function (entry) { return entry[0] === state.topic; });
      if (active) visible.push(active);
    }
    topicContainer.replaceChildren();
    makeTopicChip("", "Any topic");
    visible.forEach(function (entry) {
      makeTopicChip(entry[0], entry[0]);
    });
    if (state.topic && !counts.has(state.topic)) {
      makeTopicChip(state.topic, state.topic);
    }
    topicChips = Array.prototype.slice.call(
      topicContainer.querySelectorAll(".topic-chip")
    );
    updateTopicChips();
  }

  function writeStateToUrl() {
    try {
      var params = new URLSearchParams(window.location.search);
      if (state.q.trim()) params.set("q", state.q.trim());
      else params.delete("q");
      if (state.topic) params.set("topic", state.topic);
      else params.delete("topic");
      if (state.cat !== "all") params.set("cat", state.cat);
      else params.delete("cat");
      if (state.sort !== "curated") params.set("sort", state.sort);
      else params.delete("sort");
      params.delete("focus");
      var query = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (query ? "?" + query : "") + window.location.hash
      );
    } catch (error) {
      /* a sandboxed document can refuse history; filters still work */
    }
  }

  function readStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    state.q = (params.get("q") || "").trim().slice(0, 100);
    state.topic = (params.get("topic") || "").trim().toLowerCase().slice(0, 80);
    var category = params.get("cat") || "all";
    state.cat = CATEGORY_VALUES.indexOf(category) === -1 ? "all" : category;
    var sort = params.get("sort") || "curated";
    state.sort = SORT_VALUES.indexOf(sort) === -1 ? "curated" : sort;
    focusSearch = params.get("focus") === "search";
    if (searchInput) searchInput.value = state.q;
    if (sortSelect) sortSelect.value = state.sort;
  }

  function applyView() {
    if (!grid) return;
    sortProjects();
    var terms = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var cards = projects();
    var shown = 0;
    var reveal = hasNarrowing();
    cards.forEach(function (card) {
      var categoryMatch = state.cat === "all" || card.dataset.cat === state.cat;
      var topics = (card.dataset.topics || "").toLowerCase().split(",");
      var topicMatch = !state.topic || topics.indexOf(state.topic) !== -1;
      var haystack = projectHaystack(card);
      var queryMatch = terms.every(function (term) {
        return haystack.indexOf(term) !== -1;
      });
      var match = categoryMatch && topicMatch && queryMatch;
      card.classList.toggle("is-hidden", !match);
      if (match) {
        shown += 1;
        if (reveal) card.classList.add("in");
      }
    });
    updateDisciplineChips();
    updateTopicChips();
    if (status) {
      status.textContent = !hasNarrowing()
        ? "Showing all " + shown + " public projects."
        : shown === 0
          ? "No public projects match these filters."
          : "Showing " + shown + " of " + cards.length + " public projects.";
    }
    if (clearButton) clearButton.hidden = !hasViewChange();
    writeStateToUrl();
  }

  function clearFilters() {
    state.q = "";
    state.topic = "";
    state.cat = "all";
    state.sort = "curated";
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "curated";
    updateDisciplineChips();
    updateTopicChips();
    applyView();
  }

  window.addEventListener("atlas:changed", function (event) {
    updateProjectCounts(event.detail);
    recordCuratedOrder();
    buildTopicChips();
    applyView();
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      state.cat = chip.dataset.filter || "all";
      applyView();
    });
  });

  if (topicContainer) {
    topicContainer.addEventListener("click", function (event) {
      var chip = event.target.closest(".topic-chip");
      if (!chip) return;
      var value = chip.dataset.topic || "";
      state.topic = value === state.topic ? "" : value;
      applyView();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      state.q = searchInput.value.slice(0, 100);
      applyView();
    });
    searchInput.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (searchInput.value) {
        searchInput.value = "";
        state.q = "";
        applyView();
      } else {
        searchInput.blur();
      }
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      applyView();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", clearFilters);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    var active = document.activeElement;
    var tag = active ? active.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (active && active.isContentEditable)) {
      return;
    }
    if (!searchInput) return;
    event.preventDefault();
    searchInput.focus();
  });

  // The atlas module may finish before this script wires its listener, so take the DOM as the
  // initial truth. This never reveals every card at once when no filters are active.
  recordCuratedOrder();
  readStateFromUrl();
  buildTopicChips();
  updateProjectCounts();
  applyView();
  if (focusSearch && searchInput) searchInput.focus();

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

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        /* offline support is optional; the site remains fully usable online */
      });
    });
  }
})();
