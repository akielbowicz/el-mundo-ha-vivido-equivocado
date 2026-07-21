# Change: Add markdown-based episode page system

## Why
El sitio necesita episodios definidos como archivos Markdown con frontmatter para que sea fácil agregar, editar y mantener el contenido. Cada episodio debe soportar audio, video embebido (YouTube), imágenes y ser completamente legible sin JavaScript.

## What Changes
- Pipeline que compila archivos `.md` con frontmatter → HTML estático en `dist/episodios/`
- Frontmatter con: título, fecha, slug (auto), audio URL, video URL (opcional), descripción, autores, tags
- Template HTML para episodios con layout responsive, reproductor de audio, embeds de YouTube
- Página de índice de episodios generada automáticamente
- Buscador client-side (vanilla JS) con fallback a índice sin JS
- Validación de frontmatter, duplicados de slug, y formato de URLs en build

## Impact
- Affected specs: `episode-pages` (new capability)
- Affected code: `episodios/`, `scripts/`, `src/`, `justfile`, `resources/`

## Beads
- el-mundo-ha-vivido-equivocado-1td — Build markdown-to-HTML pipeline
- el-mundo-ha-vivido-equivocado-tlc — Episode page template with frontmatter support
- el-mundo-ha-vivido-equivocado-asn — Responsive episode layout
- el-mundo-ha-vivido-equivocado-3x0 — Reader mode compatibility for episode pages
- el-mundo-ha-vivido-equivocado-afm — Episode index page from markdown sources
- el-mundo-ha-vivido-equivocado-tbe — Site-wide search functionality
- el-mundo-ha-vivido-equivocado-8np — Frontmatter validation in build step