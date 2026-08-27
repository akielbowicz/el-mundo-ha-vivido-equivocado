# el-mundo-ha-vivido-equivocado

**https://equivocadxs.ar** (antes equivocados.ar → redirect)

Built with [Squint](https://github.com/squint-cljs/squint) — Clojure syntax compiling to vanilla JS.

| just target | what it does |
|-------------|-------------|
| `just build` | compile squint src, build homepage (index.md), episodios, textos, EPUB, org pages, show, sitemap, programa → `dist/` |
| `just serve` | build + serve on `http://localhost:8080` |
| `just watch` | recompile squint on file changes |
| `just check-html` | validate semantic HTML + Firefox Reader Mode compatibility |
| `just check-a11y` | a11y audit (html-validate WCAG rules) against the built site |
| `just check-epub` | validate EPUBs in `dist/textos/` with epubcheck-ts |
| `just check-js` | Playwright smoke test against `dist/` (console/module errors) |
| `just check-tests` | unit tests for the build pipeline (`node --test`) |
| `just check` | run all checks: check-html + check-a11y + check-js + check-epub + check-tests |
| `just new-episode` | scaffold a new episode markdown file |
| `just new-texto` | scaffold a new texto markdown file |
| `just publish-episodio` | publish next recording from `materiales/programas/` as a GitHub Release |
| `just download-stream ARGS="--duration N"` | record the radio stream with ffmpeg |
| `just to-mp3 ARGS` | convert audio files to MP3 (V0) |
| `just build-show` | build grilla pages (HTML + PDF) into `dist/_show/` |
| `just clean` | remove `dist/` and `node_modules/` |

## Site content

El contenido del sitio vive en `sitio/`, espejando la estructura del sitio:

- `sitio/index.md` — homepage: frontmatter (`title`, `description`, `tagline`) + secciones
  editoriales en markdown. El hero (último episodio) y "Próximas lecturas" se generan
  solos desde el frontmatter de `sitio/episodios/*.md` (hero = publicado con fecha ≤ hoy;
  próximas = fecha futura). `BUILD_DATE=YYYY-MM-DD` fija la fecha de corte.
- `sitio/episodios/` — episodios (.md con frontmatter)
- `sitio/textos/` — textos (.md con frontmatter)

Las URLs públicas no cambian al mover archivos dentro de `sitio/`: `dist/` mantiene
`/`, `/episodios/<slug>/`, `/textos/<slug>/`.

## Textos workflow

Textos (cuentos, poemas, fragmentos) se crean como archivos `.md` en `sitio/textos/` con frontmatter YAML:

```yaml
---
title: "El Aleph (fragmento)"
author: "Jorge Luis Borges"
date: "2026-07-21"
status: published
description: "Fragmento del cuento donde Borges describe el Aleph."
genre: "cuento"
license: "Fragmento (derecho de cita)"
tags:
  - cuento
  - borges
episode_slug: "el-aleph"
episode_title: "Episodio 1: El Aleph"
---

Contenido del texto en markdown...
```

- `status: draft` → skip en build (como episodios)
- `episode_slug` + `episode_title` → link al episodio relacionado
- `genre` → filtro en el índice de textos
- `tags` → sin espacios, usados como slugs

### EPUB generation

Cada texto publicado genera automáticamente un archivo EPUB en `dist/textos/<slug>.epub` durante el build. Los EPUBs se descargan desde la página del texto via el botón "Descargar EPUB".

### Scaffolding

```bash
just new-texto   # preguntas interactivas → crea sitio/textos/<slug>.md
```

### OCR desde imágenes escaneadas

Para textos que solo existen en papel, `scripts/textos-from-images.py` extrae el
texto con OCR (Gemini 2.5 Flash vía OpenRouter) y genera el `.md` con frontmatter:

```bash
# 1. Una página por imagen, orden alfabético = orden de páginas
materiales/raw/imagenes/textos/<nombre>/001.jpeg
materiales/raw/imagenes/textos/<nombre>/002.jpeg

# 2. Extraer (lee OPENROUTER_API_KEY o ~/.pi/agent/auth.json)
python3 scripts/textos-from-images.py
```

Saltea directorios ya extraídos; el output queda con `status: draft` — ver
[docs/ocr-textos.org](docs/ocr-textos.org) para el proceso de validación
obligatorio antes de publicar.
