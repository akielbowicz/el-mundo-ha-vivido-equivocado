/**
 * build-epub.mjs
 *
 * Generates EPUB files for each texto in textos/.
 * Output: dist/textos/<slug>.epub
 *
 * Usage: node scripts/build-epub.mjs
 */

import { readFileSync, mkdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { marked } from "marked";
import yaml from "gray-matter";
import Epub from "epub-gen";

const TEXTOS_DIR = "textos";
const DIST_DIR = "dist";
const EPUB_DIR = join(DIST_DIR, "textos");

// CSS for EPUB output — clean, readable, no external dependencies
const EPUB_CSS = `
  body { font-family: Georgia, "Times New Roman", serif; font-size: 1em; line-height: 1.8; color: #333; margin: 1em; }
  h1, h2, h3, h4 { font-family: Georgia, serif; color: #111; line-height: 1.3; }
  h1 { font-size: 1.6em; margin-bottom: 0.5em; }
  h2 { font-size: 1.3em; margin-top: 1.5em; margin-bottom: 0.5em; }
  h3 { font-size: 1.1em; margin-top: 1.2em; }
  p { margin-bottom: 0.8em; text-align: justify; }
  blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 3px solid #ccc; color: #555; font-style: italic; }
  cite { font-style: italic; }
  a { color: #8b3a3a; text-decoration: underline; }
  ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
  li { margin-bottom: 0.25em; }
  pre { font-family: "Courier New", monospace; font-size: 0.85em; background: #f5f5f5; padding: 0.5em 1em; border-radius: 3px; }
  img { max-width: 100%; height: auto; margin: 1em 0; }
  .epub-meta { font-size: 0.9em; color: #666; margin-bottom: 1.5em; }
`;

/* ── Helpers ───────────────────────────── */

function slugify(title) {
  return title
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── Main ──────────────────────────────── */

async function main() {
  let files;
  try {
    files = (await readdir(TEXTOS_DIR)).filter(f => f.endsWith(".md"));
  } catch {
    console.log("  No textos/ directory found — skipping EPUB generation");
    return;
  }

  if (files.length === 0) {
    console.log("  No texto files found in textos/");
    return;
  }

  mkdirSync(EPUB_DIR, { recursive: true });

  let count = 0;

  for (const file of files) {
    const path = join(TEXTOS_DIR, file);
    const raw = readFileSync(path, "utf-8");
    const { data: fm, content } = yaml(raw);

    // Skip drafts
    const textoStatus = (fm.status || "published").toLowerCase();
    if (textoStatus !== "published") {
      console.log(`  - ${file}: status "${fm.status || ""}" — skipped`);
      continue;
    }

    // Validate required fields
    if (!fm.title || !fm.author) {
      console.warn(`  ⚠ ${file}: missing title or author — skipping`);
      continue;
    }

    const slug = fm.slug || slugify(fm.title);
    const date = fm.date ? new Date(fm.date).toLocaleDateString("es-AR", {
      year: "numeric", month: "long", day: "numeric",
    }) : "";

    // Render markdown body
    const bodyHtml = marked.parse(content);

    // Build EPUB content with metadata header
    const chapterHtml = `
      <div class="epub-meta">
        <p><strong>${fm.title}</strong></p>
        ${fm.author ? `<p>por ${fm.author}</p>` : ""}
        ${date ? `<p>${date}</p>` : ""}
        ${fm.genre ? `<p>Género: ${fm.genre}</p>` : ""}
        ${fm.license ? `<p>${fm.license}</p>` : ""}
      </div>
      ${bodyHtml}
    `;

    const epubOptions = {
      title: fm.title,
      author: fm.author,
      publisher: "El mundo ha vivido equivocado",
      lang: "es",
      tocTitle: "Contenido",
      appendChapterTitles: false,
      css: EPUB_CSS,
      content: [
        {
          title: fm.title,
          data: chapterHtml,
        },
      ],
    };

    const outputPath = resolve(join(EPUB_DIR, `${slug}.epub`));

    try {
      await new Epub(epubOptions, outputPath).promise;
      console.log(`  ✓ ${slug}.epub — ${fm.title}`);
      count++;
    } catch (err) {
      console.error(`  ❌ ${slug}.epub — ${err.message}`);
    }
  }

  console.log(`  ✓ ${count} EPUB(s) generated`);
}

main().catch(err => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});