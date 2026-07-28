/**
 * org-to-html.test.mjs — Unit tests for org-to-html.mjs
 *
 * Run: node --test scripts/org-to-html.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { orgToHtml } from "./org-to-html.mjs";

describe("orgToHtml", () => {
  describe("headings", () => {
    it("converts level-1 heading to h2 (shifted down)", () => {
      const result = orgToHtml("* Title");
      assert.match(result, /<h2>Title<\/h2>/);
    });

    it("converts level-2 heading to h3", () => {
      const result = orgToHtml("** Subtitle");
      assert.match(result, /<h3>Subtitle<\/h3>/);
    });

    it("caps at h6 for deep headings", () => {
      const result = orgToHtml("****** Deep");
      assert.match(result, /<h6>Deep<\/h6>/);
    });

    it("escapes HTML in heading text", () => {
      const result = orgToHtml("* <script>alert('x')</script>");
      assert.match(result, /&lt;script&gt;/);
      assert.doesNotMatch(result, /<script>/);
    });
  });

  describe("paragraphs", () => {
    it("wraps text in <p> tags", () => {
      const result = orgToHtml("Hello world");
      assert.match(result, /<p>Hello world<\/p>/);
    });

    it("joins consecutive lines into one paragraph", () => {
      const result = orgToHtml("Line one\nLine two");
      assert.match(result, /<p>Line one Line two<\/p>/);
    });

    it("splits paragraphs on blank lines", () => {
      const result = orgToHtml("First\n\nSecond");
      assert.match(result, /<p>First<\/p>\n<p>Second<\/p>/);
    });

    it("escapes HTML in paragraph text", () => {
      const result = orgToHtml("<b>bold</b>");
      assert.match(result, /&lt;b&gt;bold&lt;\/b&gt;/);
    });
  });

  describe("inline formatting", () => {
    it("renders *bold* as <strong>", () => {
      const result = orgToHtml("This is *bold* text");
      assert.match(result, /<strong>bold<\/strong>/);
    });

    it("renders /italic/ as <em>", () => {
      const result = orgToHtml("This is /italic/ text");
      assert.match(result, /<em>italic<\/em>/);
    });

    it("renders =code= as <code>", () => {
      const result = orgToHtml("Use =npm install= to install");
      assert.match(result, /<code>npm install<\/code>/);
    });

    it("renders ~code~ as <code>", () => {
      const result = orgToHtml("The `~foo~` variable");
      assert.match(result, /<code>foo<\/code>/);
    });

    it("handles bold with multi-word content", () => {
      const result = orgToHtml("*El Aleph* is a story");
      assert.match(result, /<strong>El Aleph<\/strong>/);
    });

    it("escapes HTML inside bold", () => {
      const result = orgToHtml("*<b>test</b>*");
      assert.match(result, /<strong>&lt;b&gt;test&lt;\/b&gt;<\/strong>/);
    });
  });

  describe("links", () => {
    it("renders org-mode links as HTML anchors", () => {
      const result = orgToHtml("[[https://example.com][Example]]");
      assert.match(result, /<a href="https:\/\/example\.com">Example<\/a>/);
    });

    it("renders bare URLs as links", () => {
      const result = orgToHtml("Visit https://example.com today");
      assert.match(result, /Visit <a href="https:\/\/example\.com">https:\/\/example\.com<\/a> today/);
    });

    it("escapes link href and label", () => {
      const result = orgToHtml('[[https://x.com?q="a"][A & B]]');
      assert.match(result, /href="https:\/\/x\.com\?q=&quot;a&quot;"/);
      assert.match(result, />A &amp; B</);
    });
  });

  describe("tables", () => {
    it("parses a simple table", () => {
      const result = orgToHtml("| Name | Age |\n| Alice | 30 |");
      assert.match(result, /<table>/);
      assert.match(result, /<td>Name<\/td>/);
      assert.match(result, /<td>Alice<\/td>/);
    });

    it("renders first row as <th> when separator is present", () => {
      const result = orgToHtml("| Name | Age |\n|---+---|\n| Alice | 30 |");
      assert.match(result, /<th>Name<\/th>/);
      assert.match(result, /<th>Age<\/th>/);
      assert.match(result, /<td>Alice<\/td>/);
      assert.match(result, /<td>30<\/td>/);
    });

    it("normalizes ragged rows", () => {
      const result = orgToHtml("| A | B | C |\n| D | E |");
      const tdCount = (result.match(/<td>/g) || []).length;
      assert.equal(tdCount, 6);
    });
  });

  describe("ordered lists", () => {
    it("renders ordered list items", () => {
      const result = orgToHtml("1. First item\n2. Second item\n3. Third item");
      assert.match(result, /<ol>/);
      assert.match(result, /<li>First item<\/li>/);
      assert.match(result, /<li>Second item<\/li>/);
      assert.match(result, /<li>Third item<\/li>/);
      assert.match(result, /<\/ol>/);
    });

    it("supports paren-style numbering", () => {
      const result = orgToHtml("1) One\n2) Two");
      assert.match(result, /<li>One<\/li>/);
      assert.match(result, /<li>Two<\/li>/);
    });
  });

  describe("unordered lists", () => {
    it("renders unordered list items", () => {
      const result = orgToHtml("- Item one\n- Item two");
      assert.match(result, /<ul>/);
      assert.match(result, /<li>Item one<\/li>/);
      assert.match(result, /<li>Item two<\/li>/);
    });

    it("handles plus-style list items", () => {
      const result = orgToHtml("+ Item");
      assert.match(result, /<li>Item<\/li>/);
    });
  });

  describe("fixed-width blocks", () => {
    it("renders lines starting with ': ' as <pre>", () => {
      const result = orgToHtml(": **Mail:** hola@ejemplo.com");
      assert.match(result, /<pre>/);
      assert.match(result, /\*\*Mail:\*\*/);
    });

    it("handles multi-line fixed-width", () => {
      const result = orgToHtml(": Line one\n: Line two");
      assert.match(result, /<pre>Line one\nLine two<\/pre>/);
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      assert.equal(orgToHtml(""), "");
    });

    it("returns empty string for whitespace-only input", () => {
      assert.equal(orgToHtml("   \n\n  "), "");
    });

    it("handles mixed content matching real-world usage", () => {
      const input = [
        "* Title",
        "",
        "Text with *bold* and /italic/.",
        "",
        "- List item",
        "- Another item",
        "",
        "1. First ordered",
        "2. Second ordered",
        "",
        "| Header 1 | Header 2 |",
        "|---+---|",
        "| Cell 1 | Cell 2 |",
        "",
        ": : fixed width content",
        "",
        "Visit https://example.com",
      ].join("\n");

      const result = orgToHtml(input);
      assert.match(result, /<h2>Title<\/h2>/);
      assert.match(result, /<strong>bold<\/strong>/);
      assert.match(result, /<em>italic<\/em>/);
      assert.match(result, /<ul>/);
      assert.match(result, /<ol>/);
      assert.match(result, /<th>Header 1<\/th>/);
      assert.match(result, /<td>Cell 1<\/td>/);
      assert.match(result, /<pre>/);
      assert.match(result, /<a href="https:\/\/example\.com">/);
    });
  });
});