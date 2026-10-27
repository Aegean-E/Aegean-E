import assert from "node:assert/strict";

import {
  commitRef,
  findRepo,
  mediaPath,
  normalizeMedia,
  readmeToBlocks,
  screenshotMeta,
  takenAt,
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


equal(mediaPath("media/AIKit/logo.svg"), "media/AIKit/logo.svg", "relative media path");
equal(mediaPath("https://evil.example/x.png"), "", "absolute media URL rejected");
equal(mediaPath("media/../secret.png"), "", "traversal rejected");
equal(mediaPath("media//double.png"), "", "double slash rejected");
equal(mediaPath("img/logo.svg"), "", "path outside media rejected");
equal(mediaPath(42), "", "non-string media path rejected");

equal(commitRef("3EC859E9"), "3ec859e", "commit shortened and lower-cased");
equal(commitRef("main"), "", "branch name is not a commit");
equal(commitRef("abc"), "", "short commit rejected");
equal(takenAt("2026-10-27"), "2026-10-27", "date accepted");
equal(takenAt("2026-02-31"), "", "impossible date rejected");
equal(takenAt("27-10-2026"), "", "wrong date shape rejected");

const media = normalizeMedia(
  {
    schema: 1,
    repo: "AIKit",
    logo: { src: "media/AIKit/logo.svg", alt: "AIKit logo" },
    screenshots: [
      {
        src: "media/AIKit/dashboard.png",
        caption: "Ledger view",
        commit: "3ec859e9",
        taken_at: "2026-10-27",
        viewport: "1440x900",
        width: 1440,
        height: 900,
      },
      { src: "media/AIKit/bare.png", alt: "Bare capture" },
      { src: "https://evil.example/x.png", alt: "remote" },
      { src: "media/AIKit/no-alt.png" },
    ],
  },
  "aikit"
);
equal(media.logo.src, "media/AIKit/logo.svg", "logo kept");
equal(media.logo.alt, "AIKit logo", "logo alt kept");
equal(media.screenshots.length, 2, "unsafe and unnamed captures dropped");
equal(media.screenshots[0].alt, "Ledger view", "caption supplies alt");
equal(media.screenshots[0].commit, "3ec859e", "commit normalized");
equal(media.screenshots[0].width, 1440, "width kept");
equal(media.screenshots[1].commit, "", "missing commit stays empty");
equal(screenshotMeta(media.screenshots[0]), "commit 3ec859e \u00b7 2026-10-27 \u00b7 1440x900", "capture meta");
equal(screenshotMeta(media.screenshots[1]), "", "bare capture has no meta");

equal(normalizeMedia({ schema: 2, screenshots: [] }, "AIKit").screenshots.length, 0, "unknown schema ignored");
equal(normalizeMedia({ schema: 1, repo: "Other", screenshots: [] }, "AIKit").screenshots.length, 0, "repo mismatch ignored");
equal(normalizeMedia(null, "AIKit").logo, null, "missing manifest tolerated");

const many = normalizeMedia(
  { schema: 1, screenshots: Array.from({ length: 20 }, (_, index) => ({ src: "media/A/xx" + index + ".png", alt: "shot" })) },
  "AIKit"
);
equal(many.screenshots.length, 12, "screenshot cap");

console.log(`ok ${assertions} project-page assertions`);

