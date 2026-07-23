/**
 * build-textos.mjs
 *
 * Reads textos/*.md, compiles to HTML, generates index.
 *
 * Usage: node scripts/build-textos.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";
import yaml from "gray-matter";

// Shift markdown headings down one level
const renderer = {
  heading({ text, depth }) {
    const nextLevel = Math.min(depth + 1, 6);
    return `<h${nextLevel}>${text}</h${nextLevel}>`;
  },
};
marked.use({ renderer });

const TEXTOS_DIR = "textos";
const DIST_DIR = "dist";
const TEMPLATE = readFileSync("scripts/texto-template.html", "utf-8");
const GLOBAL_PLAYER = readFileSync("scripts/global-player.html", "utf-8");

/* ── Helpers ───────────────────────────── */

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function renderTemplate(template, vars) {
  // Conditional blocks
  let result = template.replace(
    /\{\{#(\w+)}}([\s\S]*?)\{\{\/\1}}/g,
    (_, key, block) => {
      const val = vars[key];
      if (val === undefined || val === null || val === false || val === "") {
        return "";
      }
      if (typeof val === "object" && !Array.isArray(val)) {
        return renderTemplate(block, { ...vars, ...val });
      }
      return renderTemplate(block, vars);
    },
  );

  // Variable replacement
  result = result.replace(/\{\{(\w+)}}/g, (_, key) => {
    const val = vars[key];
    return val !== undefined && val !== null ? String(val) : "";
  });

  return result;
}

function formatTag(tag) {
  return tag
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function collectValues(items, field) {
  const all = new Set();
  for (const item of items) {
    if (item[field]) all.add(item[field]);
  }
  return [...all].sort();
}

/* ── Main ──────────────────────────────── */

async function main() {
  let files;
  try {
    files = (await readdir(TEXTOS_DIR)).filter(f => f.endsWith(".md"));
  } catch {
    console.log("  No textos/ directory found — skipping");
    return;
  }

  if (files.length === 0) {
    console.log("  No texto files found in textos/");
    return;
  }

  const textoData = [];
  const slugs = new Set();

  /* ── First pass: parse, validate, render, write ── */

  for (const file of files) {
    const path = join(TEXTOS_DIR, file);
    const raw = readFileSync(path, "utf-8");
    const { data: fm, content } = yaml(raw);

    // Status: skip drafts
    const textoStatus = (fm.status || "published").toLowerCase();
    if (textoStatus !== "published") {
      console.log(`  - ${file}: status "${fm.status || ""}" — skipped`);
      continue;
    }

    // Validate required fields
    const required = ["title", "author", "date"];
    for (const field of required) {
      if (!fm[field]) {
        throw new Error(`${file}: missing required frontmatter field "${field}"`);
      }
    }

    // Slug
    const slug = fm.slug || slugify(fm.title);

    // Check duplicate slug
    if (slugs.has(slug)) {
      throw new Error(
        `Duplicate slug "${slug}" in "${file}" and "${slugs.get(slug)}"`,
      );
    }
    slugs.add(slug);

    // Validate tags (no spaces)
    if (fm.tags) {
      for (const tag of fm.tags) {
        if (tag.includes(" ")) {
          throw new Error(
            `${file}: tag "${tag}" contains spaces — tags must be single-word slugs`,
          );
        }
      }
    }

    // Validate date
    const date = new Date(fm.date);
    if (isNaN(date.getTime())) {
      throw new Error(
        `${file}: invalid date "${fm.date}" — expected ISO 8601 (e.g., 2026-07-21)`,
      );
    }

    // Warn if image without alt
    if (fm.image && !fm.image_alt) {
      console.warn(`  ⚠ ${file}: image provided without image_alt (using decorative alt="")`);
    }

    // Render markdown body
    const bodyHtml = marked.parse(content);

    const episodeSlug = fm.episode_slug || "";
    const episodeTitle = fm.episode_title || "";

    const ctx = {
      title: fm.title,
      description: fm.description || "",
      date_iso: fm.date,
      date_display: formatDate(fm.date),
      author: fm.author,
      genre: fm.genre || "",
      license: fm.license || "",
      tags: (fm.tags || []).join(" "),
      episode_slug: episodeSlug,
      episode_title: episodeTitle,
      episode_link_text: episodeTitle || "Episodio relacionado",
      image: fm.image || "",
      image_alt: fm.image_alt || "",
      epub_slug: slug,
      content: bodyHtml,
    };

    const html = renderTemplate(TEMPLATE, { ...ctx, GLOBAL_PLAYER });

    const outDir = join(DIST_DIR, "textos", slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), html);

    textoData.push({
      slug,
      title: fm.title,
      date: fm.date,
      description: fm.description || "",
      author: fm.author,
      genre: fm.genre || "",
      license: fm.license || "",
      tags: fm.tags || [],
      image: fm.image || "",
      episode_slug: fm.episode_slug || "",
      episode_title: fm.episode_title || "",
      ctx,
    });

    console.log(`  ✓ ${slug}/index.html — ${fm.title}`);
  }

  if (textoData.length === 0) {
    console.log("  No published textos found");
    return;
  }

  // Sort by date descending
  textoData.sort((a, b) => new Date(b.date) - new Date(a.date));

  /* ── Second pass: prev/next navigation ── */

  for (let i = 0; i < textoData.length; i++) {
    const t = textoData[i];
    const prev = i > 0 ? textoData[i - 1] : null;
    const next = i < textoData.length - 1 ? textoData[i + 1] : null;

    const html = renderTemplate(TEMPLATE, {
      ...t.ctx,
      GLOBAL_PLAYER,
      prev: prev ? { slug: prev.slug, title: prev.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
    });

    writeFileSync(join(DIST_DIR, "textos", t.slug, "index.html"), html);
  }

  /* ── Textos index ── */

  const indexHtml = generateIndex(textoData);
  mkdirSync(join(DIST_DIR, "textos"), { recursive: true });
  writeFileSync(join(DIST_DIR, "textos", "index.html"), indexHtml);
  console.log(`  ✓ textos/index.html — ${textoData.length} textos`);

  /* ── Append to search index ── */

  const searchIndexPath = join(DIST_DIR, "search-index.json");
  try {
    const existing = JSON.parse(readFileSync(searchIndexPath, "utf-8"));
    const textSearchIndex = textoData.map(t => ({
      title: t.title,
      slug: t.slug,
      date: t.date,
      description: t.description,
      authors: t.author,
      duration: "",
      genre: t.genre,
      tags: t.tags,
    }));
    existing.push(...textSearchIndex);
    writeFileSync(searchIndexPath, JSON.stringify(existing));
    console.log(`  ✓ search-index.json — ${textSearchIndex.length} textos added`);
  } catch {
    console.warn(`  ⚠ Could not append to search-index.json`);
  }
}

/* ── Index page generator ──────────────── */

function generateIndex(textos) {
  const authors = collectValues(textos, "author");
  const genres = collectValues(textos, "genre");

  // Author filter chips
  const authorChips = authors.map(a =>
    `<button type="button" class="chip" data-filter="author" data-value="${a}" aria-pressed="false">${a}</button>`
  ).join("\n          ");

  // Genre filter chips
  const genreChips = genres.map(g =>
    `<button type="button" class="chip" data-filter="genre" data-value="${g}" aria-pressed="false">${formatTag(g)}</button>`
  ).join("\n          ");

  const items = textos.map(t => {
    const tagStr = t.tags.length > 0 ? ` data-tags="${t.tags.join(" ")}"` : "";
    const authorAttr = ` data-author="${t.author}"`;
    const genreAttr = t.genre ? ` data-genre="${t.genre}"` : "";
    return `
    <li${tagStr}${authorAttr}${genreAttr}>
      <article class="episode-card">
        ${t.image ? `<a href="/textos/${t.slug}/" class="episode-thumb-link" aria-hidden="true" tabindex="-1"><img src="${t.image}" alt="" class="episode-thumb" loading="lazy" width="80" height="80"></a>` : ""}
        <div class="episode-card-body">
        <h3><a href="/textos/${t.slug}/">${t.title}</a></h3>
        <p class="episode-meta">
          <time datetime="${t.date}">${formatDate(t.date)}</time>
          ${t.author ? ` · por ${t.author}` : ""}
        </p>
        ${t.description ? `<p>${t.description}</p>` : ""}
        <div class="episode-badges">
          ${t.genre ? `<span class="badge badge-genre">🎙️ ${formatTag(t.genre)}</span>` : ""}
          ${t.episode_slug ? `<span class="badge badge-audio">📖 Leído en <a href="/episodios/${t.episode_slug}/">${t.episode_title || "episodio"}</a></span>` : ""}
        </div>
        </div>
      </article>
    </li>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Textos y cuentos leídos en El mundo ha vivido equivocado">
  <title>Textos — El mundo ha vivido equivocado</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
  <header>
    <div class="container">
      <p class="breadcrumb"><a href="/">Inicio</a> / Textos</p>
      <h1 class="site-title">Textos</h1>
      <nav aria-label="Principal">
        <ul>
          <li><a href="/">Inicio</a></li>
          <li><a href="/episodios/">Episodios</a></li>
          <li><a href="/textos/" aria-current="page">Textos</a></li>
          <li><a href="/sobre/">Sobre el programa</a></li>
          <li><a href="/contacto/">Sugerir un cuento</a></li>
        </ul>
      </nav>
      <div class="search-container" role="search">
        <label for="search-input" class="sr-only">Buscar textos</label>
        <input id="search-input" type="search" placeholder="Buscar textos…" autocomplete="off">
        <ul id="search-results" role="listbox" hidden></ul>
        <noscript><p class="search-noscript"><a href="/textos/">Ver todos los textos</a></p></noscript>
      </div>
    </div>
  </header>
  <main id="main-content">
    <div class="container">
      <h2>Textos</h2>

      <div class="filter-section">
        <p class="filter-label">Por autor</p>
        <div class="filter-chips" role="group" aria-label="Filtrar por autor">
          <button type="button" class="chip chip-active" data-filter="author" data-value="all" aria-pressed="true">Todos</button>
          ${authorChips}
        </div>
      </div>

      <div class="filter-section">
        <p class="filter-label">Por género</p>
        <div class="filter-chips" role="group" aria-label="Filtrar por género">
          <button type="button" class="chip chip-active" data-filter="genre" data-value="all" aria-pressed="true">Todos</button>
          ${genreChips}
        </div>
      </div>

      <ul class="episode-list" data-filter-container>${items}
      </ul>
      <div class="filter-empty" data-filter-empty style="display:none">
        <p>No hay textos con estos filtros.</p>
        <button type="button" class="chip" id="clear-filters">Limpiar filtros</button>
      </div>
    </div>
  </main>
  <footer>
    <div class="container">
      <p>© 2026 El mundo ha vivido equivocado</p>
    </div>
  </footer>

  ${GLOBAL_PLAYER}
</body>
</html>`;
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});