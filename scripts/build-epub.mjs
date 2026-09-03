/**
 * build-epub.mjs
 *
 * Generates EPUB files for each texto in textos/ using pandoc.
 * Output: dist/textos/<slug>.epub
 *
 * Requires: pandoc (see CI workflow / scripts/build-show.mjs)
 *
 * Usage: node scripts/build-epub.mjs
 */

import { readFileSync, mkdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import yaml from "gray-matter";
import { slugify } from "./lib/utils.mjs";

const TEXTOS_DIR = "sitio/textos";
const DIST_DIR = "dist";
const EPUB_DIR = join(DIST_DIR, "textos");
const EPUB_CSS = resolve("scripts/epub-style.css");

function pandocAvailable() {
  try {
    execSync("command -v pandoc", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/* ── Main ──────────────────────────────── */

async function main() {
  let files;
  try {
    files = (await readdir(TEXTOS_DIR)).filter(f => f.endsWith(".md"));
  } catch {
    console.log("  No textos/ directory found — skipping EPUB generation");
    return;
  }

  if (!pandocAvailable()) {
    console.log("  ⚠  pandoc no instalado — salteando EPUBs");
    return;
  }

  if (files.length === 0) {
    console.log("  No texto files found in textos/");
    return;
  }

  mkdirSync(EPUB_DIR, { recursive: true });

  let count = 0;

  for (const file of files) {
    const path = join(TEXTOS_DIR, file);
    const raw = readFileSync(path, "utf-8");
    const { data: fm } = yaml(raw);

    // Skip drafts
    const textoStatus = (fm.status || "published").toLowerCase();
    if (textoStatus !== "published") {
      console.log(`  - ${file}: status "${fm.status || ""}" — skipped`);
      continue;
    }

    // Validate required fields
    if (!fm.title || !fm.author) {
      console.warn(`  ⚠ ${file}: missing title or author — skipping`);
      continue;
    }

    const slug = fm.slug || slugify(fm.title);

    const outputPath = resolve(join(EPUB_DIR, `${slug}.epub`));

    // pandoc reads title/author/date from YAML front matter directly.
    // --epub-title-page=false: no separate title page (the body has its own title).
    try {
      execSync(
        `pandoc "${path}" -f markdown -o "${outputPath}" ` +
        `--epub-title-page=false --split-level=1 ` +
        `--metadata lang=es --metadata publisher="El mundo ha vivido equivocado" ` +
        `--css "${EPUB_CSS}"`,
        { stdio: "pipe" }
      );
      console.log(`  ✓ ${slug}.epub — ${fm.title}`);
      count++;
    } catch (err) {
      console.error(`  ❌ ${slug}.epub — ${err.stderr?.toString() || err.message}`);
    }
  }

  console.log(`  ✓ ${count} EPUB(s) generated`);
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});