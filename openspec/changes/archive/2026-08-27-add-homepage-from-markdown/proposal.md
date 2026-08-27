# Add homepage from markdown + sitio/ content directory

## Why

The homepage (`resources/index.html`) is the only content page hand-written as static HTML.
Its "Último episodio" hero and "Próximas lecturas" sections are hardcoded and drift out of
sync with `episodios/*.md` frontmatter (already stale: hero pinned to Episodio 1). Every
other page on the site follows the same workflow: markdown source with frontmatter + HTML
template + build script. The homepage should too.

At the same time, content sources (`episodios/`, `textos/`) live at the repo root mixed
with build code (`scripts/`, `src/`, `resources/`). A single `sitio/` directory mirroring
the site structure (`sitio/index.md`, `sitio/episodios/`, `sitio/textos/`) makes the
separation content vs. code explicit.

## What Changes

- **NEW** `sitio/` content directory mirroring the site structure:
  - `sitio/index.md` — homepage source (frontmatter + markdown body)
  - `sitio/episodios/` — moved from `episodios/`
  - `sitio/textos/` — moved from `textos/`
- **NEW** `scripts/build-index.mjs`: compiles `sitio/index.md` + `scripts/index-template.html`
  → `dist/index.html`, same pattern as `build-episodes.mjs` (marked + gray-matter +
  heading-shift renderer).
- **NEW** `scripts/index-template.html`: homepage template with:
  - **Dynamic** hero section (último episodio publicado) generated from episode frontmatter
  - **Dynamic** "Próximas lecturas" section from episodes with future dates
  - Markdown body rendered from `sitio/index.md` (editorial sections: sobre el programa, etc.)
- **UPDATE** path references in `build-episodes.mjs`, `build-textos.mjs`, `build-epub.mjs`,
  `new-episode.mjs`, `new-texto.mjs`, justfile, deploy.yml.
- **UPDATE** docs: AGENTS.md, README.md structure trees.
- **ARCHIVE** stale `add-textos-pages` change (feature already implemented and deployed).

## Capabilities

### New
- `homepage`: homepage compiled from `sitio/index.md` with dynamic episode sections.

### Modified
- `episode-pages`: source directory changes `episodios/` → `sitio/episodios/`.
  Output URLs, frontmatter schema, and rendering requirements are unchanged.

## Impact

- **URLs: unchanged.** This is a source restructure only — `dist/` output stays identical
  (`/`, `/episodios/<slug>/`, `/textos/<slug>/`). Sitemap, nav, search, and deployed links
  are unaffected.
- **Build:** `just build` gains one step (`build-index.mjs`) replacing the
  `cp .squint-cache/index.html dist/` copy path (squint still compiles resources for
  404.html/style.css/images).
- **a11y/reader-mode:** homepage must keep passing `check-html`, `check-reader-mode`,
  and the a11y audit — same guarantees as episode pages.
- **Out of scope (non-goals):** moving `programa/`, `materiales/`, or `docs/` into
  `sitio/`; changing any public URL; restyling the homepage.
