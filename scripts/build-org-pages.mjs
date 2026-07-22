/**
 * build-org-pages.mjs
 *
 * Reads .org files from materiales/ and programa/, converts them to HTML,
 * and writes pages to dist/ mirroring the source directory structure.
 *
 * Usage: node scripts/build-org-pages.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { orgToHtml } from "./org-to-html.mjs";

const SRC_DIRS = ["materiales", "programa", "paginas"];
const DIST_DIR = "dist";
const TEMPLATE = readFileSync("scripts/org-template.html", "utf-8");
const GLOBAL_PLAYER = readFileSync("scripts/global-player.html", "utf-8");

/* ── Helpers ───────────────────────────── */

function renderTemplate(template, vars) {
  return template
    .replace(/\{\{(\w+)}}/g, (_, key) => {
      const val = vars[key];
      return val !== undefined && val !== null ? String(val) : "";
    })
    .replace("{{GLOBAL_PLAYER}}", GLOBAL_PLAYER);
}

function titleFromOrg(raw) {
  // Use first * heading as page title, fall back to filename
  const match = raw.match(/^\*+\s+(.+)$/m);
  if (match) return match[1];
  return null;
}

function titleFromFile(name) {
  return name
    .replace(/\.org$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function descriptionFromContent(html) {
  // Extract first non-empty text snippet for meta description
  const match = html.match(/<p>([^<]+)<\/p>/);
  if (match) return match[1].slice(0, 160);
  return "El mundo ha vivido equivocado";
}

/* ── Recursive file search ──────────────── */

async function findOrgFiles(dir) {
  const entries = [];
  if (!existsSync(dir)) return entries;

  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      entries.push(...await findOrgFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith(".org")) {
      entries.push(fullPath);
    }
  }
  return entries;
}

/* ── Main ───────────────────────────────── */

async function main() {
  const allFiles = [];

  for (const srcDir of SRC_DIRS) {
    const files = await findOrgFiles(srcDir);
    for (const file of files) {
      allFiles.push(file);
    }
  }

  if (allFiles.length === 0) {
    console.log("  No .org files found in materiales/ or programa/");
    return;
  }

  for (const file of allFiles) {
    const raw = readFileSync(file, "utf-8");
    const bodyHtml = orgToHtml(raw);

    // Determine output path relative to dist/
    // materiales/index.org → dist/materiales/index.html
    const relPath = file.replace(/\.org$/, ".html");
    const outPath = join(DIST_DIR, relPath);

    // Determine page title: first org heading, or filename fallback
    const name = basename(file);
    const title = titleFromOrg(raw) || titleFromFile(name);

    const desc = descriptionFromContent(bodyHtml);

    const pageHtml = renderTemplate(TEMPLATE, {
      title,
      description: desc,
      content: bodyHtml,
    });

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, pageHtml);

    console.log(`  ✓ ${relPath} — ${title}`);
  }

  console.log(`  ✓ ${allFiles.length} página(s) generada(s)`);

  /* ── Redirects for paginas/* to top-level paths ── */

  const topRedirects = [
    { from: "sobre", to: "/paginas/sobre/" },
    { from: "contacto", to: "/paginas/contacto/" },
  ];
  for (const { from, to } of topRedirects) {
    const redirectDir = join(DIST_DIR, from);
    mkdirSync(redirectDir, { recursive: true });
    const html = `<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta http-equiv="refresh" content="0; url=${to}">\n<title>Redirigiendo</title>\n<link rel="canonical" href="${to}">\n</head>\n<body>\n<p>Redirigiendo a <a href="${to}">${from}</a>…</p>\n</body>\n</html>`;
    writeFileSync(join(redirectDir, "index.html"), html);
    console.log(`  ✓ ${from}/index.html → ${to}`);
  }
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});