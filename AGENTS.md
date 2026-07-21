# el-mundo-ha-vivido-equivocado — Agent Context

**Sitio:** https://equivocados.ar
**Repo:** https://github.com/akielbowicz/el-mundo-ha-vivido-equivocado

## Stack

| Layer | Tool |
|-------|------|
| Language | Clojure (via [Squint](https://github.com/squint-cljs/squint)) → vanilla JS |
| Build | `just build` (compile squint → `dist/`) |
| Serve | `just serve` (serve on :8080) |
| Lint / a11y | `html-validate` + `check-reader-mode.mjs` |
| Hooks | [Lefthook](https://github.com/evilmartians/lefthook) — pre-commit + pre-push |
| Deploy | GH Actions → `actions/deploy-pages@v4` |
| DNS | Cloudflare (proxy naranja), delegado desde nic.ar |

## Project structure

```
├── src/core.cljs          # entrada squint → dist/core.mjs
├── resources/
│   ├── index.html         # HTML semántico completo (lector modo-ready)
│   ├── style.css          # estilos a11y, responsive, prefers-reduced-motion
│   └── CNAME              # dominio (equivocados.ar)
├── scripts/
│   ├── check-reader-mode.mjs  # valida compatibilidad con Firefox Reader Mode
│   └── a11y-audit.mjs         # html-validate con reglas a11y sobre el built
├── dist/                  # build output (gitignored)
├── squint.edn             # config squint
├── lefthook.yml           # pre-commit + pre-push hooks
├── .htmlvalidate.json     # reglas de validación HTML + a11y
├── justfile               # build, serve, check, clean
├── .github/workflows/deploy.yml
└── AGENTS.md              # este archivo
```

## Commands

| `just ...` | qué hace |
|------------|----------|
| `build` | npm install → squint compile → cp CNAME → dist/ |
| `serve` | build + sirve en http://localhost:8080 |
| `watch` | recompila al cambiar src/ |
| `check-html` | valida HTML semántico + compatibilidad con Reader Mode |
| `check-a11y` | html-validate con reglas a11y sobre el built |
| `check` | todos los checks |
| `clean` | rm -rf dist node_modules |

## Lefthook hooks

| Hook | Comandos |
|------|----------|
| `pre-commit` | `html-validate` + `check-reader-mode` en paralelo sobre files staged |
| `pre-push` | `just build` → `html-validate dist/` → `a11y-audit` |

## CI/CD

- Cada push a `main` → build + deploy automático a GH Pages
- Workflow: `actions/configure-pages@v5` → `upload-pages-artifact@v3` (path: `dist`) → `deploy-pages@v4`
- Incluye validación HTML previa al build
- No usa rama `gh-pages`

## Domain

- `equivocados.ar` delegado desde nic.ar a Cloudflare
- Cloudflare: registros CNAME (proxy naranja), SSL/TLS en **Full**
- `CNAME` en `resources/` se copia a `dist/` en cada build

## Squint config

- `squint.edn` con `:elide-imports true` (no necesita runtime externo para código simple)
- `:copy-resources [:css :html]` — solo copia archivos .css y .html de `resources/` a `dist/`
- Si se agrega un nuevo tipo de recurso (svg, json, fonts, imágenes), hay que añadirlo a `:copy-resources` en `squint.edn`
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