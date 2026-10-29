import {
  findGame,
  gameStatus,
  gamesFromManifest,
  versionLabel,
} from "./play-core.js";

const grid = document.getElementById("play-grid");
const player = document.getElementById("play-player");
const frame = document.getElementById("play-frame");
const title = document.getElementById("play-title-current");
const version = document.getElementById("play-version");
const note = document.getElementById("play-note");
const source = document.getElementById("play-source");
const newTab = document.getElementById("play-newtab");
const back = document.getElementById("play-back");
const fullscreen = document.getElementById("play-fullscreen");

let games = [];
let activeSlug = "";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function initials(game) {
  return String(game.title || game.repo || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(function (part) {
      return part[0];
    })
    .join("")
    .toUpperCase();
}

function sourceLink(game, label) {
  const link = element("a", "btn btn-ghost", label);
  link.href = game.source_url;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

function renderCard(game) {
  const card = element("article", "play-card");
  card.dataset.slug = game.slug;

  const head = element("div", "play-card-head");
  const mark = element("span", "play-card-logo");
  mark.setAttribute("aria-hidden", "true");
  if (game.logo) {
    const image = document.createElement("img");
    image.src = game.logo;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", function () {
      mark.replaceChildren(document.createTextNode(initials(game)));
    });
    mark.appendChild(image);
  } else {
    mark.textContent = initials(game);
  }
  const heading = element("div", "play-card-heading");
  heading.appendChild(element("h2", "", game.title));
  heading.appendChild(element("p", "play-status", gameStatus(game)));
  head.append(mark, heading);

  card.appendChild(head);
  card.appendChild(element("p", "play-description", game.description));
  const meta = element("p", "play-meta", versionLabel(game));
  if (game.updated) meta.append(" \u00b7 " + game.updated);
  card.appendChild(meta);

  const actions = element("div", "play-card-actions");
  if (game.playable) {
    const play = element("button", "btn btn-primary", "Play");
    play.type = "button";
    play.addEventListener("click", function () {
      openGame(game.slug, true);
    });
    actions.appendChild(play);
    actions.appendChild(sourceLink(game, "Source"));
  } else {
    actions.appendChild(sourceLink(game, "Get the game"));
    const command = element("code", "play-command", game.command || "python run.py --open");
    card.appendChild(actions);
    card.appendChild(command);
    card.appendChild(element("p", "play-reason", game.reason || "This title runs locally."));
    grid.appendChild(card);
    return;
  }
  card.appendChild(actions);
  grid.appendChild(card);
}

function renderCatalog() {
  grid.replaceChildren();
  if (!games.length) {
    grid.appendChild(
      element("p", "play-empty", "The playable catalog is unavailable right now.")
    );
    return;
  }
  games.forEach(renderCard);
}

function updateFullscreen() {
  if (!fullscreen) return;
  const active = document.fullscreenElement === player;
  fullscreen.textContent = active ? "Exit fullscreen" : "Fullscreen";
  fullscreen.setAttribute("aria-pressed", active ? "true" : "false");
}

function openGame(slug, push) {
  const game = findGame(games, slug);
  if (!game || !game.playable) return;
  activeSlug = game.slug;
  title.textContent = game.title;
  version.textContent = versionLabel(game) + (game.updated ? " \u00b7 updated " + game.updated : "");
  source.href = game.source_url;
  newTab.href = game.path;
  frame.title = game.title + " game";
  frame.src = game.path;
  note.textContent = "Synced from " + game.repo + " at commit " + String(game.commit).slice(0, 12) + ".";
  player.hidden = false;
  grid.hidden = true;
  if (push) {
    window.history.pushState(
      { game: game.slug },
      "",
      "play.html?game=" + encodeURIComponent(game.slug)
    );
  }
  title.focus({ preventScroll: true });
  player.scrollIntoView({ block: "start", behavior: "smooth" });
}

function closeGame(push) {
  const previous = activeSlug;
  if (push) window.history.pushState({}, "", "play.html");
  frame.src = "about:blank";
  player.hidden = true;
  grid.hidden = false;
  activeSlug = "";
  const card = previous
    ? grid.querySelector('.play-card[data-slug="' + previous + '"]')
    : null;
  if (card) {
    const play = card.querySelector("button");
    if (play) play.focus();
  }
}

function initialGame() {
  const params = new URLSearchParams(window.location.search);
  return findGame(games, params.get("game"));
}

async function boot() {
  if (!grid || !player) return;
  if (!("requestFullscreen" in Element.prototype) && fullscreen) fullscreen.hidden = true;
  try {
    const response = await window.fetch(grid.dataset.catalog || "playable.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("The game catalog could not be loaded.");
    games = gamesFromManifest(await response.json());
  } catch (error) {
    games = [];
    grid.appendChild(element("p", "play-empty", error.message));
  }
  renderCatalog();
  const requested = initialGame();
  if (requested) openGame(requested.slug, false);
}

if (back) back.addEventListener("click", function () { closeGame(true); });
if (fullscreen) fullscreen.addEventListener("click", function () {
  if (document.fullscreenElement === player) {
    document.exitFullscreen();
  } else if (player.requestFullscreen) {
    player.requestFullscreen().catch(function () {});
  }
});
document.addEventListener("fullscreenchange", updateFullscreen);
window.addEventListener("popstate", function () {
  const game = initialGame();
  if (game && game.playable) openGame(game.slug, false);
  else closeGame(false);
});
updateFullscreen();
boot();
