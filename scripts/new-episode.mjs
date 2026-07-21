/**
 * new-episode.mjs
 *
 * Interactive prompt to scaffold a new episode markdown file.
 *
 * Usage: node scripts/new-episode.mjs
 */

import { createInterface } from "node:readline";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const EPISODIOS_DIR = "episodios";

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
  console.log("\n📝 Nuevo episodio\n");

  const title = await ask("  Título: ");
  const date = await ask("  Fecha (ISO 8601, ej: 2026-07-21): ") || new Date().toISOString().split("T")[0];
  const description = await ask("  Descripción breve: ");
  const authors = await ask("  Autor/es (separados por coma): ");
  const status = (await ask("  Estado (published/draft) [draft]: ")) || "draft";
  const slug = slugify(title);

  const outPath = join(EPISODIOS_DIR, `${slug}.md`);

  if (existsSync(outPath)) {
    console.error(`\n  ❌ Ya existe: ${outPath}`);
    process.exit(1);
  }

  const frontmatter = `---
title: "${title}"
date: "${date}"
status: ${status}
description: "${description}"
authors:
${authors.split(",").map(a => `  - "${a.trim()}"`).join("\n")}
---

# ${title}

Escribí el contenido del episodio acá.
`;

  writeFileSync(outPath, frontmatter);
  console.log(`\n  ✓ Creado: ${outPath}`);
  console.log("  Agregá audio, youtube, image, tags al frontmatter según necesites.\n");

  rl.close();
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});