## 1. Pipeline foundation
- [x] 1.1 Install `marked`, `gray-matter` npm packages
- [x] 1.2 Create `scripts/build-episodes.mjs` — reads `episodios/*.md`, compiles to HTML
- [x] 1.3 Create `scripts/episode-template.html` — HTML template for episodes
- [x] 1.4 Update `justfile` — add `build` step for episodes, add `just new-episode`
- [x] 1.5 Update `.gitignore` — add `dist/episodios/`
- [x] 1.6 **Verify:** `just build` generates `dist/episodios/<slug>/index.html` from a sample .md

## 2. Episode page template
- [x] 2.1 Define frontmatter fields: title, date (ISO 8601), description, authors, slug (auto), audio, youtube, image, image_alt, tags
- [x] 2.2 Create `scripts/episode-template.html` with semantic HTML + a11y + skip-link
- [x] 2.3 Add responsive audio player component (`<audio controls>`)
- [x] 2.4 Add YouTube embed with `loading="lazy"`, `title`, fallback link
- [x] 2.5 Add image support with `image_alt`, responsive, caption
- [x] 2.6 Add episode navigation (previous/next links)
- [x] 2.7 **Verify:** episode page passes `check-reader-mode` and `html-validate`

## 3. Episode index & navigation
- [x] 3.1 Generate `dist/episodios/index.html` from episode list (sorted by date descending)
- [x] 3.2 Update `resources/index.html` to link to `/episodios/`
- [x] 3.3 **Verify:** index page renders all episodes correctly, links work

## 4. Search functionality
- [x] 4.1 Create `dist/search-index.json` at build time (title, slug, description, authors, date)
- [x] 4.2 Implement client-side search in `src/search.cljs` using vanilla `String.includes()`
- [x] 4.3 Add search UI: input field with `aria-label`, results list, keyboard navigation
- [x] 4.4 Add `<noscript>` fallback link to `/episodios/` for no-JS users
- [x] 4.5 **Verify:** search works in browser, no errors, degrades without JS

## 5. Validation & tooling
- [x] 5.1 Add frontmatter validation (required fields, URL format for youtube/audio)
- [x] 5.2 Add duplicate slug detection (fail build on conflict)
- [x] 5.3 Add slug auto-generation from title
- [x] 5.4 Add `just new-episode` interactive prompt
- [x] 5.5 Update `check-reader-mode.mjs` to validate generated episode pages
- [x] 5.6 Add sample episode `.md` file with all field types
- [x] 5.7 **Verify:** `just check` passes with sample episode present

## 6. Documentation
- [x] 6.1 Update AGENTS.md with episode workflow
- [x] 6.2 Update README.md with episode creation guide