/**
 * org-to-html.mjs
 *
 * Minimal org-mode → HTML converter for the subset of org-mode
 * used in this project: headings, tables (with header support),
 * unordered/ordered lists, links, fixed-width blocks, paragraphs,
 * and inline formatting (bold, italic, code).
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

/**
 * Tokenize inline content: links, bare URLs, bold (*text*), italic (/text/),
 * code (=text=, ~text~). Unmatched delimiters render literally.
 */
function tokenizeInline(text) {
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const remaining = text.slice(i);

    // Org-mode link [[href][label]]
    const linkMatch = remaining.match(/^\[\[([^\]]+)\]\[([^\]]*)\]\]/);
    if (linkMatch) {
      tokens.push({ type: "link", href: linkMatch[1].replace(/^file:/, ""), label: linkMatch[2] || linkMatch[1] });
      i += linkMatch[0].length;
      continue;
    }

    // Bold: *text* (not ** which is heading syntax, already handled by parser)
    const boldMatch = remaining.match(/^\*(\S[\s\S]*?\S|\S)\*(?!\w)/);
    if (boldMatch && !remaining.startsWith("**")) {
      tokens.push({ type: "bold", content: tokenizeInline(boldMatch[1]) });
      i += boldMatch[0].length;
      continue;
    }

    // Italic: /text/ (not preceded by word char, to avoid matching URLs)
    const italicMatch = remaining.match(/^\/(\S[\s\S]*?\S|\S)\/(?!\w)/);
    if (italicMatch && i > 0 && !/\w/.test(text[i - 1])) {
      tokens.push({ type: "italic", content: tokenizeInline(italicMatch[1]) });
      i += italicMatch[0].length;
      continue;
    }
    // Italic at start of string
    if (italicMatch && i === 0) {
      tokens.push({ type: "italic", content: tokenizeInline(italicMatch[1]) });
      i += italicMatch[0].length;
      continue;
    }

    // Code: =text= or ~text~
    const codeMatch = remaining.match(/^[=~]([^=~]+)[=~]/);
    if (codeMatch) {
      tokens.push({ type: "code", content: codeMatch[1] });
      i += codeMatch[0].length;
      continue;
    }

    // Bare URL
    const urlMatch = remaining.match(/^(https?:\/\/[^\s<]+)/);
    if (urlMatch) {
      tokens.push({ type: "link", href: urlMatch[1], label: urlMatch[1] });
      i += urlMatch[0].length;
      continue;
    }

    // Plain character
    tokens.push({ type: "text", value: text[i] });
    i++;
  }

  return tokens;
}

function renderInlineTokens(tokens) {
  return tokens.map(t => {
    switch (t.type) {
      case "link":
        return `<a href="${escapeHtml(t.href)}">${escapeHtml(t.label)}</a>`;
      case "bold":
        return `<strong>${renderInlineTokens(t.content)}</strong>`;
      case "italic":
        return `<em>${renderInlineTokens(t.content)}</em>`;
      case "code":
        return `<code>${escapeHtml(t.content)}</code>`;
      default:
        return escapeHtml(t.value);
    }
  }).join("");
}

function renderInline(text) {
  return renderInlineTokens(tokenizeInline(text));
}

/* ── Parsing ─────────────────────────────── */

/**
 * Parse org-mode text into an array of block objects:
 *   { type: "heading", level: 1..6, text: "..." }
 *   { type: "table", rows: [["cell1","cell2"], ...], hasHeader: bool }
 *   { type: "ordered-list", items: ["item1", "item2"] }
 *   { type: "unordered-list", items: ["item1", "item2"] }
 *   { type: "fixed-width", text: "..." }
 *   { type: "paragraph", text: "..." }
 *   { type: "blank" }
 */
