/**
 * patch-search-exports.mjs
 *
 * Post-processes bundled core.mjs. Adds init and init_filters to
 * search_exports so dynamic imports work correctly.
 *
 * Strategy:
 * 1. Add var init, init_filters at top level (before init_search)
 * 2. Replace 'var init_filters = function' with 'init_filters = function' inside __esm
 * 3. Replace 'var init = function' with 'init = function' inside __esm
 * 4. Add init and init_filters to the __export call
 */
import { readFileSync, writeFileSync } from "node:fs";

const path = "dist/core.mjs";
let code = readFileSync(path, "utf-8");

if (code.includes("init_filters = init_filters")) {
  console.log("✅ Already patched — skipping");
  process.exit(0);
}

// 1. Add var init, init_filters at top level
const searchExportsDecl = "var search_exports = {};";
const idx = code.indexOf(searchExportsDecl);
if (idx === -1) {
  console.log("⚠️  Could not find search_exports declaration");
  process.exit(1);
}
code = code.slice(0, idx + searchExportsDecl.length) +
  "\nvar init, init_filters;" +
  code.slice(idx + searchExportsDecl.length);

// 2. Inside the __esm callback, change var to bare assignment (so they use top-level vars)
// Find the search module's __esm block
const searchEsemStart = code.indexOf('".squint-cache/search.mjs"');
const searchEsemEnd = code.indexOf("});", searchEsemStart);
if (searchEsemStart === -1 || searchEsemEnd === -1) {
  console.log("⚠️  Could not find search module __esm block");
  process.exit(1);
}

const before = code.slice(0, searchEsemStart);
const block = code.slice(searchEsemStart, searchEsemEnd + 2);
const after = code.slice(searchEsemEnd + 2);

// Replace var declarations inside the block
const patchedBlock = block
  .replace(/var init_filters = function /g, 'init_filters = function ')
  .replace(/var init = function /g, 'init = function ');

code = before + patchedBlock + after;

// 3. Add init and init_filters to the __export call
code = code.replace(
  /__export\(search_exports,\s*\{[^}]*\}\)/,
  '__export(search_exports, { init: () => init, init_filters: () => init_filters, render_results: () => render_results })'
);

writeFileSync(path, code);
console.log("✅ Patched search_exports — added init + init_filters");