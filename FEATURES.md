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

Agregar `status: scheduled` y `status: cancelled` al frontmatter, combinado con una fecha futura.

- `status: scheduled` → se muestra en la página de inicio como "Próximamente" con fecha
- No se incluye en el índice de episodios publicados
- Se puede generar un feed iCal/JSON de próximos episodios
- `status: cancelled` → no se publica, no se muestra. Opcionalmente muestra aviso si estaba previamente scheduled
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
Opción "Imprimir / Guardar como PDF" usando la API nativa del navegador (`window.print()`). Botón "Exportar PDF" en cada episodio.

Mejoras necesarias al `@media print` actual:
- Ocultar `.episode-audio`, `.episode-video`, `.episode-nav` (ya oculta header, footer, nav, skip-link)
- Asegurar que el contenido del artículo fluya correctamente en página impresa
- Agregar la URL del episodio como footer en cada página impresa

Alternativa más ambiciosa (P4): generar PDF estático en build time con `puppeteer` o `jsdom` + `pdf-lib`, para que el PDF exista como archivo estático en el deploy.

## 4. Página de cuentos/textos

Nuevo tipo de contenido: `textos/` — cuentos originales, ensayos, columnas.

- Misma estructura que episodios: `.md` con frontmatter → HTML estático
- Frontmatter: título, autor, fecha, género, tags, licencia
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

### ⚠️ Copyright

Si se publican textos completos de autores como Borges (†1986) o Cortázar (†1984), estos están **bajo copyright en Argentina** (vida + 70 años, dominio público desde 2056 y 2054 respectivamente).

Opciones:
- Publicar solo fragmentos y comentarios (fair use / derecho de cita)
- Usar obras en dominio público (autores fallecidos antes de 1956)
- Obtener permiso de los titulares de derechos
- Limitar la página de textos a obras originales del programa o autores que autoricen

El sample `el-aleph.md` actual usa solo fragmentos cortos con comentario, lo cual está dentro del derecho de cita. Si se expande a texto completo, hay que resolver licencias primero.

## 5. Kindle / e-reader compatibility

Generar archivos .epub en build time. Kindle acepta .epub (enviando por email o USB).

Opciones:
- **`epub-gen`** — librería npm, genera EPUB desde HTML/Markdown
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
- **Imágenes:** deben descargarse e incrustarse localmente en el EPUB (Kindle offline no carga URLs externas)
- Fuentes embedidas opcionales para mejor experiencia

## 6. Visit metrics (analytics)

### Opción recomendada (P1): Cloudflare Web Analytics

Cloudflare Web Analytics es gratis, sin cookies, privacy-first, y funciona con cualquier página estática.

Implementación:
1. Ir a Cloudflare Dashboard → Analytics → Web Analytics
2. Agregar dominio `equivocados.ar`
3. Copiar el snippet JS
4. Agregar a `scripts/episode-template.html` y `resources/index.html`

Ventajas:
- Sin cookies (no necesita banner de consentimiento GDPR)
- Sin impacto en performance
- Sin backend que mantener
- Datos básicos: páginas vistas, visitantes únicos, referentes, países

### Opción avanzada (P4): Cloudflare Worker + KV

Para quienes necesitan más control que CF Web Analytics: un worker similar a suipacha/emprende que registra eventos de tracking y expone stats.

Arquitectura:
```
Navegador → POST /api/track → Cloudflare Worker → KV Storage
                           → GET  /api/stats  → Contadores públicos
```

#### Worker endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/track | No | Registra visita de página (page, referrer, timestamp) |
| GET | /api/stats | No | Contadores públicos (visitas totales, visits/hoy, top pages) |
| GET | /api/stats/detail | Bearer | Stats detalladas (protegido) |

#### Tracking event schema
```json
{
  "page": "/episodios/el-aleph/",
  "referrer": "https://equivocados.ar/",
  "ts": "2026-07-21T20:00:00Z",
  "ua": "Mozilla/5.0..."
}
```

#### Client-side integration
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

#### Deploy
- Usar `wrangler.toml` + `worker.js` en `workers/track/`
- KV namespace para almacenar contadores
- Desplegar en Cloudflare (dominio `equivocados.ar` ya está en Cloudflare)

#### Privacidad
- Almacenar solo datos anonimizados/agregados
- No usar cookies ni fingerprinting
- Opción de no-track vía Do Not Track header o query param
- Considerar GDPR/ePrivacy si hay tráfico UE

## Priorización sugerida

| Feature | Esfuerzo | Impacto | Prioridad |
|---------|----------|---------|-----------|
| Visit metrics (CF Web Analytics) | Bajo (5 min) | Alto | P1 |
| Página de cuentos/textos (excerpts) | Medio (1-2h) | Alto | P1 |
| Export PDF (print button + styles) | Bajo (15 min) | Medio | P2 |
| Kindle/EPUB export | Medio (2-3h) | Medio | P2 |
| Seasonal theming | Bajo (30 min) | Bajo | P3 |
| Scheduled + Cancelled status | Medio (1-2h) | Bajo | P3 |
| Static PDF generation (build-time) | Alto (3-4h) | Bajo | P4 |
| Custom Worker analytics | Alto (3-4h) | Medio | P4 |