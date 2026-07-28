/**
 * utils.test.mjs — Unit tests for lib/utils.mjs
 *
 * Run: node --test scripts/lib/utils.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  slugify,
  formatDate,
  escapeHtml,
  renderTemplate,
  formatTag,
} from "./utils.mjs";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    assert.equal(slugify("El Aleph"), "el-aleph");
  });

  it("removes diacritics", () => {
    assert.equal(slugify("José Hernández"), "jose-hernandez");
    assert.equal(slugify("Märchen"), "marchen");
    assert.equal(slugify("François"), "francois");
  });

  it("collapses multiple separators", () => {
    assert.equal(slugify("Hello   World"), "hello-world");
    assert.equal(slugify("a--b---c"), "a-b-c");
  });

  it("strips leading and trailing hyphens", () => {
    assert.equal(slugify("  hello  "), "hello");
    assert.equal(slugify("-hello-"), "hello");
    assert.equal(slugify("--hello--"), "hello");
  });

  it("handles special characters", () => {
    assert.equal(slugify("¿Qué es esto?"), "que-es-esto");
    assert.equal(slugify("¡Hola! ¿Cómo estás?"), "hola-como-estas");
  });

  it("handles empty and minimal input", () => {
    assert.equal(slugify(""), "");
    assert.equal(slugify("a"), "a");
    assert.equal(slugify("A"), "a");
  });

  it("handles numbers", () => {
    assert.equal(slugify("Episodio 1"), "episodio-1");
  });
});

describe("formatDate", () => {
  it("formats a date in Spanish", () => {
    assert.equal(formatDate("2026-07-21"), "21 de julio de 2026");
  });

  it("produces same result under any timezone", () => {
    // Run with different TZ values to verify no timezone-dependent shift
    const results = [
      formatDate("2026-07-21"),
      formatDate("2026-01-01"),
      formatDate("2025-12-31"),
    ];
    assert.equal(results[0], "21 de julio de 2026");
    assert.equal(results[1], "1 de enero de 2026");
    assert.equal(results[2], "31 de diciembre de 2025");
  });

  it("throws on invalid date format", () => {
    assert.throws(() => formatDate("2026-7-21"), /Invalid date format/);
    assert.throws(() => formatDate("21-07-2026"), /Invalid date format/);
    assert.throws(() => formatDate("2026/07/21"), /Invalid date format/);
    assert.throws(() => formatDate("not-a-date"), /Invalid date format/);
    assert.throws(() => formatDate(""), /Invalid date format/);
  });
});

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    assert.equal(escapeHtml("a & b"), "a &amp; b");
  });

  it("escapes angle brackets", () => {
    assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  });

  it("escapes double quotes", () => {
    assert.equal(escapeHtml('say "hello"'), "say &quot;hello&quot;");
  });

  it("handles mixed content", () => {
    assert.equal(
      escapeHtml('<a href="x&y">'),
      "&lt;a href=&quot;x&amp;y&quot;&gt;",
    );
  });

  it("handles empty and non-string input", () => {
    assert.equal(escapeHtml(""), "");
    assert.equal(escapeHtml(42), "42");
    assert.equal(escapeHtml(null), "null");
    assert.equal(escapeHtml(undefined), "undefined");
  });
});

describe("renderTemplate", () => {
  it("substitutes simple variables", () => {
    const result = renderTemplate("<h1>{{title}}</h1>", { title: "El Aleph" });
    assert.equal(result, "<h1>El Aleph</h1>");
  });

  it("HTML-escapes variable values", () => {
    const result = renderTemplate("<p>{{content}}</p>", {
      content: '<script>alert("x")</script>',
    });
    assert.equal(result, "<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p>");
  });

  it("renders raw (unescaped) with triple braces", () => {
    const result = renderTemplate("<div>{{{body}}}</div>", {
      body: "<p>Hello</p>",
    });
    assert.equal(result, "<div><p>Hello</p></div>");
  });

  it("handles conditional blocks (truthy)", () => {
    const template = "{{#show}}visible{{/show}}";
    assert.equal(renderTemplate(template, { show: true }), "visible");
    assert.equal(renderTemplate(template, { show: "yes" }), "visible");
    assert.equal(renderTemplate(template, { show: 1 }), "visible");
  });

  it("hides conditional blocks (falsy)", () => {
    const template = "{{#show}}hidden{{/show}}";
    assert.equal(renderTemplate(template, { show: false }), "");
    assert.equal(renderTemplate(template, { show: "" }), "");
    assert.equal(renderTemplate(template, { show: null }), "");
    assert.equal(renderTemplate(template, { show: undefined }), "");
  });

  it("nests conditional blocks", () => {
    const template = "{{#outer}}{{#inner}}nested{{/inner}}{{/outer}}";
    assert.equal(renderTemplate(template, { outer: {}, inner: {} }), "nested");
    assert.equal(renderTemplate(template, { outer: { inner: {} } }), "nested");
  });

  it("passes GLOBAL_PLAYER marker through unchanged", () => {
    const result = renderTemplate("before {{GLOBAL_PLAYER}} after", {});
    assert.equal(result, "before {{GLOBAL_PLAYER}} after");
  });

  it("replaces unknown variables with empty string", () => {
    const result = renderTemplate("<p>{{missing}}</p>", {});
    assert.equal(result, "<p></p>");
  });
});

describe("formatTag", () => {
  it("replaces hyphens with spaces and capitalizes", () => {
    assert.equal(formatTag("realismo-magico"), "Realismo Magico");
  });

  it("capitalizes first letter", () => {
    assert.equal(formatTag("realismo"), "Realismo");
  });

  it("handles single word", () => {
    assert.equal(formatTag("fantasia"), "Fantasia");
  });
});