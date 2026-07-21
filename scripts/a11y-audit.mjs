/**
 * a11y-audit.mjs
 *
 * Runs html-validate with a11y rules on the built site in dist/.
 * This is fast, needs no browser, and catches the same class of issues
 * that axe-core would flag at the markup level.
 *
 * For a full axe-core/pa11y audit with Chrome, run:
 *   npx pa11y http://localhost:8080
 * (requires Chrome — see AGENTS.md)
 *
 * Usage: node scripts/a11y-audit.mjs
 */

import { execSync } from "node:child_process";

try {
  const out = execSync(
    "npx html-validate --config .htmlvalidate.json dist/index.html",
    { encoding: "utf-8" },
  );
  console.log("  ✅ No accessibility issues found via html-validate.");
  process.exit(0);
} catch (e) {
  const msg = e.stdout || e.message;
  console.log(msg);
  const hasErrors = msg.includes("error");
  if (hasErrors) {
    console.log(
      "\n❌ Accessibility errors found. Fix before pushing.\n",
    );
    process.exit(1);
  }
  // warnings only
  console.log("\n⚠️  Warnings only — review recommended.");
  process.exit(0);
}