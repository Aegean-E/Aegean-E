import assert from "node:assert/strict";

import {
  findGame,
  gameFrameUrl,
  gameStatus,
  gamesFromManifest,
  versionLabel,
} from "../../docs/play-core.js";

let assertions = 0;

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

const games = [
  {
    slug: "prism-relay",
    title: "Prism Relay",
    playable: true,
    version: "0.3.0",
    commit: "abcdef1234567890",
  },
  {
    slug: "crypt-crawler",
    title: "Crypt-Crawler",
    playable: false,
    version: "1.0.0",
    commit: "1234567abcdef",
  },
  {
    slug: "weft",
    title: "Weft",
    playable: true,
    version: "0.1.0",
    commit: "fedcba9876543210",
  },
];

equal(findGame(games, "prism-relay").title, "Prism Relay", "slug lookup");
equal(findGame(games, "PRISM-RELAY").title, "Prism Relay", "case-insensitive lookup");
equal(findGame(games, "../escape"), null, "unsafe slug ignored");
equal(findGame(games, ""), null, "empty slug ignored");
equal(versionLabel(games[0]), "v0.3.0 \u00b7 abcdef1", "version and short commit");
equal(versionLabel({ version: "2.0.0" }), "v2.0.0", "version without commit");
equal(versionLabel({ commit: "abcdef123456" }), "commit abcdef1", "commit without version");
equal(versionLabel(null), "", "missing game has no label");
equal(gameStatus(games[0]), "Play in browser", "browser game status");
equal(gameStatus(games[1]), "Run locally", "local game status");
equal(findGame(games, "weft").title, "Weft", "second browser game lookup");
equal(versionLabel(games[2]), "v0.1.0 \u00b7 fedcba9", "second game version and commit");
equal(gameStatus(games[2]), "Play in browser", "second browser game status");
equal(
  gameFrameUrl({ path: "play/weft/abc/index.html", commit: "abcdef1234567890" }),
  "play/weft/abc/index.html?v=abcdef123456",
  "frame URL is commit-versioned",
);
equal(
  gameFrameUrl({ path: "play/weft/abc/index.html?x=1", commit: "abcdef1234567890" }, 42),
  "play/weft/abc/index.html?x=1&v=abcdef123456&r=42",
  "frame retry adds a nonce",
);
equal(gameFrameUrl({}), "", "missing frame path is empty");
equal(gamesFromManifest({ schema: 1, games }).length, 3, "manifest games kept");
equal(gamesFromManifest({ schema: 1, games: [null, { slug: "Bad Slug" }] }), [], "invalid entries dropped");
equal(gamesFromManifest({ schema: 2, games }), [], "unknown schema ignored");
equal(gamesFromManifest(null), [], "missing manifest ignored");

console.log(`ok ${assertions} play-page assertions`);
