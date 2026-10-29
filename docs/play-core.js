/**
 * Pure helpers for the playable-game catalog and player labels.
 *
 * DOM-free so the play page rules stay testable in Node.
 */

export function gamesFromManifest(raw) {
  if (!raw || raw.schema !== 1 || !Array.isArray(raw.games)) return [];
  return raw.games.filter(function (game) {
    return (
      game &&
      typeof game === "object" &&
      typeof game.slug === "string" &&
      /^[a-z0-9-]+$/.test(game.slug) &&
      typeof game.title === "string" &&
      game.title.trim().length > 0
    );
  });
}

export function findGame(games, slug) {
  if (!Array.isArray(games)) return null;
  const wanted = String(slug || "").trim().toLowerCase();
  if (!wanted) return null;
  return (
    games.find(function (game) {
      return game && String(game.slug || "").toLowerCase() === wanted;
    }) || null
  );
}

export function versionLabel(game) {
  if (!game) return "";
  const version = String(game.version || "").trim();
  const commit = String(game.commit || "").trim();
  const short = commit.slice(0, 7);
  if (version && short) return "v" + version + " \u00b7 " + short;
  if (version) return "v" + version;
  if (short) return "commit " + short;
  return "";
}

export function gameStatus(game) {
  return game && game.playable ? "Play in browser" : "Run locally";
}

/**
 * Build a cache-busted iframe URL. The commit keeps normal loads versioned;
 * an optional nonce forces a retry past a cached 404.
 */
export function gameFrameUrl(game, nonce) {
  const path = String((game && game.path) || "").trim();
  if (!path) return "";
  const params = new URLSearchParams();
  const commit = String((game && game.commit) || "").trim().slice(0, 12);
  if (commit) params.set("v", commit);
  if (nonce) params.set("r", String(nonce));
  const query = params.toString();
  if (!query) return path;
  return path + (path.includes("?") ? "&" : "?") + query;
}
