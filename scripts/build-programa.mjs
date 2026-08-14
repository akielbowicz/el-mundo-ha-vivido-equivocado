/**
 * build-programa.mjs
 *
 * Genera una página oculta en /programa/ con los episodios del programa.
 * Cada episodio tiene un reproductor <audio>.
 *
 * Fuente de episodios (en orden de prioridad):
 *   1. Archivos locales en materiales/programas/ (001-20260813.mp3)
 *   2. Si no hay locales: assets de los releases de GitHub (caso CI,
 *      donde la carpeta materiales/ no se commitea)
 *
 * Los audios se copian a dist/programa/ y la página los sirve desde el
 * propio sitio.
 *
 * La página NO está linkeada desde la navegación principal — solo accesible
 * por URL directa (equivocadxs.ar/programa/).
 *
 * Usage: node scripts/build-programa.mjs
 */

import { mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const SRC_DIR = "materiales/programas";
const OUT_DIR = "dist/programa";
const REPO = "akielbowicz/el-mundo-ha-vivido-equivocado";
const API = `https://api.github.com/repos/${REPO}/releases?per_page=100`;

// Archivos esperados: 001-20260813.mp3, 002-20260820.mp3, ...
const EPISODE_RE = /^(\d{3})-(\d{4})(\d{2})(\d{2})\.(mp3|wav|flac|ogg|m4a)$/i;

function listLocalEpisodes() {
  if (!existsSync(SRC_DIR)) return [];

  const episodios = [];
  for (const f of readdirSync(SRC_DIR)) {
    const m = f.match(EPISODE_RE);
    if (!m) continue;
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

async function listReleaseEpisodes() {
  console.log("  No hay locales — consultando releases de GitHub...");

  const res = await fetch(API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    console.error(`  ✗ GitHub API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const releases = await res.json();
  const episodios = [];

  for (const r of releases) {
    if (!r.tag_name?.startsWith("episodio-")) continue;
    const num = parseInt(r.tag_name.replace("episodio-", ""), 10);
    const asset = r.assets?.find((a) => EPISODE_RE.test(a.name));
    if (!asset) continue;

    const m = asset.name.match(EPISODE_RE);
    const [, , y, mo, d] = m;
    episodios.push({
      num,
      file: asset.name,
      sizeMb: (asset.size / (1024 * 1024)).toFixed(1),
      date: new Date(`${y}-${mo}-${d}T12:00:00`),
      downloadUrl: asset.browser_download_url,
    });
  }

  return episodios.sort((a, b) => a.num - b.num);
}

async function fetchAssets(episodios) {
  console.log("  Descargando assets de releases...");
  mkdirSync(OUT_DIR, { recursive: true });

  for (const ep of episodios) {
    const dest = join(OUT_DIR, ep.file);
    if (existsSync(dest)) {
      console.log(`  (ya existe ${ep.file}, skip)`);
      continue;
    }
    console.log(`  Descargando ${ep.file}...`);
    execSync(`curl -fsL "${ep.downloadUrl}" -o "${dest}"`);
  }
}

function buildPage(episodios) {
  console.log(`  Encontrados ${episodios.length} episodio(s).`);

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

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "index.html"), html);
  console.log(`  ✓ Written: ${join(OUT_DIR, "index.html")}`);
}

async function main() {
  console.log("  Escaneando materiales/programas/...");

  let episodios = listLocalEpisodes();

  if (episodios.length > 0) {
    // Copiar audios locales a dist/programa/
    mkdirSync(OUT_DIR, { recursive: true });
    for (const ep of episodios) {
      copyFileSync(join(SRC_DIR, ep.file), join(OUT_DIR, ep.file));
    }
    console.log("  Audios locales copiados a dist/programa/.");
  } else {
    // Caso CI: descargar desde releases
    episodios = await listReleaseEpisodes();
    if (episodios.length === 0) {
      console.log("  No hay episodios publicados. Skipping.");
      return;
    }
    await fetchAssets(episodios);
  }

  buildPage(episodios);
}

main().catch((err) => {
  console.error("  ✗ Error:", err.message);
  process.exit(1);
});