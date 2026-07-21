# Change: Add markdown-based episode page system

## Why
El sitio necesita episodios definidos como archivos Markdown con frontmatter para que sea fácil agregar, editar y mantener el contenido. Cada episodio debe soportar audio, video embebido (YouTube), imágenes y ser completamente legible sin JavaScript.

## What Changes
- Pipeline que compila archivos `.md` con frontmatter → HTML estático en `dist/episodios/`
- Frontmatter con: título, fecha, slug, audio URL, video URL (opcional), descripción, autores
- Template HTML para episodios con layout responsive, reproductor de audio, embeds de YouTube
- Página de índice de episodios generada automáticamente
- Buscador client-side que filtra episodios por título, autor, descripción
- Validación de frontmatter en build

## Impact
- Affected specs: `episode-pages` (new capability)
- Affected code: `src/`, `scripts/`, `justfile`, `resources/`, `squint.edn`

## Beads
- el-mundo-ha-vivido-equivocado-1td — Build markdown-to-HTML pipeline
- el-mundo-ha-vivido-equivocado-tlc — Episode page template with frontmatter
- el-mundo-ha-vivido-equivocado-asn — Responsive episode layout
- el-mundo-ha-vivido-equivocado-tbe — Site-wide search
- el-mundo-ha-vivido-equivocado-3x0 — Reader mode compatibility
- el-mundo-ha-vivido-equivocado-afm — Episode index page