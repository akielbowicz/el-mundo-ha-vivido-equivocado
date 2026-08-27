/**
 * build-index.mjs
 *
 * Compiles sitio/index.md + scripts/index-template.html → dist/index.html.
 * The hero (último episodio) and "Próximas lecturas" sections are generated
 * dynamically from sitio/episodios/*.md frontmatter:
 *   - hero:     published, date ≤ build date, latest (ties: filename)
 *   - próximas: published, date > build date, ascending, max 5
 *
 * Build date defaults to the machine's local date; override with
 * BUILD_DATE=YYYY-MM-DD for reproducible builds.
 *
 * Usage: node scripts/build-index.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";
import matter from "gray-matter";
import { renderTemplate, formatDate, escapeHtml } from "./lib/utils.mjs";

// Shift markdown headings down one level (h1→h2, h2→h3, etc.) so the
// page keeps a single <h1>: the site title from the template.
const renderer = {
  heading({ text, depth }) {
    const nextLevel = Math.min(depth + 1, 6);
    return `<h${nextLevel}>${text}</h${nextLevel}>`;
  },
};
marked.use({ renderer });

const INDEX_SOURCE = "sitio/index.md";
const EPISODIOS_DIR = "sitio/episodios";
const TEMPLATE = readFileSync("scripts/index-template.html", "utf-8");

function buildDate() {
  if (process.env.BUILD_DATE) return process.env.BUILD_DATE;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function readEpisodes() {
  let files;
  try {
    files = (await readdir(EPISODIOS_DIR)).filter(f => f.endsWith(".md")).sort();
  } catch {
    return [];
  }
  const episodes = [];
  for (const file of files) {
    const { data } = matter(readFileSync(join(EPISODIOS_DIR, file), "utf-8"));
    if (data.status === "draft") continue;
    episodes.push({
      ...data,
      date: String(data.date),
      authors: Array.isArray(data.authors) ? data.authors.join(", ") : data.authors || "",
      file,
    });
  }
  return episodes;
}

function renderHero(ep) {
  const url = `/episodios/${ep.slug}/`;
  const image = ep.image || "/images/og-default.svg";
  const badges = [
    ep.duration ? `<span class="badge badge-duration">⏱️ ${escapeHtml(ep.duration)}</span>` : "",
    ep.genre ? `<span class="badge badge-genre">🎙️ ${escapeHtml(ep.genre)}</span>` : "",
  ]
    .filter(Boolean)
    .join("\n          ");
  const heroBadges = badges
    ? `\n          <div class="hero-badges">\n          ${badges}\n          </div>`
    : "";
  return `<section aria-labelledby="ultimo-episodio-titulo" class="hero-episode">
      <div class="container">
        <h2 id="ultimo-episodio-titulo" class="sr-only">Último episodio</h2>
        <article aria-labelledby="hero-${ep.slug}-titulo" class="hero-card">
          <div class="hero-card-layout">
            <a href="${url}" class="hero-cover-link" aria-hidden="true" tabindex="-1">
              <img src="${image}" alt="" class="hero-cover" width="140" height="140">
            </a>
            <div class="hero-card-body">
          <header class="hero-header">
            <span class="hero-badge" aria-hidden="true">🎙️ Último episodio</span>
            <h3 id="hero-${ep.slug}-titulo" class="hero-title">${escapeHtml(ep.title)}</h3>
            ${ep.authors ? `<p class="hero-author">${escapeHtml(ep.authors)}</p>` : ""}
            <time datetime="${ep.date}">${formatDate(ep.date)}</time>
          </header>${heroBadges}
          <p>${escapeHtml(ep.description || "")}</p>
          <a href="${url}" class="hero-details-link">Ver página del episodio →</a>
          </div>
          </div>
        </article>
      </div>
    </section>`;
}

function renderProximas(eps) {
  const items = eps
    .map(
      ep => `          <li>
            <article>
              <h3>${escapeHtml(ep.title)}</h3>
              <p>${escapeHtml(ep.description || "")}</p>
              <time datetime="${ep.date}">${formatDate(ep.date)}</time>
            </article>
          </li>`
    )
    .join("\n");
  return `<section aria-labelledby="proximos-titulo">
      <div class="container">
        <h2 id="proximos-titulo">Próximas lecturas</h2>
        <ul class="episode-list">
${items}
        </ul>
      </div>
    </section>`;
}

async function main() {
  const { data: fm, content } = matter(readFileSync(INDEX_SOURCE, "utf-8"));

  for (const field of ["title", "description"]) {
    if (!fm[field]) {
      throw new Error(`${INDEX_SOURCE}: missing required frontmatter field "${field}"`);
    }
  }

  const today = buildDate();
  const episodes = await readEpisodes();

  const published = episodes
    .filter(ep => ep.date <= today)
    .sort((a, b) => (a.date === b.date ? a.file.localeCompare(b.file) : (a.date < b.date ? -1 : 1)));
  const hero = published.at(-1) || null;

  const proximas = episodes
    .filter(ep => ep.date > today)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 5);

  const body = marked.parse(content);

  const html = renderTemplate(TEMPLATE, {
    title: fm.title,
    description: fm.description,
    tagline: fm.tagline || "",
    heroHtml: hero ? renderHero(hero) : "",
    proximasHtml: proximas.length ? renderProximas(proximas) : "",
    body,
  });

  writeFileSync(join("dist", "index.html"), html);
  console.log(
    `  ✓ index.html — hero: ${hero ? hero.title : "(ninguno)"}, próximas: ${proximas.length}`
  );
}

main().catch(err => {
  console.error("  ❌ Error generando index:", err.message);
  process.exit(1);
});
