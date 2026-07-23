# el-mundo-ha-vivido-equivocado

**https://equivocadxs.ar** (antes equivocados.ar → redirect)

Built with [Squint](https://github.com/squint-cljs/squint) — Clojure syntax compiling to vanilla JS.

| just target | what it does |
|-------------|-------------|
| `just build` | compile squint src, build episodios, textos, EPUB, org pages, copy assets → `dist/` |
| `just serve` | build + serve on `http://localhost:8080` |
| `just watch` | recompile squint on file changes |
| `just new-episode` | scaffold a new episode markdown file |
| `just new-texto` | scaffold a new texto markdown file |
| `just check` | run all validation checks |
| `just clean` | remove `dist/` and `node_modules/` |

## Textos workflow

Textos (cuentos, poemas, fragmentos) se crean como archivos `.md` en `textos/` con frontmatter YAML:

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
just new-texto   # preguntas interactivas → crea textos/<slug>.md
```
