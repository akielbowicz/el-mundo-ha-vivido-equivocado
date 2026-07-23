/**
 * new-texto.mjs
 *
 * Interactive prompt to scaffold a new texto (cuento/texto) markdown file.
 *
 * Usage: node scripts/new-texto.mjs
 */

import { createInterface } from "node:readline";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const TEXTOS_DIR = "textos";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  console.log("\n📝 Nuevo texto\n");

  const title = await ask("  Título: ");
  const author = await ask("  Autor: ");
  const date = await ask("  Fecha (ISO 8601, ej: 2026-07-21): ") || new Date().toISOString().split("T")[0];
  const description = await ask("  Descripción breve: ");
  const genre = await ask("  Género (cuento/poema/ensayo/fragmento): ");
  const episodeSlug = await ask("  Slug del episodio relacionado (opcional): ");
  const statusInput = (await ask("  Estado (published/draft) [draft]: ")) || "draft";
  const isPublished = ["p", "pub", "published"].includes(statusInput.toLowerCase());
  const status = isPublished ? "published" : "draft";
  const slug = slugify(title);

  const outPath = join(TEXTOS_DIR, `${slug}.md`);

  if (existsSync(outPath)) {
    console.error(`\n  ❌ Ya existe: ${outPath}`);
    process.exit(1);
  }

  const episodeFm = episodeSlug ? `episode_slug: "${episodeSlug}"
` : "";

  const frontmatter = `---
title: "${title}"
author: "${author}"
date: "${date}"
status: ${status}
description: "${description}"
genre: "${genre}"
license: "Fragmento (derecho de cita)"
tags:
  - ${genre}
${episodeFm}---

# ${title}

Escribí el texto acá.
`;

  writeFileSync(outPath, frontmatter);
  console.log(`\n  ✓ Creado: ${outPath}\n`);

  rl.close();
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});