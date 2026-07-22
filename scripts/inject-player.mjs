/**
 * inject-player.mjs
 *
 * Post-build: replace {{GLOBAL_PLAYER}} placeholders in HTML files
 * with the content of scripts/global-player.html.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const PLAYER_HTML = readFileSync("scripts/global-player.html", "utf-8");
const DIST_DIR = "dist";

async function findHtmlFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(... await findHtmlFiles(full));
    } else if (entry.isFile() && extname(entry.name) === ".html") {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  const files = await findHtmlFiles(DIST_DIR);
  let count = 0;
  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    if (content.includes("{{GLOBAL_PLAYER}}")) {
      const updated = content.replace("{{GLOBAL_PLAYER}}", PLAYER_HTML);
      if (updated !== content) {
        writeFileSync(file, updated);
        console.log(`  ✓ injected player into ${file.replace(DIST_DIR + "/", "")}`);
        count++;
      }
    }
  }
  if (count === 0) {
    console.log("  No files needed player injection");
  }
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});