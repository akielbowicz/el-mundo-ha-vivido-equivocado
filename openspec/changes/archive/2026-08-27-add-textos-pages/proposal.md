# Change: Add textos pages for reading full texts

## Why
El sitio necesita una sección dedicada a los cuentos y textos que se leen en el programa, separada de los episodios. Cada texto debe poder leerse independientemente, con soporte para exportar a EPUB, PDF, y compatibilidad con Kindle/e-readers.

## What Changes
- Nueva sección `textos/` con mismo pipeline que episodios: `.md` con frontmatter → HTML estático
- Frontmatter: título, autor, fecha, género, licencia, tags
- Página de índice de textos con filtros por autor y género
- Export PDF via botón de impresión + estilos `@media print` mejorados
- Export EPUB a build time para Kindle/e-readers
- Navegación entre textos (prev/next) y relación opcional con episodios
- Cloudflare Web Analytics snippet para métricas de visitas

## Impact
- Affected specs: `textos-pages` (new capability), `episode-pages` (minor: analytics, print styles)
- Affected code: `textos/`, `scripts/build-textos.mjs`, `scripts/build-epub.mjs`, `scripts/`, `justfile`, `resources/`, `src/`

## Beads
- el-mundo-ha-vivido-equivocado-pl2 - Build textos pipeline (markdown to HTML, index, template)
- el-mundo-ha-vivido-equivocado-zcp - Add EPUB generation for Kindle/e-reader compatibility
- el-mundo-ha-vivido-equivocado-tdd - Add print button and improved print stylesheets
- el-mundo-ha-vivido-equivocado-y2n - Add Cloudflare Web Analytics for visit metrics
- el-mundo-ha-vivido-equivocado-7bh - Add seasonal theming (CSS variables + JS date detection)
- el-mundo-ha-vivido-equivocado-h6o - Add scheduled and cancelled status to episodes