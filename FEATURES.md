# Features thinking — El mundo ha vivido equivocado

## 1. Seasonal theming

Cambiar la paleta de colores según la época del año usando CSS custom properties + JavaScript date detection.

- **Invierno:** tonos fríos, azules profundos
- **Primavera:** verdes, tonos tierra
- **Verano:** cálidos, dorados
- **Otoño:** ocres, naranjas, marrones
- **Especial:** Halloween, Navidad, efemérides literarias (ej. natalicio de Borges)

Implementación:
- `:root` con variables de tema actual en JavaScript (`document.documentElement.style.setProperty`)
- Clase en `<html>` para CSS: `<html class="theme-invierno">`
- Opcional: el usuario puede elegir tema manualmente (persistir en localStorage)

## 2. Scheduled programs (episodios programados)

Agregar `status: scheduled` al frontmatter, combinado con una fecha futura.

- `status: scheduled` → se muestra en la página de inicio como "Próximamente" con fecha
- No se incluye en el índice de episodios publicados
- Se puede generar un feed iCal/JSON de próximos episodios
- Automáticamente pasa a `published` cuando la fecha llega (requiere build CI diario, ej. cron en GitHub Actions)

Frontmatter:
```yaml
---
title: "Episodio futuro"
date: "2026-09-15"
status: scheduled
---
```

## 3. Embed text & export to PDF

### Embed text
El contenido del cuento puede incluirse directamente en el markdown del episodio. Ya funciona con el sistema actual. Mejora: separar el cuento del comentario usando un delimitador (`---more---`) para mostrar "Leer cuento completo" expandible.

### Export to PDF
Opción "Imprimir / Guardar como PDF" usando la API nativa del navegador (`window.print()`). Agregar estilos `@media print` más completos (ya hay uno básico). Botón "Exportar PDF" en cada episodio.

Alternativa más ambiciosa: generar PDF estático en build time con `puppeteer` o `jsdom` + `pdf-lib`, para que el PDF exista como archivo estático en el deploy.

## 4. Página de cuentos/textos

Nuevo tipo de contenido: `textos/` — cuentos originales, ensayos, columnas.

- Misma estructura que episodios: `.md` con frontmatter → HTML estático
- Frontmatter: título, autor, fecha, género, tags
- Página de índice de textos
- Independiente de los episodios (un cuento puede leerse sin el episodio)
- Opcional: relación N:M entre episodios y textos (un episodio puede referenciar varios textos)

Estructura:
```
textos/
├── el-aleph.md          # el cuento original
├── la-noche-boca-arriba.md
└── index.md             # página de índice
```

El build pipeline existente (`build-episodes.mjs`) se extiende o se crea un `build-textos.mjs` paralelo.

## 5. Kindle / e-reader compatibility

Generar archivos .epub en build time. Kindle acepta .epub (enviando por email o USB).

Opciones:
- **`epub-gen`** — librería npm, genera EPUB desde HTML/ Markdown
- **`pandoc`** — CLI potente: `pandoc episodio.md -o episodio.epub`
- **Manual:** estructura ZIP con XML estándar EPUB

Implementación:
- Script `scripts/build-epub.mjs` que genera un EPUB por episodio
- Enlace "Descargar EPUB" en cada página de episodio
- Opcional: EPUB compilado de todos los episodios (antología)

Requisitos para Kindle:
- Metadata: título, autor, idioma (es), fecha
- Cubierta: portada del episodio o genérica
- Tabla de contenidos (nav.xhtml)
- CSS embebido mínimo, tipografía limpia

## 6. Visit metrics (analytics)

Enfoque similar a suipacha: un Cloudflare Worker con KV que recibe eventos de tracking y expone stats.

Arquitectura:
```
Navegador → POST /api/track → Cloudflare Worker → KV Storage
                           → GET  /api/stats  → Contadores públicos
```

### Worker endpoints (inspirado en suipacha/emprende/worker/worker.js)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/track | No | Registra visita de página (page, referrer, timestamp) |
| GET | /api/stats | No | Contadores públicos (visitas totales, visits/hoy, top pages) |
| GET | /api/stats/detail | Bearer | Stats detalladas (protegido) |

### Tracking event schema (POST /api/track)
```json
{
  "page": "/episodios/el-aleph/",
  "referrer": "https://equivocados.ar/",
  "ts": "2026-07-21T20:00:00Z",
  "ua": "Mozilla/5.0..."
}
```

### Client-side integration
Agregar a `core.cljs`:
```clojure
(defn track-visit []
  (js/fetch "https://worker.equivocados.ar/api/track"
    (clj->js {:method "POST"
              :headers {"Content-Type" "application/json"}
              :body (js/JSON.stringify
                      (clj->js {:page (.-pathname js/location)
                                :referrer (.-referrer js/document)
                                :ts (js/Date.)}))})))
```

### Deploy del worker
- Usar `wrangler.toml` + `worker.js` en `workers/track/`
- KV namespace para almacenar contadores
- Desplegar en Cloudflare (dominio `equivocados.ar` ya está en Cloudflare)

### Alternativa: Cloudflare Web Analytics
Cloudflare Web Analytics es gratis, sin cookies, y funciona con cualquier página estática. Solo requiere agregar un snippet JS. Mucho más simple que un worker custom, pero con menos control sobre los datos.

## Priorización sugerida

| Feature | Esfuerzo | Impacto | Prioridad |
|---------|----------|---------|-----------|
| Visit metrics (CF Web Analytics) | Bajo (5 min) | Alto | P1 |
| Página de cuentos/textos | Medio (1-2h) | Alto | P1 |
| Export PDF (print stylesheet) | Bajo (15 min) | Medio | P2 |
| Kindle/EPUB export | Medio (2-3h) | Medio | P2 |
| Seasonal theming | Bajo (30 min) | Bajo | P3 |
| Scheduled programs | Medio (1-2h) | Bajo | P3 |
| Cloudflare Worker custom analytics | Alto (3-4h) | Medio | P4 |