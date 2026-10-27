/* Pure helpers for a local project dossier.
 * Kept separate from the DOM so the README block rules can be tested in Node.
 */

export const REPO_NAME = /^[A-Za-z0-9._-]{1,100}$/;

export function validRepoName(value) {
  return typeof value === "string" && REPO_NAME.test(value.trim());
}

export function findRepo(repos, name) {
  if (!Array.isArray(repos) || !validRepoName(name)) return null;
  const wanted = name.trim().toLowerCase();
  return (
    repos.find((repo) => typeof repo.name === "string" && repo.name.toLowerCase() === wanted) ||
    null
  );
}

function inline(text) {
  return String(text)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isBadgeLine(line) {
  return /^\s*(\[!\[|!\[|<img|<p\s+align)/i.test(line);
}

export function readmeToBlocks(markdown, { maxChars = 7000, maxLines = 160 } = {}) {
  const source = String(markdown || "").replace(/\r\n?/g, "\n");
  const lines = source.split("\n");
  if (lines[0] && lines[0].trim() === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) lines.splice(0, end + 1);
  }
  const limited = [];
  let used = 0;
  for (const line of lines) {
    if (limited.length >= maxLines || used + line.length > maxChars) break;
    limited.push(line);
    used += line.length + 1;
  }
  const blocks = [];
  let paragraph = [];
  let list = null;
  let quote = [];
  let code = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    const text = inline(paragraph.join(" "));
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  }

  function flush() {
    flushParagraph();
    if (list) {
      if (list.items.length) blocks.push(list);
      list = null;
    }
    if (quote.length) {
      const text = inline(quote.join(" "));
      if (text) blocks.push({ type: "quote", text });
      quote = [];
    }
  }

  for (const raw of limited) {
    const line = raw.replace(/\s+$/g, "");
    if (code !== null) {
      if (/^\s*```/.test(line)) {
        blocks.push({ type: "code", text: code.join("\n").replace(/\n+$/, "") });
        code = null;
      } else {
        code.push(raw);
      }
      continue;
    }
    if (/^\s*```/.test(line)) {
      flush();
      code = [];
      continue;
    }
    if (isBadgeLine(line) || /^\s*\|/.test(line)) {
      flush();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flush();
      const text = inline(heading[2]);
      if (text) {
        blocks.push({
          type: "heading",
          level: Math.min(4, heading[1].length + 1),
          text,
        });
      }
      continue;
    }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      flush();
      blocks.push({ type: "rule" });
      continue;
    }
    const listItem = line.match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
    if (listItem) {
      flushParagraph();
      if (quote.length) flush();
      const ordered = /^\d/.test(listItem[1]);
      if (!list || list.ordered !== ordered) {
        if (list) blocks.push(list);
        list = { type: "list", ordered, items: [] };
      }
      const text = inline(listItem[2]);
      if (text) list.items.push(text);
      continue;
    }
    const quoteLine = line.match(/^\s*>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph();
      if (list) {
        blocks.push(list);
        list = null;
      }
      quote.push(quoteLine[1]);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^\s*<\/?(?:p|div|details|summary|picture|source|a|h[1-6])\b/i.test(line)) {
      flush();
      continue;
    }
    if (list) {
      blocks.push(list);
      list = null;
    }
    if (quote.length) flush();
    paragraph.push(line);
  }
  if (code !== null && code.length) blocks.push({ type: "code", text: code.join("\n").replace(/\n+$/, "") });
  flush();
  return {
    blocks,
    truncated: limited.length < lines.length,
  };
}
