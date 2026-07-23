dist:
    mkdir -p dist

install:
    npm install --silent

# Squint compiles to .squint-cache/, then esbuild bundles to dist/
bundle-js: install dist
    npx squint compile
    npx esbuild .squint-cache/core.mjs --bundle --outfile=dist/core.mjs --format=esm --platform=browser
    cp .squint-cache/index.html .squint-cache/404.html .squint-cache/style.css dist/ 2>/dev/null || true
    cp -r .squint-cache/images dist/ 2>/dev/null || true
    rm -f dist/search.mjs  # bundled into core.mjs

build: bundle-js
    node scripts/build-episodes.mjs
    node scripts/build-textos.mjs
    node scripts/build-epub.mjs
    node scripts/build-org-pages.mjs
    cp resources/CNAME dist/
    node scripts/inject-player.mjs
    # Copy referenced materials assets
    cp -r materiales/raw dist/materiales/ 2>/dev/null || true

serve: install build
    serve dist -p 8080 --no-clipboard

watch: install
    npx squint watch &
    npx esbuild .squint-cache/core.mjs --bundle --outfile=dist/core.mjs --format=esm --platform=browser --watch &

# Validate HTML + reader-mode compatibility (pre-commit)
check-html: install
    npx html-validate --config .htmlvalidate.json resources/index.html
    node scripts/check-reader-mode.mjs resources/index.html

# Full a11y audit against built site (pre-push)
check-a11y: install
    node scripts/a11y-audit.mjs

# Create a new texto from interactive prompts
new-texto:
    node scripts/new-texto.mjs

# Run all checks
check-js: build
    node scripts/check-js.mjs

# Run all checks
check: check-html check-a11y check-js

# Create a new episode from interactive prompts
new-episode:
    node scripts/new-episode.mjs

clean:
    rm -rf dist node_modules