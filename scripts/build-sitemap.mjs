/**
 * build-sitemap.mjs
 *
 * Walks dist/ to collect all .html pages and generates a
 * standards-compliant sitemap.xml at dist/sitemap.xml.
 *
 * Skips 404.html and redirect stub pages (meta refresh or canonical redirect).
 *
 * Usage: node scripts/build-sitemap.mjs
 */

import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "dist";
const SITE_URL = "https://equivocadxs.ar";
const OUTPUT = join(DIST, "sitemap.xml");

/* ── Walk dist/ for HTML files ────────── */

function walk(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith(".html")) {
      files.push(full);
    }
  }
  return files;
}

/* ── Determine if a page is a redirect stub ── */

function isRedirectStub(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    // Skip pages with meta refresh redirect
    if (/http-equiv\s*=\s*["']refresh["']/i.test(content)) return true;
    // Skip 404 page
    if (filePath.endsWith("/404.html") || filePath === "dist/404.html") return true;
    return false;
  } catch {
    return true;
  }
}

/* ── Convert file path to URL ─────────── */

function filePathToUrl(filePath) {
  const rel = relative(DIST, filePath);
  // Root index.html → just the base URL
  if (rel === "index.html") return `${SITE_URL}/`;
  // Remove trailing /index.html to get clean URL path
  let urlPath = rel.replace(/\/index\.html$/, "/").replace(/\\/g, "/");
  return `${SITE_URL}/${urlPath}`;
}

/* ── Generate sitemap XML ─────────────── */

function generateSitemap(pages) {
  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const page of pages) {
    const url = filePathToUrl(page);
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(url)}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Main ─────────────────────────────── */

function main() {
  const allFiles = walk(DIST);
  const pages = allFiles.filter(f => !isRedirectStub(f));

  if (pages.length === 0) {
    console.log("  No pages found for sitemap");
    return;
  }

  const xml = generateSitemap(pages);
  writeFileSync(OUTPUT, xml, "utf-8");
  console.log(`  ✓ sitemap.xml — ${pages.length} URLs`);
}

main();