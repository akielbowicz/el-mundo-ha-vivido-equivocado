/**
 * build-episodes.mjs
 *
 * Reads episodios/*.md, compiles to HTML, generates index + search index.
 *
 * Usage: node scripts/build-episodes.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";
import yaml from "gray-matter";

// Shift markdown headings down one level (h1→h2, h2→h3, etc.)
// so the page <h1> is the episode title from frontmatter.
const renderer = {
  heading({ text, depth }) {
    const nextLevel = Math.min(depth + 1, 6);
    return `<h${nextLevel}>${text}</h${nextLevel}>`;
  },
};
marked.use({ renderer });

const EPISODIOS_DIR = "episodios";
const DIST_DIR = "dist";
const TEMPLATE = readFileSync("scripts/episode-template.html", "utf-8");

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
  // Conditional blocks: {{#key}}...{{/key}}
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

function parseYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function validateYouTube(url) {
  if (!url) return null;
  const id = parseYouTubeId(url);
  if (!id) throw new Error(`Invalid YouTube URL or ID: "${url}"`);
  return id;
}

/* ── Main ──────────────────────────────── */

async function main() {
  const files = (await readdir(EPISODIOS_DIR)).filter(f => f.endsWith(".md"));
  if (files.length === 0) {
    console.log("  No episode files found in episodios/");
    return;
  }

  const episodeData = [];  // { slug, title, date, bodyHtml, ctx, meta }
  const slugs = new Map();

  /* ── First pass: parse, validate, render, write ── */

  for (const file of files) {
    const path = join(EPISODIOS_DIR, file);
    const raw = readFileSync(path, "utf-8");
    const { data: fm, content } = yaml(raw);

    // Status: skip drafts before any validation
    const episodeStatus = (fm.status || "published").toLowerCase();
    if (episodeStatus !== "published") {
      console.log(`  - ${file}: status "${fm.status || ""}" — skipped`);
      continue;
    }

    // Validate required fields
    const required = ["title", "date", "description", "authors"];
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
    slugs.set(slug, file);

    // Validate YouTube URL
    let youtubeId = null;
    if (fm.youtube) {
      youtubeId = validateYouTube(fm.youtube);
    }

    // Validate date
    const date = new Date(fm.date);
    if (isNaN(date.getTime())) {
      throw new Error(
        `${file}: invalid date "${fm.date}" — expected ISO 8601 (e.g., 2026-07-21)`,
      );
    }

    // Warn if image without alt text
    if (fm.image && !fm.image_alt) {
      console.warn(`  ⚠ ${file}: image provided without image_alt (using decorative alt="")`);
    }

    // Render markdown body
    const bodyHtml = marked.parse(content);

    // Build authors string
    const authors = Array.isArray(fm.authors)
      ? fm.authors.join(", ")
      : fm.authors;

    const ctx = {
      title: fm.title,
      description: fm.description,
      date_iso: fm.date,
      date_display: formatDate(fm.date),
      authors,
      duration: fm.duration || "",
      genre: fm.genre || "",
      audio: fm.audio || "",
      youtube: fm.youtube ? true : false,
      youtube_id: youtubeId || "",
      image: fm.image || "",
      image_alt: fm.image_alt || "",
      content: bodyHtml,
    };

    const html = renderTemplate(TEMPLATE, ctx);

    const outDir = join(DIST_DIR, "episodios", slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), html);

    episodeData.push({
      slug,
      title: fm.title,
      date: fm.date,
      description: fm.description,
      authors,
      duration: fm.duration || "",
      genre: fm.genre || "",
      audio: !!fm.audio,
      youtube: !!fm.youtube,
      image: !!fm.image,
      tags: fm.tags || [],
      bodyHtml,
      ctx,
    });

    console.log(`  ✓ ${slug}/index.html — ${fm.title}`);
  }

  // Sort by date descending
  episodeData.sort((a, b) => new Date(b.date) - new Date(a.date));

  /* ── Second pass: prev/next navigation ── */

  for (let i = 0; i < episodeData.length; i++) {
    const ep = episodeData[i];
    const prev = i > 0 ? episodeData[i - 1] : null;
    const next = i < episodeData.length - 1 ? episodeData[i + 1] : null;

    const html = renderTemplate(TEMPLATE, {
      ...ep.ctx,
      prev: prev ? { slug: prev.slug, title: prev.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
    });

    writeFileSync(join(DIST_DIR, "episodios", ep.slug, "index.html"), html);
  }

  /* ── Episode index ── */

  const indexHtml = generateIndex(episodeData);
  mkdirSync(join(DIST_DIR, "episodios"), { recursive: true });
  writeFileSync(join(DIST_DIR, "episodios", "index.html"), indexHtml);
  console.log(`  ✓ episodios/index.html — ${episodeData.length} episodios`);

  /* ── Search index ── */

  const searchIndex = episodeData.map(ep => ({
    title: ep.title,
    slug: ep.slug,
    date: ep.date,
    description: ep.description,
    authors: ep.authors,
    duration: ep.duration,
    genre: ep.genre,
    tags: ep.tags,
  }));
  writeFileSync(join(DIST_DIR, "search-index.json"), JSON.stringify(searchIndex));
  console.log("  ✓ search-index.json");
}

