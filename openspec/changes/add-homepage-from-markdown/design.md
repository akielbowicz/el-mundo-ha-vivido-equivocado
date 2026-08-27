# Design: add-homepage-from-markdown

## Context

`build-episodes.mjs` is the reference pipeline: gray-matter frontmatter → marked
(with heading-shift renderer h1→h2 so the `<h1>` comes from frontmatter title) →
`renderTemplate()` placeholder substitution into an HTML template. The homepage
build mirrors this exactly, plus one extra input: episode frontmatter data for the
dynamic sections.

## Decisions

### D1: Single build script reads two inputs
`build-index.mjs` parses `sitio/episodios/*.md` frontmatter directly (title, date,
status, authors, description, image, slug — same fields build-episodes validates).
It does NOT import from build-episodes (scripts are standalone CLIs); shared helpers
already live in `scripts/lib/utils.mjs`. Small duplication of the frontmatter-parsing
loop is accepted; extracting a shared `readEpisodes()` util is a follow-up if it grows.

### D2: Dynamic section logic
- **Hero (último episodio):** `status: published` AND `date <= build date`, max `date`, ties
  broken by filename. Future-dated published episodes never appear in the hero.
- **Próximas lecturas:** `status: published` AND `date > build date`, sorted ascending, max 5.
  An episode therefore appears in hero XOR próximas, never both.
- **Build date:** date-only string comparison (`YYYY-MM-DD`); "today" = build machine's
  local date, overridable via `BUILD_DATE=YYYY-MM-DD` env var for reproducible builds
  (CI runs in UTC, local runs in -03:00 — the env var removes the ambiguity).
- Both sections render server-side into static HTML — no client JS involved.
- Draft episodes never appear in either section.

### D3: index.md schema
```yaml
---
title: "El mundo ha vivido equivocado — Radio"
description: "Programa de radio donde leemos cursos..."   # meta/og description
tagline: "Un programa de radio sobre cuentos y lectura"
---
```
Body markdown = editorial sections only (`sobre el programa`, `textos leídos` promo).
Section order in template: hero (dynamic) → próximas (dynamic) → `$body$`.
Headings in body start at `##` (shifted to keep single-h1 invariant).

### D4: squint/copy-resources interaction
`squint.edn` copies `resources/*.html` (incl. index.html) to `.squint-cache/`, and
`bundle-js` copies them to `dist/`. `:copy-resources` matches **by extension** — there is
no per-file exclusion, so `index.html` cannot be removed from the copy without losing
`404.html`.
**Resolution: keep the copy, rely on build-order overwrite.** `bundle-js` (part of the
`build` dependency chain) runs first; `build-index.mjs` runs later in `build` and
overwrites `dist/index.html`. `resources/index.html` is deleted in the same change so
there is exactly one source of truth (`sitio/index.md`). `404.html`, `style.css`,
`images/` keep flowing through the squint copy unchanged.

### D5: URL and marker compatibility
- `{{GLOBAL_PLAYER}}` marker stays in index-template.html; `inject-player.mjs`
  already processes all built HTML.
- Script tags `search.mjs` / `core.js` relative, as today.
- `resources/index.html` is deleted once build-index lands (grep CI/verify steps:
  deploy.yml validates `dist/`, pre-commit validates staged files — no reference to
  the source file path).

### D6: Rawfrontmatter fallback for hero image
Hero uses the episode's `image` + `image_alt`; if absent, falls back to
`/images/og-default.svg` with `alt=""` — same rule as episode pages.

## Risks

- **Two sources of truth for index.html during transition** → mitigated by removing
  the copy step in the same change (task 2.4).
- **check-reader-mode / a11y regressions on homepage** → the template reuses the
  exact header/footer/nav markup from the current index.html; only section content
  generation changes.
- **Stale add-textos-pages change** → archived (task 4.2) so specs stay authoritative.
