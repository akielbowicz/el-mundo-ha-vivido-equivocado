/**
 * org-to-html.mjs
 *
 * Minimal org-mode → HTML converter for the subset of org-mode
 * used in this project: headings, tables, unordered lists, links, and paragraphs.
 *
 * Usage: import { orgToHtml } from "./org-to-html.mjs";
 */

/* ── Helpers ─────────────────────────────── */

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLinks(text) {
  // text is raw (unescaped). Split into link and non-link parts,
  // escape each appropriately.
  //
  // Strategy: tokenize — find all matches, then rebuild the string
  // escaping non-link text and properly escaping link hrefs/labels.

  const tokens = [];
  let lastIndex = 0;

  // Match org-mode links
  const linkRegex = /\[\[([^\]]+)\]\[([^\]]*)\]\]/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    // Non-link text before this match
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const href = match[1].replace(/^file:/, "");
    const label = match[2] || match[1];
    tokens.push({ type: "link", href, label });
    lastIndex = match.index + match[0].length;
  }

  // Match bare URLs in remaining text
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const remaining = text.slice(lastIndex);
  let urlMatch;
  let urlLast = 0;
  while ((urlMatch = urlRegex.exec(remaining)) !== null) {
    if (urlMatch.index > urlLast) {
      tokens.push({ type: "text", value: remaining.slice(urlLast, urlMatch.index) });
    }
    tokens.push({ type: "link", href: urlMatch[1], label: urlMatch[1] });
    urlLast = urlMatch.index + urlMatch[0].length;
  }
  if (urlLast < remaining.length) {
    tokens.push({ type: "text", value: remaining.slice(urlLast) });
  }

  // Build result
  return tokens.map(t => {
    if (t.type === "link") {
      return `<a href="${escapeHtml(t.href)}">${escapeHtml(t.label)}</a>`;
    }
    return escapeHtml(t.value);
  }).join("");
}

/* ── Parsing ─────────────────────────────── */

/**
 * Parse org-mode text into an array of block objects:
 *   { type: "heading", level: 1..6, text: "..." }
 *   { type: "table", rows: [["cell1","cell2"], ...] }
 *   { type: "list", items: ["item1", "item2"] }
 *   { type: "paragraph", text: "..." }
 *   { type: "blank" }
 */
function parseOrg(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;

  function flushParagraph() {
    if (currentPara.length > 0) {
      blocks.push({ type: "paragraph", text: currentPara.join(" ") });
      currentPara = [];
    }
  }

  let currentPara = [];
  let currentList = [];

  function flushList() {
    if (currentList.length > 0) {
      blocks.push({ type: "list", items: currentList });
      currentList = [];
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Heading
    const headingMatch = trimmed.match(/^(\*+)\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      blocks.push({ type: "heading", level, text });
      i++;
      continue;
    }

    // Table row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushParagraph();
      flushList();
      // Skip separator rows (|---+---|---|)
      if (/^[\s|:\-+]+$/.test(trimmed)) {
        i++;
        continue;
      }
      const cells = trimmed
        .split("|")
        .slice(1, -1)
        .map(c => c.trim());
      // Find or create last table block
      const last = blocks[blocks.length - 1];
      if (last && last.type === "table") {
        last.rows.push(cells);
      } else {
        blocks.push({ type: "table", rows: [cells] });
      }
      i++;
      continue;
    }

    // Unordered list item
    if (trimmed.match(/^[-+]\s+/)) {
      flushParagraph();
      const itemText = trimmed.replace(/^[-+]\s+/, "");
      currentList.push(itemText);
      i++;
      continue;
    }

    // Blank line
    if (trimmed === "") {
      flushParagraph();
      flushList();
      i++;
      continue;
    }

    // Ordinary text line — accumulate into paragraph
    currentPara.push(trimmed);
    i++;
  }

  flushParagraph();
  flushList();

  // Normalize ragged table rows: pad/truncate each row to max column count
  for (const block of blocks) {
    if (block.type === "table" && block.rows.length > 0) {
      const maxCols = Math.max(...block.rows.map(r => r.length));
      for (const row of block.rows) {
        while (row.length < maxCols) row.push("");
        if (row.length > maxCols) row.length = maxCols;
      }
    }
  }

  return blocks;
}

/* ── Rendering ───────────────────────────── */

function renderBlocks(blocks) {
  let html = "";

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const level = Math.min(block.level, 6);
        html += `<h${level}>${escapeHtml(block.text)}</h${level}>\n`;
        break;
      }
      case "table": {
        html += "<table>\n";
        for (const row of block.rows) {
          html += "  <tr>";
          for (const cell of row) {
            const tag = "td";
            html += `<${tag}>${renderLinks(cell)}</${tag}>`;
          }
          html += "</tr>\n";
        }
        html += "</table>\n";
        break;
      }
      case "list": {
        html += "<ul>\n";
        for (const item of block.items) {
          html += `  <li>${renderLinks(item)}</li>\n`;
        }
        html += "</ul>\n";
        break;
      }
      case "paragraph": {
        html += `<p>${renderLinks(block.text)}</p>\n`;
        break;
      }
    }
  }

  return html;
}

/* ── Public API ──────────────────────────── */

export function orgToHtml(orgText) {
  const blocks = parseOrg(orgText);
  return renderBlocks(blocks);
}