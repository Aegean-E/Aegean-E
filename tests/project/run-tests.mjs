import assert from "node:assert/strict";

import {
  findRepo,
  readmeToBlocks,
  validRepoName,
} from "../../docs/project-core.js";

let assertions = 0;

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

function check(value, message) {
  assert.ok(value, message);
  assertions += 1;
}

check(validRepoName("NeuroCore"), "plain name");
check(validRepoName("Aegean-Licensing"), "hyphen");
check(validRepoName("PNN"), "short name");
check(!validRepoName("../escape"), "path traversal rejected");
check(!validRepoName("has space"), "space rejected");
check(!validRepoName(""), "empty rejected");
assertions += 1;
check(validRepoName("memory_reconstruction"), "underscore");

const repos = [{ name: "NeuroCore" }, { name: "AIKit" }];
equal(findRepo(repos, "neurocore"), repos[0], "case-insensitive lookup");
equal(findRepo(repos, "missing"), null, "missing lookup");
equal(findRepo(repos, "../evil"), null, "unsafe lookup");

const markdown = [
  "---",
  "title: front matter",
  "---",
  "# NeuroCore",
  "",
  "An intro with [a link](https://example.com) and **bold** text.",
  "",
  "## Features",
  "",
  "- one",
  "- two",
  "",
  "1. first",
  "2. second",
  "",
  "```bash",
  "python app.py",
  "```",
  "",
  "> a quote",
  "![badge](https://img.shields.io/x)",
  "| table | skipped |",
  "<p align=\"center\"><img src=\"x\"></p>",
  "",
  "Final paragraph with <script>alert(1)</script> and `code`.",
].join("\n");

const parsed = readmeToBlocks(markdown);
const types = parsed.blocks.map((block) => block.type);
equal(
  types,
  ["heading", "paragraph", "heading", "list", "list", "code", "quote", "paragraph"],
  "README block order"
);
equal(parsed.blocks[0], { type: "heading", level: 2, text: "NeuroCore" }, "title becomes h2");
check(parsed.blocks[1].text.includes("a link") && parsed.blocks[1].text.includes("bold"), "inline links and bold flattened");
equal(parsed.blocks[2], { type: "heading", level: 3, text: "Features" }, "section heading");
equal(parsed.blocks[3].items, ["one", "two"], "unordered list");
equal(parsed.blocks[4].ordered, true, "ordered list");
equal(parsed.blocks[4].items, ["first", "second"], "ordered items");
equal(parsed.blocks[5].text, "python app.py", "code block");
equal(parsed.blocks[6].text, "a quote", "block quote");
check(!parsed.blocks.some((block) => block.text && block.text.includes("badge")), "badges skipped");
check(!parsed.blocks.some((block) => block.text && block.text.includes("table")), "tables skipped");
check(!parsed.blocks.some((block) => block.text && block.text.includes("<script>")), "html stripped");
check(parsed.blocks[7].text.includes("alert(1)"), "script text remains as text");
check(parsed.blocks[7].text.includes("code"), "inline code flattened");
check(!parsed.truncated, "full document not truncated");

const short = readmeToBlocks("one\ntwo\nthree\nfour", { maxLines: 2 });
check(short.truncated, "line cap reports truncation");
equal(short.blocks[0].text, "one two", "paragraph joins wrapped lines");

const codeOnly = readmeToBlocks("```\nunclosed\n");
equal(codeOnly.blocks[0].type, "code", "unclosed fence still renders");
equal(codeOnly.blocks[0].text, "unclosed", "unclosed code text");

equal(readmeToBlocks("").blocks, [], "empty README");
equal(readmeToBlocks("---\nonly front matter\n---").blocks, [], "front matter only");

console.log(`ok ${assertions} project-page assertions`);
