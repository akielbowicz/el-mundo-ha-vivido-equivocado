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

/* ── Paletas ───────────────────────────── */

// Paletas curadas: acento claro sobre fondo oscuro (contraste ≥ 4.5:1).
// Cada una: fondo (gradiente 2 stops), acento (gradiente 2 stops),
// acento sólido (para textos chicos).
const PALETTES = [
  { name: "oro-clasico",   bg: ["#2c1810", "#4a2c20"], accent: ["#c4a060", "#d4b070"], solid: "#d4b070" },
  { name: "verde-yerba",   bg: ["#1a2f1f", "#25402a"], accent: ["#a3c585", "#bcd9a0"], solid: "#bcd9a0" },
  { name: "noche-azul",    bg: ["#101c2e", "#1a2c47"], accent: ["#8ab4d8", "#a8cce8"], solid: "#a8cce8" },
  { name: "vino-tinto",    bg: ["#2e1015", "#471a20"], accent: ["#d8a8a8", "#e8c0c0"], solid: "#e8c0c0" },
  { name: "violeta",       bg: ["#221830", "#342447"], accent: ["#c0a8e0", "#d4c2ec"], solid: "#d4c2ec" },
  { name: "cobalto",       bg: ["#0e2229", "#163540"], accent: ["#88ccd4", "#a8e0e6"], solid: "#a8e0e6" },
  { name: "ambar",         bg: ["#2b2005", "#44330a"], accent: ["#e0c070", "#f0d48c"], solid: "#f0d48c" },
  { name: "rosa-bajo",     bg: ["#2c1520", "#452133"], accent: ["#e0a8c0", "#eec4d6"], solid: "#eec4d6" },
  { name: "salvia",        bg: ["#232820", "#353d30"], accent: ["#c2d0b8", "#d8e2d0"], solid: "#d8e2d0" },
  { name: "terracota",     bg: ["#301b12", "#4a2a1c"], accent: ["#e0a888", "#eec0a4"], solid: "#eec0a4" },
];

function contrastRatio(hex1, hex2) {
  const lum = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(hex1), lum(hex2)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

function pickPalette(requested) {
  if (requested) {
    const p = PALETTES.find(p => p.name === requested);
    if (!p) {
      console.error(`✗ Paleta "${requested}" no encontrada. Opciones: ${PALETTES.map(p => p.name).join(", ")}`);
      process.exit(1);
    }
    return p;
  }
  return PALETTES[Math.floor(Math.random() * PALETTES.length)];
}

/* ── Args ──────────────────────────────── */

const args = process.argv.slice(2);
let num = args.find(a => /^\d{3}$/.test(a));
let titleArg, authorArg, paletteArg;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--title") titleArg = args[++i];
  if (args[i] === "--author") authorArg = args[++i];
  if (args[i] === "--palette") paletteArg = args[++i];
}

const palette = pickPalette(paletteArg);
const [bg1, bg2] = palette.bg;
const [ac1, ac2] = palette.accent;

// Chequeo de contraste (acento sólido vs fondo promedio, WCAG AA)
const ratio = contrastRatio(palette.solid, palette.bg[0]);
if (ratio < 4.5) {
  console.error(`✗ Contraste insuficiente (${ratio.toFixed(2)}:1 < 4.5:1) en paleta "${palette.name}" — reportá el bug`);
  process.exit(1);
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

  Paleta usada: ${palette.name}
    fondo  ${palette.bg.join(" → ")}
    acento ${palette.accent.join(" → ")}
  Contraste texto/fondo: ${ratio.toFixed(1)}:1 (WCAG AA ≥ 4.5:1)
  Otras: ${PALETTES.map(p => p.name).join(", ")}
  Forzar una: node scripts/new-cover.mjs ${num || "NNN"} --palette <nombre>
  Mantener contraste ≥ 4.5:1 (WCAG AA) si se ajustan colores a mano.
-->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 400 400" width="400" height="400">
  <title>${esc(title)}</title>
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bg1}"/>
      <stop offset="100%" style="stop-color:${bg2}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${ac1}"/>
      <stop offset="100%" style="stop-color:${ac2}"/>
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
    <text x="200" y="330" text-anchor="middle" fill="${palette.solid}" font-family="sans-serif" font-size="14" opacity="0.3">✦ ✦ ✦</text>
  </g>

  <g inkscape:groupmode="layer" id="titulo" inkscape:label="titulo">
    <text x="200" y="150" text-anchor="middle" fill="url(#accent)" font-family="Georgia, serif" font-size="22" font-weight="bold">${esc(title)}</text>
    ${author ? `<text x="200" y="180" text-anchor="middle" fill="${palette.solid}" font-family="Georgia, serif" font-size="11" opacity="0.7">${esc(author)}</text>\n    ` : ""}<!--
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
