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

  // Fecha concreta de la próxima emisión, calculada en build time, para que
  // también los visitantes sin JS la vean (JS la recalcula en runtime).
  const { nextBroadcast, formatNextEmission } = await import("../src/live-schedule.js");
  const { startsAt } = nextBroadcast(new Date());
  const fecha = formatNextEmission(startsAt, {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  const STATIC_TEXT = "Jueves 19:00 (UTC-3)";
  const BAKED_TEXT = `${fechaCap} (Argentina)`;

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    let updated = content;
    if (content.includes(STATIC_TEXT)) {
      updated = updated.replaceAll(STATIC_TEXT, BAKED_TEXT);
    }
    if (content.includes("{{GLOBAL_PLAYER}}")) {
      updated = updated.replace("{{GLOBAL_PLAYER}}", PLAYER_HTML);
    }
    if (updated !== content) {
      writeFileSync(file, updated);
      console.log(`  ✓ inyectado en ${file.replace(DIST_DIR + "/", "")}`);
      count++;
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