/**
 * build-programa.mjs
 *
 * Genera una página oculta en /programa/ con los episodios en
 * materiales/programas/ (ej: 001-20260813.mp3). Copia los audios a
 * dist/programa/ y crea un reproductor <audio> por episodio.
 *
 * La página NO está linkeada desde la navegación principal — solo accesible
 * por URL directa (equivocadxs.ar/programa/).
 *
 * Usage: node scripts/build-programa.mjs
 */

import { mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "materiales/programas";
const OUT_DIR = "dist/programa";

// Archivos esperados: 001-20260813.mp3, 002-20260820.mp3, ...
const EPISODE_RE = /^(\d{3})-(\d{4})(\d{2})(\d{2})\.(mp3|wav|flac|ogg|m4a)$/i;

function listEpisodes() {
  let files;
  try {
    files = readdirSync(SRC_DIR);
  } catch {
    return []; // no hay carpeta todavía
  }

  const episodios = [];
  for (const f of files) {
    const m = f.match(EPISODE_RE);
    if (!m) {
      console.log(`  (saltando archivo sin patrón: ${f})`);
      continue;
    }
    const [, num, y, mo, d] = m;
    const path = join(SRC_DIR, f);
    const sizeMb = (statSync(path).size / (1024 * 1024)).toFixed(1);
    episodios.push({
      num: parseInt(num, 10),
      file: f,
      sizeMb,
      date: new Date(`${y}-${mo}-${d}T12:00:00`),
    });
  }

  return episodios.sort((a, b) => a.num - b.num);
}

function main() {
  console.log("  Escaneando materiales/programas/...");
  const episodios = listEpisodes();

  if (episodios.length === 0) {
    console.log("  No hay episodios. Skipping.");
    return;
  }

  console.log(`  Encontrados ${episodios.length} episodio(s).`);

  // Copiar audios a dist/programa/
  mkdirSync(OUT_DIR, { recursive: true });
  for (const ep of episodios) {
    copyFileSync(join(SRC_DIR, ep.file), join(OUT_DIR, ep.file));
  }
  console.log("  Audios copiados a dist/programa/.");

  // Construir HTML
  const episodesHtml = episodios
    .map((ep) => {
      const published = ep.date.toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return `
    <article class="episodio">
      <h2>Episodio ${ep.num} — ${published}</h2>
      <p class="meta">${published} — ${ep.sizeMb} MB</p>
      <audio controls preload="none">
        <source src="./${ep.file}" type="audio/mpeg">
        Tu navegador no soporta el reproductor de audio.
      </audio>
      <p class="descarga">
        <a href="./${ep.file}" download>Descargar MP3</a>
      </p>
    </article>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Programa — El mundo ha vivido equivocado</title>
<link rel="stylesheet" href="/style.css">
<style>
  main { max-width: 640px; margin: 0 auto; padding: 2rem 1rem; }
  h1 { font-size: 1.5rem; margin-bottom: 2rem; }
  .episodio { margin-bottom: 2.5rem; padding-bottom: 2rem; border-bottom: 1px solid #ccc; }
  .episodio:last-child { border-bottom: none; }
  .episodio h2 { font-size: 1.15rem; margin-bottom: 0.25rem; }
  .episodio .meta { font-size: 0.85rem; color: #666; margin-bottom: 0.75rem; }
  .episodio audio { width: 100%; margin-bottom: 0.5rem; }
  .episodio .descarga { font-size: 0.85rem; }
</style>
</head>
<body>
<a href="#main-content" class="skip-link">Saltar al contenido principal</a>
<header>
<div class="container">
<p class="breadcrumb"><a href="/">Inicio</a> / Programa</p>
<h1 class="site-title">Programa</h1>
<p class="site-tagline">Episodios del programa de radio</p>
<nav aria-label="Principal">
<ul>
<li><a href="/">Inicio</a></li>
</ul>
</nav>
</div>
</header>
<main id="main-content">
${episodesHtml}
</main>
<footer>
<div class="container">
<p><a href="/">Volver al inicio</a></p>
</div>
</footer>
</body>
</html>`;

  writeFileSync(join(OUT_DIR, "index.html"), html);
  console.log(`  ✓ Written: ${join(OUT_DIR, "index.html")}`);
}

main();