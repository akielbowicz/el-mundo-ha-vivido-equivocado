## Context
El programa lee cuentos en voz alta, pero actualmente el texto del cuento está mezclado con el comentario en los episodios. Necesitamos una sección separada para los textos, donde se puedan leer completos, con soporte para exportación a EPUB (Kindle) y PDF.

Además, queremos métricas básicas de visitas (Cloudflare Web Analytics) y mejorar los estilos de impresión.

## Goals / Non-Goals
- Goals:
  - Sección `textos/` con cuentos como `.md` frontmatter → HTML estático
  - Export EPUB por episodio y texto
  - Export PDF via botón de impresión
  - Cloudflare Web Analytics
  - Compatibilidad con Kindle
- Non-Goals:
  - No DRM en EPUBs
  - No comentarios en textos
  - No autenticación para descargas

## Decisions

### Decision: Build pipeline paralelo a episodios
Crear `scripts/build-textos.mjs` similar a `build-episodes.mjs` pero para textos. Comparte helpers comunes (slugify, renderTemplate, formatDate).

Alternativa considerada: fusionar todo en un solo script. Descartado para mantener separación de concerns.

### Decision: EPUB generation con epub-gen
Usar `epub-gen` (npm) para generar EPUBs en build time. Es simple, no requiere pandoc ni dependencias externas.

Alternativa considerada: pandoc (más potente pero requiere instalación del sistema). Descartado para portabilidad.

### Decision: Cloudflare Web Analytics
Usar el snippet oficial de CF Web Analytics. Sin cookies, sin configuración de servidor, 5 minutos de implementación.

### Decision: Sin copyright
Los textos publicados serán fragmentos y comentarios (derecho de cita), no obras completas bajo copyright. Si se agregan textos completos, deben ser dominio público o con permiso explícito.

## Risks / Trade-offs
- EPUB genera archivos binarios en el repo → agregar `dist/**/*.epub` a .gitignore
- Kindle no soporta EPUB nativamente (requiere Send to Kindle o calibre) → documentar
- CF Web Analytics depende de que el dominio esté en Cloudflare (ya está)

## Open Questions
- (ninguna)