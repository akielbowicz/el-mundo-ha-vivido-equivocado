# el-mundo-ha-vivido-equivocado — Agent Context

**Sitio:** https://equivocados.ar
**Repo:** git@ak:akielbowicz/el-mundo-ha-vivido-equivocado.git

## Stack

| Layer | Tool |
|-------|------|
| Language | Clojure (via [Squint](https://github.com/squint-cljs/squint)) → vanilla JS |
| Build | `just build` (compile squint → `dist/`) |
| Serve | `just serve` (npx serve on :8080) |
| Deploy | GH Actions → `actions/deploy-pages@v4` |
| DNS | Cloudflare (proxy naranja), delegado desde nic.ar |

## Project structure

```
├── src/core.cljs          # entrada squint → dist/core.mjs
├── resources/
│   ├── index.html         # HTML template
│   ├── style.css          # estilos
│   └── CNAME              # dominio (equivocados.ar)
├── dist/                  # build output (gitignored)
├── squint.edn             # config squint
├── justfile               # build, serve, watch, clean
├── .github/workflows/deploy.yml
└── AGENTS.md              # este archivo
```

## Commands

| `just ...` | qué hace |
|------------|----------|
| `build` | npm install → squint compile → cp CNAME → dist/ |
| `serve` | build + sirve en http://localhost:8080 |
| `watch` | recompila al cambiar src/ |
| `clean` | rm -rf dist node_modules |

## CI/CD

- Cada push a `main` → build + deploy automático a GH Pages
- Workflow: `actions/configure-pages@v5` → `upload-pages-artifact@v3` (path: `dist`) → `deploy-pages@v4`
- No usa rama `gh-pages`

## Domain

- `equivocados.ar` delegado desde nic.ar a Cloudflare
- Cloudflare: registros CNAME (proxy naranja), SSL/TLS en **Full**
- `CNAME` en `resources/` se copia a `dist/` en cada build

## Squint config

- `squint.edn` con `:elide-imports true` (no necesita runtime externo para código simple)
- `:copy-resources [:css :html]` copia HTML y CSS → `dist/`
- `:extension ".mjs"` — modules ES

## Notes

- No borrar `package-lock.json` del repo (cache npm en CI)
- Para agregar interactividad: editar `src/core.cljs` → recompila solo