#!/usr/bin/env node
/**
 * new-cover.mjs
 *
 * Genera una portada SVG base para un episodio, siguiendo la convención
 * resources/images/NNN.svg (NNN = número de episodio, ej: 001.svg).
 *
 * La estructura genérica es la de las portadas existentes (400×400, fondo
 * con gradiente, marco, título/autor, badge de episodio) pero emitida como
 * capas Inkscape con ids/labels claros y comentarios de zona, para que:
 *   1. un LLM pueda completar/rediseñar cada capa editando el SVG directo
 *   2. vos lo sigas editando cómodo en Inkscape (las capas aparecen con nombre)
 *
 * Uso:
 *   node scripts/new-cover.mjs 001              # lee title/authors del .md del episodio
 *   node scripts/new-cover.mjs 001 --title "T" --author "A"   # overrides
 *   node scripts/new-cover.mjs                  # próximo número sin portada
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const IMAGES_DIR = "resources/images";
const EPISODIOS_DIR = "sitio/episodios";

/* ── Args ──────────────────────────────── */

const args = process.argv.slice(2);
let num = args.find(a => /^\d{3}$/.test(a));
let titleArg, authorArg;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--title") titleArg = args[++i];
  if (args[i] === "--author") authorArg = args[++i];
}

/* ── Episodio ──────────────────────────── */

function episodeFiles() {
  if (!existsSync(EPISODIOS_DIR)) return [];
  return readdirSync(EPISODIOS_DIR).filter(f => f.endsWith(".md")).sort();
}

function readFrontmatter(file) {
  const raw = readFileSync(join(EPISODIOS_DIR, file), "utf-8");
  const fm = {};
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return fm;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*"?(.*?)"?\s*$/);
    if (kv) fm[kv[1]] = kv[2];
    // authors: lista YAML simple
    if (/^authors:/.test(line)) fm.authors = [];
    const item = line.match(/^\s+-\s+"?(.*?)"?\s*$/);
    if (item && fm.authors) fm.authors.push(item[1]);
  }
  return fm;
}

if (!num) {
  const taken = new Set(
    existsSync(IMAGES_DIR)
      ? readdirSync(IMAGES_DIR).filter(f => /^\d{3}\.svg$/.test(f)).map(f => f.slice(0, 3))
      : []
  );
  const all = ["001", "002", "003", "004", "005", "006", "007", "008", "009", "010"];
  num = all.find(n => !taken.has(n));
  if (!num) {
    console.error("No encontré un número libre (001–010). Pasá uno: new-cover.mjs 011");
    process.exit(1);
  }
}

const epFile = episodeFiles().find(f => f.startsWith(num));
let title = titleArg;
let author = authorArg;

if (epFile) {
  const fm = readFrontmatter(epFile);
  if (!title) title = fm.title || "";
  if (!author) {
    author = Array.isArray(fm.authors) ? fm.authors.join(", ") : fm.authors || "";
  }
} else if (!title) {
  console.error(`⚠  No encontré sitio/episodios/${num}-*.md — usá --title y --author`);
  process.exit(1);
}

/* ── SVG ───────────────────────────────── */

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Portada ${num}.svg — El mundo ha vivido equivocado
  Episodio: ${esc(title)}

  Estructura (capas Inkscape, de abajo hacia arriba):
    fondo       → gradiente base, reemplazable por cualquier treatment
    marco       → borde interior fino
    decoracion  → ZONA LIBRE: ilustración de la tapa (reemplazar los
                  placeholders por la composición del episodio)
    titulo      → título + autor (no mover de y=150/180 sin ajustar decoracion)
    badge       → número de episodio

  Paleta del sitio (ver style.css):
    fondo oscuro  #2c1810 → #4a2c20
    acento oro    #c4a060 → #d4b070
  Mantener contraste texto/fondo ≥ 4.5:1 (WCAG AA) si se cambia la paleta.
-->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 400 400" width="400" height="400">
  <title>${esc(title)}</title>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2c1810"/>
      <stop offset="100%" style="stop-color:#4a2c20"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#c4a060"/>
      <stop offset="100%" style="stop-color:#d4b070"/>
    </linearGradient>
  </defs>

  <g inkscape:groupmode="layer" id="fondo" inkscape:label="fondo">
    <rect width="400" height="400" rx="8" fill="url(#bg)"/>
  </g>

  <g inkscape:groupmode="layer" id="marco" inkscape:label="marco">
    <rect x="20" y="20" width="360" height="360" rx="6" fill="none" stroke="url(#accent)" stroke-width="1.5" opacity="0.4"/>
    <rect x="60" y="100" width="280" height="2" fill="url(#accent)" opacity="0.6"/>
    <rect x="60" y="298" width="280" height="2" fill="url(#accent)" opacity="0.6"/>
  </g>

  <!-- ZONA LIBRE para ilustración: este grupo es el que un LLM (o vos en
       Inkscape) reemplaza por la composición del episodio. -->
  <g inkscape:groupmode="layer" id="decoracion" inkscape:label="decoracion">
    <circle cx="200" cy="220" r="80" fill="none" stroke="url(#accent)" stroke-width="1" opacity="0.15"/>
    <circle cx="200" cy="220" r="50" fill="none" stroke="url(#accent)" stroke-width="0.5" opacity="0.2"/>
    <text x="200" y="330" text-anchor="middle" fill="#c4a060" font-family="sans-serif" font-size="14" opacity="0.3">✦ ✦ ✦</text>
  </g>

  <g inkscape:groupmode="layer" id="titulo" inkscape:label="titulo">
    <text x="200" y="150" text-anchor="middle" fill="url(#accent)" font-family="Georgia, serif" font-size="22" font-weight="bold">${esc(title)}</text>
    ${author ? `<text x="200" y="180" text-anchor="middle" fill="#c4a060" font-family="Georgia, serif" font-size="11" opacity="0.7">${esc(author)}</text>\n    ` : ""}<!--
      Si el título es largo, bajar font-size o partir en dos <text> (y=135 y y=160).
      El <title> del episodio tiene regla a11y: mantener textos legibles.
    -->
  </g>

  <g inkscape:groupmode="layer" id="badge" inkscape:label="badge">
    <rect x="140" y="260" width="120" height="24" rx="12" fill="url(#accent)" opacity="0.2"/>
    <text x="200" y="277" text-anchor="middle" fill="url(#accent)" font-family="sans-serif" font-size="11" font-weight="600">EPISODIO ${Number(num)}</text>
  </g>
</svg>
`;

/* ── Write ─────────────────────────────── */

const out = join(IMAGES_DIR, `${num}.svg`);
if (existsSync(out)) {
  console.error(`✗ ${out} ya existe — no lo pisa.`);
  process.exit(1);
}
writeFileSync(out, svg);
console.log(`  ✓ ${out}`);
if (epFile) {
  console.log(`    episodio: ${epFile} — ${title}`);
  console.log(`    frontmatter image ya apunta a /images/${num}.svg ✓`);
} else {
  console.log(`    ⚠  sin episodio asociado — agregá image: "/images/${num}.svg" al .md`);
}
console.log(`\n  Siguiente: editá las capas en Inkscape (fondo/marco/decoracion/titulo/badge)`);
console.log(`  o pasale el archivo a un LLM con: "completá la capa decoracion de este SVG"`);
