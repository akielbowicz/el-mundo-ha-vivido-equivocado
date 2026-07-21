## Context
Necesitamos un sistema para que los episodios del programa de radio se definan como archivos Markdown con frontmatter, se compilen a HTML estático en el build, y tengan audio, video embebido, imágenes, y búsqueda.

El sitio es completamente estático (sin backend, sin base de datos), desplegado en GitHub Pages.

## Goals / Non-Goals
- Goals:
  - Episodios como `.md` con frontmatter → HTML estático
  - Audio player, YouTube embeds, imágenes responsive
  - Búsqueda client-side con vanilla JS
  - Sin degradación sin JavaScript (contenido visible, fallback a índice)
- Non-Goals:
  - No CMS dinámico
  - No base de datos
  - No autenticación
  - No comentarios
  - No RSS feed (v1)

## Decisions

### Decision: Markdown compilation at build time
Usar `marked` (parser) + `gray-matter` (frontmatter) en `scripts/build-episodes.mjs` que se ejecuta en `just build`. Cada episodio genera `dist/episodios/<slug>/index.html`.
El script lee directamente de `episodios/`, no pasa por el pipeline de squint.

Alternativa considerada: compilar en cliente con JS. Descartado porque rompe reader mode y a11y.

### Decision: Search as vanilla JS substring matching
Generar `dist/search-index.json` en build time. La búsqueda client-side usa `String.prototype.includes()` para filtrar por título, autor y descripción. Sin dependencias externas.

Alternativa considerada: Fuse.js (fuzzy matching). Descartado para v1 por simplicidad — <100 episodios no necesita fuzzy matching. Revisar si se solicita.

### Decision: Slug auto-generation
Slug se auto-genera del título: lowercase, replace spaces con hyphens, remove acentos. El campo `slug` en frontmatter es opcional — si está presente, se usa tal cual (con validación).

### Decision: Audio files hosteados externamente
Los archivos de audio se hostean fuera del repo (SoundCloud, AWS S3, etc.) y se referencian por URL en frontmatter. GitHub tiene límite de 100MB por archivo y el historial de git crece con binarios.

### Decision: Date format ISO 8601
Todas las fechas en frontmatter usan ISO 8601 (`2026-07-21`).

### Decision: Audio player nativo HTML5
Usar `<audio controls>` con fallback de descarga directa. No usar reproductores JS externos.

### Decision: YouTube embeds con a11y
Usar `<iframe>` con `loading="lazy"`, `title`, y enlace directo como fallback. No usar API de YouTube JS. Validar URL de YouTube en build.

## Risks / Trade-offs
- Search index crece con cada episodio → aceptable para sitio pequeño (<1MB)
- YouTube iframe puede trackear usuarios → informar en política de privacidad
- Dependencia de `marked` y `gray-matter` en build → versiones pinneadas en package.json
- Audio externo puede desaparecer → documentar procedimiento de backup

## Migration Plan
1. Crear `scripts/build-episodes.mjs` y `scripts/episode-template.html`
2. Agregar `episodios/` como directorio de contenido
3. Agregar episodio de muestra
4. Integrar con `justfile` y CI

## Open Questions
- (ninguna — todas resueltas)