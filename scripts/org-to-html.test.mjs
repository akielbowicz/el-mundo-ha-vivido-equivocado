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

    it("converts level-3 heading to h4", () => {
      const result = orgToHtml("*** Subsubtitle");
      assert.match(result, /<h4>Subsubtitle<\/h4>/);
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
      assert.match(result, /<td>Age<\/td>/);
      assert.match(result, /<td>Alice<\/td>/);
      assert.match(result, /<td>30<\/td>/);
    });

    it("skips separator rows", () => {
      const result = orgToHtml("| H1 | H2 |\n|---+---|\n| V1 | V2 |");
      assert.match(result, /<td>H1<\/td>/);
      assert.match(result, /<td>V1<\/td>/);
      // Only 2 rows (header + value), separator is skipped
      const tdCount = (result.match(/<td>/g) || []).length;
      assert.equal(tdCount, 4);
    });

    it("normalizes ragged rows", () => {
      const result = orgToHtml("| A | B | C |\n| D | E |");
      // Both rows should have 3 cells
      const tdCount = (result.match(/<td>/g) || []).length;
      assert.equal(tdCount, 6);
    });
  });

  describe("lists", () => {
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

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      assert.equal(orgToHtml(""), "");
    });

    it("returns empty string for whitespace-only input", () => {
      assert.equal(orgToHtml("   \n\n  "), "");
    });

    it("handles mixed content", () => {
      const input = "* Title\n\nFirst paragraph with [[https://x.com][a link]].\n\n- List item";
      const result = orgToHtml(input);
      assert.match(result, /<h2>Title<\/h2>/);
      assert.match(result, /<p>First paragraph with <a href="https:\/\/x\.com">a link<\/a>\.<\/p>/);
      assert.match(result, /<li>List item<\/li>/);
    });
  });
});