function parseOrg(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;

  let currentPara = [];
  let currentUnordered = [];
  let currentOrdered = [];
  let currentFixedLines = [];

  function flushParagraph() {
    if (currentPara.length > 0) {
      blocks.push({ type: "paragraph", text: currentPara.join(" ") });
      currentPara = [];
    }
  }

  function flushUnorderedList() {
    if (currentUnordered.length > 0) {
      blocks.push({ type: "unordered-list", items: currentUnordered });
      currentUnordered = [];
    }
  }

  function flushOrderedList() {
    if (currentOrdered.length > 0) {
      blocks.push({ type: "ordered-list", items: currentOrdered });
      currentOrdered = [];
    }
  }

  function flushList() {
    flushUnorderedList();
    flushOrderedList();
  }

  function flushFixedWidth() {
    if (currentFixedLines.length > 0) {
      blocks.push({ type: "fixed-width", text: currentFixedLines.join("\n") });
      currentFixedLines = [];
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
      flushFixedWidth();
      blocks.push({ type: "heading", level: headingMatch[1].length, text: headingMatch[2] });
      i++;
      continue;
    }

    // Table row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushParagraph();
      flushList();
      flushFixedWidth();
      // Separator row (|---+---|---|) — marks previous rows as header
      if (/^[\s|:\-+]+$/.test(trimmed)) {
        const last = blocks[blocks.length - 1];
        if (last && last.type === "table" && !last.hasHeader) {
          last.hasHeader = true;
        }
        i++;
        continue;
      }
      const cells = trimmed.split("|").slice(1, -1).map(c => c.trim());
      const last = blocks[blocks.length - 1];
      if (last && last.type === "table") {
        last.rows.push(cells);
      } else {
        blocks.push({ type: "table", rows: [cells], hasHeader: false });
      }
      i++;
      continue;
    }

    // Fixed-width line (colon followed by space)
    if (trimmed.startsWith(": ")) {
      flushParagraph();
      flushList();
      currentFixedLines.push(trimmed.slice(2));
      i++;
      continue;
    }

    // Unordered list item
    if (trimmed.match(/^[-+]\s+/)) {
      flushParagraph();
      flushOrderedList();
      flushFixedWidth();
      currentUnordered.push(trimmed.replace(/^[-+]\s+/, ""));
      i++;
      continue;
    }

    // Ordered list item (number followed by dot or paren)
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      flushUnorderedList();
      flushFixedWidth();
      currentOrdered.push(olMatch[1]);
      i++;
      continue;
    }

    // Blank line
    if (trimmed === "") {
      flushParagraph();
      flushList();
      flushFixedWidth();
      i++;
      continue;
    }

    // Ordinary text line — accumulate into paragraph
    currentPara.push(trimmed);
    i++;
  }

  flushParagraph();
  flushList();
  flushFixedWidth();

  // Normalize ragged table rows
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
        const level = Math.min(block.level + 1, 6);
        html += `<h${level}>${renderInline(block.text)}</h${level}>\n`;
        break;
      }
      case "table": {
        html += "<table>\n";
        for (let ri = 0; ri < block.rows.length; ri++) {
          const row = block.rows[ri];
          html += "  <tr>";
          const isHeader = block.hasHeader && ri === 0;
          for (const cell of row) {
            const tag = isHeader ? "th" : "td";
            html += `<${tag}>${renderInline(cell)}</${tag}>`;
          }
          html += "</tr>\n";
        }
        html += "</table>\n";
        break;
      }
      case "unordered-list": {
        html += "<ul>\n";
        for (const item of block.items) {
          html += `  <li>${renderInline(item)}</li>\n`;
        }
        html += "</ul>\n";
        break;
      }
      case "ordered-list": {
        html += "<ol>\n";
        for (const item of block.items) {
          html += `  <li>${renderInline(item)}</li>\n`;
        }
        html += "</ol>\n";
        break;
      }
      case "fixed-width": {
        html += `<pre>${escapeHtml(block.text)}</pre>\n`;
        break;
      }
      case "paragraph": {
        html += `<p>${renderInline(block.text)}</p>\n`;
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