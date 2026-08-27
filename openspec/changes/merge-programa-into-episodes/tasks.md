# Tasks: merge-programa-into-episodes

- [x] 1.1 `scripts/lib/programa-audio.mjs`: extraer descubrimiento de
      `build-programa.mjs` — `findProgramaAudio({ num })` → `{ file, url, sizeMb,
      durSecs, date } | null`; fuentes: locales en `materiales/programas/` y
      fallback releases de GitHub (fetch cacheado por proceso);
      `findProgramaAudio()` tolera fallo de API devolviendo `null` + warning
- [x] 1.2 `scripts/lib/programa-audio.test.mjs`: match por número, `-dur` gana
      sobre raw, sin audio → `null`, regex de archivos inválidos, fallo de
      fuente → `null` (no throw)
- [x] 1.3 `scripts/build-episodes.mjs`: auto-poblar `audio` con la grabación
      descubierta SOLO si el frontmatter no lo define (frontmatter gana); el
      bloque `{{#audio}}` existente de `episode-template.html` hace el resto
      (botón ▶ al player global + descarga + badge 🎧 en el listado); fallo de
      descubrimiento → warning en consola, página sin audio, build exitoso
- [x] 1.4 `scripts/build-episodes.mjs`: quitar `programa-link` del index de
      `/episodios/`
- [x] 1.5 `scripts/build-programa.mjs`: usar la lib compartida (aquí el fallo
      de API SÍ es `exit(1)`, necesita los archivos); dejar de generar el
      listado y escribir en su lugar `dist/programa/index.html` como redirect
      a `/episodios/` (meta refresh + link visible + `noindex`); mantener
      copia/descarga de audios a `dist/programa/`; verificar que el sitemap
      excluye el stub (ya lo hace `isRedirectStub`) y que `check-html` pasa
- [x] 1.6 Actualizar `docs/workflow-programa.org`: `/programa/` ya no es
      listado (redirect a `/episodios/`), el player vive en la página de cada
      episodio, y un release publicado sin `.md` correspondiente queda sin
      página (comportamiento esperado — corregir también el pendiente de la
      línea 83)
- [x] 1.7 Tests + `just check` completo verde
