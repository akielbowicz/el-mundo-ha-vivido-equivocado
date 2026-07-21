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
