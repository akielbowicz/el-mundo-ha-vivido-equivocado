/**
 * build-programa.mjs
 *
 * Copia/descarga las grabaciones completas del programa a dist/programa/ y
 * convierte /programa/ en una página de redirect hacia /episodios/, donde
 * ahora vive el reproductor de cada episodio (ver change
 * merge-programa-into-episodes).
 *
 * Fuente de episodios (en orden de prioridad):
 *   1. Archivos locales en materiales/programas/ (001-20260813.mp3)
 *   2. Si no hay locales: assets de los releases de GitHub (caso CI,
 *      donde la carpeta materiales/ no se commitea)
 *
 * Los audios se copian a dist/programa/ y se sirven desde el propio sitio
 * (los episodios los embeben via /programa/<file>, misma URL de siempre).
 *
 * A diferencia de build-episodes.mjs, acá un fallo del descubrimiento SÍ
 * rompe el build (exit 1): este script necesita los archivos reales.
 *
 * Usage: node scripts/build-programa.mjs
 */

import { mkdirSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { listProgramaAudio } from "./lib/programa-audio.mjs";

const OUT_DIR = "dist/programa";

/* ── Descarga de assets desde releases (caso CI) ── */

function fetchAssets(episodios) {
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

/* ── Redirect page ── */

function buildRedirect() {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=/episodios/">
<title>Episodios — El mundo ha vivido equivocado</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<a href="#main-content" class="skip-link">Saltar al contenido principal</a>
<main id="main-content" class="container">
<h1 class="site-title">Episodios</h1>
<p>Los programas completos ahora se escuchan en la página de cada episodio.</p>
<p><a href="/episodios/">Ir a Episodios →</a></p>
</main>
</body>
</html>`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "index.html"), html);
  console.log(`  ✓ Written: ${join(OUT_DIR, "index.html")} (redirect → /episodios/)`);
}

/* ── Main ──────────────────────────────── */

async function main() {
  // Descubrimiento estricto: sin archivos no hay nada que copiar/descargar
  const episodios = await listProgramaAudio({ graceful: false });

  if (episodios.length > 0) {
    mkdirSync(OUT_DIR, { recursive: true });
    if (episodios[0].source === "local") {
      for (const ep of episodios) {
        copyFileSync(ep.srcPath, join(OUT_DIR, ep.file));
      }
      console.log(`  ${episodios.length} audio(s) local(es) copiado(s) a dist/programa/.`);
    } else {
      fetchAssets(episodios);
    }
  } else {
    console.log("  No hay episodios publicados — solo redirect.");
  }

  buildRedirect();
}

main().catch((err) => {
  console.error("  ✗ Error:", err.message);
  process.exit(1);
});