/* ── Helpers ─────────────────────────────── */

function formatTag(tag) {
  // Convert slug to display: "realismo-magico" → "Realismo mágico"
  return tag
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function collectTags(episodes) {
  const all = new Set();
  for (const ep of episodes) {
    for (const tag of ep.tags) {
      all.add(tag);
    }
  }
  return [...all].sort();
}

function generateChips(tags) {
  if (tags.length === 0) return "";
  const buttons = tags.map(t =>
    `<button type="button" class="chip" data-tag="${t}" aria-pressed="false">#${formatTag(t)}</button>`
  ).join("\n          ");
  return `
      <div class="filter-chips" role="group" aria-label="Filtrar por etiqueta">
        <button type="button" class="chip chip-active" data-tag="all" aria-pressed="true">Todos</button>
          ${buttons}
      </div>`;
}

/* ── Index page generator ──────────────── */

function generateIndex(episodes) {
  const tags = collectTags(episodes);
  const chips = generateChips(tags);
  const items = episodes.map(ep => {
    const tagStr = ep.tags.length > 0 ? ` data-tags="${ep.tags.join(" ")}"` : "";
    return `
    <li${tagStr}>
      <article>
        <h3><a href="/episodios/${ep.slug}/">${ep.title}</a></h3>
        <p class="episode-meta">
          <time datetime="${ep.date}">${formatDate(ep.date)}</time>
          ${ep.authors ? ` · por ${ep.authors}` : ""}
        </p>
        <p>${ep.description}</p>
        <div class="episode-badges">
          ${ep.duration ? `<span class="badge badge-duration">⏱️ ${ep.duration}</span>` : ""}
          ${ep.genre ? `<span class="badge badge-genre">🎙️ ${ep.genre}</span>` : ""}
          ${ep.audio ? '<span class="badge badge-audio">🎧 Audio</span>' : ""}
          ${ep.youtube ? '<span class="badge badge-video">📺 Video</span>' : ""}
        </div>
      </article>
    </li>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Todos los episodios de El mundo ha vivido equivocado">
  <title>Episodios — El mundo ha vivido equivocado</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
  <header>
    <div class="container">
      <p class="breadcrumb"><a href="/">Inicio</a> / Episodios</p>
      <h1 class="site-title">Episodios</h1>
      <nav aria-label="Principal">
        <ul>
          <li><a href="/">Inicio</a></li>
          <li><a href="/episodios/" aria-current="page">Episodios</a></li>
          <li><a href="/sobre/">Sobre el programa</a></li>
          <li><a href="/contacto/">Contacto</a></li>
        </ul>
      </nav>
      <div class="search-container" role="search">
        <label for="search-input" class="sr-only">Buscar episodios</label>
        <input id="search-input" type="search" placeholder="Buscar episodios…" autocomplete="off">
        <ul id="search-results" role="listbox" hidden></ul>
        <noscript><p class="search-noscript"><a href="/episodios/">Ver todos los episodios</a></p></noscript>
      </div>
    </div>
  </header>
  <main id="main-content">
    <div class="container">
      <h2>Episodios</h2>
      ${chips}
      <ul class="episode-list" data-filter-container>${items}
      </ul>
    </div>
  </main>
  <footer>
    <div class="container">
      <p>© 2026 El mundo ha vivido equivocado</p>
    </div>
  </footer>
</body>
</html>`;
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});