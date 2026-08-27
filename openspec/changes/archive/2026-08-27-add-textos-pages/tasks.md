## 1. Pipeline foundation
- [ ] 1.1 Install `epub-gen` npm package
- [ ] 1.2 Create `scripts/build-textos.mjs` — reads `textos/*.md`, compiles to HTML
- [ ] 1.3 Create `scripts/texto-template.html` — HTML template for textos
- [ ] 1.4 Create `scripts/build-epub.mjs` — generates EPUB for each texto/episode
- [ ] 1.5 Update `justfile` — add `build` step for textos + EPUB
- [ ] 1.6 Add `dist/**/*.epub` to `.gitignore`
- [ ] 1.7 **Verify:** `just build` generates `dist/textos/<slug>/index.html` + EPUB

## 2. Textos template
- [ ] 2.1 Create `scripts/texto-template.html` with semantic HTML + a11y
- [ ] 2.2 Add "Imprimir / PDF" button
- [ ] 2.3 Add "Descargar EPUB" link
- [ ] 2.4 Add prev/next navigation
- [ ] 2.5 Add link to related episode (if `episode_slug` in frontmatter)
- [ ] 2.6 **Verify:** page passes `check-reader-mode` and `html-validate`

## 3. Textos index
- [ ] 3.1 Generate `dist/textos/index.html` from textos list (sorted by date)
- [ ] 3.2 Add filters by author and genre
- [ ] 3.3 Add link from homepage to `/textos/`
- [ ] 3.4 **Verify:** index page renders all textos correctly

## 4. EPUB generation
- [ ] 4.1 Implement `scripts/build-epub.mjs` using `epub-gen`
- [ ] 4.2 Handle image embedding (download remote images to dist/)
- [ ] 4.3 Generate cover image from title/author
- [ ] 4.4 Generate table of contents
- [ ] 4.5 **Verify:** generated EPUB opens in Calibre/Kindle preview

## 5. Print styles

*Note: sections 5 and 6 (analytics on existing pages) can be done independently of the textos pipeline — they improve existing pages immediately.*

- [ ] 5.1 Update `@media print` in `resources/style.css`
- [ ] 5.2 Hide audio, video, episode-nav in print
- [ ] 5.3 Add page URL as print footer
- [ ] 5.4 **Verify:** print preview shows clean article layout

## 6. Analytics
- [ ] 6.1 Add CF Web Analytics snippet to `resources/index.html`
- [ ] 6.2 Add CF Web Analytics snippet to `scripts/texto-template.html`
- [ ] 6.3 Add CF Web Analytics snippet to `scripts/episode-template.html`
- [ ] 6.4 **Verify:** snippet loads on all pages

## 7. Sample textos
- [ ] 7.1 Add sample texto `.md` files (fragments, public domain)
- [ ] 7.2 Add sample with `episode_slug` linking to el-aleph
- [ ] 7.3 **Verify:** `just check` passes with sample textos present

## 8. Documentation
- [ ] 8.1 Update AGENTS.md with textos workflow
- [ ] 8.2 Update README.md with textos creation guide