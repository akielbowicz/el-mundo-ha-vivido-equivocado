/**
 * check-epub.mjs
 *
 * Validates all EPUB files in dist/textos/ using epubcheck-ts.
 * Exits with code 1 if any EPUB has validation errors.
 *
 * Usage: node scripts/check-epub.mjs
 *        node scripts/check-epub.mjs --fail-on-warnings
 */

import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const EPUB_DIR = "dist/textos";
const failOnWarnings = process.argv.includes("--fail-on-warnings");

function getEpubFiles() {
  try {
    return readdirSync(EPUB_DIR).filter(f => f.endsWith(".epub"));
  } catch {
    return [];
  }
}

function validateEpub(filePath) {
  const args = ["npx", "@likecoin/epubcheck-ts", filePath];
  if (failOnWarnings) {
    args.push("--fail-on-warnings");
  } else {
    args.push("--error");
  }
  try {
    const stdout = execSync(args.join(" "), {
      stdio: "pipe",
      encoding: "utf-8",
    });
    return { ok: true, output: stdout };
  } catch (err) {
    const output = err.stderr || err.stdout || err.message;
    return { ok: false, output };
  }
}

function main() {
  const files = getEpubFiles();

  if (files.length === 0) {
    console.log("  No EPUB files found to validate");
    return;
  }

  console.log(`\n  Validating ${files.length} EPUB(s)...\n`);

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = join(EPUB_DIR, file);
    const result = validateEpub(filePath);

    if (result.ok) {
      console.log(`  ✓ ${file}`);
      passed++;
    } else {
      // Extract just the error summary from output
      const lines = result.output.split("\n").filter(l => l.trim());
      const summary = lines.filter(l => /errors|warnings|fatal/i.test(l)).join(" | ");
      console.error(`  ✗ ${file}${summary ? ` — ${summary}` : ""}`);
      failed++;
    }
  }

  console.log(`\n  ─────────────────────────────────`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`  ─────────────────────────────────\n`);

  if (failed > 0) {
    console.log("  Detailed validation output:\n");
    for (const file of files) {
      const filePath = join(EPUB_DIR, file);
      const result = validateEpub(filePath);
      if (!result.ok) {
        console.error(result.output);
      }
    }
    process.exit(1);
  }
}

main();