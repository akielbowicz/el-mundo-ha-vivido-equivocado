# Tasks: add-homepage-from-markdown

## 1. Restructure content into sitio/

- [x] 1.1 `git mv episodios sitio/episodios`
- [x] 1.2 `git mv textos sitio/textos`
- [x] 1.3 Update `EPISODIOS_DIR` in `scripts/build-episodes.mjs` → `sitio/episodios`
- [x] 1.4 Update source-dir constants: `TEXTOS_DIR` in `scripts/build-textos.mjs`,
      `TEXTOS_DIR` in `scripts/build-epub.mjs` (has its own constant) → `sitio/textos`
- [x] 1.5 Update scaffolders: `scripts/new-episode.mjs`, `scripts/new-texto.mjs` target dirs
- [x] 1.6 Grep for remaining root-relative `episodios/` / `textos/` source references
      (check-js.mjs reads `textos/`? deploy.yml verify step reads dist only) and fix

## 2. Homepage from markdown

- [x] 2.1 Create `sitio/index.md` with frontmatter (`title`, `description`, `tagline`)
      and markdown body for editorial sections (sobre el programa, textos leídos promo)
- [x] 2.2 Create `scripts/index-template.html` — homepage template: header/nav/search
      identical to current, dynamic hero + próximas placeholders, `$body$` section
- [x] 2.3 Create `scripts/build-index.mjs`:
      - parse `sitio/index.md` (gray-matter + marked with heading-shift)
      - compute último episodio (published, max date) and próximas (future dates)
        from `sitio/episodios/*.md` frontmatter
      - render hero + próximas sections from episode data
      - write `dist/index.html` (keep `{{GLOBAL_PLAYER}}` marker for inject-player,
        relative `search.mjs` / `core.js` script tags)
- [x] 2.4 Update `justfile` build: add `node scripts/build-index.mjs` after
      `build-episodes.mjs` (runs after bundle-js → overwrites the copied index.html,
      per design D4)
- [x] 2.5 Delete `resources/index.html` (single source of truth becomes sitio/index.md);
      confirm 404.html/style.css/images still copied via squint

## 3. Validation & parity

- [x] 3.1 `just build` passes; hero shows latest published episode with date ≤ today
      (002-lai-uhart with current data), 003-oyola-almada (dated 2026-08-27) appears
      ONLY under Próximas lecturas, never in hero
- [x] 3.2 `just check-html` + reader-mode check pass on new homepage
- [x] 3.3 a11y audit passes (`node scripts/a11y-audit.mjs`)
- [x] 3.4 `just check-js` smoke test passes (search + player still work on homepage)
- [x] 3.5 `just check-epub` + `just check-tests` pass
- [x] 3.6 Verify URLs unchanged: `/episodios/el-aleph/`, `/textos/el-juego-de-cartas/`,
      sitemap.xml entries identical to pre-change build

## 4. Docs & cleanup

- [x] 4.1 Update project structure trees in AGENTS.md and README.md
- [x] 4.2 Archive stale `openspec/changes/add-textos-pages` (implemented & deployed);
      archive this change when done
- [x] 4.3 Full `just check` green before push
