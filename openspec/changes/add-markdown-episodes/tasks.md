## 1. Pipeline foundation
- [ ] 1.1 Install `marked`, `gray-matter` npm packages
- [ ] 1.2 Create `scripts/build-episodes.mjs` — reads `episodios/*.md`, compiles to HTML
- [ ] 1.3 Create `scripts/episode-template.html` — HTML template for episodes
- [ ] 1.4 Update `justfile` — add `build` step for episodes, add `just new-episode`
- [ ] 1.5 Update `squint.edn` — add `episodios/` to paths for copy-resources
- [ ] 1.6 Update `.gitignore` — add `dist/episodios/` if needed

## 2. Episode page template
- [ ] 2.1 Design frontmatter schema (title, date, slug, audio, youtube, description, authors)
- [ ] 2.2 Create `scripts/episode-template.html` with semantic HTML + a11y
- [ ] 2.3 Add responsive audio player component
- [ ] 2.4 Add YouTube embed with lazy loading + a11y
- [ ] 2.5 Add image support with alt text, caption, responsive
- [ ] 2.6 Add episode navigation (previous/next)

## 3. Episode index & navigation
- [ ] 3.1 Generate `dist/episodios/index.html` from episode list (sorted by date)
- [ ] 3.2 Update `resources/index.html` to link to `/episodios/`
- [ ] 3.3 Add RSS feed generation (optional)

## 4. Search functionality
- [ ] 4.1 Create search index JSON at build time (`dist/search-index.json`)
- [ ] 4.2 Implement client-side search in `src/search.cljs`
- [ ] 4.3 Add search UI: input field, results list, keyboard navigation
- [ ] 4.4 Ensure search works without JavaScript (degrade gracefully)

## 5. Validation & tooling
- [ ] 5.1 Add frontmatter validation in build script
- [ ] 5.2 Add `just new-episode` interactive prompt
- [ ] 5.3 Update `html-validate` config for episode pages
- [ ] 5.4 Update `check-reader-mode.mjs` to check episode pages
- [ ] 5.5 Add sample episode `.md` file

## 6. Documentation
- [ ] 6.1 Update AGENTS.md with episode workflow
- [ ] 6.2 Update README.md with episode creation guide