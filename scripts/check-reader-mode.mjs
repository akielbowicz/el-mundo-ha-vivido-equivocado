/**
 * check-reader-mode.mjs
 *
 * Validates that the HTML page supports Firefox Reader Mode / Readability.
 * Checks are based on Mozilla's readability algorithm requirements.
 *
 * Usage: node scripts/check-reader-mode.mjs <file>...
 */

import { readFileSync } from "node:fs";

const CHECKS = [
  {
    id: "LANG_ATTR",
    description: "<html lang=\"…\"> must be present and non-empty",
    test: (doc) => {
      const match = doc.match(/<html[^>]*\blang=["']([^"']+)["']/i);
      return match && match[1].length > 0;
    },
    severity: "error",
  },
  {
    id: "TITLE_TAG",
    description: "<title> must be present and non-empty",
    test: (doc) => {
      const match = doc.match(/<title>([^<]*)<\/title>/i);
      return match && match[1].trim().length > 0;
    },
    severity: "error",
  },
  {
    id: "META_DESCRIPTION",
    description: "<meta name=\"description\"> should be present (helps reader mode)",
    test: (doc) => {
      const match = doc.match(
        /<meta[^>]*\bname=["']description["'][^>]*>/i,
      );
      return match !== null;
    },
    severity: "warn",
  },
  {
    id: "ARTICLE_ELEMENT",
    description: "<article> should contain the main content for reader mode",
    test: (doc) => {
      const match = doc.match(/<article[\s>]/i);
      return match !== null;
    },
    severity: "warn",
  },
  {
    id: "MAIN_ELEMENT",
    description: "<main> landmark should be present",
    test: (doc) => {
      const match = doc.match(/<main[\s>]/i);
      return match !== null;
    },
    severity: "warn",
  },
  {
    id: "HEADING_HIERARCHY",
    description: "Page must have at least one <h1> (top-level heading)",
    test: (doc) => {
      const match = doc.match(/<h1[\s>]/i);
      return match !== null;
    },
    severity: "error",
  },
  {
    id: "CONTENT_LENGTH",
    description: "Page should have enough text content for reader mode to activate",
    test: (doc) => {
      const body = doc.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (!body) return false;
      const text = body[1].replace(/<[^>]+>/g, "").trim();
      return text.length > 100;
    },
    severity: "warn",
  },
  {
    id: "NO_JS_GATE",
    description: "Content should not be hidden behind JS-only rendering",
    test: (doc) => {
      // Check that the body has visible content outside a <script> tag
      const bodyContent = doc.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (!bodyContent) return false;
      const withoutScripts = bodyContent[1].replace(
        /<script[\s\S]*?<\/script>/gi,
        "",
      );
      const text = withoutScripts.replace(/<[^>]+>/g, "").trim();
      return text.length > 50;
    },
    severity: "error",
  },
  {
    id: "VIEWPORT_META",
    description: "<meta name=\"viewport\"> should be present for responsive design",
    test: (doc) => {
      const match = doc.match(
        /<meta[^>]*\bname=["']viewport["'][^>]*>/i,
      );
      return match !== null;
    },
    severity: "warn",
  },
];

function checkFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    console.error(`[FAIL] Cannot read: ${filePath}`);
    return { errors: 1, warnings: 0, fails: 1 };
  }

  let errors = 0;
  let warnings = 0;

  console.log(`\n📖 Reader Mode — ${filePath}`);
  for (const check of CHECKS) {
    const passed = check.test(content);
    const status = passed ? "✅" : "❌";
    const label = check.severity === "error" ? "ERROR" : "WARN";
    if (!passed) {
      check.severity === "error" ? errors++ : warnings++;
    }
    console.log(`  ${status} [${label}] ${check.description}`);
  }

  return { errors, warnings, fails: 0 };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/check-reader-mode.mjs <file>...");
  process.exit(1);
}

let totalErrors = 0;
let totalWarnings = 0;
let totalFails = 0;

for (const file of files) {
  const result = checkFile(file);
  totalErrors += result.errors;
  totalWarnings += result.warnings;
  totalFails += result.fails;
}

console.log(`\n─── Reader Mode Summary ───`);
console.log(`  Errors:   ${totalErrors}`);
console.log(`  Warnings: ${totalWarnings}`);
console.log(`  Failed:   ${totalFails}`);

if (totalFails > 0 || totalErrors > 0) {
  process.exit(1);
}