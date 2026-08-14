/**
 * build-programa.mjs
 *
 * Genera una página oculta en /programa/ con los episodios publicados como
 * releases de GitHub. Cada episodio tiene un reproductor <audio>.
 *
 * La página NO está linkeada desde la navegación principal — solo accesible
 * por URL directa (equivocadxs.ar/programa/).
 *
 * Usage: node scripts/build-programa.mjs
 */

const REPO = "akielbowicz/el-mundo-ha-vivido-equivocado";
const API = `https://api.github.com/repos/${REPO}/releases?per_page=100`;
const OUT_DIR = "dist/programa";
const SITE = "https://equivocadxs.ar";

async function main() {
  console.log("  Fetching releases from GitHub...");

  const res = await fetch(API, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!res.ok) {
    console.error(`  ✗ GitHub API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const releases = await res.json();

  // Filter only episodio-* tags, sort ascending
  const episodios = releases
    .filter((r) => r.tag_name?.startsWith("episodio-"))
    .sort((a, b) => {
      const na = parseInt(a.tag_name.replace("episodio-", ""), 10);
      const nb = parseInt(b.tag_name.replace("episodio-", ""), 10);
      return na - nb;
    });

  if (episodios.length === 0) {
    console.log("  No episodes found. Skipping.");
    return;
  }

  console.log(`  Found ${episodios.length} episode(s).`);

  // Build HTML
  const episodesHtml = episodios
    .map((ep) => {
      const audioAsset = ep.assets.find((a) =>
        /\.(mp3|wav|flac|ogg|m4a)$/i.test(a.name)
      );

      if (!audioAsset) return "";

      const sizeMb = (audioAsset.size / (1024 * 1024)).toFixed(1);
      const published = new Date(ep.published_at).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return `
    <article class="episodio">
      <h2>${ep.name || ep.tag_name}</h2>
      <p class="meta">${published} — ${sizeMb} MB</p>
      <audio controls preload="none">
        <source src="${audioAsset.browser_download_url}" type="audio/mpeg">
        Tu navegador no soporta el reproductor de audio.
      </audio>
      <p class="descarga">
        <a href="${audioAsset.browser_download_url}" download>Descargar MP3</a>
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

  // Write
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/index.html`, html);
  console.log(`  ✓ Written: ${OUT_DIR}/index.html`);
}

main().catch((err) => {
  console.error("  ✗ Error:", err.message);
  process.exit(1);
});