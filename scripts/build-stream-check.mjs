/**
 * build-stream-check.mjs
 *
 * Genera la página oculta de diagnóstico del stream (dist/_stream-check/).
 * Toma la STREAM_URL de scripts/download-stream como única fuente de verdad
 * y la inyecta en el template scripts/stream-check.html.
 *
 * La página vive bajo un segmento con prefijo "_": queda excluida del
 * sitemap y no está enlazada desde el sitio.
 *
 * Usage: node scripts/build-stream-check.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEMPLATE = "scripts/stream-check.html";
const DOWNLOAD_STREAM = "scripts/download-stream";
const OUT_DIR = join("dist", "_stream-check");
const OUT_FILE = join(OUT_DIR, "index.html");
const PLACEHOLDER = "__STREAM_URL__";

function extractStreamUrl() {
  const src = readFileSync(DOWNLOAD_STREAM, "utf-8");
  const match = src.match(/^STREAM_URL="([^"]+)"/m);
  if (!match) {
    throw new Error(`No se encontró STREAM_URL en ${DOWNLOAD_STREAM}`);
  }
  return match[1];
}

const streamUrl = extractStreamUrl();
const html = readFileSync(TEMPLATE, "utf-8");

if (!html.includes(PLACEHOLDER)) {
  throw new Error(`El template ${TEMPLATE} no contiene ${PLACEHOLDER}`);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, html.replaceAll(PLACEHOLDER, streamUrl));
console.log(`  ✓ stream-check: ${OUT_FILE} (stream: ${streamUrl})`);
