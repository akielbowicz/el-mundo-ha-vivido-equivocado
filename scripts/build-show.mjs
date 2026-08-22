/**
 * build-show.mjs
 *
 * Converts org-mode grilla files (materiales/grillas/*.org) to HTML and PDF
 * using pandoc. Output goes to dist/_show/<slug>/index.html + grilla.pdf.
 *
 * Dependencies: pandoc, weasyprint
 *
 * Usage: node scripts/build-show.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { execSync } from "node:child_process";

const SRC_DIR = "materiales/grillas";
const OUT_DIR = "dist/_show";
const HTML_TEMPLATE = join("scripts", "show-template.html");

function slugFromFile(file) {
  return basename(file, extname(file));
}

function isGrillaFile(file) {
  return file.endsWith(".org") && file !== "000-template.org";
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function pandocAvailable() {
  try {
    execSync("command -v pandoc", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function weasyprintAvailable() {
  try {
    execSync("command -v weasyprint", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function metadataFromFile(file) {
  const slug = slugFromFile(file);
  const orgPath = join(SRC_DIR, file);
  const raw = readFileSync(orgPath, "utf-8");
  const titleMatch = raw.match(/^#\+TITLE:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : `Grilla ${slug}`;
  const dateMatch = raw.match(/^#\+DATE:\s*(.+)$/m);
  const date = dateMatch ? dateMatch[1].trim() : "";
  return { slug, title, date };
}

function main() {
  if (!existsSync(SRC_DIR)) {
    console.log("  No se encontró el directorio de grillas:", SRC_DIR);
    return;
  }

  const files = readdirSync(SRC_DIR)
    .filter(isGrillaFile)
    .sort();

  if (files.length === 0) {
    console.log("  No hay archivos de grilla (excepto 000-template.org)");
    return;
  }

  const hasPandoc = pandocAvailable();
  const hasWeasyprint = weasyprintAvailable();

  if (!hasPandoc) {
    console.log("  ⚠  pandoc no instalado — salteando grillas");
    return;
  }

  const metadata = [];

  for (const file of files) {
    const { slug, title, date } = metadataFromFile(file);
    const orgPath = join(SRC_DIR, file);
    const outDir = join(OUT_DIR, slug);

    ensureDir(outDir);
    metadata.push({ slug, title, date });

    // ── HTML ────────────────────────────────────────────
    const htmlOut = join(outDir, "index.html");
    try {
      execSync(
        `pandoc "${orgPath}" -f org -t html5 --shift-heading-level-by=1 --standalone --template "${HTML_TEMPLATE}" -o "${htmlOut}"`,
        { stdio: "pipe" }
      );
      console.log(`  ✓ ${slug}/index.html`);
    } catch (err) {
      console.error(`  ❌ Error generando HTML para ${file}:`, err.stderr?.toString() || err.message);
      continue;
    }

    // ── PDF ─────────────────────────────────────────────
    const pdfOut = join(outDir, "grilla.pdf");
    if (hasWeasyprint) {
      try {
        execSync(
          `pandoc "${orgPath}" -f org --pdf-engine=weasyprint --css resources/style.css -o "${pdfOut}"`,
          { stdio: "pipe" }
        );
        console.log(`  ✓ ${slug}/grilla.pdf`);
      } catch (err) {
        console.error(`  ❌ Error generando PDF para ${file}:`, err.stderr?.toString() || err.message);
      }
    } else {
      console.log(`  ⚠  weasyprint no instalado — salteando PDF para ${file}`);
    }
  }

  // ── Index page for all grillas ────────────────────────
  const indexHtml = generateIndex(metadata);
  const indexOut = join(OUT_DIR, "index.html");
  writeFileSync(indexOut, indexHtml);
  console.log(`  ✓ _show/index.html — índice de grillas`);

  console.log(`\n  ✓ ${files.length} grilla(s) procesada(s)`);
}

function generateIndex(items) {

  const rows = items.map(({ slug, title, date }) => {
    const dateCell = date ? `<td>${date}</td>` : "<td>—</td>";
    return `<tr>
      <td><a href="/_show/${slug}/">${title}</a></td>
      ${dateCell}
      <td><a href="/_show/${slug}/grilla.pdf" class="pdf-link">PDF</a></td>
    </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Grillas de programa — El mundo ha vivido equivocado">
<title>Grillas — El mundo ha vivido equivocado</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<a href="#main-content" class="skip-link">Saltar al contenido principal</a>
<header>
<div class="container">
<p class="breadcrumb"><a href="/">Inicio</a> / <a href="/programa/">Programa</a> / Grillas</p>
<h1 class="site-title">Grillas de programa</h1>
<nav aria-label="Principal">
<ul>
<li><a href="/">Inicio</a></li>
<li><a href="/episodios/">Episodios</a></li>
<li><a href="/textos/">Textos</a></li>
</ul>
</nav>
</div>
</header>
<main id="main-content">
<div class="container">
<div class="page-content">
<p>Escaletas de cada episodio, en formato HTML y PDF.</p>
<table>
<thead>
<tr><th>Episodio</th><th>Fecha</th><th>PDF</th></tr>
</thead>
<tbody>
${rows}
</tbody>
</table>
</div>
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

try {
  main();
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
}