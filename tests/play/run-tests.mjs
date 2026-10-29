import assert from "node:assert/strict";

import {
  findGame,
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
equal(gamesFromManifest({ schema: 1, games }).length, 2, "manifest games kept");
equal(gamesFromManifest({ schema: 1, games: [null, { slug: "Bad Slug" }] }), [], "invalid entries dropped");
equal(gamesFromManifest({ schema: 2, games }), [], "unknown schema ignored");
equal(gamesFromManifest(null), [], "missing manifest ignored");

console.log(`ok ${assertions} play-page assertions`);
