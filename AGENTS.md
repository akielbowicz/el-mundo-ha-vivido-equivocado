<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# el-mundo-ha-vivido-equivocado — Agent Context

**Sitio:** https://equivocadxs.ar (equivocados.ar → redirect 301)
**Repo:** https://github.com/akielbowicz/el-mundo-ha-vivido-equivocado

## Stack

| Layer | Tool |
|-------|------|
| Interactividad | ClojureScript (via [Squint](https://github.com/squint-cljs/squint)) → vanilla JS |
| Build pipeline | Node `.mjs` (scripts/) orquestado con `just` |
| Audio | Bash (`scripts/download-*`, `to-mp3`, `trim-audio`, `separate-vocals`) |
| OCR / extracción | Python (`scripts/textos-from-images.py`, `extra/libros-ocr/`) |
| Build | `just build` (compile squint → `dist/`) |
| Serve | `just serve` (serve on :8080) |
| Lint / a11y | `html-validate` + `check-reader-mode.mjs` |
| Hooks | [Lefthook](https://github.com/evilmartians/lefthook) — pre-commit + pre-push |
| Deploy | GH Actions → `actions/deploy-pages@v4` |
| DNS | Cloudflare (proxy naranja), delegado desde nic.ar |

## Project structure

```
├── src/
│   ├── core.cljs          # entrada squint → dist/core.js
│   ├── search.js          # búsqueda client-side (JS nativo, no pasa por squint)
│   └── search.test.mjs    # tests de search
├── resources/
│   ├── index.html         # HTML semántico completo (reader-mode-ready)
│   ├── 404.html
│   ├── style.css          # estilos a11y, responsive, prefers-reduced-motion
│   ├── libros-index.json
│   ├── images/            # SVGs (og-default, portadas de episodios)
│   └── CNAME              # dominio principal (equivocadxs.ar)
├── scripts/
│   ├── build-episodes.mjs    # episodios/*.md → HTML
│   ├── build-textos.mjs      # textos/*.md → HTML + search-index
│   ├── build-epub.mjs        # textos/*.md → EPUB
│   ├── build-org-pages.mjs   # .org pages → HTML
│   ├── build-programa.mjs    # programa/*.org → páginas de programa
│   ├── build-show.mjs        # materiales/grillas/*.org → dist/_show/ (HTML + PDF)
│   ├── build-sitemap.mjs     # sitemap.xml
│   ├── org-to-html.mjs       # conversor org → HTML (+ org-to-html.test.mjs)
│   ├── lib/utils.mjs         # utilidades compartidas del pipeline (+ utils.test.mjs)
│   ├── episode-template.html # template HTML para episodios
│   ├── texto-template.html   # template HTML para textos
│   ├── org-template.html     # template HTML para páginas .org
│   ├── show-template.html    # template HTML para grillas del show
│   ├── global-player.html    # player global que inyecta inject-player.mjs
│   ├── new-episode.mjs       # scaffolder interactivo para episodios
│   ├── new-texto.mjs         # scaffolder interactivo para textos
│   ├── inject-player.mjs     # inyecta global player en el HTML buildeado
│   ├── check-reader-mode.mjs # valida compatibilidad con Firefox Reader Mode
│   ├── check-js.mjs          # smoke test Playwright sobre dist/
│   ├── check-epub.mjs        # valida EPUBs con epubcheck-ts
│   ├── a11y-audit.mjs        # html-validate con reglas a11y sobre el built
│   ├── textos-from-images.py # OCR (Gemini via OpenRouter): imágenes → textos/*.md
│   ├── download-audio        # bash: YouTube → WAV lossless
│   ├── download-stream       # bash: graba stream de radio con ffmpeg (cron-friendly)
│   ├── to-mp3                # bash: audio → MP3 V0
│   ├── trim-audio            # bash: corta segmento → MP3
│   ├── separate-vocals       # bash: separa voces/instrumental (Demucs)
│   └── publish-episodio      # bash: publica grabación como GitHub Release
├── episodios/               # episodios fuente (.md con frontmatter)
├── textos/                  # textos fuente (.md con frontmatter)
├── materiales/              # material del programa (raw/, programas/, grillas/; parte gitignoreada)
├── programa/                # .org: cronograma y cuentos
├── docs/                    # notas internas (copyright-review, workflow-programa)
├── extra/libros-ocr/        # OCR one-off de libros (Python)
├── dist/                    # build output (gitignored)
├── squint.edn               # config squint
├── lefthook.yml             # pre-commit + pre-push hooks
├── .htmlvalidate.json       # reglas de validación HTML + a11y
├── justfile                 # build, serve, checks, scaffolders, audio
├── .github/workflows/deploy.yml
└── AGENTS.md                # este archivo
```

## Commands

| `just ...` | qué hace |
|------------|----------|
| `build` | npm install → squint compile + esbuild → episodios → textos → EPUB → org pages → show → CNAME → player → sitemap → programa → materiales/raw |
| `serve` | build + sirve en http://localhost:8080 |
| `watch` | recompila squint al cambiar src/ |
| `check-html` | valida HTML semántico + compatibilidad con Reader Mode |
| `check-a11y` | html-validate con reglas a11y sobre el built |
| `check-epub` | valida EPUBs en dist/textos/ con epubcheck-ts |
| `check-js` | smoke test Playwright: sirve dist/, carga páginas, detecta errores de JS |
| `check-tests` | unit tests del pipeline (node --test) |
| `check` | todos los checks: check-html + check-a11y + check-js + check-epub + check-tests |
| `new-episode` | scaffolder interactivo para nuevo episodio |
| `new-texto` | scaffolder interactivo para nuevo texto |
| `publish-episodio` | publica próxima grabación de materiales/programas/ como GitHub Release |
| `download-stream` | graba stream de radio (default 1h; `ARGS="--duration N"`) |
| `to-mp3` | convierte audio a MP3 V0 |
| `build-show` | construye páginas de grillas (HTML + PDF) en dist/_show/ |
| `clean-show` | rm -rf dist/_show/ |
| `clean-org-pages` | borra páginas .org generadas antes de rebuild |
| `clean` | rm -rf dist node_modules |

## Lefthook hooks

| Hook | Comandos |
|------|----------|
| `pre-commit` | `html-validate` + `check-reader-mode` en paralelo sobre files staged |
| `pre-push` | `just build` → `html-validate dist/index.html` → `a11y-audit` |

## CI/CD

- Cada push a `main` → build + deploy automático a GH Pages
- Workflow: `actions/configure-pages@v5` → `upload-pages-artifact@v3` (path: `dist`) → `deploy-pages@v4`
- Incluye validación HTML previa al build
- No usa rama `gh-pages`

## Domain

- `equivocadxs.ar` delegado desde nic.ar a Cloudflare (dominio principal)
- `equivocados.ar` delegado desde nic.ar a Cloudflare → redirect 301 permanente a `equivocadxs.ar`
- Cloudflare: registros A/AAAA (proxy naranja), SSL/TLS en **Full**
- `CNAME` en `resources/` se copia a `dist/` en cada build

## Squint config

- `squint.edn` con `:elide-imports false` — Squint emite imports, esbuild los resuelve al bundlear
- `:copy-resources [:css :html :svg]` — copia archivos .css, .html y .svg de `resources/` a `dist/`
- Si se agrega un nuevo tipo de recurso (json, fonts, imágenes), hay que añadirlo a `:copy-resources` en `squint.edn`
- `:extension ".mjs"` — modules ES

## Accessibility & Reader Mode

- El HTML es **completamente renderizado en servidor** — el contenido es visible sin JS
- Reader Mode de Firefox se activa automáticamente: `<article>`, `<main>`, `lang`, headings, meta desc
- Skip-link al inicio, landmarks ARIA, focus-visible, prefers-reduced-motion
- Validación a11y con `html-validate` (reglas WCAG) en pre-commit, pre-push y CI

## Notes

- No borrar `package-lock.json` del repo (evita re-descargar todas las deps en cada CI run)
- `just watch` recompila solo `.cljs` — cambios en `resources/` (HTML, CSS, CNAME) no se reflejan automáticamente. Usar `just build` manual o reiniciar watch
- Para agregar interactividad: editar `src/core.cljs` → recompila solo

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
