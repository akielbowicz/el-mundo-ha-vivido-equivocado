# Merge /programa/ into episode pages

## Why

`/programa/` es una página semi-oculta que lista los programas completos de radio
con reproductores `<audio>`, separada de `/episodios/`, donde viven las páginas
ricas de cada episodio (portada, descripción, tags). El visitante que quiere
escuchar un episodio tiene que saber que existe otra página, alcanzable solo por
un link al pie de `/episodios/`. La grabación completa pertenece a la página del
episodio: un solo lugar por episodio, con todo el contexto.

## What Changes

- **Player embebido en cada episodio, reusando el mecanismo existente:** las
  páginas de episodios ya saben mostrar audio — el bloque `{{#audio}}` de
  `episode-template.html` (botón "▶ Reproducir episodio" cableado al player
  global + link de descarga + badge "🎧 Audio" en el listado) se activa hoy solo
  con `audio:` explícito en el frontmatter. El cambio: `build-episodes.mjs`
  auto-puebla ese campo con la grabación de programa descubierta, como fallback
  cuando el frontmatter no lo define.
- **Precedencia:** frontmatter `audio:` explícito gana; si no hay, se descubre
  la grabación de programa por número de episodio; si tampoco hay, la página se
  renderiza igual sin sección de audio (nada roto, nada vacío).
- **Match por número:** el prefijo del archivo del episodio (`001-casas-hecker.md`
  → `001`) se matchea con el número del audio de programa (`001-20260813.mp3`,
  release `episodio-001`). La variante editada `-dur` gana sobre la raw.
- **Flujo "once deployed":** en desarrollo el descubrimiento lee
  `materiales/programas/`; en CI (donde `materiales/` no existe) cae a los
  releases de GitHub — el player aparece en la página del episodio
  automáticamente al publicarse el release con `publish-episodio`.
- **Descubrimiento compartido y graceful:** la lógica se extrae a
  `scripts/lib/programa-audio.mjs`, usada por ambos builds. En
  `build-episodes.mjs` un fallo de descubrimiento (p. ej. rate limit de la API
  de GitHub) es graceful: warning + páginas sin player — nunca rompe el build
  del sitio. Solo `build-programa.mjs` (que sí necesita los archivos) mantiene
  el `exit(1)`. Los `.mp3` siguen viviendo y sirviéndose desde `dist/programa/`
  (mismas URLs, sin duplicar archivos).
- **`/programa/` pasa a redirigir:** `dist/programa/index.html` pasa a ser una
  página de redirect (meta refresh + link visible, sin JS-dependencia) hacia
  `/episodios/`, con `noindex` para que no aparezca en buscadores mientras
  estos consolidan la señal. Los audios siguen descargables en las URLs de
  siempre.
- **Se quita el link "Escuchá los programas completos →"** del listado de
  `/episodios/` (ya no apunta a nada útil).
- **Comportamiento explícito para audio huérfano:** un release publicado sin
  `.md` de episodio correspondiente queda sin página que lo linkee (antes lo
  listaba `/programa/`). Es el comportamiento esperado: el audio se publica
  cuando la página está lista. Se documenta en `docs/workflow-programa.org`.

## Capabilities

### Modified
- `episode-pages`: embebido de la grabación completa en la página del episodio
  (extiende el mecanismo existente de `audio` en frontmatter).

## Impact

- `scripts/build-episodes.mjs`: auto-poblado del campo `audio` vía
  descubrimiento de programa + se elimina el `programa-link` del index.
- `scripts/build-programa.mjs`: usa la lib compartida; deja generar el listado
  y pasa a escribir el redirect + copiar/descargar audios.
- Nuevo `scripts/lib/programa-audio.mjs` (+ tests unitarios en `check-tests`).
- Sin cambios de URLs para los `.mp3`; `/programa/` no se elimina, redirige.
- El sitemap ya excluye stubs de redirect (`build-sitemap.mjs:41`) y
  `check-html`/a11y validan el markup nuevo vía pre-commit/pre-push.
