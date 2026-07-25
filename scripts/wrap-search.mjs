/**
 * wrap-search.mjs — Takes squint-compiled search.mjs, produces a clean ES module
 * that sets window.__searchInit and window.__searchFilters.
 *
 * The squint compiler wraps code in a function that's never called when loaded
 * as a module script. This wrapper extracts the needed function definitions
 * and exposes them at the module top level.
 */
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(".squint-cache/search.mjs", "utf-8");
const outPath = "dist/search.mjs";

// Extract the squint runtime import
const importLine = src.match(/^import .+$/m)?.[0] || "";

// Find all var declarations at the top level of the compiled output
// squint generates: var name = function(...) { ... };
// We need to keep these and strip the wrapping function

// Strategy: The squint output has the structure:
// import * as squint_core from '...';
// var func1 = function() { ... };
// var func2 = function() { ... };
// ...
// (function() {  // wrapper starts here
//   ... set! calls ...
// })();

// We need to keep the squint runtime via a bundle step
// Better approach: use esbuild's output but extract the window assignments

// Read the esbuild-bundled output
const bundled = readFileSync(outPath, "utf-8");

// The bundled output has everything but the window assignments are inside
// a wrapping function. We need to find them and move them to the top level.

// Find the functions we need to expose
let result = bundled;

// Helper: check if a line is inside a wrapper function
// by looking at the indentation level

// Find patterns like "    window.__searchInit = init;"
// and extract them, removing the leading whitespace
const patterns = [
  /^\s+window\.__searchInit\s*=\s*init\s*;/m,
  /^\s+window\.__searchFilters\s*=\s*init_filters\s*;/m,
  /^\s+(?:return\s+)?console\.info\(["']search module ready["'][^;]*;/m,
];

let modified = bundled;
for (const pat of patterns) {
  const match = modified.match(pat);
  if (match) {
    const stripped = match[0].trim();
    // Remove from current location
    modified = modified.replace(pat, "");
    // Add at module top level (right before the first export or at end)
    const exportIdx = modified.lastIndexOf("export {");
    const insertPos = exportIdx >= 0 ? exportIdx : modified.length;
    modified = modified.slice(0, insertPos) + stripped + "\n" + modified.slice(insertPos);
  }
}

// Now we need to make sure 'init' and 'init_filters' are accessible at module level
// They should be 'var' declarations. If they're inside a function, we need to move them too.

writeFileSync(outPath, modified);
console.log("✅ Patched search.mjs: window assignments at module top level");