dist:
    mkdir -p dist

install:
    npm install --silent

# Squint compiles to .squint-cache/, then esbuild bundles to dist/
bundle-js: install dist
	npx squint compile
	# Copy search as native JS module (no squint compile needed)
	cp src/search.js dist/search.mjs
	npx esbuild .squint-cache/core.mjs --bundle --outfile=dist/core.js --format=esm --platform=browser
	cp .squint-cache/index.html .squint-cache/404.html .squint-cache/style.css dist/ 2>/dev/null || true
	cp -r .squint-cache/images dist/ 2>/dev/null || true

build: bundle-js clean-org-pages
    node scripts/build-episodes.mjs
    node scripts/build-textos.mjs
    node scripts/build-epub.mjs
    node scripts/build-org-pages.mjs
    node scripts/build-show.mjs
    cp resources/CNAME dist/
    node scripts/inject-player.mjs
    node scripts/build-sitemap.mjs
    node scripts/build-programa.mjs
    # Copy referenced materials assets
    cp -r materiales/raw dist/materiales/ 2>/dev/null || true

serve: install build
    npx serve dist -p 8080 --no-clipboard

watch: install
	npx squint watch &
	npx esbuild .squint-cache/core.mjs --bundle --outfile=dist/core.js --format=esm --platform=browser --watch &

# Validate HTML + reader-mode compatibility (pre-commit)
check-html: install
    npx html-validate --config .htmlvalidate.json resources/index.html
    node scripts/check-reader-mode.mjs resources/index.html

# Full a11y audit against built site (pre-push)
check-a11y: install
    node scripts/a11y-audit.mjs

# Download radio stream (default: 1h, use ARGS for --duration N --outdir DIR)
download-stream ARGS:
    ./scripts/download-stream {{ARGS}}

# Publish a recording as a GitHub Release and get a shareable link
# Publish the next unreleased episode from materiales/programas/ to GitHub Releases
publish-episodio NUM="":
    ./scripts/publish-episodio {{NUM}}

# Create a new texto from interactive prompts
new-texto:
    node scripts/new-texto.mjs

# Validate EPUB files in dist/textos/ using epubcheck-ts
check-epub: build
    node scripts/check-epub.mjs

# Playwright smoke test against dist/ (serves pages, checks console/module errors)
check-js: build
    node scripts/check-js.mjs

# Run all checks
check: check-html check-a11y check-js check-epub check-tests

# Run unit tests for build pipeline logic
check-tests:
    node --test scripts/lib/utils.test.mjs scripts/org-to-html.test.mjs src/search.test.mjs

# Create a new episode from interactive prompts
new-episode:
    node scripts/new-episode.mjs

# Convert audio files to MP3 (V0 by default)
to-mp3 ARGS:
    ./scripts/to-mp3 {{ARGS}}

# Remove stale org-generated pages before rebuild
clean-org-pages:
    rm -rf dist/paginas/ dist/programa/ dist/sobre/ dist/contacto/ dist/_show/

# Build grilla pages (HTML + PDF) from materiales/grillas/
build-show:
    node scripts/build-show.mjs

# Clean only the show output
clean-show:
    rm -rf dist/_show/

clean:
    rm -rf dist node_modules