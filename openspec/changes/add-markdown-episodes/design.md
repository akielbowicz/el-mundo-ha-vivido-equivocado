## Context
Necesitamos un sistema para que los episodios del programa de radio se definan como archivos Markdown con frontmatter, se compilen a HTML estático en el build, y tengan audio, video embebido, imágenes, y búsqueda.

El sitio es completamente estático (sin backend, sin base de datos), desplegado en GitHub Pages.

## Goals / Non-Goals
- Goals:
  - Episodios como `.md` con frontmatter → HTML estático
  - Audio player, YouTube embeds, imágenes responsive
  - Búsqueda client-side
  - Sin degradación sin JavaScript (contenido visible)
- Non-Goals:
  - No CMS dinámico
  - No base de datos
  - No autenticación
  - No comentarios

## Decisions

### Decision: Markdown compilation at build time
Usar `marked` (parser) + `gray-matter` (frontmatter) en un script Node.js que se ejecuta en `just build`. Cada episodio genera `dist/episodios/<slug>/index.html`.

Alternativa considerada: compilar en cliente con JS. Descartado porque rompe reader mode y a11y.

### Decision: Search index as static JSON
Generar `dist/search-index.json` en build time con todos los metadatos de episodios. La búsqueda client-side filtra este JSON con Fuse.js o vanilla JS.

Alternativa considerada: Lunr.js (más pesado, requiere índice invertido). Fuse.js es más simple y suficiente para ~100 episodios.

### Decision: Audio player nativo HTML5
Usar `<audio controls>` con fallback de descarga directa. No usar reproductores JS externos.

### Decision: YouTube embeds con a11y
Usar `<iframe>` con `loading="lazy"`, `title`, y enlace directo como fallback. No usar API de YouTube JS.

## Risks / Trade-offs
- Search index crece con cada episodio → aceptable para sitio pequeño (<1MB)
- YouTube iframe puede trackear usuarios → informar en política de privacidad
- Dependencia de `marked` y `gray-matter` en build → versiones pinneadas en package.json

## Migration Plan
1. Crear scripts y templates
2. Agregar `episodios/` como directorio de contenido
3. Migrar homepage existente a nuevo sistema
4. Agregar episodio de muestra

## Open Questions
- ¿Hostear archivos de audio en el repo o externamente? (externo recomendado — GitHub limita tamaños)
- ¿Formato de fecha? ISO 8601 en frontmatter